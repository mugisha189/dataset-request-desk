from datetime import datetime, timezone

from app.models import Episode, Quality

from .conftest import login


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


def _create_request(client, episodes_requested=1):
    return client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": episodes_requested, "deadline": "2030-01-01T00:00:00Z"},
    ).json()


def test_bad_quality_episode_cannot_be_assigned(client, client_user, operator, db):
    login(client, client_user.email)
    req = _create_request(client)
    login(client, operator.email)
    ep = _make_episode(db, quality=Quality.bad)

    res = client.post(f"/api/requests/{req['id']}/assignments", json={"episode_ids": [ep.id]})
    assert res.status_code == 400
    assert "quality" in res.json()["detail"]


def test_usable_quality_can_be_assigned(client, client_user, operator, db):
    login(client, client_user.email)
    req = _create_request(client)
    login(client, operator.email)
    ep = _make_episode(db, quality=Quality.usable)

    res = client.post(f"/api/requests/{req['id']}/assignments", json={"episode_ids": [ep.id]})
    assert res.status_code == 200
    assert res.json()["assigned_count"] == 1


def test_episode_cannot_be_assigned_twice(client, client_user, operator, db):
    login(client, client_user.email)
    req1 = _create_request(client)
    req2 = _create_request(client)
    login(client, operator.email)
    ep = _make_episode(db)

    res1 = client.post(f"/api/requests/{req1['id']}/assignments", json={"episode_ids": [ep.id]})
    assert res1.status_code == 200

    res2 = client.post(f"/api/requests/{req2['id']}/assignments", json={"episode_ids": [ep.id]})
    assert res2.status_code == 400
    assert "already assigned" in res2.json()["detail"]


def test_client_cannot_assign_episodes(client, client_user, db):
    login(client, client_user.email)
    req = _create_request(client)
    ep = _make_episode(db)
    res = client.post(f"/api/requests/{req['id']}/assignments", json={"episode_ids": [ep.id]})
    assert res.status_code == 403


def test_unassign_frees_the_episode_for_reassignment(client, client_user, operator, db):
    login(client, client_user.email)
    req1 = _create_request(client)
    req2 = _create_request(client)
    login(client, operator.email)
    ep = _make_episode(db)

    detail = client.post(f"/api/requests/{req1['id']}/assignments", json={"episode_ids": [ep.id]}).json()
    assignment_id = detail["assignments"][0]["id"]

    res = client.delete(f"/api/requests/{req1['id']}/assignments/{assignment_id}")
    assert res.status_code == 204

    res = client.post(f"/api/requests/{req2['id']}/assignments", json={"episode_ids": [ep.id]})
    assert res.status_code == 200


def test_cannot_assign_to_an_accepted_request(client, client_user, operator, db):
    login(client, client_user.email)
    req = _create_request(client, episodes_requested=1)
    login(client, operator.email)
    client.post(f"/api/requests/{req['id']}/status", json={"to_status": "in_progress"})
    ep1 = _make_episode(db, "EP-1")
    client.post(f"/api/requests/{req['id']}/assignments", json={"episode_ids": [ep1.id]})
    client.post(f"/api/requests/{req['id']}/status", json={"to_status": "delivered"})

    login(client, client_user.email)
    client.post(f"/api/requests/{req['id']}/status", json={"to_status": "accepted"})

    login(client, operator.email)
    ep2 = _make_episode(db, "EP-2")
    res = client.post(f"/api/requests/{req['id']}/assignments", json={"episode_ids": [ep2.id]})
    assert res.status_code == 400
