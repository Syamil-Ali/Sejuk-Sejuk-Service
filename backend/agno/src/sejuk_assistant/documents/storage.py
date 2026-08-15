from __future__ import annotations

from typing import Any, cast
from uuid import UUID

import httpx

from sejuk_assistant.settings import Settings


class DocumentStorageError(RuntimeError):
    pass


def _headers(settings: Settings) -> dict[str, str]:
    if settings.supabase_url is None or not settings.supabase_service_role_key:
        raise DocumentStorageError("Document storage is not configured.")
    return {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }


async def fetch_document_metadata(settings: Settings, document_id: UUID) -> dict[str, Any]:
    """Reads document metadata with the privileged service role; the endpoint
    already enforced the admin/manager gate for this caller."""
    async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
        response = await client.get(
            f"{str(settings.supabase_url).rstrip('/')}/rest/v1/assistant_documents",
            headers=_headers(settings),
            params={
                "select": "id,title,source_file_name,storage_path,mime_type,status,created_by",
                "id": f"eq.{document_id}",
                "limit": "1",
            },
        )
        response.raise_for_status()
        rows = response.json()
    if not rows:
        raise DocumentStorageError("Document not found.")
    return cast(dict[str, Any], rows[0])


async def read_document_file(settings: Settings, storage_path: str) -> bytes:
    async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
        response = await client.get(
            f"{str(settings.supabase_url).rstrip('/')}/storage/v1/object/"
            f"assistant-documents/{storage_path}",
            headers=_headers(settings),
        )
        response.raise_for_status()
        return response.content
