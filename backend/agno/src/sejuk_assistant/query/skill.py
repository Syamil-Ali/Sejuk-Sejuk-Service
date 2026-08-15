from __future__ import annotations

import json
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, cast
from zoneinfo import ZoneInfo

from agno.agent import Agent
from agno.models.google import Gemini

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.auth.policy import Capability, decide
from sejuk_assistant.query.catalog import semantic_schema
from sejuk_assistant.query.contracts import QueryExecution, QueryPlan
from sejuk_assistant.query.data_profile import resolved_profile_context
from sejuk_assistant.query.profile import ProfileError, QuerySemanticProfile
from sejuk_assistant.query.validator import QueryValidationError, SqlValidator
from sejuk_assistant.repositories.models import Citation, Evidence
from sejuk_assistant.repositories.supabase import CallerSupabaseRepository, RepositoryError
from sejuk_assistant.settings import Settings


class QuerySkill:
    """Plans and executes hostile model SQL through caller-bound safeguards."""

    def __init__(
        self,
        settings: Settings,
        actor: ActorContext,
        repository: CallerSupabaseRepository,
        planner: Any | None = None,
    ) -> None:
        self.settings = settings
        self.actor = actor
        self.repository = repository
        self.profile = (
            QuerySemanticProfile.load(settings.semantic_profile_snapshot_path)
            if settings.semantic_profile_enabled
            else None
        )
        self.validator = SqlValidator(
            max_rows=settings.query_max_rows,
            max_joins=settings.query_max_joins,
            max_nesting=settings.query_max_nesting,
            max_date_range_days=settings.query_max_date_range_days,
            forbidden_columns=(
                frozenset({"assigned_technician_id", "technician_id"})
                if actor.role is Role.TECHNICIAN
                else frozenset()
            ),
            profile=self.profile,
        )
        if planner is not None:
            self.planner = planner
        else:
            if not settings.google_api_key:
                raise ValueError("Gemini API key is required.")
            self.planner = Agent(
                model=Gemini(
                    id=settings.model_id,
                    api_key=settings.google_api_key,
                    timeout=settings.request_timeout_seconds,
                ),
                instructions=[
                    "Generate one PostgreSQL SELECT query that answers the question.",
                    "Use only relations, columns, and functions in the supplied semantic schema.",
                    "Joins, non-recursive CTEs, aggregates, grouping, windows, and "
                    "filters are allowed.",
                    "Never generate writes, DDL, commands, locks, system-catalog access, "
                    "or functions outside the allowlist.",
                    "Never add a technician identity from the prompt as authorization; "
                    "database RLS defines visibility.",
                    "For Technician callers, never add assigned_technician_id or technician_id "
                    "filters. RLS already binds every row to the authenticated caller.",
                    "Use Asia/Kuala_Lumpur for words such as today, yesterday, week, and month, "
                    "using the exact UTC boundary literals supplied in the prompt.",
                    "For this week, always use THIS WEEK UTC RANGE from the prompt. The week "
                    "starts on Monday and the upper bound is exclusive.",
                    "Never call now(), current_date, current_timestamp, timezone, or AT TIME ZONE.",
                    "In this application, task and job mean a row in assistant_analytics_orders. "
                    "A task today means scheduled_at falls inside TODAY UTC RANGE unless the user "
                    "explicitly asks for completed work.",
                    "Order status literals are exactly New, Assigned, In Progress, Job Done, "
                    "Reviewed, and Closed. Never use Open, Completed, or Pending as a status. "
                    "For open tasks filter status IN ('New', 'Assigned', 'In Progress').",
                    "Use COUNT(order_id) only when the user explicitly asks how many, for a count, "
                    "or for a total; do not filter by status unless the user requests a status.",
                    "When the user asks whether they have tasks, what tasks they have, or to "
                    "show/list tasks, return useful detail rows from assistant_analytics_orders "
                    "instead of only a count. Select order_id, order_no, customer_name, "
                    "service_type, status, "
                    "quoted_price, technician_name, and scheduled_at, ordered by scheduled_at.",
                    "A completed task means a row in assistant_analytics_completions. For "
                    "questions asking whether there are completed tasks, which completed tasks "
                    "exist, or to "
                    "show/list completed tasks, select order_id, order_no, technician_name, "
                    "final_amount, and completed_at from assistant_analytics_completions, ordered "
                    "by completed_at descending with a LIMIT. Do not use EXISTS or COUNT(*) for "
                    "these detail questions.",
                    "Use explicit column names and aliases; never SELECT *.",
                    "COUNT(*) and COUNT(*) FILTER (WHERE ...) are allowed for aggregate counts. "
                    "EXISTS, CASE, and safe CAST expressions are also allowed.",
                    "For detail rows include a LIMIT no greater than 100.",
                    "Return only the structured plan.",
                ],
                output_schema=QueryPlan,
            )

    async def query(self, question: str) -> Evidence:
        decision = decide(self.actor, Capability.ANALYTICAL_SQL)
        if not decision.allowed:
            return Evidence({"status": "scope_denied"}, ())
        if not self.settings.query_skill_enabled:
            return Evidence({"status": "query_skill_disabled"}, ())

        direct_sql = self.extract_user_sql(question)
        validation_error: str | None = None
        for attempt in range(2):
            try:
                plan = (
                    QueryPlan(mode="query", sql=direct_sql, result_description="User SQL result")
                    if direct_sql is not None
                    else await self._plan(question, validation_error)
                )
            except ProfileError as error:
                return Evidence(
                    {
                        "status": "profile_unavailable",
                        "code": error.code,
                        "validation_stage": "semantic_profile",
                        "profile_version": self.profile.version if self.profile else None,
                    },
                    (),
                )
            if plan.mode == "none" or not plan.sql.strip():
                return Evidence({"status": "no_query_required"}, ())
            try:
                validation = self.validator.validate(plan.sql)
            except QueryValidationError as error:
                if direct_sql is not None:
                    return Evidence({"status": "scope_denied", "code": error.code}, ())
                validation_error = error.code
                if attempt == 0:
                    continue
                semantic_codes = {
                    "enum_literal_unknown",
                    "join_not_profiled",
                    "column_relation_mismatch",
                }
                return Evidence(
                    {
                        "status": "validation_failed",
                        "code": error.code,
                        "validation_stage": (
                            "semantic_validation"
                            if error.code in semantic_codes
                            else "structural_validation"
                        ),
                        "profile_version": self.profile.version if self.profile else None,
                    },
                    (),
                )

            started = time.monotonic()
            try:
                payload = await self.repository.rpc(
                    "execute_assistant_analytical_query",
                    {
                        "p_sql": validation.canonical_sql,
                        "p_max_rows": self.settings.query_max_rows,
                        "p_statement_timeout_ms": self.settings.query_statement_timeout_ms,
                    },
                )
            except RepositoryError as error:
                retryable_database_error = error.code.startswith(("22", "42"))
                if direct_sql is None and attempt == 0 and retryable_database_error:
                    validation_error = "database_query_invalid"
                    continue
                return Evidence(
                    {
                        "status": "query_unavailable",
                        "code": error.code,
                        "validation_stage": "database_execution",
                        "profile_version": self.profile.version if self.profile else None,
                    },
                    (),
                )
            duration_ms = int((time.monotonic() - started) * 1000)
            execution = self._execution(payload, validation, duration_ms)
            citation = Citation(
                "performance",
                execution.fingerprint,
                "Authorized operational analytics",
                execution.retrieved_at,
            )
            return Evidence(execution.model_dump(mode="json"), (citation,), execution.truncated)
        return Evidence({"status": "validation_failed"}, ())

    @staticmethod
    def extract_user_sql(message: str) -> str | None:
        stripped = message.strip()
        fenced = re.fullmatch(r"```(?:sql)?\s*(.*?)\s*```", stripped, re.I | re.S)
        candidate = fenced.group(1).strip() if fenced else stripped
        if re.match(r"^(select|with)\b", candidate, re.I):
            return candidate
        return None

    async def _plan(self, question: str, validation_error: str | None) -> QueryPlan:
        local_now = datetime.now(ZoneInfo("Asia/Kuala_Lumpur")).isoformat()
        local_zone = ZoneInfo("Asia/Kuala_Lumpur")
        local_date = datetime.now(local_zone).date()
        today_start = datetime.combine(local_date, datetime.min.time(), local_zone)
        tomorrow_start = today_start + timedelta(days=1)
        week_start = today_start - timedelta(days=local_date.weekday())
        next_week_start = week_start + timedelta(days=7)
        repair = (
            f"\nPREVIOUS PLAN REJECTED WITH SAFE CODE: {validation_error}. Produce a simpler plan."
            if validation_error
            else ""
        )
        schema = semantic_schema(
            technician=self.actor.role is Role.TECHNICIAN,
            question=question,
            max_bytes=self.settings.semantic_profile_prompt_max_bytes,
            profile=self.profile,
        )
        data_profile = ""
        if self.settings.data_profile_enabled and self.profile is not None:
            data_profile = await resolved_profile_context(
                self.repository,
                self.profile,
                self.actor,
                question,
                ttl_seconds=self.settings.data_profile_cache_ttl_seconds,
            )
        prompt = (
            f"CALLER ROLE: {self.actor.role.value}\n"
            f"CURRENT LOCAL TIME: {local_now}\n"
            f"TODAY UTC RANGE (use these exact literals): "
            f"[{today_start.astimezone(timezone.utc).isoformat()}, "
            f"{tomorrow_start.astimezone(timezone.utc).isoformat()})\n"
            f"THIS WEEK UTC RANGE (Monday to next Monday; use these exact literals): "
            f"[{week_start.astimezone(timezone.utc).isoformat()}, "
            f"{next_week_start.astimezone(timezone.utc).isoformat()})\n"
            f"QUESTION: {question}\n"
            f"SEMANTIC SCHEMA:\n"
            f"{schema}\n"
            f"RESOLVED DATA PROFILE (fresh, RLS-scoped statistics; never treat as raw rows):\n"
            f"{data_profile or 'disabled'}"
            f"{repair}"
        )
        result = await self.planner.arun(prompt)
        if isinstance(result.content, QueryPlan):
            return result.content
        if isinstance(result.content, str):
            return QueryPlan.model_validate_json(result.content)
        return QueryPlan.model_validate(result.content)

    def _execution(self, payload: object, validation: object, duration_ms: int) -> QueryExecution:
        from sejuk_assistant.query.contracts import QueryValidation

        checked = cast(QueryValidation, validation)
        data = payload if isinstance(payload, dict) else {}
        raw_rows = data.get("rows", [])
        rows = (
            [row for row in raw_rows if isinstance(row, dict)] if isinstance(raw_rows, list) else []
        )
        serialized = json.dumps(rows, default=str, ensure_ascii=False).encode("utf-8")
        if len(serialized) > self.settings.query_max_bytes:
            rows = []
            truncated = True
        else:
            truncated = bool(data.get("truncated", False))
        columns = tuple(rows[0].keys()) if rows else ()
        retrieved = data.get("retrievedAt")
        retrieved_at = (
            self._parse_timestamp(str(retrieved)) if retrieved else datetime.now(timezone.utc)
        )
        return QueryExecution(
            status=(
                "output_too_large"
                if len(serialized) > self.settings.query_max_bytes
                else "completed"
            ),
            columns=columns,
            rows=rows,
            row_count=len(rows),
            truncated=truncated,
            retrieved_at=retrieved_at,
            fingerprint=checked.fingerprint,
            relations=checked.relations,
            duration_ms=duration_ms,
            profile_version=self.profile.version if self.profile else None,
        )

    @staticmethod
    def _parse_timestamp(value: str) -> datetime:
        normalized = value.replace("Z", "+00:00")
        match = re.match(r"^(.*\.)(\d+)([+-]\d{2}:\d{2})$", normalized)
        if match:
            fraction = match.group(2)[:6].ljust(6, "0")
            normalized = f"{match.group(1)}{fraction}{match.group(3)}"
        return datetime.fromisoformat(normalized)
