from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends
from jose import JWTError
from sqlmodel import Session

from app.core.security import decode_token
from app.core.exceptions import ForbiddenError
from app.db.session import get_session
from app.models.user import User
from app.repositories import user_repo
from app.services.auth_service import InvalidTokenError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


class InsufficientRoleError(ForbiddenError):
    code = "INSUFFICIENT_ROLE"


def _resolve_user_from_token(token: str, session: Session) -> User:
    try:
        payload = decode_token(token)
    except JWTError:
        raise InvalidTokenError("Token inválido o expirado")

    if payload["type"] != "access":
        raise InvalidTokenError("Tipo de token incorrecto")

    user = user_repo.get_by_id(session, int(payload["sub"]))
    if not user or not user.is_active:
        raise InvalidTokenError("Usuario inválido o inactivo")

    return user


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    if token is None:
        raise InvalidTokenError("No autenticado")

    return _resolve_user_from_token(token, session)


def require_roles(*roles):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise InsufficientRoleError("No tienes permisos para esta acción")
        return current_user

    return dependency


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    session: Session = Depends(get_session),
) -> User | None:
    if token is None:
        return None
    return _resolve_user_from_token(token, session)
