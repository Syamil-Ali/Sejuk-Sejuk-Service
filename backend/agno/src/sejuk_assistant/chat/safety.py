from __future__ import annotations

import re

DENIED_ACTION_PATTERN = re.compile(
    r"\b(assign|reassign|close|approve|record payment|postpone|reschedule|insert|update|"
    r"delete|merge|truncate|create|alter|drop|grant|revoke|upload|send message)\b",
    re.IGNORECASE,
)
INJECTION_PATTERN = re.compile(
    r"\b(ignore (all|previous)|system prompt|service.?role|impersonate|bypass|reveal secrets?)\b",
    re.IGNORECASE,
)


def refusal_for(message: str) -> tuple[str, str] | None:
    if DENIED_ACTION_PATTERN.search(message) or INJECTION_PATTERN.search(message):
        return (
            "scope_denied",
            "That request is outside your authorized read-only scope.",
        )
    return None
