from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.api.v1.deps import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.schemas.registration import MyRegistrationsResponse, RegistrationRead
from app.services import registration_service

router = APIRouter(tags=["registrations"])


@router.post(
    "/events/{event_id}/register",
    response_model=RegistrationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrarse a un evento",
)
def register_to_event(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return registration_service.register_to_event(session, event_id, current_user)


@router.delete(
    "/events/{event_id}/register",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancelar el registro a un evento",
)
def cancel_registration(
    event_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    registration_service.cancel_registration(session, event_id, current_user)


@router.get(
    "/me/registrations",
    response_model=MyRegistrationsResponse,
    status_code=status.HTTP_200_OK,
    summary="Listar mis registros a eventos",
)
def get_my_registrations(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return registration_service.list_my_registrations(
        session, current_user, page, page_size
    )
