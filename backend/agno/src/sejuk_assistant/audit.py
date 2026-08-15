from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sejuk_assistant.auth.context import ActorContext
from sejuk_assistant.repositories.supabase import CallerSupabaseRepository


@dataclass(slots=True)
class AuditWriter:
    repository: CallerSupabaseRepository

    async def write(
        self,
        actor: ActorContext,
        *,
        tool_name: str,
        source_ids: list[str],
        latency_ms: int,
        status: str,
        error_code: str | None = None,
        safe_parameters: dict[str, Any] | None = None,
    ) -> None:
        payload: dict[str, Any] = {
            "p_actor_role": actor.role.value,
            "p_correlation_id": str(actor.correlation_id),
            "p_policy_outcome": "denied" if status == "refused" else "allowed",
            "p_tool_names": [tool_name] if tool_name else [],
            "p_source_ids": source_ids[:50],
            "p_latency_ms": max(latency_ms, 0),
            "p_completion_status": status,
            "p_error_code": error_code,
        }
        if safe_parameters is not None:
            payload["p_safe_parameters"] = safe_parameters
            await self.repository.rpc("write_assistant_query_audit_event", payload)
        else:
            await self.repository.rpc("write_assistant_audit_event", payload)
