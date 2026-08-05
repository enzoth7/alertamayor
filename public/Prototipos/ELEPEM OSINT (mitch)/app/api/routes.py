import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.audit import verify_audit_chain
from app.collectors.brave import BraveSearchCollector, CollectorConfigurationError
from app.collectors.google_places import GooglePlacesCollector
from app.config import Settings, get_settings
from app.db import get_session
from app.enums import Classification, EvidenceLevel, ImportFormat
from app.importers.official import RegistryImportError, import_official_registry
from app.models import Candidate, ReviewItem
from app.schemas import (
    AuditVerificationResponse,
    BraveDiscoveryRequest,
    BraveDiscoveryResponse,
    CandidateEnrichment,
    CandidateResponse,
    CountResponse,
    GooglePlaceRequest,
    GooglePlaceResponse,
    ManualCandidateCreate,
    ManualCandidateResponse,
    RegistryImportResponse,
    ReviewDecision,
    ReviewItemResponse,
)
from app.services.candidates import create_manual_candidate, enrich_candidate
from app.services.discovery import BraveProviderError, attach_google_place_link, discover_with_brave
from app.services.exports import export_csv, export_json
from app.services.matching import match_all_pending
from app.services.reviews import complete_review, eligible_for_future_publication

router = APIRouter()
templates = Jinja2Templates(directory=Path(__file__).resolve().parents[1] / "templates")
SessionDependency = Annotated[Session, Depends(get_session)]
SettingsDependency = Annotated[Settings, Depends(get_settings)]


@router.get("/health/live")
def liveness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
def readiness(session: SessionDependency) -> dict[str, str]:
    try:
        postgis_version = session.scalar(text("SELECT postgis_version()"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="database unavailable"
        ) from exc
    return {"status": "ready", "database": "ok", "postgis": str(postgis_version)}


@router.post("/api/discovery/brave", response_model=BraveDiscoveryResponse)
async def brave_discovery(
    body: BraveDiscoveryRequest,
    session: SessionDependency,
    settings: SettingsDependency,
) -> BraveDiscoveryResponse:
    try:
        collector = BraveSearchCollector(
            settings.brave_search_api_key, timeout=settings.http_timeout_seconds
        )
        created, linked, result = await discover_with_brave(
            session,
            collector,
            query=body.query,
            count=body.count,
            actor=body.actor,
        )
    except CollectorConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except BraveProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Brave API request failed with HTTP {exc.http_status}",
        ) from exc
    except httpx.HTTPError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Brave API request failed"
        ) from exc
    return BraveDiscoveryResponse(
        query=result.query,
        retrieved_at=result.retrieved_at,
        api_results=len(result.hits),
        candidates_created=created,
        sources_linked=linked,
    )


@router.post(
    "/api/candidates/{candidate_id}/google-place",
    response_model=GooglePlaceResponse,
)
async def link_google_place(
    candidate_id: uuid.UUID,
    body: GooglePlaceRequest,
    session: SessionDependency,
    settings: SettingsDependency,
) -> GooglePlaceResponse:
    candidate = session.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="candidate not found")
    try:
        collector = GooglePlacesCollector(
            settings.google_places_api_key, timeout=settings.http_timeout_seconds
        )
        place = await collector.resolve_manual_place_id(body.place_id)
        attach_google_place_link(session, candidate=candidate, place=place, actor=body.actor)
    except CollectorConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except httpx.HTTPError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Google Places API request failed"
        ) from exc
    return GooglePlaceResponse(
        candidate_id=candidate.id,
        place_id=place.place_id,
        google_maps_url=place.google_maps_url,
        retrieved_at=place.retrieved_at,
    )


@router.post("/api/candidates/manual", response_model=ManualCandidateResponse)
def manual_candidate_create(
    body: ManualCandidateCreate,
    session: SessionDependency,
) -> ManualCandidateResponse:
    try:
        candidate, created = create_manual_candidate(
            session,
            source_url=str(body.source_url),
            retrieved_at=body.retrieved_at,
            actor=body.actor,
            human_observation=body.human_observation,
            business_name=body.business_name,
            address=body.address,
            department=body.department,
            phone=body.phone,
            website=body.website,
            latitude=body.latitude,
            longitude=body.longitude,
        )
    except ValueError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    candidate_data = CandidateResponse.model_validate(candidate).model_dump()
    return ManualCandidateResponse(**candidate_data, created=created)


