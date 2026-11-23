/** LBNL-2001637 (December 2024), Figures 4.4–4.5 and Tables 4.2–4.3. */
export const LBNL_REPORT_URL = "https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report_1.pdf";
export const WUE_DEFINITION_URL = "https://www.thegreengrid.org/system/files/store/WUE_v1.pdf#page=6";

// Figure 4.5's labeled central values are modeled category medians for 2023,
// averaged over the category's locations/cooling mix, not facility measurements.
export const DATA_CENTER_PROFILES = {
  smb: { label: "SMB", reportLabel: "Small", pue: 1.91, wue: 0.32, upsMin: 77, upsMax: 85 },
  sps: { label: "SPs (medium scale)", reportLabel: "Midsize and Colo", pue: 1.68, wue: 0.67, upsMin: 80, upsMax: 94 },
  hyperscale: { label: "Hyperscale", reportLabel: "Hyperscale", pue: 1.22, wue: 0.32, upsMin: 90, upsMax: 99 },
  ai: { label: "AI-centered", reportLabel: "AI Specialized", pue: 1.14, wue: 0.61, upsMin: 90, upsMax: 99 },
} as const;

export type DataCenterProfileId = keyof typeof DATA_CENTER_PROFILES;

export function isDataCenterProfileId(value: unknown): value is DataCenterProfileId {
  return typeof value === "string" && Object.hasOwn(DATA_CENTER_PROFILES, value);
}

/** Table 4.2 families, split into the distinct configurations in Figure 4.4. */
export const COOLING_SYSTEMS = [
  { id: "direct-expansion", label: "Direct expansion (CRAC)", note: "Refrigerant-based room cooling; no cooling tower is specified by this design family." },
  { id: "air-cooled-chiller", label: "Air-cooled chiller", note: "Rejects condenser heat to outdoor air. Site water may still be used for humidification." },
  { id: "water-cooled-chiller", label: "Water-cooled chiller", note: "Uses a water-cooled condenser and cooling towers; evaporative water consumption matters." },
  { id: "airside-economizer-air", label: "Airside economizer (air-cooled chiller)", note: "Uses outdoor air when conditions permit, with an air-cooled supplemental chiller." },
  { id: "airside-economizer", label: "Airside economizer (water-cooled chiller)", note: "Uses outdoor air when conditions permit, with a water-cooled supplemental chiller and cooling towers." },
  { id: "waterside-economizer", label: "Waterside economizer (water-cooled chiller)", note: "Uses favorable outdoor conditions to reduce mechanical refrigeration; tower evaporation can remain." },
  { id: "dry-cooler", label: "Dry cooler (air-cooled chiller)", note: "Rejects heat to air without adiabatic assist, with an air-cooled supplemental chiller." },
  { id: "dry-cooler-adiabatic", label: "Dry cooler with adiabatic assist (air-cooled chiller)", note: "Rejects heat to air and uses water for evaporative precooling when needed." },
  { id: "airside-adiabatic-air", label: "Airside economizer + adiabatic cooling (air-cooled chiller)", note: "Combines outdoor air with occasional direct evaporative cooling and an air-cooled supplemental chiller." },
  { id: "airside-adiabatic", label: "Airside economizer + adiabatic cooling (water-cooled chiller)", note: "Combines outdoor air with direct evaporative cooling and a water-cooled supplemental chiller." },
  { id: "liquid-dry-cooler", label: "IT liquid cooling: dry cooler with adiabatic assist (air-cooled chiller)", note: "Liquid-cooled IT supports warmer coolant and dry heat rejection, with evaporative assist when needed." },
  { id: "liquid-dry-only", label: "IT liquid cooling: dry cooler (air-cooled chiller)", note: "Liquid-cooled IT with dry heat rejection and no adiabatic assist; the chart's site WUE median is approximately zero." },
  { id: "liquid-waterside", label: "IT liquid cooling: waterside economizer (water-cooled chiller)", note: "Liquid-cooled IT with waterside free cooling and a water-cooled supplemental chiller; evaporation remains relevant." },
] as const;

