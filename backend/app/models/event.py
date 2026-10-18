from datetime import datetime, timezone

from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from sqlalchemy import Column, DateTime, func, Enum as SAEnum
from .enums import EventStatusEnum

if TYPE_CHECKING:
    from .user import User
    from .session import Session
    from .registration import Registration


class Event(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True, default=None)
    organizer_id: int = Field(foreign_key="user.id")
    organizer: "User" = Relationship(back_populates="events")
    name: str = Field(index=True)
    description: str | None = None
    location: str
    start_date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    end_date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    capacity: int
    status: EventStatusEnum = Field(
        sa_column=Column(
            SAEnum(
                EventStatusEnum,
                values_callable=lambda enum_cls: [e.value for e in enum_cls],
                name="event_status_enum",
            ),
            nullable=False,
        )
    )
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
    sessions: list["Session"] = Relationship(back_populates="event")
    registrations: list["Registration"] = Relationship(back_populates="event")
