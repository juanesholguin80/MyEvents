from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from app.models.enums import EventStatusEnum, RoleEnum
from app.models.event import Event
from app.models.user import User
from app.services import event_service
from app.schemas.event import EventCreate, EventUpdate

NOW = datetime.now(timezone.utc)


def _user(user_id: int, role: RoleEnum) -> User:
    return User(
        id=user_id,
        email=f"u{user_id}@test.com",
        password_hash="x",
        full_name="Test",
        role=role,
    )


def _event(
    event_id: int = 1,
    organizer_id: int = 1,
    status: EventStatusEnum = EventStatusEnum.DRAFT,
    start_date: datetime = NOW + timedelta(days=1),
    end_date: datetime = NOW + timedelta(days=1, hours=8),
    capacity: int = 10,
) -> Event:
    return Event(
        id=event_id,
        organizer_id=organizer_id,
        name="Evento",
        location="Lugar",
        start_date=start_date,
        end_date=end_date,
        capacity=capacity,
        status=status,
        updated_at=NOW,
    )


# --- create_event -----------------------------------------------------------


def test_create_event_sets_draft_status_and_owner(monkeypatch):
    session = MagicMock()
    organizer = _user(1, RoleEnum.ORGANIZER)
    data = EventCreate(
        name="Mi evento",
        location="Centro",
        start_date=NOW + timedelta(days=1),
        end_date=NOW + timedelta(days=1, hours=2),
        capacity=50,
    )

    created = MagicMock()
    create_mock = MagicMock(return_value=created)
    monkeypatch.setattr(event_service.event_repo, "create", create_mock)

    result = event_service.create_event(session, data, organizer)

    assert result is created
    passed_event = create_mock.call_args[0][1]
    assert passed_event.status == EventStatusEnum.DRAFT
    assert passed_event.organizer_id == organizer.id
    session.commit.assert_called_once()


# --- update_event ------------------------------------------------------------


def test_update_event_not_found_raises(monkeypatch):
    session = MagicMock()
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=None))

    with pytest.raises(event_service.EventNotFoundError):
        event_service.update_event(session, 1, EventUpdate(), _user(1, RoleEnum.ORGANIZER))


def test_update_event_forbidden_for_non_owner_non_admin(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    other_organizer = _user(2, RoleEnum.ORGANIZER)
    with pytest.raises(event_service.EventForbiddenError):
        event_service.update_event(session, event.id, EventUpdate(), other_organizer)


def test_update_event_admin_can_update_others_event(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))
    update_mock = MagicMock(return_value=event)
    monkeypatch.setattr(event_service.event_repo, "update", update_mock)

    admin = _user(99, RoleEnum.ADMIN)
    result = event_service.update_event(
        session, event.id, EventUpdate(name="Nuevo nombre"), admin
    )

    assert result is event
    update_mock.assert_called_once()
    session.commit.assert_called_once()


@pytest.mark.parametrize("status", [EventStatusEnum.CANCELLED, EventStatusEnum.FINISHED])
def test_update_event_terminal_state_raises(monkeypatch, status):
    session = MagicMock()
    event = _event(organizer_id=1, status=status)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    with pytest.raises(event_service.InvalidEventStateError):
        event_service.update_event(session, event.id, EventUpdate(), _user(1, RoleEnum.ORGANIZER))


def test_update_event_invalid_date_range_raises(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    data = EventUpdate(end_date=event.start_date - timedelta(hours=1))
    with pytest.raises(event_service.InvalidEventDataError):
        event_service.update_event(session, event.id, data, _user(1, RoleEnum.ORGANIZER))


# --- delete_event -------------------------------------------------------------


def test_delete_event_not_found_raises(monkeypatch):
    session = MagicMock()
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=None))

    with pytest.raises(event_service.EventNotFoundError):
        event_service.delete_event(session, 1, _user(1, RoleEnum.ORGANIZER))


def test_delete_event_forbidden_for_non_owner(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    with pytest.raises(event_service.EventForbiddenError):
        event_service.delete_event(session, event.id, _user(2, RoleEnum.ORGANIZER))


def test_delete_event_terminal_state_raises(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1, status=EventStatusEnum.FINISHED)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    with pytest.raises(event_service.InvalidEventStateError):
        event_service.delete_event(session, event.id, _user(1, RoleEnum.ORGANIZER))


def test_delete_event_success_deletes_and_commits(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))
    delete_mock = MagicMock()
    monkeypatch.setattr(event_service.event_repo, "delete", delete_mock)

    event_service.delete_event(session, event.id, _user(1, RoleEnum.ORGANIZER))

    delete_mock.assert_called_once_with(session, event)
    session.commit.assert_called_once()


