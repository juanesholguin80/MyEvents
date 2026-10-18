from datetime import datetime, timezone

from sqlmodel import Session

from app.models.enums import EventStatusEnum, RegistrationStatusEnum
from app.models.registration import Registration
from app.models.user import User
from app.repositories import registration_repo
from app.schemas.registration import MyRegistrationsResponse, RegistrationWithEventRead
from app.services.event_service import EventNotFoundError
from app.core.exceptions import ForbiddenError, ConflictError, DomainValidationError, NotFoundError


class EventNotPublishedError(ForbiddenError):
    code = "EVENT_NOT_PUBLISHED"


class AlreadyRegisteredError(ConflictError):
    code = "ALREADY_REGISTERED"


class EventFullError(DomainValidationError):
    status_code = 400
    code = "EVENT_FULL"


class RegistrationNotFoundError(NotFoundError):
    code = "REGISTRATION_NOT_FOUND"


def register_to_event(
    session: Session, event_id: int, current_user: User
) -> Registration:
    event = registration_repo.lock_event_for_update(session, event_id)
    if not event:
        raise EventNotFoundError("Evento no encontrado")

    if event.status != EventStatusEnum.PUBLISHED:
        raise EventNotPublishedError("El evento no está publicado")

    existing = registration_repo.get_by_user_and_event(
        session, current_user.id, event_id
    )
    if existing and existing.status == RegistrationStatusEnum.CONFIRMED:
        raise AlreadyRegisteredError("Ya estás registrado en este evento")

    confirmed_count = registration_repo.count_confirmed_by_event(session, event_id)
    if confirmed_count >= event.capacity:
        raise EventFullError("No hay cupo disponible")

    if existing:
        updated = registration_repo.update(
            session,
            existing,
            {
                "status": RegistrationStatusEnum.CONFIRMED,
                "registered_at": datetime.now(timezone.utc),
            },
        )
        session.commit()
        return updated

    new_registration = Registration(
        user_id=current_user.id,
        event_id=event_id,
        status=RegistrationStatusEnum.CONFIRMED,
    )
    created = registration_repo.create(session, new_registration)
    session.commit()
    return created


def cancel_registration(session: Session, event_id: int, current_user: User) -> None:
    registration = registration_repo.get_by_user_and_event(
        session, current_user.id, event_id
    )
    if not registration or registration.status == RegistrationStatusEnum.CANCELLED:
        raise RegistrationNotFoundError("No estabas registrado en este evento")

    registration_repo.update(
        session, registration, {"status": RegistrationStatusEnum.CANCELLED}
    )
    session.commit()


def list_my_registrations(
    session: Session, current_user: User, page: int, page_size: int
) -> MyRegistrationsResponse:
    offset = (page - 1) * page_size
    registrations = registration_repo.list_by_user(
        session, current_user.id, page_size, offset
    )
    total = registration_repo.count_by_user(session, current_user.id)

    items = [RegistrationWithEventRead.model_validate(r) for r in registrations]

    return MyRegistrationsResponse(
        items=items, total=total, page=page, page_size=page_size
    )
