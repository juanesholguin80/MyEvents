from datetime import datetime, timedelta, timezone

from app.models.enums import EventStatusEnum, RoleEnum

NOW = datetime.now(timezone.utc)


def _published_event(make_event, organizer, capacity=50):
    return make_event(
        organizer,
        status=EventStatusEnum.PUBLISHED,
        capacity=capacity,
        start_date=NOW + timedelta(days=5),
        end_date=NOW + timedelta(days=5, hours=8),
    )


def _session_payload(speaker_id, start_time, end_time, capacity=10):
    return {
        "speaker_id": speaker_id,
        "title": "Charla de prueba",
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "capacity": capacity,
    }


def _sessions_url(event_id, suffix=""):
    return f"/api/v1/events/{event_id}/sessions{suffix}"


# --- creación: ownership y validaciones de negocio ------------------------------


def test_create_session_nonexistent_event_returns_404(
    client,
    organizador_user,
    make_speaker,
    auth_header,
):
    speaker = make_speaker()
    response = client.post(
        _sessions_url(999999),
        headers=auth_header(organizador_user),
        json=_session_payload(
            speaker.id, NOW + timedelta(days=5, hours=1), NOW + timedelta(days=5, hours=2)
        ),
    )
    assert response.status_code == 404


def test_create_session_forbidden_for_non_owner(
    client,
    organizador_user,
    make_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()
    other_organizer = make_user(role=RoleEnum.ORGANIZER)

    response = client.post(
        _sessions_url(event.id),
        headers=auth_header(other_organizer),
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=1), event.start_date + timedelta(hours=2)
        ),
    )
    assert response.status_code == 403


def test_create_session_unknown_speaker_returns_404(
    client,
    organizador_user,
    make_event,
    auth_header,
):
    event = _published_event(make_event, organizador_user)

    response = client.post(
        _sessions_url(event.id),
        headers=auth_header(organizador_user),
        json=_session_payload(
            999999, event.start_date + timedelta(hours=1), event.start_date + timedelta(hours=2)
        ),
    )
    assert response.status_code == 404


def test_create_session_before_event_start_returns_422(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()

    response = client.post(
        _sessions_url(event.id),
        headers=auth_header(organizador_user),
        json=_session_payload(
            speaker.id,
            event.start_date - timedelta(minutes=1),
            event.start_date + timedelta(hours=1),
        ),
    )
    assert response.status_code == 422


def test_create_session_after_event_end_returns_422(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()

    response = client.post(
        _sessions_url(event.id),
        headers=auth_header(organizador_user),
        json=_session_payload(
            speaker.id,
            event.end_date - timedelta(minutes=30),
            event.end_date + timedelta(minutes=1),
        ),
    )
    assert response.status_code == 422


def test_create_session_end_before_start_returns_422(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()

    response = client.post(
        _sessions_url(event.id),
        headers=auth_header(organizador_user),
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=2), event.start_date + timedelta(hours=1)
        ),
    )
    assert response.status_code == 422


def test_create_session_capacity_exceeds_event_capacity_returns_422(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user, capacity=5)
    speaker = make_speaker()

    response = client.post(
        _sessions_url(event.id),
        headers=auth_header(organizador_user),
        json=_session_payload(
            speaker.id,
            event.start_date + timedelta(hours=1),
            event.start_date + timedelta(hours=2),
            capacity=6,
        ),
    )
    assert response.status_code == 422


def test_create_session_capacity_equal_to_event_capacity_returns_201(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user, capacity=5)
    speaker = make_speaker()

    response = client.post(
        _sessions_url(event.id),
        headers=auth_header(organizador_user),
        json=_session_payload(
            speaker.id,
            event.start_date + timedelta(hours=1),
            event.start_date + timedelta(hours=2),
            capacity=5,
        ),
    )
    assert response.status_code == 201


# --- solapamiento de ponente (global, no por evento) ----------------------------


def test_speaker_overlap_within_same_event_returns_422(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()
    headers = auth_header(organizador_user)

    first = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=1), event.start_date + timedelta(hours=2)
        ),
    )
    assert first.status_code == 201

    overlapping = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id,
            event.start_date + timedelta(hours=1, minutes=30),
            event.start_date + timedelta(hours=2, minutes=30),
        ),
    )
    assert overlapping.status_code == 422


