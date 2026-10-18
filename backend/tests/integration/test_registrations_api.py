from app.models.enums import EventStatusEnum, RoleEnum


def test_register_happy_path_appears_in_my_registrations(
    client,
    organizador_user,
    asistente_user,
    make_event,
    auth_header,
):
    event = make_event(organizador_user, status=EventStatusEnum.PUBLISHED, capacity=10)

    register = client.post(
        f"/api/v1/events/{event.id}/register", headers=auth_header(asistente_user)
    )
    assert register.status_code == 201
    assert register.json()["status"] == "confirmed"

    mine = client.get("/api/v1/me/registrations", headers=auth_header(asistente_user))
    assert mine.status_code == 200
    event_ids = [r["event"]["id"] for r in mine.json()["items"]]
    assert event.id in event_ids


def test_register_to_draft_event_returns_403(
    client,
    organizador_user,
    asistente_user,
    make_event,
    auth_header,
):
    event = make_event(organizador_user, status=EventStatusEnum.DRAFT)

    response = client.post(
        f"/api/v1/events/{event.id}/register", headers=auth_header(asistente_user)
    )
    assert response.status_code == 403
    assert response.json()["code"] == "EVENT_NOT_PUBLISHED"


def test_register_to_nonexistent_event_returns_404(client, asistente_user, auth_header):
    response = client.post("/api/v1/events/999999/register", headers=auth_header(asistente_user))
    assert response.status_code == 404


def test_register_duplicate_returns_409(
    client,
    organizador_user,
    asistente_user,
    make_event,
    auth_header,
):
    event = make_event(organizador_user, status=EventStatusEnum.PUBLISHED, capacity=10)
    headers = auth_header(asistente_user)

    first = client.post(f"/api/v1/events/{event.id}/register", headers=headers)
    assert first.status_code == 201

    second = client.post(f"/api/v1/events/{event.id}/register", headers=headers)
    assert second.status_code == 409
    assert second.json()["code"] == "ALREADY_REGISTERED"


def test_register_without_capacity_returns_400(
    client,
    organizador_user,
    make_user,
    make_event,
    auth_header,
):
    event = make_event(organizador_user, status=EventStatusEnum.PUBLISHED, capacity=1)
    first_assistant = make_user(role=RoleEnum.ASSISTANT)
    second_assistant = make_user(role=RoleEnum.ASSISTANT)

    first = client.post(f"/api/v1/events/{event.id}/register", headers=auth_header(first_assistant))
    assert first.status_code == 201

    second = client.post(
        f"/api/v1/events/{event.id}/register", headers=auth_header(second_assistant)
    )
    assert second.status_code == 400
    assert second.json()["code"] == "EVENT_FULL"


def test_cancel_registration_succeeds(
    client,
    organizador_user,
    asistente_user,
    make_event,
    auth_header,
):
    event = make_event(organizador_user, status=EventStatusEnum.PUBLISHED, capacity=10)
    headers = auth_header(asistente_user)
    client.post(f"/api/v1/events/{event.id}/register", headers=headers)

    response = client.delete(f"/api/v1/events/{event.id}/register", headers=headers)
    assert response.status_code == 204


def test_cancel_registration_twice_returns_404(
    client,
    organizador_user,
    asistente_user,
    make_event,
    auth_header,
):
    event = make_event(organizador_user, status=EventStatusEnum.PUBLISHED, capacity=10)
    headers = auth_header(asistente_user)
    client.post(f"/api/v1/events/{event.id}/register", headers=headers)
    client.delete(f"/api/v1/events/{event.id}/register", headers=headers)

    response = client.delete(f"/api/v1/events/{event.id}/register", headers=headers)
    assert response.status_code == 404
    assert response.json()["code"] == "REGISTRATION_NOT_FOUND"


def test_cancel_then_reregister_reuses_same_row(
    client,
    organizador_user,
    asistente_user,
    make_event,
    auth_header,
):
    event = make_event(organizador_user, status=EventStatusEnum.PUBLISHED, capacity=10)
    headers = auth_header(asistente_user)

    first = client.post(f"/api/v1/events/{event.id}/register", headers=headers).json()
    client.delete(f"/api/v1/events/{event.id}/register", headers=headers)
    second = client.post(f"/api/v1/events/{event.id}/register", headers=headers).json()

    assert second["id"] == first["id"]
    assert second["status"] == "confirmed"


def test_get_my_registrations_requires_authentication(client):
    response = client.get("/api/v1/me/registrations")
    assert response.status_code == 401
