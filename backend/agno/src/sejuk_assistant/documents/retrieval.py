from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sejuk_assistant.auth.context import ActorContext
from sejuk_assistant.auth.policy import Capability, decide
from sejuk_assistant.repositories.models import Citation, Evidence
from sejuk_assistant.repositories.supabase import CallerSupabaseRepository
from sejuk_assistant.tools.operations import AuthorizationDenied


class DocumentRetrieval:
    def __init__(self, actor: ActorContext, repository: CallerSupabaseRepository) -> None:
        self.actor = actor
        self.repository = repository

    async def search(
        self, query: str, query_embedding: list[float] | None = None, limit: int = 8
    ) -> Evidence:
        decision = decide(self.actor, Capability.DOCUMENTS_AUTHORIZED)
        if not decision.allowed:
            raise AuthorizationDenied(decision.public_message)
        clean = query.strip()
        if not 2 <= len(clean) <= 500:
            raise ValueError("Document query must be between 2 and 500 characters.")
        if query_embedding is not None and len(query_embedding) != 1536:
            raise ValueError("Query embedding must have 1536 dimensions.")
        result: Any = await self.repository.rpc(
            "search_authorized_document_chunks",
            {
                "p_query": clean,
                "p_query_embedding": query_embedding,
                "p_limit": min(max(limit, 1), 20),
            },
        )
        rows = [row for row in result if isinstance(row, dict)] if isinstance(result, list) else []
        now = datetime.now(timezone.utc)
        citations = tuple(
            Citation(
                "document",
                str(row["document_id"]),
                row["document_title"],
                now,
                href=f"/portal/documents/{row['document_id']}",
                location=row.get("location") or {},
            )
            for row in rows
        )
        return Evidence(rows, citations, len(rows) >= 20)

    async def source_access_reference(self, document_id: str) -> dict[str, str]:
        rows = await self.repository.get(
            "assistant_documents",
            {"select": "id,title", "id": f"eq.{document_id}", "limit": "1"},
        )
        if not rows:
            raise AuthorizationDenied("You do not have access to that information.")
        return {"documentId": rows[0]["id"], "href": f"/portal/documents/{rows[0]['id']}"}

    async def archive(self, document_id: str) -> None:
        del document_id
        raise AuthorizationDenied(
            "The assistant is read-only. Archive documents in administration."
        )