def test_speaker_overlap_across_different_events_returns_422(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    """El solapamiento de ponente es global, no por evento."""
    event_a = _published_event(make_event, organizador_user)
    event_b = _published_event(make_event, organizador_user)
    speaker = make_speaker()
    headers = auth_header(organizador_user)

    first = client.post(
        _sessions_url(event_a.id),
        headers=headers,
        json=_session_payload(
            speaker.id,
            event_a.start_date + timedelta(hours=1),
            event_a.start_date + timedelta(hours=2),
        ),
    )
    assert first.status_code == 201

    same_speaker_other_event = client.post(
        _sessions_url(event_b.id),
        headers=headers,
        json=_session_payload(
            speaker.id,
            event_a.start_date + timedelta(hours=1, minutes=30),
            event_a.start_date + timedelta(hours=2, minutes=30),
        ),
    )
    assert same_speaker_other_event.status_code == 422


def test_back_to_back_sessions_are_not_overlapping(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()
    headers = auth_header(organizador_user)

    first = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=1), event.start_date + timedelta(hours=2)
        ),
    )
    assert first.status_code == 201

    back_to_back = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=2), event.start_date + timedelta(hours=3)
        ),
    )
    assert back_to_back.status_code == 201


# --- update: sin falso autosolapamiento, re-validación de capacidad -------------


def test_update_session_without_time_change_does_not_self_conflict(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()
    headers = auth_header(organizador_user)

    created = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=1), event.start_date + timedelta(hours=2)
        ),
    ).json()

    response = client.put(
        _sessions_url(event.id, f"/{created['id']}"),
        headers=headers,
        json={"title": "Título actualizado"},
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Título actualizado"


def test_update_session_into_real_conflict_returns_422(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()
    headers = auth_header(organizador_user)

    session_a = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=1), event.start_date + timedelta(hours=2)
        ),
    ).json()
    session_b = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=3), event.start_date + timedelta(hours=4)
        ),
    ).json()

    response = client.put(
        _sessions_url(event.id, f"/{session_b['id']}"),
        headers=headers,
        json={
            "start_time": (event.start_date + timedelta(hours=1, minutes=30)).isoformat(),
            "end_time": (event.start_date + timedelta(hours=2, minutes=30)).isoformat(),
        },
    )
    assert response.status_code == 422
    assert session_a["id"] != session_b["id"]


def test_update_session_capacity_exceeding_event_capacity_returns_422(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user, capacity=5)
    speaker = make_speaker()
    headers = auth_header(organizador_user)

    created = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id,
            event.start_date + timedelta(hours=1),
            event.start_date + timedelta(hours=2),
            capacity=5,
        ),
    ).json()

    response = client.put(
        _sessions_url(event.id, f"/{created['id']}"), headers=headers, json={"capacity": 6}
    )
    assert response.status_code == 422


def test_update_session_forbidden_for_non_owner(
    client,
    organizador_user,
    make_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()
    created = client.post(
        _sessions_url(event.id),
        headers=auth_header(organizador_user),
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=1), event.start_date + timedelta(hours=2)
        ),
    ).json()

    other_organizer = make_user(role=RoleEnum.ORGANIZER)
    response = client.put(
        _sessions_url(event.id, f"/{created['id']}"),
        headers=auth_header(other_organizer),
        json={"title": "Hackeado"},
    )
    assert response.status_code == 403


def test_update_session_speaker_to_unknown_speaker_returns_404(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()
    headers = auth_header(organizador_user)
    created = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=1), event.start_date + timedelta(hours=2)
        ),
    ).json()

    response = client.put(
        _sessions_url(event.id, f"/{created['id']}"), headers=headers, json={"speaker_id": 999999}
    )
    assert response.status_code == 404
    assert response.json()["code"] == "SPEAKER_NOT_FOUND"


