from fastapi.testclient import TestClient


def test_health_ok(client: TestClient):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_register_then_login_then_me(client: TestClient):
    payload = {
        "full_name": "Test User",
        "email": "test.user@example.com",
        "username": "test_user",
        "phone": "+79990000000",
        "password": "secret123",
    }

    res = client.post("/auth/register", json=payload)
    assert res.status_code == 201, res.text
    created = res.json()
    assert created["username"] == payload["username"]
    assert created["role"] == "client"

    res = client.post("/auth/login", json={"username": payload["username"], "password": payload["password"]})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    me = res.json()
    assert me["username"] == payload["username"]
    assert me["email"] == payload["email"]