export type CoolingChoice = (typeof COOLING_SYSTEMS)[number]["id"];
export function coolingSystem(choice: unknown): (typeof COOLING_SYSTEMS)[number] {
  return COOLING_SYSTEMS.find((system) => system.id === choice) ?? COOLING_SYSTEMS[2];
}

export type CoolingScale = "small" | "midsize" | "large";
export const COOLING_SCALE_LABELS: Record<CoolingScale, string> = {
  small: "Small", midsize: "Midsize", large: "Large-scale",
};

// Application mapping: Figure 4.4 has no separate AI group. Hyperscale and AI
// share Large-scale references; AI is not a distinct facility size definition.
export const PROFILE_COOLING_SCALE: Record<DataCenterProfileId, CoolingScale> = {
  smb: "small", sps: "midsize", hyperscale: "large", ai: "large",
};

export type CoolingMedian = { cooling: CoolingChoice; pue: number; wue: number };

/**
 * Approximate readings of the median lines in the user-supplied Figure 4.4
 * image (printed p. 46), rounded to 0.01. Not whisker/box midpoints, exact
 * tabulated source data, local weather predictions, or Figure 4.5 averages.
 * Near-zero readings retain small visible nonzero medians where resolvable.
 */
export const COOLING_MEDIANS: Record<CoolingScale, readonly CoolingMedian[]> = {
  small: [
    { cooling: "direct-expansion", pue: 2.04, wue: 0.05 },
    { cooling: "air-cooled-chiller", pue: 2.00, wue: 0.05 },
    { cooling: "water-cooled-chiller", pue: 1.70, wue: 3.22 },
  ],
  midsize: [
    { cooling: "direct-expansion", pue: 1.85, wue: 0.05 },
    { cooling: "air-cooled-chiller", pue: 1.83, wue: 0.05 },
    { cooling: "dry-cooler", pue: 1.59, wue: 0.05 },
    { cooling: "airside-economizer-air", pue: 1.58, wue: 0.03 },
    { cooling: "water-cooled-chiller", pue: 1.52, wue: 2.90 },
    { cooling: "airside-economizer", pue: 1.44, wue: 1.32 },
    { cooling: "waterside-economizer", pue: 1.37, wue: 2.50 },
  ],
  large: [
    { cooling: "dry-cooler-adiabatic", pue: 1.20, wue: 0.25 },
    { cooling: "airside-adiabatic-air", pue: 1.17, wue: 0.02 },
    { cooling: "airside-adiabatic", pue: 1.14, wue: 0.42 },
    { cooling: "waterside-economizer", pue: 1.12, wue: 2.18 },
    { cooling: "liquid-waterside", pue: 1.13, wue: 1.98 },
    { cooling: "liquid-dry-cooler", pue: 1.09, wue: 0.13 },
    { cooling: "liquid-dry-only", pue: 1.09, wue: 0.00 },
  ],
};

export const PROFILE_DEFAULT_COOLING: Record<DataCenterProfileId, CoolingChoice> = {
  smb: "water-cooled-chiller", sps: "water-cooled-chiller",
  hyperscale: "airside-adiabatic", ai: "liquid-waterside",
};

export function coolingMedians(profile: DataCenterProfileId): readonly CoolingMedian[] {
  return COOLING_MEDIANS[PROFILE_COOLING_SCALE[profile]];
}

export function coolingMedian(profile: DataCenterProfileId, cooling: CoolingChoice): CoolingMedian | undefined {
  return coolingMedians(profile).find((row) => row.cooling === cooling);
}

/** Printed p. 57: 2023 U.S. data-center electricity-associated water intensity. */
export const GRID_WATER_L_PER_FACILITY_KWH = 4.52;

