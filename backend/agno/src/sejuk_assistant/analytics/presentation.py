from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

from sejuk_assistant.repositories.models import Evidence


class PresentationIntent(str, Enum):
    ANSWER = "answer"
    REPORT = "report"
    VISUALIZATION = "visualization"


@dataclass(frozen=True, slots=True)
class PresentedAnalysis:
    intent: PresentationIntent
    summary: str
    rows: tuple[dict[str, Any], ...]
    chart: dict[str, Any] | None
    citations: tuple[Any, ...]
    truncated: bool


class AnalyticsPresenter:
    """Ports the useful routing/report/chart ideas without dataset ids or SQL."""

    @staticmethod
    def route(question: str) -> PresentationIntent:
        normalized = question.casefold()
        if any(term in normalized for term in ("chart", "graph", "trend", "visual")):
            return PresentationIntent.VISUALIZATION
        if any(term in normalized for term in ("report", "brief", "summary document")):
            return PresentationIntent.REPORT
        return PresentationIntent.ANSWER

    def present(self, question: str, evidence: Evidence) -> PresentedAnalysis:
        rows = self._rows(evidence.data)
        intent = self.route(question)
        chart = self._chart(rows) if intent is PresentationIntent.VISUALIZATION else None
        count = len(rows)
        summary = (
            f"Found {count} authorized record{'s' if count != 1 else ''}."
            if count
            else "No authorized records matched the request."
        )
        return PresentedAnalysis(
            intent, summary, rows, chart, evidence.citations, evidence.truncated
        )

    @staticmethod
    def _rows(data: Any) -> tuple[dict[str, Any], ...]:
        if isinstance(data, list):
            return tuple(item for item in data if isinstance(item, dict))[:50]
        if isinstance(data, dict):
            nested = next((value for value in data.values() if isinstance(value, list)), None)
            if nested is not None:
                return tuple(item for item in nested if isinstance(item, dict))[:50]
            return (data,)
        return ()

    @staticmethod
    def _chart(rows: tuple[dict[str, Any], ...]) -> dict[str, Any] | None:
        if not rows:
            return None
        numeric = next(
            (
                key
                for key, value in rows[0].items()
                if isinstance(value, int | float) and not isinstance(value, bool)
            ),
            None,
        )
        category = next((key for key, value in rows[0].items() if isinstance(value, str)), None)
        if numeric is None or category is None:
            return None
        return {"type": "bar", "category": category, "value": numeric, "rows": rows[:20]}
