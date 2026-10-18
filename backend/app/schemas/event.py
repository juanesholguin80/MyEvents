from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from datetime import datetime
from typing import Self
from app.models.enums import EventStatusEnum
from app.schemas.validators import ensure_aware_utc


class EventCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Conferencia de Python",
                "description": "Evento anual de la comunidad Python",
                "location": "Centro de Convenciones",
                "start_date": "2026-11-01T09:00:00",
                "end_date": "2026-11-01T18:00:00",
                "capacity": 100,
            }
        }
    )

    name: str
    description: str | None = None
    location: str
    start_date: datetime
    end_date: datetime
    capacity: int = Field(gt=0)

    @field_validator("start_date", "end_date", mode="after")
    @classmethod
    def normalize_timezone(cls, value: datetime) -> datetime:
        return ensure_aware_utc(value)

    @model_validator(mode="after")
    def validate_date_range(self) -> Self:
        if self.end_date <= self.start_date:
            raise ValueError(
                "La fecha fin no puede ser menor o igual a la fecha de inicio del evento"
            )

        return self


class EventUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    location: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    capacity: int | None = Field(gt=0, default=None)

    @field_validator("start_date", "end_date", mode="after")
    @classmethod
    def normalize_timezone(cls, value: datetime | None) -> datetime | None:
        return ensure_aware_utc(value) if value is not None else None


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    organizer_id: int
    status: EventStatusEnum
    name: str
    description: str | None = None
    location: str
    start_date: datetime
    end_date: datetime
    capacity: int
    created_at: datetime
    updated_at: datetime


class EventListResponse(BaseModel):
    items: list[EventRead]
    total: int
    page: int
    page_size: int
