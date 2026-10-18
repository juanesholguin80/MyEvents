from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.db.session import get_session
from app.main import app
from app.models.enums import EventStatusEnum, RoleEnum
from app.models.event import Event
from app.models.speaker import Speaker
from app.models.user import User

if not settings.TEST_DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL no está configurada. Define esta variable en .env "
        "apuntando al servicio db_test de docker-compose (ver .env.example)."
    )

engine = create_engine(settings.TEST_DATABASE_URL)


@pytest.fixture(scope="session", autouse=True)
def _schema():
    """Crea el esquema completo una sola vez por sesión de test y lo destruye al final."""
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture()
def db_engine():
    """Engine crudo contra la BD de pruebas, para los casos que necesitan sus propias
    conexiones/transacciones reales (p. ej. pruebas de concurrencia)."""
    return engine


@pytest.fixture()
def db_session():
    """Una sesión por test, envuelta en una transacción que siempre se revierte al
    terminar. Usa SAVEPOINT (join_transaction_mode="create_savepoint") para que los
    `session.commit()` que hacen los services no cierren la transacción externa: solo
    liberan el savepoint y SQLAlchemy abre uno nuevo automáticamente."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    """TestClient con el dependency de sesión de BD sobreescrito para que la API use
    la misma transacción (y por tanto los mismos datos) que `db_session`."""

    def _override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = _override_get_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def make_user(db_session):
    """Factory para crear usuarios directamente en BD (sin pasar por /auth/register)."""
    counter = {"n": 0}

    def _make_user(role: RoleEnum = RoleEnum.ASSISTANT, **overrides) -> User:
        counter["n"] += 1
        user = User(
            email=overrides.pop("email", f"user{counter['n']}@test.com"),
            password_hash=hash_password(overrides.pop("password", "Password123!")),
            full_name=overrides.pop("full_name", f"User {counter['n']}"),
            role=role,
            **overrides,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _make_user


@pytest.fixture()
def admin_user(make_user) -> User:
    return make_user(role=RoleEnum.ADMIN)


@pytest.fixture()
def organizador_user(make_user) -> User:
    return make_user(role=RoleEnum.ORGANIZER)


@pytest.fixture()
def asistente_user(make_user) -> User:
    return make_user(role=RoleEnum.ASSISTANT)


@pytest.fixture()
def auth_header():
    """Devuelve una función que genera el header Authorization para un usuario dado."""

    def _auth_header(user: User) -> dict[str, str]:
        token = create_access_token(subject=str(user.id), role=user.role)
        return {"Authorization": f"Bearer {token}"}

    return _auth_header


@pytest.fixture()
def make_event(db_session):
    """Factory para crear eventos directamente en BD con valores por defecto sensatos."""

    def _make_event(
        organizer: User,
        status: EventStatusEnum = EventStatusEnum.DRAFT,
        capacity: int = 10,
        **overrides,
    ) -> Event:
        now = datetime.now(timezone.utc)
        event = Event(
            organizer_id=organizer.id,
            name=overrides.pop("name", "Evento de prueba"),
            description=overrides.pop("description", None),
            location=overrides.pop("location", "Lugar de prueba"),
            start_date=overrides.pop("start_date", now + timedelta(days=1)),
            end_date=overrides.pop("end_date", now + timedelta(days=1, hours=8)),
            capacity=capacity,
            status=status,
        )
        db_session.add(event)
        db_session.commit()
        db_session.refresh(event)
        return event

    return _make_event


@pytest.fixture()
def make_speaker(db_session):
    """Factory para crear ponentes directamente en BD."""
    counter = {"n": 0}

    def _make_speaker(**overrides) -> Speaker:
        counter["n"] += 1
        speaker = Speaker(
            full_name=overrides.pop("full_name", f"Ponente {counter['n']}"),
            bio=overrides.pop("bio", None),
            email=overrides.pop("email", f"ponente{counter['n']}@test.com"),
        )
        db_session.add(speaker)
        db_session.commit()
        db_session.refresh(speaker)
        return speaker

    return _make_speaker
