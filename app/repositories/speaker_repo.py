from app.models.speaker import Speaker
from sqlalchemy import func
from sqlmodel import select, Session


def get_by_id(session: Session, speaker_id: int) -> Speaker | None:
    statement = select(Speaker).where(Speaker.id == speaker_id)
    return session.exec(statement).first()


def create(session: Session, speaker: Speaker) -> Speaker:
    session.add(speaker)
    session.flush()
    session.refresh(speaker)
    return speaker


def update(session: Session, speaker: Speaker, data: dict) -> Speaker:
    for key, value in data.items():
        setattr(speaker, key, value)

    session.add(speaker)
    session.flush()
    session.refresh(speaker)
    return speaker


def delete(session: Session, speaker: Speaker) -> None:
    session.delete(speaker)


def list_with_filters(
    session: Session,
    full_name: str | None,
    limit: int,
    offset: int,
) -> list[Speaker]:
    statement = select(Speaker)

    if full_name is not None:
        statement = statement.where(Speaker.full_name.ilike(f"%{full_name}%"))

    statement = statement.order_by(Speaker.id).offset(offset).limit(limit)

    return session.exec(statement).all()


def count_with_filters(
    session: Session,
    full_name: str | None,
) -> int:
    statement = select(func.count()).select_from(Speaker)

    if full_name is not None:
        statement = statement.where(Speaker.full_name.ilike(f"%{full_name}%"))

    return session.exec(statement).one()
