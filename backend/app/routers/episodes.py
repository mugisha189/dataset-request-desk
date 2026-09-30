import json

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_operator
from ..models import Assignment, Episode, Quality, User
from ..schemas import EpisodeOut, ImportResult, Page
from ..services.export import export_response
from ..services.import_episodes import import_episodes_csv
from ..services.listing import paginate, parse_sort

router = APIRouter(prefix="/api/episodes", tags=["episodes"])

SORTABLE = {
    "episode_id": Episode.episode_id,
    "robot_id": Episode.robot_id,
    "task_name": Episode.task_name,
    "recorded_at": Episode.recorded_at,
    "duration_seconds": Episode.duration_seconds,
    "operator_name": Episode.operator_name,
    "quality": Episode.quality,
}


def _filtered_episodes_query(db: Session, search: str | None, quality: Quality | None, unassigned_only: bool):
    query = db.query(Episode)
    if search:
        needle = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(Episode.task_name.ilike(needle), Episode.episode_id.ilike(needle), Episode.operator_name.ilike(needle))
        )
    if quality:
        query = query.filter(Episode.quality == quality)
    if unassigned_only:
        query = query.outerjoin(Assignment).filter(Assignment.id.is_(None))
    return query


def _to_out(episode: Episode) -> EpisodeOut:
    return EpisodeOut.model_validate(episode, from_attributes=True).model_copy(
        update={"is_assigned": episode.assignment is not None}
    )


@router.get("", response_model=Page[EpisodeOut])
def list_episodes(
    task_name: str | None = None,
    quality: Quality | None = None,
    unassigned_only: bool = False,
    sort: str | None = None,
    page: int = 0,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _operator: User = Depends(require_operator),
):
    """`task_name` doubles as the free-text search box on the frontend -- it also matches episode
    id and operator name, not just the task."""
    query = _filtered_episodes_query(db, task_name, quality, unassigned_only)
    sort_column, ascending = parse_sort(sort, SORTABLE, Episode.recorded_at)
    if sort_column is Episode.recorded_at and sort is None:
        ascending = False  # default: most recent first
    episodes, total = paginate(query, sort_column, ascending, page, min(page_size, 100))
    return Page(items=[_to_out(e) for e in episodes], total=total, page=page, page_size=page_size)


@router.get("/export")
def export_episodes(
    task_name: str | None = None,
    quality: Quality | None = None,
    unassigned_only: bool = False,
    format: str = "csv",
    db: Session = Depends(get_db),
    _operator: User = Depends(require_operator),
):
    query = _filtered_episodes_query(db, task_name, quality, unassigned_only)
    episodes = query.order_by(Episode.recorded_at.desc()).limit(5000).all()

    headers = ["Episode", "Robot", "Task", "Recorded at", "Duration (s)", "Operator", "Quality", "Assigned"]
    rows = [
        [
            e.episode_id,
            e.robot_id,
            e.task_name,
            e.recorded_at.strftime("%Y-%m-%d %H:%M"),
            str(e.duration_seconds),
            e.operator_name,
            e.quality.value,
            "yes" if e.assignment is not None else "",
        ]
        for e in episodes
    ]
    return export_response(fmt=format, headers=headers, rows=rows, filename_base="episodes", title="Episodes")


@router.post("/import", response_model=ImportResult)
def import_episodes(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    operator: User = Depends(require_operator),
):
    content = file.file.read().decode("utf-8-sig")
    batch = import_episodes_csv(db, content, file.filename or "upload.csv", operator.id)
    db.commit()
    details = json.loads(batch.report)
    return ImportResult(
        batch_id=batch.id,
        total_rows=batch.total_rows,
        imported_count=batch.imported_count,
        skipped_count=batch.skipped_count,
        duplicate_count=batch.duplicate_count,
        details=details,
    )
