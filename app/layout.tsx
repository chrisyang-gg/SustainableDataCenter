import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { TrackerShell } from "@/components/tracker-shell";
import "./globals.css";
import "./map-controls.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Allegheny Data Centers",
    template: "%s · Allegheny Data Centers",
  },
  description:
    "Allegheny County data centers, with neighborhood geology and local data-center zoning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="h-full bg-background text-foreground">
        <TrackerShell>{children}</TrackerShell>
      </body>
    </html>
  );
}
