from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.db.session import get_session
from app.api.v1.deps import get_current_user, get_current_user_optional, require_roles
from app.models.enums import EventStatusEnum, RoleEnum
from app.models.user import User
from app.schemas.event import EventCreate, EventUpdate, EventRead, EventListResponse
from app.services import event_service

router = APIRouter(prefix="/events", tags=["events"])


@router.post(
    "",
    response_model=EventRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un evento",
)
def create_event(
    data: EventCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(RoleEnum.ORGANIZER, RoleEnum.ADMIN)),
):
    return event_service.create_event(session, data, current_user)


@router.get(
    "",
    response_model=EventListResponse,
    status_code=status.HTTP_200_OK,
    summary="Buscar eventos por nombre, estado y rango de fechas",
)
def get_events(
    name: str | None = None,
    status_filter: EventStatusEnum | None = Query(default=None, alias="status"),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    return event_service.search_events(
        session, name, status_filter, date_from, date_to, page, page_size, current_user
    )


@router.get(
    "/{event_id}",
    response_model=EventRead,
    status_code=status.HTTP_200_OK,
    summary="Obtener el detalle de un evento",
)
def get_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    return event_service.get_event(session, event_id, current_user)


@router.put(
    "/{event_id}",
    response_model=EventRead,
    status_code=status.HTTP_200_OK,
    summary="Actualizar un evento",
)
def update_event(
    event_id: int,
    data: EventUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return event_service.update_event(session, event_id, data, current_user)


@router.delete(
    "/{event_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un evento",
)
def delete_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    event_service.delete_event(session, event_id, current_user)


@router.patch(
    "/{event_id}/publish",
    response_model=EventRead,
    status_code=status.HTTP_200_OK,
    summary="Publicar un evento en borrador",
)
def publish_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return event_service.publish_event(session, event_id, current_user)


@router.patch(
    "/{event_id}/cancel",
    response_model=EventRead,
    status_code=status.HTTP_200_OK,
    summary="Cancelar un evento",
)
def cancel_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return event_service.cancel_event(session, event_id, current_user)


@router.patch(
    "/{event_id}/finish",
    response_model=EventRead,
    status_code=status.HTTP_200_OK,
    summary="Finalizar un evento",
)
def finish_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return event_service.finish_event(session, event_id, current_user)
