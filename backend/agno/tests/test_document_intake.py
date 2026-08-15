from __future__ import annotations

from io import BytesIO
from uuid import uuid4

import pytest
from starlette.datastructures import Headers, UploadFile

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.documents.intake import DocumentIntakeError, DocumentManifest, prepare_document


class FakeStore:
    def __init__(self) -> None:
        self.manifest: DocumentManifest | None = None
        self.content = b""

    async def stage(self, actor: ActorContext, manifest: DocumentManifest, content: bytes) -> None:
        assert actor.role in {Role.ADMIN, Role.TECHNICIAN}
        self.manifest = manifest
        self.content = content


def actor(role: Role) -> ActorContext:
    return ActorContext(uuid4(), role, uuid4(), "User", uuid4())


def upload(name: str, content_type: str, content: bytes) -> UploadFile:
    return UploadFile(
        BytesIO(content), filename=name, headers=Headers({"content-type": content_type})
    )


@pytest.mark.asyncio
async def test_admin_intake_hashes_and_stages_private_path() -> None:
    store = FakeStore()
    result = await prepare_document(
        actor(Role.ADMIN), upload("manual.pdf", "application/pdf", b"document"), "Manual", store
    )
    assert result.status == "pending"
    assert result.storage_path == f"{result.document_id}/source.pdf"
    assert len(result.checksum_sha256) == 64
    assert store.content == b"document"


@pytest.mark.asyncio
async def test_manager_cannot_ingest() -> None:
    with pytest.raises(PermissionError):
        await prepare_document(
            actor(Role.MANAGER),
            upload("manual.pdf", "application/pdf", b"x"),
            "Manual",
            FakeStore(),
        )


@pytest.mark.asyncio
async def test_type_extension_and_size_are_validated() -> None:
    with pytest.raises(DocumentIntakeError):
        await prepare_document(
            actor(Role.ADMIN), upload("manual.txt", "application/pdf", b"x"), "Manual", FakeStore()
        )
    with pytest.raises(DocumentIntakeError):
        await prepare_document(
            actor(Role.ADMIN), upload("empty.pdf", "application/pdf", b""), "Manual", FakeStore()
        )


@pytest.mark.asyncio
async def test_image_documents_are_supported() -> None:
    store = FakeStore()
    result = await prepare_document(
        actor(Role.ADMIN), upload("invoice.png", "image/png", b"png-bytes"), "Invoice", store
    )
    assert result.mime_type == "image/png"
    assert result.storage_path.endswith("source.png")
    assert store.content == b"png-bytes"


@pytest.mark.asyncio
async def test_technician_can_ingest_receipt() -> None:
    store = FakeStore()
    result = await prepare_document(
        actor(Role.TECHNICIAN), upload("receipt.png", "image/png", b"png"), "Receipt", store
    )
    assert result.mime_type == "image/png"
    assert store.content == b"png"
