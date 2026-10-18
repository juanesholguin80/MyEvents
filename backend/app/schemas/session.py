from pydantic import BaseModel, ConfigDict, field_validator, model_validator, Field
from datetime import datetime
from typing import Self
from app.schemas.validators import ensure_aware_utc


class SessionCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "speaker_id": 1,
                "title": "Introducción a FastAPI",
                "description": "Charla introductoria sobre FastAPI",
                "start_time": "2026-11-01T10:00:00",
                "end_time": "2026-11-01T11:00:00",
                "capacity": 50,
            }
        }
    )

    speaker_id: int
    title: str
    description: str | None = None
    start_time: datetime
    end_time: datetime
    capacity: int = Field(gt=0)

    @field_validator("start_time", "end_time", mode="after")
    @classmethod
    def normalize_timezone(cls, value: datetime) -> datetime:
        return ensure_aware_utc(value)

    @model_validator(mode="after")
    def validate_date_range(self) -> Self:
        if self.end_time <= self.start_time:
            raise ValueError(
                "La fecha fin no puede ser menor o igual a la fecha de inicio de la sesión"
            )

        return self


class SessionUpdate(BaseModel):
    speaker_id: int | None = None
    title: str | None = None
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    capacity: int | None = Field(gt=0, default=None)

    @field_validator("start_time", "end_time", mode="after")
    @classmethod
    def normalize_timezone(cls, value: datetime | None) -> datetime | None:
        return ensure_aware_utc(value) if value is not None else None


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    speaker_id: int
    event_id: int
    title: str
    description: str | None = None
    start_time: datetime
    end_time: datetime
    capacity: int


class SessionListResponse(BaseModel):
    items: list[SessionRead]
    total: int
    page: int
    page_size: int
