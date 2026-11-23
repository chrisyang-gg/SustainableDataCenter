import {
  ATMOSPHERE_DB_PER_METER,
  BSFC_BTU_PER_HP_HR,
  CELL_SOUND_POWER_DBA,
  GENERATOR_EXIT_MPS,
  GENERATOR_MW,
  GENERATOR_STACK_DIAMETER_METERS,
  GENERATOR_STACK_K,
  HOURS_PER_YEAR,
  KW_PER_HP,
  LITERS_PER_GALLON,
  NOX_LB_PER_MMBTU,
  PM10_LB_PER_MMBTU,
  RECEIVER_FLOOR_METERS,
  SCREEN_AMBIENT_K,
  SCREEN_WIND_MPS,
} from "@/lib/impact";
import { GRID_WATER_L_PER_FACILITY_KWH, LBNL_REPORT_URL, WUE_DEFINITION_URL } from "@/lib/lbnl-simulator";
import {
  DUQUESNE_SUMMER_PEAK_MW,
  PA_RESIDENTIAL_CENTS_PER_KWH,
  PWSA_DOLLARS_PER_THOUSAND_GALLONS,
  PWSA_GALLONS_PER_DAY,
} from "@/lib/simulator";

export const SOURCES_REVIEWED = "November 23, 2026";

const sources = {
  lbnl: {
    title: "Shehabi et al. (2024), United States Data Center Energy Usage Report",
    href: `${LBNL_REPORT_URL}#page=46`,
    locator: "LBNL-2001637: p. 39 (PUE/WUE definitions); Figure 4.4, p. 46 (cooling-system distributions; app uses approximate readings of their median lines); Table 4.2, pp. 40–42 (cooling families); Table 4.3, p. 43 (UPS ranges).",
  },
  greenGrid: {
    title: "The Green Grid (2011), Water Usage Effectiveness (WUE), White Paper 35",
    href: WUE_DEFINITION_URL,
    locator: "Page 6, equation (2): site WUE = annual site water / IT equipment energy; equations (3)–(4): source-inclusive WUE and electricity-associated water. Page 7 defines equipment and infrastructure boundaries.",
  },
  lbnlWater: {
    title: "LBNL (2024), direct and indirect water consumption",
    href: `${LBNL_REPORT_URL}#page=57`,
    locator: "Figure 5.9, p. 56 (66 billion L direct in 2023; 84% hyperscale/colo); p. 57 (nearly 800 billion L indirect, 4.52 L per facility kWh for the 2023 U.S. data-center grid mix).",
  },
  iso: {
    title: "ISO 9613-2:1996, outdoor sound attenuation",
    href: "https://www.iso.org/standard/20649.html",
    locator: "Section 7.1, geometrical divergence, equation (7). The 1996 edition has been superseded by ISO 9613-2:2024; the linked abstract does not provide the full equations.",
  },
  tower: {
    title: "B. Laing Associates (October 27, 2023), Data Center Noise Study, East Whiteland Township",
    href: "https://cms2.revize.com/revize/eastwhitelandtownshippa/Documents/Government/Departments/Planning%20And%20Development/Land%20Developments%20Applications/2023%20Subdivision/10%20%20Data%20Center%20Noise%20study%2010-27-23.pdf",
    locator: "Section 3.3.1, printed p. 16: full-speed Evapco tower sound power and the example combining ten towers.",
  },
  noise: {
    title: "U.S. EPA (1974), environmental noise levels",
    href: "https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=2000L3LN.TXT",
    locator: "EPA 550/9-74-004, Table 1 (outdoor residential guidance); Appendix A, §III, equation A-15 (15/9-hour weighting).",
  },
  ap42: {
    title: "U.S. EPA (April 2025), AP-42 section 3.4, stationary diesel engines",
    href: "https://www.epa.gov/system/files/documents/2025-04/c03s04_april2025.pdf#page=6",
    locator: "Table 3.4-1, p. 3.4-6, uncontrolled NOx and footnote e; Table 3.4-2, p. 3.4-7, total PM-10.",
  },
  isc3: {
    title: "U.S. EPA (1995), ISC3 User’s Guide, Volume II, EPA-454/B-95-003b",
    href: "https://gaftp.epa.gov/aqmg/SCRAM/models/other/isc3/isc3v2.pdf#page=15",
    locator: "§1.1.1 and §1.1.6, Gaussian plume/ground reflection; equations (1-8), (1-14), (1-15), (1-22), buoyancy/rise; Tables 1-3–1-4, p. 1-19, urban class D dispersion.",
  },
  stack: {
    title: "Ramboll Environ (December 2017), McLaren Data Center Thermal Plume Technical Report",
    href: "https://efiling.energy.ca.gov/GetDocument.aspx?tn=222041-12#page=8",
    locator: "Appendix F, §3.1, Table 1, printed p. 3 (PDF p. 8): generator size and exhaust parameters. This is a thermal/aviation study, not validation of this app’s air-quality screen.",
  },
  no2: {
    title: "U.S. EPA, primary NO₂ ambient air-quality standards",
    href: "https://www.epa.gov/no2-pollution/primary-national-ambient-air-quality-standards-naaqs-nitrogen-dioxide",
    locator: "Rule Summary: 100 ppb, 1-hour standard; three-year average of annual 98th-percentile daily maxima.",
  },
  eia: {
    title: "U.S. EIA, Electric Power Annual, Table 2.10 (2025 data)",
    href: "https://www.eia.gov/electricity/annual/html/epa_02_10.html",
    locator: "Pennsylvania row, Residential / Year 2025 column; cents per kWh.",
  },
  duquesne: {
    title: "Duquesne Light (May 30, 2025), Summer Readiness Overview Report",
    href: "https://www.puc.pa.gov/media/3498/dlc-2025-summer-readiness-overview-report.pdf#page=7",
    locator: "Printed p. 6 (PDF p. 7), §III, Capacity Planning: 2025 summer forecasted peak load.",
  },
  rates: {
    title: "Pittsburgh Water, rates effective March 8, 2026",
    href: "https://www.pgh2o.com/residential-commercial-customers/rates",
    locator: "Residential Property rows in the volumetric water/sewer and PENNVEST tables, for use above the minimum.",
  },
  production: {
    title: "Pittsburgh Water, Water Quality & Treatment",
    href: "https://www.pgh2o.com/your-water/water-quality-treatment",
    locator: "Opening paragraph: average production of 65 million gallons daily.",
  },

} as const;

