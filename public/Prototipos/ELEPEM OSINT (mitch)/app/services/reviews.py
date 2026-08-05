import hashlib
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.audit import append_audit_event
from app.enums import Classification, EvidenceLevel, ReviewState
from app.models import ReviewItem


def complete_review(
    session: Session,
    *,
    item: ReviewItem,
    classification: Classification,
    evidence_level: EvidenceLevel,
    reviewer: str,
    notes: str,
) -> ReviewItem:
    if classification is Classification.HUMAN_REVIEW_REQUIRED:
        item.state = ReviewState.IN_REVIEW
    else:
        item.state = ReviewState.COMPLETED
    item.reviewer = reviewer.strip()
    item.notes = notes.strip()
    item.reviewed_at = datetime.now(UTC)
    item.candidate.classification = classification
    item.candidate.evidence_level = evidence_level
    append_audit_event(
        session,
        event_type="HUMAN_REVIEW_RECORDED",
        actor=item.reviewer,
        entity_type="candidate",
        entity_id=item.candidate_id,
        payload={
            "classification": classification.value,
            "evidence_level": evidence_level.value,
            "review_state": item.state.value,
            "notes_sha256": hashlib.sha256(item.notes.encode("utf-8")).hexdigest(),
        },
    )
    session.commit()
    return item


def eligible_for_future_publication(item: ReviewItem) -> bool:
    return (
        item.state is ReviewState.COMPLETED
        and item.candidate.evidence_level in (EvidenceLevel.A, EvidenceLevel.B)
        and item.candidate.classification
        in (Classification.MATCHED_HABILITATED, Classification.MATCHED_IN_PROCESS)
    )
