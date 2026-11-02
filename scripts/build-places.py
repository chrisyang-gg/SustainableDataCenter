#!/usr/bin/env python3
"""Build place boundaries and the municipal ordinance index.

Neighborhood polygons are the City of Pittsburgh neighborhoods published by
the Western Pennsylvania Regional Data Center. The other areas are Allegheny
County municipal boundaries from the county GIS portal, also via WPRDC.
Pittsburgh's municipal polygon is omitted because the neighborhoods replace it.

Ordinance rows come from the Pennsylvania Data Center Ordinance Project's
municipal table. Name aliases cover the labels that differ between that table
and the county GIS.
"""

from __future__ import annotations

import csv
import json
import math
import urllib.request
from pathlib import Path

from pyproj import Transformer

# County municipal boundaries are published in Pennsylvania State Plane South (feet).
TO_WGS84 = Transformer.from_crs("EPSG:2272", "EPSG:4326", always_xy=True)

ROOT = Path(__file__).resolve().parents[1]
OUT_GEO = ROOT / "data" / "places.json"
OUT_INDEX = ROOT / "data" / "place-index.json"
OUT_ORDINANCES = ROOT / "data" / "ordinances.json"

NEIGHBORHOODS_URL = (
    "https://data.wprdc.org/dataset/e672f13d-71c4-4a66-8f38-710e75ed80a4/"
    "resource/4af8e160-57e9-4ebf-a501-76ca1b42fc99/download/"
    "pittsburgh-neighborhoods.geojson"
)
MUNICIPALITIES_URL = (
    "https://data.wprdc.org/dataset/2fa577d6-1a6b-46a8-8165-27fecac1dee5/"
    "resource/b0cb0249-d1ba-45b7-9918-dc86fa8af04c/download/data.geojson"
)
ORDINANCE_URL = (
    "https://padatacenterordinances.org/downloads/"
    "pa-data-center-ordinances-municipalities.csv"
)

# County GIS label -> ordinance table municipality name.
ALIASES = {
    "Bethel Park Municipality": "Bethel Park Borough",
    "Clairton": "Clairton City",
    "Duquesne": "Duquesne City",
    "McKeesport": "McKeesport City",
    "Monroeville Municipality": "Monroeville Borough",
    "Mount Lebanon Township": "Mt. Lebanon Township",
    "Mount Oliver Borough": "Mt. Oliver Borough",
    "O Hara Township": "Ohara Township",
    "Penn Hills Municipality": "Penn Hills Township",
    "Pittsburgh": "Pittsburgh City",
    "Upper St. Clair Municipality": "Upper St. Clair Township",
}

MIN_SEPARATION = 0.00018


def fetch(url: str):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "allegheny-data-centers/0.1 (local place build)"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def fetch_json(url: str):
    return json.loads(fetch(url))


def fetch_text(url: str) -> str:
    return fetch(url).decode("utf-8-sig")


def slugify(value: str) -> str:
    cleaned = value.lower().replace("'", "").replace(".", "")
    out = []
    previous_dash = False
    for char in cleaned:
        if "a" <= char <= "z" or "0" <= char <= "9":
            out.append(char)
            previous_dash = False
        elif not previous_dash:
            out.append("-")
            previous_dash = True
    return "".join(out).strip("-")


def round_point(point):
    return [round(point[0], 5), round(point[1], 5)]


