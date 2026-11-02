import type { OrdinanceStatus } from "@/lib/place-directory";
import type { FloodZone, GeologyUnit } from "@/lib/geology";

export type ReminderTone = "ok" | "debated" | "no";

const SFHA = new Set(["A", "AE", "AH", "AO", "AR", "A99", "V", "VE"]);

export function reminderLabel(tone: ReminderTone): string {
  if (tone === "ok") return "Possible";
  if (tone === "debated") return "Debated";
  return "Not possible";
}

export function reminderColor(tone: ReminderTone): string {
  if (tone === "ok") return "#3cba6a";
  if (tone === "debated") return "#e6b422";
  return "#e24b4b";
}

export function ordinanceReminder(
  whereAllowed: string,
  status: OrdinanceStatus,
): { tone: ReminderTone; reason: string } {
  const text = whereAllowed.toLowerCase();
  if (status === "proposed" || text.includes("(draft)")) {
    return {
      tone: "debated",
      reason: "A data-center rule is still a draft in the October 28, 2026 review.",
    };
  }
  if (text.includes("unless found similar")) {
    return {
      tone: "debated",
      reason:
        "The review says unlisted uses are prohibited unless they are found similar to a listed use. Data centers are not listed.",
    };
  }
  if (text.includes("unlisted uses prohibited") || text.includes("unlisted uses are prohibited")) {
    return {
      tone: "no",
      reason:
        "The review says unlisted uses are prohibited, and it does not list data centers.",
    };
  }
  if (text.includes("unlisted") && text.includes("permitted by right")) {
    return {
      tone: "ok",
      reason:
        "Data centers are not named. The review says unlisted uses are permitted by right in at least one district.",
    };
  }
  if (text.includes("permitted by right") || text.includes("permitted in the") || text.startsWith("permitted in ")) {
    return {
      tone: "ok",
      reason: "The review says this use is permitted in at least one district.",
    };
  }
  if (text.includes("conditional") || text.includes("special exception")) {
    return {
      tone: "debated",
      reason:
        "The review says a data center needs a conditional use or a special exception.",
    };
  }
  return {
    tone: "debated",
    reason:
      "The review does not list data centers as a use, so the zoning code does not settle them.",
  };
}

function worse(current: ReminderTone, next: ReminderTone): ReminderTone {
  const rank: Record<ReminderTone, number> = { ok: 0, debated: 1, no: 2 };
  return rank[next] > rank[current] ? next : current;
}

export function pinReminder(
  areaTone: ReminderTone,
  floodZones: FloodZone[],
  units: GeologyUnit[],
): { tone: ReminderTone; notes: string[] } {
  let tone = areaTone;
  const notes: string[] = [];
  const floodway = floodZones.some((zone) =>
    (zone.detail ?? "").toLowerCase().includes("floodway"),
  );
  const specialFlood = floodZones.some((zone) => SFHA.has(zone.code.toUpperCase()));
  if (floodway) {
    tone = "no";
    notes.push("FEMA maps a floodway at this pin.");
  } else if (specialFlood) {
    tone = worse(tone, "debated");
    notes.push("FEMA maps the 1% annual-chance floodplain at this pin.");
  }
  const landslide = units.some((unit) =>
    `${unit.name} ${unit.description}`.toLowerCase().includes("landslide"),
  );
  if (landslide) {
    tone = worse(tone, "debated");
    notes.push("The geologic map mentions landslide deposits at this pin.");
  }
  return { tone, notes };
}