@router.post("/api/candidates/{candidate_id}/enrichment", response_model=CandidateResponse)
def candidate_enrichment(
    candidate_id: uuid.UUID,
    body: CandidateEnrichment,
    session: SessionDependency,
) -> Candidate:
    candidate = session.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="candidate not found")
    try:
        return enrich_candidate(
            session,
            candidate=candidate,
            source_url=str(body.source_url),
            retrieved_at=body.retrieved_at,
            actor=body.actor,
            human_observation=body.human_observation,
            business_name=body.business_name,
            address=body.address,
            department=body.department,
            phone=body.phone,
            website=body.website,
            latitude=body.latitude,
            longitude=body.longitude,
        )
    except ValueError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.post("/api/registry/import", response_model=RegistryImportResponse)
async def registry_import(
    session: SessionDependency,
    upload: Annotated[UploadFile, File()],
    source_format: Annotated[ImportFormat, Form()],
    source_url: Annotated[str, Form(min_length=8, max_length=2000)],
    retrieved_at: Annotated[datetime, Form()],
    actor: Annotated[str, Form(min_length=1, max_length=200)],
) -> RegistryImportResponse:
    if not source_url.startswith(("https://", "http://")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="source_url must be HTTP(S)"
        )
    data = await upload.read(20 * 1024 * 1024 + 1)
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="file exceeds 20 MiB"
        )
    try:
        imported = import_official_registry(
            session,
            data=data,
            source_filename=upload.filename or "upload",
            source_format=source_format,
            source_url=source_url,
            retrieved_at=retrieved_at,
            actor=actor,
        )
    except RegistryImportError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return RegistryImportResponse(
        id=imported.id,
        source_url=imported.source_url,
        source_format=imported.source_format,
        retrieved_at=imported.retrieved_at,
        sha256=imported.sha256,
        row_count=imported.row_count,
    )


@router.post("/api/matching/run", response_model=CountResponse)
def run_matching(session: SessionDependency) -> CountResponse:
    return CountResponse(count=match_all_pending(session, actor="local-operator"))


@router.get("/api/audit/verify", response_model=AuditVerificationResponse)
def audit_verification(session: SessionDependency) -> AuditVerificationResponse:
    valid, event_count, failing_event_id = verify_audit_chain(session)
    return AuditVerificationResponse(
        valid=valid,
        event_count=event_count,
        failing_event_id=failing_event_id,
    )


@router.post("/api/reviews/{review_id}", response_model=ReviewItemResponse)
def record_review(
    review_id: uuid.UUID, body: ReviewDecision, session: SessionDependency
) -> ReviewItem:
    item = session.scalar(
        select(ReviewItem)
        .options(joinedload(ReviewItem.candidate))
        .where(ReviewItem.id == review_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="review item not found")
    return complete_review(
        session,
        item=item,
        classification=body.classification,
        evidence_level=body.evidence_level,
        reviewer=body.reviewer,
        notes=body.notes,
    )


@router.get("/exports/review-queue.json")
def download_json(session: SessionDependency, actor: str = "local-operator") -> Response:
    return Response(
        content=export_json(session, actor=actor),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=review-queue.json"},
    )


@router.get("/exports/review-queue.csv")
def download_csv(session: SessionDependency, actor: str = "local-operator") -> Response:
    return Response(
        content=export_csv(session, actor=actor),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=review-queue.csv"},
    )


@router.get("/", response_class=HTMLResponse)
def home(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request=request, name="home.html", context={})


@router.post("/candidates/manual")
def manual_candidate_create_form(
    session: SessionDependency,
    source_url: Annotated[str, Form(min_length=8, max_length=2000)],
    actor: Annotated[str, Form(min_length=1, max_length=200)],
    human_observation: Annotated[str | None, Form(max_length=1000)] = None,
    business_name: Annotated[str | None, Form(max_length=500)] = None,
    address: Annotated[str | None, Form(max_length=1000)] = None,
    department: Annotated[str | None, Form(max_length=100)] = None,
    phone: Annotated[str | None, Form(max_length=40)] = None,
    website: Annotated[str | None, Form(max_length=2000)] = None,
) -> RedirectResponse:
    try:
        candidate, _ = create_manual_candidate(
            session,
            source_url=source_url,
            retrieved_at=datetime.now(UTC),
            actor=actor,
            human_observation=human_observation,
            business_name=business_name,
            address=address,
            department=department,
            phone=phone,
            website=website,
        )
    except ValueError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    if candidate.review_item is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="candidate review item was not created",
        )
    return RedirectResponse(
        url=f"/review/{candidate.review_item.id}", status_code=status.HTTP_303_SEE_OTHER
    )


