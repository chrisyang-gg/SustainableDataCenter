/** LBNL-2001637 (December 2024), Figure 4.5 and Tables 4.2–4.3. */
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

/** The nine design families in Table 4.2, printed pp. 40–42. */
export const COOLING_SYSTEMS = [
  { id: "direct-expansion", label: "Direct expansion (CRAC)", note: "Refrigerant-based room cooling; no cooling tower is specified by this design family." },
  { id: "air-cooled-chiller", label: "Air-cooled chiller", note: "Rejects condenser heat to outdoor air. Site water may still be used for humidification." },
  { id: "water-cooled-chiller", label: "Water-cooled chiller", note: "Uses a water-cooled condenser and cooling towers; evaporative water consumption matters." },
  { id: "airside-economizer", label: "Airside economizer (air- or water-cooled chiller)", note: "Uses outdoor air when conditions permit, with supplemental chiller cooling as needed." },
  { id: "waterside-economizer", label: "Waterside economizer (water-cooled chiller)", note: "Uses favorable outdoor conditions to reduce mechanical refrigeration; tower evaporation can remain." },
  { id: "dry-cooler", label: "Dry cooler ± adiabatic assist (air- or water-cooled chiller)", note: "Rejects heat to air, with optional evaporative precooling and supplemental chilling." },
  { id: "airside-adiabatic", label: "Airside economizer + adiabatic cooling (air- or water-cooled chiller)", note: "Combines outdoor air with direct evaporative cooling, with supplemental chilling when needed." },
  { id: "liquid-dry-cooler", label: "IT liquid cooling: dry cooler ± adiabatic assist (air-cooled chiller)", note: "Liquid-cooled IT supports higher coolant temperatures; the report models an air-cooled supplemental chiller." },
  { id: "liquid-waterside", label: "IT liquid cooling: waterside economizer (water-cooled chiller)", note: "Liquid-cooled IT with waterside free cooling and a water-cooled supplemental chiller; evaporation remains relevant." },
] as const;

export type CoolingChoice = (typeof COOLING_SYSTEMS)[number]["id"];
export function coolingSystem(choice: unknown): (typeof COOLING_SYSTEMS)[number] {
  return COOLING_SYSTEMS.find((system) => system.id === choice) ?? COOLING_SYSTEMS[2];
}

/** Printed p. 57: 2023 U.S. data-center electricity-associated water intensity. */
export const GRID_WATER_L_PER_FACILITY_KWH = 4.52;

