"use client";

import { Suspense, use, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { GeologyReport } from "@/lib/geology";
import type { HomesLookup } from "@/lib/community";
import {
  DEFAULT_LOAD_MW,
  EPA_OUTDOOR_LDN_DBA,
  FEEDER_PEAK_MVA,
  isLoadMw,
  LOAD_CHOICES,
  NO2_1H_UG_PER_M3,
  peopleImpact,
} from "@/lib/impact";
import { parsePin } from "@/lib/place-directory";
import { placesAtPoint } from "@/lib/places";
import { describeChannel } from "@/lib/water";
import { ComplianceBlock } from "@/components/compliance-block";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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

function unavailable(latitude: number, longitude: number): GeologyReport {
  return {
    latitude,
    longitude,
    elevationFeet: null,
    units: [],
    floodZones: [],
    messages: [
      "The ground reading did not load. Try the pin again.",
      "The flood-hazard service did not respond for this pin.",
    ],
    sources: [],
    water: null,
  };
}

function placeName(longitude: number, latitude: number): string {
  const hits = placesAtPoint(longitude, latitude);
  const place = hits.find((item) => item.kind === "neighborhood") ?? hits[0];
  return place?.name ?? "Outside a mapped area";
}

export function WhatIfPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const pin = parsePin(params.get("pin"));
  const buildText = params.get("build");
  const build = buildText ? Number(buildText) : NaN;
  const asking = pin !== null && !isLoadMw(build);
  const accepted = useRef(false);

  function decline() {
    accepted.current = false;
    router.replace("/what-if", { scroll: false });
  }

  function accept() {
    if (!pin) return;
    accepted.current = true;
    const next = new URLSearchParams({
      pin: `${pin.longitude.toFixed(5)},${pin.latitude.toFixed(5)}`,
      build: String(DEFAULT_LOAD_MW),
    });
    router.replace(`/what-if?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-base font-semibold text-foreground">What if</h1>
        {pin && isLoadMw(build) ? null : (
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Click the map to drop a pin. The question is whether to build a data
            center on that point. Yes calculates noise, air, water, and grid
            load at the nearest homes, then checks the flood and security
            rules that depend on the pin. The Places tab is unchanged.
          </p>
        )}
      </div>
      {pin && isLoadMw(build) ? (
        <Estimate
          latitude={pin.latitude}
          longitude={pin.longitude}
          megawatts={build}
        />
      ) : (
        <p className="px-4 py-4 text-sm leading-6 text-muted-foreground">
          No pin yet. A click inside Allegheny County opens the question. A
          click outside the county is ignored.
        </p>
      )}
      <Dialog
        open={asking}
        onOpenChange={(open) => {
          if (open) {
            accepted.current = false;
            return;
          }
          if (accepted.current) return;
          decline();
        }}
      >
        <DialogContent>
          <DialogTitle>Build a data center here?</DialogTitle>
          <DialogDescription>
            {pin
              ? `${placeName(pin.longitude, pin.latitude)} · ${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}.`
              : "This pin is off the county map."}{" "}
            Yes calculates the effect at the nearest mapped residential
            building: noise and generator exhaust at that distance, cooling
            water as a share of the nearest river gage, and the load against a
            neighborhood feeder, plus the flood and security rules this pin
            does or does not clear. This is not a permit or a certification.
          </DialogDescription>
          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={accept}>
              Yes, estimate it
            </Button>
            <DialogClose
              className={buttonVariants({ variant: "outline" })}
              onClick={decline}
            >
              No
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Estimate({
  latitude,
  longitude,
  megawatts,
}: {
  latitude: number;
  longitude: number;
  megawatts: number;
}) {
  const isClient = useIsClient();
  const name = placeName(longitude, latitude);
  return (
    <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
      <div className="space-y-4 px-4 py-4">
        <header>
          <p className="text-sm text-muted-foreground">{name}</p>
          <h2 className="mt-1 text-xl font-medium text-foreground">
            {megawatts} MW for a year
          </h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Load">
            {LOAD_CHOICES.map((choice) => (
              <Link
                key={choice}
                href={`/what-if?pin=${longitude.toFixed(5)},${latitude.toFixed(5)}&build=${choice}`}
                scroll={false}
                className={
                  choice === megawatts
                    ? "border border-primary bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                    : "border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                }
                aria-current={choice === megawatts ? "true" : undefined}
              >
                {choice} MW{choice === DEFAULT_LOAD_MW ? " · large-load line" : ""}
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            25 MW is the county’s large-load line for county-owned property. It
            is a size choice, not a reading from this pin.
          </p>
        </header>
        {isClient ? (
          <Suspense fallback={<EstimateSkeleton />}>
            <EstimateBody
              key={`${latitude},${longitude},${megawatts}`}
              latitude={latitude}
              longitude={longitude}
              megawatts={megawatts}
            />
          </Suspense>
        ) : (
          <EstimateSkeleton />
        )}
        <Link href="/what-if" scroll={false} className="inline-block text-sm text-primary hover:underline">
          Drop another pin
        </Link>
      </div>
    </div>
  );
}

const communityReads = new Map<string, Promise<{ homes: HomesLookup }>>();
const pairedReads = new Map<
  string,
  Promise<[GeologyReport, { homes: HomesLookup }]>
>();

function loadCommunity(latitude: number, longitude: number): Promise<{ homes: HomesLookup }> {
  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const existing = communityReads.get(key);
  if (existing) return existing;
  const pending = fetch(`/api/community?lat=${latitude}&lng=${longitude}`)
    .then(async (response) => {
      if (!response.ok) return { homes: { status: "unavailable" as const } };
      return (await response.json()) as { homes: HomesLookup };
    })
    .catch(() => ({ homes: { status: "unavailable" as const } }));
  communityReads.set(key, pending);
  return pending;
}

function loadPair(
  latitude: number,
  longitude: number,
): Promise<[GeologyReport, { homes: HomesLookup }]> {
  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const existing = pairedReads.get(key);
  if (existing) return existing;
  const pending = Promise.all([
    loadReport(latitude, longitude),
    loadCommunity(latitude, longitude),
  ]);
  pairedReads.set(key, pending);
  return pending;
}

function formatMiles(meters: number): string {
  return `${(meters / 1609.344).toFixed(2)} miles`;
}

function formatShare(fraction: number): string {
  const percent = fraction * 100;
  if (percent < 0.01) return "under 0.01%";
  if (percent < 1) return `${percent.toFixed(2)}%`;
  return `${percent.toFixed(1)}%`;
}

function EstimateBody({
  latitude,
  longitude,
  megawatts,
}: {
  latitude: number;
  longitude: number;
  megawatts: number;
}) {
  const [report, community] = use(loadPair(latitude, longitude));
  const homes =
    community.homes.status === "found"
      ? { meters: community.homes.meters, onBuilding: community.homes.onBuilding }
      : null;
  const impact = peopleImpact({
    megawatts,
    homes,
    streamflowCfs: report.water?.streamflowCfs ?? null,
    floodZones: report.floodZones,
  });
  const stream = report.water?.stream;
  const streamName = stream?.status === "found" ? stream.value.name : null;
  const streamMiles = stream?.status === "found" ? stream.value.miles : null;
  const homesLine =
    community.homes.status === "unavailable"
      ? "The county building map did not respond, so the distance to homes is unknown."
      : community.homes.status === "empty"
        ? "No residential building is mapped within 12 miles of this pin."
        : impact.onResidentialBuilding
          ? "This pin is on a mapped residential building. Noise and air below are calculated at 15 meters, because the outdoor formulas are not defined at the wall."
          : `This pin is ${formatMiles(impact.homesMeters ?? 0)} from the nearest mapped residential building.`;

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-foreground">{homesLine}</p>
      <Metric
        title="Noise at those homes"
        value={
          impact.noiseLeqDba === null
            ? "Not calculated"
            : `${Math.round(impact.noiseLeqDba)} dBA`
        }
        decision={
          impact.noiseLdnDba === null
            ? `${EPA_OUTDOOR_LDN_DBA} dBA Ldn`
            : `${Math.round(impact.noiseLdnDba)} dBA Ldn if it runs all night`
        }
        note={
          impact.noiseLeqDba === null
            ? "ISO 9613-2 needs the distance to a home. The decision line remains the EPA outdoor level of 55 dBA Ldn."
            : `ISO 9613-2 spreads a ${Math.round(impact.soundPowerDba)} dBA source over ${Math.round(impact.receiverMeters ?? 0)} meters: 20 log10(distance) + 11, plus 0.002 dB per meter. The source is ${impact.coolingCells} cooling-tower cells at 108 dBA each, one cell per 2.5 MW, added by energy. Barriers and ground absorption are left out, so a mitigated design would be quieter. The EPA outdoor level for homes is ${EPA_OUTDOOR_LDN_DBA} dBA Ldn.`
        }
      />
      <Metric
        title="Water those homes share"
        value={
          impact.streamflowShare === null
            ? `${Math.round(impact.withdrawalGallonsPerDay).toLocaleString("en-US")} gal/day`
            : `${formatShare(impact.streamflowShare)} of gage flow`
        }
        decision={
          report.water?.streamflowCfs
            ? `${report.water.streamflowCfs.toLocaleString("en-US")} cfs ${
                report.water.streamflowBasis === "typical-day"
                  ? "on a typical day"
                  : "in the latest reading"
              }`
            : "No discharge record at the gage"
        }
        note={`On-site cooling water is about ${Math.round(impact.withdrawalGallonsPerDay).toLocaleString("en-US")} gallons a day, from the LBNL 2024 averages (PUE 1.4, site WUE 0.36 liters per IT kilowatt-hour). ${
          streamName
            ? `The nearest active gage is ${streamName}${streamMiles === null ? "" : `, ${streamMiles} ${streamMiles === 1 ? "mile" : "miles"} from the pin`}.`
            : "No active stream gage was returned within 8 miles."
        } ${
          report.water?.streamflowBasis === "typical-day"
            ? "The gage has no fresh discharge, so the share uses the long-term mean for this calendar day."
            : ""
        } ${impact.floodNote ?? "No special flood hazard is mapped at the pin."} That flow is the river those communities share. It is not a withdrawal permit.`}
      />
      <Metric
        title="Electricity on their feeder"
        value={`${impact.feederMultiple.toFixed(1)}× a neighborhood feeder`}
        decision={`${FEEDER_PEAK_MVA} MVA typical 15 kV peak`}
        note={`EPRI reports that most 15 kV feeders, the circuits that serve neighborhoods, peak at 4 to 6 MVA. ${megawatts} MW is ${impact.feederMultiple.toFixed(1)} times the top of that range, so the load is larger than the circuit the nearest homes would share. It needs its own interconnection. Outage counts and harmonic distortion, which The Cloud Next Door measured near operating sites, are not sensors on this pin.`}
      />
      <Metric
        title="Air at those homes"
        value={
          impact.no2Micrograms === null
            ? "Not calculated"
            : `${Math.round(impact.no2Micrograms).toLocaleString("en-US")} µg/m³ NO₂`
        }
        decision={`${NO2_1H_UG_PER_M3} µg/m³, the 1-hour standard`}
        note={
          impact.no2Micrograms === null
            ? "The Gaussian plume needs the distance to a home. The decision line is the EPA 1-hour NO₂ standard, 100 ppb."
            : `A Gaussian plume (urban Briggs class D, wind 2 m/s toward the homes, release height 5 m) carries uncontrolled diesel exhaust for one hour at the full ${megawatts} MW backup load. AP-42 gives 3.2 lb NOx per million Btu; this screen counts all of it as NO₂. PM-10 in that same hour is about ${Math.round(impact.pm10Micrograms ?? 0).toLocaleString("en-US")} µg/m³. The 24-hour PM2.5 standard is 35 µg/m³ and is a different average.${(impact.receiverMeters ?? 0) < 100 ? " Under 100 meters the Briggs curves are outside their usual range, so treat this as a screen." : ""} This is a one-hour screening case, not an annual concentration.`
        }
      />
      <ComplianceBlock
        floodZones={report.floodZones}
        floodChecked={
          !report.messages.some((message) =>
            message.includes("flood-hazard service did not respond"),
          )
        }
        units={report.units}
        geologyChecked={
          !report.messages.some((message) =>
            message.includes("geologic map did not respond"),
          )
        }
        noiseLdnDba={impact.noiseLdnDba}
        no2Micrograms={impact.no2Micrograms}
      />
      <p className="text-xs leading-5 text-muted-foreground">
        {report.units.length > 0 ? report.units.map((unit) => unit.name).join("; ") : "No geologic unit was returned."}
        {report.water ? ` ${describeChannel(report.water.channel)}` : ""}
      </p>
      <ul className="space-y-1 text-xs leading-5">
        <li>
          <a className="text-primary hover:underline" href="https://doi.org/10.1145/3715335.3736324" target="_blank" rel="noreferrer">
            Ngata, Bashir, and Westerlaken, The Cloud Next Door, ACM COMPASS 2025
          </a>
        </li>
        <li>
          <a className="text-primary hover:underline" href="https://cms2.revize.com/revize/eastwhitelandtownshippa/Documents/Government/Departments/Planning%20And%20Development/Land%20Developments%20Applications/2023%20Subdivision/10%20%20Data%20Center%20Noise%20study%2010-27-23.pdf" target="_blank" rel="noreferrer">
            East Whiteland data-center noise study, ISO 9613-2, 108 dBA per cell
          </a>
        </li>
        <li>
          <a className="text-primary hover:underline" href="https://www.epa.gov/archive/epa/aboutepa/epa-identifies-noise-levels-affecting-health-and-welfare.html" target="_blank" rel="noreferrer">
            EPA outdoor noise level, 55 dBA Ldn, 1974
          </a>
        </li>
        <li>
          <a className="text-primary hover:underline" href="https://www.epa.gov/system/files/documents/2025-04/c03s04_april2025.pdf" target="_blank" rel="noreferrer">
            EPA AP-42 section 3.4, large diesel engines
          </a>
        </li>
        <li>
          <a className="text-primary hover:underline" href="https://www.epa.gov/no2-pollution/primary-national-ambient-air-quality-standards-naaqs-nitrogen-dioxide" target="_blank" rel="noreferrer">
            EPA 1-hour NO₂ standard, 100 ppb
          </a>
        </li>
        <li>
          <a className="text-primary hover:underline" href="https://www.epa.gov/scram/air-quality-dispersion-modeling-screening-models" target="_blank" rel="noreferrer">
            EPA screening dispersion models, Briggs urban curves
          </a>
        </li>
        <li>
          <a className="text-primary hover:underline" href="https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report.pdf" target="_blank" rel="noreferrer">
            LBNL 2024 water-use effectiveness
          </a>
        </li>
        <li>
          <a className="text-primary hover:underline" href="https://www.epri.com/research/products/000000003002011005" target="_blank" rel="noreferrer">
            EPRI 3002011005, typical 15 kV feeder peak of 4 to 6 MVA
          </a>
        </li>
        <li>
          <a className="text-primary hover:underline" href="https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Buildings/MapServer/0" target="_blank" rel="noreferrer">
            Allegheny County building footprints, residential code 210
          </a>
        </li>
      </ul>
    </div>
  );
}

function Metric({
  title,
  value,
  decision,
  note,
}: {
  title: string;
  value: string;
  decision: string;
  note: string;
}) {
  return (
    <section className="border border-border px-3 py-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            At the homes
          </p>
          <p className="mt-1 text-sm leading-5 text-foreground">{value}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            Decision line
          </p>
          <p className="mt-1 text-sm leading-5 text-foreground">{decision}</p>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </section>
  );
}

function EstimateSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