def simplify_ring(ring):
    if len(ring) < 4:
        return [round_point(point) for point in ring]
    kept = [ring[0]]
    for point in ring[1:-1]:
        previous = kept[-1]
        if (
            abs(point[0] - previous[0]) + abs(point[1] - previous[1])
            >= MIN_SEPARATION
        ):
            kept.append(point)
    if len(kept) < 3:
        step = max(1, len(ring) // 12)
        kept = list(ring[:-1:step])[: max(3, len(ring) // step)]
    rounded = [round_point(point) for point in kept]
    if rounded[0] != rounded[-1]:
        rounded.append(rounded[0])
    return rounded


def reproject_geometry(geometry):
    def convert(coords):
        if isinstance(coords[0], (int, float)):
            longitude, latitude = TO_WGS84.transform(coords[0], coords[1])
            return [longitude, latitude]
        return [convert(part) for part in coords]

    return {"type": geometry["type"], "coordinates": convert(geometry["coordinates"])}


def simplify_geometry(geometry):
    if geometry["type"] == "Polygon":
        return {
            "type": "Polygon",
            "coordinates": [simplify_ring(ring) for ring in geometry["coordinates"]],
        }
    if geometry["type"] == "MultiPolygon":
        return {
            "type": "MultiPolygon",
            "coordinates": [
                [simplify_ring(ring) for ring in polygon]
                for polygon in geometry["coordinates"]
            ],
        }
    raise SystemExit(f"Unexpected geometry {geometry['type']}")


def iter_rings(geometry):
    if geometry["type"] == "Polygon":
        yield from geometry["coordinates"]
    else:
        for polygon in geometry["coordinates"]:
            yield from polygon


def iter_polygons(geometry):
    if geometry["type"] == "Polygon":
        yield geometry["coordinates"]
    else:
        yield from geometry["coordinates"]


def ring_contains(ring, x, y) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y):
            slope = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < slope:
                inside = not inside
        j = i
    return inside


def polygon_contains(polygon, x, y) -> bool:
    if not ring_contains(polygon[0], x, y):
        return False
    return all(not ring_contains(hole, x, y) for hole in polygon[1:])


def geometry_contains(geometry, x, y) -> bool:
    return any(polygon_contains(polygon, x, y) for polygon in iter_polygons(geometry))


def bounds_of(geometry):
    xs = []
    ys = []
    for ring in iter_rings(geometry):
        for point in ring:
            xs.append(point[0])
            ys.append(point[1])
    return [min(xs), min(ys), max(xs), max(ys)]


def interior_point(geometry):
    ring = next(iter_rings(geometry))
    unique = ring[:-1] if ring[0] == ring[-1] else ring
    cx = sum(point[0] for point in unique) / len(unique)
    cy = sum(point[1] for point in unique) / len(unique)
    if geometry_contains(geometry, cx, cy):
        return [round(cx, 5), round(cy, 5)]
    west, south, east, north = bounds_of(geometry)
    best = None
    best_distance = None
    for row in range(1, 12):
        for column in range(1, 12):
            x = west + (east - west) * column / 12
            y = south + (north - south) * row / 12
            if not geometry_contains(geometry, x, y):
                continue
            distance = math.hypot(x - cx, y - cy)
            if best_distance is None or distance < best_distance:
                best = [round(x, 5), round(y, 5)]
                best_distance = distance
    if best is None:
        return [round(cx, 5), round(cy, 5)]
    return best


def status_code(value: str) -> str:
    if value == "Adopted Ordinance":
        return "adopted"
    if value == "Proposed Ordinance":
        return "proposed"
    if value == "No Ordinance":
        return "none"
    raise SystemExit(f"Unexpected ordinance status {value}")


def main():
    neighborhoods = fetch_json(NEIGHBORHOODS_URL)
    municipalities = fetch_json(MUNICIPALITIES_URL)
    ordinance_rows = [
        row
        for row in csv.DictReader(fetch_text(ORDINANCE_URL).splitlines())
        if row["County"] == "Allegheny"
    ]
    by_name = {row["Municipality"]: row for row in ordinance_rows}

    features = []
    index = []
    seen = set()

    for feature in neighborhoods["features"]:
        name = feature["properties"]["hood"].strip()
        slug = f"pittsburgh-{slugify(name)}"
        if slug in seen:
            raise SystemExit(f"Duplicate slug {slug}")
        seen.add(slug)
        geometry = simplify_geometry(feature["geometry"])
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "slug": slug,
                    "name": name,
                    "kind": "neighborhood",
                },
                "geometry": geometry,
            }
        )
        index.append(
            {
                "slug": slug,
                "name": name,
                "kind": "neighborhood",
                "municipality": "Pittsburgh",
                "ordinanceKey": "Pittsburgh City",
                "centroid": interior_point(geometry),
                "bounds": [round(value, 5) for value in bounds_of(geometry)],
            }
        )

    for feature in municipalities["features"]:
        label = feature["properties"]["LABEL"].strip()
        if label == "Pittsburgh":
            continue
        slug = slugify(label)
        if slug in seen:
            raise SystemExit(f"Duplicate slug {slug}")
        seen.add(slug)
        ordinance_key = ALIASES.get(label, label)
        if ordinance_key not in by_name:
            raise SystemExit(f"No ordinance row for {label} ({ordinance_key})")
        geometry = simplify_geometry(reproject_geometry(feature["geometry"]))
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "slug": slug,
                    "name": label,
                    "kind": "municipality",
                },
                "geometry": geometry,
            }
        )
        index.append(
            {
                "slug": slug,
                "name": label,
                "kind": "municipality",
                "municipality": label,
                "ordinanceKey": ordinance_key,
                "centroid": interior_point(geometry),
                "bounds": [round(value, 5) for value in bounds_of(geometry)],
            }
        )

    used_keys = {place["ordinanceKey"] for place in index}
    missing = sorted(set(by_name) - used_keys)
    if missing:
        raise SystemExit(f"Ordinance rows not matched to a place: {missing}")

    ordinances = []
    for row in sorted(ordinance_rows, key=lambda item: item["Municipality"]):
        ordinances.append(
            {
                "municipality": row["Municipality"],
                "status": status_code(row["Status"]),
                "whereAllowed": row["Where Data Centers Are Allowed"].strip(),
                "verified": "2026-10-28",
                "sourceHref": row["Primary Source"].strip(),
                "trackerHref": row["Tracker Page"].strip(),
            }
        )

    index.sort(key=lambda place: (place["kind"] != "neighborhood", place["name"]))
    collection = {"type": "FeatureCollection", "features": features}
    OUT_GEO.write_text(json.dumps(collection, separators=(",", ":")))
    OUT_INDEX.write_text(json.dumps(index, indent=2) + "\n")
    OUT_ORDINANCES.write_text(json.dumps(ordinances, indent=2) + "\n")
    print(
        f"places {len(features)} neighborhoods "
        f"{sum(1 for place in index if place['kind'] == 'neighborhood')} "
        f"geo {OUT_GEO.stat().st_size} bytes"
    )


if __name__ == "__main__":
    main()
