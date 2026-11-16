import type { FloodZone } from "@/lib/geology";

/** County large-load line from ordinance file 14044-26. Default what-if size. */
export const DEFAULT_LOAD_MW = 25;

export const LOAD_CHOICES = [5, 25, 100] as const;

export const HOURS_PER_YEAR = 8760;

/** LBNL 2024 report: national average PUE in 2023. */
export const PUE = 1.4;

/** LBNL 2024 report: national average on-site WUE through 2023, liters per IT kWh. */
export const SITE_WUE_L_PER_KWH = 0.36;

export const LITERS_PER_GALLON = 3.785411784;

/** 1 cubic foot per second, in gallons per day. */
export const CFS_GALLONS_PER_DAY = 646_317;

/**
 * One Evapco cooling-tower cell, overall A-weighted sound power, as used in the
 * East Whiteland Township data-center noise study (October 27, 2023).
 */
export const CELL_SOUND_POWER_DBA = 108;

/** Cells per megawatt so 25 MW is the study's 10-cell bank. */
export const MW_PER_CELL = 2.5;

/** ISO 9613-2 atmospheric term at 500 Hz when only an A-weighted level is known. */
export const ATMOSPHERE_DB_PER_METER = 0.002;

/** Outdoor formula is undefined at the source. Used when the pin is on a home. */
export const RECEIVER_FLOOR_METERS = 15;

/** EPA 1974 Levels Document. */
export const EPA_OUTDOOR_LDN_DBA = 55;

/**
 * EPRI 3002011005: 4 to 6 MVA is a typical peak on most 15 kV neighborhood feeders.
 * The decision line uses the top of that range.
 */
export const FEEDER_PEAK_MVA = 6;

/** AP-42 section 3.4, uncontrolled large diesel engines. */
export const NOX_LB_PER_MMBTU = 3.2;
export const PM10_LB_PER_MMBTU = 0.0573;
export const BSFC_BTU_PER_HP_HR = 7000;
export const KW_PER_HP = 0.746;

/** Screening wind and the old no-rise release height. Stability class D, urban Briggs curves. */
export const SCREEN_WIND_MPS = 2;
export const SCREEN_RELEASE_METERS = 5;

/**
 * One emergency diesel stack, from the McLaren data center plume assessment
 * (Ramboll Environ, Table 1): a 3 MW generator, 45.2 ft stack, 1.7 ft diameter,
 * 59.22 m/s exit speed, 891.9 F exhaust.
 */
export const GENERATOR_MW = 3;
export const GENERATOR_STACK_METERS = 13.77;
export const GENERATOR_STACK_DIAMETER_METERS = 0.51;
export const GENERATOR_EXIT_MPS = 59.22;
export const GENERATOR_STACK_K = 751;
/** Outside air for the buoyancy calculation, 20 C. */
export const SCREEN_AMBIENT_K = 293;
const GRAVITY = 9.80665;

/** 100 ppb NO2 ≈ 188 µg/m³. EPA 1-hour primary standard. */
export const NO2_1H_UG_PER_M3 = 188;

const SFHA = new Set(["A", "AE", "AH", "AO", "AR", "A99", "V", "VE"]);

export type HomesPlace = {
  meters: number;
  onBuilding: boolean;
};

export type PeopleImpact = {
  megawatts: number;
  homesMeters: number | null;
  onResidentialBuilding: boolean;
  receiverMeters: number | null;
  /** Distance used for the ground-level plume. Farther than the home when the home is inside the near field. */
  plumeMeters: number | null;
  coolingCells: number;
  soundPowerDba: number;
  noiseLeqDba: number | null;
  noiseLdnDba: number | null;
  withdrawalGallonsPerDay: number;
  streamflowShare: number | null;
  feederMultiple: number;
  no2Micrograms: number | null;
  pm10Micrograms: number | null;
  floodNote: string | null;
};

export function isLoadMw(value: number): value is (typeof LOAD_CHOICES)[number] {
  return (LOAD_CHOICES as readonly number[]).includes(value);
}

export function coolingCells(megawatts: number): number {
  return Math.max(1, Math.round(megawatts / MW_PER_CELL));
}

export function soundPowerDba(cells: number): number {
  return CELL_SOUND_POWER_DBA + 10 * Math.log10(cells);
}

/** ISO 9613-2 geometrical divergence plus the 500 Hz atmospheric term. */
export function outdoorLevelDba(soundPower: number, meters: number): number {
  const divergence = 20 * Math.log10(meters) + 11;
  const atmosphere = ATMOSPHERE_DB_PER_METER * meters;
  return soundPower - divergence - atmosphere;
}

