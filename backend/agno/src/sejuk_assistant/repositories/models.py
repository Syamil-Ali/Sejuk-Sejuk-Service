from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal


@dataclass(frozen=True, slots=True)
class DateRange:
    start: datetime
    end: datetime

    def __post_init__(self) -> None:
        if self.start.tzinfo is None or self.end.tzinfo is None:
            raise ValueError("Date ranges must include a timezone.")
        if self.end <= self.start or self.end - self.start > timedelta(days=366):
            raise ValueError("Date range must be positive and no longer than 366 days.")

    @classmethod
    def recent_days(cls, days: int = 30) -> DateRange:
        if not 1 <= days <= 366:
            raise ValueError("Days must be between 1 and 366.")
        end = datetime.now(timezone.utc)
        return cls(end - timedelta(days=days), end)


@dataclass(frozen=True, slots=True)
class Citation:
    source_type: Literal[
        "order", "payment", "performance", "audit", "message", "document", "profile"
    ]
    source_id: str
    label: str
    retrieved_at: datetime
    href: str | None = None
    location: dict[str, Any] | None = None


@dataclass(frozen=True, slots=True)
class Evidence:
    data: Any
    citations: tuple[Citation, ...]
    truncated: bool = False
