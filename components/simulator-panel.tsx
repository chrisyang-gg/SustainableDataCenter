"use client";

import { useState, type ReactNode } from "react";
import { SimulatorMethodology, SimulatorParameterGuide } from "@/components/simulator-methodology";
import type { SimulatorMethodId } from "@/lib/simulator-methodology";
import { EPA_OUTDOOR_LDN_DBA, FEEDER_PEAK_MVA, NO2_1H_UG_PER_M3 } from "@/lib/impact";
import {
  applyDataCenterProfile,
  DEFAULT_SIMULATOR_INPUT,
  PA_RESIDENTIAL_CENTS_PER_KWH,
  PWSA_DOLLARS_PER_THOUSAND_GALLONS,
  simulateDataCenter,
  type CoolingChoice,
  type SimulatorImpact,
  type SimulatorInput,
} from "@/lib/simulator";
import { Button } from "@/components/ui/button";
import { COOLING_SYSTEMS, coolingSystem, DATA_CENTER_PROFILES, GRID_WATER_L_PER_FACILITY_KWH, LBNL_REPORT_URL, type DataCenterProfileId } from "@/lib/lbnl-simulator";


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
  const [draft, setDraft] = useState<SimulatorInput>(DEFAULT_SIMULATOR_INPUT);
  const [impact, setImpact] = useState<SimulatorImpact | null>(null);

  function update(patch: Partial<SimulatorInput>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function chooseProfile(profile: DataCenterProfileId) {
    setDraft((current) => applyDataCenterProfile(current, profile));
  }

  const reference = DATA_CENTER_PROFILES[draft.profile];
  const customEfficiencies = draft.pue !== reference.pue || draft.siteWueLPerKwh !== reference.wue;

  const facilityMw = Number.isFinite(draft.facilityMegawatts) ? draft.facilityMegawatts : 0;
  const itMw = draft.pue > 0 ? facilityMw / draft.pue : 0;

  return (
    <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
      <div className="space-y-4 px-4 py-4">
        <header>
          <h2 className="text-xl font-medium text-foreground">Data center simulator</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Set the building, then run one estimate. Each impact includes its calculation and specific references.
          </p>
        </header>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Data center categories">
          {(Object.entries(DATA_CENTER_PROFILES) as [DataCenterProfileId, (typeof DATA_CENTER_PROFILES)[DataCenterProfileId]][]).map(([id, profile]) => (
            <button
              key={id}
              type="button"
              aria-pressed={draft.profile === id}
              className={`border px-3 py-2 text-sm font-medium ${draft.profile === id ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"}`}
              onClick={() => chooseProfile(id)}
            >
              {profile.label}
            </button>
          ))}
        </div>
        <section className="space-y-2 border border-border px-3 py-3 text-sm leading-6">
          <h3 className="font-medium text-foreground">{reference.label}: LBNL reference</h3>
          <p className="text-foreground">PUE {reference.pue.toFixed(2)} · Site WUE {reference.wue.toFixed(2)} L/IT-kWh</p>
          <p className="text-muted-foreground">Figure 4.5 central estimates (medians), based on the 2023 category mix. The report’s group is “{reference.reportLabel}”. SMB uses the broader Small group; SPs uses Midsize and Colo.</p>
          <p className="text-muted-foreground">These profiles do not set a facility’s MW size. AI is a workload profile that can occur in hyperscale or colocation facilities.</p>
          <a href={`${LBNL_REPORT_URL}#page=47`} className="text-primary underline" target="_blank" rel="noreferrer">Figure 4.5, p. 47</a>
          {customEfficiencies ? <div>
            <p className="text-foreground">Custom PUE/WUE entered for this design.</p>
            <button type="button" className="text-primary underline" onClick={() => chooseProfile(draft.profile)}>Restore category PUE and WUE</button>
          </div> : null}
        </section>
        <SimulatorParameterGuide />
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
            hint="PUE = facility electricity / IT electricity. Starts from Figure 4.5; edit only if you have a design-specific value. UPS losses are already included."
          >
            <NumberControl
              label="PUE"
              value={draft.pue}
              min={1}
              max={3}
              step={0.01}
              onChange={(pue) => update({ pue })}
            />
          </Field>
          <Field
            label="UPS efficiency (fixed)"
            component="Uninterruptible power supply"
            hint="Table 4.3 reports a range, not a single efficiency. This reference is already represented in PUE and is not multiplied into energy again."
          >
            <output aria-label="UPS efficiency" className="block border border-border bg-muted px-2 py-2 text-base text-foreground">{reference.upsMin}–{reference.upsMax}%</output>
            <a className="mt-2 block text-sm text-primary underline" href={`${LBNL_REPORT_URL}#page=43`} target="_blank" rel="noreferrer">Table 4.3, p. 43</a>
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
            hint="Nine design families from Table 4.2. Category PUE/WUE averages combine multiple cooling systems; this selection does not invent system-specific efficiency factors."
          >
            <select
              className="h-8 w-full border border-border bg-black px-2 text-sm text-foreground"
              value={draft.cooling}
              aria-label="Cooling system"
              onChange={(event) => update({ cooling: event.target.value as CoolingChoice })}
            >
              {COOLING_SYSTEMS.map((system) => <option key={system.id} value={system.id}>{system.label}</option>)}
            </select>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{coolingSystem(draft.cooling).note}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Category-average mode: the entered PUE and WUE determine energy and water. For this specific cooling design, enter measured/design PUE and WUE; tower count remains a separate noise input.</p>
            <a className="mt-2 block text-sm text-primary underline" href={`${LBNL_REPORT_URL}#page=40`} target="_blank" rel="noreferrer">Cooling-system definitions: Table 4.2, pp. 40–42</a>
          </Field>
          <Field
            label="Site WUE"
            component="On-site water consumption"
            hint="Liters consumed on site per IT kWh. Starts from the selected category’s Figure 4.5 value; edit for a design-specific estimate."
          >
            <NumberControl
              label="Site water use"
              value={draft.siteWueLPerKwh}
              min={0}
              max={3}
              step={0.01}
              suffix="L/kWh"
              onChange={(siteWueLPerKwh) => update({ siteWueLPerKwh })}
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
              Run an estimate to see each impact, its formula, the values used, source pages, and modeling assumptions.
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
  const c = impact.configuration;
  return (
    <>
      <h2 className="text-lg font-medium text-foreground">Results and calculation references</h2>
      <p className="text-sm leading-6 text-muted-foreground">These results use the inputs from your last run. Expand a result to trace its calculation. Price increments are illustrative app assumptions; references supply their baseline data.</p>
      <Metric
        title="Electricity and IT load"
        value={`${impact.itMegawatts.toLocaleString("en-US", { maximumFractionDigits: 2 })} MW IT`}
        decision={`${(c.facilityMegawatts * c.hoursPerYear).toLocaleString("en-US")} MWh/year`}
        referenceLabel="Facility energy"
        note={`${impact.averageMegawatts.toLocaleString("en-US", { maximumFractionDigits: 2 })} MW annual-average facility load. Infrastructure uses ${(impact.infrastructureEnergyKwh / 1000).toLocaleString("en-US", { maximumFractionDigits: 0 })} MWh/year (${(impact.infrastructureShare * 100).toFixed(1)}% of total), already including UPS and cooling overhead.`}
        method="energy"
        impact={impact}
      />
      <Metric
        title="Direct on-site water consumption"
        value={`${impact.gallonsPerDay.toLocaleString("en-US", { maximumFractionDigits: 0 })} US gal/day`}
        decision={`${c.siteWueLPerKwh.toFixed(2)} L / IT kWh`}
        referenceLabel="Site WUE used"
        note={`${(impact.directWaterLitersPerYear / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })} million liters/year. ${impact.coolingLabel}`}
        method="water"
        impact={impact}
      />
      <Metric
        title="Direct + electricity-associated water"
        value={`${(impact.totalWaterLitersPerYear / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })} million L/year`}
        decision={`${GRID_WATER_L_PER_FACILITY_KWH.toFixed(2)} L / facility kWh`}
        referenceLabel="2023 U.S. data-center grid proxy"
        note={`${(impact.directWaterLitersPerYear / 1_000_000).toFixed(2)} million L direct + ${(impact.indirectWaterLitersPerYear / 1_000_000).toFixed(2)} million L off-site. The grid proxy is not a local utility measurement, and off-site water is not added to the local water-price scenario.`}
        method="waterFootprint"
        impact={impact}
      />
      <p className="text-sm leading-6 text-muted-foreground">{impact.areaNote}</p>
      <Metric
        title="Cooling-tower noise at homes"
        value={impact.noiseLeqDba === null ? "No tower-noise estimate" : `${impact.noiseLeqDba.toFixed(1)} dBA Leq`}
        decision={`${EPA_OUTDOOR_LDN_DBA} dBA Ldn`}
        referenceLabel="EPA guidance"
        note={impact.noiseLeqDba === null
          ? "Zero cooling-tower cells. Other equipment noise is not estimated."
          : c.runsAllNight
            ? `Continuous-operation scenario: ${impact.noiseLdnDba?.toFixed(1)} dBA Ldn. The 55 dBA reference is health guidance, not a local legal limit.`
            : "Night operation is off: this is operating Leq, not a 24-hour Ldn. A comparison with the Ldn guidance is not calculated."}
        method="noise"
        impact={impact}
      />
      <Metric
        title="Diesel exhaust screen"
        value={`${impact.no2Micrograms.toLocaleString("en-US", { maximumFractionDigits: 1 })} µg/m³ NO₂`}
        decision={`${NO2_1H_UG_PER_M3} µg/m³ (100 ppb)`}
        referenceLabel="EPA 1-hour NO₂ level"
        note={`${impact.pm10Micrograms.toLocaleString("en-US", { maximumFractionDigits: 1 })} µg/m³ PM₁₀ in the same one-hour scenario. ${impact.stacks === 0 ? "No modeled diesel contribution." : `Receptor at ${impact.plumeMeters.toLocaleString("en-US")} m${impact.plumeMeters > Math.max(c.homesMeters, 15) ? ", using the downwind peak beyond the homes" : ""}.`} A single modeled hour is not a regulatory compliance determination.`}
        method="air"
        impact={impact}
      />
      <Metric
        title="Illustrative electricity price increment"
        value={`+${centsPerKwh(impact.electricityCentsPerKwh)}`}
        decision={`${PA_RESIDENTIAL_CENTS_PER_KWH.toFixed(2)}¢ / kWh`}
        referenceLabel="PA residential baseline, 2025"
        note={impact.electricityAssumption}
        method="electricityPrice"
        impact={impact}
      />
      <Metric
        title="Illustrative water and sewer price increment"
        value={`+${dollarsPerThousandGallons(impact.waterDollarsPerThousandGallons)}`}
        decision={`$${PWSA_DOLLARS_PER_THOUSAND_GALLONS.toFixed(2)} / 1,000 gal`}
        referenceLabel="Selected residential charges, 2026"
        note={impact.waterAssumption}
        method="waterPrice"
        impact={impact}
      />
      <Metric
        title="Feeder load scale"
        value={`${impact.feederMultiple.toFixed(1)}× typical peak loading`}
        decision={`${FEEDER_PEAK_MVA} MVA reference`}
        referenceLabel="EPRI loading benchmark"
        note="Operating facility MW divided by 6 MVA, assuming unity power factor. This compares scale with typical 15 kV feeder loading; it does not estimate spare capacity or establish an overload."
        method="feeder"
        impact={impact}
      />
    </>
  );
}

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
  referenceLabel,
  note,
  method,
  impact,
}: {
  title: string;
  value: string;
  decision: string;
  referenceLabel: string;
  note: string;
  method: SimulatorMethodId;
  impact: SimulatorImpact;
}) {
  return (
    <section className="border border-border px-3 py-3">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Result</p>
          <p className="mt-1 text-base leading-6 text-foreground">{value}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{referenceLabel}</p>
          <p className="mt-1 text-sm leading-6 text-foreground">{decision}</p>
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
      <SimulatorMethodology id={method} impact={impact} />
    </section>
  );
}
