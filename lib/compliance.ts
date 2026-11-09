import type { FloodZone, GeologyUnit } from "@/lib/geology";
import { EPA_OUTDOOR_LDN_DBA, NO2_1H_UG_PER_M3 } from "@/lib/impact";

const SFHA = new Set(["A", "AE", "AH", "AO", "AR", "A99", "V", "VE"]);

export type ComplianceMark =
  | "violation"
  | "exceedance"
  | "gap"
  | "clear"
  | "unchecked"
  | "aside";

export type ComplianceRow = {
  id: string;
  title: string;
  mark: ComplianceMark;
  finding: string;
  sources: { label: string; href: string }[];
};

const FLOOD_RULE = {
  sources: [
    {
      label: "44 CFR 60.3, flood plain management criteria",
      href: "https://www.ecfr.gov/current/title-44/chapter-I/subchapter-B/part-60/subpart-A/section-60.3",
    },
  ],
};

const NIST_ISO = {
  sources: [
    {
      label: "NIST SP 800-53 Rev. 5, control PE-23",
      href: "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final",
    },
    {
      label: "ISO/IEC 27001:2022",
      href: "https://www.iso.org/standard/27001.html",
    },
  ],
};

const TIA = {
  sources: [
    {
      label: "TIA-942-C data center infrastructure overview",
      href: "https://tiaonline.org/wp-content/uploads/2024/05/TIA-942-C-DC-infrastructure-stadard_TIA-white-paper.pdf",
    },
  ],
};

const NOISE = {
  sources: [
    {
      label: "EPA outdoor noise level, 55 dBA Ldn, 1974",
      href: "https://www.epa.gov/archive/epa/aboutepa/epa-identifies-noise-levels-affecting-health-and-welfare.html",
    },
  ],
};

const AIR = {
  sources: [
    {
      label: "EPA 1-hour NO₂ standard, 100 ppb",
      href: "https://www.epa.gov/no2-pollution/primary-national-ambient-air-quality-standards-naaqs-nitrogen-dioxide",
    },
  ],
};

const CUSTOMER = {
  sources: [
    {
      label: "HIPAA Security Rule, 45 CFR Part 164 Subpart C",
      href: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C",
    },
    {
      label: "PCI Security Standards Council document library",
      href: "https://www.pcisecuritystandards.org/document_library/",
    },
  ],
};

function isFloodway(zones: FloodZone[]): boolean {
  return zones.some((zone) => (zone.detail ?? "").toLowerCase().includes("floodway"));
}

function sfhaCodes(zones: FloodZone[]): string[] {
  return zones
    .filter((zone) => SFHA.has(zone.code.toUpperCase()))
    .map((zone) => zone.code.toUpperCase());
}

function landslide(units: GeologyUnit[]): boolean {
  return units.some((unit) =>
    `${unit.name} ${unit.description}`.toLowerCase().includes("landslide"),
  );
}

function floodFact(zones: FloodZone[], floodChecked: boolean): string {
  if (!floodChecked) return "The flood-hazard service did not respond for this pin.";
  if (isFloodway(zones)) return "FEMA maps a regulatory floodway at this pin.";
  const codes = sfhaCodes(zones);
  if (codes.length > 0) {
    return `FEMA maps the 1% floodplain at this pin (${codes.map((code) => `Zone ${code}`).join(", ")}).`;
  }
  if (zones.length > 0) {
    const names = zones.map((zone) => `Zone ${zone.code}`).join(", ");
    return `FEMA maps ${names} at this pin, which is outside the special flood hazard codes.`;
  }
  return "The flood layer returned no special flood hazard at this pin.";
}

