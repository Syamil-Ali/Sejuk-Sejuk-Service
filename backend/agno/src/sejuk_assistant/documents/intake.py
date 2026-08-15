from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Protocol
from uuid import UUID, uuid4

import httpx
from fastapi import UploadFile

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.settings import Settings

MAX_DOCUMENT_BYTES = 25 * 1024 * 1024
SUPPORTED_TYPES = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


class DocumentIntakeError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class DocumentManifest:
    document_id: UUID
    title: str
    file_name: str
    storage_path: str
    mime_type: str
    size_bytes: int
    checksum_sha256: str
    status: str = "pending"


class DocumentIntakeStore(Protocol):
    async def stage(
        self, actor: ActorContext, manifest: DocumentManifest, content: bytes
    ) -> None: ...


class SupabaseDocumentIntakeStore:
    """Privileged ingestion-only adapter; it is never passed to agent tool registries."""

    def __init__(self, settings: Settings) -> None:
        if settings.supabase_url is None or not settings.supabase_service_role_key:
            raise RuntimeError("Document ingestion is not configured.")
        self._base_url = str(settings.supabase_url).rstrip("/")
        self._key = settings.supabase_service_role_key

    async def stage(self, actor: ActorContext, manifest: DocumentManifest, content: bytes) -> None:
        headers = {"Authorization": f"Bearer {self._key}", "apikey": self._key}
        async with httpx.AsyncClient(timeout=30) as client:
            upload = await client.post(
                f"{self._base_url}/storage/v1/object/assistant-documents/{manifest.storage_path}",
                headers={**headers, "Content-Type": manifest.mime_type, "x-upsert": "false"},
                content=content,
            )
            if upload.is_error:
                raise RuntimeError("Unable to stage document.")
            metadata = await client.post(
                f"{self._base_url}/rest/v1/assistant_documents",
                headers={**headers, "Content-Type": "application/json", "Prefer": "return=minimal"},
                json={
                    "id": str(manifest.document_id),
                    "title": manifest.title,
                    "source_file_name": manifest.file_name,
                    "storage_path": manifest.storage_path,
                    "mime_type": manifest.mime_type,
                    "size_bytes": manifest.size_bytes,
                    "checksum_sha256": manifest.checksum_sha256,
                    "status": manifest.status,
                    "visibility": "restricted",
                    "visible_roles": [],
                    "created_by": str(actor.user_id),
                },
            )
            if metadata.is_error:
                await client.delete(
                    f"{self._base_url}/storage/v1/object/assistant-documents/{manifest.storage_path}",
                    headers=headers,
                )
                raise RuntimeError("Unable to record document metadata.")


async def prepare_document(
    actor: ActorContext, upload: UploadFile, title: str, store: DocumentIntakeStore
) -> DocumentManifest:
    if actor.role is not Role.ADMIN:
        raise PermissionError("Administrator access required.")
    mime_type = upload.content_type or ""
    expected_extension = SUPPORTED_TYPES.get(mime_type)
    suffix = PurePosixPath(upload.filename or "").suffix.casefold()
    if expected_extension is None or suffix != expected_extension:
        raise DocumentIntakeError("Unsupported document type.")
    content = await upload.read(MAX_DOCUMENT_BYTES + 1)
    if not content or len(content) > MAX_DOCUMENT_BYTES:
        raise DocumentIntakeError("Document must be between 1 byte and 25 MB.")
    document_id = uuid4()
    safe_name = f"source{expected_extension}"
    manifest = DocumentManifest(
        document_id=document_id,
        title=title.strip()[:200],
        file_name=upload.filename or safe_name,
        storage_path=f"{document_id}/{safe_name}",
        mime_type=mime_type,
        size_bytes=len(content),
        checksum_sha256=hashlib.sha256(content).hexdigest(),
    )
    if not manifest.title:
        raise DocumentIntakeError("Document title is required.")
    await store.stage(actor, manifest, content)
    return manifest
