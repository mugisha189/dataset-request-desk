import json

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_operator
from ..models import Assignment, Episode, Quality, User
from ..schemas import EpisodeOut, ImportResult
from ..services.import_episodes import import_episodes_csv

router = APIRouter(prefix="/api/episodes", tags=["episodes"])


@router.get("", response_model=list[EpisodeOut])
def list_episodes(
    task_name: str | None = None,
    quality: Quality | None = None,
    unassigned_only: bool = False,
    limit: int = 200,
    db: Session = Depends(get_db),
    _operator: User = Depends(require_operator),
):
    query = db.query(Episode)
    if task_name:
        query = query.filter(Episode.task_name.ilike(f"%{task_name.strip().lower()}%"))
    if quality:
        query = query.filter(Episode.quality == quality)
    if unassigned_only:
        query = query.outerjoin(Assignment).filter(Assignment.id.is_(None))
    episodes = query.order_by(Episode.recorded_at.desc()).limit(min(limit, 1000)).all()
    return [EpisodeOut.model_validate(e, from_attributes=True).model_copy(update={"is_assigned": e.assignment is not None}) for e in episodes]


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
