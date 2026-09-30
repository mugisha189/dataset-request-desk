from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from .models import ExportStatus, Quality, RequestStatus, Role


# ---- auth ----

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    name: str
    user_id: str


# ---- users ----

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    organisation: str | None
    role: Role
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=8)
    role: Role
    organisation: str | None = None


class UserUpdate(BaseModel):
    role: Role | None = None
    is_active: bool | None = None


# ---- episodes ----

class EpisodeOut(BaseModel):
    id: str
    episode_id: str
    robot_id: str
    task_name: str
    recorded_at: datetime
    duration_seconds: float
    operator_name: str
    quality: Quality
    is_assigned: bool = False

    class Config:
        from_attributes = True


class ImportReportRow(BaseModel):
    row_number: int
    episode_id: str | None = None
    outcome: str  # imported | skipped | duplicate
    reason: str | None = None


class ImportResult(BaseModel):
    batch_id: str
    total_rows: int
    imported_count: int
    skipped_count: int
    duplicate_count: int
    details: list[ImportReportRow]


# ---- requests ----

class RequestCreate(BaseModel):
    task_name: str
    episodes_requested: int = Field(gt=0)
    deadline: datetime
    notes: str | None = None


class StatusEventOut(BaseModel):
    from_status: RequestStatus | None
    to_status: RequestStatus
    actor_id: str
    actor_name: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class AssignmentOut(BaseModel):
    id: str
    episode: EpisodeOut
    export_status: ExportStatus
    export_attempts: int
    export_error: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class RequestOut(BaseModel):
    id: str
    client_id: str
    client_name: str | None = None
    task_name: str
    episodes_requested: int
    deadline: datetime
    notes: str | None
    status: RequestStatus
    created_at: datetime
    updated_at: datetime
    assigned_count: int = 0

    class Config:
        from_attributes = True


class RequestDetailOut(RequestOut):
    status_events: list[StatusEventOut] = []
    assignments: list[AssignmentOut] = []


class StatusTransition(BaseModel):
    to_status: RequestStatus


class AssignEpisodesRequest(BaseModel):
    episode_ids: list[str]  # internal episode.id values


# ---- analytics ----

class EpisodesPerDayPerRobot(BaseModel):
    day: str
    robot_id: str
    count: int


class RequestsByStatus(BaseModel):
    status: RequestStatus
    count: int


class TopTask(BaseModel):
    task_name: str
    good_episode_count: int


class QualityBreakdown(BaseModel):
    quality: Quality
    count: int


class OperatorProductivity(BaseModel):
    operator_name: str
    count: int


class RequestsPerDay(BaseModel):
    day: str
    count: int


class RobotDuration(BaseModel):
    robot_id: str
    avg_duration_seconds: float


class ClientRequestCount(BaseModel):
    client_name: str
    count: int


class EpisodeFunnel(BaseModel):
    total: int
    assigned: int
    unassigned: int


class AnalyticsOut(BaseModel):
    episode_funnel: EpisodeFunnel
    episodes_per_day_per_robot: list[EpisodesPerDayPerRobot]
    requests_by_status: list[RequestsByStatus]
    median_submitted_to_delivered_hours: float | None
    top_tasks_by_good_episodes: list[TopTask]
    quality_breakdown: list[QualityBreakdown]
    operator_productivity: list[OperatorProductivity]
    requests_created_per_day: list[RequestsPerDay]
    avg_duration_by_robot: list[RobotDuration]
    clients_by_requests: list[ClientRequestCount]
