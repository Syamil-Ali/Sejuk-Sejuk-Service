from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class QueryPlan(BaseModel):
    mode: Literal["query", "none"]
    sql: str = Field(default="", max_length=12_000)
    result_description: str = Field(default="", max_length=500)


class QueryValidation(BaseModel):
    canonical_sql: str
    fingerprint: str
    relations: tuple[str, ...]
    selected_columns: int
    joins: int
    nesting: int


class QueryExecution(BaseModel):
    status: Literal["completed", "output_too_large"] = "completed"
    columns: tuple[str, ...]
    rows: list[dict[str, Any]]
    row_count: int
    truncated: bool
    retrieved_at: datetime
    fingerprint: str
    relations: tuple[str, ...]
    duration_ms: int
    profile_version: str | None = None
    validation_stage: str = "database_execution"
