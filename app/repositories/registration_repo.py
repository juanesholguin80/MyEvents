from sqlalchemy import func
from sqlmodel import Session, select

from app.models.enums import RegistrationStatusEnum
from app.models.event import Event
from app.models.registration import Registration


def get_by_user_and_event(
    session: Session, user_id: int, event_id: int
) -> Registration | None:
    statement = select(Registration).where(
        Registration.user_id == user_id, Registration.event_id == event_id
    )
    return session.exec(statement).first()


def create(session: Session, registration: Registration) -> Registration:
    session.add(registration)
    session.flush()
    session.refresh(registration)
    return registration


def update(session: Session, registration: Registration, data: dict) -> Registration:
    for key, value in data.items():
        setattr(registration, key, value)
    session.add(registration)
    session.flush()
    session.refresh(registration)
    return registration


def list_by_user(
    session: Session, user_id: int, limit: int, offset: int
) -> list[Registration]:
    statement = (
        select(Registration)
        .where(Registration.user_id == user_id)
        .order_by(Registration.id)
        .offset(offset)
        .limit(limit)
    )
    return session.exec(statement).all()


def count_by_user(session: Session, user_id: int) -> int:
    statement = (
        select(func.count())
        .select_from(Registration)
        .where(Registration.user_id == user_id)
    )
    return session.exec(statement).one()


def lock_event_for_update(session: Session, event_id: int) -> Event | None:
    statement = select(Event).where(Event.id == event_id).with_for_update()
    return session.exec(statement).first()


def count_confirmed_by_event(session: Session, event_id: int) -> int:
    statement = (
        select(func.count())
        .select_from(Registration)
        .where(
            Registration.event_id == event_id,
            Registration.status == RegistrationStatusEnum.CONFIRMED,
        )
    )
    return session.exec(statement).one()
