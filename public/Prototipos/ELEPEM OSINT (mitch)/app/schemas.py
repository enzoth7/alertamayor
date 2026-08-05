import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.enums import Classification, EvidenceLevel, ImportFormat, ReviewState


class BraveDiscoveryRequest(BaseModel):
    query: str = Field(min_length=3, max_length=400)
    count: int = Field(default=10, ge=1, le=20)
    actor: str = Field(default="local-operator", min_length=1, max_length=200)


class BraveDiscoveryResponse(BaseModel):
    query: str
    retrieved_at: datetime
    api_results: int
    candidates_created: int
    sources_linked: int


class GooglePlaceRequest(BaseModel):
    place_id: str = Field(min_length=10, max_length=255)
    actor: str = Field(default="local-operator", min_length=1, max_length=200)


class GooglePlaceResponse(BaseModel):
    candidate_id: uuid.UUID
    place_id: str
    google_maps_url: str
    retrieved_at: datetime


class CandidateEnrichment(BaseModel):
    source_url: HttpUrl
    retrieved_at: datetime
    actor: str = Field(min_length=1, max_length=200)
    human_observation: str | None = Field(default=None, max_length=1000)
    business_name: str | None = Field(default=None, max_length=500)
    address: str | None = Field(default=None, max_length=1000)
    department: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=40)
    website: str | None = Field(default=None, max_length=2000)
    latitude: float | None = Field(default=None, ge=-35.5, le=-30.0)
    longitude: float | None = Field(default=None, ge=-59.0, le=-52.5)


class CandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_name: str | None
    address: str | None
    department: str | None
    phone: str | None
    website: str | None
    latitude: float | None
    longitude: float | None
    classification: Classification
    suggested_classification: Classification
    evidence_level: EvidenceLevel


class ManualCandidateCreate(CandidateEnrichment):
    pass


class ManualCandidateResponse(CandidateResponse):
    created: bool


class ReviewDecision(BaseModel):
    classification: Classification
    evidence_level: EvidenceLevel
    reviewer: str = Field(min_length=1, max_length=200)
    notes: str = Field(min_length=1, max_length=5000)


class ReviewItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: uuid.UUID
    state: ReviewState
    reviewer: str | None
    notes: str | None
    created_at: datetime
    reviewed_at: datetime | None


class ImportMetadata(BaseModel):
    source_format: ImportFormat
    source_url: HttpUrl
    retrieved_at: datetime
    actor: str = Field(min_length=1, max_length=200)


class RegistryImportResponse(BaseModel):
    id: uuid.UUID
    source_url: str
    source_format: ImportFormat
    retrieved_at: datetime
    sha256: str
    row_count: int


class CountResponse(BaseModel):
    count: int


class AuditVerificationResponse(BaseModel):
    valid: bool
    event_count: int
    failing_event_id: str | None
