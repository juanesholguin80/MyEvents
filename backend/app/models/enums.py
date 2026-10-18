from enum import Enum


class RoleEnum(str, Enum):
    ADMIN = "admin"
    ORGANIZER = "organizador"
    ASSISTANT = "asistente"


class EventStatusEnum(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"
    FINISHED = "finished"


class RegistrationStatusEnum(str, Enum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
