from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from sejuk_assistant.auth.context import Role
from sejuk_assistant.query.profile import (
    ColumnProfile,
    QuerySemanticProfile,
    RelationProfile,
    StructuralProfile,
)
from sejuk_assistant.query.profile_generator import (
    extract_migration_structure,
    verify_snapshot,
)
from sejuk_assistant.query.validator import QueryValidationError, SqlValidator
from sejuk_assistant.settings import Settings

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ROOT / "supabase" / "migrations"


def profile() -> QuerySemanticProfile:
    return QuerySemanticProfile.load()


def validator() -> SqlValidator:
    return SqlValidator(max_rows=100, max_joins=6, max_nesting=6, profile=profile())


def test_committed_profile_matches_curated_migration_structure() -> None:
    current = profile()
    actual = extract_migration_structure(
        MIGRATIONS,
        allowed_enums=set(current.structural.enums),
        allowed_views={relation.name for relation in current.structural.relations},
    )
    assert verify_snapshot(current, actual) == []


def test_structural_extraction_is_deterministic_and_curated() -> None:
    current = profile()
    kwargs = {
        "allowed_enums": set(current.structural.enums),
        "allowed_views": {relation.name for relation in current.structural.relations},
    }
    first = extract_migration_structure(MIGRATIONS, **kwargs)
    second = extract_migration_structure(MIGRATIONS, **kwargs)
    assert first == second
    serialized = json.dumps(first)
    assert "assistant_messages" not in serialized
    assert "auth.users" not in serialized
    assert "storage.objects" not in serialized


def test_profile_contract_rejects_protected_relation() -> None:
    with pytest.raises(ValidationError):
        StructuralProfile(
            schema_version=1,
            source_digest="a" * 64,
            enums={},
            relations=(
                RelationProfile(
                    name="assistant_analytics_messages",
                    purpose="Protected communication data must never be profiled.",
                    grain="One row for each protected message.",
                    key="message_id",
                    columns=(
                        ColumnProfile(
                            name="message_id",
                            data_type="uuid",
                            nullable=False,
                            meaning="Protected message identifier.",
                        ),
                    ),
                ),
            ),
            joins=(),
        )


def test_configuration_enforces_profile_prompt_bounds() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, semantic_profile_prompt_max_bytes=100)


def test_technician_prompt_has_business_semantics_without_identity_columns() -> None:
    context = profile().planner_context("is there any open task?", Role.TECHNICIAN, 14_000)
    assert "CONCEPT open_task" in context
    assert "New, Assigned, In Progress" in context
    assert "assigned_technician_id" not in context
    assert "technician_id" not in context
    assert "auth.users" not in context
    tool_context = profile().tool_selection_context(Role.TECHNICIAN)
    assert "technician_earnings" in tool_context
    assert "outstanding_balance" not in tool_context


@pytest.mark.parametrize(
    "question,role,concept",
    [
        ("is there any open task?", Role.TECHNICIAN, "open_task"),
        ("show completed work", Role.TECHNICIAN, "completed_work"),
        ("how much did I earn?", Role.TECHNICIAN, "technician_earnings"),
        ("show outstanding balances", Role.MANAGER, "outstanding_balance"),
        ("which jobs were postponed?", Role.ADMIN, "postponement"),
        ("which jobs need correction?", Role.TECHNICIAN, "correction_required"),
        ("compare final amount and payments", Role.MANAGER, "service_value"),
        (
            "which technician might be overloaded this week?",
            Role.MANAGER,
            "technician_workload",
        ),
    ],
)
def test_representative_questions_select_reviewed_concepts(
    question: str, role: Role, concept: str
) -> None:
    context = profile().planner_context(question, role, 14_000)
    assert f"CONCEPT {concept}" in context


def test_prompt_budget_fails_atomically_when_no_relation_fits() -> None:
    with pytest.raises(ValueError):
        profile().planner_context("open tasks", Role.TECHNICIAN, 100)


def test_unknown_enum_literal_is_rejected_before_execution() -> None:
    with pytest.raises(QueryValidationError) as captured:
        validator().validate(
            "SELECT order_no FROM assistant_analytics_orders WHERE status = 'Open' LIMIT 20"
        )
    assert captured.value.code == "enum_literal_unknown"


def test_profiled_enum_literals_and_join_are_allowed() -> None:
    result = validator().validate(
        "SELECT o.order_no, c.final_amount FROM assistant_analytics_orders o "
        "JOIN assistant_analytics_completions c ON c.order_id = o.order_id "
        "WHERE o.status IN ('Job Done', 'Reviewed', 'Closed') LIMIT 20"
    )
    assert result.joins == 1


def test_unprofiled_join_and_mismatched_qualified_column_are_rejected() -> None:
    with pytest.raises(QueryValidationError) as join_error:
        validator().validate(
            "SELECT o.order_no, p.amount FROM assistant_analytics_orders o "
            "JOIN assistant_analytics_payments p ON p.payment_id = o.order_id LIMIT 20"
        )
    assert join_error.value.code == "join_not_profiled"
    with pytest.raises(QueryValidationError) as column_error:
        validator().validate("SELECT p.final_amount FROM assistant_analytics_payments p LIMIT 20")
    assert column_error.value.code == "column_relation_mismatch"
