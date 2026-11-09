import { distanceToGeometry } from "@/lib/distance";

export type HomesLookup =
  | { status: "found"; meters: number; onBuilding: boolean }
  | { status: "empty" }
  | { status: "unavailable" };

const BUILDINGS =
  "https://gisdata.alleghenycounty.us/arcgis/rest/services/EGIS/Buildings/MapServer/0/query";

const cache = new Map<string, HomesLookup>();

type GeoJson = {
  features?: {
    geometry?:
      | { type: "Polygon"; coordinates: number[][][] }
      | { type: "MultiPolygon"; coordinates: number[][][][] };
  }[];
  exceededTransferLimit?: boolean;
};

async function query(params: Record<string, string>): Promise<GeoJson> {
  const url = new URL(BUILDINGS);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { "User-Agent": "allegheny-data-centers", Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as GeoJson;
}

const base = {
  geometryType: "esriGeometryPoint",
  inSR: "4326",
  spatialRel: "esriSpatialRelIntersects",
  where: "FEATURECODE=210",
  f: "json",
};

async function count(longitude: number, latitude: number, meters: number | null): Promise<number> {
  const payload = await query({
    ...base,
    geometry: `${longitude},${latitude}`,
    returnCountOnly: "true",
    ...(meters === null
      ? {}
      : { distance: String(meters), units: "esriSRUnit_Meter" }),
  });
  const countValue = (payload as { count?: number }).count;
  if (typeof countValue !== "number") throw new Error("count");
  return countValue;
}

export async function nearestHomes(
  latitude: number,
  longitude: number,
): Promise<HomesLookup> {
  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const onBuilding = await count(longitude, latitude, null);
    if (onBuilding > 0) {
      const found: HomesLookup = { status: "found", meters: 0, onBuilding: true };
      cache.set(key, found);
      return found;
    }

    let low = 0;
    let high = 20_000;
    let seen = 0;
    for (let step = 0; step < 14; step += 1) {
      const mid = Math.ceil((low + high) / 2);
      const hits = await count(longitude, latitude, mid);
      if (hits > 0) {
        seen = hits;
        high = mid;
      } else {
        low = mid;
      }
    }
    if (seen === 0) {
      const empty: HomesLookup = { status: "empty" };
      cache.set(key, empty);
      return empty;
    }

    const payload = await query({
      ...base,
      geometry: `${longitude},${latitude}`,
      distance: String(high),
      units: "esriSRUnit_Meter",
      outFields: "FEATURECODE",
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson",
      resultRecordCount: "200",
    });
    let best = Number.POSITIVE_INFINITY;
    for (const feature of payload.features ?? []) {
      const geometry = feature.geometry;
      if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
        continue;
      }
      best = Math.min(best, distanceToGeometry(longitude, latitude, geometry));
    }
    const meters = Number.isFinite(best) ? best : high;
    const found: HomesLookup = {
      status: "found",
      meters,
      onBuilding: meters === 0,
    };
    cache.set(key, found);
    return found;
  } catch {
    return { status: "unavailable" };
  }
}
