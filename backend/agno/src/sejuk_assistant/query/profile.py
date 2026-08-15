from __future__ import annotations

import hashlib
import json
import re
from importlib.resources import files
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from sejuk_assistant.auth.context import Role


class ColumnProfile(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    data_type: str = Field(min_length=1, max_length=80)
    nullable: bool
    meaning: str = Field(min_length=8, max_length=500)
    enum_name: str | None = None
    timestamp_semantics: str | None = None
    technician_visible: bool = True


class RelationProfile(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str = Field(pattern=r"^assistant_analytics_[a-z0-9_]+$")
    purpose: str = Field(min_length=20, max_length=800)
    grain: str = Field(min_length=10, max_length=300)
    key: str
    columns: tuple[ColumnProfile, ...]

    @model_validator(mode="after")
    def key_exists(self) -> RelationProfile:
        names = [column.name for column in self.columns]
        if len(names) != len(set(names)) or self.key not in names:
            raise ValueError("Relation columns must be unique and contain the key.")
        return self


class JoinProfile(BaseModel):
    model_config = ConfigDict(frozen=True)

    left_relation: str
    left_column: str
    right_relation: str
    right_column: str
    cardinality: Literal["one-to-one", "one-to-many", "many-to-one"]
    meaning: str = Field(min_length=8, max_length=300)


class StructuralProfile(BaseModel):
    model_config = ConfigDict(frozen=True)

    schema_version: int = Field(ge=1)
    source_digest: str = Field(pattern=r"^[a-f0-9]{64}$")
    enums: dict[str, tuple[str, ...]]
    relations: tuple[RelationProfile, ...]
    joins: tuple[JoinProfile, ...]

    @model_validator(mode="after")
    def references_exist(self) -> StructuralProfile:
        relations = {relation.name: relation for relation in self.relations}
        if len(relations) != len(self.relations):
            raise ValueError("Relation names must be unique.")
        for relation in self.relations:
            if any(term in relation.name for term in ("message", "document", "audit", "auth")):
                raise ValueError("Protected relations cannot enter the analytical profile.")
            for column in relation.columns:
                if any(term in column.name for term in ("token", "secret", "password")):
                    raise ValueError("Protected columns cannot enter the analytical profile.")
                if column.enum_name and column.enum_name not in self.enums:
                    raise ValueError(f"Unknown enum {column.enum_name}.")
        for join in self.joins:
            for relation_name, column_name in (
                (join.left_relation, join.left_column),
                (join.right_relation, join.right_column),
            ):
                target_relation = relations.get(relation_name)
                if target_relation is None or column_name not in {
                    c.name for c in target_relation.columns
                }:
                    raise ValueError("Join references an unknown relation or column.")
        return self


class BusinessConcept(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    synonyms: tuple[str, ...]
    relations: tuple[str, ...]
    columns: tuple[str, ...]
    enum_mapping: dict[str, tuple[str, ...]] = Field(default_factory=dict)
    preferred_timestamp: str | None = None
    calculation: str | None = None
    roles: tuple[Role, ...] = (Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
    guidance: str = Field(min_length=15, max_length=800)
    examples: tuple[str, ...] = ()


class SemanticOverlay(BaseModel):
    model_config = ConfigDict(frozen=True)

    version: int = Field(ge=1)
    concepts: tuple[BusinessConcept, ...]


class ProfileError(ValueError):
    def __init__(self, code: str, identifier: str = "profile") -> None:
        super().__init__("Semantic profile validation failed.")
        self.code = code
        self.identifier = identifier


class QuerySemanticProfile:
    def __init__(self, structural: StructuralProfile, overlay: SemanticOverlay) -> None:
        self.structural = structural
        self.overlay = overlay
        self._validate_overlay()
        payload = {
            "structural": structural.model_dump(mode="json"),
            "overlay": overlay.model_dump(mode="json"),
        }
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        self.version = hashlib.sha256(canonical.encode()).hexdigest()[:16]

    @classmethod
    def load(cls, snapshot_path: Path | None = None) -> QuerySemanticProfile:
        path = snapshot_path or Path(
            str(files("sejuk_assistant.query").joinpath("structural_profile.json"))
        )
        structural = StructuralProfile.model_validate_json(path.read_text(encoding="utf-8"))
        return cls(structural, reviewed_overlay())

    def _validate_overlay(self) -> None:
        relations = {relation.name: relation for relation in self.structural.relations}
        known_columns = {
            column.name for relation in relations.values() for column in relation.columns
        }
        for concept in self.overlay.concepts:
            if any(relation not in relations for relation in concept.relations):
                raise ProfileError("concept_relation_unknown", concept.name)
            if any(column not in known_columns for column in concept.columns):
                raise ProfileError("concept_column_unknown", concept.name)
            if concept.preferred_timestamp and concept.preferred_timestamp not in known_columns:
                raise ProfileError("concept_timestamp_unknown", concept.name)
            for enum_name, values in concept.enum_mapping.items():
                allowed = self.structural.enums.get(enum_name)
                if allowed is None or any(value not in allowed for value in values):
                    raise ProfileError("concept_enum_unknown", concept.name)

    def relation(self, name: str) -> RelationProfile | None:
        return next(
            (relation for relation in self.structural.relations if relation.name == name), None
        )

    def relevant_relation_names(self, question: str, role: Role) -> tuple[str, ...]:
        concepts = self.relevant_concepts(question, role)
        return tuple(sorted({name for concept in concepts for name in concept.relations}))

    def relevant_concepts(self, question: str, role: Role) -> tuple[BusinessConcept, ...]:
        words = set(re.findall(r"[a-z0-9]+", question.casefold()))
        ranked: list[tuple[int, BusinessConcept]] = []
        for concept in self.overlay.concepts:
            if role not in concept.roles:
                continue
            terms = {concept.name.replace("_", " "), *concept.synonyms}
            score = max(
                (len(words & set(re.findall(r"[a-z0-9]+", term.casefold()))) for term in terms),
                default=0,
            )
            if score:
                ranked.append((score, concept))
        return tuple(
            concept for _, concept in sorted(ranked, key=lambda item: (-item[0], item[1].name))
        )

    def tool_selection_context(self, role: Role) -> str:
        return "\n".join(
            f"- {concept.name}: {', '.join(concept.synonyms)}"
            for concept in self.overlay.concepts
            if role in concept.roles
        )

    def planner_context(self, question: str, role: Role, max_bytes: int) -> str:
        concepts = self.relevant_concepts(question, role)
        relation_names = {name for concept in concepts for name in concept.relations}
        if not relation_names:
            relation_names = {relation.name for relation in self.structural.relations}
        blocks = [
            f"Semantic profile version: {self.version}",
            "Timezone: Asia/Kuala_Lumpur.",
            "RLS authorizes rows; never invent or add caller identity predicates.",
        ]
        for enum_name, values in sorted(self.structural.enums.items()):
            blocks.append(f"ENUM {enum_name}: {', '.join(values)}")
        for relation in self.structural.relations:
            if relation.name not in relation_names:
                continue
            columns = [
                column
                for column in relation.columns
                if role is not Role.TECHNICIAN or column.technician_visible
            ]
            detail = "; ".join(
                f"{column.name} {column.data_type}{' nullable' if column.nullable else ''}: "
                f"{column.meaning}"
                for column in columns
            )
            blocks.append(
                f"RELATION {relation.name}; grain={relation.grain}; key={relation.key}; "
                f"purpose={relation.purpose}; columns: {detail}"
            )
        included = {
            relation.name
            for relation in self.structural.relations
            if relation.name in relation_names
        }
        for join in self.structural.joins:
            if join.left_relation in included and join.right_relation in included:
                blocks.append(
                    f"JOIN {join.left_relation}.{join.left_column} = "
                    f"{join.right_relation}.{join.right_column} ({join.cardinality}): "
                    f"{join.meaning}"
                )
        for concept in concepts:
            blocks.append(
                f"CONCEPT {concept.name}; synonyms={', '.join(concept.synonyms)}; "
                f"preferred_timestamp={concept.preferred_timestamp or 'none'}; "
                f"calculation={concept.calculation or 'none'}; guidance={concept.guidance}; "
                f"enum_mapping={json.dumps(concept.enum_mapping, sort_keys=True)}; "
                f"examples={json.dumps(concept.examples)}"
            )
        output: list[str] = []
        used = 0
        for block in blocks:
            size = len((block + "\n").encode())
            if used + size > max_bytes:
                continue
            output.append(block)
            used += size
        if not output or not any(line.startswith("RELATION ") for line in output):
            raise ProfileError("profile_prompt_too_large")
        return "\n".join(output)


def reviewed_overlay() -> SemanticOverlay:
    all_roles = (Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
    management = (Role.ADMIN, Role.MANAGER)
    return SemanticOverlay(
        version=1,
        concepts=(
            BusinessConcept(
                name="open_task",
                synonyms=("open task", "open job", "active queue"),
                relations=("assistant_analytics_orders",),
                columns=("status", "scheduled_at"),
                enum_mapping={"order_status": ("New", "Assigned", "In Progress")},
                preferred_timestamp="scheduled_at",
                guidance=(
                    "Open is a business concept, never a stored status. Filter status to New, "
                    "Assigned, or In Progress and return details unless a count is requested."
                ),
                examples=("Is there any open task?", "Show active jobs."),
            ),
            BusinessConcept(
                name="completed_work",
                synonyms=("completed task", "completed job", "job done"),
                relations=("assistant_analytics_completions",),
                columns=("order_id", "final_amount", "completed_at"),
                preferred_timestamp="completed_at",
                guidance=(
                    "Completed work is a service completion row. Use completion details and "
                    "completed_at, not an invented Completed order status."
                ),
                examples=("Show my completed tasks.",),
            ),
            BusinessConcept(
                name="reviewed_work",
                synonyms=("reviewed job", "approved work"),
                relations=("assistant_analytics_orders", "assistant_analytics_reviews"),
                columns=("status", "outcome", "reviewed_at"),
                enum_mapping={"order_status": ("Reviewed",), "review_outcome": ("accepted",)},
                preferred_timestamp="reviewed_at",
                guidance=(
                    "Reviewed work has an accepted review and an order lifecycle status of "
                    "Reviewed."
                ),
            ),
            BusinessConcept(
                name="closed_ticket",
                synonyms=("closed task", "closed order"),
                relations=("assistant_analytics_orders",),
                columns=("status", "updated_at"),
                enum_mapping={"order_status": ("Closed",)},
                preferred_timestamp="updated_at",
                guidance="Closed is the terminal order status after manager review.",
            ),
            BusinessConcept(
                name="quotation",
                synonyms=("quote", "quoted price"),
                relations=("assistant_analytics_orders",),
                columns=("quoted_price",),
                calculation="quoted_price",
                guidance="Quotation is the admin-entered price before completion extras.",
            ),
            BusinessConcept(
                name="service_value",
                synonyms=("final amount", "service revenue"),
                relations=("assistant_analytics_completions",),
                columns=("final_amount", "completed_at"),
                preferred_timestamp="completed_at",
                calculation="SUM(final_amount)",
                guidance=(
                    "Service value uses completion final_amount, which equals quotation plus "
                    "extra charges."
                ),
            ),
            BusinessConcept(
                name="customer_payment",
                synonyms=("received payment", "paid amount"),
                relations=("assistant_analytics_payments",),
                columns=("amount", "received_at", "method"),
                preferred_timestamp="received_at",
                calculation="SUM(amount)",
                guidance=(
                    "Customer payments are payment rows and may be partial or recorded at "
                    "different times."
                ),
            ),
            BusinessConcept(
                name="outstanding_balance",
                synonyms=("outstanding", "unpaid", "remaining payment"),
                relations=("assistant_analytics_completions", "assistant_analytics_payments"),
                columns=("final_amount", "amount", "order_id"),
                calculation=(
                    "GREATEST(final_amount - COALESCE(SUM(amount), 0), 0) grouped by order_id"
                ),
                roles=management,
                guidance=(
                    "Outstanding is final service value minus all customer payments for the same "
                    "order; never subtract unrelated date-range totals."
                ),
            ),
            BusinessConcept(
                name="technician_earnings",
                synonyms=("earn", "earned", "earnings", "technician pay", "my income"),
                relations=("assistant_analytics_completions", "assistant_analytics_orders"),
                columns=("final_amount", "status", "completed_at"),
                enum_mapping={"order_status": ("Closed",)},
                preferred_timestamp="completed_at",
                calculation="SUM(final_amount) for orders whose status is Closed",
                guidance=(
                    "Technician earnings become eligible only after the ticket is Closed; RLS "
                    "limits technicians to their own rows."
                ),
            ),
            BusinessConcept(
                name="postponement",
                synonyms=("postponed", "rescheduled", "schedule change"),
                relations=("assistant_analytics_schedule_events",),
                columns=("new_scheduled_at", "previous_scheduled_at", "reason", "created_at"),
                preferred_timestamp="created_at",
                guidance=(
                    "A schedule event represents a postponement or reschedule and includes the "
                    "reason and before/after visit time."
                ),
            ),
            BusinessConcept(
                name="checklist_progress",
                synonyms=("checklist", "steps done"),
                relations=("assistant_analytics_checklist",),
                columns=("required", "completed", "completed_at"),
                preferred_timestamp="completed_at",
                guidance=(
                    "Checklist progress compares required items with completed required items for "
                    "the same order."
                ),
            ),
            BusinessConcept(
                name="correction_required",
                synonyms=("needs correction", "redo", "returned job"),
                relations=("assistant_analytics_reviews", "assistant_analytics_orders"),
                columns=("outcome", "status", "reviewed_at"),
                enum_mapping={"review_outcome": ("returned",), "order_status": ("In Progress",)},
                preferred_timestamp="reviewed_at",
                guidance=(
                    "A returned review reopens work as In Progress and indicates correction is "
                    "required."
                ),
            ),
            BusinessConcept(
                name="assignment",
                synonyms=("assigned technician", "who is assigned"),
                relations=("assistant_analytics_orders",),
                columns=("technician_name", "status"),
                enum_mapping={
                    "order_status": ("Assigned", "In Progress", "Job Done", "Reviewed", "Closed")
                },
                guidance="technician_name is display-only; caller authorization comes from RLS.",
                roles=all_roles,
            ),
            BusinessConcept(
                name="technician_workload",
                synonyms=(
                    "technician workload",
                    "overloaded technician",
                    "overloaded",
                    "overload",
                    "busiest technician",
                    "most jobs",
                ),
                relations=("assistant_analytics_orders",),
                columns=("order_id", "technician_name", "status", "scheduled_at"),
                enum_mapping={"order_status": ("Assigned", "In Progress")},
                preferred_timestamp="scheduled_at",
                calculation=(
                    "COUNT(order_id) grouped by technician_name for Assigned and In Progress "
                    "orders scheduled in THIS WEEK UTC RANGE; compare each count with the team "
                    "average and retain the counts needed to explain the conclusion"
                ),
                roles=management,
                guidance=(
                    "Workload means currently active scheduled work, not completed revenue. "
                    "Use THIS WEEK UTC RANGE exactly. Return every technician with active work "
                    "and their task count. Identify the highest count as a possible overload "
                    "only when evidence supports it; otherwise explicitly say no technician "
                    "appears overloaded. Do not turn a low non-zero count into no records."
                ),
                examples=("Which technician might be overloaded this week?",),
            ),
        ),
    )
