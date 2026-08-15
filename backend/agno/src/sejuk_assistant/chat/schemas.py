from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    thread_id: UUID | None = None


class CitationPayload(BaseModel):
    source_type: str
    source_id: str
    label: str
    retrieved_at: datetime
    href: str | None = None
    location: dict[str, Any] | None = None
