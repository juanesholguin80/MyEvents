from sqlmodel import Session

from app.models.speaker import Speaker
from app.repositories import speaker_repo, session_repo
from app.schemas.speaker import (
    SpeakerCreate,
    SpeakerUpdate,
    SpeakerRead,
    SpeakerListResponse,
)
from app.core.exceptions import NotFoundError, ConflictError


class SpeakerNotFoundError(NotFoundError):
    code = "SPEAKER_NOT_FOUND"


class SpeakerInUseError(ConflictError):
    code = "SPEAKER_IN_USE"


def create_speaker(session: Session, data: SpeakerCreate) -> Speaker:
    new_speaker = Speaker(
        full_name=data.full_name,
        bio=data.bio,
        email=data.email,
    )

    created = speaker_repo.create(session, new_speaker)
    session.commit()

    return created


def get_speaker(session: Session, speaker_id: int) -> Speaker:
    speaker = speaker_repo.get_by_id(session, speaker_id)
    if not speaker:
        raise SpeakerNotFoundError("Ponente no encontrado")

    return speaker


def update_speaker(session: Session, speaker_id: int, data: SpeakerUpdate) -> Speaker:
    speaker = get_speaker(session, speaker_id)

    update_fields = data.model_dump(exclude_unset=True)
    updated = speaker_repo.update(session, speaker, update_fields)
    session.commit()

    return updated


def delete_speaker(session: Session, speaker_id: int) -> None:
    speaker = get_speaker(session, speaker_id)

    if session_repo.count_by_speaker(session, speaker_id) > 0:
        raise SpeakerInUseError("El ponente tiene sesiones asociadas")

    speaker_repo.delete(session, speaker)
    session.commit()


def list_speakers(
    session: Session, name: str | None, page: int, page_size: int
) -> SpeakerListResponse:
    offset = (page - 1) * page_size

    speakers = speaker_repo.list_with_filters(session, name, page_size, offset)
    total = speaker_repo.count_with_filters(session, name)

    items = [SpeakerRead.model_validate(s) for s in speakers]

    return SpeakerListResponse(
        items=items, total=total, page=page, page_size=page_size
    )