def test_update_session_speaker_to_valid_speaker_succeeds(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker_a = make_speaker()
    speaker_b = make_speaker()
    headers = auth_header(organizador_user)
    created = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker_a.id,
            event.start_date + timedelta(hours=1),
            event.start_date + timedelta(hours=2),
        ),
    ).json()

    response = client.put(
        _sessions_url(event.id, f"/{created['id']}"),
        headers=headers,
        json={"speaker_id": speaker_b.id},
    )
    assert response.status_code == 200
    assert response.json()["speaker_id"] == speaker_b.id


def test_update_session_outside_event_range_returns_422(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()
    headers = auth_header(organizador_user)
    created = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=1), event.start_date + timedelta(hours=2)
        ),
    ).json()

    response = client.put(
        _sessions_url(event.id, f"/{created['id']}"),
        headers=headers,
        json={"end_time": (event.end_date + timedelta(hours=1)).isoformat()},
    )
    assert response.status_code == 422


def test_delete_session_succeeds(client, organizador_user, make_event, make_speaker, auth_header):
    event = _published_event(make_event, organizador_user)
    speaker = make_speaker()
    headers = auth_header(organizador_user)
    created = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=1), event.start_date + timedelta(hours=2)
        ),
    ).json()

    response = client.delete(_sessions_url(event.id, f"/{created['id']}"), headers=headers)
    assert response.status_code == 204
    still_there = client.get(_sessions_url(event.id, f"/{created['id']}"), headers=headers)
    assert still_there.status_code == 404


# --- anidación evento/sesión -------------------------------------------------------


def test_session_mismatched_event_id_returns_404_on_get_put_delete(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    other_event = _published_event(make_event, organizador_user)
    speaker = make_speaker()
    headers = auth_header(organizador_user)

    created = client.post(
        _sessions_url(event.id),
        headers=headers,
        json=_session_payload(
            speaker.id, event.start_date + timedelta(hours=1), event.start_date + timedelta(hours=2)
        ),
    ).json()
    wrong_url = _sessions_url(other_event.id, f"/{created['id']}")

    assert client.get(wrong_url, headers=headers).status_code == 404
    assert client.put(wrong_url, headers=headers, json={"title": "x"}).status_code == 404
    assert client.delete(wrong_url, headers=headers).status_code == 404

    still_there = client.get(_sessions_url(event.id, f"/{created['id']}"), headers=headers)
    assert still_there.status_code == 200


# --- visibilidad heredada de evento draft ---------------------------------------


def test_sessions_of_draft_event_are_hidden_from_anonymous_and_other_organizer(
    client, organizador_user, make_user, make_event, auth_header
):
    event = make_event(organizador_user, status=EventStatusEnum.DRAFT)

    anon = client.get(_sessions_url(event.id))
    assert anon.status_code == 404

    other_organizer = make_user(role=RoleEnum.ORGANIZER)
    other = client.get(_sessions_url(event.id), headers=auth_header(other_organizer))
    assert other.status_code == 404

    owner = client.get(_sessions_url(event.id), headers=auth_header(organizador_user))
    assert owner.status_code == 200


# --- paginación ----------------------------------------------------------------------


def test_sessions_pagination_is_consistent(
    client,
    organizador_user,
    make_event,
    make_speaker,
    auth_header,
):
    event = _published_event(make_event, organizador_user)
    headers = auth_header(organizador_user)
    for i in range(5):
        speaker = make_speaker()
        client.post(
            _sessions_url(event.id),
            headers=headers,
            json=_session_payload(
                speaker.id,
                event.start_date + timedelta(hours=i + 1),
                event.start_date + timedelta(hours=i + 2),
            ),
        )

    small = client.get(_sessions_url(event.id), params={"page_size": 2}).json()
    big = client.get(_sessions_url(event.id), params={"page_size": 100}).json()
    assert small["total"] == big["total"] == 5
