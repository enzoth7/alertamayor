import csv
import io
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.audit import append_audit_event
from app.models import Candidate, ReviewItem


def _spreadsheet_safe(value: Any) -> Any:
    if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r", "\n")):
        return f"'{value}"
    return value


def review_export_rows(session: Session) -> list[dict[str, Any]]:
    candidates = session.scalars(
        select(Candidate)
        .options(
            selectinload(Candidate.sources),
            selectinload(Candidate.comparisons),
            selectinload(Candidate.review_item),
        )
        .order_by(Candidate.discovered_at.desc())
    ).all()
    rows: list[dict[str, Any]] = []
    for candidate in candidates:
        review: ReviewItem | None = candidate.review_item
        rows.append(
            {
                "candidate_id": str(candidate.id),
                "business_name": candidate.business_name,
                "address": candidate.address,
                "department": candidate.department,
                "phone": candidate.phone,
                "website": candidate.website,
                "latitude": candidate.latitude,
                "longitude": candidate.longitude,
                "classification": candidate.classification.value,
                "suggested_classification": candidate.suggested_classification.value,
                "evidence_level": candidate.evidence_level.value,
                "review_state": review.state.value if review else None,
                "reviewer": review.reviewer if review else None,
                "review_notes": review.notes if review else None,
                "discovered_at": candidate.discovered_at.isoformat(),
                "source_urls": [source.source_url for source in candidate.sources],
                "source_retrieved_at": [
                    source.retrieved_at.isoformat() for source in candidate.sources
                ],
                "top_match_score": (
                    str(
                        max(
                            comparison.score
                            for comparison in candidate.comparisons
                            if comparison.is_current
                        )
                    )
                    if any(comparison.is_current for comparison in candidate.comparisons)
                    else None
                ),
            }
        )
    return rows


def export_json(session: Session, *, actor: str) -> bytes:
    rows = review_export_rows(session)
    append_audit_event(
        session,
        event_type="PRIVATE_REVIEW_EXPORT_CREATED",
        actor=actor,
        entity_type="review_queue",
        entity_id="all",
        payload={"format": "JSON", "row_count": len(rows)},
    )
    session.commit()
    return json.dumps(rows, ensure_ascii=False, indent=2).encode("utf-8")


def export_csv(session: Session, *, actor: str) -> bytes:
    rows = review_export_rows(session)
    output = io.StringIO(newline="")
    fieldnames = list(rows[0]) if rows else ["candidate_id"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        encoded = {key: _spreadsheet_safe(value) for key, value in row.items()}
        encoded["source_urls"] = " | ".join(row["source_urls"])
        encoded["source_retrieved_at"] = " | ".join(row["source_retrieved_at"])
        writer.writerow(encoded)
    append_audit_event(
        session,
        event_type="PRIVATE_REVIEW_EXPORT_CREATED",
        actor=actor,
        entity_type="review_queue",
        entity_id="all",
        payload={"format": "CSV", "row_count": len(rows)},
    )
    session.commit()
    return ("\ufeff" + output.getvalue()).encode("utf-8")
