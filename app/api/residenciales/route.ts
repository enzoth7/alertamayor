import { NextResponse } from "next/server";
import {
  publicFacilityRelation,
  readElepemDataSource,
} from "../../../lib/elepem-data-source.mjs";
import { querySupabaseDatabase } from "../../../lib/supabase-db";
import type { Facility } from "../../components/map-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResidentialRow = Record<string, unknown> & {
  id: string;
  name: string;
  department: string;
  locality: string;
  address: string;
  places: number | null;
  lat: number;
  lng: number;
  precision: Facility["precision"];
  precision_label: string;
  status_group: "habilitado" | "registro" | "verificar" | "app";
  status_stage: string;
  status_short: string;
  source_label: string;
  msp_final: boolean;
  msp_registro_historico: boolean;
  mides_social: boolean;
  pacp: boolean;
  other_source: boolean;
};

function deriveStatusGroup(row: ResidentialRow): Facility["statusGroup"] {
  if (row.status_group === "app") return "app";
  if (row.status_group === "verificar") return "verificar";
  if (row.msp_final) return "habilitado";
  if (row.mides_social) return "mides";
  if (row.msp_registro_historico) return "registro";
  return "otra_fuente";
}

function isOtherSource(row: ResidentialRow) {
  return (
    row.status_group !== "verificar" &&
    row.status_group !== "app" &&
    !row.msp_final &&
    !row.msp_registro_historico &&
    !row.mides_social &&
    (row.other_source || row.pacp)
  );
}

export async function GET() {
  try {
    const dataSource = readElepemDataSource();
    const relation = publicFacilityRelation(dataSource);
    const rows = await querySupabaseDatabase<ResidentialRow>(`
      select
        id,
        name,
        department,
        locality,
        address,
        places,
        lat,
        lng,
        precision,
        precision_label,
        status_group,
        status_stage,
        status_short,
        source_label,
        msp_final,
        msp_registro_historico,
        mides_social,
        pacp,
        other_source
      from ${relation}
      order by department, name, id
    `);

    const facilities: Facility[] = rows.map((row) => {
      const otherSource = isOtherSource(row);
      return {
        id: row.id,
        name: row.name,
        department: row.department,
        locality: row.locality,
        address: row.address,
        places: row.places,
        lat: row.lat,
        lng: row.lng,
        precision: row.precision,
        precisionLabel: row.precision_label,
        statusGroup: deriveStatusGroup(row),
        statusStage: row.status_stage,
        statusShort:
          otherSource && !row.pacp
            ? "No figura en las tres listas auditadas · conserva fuente previa"
            : row.status_short,
        sourceLabel: row.source_label,
        mspFinal: row.msp_final,
        mspRegistroHistorico: row.msp_registro_historico,
        midesSocial: row.mides_social,
        pacp: row.pacp,
        otherSource,
        pendingVerification: row.status_group === "verificar",
        appDiscovered: row.status_group === "app",
        privateCandidate: false,
      };
    });

    return NextResponse.json(
      { facilities },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
          "X-ELEPEM-Data-Source": dataSource,
        },
      },
    );
  } catch (error) {
    console.error("Supabase residenciales query failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "No se pudo cargar el registro de residenciales." },
      { status: 503 },
    );
  }
}
