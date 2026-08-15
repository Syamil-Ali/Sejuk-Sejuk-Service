from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import httpx
import pytest

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.auth.policy import Capability
from sejuk_assistant.repositories.models import DateRange
from sejuk_assistant.repositories.supabase import CallerSupabaseRepository
from sejuk_assistant.settings import Settings
from sejuk_assistant.tools.operations import AuthorizationDenied, OperationsTools


def actor(role: Role) -> ActorContext:
    return ActorContext(uuid4(), role, uuid4(), "User", uuid4())


def date_range() -> DateRange:
    end = datetime.now(timezone.utc)
    return DateRange(end - timedelta(days=7), end)


def repository(handler: object, current_actor: ActorContext) -> CallerSupabaseRepository:
    settings = Settings(
        environment="test",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="anon",
    )
    return CallerSupabaseRepository(
        settings,
        "caller-token",
        current_actor,
        httpx.MockTransport(handler),  # type: ignore[arg-type]
    )


@pytest.mark.asyncio
async def test_technician_order_query_is_hard_scoped_to_actor() -> None:
    technician = actor(Role.TECHNICIAN)

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer caller-token"
        assert request.url.params["assigned_technician_id"] == f"eq.{technician.user_id}"
        return httpx.Response(200, json=[])

    repo = repository(handler, technician)
    try:
        result = await OperationsTools(technician, repo).search_orders("ORDER")
        assert result.data == []
    finally:
        await repo.close()


@pytest.mark.asyncio
async def test_technician_performance_ignores_requested_other_identity() -> None:
    technician = actor(Role.TECHNICIAN)

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["technician_id"] == f"eq.{technician.user_id}"
        return httpx.Response(200, json=[])

    repo = repository(handler, technician)
    try:
        result = await OperationsTools(technician, repo).technician_performance(
            str(uuid4()), date_range()
        )
        assert result.data == {"jobs": 0, "serviceValue": 0}
    finally:
        await repo.close()


@pytest.mark.asyncio
async def test_technician_workload_returns_team_counts_and_average() -> None:
    manager = actor(Role.MANAGER)
    period = date_range()
    rows = [
        {
            "id": "c1",
            "final_amount": 260,
            "completed_at": "2026-08-15T00:00:00Z",
            "technician_id": "tech-1",
            "orders": {"id": "o1", "order_no": "ORDER1"},
            "profiles": {"display_name": "Ali"},
        },
        {
            "id": "c2",
            "final_amount": 180,
            "completed_at": "2026-08-15T00:00:00Z",
            "technician_id": "tech-1",
            "orders": {"id": "o2", "order_no": "ORDER2"},
            "profiles": {"display_name": "Ali"},
        },
        {
            "id": "c3",
            "final_amount": 220,
            "completed_at": "2026-08-15T00:00:00Z",
            "technician_id": "tech-2",
            "orders": {"id": "o3", "order_no": "ORDER3"},
            "profiles": {"display_name": "Bala"},
        },
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["completed_at"] == f"gte.{period.start.isoformat()}"
        return httpx.Response(200, json=rows)

    repo = repository(handler, manager)
    try:
        result = await OperationsTools(manager, repo).technician_workload(period)
        assert result.data["totalJobs"] == 3
        assert result.data["teamAverageJobs"] == 1.5
        assert result.data["technicians"][0]["name"] == "Ali"
        assert result.data["technicians"][0]["jobs"] == 2
        assert result.data["technicians"][1]["jobs"] == 1
        assert len(result.citations) == 3
    finally:
        await repo.close()


@pytest.mark.asyncio
async def test_technician_workload_denied_for_technicians() -> None:
    technician = actor(Role.TECHNICIAN)
    repo = repository(lambda request: httpx.Response(200, json=[]), technician)
    try:
        with pytest.raises(AuthorizationDenied):
            await OperationsTools(technician, repo).technician_workload(date_range())
    finally:
        await repo.close()


def test_invalid_or_oversized_ranges_are_rejected() -> None:
    now = datetime.now(timezone.utc)
    with pytest.raises(ValueError):
        DateRange(now, now)
    with pytest.raises(ValueError):
        DateRange(now - timedelta(days=367), now)


@pytest.mark.asyncio
async def test_technician_cannot_invoke_organization_audit_capability() -> None:
    technician = actor(Role.TECHNICIAN)
    repo = repository(lambda _: httpx.Response(500), technician)
    try:
        with pytest.raises(AuthorizationDenied):
            OperationsTools(technician, repo)._require(Capability.AUDITS_ORGANIZATION)
    finally:
        await repo.close()


@pytest.mark.asyncio
async def test_order_results_are_bounded_and_cited() -> None:
    manager = actor(Role.MANAGER)
    rows = [
        {"id": str(uuid4()), "order_no": f"ORDER{i:06}", "updated_at": "2026-08-13T00:00:00Z"}
        for i in range(3)
    ]
    repo = repository(lambda _: httpx.Response(200, json=rows), manager)
    try:
        result = await OperationsTools(manager, repo).search_orders(limit=2)
        assert len(result.data) == 2
        assert len(result.citations) == 2
        assert result.truncated
    finally:
        await repo.close()


@pytest.mark.asyncio
async def test_financial_context_calculates_outstanding_and_cites_sources() -> None:
    manager = actor(Role.MANAGER)
    order_id = str(uuid4())
    payment_id = str(uuid4())
    row = {
        "id": order_id,
        "order_no": "ORDER001234",
        "quoted_price": "180.00",
        "assigned_technician_id": str(uuid4()),
        "service_completions": [{"final_amount": "200.00"}],
        "payments": [{"id": payment_id, "amount": "80.00", "method": "Cash"}],
    }
    repo = repository(lambda _: httpx.Response(200, json=[row]), manager)
    try:
        result = await OperationsTools(manager, repo).financial_context(order_id)
        assert result.data["outstanding"] == 120
        assert {citation.source_type for citation in result.citations} == {"order", "payment"}
    finally:
        await repo.close()


@pytest.mark.asyncio
async def test_technician_financial_context_rejects_unassigned_result() -> None:
    technician = actor(Role.TECHNICIAN)
    row = {
        "id": str(uuid4()),
        "order_no": "ORDER001234",
        "quoted_price": "180.00",
        "assigned_technician_id": str(uuid4()),
        "service_completions": [],
        "payments": [],
    }
    repo = repository(lambda _: httpx.Response(200, json=[row]), technician)
    try:
        with pytest.raises(AuthorizationDenied):
            await OperationsTools(technician, repo).financial_context(row["id"])
    finally:
        await repo.close()


@pytest.mark.asyncio
async def test_postponements_are_actor_scoped_and_bounded() -> None:
    technician = actor(Role.TECHNICIAN)

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["orders.assigned_technician_id"] == f"eq.{technician.user_id}"
        return httpx.Response(200, json=[])

    repo = repository(handler, technician)
    try:
        result = await OperationsTools(technician, repo).postponement_summary(date_range())
        assert result.data == {"count": 0, "events": []}
    finally:
        await repo.close()
