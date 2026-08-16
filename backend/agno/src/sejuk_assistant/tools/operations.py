from __future__ import annotations

import base64
from datetime import datetime, timezone
from uuid import UUID as UuidType

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.auth.policy import Capability, decide
from sejuk_assistant.knowledge.handbook import organization_handbook
from sejuk_assistant.repositories.models import Citation, DateRange, Evidence
from sejuk_assistant.repositories.supabase import CallerSupabaseRepository


class AuthorizationDenied(Exception):
    pass


def encode_order_id(order_id: str) -> str:
    """Compact URL-safe order identifier (base64url of the UUID)."""
    try:
        raw = UuidType(order_id)
    except (ValueError, AttributeError, TypeError):
        return order_id
    return base64.urlsafe_b64encode(raw.bytes).decode("ascii").rstrip("=")


class OperationsTools:
    MAX_ROWS = 50

    def __init__(self, actor: ActorContext, repository: CallerSupabaseRepository) -> None:
        self.actor = actor
        self.repository = repository

    def _require(self, capability: Capability) -> None:
        decision = decide(self.actor, capability)
        if not decision.allowed:
            raise AuthorizationDenied(decision.public_message)

    async def search_orders(self, query: str = "", limit: int = 20) -> Evidence:
        capability = (
            Capability.ORDERS_OWN
            if self.actor.role is Role.TECHNICIAN
            else Capability.ORDERS_ORGANIZATION
        )
        self._require(capability)
        bounded = min(max(limit, 1), self.MAX_ROWS)
        params = {
            "select": (
                "id,public_id,order_no,customer_name,service_type,status,quoted_price,"
                "scheduled_at,assigned_technician_id,updated_at"
            ),
            "order": "updated_at.desc",
            "limit": str(bounded + 1),
        }
        if self.actor.role is Role.TECHNICIAN:
            params["assigned_technician_id"] = f"eq.{self.actor.user_id}"
        if query.strip():
            safe = query.strip().replace("%", "")[:80]
            params["or"] = f"(order_no.ilike.*{safe}*,customer_name.ilike.*{safe}*)"
        rows = await self.repository.get("orders", params)
        visible = rows[:bounded]
        now = datetime.now(timezone.utc)
        citations = tuple(
            Citation(
                "order",
                row["id"],
                row["order_no"],
                now,
                f"/portal/orders/{row.get('public_id') or encode_order_id(row['id'])}",
            )
            for row in visible
        )
        return Evidence(visible, citations, len(rows) > bounded)

    async def order_summary(self, date_range: DateRange) -> Evidence:
        capability = (
            Capability.ORDERS_OWN
            if self.actor.role is Role.TECHNICIAN
            else Capability.ORDERS_ORGANIZATION
        )
        self._require(capability)
        data = await self.repository.rpc(
            "assistant_order_summary",
            {"p_from": date_range.start.isoformat(), "p_to": date_range.end.isoformat()},
        )
        return Evidence(data, (), False)

    async def payment_summary(self, date_range: DateRange) -> Evidence:
        capability = (
            Capability.PAYMENTS_OWN_JOBS
            if self.actor.role is Role.TECHNICIAN
            else Capability.PAYMENTS_ORGANIZATION
        )
        self._require(capability)
        rows = await self.repository.get(
            "payments",
            {
                "select": (
                    "id,order_id,amount,method,received_at,"
                    "orders!inner(assigned_technician_id,order_no)"
                ),
                "received_at": f"gte.{date_range.start.isoformat()}",
                "and": f"(received_at.lt.{date_range.end.isoformat()})",
                "limit": str(self.MAX_ROWS + 1),
            },
        )
        if self.actor.role is Role.TECHNICIAN:
            rows = [
                row
                for row in rows
                if row.get("orders", {}).get("assigned_technician_id") == str(self.actor.user_id)
            ]
        visible = rows[: self.MAX_ROWS]
        total = sum(float(row["amount"]) for row in visible)
        now = datetime.now(timezone.utc)
        citations = tuple(
            Citation("payment", row["id"], row.get("orders", {}).get("order_no", "Payment"), now)
            for row in visible
        )
        return Evidence({"total": total, "payments": visible}, citations, len(rows) > self.MAX_ROWS)

    async def financial_context(self, order_id: str) -> Evidence:
        capability = (
            Capability.PAYMENTS_OWN_JOBS
            if self.actor.role is Role.TECHNICIAN
            else Capability.PAYMENTS_ORGANIZATION
        )
        self._require(capability)
        rows = await self.repository.get(
            "orders",
            {
            "select": (
                "id,public_id,order_no,quoted_price,assigned_technician_id,"
                "service_completions(final_amount),payments(id,amount,method,received_at)"
            ),
                "id": f"eq.{order_id}",
                "limit": "1",
            },
        )
        if not rows:
            return Evidence({"available": False}, ())
        row = rows[0]
        if self.actor.role is Role.TECHNICIAN and row.get("assigned_technician_id") != str(
            self.actor.user_id
        ):
            raise AuthorizationDenied("You do not have access to that information.")
        completions = row.get("service_completions") or []
        final_amount = (
            float(completions[0]["final_amount"]) if completions else float(row["quoted_price"])
        )
        payments = row.get("payments") or []
        received = sum(float(payment["amount"]) for payment in payments)
        now = datetime.now(timezone.utc)
        citations = (
            Citation(
                "order",
                row["id"],
                row["order_no"],
                now,
                f"/portal/orders/{row.get('public_id') or encode_order_id(row['id'])}",
            ),
            *(Citation("payment", payment["id"], row["order_no"], now) for payment in payments),
        )
        return Evidence(
            {
                "finalAmount": final_amount,
                "received": received,
                "outstanding": max(final_amount - received, 0),
                "payments": payments,
            },
            citations,
        )

    async def postponement_summary(self, date_range: DateRange) -> Evidence:
        capability = (
            Capability.ORDERS_OWN
            if self.actor.role is Role.TECHNICIAN
            else Capability.ORDERS_ORGANIZATION
        )
        self._require(capability)
        params = {
            "select": (
                "id,order_id,new_scheduled_at,reason,created_at,"
                "orders!inner(order_no,assigned_technician_id)"
            ),
            "created_at": f"gte.{date_range.start.isoformat()}",
            "and": f"(created_at.lt.{date_range.end.isoformat()})",
            "limit": str(self.MAX_ROWS + 1),
        }
        if self.actor.role is Role.TECHNICIAN:
            params["orders.assigned_technician_id"] = f"eq.{self.actor.user_id}"
        rows = await self.repository.get("schedule_events", params)
        visible = rows[: self.MAX_ROWS]
        now = datetime.now(timezone.utc)
        return Evidence(
            {"count": len(visible), "events": visible},
            tuple(Citation("audit", row["id"], row["orders"]["order_no"], now) for row in visible),
            len(rows) > self.MAX_ROWS,
        )

    async def technician_performance(
        self, technician_id: str | None, date_range: DateRange
    ) -> Evidence:
        effective_id: str | None
        if self.actor.role is Role.TECHNICIAN:
            self._require(Capability.PERFORMANCE_OWN)
            effective_id = str(self.actor.user_id)
        else:
            self._require(Capability.PERFORMANCE_ORGANIZATION)
            effective_id = technician_id
        params: dict[str, str] = {
            "select": "id,final_amount,completed_at,technician_id,orders!inner(id,order_no)",
            "completed_at": f"gte.{date_range.start.isoformat()}",
            "and": f"(completed_at.lt.{date_range.end.isoformat()})",
            "limit": str(self.MAX_ROWS + 1),
        }
        if effective_id:
            params["technician_id"] = f"eq.{effective_id}"
        rows = await self.repository.get("service_completions", params)
        visible = rows[: self.MAX_ROWS]
        data = {
            "jobs": len(visible),
            "serviceValue": sum(float(row["final_amount"]) for row in visible),
        }
        now = datetime.now(timezone.utc)
        citations = tuple(
            Citation("performance", row["id"], row["orders"]["order_no"], now) for row in visible
        )
        return Evidence(data, citations, len(rows) > self.MAX_ROWS)

    async def technician_workload(self, date_range: DateRange) -> Evidence:
        """Per-technician completed jobs and service value in a period, with the
        team average so the assistant can surface overload comparisons."""
        self._require(Capability.PERFORMANCE_ORGANIZATION)
        rows = await self.repository.get(
            "service_completions",
            {
                "select": (
                    "id,final_amount,completed_at,technician_id,"
                    "orders!inner(id,order_no),profiles!inner(display_name)"
                ),
                "completed_at": f"gte.{date_range.start.isoformat()}",
                "and": f"(completed_at.lt.{date_range.end.isoformat()})",
                "limit": str(self.MAX_ROWS + 1),
            },
        )
        visible = rows[: self.MAX_ROWS]
        team: dict[str, dict[str, int | float | str]] = {}
        for row in visible:
            technician_id = row.get("technician_id")
            if not technician_id:
                continue
            key = str(technician_id)
            entry = team.setdefault(
                key,
                {
                    "technicianId": key,
                    "name": row.get("profiles", {}).get("display_name", "Technician"),
                    "jobs": 0,
                    "serviceValue": 0.0,
                },
            )
            entry["jobs"] = int(entry["jobs"]) + 1
            entry["serviceValue"] = float(entry["serviceValue"]) + float(
                row.get("final_amount") or 0
            )
        ranked = sorted(team.values(), key=lambda item: int(item["jobs"]), reverse=True)
        total_jobs = sum(int(item["jobs"]) for item in ranked)
        average = round(total_jobs / max(len(ranked), 1), 2)
        now = datetime.now(timezone.utc)
        citations = tuple(
            Citation("performance", row["id"], row["orders"]["order_no"], now) for row in visible
        )
        return Evidence(
            {
                "from": date_range.start.isoformat(),
                "to": date_range.end.isoformat(),
                "totalJobs": total_jobs,
                "teamAverageJobs": average,
                "technicians": ranked,
            },
            citations,
            len(rows) > self.MAX_ROWS,
        )

    async def search_accessible_messages(self, query: str, limit: int = 20) -> Evidence:
        self._require(Capability.COMMUNICATIONS_ACCESSIBLE)
        safe = query.strip().replace("%", "")[:100]
        rows = await self.repository.get(
            "messages",
            {
                "select": "id,conversation_id,sender_id,body,created_at",
                "body": f"ilike.*{safe}*",
                "order": "created_at.desc",
                "limit": str(min(max(limit, 1), self.MAX_ROWS)),
            },
        )
        now = datetime.now(timezone.utc)
        return Evidence(
            rows,
            tuple(Citation("message", row["id"], "Accessible conversation", now) for row in rows),
        )

    async def search_staff_directory(self, query: str = "") -> Evidence:
        self._require(Capability.STAFF_DIRECTORY)
        rows = await self.repository.rpc("staff_directory", {})
        safe = query.strip().casefold()
        visible = [
            row
            for row in (rows if isinstance(rows, list) else [])
            if not safe or safe in str(row.get("display_name", "")).casefold()
        ][: self.MAX_ROWS]
        now = datetime.now(timezone.utc)
        return Evidence(
            {"staff": visible, "organization_handbook": organization_handbook()},
            tuple(Citation("profile", row["id"], row["display_name"], now) for row in visible),
        )

    async def organization_handbook(self) -> Evidence:
        self._require(Capability.DOCUMENTS_AUTHORIZED)
        now = datetime.now(timezone.utc)
        return Evidence(
            {"organization_handbook": organization_handbook()},
            (
                Citation(
                    "document",
                    "sejuk-operations-handbook",
                    "Sejuk Sejuk Service Sdn Bhd organization handbook",
                    now,
                ),
            ),
        )

    async def search_reviews_or_audits(self, order_id: str, source: str = "audit") -> Evidence:
        if self.actor.role is Role.TECHNICIAN:
            capability = Capability.CORRECTIONS_OWN_JOBS
            table = "reviews"
        elif source == "review":
            capability = Capability.REVIEWS_ORGANIZATION
            table = "reviews"
        else:
            capability = Capability.AUDITS_ORGANIZATION
            table = "audit_events"
        self._require(capability)
        rows = await self.repository.get(
            table,
            {"select": "*", "order_id": f"eq.{order_id}", "limit": str(self.MAX_ROWS)},
        )
        now = datetime.now(timezone.utc)
        return Evidence(
            rows,
            tuple(
                Citation(
                    "audit",
                    str(row["id"]),
                    "Order history",
                    now,
                    f"/portal/orders/{encode_order_id(order_id)}",
                )
                for row in rows
            ),
        )
