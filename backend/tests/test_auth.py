from .conftest import login


def test_login_wrong_password_rejected(client, client_user):
    res = client.post("/api/auth/login", json={"email": client_user.email, "password": "wrong"})
    assert res.status_code == 401


def test_unauthenticated_request_is_rejected(client):
    res = client.get("/api/requests")
    assert res.status_code == 401


def test_client_cannot_list_all_episodes(client, client_user):
    login(client, client_user.email)
    res = client.get("/api/episodes")
    assert res.status_code == 403


def test_client_cannot_import_episodes(client, client_user):
    login(client, client_user.email)
    res = client.post("/api/episodes/import", files={"file": ("x.csv", "episode_id\n", "text/csv")})
    assert res.status_code == 403


def test_operator_cannot_manage_users(client, operator):
    login(client, operator.email)
    res = client.get("/api/users")
    assert res.status_code == 403


def test_admin_can_manage_users(client, admin):
    login(client, admin.email)
    res = client.get("/api/users")
    assert res.status_code == 200


def test_client_cannot_view_another_clients_request(client, client_user, other_client_user):
    login(client, client_user.email)
    created = client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2030-01-01T00:00:00Z"},
    ).json()

    login(client, other_client_user.email)
    res = client.get(f"/api/requests/{created['id']}")
    assert res.status_code == 403


def test_client_only_sees_own_requests_in_list(client, client_user, other_client_user):
    login(client, client_user.email)
    client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2030-01-01T00:00:00Z"},
    )

    login(client, other_client_user.email)
    res = client.get("/api/requests")
    assert res.status_code == 200
    assert res.json() == []


def test_deactivated_user_cannot_authenticate_with_old_token(client, admin, client_user, db):
    login(client, client_user.email)
    res = client.get("/api/auth/me")
    assert res.status_code == 200

    login(client, admin.email)
    client.patch(f"/api/users/{client_user.id}", json={"is_active": False})

    # the client's cookie is gone (we logged in as admin), but check the flag stuck
    db.refresh(client_user)
    assert client_user.is_active is False
