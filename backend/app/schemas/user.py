from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.enums import RoleEnum


class UserCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "usuario@example.com",
                "password": "ContraseñaSegura123",
                "full_name": "Juan Pérez",
            }
        }
    )

    email: EmailStr
    password: str
    full_name: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    role: RoleEnum
    is_active: bool


class UserAdminUpdate(BaseModel):
    role: RoleEnum | None = None
    is_active: bool | None = None


class UserListResponse(BaseModel):
    items: list[UserRead]
    total: int
    page: int
    page_size: int
