from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_operator
from ..schemas import AnalyticsOut, EpisodesPerDayPerRobot, RequestsByStatus, TopTask
from ..models import User

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _bounds(date_from: date | None, date_to: date | None) -> tuple[datetime, datetime]:
    start = datetime.combine(date_from, time.min, tzinfo=timezone.utc) if date_from else datetime(2000, 1, 1, tzinfo=timezone.utc)
    end = datetime.combine(date_to, time.max, tzinfo=timezone.utc) if date_to else datetime(2100, 1, 1, tzinfo=timezone.utc)
    return start, end


@router.get("", response_model=AnalyticsOut)
def analytics(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _operator: User = Depends(require_operator),
):
    """All aggregation happens in the database via GROUP BY / percentile_cont,
    never by pulling rows into Python -- see NOTES.md for how this behaves at
    volume (5M+ episodes)."""
    start, end = _bounds(date_from, date_to)

    per_day_per_robot = db.execute(
        text(
            """
            SELECT date_trunc('day', recorded_at) AS day, robot_id, count(*) AS count
            FROM episodes
            WHERE recorded_at BETWEEN :start AND :end
            GROUP BY 1, 2
            ORDER BY 1, 2
            """
        ),
        {"start": start, "end": end},
    ).all()

    by_status = db.execute(
        text(
            """
            SELECT status, count(*) AS count
            FROM dataset_requests
            WHERE created_at BETWEEN :start AND :end
            GROUP BY status
            """
        ),
        {"start": start, "end": end},
    ).all()

    median_hours = db.execute(
        text(
            """
            SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY delivered.created_at - submitted.created_at)
            FROM request_status_events submitted
            JOIN request_status_events delivered
              ON delivered.request_id = submitted.request_id
             AND delivered.to_status = 'delivered'
            WHERE submitted.to_status = 'submitted'
              AND delivered.created_at BETWEEN :start AND :end
            """
        ),
        {"start": start, "end": end},
    ).scalar()

    top_tasks = db.execute(
        text(
            """
            SELECT task_name, count(*) AS good_count
            FROM episodes
            WHERE quality = 'good' AND recorded_at BETWEEN :start AND :end
            GROUP BY task_name
            ORDER BY good_count DESC
            LIMIT 5
            """
        ),
        {"start": start, "end": end},
    ).all()

    median_hours_value = None
    if median_hours is not None:
        median_hours_value = median_hours.total_seconds() / 3600

    return AnalyticsOut(
        episodes_per_day_per_robot=[
            EpisodesPerDayPerRobot(day=row.day.date().isoformat(), robot_id=row.robot_id, count=row.count)
            for row in per_day_per_robot
        ],
        requests_by_status=[RequestsByStatus(status=row.status, count=row.count) for row in by_status],
        median_submitted_to_delivered_hours=median_hours_value,
        top_tasks_by_good_episodes=[TopTask(task_name=row.task_name, good_episode_count=row.good_count) for row in top_tasks],
    )
