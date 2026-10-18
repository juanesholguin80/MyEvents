from datetime import datetime, timedelta, timezone

from app.models.enums import EventStatusEnum, RoleEnum

NOW = datetime.now(timezone.utc)


def _event_payload(**overrides):
    payload = {
        "name": "Conferencia de prueba",
        "location": "Centro de convenciones",
        "start_date": (NOW + timedelta(days=5)).isoformat(),
        "end_date": (NOW + timedelta(days=5, hours=8)).isoformat(),
        "capacity": 10,
    }
    payload.update(overrides)
    return payload


# --- creación -----------------------------------------------------------------


def test_create_event_as_organizer_returns_draft(client, organizador_user, auth_header):
    response = client.post(
        "/api/v1/events", headers=auth_header(organizador_user), json=_event_payload()
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == EventStatusEnum.DRAFT.value
    assert body["organizer_id"] == organizador_user.id


def test_create_event_as_assistant_returns_403(client, asistente_user, auth_header):
    response = client.post(
        "/api/v1/events", headers=auth_header(asistente_user), json=_event_payload()
    )
    assert response.status_code == 403


def test_create_event_ignores_client_supplied_organizer_and_status(
    client,
    organizador_user,
    auth_header,
):
    response = client.post(
        "/api/v1/events",
        headers=auth_header(organizador_user),
        json=_event_payload(organizer_id=999, status="published"),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["organizer_id"] == organizador_user.id
    assert body["status"] == EventStatusEnum.DRAFT.value


def test_create_event_end_before_start_returns_422(client, organizador_user, auth_header):
    response = client.post(
        "/api/v1/events",
        headers=auth_header(organizador_user),
        json=_event_payload(
            start_date=(NOW + timedelta(days=5)).isoformat(),
            end_date=(NOW + timedelta(days=4)).isoformat(),
        ),
    )
    assert response.status_code == 422


def test_create_event_non_positive_capacity_returns_422(client, organizador_user, auth_header):
    response = client.post(
        "/api/v1/events", headers=auth_header(organizador_user), json=_event_payload(capacity=0)
    )
    assert response.status_code == 422


# --- visibilidad de drafts -------------------------------------------------------


def test_get_draft_event_hidden_from_anonymous_returns_404(client, organizador_user, make_event):
    event = make_event(organizador_user, status=EventStatusEnum.DRAFT)
    response = client.get(f"/api/v1/events/{event.id}")
    assert response.status_code == 404


def test_get_draft_event_hidden_from_other_organizer_returns_404(
    client, organizador_user, make_user, make_event, auth_header
):
    event = make_event(organizador_user, status=EventStatusEnum.DRAFT)
    other_organizer = make_user(role=RoleEnum.ORGANIZER)

    response = client.get(f"/api/v1/events/{event.id}", headers=auth_header(other_organizer))
    assert response.status_code == 404


def test_get_draft_event_visible_to_owner_and_admin(
    client, organizador_user, admin_user, make_event, auth_header
):
    event = make_event(organizador_user, status=EventStatusEnum.DRAFT)

    owner_response = client.get(f"/api/v1/events/{event.id}", headers=auth_header(organizador_user))
    assert owner_response.status_code == 200

    admin_response = client.get(f"/api/v1/events/{event.id}", headers=auth_header(admin_user))
    assert admin_response.status_code == 200


def test_list_events_hides_drafts_from_anonymous_and_other_organizer(
    client, organizador_user, make_user, make_event, auth_header
):
    make_event(organizador_user, status=EventStatusEnum.DRAFT, name="Borrador Oculto")
    other_organizer = make_user(role=RoleEnum.ORGANIZER)

    anon_names = [e["name"] for e in client.get("/api/v1/events").json()["items"]]
    assert "Borrador Oculto" not in anon_names

    other_names = [
        e["name"]
        for e in client.get("/api/v1/events", headers=auth_header(other_organizer)).json()["items"]
    ]
    assert "Borrador Oculto" not in other_names

    owner_names = [
        e["name"]
        for e in client.get("/api/v1/events", headers=auth_header(organizador_user)).json()["items"]
    ]
    assert "Borrador Oculto" in owner_names


# --- update / ownership ---------------------------------------------------------


def test_update_event_forbidden_for_non_owner(
    client,
    organizador_user,
    make_user,
    make_event,
    auth_header,
):
    event = make_event(organizador_user, status=EventStatusEnum.PUBLISHED)
    other_organizer = make_user(role=RoleEnum.ORGANIZER)

    response = client.put(
        f"/api/v1/events/{event.id}",
        headers=auth_header(other_organizer),
        json={"name": "Hackeado"},
    )
    assert response.status_code == 403


def test_update_event_owner_succeeds(client, organizador_user, make_event, auth_header):
    event = make_event(organizador_user, status=EventStatusEnum.PUBLISHED)

    response = client.put(
        f"/api/v1/events/{event.id}",
        headers=auth_header(organizador_user),
        json={"name": "Nuevo nombre"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Nuevo nombre"


def test_update_event_admin_can_edit_others_event(
    client,
    organizador_user,
    admin_user,
    make_event,
    auth_header,
):
    event = make_event(organizador_user, status=EventStatusEnum.PUBLISHED)

    response = client.put(
        f"/api/v1/events/{event.id}",
        headers=auth_header(admin_user),
        json={"name": "Editado por admin"},
    )
    assert response.status_code == 200


def test_update_terminal_event_returns_409(client, organizador_user, make_event, auth_header):
    event = make_event(organizador_user, status=EventStatusEnum.CANCELLED)

    response = client.put(
        f"/api/v1/events/{event.id}", headers=auth_header(organizador_user), json={"name": "x"}
    )
    assert response.status_code == 409


def test_update_event_partial_invalid_date_range_returns_422(
    client,
    organizador_user,
    make_event,
    auth_header,
):
    event = make_event(
        organizador_user,
        status=EventStatusEnum.PUBLISHED,
        start_date=NOW + timedelta(days=5),
        end_date=NOW + timedelta(days=6),
    )

    response = client.put(
        f"/api/v1/events/{event.id}",
        headers=auth_header(organizador_user),
        json={"end_date": (NOW + timedelta(days=4)).isoformat()},
    )
    assert response.status_code == 422


# --- delete ----------------------------------------------------------------------


def test_delete_event_forbidden_for_non_owner(
    client,
    organizador_user,
    make_user,
    make_event,
    auth_header,
):
    event = make_event(organizador_user, status=EventStatusEnum.DRAFT)
    other_organizer = make_user(role=RoleEnum.ORGANIZER)

    response = client.delete(f"/api/v1/events/{event.id}", headers=auth_header(other_organizer))
    assert response.status_code == 403


def test_delete_event_owner_succeeds(client, organizador_user, make_event, auth_header):
    event = make_event(organizador_user, status=EventStatusEnum.DRAFT)

    response = client.delete(f"/api/v1/events/{event.id}", headers=auth_header(organizador_user))
    assert response.status_code == 204


# --- máquina de estados ----------------------------------------------------------


def test_publish_then_cancel_leaves_status_cancelled_not_published(
    client,
    organizador_user,
    make_event,
    auth_header,
):
    """Guarda de regresión del bug de copy-paste de Fase 3."""
    event = make_event(organizador_user, status=EventStatusEnum.DRAFT)
    headers = auth_header(organizador_user)

    publish = client.patch(f"/api/v1/events/{event.id}/publish", headers=headers)
    assert publish.status_code == 200
    assert publish.json()["status"] == EventStatusEnum.PUBLISHED.value

    cancel = client.patch(f"/api/v1/events/{event.id}/cancel", headers=headers)
    assert cancel.status_code == 200
    assert cancel.json()["status"] == EventStatusEnum.CANCELLED.value


def test_publish_twice_returns_409(client, organizador_user, make_event, auth_header):
    event = make_event(organizador_user, status=EventStatusEnum.PUBLISHED)

    response = client.patch(
        f"/api/v1/events/{event.id}/publish", headers=auth_header(organizador_user)
    )
    assert response.status_code == 409


def test_finish_directly_from_draft_returns_409(client, organizador_user, make_event, auth_header):
    event = make_event(organizador_user, status=EventStatusEnum.DRAFT)

    response = client.patch(
        f"/api/v1/events/{event.id}/finish", headers=auth_header(organizador_user)
    )
    assert response.status_code == 409


# --- búsqueda ----------------------------------------------------------------------


def test_search_events_by_name_substring_case_insensitive(client, organizador_user, make_event):
    make_event(organizador_user, status=EventStatusEnum.PUBLISHED, name="PyConf Colombia")

    response = client.get("/api/v1/events", params={"name": "pyconf"})
    names = [e["name"] for e in response.json()["items"]]
    assert "PyConf Colombia" in names


def test_search_events_by_status_excludes_others(client, organizador_user, make_event):
    make_event(organizador_user, status=EventStatusEnum.PUBLISHED, name="Publicado")
    make_event(organizador_user, status=EventStatusEnum.FINISHED, name="Finalizado")

    response = client.get("/api/v1/events", params={"status": "published"})
    names = [e["name"] for e in response.json()["items"]]
    assert "Publicado" in names
    assert "Finalizado" not in names


def test_search_events_by_date_range(client, organizador_user, make_event):
    make_event(
        organizador_user,
        status=EventStatusEnum.PUBLISHED,
        name="Evento en rango",
        start_date=NOW + timedelta(days=10),
        end_date=NOW + timedelta(days=10, hours=2),
    )

    in_range = client.get(
        "/api/v1/events",
        params={
            "date_from": (NOW + timedelta(days=9)).isoformat(),
            "date_to": (NOW + timedelta(days=11)).isoformat(),
        },
    )
    assert "Evento en rango" in [e["name"] for e in in_range.json()["items"]]

    out_of_range = client.get(
        "/api/v1/events",
        params={
            "date_from": (NOW + timedelta(days=100)).isoformat(),
            "date_to": (NOW + timedelta(days=200)).isoformat(),
        },
    )
    assert "Evento en rango" not in [e["name"] for e in out_of_range.json()["items"]]


def test_admin_search_sees_other_organizers_drafts(
    client,
    organizador_user,
    admin_user,
    make_event,
    auth_header,
):
    make_event(organizador_user, status=EventStatusEnum.DRAFT, name="Borrador de otro organizador")

    response = client.get("/api/v1/events", headers=auth_header(admin_user))
    names = [e["name"] for e in response.json()["items"]]
    assert "Borrador de otro organizador" in names


def test_create_event_with_naive_datetime_is_accepted_as_utc(client, organizador_user, auth_header):
    """Guarda de regresión del bug de Fase 7: un datetime sin offset de zona
    horaria rompía la comparación con valores aware de la BD con un 500 no
    manejado. El fix asume UTC cuando no hay offset."""
    response = client.post(
        "/api/v1/events",
        headers=auth_header(organizador_user),
        json=_event_payload(
            start_date="2030-06-01T09:00:00",
            end_date="2030-06-01T18:00:00",
        ),
    )
    assert response.status_code == 201
    assert response.json()["start_date"].endswith("Z") or "+00:00" in response.json()["start_date"]


# --- paginación ----------------------------------------------------------------------


def test_pagination_total_is_consistent_and_pages_do_not_overlap(
    client,
    organizador_user,
    make_event,
):
    for i in range(5):
        make_event(organizador_user, status=EventStatusEnum.PUBLISHED, name=f"Evento paginado {i}")

    small_page = client.get("/api/v1/events", params={"page_size": 2}).json()
    big_page = client.get("/api/v1/events", params={"page_size": 100}).json()
    assert small_page["total"] == big_page["total"]

    page1 = client.get("/api/v1/events", params={"page": 1, "page_size": 2}).json()
    page2 = client.get("/api/v1/events", params={"page": 2, "page_size": 2}).json()
    ids_page1 = {e["id"] for e in page1["items"]}
    ids_page2 = {e["id"] for e in page2["items"]}
    assert ids_page1.isdisjoint(ids_page2)


def test_pagination_rejects_invalid_page_params(client):
    assert client.get("/api/v1/events", params={"page_size": 0}).status_code == 422
    assert client.get("/api/v1/events", params={"page_size": 500}).status_code == 422
    assert client.get("/api/v1/events", params={"page": 0}).status_code == 422
