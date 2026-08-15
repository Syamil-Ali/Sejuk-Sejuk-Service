from __future__ import annotations

import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from sejuk_assistant.auth.context import ActorContext, Role
from sejuk_assistant.query.profile import ColumnProfile, QuerySemanticProfile, RelationProfile
from sejuk_assistant.repositories.supabase import CallerSupabaseRepository, RepositoryError


@dataclass(frozen=True)
class _CacheEntry:
    expires_at: float
    context: str


_CACHE: dict[tuple[str, str, tuple[str, ...]], _CacheEntry] = {}


def _semantic_type(column: ColumnProfile) -> str:
    data_type = column.data_type.casefold()
    if column.enum_name:
        return "categorical"
    if data_type == "boolean":
        return "boolean"
    if "timestamp" in data_type or data_type == "date":
        return "datetime"
    if any(token in data_type for token in ("numeric", "decimal", "integer", "bigint")):
        return "numeric"
    if data_type == "uuid" or column.name.endswith("_id") or column.name == "order_no":
        return "identifier"
    return "text"


def _engineering_role(column: ColumnProfile) -> str:
    semantic_type = _semantic_type(column)
    if semantic_type == "identifier":
        return "identifier"
    if semantic_type == "datetime":
        return "time"
    if semantic_type == "numeric":
        return "measure"
    if semantic_type in {"categorical", "boolean"}:
        return "category"
    return "narrative"


def _is_sensitive(column: ColumnProfile) -> bool:
    return column.name in {
        "customer_name",
        "reason",
        "assigned_technician_id",
        "technician_id",
    }


def _visible_columns(relation: RelationProfile, role: Role) -> tuple[ColumnProfile, ...]:
    return tuple(
        column
        for column in relation.columns
        if role is not Role.TECHNICIAN or column.technician_visible
    )


def _profile_sql(
    relation: RelationProfile,
    role: Role,
    enums: dict[str, tuple[str, ...]],
) -> tuple[str, dict[str, dict[str, str]]]:
    expressions = ["COUNT(*) AS row_count"]
    aliases: dict[str, dict[str, str]] = {}
    for index, column in enumerate(_visible_columns(relation, role)):
        base = f"c{index}"
        aliases[column.name] = {"missing": f"{base}_missing"}
        expressions.append(f'COUNT(*) FILTER (WHERE "{column.name}" IS NULL) AS {base}_missing')
        semantic_type = _semantic_type(column)
        if not _is_sensitive(column) and semantic_type != "text":
            aliases[column.name]["unique"] = f"{base}_unique"
            expressions.append(f'COUNT(DISTINCT "{column.name}") AS {base}_unique')
        if semantic_type in {"numeric", "datetime"}:
            aliases[column.name]["min"] = f"{base}_min"
            aliases[column.name]["max"] = f"{base}_max"
            expressions.extend(
                (
                    f'MIN("{column.name}") AS {base}_min',
                    f'MAX("{column.name}") AS {base}_max',
                )
            )
        if semantic_type == "numeric":
            aliases[column.name]["mean"] = f"{base}_mean"
            expressions.append(f'AVG("{column.name}") AS {base}_mean')
        values = enums.get(column.enum_name or "", ())
        for value_index, value in enumerate(values):
            alias = f"{base}_value_{value_index}"
            aliases[column.name][f"value:{value}"] = alias
            literal = value.replace("'", "''")
            expressions.append(
                f"COUNT(*) FILTER (WHERE \"{column.name}\" = '{literal}') AS {alias}"
            )
    return f"SELECT {', '.join(expressions)} FROM {relation.name}", aliases


def _json_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _relation_summary(
    relation: RelationProfile,
    role: Role,
    aliases: dict[str, dict[str, str]],
    row: dict[str, Any],
) -> dict[str, Any]:
    columns: list[dict[str, Any]] = []
    quality_flags: list[str] = []
    for column in _visible_columns(relation, role):
        mapping = aliases[column.name]
        missing = int(row.get(mapping["missing"], 0) or 0)
        if missing and not column.nullable:
            quality_flags.append(f"{column.name} has {missing} unexpected null values")
        summary: dict[str, Any] = {
            "name": column.name,
            "semantic_type": _semantic_type(column),
            "engineering_role": _engineering_role(column),
            "description": column.meaning,
            "nullable": column.nullable,
            "missing_count": missing,
            "sensitivity": "restricted" if _is_sensitive(column) else "operational",
        }
        for statistic in ("unique", "min", "max", "mean"):
            alias = mapping.get(statistic)
            if alias:
                summary[f"{statistic}_value" if statistic in {"min", "max"} else statistic] = (
                    _json_value(row.get(alias))
                )
        value_counts = {
            key.removeprefix("value:"): int(row.get(alias, 0) or 0)
            for key, alias in mapping.items()
            if key.startswith("value:")
        }
        if value_counts:
            summary["value_counts"] = value_counts
        columns.append(summary)
    return {
        "name": relation.name,
        "grain": relation.grain,
        "row_count": int(row.get("row_count", 0) or 0),
        "column_count": len(columns),
        "quality_flags": quality_flags,
        "columns": columns,
    }


async def resolved_profile_context(
    repository: CallerSupabaseRepository,
    profile: QuerySemanticProfile,
    actor: ActorContext,
    question: str,
    *,
    ttl_seconds: int,
) -> str:
    relation_names = profile.relevant_relation_names(question, actor.role)
    key = (str(actor.user_id), profile.version, relation_names)
    cached = _CACHE.get(key)
    now = time.monotonic()
    if cached and cached.expires_at > now:
        return cached.context

    summaries: list[dict[str, Any]] = []
    for relation_name in relation_names:
        relation = profile.relation(relation_name)
        if relation is None:
            continue
        sql, aliases = _profile_sql(relation, actor.role, profile.structural.enums)
        try:
            payload = await repository.rpc(
                "execute_assistant_analytical_query",
                {"p_sql": sql, "p_max_rows": 1, "p_statement_timeout_ms": 3_000},
            )
        except RepositoryError:
            continue
        rows = payload.get("rows", []) if isinstance(payload, dict) else []
        if rows and isinstance(rows[0], dict):
            summaries.append(_relation_summary(relation, actor.role, aliases, rows[0]))

    context = json.dumps(
        {
            "profile_type": "role_scoped_operational_profile",
            "profile_version": profile.version,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "authorization_scope": actor.role.value,
            "raw_sample_values_included": False,
            "relations": summaries,
        },
        separators=(",", ":"),
        default=str,
    )
    _CACHE[key] = _CacheEntry(now + ttl_seconds, context)
    return context
