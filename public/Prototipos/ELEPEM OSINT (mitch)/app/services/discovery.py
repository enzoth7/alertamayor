from datetime import UTC, datetime
from urllib.parse import urlsplit

import httpx
from sqlalchemy.orm import Session

from app.audit import append_audit_event
from app.collectors.brave import BraveSearchCollector, BraveSearchHit, BraveSearchResult
from app.collectors.google_places import GooglePlaceLink
from app.deduplication import CandidateIdentity, find_duplicate
from app.enums import Classification, SourceType
from app.models import Candidate, CandidateSource, CollectionRun, ReviewItem
from app.normalization import normalize_fields
from app.services.matching import match_candidate

_SOCIAL_DOMAINS = ("facebook.com", "instagram.com")
_GOOGLE_DOMAINS = ("google.com", "google.com.uy", "goo.gl")


class BraveProviderError(RuntimeError):
    def __init__(self, http_status: int) -> None:
        super().__init__(f"Brave Search API returned HTTP {http_status}")
        self.http_status = http_status


def _host(url: str) -> str | None:
    try:
        parsed = urlsplit(url)
    except ValueError:
        return None
    if parsed.scheme not in {"http", "https"}:
        return None
    return parsed.hostname.lower() if parsed.hostname else None


def _belongs_to(host: str, domains: tuple[str, ...]) -> bool:
    return any(host == domain or host.endswith(f".{domain}") for domain in domains)


def _create_or_merge_candidate(
    session: Session,
    *,
    hit: BraveSearchHit,
    result: BraveSearchResult,
    actor: str,
) -> tuple[Candidate | None, bool]:
    host = _host(hit.url)
    if host is None or _belongs_to(host, _GOOGLE_DOMAINS):
        return None, False
    social = _belongs_to(host, _SOCIAL_DOMAINS)
    business_name = None if social else (hit.title[:500] or None)
    website = None if social else hit.url
    normalized = normalize_fields(name=business_name, address=None, phone=None, website=website)
    identity = CandidateIdentity(
        normalized_name=normalized.name,
        normalized_address=None,
        normalized_phone=None,
        normalized_domain=normalized.domain,
        source_url=hit.url,
    )
    candidate = find_duplicate(session, identity)
    created = candidate is None
    if candidate is None:
        candidate = Candidate(
            business_name=business_name,
            normalized_name=normalized.name,
            website=website,
            normalized_domain=normalized.domain,
            classification=Classification.HUMAN_REVIEW_REQUIRED,
            suggested_classification=Classification.INSUFFICIENT_INFORMATION,
        )
        session.add(candidate)
        session.flush()
        session.add(ReviewItem(candidate_id=candidate.id))
    metadata = {} if social else {"title": hit.title}
    session.add(
        CandidateSource(
            candidate_id=candidate.id,
            source_type=SourceType.BRAVE_SEARCH,
            source_url=hit.url,
            search_query=result.query,
            retrieved_at=result.retrieved_at,
            human_observation=None,
            source_metadata=metadata,
        )
    )
    append_audit_event(
        session,
        event_type="CANDIDATE_DISCOVERED" if created else "CANDIDATE_SOURCE_ADDED",
        actor=actor,
        entity_type="candidate",
        entity_id=candidate.id,
        payload={
            "source_type": SourceType.BRAVE_SEARCH.value,
            "source_url": hit.url,
            "search_query": result.query,
            "retrieved_at": result.retrieved_at.isoformat(),
            "social_metadata_restricted": social,
        },
    )
    match_candidate(session, candidate, actor=actor)
    return candidate, created


async def discover_with_brave(
    session: Session,
    collector: BraveSearchCollector,
    *,
    query: str,
    count: int,
    actor: str,
) -> tuple[int, int, BraveSearchResult]:
    try:
        result = await collector.search(query, count=count)
    except httpx.HTTPError as exc:
        retrieved_at = datetime.now(UTC)
        request = getattr(exc, "request", None)
        failed_run = CollectionRun(
            provider="BRAVE_SEARCH",
            query=query.strip(),
            request_url=str(request.url) if request is not None else collector.endpoint,
            retrieved_at=retrieved_at,
            http_status=0,
            result_count=0,
        )
        session.add(failed_run)
        session.flush()
        append_audit_event(
            session,
            event_type="BRAVE_SEARCH_FAILED",
            actor=actor,
            entity_type="collection_run",
            entity_id=failed_run.id,
            payload={
                "query": query.strip(),
                "retrieved_at": retrieved_at.isoformat(),
                "http_status": 0,
            },
        )
        session.commit()
        raise
    collection_run = CollectionRun(
        provider="BRAVE_SEARCH",
        query=result.query,
        request_url=result.request_url,
        retrieved_at=result.retrieved_at,
        http_status=result.http_status,
        result_count=len(result.hits),
    )
    session.add(collection_run)
    session.flush()
    append_audit_event(
        session,
        event_type="BRAVE_SEARCH_COMPLETED" if result.http_status < 400 else "BRAVE_SEARCH_FAILED",
        actor=actor,
        entity_type="collection_run",
        entity_id=collection_run.id,
        payload={
            "query": result.query,
            "retrieved_at": result.retrieved_at.isoformat(),
            "http_status": result.http_status,
            "result_count": len(result.hits),
        },
    )
    if result.http_status >= 400:
        session.commit()
        raise BraveProviderError(result.http_status)
    created = 0
    linked = 0
    for hit in result.hits:
        candidate, was_created = _create_or_merge_candidate(
            session, hit=hit, result=result, actor=actor
        )
        if candidate is not None:
            linked += 1
            created += int(was_created)
    session.commit()
    return created, linked, result


def attach_google_place_link(
    session: Session,
    *,
    candidate: Candidate,
    place: GooglePlaceLink,
    actor: str,
) -> CandidateSource:
    source = CandidateSource(
        candidate_id=candidate.id,
        source_type=SourceType.GOOGLE_PLACE_LINK,
        source_url=place.google_maps_url,
        search_query=None,
        external_identifier=place.place_id,
        retrieved_at=place.retrieved_at,
        human_observation=None,
        source_metadata={"place_id": place.place_id},
    )
    session.add(source)
    append_audit_event(
        session,
        event_type="GOOGLE_PLACE_LINKED",
        actor=actor,
        entity_type="candidate",
        entity_id=candidate.id,
        payload={
            "place_id": place.place_id,
            "google_maps_url": place.google_maps_url,
            "retrieved_at": place.retrieved_at.isoformat(),
        },
    )
    session.commit()
    return source