/** Day-night level if the same Leq runs all night. The 10 dB night penalty adds about 6.4 dB. */
export function continuousLdn(leq: number): number {
  return leq + 10 * Math.log10(15 / 24 + (9 / 24) * 10);
}

export function receiverMeters(homes: HomesPlace): number {
  if (homes.onBuilding || homes.meters < 1) return RECEIVER_FLOOR_METERS;
  return homes.meters;
}

export function withdrawalGallonsPerDay(megawatts: number): number {
  const facilityKwh = megawatts * HOURS_PER_YEAR * 1000;
  const itKwh = facilityKwh / PUE;
  const gallonsPerYear = (itKwh * SITE_WUE_L_PER_KWH) / LITERS_PER_GALLON;
  return gallonsPerYear / 365;
}

export function streamflowShare(gallonsPerDay: number, cfs: number): number {
  return gallonsPerDay / (cfs * CFS_GALLONS_PER_DAY);
}

/** AP-42 fuel input at the stated brake-specific consumption, then lb/MMBtu to g/s. */
export function emissionGramsPerSecond(megawatts: number, poundsPerMmbtu: number): number {
  const horsepower = (megawatts * 1000) / KW_PER_HP;
  const mmbtuPerHour = (horsepower * BSFC_BTU_PER_HP_HR) / 1_000_000;
  const poundsPerHour = poundsPerMmbtu * mmbtuPerHour;
  return (poundsPerHour * 453.59237) / 3600;
}

/** Briggs urban dispersion for stability D. Distance is in meters. */
export function briggsUrbanD(meters: number): { crosswind: number; vertical: number } {
  return {
    crosswind: 0.16 * meters * (1 + 0.0004 * meters) ** -0.5,
    vertical: 0.14 * meters * (1 + 0.0003 * meters) ** -0.5,
  };
}

/** Centerline Gaussian plume, grams per second in, micrograms per cubic meter out. */
export function plumeMicrograms(
  gramsPerSecond: number,
  meters: number,
  releaseMeters: number = SCREEN_RELEASE_METERS,
): number {
  const { crosswind, vertical } = briggsUrbanD(meters);
  const dilution = Math.PI * SCREEN_WIND_MPS * crosswind * vertical;
  const height = Math.max(releaseMeters, 0.1);
  const reflection = Math.exp(-(height ** 2) / (2 * vertical * vertical));
  return ((gramsPerSecond / dilution) * reflection) * 1_000_000;
}

const plumePeakCache = new Map<number, number>();

/** Integer meters where this release height has its highest ground-level concentration. */
export function plumePeakMetersFor(releaseMeters: number): number {
  const key = Math.round(releaseMeters * 10) / 10;
  const cached = plumePeakCache.get(key);
  if (cached !== undefined) return cached;
  let best = 0;
  let at = 1;
  for (let meters = 1; meters <= 400; meters += 1) {
    const value = plumeMicrograms(1, meters, key);
    if (value > best) {
      best = value;
      at = meters;
    }
  }
  plumePeakCache.set(key, at);
  return at;
}

export function plumePeakMeters(): number {
  return plumePeakMetersFor(SCREEN_RELEASE_METERS);
}

/** Briggs buoyancy flux for one generator stack, m^4/s^3. EPA ISC3 equation. */
export function generatorBuoyancyFlux(): number {
  const diameter = GENERATOR_STACK_DIAMETER_METERS;
  return (
    (GRAVITY * GENERATOR_EXIT_MPS * diameter * diameter * (GENERATOR_STACK_K - SCREEN_AMBIENT_K)) /
    (4 * GENERATOR_STACK_K)
  );
}

/** Buoyant rise at a downwind distance. Final rise follows EPA ISC3 for neutral air. */
export function plumeRiseMeters(distanceMeters: number): number {
  const flux = generatorBuoyancyFlux();
  const wind = SCREEN_WIND_MPS;
  const finalRise =
    flux < 55
      ? (21.425 * flux ** 0.75) / wind
      : (38.71 * flux ** 0.6) / wind;
  const transitional = (1.6 * flux ** (1 / 3) * distanceMeters ** (2 / 3)) / wind;
  return Math.min(finalRise, transitional);
}

export type BackupPlume = {
  no2Micrograms: number;
  pm10Micrograms: number;
  plumeMeters: number;
  stacks: number;
  effectiveHeightMeters: number;
};

/**
 * One-hour ground-level screen for a diesel backup plant.
 * The plant is split into 3 MW stacks. Each stack gets Briggs buoyant rise.
 * If the homes are closer than the highest ground-level point, the result is
 * that highest point, because the exhaust is still overhead at the house.
 * Stacks are added on one centerline, which is higher than a yard that spreads them.
 */
