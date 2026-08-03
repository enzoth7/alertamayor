"""Initial Phase 1 schema with PostGIS and immutable audit events.

Revision ID: 20260802_0001
Revises:
Create Date: 2026-08-02
"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260802_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

classification = postgresql.ENUM(
    "MATCHED_HABILITATED",
    "MATCHED_IN_PROCESS",
    "POSSIBLE_MATCH",
    "NOT_MATCHED",
    "INSUFFICIENT_INFORMATION",
    "HUMAN_REVIEW_REQUIRED",
    name="classification",
    create_type=False,
)
official_status = postgresql.ENUM(
    "HABILITATED", "IN_PROCESS", "OTHER", "UNKNOWN", name="official_status", create_type=False
)
review_state = postgresql.ENUM(
    "PENDING", "IN_REVIEW", "COMPLETED", name="review_state", create_type=False
)
evidence_level = postgresql.ENUM(
    "A", "B", "C", "UNASSESSED", name="evidence_level", create_type=False
)
source_type = postgresql.ENUM(
    "BRAVE_SEARCH", "GOOGLE_PLACE_LINK", "MANUAL", name="source_type", create_type=False
)
import_format = postgresql.ENUM(
    "CSV",
    "JSON",
    "XLSX",
    "PDF_DERIVED_CSV",
    "PDF_DERIVED_JSON",
    name="import_format",
    create_type=False,
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    bind = op.get_bind()
    for enum_type in (
        classification,
        official_status,
        review_state,
        evidence_level,
        source_type,
        import_format,
    ):
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        "registry_imports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("source_filename", sa.Text(), nullable=False),
        sa.Column("source_format", import_format, nullable=False),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "candidates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("business_name", sa.Text(), nullable=True),
        sa.Column("normalized_name", sa.Text(), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("normalized_address", sa.Text(), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("normalized_phone", sa.String(length=20), nullable=True),
        sa.Column("website", sa.Text(), nullable=True),
        sa.Column("normalized_domain", sa.String(length=253), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column(
            "location",
            geoalchemy2.Geography(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=True,
        ),
        sa.Column("classification", classification, nullable=False),
        sa.Column("suggested_classification", classification, nullable=False),
        sa.Column("evidence_level", evidence_level, nullable=False),
        sa.Column("discovered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_candidates_normalized_name", "candidates", ["normalized_name"])
    op.create_index("ix_candidates_normalized_address", "candidates", ["normalized_address"])
    op.create_index("ix_candidates_normalized_phone", "candidates", ["normalized_phone"])
    op.create_index("ix_candidates_normalized_domain", "candidates", ["normalized_domain"])
    op.create_index("ix_candidate_location", "candidates", ["location"], postgresql_using="gist")

    op.create_table(
        "collection_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("request_url", sa.Text(), nullable=False),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("http_status", sa.Integer(), nullable=False),
        sa.Column("result_count", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_collection_runs_provider", "collection_runs", ["provider"])

    op.create_table(
        "official_registry_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("registry_import_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("official_identifier", sa.String(length=200), nullable=True),
        sa.Column("business_name", sa.Text(), nullable=False),
        sa.Column("normalized_name", sa.Text(), nullable=False),
        sa.Column("official_status", official_status, nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("normalized_address", sa.Text(), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("normalized_phone", sa.String(length=20), nullable=True),
        sa.Column("website", sa.Text(), nullable=True),
        sa.Column("normalized_domain", sa.String(length=253), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column(
            "location",
            geoalchemy2.Geography(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=True,
        ),
        sa.Column("source_row", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(
            ["registry_import_id"], ["registry_imports.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in (
        "registry_import_id",
        "official_identifier",
        "normalized_name",
        "normalized_address",
        "normalized_phone",
        "normalized_domain",
    ):
        op.create_index(
            f"ix_official_registry_records_{column}", "official_registry_records", [column]
        )
    op.create_index(
        "ix_official_location",
        "official_registry_records",
        ["location"],
        postgresql_using="gist",
    )

    op.create_table(
        "candidate_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_type", source_type, nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("search_query", sa.Text(), nullable=True),
        sa.Column("external_identifier", sa.String(length=255), nullable=True),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("human_observation", sa.Text(), nullable=True),
        sa.Column("source_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_candidate_sources_candidate_id", "candidate_sources", ["candidate_id"])

    op.create_table(
        "match_comparisons",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("official_record_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Numeric(precision=5, scale=4), nullable=False),
        sa.Column("signals", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("recommended_classification", classification, nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.Column("compared_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["official_record_id"], ["official_registry_records.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "candidate_id", "official_record_id", name="uq_candidate_official_comparison"
        ),
    )
    op.create_index("ix_match_comparisons_candidate_id", "match_comparisons", ["candidate_id"])
    op.create_index("ix_match_comparisons_is_current", "match_comparisons", ["is_current"])
    op.create_index(
        "ix_match_comparisons_official_record_id", "match_comparisons", ["official_record_id"]
    )

    op.create_table(
        "review_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("state", review_state, nullable=False),
        sa.Column("reviewer", sa.String(length=200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id"),
    )
    op.create_index("ix_review_items_candidate_id", "review_items", ["candidate_id"])

    op.create_table(
        "audit_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("actor", sa.String(length=200), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=255), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("previous_hash", sa.String(length=64), nullable=True),
        sa.Column("event_hash", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_hash"),
    )
    op.create_index("ix_audit_events_event_type", "audit_events", ["event_type"])
    op.create_index("ix_audit_events_entity_type", "audit_events", ["entity_type"])
    op.create_index("ix_audit_events_entity_id", "audit_events", ["entity_id"])
    op.execute(
        """
        CREATE FUNCTION reject_audit_event_mutation() RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'audit_events is append-only';
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        CREATE TRIGGER audit_events_no_update_delete
        BEFORE UPDATE OR DELETE ON audit_events
        FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation()
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS audit_events_no_update_delete ON audit_events")
    op.execute("DROP FUNCTION IF EXISTS reject_audit_event_mutation()")
    for table in (
        "audit_events",
        "review_items",
        "match_comparisons",
        "candidate_sources",
        "official_registry_records",
        "collection_runs",
        "candidates",
        "registry_imports",
    ):
        op.drop_table(table)
    bind = op.get_bind()
    for enum_type in (
        import_format,
        source_type,
        evidence_level,
        review_state,
        official_status,
        classification,
    ):
        enum_type.drop(bind, checkfirst=True)
    # PostGIS may be shared by other schemas, so the downgrade intentionally leaves it installed.
