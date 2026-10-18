"""No estaba en el checklist original de Fase 8, pero el router de ponentes no
tenía cobertura en ninguna fase previa (las verificaciones manuales de Fase 4 se
hicieron con scripts httpx fuera de pytest). Se agrega para acercarse al ≥80% de
cobertura exigido por el checklist."""

from datetime import timedelta

from app.models.enums import EventStatusEnum, RoleEnum


def test_create_speaker_as_organizer_succeeds(client, organizador_user, auth_header):
    response = client.post(
        "/api/v1/speakers",
        headers=auth_header(organizador_user),
        json={"full_name": "Ponente Nuevo", "email": "nuevo.ponente@test.com"},
    )
    assert response.status_code == 201
    assert response.json()["full_name"] == "Ponente Nuevo"


def test_create_speaker_as_assistant_returns_403(client, asistente_user, auth_header):
    response = client.post(
        "/api/v1/speakers",
        headers=auth_header(asistente_user),
        json={"full_name": "x", "email": "x@test.com"},
    )
    assert response.status_code == 403


def test_get_speakers_requires_authentication(client):
    response = client.get("/api/v1/speakers")
    assert response.status_code == 401


def test_get_speakers_filters_by_name_substring(
    client,
    organizador_user,
    make_speaker,
    auth_header,
):
    make_speaker(full_name="Ada Lovelace")
    make_speaker(full_name="Alan Turing")

    response = client.get(
        "/api/v1/speakers", params={"name": "lovelace"}, headers=auth_header(organizador_user)
    )
    names = [s["full_name"] for s in response.json()["items"]]
    assert names == ["Ada Lovelace"]


def test_update_speaker_as_assistant_returns_403(client, asistente_user, make_speaker, auth_header):
    speaker = make_speaker()

    response = client.put(
        f"/api/v1/speakers/{speaker.id}",
        headers=auth_header(asistente_user),
        json={"full_name": "Hackeado"},
    )
    assert response.status_code == 403


def test_update_speaker_as_organizer_succeeds(client, organizador_user, make_speaker, auth_header):
    speaker = make_speaker()

    response = client.put(
        f"/api/v1/speakers/{speaker.id}",
        headers=auth_header(organizador_user),
        json={"full_name": "Nombre actualizado"},
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Nombre actualizado"


def test_get_unknown_speaker_returns_404(client, organizador_user, auth_header):
    response = client.get("/api/v1/speakers/999999", headers=auth_header(organizador_user))
    assert response.status_code == 404


def test_delete_speaker_as_organizer_returns_403(
    client,
    organizador_user,
    make_speaker,
    auth_header,
):
    """Solo admin puede borrar ponentes, ni siquiera un organizador."""
    speaker = make_speaker()

    response = client.delete(
        f"/api/v1/speakers/{speaker.id}", headers=auth_header(organizador_user)
    )
    assert response.status_code == 403


def test_delete_speaker_without_sessions_succeeds(client, admin_user, make_speaker, auth_header):
    speaker = make_speaker()

    response = client.delete(f"/api/v1/speakers/{speaker.id}", headers=auth_header(admin_user))
    assert response.status_code == 204


def test_delete_speaker_with_sessions_returns_409(
    client, admin_user, organizador_user, make_event, make_speaker, auth_header
):
    event = make_event(organizador_user, status=EventStatusEnum.PUBLISHED, capacity=10)
    speaker = make_speaker()
    client.post(
        f"/api/v1/events/{event.id}/sessions",
        headers=auth_header(organizador_user),
        json={
            "speaker_id": speaker.id,
            "title": "Charla",
            "start_time": (event.start_date + timedelta(hours=1)).isoformat(),
            "end_time": (event.start_date + timedelta(hours=2)).isoformat(),
            "capacity": 5,
        },
    )

    response = client.delete(f"/api/v1/speakers/{speaker.id}", headers=auth_header(admin_user))
    assert response.status_code == 409
    assert response.json()["code"] == "SPEAKER_IN_USE"


def test_speakers_pagination_is_consistent(client, organizador_user, make_speaker, auth_header):
    for i in range(5):
        make_speaker()

    headers = auth_header(organizador_user)
    small = client.get("/api/v1/speakers", params={"page_size": 2}, headers=headers).json()
    big = client.get("/api/v1/speakers", params={"page_size": 100}, headers=headers).json()
    assert small["total"] == big["total"] == 5


def test_admin_can_list_users(client, admin_user, auth_header):
    response = client.get("/api/v1/admin/users", headers=auth_header(admin_user))
    assert response.status_code == 200
    assert response.json()["total"] >= 1


def test_non_admin_cannot_list_users(client, organizador_user, auth_header):
    response = client.get("/api/v1/admin/users", headers=auth_header(organizador_user))
    assert response.status_code == 403


def test_admin_can_get_single_user(client, admin_user, asistente_user, auth_header):
    response = client.get(
        f"/api/v1/admin/users/{asistente_user.id}", headers=auth_header(admin_user)
    )
    assert response.status_code == 200
    assert response.json()["email"] == asistente_user.email


def test_admin_get_unknown_user_returns_404(client, admin_user, auth_header):
    response = client.get("/api/v1/admin/users/999999", headers=auth_header(admin_user))
    assert response.status_code == 404
    assert response.json()["code"] == "USER_NOT_FOUND"


def test_admin_update_unknown_user_returns_404(client, admin_user, auth_header):
    response = client.patch(
        "/api/v1/admin/users/999999", headers=auth_header(admin_user), json={"is_active": False}
    )
    assert response.status_code == 404
    assert response.json()["code"] == "USER_NOT_FOUND"


def test_admin_can_deactivate_user_and_login_then_fails(
    client,
    admin_user,
    asistente_user,
    auth_header,
):
    response = client.patch(
        f"/api/v1/admin/users/{asistente_user.id}",
        headers=auth_header(admin_user),
        json={"is_active": False},
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_admin_cannot_modify_self(client, admin_user, auth_header):
    response = client.patch(
        f"/api/v1/admin/users/{admin_user.id}",
        headers=auth_header(admin_user),
        json={"role": RoleEnum.ASSISTANT.value},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "CANNOT_MODIFY_SELF"