export function backupPlume(
  megawatts: number,
  homesMeters: number,
  stackMeters: number = GENERATOR_STACK_METERS,
): BackupPlume {
  if (!(megawatts > 0)) {
    return {
      no2Micrograms: 0,
      pm10Micrograms: 0,
      plumeMeters: homesMeters,
      stacks: 0,
      effectiveHeightMeters: stackMeters,
    };
  }
  const stacks = Math.max(1, Math.ceil(megawatts / GENERATOR_MW));
  const each = megawatts / stacks;
  const nox = emissionGramsPerSecond(each, NOX_LB_PER_MMBTU);
  const pm = emissionGramsPerSecond(each, PM10_LB_PER_MMBTU);
  const at = (distance: number) => {
    const height = stackMeters + plumeRiseMeters(distance);
    return {
      no2: plumeMicrograms(nox, distance, height) * stacks,
      pm10: plumeMicrograms(pm, distance, height) * stacks,
      height,
    };
  };
  let best = at(50);
  let bestDistance = 50;
  for (let distance = 60; distance <= 15000; distance += 10) {
    const sample = at(distance);
    if (sample.no2 > best.no2) {
      best = sample;
      bestDistance = distance;
    }
  }
  if (homesMeters >= bestDistance) {
    const home = at(homesMeters);
    return {
      no2Micrograms: home.no2,
      pm10Micrograms: home.pm10,
      plumeMeters: homesMeters,
      stacks,
      effectiveHeightMeters: home.height,
    };
  }
  return {
    no2Micrograms: best.no2,
    pm10Micrograms: best.pm10,
    plumeMeters: bestDistance,
    stacks,
    effectiveHeightMeters: best.height,
  };
}

/**
 * Ground-level concentration beside the stack is about 0, because the release
 * has not spread down yet. Inside that near field, use the peak.
 */
export function plumeScreenMeters(
  meters: number,
  releaseMeters: number = SCREEN_RELEASE_METERS,
): number {
  const peak = plumePeakMetersFor(releaseMeters);
  return meters < peak ? peak : meters;
}

export function closePlumeSentence(homesMeters: number, plumeMeters: number, onBuilding: boolean): string {
  if (homesMeters >= plumeMeters && !onBuilding) return "";
  const used = Math.round(plumeMeters);
  const where = onBuilding
    ? "This pin is on a mapped residential building."
    : `The nearest homes are ${Math.round(homesMeters)} meters away.`;
  return ` ${where} This screen uses ${used} meters, where the buoyant generator plumes reach their highest ground-level concentration. Closer than that, the exhaust is still overhead.`;
}

export function floodNote(zones: FloodZone[]): string | null {
  const floodway = zones.some((zone) =>
    (zone.detail ?? "").toLowerCase().includes("floodway"),
  );
  if (floodway) {
    return "FEMA maps a floodway at the pin, so a spill has a mapped path into that water.";
  }
  const special = zones.filter((zone) => SFHA.has(zone.code.toUpperCase()));
  if (special.length > 0) {
    const codes = special.map((zone) => `Zone ${zone.code}`).join(", ");
    return `FEMA maps the 1% floodplain at the pin (${codes}), so a spill has a mapped path into that water.`;
  }
  return null;
}

export function peopleImpact(input: {
  megawatts: number;
  homes: HomesPlace | null;
  streamflowCfs: number | null;
  floodZones: FloodZone[];
}): PeopleImpact {
  const cells = coolingCells(input.megawatts);
  const power = soundPowerDba(cells);
  const gallons = withdrawalGallonsPerDay(input.megawatts);
  const receiver = input.homes ? receiverMeters(input.homes) : null;
  const plume = receiver === null ? null : backupPlume(input.megawatts, receiver);
  const plumeMeters = plume?.plumeMeters ?? null;
  return {
    megawatts: input.megawatts,
    homesMeters: input.homes?.meters ?? null,
    onResidentialBuilding: input.homes?.onBuilding ?? false,
    receiverMeters: receiver,
    plumeMeters,
    coolingCells: cells,
    soundPowerDba: power,
    noiseLeqDba: receiver === null ? null : outdoorLevelDba(power, receiver),
    noiseLdnDba: receiver === null ? null : continuousLdn(outdoorLevelDba(power, receiver)),
    withdrawalGallonsPerDay: gallons,
    streamflowShare:
      input.streamflowCfs && input.streamflowCfs > 0
        ? streamflowShare(gallons, input.streamflowCfs)
        : null,
    feederMultiple: input.megawatts / FEEDER_PEAK_MVA,
    no2Micrograms: plume?.no2Micrograms ?? null,
    pm10Micrograms: plume?.pm10Micrograms ?? null,
    floodNote: floodNote(input.floodZones),
  };
}
