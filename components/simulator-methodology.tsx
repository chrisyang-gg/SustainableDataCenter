import {
  emissionGramsPerSecond,
  FEEDER_PEAK_MVA,
  GENERATOR_MW,
  LITERS_PER_GALLON,
  NOX_LB_PER_MMBTU,
  PM10_LB_PER_MMBTU,
  RECEIVER_FLOOR_METERS,
} from "@/lib/impact";
import {
  DUQUESNE_SUMMER_PEAK_MW,
  PA_RESIDENTIAL_CENTS_PER_KWH,
  PWSA_DOLLARS_PER_THOUSAND_GALLONS,
  PWSA_GALLONS_PER_DAY,
  type SimulatorImpact,
} from "@/lib/simulator";
import {
  PARAMETER_IMPACTS,
  SIMULATOR_METHODS,
  SOURCES_REVIEWED,
  type SimulatorMethodId,
} from "@/lib/simulator-methodology";
import { GRID_WATER_L_PER_FACILITY_KWH } from "@/lib/lbnl-simulator";

function number(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function workedCalculation(id: SimulatorMethodId, impact: SimulatorImpact): string[] {
  const c = impact.configuration;
  switch (id) {
    case "energy":
      return [
        `${number(c.facilityMegawatts)} MW / ${number(c.pue)} PUE = ${number(impact.itMegawatts)} MW IT`,
        `${number(c.facilityMegawatts)} MW × ${number(c.hoursPerYear)} h = ${number(c.facilityMegawatts * c.hoursPerYear)} MWh/year`,
        `${number(impact.facilityEnergyKwh / 1000)} − ${number(impact.itEnergyKwh / 1000)} = ${number(impact.infrastructureEnergyKwh / 1000)} MWh/year infrastructure (${number(impact.infrastructureShare * 100)}% of total)`,
        `Annual-average facility load = ${number(impact.averageMegawatts)} MW`,
      ];
    case "water":
      return [
        `${number(impact.itEnergyKwh)} IT kWh/year × ${number(c.siteWueLPerKwh)} L/IT-kWh = ${number(impact.directWaterLitersPerYear)} L/year on site`,
        `(${number(c.facilityMegawatts)} / ${number(c.pue)}) × ${number(c.hoursPerYear)} × 1,000 × ${number(c.siteWueLPerKwh)} / ${LITERS_PER_GALLON} / 365 = ${number(impact.gallonsPerDay)} US gal/day`,
      ];
    case "waterFootprint":
      return [
        `On site = ${number(impact.directWaterLitersPerYear)} L/year`,
        `Off site = ${number(impact.facilityEnergyKwh)} facility kWh/year × ${GRID_WATER_L_PER_FACILITY_KWH} L/kWh = ${number(impact.indirectWaterLitersPerYear)} L/year`,
        `Combined = ${number(impact.totalWaterLitersPerYear)} L/year`,
        `Source WUE = ${number(c.siteWueLPerKwh)} + ${number(c.pue)} × ${GRID_WATER_L_PER_FACILITY_KWH} = ${number(c.siteWueLPerKwh + c.pue * GRID_WATER_L_PER_FACILITY_KWH)} L/IT-kWh`,
      ];
    case "noise":
      if (impact.noiseLeqDba === null) return ["N = 0: no cooling-tower noise calculated."];
      return [
        `N = ${c.coolingCells}; r = max(${number(c.homesMeters)}, ${RECEIVER_FLOOR_METERS}) = ${number(Math.max(c.homesMeters, RECEIVER_FLOOR_METERS))} m`,
        `Operating Leq = ${number(impact.noiseLeqDba)} dBA`,
        c.runsAllNight
          ? `Continuous-operation Ldn = ${number(impact.noiseLdnDba ?? 0)} dBA`
          : "Night operation off: Leq is retained; a 24-hour Ldn is not calculated.",
      ];
    case "air": {
      if (impact.stacks === 0) return ["Backup share = 0: modeled diesel NO₂ and PM₁₀ contributions are zero."];
      const backup = c.facilityMegawatts * c.backupFraction;
      const perStack = backup / impact.stacks;
      return [
        `${number(c.facilityMegawatts)} MW × ${number(c.backupFraction * 100)}% = ${number(backup)} MW backup; ceil(${number(backup)} / ${GENERATOR_MW}) = ${impact.stacks} stacks`,
        `Per-stack emissions: NOx Q = ${number(emissionGramsPerSecond(perStack, NOX_LB_PER_MMBTU), 4)} g/s; PM₁₀ Q = ${number(emissionGramsPerSecond(perStack, PM10_LB_PER_MMBTU), 4)} g/s`,
        `Homes = ${number(c.homesMeters)} m; modeled receptor = ${number(impact.plumeMeters)} m; effective plume height = ${number(impact.effectiveHeightMeters)} m`,
        `Screen results: NO₂ = ${number(impact.no2Micrograms)} µg/m³; PM₁₀ = ${number(impact.pm10Micrograms)} µg/m³`,
      ];
    }
    case "electricityPrice":
      return [
        `${number(impact.averageMegawatts)} / ${number(DUQUESNE_SUMMER_PEAK_MW)} = ${number(impact.electricityShare * 100, 4)}% load-to-peak ratio`,
        `${number(PA_RESIDENTIAL_CENTS_PER_KWH)} × ${number(impact.electricityShare, 6)} = +${number(impact.electricityCentsPerKwh, 4)} ¢/kWh (illustrative increment)`,
      ];
    case "waterPrice":
      return [
        `${number(impact.gallonsPerDay)} / ${number(PWSA_GALLONS_PER_DAY)} = ${number(impact.waterShare * 100, 4)}% cooling-water-to-production ratio`,
        `$${number(PWSA_DOLLARS_PER_THOUSAND_GALLONS)} × ${number(impact.waterShare, 6)} = +$${number(impact.waterDollarsPerThousandGallons, 4)} / 1,000 US gal (illustrative increment)`,
      ];
    case "feeder":
      return [`${number(c.facilityMegawatts)} MW / ${FEEDER_PEAK_MVA} MVA ≈ ${number(impact.feederMultiple)}× at assumed unity power factor`];
  }
}

export function SimulatorMethodology({ id, impact }: { id: SimulatorMethodId; impact: SimulatorImpact }) {
  const method = SIMULATOR_METHODS[id];
  return (
    <details className="mt-3 border-t border-border pt-2">
      <summary className="cursor-pointer text-sm text-primary focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={`${method.label}: calculation and references`}>
        Calculation &amp; references
      </summary>
      <div className="mt-3 space-y-4 text-sm leading-6">
        <div>
          <h4 className="font-medium text-foreground">Inputs used</h4>
          <p className="text-muted-foreground">{method.inputs}</p>
        </div>
        <div>
          <h4 className="font-medium text-foreground">Formula</h4>
          <ul className="mt-1 space-y-2">
            {method.formulas.map((formula) => (
              <li key={formula} className="break-words border-l-2 border-border pl-2 font-mono text-sm text-foreground">{formula}</li>
            ))}
          </ul>
          {id === "noise" || id === "air" ? <p className="mt-2 text-muted-foreground">log10 is the base-10 logarithm; exp is the exponential function.</p> : null}
        </div>
        <div>
          <h4 className="font-medium text-foreground">This run</h4>
          <p className="text-muted-foreground">Intermediate values are rounded for display; calculations use full precision.</p>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {workedCalculation(id, impact).map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-foreground">Sources and what they support</h4>
          <ul className="mt-1 space-y-3">
            {method.references.map(({ source, supports }) => (
              <li key={source.href}>
                <a className="text-primary underline underline-offset-2" href={source.href} target="_blank" rel="noreferrer">{source.title}</a>
                <p className="text-muted-foreground">{source.locator}</p>
                <p className="text-foreground">{supports}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-foreground">Assumptions and limits</h4>
          <ul className="mt-1 list-disc space-y-2 pl-4 text-muted-foreground">
            {method.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
          </ul>
        </div>
        <p className="text-muted-foreground">References reviewed {SOURCES_REVIEWED}. Source dates are retained above; inputs are not live utility or weather data.</p>
      </div>
    </details>
  );
}

export function SimulatorParameterGuide() {
  return (
    <details className="border border-border px-3 py-3">
      <summary className="cursor-pointer text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-4">How each parameter affects the results</summary>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Run an estimate, then expand Calculation &amp; references on any result for its equations, values, source pages, and assumptions. Changing inputs requires a new run.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm leading-6">
          <caption className="sr-only">Simulator parameters, affected results, and calculation relationships</caption>
          <thead><tr className="border-b border-border"><th scope="col" className="py-2 pr-3">Parameter</th><th scope="col" className="py-2">Effect</th></tr></thead>
          <tbody>
            {PARAMETER_IMPACTS.map((row) => (
              <tr key={row.parameter} className="border-b border-border align-top">
                <th scope="row" className="py-2 pr-3 font-medium text-foreground">{row.parameter}</th>
                <td className="py-2 text-muted-foreground"><p className="text-foreground">{row.impacts}</p><p>{row.explanation}</p></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
