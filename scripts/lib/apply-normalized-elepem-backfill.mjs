function dateValue(value) {
  return value || null;
}

async function insertReturningId(client, sql, values, fallbackSql, fallbackValues) {
  const result = await client.query(sql, values);
  if (result.rows[0]?.id) return String(result.rows[0].id);
  const fallback = await client.query(fallbackSql, fallbackValues);
  if (!fallback.rows[0]?.id) throw new Error("No se pudo recuperar el ID de una fila idempotente.");
  return String(fallback.rows[0].id);
}

export async function applyNormalizedBackfill(client, plan) {
  const ids = {
    sourceCatalog: new Map(),
    sourceRuns: new Map(),
    observations: new Map(),
    facilities: new Map(),
    addresses: new Map(),
    organizations: new Map(),
    candidates: new Map(),
  };

  await client.query("begin isolation level serializable");
  await client.query("set local statement_timeout = '120s'");
  await client.query("set local lock_timeout = '5s'");
  try {
    for (const row of plan.legacyRows) {
      await client.query(
        `
          insert into public.residenciales (
            id, name, department, locality, address, places, lat, lng,
            precision, precision_label, status_group, status_stage,
            status_short, source_label, created_at, updated_at, msp_final,
            msp_registro_historico, mides_social, pacp, other_source
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21
          )
          on conflict (id) do update set
            name = excluded.name,
            department = excluded.department,
            locality = excluded.locality,
            address = excluded.address,
            places = excluded.places,
            lat = excluded.lat,
            lng = excluded.lng,
            precision = excluded.precision,
            precision_label = excluded.precision_label,
            status_group = excluded.status_group,
            status_stage = excluded.status_stage,
            status_short = excluded.status_short,
            source_label = excluded.source_label,
            updated_at = excluded.updated_at,
            msp_final = excluded.msp_final,
            msp_registro_historico = excluded.msp_registro_historico,
            mides_social = excluded.mides_social,
            pacp = excluded.pacp,
            other_source = excluded.other_source
        `,
        [
          row.id,
          row.name,
          row.department,
          row.locality,
          row.address,
          row.places,
          row.lat,
          row.lng,
          row.precision,
          row.precision_label,
          row.status_group,
          row.status_stage,
          row.status_short,
          row.source_label,
          row.created_at,
          row.updated_at,
          row.msp_final,
          row.msp_registro_historico,
          row.mides_social,
          row.pacp,
          row.other_source,
        ],
      );
    }

    for (const row of plan.sourceCatalog) {
      const id = await insertReturningId(
        client,
        `
          insert into elepem_core.source_catalog (
            source_key, display_name, source_type, base_url, authority_level,
            storage_policy, source_license
          ) values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (source_key) do update set
            display_name = excluded.display_name,
            base_url = excluded.base_url,
            authority_level = excluded.authority_level,
            storage_policy = excluded.storage_policy,
            source_license = excluded.source_license
          returning id
        `,
        [
          row.sourceKey,
          row.displayName,
          row.sourceType,
          row.baseUrl,
          row.authorityLevel,
          row.storagePolicy,
          row.sourceLicense,
        ],
        "select id from elepem_core.source_catalog where source_key = $1",
        [row.sourceKey],
      );
      ids.sourceCatalog.set(row.sourceKey, id);
    }

    for (const row of plan.sourceRuns) {
      const sourceCatalogId = ids.sourceCatalog.get(row.sourceCatalogKey);
      const id = await insertReturningId(
        client,
        `
          insert into discovery_private.facility_source_runs (
            run_key, source_type, source_url, source_license, storage_policy,
            status, started_at, completed_at, observation_count, source_catalog_id
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          on conflict (run_key) do update set
            status = excluded.status,
            completed_at = excluded.completed_at,
            observation_count = excluded.observation_count,
            error_summary = null,
            source_catalog_id = excluded.source_catalog_id
          returning id
        `,
        [
          row.runKey,
          row.sourceType,
          row.sourceUrl,
          row.sourceLicense,
          row.storagePolicy,
          row.status,
          row.startedAt,
          row.completedAt,
          row.observationCount,
          sourceCatalogId,
        ],
        "select id from discovery_private.facility_source_runs where run_key = $1",
        [row.runKey],
      );
      ids.sourceRuns.set(row.runKey, id);
    }

    for (const row of plan.observations) {
      const runId = ids.sourceRuns.get(row.runKey);
      const sourceCatalogId = ids.sourceCatalog.get(row.sourceCatalogKey);
      if (!runId) throw new Error(`Observación sin corrida: ${row.logicalKey}`);
      const id = await insertReturningId(
        client,
        `
          insert into discovery_private.facility_source_observations (
            run_id, source_type, source_record_key, source_url, retrieved_at,
            source_date, source_license, storage_policy, normalized_name,
            normalized_department, normalized_locality, normalized_address,
            lat, lng, human_note, raw_metadata_storage_permitted, raw_metadata,
            record_hash, source_catalog_id
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13, $14, $15, false, null, $16, $17
          )
          on conflict (source_type, source_record_key, record_hash) do update set
            source_catalog_id = coalesce(
              discovery_private.facility_source_observations.source_catalog_id,
              excluded.source_catalog_id
            )
          returning id
        `,
        [
          runId,
          row.sourceType,
          row.sourceRecordKey,
          row.sourceUrl,
          row.retrievedAt,
          dateValue(row.sourceDate),
          row.sourceLicense,
          row.storagePolicy,
          row.normalizedName,
          row.normalizedDepartment,
          row.normalizedLocality,
          row.normalizedAddress,
          row.lat,
          row.lng,
          row.humanNote,
          row.recordHash,
          sourceCatalogId,
        ],
        `
          select id
          from discovery_private.facility_source_observations
          where source_type = $1 and source_record_key = $2 and record_hash = $3
        `,
        [row.sourceType, row.sourceRecordKey, row.recordHash],
      );
      ids.observations.set(row.logicalKey, id);
    }

    for (const row of plan.facilities) {
      const id = await insertReturningId(
        client,
        `
          insert into elepem_core.facilities (
            facility_key, lifecycle_status, review_status, publication_status
          ) values ($1, $2, $3, $4)
          on conflict (facility_key) do nothing
          returning id
        `,
        [row.facilityKey, row.lifecycleStatus, row.reviewStatus, row.publicationStatus],
        "select id from elepem_core.facilities where facility_key = $1",
        [row.facilityKey],
      );
      ids.facilities.set(row.facilityKey, id);
    }

    for (const row of plan.organizations) {
      const id = await insertReturningId(
        client,
        `
          insert into elepem_core.organizations (
            organization_key, legal_name, organization_type
          ) values ($1, $2, $3)
          on conflict (organization_key) do nothing
          returning id
        `,
        [row.organizationKey, row.legalName, row.organizationType],
        "select id from elepem_core.organizations where organization_key = $1",
        [row.organizationKey],
      );
      ids.organizations.set(row.organizationKey, id);
    }

    for (const row of plan.names) {
      await client.query(
        `
          insert into elepem_core.facility_names (
            facility_id, name, normalized_name, name_type, is_preferred,
            observation_id
          ) values ($1, $2, $3, $4, $5, $6)
          on conflict do nothing
        `,
        [
          ids.facilities.get(row.facilityKey),
          row.name,
          row.normalizedName,
          row.nameType,
          row.isPreferred,
          row.observationKey ? ids.observations.get(row.observationKey) : null,
        ],
      );
    }

    for (const row of plan.addresses) {
      const facilityId = ids.facilities.get(row.facilityKey);
      const observationId = row.observationKey ? ids.observations.get(row.observationKey) : null;
      const id = await insertReturningId(
        client,
        `
          insert into elepem_core.facility_addresses (
            facility_id, address_line, normalized_address, locality, department,
            address_type, is_current, observation_id
          ) values ($1, $2, $3, $4, $5, $6, $7, $8)
          on conflict do nothing
          returning id
        `,
        [
          facilityId,
          row.addressLine,
          row.normalizedAddress,
          row.locality,
          row.department,
          row.addressType,
          row.isCurrent,
          observationId,
        ],
        `
          select id from elepem_core.facility_addresses
          where facility_id = $1 and normalized_address = $2
            and locality = $3 and department = $4 and valid_from is null
          order by id limit 1
        `,
        [facilityId, row.normalizedAddress, row.locality, row.department],
      );
      ids.addresses.set(row.addressKey, id);
    }

    for (const row of plan.contacts) {
      await client.query(
        `
          insert into elepem_core.facility_contacts (
            facility_id, contact_type, contact_value, normalized_value,
            is_current, observation_id
          ) values ($1, $2, $3, $4, $5, $6)
          on conflict do nothing
        `,
        [
          ids.facilities.get(row.facilityKey),
          row.contactType,
          row.contactValue,
          row.normalizedValue,
          row.isCurrent,
          row.observationKey ? ids.observations.get(row.observationKey) : null,
        ],
      );
    }

    for (const row of plan.operators) {
      await client.query(
        `
          insert into elepem_core.facility_operators (
            facility_id, organization_id, relationship_type, observation_id
          ) values ($1, $2, $3, $4)
          on conflict do nothing
        `,
        [
          ids.facilities.get(row.facilityKey),
          ids.organizations.get(row.organizationKey),
          row.relationshipType,
          row.observationKey ? ids.observations.get(row.observationKey) : null,
        ],
      );
    }

    for (const row of plan.observationLinks) {
      await client.query(
        `
          insert into elepem_core.facility_observation_links (
            facility_id, observation_id, evidence_role, independence_key, linked_by
          ) values ($1, $2, $3, $4, $5)
          on conflict do nothing
        `,
        [
          ids.facilities.get(row.facilityKey),
          ids.observations.get(row.observationKey),
          row.evidenceRole,
          row.independenceKey,
          row.linkedBy,
        ],
      );
    }

    for (const row of plan.administrativeEvents) {
      await client.query(
        `
          insert into elepem_core.facility_administrative_events (
            facility_id, authority, administrative_stage, status_label,
            effective_date, is_current, observation_id
          ) values ($1, $2, $3, $4, $5, $6, $7)
          on conflict do nothing
        `,
        [
          ids.facilities.get(row.facilityKey),
          row.authority,
          row.administrativeStage,
          row.statusLabel,
          dateValue(row.effectiveDate),
          row.isCurrent,
          ids.observations.get(row.observationKey),
        ],
      );
    }

    for (const row of plan.capacities) {
      await client.query(
        `
          insert into elepem_core.facility_capacity_observations (
            facility_id, places, is_current, observation_id
          ) values ($1, $2, $3, $4)
          on conflict do nothing
        `,
        [
          ids.facilities.get(row.facilityKey),
          row.places,
          row.isCurrent,
          ids.observations.get(row.observationKey),
        ],
      );
    }

    for (const row of plan.geocodes) {
      await client.query(
        `
          insert into elepem_core.facility_geocodes (
            facility_id, address_id, provider, lat, lng, precision,
            precision_label, confidence, manually_corrected, checked_at,
            is_current, observation_id
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, $11)
          on conflict do nothing
        `,
        [
          ids.facilities.get(row.facilityKey),
          ids.addresses.get(row.addressKey),
          row.provider,
          row.lat,
          row.lng,
          row.precision,
          row.precisionLabel,
          row.confidence,
          row.checkedAt,
          row.isCurrent,
          row.observationKey ? ids.observations.get(row.observationKey) : null,
        ],
      );
    }

    for (const row of plan.legacyMappings) {
      await client.query(
        `
          insert into elepem_core.legacy_facility_map (
            legacy_residencial_id, facility_id, mapping_status, match_method,
            confidence, mapped_by, mapped_at
          ) values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (legacy_residencial_id) do nothing
        `,
        [
          row.legacyResidencialId,
          ids.facilities.get(row.facilityKey),
          row.mappingStatus,
          row.matchMethod,
          row.confidence,
          row.mappedBy,
          row.mappedAt,
        ],
      );
    }

    for (const row of plan.candidates) {
      const id = await insertReturningId(
        client,
        `
          insert into discovery_private.facility_candidates (
            candidate_key, status, normalized_name, normalized_department,
            normalized_locality, normalized_address, lat, lng,
            best_match_residencial_id, best_match_score, evidence_tier,
            human_reviewed, reviewed_at, reviewed_by, review_note,
            public_eligible, first_seen_at, last_seen_at
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, false, $16, $17
          )
          on conflict (candidate_key) do nothing
          returning id
        `,
        [
          row.candidateKey,
          row.status,
          row.normalizedName,
          row.normalizedDepartment,
          row.normalizedLocality,
          row.normalizedAddress,
          row.lat,
          row.lng,
          row.bestMatchResidencialId,
          row.bestMatchScore,
          row.evidenceTier,
          row.humanReviewed,
          row.reviewedAt,
          row.reviewedBy,
          row.reviewNote,
          row.firstSeenAt,
          row.lastSeenAt,
        ],
        "select id from discovery_private.facility_candidates where candidate_key = $1",
        [row.candidateKey],
      );
      ids.candidates.set(row.candidateKey, id);
    }

    for (const row of plan.candidateSources) {
      const candidateId = ids.candidates.get(row.candidateKey);
      const observationId = ids.observations.get(row.observationKey);
      if (!candidateId || !observationId) continue;
      await client.query(
        `
          insert into discovery_private.facility_candidate_sources (
            candidate_id, observation_id, evidence_role, independence_key,
            link_method, linked_by, linked_at
          ) values ($1, $2, $3, $4, $5, $6, $7)
          on conflict do nothing
        `,
        [
          candidateId,
          observationId,
          row.evidenceRole,
          row.independenceKey,
          row.linkMethod,
          row.linkedBy,
          row.linkedAt,
        ],
      );
    }

    for (const row of plan.externalIds) {
      const candidateId = row.ownerType === "candidate" ? ids.candidates.get(row.ownerKey) : null;
      const facilityId = row.ownerType === "facility" ? ids.facilities.get(row.ownerKey) : null;
      const residencialId = row.ownerType === "legacy" ? row.ownerKey : null;
      await client.query(
        `
          insert into discovery_private.facility_external_ids (
            candidate_id, residencial_id, facility_id, observation_id,
            provider, external_id, external_url, link_method, linked_by, linked_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          on conflict (provider, external_id) do nothing
        `,
        [
          candidateId,
          residencialId,
          facilityId,
          row.observationKey ? ids.observations.get(row.observationKey) : null,
          row.provider,
          row.externalId,
          row.externalUrl,
          row.linkMethod,
          row.linkedBy,
          row.linkedAt,
        ],
      );
    }

    for (const row of plan.matchSuggestions) {
      await client.query(
        `
          insert into discovery_private.facility_candidate_match_suggestions (
            candidate_id, residencial_id, facility_id, rank, score, components,
            generated_at
          ) values ($1, $2, $3, $4, $5, $6, $7)
          on conflict (candidate_id, rank) do update set
            facility_id = coalesce(
              discovery_private.facility_candidate_match_suggestions.facility_id,
              excluded.facility_id
            )
        `,
        [
          ids.candidates.get(row.candidateKey),
          row.residencialId,
          row.facilityKey ? ids.facilities.get(row.facilityKey) : null,
          row.rank,
          row.score,
          row.components,
          row.generatedAt,
        ],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  return ids;
}

export async function collectNormalizedReconciliation(client) {
  const counts = await client.query(`
    select jsonb_build_object(
      'legacy_residenciales', (select count(*) from public.residenciales),
      'facilities', (select count(*) from elepem_core.facilities),
      'legacy_mappings', (select count(*) from elepem_core.legacy_facility_map),
      'facility_names', (select count(*) from elepem_core.facility_names),
      'facility_addresses', (select count(*) from elepem_core.facility_addresses),
      'facility_contacts', (select count(*) from elepem_core.facility_contacts),
      'facility_geocodes', (select count(*) from elepem_core.facility_geocodes),
      'administrative_events', (select count(*) from elepem_core.facility_administrative_events),
      'source_observations', (select count(*) from discovery_private.facility_source_observations),
      'candidates', (select count(*) from discovery_private.facility_candidates),
      'candidate_sources', (select count(*) from discovery_private.facility_candidate_sources),
      'external_ids', (select count(*) from discovery_private.facility_external_ids),
      'match_suggestions', (select count(*) from discovery_private.facility_candidate_match_suggestions),
      'public_approved', (select count(*) from public.facilities_public_approved)
    ) as value
  `);
  const integrity = await client.query(`
    select jsonb_build_object(
      'unmapped_legacy', (
        select count(*) from public.residenciales as legacy
        left join elepem_core.legacy_facility_map as mapping
          on mapping.legacy_residencial_id = legacy.id
        where mapping.legacy_residencial_id is null
      ),
      'orphan_mappings', (
        select count(*) from elepem_core.legacy_facility_map as mapping
        left join elepem_core.facilities as facility on facility.id = mapping.facility_id
        where mapping.mapping_status = 'mapped' and facility.id is null
      ),
      'facilities_without_preferred_name', (
        select count(*) from elepem_core.facilities as facility
        where not exists (
          select 1 from elepem_core.facility_names as name
          where name.facility_id = facility.id and name.is_preferred
        )
      ),
      'duplicate_facility_keys', (
        select count(*) from (
          select facility_key from elepem_core.facilities group by facility_key having count(*) > 1
        ) as duplicates
      ),
      'duplicate_external_ids', (
        select count(*) from (
          select provider, external_id
          from discovery_private.facility_external_ids
          group by provider, external_id having count(*) > 1
        ) as duplicates
      ),
      'public_candidates', (
        select count(*) from discovery_private.facility_candidates where public_eligible
      )
    ) as value
  `);
  const departments = await client.query(`
    select address.department, count(*)::integer as facilities
    from elepem_core.facility_addresses as address
    where address.is_current and address.address_type = 'physical'
    group by address.department
    order by address.department
  `);
  const candidateStatuses = await client.query(`
    select status, evidence_tier, count(*)::integer as candidates
    from discovery_private.facility_candidates
    group by status, evidence_tier
    order by status, evidence_tier
  `);
  return {
    counts: counts.rows[0].value,
    integrity: integrity.rows[0].value,
    departments: departments.rows,
    candidateStatuses: candidateStatuses.rows,
  };
}
