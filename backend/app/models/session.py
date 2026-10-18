from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, Index
from typing import Optional, TYPE_CHECKING
from datetime import datetime, timezone

if TYPE_CHECKING:
    from .event import Event
    from .speaker import Speaker


class Session(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True, default=None)
    event_id: int = Field(foreign_key="event.id", index=True)
    event: "Event" = Relationship(back_populates="sessions")
    speaker_id: int = Field(foreign_key="speaker.id")
    speaker: "Speaker" = Relationship(back_populates="sessions")
    title: str
    description: str | None = None
    start_time: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    end_time: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    capacity: int
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    __table_args__ = (
        Index("ix_session_speaker_start_end", "speaker_id", "start_time", "end_time"),
    )
