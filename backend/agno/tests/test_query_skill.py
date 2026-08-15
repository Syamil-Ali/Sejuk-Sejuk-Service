from __future__ import annotations

from uuid import uuid4

import pytest
from pydantic import ValidationError

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.query.catalog import RELATION_COLUMNS, semantic_schema
from sejuk_assistant.query.contracts import QueryPlan
from sejuk_assistant.query.skill import QuerySkill
from sejuk_assistant.query.validator import QueryValidationError, SqlValidator
from sejuk_assistant.repositories.supabase import RepositoryError
from sejuk_assistant.settings import Settings


class PlannerResult:
    def __init__(self, content: QueryPlan) -> None:
        self.content = content


class FakeQueryPlanner:
    def __init__(self, plans: list[QueryPlan]) -> None:
        self.plans = plans
        self.prompts: list[str] = []

    async def arun(self, prompt: str) -> PlannerResult:
        self.prompts.append(prompt)
        return PlannerResult(self.plans.pop(0))


class FakeQueryRepository:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, object]]] = []

    async def rpc(self, function: str, payload: dict[str, object]) -> object:
        self.calls.append((function, payload))
        return {
            "rows": [{"task_count": 1}],
            "rowCount": 1,
            "truncated": False,
            "retrievedAt": "2026-08-13T15:00:00+00:00",
        }


class FailingThenSuccessfulRepository(FakeQueryRepository):
    async def rpc(self, function: str, payload: dict[str, object]) -> object:
        self.calls.append((function, payload))
        if len(self.calls) == 1:
            raise RepositoryError("The requested data is unavailable.", "42803")
        return {
            "rows": [],
            "rowCount": 0,
            "truncated": False,
            "retrievedAt": "2026-08-13T15:00:00+00:00",
        }


def technician() -> ActorContext:
    return ActorContext(uuid4(), Role.TECHNICIAN, uuid4(), "Ali", uuid4())


@pytest.fixture
def validator() -> SqlValidator:
    return SqlValidator(max_rows=100, max_joins=2, max_nesting=6, max_date_range_days=366)


def test_query_configuration_has_secure_bounds() -> None:
    settings = Settings(_env_file=None)
    assert settings.query_skill_enabled is False
    assert settings.query_statement_timeout_ms <= 15_000
    assert settings.query_max_rows <= 500
    with pytest.raises(ValidationError):
        Settings(_env_file=None, query_max_rows=10_000)


def test_semantic_schema_contains_only_curated_views() -> None:
    schema = semantic_schema()
    assert "assistant_analytics_orders" in schema
    assert "auth.users" not in schema
    assert "assistant_messages" not in schema
    assert "storage.objects" not in schema
    assert "Open is not a stored status" in schema
    assert "New, Assigned, or In Progress" in schema
    assert set(RELATION_COLUMNS) == {
        "assistant_analytics_orders",
        "assistant_analytics_completions",
        "assistant_analytics_payments",
        "assistant_analytics_schedule_events",
        "assistant_analytics_reviews",
        "assistant_analytics_checklist",
    }


def test_query_plan_is_bounded() -> None:
    plan = QueryPlan(mode="query", sql="SELECT 1", result_description="one")
    assert plan.model_dump_json()
    with pytest.raises(ValidationError):
        QueryPlan(mode="query", sql="x" * 12_001)


def test_supabase_timestamp_with_variable_fraction_is_accepted() -> None:
    parsed = QuerySkill._parse_timestamp("2026-08-13T16:31:46.85016+00:00")
    assert parsed.microsecond == 850_160


def test_valid_multi_table_analytics_is_canonicalized(validator: SqlValidator) -> None:
    result = validator.validate(
        "SELECT o.technician_name, COUNT(o.order_id) AS jobs, "
        "SUM(c.final_amount) AS service_value "
        "FROM assistant_analytics_orders o "
        "JOIN assistant_analytics_completions c ON c.order_id = o.order_id "
        "GROUP BY o.technician_name ORDER BY service_value DESC LIMIT 20"
    )
    assert result.joins == 1
    assert result.relations == (
        "assistant_analytics_completions",
        "assistant_analytics_orders",
    )
    assert len(result.fingerprint) == 64


