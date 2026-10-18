from sqlmodel import Session

from app.models.session import Session as SessionModel
from app.models.user import User
from app.models.enums import RoleEnum
from app.schemas.session import SessionCreate, SessionUpdate, SessionRead, SessionListResponse
from app.repositories import session_repo, speaker_repo
from app.services import event_service
from app.services.event_service import EventForbiddenError
from app.services.speaker_service import SpeakerNotFoundError
from app.core.exceptions import NotFoundError, DomainValidationError


class SessionNotFoundError(NotFoundError):
    code = "SESSION_NOT_FOUND"


class InvalidSessionDataError(DomainValidationError):
    code = "INVALID_SESSION_DATA"


class SessionOverlapError(DomainValidationError):
    code = "SESSION_OVERLAP"


def create_session(
    session: Session, event_id: int, data: SessionCreate, current_user: User
) -> SessionModel:
    event = event_service.get_event(session, event_id, current_user)

    if current_user.role != RoleEnum.ADMIN and event.organizer_id != current_user.id:
        raise EventForbiddenError("No tienes permiso sobre este evento")

    speaker = speaker_repo.get_by_id(session, data.speaker_id)
    if not speaker:
        raise SpeakerNotFoundError("Ponente no encontrado")

    if data.start_time < event.start_date or data.end_time > event.end_date:
        raise InvalidSessionDataError("El horario debe estar dentro del rango del evento")

    if data.capacity > event.capacity:
        raise InvalidSessionDataError("La capacidad de la sesión no puede superar la del evento")

    conflicts = session_repo.get_overlapping_sessions(
        session, data.speaker_id, data.start_time, data.end_time
    )
    if conflicts:
        raise SessionOverlapError("El ponente ya tiene una sesión en ese horario")

    new_session = SessionModel(
        event_id=event_id,
        speaker_id=data.speaker_id,
        title=data.title,
        description=data.description,
        start_time=data.start_time,
        end_time=data.end_time,
        capacity=data.capacity,
    )

    created = session_repo.create(session, new_session)
    session.commit()

    return created


def update_session(
    session: Session,
    event_id: int,
    session_id: int,
    data: SessionUpdate,
    current_user: User,
) -> SessionModel:
    event = event_service.get_event(session, event_id, current_user)

    if current_user.role != RoleEnum.ADMIN and event.organizer_id != current_user.id:
        raise EventForbiddenError("No tienes permiso sobre este evento")

    session_obj = session_repo.get_by_id(session, session_id)
    if not session_obj or session_obj.event_id != event_id:
        raise SessionNotFoundError("Sesión no encontrada")

    update_fields = data.model_dump(exclude_unset=True)

    new_speaker_id = update_fields.get("speaker_id", session_obj.speaker_id)
    if "speaker_id" in update_fields:
        speaker = speaker_repo.get_by_id(session, new_speaker_id)
        if not speaker:
            raise SpeakerNotFoundError("Ponente no encontrado")

    new_start = update_fields.get("start_time", session_obj.start_time)
    new_end = update_fields.get("end_time", session_obj.end_time)
    new_capacity = update_fields.get("capacity", session_obj.capacity)

    if new_start >= new_end:
        raise InvalidSessionDataError("La hora de fin debe ser posterior a la de inicio")

    if new_start < event.start_date or new_end > event.end_date:
        raise InvalidSessionDataError("El horario debe estar dentro del rango del evento")

    if new_capacity > event.capacity:
        raise InvalidSessionDataError("La capacidad de la sesión no puede superar la del evento")

    conflicts = session_repo.get_overlapping_sessions(
        session, new_speaker_id, new_start, new_end, exclude_session_id=session_id
    )
    if conflicts:
        raise SessionOverlapError("El ponente ya tiene una sesión en ese horario")

    updated = session_repo.update(session, session_obj, update_fields)
    session.commit()

    return updated


def delete_session(
    session: Session, event_id: int, session_id: int, current_user: User
) -> None:
    event = event_service.get_event(session, event_id, current_user)

    if current_user.role != RoleEnum.ADMIN and event.organizer_id != current_user.id:
        raise EventForbiddenError("No tienes permiso sobre este evento")

    session_obj = session_repo.get_by_id(session, session_id)
    if not session_obj or session_obj.event_id != event_id:
        raise SessionNotFoundError("Sesión no encontrada")

    session_repo.delete(session, session_obj)
    session.commit()


def get_session(
    session: Session, event_id: int, session_id: int, current_user: User | None
) -> SessionModel:
    event_service.get_event(session, event_id, current_user)

    session_obj = session_repo.get_by_id(session, session_id)
    if not session_obj or session_obj.event_id != event_id:
        raise SessionNotFoundError("Sesión no encontrada")

    return session_obj


def list_sessions_by_event(
    session: Session,
    event_id: int,
    page: int,
    page_size: int,
    current_user: User | None,
) -> SessionListResponse:
    event_service.get_event(session, event_id, current_user)

    offset = (page - 1) * page_size
    sessions = session_repo.list_by_event(session, event_id, page_size, offset)
    total = session_repo.count_by_event(session, event_id)

    items = [SessionRead.model_validate(s) for s in sessions]

    return SessionListResponse(
        items=items, total=total, page=page, page_size=page_size
    )
