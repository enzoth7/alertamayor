from datetime import datetime
from urllib.parse import urlsplit

from geoalchemy2.elements import WKTElement
from sqlalchemy.orm import Session

from app.audit import append_audit_event
from app.deduplication import CandidateIdentity, find_duplicate
from app.enums import Classification, SourceType
from app.models import Candidate, CandidateSource, ReviewItem
from app.normalization import normalize_fields
from app.services.matching import match_candidate

_SOCIAL_DOMAINS = ("facebook.com", "instagram.com")
_GOOGLE_DOMAINS = ("google.com", "google.com.uy", "goo.gl")


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _source_host(url: str) -> str:
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Evidence URL must be HTTP(S)")
    return parsed.hostname.lower()


def _belongs_to(host: str, domains: tuple[str, ...]) -> bool:
    return any(host == domain or host.endswith(f".{domain}") for domain in domains)


def create_manual_candidate(
    session: Session,
    *,
    source_url: str,
    retrieved_at: datetime,
    actor: str,
    human_observation: str | None = None,
    business_name: str | None = None,
    address: str | None = None,
    department: str | None = None,
    phone: str | None = None,
    website: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> tuple[Candidate, bool]:
    normalized = normalize_fields(
        name=business_name,
        address=address,
        phone=phone,
        website=website,
    )
    duplicate = find_duplicate(
        session,
        CandidateIdentity(
            normalized_name=normalized.name,
            normalized_address=normalized.address,
            normalized_phone=normalized.phone,
            normalized_domain=normalized.domain,
            source_url=source_url,
        ),
    )
    if duplicate is not None:
        return (
            enrich_candidate(
                session,
                candidate=duplicate,
                source_url=source_url,
                retrieved_at=retrieved_at,
                actor=actor,
                human_observation=human_observation,
                business_name=business_name,
                address=address,
                department=department,
                phone=phone,
                website=website,
                latitude=latitude,
                longitude=longitude,
            ),
            False,
        )

    candidate = Candidate(
        classification=Classification.HUMAN_REVIEW_REQUIRED,
        suggested_classification=Classification.INSUFFICIENT_INFORMATION,
    )
    session.add(candidate)
    session.flush()
    session.add(ReviewItem(candidate_id=candidate.id))
    append_audit_event(
        session,
        event_type="CANDIDATE_CREATED_MANUALLY",
        actor=actor,
        entity_type="candidate",
        entity_id=candidate.id,
        payload={
            "source_url": source_url,
            "retrieved_at": retrieved_at.isoformat(),
        },
    )
    enriched = enrich_candidate(
        session,
        candidate=candidate,
        source_url=source_url,
        retrieved_at=retrieved_at,
        actor=actor,
        human_observation=human_observation,
        business_name=business_name,
        address=address,
        department=department,
        phone=phone,
        website=website,
        latitude=latitude,
        longitude=longitude,
    )
    return enriched, True


def enrich_candidate(
    session: Session,
    *,
    candidate: Candidate,
    source_url: str,
    retrieved_at: datetime,
    actor: str,
    human_observation: str | None = None,
    business_name: str | None = None,
    address: str | None = None,
    department: str | None = None,
    phone: str | None = None,
    website: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> Candidate:
    if retrieved_at.tzinfo is None or retrieved_at.utcoffset() is None:
        raise ValueError("retrieved_at must include a timezone offset")
    host = _source_host(source_url)
    cleaned_values = {
        "business_name": _clean(business_name),
        "address": _clean(address),
        "department": _clean(department),
        "phone": _clean(phone),
        "website": _clean(website),
    }
    has_structured_update = any(value is not None for value in cleaned_values.values()) or any(
        value is not None for value in (latitude, longitude)
    )
    if _belongs_to(host, _GOOGLE_DOMAINS):
        raise ValueError("Use the manual place_id endpoint for Google Maps evidence")
    if _belongs_to(host, _SOCIAL_DOMAINS) and has_structured_update:
        raise ValueError(
            "Facebook/Instagram evidence may initially store only URL, retrieval date, "
            "and a human observation"
        )
    if (latitude is None) != (longitude is None):
        raise ValueError("Latitude and longitude must be supplied together")
    if (
        latitude is not None
        and longitude is not None
        and not (-35.5 <= latitude <= -30.0 and -59.0 <= longitude <= -52.5)
    ):
        raise ValueError("Coordinates must fall within the configured Uruguay bounds")

    changed_fields: list[str] = []
    for field, value in cleaned_values.items():
        if value is not None and getattr(candidate, field) != value:
            setattr(candidate, field, value)
            changed_fields.append(field)
    if latitude is not None and longitude is not None:
        candidate.latitude = latitude
        candidate.longitude = longitude
        candidate.location = WKTElement(f"POINT({longitude} {latitude})", srid=4326)
        changed_fields.extend(("latitude", "longitude"))

    normalized = normalize_fields(
        name=candidate.business_name,
        address=candidate.address,
        phone=candidate.phone,
        website=candidate.website,
    )
    if cleaned_values["phone"] is not None and normalized.phone is None:
        raise ValueError("Institutional phone could not be normalized")
    if cleaned_values["website"] is not None and normalized.domain is None:
        raise ValueError("Institutional website must contain a valid domain")
    if normalized.domain and (
        _belongs_to(normalized.domain, _SOCIAL_DOMAINS)
        or _belongs_to(normalized.domain, _GOOGLE_DOMAINS)
    ):
        raise ValueError("Social and Google URLs cannot be stored as an institutional website")
    candidate.normalized_name = normalized.name
    candidate.normalized_address = normalized.address
    candidate.normalized_phone = normalized.phone
    candidate.normalized_domain = normalized.domain
    source = CandidateSource(
        candidate_id=candidate.id,
        source_type=SourceType.MANUAL,
        source_url=source_url,
        search_query=None,
        retrieved_at=retrieved_at,
        human_observation=_clean(human_observation),
        source_metadata={"fields_updated": changed_fields},
    )
    session.add(source)
    append_audit_event(
        session,
        event_type="CANDIDATE_ENRICHED_BY_HUMAN",
        actor=actor,
        entity_type="candidate",
        entity_id=candidate.id,
        payload={
            "source_url": source_url,
            "retrieved_at": retrieved_at.isoformat(),
            "fields_updated": changed_fields,
            "social_url_only_policy": _belongs_to(host, _SOCIAL_DOMAINS),
        },
    )
    match_candidate(session, candidate, actor=actor)
    session.commit()
    return candidate
