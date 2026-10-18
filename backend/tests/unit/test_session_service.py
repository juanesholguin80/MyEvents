from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.models.enums import EventStatusEnum, RoleEnum
from app.models.event import Event
from app.models.session import Session as SessionModel
from app.models.speaker import Speaker
from app.models.user import User
from app.services import session_service
from app.schemas.session import SessionCreate, SessionUpdate

NOW = datetime.now(timezone.utc)
EVENT_START = NOW + timedelta(days=1)
EVENT_END = NOW + timedelta(days=1, hours=8)


def _user(user_id: int, role: RoleEnum) -> User:
    return User(
        id=user_id, email=f"u{user_id}@test.com", password_hash="x", full_name="T", role=role
    )


def _event(organizer_id: int = 1, capacity: int = 100) -> Event:
    return Event(
        id=1,
        organizer_id=organizer_id,
        name="Evento",
        location="Lugar",
        start_date=EVENT_START,
        end_date=EVENT_END,
        capacity=capacity,
        status=EventStatusEnum.PUBLISHED,
        updated_at=NOW,
    )


def _speaker(speaker_id: int = 1) -> Speaker:
    return Speaker(id=speaker_id, full_name="Ponente", email="p@test.com")


def _session_model(
    session_id: int = 1,
    speaker_id: int = 1,
    start_time: datetime = EVENT_START + timedelta(hours=1),
    end_time: datetime = EVENT_START + timedelta(hours=2),
    capacity: int = 10,
) -> SessionModel:
    return SessionModel(
        id=session_id,
        event_id=1,
        speaker_id=speaker_id,
        title="Charla",
        start_time=start_time,
        end_time=end_time,
        capacity=capacity,
    )


def _valid_create_data(**overrides) -> SessionCreate:
    defaults = dict(
        speaker_id=1,
        title="Charla",
        start_time=EVENT_START + timedelta(hours=1),
        end_time=EVENT_START + timedelta(hours=2),
        capacity=10,
    )
    defaults.update(overrides)
    return SessionCreate(**defaults)


# --- create_session ------------------------------------------------------------


def test_create_session_propagates_event_not_found(monkeypatch):
    session = MagicMock()
    monkeypatch.setattr(
        session_service.event_service,
        "get_event",
        MagicMock(side_effect=session_service.event_service.EventNotFoundError("x")),
    )

    with pytest.raises(session_service.event_service.EventNotFoundError):
        session_service.create_session(
            session, 1, _valid_create_data(), _user(1, RoleEnum.ORGANIZER)
        )


