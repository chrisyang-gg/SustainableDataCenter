"use client";

import { useEffect, useState } from "react";
import { facilities } from "@/data/facilities";
import {
  SPRINGDALE_BUILDINGS,
  SPRINGDALE_PARAMETERS,
  type RecordLine,
  type RecordLink,
} from "@/lib/springdale-record";

const pin = facilities.find((facility) => facility.slug === "dynamo-springdale");

export function SpringdaleExample() {
  const [meters, setMeters] = useState<number | null>(null);
  const [distanceState, setDistanceState] = useState<"loading" | "found" | "unavailable">(
    pin ? "loading" : "unavailable",
  );

  useEffect(() => {
    if (!pin) return;
    const controller = new AbortController();
    fetch(`/api/community?lat=${pin.latitude}&lng=${pin.longitude}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("community lookup failed");
        return (await response.json()) as { homes?: { status?: string; meters?: number } };
      })
      .then((body) => {
        const homes = body.homes;
        if (homes?.status === "found" && typeof homes.meters === "number") {
          setMeters(homes.meters);
          setDistanceState("found");
          return;
        }
        setDistanceState("unavailable");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDistanceState("unavailable");
      });
    return () => controller.abort();
  }, []);

  const distance =
    distanceState === "found" && meters !== null
      ? `${Math.round(meters).toLocaleString("en-US")} meters`
      : distanceState === "loading"
        ? "Checking the county building file"
        : "Unknown";
  const distanceDetail =
    distanceState === "found"
      ? "Measured from the published pin to the nearest residential building in the Allegheny County building file."
      : "The county building file did not return a distance, so this stays unknown.";

  return (
    <div id="springdale-record" className="space-y-3">
      <header>
        <h2 className="text-base font-semibold text-foreground">Public parameters</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Each line is a public record, or unknown. These are not simulator inputs.
        </p>
      </header>
      <RecordRow
        line={{
          id: "distance",
          label: "Distance to the nearest residential area",
          value: distance,
          detail: distanceDetail,
          sources: [SPRINGDALE_BUILDINGS],
        }}
      />
      {SPRINGDALE_PARAMETERS.map((line) => (
        <RecordRow key={line.id} line={line} />
      ))}
    </div>
  );
}

function RecordRow({ line }: { line: RecordLine }) {
  return (
    <section className="border border-border px-3 py-2">
      <h3 className="text-sm font-semibold text-foreground">{line.label}</h3>
      <p className="mt-1 text-sm leading-5 text-foreground">{line.value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{line.detail}</p>
      <SourceList links={line.sources} />
    </section>
  );
}

function SourceList({ links }: { links: RecordLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-xs leading-5">
      {links.map((link) => (
        <li key={link.href}>
          <a className="text-primary hover:underline" href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
