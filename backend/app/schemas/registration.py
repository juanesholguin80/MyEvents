from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import RegistrationStatusEnum
from app.schemas.event import EventRead


class RegistrationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    event_id: int
    status: RegistrationStatusEnum
    registered_at: datetime


class RegistrationWithEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: RegistrationStatusEnum
    registered_at: datetime
    event: EventRead


class MyRegistrationsResponse(BaseModel):
    items: list[RegistrationWithEventRead]
    total: int
    page: int
    page_size: int
