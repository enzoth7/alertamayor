import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models import AuditEvent

_AUDIT_LOCK_ID = 4_858_154_297


def _event_digest(
    *,
    event_type: str,
    actor: str,
    entity_type: str,
    entity_id: str,
    occurred_at: datetime,
    payload: dict[str, Any],
    previous_hash: str | None,
) -> str:
    canonical = json.dumps(
        {
            "event_type": event_type,
            "actor": actor,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "occurred_at": occurred_at.isoformat(),
            "payload": payload,
            "previous_hash": previous_hash,
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def append_audit_event(
    session: Session,
    *,
    event_type: str,
    actor: str,
    entity_type: str,
    entity_id: str | uuid.UUID,
    payload: dict[str, Any],
) -> AuditEvent:
    # Flush any preceding event so each event in this transaction points to the
    # immediately preceding persisted hash, rather than creating parallel links.
    session.flush()
    # The transaction-scoped PostgreSQL lock serializes concurrent local writers.
    session.execute(text("SELECT pg_advisory_xact_lock(:lock_id)"), {"lock_id": _AUDIT_LOCK_ID})
    occurred_at = datetime.now(UTC)
    previous_hash = session.scalar(
        select(AuditEvent.event_hash)
        .order_by(AuditEvent.occurred_at.desc(), AuditEvent.id.desc())
        .limit(1)
    )
    event_hash = _event_digest(
        event_type=event_type,
        actor=actor,
        entity_type=entity_type,
        entity_id=str(entity_id),
        occurred_at=occurred_at,
        payload=payload,
        previous_hash=previous_hash,
    )
    audit_event = AuditEvent(
        event_type=event_type,
        actor=actor,
        entity_type=entity_type,
        entity_id=str(entity_id),
        occurred_at=occurred_at,
        payload=payload,
        previous_hash=previous_hash,
        event_hash=event_hash,
    )
    session.add(audit_event)
    return audit_event


def verify_audit_chain(session: Session) -> tuple[bool, int, str | None]:
    events = session.scalars(
        select(AuditEvent).order_by(AuditEvent.occurred_at.asc(), AuditEvent.id.asc())
    ).all()
    previous_hash: str | None = None
    for index, audit_event in enumerate(events, start=1):
        calculated = _event_digest(
            event_type=audit_event.event_type,
            actor=audit_event.actor,
            entity_type=audit_event.entity_type,
            entity_id=audit_event.entity_id,
            occurred_at=audit_event.occurred_at,
            payload=audit_event.payload,
            previous_hash=audit_event.previous_hash,
        )
        if audit_event.previous_hash != previous_hash or audit_event.event_hash != calculated:
            return False, index, str(audit_event.id)
        previous_hash = audit_event.event_hash
    return True, len(events), None
