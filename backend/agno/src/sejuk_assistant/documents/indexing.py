from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from sejuk_assistant.documents.processing import DocumentChunk, Embedder


class IndexStore(Protocol):
    async def existing_checksum(self, document_id: UUID, checksum: str) -> bool: ...
    async def begin_version(self, document_id: UUID, checksum: str) -> UUID: ...
    async def save_chunks(
        self,
        document_id: UUID,
        version_id: UUID,
        chunks: list[DocumentChunk],
        vectors: list[list[float]],
    ) -> None: ...
    async def set_status(self, document_id: UUID, status: str) -> None: ...


@dataclass(frozen=True, slots=True)
class IndexResult:
    status: str
    chunks: int
    duplicate: bool = False


class DocumentIndexer:
    def __init__(self, store: IndexStore, embedder: Embedder) -> None:
        self.store = store
        self.embedder = embedder

    async def index(
        self, document_id: UUID, checksum: str, chunks: list[DocumentChunk]
    ) -> IndexResult:
        if await self.store.existing_checksum(document_id, checksum):
            return IndexResult("ready", 0, duplicate=True)
        await self.store.set_status(document_id, "processing")
        try:
            if not chunks:
                raise ValueError("No extractable content.")
            vectors = await self.embedder.embed([chunk.content for chunk in chunks])
            if len(vectors) != len(chunks) or any(len(vector) != 1536 for vector in vectors):
                raise ValueError("Embedding provider returned invalid vectors.")
            version_id = await self.store.begin_version(document_id, checksum)
            await self.store.save_chunks(document_id, version_id, chunks, vectors)
            await self.store.set_status(document_id, "ready")
            return IndexResult("ready", len(chunks))
        except Exception:
            await self.store.set_status(document_id, "failed")
            raise
