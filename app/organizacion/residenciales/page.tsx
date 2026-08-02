import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasTeamSession, TEAM_SESSION_COOKIE } from "../../../lib/team-session.mjs";
import { AppShell } from "../../components/AppShell";

export default async function OrganizacionResidencialesPage() {
  const cookieStore = await cookies();
  if (!hasTeamSession(cookieStore.get(TEAM_SESSION_COOKIE)?.value)) {
    redirect("/organizacion/login");
  }
  return <AppShell initialView="residenciales" portal="organization" />;
}
