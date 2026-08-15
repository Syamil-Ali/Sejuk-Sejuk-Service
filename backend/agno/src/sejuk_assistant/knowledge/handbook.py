from __future__ import annotations

from functools import lru_cache
from importlib.resources import files


@lru_cache(maxsize=1)
def organization_handbook() -> str:
    """Return the reviewed handbook as a bounded prompt-safe string."""
    content = (
        files("sejuk_assistant.knowledge")
        .joinpath("operations-handbook.md")
        .read_text(encoding="utf-8")
    )
    return content.strip()[:16_000]