@router.get("/review", response_class=HTMLResponse)
def review_queue(request: Request, session: SessionDependency) -> HTMLResponse:
    items = session.scalars(
        select(ReviewItem)
        .options(joinedload(ReviewItem.candidate))
        .order_by(ReviewItem.state.asc(), ReviewItem.created_at.asc())
    ).all()
    return templates.TemplateResponse(
        request=request,
        name="review_queue.html",
        context={"items": items},
    )


@router.get("/review/{review_id}", response_class=HTMLResponse)
def review_detail(
    review_id: uuid.UUID, request: Request, session: SessionDependency
) -> HTMLResponse:
    item = session.scalar(
        select(ReviewItem)
        .options(
            joinedload(ReviewItem.candidate).selectinload(Candidate.sources),
            joinedload(ReviewItem.candidate).selectinload(Candidate.comparisons),
        )
        .where(ReviewItem.id == review_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="review item not found")
    return templates.TemplateResponse(
        request=request,
        name="review_detail.html",
        context={
            "item": item,
            "classifications": list(Classification),
            "evidence_levels": list(EvidenceLevel),
            "eligible": eligible_for_future_publication(item),
        },
    )


@router.post("/review/{review_id}")
def review_detail_submit(
    review_id: uuid.UUID,
    session: SessionDependency,
    classification: Annotated[Classification, Form()],
    evidence_level: Annotated[EvidenceLevel, Form()],
    reviewer: Annotated[str, Form(min_length=1, max_length=200)],
    notes: Annotated[str, Form(min_length=1, max_length=5000)],
) -> RedirectResponse:
    item = session.scalar(
        select(ReviewItem)
        .options(joinedload(ReviewItem.candidate))
        .where(ReviewItem.id == review_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="review item not found")
    complete_review(
        session,
        item=item,
        classification=classification,
        evidence_level=evidence_level,
        reviewer=reviewer,
        notes=notes,
    )
    return RedirectResponse(url="/review", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/review/{review_id}/candidate")
def review_candidate_enrichment(
    review_id: uuid.UUID,
    session: SessionDependency,
    source_url: Annotated[str, Form(min_length=8, max_length=2000)],
    retrieved_at: Annotated[datetime, Form()],
    actor: Annotated[str, Form(min_length=1, max_length=200)],
    human_observation: Annotated[str | None, Form(max_length=1000)] = None,
    business_name: Annotated[str | None, Form(max_length=500)] = None,
    address: Annotated[str | None, Form(max_length=1000)] = None,
    department: Annotated[str | None, Form(max_length=100)] = None,
    phone: Annotated[str | None, Form(max_length=40)] = None,
    website: Annotated[str | None, Form(max_length=2000)] = None,
    latitude: Annotated[float | None, Form(ge=-35.5, le=-30.0)] = None,
    longitude: Annotated[float | None, Form(ge=-59.0, le=-52.5)] = None,
) -> RedirectResponse:
    item = session.scalar(
        select(ReviewItem)
        .options(joinedload(ReviewItem.candidate))
        .where(ReviewItem.id == review_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="review item not found")
    try:
        enrich_candidate(
            session,
            candidate=item.candidate,
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
    except ValueError as exc:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return RedirectResponse(url=f"/review/{review_id}", status_code=status.HTTP_303_SEE_OTHER)