export type SimulatorSource = (typeof sources)[keyof typeof sources];
type Reference = { source: SimulatorSource; supports: string };
type Method = {
  label: string;
  inputs: string;
  formulas: string[];
  assumptions: string[];
  references: Reference[];
};

export const SIMULATOR_METHODS = {
  energy: {
    label: "Electricity and IT load",
    inputs: "Facility electricity P (MW), PUE, annual operating hours h.",
    formulas: [
      "IT load (MW) = P / PUE",
      "Facility energy (MWh/year) = P × h",
      "Infrastructure energy = facility energy − IT energy; infrastructure fraction = 1 − 1/PUE",
      `Average facility load (MW) = P × h / ${HOURS_PER_YEAR}`,
    ],
    assumptions: [
      "P is the total facility draw while operating, including IT and overhead. The same draw and PUE are assumed in every operating hour; this is not a time-varying load model.",
      "Cooling selections load approximate median-line readings from Figure 4.4, p. 46, rounded to 0.01 from the supplied chart. SMB uses Small; SPs uses Midsize; Hyperscale and AI-centered use Large-scale. The chart has no separate AI group. This mapping is an app assumption, not a definition of AI facility size. Figure 4.5 category-mixture averages are not applied on top of these medians.",
      "Only cooling configurations plotted for the selected group are offered. Category changes preserve the chosen cooling system when a matching chart row exists, otherwise select a supported default. Both actions reset PUE/WUE; users may override either value or restore the cooling medians. Other design inputs are preserved.",
      "UPS efficiency is displayed as the Table 4.3 range for the selected category, not an invented midpoint. UPS and cooling losses are already within PUE; no extra UPS loss factor is applied.",
      "Figures 5.6–5.7 describe national equipment and space-type trends. The displayed facility IT/infrastructure split is derived from its PUE; no national equipment percentage is imposed on this facility.",
    ],
    references: [{ source: sources.lbnl, supports: "PUE definition, Figure 4.4 cooling-system median lines (approximately read from the chart), and UPS ranges; multiplication, annual averaging, and infrastructure subtraction are arithmetic." }],
  },
  water: {
    label: "Direct on-site water consumption",
    inputs: "Facility electricity P (MW), PUE, annual hours h, and site WUE w (liters consumed per IT kWh).",
    formulas: [
      "IT energy (kWh/year) = (P / PUE) × h × 1,000",
      "Direct water consumption (L/year) = IT energy × site WUE",
      `Annual-average water (US gal/day) = IT energy × w / ${LITERS_PER_GALLON} / 365`,
    ],
    assumptions: [
      "Site WUE and PUE start from the selected cooling configuration's median lines in Figure 4.4, approximately read from the supplied chart and rounded to 0.01. These are scenario references across modeled locations and operating conditions, not measured or Pittsburgh-specific values. Medians of PUE and WUE are applied separately; their pair is not necessarily one jointly observed facility or the median water demand.",
      "The chart provides 17 rows: 3 Small, 7 Midsize, and 7 Large-scale configurations. Air-/water-cooled supplemental chillers and dry/adiabatic variants are kept separate. Near-zero readings retain small nonzero medians where visible; the fully dry liquid-cooling median is approximately 0.00. Cooling choices reset PUE/WUE but do not set tower count. Manual overrides remain available.",
      "This is a consumption-based proxy averaged over 365 days, including non-operating days. It does not establish peak-day demand, total withdrawal, blowdown, sanitary use, or water consumed by off-site electricity generation.",
      "The water equation is an algebraic rearrangement of the original WUE definition (The Green Grid, equation 2), using the LBNL consumption-based input and its boundary. It is not a new empirical cooling formula or a claim that consumption equals utility withdrawals.",
    ],
    references: [
      { source: sources.greenGrid, supports: "Original WUE ratio: multiplying IT energy by site WUE gives annual site water. The conversion uses 3.785411784 liters per US gallon." },
      { source: sources.lbnl, supports: "Consumption-based WUE, Figure 4.4 cooling-system median lines (approximate chart readings), and Table 4.2 configurations, not a separate universal cooling-water demand formula." },
    ],
  },
  waterFootprint: {
    label: "Direct and electricity-associated water",
    inputs: "IT energy, total facility energy, site WUE, and a fixed 2023 U.S. data-center grid-water proxy.",
    formulas: [
      "Direct water (L/year) = IT energy (kWh/year) × site WUE (L/IT-kWh)",
      `Electricity-associated water (L/year) = facility energy (kWh/year) × ${GRID_WATER_L_PER_FACILITY_KWH} L/facility-kWh`,
      "Combined operational water (L/year) = direct water + electricity-associated water",
      `Equivalent source WUE (L/IT-kWh) = site WUE + PUE × ${GRID_WATER_L_PER_FACILITY_KWH}`,
    ],
    assumptions: [
      "4.52 L/kWh is the report’s 2023 national average for the electricity grid mix serving U.S. data centers. It is a historical proxy, not a Pittsburgh/Allegheny County measurement, marginal generation factor, or forecast. Location, generation mix, PPAs, and on-site power can change the result.",
      "Off-site water scales with all facility electricity, including UPS and cooling, not only IT electricity. The Green Grid provides the source-water accounting equation; the newer LBNL report supplies the intensity instead of the 2011 paper’s older grid factor.",
      "Direct and off-site water are displayed separately. Off-site water is not charged to the local water utility or added to its illustrative price scenario. Construction and equipment manufacturing water are outside this operational boundary.",
      "The later report’s 66 billion liters direct and nearly 800 billion liters indirect are U.S. 2023 totals, not per-facility assumptions or capacity limits.",
    ],
    references: [
      { source: sources.greenGrid, supports: "Equations (3)–(4): add on-site water to energy-associated water; source WUE = site WUE + EWIF × PUE." },
      { source: sources.lbnlWater, supports: "The 4.52 L/facility-kWh proxy and national direct/indirect consumption context." },
    ],
  },
  noise: {
    label: "Cooling-tower noise",
    inputs: "Tower-cell count N, distance to homes d (m), and night-operation checkbox.",
    formulas: [
      `Receiver distance r = max(d, ${RECEIVER_FLOOR_METERS} m)`,
      `Combined sound power Lw = ${CELL_SOUND_POWER_DBA} + 10 × log10(N)`,
      `Operating sound level Leq (dBA) = Lw − [20 × log10(r) + 11] − ${ATMOSPHERE_DB_PER_METER} × r`,
      "If running all night: Ldn = Leq + 10 × log10(15/24 + (9/24) × 10) ≈ Leq + 6.4 dB",
    ],
    assumptions: [
      "Cells are identical, at full speed, and treated as one source at the entered distance. No towers returns no tower-noise estimate; other equipment may still make noise.",
      "The fixed 0.002 dB/m atmospheric loss and 15 m distance floor are app assumptions. No frequency-band/weather calculation, terrain, barriers, ground effects, or existing background noise is included. This is a simplified ISO-based calculation, not a full ISO assessment.",
      "The night option assumes the same level for 15 daytime and 9 nighttime hours on a representative day, regardless of annual operating hours. With it off, the app retains Leq without a night penalty; that value is not a calculated 24-hour Ldn.",
      "55 dBA Ldn is EPA health/welfare guidance, not a local legal limit. Compare it only with the continuous-operation Ldn scenario.",
    ],
    references: [
      { source: sources.tower, supports: "108 dBA sound power per full-speed tower; logarithmic addition of multiple towers." },
      { source: sources.iso, supports: "Geometrical spreading term 20 log10(r) + 11; the fixed atmospheric coefficient is the app’s approximation." },
      { source: sources.noise, supports: "Day-night weighting and the 55 dBA Ldn outdoor residential reference." },
    ],
  },
  air: {
    label: "Diesel generator exhaust",
    inputs: "Facility electricity P (MW), diesel share b (fraction), homes distance d (m), physical stack height s (m).",
    formulas: [
      `Backup MW = P × b; stacks n = ceil(backup MW / ${GENERATOR_MW}); MW per stack = backup MW / n`,
      `Fuel heat input per stack (MMBtu/h) = (MW per stack × 1,000 / ${KW_PER_HP}) × ${BSFC_BTU_PER_HP_HR} / 1,000,000`,
      "Emission Q (g/s per stack) = heat input × emission factor × 453.59237 / 3,600",
      "σy = 0.16x / √(1 + 0.0004x); σz = 0.14x / √(1 + 0.0003x)",
      "Buoyancy F = 9.80665 × v × D² × (Ts − Ta) / (4 × Ts)",
      "Final rise = 21.425 × F^0.75 / u if F < 55; otherwise 38.71 × F^0.6 / u",
      "Effective height H = s + min(1.6 × F^(1/3) × x^(2/3) / u, final rise)",
      "Concentration (µg/m³) = n × Q / (π × u × σy × σz) × exp[−H² / (2σz²)] × 1,000,000",
    ],
    assumptions: [
      `Uncontrolled-diesel factors: NOx ${NOX_LB_PER_MMBTU} and total PM₁₀ ${PM10_LB_PER_MMBTU} lb/MMBtu. The ${BSFC_BTU_PER_HP_HR} Btu/hp-hour fuel-use approximation is adopted from AP-42’s CO₂ footnote, not a measured generator efficiency. Electrical MW is treated as brake power; alternator losses are omitted.`,
      `McLaren supplies a stack proxy: D = ${GENERATOR_STACK_DIAMETER_METERS} m, v = ${GENERATOR_EXIT_MPS} m/s, Ts = ${GENERATOR_STACK_K} K. The app fixes ambient Ta = ${SCREEN_AMBIENT_K} K and wind u = ${SCREEN_WIND_MPS} m/s, uses urban class D, and substitutes your stack height. These are not local weather observations.`,
      "All stacks run simultaneously on one downwind centerline. A 50–15,000 m search in 10 m steps finds the peak; if homes are closer, the peak is reported instead of the home concentration. Zero backup returns zero modeled diesel contribution.",
      "All NOx is counted as NO₂. No background pollution, chemistry, terrain, building downwash, deposition, or hourly weather is modeled; this is not an AERMOD run. Annual hours and night operation do not change this one-hour scenario.",
      "100 ppb NO₂ is about 188 µg/m³ at 25°C and 1 atm. The regulatory statistic spans three years; a single modeled hour cannot establish compliance. No one-hour PM₁₀ standard is applied.",
    ],
    references: [
      { source: sources.ap42, supports: "Fuel-based NOx/PM₁₀ emission factors and fuel-use assumption; factors describe generic uncontrolled engines." },
      { source: sources.isc3, supports: "Simplified ground-level centerline Gaussian equation, Briggs rise, and urban class D σy/σz. The sampling/near-field rule is an app choice." },
      { source: sources.stack, supports: "3 MW generator and example stack geometry/temperature, converted and rounded in the app." },
      { source: sources.no2, supports: "100 ppb reference and its averaging/statistical form; the mass conversion is arithmetic." },
    ],
  },
  electricityPrice: {
    label: "Illustrative electricity price increment",
    inputs: "Facility electricity P (MW) and annual hours h.",
    formulas: [
      `Average facility MW = P × h / ${HOURS_PER_YEAR}`,
      `Load share = average facility MW / ${DUQUESNE_SUMMER_PEAK_MW.toLocaleString("en-US")} MW`,
      `Illustrative increment (¢/kWh) = load share × ${PA_RESIDENTIAL_CENTS_PER_KWH} ¢/kWh`,
    ],
    assumptions: [
      "The app assumes the percentage price increase equals the facility’s annual-average load divided by a historical utility peak. Neither EIA nor Duquesne Light supplies or validates this price-response equation.",
      "Average load divided by peak load is a scale comparison, not the data center’s actual energy-market share. It omits generation mix, grid upgrades, tariffs, cost allocation, and regulatory decisions. This is an illustrative increment, not the new total rate or a forecast of a household bill.",
      "PUE does not change this result when total facility MW is held fixed. The historical Pennsylvania statewide rate is not a site-specific Duquesne Light tariff.",
    ],
    references: [
      { source: sources.eia, supports: "19.29¢/kWh historical Pennsylvania residential reference price only." },
      { source: sources.duquesne, supports: "2,703 MW historical forecasted system peak only." },
    ],
  },
  waterPrice: {
    label: "Illustrative water and sewer price increment",
    inputs: "Annual-average cooling water from facility MW, PUE, hours, and site WUE.",
    formulas: [
      `Water share = cooling gal/day / ${PWSA_GALLONS_PER_DAY.toLocaleString("en-US")} gal/day`,
      `Reference volumetric rate = $18.28 + $2.13 + $7.32 + $0.88 = $${PWSA_DOLLARS_PER_THOUSAND_GALLONS.toFixed(2)} per 1,000 US gal`,
      "Illustrative increment ($/1,000 gal) = water share × reference volumetric rate",
    ],
    assumptions: [
      "The app assumes the percentage rate increase equals cooling-water use divided by average utility production. Pittsburgh Water does not publish or validate that price-response equation. Average production is not spare capacity, and consumption is only a proxy for purchased water.",
      "The reference combines residential water, PENNVEST water, wastewater conveyance, and PENNVEST sewer above the minimum. It excludes minimum charges, DSIC, stormwater, and ALCOSAN treatment. The result is not a complete bill, a facility’s industrial tariff, or a predicted rate change.",
      "The service area is Pittsburgh Water’s, not all Allegheny County. Only the direct on-site estimate enters this scenario; electricity-associated off-site water is excluded. Consumption and purchased water are not interchangeable measurements.",
    ],
    references: [
      { source: sources.rates, supports: "Four residential volumetric components effective March 8, 2026; no causal price model." },
      { source: sources.production, supports: "65 million gal/day average production denominator; no remaining-capacity figure." },
    ],
  },

} satisfies Record<string, Method>;

