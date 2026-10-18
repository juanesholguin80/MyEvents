from sqlmodel import Session

from app.models.user import User
from app.repositories import user_repo
from app.schemas.user import UserAdminUpdate, UserRead, UserListResponse
from app.core.exceptions import NotFoundError, ForbiddenError


class UserNotFoundError(NotFoundError):
    code = "USER_NOT_FOUND"


class CannotModifySelfError(ForbiddenError):
    code = "CANNOT_MODIFY_SELF"


def admin_list_users(session: Session, page: int, page_size: int) -> UserListResponse:
    offset = (page - 1) * page_size

    users = user_repo.list_all(session, page_size, offset)
    total = user_repo.count_all(session)

    items = [UserRead.model_validate(u) for u in users]

    return UserListResponse(items=items, total=total, page=page, page_size=page_size)


def admin_get_user(session: Session, user_id: int) -> User:
    user = user_repo.get_by_id(session, user_id)
    if not user:
        raise UserNotFoundError("Usuario no encontrado")

    return user


def admin_update_user(
    session: Session, user_id: int, data: UserAdminUpdate, current_user: User
) -> User:
    if user_id == current_user.id:
        raise CannotModifySelfError("No puedes modificar tu propio usuario")

    user = user_repo.get_by_id(session, user_id)
    if not user:
        raise UserNotFoundError("Usuario no encontrado")

    update_fields = data.model_dump(exclude_unset=True)
    updated = user_repo.update(session, user, update_fields)
    session.commit()

    return updated
