"""Request status state machine.

submitted -> in_progress -> delivered -> accepted
                                       \\-> rejected -> in_progress (rework)

Each transition is owned by specific roles, and moving to `delivered` requires
enough episodes assigned. Every change is recorded in RequestStatusEvent.
"""

from sqlalchemy.orm import Session

from ..models import Assignment, DatasetRequest, RequestStatus, RequestStatusEvent, Role, User


class TransitionError(ValueError):
    pass


# from_status -> {to_status: set(roles allowed to perform it)}
ALLOWED_TRANSITIONS: dict[RequestStatus, dict[RequestStatus, set[Role]]] = {
    RequestStatus.submitted: {
        RequestStatus.in_progress: {Role.operator, Role.admin},
    },
    RequestStatus.in_progress: {
        RequestStatus.delivered: {Role.operator, Role.admin},
    },
    RequestStatus.delivered: {
        RequestStatus.accepted: {Role.client},
        RequestStatus.rejected: {Role.client},
    },
    RequestStatus.rejected: {
        RequestStatus.in_progress: {Role.operator, Role.admin},
    },
    RequestStatus.accepted: {},
}


def assigned_episode_count(db: Session, request_id: str) -> int:
    return db.query(Assignment).filter(Assignment.request_id == request_id).count()


def apply_transition(db: Session, req: DatasetRequest, to_status: RequestStatus, actor: User) -> DatasetRequest:
    allowed_for_status = ALLOWED_TRANSITIONS.get(req.status, {})
    allowed_roles = allowed_for_status.get(to_status)
    if allowed_roles is None:
        raise TransitionError(f"Cannot move a request from '{req.status.value}' to '{to_status.value}'")
    if actor.role not in allowed_roles:
        raise TransitionError(f"Role '{actor.role.value}' cannot perform this transition")
    if actor.role == Role.client and req.client_id != actor.id:
        raise TransitionError("Clients may only act on their own requests")

    if to_status == RequestStatus.delivered:
        count = assigned_episode_count(db, req.id)
        if count < req.episodes_requested:
            raise TransitionError(
                f"Request needs {req.episodes_requested} assigned episodes to be delivered, has {count}"
            )

    from_status = req.status
    req.status = to_status
    db.add(req)
    db.add(
        RequestStatusEvent(
            request_id=req.id,
            from_status=from_status,
            to_status=to_status,
            actor_id=actor.id,
        )
    )
    db.flush()
    return req
