"""CSV import for episode metadata. Normalizes what it safely can and skips
(with a reason) what it can't trust, rather than guessing.

Idempotency: `episode_id` (normalized) is the natural key; a DB unique
constraint plus `ON CONFLICT DO NOTHING` make re-running the same file safe
even if a second import races on it.
"""

import csv
import io
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from ..models import Episode, ImportBatch, Quality

REQUIRED_COLUMNS = {
    "episode_id",
    "robot_id",
    "task_name",
    "recorded_at",
    "duration_seconds",
    "operator_name",
    "quality",
}

KNOWN_ROBOTS = {"arm-01", "arm-02", "arm-03", "mobile-01", "humanoid-01"}

MAX_DURATION_SECONDS = 3600  # episodes are "short clips"; anything above is clearly bad data
MAX_REPORT_DETAILS = 1000  # cap the stored report so a 200k-row file doesn't blow up storage

DATE_FORMATS = [
    "%Y-%m-%dT%H:%M:%S%z",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y %H:%M:%S",
]


def _parse_datetime(raw: str) -> datetime | None:
    raw = raw.strip()
    if not raw:
        return None
    for fmt in DATE_FORMATS:
        try:
            dt = datetime.strptime(raw, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def _parse_duration(raw: str) -> float | None:
    raw = raw.strip()
    if not raw:
        return None
    try:
        value = float(raw)
    except ValueError:
        return None
    if value <= 0 or value > MAX_DURATION_SECONDS:
        return None
    return value


@dataclass
class _CleanRow:
    episode_id: str
    robot_id: str
    task_name: str
    recorded_at: datetime
    duration_seconds: float
    operator_name: str
    quality: Quality


@dataclass
class _ImportOutcome:
    total_rows: int = 0
    imported: list[_CleanRow] = field(default_factory=list)
    details: list[dict] = field(default_factory=list)  # {row_number, episode_id, outcome, reason}

    def add_detail(self, row_number: int, episode_id: str | None, outcome: str, reason: str | None = None) -> None:
        if len(self.details) < MAX_REPORT_DETAILS:
            self.details.append(
                {"row_number": row_number, "episode_id": episode_id, "outcome": outcome, "reason": reason}
            )


def _clean_row(row_number: int, raw_row: dict, outcome: _ImportOutcome, seen_in_file: set[str]) -> _CleanRow | None:
    # csv.DictReader uses None for missing trailing columns and extra columns (restkey).
    if any(raw_row.get(col) is None for col in REQUIRED_COLUMNS) or raw_row.get(None) is not None:
        outcome.add_detail(row_number, raw_row.get("episode_id"), "skipped", "malformed row: wrong column count")
        return None

    episode_id = (raw_row["episode_id"] or "").strip().upper()
    if not episode_id:
        outcome.add_detail(row_number, None, "skipped", "missing episode_id")
        return None

    if episode_id in seen_in_file:
        outcome.add_detail(row_number, episode_id, "duplicate", "duplicate episode_id within this file")
        return None

    robot_id = (raw_row["robot_id"] or "").strip().lower()
    if not robot_id:
        outcome.add_detail(row_number, episode_id, "skipped", "missing robot_id")
        return None
    if robot_id not in KNOWN_ROBOTS:
        outcome.add_detail(row_number, episode_id, "skipped", f"unknown robot_id '{robot_id}'")
        return None

    task_name = (raw_row["task_name"] or "").strip().lower()
    if not task_name:
        outcome.add_detail(row_number, episode_id, "skipped", "missing task_name")
        return None

    recorded_at = _parse_datetime(raw_row["recorded_at"] or "")
    if recorded_at is None:
        outcome.add_detail(row_number, episode_id, "skipped", f"unparseable recorded_at '{raw_row['recorded_at']}'")
        return None
    if recorded_at > datetime.now(timezone.utc):
        outcome.add_detail(row_number, episode_id, "skipped", "recorded_at is in the future")
        return None

    duration = _parse_duration(raw_row["duration_seconds"] or "")
    if duration is None:
        outcome.add_detail(
            row_number, episode_id, "skipped", f"invalid duration_seconds '{raw_row['duration_seconds']}'"
        )
        return None

    operator_name = (raw_row["operator_name"] or "").strip()
    if not operator_name:
        outcome.add_detail(row_number, episode_id, "skipped", "missing operator_name")
        return None

    quality_raw = (raw_row["quality"] or "").strip().lower()
    try:
        quality = Quality(quality_raw)
    except ValueError:
        outcome.add_detail(row_number, episode_id, "skipped", f"invalid quality '{raw_row['quality']}'")
        return None

    seen_in_file.add(episode_id)
    return _CleanRow(
        episode_id=episode_id,
        robot_id=robot_id,
        task_name=task_name,
        recorded_at=recorded_at,
        duration_seconds=duration,
        operator_name=operator_name,
        quality=quality,
    )


def import_episodes_csv(db: Session, file_content: str, filename: str, imported_by_id: str | None) -> ImportBatch:
    reader = csv.DictReader(io.StringIO(file_content))
    outcome = _ImportOutcome()
    seen_in_file: set[str] = set()

    for row_number, raw_row in enumerate(reader, start=2):  # header is row 1
        if raw_row is None or all(v is None or str(v).strip() == "" for v in raw_row.values()):
            continue  # blank trailing line
        outcome.total_rows += 1
        clean = _clean_row(row_number, raw_row, outcome, seen_in_file)
        if clean is not None:
            outcome.imported.append(clean)

    duplicate_count = sum(1 for d in outcome.details if d["outcome"] == "duplicate")
    skipped_count = sum(1 for d in outcome.details if d["outcome"] == "skipped")

    inserted_count = 0
    if outcome.imported:
        candidate_ids = [row.episode_id for row in outcome.imported]
        existing_ids = {
            episode_id
            for (episode_id,) in db.query(Episode.episode_id).filter(Episode.episode_id.in_(candidate_ids)).all()
        }
        rows_to_insert = [row for row in outcome.imported if row.episode_id not in existing_ids]
        for row in outcome.imported:
            if row.episode_id in existing_ids:
                duplicate_count += 1
                outcome.add_detail(0, row.episode_id, "duplicate", "already present in database")

        # ON CONFLICT DO NOTHING keeps this safe even if two imports race on the same file.
        chunk_size = 1000
        for i in range(0, len(rows_to_insert), chunk_size):
            chunk = rows_to_insert[i : i + chunk_size]
            if not chunk:
                continue
            values = [
                {
                    "episode_id": r.episode_id,
                    "robot_id": r.robot_id,
                    "task_name": r.task_name,
                    "recorded_at": r.recorded_at,
                    "duration_seconds": r.duration_seconds,
                    "operator_name": r.operator_name,
                    "quality": r.quality,
                }
                for r in chunk
            ]
            stmt = pg_insert(Episode).values(values).on_conflict_do_nothing(index_elements=["episode_id"])
            result = db.execute(stmt)
            inserted_count += result.rowcount if result.rowcount and result.rowcount > 0 else len(chunk)

    batch = ImportBatch(
        source_filename=filename,
        imported_by_id=imported_by_id,
        total_rows=outcome.total_rows,
        imported_count=inserted_count,
        skipped_count=skipped_count,
        duplicate_count=duplicate_count,
        report=json.dumps(outcome.details),
    )
    db.add(batch)
    db.flush()
    return batch
