from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, UniqueConstraint, Enum as SAEnum
from typing import Optional, TYPE_CHECKING
from .enums import RegistrationStatusEnum
from datetime import datetime, timezone

if TYPE_CHECKING:
    from .event import Event
    from .user import User


class Registration(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True, default=None)
    user_id: int = Field(foreign_key="user.id")
    user: "User" = Relationship(back_populates="registrations")
    event_id: int = Field(foreign_key="event.id")
    event: "Event" = Relationship(back_populates="registrations")
    status: RegistrationStatusEnum = Field(
        sa_column=Column(
            SAEnum(
                RegistrationStatusEnum,
                values_callable=lambda enum_cls: [e.value for e in enum_cls],
                name="registration_status_enum",
            ),
            nullable=False,
        )
    )

    registered_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    __table_args__ = (UniqueConstraint("user_id", "event_id"),)
