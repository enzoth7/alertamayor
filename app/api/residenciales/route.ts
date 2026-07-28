import { NextResponse } from "next/server";
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
  status_group: Facility["statusGroup"];
  status_stage: string;
  status_short: string;
  source_label: string;
};

export async function GET() {
  try {
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
        source_label
      from public.residenciales
      order by department, name, id
    `);

    const facilities: Facility[] = rows.map((row) => ({
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
      statusGroup: row.status_group,
      statusStage: row.status_stage,
      statusShort: row.status_short,
      sourceLabel: row.source_label,
    }));

    return NextResponse.json(
      { facilities },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
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
