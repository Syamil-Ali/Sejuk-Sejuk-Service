from __future__ import annotations

import json
from collections.abc import AsyncIterator
from dataclasses import asdict
from datetime import datetime, time, timezone
from typing import Any

from sejuk_assistant.analytics.presentation import AnalyticsPresenter
from sejuk_assistant.auth.context import ActorContext
from sejuk_assistant.chat.response import AnswerGenerator, ToolPlan, ToolPlanner
from sejuk_assistant.chat.safety import refusal_for
from sejuk_assistant.documents.retrieval import DocumentRetrieval
from sejuk_assistant.query.skill import QuerySkill
from sejuk_assistant.repositories.models import DateRange, Evidence
from sejuk_assistant.tools.operations import OperationsTools
from sejuk_assistant.tools.registry import build_tool_registry


class ChatOrchestrator:
    """Read-only coordinator; every data call remains bound to ActorContext."""

    def __init__(
        self,
        actor: ActorContext,
        tools: OperationsTools,
        answer_generator: AnswerGenerator | None = None,
        tool_planner: ToolPlanner | None = None,
        query_skill: QuerySkill | None = None,
        document_retrieval: DocumentRetrieval | None = None,
    ) -> None:
        self.actor = actor
        self.tools = tools
        self.registry = build_tool_registry(actor)
        self.presenter = AnalyticsPresenter()
        self.answer_generator = answer_generator
        self.tool_planner = tool_planner
        self.query_skill = query_skill
        self.document_retrieval = document_retrieval

    @staticmethod
    def _period(plan: ToolPlan) -> DateRange:
        if plan.start_date and plan.end_date:
            return DateRange(
                datetime.combine(plan.start_date, time.min, timezone.utc),
                datetime.combine(plan.end_date, time.max, timezone.utc),
            )
        return DateRange.recent_days(30)

    async def _retrieve(self, plan: ToolPlan, message: str) -> tuple[Evidence, str]:
        if plan.tool == "query_operational_data" and self.query_skill:
            return await self.query_skill.query(message), plan.tool
        period = self._period(plan)
        if plan.tool in {"payment_summary", "summarize_payments", "summarize_own_job_payments"}:
            return await self.tools.payment_summary(period), plan.tool
        if plan.tool in {
            "technician_performance",
            "compare_technician_performance",
            "summarize_own_performance",
        }:
            return await self.tools.technician_performance(None, period), plan.tool
        if plan.tool in {
            "postponement_summary",
            "summarize_postponements",
            "summarize_own_postponements",
        }:
            return await self.tools.postponement_summary(period), plan.tool
        if plan.tool in {"search_orders", "search_own_orders"}:
            return await self.tools.search_orders(plan.search_query or message, limit=20), plan.tool
        if plan.tool == "search_accessible_messages":
            return await self.tools.search_accessible_messages(
                plan.search_query or message, limit=20
            ), plan.tool
        if plan.tool == "search_staff_directory":
            return await self.tools.search_staff_directory(plan.search_query or message), plan.tool
        if plan.tool == "consult_organization_handbook":
            return await self.tools.organization_handbook(), plan.tool
        if plan.tool == "search_authorized_documents" and self.document_retrieval:
            return await self.document_retrieval.search(
                plan.search_query or message, limit=8
            ), plan.tool
        if plan.tool in {"search_reviews", "search_audit_history", "search_own_corrections"}:
            order_id = await self._resolve_order_id(plan.order_reference)
            if order_id is None:
                return Evidence([], ()), plan.tool
            source = (
                "review" if plan.tool in {"search_reviews", "search_own_corrections"} else "audit"
            )
            return await self.tools.search_reviews_or_audits(order_id, source), plan.tool
        return Evidence({"conversation_mode": "general"}, ()), "none"

    async def _resolve_order_id(self, reference: str) -> str | None:
        clean = reference.strip()
        if not clean:
            return None
        evidence = await self.tools.search_orders(clean, limit=10)
        rows = evidence.data if isinstance(evidence.data, list) else []
        exact = next(
            (
                row
                for row in rows
                if str(row.get("id", "")) == clean
                or str(row.get("order_no", "")).casefold() == clean.casefold()
            ),
            None,
        )
        return str(exact["id"]) if exact else None

    async def answer(
        self, message: str, history: list[dict[str, Any]] | None = None
    ) -> tuple[str, Evidence, str]:
        refusal = refusal_for(message)
        if refusal:
            code, text = refusal
            return text, Evidence([], ()), code
        if self.query_skill and self.query_skill.extract_user_sql(message) is not None:
            plan = ToolPlan(intent="operational", tool="query_operational_data", response="")
        elif self.tool_planner:
            allowed_tools = tuple(tool.name for tool in self.registry)
            if self.query_skill:
                active = {
                    "query_operational_data",
                    "search_reviews",
                    "search_audit_history",
                    "search_own_corrections",
                    "search_accessible_messages",
                    "search_authorized_documents",
                    "search_staff_directory",
                    "consult_organization_handbook",
                }
                allowed_tools = tuple(name for name in allowed_tools if name in active)
            plan = await self.tool_planner.plan(message, self.actor, allowed_tools, history)
        else:
            plan = ToolPlan(
                intent="operational",
                tool="search_orders",
                search_query=message,
                response="",
            )
        if plan.intent == "out_of_scope":
            return (
                "I’m designed to help with Sejuk service operations, including jobs, payments, "
                "schedules, staff responsibilities, and internal procedures.",
                Evidence({"conversation_mode": "out_of_scope"}, ()),
                "out_of_scope",
            )
        if plan.tool == "none" and plan.response.strip():
            return (
                plan.response.strip(),
                Evidence({"conversation_mode": "general"}, ()),
                "none",
            )
        evidence, tool_name = await self._retrieve(plan, message)
        query_answer = self._query_status_answer(tool_name, evidence)
        if query_answer is not None:
            answer = query_answer
        elif self.answer_generator:
            answer = await self.answer_generator.generate(message, self.actor, evidence, history)
        else:
            presentation = self.presenter.present(message, evidence)
            answer = presentation.summary
            if evidence.data:
                answer = f"{answer}\n\n{json.dumps(evidence.data, default=str, ensure_ascii=False)}"
            if not evidence.citations and evidence.data:
                answer += (
                    "\n\nThis result has no inspectable source citation, so treat it as unverified."
                )
        return answer, evidence, tool_name

    @staticmethod
    def _query_status_answer(tool_name: str, evidence: Evidence) -> str | None:
        if tool_name != "query_operational_data" or not isinstance(evidence.data, dict):
            return None
        status = evidence.data.get("status")
        rows = evidence.data.get("rows")
        if status == "completed" and isinstance(rows, list) and not rows:
            return "No matching tasks or records were found."
        if status == "validation_failed":
            return "I couldn't safely run that query. Please rephrase the question and try again."
        if status == "query_unavailable":
            return "The operational data source is temporarily unavailable. Please try again."
        if status == "profile_unavailable":
            return "The operational schema profile is unavailable. Please contact support."
        if status == "output_too_large":
            return "The result is too large to display. Please narrow the question."
        return None

    async def stream(
        self, message: str, history: list[dict[str, Any]] | None = None
    ) -> AsyncIterator[str]:
        answer, evidence, outcome = await self.answer(message, history)
        yield json.dumps({"type": "start", "correlationId": str(self.actor.correlation_id)})
        evidence_denied = (
            isinstance(evidence.data, dict) and evidence.data.get("status") == "scope_denied"
        )
        event_type = "refusal" if outcome == "scope_denied" or evidence_denied else "delta"
        yield json.dumps(
            {
                "type": event_type,
                "correlationId": str(self.actor.correlation_id),
                "content": answer,
                "code": outcome,
            }
        )
        if outcome == "query_operational_data" and isinstance(evidence.data, dict):
            rows = evidence.data.get("rows")
            columns = evidence.data.get("columns")
            if evidence.data.get("status") == "completed" and isinstance(rows, list) and rows:
                yield json.dumps(
                    {
                        "type": "result",
                        "correlationId": str(self.actor.correlation_id),
                        "result": {
                            "columns": columns if isinstance(columns, list | tuple) else [],
                            "rows": rows,
                            "truncated": bool(evidence.data.get("truncated", False)),
                        },
                    },
                    default=str,
                    ensure_ascii=False,
                )
        for citation in evidence.citations:
            yield json.dumps(
                {
                    "type": "citation",
                    "correlationId": str(self.actor.correlation_id),
                    "citation": asdict(citation),
                },
                default=str,
            )
        metadata: dict[str, object] = {}
        if outcome == "query_operational_data" and isinstance(evidence.data, dict):
            metadata = {
                key: evidence.data[key]
                for key in (
                    "status",
                    "code",
                    "fingerprint",
                    "relations",
                    "row_count",
                    "truncated",
                    "duration_ms",
                    "profile_version",
                    "validation_stage",
                )
                if key in evidence.data
            }
        yield json.dumps(
            {
                "type": "complete",
                "correlationId": str(self.actor.correlation_id),
                "metadata": metadata,
            }
        )
