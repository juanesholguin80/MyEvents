from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.models.enums import EventStatusEnum, RegistrationStatusEnum, RoleEnum
from app.models.event import Event
from app.models.registration import Registration
from app.models.user import User
from app.services import registration_service

repo = registration_service.registration_repo

NOW = datetime.now(timezone.utc)


def _user(user_id: int = 1) -> User:
    return User(
        id=user_id, email="u@test.com", password_hash="x", full_name="T", role=RoleEnum.ASSISTANT
    )


def _event(
    event_id: int = 1,
    status: EventStatusEnum = EventStatusEnum.PUBLISHED,
    capacity: int = 10,
) -> Event:
    return Event(
        id=event_id,
        organizer_id=99,
        name="Evento",
        location="Lugar",
        start_date=NOW + timedelta(days=1),
        end_date=NOW + timedelta(days=1, hours=8),
        capacity=capacity,
        status=status,
        updated_at=NOW,
    )


def _registration(
    status: RegistrationStatusEnum = RegistrationStatusEnum.CONFIRMED,
) -> Registration:
    return Registration(id=1, user_id=1, event_id=1, status=status, registered_at=NOW)


# --- register_to_event ----------------------------------------------------------


def test_register_event_not_found_raises(monkeypatch):
    session = MagicMock()
    monkeypatch.setattr(repo, "lock_event_for_update", MagicMock(return_value=None))

    with pytest.raises(registration_service.EventNotFoundError):
        registration_service.register_to_event(session, 1, _user())


def test_register_event_not_published_raises(monkeypatch):
    session = MagicMock()
    event = _event(status=EventStatusEnum.DRAFT)
    monkeypatch.setattr(repo, "lock_event_for_update", MagicMock(return_value=event))

    with pytest.raises(registration_service.EventNotPublishedError):
        registration_service.register_to_event(session, event.id, _user())


def test_register_already_confirmed_raises(monkeypatch):
    session = MagicMock()
    event = _event()
    existing = _registration(status=RegistrationStatusEnum.CONFIRMED)
    monkeypatch.setattr(repo, "lock_event_for_update", MagicMock(return_value=event))
    monkeypatch.setattr(
        repo,
        "get_by_user_and_event",
        MagicMock(return_value=existing),
    )

    with pytest.raises(registration_service.AlreadyRegisteredError):
        registration_service.register_to_event(session, event.id, _user())


def test_register_event_full_raises(monkeypatch):
    session = MagicMock()
    event = _event(capacity=1)
    monkeypatch.setattr(repo, "lock_event_for_update", MagicMock(return_value=event))
    monkeypatch.setattr(repo, "get_by_user_and_event", MagicMock(return_value=None))
    monkeypatch.setattr(repo, "count_confirmed_by_event", MagicMock(return_value=1))

    with pytest.raises(registration_service.EventFullError):
        registration_service.register_to_event(session, event.id, _user())


def test_register_reactivates_cancelled_registration(monkeypatch):
    session = MagicMock()
    event = _event(capacity=10)
    cancelled = _registration(status=RegistrationStatusEnum.CANCELLED)
    monkeypatch.setattr(repo, "lock_event_for_update", MagicMock(return_value=event))
    monkeypatch.setattr(
        repo,
        "get_by_user_and_event",
        MagicMock(return_value=cancelled),
    )
    monkeypatch.setattr(repo, "count_confirmed_by_event", MagicMock(return_value=0))
    update_mock = MagicMock(side_effect=lambda s, reg, data: reg)
    create_mock = MagicMock()
    monkeypatch.setattr(repo, "update", update_mock)
    monkeypatch.setattr(repo, "create", create_mock)

    registration_service.register_to_event(session, event.id, _user())

    update_mock.assert_called_once()
    create_mock.assert_not_called()
    assert update_mock.call_args[0][2]["status"] == RegistrationStatusEnum.CONFIRMED


def test_register_creates_new_registration_when_none_exists(monkeypatch):
    session = MagicMock()
    event = _event(capacity=10)
    monkeypatch.setattr(repo, "lock_event_for_update", MagicMock(return_value=event))
    monkeypatch.setattr(repo, "get_by_user_and_event", MagicMock(return_value=None))
    monkeypatch.setattr(repo, "count_confirmed_by_event", MagicMock(return_value=0))
    create_mock = MagicMock(side_effect=lambda s, reg: reg)
    update_mock = MagicMock()
    monkeypatch.setattr(repo, "create", create_mock)
    monkeypatch.setattr(repo, "update", update_mock)

    result = registration_service.register_to_event(session, event.id, _user(1))

    create_mock.assert_called_once()
    update_mock.assert_not_called()
    assert result.user_id == 1
    assert result.event_id == event.id
    assert result.status == RegistrationStatusEnum.CONFIRMED


# --- cancel_registration ----------------------------------------------------------


def test_cancel_registration_not_found_raises(monkeypatch):
    session = MagicMock()
    monkeypatch.setattr(repo, "get_by_user_and_event", MagicMock(return_value=None))

    with pytest.raises(registration_service.RegistrationNotFoundError):
        registration_service.cancel_registration(session, 1, _user())


def test_cancel_registration_already_cancelled_raises(monkeypatch):
    session = MagicMock()
    cancelled = _registration(status=RegistrationStatusEnum.CANCELLED)
    monkeypatch.setattr(repo, "get_by_user_and_event", MagicMock(return_value=cancelled))

    with pytest.raises(registration_service.RegistrationNotFoundError):
        registration_service.cancel_registration(session, 1, _user())


def test_cancel_registration_success_sets_cancelled(monkeypatch):
    session = MagicMock()
    confirmed = _registration(status=RegistrationStatusEnum.CONFIRMED)
    monkeypatch.setattr(repo, "get_by_user_and_event", MagicMock(return_value=confirmed))
    update_mock = MagicMock()
    monkeypatch.setattr(repo, "update", update_mock)

    registration_service.cancel_registration(session, 1, _user())

    update_mock.assert_called_once_with(
        session, confirmed, {"status": RegistrationStatusEnum.CANCELLED}
    )
    session.commit.assert_called_once()


# --- list_my_registrations ----------------------------------------------------------


def test_list_my_registrations_computes_offset(monkeypatch):
    session = MagicMock()
    monkeypatch.setattr(repo, "list_by_user", MagicMock(return_value=[]))
    monkeypatch.setattr(repo, "count_by_user", MagicMock(return_value=0))
    list_mock = repo.list_by_user

    registration_service.list_my_registrations(session, _user(), page=3, page_size=4)

    _, _, limit, offset = list_mock.call_args[0]
    assert limit == 4
    assert offset == 8
