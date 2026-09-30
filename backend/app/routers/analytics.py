from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_operator
from ..schemas import (
    AnalyticsOut,
    ClientRequestCount,
    EpisodeFunnel,
    EpisodesPerDayPerRobot,
    OperatorProductivity,
    QualityBreakdown,
    RequestsByStatus,
    RequestsPerDay,
    RobotDuration,
    TopTask,
)
from ..services.export import export_response
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
    """All aggregation happens in the database via GROUP BY / percentile_cont, never by loading
    rows into Python -- see NOTES.md for how this behaves at volume (5M+ episodes)."""
    start, end = _bounds(date_from, date_to)
    params = {"start": start, "end": end}

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
        params,
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
        params,
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
        params,
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
        params,
    ).all()

    # ── The rest: added so the dashboard says more than "here are some counts" ──────────────

    funnel = db.execute(
        text(
            """
            SELECT
              count(*) AS total,
              count(a.id) AS assigned
            FROM episodes e
            LEFT JOIN assignments a ON a.episode_id = e.id
            WHERE e.recorded_at BETWEEN :start AND :end
            """
        ),
        params,
    ).one()

    quality_breakdown = db.execute(
        text(
            """
            SELECT quality, count(*) AS count
            FROM episodes
            WHERE recorded_at BETWEEN :start AND :end
            GROUP BY quality
            """
        ),
        params,
    ).all()

    operator_productivity = db.execute(
        text(
            """
            SELECT operator_name, count(*) AS count
            FROM episodes
            WHERE recorded_at BETWEEN :start AND :end
            GROUP BY operator_name
            ORDER BY count DESC
            LIMIT 8
            """
        ),
        params,
    ).all()

    requests_per_day = db.execute(
        text(
            """
            SELECT date_trunc('day', created_at) AS day, count(*) AS count
            FROM dataset_requests
            WHERE created_at BETWEEN :start AND :end
            GROUP BY 1
            ORDER BY 1
            """
        ),
        params,
    ).all()

    avg_duration_by_robot = db.execute(
        text(
            """
            SELECT robot_id, avg(duration_seconds) AS avg_seconds
            FROM episodes
            WHERE recorded_at BETWEEN :start AND :end
            GROUP BY robot_id
            ORDER BY robot_id
            """
        ),
        params,
    ).all()

    clients_by_requests = db.execute(
        text(
            """
            SELECT u.name AS client_name, count(*) AS count
            FROM dataset_requests r
            JOIN users u ON u.id = r.client_id
            WHERE r.created_at BETWEEN :start AND :end
            GROUP BY u.name
            ORDER BY count DESC
            LIMIT 8
            """
        ),
        params,
    ).all()

    median_hours_value = median_hours.total_seconds() / 3600 if median_hours is not None else None

    return AnalyticsOut(
        episode_funnel=EpisodeFunnel(
            total=funnel.total, assigned=funnel.assigned, unassigned=funnel.total - funnel.assigned
        ),
        episodes_per_day_per_robot=[
            EpisodesPerDayPerRobot(day=row.day.date().isoformat(), robot_id=row.robot_id, count=row.count)
            for row in per_day_per_robot
        ],
        requests_by_status=[RequestsByStatus(status=row.status, count=row.count) for row in by_status],
        median_submitted_to_delivered_hours=median_hours_value,
        top_tasks_by_good_episodes=[TopTask(task_name=row.task_name, good_episode_count=row.good_count) for row in top_tasks],
        quality_breakdown=[QualityBreakdown(quality=row.quality, count=row.count) for row in quality_breakdown],
        operator_productivity=[
            OperatorProductivity(operator_name=row.operator_name, count=row.count) for row in operator_productivity
        ],
        requests_created_per_day=[RequestsPerDay(day=row.day.date().isoformat(), count=row.count) for row in requests_per_day],
        avg_duration_by_robot=[
            RobotDuration(robot_id=row.robot_id, avg_duration_seconds=round(float(row.avg_seconds), 1))
            for row in avg_duration_by_robot
        ],
        clients_by_requests=[ClientRequestCount(client_name=row.client_name, count=row.count) for row in clients_by_requests],
    )


@router.get("/daily-export")
def export_daily(
    date_from: date | None = None,
    date_to: date | None = None,
    format: str = "csv",
    db: Session = Depends(get_db),
    _operator: User = Depends(require_operator),
):
    """The episodes-per-day-per-robot table, exportable -- the chart on the dashboard shows the
    shape, this is the figures behind it."""
    start, end = _bounds(date_from, date_to)
    rows_db = db.execute(
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

    headers = ["Day", "Robot", "Episodes recorded"]
    rows = [[row.day.date().isoformat(), row.robot_id, str(row.count)] for row in rows_db]
    return export_response(fmt=format, headers=headers, rows=rows, filename_base="episodes-per-day", title="Episodes per day per robot")
