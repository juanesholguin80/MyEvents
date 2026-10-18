"""Esta prueba necesita conexiones/transacciones REALES y simultáneas a Postgres
para poder demostrar que `SELECT ... FOR UPDATE` serializa el acceso a la fila del
Event. Por eso NO usa el fixture `db_session` (una sola sesión/conexión, pensada
para aislar un test con una sola transacción que se revierte al final): aquí cada
request necesita su propia sesión/conexión, igual que en producción, para que la
segunda quede realmente bloqueada en la BD esperando a que la primera termine.

Como estos datos sí se comprometen de verdad (no hay rollback automático), el test
limpia explícitamente lo que crea al terminar.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.core.security import create_access_token, hash_password
from app.db.session import get_session
from app.main import app
from app.models.enums import EventStatusEnum, RoleEnum
from app.models.event import Event
from app.models.registration import Registration
from app.models.user import User

NOW = datetime.now(timezone.utc)
CONCURRENT_USERS = 10


def test_concurrent_registrations_respect_capacity(db_engine):
    with Session(db_engine) as setup_session:
        organizer = User(
            email="concurrency-organizer@test.com",
            password_hash=hash_password("x"),
            full_name="Organizador Concurrencia",
            role=RoleEnum.ORGANIZER,
        )
        setup_session.add(organizer)
        setup_session.commit()
        setup_session.refresh(organizer)
        organizer_id = organizer.id

        event = Event(
            organizer_id=organizer.id,
            name="Evento de concurrencia",
            location="Lugar",
            start_date=NOW + timedelta(days=1),
            end_date=NOW + timedelta(days=1, hours=8),
            capacity=1,
            status=EventStatusEnum.PUBLISHED,
        )
        setup_session.add(event)
        setup_session.commit()
        setup_session.refresh(event)
        event_id = event.id

        assistants = [
            User(
                email=f"concurrency-user-{i}@test.com",
                password_hash=hash_password("x"),
                full_name=f"Asistente {i}",
                role=RoleEnum.ASSISTANT,
            )
            for i in range(CONCURRENT_USERS)
        ]
        setup_session.add_all(assistants)
        setup_session.commit()
        for assistant in assistants:
            setup_session.refresh(assistant)
        user_ids = [a.id for a in assistants]

    headers_list = [
        {
            "Authorization": f"Bearer "
            f"{create_access_token(subject=str(uid), role=RoleEnum.ASSISTANT)}"
        }
        for uid in user_ids
    ]

    def _override_get_session():
        with Session(db_engine) as session:
            yield session

    app.dependency_overrides[get_session] = _override_get_session
    try:
        with TestClient(app) as test_client:
            def _register(headers):
                return test_client.post(f"/api/v1/events/{event_id}/register", headers=headers)

            with ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
                responses = list(executor.map(_register, headers_list))
    finally:
        app.dependency_overrides.clear()
        with Session(db_engine) as cleanup_session:
            cleanup_session.exec(delete(Registration).where(Registration.event_id == event_id))
            cleanup_session.exec(delete(Event).where(Event.id == event_id))
            cleanup_session.exec(delete(User).where(User.id.in_(user_ids + [organizer_id])))
            cleanup_session.commit()

    statuses = [r.status_code for r in responses]
    assert statuses.count(201) == 1
    assert statuses.count(400) == CONCURRENT_USERS - 1
