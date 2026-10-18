from jose import JWTError
from sqlmodel import Session

from app.models.enums import RoleEnum
from app.models.user import User
from app.repositories import user_repo
from app.schemas.user import UserCreate
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
    hash_password,
)
from app.schemas.auth import TokenPair, UserLogin
from app.core.exceptions import AppException, ConflictError


class EmailAlreadyExistsError(ConflictError):
    code = "EMAIL_ALREADY_EXISTS"


class InvalidCredentialsError(AppException):
    status_code = 401
    code = "INVALID_CREDENTIALS"


class InvalidTokenError(AppException):
    status_code = 401
    code = "INVALID_TOKEN"


def register(session: Session, data: UserCreate) -> User:
    existing_user = user_repo.get_by_email(session, data.email)
    if existing_user:
        raise EmailAlreadyExistsError("El correo ya está registrado")

    password_hash = hash_password(data.password)

    new_user = User(
        email=data.email,
        password_hash=password_hash,
        full_name=data.full_name,
        role=RoleEnum.ASSISTANT,
    )

    user = user_repo.create(session, new_user)
    session.commit()

    return user


def login(session: Session, data: UserLogin) -> TokenPair:
    user = user_repo.get_by_email(session, data.email)
    if not user or not verify_password(data.password, user.password_hash):
        raise InvalidCredentialsError("Credenciales inválidas")

    if not user.is_active:
        raise InvalidCredentialsError("Credenciales inválidas")

    access_token = create_access_token(subject=str(user.id), role=user.role)
    refresh_token = create_refresh_token(subject=str(user.id))

    return TokenPair(access_token=access_token, refresh_token=refresh_token)


def refresh(session: Session, refresh_token: str) -> str:
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise InvalidTokenError("Token inválido o expirado")

    if payload["type"] != "refresh":
        raise InvalidTokenError("Token inválido o expirado")

    user = user_repo.get_by_id(session, int(payload["sub"]))
    if not user or not user.is_active:
        raise InvalidTokenError("Token inválido o expirado")

    return create_access_token(subject=str(user.id), role=user.role)
