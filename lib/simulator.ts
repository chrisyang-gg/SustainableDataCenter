import {
  backupPlume,
  continuousLdn,
  FEEDER_PEAK_MVA,
  HOURS_PER_YEAR,
  LITERS_PER_GALLON,
  outdoorLevelDba,
  PUE,
  RECEIVER_FLOOR_METERS,
  SITE_WUE_L_PER_KWH,
  soundPowerDba,
} from "@/lib/impact";

/** EIA Electric Power Annual, Pennsylvania residential price, 2025. */
export const PA_RESIDENTIAL_CENTS_PER_KWH = 19.29;

/**
 * Duquesne Light 2025 summer forecasted peak, from the company's summer
 * readiness report filed with the Pennsylvania PUC.
 */
export const DUQUESNE_SUMMER_PEAK_MW = 2703;

/** Pittsburgh Water stated average production. */
export const PWSA_GALLONS_PER_DAY = 65_000_000;

/**
 * Pittsburgh Water volumetric rates effective March 8, 2026, per 1,000 gallons:
 * water, PENNVEST water, wastewater conveyance, and PENNVEST sewer.
 */
export const PWSA_DOLLARS_PER_THOUSAND_GALLONS = 18.28 + 2.13 + 7.32 + 0.88;

export type CoolingChoice = "air" | "evaporative" | "custom";

export type SimulatorInput = {
  /** Facility electricity, IT plus overhead, in MW while it is running. */
  facilityMegawatts: number;
  pue: number;
  areaAcres: number;
  cooling: CoolingChoice;
  siteWueLPerKwh: number;
  hoursPerYear: number;
  runsAllNight: boolean;
  homesMeters: number;
  coolingCells: number;
  /** Share of facility MW covered by diesel backup. */
  backupFraction: number;
  releaseMeters: number;
};

export type SimulatorImpact = {
  facilityMegawatts: number;
  itMegawatts: number;
  areaAcres: number;
  coolingLabel: string;
  gallonsPerDay: number;
  noiseLeqDba: number | null;
  noiseLdnDba: number | null;
  no2Micrograms: number;
  pm10Micrograms: number;
  plumeMeters: number;
  stacks: number;
  effectiveHeightMeters: number;
  feederMultiple: number;
  averageMegawatts: number;
  electricityShare: number;
  waterShare: number;
  /** Added residential price, in cents per kWh. */
  electricityCentsPerKwh: number;
  /** Added volumetric price, in dollars per 1,000 gallons. */
  waterDollarsPerThousandGallons: number;
  electricityAssumption: string;
  waterAssumption: string;
  areaNote: string;
  noiseNote: string;
  homesMeters: number;
  coolingCells: number;
};

function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return low;
  return Math.min(high, Math.max(low, value));
}

export function coolingLabel(choice: CoolingChoice, wue: number): string {
  if (choice === "air") {
    return "Calculated from air cooling, with no on-site water use. Inferred as zero because air cooling does not evaporate water on site.";
  }
  if (choice === "evaporative") {
    return "Calculated from evaporative cooling water use. LBNL reports average on-site use of 0.36 liters per IT kilowatt-hour.";
  }
  return `Calculated from a cooling-water rate of ${wue.toFixed(2)} liters per IT kilowatt-hour. No published rate matches this plant, so the rate is the one set here.`;
}

export const COUNTY_SCALE: SimulatorInput = {
  facilityMegawatts: 25,
  pue: PUE,
  areaAcres: 15,
  cooling: "evaporative",
  siteWueLPerKwh: SITE_WUE_L_PER_KWH,
  hoursPerYear: HOURS_PER_YEAR,
  runsAllNight: true,
  homesMeters: 180,
  coolingCells: 10,
  backupFraction: 1,
  releaseMeters: 5,
};

export const SMALL_FACILITY: SimulatorInput = {
  facilityMegawatts: 2,
  pue: 1.2,
  areaAcres: 2,
  cooling: "air",
  siteWueLPerKwh: 0,
  hoursPerYear: 4000,
  runsAllNight: false,
  homesMeters: 800,
  coolingCells: 1,
  backupFraction: 0,
  releaseMeters: 15,
};

