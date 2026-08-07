import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./components/team/TeamCasesWorkflow.css";
import "./components/team/TeamVisitsWorkflow.css";
import "./components/team/TeamMeasuresWorkflow.css";
import "./components/team/TeamLicenseWorkflow.css";

export const metadata: Metadata = {
  title: "Más Cerca",
  icons: {
    icon: "/mascerca.png",
    apple: "/mascerca.png",
  },
  description: "Más Cerca · Información para decidir.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}<Analytics /></body></html>;
}