# --- transiciones de estado ---------------------------------------------------


def test_publish_event_from_draft_succeeds(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1, status=EventStatusEnum.DRAFT)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    result = event_service.publish_event(session, event.id, _user(1, RoleEnum.ORGANIZER))

    assert result.status == EventStatusEnum.PUBLISHED


def test_publish_event_twice_raises_invalid_state(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1, status=EventStatusEnum.PUBLISHED)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    with pytest.raises(event_service.InvalidEventStateError):
        event_service.publish_event(session, event.id, _user(1, RoleEnum.ORGANIZER))


def test_finish_directly_from_draft_raises_invalid_state(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1, status=EventStatusEnum.DRAFT)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    with pytest.raises(event_service.InvalidEventStateError):
        event_service.finish_event(session, event.id, _user(1, RoleEnum.ORGANIZER))


def test_cancel_event_sets_cancelled_not_published(monkeypatch):
    """Guarda de regresión: Fase 3 tuvo un bug de copy-paste donde cancel/finish
    dejaban el evento en PUBLISHED en vez de su propio estado objetivo."""
    session = MagicMock()
    event = _event(organizer_id=1, status=EventStatusEnum.PUBLISHED)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    result = event_service.cancel_event(session, event.id, _user(1, RoleEnum.ORGANIZER))

    assert result.status == EventStatusEnum.CANCELLED


def test_transition_not_found_raises(monkeypatch):
    session = MagicMock()
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=None))

    with pytest.raises(event_service.EventNotFoundError):
        event_service.publish_event(session, 1, _user(1, RoleEnum.ORGANIZER))


def test_transition_forbidden_for_non_owner(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1, status=EventStatusEnum.DRAFT)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    with pytest.raises(event_service.EventForbiddenError):
        event_service.publish_event(session, event.id, _user(2, RoleEnum.ORGANIZER))


# --- get_event (visibilidad de draft) -----------------------------------------


def test_get_event_not_found_raises(monkeypatch):
    session = MagicMock()
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=None))

    with pytest.raises(event_service.EventNotFoundError):
        event_service.get_event(session, 1, None)


def test_get_draft_event_hidden_from_anonymous(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1, status=EventStatusEnum.DRAFT)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    with pytest.raises(event_service.EventNotFoundError):
        event_service.get_event(session, event.id, None)


def test_get_draft_event_hidden_from_other_organizer(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1, status=EventStatusEnum.DRAFT)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    with pytest.raises(event_service.EventNotFoundError):
        event_service.get_event(session, event.id, _user(2, RoleEnum.ORGANIZER))


def test_get_draft_event_visible_to_owner(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1, status=EventStatusEnum.DRAFT)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    result = event_service.get_event(session, event.id, _user(1, RoleEnum.ORGANIZER))
    assert result is event


def test_get_draft_event_visible_to_admin(monkeypatch):
    session = MagicMock()
    event = _event(organizer_id=1, status=EventStatusEnum.DRAFT)
    monkeypatch.setattr(event_service.event_repo, "get_by_id", MagicMock(return_value=event))

    result = event_service.get_event(session, event.id, _user(99, RoleEnum.ADMIN))
    assert result is event


# --- search_events (plomería de paginación) -----------------------------------


def test_search_events_computes_offset_and_wraps_response(monkeypatch):
    session = MagicMock()
    event = _event(status=EventStatusEnum.PUBLISHED)

    list_mock = MagicMock(return_value=[event])
    count_mock = MagicMock(return_value=1)
    monkeypatch.setattr(event_service.event_repo, "list_with_filters", list_mock)
    monkeypatch.setattr(event_service.event_repo, "count_with_filters", count_mock)

    result = event_service.search_events(
        session, None, None, None, None, page=3, page_size=20, current_user=None
    )

    _, _, _, _, _, limit, offset, _, _ = list_mock.call_args[0]
    assert offset == 40
    assert limit == 20
    assert result.total == 1
    assert result.page == 3
    assert len(result.items) == 1
