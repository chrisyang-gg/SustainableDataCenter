"use client";

import { useState, type ReactNode } from "react";
import { EPA_OUTDOOR_LDN_DBA, FEEDER_PEAK_MVA, NO2_1H_UG_PER_M3 } from "@/lib/impact";
import {
  COUNTY_SCALE,
  LARGE_FACILITY,
  PA_RESIDENTIAL_CENTS_PER_KWH,
  PWSA_DOLLARS_PER_THOUSAND_GALLONS,
  simulateDataCenter,
  SMALL_FACILITY,
  type CoolingChoice,
  type SimulatorImpact,
  type SimulatorInput,
} from "@/lib/simulator";
import { Button } from "@/components/ui/button";

const PRESETS = [
  { id: "small", label: "Small", input: SMALL_FACILITY },
  { id: "county", label: "25 MW", input: COUNTY_SCALE },
  { id: "large", label: "Large", input: LARGE_FACILITY },
] as const;

function centsPerKwh(value: number): string {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}¢ / kWh`;
}

function dollarsPerThousandGallons(value: number): string {
  const dollars = value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  return `${dollars} / 1,000 gal`;
}

export function SimulatorPanel() {
  const [draft, setDraft] = useState<SimulatorInput>(COUNTY_SCALE);
  const [impact, setImpact] = useState<SimulatorImpact | null>(null);

  function update(patch: Partial<SimulatorInput>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function chooseCooling(cooling: CoolingChoice) {
    if (cooling === "air") update({ cooling, siteWueLPerKwh: 0 });
    else if (cooling === "evaporative") update({ cooling, siteWueLPerKwh: 0.36 });
    else update({ cooling });
  }

  const facilityMw = Number.isFinite(draft.facilityMegawatts) ? draft.facilityMegawatts : 0;
  const itMw = draft.pue > 0 ? facilityMw / draft.pue : 0;

  return (
    <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
      <div className="space-y-4 px-4 py-4">
        <header>
          <h2 className="text-xl font-medium text-foreground">Data center simulator</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Set the building, then run one estimate.
          </p>
        </header>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Hypothetical plants">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
              onClick={() => setDraft(preset.input)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setImpact(simulateDataCenter(draft));
            document.getElementById("simulator-results")?.scrollIntoView({ block: "start" });
          }}
        >
          <Field
            label="Electricity usage"
            component="Utility service"
            hint={`${itMw.toFixed(1)} MW of that is the servers, at a PUE of ${draft.pue.toFixed(2)}.`}
          >
            <NumberControl
              label="Facility megawatts"
              value={draft.facilityMegawatts}
              min={0.5}
              max={500}
              step={0.5}
              suffix="MW"
              onChange={(facilityMegawatts) => update({ facilityMegawatts })}
            />
          </Field>
          <Field
            label="Power usage effectiveness"
            component="Electrical plant"
            hint="PUE is facility electricity divided by the electricity that reaches the servers."
          >
            <NumberControl
              label="PUE"
              value={draft.pue}
              min={1.05}
              max={2.5}
              step={0.05}
              onChange={(pue) => update({ pue })}
            />
          </Field>
          <Field label="Site area" component="Building and yard">
            <NumberControl
              label="Acres"
              value={draft.areaAcres}
              min={0.5}
              max={500}
              step={0.5}
              suffix="acres"
              onChange={(areaAcres) => update({ areaAcres })}
            />
          </Field>
          <Field
            label="Cooling system"
            component="Cooling plant"
            hint="Choosing a system sets the water use. Custom keeps the number you type."
          >
            <select
              className="h-8 w-full border border-border bg-black px-2 text-sm text-foreground"
              value={draft.cooling}
              aria-label="Cooling system"
              onChange={(event) => chooseCooling(event.target.value as CoolingChoice)}
            >
              <option value="air">Air-cooled, no evaporative makeup</option>
              <option value="evaporative">Evaporative towers, LBNL average</option>
              <option value="custom">Custom water use</option>
            </select>
          </Field>
          <Field
            label="Water usage"
            component="Cooling water"
            hint="Liters of on-site water per kilowatt-hour that reaches the servers."
          >
            <NumberControl
              label="Site water use"
              value={draft.siteWueLPerKwh}
              min={0}
              max={3}
              step={0.01}
              suffix="L/kWh"
              onChange={(siteWueLPerKwh) => update({ cooling: "custom", siteWueLPerKwh })}
            />
          </Field>
          <Field label="Hours running" component="Operating schedule">
            <NumberControl
              label="Hours per year"
              value={draft.hoursPerYear}
              min={1}
              max={8760}
              step={1}
              suffix="h/year"
              onChange={(hoursPerYear) => update({ hoursPerYear })}
            />
          </Field>
          <Field label="Night operation" component="Operating schedule">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={draft.runsAllNight}
                onChange={(event) => update({ runsAllNight: event.target.checked })}
              />
              The cooling plant runs through the night
            </label>
          </Field>
          <Field
            label="Distance to the nearest residential area"
            component="Setback"
            hint="Meters from the plant to the nearest residential area."
          >
            <NumberControl
              label="Distance to the nearest residential area"
              value={draft.homesMeters}
              min={15}
              max={5000}
              step={5}
              suffix="m"
              onChange={(homesMeters) => update({ homesMeters })}
            />
          </Field>
          <Field
            label="Cooling-tower cells"
            component="Cooling towers"
            hint="Counted as the cooling towers that make the noise."
          >
            <NumberControl
              label="Cooling cells"
              value={draft.coolingCells}
              min={0}
              max={400}
              step={1}
              onChange={(coolingCells) => update({ coolingCells })}
            />
          </Field>
          <Field
            label="Diesel backup"
            component="Generators"
            hint="Share of the facility electricity covered by diesel generators for the one-hour exhaust screen."
          >
            <NumberControl
              label="Backup share"
              value={Math.round(draft.backupFraction * 100)}
              min={0}
              max={100}
              step={5}
              suffix="%"
              onChange={(percent) => update({ backupFraction: percent / 100 })}
            />
          </Field>
          <Field label="Exhaust height" component="Generator stacks">
            <NumberControl
              label="Release height"
              value={draft.releaseMeters}
              min={2}
              max={80}
              step={1}
              suffix="m"
              onChange={(releaseMeters) => update({ releaseMeters })}
            />
          </Field>
          <Button type="submit">Run estimate</Button>
        </form>
        <section id="simulator-results" className="space-y-3" aria-live="polite">
          {impact === null ? (
            <p className="text-sm leading-6 text-muted-foreground">
              Each result appears here with the criterion it is calculated from.
            </p>
          ) : (
            <Results impact={impact} />
          )}
        </section>
      </div>
    </div>
  );
}

function Results({ impact }: { impact: SimulatorImpact }) {
  const diesel = impact.no2Micrograms > 0 || impact.pm10Micrograms > 0;
  return (
    <>
      <section className="border border-border px-3 py-2">
        <p className="text-sm leading-6 text-foreground">{impact.coolingLabel}</p>
        <Sources links={impact.coolingLabel.includes("LBNL") ? [LBNL_WATER] : []} />
      </section>
      <p className="text-sm leading-6 text-muted-foreground">{impact.areaNote}</p>
      <Metric
        title="Noise at the homes"
        value={impact.noiseLeqDba === null ? "No cooling-tower bank" : `${Math.round(impact.noiseLeqDba)} dBA`}
        decision={
          impact.noiseLdnDba === null
            ? `${EPA_OUTDOOR_LDN_DBA} dBA Ldn`
            : `${Math.round(impact.noiseLdnDba)} dBA Ldn`
        }
        note={impact.noiseNote}
        sources={[ISO_9613, EAST_WHITELAND_NOISE, EPA_NOISE]}
      />
      <Metric
        title="Air at the homes"
        value={`${Math.round(impact.no2Micrograms).toLocaleString("en-US")} µg/m³ NO₂`}
        decision={`${NO2_1H_UG_PER_M3} µg/m³, the 1-hour standard`}
        note={
          diesel
            ? "The generator exhaust at the nearest residential area. EPA plume formula: concentration = emission ÷ (π × wind × σy × σz) × exp(−height² ÷ (2 × σz²))."
            : "No diesel backup, so the nearest residential area gets no generator exhaust."
        }
        sources={diesel ? [EPA_AP42, EPA_PLUME, MCLAREN_STACK, EPA_NO2] : [EPA_NO2]}
      />
      <Metric
        title="Pennsylvania average electricity price"
        value={centsPerKwh(impact.electricityCentsPerKwh)}
        decision={`${PA_RESIDENTIAL_CENTS_PER_KWH.toFixed(2)}¢ / kWh`}
        note={impact.electricityAssumption}
        sources={[EIA_PRICE, DUQUESNE_PEAK]}
      />
      <Metric
        title="Pittsburgh average water price"
        value={dollarsPerThousandGallons(impact.waterDollarsPerThousandGallons)}
        decision={`$${PWSA_DOLLARS_PER_THOUSAND_GALLONS.toFixed(2)} / 1,000 gal`}
        note={impact.waterAssumption}
        sources={[PWSA_RATES, PWSA_PRODUCTION]}
      />
      <Metric
        title="Feeder load"
        value={`${impact.feederMultiple.toFixed(1)}× a neighborhood feeder`}
        decision={`${FEEDER_PEAK_MVA} MVA typical 15 kV peak`}
        note="The feeder comparison a neighborhood would feel. Inferred as facility megawatts ÷ 6, the top of the peak EPRI reports for most 15 kV lines."
        sources={[EPRI_FEEDER]}
      />
    </>
  );
}

type SourceLink = { href: string; label: string };

const ISO_9613: SourceLink = {
  href: "https://www.iso.org/standard/20649.html",
  label: "ISO 9613-2, outdoor sound attenuation",
};
const EAST_WHITELAND_NOISE: SourceLink = {
  href: "https://cms2.revize.com/revize/eastwhitelandtownshippa/Documents/Government/Departments/Planning%20And%20Development/Land%20Developments%20Applications/2023%20Subdivision/10%20%20Data%20Center%20Noise%20study%2010-27-23.pdf",
  label: "East Whiteland data-center noise study, 108 dBA per cell",
};
const EPA_NOISE: SourceLink = {
  href: "https://www.epa.gov/archive/epa/aboutepa/epa-identifies-noise-levels-affecting-health-and-welfare.html",
  label: "EPA outdoor noise level, 55 dBA Ldn, 1974",
};
const EPA_AP42: SourceLink = {
  href: "https://www.epa.gov/system/files/documents/2025-04/c03s04_april2025.pdf",
  label: "EPA AP-42 section 3.4, large diesel engines",
};
const EPA_PLUME: SourceLink = {
  href: "https://www.epa.gov/scram/air-quality-dispersion-modeling-screening-models",
  label: "EPA screening dispersion models",
};
const MCLAREN_STACK: SourceLink = {
  href: "https://efiling.energy.ca.gov/GetDocument.aspx?tn=222041-12",
  label: "McLaren data center plume assessment, stack geometry",
};
const EPA_NO2: SourceLink = {
  href: "https://www.epa.gov/no2-pollution/primary-national-ambient-air-quality-standards-naaqs-nitrogen-dioxide",
  label: "EPA 1-hour NO₂ standard, 100 ppb",
};
const EIA_PRICE: SourceLink = {
  href: "https://www.eia.gov/electricity/annual/html/epa_02_10.html",
  label: "EIA, Pennsylvania residential electricity price, 2025",
};
const DUQUESNE_PEAK: SourceLink = {
  href: "https://www.puc.pa.gov/media/3498/dlc-2025-summer-readiness-overview-report.pdf",
  label: "Duquesne Light 2025 summer peak, 2,703 MW",
};
const PWSA_RATES: SourceLink = {
  href: "https://www.pgh2o.com/residential-commercial-customers/rates",
  label: "Pittsburgh Water rates, March 8, 2026",
};
const PWSA_PRODUCTION: SourceLink = {
  href: "https://www.pgh2o.com/your-water/water-quality-treatment",
  label: "Pittsburgh Water average production, about 65 million gallons a day",
};
const EPRI_FEEDER: SourceLink = {
  href: "https://www.epri.com/research/products/000000003002011005",
  label: "EPRI 3002011005, typical 15 kV feeder peak of 4 to 6 MVA",
};
const LBNL_WATER: SourceLink = {
  href: "https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report.pdf",
  label: "LBNL 2024 water-use effectiveness",
};

function Field({
  label,
  component,
  hint,
  children,
}: {
  label: string;
  component: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="block border border-border px-3 py-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="mt-0.5 block font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
        {component}
      </span>
      <span className="mt-2 block">{children}</span>
      {hint ? <span className="mt-1 block text-xs leading-5 text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <span className="flex items-center gap-2">
      <input
        className="h-8 w-full border border-border bg-black px-2 text-sm text-foreground"
        type="number"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {suffix ? <span className="shrink-0 font-mono text-xs text-muted-foreground">{suffix}</span> : null}
    </span>
  );
}

function Metric({
  title,
  value,
  decision,
  note,
  sources,
}: {
  title: string;
  value: string;
  decision: string;
  note: string;
  sources: SourceLink[];
}) {
  return (
    <section className="border border-border px-3 py-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">Result</p>
          <p className="mt-1 text-sm leading-5 text-foreground">{value}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">Decision line</p>
          <p className="mt-1 text-sm leading-5 text-foreground">{decision}</p>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
      <Sources links={sources} />
    </section>
  );
}

function Sources({ links }: { links: SourceLink[] }) {
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