@pytest.mark.parametrize(
    "sql",
    [
        "SELECT COUNT(*) AS task_count FROM assistant_analytics_orders",
        (
            "SELECT EXISTS(SELECT 1 FROM assistant_analytics_orders "
            "WHERE status = 'Closed') AS has_completed"
        ),
        (
            "SELECT COUNT(CASE WHEN status = 'Closed' THEN 1 END) AS completed "
            "FROM assistant_analytics_orders"
        ),
        (
            "SELECT COUNT(*) FILTER (WHERE status = 'Closed') AS completed "
            "FROM assistant_analytics_orders"
        ),
        (
            "SELECT CAST(completed_at AS DATE) AS completed_date "
            "FROM assistant_analytics_completions LIMIT 10"
        ),
    ],
)
def test_common_safe_analytical_expressions_are_allowed(validator: SqlValidator, sql: str) -> None:
    assert validator.validate(sql).canonical_sql


def test_weekly_technician_workload_query_is_allowed(validator: SqlValidator) -> None:
    result = validator.validate(
        "SELECT technician_name, COUNT(order_id) AS active_jobs "
        "FROM assistant_analytics_orders "
        "WHERE status IN ('Assigned', 'In Progress') "
        "AND scheduled_at >= DATE_TRUNC('week', CURRENT_DATE) "
        "GROUP BY technician_name ORDER BY active_jobs DESC LIMIT 20"
    )
    assert result.relations == ("assistant_analytics_orders",)
    assert result.selected_columns == 2


@pytest.mark.parametrize(
    "sql,code",
    [
        ("DELETE FROM assistant_analytics_orders", "not_select"),
        (
            "SELECT order_no FROM assistant_analytics_orders; DELETE FROM orders",
            "multiple_statements",
        ),
        ("SELECT * FROM assistant_analytics_orders", "star_not_allowed"),
        ("SELECT secret FROM assistant_analytics_orders", "column_not_allowed"),
        ("SELECT relname FROM pg_catalog.pg_class", "relation_not_allowed"),
        ("SELECT pg_sleep(10) FROM assistant_analytics_orders", "function_not_allowed"),
        (
            "WITH changed AS (DELETE FROM assistant_analytics_orders RETURNING order_id) "
            "SELECT order_id FROM changed",
            "mutation_or_command",
        ),
        (
            "SELECT o.order_no FROM assistant_analytics_orders o "
            "JOIN assistant_analytics_completions c ON c.order_id=o.order_id "
            "JOIN assistant_analytics_payments p ON p.order_id=o.order_id "
            "JOIN assistant_analytics_reviews r ON r.order_id=o.order_id",
            "query_too_complex",
        ),
        ("SELECT order_no FROM assistant_analytics_orders LIMIT 101", "limit_too_large"),
        (
            "SELECT order_no FROM assistant_analytics_orders "
            "WHERE created_at >= '2024-01-01' AND created_at < '2026-01-02'",
            "date_range_too_large",
        ),
    ],
)
def test_unsafe_or_excessive_queries_are_rejected(
    validator: SqlValidator, sql: str, code: str
) -> None:
    with pytest.raises(QueryValidationError) as captured:
        validator.validate(sql)
    assert captured.value.code == code


@pytest.mark.asyncio
async def test_query_skill_executes_validated_sql_with_caller_repository() -> None:
    planner = FakeQueryPlanner(
        [
            QueryPlan(
                mode="query",
                sql=(
                    "SELECT COUNT(order_id) AS task_count FROM assistant_analytics_orders "
                    "WHERE scheduled_at >= '2026-08-12T16:00:00+00:00' "
                    "AND scheduled_at < '2026-08-13T16:00:00+00:00'"
                ),
                result_description="Today's assigned task count",
            )
        ]
    )
    repository = FakeQueryRepository()
    skill = QuerySkill(
        Settings(_env_file=None, query_skill_enabled=True, google_api_key="test"),
        technician(),
        repository,  # type: ignore[arg-type]
        planner,
    )
    evidence = await skill.query("How many tasks do I have today?")
    assert evidence.data["rows"] == [{"task_count": 1}]
    assert evidence.citations[0].label == "Authorized operational analytics"
    assert repository.calls[0][0] == "execute_assistant_analytical_query"
    assert "DELETE" not in str(repository.calls[0][1]["p_sql"])
    assert "Asia/Kuala_Lumpur" in planner.prompts[0]
    assert "THIS WEEK UTC RANGE (Monday to next Monday" in planner.prompts[0]


