export type Stage = "existing" | "proposed" | "planned";

export type PermitStatus = "Issued" | "Pending" | "Not Yet Submitted";

export type PermitRecord = {
  category: string;
  authorization: string;
  applicationType: string;
  permitNumber: string;
  submitted: string;
  status: PermitStatus;
  eFactsId: string;
};

export type Facility = {
  slug: string;
  name: string;
  stage: Stage;
  municipality: string;
  latitude: number;
  longitude: number;
  /** DEP marked the pin as an approximate location. */
  approximate: boolean;
  summary: string;
  alsoKnownAs: string[];
  companies: string[];
  companyLabel: string;
  capacity: string | null;
  acres: string | null;
  localNote: string | null;
  dep: {
    projectId: string;
    projectName: string;
    projectStatus: string;
  } | null;
  permits: PermitRecord[];
  sources: { label: string; href: string }[];
};

export const COUNTY_BOUNDS = {
  west: -80.360902,
  south: 40.194285,
  east: -79.688975,
  north: 40.674935,
} as const;

export const DATA_AS_OF = "October 31, 2026";

const tracker = (slug: string) =>
  `https://trackdatacenters.com/usa/pennsylvania/data-centers/${slug}`;

const DEP_TRACKER = "https://gis.dep.pa.gov/DataCenterPermitTracker/";

const springdalePermits: PermitRecord[] = [
  {
    category: "WRM Water Obstructions & Encroachments",
    authorization: "Water Obstruction & Encroachment Permit",
    applicationType: "Transfer",
    permitNumber: "E02-145",
    submitted: "12/8/25",
    status: "Issued",
    eFactsId: "1551380",
  },
  {
    category: "WRM Water Obstructions & Encroachments",
    authorization: "Water Obstruction & Encroachment Permit",
    applicationType: "Transfer",
    permitNumber: "E02-231",
    submitted: "12/8/25",
    status: "Issued",
    eFactsId: "1551370",
  },
  {
    category: "WRM Water Obstructions & Encroachments",
    authorization:
      "BWM-GP-11 Maintenance, Testing, Repair, Rehabilitation, or Replacement General Permit",
    applicationType: "Transfer",
    permitNumber: "GP110216248",
    submitted: "12/8/25",
    status: "Issued",
    eFactsId: "1551375",
  },
  {
    category: "WPC Erosion & Sediment Control",
    authorization: "Chapter 102 Individual NPDES Permit",
    applicationType: "",
    permitNumber: "",
    submitted: "",
    status: "Not Yet Submitted",
    eFactsId: "",
  },
  {
    category: "Environmental Cleanup & Brownfields",
    authorization: "RIR and Cleanup Plan (Act 2)",
    applicationType: "New",
    permitNumber: "LRP-5-2-841-19308",
    submitted: "8/24/26",
    status: "Pending",
    eFactsId: "",
  },
];

const seiPermits: PermitRecord[] = [
  ["WPC Erosion & Sediment Control", "Chapter 102 Individual NPDES Permit"],
  ["WPC Act 537 Municipal Sewage Planning", "Act 537 Sewage Planning"],
  ["Air Quality", "Plan Approval"],
  ["WPC NPDES", "Clean Water Permitting"],
  ["Storage Tanks", "Site Specific Installation Permit"],
  [
    "WRM Water Obstructions & Encroachments",
    "Water Obstruction & Encroachment Permit",
  ],
].map(([category, authorization]) => ({
  category,
  authorization,
  applicationType: "",
  permitNumber: "",
  submitted: "",
  status: "Not Yet Submitted" as const,
  eFactsId: "",
}));

