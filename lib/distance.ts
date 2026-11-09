type Ring = number[][];
type Polygon = Ring[];
type Geometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: Polygon[] };

const EARTH_RADIUS_METERS = 6_371_000;

function ringContains(ring: Ring, longitude: number, latitude: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const crosses = yi > latitude !== yj > latitude;
    if (
      crosses &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function polygonContains(polygon: Polygon, longitude: number, latitude: number): boolean {
  if (!ringContains(polygon[0], longitude, latitude)) return false;
  return polygon.slice(1).every((hole) => !ringContains(hole, longitude, latitude));
}

function toMeters(
  longitude: number,
  latitude: number,
  originLongitude: number,
  originLatitude: number,
): [number, number] {
  const latScale = (Math.PI / 180) * EARTH_RADIUS_METERS;
  const lonScale =
    latScale * Math.cos((originLatitude * Math.PI) / 180);
  return [
    (longitude - originLongitude) * lonScale,
    (latitude - originLatitude) * latScale,
  ];
}

function distanceToSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (-ax * dx + -ay * dy) / lengthSquared));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function distanceToRing(
  ring: Ring,
  longitude: number,
  latitude: number,
): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [ax, ay] = toMeters(ring[i][0], ring[i][1], longitude, latitude);
    const [bx, by] = toMeters(ring[i + 1][0], ring[i + 1][1], longitude, latitude);
    best = Math.min(best, distanceToSegment(ax, ay, bx, by));
  }
  return best;
}

export function distanceToLines(
  longitude: number,
  latitude: number,
  lines: number[][][],
): number {
  let best = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i += 1) {
      const [ax, ay] = toMeters(line[i][0], line[i][1], longitude, latitude);
      const [bx, by] = toMeters(line[i + 1][0], line[i + 1][1], longitude, latitude);
      best = Math.min(best, distanceToSegment(ax, ay, bx, by));
    }
  }
  return best;
}

export function distanceToGeometry(
  longitude: number,
  latitude: number,
  geometry: Geometry,
): number {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  let best = Number.POSITIVE_INFINITY;
  for (const polygon of polygons) {
    if (polygonContains(polygon, longitude, latitude)) return 0;
    for (const ring of polygon) {
      best = Math.min(best, distanceToRing(ring, longitude, latitude));
    }
  }
  return best;
}
