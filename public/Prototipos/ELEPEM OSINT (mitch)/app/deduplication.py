from dataclasses import dataclass
from difflib import SequenceMatcher

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Candidate, CandidateSource


@dataclass(frozen=True, slots=True)
class CandidateIdentity:
    normalized_name: str | None
    normalized_address: str | None
    normalized_phone: str | None
    normalized_domain: str | None
    source_url: str | None = None


def find_duplicate(session: Session, identity: CandidateIdentity) -> Candidate | None:
    if identity.source_url:
        existing_source = session.scalar(
            select(CandidateSource)
            .where(CandidateSource.source_url == identity.source_url)
            .limit(1)
        )
        if existing_source is not None:
            return existing_source.candidate

    if identity.normalized_phone:
        phone_match = session.scalar(
            select(Candidate)
            .where(Candidate.normalized_phone == identity.normalized_phone)
            .limit(1)
        )
        if phone_match is not None:
            return phone_match
    if identity.normalized_domain:
        domain_matches = session.scalars(
            select(Candidate)
            .where(Candidate.normalized_domain == identity.normalized_domain)
            .limit(20)
        )
        for domain_match in domain_matches:
            if identity.normalized_name and domain_match.normalized_name:
                similarity = SequenceMatcher(
                    None, identity.normalized_name, domain_match.normalized_name
                ).ratio()
                if similarity >= 0.85:
                    return domain_match

    if not identity.normalized_name:
        return None
    candidates = session.scalars(
        select(Candidate).where(Candidate.normalized_name == identity.normalized_name).limit(20)
    )
    for candidate in candidates:
        if not identity.normalized_address or not candidate.normalized_address:
            continue
        similarity = SequenceMatcher(
            None, identity.normalized_address, candidate.normalized_address
        ).ratio()
        if similarity >= 0.9:
            return candidate
    return None
