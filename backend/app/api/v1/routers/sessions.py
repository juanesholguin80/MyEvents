from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.db.session import get_session
from app.api.v1.deps import get_current_user, get_current_user_optional, require_roles
from app.models.enums import RoleEnum
from app.models.user import User
from app.schemas.session import (
    SessionCreate,
    SessionUpdate,
    SessionRead,
    SessionListResponse,
)
from app.services import session_service

router = APIRouter(prefix="/events/{event_id}/sessions", tags=["sessions"])


@router.post(
    "",
    response_model=SessionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una sesión dentro de un evento",
)
def create_session(
    event_id: int,
    data: SessionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(RoleEnum.ORGANIZER, RoleEnum.ADMIN)),
):
    return session_service.create_session(session, event_id, data, current_user)


@router.get(
    "",
    response_model=SessionListResponse,
    status_code=status.HTTP_200_OK,
    summary="Listar las sesiones de un evento",
)
def get_sessions(
    event_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    return session_service.list_sessions_by_event(
        session, event_id, page, page_size, current_user
    )


@router.get(
    "/{session_id}",
    response_model=SessionRead,
    status_code=status.HTTP_200_OK,
    summary="Obtener el detalle de una sesión",
)
def get_session_detail(
    event_id: int,
    session_id: int,
    session: Session = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    return session_service.get_session(session, event_id, session_id, current_user)


@router.put(
    "/{session_id}",
    response_model=SessionRead,
    status_code=status.HTTP_200_OK,
    summary="Actualizar una sesión",
)
def update_session(
    event_id: int,
    session_id: int,
    data: SessionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return session_service.update_session(
        session, event_id, session_id, data, current_user
    )


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una sesión",
)
def delete_session(
    event_id: int,
    session_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    session_service.delete_session(session, event_id, session_id, current_user)
