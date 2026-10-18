from sqlmodel import SQLModel, Field, Relationship
from .enums import RoleEnum
from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, func, Enum as SAEnum

if TYPE_CHECKING:
    from .event import Event
    from .registration import Registration


class User(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True, default=None)
    email: str = Field(unique=True, index=True)
    password_hash: str
    full_name: str
    role: RoleEnum = Field(
        sa_column=Column(
            SAEnum(
                RoleEnum,
                values_callable=lambda enum_cls: [e.value for e in enum_cls],
                name="role_enum",
            ),
            nullable=False,
        )
    )
    is_active: bool = Field(default=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        ),
    )
    events: list["Event"] = Relationship(back_populates="organizer")
    registrations: list["Registration"] = Relationship(back_populates="user")
