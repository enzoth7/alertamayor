import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alerta Mayor",
  icons: {
    icon: "/alertamayor.png",
    apple: "/alertamayor.png",
  },
  description: "Orientación, registro y seguimiento institucional.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}<Analytics /></body></html>;
}
