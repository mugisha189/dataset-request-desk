from sqlalchemy.orm import Session

from ..models import Assignment, DatasetRequest, Episode, Quality, RequestStatus, User


class AssignmentError(ValueError):
    pass


ASSIGNABLE_QUALITIES = {Quality.good, Quality.usable}
ASSIGNABLE_REQUEST_STATUSES = {RequestStatus.submitted, RequestStatus.in_progress, RequestStatus.rejected}


def assign_episode(db: Session, req: DatasetRequest, episode: Episode, actor: User) -> Assignment:
    if req.status not in ASSIGNABLE_REQUEST_STATUSES:
        raise AssignmentError(f"Cannot assign episodes to a request in status '{req.status.value}'")
    if episode.quality not in ASSIGNABLE_QUALITIES:
        raise AssignmentError(f"Episode {episode.episode_id} has quality '{episode.quality.value}' and cannot be assigned")
    if episode.assignment is not None:
        raise AssignmentError(f"Episode {episode.episode_id} is already assigned to another request")

    assignment = Assignment(request_id=req.id, episode_id=episode.id, assigned_by_id=actor.id)
    db.add(assignment)
    db.flush()
    return assignment


def unassign_episode(db: Session, assignment: Assignment) -> None:
    db.delete(assignment)
    db.flush()
