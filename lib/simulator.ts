import {
  backupPlume,
  continuousLdn,
  FEEDER_PEAK_MVA,
  HOURS_PER_YEAR,
  LITERS_PER_GALLON,
  outdoorLevelDba,
  RECEIVER_FLOOR_METERS,
  soundPowerDba,
} from "@/lib/impact";
import {
  coolingSystem,
  DATA_CENTER_PROFILES,
  GRID_WATER_L_PER_FACILITY_KWH,
  isDataCenterProfileId,
  type CoolingChoice,
  type DataCenterProfileId,
} from "@/lib/lbnl-simulator";
export type { CoolingChoice, DataCenterProfileId } from "@/lib/lbnl-simulator";

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

export type SimulatorInput = {
  profile: DataCenterProfileId;
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
  /** Normalized inputs captured for this run's calculation and references. */
  configuration: SimulatorInput;
  facilityMegawatts: number;
  itMegawatts: number;
  facilityEnergyKwh: number;
  itEnergyKwh: number;
  infrastructureEnergyKwh: number;
  infrastructureShare: number;
  directWaterLitersPerYear: number;
  indirectWaterLitersPerYear: number;
  totalWaterLitersPerYear: number;
  upsEfficiencyMin: number;
  upsEfficiencyMax: number;
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
  return `${coolingSystem(choice).label}. The calculation uses site WUE ${wue.toFixed(2)} L/IT-kWh. Figure 4.5 is a category cooling-mix reference, not a calibration of this individual cooling design.`;
}

export const DEFAULT_SIMULATOR_INPUT: SimulatorInput = {
  profile: "sps",
  facilityMegawatts: 25,
  pue: DATA_CENTER_PROFILES.sps.pue,
  areaAcres: 15,
  cooling: "water-cooled-chiller",
  siteWueLPerKwh: DATA_CENTER_PROFILES.sps.wue,
  hoursPerYear: HOURS_PER_YEAR,
  runsAllNight: true,
  homesMeters: 180,
  coolingCells: 10,
  backupFraction: 1,
  releaseMeters: 5,
};

/** Profile changes reset only the referenced efficiencies, preserving the design. */
export function applyDataCenterProfile(input: SimulatorInput, profile: DataCenterProfileId): SimulatorInput {
  const reference = DATA_CENTER_PROFILES[profile];
  return { ...input, profile, pue: reference.pue, siteWueLPerKwh: reference.wue };
}

function normalize(input: SimulatorInput): SimulatorInput {
  const facilityMegawatts = clamp(input.facilityMegawatts, 0.5, 500);
  const pue = clamp(input.pue, 1, 3);
  const cooling = coolingSystem(input.cooling).id;
  const siteWueLPerKwh = clamp(input.siteWueLPerKwh, 0, 3);
  return {
    profile: isDataCenterProfileId(input.profile) ? input.profile : "sps",
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
  const facilityEnergyKwh = config.facilityMegawatts * config.hoursPerYear * 1000;
  const infrastructureEnergyKwh = facilityEnergyKwh - itKwh;
  const directWaterLitersPerYear = itKwh * config.siteWueLPerKwh;
  const indirectWaterLitersPerYear = facilityEnergyKwh * GRID_WATER_L_PER_FACILITY_KWH;
  const gallonsPerDay = directWaterLitersPerYear / LITERS_PER_GALLON / 365;
  const profile = DATA_CENTER_PROFILES[config.profile];
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
    configuration: config,
    facilityMegawatts: config.facilityMegawatts,
    itMegawatts,
    facilityEnergyKwh,
    itEnergyKwh: itKwh,
    infrastructureEnergyKwh,
    infrastructureShare: infrastructureEnergyKwh / facilityEnergyKwh,
    directWaterLitersPerYear,
    indirectWaterLitersPerYear,
    totalWaterLitersPerYear: directWaterLitersPerYear + indirectWaterLitersPerYear,
    upsEfficiencyMin: profile.upsMin,
    upsEfficiencyMax: profile.upsMax,
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
      "Illustrative increment: annual-average facility load ÷ Duquesne Light's historical summer peak × the EIA Pennsylvania price. The proportional price response is an app assumption, not a utility forecast.",
    waterAssumption:
      "Illustrative increment: annual-average cooling water ÷ Pittsburgh Water's average daily production × selected residential volumetric charges. The proportional price response is an app assumption, not a utility forecast.",
    areaNote: "Site area is the acreage entered for the yard and is not used in the other results.",
    noiseNote,
    homesMeters: config.homesMeters,
    coolingCells: config.coolingCells,
  };
}
