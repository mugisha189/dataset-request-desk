from app.models import Episode
from app.services.import_episodes import import_episodes_csv

HEADER = "episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality\n"


def test_valid_row_is_imported(db):
    csv_content = HEADER + "EP-001,arm-01,pick cup,2026-01-01T10:00:00,30,Aline,good\n"
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    db.commit()
    assert batch.imported_count == 1
    assert db.query(Episode).count() == 1


def test_reimporting_the_same_file_creates_no_duplicates(db):
    csv_content = HEADER + "EP-001,arm-01,pick cup,2026-01-01T10:00:00,30,Aline,good\n"
    import_episodes_csv(db, csv_content, "f.csv", None)
    db.commit()

    batch2 = import_episodes_csv(db, csv_content, "f.csv", None)
    db.commit()

    assert batch2.imported_count == 0
    assert batch2.duplicate_count == 1
    assert db.query(Episode).count() == 1


def test_episode_id_is_case_and_whitespace_normalized_for_dedup(db):
    csv_content = HEADER + " ep-001 ,arm-01,pick cup,2026-01-01T10:00:00,30,Aline,good\n"
    import_episodes_csv(db, csv_content, "f.csv", None)
    db.commit()
    ep = db.query(Episode).one()
    assert ep.episode_id == "EP-001"


def test_duplicate_within_same_file_only_keeps_first(db):
    csv_content = HEADER + (
        "EP-001,arm-01,pick cup,2026-01-01T10:00:00,30,Aline,good\n"
        "EP-001,arm-02,fold towel,2026-01-02T10:00:00,40,Eric,bad\n"
    )
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    db.commit()
    assert batch.imported_count == 1
    assert batch.duplicate_count == 1
    ep = db.query(Episode).one()
    assert ep.robot_id == "arm-01"  # the first occurrence won


def test_missing_episode_id_is_skipped(db):
    csv_content = HEADER + ",arm-01,pick cup,2026-01-01T10:00:00,30,Aline,good\n"
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    assert batch.imported_count == 0
    assert batch.skipped_count == 1


def test_unknown_robot_is_skipped(db):
    csv_content = HEADER + "EP-001,arm-99,pick cup,2026-01-01T10:00:00,30,Aline,good\n"
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    assert batch.imported_count == 0
    assert batch.skipped_count == 1
    assert "unknown robot_id" in batch.report


def test_invalid_quality_is_skipped(db):
    csv_content = HEADER + "EP-001,arm-01,pick cup,2026-01-01T10:00:00,30,Aline,excellent\n"
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    assert batch.skipped_count == 1


def test_quality_is_case_insensitive(db):
    csv_content = HEADER + "EP-001,arm-01,pick cup,2026-01-01T10:00:00,30,Aline,GOOD\n"
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    db.commit()
    assert batch.imported_count == 1
    assert db.query(Episode).one().quality.value == "good"


def test_non_positive_or_huge_duration_is_skipped(db):
    csv_content = HEADER + (
        "EP-001,arm-01,pick cup,2026-01-01T10:00:00,-5,Aline,good\n"
        "EP-002,arm-01,pick cup,2026-01-01T10:00:00,999999,Aline,good\n"
        "EP-003,arm-01,pick cup,2026-01-01T10:00:00,N/A,Aline,good\n"
    )
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    assert batch.imported_count == 0
    assert batch.skipped_count == 3


def test_multiple_date_formats_are_accepted(db):
    csv_content = HEADER + (
        "EP-001,arm-01,pick cup,2026-01-01T10:00:00,30,Aline,good\n"
        "EP-002,arm-01,pick cup,01/02/2026 10:00,30,Aline,good\n"
        "EP-003,arm-01,pick cup,2026-01-03 10:00:00,30,Aline,good\n"
        "EP-004,arm-01,pick cup,2026-01-04T10:00:00Z,30,Aline,good\n"
    )
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    assert batch.imported_count == 4


def test_unparseable_date_is_skipped(db):
    csv_content = HEADER + "EP-001,arm-01,pick cup,not a date,30,Aline,good\n"
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    assert batch.skipped_count == 1


def test_future_recorded_at_is_skipped(db):
    csv_content = HEADER + "EP-001,arm-01,pick cup,2999-01-01T10:00:00,30,Aline,good\n"
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    assert batch.skipped_count == 1


def test_malformed_row_with_missing_columns_is_skipped(db):
    csv_content = HEADER + "EP-001,arm-01,pick cup,2026-01-01T10:00:00,30\n"  # missing operator_name, quality
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    assert batch.imported_count == 0
    assert batch.skipped_count == 1


def test_task_name_and_robot_id_whitespace_and_case_are_normalized(db):
    csv_content = HEADER + "EP-001, arm-01 ,  Pick Cup ,2026-01-01T10:00:00,30,Aline,good\n"
    import_episodes_csv(db, csv_content, "f.csv", None)
    db.commit()
    ep = db.query(Episode).one()
    assert ep.robot_id == "arm-01"
    assert ep.task_name == "pick cup"


def test_blank_trailing_lines_are_ignored(db):
    csv_content = HEADER + "EP-001,arm-01,pick cup,2026-01-01T10:00:00,30,Aline,good\n\n   \n"
    batch = import_episodes_csv(db, csv_content, "f.csv", None)
    assert batch.total_rows == 1
