import { COUNTY_BOUNDS } from "@/data/facilities";
import type { WaterReading } from "@/lib/water";

export type GeologyUnit = {
  name: string;
  age: string;
  lithology: string;
  description: string;
};

export type FloodZone = {
  code: string;
  detail: string | null;
};

export type GeologyReport = {
  latitude: number;
  longitude: number;
  elevationFeet: number | null;
  units: GeologyUnit[];
  floodZones: FloodZone[];
  messages: string[];
  sources: { label: string; href: string }[];
  water?: WaterReading | null;
};

const PAD = 0.02;

export function pointInCounty(latitude: number, longitude: number): boolean {
  return (
    latitude >= COUNTY_BOUNDS.south - PAD &&
    latitude <= COUNTY_BOUNDS.north + PAD &&
    longitude >= COUNTY_BOUNDS.west - PAD &&
    longitude <= COUNTY_BOUNDS.east + PAD
  );
}

export function floodDetail(subtype: string | null | undefined): string | null {
  if (!subtype) return null;
  const trimmed = subtype.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${response.status}`);
  }
  return response.json();
}

function unitsFrom(payload: unknown): GeologyUnit[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { success?: { data?: unknown } }).success?.data;
  if (!Array.isArray(data)) return [];
  const units: GeologyUnit[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = text(row.name);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    units.push({
      name,
      age: text(row.best_int_name) || text(row.t_int_name) || "Age not stated",
      lithology: text(row.lith) || "Lithology not stated",
      description: text(row.descrip),
    });
    if (units.length === 3) break;
  }
  return units;
}

function elevationFrom(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as { value?: unknown }).value;
  if (typeof value !== "number" || value < 200 || value > 3000) return null;
  return Math.round(value);
}

function floodFrom(payload: unknown): FloodZone[] {
  if (!payload || typeof payload !== "object") return [];
  const features = (payload as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];
  const zones: FloodZone[] = [];
  const seen = new Set<string>();
  for (const feature of features) {
    if (!feature || typeof feature !== "object") continue;
    const attributes = (feature as { attributes?: Record<string, unknown> })
      .attributes;
    if (!attributes) continue;
    const code = text(attributes.FLD_ZONE);
    if (!code) continue;
    const detail = floodDetail(text(attributes.ZONE_SUBTY));
    const key = `${code}:${detail ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    zones.push({ code, detail });
  }
  return zones;
}

const cache = new Map<string, GeologyReport>();

export async function readGeology(
  latitude: number,
  longitude: number,
): Promise<GeologyReport> {
  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const macroUrl = `https://macrostrat.org/api/geologic_units/map?lat=${latitude}&lng=${longitude}`;
  const elevationUrl = `https://epqs.nationalmap.gov/v1/json?x=${longitude}&y=${latitude}&units=Feet&wkid=4326`;
  const floodUrl =
    "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?" +
    `geometry=${longitude},${latitude}&geometryType=esriGeometryPoint&inSR=4326` +
    "&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY&returnGeometry=false&f=json";

  const [unitsResult, elevationResult, floodResult] = await Promise.allSettled([
    readJson(macroUrl),
    readJson(elevationUrl),
    readJson(floodUrl),
  ]);

  const messages: string[] = [];
  let units: GeologyUnit[] = [];
  if (unitsResult.status === "fulfilled") {
    units = unitsFrom(unitsResult.value);
    if (units.length === 0) {
      messages.push("Macrostrat returned no mapped unit at this pin.");
    }
  } else {
    messages.push("The geologic map did not respond for this pin.");
  }

  let elevationFeet: number | null = null;
  if (elevationResult.status === "fulfilled") {
    elevationFeet = elevationFrom(elevationResult.value);
    if (elevationFeet === null) {
      messages.push("USGS elevation returned no usable ground height here.");
    }
  } else {
    messages.push("The elevation service did not respond for this pin.");
  }

  let floodZones: FloodZone[] = [];
  if (floodResult.status === "fulfilled") {
    floodZones = floodFrom(floodResult.value);
    if (floodZones.length === 0) {
      messages.push("The flood layer returned no zone at this pin.");
    }
  } else {
    messages.push("The flood-hazard service did not respond for this pin.");
  }

  const report: GeologyReport = {
    latitude,
    longitude,
    elevationFeet,
    units,
    floodZones,
    messages,
    sources: [
      { label: "Macrostrat geologic map", href: macroUrl },
      { label: "USGS 3DEP elevation", href: elevationUrl },
      { label: "FEMA National Flood Hazard Layer", href: floodUrl },
    ],
  };
  cache.set(key, report);
  return report;
}
