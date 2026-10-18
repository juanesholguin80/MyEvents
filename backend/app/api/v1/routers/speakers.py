from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.db.session import get_session
from app.api.v1.deps import get_current_user, require_roles
from app.models.enums import RoleEnum
from app.models.user import User
from app.schemas.speaker import (
    SpeakerCreate,
    SpeakerUpdate,
    SpeakerRead,
    SpeakerListResponse,
)
from app.services import speaker_service

router = APIRouter(prefix="/speakers", tags=["speakers"])


@router.post(
    "",
    response_model=SpeakerRead,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un ponente",
)
def create_speaker(
    data: SpeakerCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(RoleEnum.ORGANIZER, RoleEnum.ADMIN)),
):
    return speaker_service.create_speaker(session, data)


@router.get(
    "",
    response_model=SpeakerListResponse,
    status_code=status.HTTP_200_OK,
    summary="Listar ponentes",
)
def get_speakers(
    name: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return speaker_service.list_speakers(session, name, page, page_size)


@router.get(
    "/{speaker_id}",
    response_model=SpeakerRead,
    status_code=status.HTTP_200_OK,
    summary="Obtener el detalle de un ponente",
)
def get_speaker(
    speaker_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return speaker_service.get_speaker(session, speaker_id)


@router.put(
    "/{speaker_id}",
    response_model=SpeakerRead,
    status_code=status.HTTP_200_OK,
    summary="Actualizar un ponente",
)
def update_speaker(
    speaker_id: int,
    data: SpeakerUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(RoleEnum.ORGANIZER, RoleEnum.ADMIN)),
):
    return speaker_service.update_speaker(session, speaker_id, data)


@router.delete(
    "/{speaker_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un ponente",
)
def delete_speaker(
    speaker_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    speaker_service.delete_speaker(session, speaker_id)
