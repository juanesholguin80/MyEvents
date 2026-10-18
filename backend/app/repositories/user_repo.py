from sqlalchemy import func
from sqlmodel import Session, select
from app.models.user import User


def get_by_email(session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    return session.exec(statement).first()


def get_by_id(session: Session, user_id: int) -> User | None:
    statement = select(User).where(User.id == user_id)
    return session.exec(statement).first()


def create(session: Session, user: User) -> User:
    session.add(user)
    session.flush()
    session.refresh(user)
    return user


def update(session: Session, user: User, data: dict) -> User:
    for key, value in data.items():
        setattr(user, key, value)

    session.add(user)
    session.flush()
    session.refresh(user)
    return user


def list_all(session: Session, limit: int, offset: int) -> list[User]:
    statement = select(User).order_by(User.id).offset(offset).limit(limit)
    return session.exec(statement).all()


def count_all(session: Session) -> int:
    statement = select(func.count()).select_from(User)
    return session.exec(statement).one()