def test_create_session_forbidden_for_non_owner(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    monkeypatch.setattr(session_service.event_service, "get_event", MagicMock(return_value=event))

    with pytest.raises(session_service.EventForbiddenError):
        session_service.create_session(
            session, event.id, _valid_create_data(), _user(2, RoleEnum.ORGANIZER)
        )


def test_create_session_speaker_not_found(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    monkeypatch.setattr(session_service.event_service, "get_event", MagicMock(return_value=event))
    monkeypatch.setattr(session_service.speaker_repo, "get_by_id", MagicMock(return_value=None))

    with pytest.raises(session_service.SpeakerNotFoundError):
        session_service.create_session(
            session, event.id, _valid_create_data(), _user(1, RoleEnum.ORGANIZER)
        )


def _setup_happy_dependencies(monkeypatch, event, speaker=None, conflicts=None):
    monkeypatch.setattr(session_service.event_service, "get_event", MagicMock(return_value=event))
    monkeypatch.setattr(
        session_service.speaker_repo, "get_by_id", MagicMock(return_value=speaker or _speaker())
    )
    monkeypatch.setattr(
        session_service.session_repo,
        "get_overlapping_sessions",
        MagicMock(return_value=conflicts or []),
    )


def test_create_session_start_before_event_start_raises(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    _setup_happy_dependencies(monkeypatch, event)

    data = _valid_create_data(
        start_time=EVENT_START - timedelta(minutes=1), end_time=EVENT_START + timedelta(hours=1)
    )
    with pytest.raises(session_service.InvalidSessionDataError):
        session_service.create_session(session, event.id, data, _user(1, RoleEnum.ORGANIZER))


def test_create_session_end_after_event_end_raises(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    _setup_happy_dependencies(monkeypatch, event)

    data = _valid_create_data(
        start_time=EVENT_END - timedelta(minutes=30), end_time=EVENT_END + timedelta(minutes=1)
    )
    with pytest.raises(session_service.InvalidSessionDataError):
        session_service.create_session(session, event.id, data, _user(1, RoleEnum.ORGANIZER))


def test_create_session_capacity_exceeds_event_capacity_raises(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1, capacity=5)
    _setup_happy_dependencies(monkeypatch, event)

    data = _valid_create_data(capacity=6)
    with pytest.raises(session_service.InvalidSessionDataError):
        session_service.create_session(session, event.id, data, _user(1, RoleEnum.ORGANIZER))


def test_create_session_capacity_equal_to_event_capacity_is_allowed(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1, capacity=5)
    _setup_happy_dependencies(monkeypatch, event)
    monkeypatch.setattr(
        session_service.session_repo, "create", MagicMock(side_effect=lambda s, obj: obj)
    )

    data = _valid_create_data(capacity=5)
    result = session_service.create_session(session, event.id, data, _user(1, RoleEnum.ORGANIZER))
    assert result.capacity == 5


def test_create_session_overlap_raises(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    _setup_happy_dependencies(monkeypatch, event, conflicts=[_session_model()])

    with pytest.raises(session_service.SessionOverlapError):
        session_service.create_session(
            session, event.id, _valid_create_data(), _user(1, RoleEnum.ORGANIZER)
        )


def test_create_session_success_commits(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    _setup_happy_dependencies(monkeypatch, event)
    create_mock = MagicMock(side_effect=lambda s, obj: obj)
    monkeypatch.setattr(session_service.session_repo, "create", create_mock)

    result = session_service.create_session(
        session, event.id, _valid_create_data(), _user(1, RoleEnum.ORGANIZER)
    )

    create_mock.assert_called_once()
    session.commit.assert_called_once()
    assert result.event_id == event.id


# --- update_session ------------------------------------------------------------


def test_update_session_not_found_raises(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    monkeypatch.setattr(session_service.event_service, "get_event", MagicMock(return_value=event))
    monkeypatch.setattr(session_service.session_repo, "get_by_id", MagicMock(return_value=None))

    with pytest.raises(session_service.SessionNotFoundError):
        session_service.update_session(
            session, event.id, 1, SessionUpdate(), _user(1, RoleEnum.ORGANIZER)
        )


def test_update_session_wrong_event_id_raises_not_found(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    other_event_session = _session_model()
    other_event_session.event_id = 999
    monkeypatch.setattr(session_service.event_service, "get_event", MagicMock(return_value=event))
    monkeypatch.setattr(
        session_service.session_repo, "get_by_id", MagicMock(return_value=other_event_session)
    )

    with pytest.raises(session_service.SessionNotFoundError):
        session_service.update_session(
            session, event.id, 1, SessionUpdate(), _user(1, RoleEnum.ORGANIZER)
        )


def test_update_session_invalid_date_range_raises(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    existing = _session_model()
    monkeypatch.setattr(session_service.event_service, "get_event", MagicMock(return_value=event))
    monkeypatch.setattr(session_service.session_repo, "get_by_id", MagicMock(return_value=existing))

    data = SessionUpdate(start_time=existing.end_time, end_time=existing.start_time)
    with pytest.raises(session_service.InvalidSessionDataError):
        session_service.update_session(
            session, event.id, existing.id, data, _user(1, RoleEnum.ORGANIZER)
        )


def test_update_session_excludes_itself_from_overlap_check(monkeypatch):
    """Guarda de regresión: un PUT que no cambia el horario no debe chocar
    consigo mismo (exclude_session_id debe excluir la propia sesión)."""
    session = MagicMock()
    event = _event(organizer_id=1)
    existing = _session_model(session_id=7)
    monkeypatch.setattr(session_service.event_service, "get_event", MagicMock(return_value=event))
    monkeypatch.setattr(session_service.session_repo, "get_by_id", MagicMock(return_value=existing))
    overlap_mock = MagicMock(return_value=[])
    monkeypatch.setattr(session_service.session_repo, "get_overlapping_sessions", overlap_mock)
    monkeypatch.setattr(
        session_service.session_repo, "update", MagicMock(side_effect=lambda s, obj, data: obj)
    )

    session_service.update_session(
        session,
        event.id,
        existing.id,
        SessionUpdate(title="Nuevo título"),
        _user(1, RoleEnum.ORGANIZER),
    )

    assert overlap_mock.call_args.kwargs["exclude_session_id"] == existing.id


def test_update_session_real_conflict_with_other_session_raises(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    existing = _session_model(session_id=7)
    conflicting = _session_model(session_id=8)
    monkeypatch.setattr(session_service.event_service, "get_event", MagicMock(return_value=event))
    monkeypatch.setattr(session_service.session_repo, "get_by_id", MagicMock(return_value=existing))
    monkeypatch.setattr(
        session_service.session_repo,
        "get_overlapping_sessions",
        MagicMock(return_value=[conflicting]),
    )

    with pytest.raises(session_service.SessionOverlapError):
        session_service.update_session(
            session, event.id, existing.id, SessionUpdate(title="x"), _user(1, RoleEnum.ORGANIZER)
        )


# --- delete_session -------------------------------------------------------------


def test_delete_session_forbidden_for_non_owner(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    monkeypatch.setattr(session_service.event_service, "get_event", MagicMock(return_value=event))

    with pytest.raises(session_service.EventForbiddenError):
        session_service.delete_session(session, event.id, 1, _user(2, RoleEnum.ORGANIZER))


def test_delete_session_not_found_raises(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    monkeypatch.setattr(session_service.event_service, "get_event", MagicMock(return_value=event))
    monkeypatch.setattr(session_service.session_repo, "get_by_id", MagicMock(return_value=None))

    with pytest.raises(session_service.SessionNotFoundError):
        session_service.delete_session(session, event.id, 1, _user(1, RoleEnum.ORGANIZER))


def test_delete_session_success_commits(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    existing = _session_model()
    monkeypatch.setattr(session_service.event_service, "get_event", MagicMock(return_value=event))
    monkeypatch.setattr(session_service.session_repo, "get_by_id", MagicMock(return_value=existing))
    delete_mock = MagicMock()
    monkeypatch.setattr(session_service.session_repo, "delete", delete_mock)

    session_service.delete_session(session, event.id, existing.id, _user(1, RoleEnum.ORGANIZER))

    delete_mock.assert_called_once_with(session, existing)
    session.commit.assert_called_once()
