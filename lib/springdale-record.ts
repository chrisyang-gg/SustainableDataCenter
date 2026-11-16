/** Public Springdale figures. A line is unknown when no filing, article, or county record states it. */

export type RecordLink = { href: string; label: string };

export type RecordLine = {
  id: string;
  label: string;
  value: string;
  detail: string;
  sources: RecordLink[];
};

const DYNAMO: RecordLink = {
  href: "https://www.springdaledatacenter.com/projects/springdale-data-center/",
  label: "Dynamo DC, Springdale Data Center project page",
};
const TRIB: RecordLink = {
  href: "https://triblive.com/local/valley-news-dispatch/lots-of-changes-proposed-to-springdale-data-center-plan/",
  label: "TribLive, Lots of changes proposed to Springdale data center plan",
};
const WESA_TESTIMONY: RecordLink = {
  href: "https://www.wesa.fm/environment-energy/2025-11-25/springdale-data-center-testimony",
  label: "90.5 WESA, November 25, 2025, borough testimony",
};
const WESA_DESIGN: RecordLink = {
  href: "https://www.wesa.fm/environment-energy/2026-06-11/springdale-data-center-new-designs-opponents-stopped",
  label: "90.5 WESA, June 11, 2026, revised designs",
};
const BUILDINGS: RecordLink = {
  href: "https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Buildings/MapServer/0",
  label: "Allegheny County building footprints, residential code 210",
};

export const SPRINGDALE_PARAMETERS: RecordLine[] = [
  {
    id: "load",
    label: "Electricity usage",
    value: "Unknown",
    detail:
      "Dynamo DC publishes up to 240 MW of IT load. TribLive reported a consultant saying demand could reach 330 MW. The facility total, including overhead, was not published.",
    sources: [DYNAMO, TRIB],
  },
  {
    id: "pue",
    label: "Power usage effectiveness",
    value: "Unknown",
    detail: "No public PUE was found.",
    sources: [],
  },
  {
    id: "area",
    label: "Site area",
    value: "47 acres",
    detail: "The developer page and TribLive both describe the former Cheswick plant site as 47 acres.",
    sources: [DYNAMO, TRIB],
  },
  {
    id: "cooling",
    label: "Cooling system",
    value: "Closed-loop rooftop chillers",
    detail:
      "TribLive reported 120 rooftop chillers on a closed loop, and that the plant would not release evaporated water into the air.",
    sources: [TRIB, WESA_DESIGN],
  },
  {
    id: "water",
    label: "Water usage",
    value: "Less than 10,000 gallons a day",
    detail: "That is the developer claim TribLive reported. Liters per IT kilowatt-hour were not published.",
    sources: [TRIB],
  },
  {
    id: "hours",
    label: "Hours running",
    value: "Unknown",
    detail: "Annual operating hours were not published. TribLive said each diesel generator would be tested once a month.",
    sources: [TRIB],
  },
  {
    id: "night",
    label: "Night operation",
    value: "Unknown",
    detail: "Jacobs testimony said the plant would be quieter at night. It did not say whether the plant runs all night.",
    sources: [WESA_TESTIMONY],
  },
  {
    id: "cells",
    label: "Cooling-tower cells",
    value: "Unknown",
    detail: "The published count is 120 rooftop chillers, not cooling-tower cells.",
    sources: [TRIB],
  },
  {
    id: "backup",
    label: "Diesel backup",
    value: "124 diesel generators",
    detail:
      "TribLive reported 124 generators, up from 116, moved off the roof to the sides. The share of facility electricity was not published.",
    sources: [TRIB, WESA_DESIGN],
  },
  {
    id: "exhaust",
    label: "Exhaust height",
    value: "Unknown",
    detail:
      "TribLive said the building is about 75 feet tall, including rooftop equipment. That is not a generator stack height. The generators were moved to the sides.",
    sources: [TRIB, WESA_DESIGN],
  },
];

export const SPRINGDALE_IMPACTS: RecordLine[] = [
  {
    id: "noise",
    label: "Noise at the homes",
    value: "Unknown at the nearest residential area",
    detail:
      "No published level is at the nearest residential building. Jacobs modeled about 57 dB at the property line on a hot day, and 75 dB if every generator runs. A later design was described as about 50–55 dB at Pittsburgh and Porter streets in regular operation, and 60–65 dB in an outage. The ISO screen is not run, because the cooling-tower cell count is not public.",
    sources: [WESA_TESTIMONY, TRIB],
  },
  {
    id: "air",
    label: "Air at the homes",
    value: "Unknown",
    detail:
      "The generator exhaust at the nearest residential area is not calculated. Generator megawatts and exhaust height are not public. EPA plume formula: concentration = emission ÷ (π × wind × σy × σz) × exp(−height² ÷ (2 × σz²)).",
    sources: [
      {
        href: "https://www.epa.gov/system/files/documents/2025-04/c03s04_april2025.pdf",
        label: "EPA AP-42 section 3.4, large diesel engines",
      },
      {
        href: "https://www.epa.gov/scram/air-quality-dispersion-modeling-screening-models",
        label: "EPA screening dispersion models",
      },
      {
        href: "https://www.epa.gov/no2-pollution/primary-national-ambient-air-quality-standards-naaqs-nitrogen-dioxide",
        label: "EPA 1-hour NO₂ standard, 100 ppb",
      },
    ],
  },
  {
    id: "electricity",
    label: "Pennsylvania average electricity price",
    value: "Unknown",
    detail:
      "The electricity price increase faced at the nearest residential area is not calculated. Facility load and hours are not a public number. Inferred, when those are known, as facility load ÷ Duquesne Light's summer peak × the EIA Pennsylvania price.",
    sources: [
      {
        href: "https://www.eia.gov/electricity/annual/html/epa_02_10.html",
        label: "EIA, Pennsylvania residential electricity price, 2025",
      },
      {
        href: "https://www.puc.pa.gov/media/3498/dlc-2025-summer-readiness-overview-report.pdf",
        label: "Duquesne Light 2025 summer peak, 2,703 MW",
      },
    ],
  },
  {
    id: "water-price",
    label: "Pittsburgh average water price",
    value: "Unknown",
    detail:
      "The water price increase faced at the nearest residential area is not calculated. An exact daily gallon figure was not published. Inferred, when that is known, as cooling water ÷ Pittsburgh Water's daily production × its price per 1,000 gallons.",
    sources: [
      {
        href: "https://www.pgh2o.com/residential-commercial-customers/rates",
        label: "Pittsburgh Water rates, March 8, 2026",
      },
      {
        href: "https://www.pgh2o.com/your-water/water-quality-treatment",
        label: "Pittsburgh Water average production, about 65 million gallons a day",
      },
      TRIB,
    ],
  },
  {
    id: "feeder",
    label: "Feeder load",
    value: "Unknown",
    detail:
      "The feeder comparison a neighborhood would feel is not calculated. Facility megawatts are not public. When they are known, the comparison is facility megawatts ÷ 6, the top of the peak EPRI reports for most 15 kV lines.",
    sources: [
      {
        href: "https://www.epri.com/research/products/000000003002011005",
        label: "EPRI 3002011005, typical 15 kV feeder peak of 4 to 6 MVA",
      },
    ],
  },
];

export const SPRINGDALE_BUILDINGS = BUILDINGS;
