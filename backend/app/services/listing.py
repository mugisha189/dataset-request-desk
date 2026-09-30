"""Shared sort/count/paginate helpers for the list endpoints (episodes, requests, users).

Everything runs as SQL (`SELECT count(*)`, a `LIMIT/OFFSET` query) so cost scales with the
page size and filtered result set, never with the table's total size.
"""

from sqlalchemy import asc, desc
from sqlalchemy.orm import Query


def parse_sort(sort: str | None, allowed: dict[str, object], default: object) -> tuple[object, bool]:
    """`sort` is "field,dir" (e.g. "created_at,desc"); falls back to `default` ascending when
    absent or unrecognised rather than 500ing on a stale/hand-edited URL."""
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
