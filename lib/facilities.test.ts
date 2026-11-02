import assert from "node:assert/strict";
import test from "node:test";
import { COUNTY_BOUNDS, facilities, getFacility } from "../data/facilities.ts";
import {
  filterFacilities,
  formatSubmitted,
  markerPosition,
} from "./facilities.ts";

test("every pin sits inside the Allegheny County bounds", () => {
  assert.equal(facilities.length, 22);
  for (const facility of facilities) {
    assert.ok(facility.latitude >= COUNTY_BOUNDS.south);
    assert.ok(facility.latitude <= COUNTY_BOUNDS.north);
    assert.ok(facility.longitude >= COUNTY_BOUNDS.west);
    assert.ok(facility.longitude <= COUNTY_BOUNDS.east);
  }
  assert.equal(
    facilities.some((facility) => facility.slug === "servaxnet-new-castle"),
    false,
  );
});

test("Dynamo Springdale carries the DEP permit file", () => {
  const facility = getFacility("dynamo-springdale");
  assert.ok(facility);
  assert.equal(facility.dep?.projectId, "10000019");
  assert.equal(facility.permits.length, 5);
  assert.equal(facility.capacity, "180–240 MW");
  assert.equal(facility.acres, "47 acres");
  assert.deepEqual(
    facility.permits.map((permit) => permit.status),
    ["Issued", "Issued", "Issued", "Not Yet Submitted", "Pending"],
  );
});

test("SEI Allegheny is an approximate pin with no applications", () => {
  const facility = getFacility("sei-allegheny");
  assert.ok(facility);
  assert.equal(facility.approximate, true);
  assert.equal(facility.permits.every((permit) => permit.status === "Not Yet Submitted"), true);
});

test("filters match name, company, and stage", () => {
  const proposed = filterFacilities(facilities, {
    query: "",
    stage: "proposed",
    municipality: "all",
  });
  assert.deepEqual(
    proposed.map((facility) => facility.slug),
    [
      "dynamo-springdale",
      "henderson-road-data-center",
      "sei-allegheny",
    ],
  );
  const dynamo = filterFacilities(facilities, {
    query: "allegheny dc property",
    stage: "all",
    municipality: "all",
  });
  assert.equal(dynamo.length, 1);
  assert.equal(dynamo[0]?.slug, "dynamo-springdale");
});

test("shared downtown coordinates are nudged apart", () => {
  const databank = getFacility("databank-pittsburgh");
  const expedient = getFacility("expedient-pittsburgh");
  assert.ok(databank && expedient);
  const a = markerPosition(databank);
  const b = markerPosition(expedient);
  assert.equal(a.nudged, true);
  assert.equal(b.nudged, true);
  assert.notEqual(a.latitude, b.latitude);
});

test("submitted dates from the DEP file format with a year", () => {
  assert.equal(formatSubmitted("12/8/25"), "Dec 8, 2025");
  assert.equal(formatSubmitted("8/24/26"), "Aug 24, 2026");
  assert.equal(formatSubmitted(""), "—");
});
