from __future__ import annotations

import hashlib
import re
from datetime import date
from typing import cast

from sqlglot import exp, parse
from sqlglot.errors import ParseError

from sejuk_assistant.query.catalog import RELATION_COLUMNS, SAFE_FUNCTIONS
from sejuk_assistant.query.contracts import QueryValidation
from sejuk_assistant.query.profile import QuerySemanticProfile


class QueryValidationError(ValueError):
    def __init__(self, code: str) -> None:
        super().__init__("Generated query is not permitted.")
        self.code = code


class SqlValidator:
    def __init__(
        self,
        *,
        max_rows: int,
        max_joins: int,
        max_nesting: int,
        max_date_range_days: int = 366,
        forbidden_columns: frozenset[str] = frozenset(),
        profile: QuerySemanticProfile | None = None,
    ) -> None:
        self.max_rows = max_rows
        self.max_joins = max_joins
        self.max_nesting = max_nesting
        self.max_date_range_days = max_date_range_days
        self.forbidden_columns = forbidden_columns
        self.profile = profile

    def validate(self, sql: str) -> QueryValidation:
        try:
            statements = parse(sql, read="postgres")
        except ParseError as error:
            raise QueryValidationError("invalid_sql") from error
        if len(statements) != 1:
            raise QueryValidationError("multiple_statements")
        root = statements[0]
        if not isinstance(root, exp.Query):
            raise QueryValidationError("not_select")
        expression = cast(exp.Expression, root)
        if expression.find(exp.Lock) or (
            expression.args.get("with_") and expression.args["with_"].args.get("recursive")
        ):
            raise QueryValidationError("unsafe_query")

        forbidden = (
            exp.Insert,
            exp.Update,
            exp.Delete,
            exp.Merge,
            exp.Create,
            exp.Drop,
            exp.Alter,
            exp.Command,
            exp.Transaction,
            exp.Commit,
            exp.Rollback,
            exp.Copy,
        )
        if any(expression.find(node_type) for node_type in forbidden):
            raise QueryValidationError("mutation_or_command")

        cte_names = {cte.alias_or_name.casefold() for cte in expression.find_all(exp.CTE)}
        tables = list(expression.find_all(exp.Table))
        relations = sorted(
            {table.name.casefold() for table in tables if table.name.casefold() not in cte_names}
        )
        if not relations or any(name not in RELATION_COLUMNS for name in relations):
            raise QueryValidationError("relation_not_allowed")
        for table in tables:
            if table.name.casefold() in cte_names:
                continue
            if table.catalog or (table.db and table.db.casefold() != "public"):
                raise QueryValidationError("schema_not_allowed")

        joins = sum(1 for _ in expression.find_all(exp.Join))
        if joins > self.max_joins:
            raise QueryValidationError("query_too_complex")
        nesting = max(
            (self._depth(cast(exp.Expression, node)) for node in expression.walk()), default=0
        )
        if nesting > self.max_nesting * 4:
            raise QueryValidationError("query_too_complex")

        self._validate_stars(expression)
        self._validate_functions(expression)
        self._validate_columns(expression, relations, cte_names)
        if self.profile is not None:
            self._validate_semantics(expression, cte_names)
        self._validate_limit(expression)
        self._validate_date_range(expression)

        canonical = expression.sql(dialect="postgres", pretty=False, normalize=True)
        fingerprint = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        select = expression if isinstance(expression, exp.Select) else expression.find(exp.Select)
        selected_columns = len(select.expressions) if select else 0
        return QueryValidation(
            canonical_sql=canonical,
            fingerprint=fingerprint,
            relations=tuple(relations),
            selected_columns=selected_columns,
            joins=joins,
            nesting=nesting,
        )

    @staticmethod
    def _depth(node: exp.Expression) -> int:
        depth = 0
        parent = node.parent
        while parent is not None:
            depth += 1
            parent = parent.parent
        return depth

    @staticmethod
    def _validate_functions(root: exp.Expression) -> None:
        for function in root.find_all(exp.Func):
            if isinstance(function, exp.Exists | exp.Case | exp.If | exp.Cast):
                continue
            name = function.sql_name().casefold()
            if name not in SAFE_FUNCTIONS | {"and", "or"}:
                raise QueryValidationError("function_not_allowed")

    @staticmethod
    def _validate_stars(root: exp.Expression) -> None:
        for star in root.find_all(exp.Star):
            if isinstance(star.parent, exp.Count):
                continue
            raise QueryValidationError("star_not_allowed")

    def _validate_columns(
        self, root: exp.Expression, relations: list[str], cte_names: set[str]
    ) -> None:
        allowed = set().union(*(RELATION_COLUMNS[name] for name in relations))
        aliases = {selection.alias.casefold() for selection in root.find_all(exp.Alias)}
        table_aliases = {
            table.alias_or_name.casefold(): table.name.casefold()
            for table in root.find_all(exp.Table)
            if table.name.casefold() not in cte_names
        }
        for column in root.find_all(exp.Column):
            if column.name.casefold() in self.forbidden_columns:
                raise QueryValidationError("identity_filter_forbidden")
            if column.table:
                relation = table_aliases.get(column.table.casefold())
                if relation and column.name.casefold() not in RELATION_COLUMNS[relation] | aliases:
                    raise QueryValidationError("column_relation_mismatch")
            if column.name.casefold() not in allowed | aliases:
                raise QueryValidationError("column_not_allowed")

    def _validate_semantics(self, root: exp.Expression, cte_names: set[str]) -> None:
        assert self.profile is not None
        aliases = {
            table.alias_or_name.casefold(): table.name.casefold()
            for table in root.find_all(exp.Table)
            if table.name.casefold() not in cte_names
        }
        enum_columns: dict[tuple[str, str], tuple[str, ...]] = {}
        for relation in self.profile.structural.relations:
            for column in relation.columns:
                if column.enum_name:
                    enum_columns[(relation.name, column.name)] = self.profile.structural.enums[
                        column.enum_name
                    ]

        def resolved(column: exp.Column) -> tuple[str, str] | None:
            name = column.name.casefold()
            if column.table:
                relation = aliases.get(column.table.casefold())
                return (relation, name) if relation else None
            matches = [key for key in enum_columns if key[1] == name and key[0] in aliases.values()]
            return matches[0] if len(matches) == 1 else None

        for comparison in root.find_all(exp.EQ, exp.NEQ):
            sides = ((comparison.left, comparison.right), (comparison.right, comparison.left))
            for column_node, literal_node in sides:
                if not isinstance(column_node, exp.Column) or not isinstance(
                    literal_node, exp.Literal
                ):
                    continue
                key = resolved(column_node)
                if key in enum_columns and literal_node.is_string:
                    if str(literal_node.this) not in enum_columns[key]:
                        raise QueryValidationError("enum_literal_unknown")
        for predicate in root.find_all(exp.In):
            if not isinstance(predicate.this, exp.Column):
                continue
            key = resolved(predicate.this)
            if key not in enum_columns:
                continue
            for value in predicate.expressions:
                if isinstance(value, exp.Literal) and value.is_string:
                    if str(value.this) not in enum_columns[key]:
                        raise QueryValidationError("enum_literal_unknown")

        allowed_edges = {
            frozenset(
                {
                    (join.left_relation, join.left_column),
                    (join.right_relation, join.right_column),
                }
            )
            for join in self.profile.structural.joins
        }
        for join in root.find_all(exp.Join):
            table = join.this
            if not isinstance(table, exp.Table) or table.name.casefold() in cte_names:
                continue
            on = join.args.get("on")
            if on is None:
                raise QueryValidationError("join_not_profiled")
            valid = False
            for equality in on.find_all(exp.EQ):
                if not isinstance(equality.left, exp.Column) or not isinstance(
                    equality.right, exp.Column
                ):
                    continue
                left_relation = aliases.get(equality.left.table.casefold())
                right_relation = aliases.get(equality.right.table.casefold())
                edge = frozenset(
                    {
                        (left_relation, equality.left.name.casefold()),
                        (right_relation, equality.right.name.casefold()),
                    }
                )
                if edge in allowed_edges:
                    valid = True
                    break
            if not valid:
                raise QueryValidationError("join_not_profiled")

    def _validate_limit(self, root: exp.Expression) -> None:
        limit = root.args.get("limit")
        if limit is None:
            return
        expression = limit.expression
        if not isinstance(expression, exp.Literal) or not expression.is_int:
            raise QueryValidationError("invalid_limit")
        if int(expression.this) > self.max_rows:
            raise QueryValidationError("limit_too_large")

    def _validate_date_range(self, root: exp.Expression) -> None:
        dates: list[date] = []
        for literal in root.find_all(exp.Literal):
            if not literal.is_string:
                continue
            match = re.match(r"^(\d{4}-\d{2}-\d{2})", str(literal.this))
            if match:
                dates.append(date.fromisoformat(match.group(1)))
        if dates and (max(dates) - min(dates)).days > self.max_date_range_days:
            raise QueryValidationError("date_range_too_large")