export const facilities: Facility[] = [
  {
    slug: "dynamo-springdale",
    name: "Dynamo Springdale",
    stage: "proposed",
    municipality: "Springdale Borough",
    latitude: 40.53856579,
    longitude: -79.79046974,
    approximate: false,
    summary:
      "Proposed data center in Springdale Borough. Public project notes list 180–240 MW on 47 acres. PA DEP has the same site under review as Springdale Data Center.",
    alsoKnownAs: ["Springdale AI Data Center Redevelopment"],
    companies: ["Dynamo DC", "Allegheny DC Property Co., LLC"],
    companyLabel: "Developed by",
    capacity: "180–240 MW",
    acres: "47 acres",
    localNote:
      "The facility tracker describes this project as approved. DEP still lists the permit file as under review. Those are different decisions.",
    dep: {
      projectId: "10000019",
      projectName: "Springdale Data Center (Allegheny DC Property Co. LLC)",
      projectStatus: "Under Review",
    },
    permits: springdalePermits,
    sources: [
      { label: "Facility tracker", href: tracker("dynamo-springdale") },
      { label: "PA DEP Data Center Permit Tracker", href: DEP_TRACKER },
    ],
  },
  {
    slug: "henderson-road-data-center",
    name: "Henderson Road Data Center",
    stage: "proposed",
    municipality: "Elizabeth Township",
    latitude: 40.28770855,
    longitude: -79.79298041,
    approximate: false,
    summary:
      "Proposed data center in Elizabeth Township. Public project notes list 1,000 MW on 549 acres. The PA DEP permit tracker has no Allegheny file under this name.",
    alsoKnownAs: ["Hendricks Henderson Road"],
    companies: ["Hendricks Group Developers, LLC"],
    companyLabel: "Developed by",
    capacity: "1,000 MW",
    acres: "549 acres",
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      {
        label: "Facility tracker",
        href: tracker("henderson-road-data-center"),
      },
    ],
  },
  {
    slug: "sei-allegheny",
    name: "SEI Allegheny",
    stage: "proposed",
    municipality: "Findlay Township",
    latitude: 40.477553,
    longitude: -80.283389,
    approximate: true,
    summary:
      "Proposed data center in Findlay Township. PA DEP maps an approximate location and lists the project as proposed, with no applications received.",
    alsoKnownAs: [],
    companies: [],
    companyLabel: "Companies",
    capacity: null,
    acres: null,
    localNote: null,
    dep: {
      projectId: "10000074",
      projectName: "SEI Allegheny",
      projectStatus: "Proposed (No Applications Received)",
    },
    permits: seiPermits,
    sources: [{ label: "PA DEP Data Center Permit Tracker", href: DEP_TRACKER }],
  },
  {
    slug: "mckees-rocks-industrial-site-data-center",
    name: "McKees Rocks Industrial Site Data Center",
    stage: "planned",
    municipality: "Stowe Township",
    latitude: 40.4802974,
    longitude: -80.05962827,
    approximate: false,
    summary:
      "Planned data center in Stowe Township. SunCap Property Group is the company named on the public project note. PA DEP has no matching permit file in this county extract.",
    alsoKnownAs: [],
    companies: ["SunCap Property Group"],
    companyLabel: "Companies",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      {
        label: "Facility tracker",
        href: tracker("mckees-rocks-industrial-site-data-center"),
      },
    ],
  },
  {
    slug: "365-pittsburgh",
    name: "365 Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.45138862,
    longitude: -80.00563669,
    approximate: false,
    summary: "Existing data center in Pittsburgh, operated by 365 Data Centers.",
    alsoKnownAs: [],
    companies: ["365 Data Centers"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [{ label: "Facility tracker", href: tracker("365-pittsburgh") }],
  },
  {
    slug: "ascent-pittsburgh",
    name: "Ascent Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.49602064,
    longitude: -79.86658915,
    approximate: false,
    summary: "Existing data center in Pittsburgh, operated by Ascent Data.",
    alsoKnownAs: [],
    companies: ["Ascent Data"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [{ label: "Facility tracker", href: tracker("ascent-pittsburgh") }],
  },
  {
    slug: "aspstation-pittsburgh",
    name: "aspStation Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.46532812,
    longitude: -79.94671421,
    approximate: false,
    summary: "Existing data center in Pittsburgh, operated by aspStation, Inc.",
    alsoKnownAs: [],
    companies: ["aspStation, Inc."],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      { label: "Facility tracker", href: tracker("aspstation-pittsburgh") },
    ],
  },
  {
    slug: "centerserv-pittsburgh",
    name: "CenterServ Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.43804677,
    longitude: -79.99860019,
    approximate: false,
    summary: "Existing data center in Pittsburgh, operated by CenterServ.",
    alsoKnownAs: [],
    companies: ["CenterServ"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      { label: "Facility tracker", href: tracker("centerserv-pittsburgh") },
    ],
  },
  {
    slug: "citynet-pittsburgh",
    name: "Citynet Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.45075522,
    longitude: -80.0043678,
    approximate: false,
    summary: "Existing data center in Pittsburgh, operated by Citynet.",
    alsoKnownAs: [],
    companies: ["Citynet"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [{ label: "Facility tracker", href: tracker("citynet-pittsburgh") }],
  },
  {
    slug: "cogent-pittsburgh",
    name: "Cogent Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.45935952,
    longitude: -79.97036419,
    approximate: false,
    summary:
      "Existing data center in Pittsburgh, operated by Cogent Communications.",
    alsoKnownAs: [],
    companies: ["Cogent Communications"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [{ label: "Facility tracker", href: tracker("cogent-pittsburgh") }],
  },
  {
    slug: "consolidated-communications-pittsburgh",
    name: "Consolidated Communications Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.51861322,
    longitude: -80.0151885,
    approximate: false,
    summary:
      "Existing data center in Pittsburgh, operated by Consolidated Communications.",
    alsoKnownAs: [],
    companies: ["Consolidated Communications"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      {
        label: "Facility tracker",
        href: tracker("consolidated-communications-pittsburgh"),
      },
    ],
  },
  {
    slug: "databank-pittsburgh",
    name: "DataBank Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.451389,
    longitude: -80.005637,
    approximate: false,
    summary:
      "Existing DataBank capacity in Pittsburgh. The public tracker places PIT1 Downtown and PIT2 Summit Park on a single pin.",
    alsoKnownAs: ["DataBank PIT1 Downtown", "DataBank PIT2 Summit Park"],
    companies: ["DataBank"],
    companyLabel: "Developed by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [{ label: "Facility tracker", href: tracker("databank-pittsburgh") }],
  },
  {
    slug: "dqe-pittsburgh",
    name: "DQE Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.43891106,
    longitude: -80.00054792,
    approximate: false,
    summary: "Existing data center in Pittsburgh, operated by DQE Communications.",
    alsoKnownAs: [],
    companies: ["DQE Communications"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [{ label: "Facility tracker", href: tracker("dqe-pittsburgh") }],
  },
  {
    slug: "edgeconnex-pit01",
    name: "EdgeConneX PIT01",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.45236944,
    longitude: -80.04173533,
    approximate: false,
    summary: "Existing data center in Pittsburgh, operated by EdgeConnex.",
    alsoKnownAs: [],
    companies: ["EdgeConnex"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [{ label: "Facility tracker", href: tracker("edgeconnex-pit01") }],
  },
  {
    slug: "expedient-pittsburgh",
    name: "Expedient Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.451389,
    longitude: -80.005637,
    approximate: false,
    summary:
      "Existing Expedient capacity in Pittsburgh. The public tracker places PIT1 and PIT2 on a single pin.",
    alsoKnownAs: ["Expedient PIT1", "Expedient PIT2"],
    companies: ["Expedient"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      { label: "Facility tracker", href: tracker("expedient-pittsburgh") },
    ],
  },
  {
    slug: "h5-data-centers-pittsburgh",
    name: "H5 Data Centers Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.45179694,
    longitude: -79.98089033,
    approximate: false,
    summary: "Existing data center in Pittsburgh, operated by H5 Data Centers.",
    alsoKnownAs: [],
    companies: ["H5 Data Centers"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      { label: "Facility tracker", href: tracker("h5-data-centers-pittsburgh") },
    ],
  },
  {
    slug: "im-critical-pittsburgh",
    name: "iM Critical Pittsburgh",
    stage: "existing",
    municipality: "Wilkinsburg",
    latitude: 40.43407405,
    longitude: -79.87288548,
    approximate: false,
    summary: "Existing data center in Wilkinsburg, operated by iM Critical.",
    alsoKnownAs: [],
    companies: ["iM Critical"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      { label: "Facility tracker", href: tracker("im-critical-pittsburgh") },
    ],
  },
  {
    slug: "lumen-pittsburgh",
    name: "Lumen Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.454772,
    longitude: -79.980088,
    approximate: false,
    summary:
      "Existing Lumen capacity in Pittsburgh. The public tracker places Lumen Pittsburgh 1 and Lumen Pittsburgh 2 on a single pin.",
    alsoKnownAs: ["Lumen Pittsburgh 1", "Lumen Pittsburgh 2"],
    companies: ["Lumen"],
    companyLabel: "Developed by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [{ label: "Facility tracker", href: tracker("lumen-pittsburgh") }],
  },
  {
    slug: "msa-evergreen-heights",
    name: "MSA Evergreen Heights",
    stage: "existing",
    municipality: "Ross Township",
    latitude: 40.51861861,
    longitude: -80.01522054,
    approximate: false,
    summary:
      "Existing data center in Ross Township, operated by Management Science Associates, LLC.",
    alsoKnownAs: [],
    companies: ["Management Science Associates, LLC"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      { label: "Facility tracker", href: tracker("msa-evergreen-heights") },
    ],
  },
  {
    slug: "northern-data-ardent-pit1",
    name: "Northern Data Ardent PIT1",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.43958024,
    longitude: -80.14212864,
    approximate: false,
    summary:
      "Existing data center in Pittsburgh, operated by Ardent Data Centers and Northern Data AG.",
    alsoKnownAs: [],
    companies: ["Ardent Data Centers", "Northern Data AG"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      { label: "Facility tracker", href: tracker("northern-data-ardent-pit1") },
    ],
  },
  {
    slug: "tarentum-rockpointe",
    name: "Tarentum RockPointe",
    stage: "existing",
    municipality: "Tarentum",
    latitude: 40.60150822,
    longitude: -79.8197542,
    approximate: false,
    summary:
      "Existing data center in Tarentum, operated by Management Science Associates, LLC and Consolidated Communications Holdings, Inc.",
    alsoKnownAs: [],
    companies: [
      "Management Science Associates, LLC",
      "Consolidated Communications Holdings, Inc",
    ],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      { label: "Facility tracker", href: tracker("tarentum-rockpointe") },
    ],
  },
  {
    slug: "teraswitch-networks-pittsburgh",
    name: "TeraSwitch Networks Pittsburgh",
    stage: "existing",
    municipality: "Pittsburgh",
    latitude: 40.45138862,
    longitude: -80.00563669,
    approximate: false,
    summary: "Existing data center in Pittsburgh, operated by TeraSwitch.",
    alsoKnownAs: [],
    companies: ["TeraSwitch"],
    companyLabel: "Operated by",
    capacity: null,
    acres: null,
    localNote: null,
    dep: null,
    permits: [],
    sources: [
      {
        label: "Facility tracker",
        href: tracker("teraswitch-networks-pittsburgh"),
      },
    ],
  },
];

export function getFacility(slug: string): Facility | undefined {
  return facilities.find((facility) => facility.slug === slug);
}

export function municipalities(): string[] {
  return [...new Set(facilities.map((facility) => facility.municipality))].sort(
    (a, b) => a.localeCompare(b),
  );
}
