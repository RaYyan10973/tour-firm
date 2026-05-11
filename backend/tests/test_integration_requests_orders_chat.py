from fastapi.testclient import TestClient

from conftest import auth_header


def test_client_creates_request_manager_takes_and_creates_order_then_client_pays(client: TestClient, tokens: dict[str, str]):
    # client creates request
    res = client.post(
        "/requests",
        headers=auth_header(tokens["client"]),
        json={
            "destination": "Япония",
            "travel_dates": "2026-06-01",
            "travelers_count": 2,
            "budget": 250000,
            "notes": "Только Токио, 5 ночей.",
        },
    )
    assert res.status_code == 200, res.text
    created_request = res.json()
    request_id = created_request["id"]
    assert created_request["manager_id"] is None

    # manager takes request
    res = client.patch(f"/requests/{request_id}/take", headers=auth_header(tokens["manager"]))
    assert res.status_code == 200, res.text
    taken = res.json()
    assert taken["manager_id"] is not None

    # manager creates order
    res = client.post(
        "/orders",
        headers=auth_header(tokens["manager"]),
        json={
            "request_id": request_id,
            "hotel_name": "Tokyo Demo Hotel",
            "hotel_category": "Япония",
            "weekly_cost": 175000,
        },
    )
    assert res.status_code == 201, res.text
    order = res.json()
    order_id = order["id"]
    assert order["request_id"] == request_id
    assert order["status"] == "in_work"

    # client sees order in list
    res = client.get("/orders/my", headers=auth_header(tokens["client"]))
    assert res.status_code == 200, res.text
    assert any(item["id"] == order_id for item in res.json())

    # client pays
    res = client.post(f"/orders/{order_id}/pay", headers=auth_header(tokens["client"]))
    assert res.status_code == 200, res.text
    paid = res.json()
    assert paid["status"] == "paid"


def test_chat_access_and_message_flow(client: TestClient, tokens: dict[str, str]):
    # demo data seeds Турция request with chat messages (see app.main seed_demo_data).
    # We'll find an accessible request for client by listing /requests/my and opening chat.
    res = client.get("/requests/my", headers=auth_header(tokens["client"]))
    assert res.status_code == 200, res.text
    my_requests = res.json()

    # If demo request already has order, it won't show in /requests/my; so create a new one.
    if not my_requests:
        res = client.post(
            "/requests",
            headers=auth_header(tokens["client"]),
            json={
                "destination": "Корея",
                "travel_dates": "2026-06-10",
                "travelers_count": 1,
                "budget": 180000,
                "notes": "",
            },
        )
        assert res.status_code == 200, res.text
        request_id = res.json()["id"]
    else:
        request_id = my_requests[0]["id"]

    # client can open chat (may be empty)
    res = client.get(f"/chat/requests/{request_id}", headers=auth_header(tokens["client"]))
    assert res.status_code == 200, res.text
    assert isinstance(res.json(), list)

    # client sends message
    res = client.post(
        f"/chat/requests/{request_id}",
        headers=auth_header(tokens["client"]),
        json={"text": "Привет! Есть новости по заявке?"},
    )
    assert res.status_code == 201, res.text
    msg = res.json()
    assert msg["request_id"] == request_id
    assert msg["text"] == "Привет! Есть новости по заявке?"
    assert msg["sender_role"] == "client"