export const LARGE_FACILITY: SimulatorInput = {
  facilityMegawatts: 100,
  pue: 1.5,
  areaAcres: 80,
  cooling: "custom",
  siteWueLPerKwh: 1.2,
  hoursPerYear: HOURS_PER_YEAR,
  runsAllNight: true,
  homesMeters: 40,
  coolingCells: 40,
  backupFraction: 1,
  releaseMeters: 5,
};

function normalize(input: SimulatorInput): SimulatorInput {
  const facilityMegawatts = clamp(input.facilityMegawatts, 0.5, 500);
  const pue = clamp(input.pue, 1.05, 2.5);
  const cooling = input.cooling;
  const siteWueLPerKwh =
    cooling === "air" ? 0 : cooling === "evaporative" ? SITE_WUE_L_PER_KWH : clamp(input.siteWueLPerKwh, 0, 3);
  return {
    facilityMegawatts,
    pue,
    areaAcres: clamp(input.areaAcres, 0.5, 500),
    cooling,
    siteWueLPerKwh,
    hoursPerYear: clamp(input.hoursPerYear, 1, HOURS_PER_YEAR),
    runsAllNight: input.runsAllNight,
    homesMeters: clamp(input.homesMeters, 1, 5000),
    coolingCells: Math.round(clamp(input.coolingCells, 0, 400)),
    backupFraction: clamp(input.backupFraction, 0, 1),
    releaseMeters: clamp(input.releaseMeters, 2, 80),
  };
}

/** One estimate from the construction parameters. */
export function simulateDataCenter(input: SimulatorInput): SimulatorImpact {
  const config = normalize(input);
  const itMegawatts = config.facilityMegawatts / config.pue;
  const itKwh = itMegawatts * config.hoursPerYear * 1000;
  const gallonsPerDay = (itKwh * config.siteWueLPerKwh) / LITERS_PER_GALLON / 365;
  const receiver = Math.max(config.homesMeters, RECEIVER_FLOOR_METERS);
  const noiseLeqDba =
    config.coolingCells < 1
      ? null
      : outdoorLevelDba(soundPowerDba(config.coolingCells), receiver);
  const noiseLdnDba =
    noiseLeqDba === null ? null : config.runsAllNight ? continuousLdn(noiseLeqDba) : noiseLeqDba;
  const noiseNote =
    noiseLeqDba === null
      ? "No cooling towers, so tower noise is not calculated."
      : "The noise level at the nearest residential area. ISO 9613-2: level = source − (20 log10(distance) + 11) − 0.002 × distance.";
  const backupMw = config.facilityMegawatts * config.backupFraction;
  const plume = backupPlume(backupMw, receiver, config.releaseMeters);
  const averageMegawatts = config.facilityMegawatts * (config.hoursPerYear / HOURS_PER_YEAR);
  const electricityShare = averageMegawatts / DUQUESNE_SUMMER_PEAK_MW;
  const waterShare = gallonsPerDay / PWSA_GALLONS_PER_DAY;
  const electricityCentsPerKwh = PA_RESIDENTIAL_CENTS_PER_KWH * electricityShare;
  const waterDollarsPerThousandGallons = PWSA_DOLLARS_PER_THOUSAND_GALLONS * waterShare;

  return {
    facilityMegawatts: config.facilityMegawatts,
    itMegawatts,
    areaAcres: config.areaAcres,
    coolingLabel: coolingLabel(config.cooling, config.siteWueLPerKwh),
    gallonsPerDay,
    noiseLeqDba,
    noiseLdnDba,
    no2Micrograms: plume.no2Micrograms,
    pm10Micrograms: plume.pm10Micrograms,
    plumeMeters: plume.plumeMeters,
    stacks: plume.stacks,
    effectiveHeightMeters: plume.effectiveHeightMeters,
    feederMultiple: config.facilityMegawatts / FEEDER_PEAK_MVA,
    averageMegawatts,
    electricityShare,
    waterShare,
    electricityCentsPerKwh,
    waterDollarsPerThousandGallons,
    electricityAssumption:
      "The electricity price increase faced at the nearest residential area. Inferred as facility load ÷ Duquesne Light's summer peak × the EIA Pennsylvania price.",
    waterAssumption:
      "The water price increase faced at the nearest residential area. Inferred as cooling water ÷ Pittsburgh Water's daily production × its price per 1,000 gallons.",
    areaNote: "Site area is the acreage entered for the yard and is not used in the other results.",
    noiseNote,
    homesMeters: config.homesMeters,
    coolingCells: config.coolingCells,
  };
}
