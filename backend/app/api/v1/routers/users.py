from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.db.session import get_session
from app.api.v1.deps import get_current_user, require_roles
from app.models.enums import RoleEnum
from app.models.user import User
from app.schemas.user import UserAdminUpdate, UserRead, UserListResponse
from app.services import user_service

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_roles(RoleEnum.ADMIN))],
)

profile_router = APIRouter(tags=["users"])


@profile_router.get(
    "/me",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Obtener mi propio perfil",
)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get(
    "/users",
    response_model=UserListResponse,
    status_code=status.HTTP_200_OK,
    summary="Listar usuarios (admin)",
)
def get_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    return user_service.admin_list_users(session, page, page_size)


@router.get(
    "/users/{user_id}",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Obtener el detalle de un usuario (admin)",
)
def get_user(
    user_id: int,
    session: Session = Depends(get_session),
):
    return user_service.admin_get_user(session, user_id)


@router.patch(
    "/users/{user_id}",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Actualizar rol o estado de un usuario (admin)",
)
def update_user(
    user_id: int,
    data: UserAdminUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN)),
):
    return user_service.admin_update_user(session, user_id, data, current_user)
