from pydantic import BaseModel, EmailStr, ConfigDict


class SpeakerCreate(BaseModel):
    full_name: str
    bio: str | None = None
    email: EmailStr


class SpeakerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    bio: str | None = None
    email: str


class SpeakerUpdate(BaseModel):
    full_name: str | None = None
    bio: str | None = None
    email: EmailStr | None = None


class SpeakerListResponse(BaseModel):
    items: list[SpeakerRead]
    total: int
    page: int
    page_size: int
