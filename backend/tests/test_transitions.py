from datetime import datetime, timezone

from app.models import Episode, Quality

from .conftest import login


def _create_request(client, episodes_requested=1):
    res = client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": episodes_requested, "deadline": "2030-01-01T00:00:00Z"},
    )
    assert res.status_code == 201, res.text
    return res.json()


def _make_episode(db, episode_id="EP-1", quality=Quality.good):
    ep = Episode(
        episode_id=episode_id,
        robot_id="arm-01",
        task_name="pick cup",
        recorded_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        duration_seconds=30,
        operator_name="Aline",
        quality=quality,
    )
    db.add(ep)
    db.commit()
    db.refresh(ep)
    return ep


def test_submitted_to_in_progress_by_operator(client, client_user, operator):
    login(client, client_user.email)
    req = _create_request(client)

    login(client, operator.email)
    res = client.post(f"/api/requests/{req['id']}/status", json={"to_status": "in_progress"})
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"


def test_client_cannot_start_work(client, client_user):
    login(client, client_user.email)
    req = _create_request(client)
    res = client.post(f"/api/requests/{req['id']}/status", json={"to_status": "in_progress"})
    assert res.status_code == 400


def test_cannot_skip_straight_to_delivered(client, client_user, operator):
    login(client, client_user.email)
    req = _create_request(client)

    login(client, operator.email)
    res = client.post(f"/api/requests/{req['id']}/status", json={"to_status": "delivered"})
    assert res.status_code == 400


def test_cannot_deliver_without_enough_assigned_episodes(client, client_user, operator, db):
    login(client, client_user.email)
    req = _create_request(client, episodes_requested=2)

    login(client, operator.email)
    client.post(f"/api/requests/{req['id']}/status", json={"to_status": "in_progress"})

    ep = _make_episode(db)
    client.post(f"/api/requests/{req['id']}/assignments", json={"episode_ids": [ep.id]})

    res = client.post(f"/api/requests/{req['id']}/status", json={"to_status": "delivered"})
    assert res.status_code == 400
    assert "assigned episodes" in res.json()["detail"]


def test_full_happy_path_including_rework(client, client_user, operator, db):
    login(client, client_user.email)
    req = _create_request(client, episodes_requested=1)

    login(client, operator.email)
    client.post(f"/api/requests/{req['id']}/status", json={"to_status": "in_progress"})
    ep = _make_episode(db)
    client.post(f"/api/requests/{req['id']}/assignments", json={"episode_ids": [ep.id]})
    res = client.post(f"/api/requests/{req['id']}/status", json={"to_status": "delivered"})
    assert res.json()["status"] == "delivered"

    login(client, client_user.email)
    res = client.post(f"/api/requests/{req['id']}/status", json={"to_status": "rejected"})
    assert res.json()["status"] == "rejected"

    # operator can resume work (rework) after a rejection
    login(client, operator.email)
    res = client.post(f"/api/requests/{req['id']}/status", json={"to_status": "in_progress"})
    assert res.json()["status"] == "in_progress"

    # client cannot re-reject from in_progress
    login(client, client_user.email)
    res = client.post(f"/api/requests/{req['id']}/status", json={"to_status": "rejected"})
    assert res.status_code == 400


def test_client_cannot_accept_someone_elses_request(client, client_user, other_client_user, operator, db):
    login(client, client_user.email)
    req = _create_request(client, episodes_requested=1)
    login(client, operator.email)
    client.post(f"/api/requests/{req['id']}/status", json={"to_status": "in_progress"})
    ep = _make_episode(db)
    client.post(f"/api/requests/{req['id']}/assignments", json={"episode_ids": [ep.id]})
    client.post(f"/api/requests/{req['id']}/status", json={"to_status": "delivered"})

    login(client, other_client_user.email)
    res = client.post(f"/api/requests/{req['id']}/status", json={"to_status": "accepted"})
    assert res.status_code == 403


def test_every_transition_is_recorded_with_actor(client, client_user, operator, db):
    login(client, client_user.email)
    req = _create_request(client, episodes_requested=1)
    login(client, operator.email)
    client.post(f"/api/requests/{req['id']}/status", json={"to_status": "in_progress"})

    detail = client.get(f"/api/requests/{req['id']}").json()
    events = detail["status_events"]
    assert len(events) == 2  # initial submitted + this transition
    assert events[-1]["to_status"] == "in_progress"
    assert events[-1]["actor_id"] == operator.id
