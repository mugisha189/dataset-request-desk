from datetime import datetime, timezone

from app.models import Episode, Quality, Role

from .conftest import login, make_user


def _make_episode(db, episode_id, task_name="pick cup", quality=Quality.good, recorded_at=None):
    ep = Episode(
        episode_id=episode_id,
        robot_id="arm-01",
        task_name=task_name,
        recorded_at=recorded_at or datetime(2026, 1, 1, tzinfo=timezone.utc),
        duration_seconds=30,
        operator_name="Aline",
        quality=quality,
    )
    db.add(ep)
    db.commit()
    return ep


def test_episodes_list_is_paginated(client, operator, db):
    for i in range(5):
        _make_episode(db, f"EP-{i}")

    login(client, operator.email)
    res = client.get("/api/episodes?page=0&page_size=2")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 5
    assert len(body["items"]) == 2
    assert body["page"] == 0
    assert body["page_size"] == 2

    res2 = client.get("/api/episodes?page=2&page_size=2")
    assert len(res2.json()["items"]) == 1  # last page: 5 rows, page size 2 -> 1 left over


def test_episodes_search_matches_task_episode_id_or_operator(client, operator, db):
    _make_episode(db, "EP-1", task_name="pick cup")
    _make_episode(db, "EP-2", task_name="wipe table")

    login(client, operator.email)
    assert client.get("/api/episodes?task_name=cup").json()["total"] == 1
    assert client.get("/api/episodes?task_name=EP-2").json()["total"] == 1
    assert client.get("/api/episodes?task_name=Aline").json()["total"] == 2


def test_episodes_sort_by_duration(client, operator, db):
    ep1 = _make_episode(db, "EP-1")
    ep1.duration_seconds = 100
    ep2 = _make_episode(db, "EP-2")
    ep2.duration_seconds = 10
    db.commit()

    login(client, operator.email)
    res = client.get("/api/episodes?sort=duration_seconds,asc")
    ids = [row["episode_id"] for row in res.json()["items"]]
    assert ids == ["EP-2", "EP-1"]


def test_requests_filterable_by_status_and_searchable(client, client_user, operator, db):
    login(client, client_user.email)
    client.post("/api/requests", json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2030-01-01T00:00:00Z"})
    client.post("/api/requests", json={"task_name": "wipe table", "episodes_requested": 1, "deadline": "2030-01-01T00:00:00Z"})

    login(client, operator.email)
    all_res = client.get("/api/requests").json()
    assert all_res["total"] == 2

    filtered = client.get("/api/requests?status=submitted").json()
    assert filtered["total"] == 2  # both start as submitted

    searched = client.get("/api/requests?search=wipe").json()
    assert searched["total"] == 1
    assert searched["items"][0]["task_name"] == "wipe table"


def test_users_list_paginated_and_filterable_by_role(client, admin, db):
    make_user(db, "op-a@test.com", Role.operator)
    make_user(db, "op-b@test.com", Role.operator)
    make_user(db, "cl-a@test.com", Role.client)

    login(client, admin.email)
    res = client.get("/api/users?role=operator&page_size=1")
    body = res.json()
    assert body["total"] == 2  # two operators match the filter...
    assert len(body["items"]) == 1  # ...but only one comes back for page_size=1
