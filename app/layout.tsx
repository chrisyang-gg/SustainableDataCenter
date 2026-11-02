import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { TrackerShell } from "@/components/tracker-shell";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
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
    <html lang="en" className={`${roboto.variable} h-full antialiased`}>
      <body className="h-full bg-background text-foreground">
        <TrackerShell>{children}</TrackerShell>
      </body>
    </html>
  );
}
