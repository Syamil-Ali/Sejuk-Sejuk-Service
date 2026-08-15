from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import re
from pathlib import Path
from typing import Any

import httpx

from sejuk_assistant.query.profile import QuerySemanticProfile
from sejuk_assistant.settings import Settings

ENUM_PATTERN = re.compile(
    r"create\s+type\s+public\.(?P<name>[a-z0-9_]+)\s+as\s+enum\s*\((?P<values>.*?)\)\s*;",
    re.I | re.S,
)
VIEW_PATTERN = re.compile(
    r"create\s+or\s+replace\s+view\s+public\.(?P<name>assistant_analytics_[a-z0-9_]+)"
    r".*?\bas\s+select\s+(?P<select>.*?)\s+from\s+",
    re.I | re.S,
)
ALIAS_PATTERN = re.compile(r"\bas\s+([a-z][a-z0-9_]*)\s*$", re.I)


def _split_select_list(value: str) -> tuple[str, ...]:
    parts: list[str] = []
    current: list[str] = []
    depth = 0
    for character in value:
        if character == "(":
            depth += 1
        elif character == ")":
            depth -= 1
        if character == "," and depth == 0:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(character)
    if current:
        parts.append("".join(current).strip())
    return tuple(parts)


def extract_migration_structure(
    migrations_dir: Path,
    *,
    allowed_enums: set[str] | None = None,
    allowed_views: set[str] | None = None,
) -> dict[str, Any]:
    sql = "\n".join(
        path.read_text(encoding="utf-8") for path in sorted(migrations_dir.glob("*.sql"))
    )
    enums: dict[str, tuple[str, ...]] = {}
    for match in ENUM_PATTERN.finditer(sql):
        values = tuple(re.findall(r"'([^']+)'", match.group("values")))
        name = match.group("name").casefold()
        if allowed_enums is None or name in allowed_enums:
            enums[name] = values
    views: dict[str, tuple[str, ...]] = {}
    for match in VIEW_PATTERN.finditer(sql):
        view_name = match.group("name").casefold()
        if allowed_views is not None and view_name not in allowed_views:
            continue
        columns: list[str] = []
        for expression in _split_select_list(match.group("select")):
            alias = ALIAS_PATTERN.search(expression)
            column = alias.group(1) if alias else expression.rsplit(".", 1)[-1].strip()
            if not re.fullmatch(r"[a-z][a-z0-9_]*", column, re.I):
                raise ValueError(
                    f"Unsupported analytical view expression in {match.group('name')}."
                )
            columns.append(column.casefold())
        views[view_name] = tuple(columns)
    canonical = json.dumps({"enums": enums, "views": views}, sort_keys=True, separators=(",", ":"))
    return {
        "enums": enums,
        "views": views,
        "source_digest": hashlib.sha256(canonical.encode()).hexdigest(),
    }


def verify_snapshot(profile: QuerySemanticProfile, actual: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if profile.structural.source_digest != actual["source_digest"]:
        errors.append("source_digest")
    for enum_name, values in profile.structural.enums.items():
        if tuple(actual["enums"].get(enum_name, ())) != values:
            errors.append(f"enum:{enum_name}")
    for relation in profile.structural.relations:
        expected = tuple(column.name for column in relation.columns)
        if tuple(actual["views"].get(relation.name, ())) != expected:
            errors.append(f"relation:{relation.name}")
    return sorted(errors)


async def verify_development_database(profile: QuerySemanticProfile, settings: Settings) -> None:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Development database verification requires Supabase administration.")
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    async with httpx.AsyncClient(
        base_url=f"{str(settings.supabase_url).rstrip('/')}/rest/v1/",
        headers=headers,
        timeout=settings.request_timeout_seconds,
    ) as client:
        for relation in profile.structural.relations:
            response = await client.get(
                relation.name, params={"select": relation.key, "limit": "0"}
            )
            response.raise_for_status()


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify Sejuk analytical semantic profile drift.")
    parser.add_argument("--migrations", type=Path, required=True)
    parser.add_argument("--snapshot", type=Path)
    parser.add_argument("--print-actual", action="store_true")
    parser.add_argument("--verify-database", action="store_true")
    args = parser.parse_args()
    profile = QuerySemanticProfile.load(args.snapshot)
    actual = extract_migration_structure(
        args.migrations,
        allowed_enums=set(profile.structural.enums),
        allowed_views={relation.name for relation in profile.structural.relations},
    )
    if args.print_actual:
        print(json.dumps(actual, indent=2, sort_keys=True))
    errors = verify_snapshot(profile, actual)
    if errors:
        raise SystemExit("Semantic profile drift: " + ", ".join(errors))
    if args.verify_database:
        asyncio.run(verify_development_database(profile, Settings()))
    print(f"Semantic profile {profile.version} matches migrations.")


if __name__ == "__main__":
    main()