@pytest.mark.asyncio
async def test_query_skill_repairs_once_without_executing_invalid_sql() -> None:
    planner = FakeQueryPlanner(
        [
            QueryPlan(mode="query", sql="DELETE FROM orders"),
            QueryPlan(
                mode="query",
                sql="SELECT COUNT(order_id) AS jobs FROM assistant_analytics_orders",
            ),
        ]
    )
    repository = FakeQueryRepository()
    skill = QuerySkill(
        Settings(_env_file=None, query_skill_enabled=True, google_api_key="test"),
        technician(),
        repository,  # type: ignore[arg-type]
        planner,
    )
    evidence = await skill.query("Count my jobs")
    assert evidence.data["status"] == "completed"
    assert len(repository.calls) == 1
    assert "not_select" in planner.prompts[1]


@pytest.mark.asyncio
async def test_query_skill_repairs_unknown_enum_before_database_execution() -> None:
    planner = FakeQueryPlanner(
        [
            QueryPlan(
                mode="query",
                sql=(
                    "SELECT order_no, status FROM assistant_analytics_orders "
                    "WHERE status = 'Open' LIMIT 20"
                ),
            ),
            QueryPlan(
                mode="query",
                sql=(
                    "SELECT order_no, status FROM assistant_analytics_orders "
                    "WHERE status IN ('New', 'Assigned', 'In Progress') LIMIT 20"
                ),
            ),
        ]
    )
    repository = FakeQueryRepository()
    skill = QuerySkill(
        Settings(_env_file=None, query_skill_enabled=True, google_api_key="test"),
        technician(),
        repository,  # type: ignore[arg-type]
        planner,
    )
    evidence = await skill.query("Are there any open tasks?")
    assert evidence.data["status"] == "completed"
    assert len(repository.calls) == 1
    assert "enum_literal_unknown" in planner.prompts[1]
    assert "WHERE status = 'Open'" not in planner.prompts[1]
    assert evidence.data["profile_version"]


@pytest.mark.asyncio
async def test_query_skill_repairs_one_sanitized_database_semantic_error() -> None:
    planner = FakeQueryPlanner(
        [
            QueryPlan(
                mode="query",
                sql=(
                    "SELECT COUNT(*) AS task_count FROM assistant_analytics_orders "
                    "ORDER BY scheduled_at"
                ),
            ),
            QueryPlan(
                mode="query",
                sql=(
                    "SELECT order_id, order_no, customer_name, service_type, status, "
                    "quoted_price, technician_name, scheduled_at "
                    "FROM assistant_analytics_orders WHERE status != 'Closed' "
                    "ORDER BY scheduled_at LIMIT 20"
                ),
            ),
        ]
    )
    repository = FailingThenSuccessfulRepository()
    skill = QuerySkill(
        Settings(_env_file=None, query_skill_enabled=True, google_api_key="test"),
        technician(),
        repository,  # type: ignore[arg-type]
        planner,
    )
    evidence = await skill.query("Are there any open tasks?")
    assert evidence.data["status"] == "completed"
    assert len(repository.calls) == 2
    assert "database_query_invalid" in planner.prompts[1]
    assert "42803" not in planner.prompts[1]


@pytest.mark.asyncio
async def test_technician_direct_select_uses_validator_and_caller_scoped_rpc() -> None:
    repository = FakeQueryRepository()
    skill = QuerySkill(
        Settings(_env_file=None, query_skill_enabled=True, google_api_key="test"),
        technician(),
        repository,  # type: ignore[arg-type]
        FakeQueryPlanner([]),
    )
    evidence = await skill.query(
        "SELECT order_no, status FROM assistant_analytics_orders ORDER BY scheduled_at LIMIT 20"
    )
    assert evidence.data["status"] == "completed"
    assert len(repository.calls) == 1


@pytest.mark.asyncio
async def test_technician_direct_identity_filter_is_scope_denied() -> None:
    repository = FakeQueryRepository()
    skill = QuerySkill(
        Settings(_env_file=None, query_skill_enabled=True, google_api_key="test"),
        technician(),
        repository,  # type: ignore[arg-type]
        FakeQueryPlanner([]),
    )
    evidence = await skill.query(
        "SELECT order_no FROM assistant_analytics_orders "
        "WHERE assigned_technician_id = '20000000-0000-0000-0000-000000000004'"
    )
    assert evidence.data == {
        "status": "scope_denied",
        "code": "identity_filter_forbidden",
    }
    assert repository.calls == []
