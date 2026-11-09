import { distanceToLines } from "@/lib/distance";

const LINES =
  "https://mapservices.pasda.psu.edu/server/rest/services/pasda/HIFLD_FEMA_PA/MapServer/215/query";

/** Pads in degrees. The last pad is about 8 miles east-west at this latitude. */
const PADS = [0.03, 0.08, 0.16];

export type TransmissionLine = {
  meters: number;
  voltageKv: number | null;
  owner: string | null;
};

export type GridLookup =
  | { status: "found"; line: TransmissionLine }
  | { status: "empty" }
  | { status: "unavailable" };

type LineFeature = {
  properties?: { OWNER?: string | null; VOLTAGE?: number | null; STATUS?: string | null };
  geometry?:
    | { type: "LineString"; coordinates: number[][] }
    | { type: "MultiLineString"; coordinates: number[][][] };
};

const cache = new Map<string, GridLookup>();

function padRadiusMeters(latitude: number, pad: number): number {
  return pad * (Math.PI / 180) * 6_371_000 * Math.cos((latitude * Math.PI) / 180);
}

export function closestInServiceLine(
  longitude: number,
  latitude: number,
  features: LineFeature[],
): TransmissionLine | null {
  let best: TransmissionLine | null = null;
  for (const feature of features) {
    const status = feature.properties?.STATUS;
    if (status && status !== "IN SERVICE") continue;
    const geometry = feature.geometry;
    if (!geometry) continue;
    const lines =
      geometry.type === "MultiLineString" ? geometry.coordinates : [geometry.coordinates];
    const meters = distanceToLines(longitude, latitude, lines);
    if (!Number.isFinite(meters)) continue;
    if (best && meters >= best.meters) continue;
    const voltage = feature.properties?.VOLTAGE;
    const owner = feature.properties?.OWNER?.trim();
    best = {
      meters,
      voltageKv: typeof voltage === "number" && Number.isFinite(voltage) ? voltage : null,
      owner: owner ? owner : null,
    };
  }
  return best;
}

async function query(longitude: number, latitude: number, pad: number): Promise<LineFeature[]> {
  const url = new URL(LINES);
  url.searchParams.set(
    "geometry",
    `${longitude - pad},${latitude - pad},${longitude + pad},${latitude + pad}`,
  );
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "OWNER,VOLTAGE,STATUS");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("f", "geojson");
  const response = await fetch(url, {
    headers: { "User-Agent": "allegheny-data-centers", Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(String(response.status));
  const payload = (await response.json()) as { features?: LineFeature[] };
  const features = payload.features ?? [];
  if (features.length >= 2000) throw new Error("truncated");
  return features;
}

export async function nearestTransmission(
  latitude: number,
  longitude: number,
): Promise<GridLookup> {
  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    let result: GridLookup = { status: "empty" };
    for (const pad of PADS) {
      const line = closestInServiceLine(longitude, latitude, await query(longitude, latitude, pad));
      if (!line) continue;
      result = { status: "found", line };
      if (line.meters < padRadiusMeters(latitude, pad)) break;
    }
    if (result.status === "found") cache.set(key, result);
    else cache.set(key, result);
    return result;
  } catch {
    return { status: "unavailable" };
  }
}

export function describeTransmission(lookup: GridLookup): string {
  if (lookup.status === "unavailable") return "The transmission-line map did not respond.";
  if (lookup.status === "empty") {
    return "No in-service transmission line is mapped within 8 miles.";
  }
  const miles = (lookup.line.meters / 1609.344).toFixed(2);
  const voltage =
    lookup.line.voltageKv === null ? "voltage not listed" : `${lookup.line.voltageKv} kV`;
  const owner = lookup.line.owner ? `, ${lookup.line.owner}` : "";
  return `The nearest mapped in-service transmission line is ${miles} miles away, ${voltage}${owner}. That is a high-voltage line, not the 15 kV circuit those homes share.`;
}
