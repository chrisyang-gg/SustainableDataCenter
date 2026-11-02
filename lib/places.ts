import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import placesGeo from "@/data/places.json";
import { facilities, type Facility } from "@/data/facilities";
import { getPlace, type PlaceSummary } from "@/lib/place-directory";

type PlaceGeometry = Polygon | MultiPolygon;

const features = (
  placesGeo as FeatureCollection<PlaceGeometry, { slug: string }>
).features;

const geometryBySlug = new Map(
  features.map((feature) => [feature.properties.slug, feature.geometry]),
);

function ringContains(ring: number[][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const crosses = yi > y !== yj > y;
    if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function polygonContains(polygon: number[][][], x: number, y: number): boolean {
  if (!ringContains(polygon[0], x, y)) return false;
  return polygon.slice(1).every((hole) => !ringContains(hole, x, y));
}

export function geometryContains(
  geometry: PlaceGeometry,
  longitude: number,
  latitude: number,
): boolean {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) =>
    polygonContains(polygon, longitude, latitude),
  );
}

export function placesAtPoint(
  longitude: number,
  latitude: number,
): PlaceSummary[] {
  return features.flatMap((feature) => {
    if (!geometryContains(feature.geometry, longitude, latitude)) return [];
    const place = getPlace(feature.properties.slug);
    return place ? [place] : [];
  });
}

export function placeAtPoint(
  longitude: number,
  latitude: number,
): PlaceSummary | undefined {
  return placesAtPoint(longitude, latitude)[0];
}

export function placeContainsPoint(
  slug: string,
  longitude: number,
  latitude: number,
): boolean {
  const geometry = geometryBySlug.get(slug);
  if (!geometry) return false;
  return geometryContains(geometry, longitude, latitude);
}

export function facilitiesInPlace(slug: string): Facility[] {
  const geometry = geometryBySlug.get(slug);
  if (!geometry) return [];
  return facilities.filter((facility) =>
    geometryContains(geometry, facility.longitude, facility.latitude),
  );
}

export function placeFeature(
  slug: string,
): Feature<PlaceGeometry, { slug: string }> | undefined {
  return features.find((feature) => feature.properties.slug === slug);
}
