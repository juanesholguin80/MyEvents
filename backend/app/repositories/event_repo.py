from datetime import datetime

from sqlalchemy import func, or_
from sqlmodel import Session, select

from app.models.enums import EventStatusEnum
from app.models.event import Event


def get_by_id(session: Session, event_id: int) -> Event | None:
    statement = select(Event).where(Event.id == event_id)
    return session.exec(statement).first()


def create(session: Session, event: Event) -> Event:
    session.add(event)
    session.flush()
    session.refresh(event)
    return event


def update(session: Session, event: Event, data: dict) -> Event:
    for key, value in data.items():
        setattr(event, key, value)
    session.add(event)
    session.flush()
    session.refresh(event)
    return event


def delete(session: Session, event: Event) -> None:
    session.delete(event)


def _apply_search_filters(
    statement,
    name: str | None,
    status: EventStatusEnum | None,
    date_from: datetime | None,
    date_to: datetime | None,
    viewer_id: int | None,
    is_admin: bool,
):
    if name is not None:
        statement = statement.where(Event.name.ilike(f"%{name}%"))
    if status is not None:
        statement = statement.where(Event.status == status)
    if date_from is not None:
        statement = statement.where(Event.start_date >= date_from)
    if date_to is not None:
        statement = statement.where(Event.start_date <= date_to)

    if is_admin:
        pass
    elif viewer_id is not None:
        statement = statement.where(
            or_(Event.status != EventStatusEnum.DRAFT, Event.organizer_id == viewer_id)
        )
    else:
        statement = statement.where(Event.status != EventStatusEnum.DRAFT)

    return statement


def list_with_filters(
    session: Session,
    name: str | None,
    status: EventStatusEnum | None,
    date_from: datetime | None,
    date_to: datetime | None,
    limit: int,
    offset: int,
    viewer_id: int | None,
    is_admin: bool,
) -> list[Event]:
    statement = select(Event)
    statement = _apply_search_filters(
        statement, name, status, date_from, date_to, viewer_id, is_admin
    )
    statement = statement.order_by(Event.id).offset(offset).limit(limit)
    return session.exec(statement).all()


def count_with_filters(
    session: Session,
    name: str | None,
    status: EventStatusEnum | None,
    date_from: datetime | None,
    date_to: datetime | None,
    viewer_id: int | None,
    is_admin: bool,
) -> int:
    statement = select(func.count()).select_from(Event)
    statement = _apply_search_filters(
        statement, name, status, date_from, date_to, viewer_id, is_admin
    )
    return session.exec(statement).one()
