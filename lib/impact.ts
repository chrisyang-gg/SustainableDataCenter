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

/** Screening wind and release height. Stability class D, urban Briggs curves. */
export const SCREEN_WIND_MPS = 2;
export const SCREEN_RELEASE_METERS = 5;

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
export function plumeMicrograms(gramsPerSecond: number, meters: number): number {
  const { crosswind, vertical } = briggsUrbanD(meters);
  const dilution = Math.PI * SCREEN_WIND_MPS * crosswind * vertical;
  const reflection = Math.exp(
    -(SCREEN_RELEASE_METERS ** 2) / (2 * vertical * vertical),
  );
  return ((gramsPerSecond / dilution) * reflection) * 1_000_000;
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
  return {
    megawatts: input.megawatts,
    homesMeters: input.homes?.meters ?? null,
    onResidentialBuilding: input.homes?.onBuilding ?? false,
    receiverMeters: receiver,
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
    no2Micrograms:
      receiver === null
        ? null
        : plumeMicrograms(emissionGramsPerSecond(input.megawatts, NOX_LB_PER_MMBTU), receiver),
    pm10Micrograms:
      receiver === null
        ? null
        : plumeMicrograms(emissionGramsPerSecond(input.megawatts, PM10_LB_PER_MMBTU), receiver),
    floodNote: floodNote(input.floodZones),
  };
}
