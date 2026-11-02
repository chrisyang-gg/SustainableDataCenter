import ordinancesJson from "@/data/ordinances.json";
import placesJson from "@/data/place-index.json";

export type PlaceKind = "neighborhood" | "municipality";

export type OrdinanceStatus = "adopted" | "proposed" | "none";

export type PlaceSummary = {
  slug: string;
  name: string;
  kind: PlaceKind;
  municipality: string;
  ordinanceKey: string;
  centroid: [number, number];
  bounds: [number, number, number, number];
};

export type MunicipalOrdinance = {
  municipality: string;
  status: OrdinanceStatus;
  whereAllowed: string;
  verified: string;
  sourceHref: string;
  trackerHref: string;
};

export const places = placesJson as PlaceSummary[];

const ordinances = ordinancesJson as MunicipalOrdinance[];

const placesBySlug = new Map(places.map((place) => [place.slug, place]));
const ordinancesByName = new Map(
  ordinances.map((ordinance) => [ordinance.municipality, ordinance]),
);

export const ORDINANCE_AS_OF = "October 28, 2026";

export function getPlace(slug: string): PlaceSummary | undefined {
  return placesBySlug.get(slug);
}

export function getOrdinance(ordinanceKey: string): MunicipalOrdinance {
  const ordinance = ordinancesByName.get(ordinanceKey);
  if (!ordinance) {
    throw new Error(`No ordinance row for ${ordinanceKey}`);
  }
  return ordinance;
}

export function statusLabel(status: OrdinanceStatus): string {
  if (status === "adopted") return "Adopted ordinance";
  if (status === "proposed") return "Proposed ordinance";
  return "No data-center ordinance";
}

export function parsePin(
  value: string | null,
): { longitude: number; latitude: number } | null {
  if (!value) return null;
  const [longitudeText, latitudeText] = value.split(",");
  const longitude = Number(longitudeText);
  const latitude = Number(latitudeText);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  if (latitude < 40 || latitude > 41 || longitude < -81 || longitude > -79) {
    return null;
  }
  return { longitude, latitude };
}