export type SimulatorMethodId = keyof typeof SIMULATOR_METHODS;

export const PARAMETER_IMPACTS: { parameter: string; impacts: string; explanation: string }[] = [
  { parameter: "Data center category", impacts: "Available cooling systems, median PUE/WUE, and fixed UPS range", explanation: "Maps SMB → Small, SPs → Midsize, Hyperscale/AI → Large-scale in Figure 4.4. Retains cooling when charted for the new group, otherwise selects a supported default, then loads its medians. Preserves facility MW and other design controls; AI has no separate chart group." },
  { parameter: "Electricity usage", impacts: "IT load, energy, direct and off-site water, diesel exhaust, electricity-price scenario", explanation: "Total operating facility MW is the shared starting point." },
  { parameter: "PUE", impacts: "IT/infrastructure split, direct water, combined water", explanation: "At fixed total MW, IT MW = facility MW / PUE; total electricity, off-site water, and backup MW stay fixed." },
  { parameter: "UPS efficiency (fixed)", impacts: "Category reference only", explanation: "Read-only Table 4.3 range. Its losses are already represented in PUE, so no additional loss multiplier is applied." },
  { parameter: "Site area", impacts: "Displayed acreage only", explanation: "No acreage-derived impact is modeled; no external formula is applied." },
  { parameter: "Cooling system", impacts: "PUE, site WUE, IT/infrastructure split, direct/combined water", explanation: "Loads the selected Figure 4.4 median PUE/WUE pair (approximately read from the chart). Chiller and adiabatic variants are separate. Does not change tower count or total electricity when facility MW is fixed." },
  { parameter: "Site WUE", impacts: "Direct and combined water", explanation: "Liters consumed per IT kWh. Defaults to the selected cooling configuration's approximate median; can be overridden. Does not affect off-site electricity-associated water." },
  { parameter: "Hours running", impacts: "Annual energy, average load, direct and off-site water, electricity-price scenario", explanation: "Does not scale operating noise or the one-hour diesel screen." },
  { parameter: "Night operation", impacts: "Noise weighting only", explanation: "Applies the continuous-operation day-night penalty; does not alter annual energy or exhaust." },
  { parameter: "Distance to homes", impacts: "Noise and diesel exhaust", explanation: "Noise uses at least 15 m; air uses the downwind peak when it lies beyond the homes." },
  { parameter: "Cooling-tower cells", impacts: "Tower noise only", explanation: "Logarithmic sound-power addition; does not set WUE or water demand." },
  { parameter: "Diesel backup share", impacts: "NO₂, PM₁₀, generator count", explanation: "Scales the MW assigned to the one-hour backup scenario." },
  { parameter: "Exhaust height", impacts: "NO₂, PM₁₀, plume height and screen distance", explanation: "Changes physical height before modeled buoyant rise is added." },
];
