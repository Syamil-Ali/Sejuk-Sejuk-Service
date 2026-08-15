from __future__ import annotations

from dataclasses import dataclass

from sejuk_assistant.auth.context import Role
from sejuk_assistant.query.profile import QuerySemanticProfile


@dataclass(frozen=True, slots=True)
class Relation:
    name: str
    description: str
    columns: tuple[str, ...]


RELATIONS: tuple[Relation, ...] = (
    Relation(
        "assistant_analytics_orders",
        (
            "One authorized service order per row. scheduled_at and created_at are timestamptz. "
            "status is the order lifecycle enum: New, Assigned, In Progress, Job Done, "
            "Reviewed, or Closed. Open is not a stored status; an open task means status is "
            "New, Assigned, or In Progress."
        ),
        (
            "order_id",
            "order_no",
            "customer_name",
            "service_type",
            "status",
            "quoted_price",
            "assigned_technician_id",
            "technician_name",
            "branch_name",
            "scheduled_at",
            "created_at",
            "updated_at",
        ),
    ),
    Relation(
        "assistant_analytics_completions",
        "One authorized completed service record per order.",
        (
            "completion_id",
            "order_id",
            "order_no",
            "technician_id",
            "technician_name",
            "extra_charges",
            "final_amount",
            "completed_at",
        ),
    ),
    Relation(
        "assistant_analytics_payments",
        "Authorized customer payment records connected to service orders.",
        (
            "payment_id",
            "order_id",
            "order_no",
            "assigned_technician_id",
            "amount",
            "method",
            "received_at",
        ),
    ),
    Relation(
        "assistant_analytics_schedule_events",
        "Authorized postponement and reschedule events.",
        (
            "event_id",
            "order_id",
            "order_no",
            "assigned_technician_id",
            "previous_scheduled_at",
            "new_scheduled_at",
            "reason",
            "created_at",
        ),
    ),
    Relation(
        "assistant_analytics_reviews",
        "Authorized manager review outcomes for service orders.",
        ("review_id", "order_id", "order_no", "outcome", "reviewed_at"),
    ),
    Relation(
        "assistant_analytics_checklist",
        "Authorized checklist steps belonging to service orders.",
        ("item_id", "order_id", "order_no", "required", "completed", "completed_at"),
    ),
)

RELATION_COLUMNS = {relation.name: frozenset(relation.columns) for relation in RELATIONS}

SAFE_FUNCTIONS = frozenset(
    {
        "avg",
        "ceil",
        "coalesce",
        "count",
        "date_trunc",
        "extract",
        "floor",
        "greatest",
        "least",
        "lower",
        "max",
        "min",
        "nullif",
        "round",
        "sum",
        "timestamp_trunc",
        "current_date",
        "current_timestamp",
        "upper",
    }
)


def semantic_schema(
    *,
    technician: bool = False,
    question: str = "",
    max_bytes: int = 14_000,
    profile: QuerySemanticProfile | None = None,
) -> str:
    if profile is not None:
        role = Role.TECHNICIAN if technician else Role.MANAGER
        return profile.planner_context(question, role, max_bytes)
    lines = [
        "Schema version: 1",
        "Timezone: Asia/Kuala_Lumpur. Convert timestamptz before comparing calendar dates.",
        (
            "Order status values are exactly: New, Assigned, In Progress, Job Done, Reviewed, "
            "Closed. Never compare status to Open, Completed, Pending, or another invented value."
        ),
        "Business definition: open tasks have status New, Assigned, or In Progress.",
        "Only the following RLS-protected views and columns exist for this skill:",
    ]
    for relation in RELATIONS:
        lines.append(f"- {relation.name}: {relation.description}")
        columns = relation.columns
        if technician:
            columns = tuple(
                column
                for column in columns
                if column not in {"assigned_technician_id", "technician_id"}
            )
        lines.append(f"  columns: {', '.join(columns)}")
    lines.append(f"Allowed functions: {', '.join(sorted(SAFE_FUNCTIONS))}")
    return "\n".join(lines)
