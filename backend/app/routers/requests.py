from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import require_any, require_operator
from ..models import Assignment, DatasetRequest, Episode, RequestStatus, RequestStatusEvent, Role, User
from ..schemas import (
    AssignEpisodesRequest,
    Page,
    RequestCreate,
    RequestDetailOut,
    RequestOut,
    StatusEventOut,
    StatusTransition,
)
from ..services.assignments import AssignmentError, assign_episode
from ..services.export import export_response
from ..services.listing import paginate, parse_sort
from ..services.transitions import TransitionError, apply_transition

router = APIRouter(prefix="/api/requests", tags=["requests"])

SORTABLE = {
    "task_name": DatasetRequest.task_name,
    "deadline": DatasetRequest.deadline,
    "status": DatasetRequest.status,
    "created_at": DatasetRequest.created_at,
}


def _to_out(req: DatasetRequest) -> RequestOut:
    out = RequestOut.model_validate(req, from_attributes=True)
    out.client_name = req.client.name if req.client else None
    out.assigned_count = len(req.assignments)
    return out


def _to_detail(req: DatasetRequest) -> RequestDetailOut:
    out = RequestDetailOut.model_validate(req, from_attributes=True)
    out.client_name = req.client.name if req.client else None
    out.assigned_count = len(req.assignments)
    out.status_events = [
        StatusEventOut(
            from_status=e.from_status,
            to_status=e.to_status,
            actor_id=e.actor_id,
            actor_name=e.actor.name if e.actor else None,
            created_at=e.created_at,
        )
        for e in req.status_events
    ]
    return out


def _filtered_requests_query(db: Session, user: User, search: str | None, req_status: RequestStatus | None):
    query = db.query(DatasetRequest).options(joinedload(DatasetRequest.client), joinedload(DatasetRequest.assignments))
    if user.role == Role.client:
        query = query.filter(DatasetRequest.client_id == user.id)
    if req_status:
        query = query.filter(DatasetRequest.status == req_status)
    if search:
        needle = f"%{search.strip().lower()}%"
        query = query.join(DatasetRequest.client).filter(
            or_(DatasetRequest.task_name.ilike(needle), User.name.ilike(needle))
        )
    return query


def _get_request_or_404(db: Session, request_id: str) -> DatasetRequest:
    req = (
        db.query(DatasetRequest)
        .options(joinedload(DatasetRequest.client), joinedload(DatasetRequest.assignments))
        .filter(DatasetRequest.id == request_id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    return req


def _authorize_view(req: DatasetRequest, user: User) -> None:
    if user.role == Role.client and req.client_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your request")


@router.post("", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
def create_request(payload: RequestCreate, db: Session = Depends(get_db), user: User = Depends(require_any)):
    if user.role != Role.client:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only clients create requests")
    req = DatasetRequest(
        client_id=user.id,
        task_name=payload.task_name.strip(),
        episodes_requested=payload.episodes_requested,
        deadline=payload.deadline,
        notes=payload.notes,
    )
    db.add(req)
    db.flush()
    # Record the initial state too, so analytics (median submitted -> delivered)
    # has a `submitted` timestamp to measure from.
    db.add(RequestStatusEvent(request_id=req.id, from_status=None, to_status=req.status, actor_id=user.id))
    db.commit()
    db.refresh(req)
    return _to_out(req)


@router.get("", response_model=Page[RequestOut])
def list_requests(
    search: str | None = None,
    req_status: RequestStatus | None = Query(None, alias="status"),
    sort: str | None = None,
    page: int = 0,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(require_any),
):
    query = _filtered_requests_query(db, user, search, req_status)
    sort_column, ascending = parse_sort(sort, SORTABLE, DatasetRequest.created_at)
    if sort_column is DatasetRequest.created_at and sort is None:
        ascending = False  # default: newest first
    requests, total = paginate(query, sort_column, ascending, page, min(page_size, 100))
    return Page(items=[_to_out(r) for r in requests], total=total, page=page, page_size=page_size)


@router.get("/export")
def export_requests(
    search: str | None = None,
    req_status: RequestStatus | None = Query(None, alias="status"),
    format: str = "csv",
    db: Session = Depends(get_db),
    user: User = Depends(require_any),
):
    query = _filtered_requests_query(db, user, search, req_status)
    requests = query.order_by(DatasetRequest.created_at.desc()).limit(5000).all()

    headers = ["Task", "Client", "Episodes requested", "Assigned", "Deadline", "Status", "Created"]
    rows = [
        [
            r.task_name,
            r.client.name if r.client else "",
            str(r.episodes_requested),
            str(len(r.assignments)),
            r.deadline.strftime("%Y-%m-%d"),
            r.status.value,
            r.created_at.strftime("%Y-%m-%d %H:%M"),
        ]
        for r in requests
    ]
    return export_response(fmt=format, headers=headers, rows=rows, filename_base="requests", title="Dataset requests")


@router.get("/{request_id}", response_model=RequestDetailOut)
def get_request(request_id: str, db: Session = Depends(get_db), user: User = Depends(require_any)):
    req = _get_request_or_404(db, request_id)
    _authorize_view(req, user)
    return _to_detail(req)


@router.post("/{request_id}/status", response_model=RequestOut)
def change_status(
    request_id: str,
    payload: StatusTransition,
    db: Session = Depends(get_db),
    user: User = Depends(require_any),
):
    req = _get_request_or_404(db, request_id)
    _authorize_view(req, user)
    try:
        apply_transition(db, req, payload.to_status, user)
    except TransitionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    db.commit()
    db.refresh(req)
    return _to_out(req)


@router.post("/{request_id}/assignments", response_model=RequestDetailOut)
def assign_episodes(
    request_id: str,
    payload: AssignEpisodesRequest,
    db: Session = Depends(get_db),
    operator: User = Depends(require_operator),
):
    req = _get_request_or_404(db, request_id)
    for episode_id in payload.episode_ids:
        episode = db.get(Episode, episode_id)
        if not episode:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Episode {episode_id} not found")
        try:
            assign_episode(db, req, episode, operator)
        except AssignmentError as exc:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    db.commit()
    db.refresh(req)
    return _to_detail(req)


@router.delete("/{request_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_episode(
    request_id: str,
    assignment_id: str,
    db: Session = Depends(get_db),
    _operator: User = Depends(require_operator),
):
    assignment = db.get(Assignment, assignment_id)
    if not assignment or assignment.request_id != request_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
