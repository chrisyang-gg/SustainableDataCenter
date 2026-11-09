import type { MultiPolygon, Polygon } from "geojson";
import { pointInCounty } from "@/lib/geology";
import { geometryContains, placesAtPoint } from "@/lib/places";

export type ParcelMatch = {
  pin: string;
  mapBlockLot: string;
  latitude: number;
  longitude: number;
  placeSlug: string;
  placeName: string;
};

export type ParcelCandidates = {
  pins: string[];
  lots: string[];
};

const PARCEL_URL =
  "https://gisdata.alleghenycounty.us/arcgis/rest/services/OPENDATA/Parcels/MapServer/0/query";

export function parcelCandidates(raw: string): ParcelCandidates | null {
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed || trimmed.length > 32) return null;
  if (!/^[A-Z0-9][A-Z0-9\s-]*$/.test(trimmed)) return null;
  const dashed = trimmed.replace(/[\s_]+/g, "-").replace(/-+/g, "-");
  const compact = dashed.replace(/-/g, "");
  if (!/^[A-Z0-9]+$/.test(compact)) return null;

  const pins = new Set<string>();
  const lots = new Set<string>();
  if (compact.length >= 10 && compact.length <= 20) pins.add(compact);
  if (dashed.includes("-")) {
    lots.add(dashed);
    const parts = dashed.split("-");
    const [map, block, lot] = parts;
    const restAreNumbers = parts.slice(3).every((part) => /^\d+$/.test(part));
    if (
      map &&
      block &&
      lot &&
      /^\d+$/.test(map) &&
      /^[A-Z]$/.test(block) &&
      /^\d+$/.test(lot) &&
      restAreNumbers
    ) {
      lots.add(`${Number(map)}-${block}-${Number(lot)}`);
    }
  }
  if (pins.size === 0 && lots.size === 0) return null;
  return { pins: [...pins], lots: [...lots] };
}

export function parcelWhere(candidates: ParcelCandidates): string {
  const clauses = [
    ...candidates.pins.map((pin) => `PIN='${pin}'`),
    ...candidates.lots.map((lot) => `MAPBLOCKLOT='${lot}'`),
  ];
  return clauses.join(" OR ");
}

type ParcelGeometry = Polygon | MultiPolygon;

function ringPoints(ring: number[][]): number[][] {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring.slice(0, -1);
  return ring;
}

function average(points: number[][]): [number, number] | null {
  if (points.length === 0) return null;
  let longitude = 0;
  let latitude = 0;
  for (const point of points) {
    longitude += point[0];
    latitude += point[1];
  }
  return [longitude / points.length, latitude / points.length];
}

export function interiorPoint(
  geometry: ParcelGeometry,
): { longitude: number; latitude: number } | null {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    const ring = ringPoints(polygon[0] ?? []);
    const center = average(ring);
    if (!center) continue;
    if (geometryContains(geometry, center[0], center[1])) {
      return { longitude: center[0], latitude: center[1] };
    }
    for (let index = 0; index < ring.length; index += 1) {
      const start = ring[index];
      const end = ring[(index + 1) % ring.length];
      const midLongitude = (start[0] + end[0]) / 2;
      const midLatitude = (start[1] + end[1]) / 2;
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const length = Math.hypot(dx, dy) || 1;
      for (const side of [1, -1]) {
        const longitude = midLongitude + ((-dy / length) * 0.00008 * side);
        const latitude = midLatitude + ((dx / length) * 0.00008 * side);
        if (geometryContains(geometry, longitude, latitude)) {
          return { longitude, latitude };
        }
      }
    }
  }
  return null;
}

type ParcelFeature = {
  properties?: { PIN?: string; MAPBLOCKLOT?: string };
  geometry?: ParcelGeometry;
};

function asFeatures(payload: unknown): ParcelFeature[] {
  if (!payload || typeof payload !== "object") return [];
  const features = (payload as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];
  return features.filter((feature): feature is ParcelFeature => {
    if (!feature || typeof feature !== "object") return false;
    const geometry = (feature as ParcelFeature).geometry;
    return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
  });
}

const cache = new Map<string, ParcelMatch[]>();

export async function readParcel(raw: string): Promise<
  | { status: "found"; matches: ParcelMatch[] }
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "unavailable" }
> {
  const candidates = parcelCandidates(raw);
  if (!candidates) return { status: "invalid" };
  const key = `${candidates.pins.join(",")}|${candidates.lots.join(",")}`;
  const cached = cache.get(key);
  if (cached) return cached.length > 0 ? { status: "found", matches: cached } : { status: "empty" };

  const url = new URL(PARCEL_URL);
  url.searchParams.set("where", parcelWhere(candidates));
  url.searchParams.set("outFields", "PIN,MAPBLOCKLOT");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("geometryPrecision", "5");
  url.searchParams.set("f", "geojson");
  url.searchParams.set("resultRecordCount", "5");

  let payload: unknown;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "allegheny-data-centers", Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) return { status: "unavailable" };
    payload = await response.json();
  } catch {
    return { status: "unavailable" };
  }
  if (payload && typeof payload === "object" && "error" in payload) {
    return { status: "unavailable" };
  }

  const matches: ParcelMatch[] = [];
  for (const feature of asFeatures(payload)) {
    if (!feature.geometry) continue;
    const point = interiorPoint(feature.geometry);
    if (!point || !pointInCounty(point.latitude, point.longitude)) continue;
    const hits = placesAtPoint(point.longitude, point.latitude);
    const place = hits.find((item) => item.kind === "neighborhood") ?? hits[0];
    if (!place) continue;
    const pin = feature.properties?.PIN?.trim();
    const mapBlockLot = feature.properties?.MAPBLOCKLOT?.trim();
    if (!pin || !mapBlockLot) continue;
    matches.push({
      pin,
      mapBlockLot,
      latitude: Math.round(point.latitude * 1e5) / 1e5,
      longitude: Math.round(point.longitude * 1e5) / 1e5,
      placeSlug: place.slug,
      placeName: place.name,
    });
  }

  cache.set(key, matches);
  return matches.length > 0 ? { status: "found", matches } : { status: "empty" };
}
