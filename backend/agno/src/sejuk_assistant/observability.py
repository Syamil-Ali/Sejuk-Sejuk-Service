from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

SECRET_PATTERN = re.compile(
    r"(?i)(bearer\s+[a-z0-9._-]+|(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+)"
)


def redact(value: Any) -> Any:
    if isinstance(value, str):
        return SECRET_PATTERN.sub("[REDACTED]", value)
    if isinstance(value, dict):
        return {
            key: "[REDACTED]"
            if any(term in key.casefold() for term in ("token", "secret", "key", "password"))
            else redact(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value


@dataclass(slots=True)
class Metrics:
    counters: Counter[str] = field(default_factory=Counter)

    def increment(self, name: str) -> None:
        self.counters[name] += 1

    def snapshot(self) -> dict[str, int]:
        return dict(self.counters)
