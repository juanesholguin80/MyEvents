from datetime import datetime

from sqlalchemy import func
from sqlmodel import Session, select

from app.models.session import Session as SessionModel


def get_by_id(session: Session, session_id: int) -> SessionModel | None:
    statement = select(SessionModel).where(SessionModel.id == session_id)
    return session.exec(statement).first()


def create(session: Session, new_session: SessionModel) -> SessionModel:
    session.add(new_session)
    session.flush()
    session.refresh(new_session)
    return new_session


def update(session: Session, db_session: SessionModel, data: dict) -> SessionModel:
    for key, value in data.items():
        setattr(db_session, key, value)

    session.add(db_session)
    session.flush()
    session.refresh(db_session)
    return db_session


def delete(session: Session, db_session: SessionModel) -> None:
    session.delete(db_session)


def list_by_event(
    session: Session, event_id: int, limit: int, offset: int
) -> list[SessionModel]:
    statement = (
        select(SessionModel)
        .where(SessionModel.event_id == event_id)
        .order_by(SessionModel.id)
        .offset(offset)
        .limit(limit)
    )
    return session.exec(statement).all()


def count_by_event(session: Session, event_id: int) -> int:
    statement = (
        select(func.count())
        .select_from(SessionModel)
        .where(SessionModel.event_id == event_id)
    )
    return session.exec(statement).one()


def count_by_speaker(session: Session, speaker_id: int) -> int:
    statement = (
        select(func.count())
        .select_from(SessionModel)
        .where(SessionModel.speaker_id == speaker_id)
    )
    return session.exec(statement).one()


def get_overlapping_sessions(
    session: Session,
    speaker_id: int,
    start_time: datetime,
    end_time: datetime,
    exclude_session_id: int | None = None,
) -> list[SessionModel]:
    statement = select(SessionModel).where(
        SessionModel.speaker_id == speaker_id,
        SessionModel.start_time < end_time,
        SessionModel.end_time > start_time,
    )

    if exclude_session_id is not None:
        statement = statement.where(SessionModel.id != exclude_session_id)

    return session.exec(statement).all()
