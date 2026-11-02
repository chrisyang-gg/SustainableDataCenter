import assert from "node:assert/strict";
import test from "node:test";
import { facilities } from "../data/facilities.ts";
import { floodDetail } from "./geology.ts";
import {
  getOrdinance,
  getPlace,
  parsePin,
  places,
  statusLabel,
} from "./place-directory.ts";
import {
  facilitiesInPlace,
  placeAtPoint,
  placeContainsPoint,
  placesAtPoint,
} from "./places.ts";

test("the county is split into Pittsburgh neighborhoods and other municipalities", () => {
  const neighborhoods = places.filter((place) => place.kind === "neighborhood");
  const municipalities = places.filter((place) => place.kind === "municipality");
  assert.equal(neighborhoods.length, 90);
  assert.equal(municipalities.length, 129);
  assert.equal(
    places.some((place) => place.slug === "pittsburgh"),
    false,
  );
  assert.equal(new Set(places.map((place) => place.slug)).size, places.length);
  for (const place of places) {
    assert.ok(getOrdinance(place.ordinanceKey));
    assert.equal(getPlace(place.slug)?.name, place.name);
  }
});

test("known projects land in the governing place", () => {
  const expectPlace = (slug: string, placeSlug: string) => {
    const facility = facilities.find((item) => item.slug === slug);
    assert.ok(facility);
    const place = placeAtPoint(facility.longitude, facility.latitude);
    assert.equal(place?.slug, placeSlug);
    assert.ok(
      facilitiesInPlace(placeSlug).some((item) => item.slug === slug),
    );
  };
  expectPlace("dynamo-springdale", "springdale-borough");
  expectPlace("henderson-road-data-center", "elizabeth-township");
  expectPlace("sei-allegheny", "findlay-township");
  expectPlace("mckees-rocks-industrial-site-data-center", "stowe-township");
  expectPlace("365-pittsburgh", "pittsburgh-allegheny-center");
});

test("every facility pin falls inside one mapped place", () => {
  for (const facility of facilities) {
    const hits = placesAtPoint(facility.longitude, facility.latitude);
    assert.equal(hits.length, 1, facility.slug);
  }
});

test("ordinance status stays attached to the government that writes zoning", () => {
  assert.equal(getOrdinance("Findlay Township").status, "adopted");
  assert.equal(getOrdinance("Stowe Township").status, "adopted");
  assert.equal(getOrdinance("Franklin Park Borough").status, "adopted");
  assert.equal(getOrdinance("Pittsburgh City").status, "none");
  assert.equal(getOrdinance("Springdale Borough").status, "none");
  assert.equal(getOrdinance("Elizabeth Township").status, "none");
  assert.equal(
    getPlace("pittsburgh-allegheny-center")?.ordinanceKey,
    "Pittsburgh City",
  );
  assert.equal(statusLabel("adopted"), "Adopted ordinance");
  assert.equal(statusLabel("none"), "No data-center ordinance");
});

test("representative points stay inside their areas", () => {
  for (const place of places) {
    assert.equal(
      placeContainsPoint(place.slug, place.centroid[0], place.centroid[1]),
      true,
      place.slug,
    );
  }
});

test("pin text and flood wording", () => {
  assert.deepEqual(parsePin("-79.99000,40.44000"), {
    longitude: -79.99,
    latitude: 40.44,
  });
  assert.equal(parsePin("nope"), null);
  assert.equal(parsePin(null), null);
  assert.equal(
    floodDetail("AREA OF MINIMAL FLOOD HAZARD"),
    "Area of minimal flood hazard",
  );
  assert.equal(floodDetail("  "), null);
});
