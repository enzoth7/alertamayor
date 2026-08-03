from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit import append_audit_event
from app.enums import Classification
from app.matching import MatchableEntity, assess_match, has_minimum_matching_information
from app.models import Candidate, MatchComparison, OfficialRegistryRecord, RegistryImport


def _candidate_entity(candidate: Candidate) -> MatchableEntity:
    return MatchableEntity(
        name=candidate.normalized_name,
        address=candidate.normalized_address,
        phone=candidate.normalized_phone,
        domain=candidate.normalized_domain,
        latitude=candidate.latitude,
        longitude=candidate.longitude,
    )


def _official_entity(record: OfficialRegistryRecord) -> MatchableEntity:
    return MatchableEntity(
        name=record.normalized_name,
        address=record.normalized_address,
        phone=record.normalized_phone,
        domain=record.normalized_domain,
        latitude=record.latitude,
        longitude=record.longitude,
    )


def match_candidate(session: Session, candidate: Candidate, *, actor: str) -> Classification:
    all_imports = session.scalars(
        select(RegistryImport).order_by(
            RegistryImport.source_url.asc(),
            RegistryImport.retrieved_at.desc(),
            RegistryImport.imported_at.desc(),
        )
    ).all()
    latest_by_source: dict[str, RegistryImport] = {}
    for registry_import in all_imports:
        latest_by_source.setdefault(registry_import.source_url, registry_import)
    active_imports = list(latest_by_source.values())
    existing_comparisons = session.scalars(
        select(MatchComparison).where(MatchComparison.candidate_id == candidate.id)
    ).all()
    for existing_comparison in existing_comparisons:
        existing_comparison.is_current = False
    entity = _candidate_entity(candidate)
    if not active_imports or not has_minimum_matching_information(entity):
        candidate.suggested_classification = Classification.INSUFFICIENT_INFORMATION
        append_audit_event(
            session,
            event_type="CANDIDATE_MATCHED",
            actor=actor,
            entity_type="candidate",
            entity_id=candidate.id,
            payload={
                "recommendation": candidate.suggested_classification.value,
                "registry_import_ids": [str(item.id) for item in active_imports],
                "reason": "no_registry"
                if not active_imports
                else "insufficient_candidate_information",
            },
        )
        return candidate.suggested_classification

    official_records = session.scalars(
        select(OfficialRegistryRecord).where(
            OfficialRegistryRecord.registry_import_id.in_([item.id for item in active_imports])
        )
    ).all()
    assessments = [
        (record, assess_match(entity, _official_entity(record), record.official_status))
        for record in official_records
    ]
    assessments.sort(key=lambda pair: pair[1].score, reverse=True)
    retained = [pair for pair in assessments[:5] if pair[1].score >= 0.35]
    for record, assessment in retained:
        comparison = session.scalar(
            select(MatchComparison).where(
                MatchComparison.candidate_id == candidate.id,
                MatchComparison.official_record_id == record.id,
            )
        )
        if comparison is None:
            comparison = MatchComparison(
                candidate_id=candidate.id,
                official_record_id=record.id,
                score=Decimal(str(assessment.score)),
                signals=assessment.signals,
                recommended_classification=assessment.recommendation,
                is_current=True,
            )
            session.add(comparison)
        else:
            comparison.score = Decimal(str(assessment.score))
            comparison.signals = assessment.signals
            comparison.recommended_classification = assessment.recommendation
            comparison.is_current = True

    if not assessments or assessments[0][1].recommendation is Classification.NOT_MATCHED:
        recommendation = Classification.NOT_MATCHED
    else:
        recommendation = assessments[0][1].recommendation
    candidate.suggested_classification = recommendation
    append_audit_event(
        session,
        event_type="CANDIDATE_MATCHED",
        actor=actor,
        entity_type="candidate",
        entity_id=candidate.id,
        payload={
            "recommendation": recommendation.value,
            "registry_snapshots": [
                {
                    "registry_import_id": str(item.id),
                    "source_url": item.source_url,
                    "retrieved_at": item.retrieved_at.isoformat(),
                }
                for item in active_imports
            ],
            "top_matches": [
                {
                    "official_record_id": str(record.id),
                    "score": assessment.score,
                    "recommendation": assessment.recommendation.value,
                    "signals": assessment.signals,
                }
                for record, assessment in retained
            ],
        },
    )
    return recommendation


def match_all_pending(session: Session, *, actor: str) -> int:
    candidates = session.scalars(select(Candidate)).all()
    for candidate in candidates:
        match_candidate(session, candidate, actor=actor)
    session.commit()
    return len(candidates)
