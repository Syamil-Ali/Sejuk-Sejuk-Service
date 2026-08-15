from __future__ import annotations

from datetime import datetime, timezone

from sejuk_assistant.analytics.presentation import AnalyticsPresenter, PresentationIntent
from sejuk_assistant.repositories.models import Citation, Evidence


def test_routes_and_presents_only_authorized_evidence() -> None:
    citation = Citation("order", "1", "ORDER000001", datetime.now(timezone.utc))
    evidence = Evidence([{"technician": "Ali", "jobs": 3}], (citation,))
    result = AnalyticsPresenter().present("Show a chart", evidence)
    assert result.intent is PresentationIntent.VISUALIZATION
    assert result.chart == {
        "type": "bar",
        "category": "technician",
        "value": "jobs",
        "rows": ({"technician": "Ali", "jobs": 3},),
    }
    assert result.citations == (citation,)


def test_empty_evidence_is_explicit_and_has_no_chart() -> None:
    result = AnalyticsPresenter().present("Prepare a report", Evidence([], ()))
    assert result.intent is PresentationIntent.REPORT
    assert result.summary == "No authorized records matched the request."
    assert result.chart is None


def test_presenter_bounds_rows() -> None:
    result = AnalyticsPresenter().present(
        "List records", Evidence([{"value": i} for i in range(80)], ())
    )
    assert len(result.rows) == 50
