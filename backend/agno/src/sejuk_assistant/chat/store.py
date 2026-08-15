from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from sejuk_assistant.auth.context import ActorContext
from sejuk_assistant.repositories.supabase import CallerSupabaseRepository


class ConversationStore:
    def __init__(self, repository: CallerSupabaseRepository, retention_days: int) -> None:
        self.repository = repository
        self.retention_days = retention_days

    async def ensure_thread(self, actor: ActorContext, thread_id: UUID | None) -> UUID:
        if thread_id is not None:
            rows = await self.repository.get(
                "assistant_threads",
                {"select": "id", "id": f"eq.{thread_id}", "owner_id": f"eq.{actor.user_id}"},
            )
            if rows:
                return thread_id
        new_id = thread_id or uuid4()
        await self.repository.insert(
            "assistant_threads",
            {
                "id": str(new_id),
                "owner_id": str(actor.user_id),
                "retention_until": (
                    datetime.now(timezone.utc) + timedelta(days=self.retention_days)
                ).isoformat(),
            },
        )
        return new_id

    async def history(
        self, actor: ActorContext, thread_id: UUID, limit: int = 12
    ) -> list[dict[str, Any]]:
        return await self.repository.get(
            "assistant_messages",
            {
                "select": "role,body,status,created_at",
                "thread_id": f"eq.{thread_id}",
                "order": "created_at.desc",
                "limit": str(min(max(limit, 1), 20)),
            },
        )

    async def add_message(
        self,
        actor: ActorContext,
        thread_id: UUID,
        role: str,
        body: str,
        status: str,
        citations: list[dict[str, Any]] | None = None,
    ) -> None:
        await self.repository.insert(
            "assistant_messages",
            {
                "thread_id": str(thread_id),
                "actor_id": str(actor.user_id),
                "role": role,
                "body": body[:12000],
                "status": status,
                "citations": citations or [],
                "correlation_id": str(actor.correlation_id),
            },
        )
