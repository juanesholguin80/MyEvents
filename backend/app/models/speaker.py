from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .session import Session


class Speaker(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True, default=None)
    full_name: str
    bio: str | None = None
    email: str = Field(unique=True, index=True)
    sessions: list["Session"] = Relationship(back_populates="speaker")
