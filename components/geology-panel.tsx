"use client";

import { Suspense, use, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import type { GeologyReport } from "@/lib/geology";
import { parsePin } from "@/lib/place-directory";
import {
  pinReminder,
  reminderColor,
  reminderLabel,
  type ReminderTone,
} from "@/lib/reminder";
import { describeChannel, describeStream, describeWell } from "@/lib/water";
import { Skeleton } from "@/components/ui/skeleton";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const reports = new Map<string, Promise<GeologyReport>>();

function loadReport(latitude: number, longitude: number): Promise<GeologyReport> {
  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const existing = reports.get(key);
  if (existing) return existing;
  const pending = fetch(`/api/geology?lat=${latitude}&lng=${longitude}`)
    .then(async (response) => {
      if (!response.ok) return unavailable(latitude, longitude);
      return (await response.json()) as GeologyReport;
    })
    .catch(() => unavailable(latitude, longitude));
  reports.set(key, pending);
  return pending;
}

export function GeologyPanel({
  centroid,
  areaTone,
}: {
  centroid: [number, number];
  areaTone: ReminderTone;
}) {
  const params = useSearchParams();
  const isClient = useIsClient();
  const pin = parsePin(params.get("pin"));
  const longitude = pin?.longitude ?? centroid[0];
  const latitude = pin?.latitude ?? centroid[1];

  return (
    <section aria-labelledby="geology-heading">
      <h2 id="geology-heading" className="text-base font-semibold">
        Ground at this pin
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {pin
          ? `Reading for the pin at ${latitude.toFixed(5)}, ${longitude.toFixed(5)}. Bedrock, elevation, and the flood zone come from the public map services linked below.`
          : "This reading uses a point in the middle of the area. Click the map to drop a pin on the site you care about."}
      </p>
      {isClient ? (
        <Suspense fallback={<GeologySkeleton />}>
          <GeologyResult
            key={`${latitude.toFixed(5)},${longitude.toFixed(5)}`}
            latitude={latitude}
            longitude={longitude}
            areaTone={areaTone}
          />
        </Suspense>
      ) : (
        <GeologySkeleton />
      )}
    </section>
  );
}

function GeologyResult({
  latitude,
  longitude,
  areaTone,
}: {
  latitude: number;
  longitude: number;
  areaTone: ReminderTone;
}) {
  const report = use(loadReport(latitude, longitude));
  const pinTone = pinReminder(areaTone, report.floodZones, report.units);
  const water = report.water;
  return (
    <div className="mt-3 space-y-3">
      {pinTone.tone !== areaTone ? (
        <p
          className="border border-border border-l-4 bg-card px-3 py-2 text-sm leading-6 text-foreground"
          style={{ borderLeftColor: reminderColor(pinTone.tone) }}
        >
          <span className="font-semibold">This pin: {reminderLabel(pinTone.tone)}.</span>{" "}
          {pinTone.notes.join(" ")}
        </p>
      ) : null}
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <dt className="text-xs tracking-wide text-muted-foreground uppercase">
            Elevation
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {report.elevationFeet === null
              ? "Unavailable"
              : `${report.elevationFeet.toLocaleString("en-US")} ft`}
          </dd>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2">
          <dt className="text-xs tracking-wide text-muted-foreground uppercase">
            Flood zone
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {report.floodZones.length === 0
              ? "Unavailable"
              : report.floodZones
                  .map((zone) =>
                    zone.detail ? `Zone ${zone.code}, ${zone.detail}` : `Zone ${zone.code}`,
                  )
                  .join("; ")}
          </dd>
        </div>
      </dl>
      {report.units.length > 0 ? (
        <ul className="space-y-2">
          {report.units.map((unit) => (
            <li
              key={`${unit.name}-${unit.age}`}
              className="rounded-md border border-border bg-card px-3 py-2"
            >
              <p className="text-sm font-medium text-foreground">{unit.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unit.age}
                {unit.lithology === "Lithology not stated"
                  ? ""
                  : ` · ${unit.lithology}`}
              </p>
              {unit.description ? (
                <p className="mt-1 text-sm leading-6 text-foreground/90">
                  {unit.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <section aria-labelledby="water-heading" className="rounded-md border border-border bg-card px-3 py-2">
        <h3 id="water-heading" className="text-sm font-semibold text-foreground">
          Water nearby
        </h3>
        {water ? (
          <div className="mt-1 space-y-1 text-sm leading-6 text-foreground/90">
            <p>{describeChannel(water.channel)}</p>
            <p>{describeStream(water.stream, water.streamReading)}</p>
            <p>{describeWell(water.well)}</p>
            <p className="text-muted-foreground">
              Cooling water for a data center is a utility contract or a
              withdrawal permit. A nearby gage is not that supply.
            </p>
            {water.messages.map((message) => (
              <p key={message} className="text-[#e0b15a]">
                {message}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-[#e0b15a]">The water reading did not load.</p>
        )}
      </section>
      {report.messages.length > 0 ? (
        <ul className="space-y-1 text-sm text-[#e0b15a]">
          {report.messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      <ul className="space-y-1 text-xs leading-5">
        {[...report.sources, ...(water?.sources ?? [])].map((source) => (
          <li key={source.label}>
            <a
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function unavailable(latitude: number, longitude: number): GeologyReport {
  return {
    latitude,
    longitude,
    elevationFeet: null,
    units: [],
    floodZones: [],
    messages: ["The ground reading did not load. Try the pin again."],
    sources: [],
    water: null,
  };
}

export function GeologySkeleton() {
  return (
    <div className="mt-3 space-y-2" aria-hidden="true">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
