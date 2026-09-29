import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def uuid_str() -> str:
    return str(uuid.uuid4())


class Role(str, enum.Enum):
    client = "client"
    operator = "operator"
    admin = "admin"


class Quality(str, enum.Enum):
    good = "good"
    usable = "usable"
    bad = "bad"


class RequestStatus(str, enum.Enum):
    submitted = "submitted"
    in_progress = "in_progress"
    delivered = "delivered"
    accepted = "accepted"
    rejected = "rejected"


class ExportStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    organisation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role, name="role"), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    requests: Mapped[list["DatasetRequest"]] = relationship(back_populates="client", foreign_keys="DatasetRequest.client_id")


class Episode(Base):
    __tablename__ = "episodes"
    __table_args__ = (
        UniqueConstraint("episode_id", name="uq_episodes_episode_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    episode_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    robot_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    task_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    operator_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quality: Mapped[Quality] = mapped_column(Enum(Quality, name="quality"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assignment: Mapped["Assignment | None"] = relationship(back_populates="episode", uselist=False)


class DatasetRequest(Base):
    __tablename__ = "dataset_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    client_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    episodes_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus, name="request_status"), nullable=False, default=RequestStatus.submitted, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("episodes_requested > 0", name="ck_requests_episodes_requested_positive"),
    )

    client: Mapped["User"] = relationship(back_populates="requests", foreign_keys=[client_id])
    assignments: Mapped[list["Assignment"]] = relationship(back_populates="request", cascade="all, delete-orphan")
    status_events: Mapped[list["RequestStatusEvent"]] = relationship(
        back_populates="request", cascade="all, delete-orphan", order_by="RequestStatusEvent.created_at"
    )


class RequestStatusEvent(Base):
    """Audit trail: every status change, who made it and when."""

    __tablename__ = "request_status_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    request_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_requests.id"), nullable=False, index=True)
    from_status: Mapped[RequestStatus | None] = mapped_column(Enum(RequestStatus, name="request_status"), nullable=True)
    to_status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus, name="request_status"), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    request: Mapped["DatasetRequest"] = relationship(back_populates="status_events")
    actor: Mapped["User"] = relationship()


class Assignment(Base):
    """An episode assigned to a request. One episode -> at most one active assignment."""

    __tablename__ = "assignments"
    __table_args__ = (
        UniqueConstraint("episode_id", name="uq_assignments_episode_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    request_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_requests.id"), nullable=False, index=True)
    episode_id: Mapped[str] = mapped_column(String(36), ForeignKey("episodes.id"), nullable=False)
    assigned_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    export_status: Mapped[ExportStatus] = mapped_column(
        Enum(ExportStatus, name="export_status"), nullable=False, default=ExportStatus.pending
    )
    export_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    export_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    export_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    request: Mapped["DatasetRequest"] = relationship(back_populates="assignments")
    episode: Mapped["Episode"] = relationship(back_populates="assignment")
    assigned_by: Mapped["User"] = relationship()


class ImportBatch(Base):
    """One row per CSV import run, for reporting what was imported/skipped."""

    __tablename__ = "import_batches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    source_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    imported_by_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    imported_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duplicate_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    report: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON list of {row, reason}
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
