from __future__ import annotations

import json
from uuid import uuid4

import pytest

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.query.data_profile import resolved_profile_context
from sejuk_assistant.query.profile import QuerySemanticProfile


class ProfileRepository:
    def __init__(self) -> None:
        self.sql: list[str] = []

    async def rpc(self, function: str, payload: dict[str, object]) -> object:
        assert function == "execute_assistant_analytical_query"
        self.sql.append(str(payload["p_sql"]))
        return {
            "rows": [{"row_count": 3, "c0_missing": 0}],
            "rowCount": 1,
            "truncated": False,
        }


@pytest.mark.asyncio
async def test_runtime_profile_is_role_scoped_and_contains_no_raw_samples() -> None:
    actor = ActorContext(uuid4(), Role.MANAGER, uuid4(), "Farah", uuid4())
    repository = ProfileRepository()
    context = await resolved_profile_context(
        repository,  # type: ignore[arg-type]
        QuerySemanticProfile.load(),
        actor,
        "Which technician might be overloaded this week?",
        ttl_seconds=60,
    )
    payload = json.loads(context)
    assert payload["authorization_scope"] == "manager"
    assert payload["raw_sample_values_included"] is False
    orders = next(
        relation
        for relation in payload["relations"]
        if relation["name"] == "assistant_analytics_orders"
    )
    assert orders["row_count"] == 3
    customer = next(
        column
        for column in orders["columns"]
        if column["name"] == "customer_name"
    )
    assert customer["sensitivity"] == "restricted"
    assert "unique" not in customer
    assert all("COUNT(DISTINCT \"customer_name\")" not in sql for sql in repository.sql)


@pytest.mark.asyncio
async def test_technician_profile_omits_internal_identity_columns() -> None:
    actor = ActorContext(uuid4(), Role.TECHNICIAN, uuid4(), "John", uuid4())
    repository = ProfileRepository()
    context = await resolved_profile_context(
        repository,  # type: ignore[arg-type]
        QuerySemanticProfile.load(),
        actor,
        "show my open task workload",
        ttl_seconds=60,
    )
    assert "assigned_technician_id" not in context
    assert "technician_id" not in context