export function complianceAtPin(input: {
  floodZones: FloodZone[];
  floodChecked: boolean;
  units: GeologyUnit[];
  geologyChecked: boolean;
  noiseLdnDba: number | null;
  no2Micrograms: number | null;
}): ComplianceRow[] {
  const floodway = input.floodChecked && isFloodway(input.floodZones);
  const sfha = input.floodChecked && sfhaCodes(input.floodZones).length > 0 && !floodway;
  const slide = input.geologyChecked && landslide(input.units);
  const hazards = [
    floodway ? "a regulatory floodway" : null,
    sfha ? "the 1% floodplain" : null,
    slide ? "a geologic unit that mentions landslide deposits" : null,
  ].filter((item): item is string => item !== null);

  const noise: ComplianceRow = {
    id: "noise",
    title: "Night noise at the nearest homes",
    mark:
      input.noiseLdnDba === null
        ? "unchecked"
        : input.noiseLdnDba > EPA_OUTDOOR_LDN_DBA
          ? "exceedance"
          : "clear",
    finding:
      input.noiseLdnDba === null
        ? "Not evaluated. The noise screen needs the distance to a home, so an exceedance of 55 dBA Ldn was not checked."
        : input.noiseLdnDba > EPA_OUTDOOR_LDN_DBA
          ? `Potential exceedance, not a recorded violation. The night screen is ${Math.round(input.noiseLdnDba)} dBA Ldn at the nearest homes. The EPA outdoor level is ${EPA_OUTDOOR_LDN_DBA} dBA Ldn. The screen leaves out barriers, and it is not a monitor.`
          : `No exceedance found. The night screen is ${Math.round(input.noiseLdnDba)} dBA Ldn, at or under the EPA outdoor level of ${EPA_OUTDOOR_LDN_DBA} dBA Ldn.`,
    ...NOISE,
  };

  const air: ComplianceRow = {
    id: "air",
    title: "One-hour NO₂ at the nearest homes",
    mark:
      input.no2Micrograms === null
        ? "unchecked"
        : input.no2Micrograms > NO2_1H_UG_PER_M3
          ? "exceedance"
          : "clear",
    finding:
      input.no2Micrograms === null
        ? "Not evaluated. The plume needs the distance to a home, so an exceedance of the 1-hour NO₂ standard was not checked."
        : input.no2Micrograms > NO2_1H_UG_PER_M3
          ? `Potential exceedance, not a recorded violation. The one-hour screen is ${Math.round(input.no2Micrograms).toLocaleString("en-US")} µg/m³ against the EPA 1-hour standard of ${NO2_1H_UG_PER_M3} µg/m³. A NAAQS violation is a monitored design value, not this screen.`
          : `No exceedance found. The one-hour screen is ${Math.round(input.no2Micrograms).toLocaleString("en-US")} µg/m³, at or under ${NO2_1H_UG_PER_M3} µg/m³.`,
    ...AIR,
  };

  const nfip: ComplianceRow = {
    id: "nfip",
    title: "Floodplain rule, 44 CFR 60.3",
    mark: !input.floodChecked ? "unchecked" : floodway ? "violation" : sfha ? "violation" : "clear",
    finding: !input.floodChecked
      ? "Not evaluated. The flood-hazard service did not respond, so a floodway violation was not checked."
      : floodway
        ? "Potential violation. 44 CFR 60.3(d)(3) prohibits new construction in an adopted regulatory floodway unless a hydraulic analysis shows the project would not raise flood levels. FEMA maps a floodway here, and that showing has not been made."
        : sfha
          ? `Potential violation if the building sits below the base flood elevation. ${floodFact(input.floodZones, true)} 44 CFR 60.3(c) requires the community to keep new construction at or above that elevation. The design elevation is not known.`
          : `No violation found. ${floodFact(input.floodZones, true)} The construction limits in 44 CFR 60.3 apply where FEMA has mapped a floodway or a base flood elevation.`,
    ...FLOOD_RULE,
  };

  let securityMark: ComplianceMark = "clear";
  if (!input.floodChecked && !input.geologyChecked) securityMark = "unchecked";
  else if (hazards.length > 0) securityMark = "gap";
  else if (!input.floodChecked || !input.geologyChecked) securityMark = "unchecked";

  const gaps = [
    input.floodChecked ? null : "The flood service did not respond.",
    input.geologyChecked ? null : "The geologic map did not respond.",
  ].filter((item): item is string => item !== null);

  const security: ComplianceRow = {
    id: "pe-23",
    title: "NIST PE-23 and ISO 27001 A.7.5",
    mark: securityMark,
    finding:
      securityMark === "unchecked" && hazards.length === 0
        ? `Not evaluated. NIST SP 800-53 PE-23 and ISO/IEC 27001:2022 Annex A 7.5 require the location plan to account for physical and environmental threats. ${gaps.join(" ")}`
        : hazards.length > 0
          ? `Potential gap, not a violation by itself. PE-23 and Annex A 7.5 are met by a written location plan, which this map is not. This pin has ${hazards.join(" and ")}. ${gaps.join(" ")}`
          : "No violation found in this check. No flood hazard and no landslide deposit were mapped at this pin. PE-23 and Annex A 7.5 still require that conclusion in a written risk strategy. This row is not an authorization.",
    ...NIST_ISO,
  };

  const tia: ComplianceRow = {
    id: "tia-942",
    title: "TIA-942-C site selection",
    mark: "aside",
    finding: `Not a cited violation. A TIA-942 breach is not claimed, because the setback distances are in the paid standard and are not calculated here. ${floodFact(input.floodZones, input.floodChecked)}`,
    ...TIA,
  };

  const customer: ComplianceRow = {
    id: "customer",
    title: "SOC 2, PCI DSS, and HIPAA",
    mark: "aside",
    finding:
      "Not a site violation. SOC 2, PCI DSS Requirement 9, and the HIPAA Security Rule attach when the customer workload needs them. None of them is earned or failed by this coordinate. A federal tenant under FedRAMP inherits PE-23 above.",
    ...CUSTOMER,
  };

  return [noise, air, nfip, security, tia, customer];
}

export function violationVerdict(rows: ComplianceRow[]): string {
  const violations = rows.filter((row) => row.mark === "violation").map((row) => row.title);
  const exceedances = rows.filter((row) => row.mark === "exceedance").map((row) => row.title);
  const gaps = rows.filter((row) => row.mark === "gap").map((row) => row.title);
  const unchecked = rows.filter((row) => row.mark === "unchecked").map((row) => row.title);
  const parts: string[] = [];
  const flood = rows.find((row) => row.id === "nfip");
  if (violations.length > 0) {
    parts.push(`Potential violation: ${violations.join("; ")}.`);
  } else if (flood?.mark === "unchecked") {
    parts.push("The flood rule was not evaluated, so a regulatory violation was not ruled out.");
  } else {
    parts.push("No potential regulatory violation in the limits this map can check.");
  }
  if (exceedances.length > 0) {
    parts.push(
      `Potential exceedance of a published level, not a recorded violation: ${exceedances.join("; ")}.`,
    );
  }
  if (gaps.length > 0) {
    parts.push(`Potential gap, not a violation by itself: ${gaps.join("; ")}.`);
  }
  if (unchecked.length > 0) {
    parts.push(`Not evaluated: ${unchecked.join("; ")}.`);
  }
  return parts.join(" ");
}
