from __future__ import annotations

import io
import re
import zipfile
from dataclasses import dataclass
from typing import Protocol

from docx import Document
from pypdf import PdfReader

MAX_DOCX_ARCHIVE_BYTES = 25 * 1024 * 1024
MAX_DOCX_ENTRY_BYTES = 25 * 1024 * 1024
MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES = 100 * 1024 * 1024


@dataclass(frozen=True, slots=True)
class ExtractedSection:
    text: str
    page: int | None = None
    section: str | None = None


@dataclass(frozen=True, slots=True)
class DocumentChunk:
    index: int
    content: str
    location: dict[str, int | str]
    untrusted: bool = True


class Embedder(Protocol):
    async def embed(self, texts: list[str]) -> list[list[float]]: ...


def _assert_safe_docx(content: bytes) -> None:
    """Rejects zip-bomb DOCX files before python-docx decompresses them."""
    if len(content) > MAX_DOCX_ARCHIVE_BYTES:
        raise ValueError("Document exceeds the maximum allowed size.")
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            total_uncompressed = 0
            for info in archive.infolist():
                if info.file_size > MAX_DOCX_ENTRY_BYTES:
                    raise ValueError("Document contains an oversized component.")
                total_uncompressed += info.file_size
                if total_uncompressed > MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES:
                    raise ValueError("Document expands beyond the maximum allowed size.")
    except zipfile.BadZipFile as error:
        raise ValueError("Invalid DOCX archive.") from error


def extract_sections(content: bytes, mime_type: str) -> list[ExtractedSection]:
    if mime_type == "application/pdf":
        reader = PdfReader(io.BytesIO(content))
        pdf_sections = []
        for index, page in enumerate(reader.pages):
            text = (page.extract_text() or "").strip()
            if text:
                pdf_sections.append(ExtractedSection(text, page=index + 1))
        return pdf_sections
    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        _assert_safe_docx(content)
        document = Document(io.BytesIO(content))
        sections: list[ExtractedSection] = []
        heading = "Document"
        buffer: list[str] = []
        for paragraph in document.paragraphs:
            text = paragraph.text.strip()
            if not text:
                continue
            if paragraph.style and paragraph.style.name.startswith("Heading"):
                if buffer:
                    sections.append(ExtractedSection("\n".join(buffer), section=heading))
                    buffer = []
                heading = text
            else:
                buffer.append(text)
        if buffer:
            sections.append(ExtractedSection("\n".join(buffer), section=heading))
        return sections
    if mime_type in {"text/plain", "text/markdown"}:
        text = content.decode("utf-8", errors="strict").strip()
        return [ExtractedSection(text, section="Document")] if text else []
    raise ValueError("Unsupported document type.")


def chunk_sections(
    sections: list[ExtractedSection], max_characters: int = 1800, overlap: int = 180
) -> list[DocumentChunk]:
    if max_characters < 200 or overlap < 0 or overlap >= max_characters:
        raise ValueError("Invalid chunk configuration.")
    chunks: list[DocumentChunk] = []
    for section in sections:
        clean = re.sub(r"\s+", " ", section.text).strip()
        start = 0
        while start < len(clean):
            end = min(start + max_characters, len(clean))
            if end < len(clean):
                boundary = clean.rfind(" ", start + max_characters // 2, end)
                if boundary > start:
                    end = boundary
            text = clean[start:end].strip()
            if text:
                location: dict[str, int | str] = {"start": start, "end": end}
                if section.page is not None:
                    location["page"] = section.page
                if section.section is not None:
                    location["section"] = section.section
                chunks.append(DocumentChunk(len(chunks), text, location))
            if end == len(clean):
                break
            start = max(end - overlap, start + 1)
    return chunks
