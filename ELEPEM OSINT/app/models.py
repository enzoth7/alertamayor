import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    event,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from app.db import Base
from app.enums import (
    Classification,
    EvidenceLevel,
    ImportFormat,
    OfficialStatus,
    ReviewState,
    SourceType,
)


def utc_now() -> datetime:
    return datetime.now(UTC)


class RegistryImport(Base):
    __tablename__ = "registry_imports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_url: Mapped[str] = mapped_column(Text)
    source_filename: Mapped[str] = mapped_column(Text)
    source_format: Mapped[ImportFormat] = mapped_column(
        Enum(ImportFormat, name="import_format", native_enum=True)
    )
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    imported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    sha256: Mapped[str] = mapped_column(String(64))
    row_count: Mapped[int] = mapped_column(default=0)

    records: Mapped[list["OfficialRegistryRecord"]] = relationship(back_populates="registry_import")


class OfficialRegistryRecord(Base):
    __tablename__ = "official_registry_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    registry_import_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("registry_imports.id", ondelete="RESTRICT"), index=True
    )
    official_identifier: Mapped[str | None] = mapped_column(String(200), index=True)
    business_name: Mapped[str] = mapped_column(Text)
    normalized_name: Mapped[str] = mapped_column(Text, index=True)
    official_status: Mapped[OfficialStatus] = mapped_column(
        Enum(OfficialStatus, name="official_status", native_enum=True)
    )
    address: Mapped[str | None] = mapped_column(Text)
    normalized_address: Mapped[str | None] = mapped_column(Text, index=True)
    department: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(40))
    normalized_phone: Mapped[str | None] = mapped_column(String(20), index=True)
    website: Mapped[str | None] = mapped_column(Text)
    normalized_domain: Mapped[str | None] = mapped_column(String(253), index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    location: Mapped[Any | None] = mapped_column(Geography("POINT", srid=4326, spatial_index=False))
    source_row: Mapped[dict[str, Any]] = mapped_column(JSONB)

    registry_import: Mapped[RegistryImport] = relationship(back_populates="records")
    comparisons: Mapped[list["MatchComparison"]] = relationship(back_populates="official_record")


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_name: Mapped[str | None] = mapped_column(Text)
    normalized_name: Mapped[str | None] = mapped_column(Text, index=True)
    address: Mapped[str | None] = mapped_column(Text)
    normalized_address: Mapped[str | None] = mapped_column(Text, index=True)
    department: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(40))
    normalized_phone: Mapped[str | None] = mapped_column(String(20), index=True)
    website: Mapped[str | None] = mapped_column(Text)
    normalized_domain: Mapped[str | None] = mapped_column(String(253), index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    location: Mapped[Any | None] = mapped_column(Geography("POINT", srid=4326, spatial_index=False))
    classification: Mapped[Classification] = mapped_column(
        Enum(Classification, name="classification", native_enum=True),
        default=Classification.HUMAN_REVIEW_REQUIRED,
    )
    suggested_classification: Mapped[Classification] = mapped_column(
        Enum(Classification, name="classification", native_enum=True),
        default=Classification.INSUFFICIENT_INFORMATION,
    )
    evidence_level: Mapped[EvidenceLevel] = mapped_column(
        Enum(EvidenceLevel, name="evidence_level", native_enum=True),
        default=EvidenceLevel.UNASSESSED,
    )
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    sources: Mapped[list["CandidateSource"]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan"
    )
    comparisons: Mapped[list["MatchComparison"]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan"
    )
    review_item: Mapped["ReviewItem | None"] = relationship(
        back_populates="candidate", cascade="all, delete-orphan", uselist=False
    )


class CollectionRun(Base):
    __tablename__ = "collection_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(50), index=True)
    query: Mapped[str] = mapped_column(Text)
    request_url: Mapped[str] = mapped_column(Text)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    http_status: Mapped[int] = mapped_column()
    result_count: Mapped[int] = mapped_column(default=0)


class CandidateSource(Base):
    __tablename__ = "candidate_sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="source_type", native_enum=True)
    )
    source_url: Mapped[str] = mapped_column(Text)
    search_query: Mapped[str | None] = mapped_column(Text)
    external_identifier: Mapped[str | None] = mapped_column(String(255))
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    human_observation: Mapped[str | None] = mapped_column(Text)
    source_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    candidate: Mapped[Candidate] = relationship(back_populates="sources")


class MatchComparison(Base):
    __tablename__ = "match_comparisons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    official_record_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("official_registry_records.id", ondelete="RESTRICT"), index=True
    )
    score: Mapped[Decimal] = mapped_column(Numeric(5, 4))
    signals: Mapped[dict[str, Any]] = mapped_column(JSONB)
    recommended_classification: Mapped[Classification] = mapped_column(
        Enum(Classification, name="classification", native_enum=True)
    )
    is_current: Mapped[bool] = mapped_column(default=True, index=True)
    compared_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    candidate: Mapped[Candidate] = relationship(back_populates="comparisons")
    official_record: Mapped[OfficialRegistryRecord] = relationship(back_populates="comparisons")

    __table_args__ = (
        UniqueConstraint(
            "candidate_id", "official_record_id", name="uq_candidate_official_comparison"
        ),
    )


class ReviewItem(Base):
    __tablename__ = "review_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), unique=True, index=True
    )
    state: Mapped[ReviewState] = mapped_column(
        Enum(ReviewState, name="review_state", native_enum=True),
        default=ReviewState.PENDING,
    )
    reviewer: Mapped[str | None] = mapped_column(String(200))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    candidate: Mapped[Candidate] = relationship(back_populates="review_item")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(100), index=True)
    actor: Mapped[str] = mapped_column(String(200))
    entity_type: Mapped[str] = mapped_column(String(100), index=True)
    entity_id: Mapped[str] = mapped_column(String(255), index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    previous_hash: Mapped[str | None] = mapped_column(String(64))
    event_hash: Mapped[str] = mapped_column(String(64), unique=True)


Index("ix_official_location", OfficialRegistryRecord.location, postgresql_using="gist")
Index("ix_candidate_location", Candidate.location, postgresql_using="gist")


@event.listens_for(Session, "before_flush")
def prevent_audit_mutation(session: Session, *_: object) -> None:
    if any(isinstance(item, AuditEvent) for item in session.dirty):
        raise ValueError("Audit events are append-only and cannot be updated")
    if any(isinstance(item, AuditEvent) for item in session.deleted):
        raise ValueError("Audit events are append-only and cannot be deleted")
