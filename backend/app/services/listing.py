"""Shared helpers for the paginated/sortable/searchable list endpoints (episodes, requests, users).

Every listing does the same three things to a SQLAlchemy query -- apply a whitelisted sort,
count matching rows, then slice a page -- and does all three in the database. Nothing here loads
a full table into Python; `query.count()` is a `SELECT count(*)` and the page itself is a single
`LIMIT/OFFSET` query, so cost scales with the page size and the filtered result set, not with the
table's total size.
"""

from sqlalchemy import asc, desc
from sqlalchemy.orm import Query


def parse_sort(sort: str | None, allowed: dict[str, object], default: object) -> tuple[object, bool]:
    """`sort` is "field,dir" (e.g. "created_at,desc"). Falls back to `default` (a column) ascending
    when absent or the field isn't in `allowed` -- an unrecognised sort key is not something to
    500 over, since it only ever gets there via a URL someone typed or an outdated frontend."""
    if not sort:
        return default, True
    parts = [p.strip() for p in sort.split(",") if p.strip()]
    field = parts[0] if parts else None
    direction = parts[1].lower() if len(parts) > 1 else "asc"
    column = allowed.get(field) if field else None
    if column is None:
        return default, True
    return column, direction != "desc"


def paginate(query: Query, sort_column: object, ascending: bool, page: int, page_size: int) -> tuple[list, int]:
    total = query.count()
    ordered = query.order_by(asc(sort_column) if ascending else desc(sort_column))
    items = ordered.offset(max(page, 0) * page_size).limit(page_size).all()
    return items, total
