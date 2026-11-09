"use client";

import { useEffect, useState } from "react";
import type { Facility } from "@/data/facilities";
import { reportedFor } from "@/data/measured";
import type { HomesLookup } from "@/lib/community";
import { publishedLoad } from "@/lib/facilities";
import type { FloodZone, GeologyReport } from "@/lib/geology";
import {
  EPA_OUTDOOR_LDN_DBA,
  FEEDER_PEAK_MVA,
  NO2_1H_UG_PER_M3,
  peopleImpact,
} from "@/lib/impact";
import { describeChannel, type WaterReading } from "@/lib/water";
import { Skeleton } from "@/components/ui/skeleton";

type Ground = {
  homes: HomesLookup;
  water: WaterReading | null;
  floodZones: FloodZone[];
};

export function FacilityImpact({ facility }: { facility: Facility }) {
  const [ground, setGround] = useState<Ground | "loading" | "failed">("loading");

  useEffect(() => {
    const controller = new AbortController();
    const latitude = facility.latitude;
    const longitude = facility.longitude;
    const community = fetch(
      `/api/community?lat=${latitude}&lng=${longitude}`,
      { signal: controller.signal },
    ).then(async (response) => {
      if (!response.ok) throw new Error(String(response.status));
      return (await response.json()) as { homes: HomesLookup };
    });
    const geology = publishedLoad(facility.capacity)
      ? fetch(`/api/geology?lat=${latitude}&lng=${longitude}`, {
          signal: controller.signal,
        }).then(async (response) => {
          if (!response.ok) return null;
          return (await response.json()) as GeologyReport;
        })
      : Promise.resolve(null);
    Promise.all([community, geology])
      .then(([communityResult, geologyResult]) => {
        if (controller.signal.aborted) return;
        setGround({
          homes: communityResult.homes,
          water: geologyResult?.water ?? null,
          floodZones: geologyResult?.floodZones ?? [],
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!controller.signal.aborted) setGround("failed");
      });
    return () => controller.abort();
  }, [facility.latitude, facility.longitude, facility.capacity]);

  return (
    <section aria-labelledby="people-heading">
      <h2 id="people-heading" className="text-base font-semibold">
        People nearby
      </h2>
      {ground === "loading" ? (
        <div className="mt-2 space-y-2" aria-hidden="true">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : ground === "failed" ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The county building map did not respond, so the distance to homes
          was not calculated.
        </p>
      ) : (
        <ImpactBody facility={facility} ground={ground} />
      )}
    </section>
  );
}

function ImpactBody({
  facility,
  ground,
}: {
  facility: Facility;
  ground: Ground;
}) {
  const load = publishedLoad(facility.capacity);
  const reported = reportedFor(facility.slug);
  const homes =
    ground.homes.status === "found"
      ? { meters: ground.homes.meters, onBuilding: ground.homes.onBuilding }
      : null;
  const impact = load
    ? peopleImpact({
        megawatts: load.megawatts,
        homes,
        streamflowCfs: ground.water?.streamflowCfs ?? null,
        floodZones: ground.floodZones,
      })
    : null;
  const homesLine =
    ground.homes.status === "unavailable"
      ? "The county building map did not respond, so the distance to homes is unknown."
      : ground.homes.status === "empty"
        ? "No residential building is mapped within 12 miles of this pin."
        : homes?.onBuilding
          ? "This pin is on a mapped residential building."
          : `This pin is ${formatMiles(homes?.meters ?? 0)} from the nearest mapped residential building.`;
  const stream = ground.water?.stream;
  const streamName = stream?.status === "found" ? stream.value.name : null;
  const streamMiles = stream?.status === "found" ? stream.value.miles : null;

  return (
    <div className="mt-2 space-y-3">
      <p className="text-sm leading-6 text-foreground">{homesLine}</p>
      {!load && !reported?.noise ? (
        <p className="text-sm leading-6 text-muted-foreground">
          No published megawatt figure was found, and no measured noise, air,
          water, or electricity figure was found, so those effects are not
          estimated.
        </p>
      ) : null}
      {reported?.noise ? (
        <Metric
          title="Noise at the property line"
          value={`${reported.noise.everydayDba} dBA`}
          valueLabel="Reported"
          decision={`${reported.noise.outageDba} dBA if every generator runs`}
          note={`Jacobs modeling, reported by WESA, puts everyday operation at about ${reported.noise.everydayDba} dB at ${reported.noise.place} on a hot day, and about ${reported.noise.outageDba} dB there if every generator runs. This is the applicant’s model, not a monitor at the nearest home. The EPA outdoor level for homes is ${EPA_OUTDOOR_LDN_DBA} dBA Ldn.${
            impact?.noiseLeqDba != null
              ? ` The unmitigated ISO 9613-2 screen at the nearest home, ${Math.round(impact.receiverMeters ?? 0)} meters away, is ${Math.round(impact.noiseLeqDba)} dBA. That screen leaves out the barriers this study includes.`
              : ""
          }`}
        />
      ) : impact?.noiseLeqDba != null ? (
        <Metric
          title="Noise at those homes"
          value={`${Math.round(impact.noiseLeqDba)} dBA`}
          valueLabel="Estimated"
          decision={`${Math.round(impact.noiseLdnDba ?? 0)} dBA Ldn if it runs all night`}
          note={`No measured noise figure was found, so this is the ISO 9613-2 screen: a ${Math.round(impact.soundPowerDba)} dBA source over ${Math.round(impact.receiverMeters ?? 0)} meters, from ${impact.coolingCells} cooling-tower cells at 108 dBA each. Barriers are left out. The EPA outdoor level for homes is ${EPA_OUTDOOR_LDN_DBA} dBA Ldn. The load used is ${load?.label}.`}
        />
      ) : null}
      {impact ? (
        <>
          <Metric
            title="Water those homes share"
            value={
              impact.streamflowShare === null
                ? `${Math.round(impact.withdrawalGallonsPerDay).toLocaleString("en-US")} gal/day`
                : `${formatShare(impact.streamflowShare)} of gage flow`
            }
            valueLabel="Estimated"
            decision={
              ground.water?.streamflowCfs
                ? `${ground.water.streamflowCfs.toLocaleString("en-US")} cfs ${
                    ground.water.streamflowBasis === "typical-day"
                      ? "on a typical day"
                      : "in the latest reading"
                  }`
                : "No discharge record at the gage"
            }
            note={`No site-specific withdrawal was published. On-site cooling water is about ${Math.round(impact.withdrawalGallonsPerDay).toLocaleString("en-US")} gallons a day at ${load?.label}, from the LBNL 2024 averages (PUE 1.4, site WUE 0.36 liters per IT kilowatt-hour). ${
              streamName
                ? `The nearest active gage is ${streamName}${streamMiles === null ? "" : `, ${streamMiles} ${streamMiles === 1 ? "mile" : "miles"} from the pin`}.`
                : "No active stream gage was returned within 8 miles."
            } ${
              ground.water?.streamflowBasis === "typical-day"
                ? "The gage has no fresh discharge, so the share uses the long-term mean for this calendar day."
                : ""
            } ${impact.floodNote ?? "No special flood hazard is mapped at the pin."} That flow is the river those communities share. It is not a withdrawal permit.`}
          />
          <Metric
            title="Electricity on their feeder"
            value={`${impact.feederMultiple.toFixed(1)}× a neighborhood feeder`}
            valueLabel="Estimated"
            decision={`${FEEDER_PEAK_MVA} MVA typical 15 kV peak`}
            note={`No feeder measurement was published for this site. EPRI reports that most 15 kV neighborhood feeders peak at 4 to 6 MVA. At ${load?.label}, the load is ${impact.feederMultiple.toFixed(1)} times the top of that range. Outage counts and harmonic distortion are not sensors on this pin.`}
          />
          <Metric
            title="Air at those homes"
            value={
              impact.no2Micrograms === null
                ? "Not calculated"
                : `${Math.round(impact.no2Micrograms).toLocaleString("en-US")} µg/m³ NO₂`
            }
            valueLabel="Estimated"
            decision={`${NO2_1H_UG_PER_M3} µg/m³, the 1-hour standard`}
            note={
              impact.no2Micrograms === null
                ? `${reported?.airCaveat ? `${reported.airCaveat} ` : ""}No measured concentration was published, and the plume needs the distance to a home.`
                : `${reported?.airCaveat ? `${reported.airCaveat} ` : ""}No measured concentration was published. A Gaussian plume (urban Briggs class D, wind 2 m/s toward the homes, release height 5 m) carries uncontrolled diesel exhaust for one hour at ${load?.label}. AP-42 gives 3.2 lb NOx per million Btu; this screen counts all of it as NO₂. PM-10 in that same hour is about ${Math.round(impact.pm10Micrograms ?? 0).toLocaleString("en-US")} µg/m³.${(impact.receiverMeters ?? 0) < 100 ? " Under 100 meters the Briggs curves are outside their usual range, so treat this as a screen." : ""} This is a one-hour screening case, not an annual concentration.`
            }
          />
          {ground.water ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {describeChannel(ground.water.channel)}
            </p>
          ) : null}
        </>
      ) : null}
      <ul className="space-y-1 text-xs leading-5">
        {reported?.noise ? (
          <li>
            <a
              className="text-primary hover:underline"
              href={reported.noise.sourceHref}
              target="_blank"
              rel="noreferrer"
            >
              {reported.noise.sourceLabel}
            </a>
          </li>
        ) : null}
        {impact ? <ModelSources /> : null}
        <li>
          <a
            className="text-primary hover:underline"
            href="https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Buildings/MapServer/0"
            target="_blank"
            rel="noreferrer"
          >
            Allegheny County building footprints, residential code 210
          </a>
        </li>
      </ul>
    </div>
  );
}

function ModelSources() {
  return (
    <>
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
        <a className="text-primary hover:underline" href="https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report.pdf" target="_blank" rel="noreferrer">
          LBNL 2024 water-use effectiveness
        </a>
      </li>
      <li>
        <a className="text-primary hover:underline" href="https://www.epri.com/research/products/000000003002011005" target="_blank" rel="noreferrer">
          EPRI 3002011005, typical 15 kV feeder peak of 4 to 6 MVA
        </a>
      </li>
    </>
  );
}

function Metric({
  title,
  value,
  valueLabel,
  decision,
  note,
}: {
  title: string;
  value: string;
  valueLabel: string;
  decision: string;
  note: string;
}) {
  return (
    <section className="border border-border px-3 py-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            {valueLabel}
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

function formatMiles(meters: number): string {
  return `${(meters / 1609.344).toFixed(2)} miles`;
}

function formatShare(fraction: number): string {
  const percent = fraction * 100;
  if (percent < 0.01) return "under 0.01%";
  if (percent < 1) return `${percent.toFixed(2)}%`;
  return `${percent.toFixed(1)}%`;
}
