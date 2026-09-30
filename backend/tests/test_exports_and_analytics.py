from datetime import datetime, timezone

from app.models import Episode, Quality

from .conftest import login


def _make_episode(db, episode_id="EP-1", quality=Quality.good, robot_id="arm-01", operator_name="Aline"):
    ep = Episode(
        episode_id=episode_id,
        robot_id=robot_id,
        task_name="pick cup",
        recorded_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        duration_seconds=30,
        operator_name=operator_name,
        quality=quality,
    )
    db.add(ep)
    db.commit()
    db.refresh(ep)
    return ep


def test_analytics_reports_episode_funnel(client, operator, client_user, db):
    _make_episode(db, "EP-1")
    _make_episode(db, "EP-2")

    login(client, client_user.email)
    req = client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2030-01-01T00:00:00Z"},
    ).json()

    login(client, operator.email)
    client.post(f"/api/requests/{req['id']}/assignments", json={"episode_ids": [db.query(Episode).first().id]})

    res = client.get("/api/analytics")
    assert res.status_code == 200
    funnel = res.json()["episode_funnel"]
    assert funnel["total"] == 2
    assert funnel["assigned"] == 1
    assert funnel["unassigned"] == 1


def test_analytics_quality_breakdown_and_operator_productivity(client, operator, db):
    _make_episode(db, "EP-1", quality=Quality.good, operator_name="Aline")
    _make_episode(db, "EP-2", quality=Quality.bad, operator_name="Aline")
    _make_episode(db, "EP-3", quality=Quality.usable, operator_name="Eric")

    login(client, operator.email)
    data = client.get("/api/analytics").json()

    qualities = {row["quality"]: row["count"] for row in data["quality_breakdown"]}
    assert qualities == {"good": 1, "bad": 1, "usable": 1}

    operators = {row["operator_name"]: row["count"] for row in data["operator_productivity"]}
    assert operators["Aline"] == 2
    assert operators["Eric"] == 1


def test_client_cannot_reach_analytics(client, client_user):
    login(client, client_user.email)
    res = client.get("/api/analytics")
    assert res.status_code == 403


def test_requests_export_csv_is_scoped_to_client(client, client_user, other_client_user, operator):
    login(client, client_user.email)
    client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2030-01-01T00:00:00Z"},
    )

    res = client.get("/api/requests/export?format=csv")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "pick cup" in res.text

    login(client, other_client_user.email)
    res = client.get("/api/requests/export?format=csv")
    assert "pick cup" not in res.text


def test_episodes_export_xlsx(client, operator, db):
    _make_episode(db, "EP-1")
    login(client, operator.email)
    res = client.get("/api/episodes/export?format=xlsx")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert res.content[:2] == b"PK"  # xlsx is a zip archive


def test_daily_export_pdf(client, operator, db):
    _make_episode(db, "EP-1")
    login(client, operator.email)
    res = client.get("/api/analytics/daily-export?format=pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content[:4] == b"%PDF"


def test_export_rejects_unknown_format(client, operator):
    login(client, operator.email)
    res = client.get("/api/episodes/export?format=doc")
    assert res.status_code == 400


def test_users_export_is_admin_only(client, operator, admin):
    login(client, operator.email)
    res = client.get("/api/users/export?format=csv")
    assert res.status_code == 403

    login(client, admin.email)
    res = client.get("/api/users/export?format=csv")
    assert res.status_code == 200
    assert admin.email in res.text
