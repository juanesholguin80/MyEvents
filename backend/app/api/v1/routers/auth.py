from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.auth import (
    AccessTokenResponse,
    TokenPair,
    TokenRefreshRequest,
    UserLogin,
)
from app.schemas.user import UserCreate, UserRead
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo usuario",
)
def register(data: UserCreate, session: Session = Depends(get_session)):
    return auth_service.register(session, data)


@router.post(
    "/login",
    response_model=TokenPair,
    summary="Iniciar sesión",
)
def login(data: UserLogin, session: Session = Depends(get_session)):
    return auth_service.login(session, data)


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
    summary="Renovar el access token",
)
def refresh(data: TokenRefreshRequest, session: Session = Depends(get_session)):
    access_token = auth_service.refresh(session, data.refresh_token)
    return AccessTokenResponse(access_token=access_token)
