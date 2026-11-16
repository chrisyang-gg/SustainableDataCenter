import assert from "node:assert/strict";
import test from "node:test";
import { withdrawalGallonsPerDay } from "./impact.ts";
import {
  COUNTY_SCALE,
  DUQUESNE_SUMMER_PEAK_MW,
  LARGE_FACILITY,
  PA_RESIDENTIAL_CENTS_PER_KWH,
  PWSA_DOLLARS_PER_THOUSAND_GALLONS,
  PWSA_GALLONS_PER_DAY,
  simulateDataCenter,
  SMALL_FACILITY,
} from "./simulator.ts";

test("the county-scale cooling water matches the existing LBNL screen", () => {
  const impact = simulateDataCenter(COUNTY_SCALE);
  const expected = withdrawalGallonsPerDay(25);
  assert.ok(Math.abs(impact.gallonsPerDay - expected) / expected < 0.01);
  assert.ok(impact.noiseLeqDba !== null && impact.noiseLeqDba > 0);
  assert.ok((impact.noiseLdnDba ?? 0) > (impact.noiseLeqDba ?? 0));
});

test("a small air-cooled facility stays under a large evaporative one", () => {
  const small = simulateDataCenter(SMALL_FACILITY);
  const large = simulateDataCenter(LARGE_FACILITY);
  assert.equal(small.no2Micrograms, 0);
  assert.equal(small.waterDollarsPerThousandGallons, 0);
  assert.ok(small.electricityCentsPerKwh > 0);
  assert.ok(large.noiseLeqDba !== null && small.noiseLeqDba !== null);
  assert.ok(large.noiseLeqDba > small.noiseLeqDba);
  assert.ok(large.no2Micrograms > small.no2Micrograms);
  assert.ok(large.no2Micrograms > 1_000 && large.no2Micrograms < 10_000);
  assert.ok(large.stacks > 1);
  assert.ok(Math.abs(large.electricityCentsPerKwh - PA_RESIDENTIAL_CENTS_PER_KWH * (100 / DUQUESNE_SUMMER_PEAK_MW)) < 1e-9);
  assert.ok(
    Math.abs(
      large.waterDollarsPerThousandGallons -
        PWSA_DOLLARS_PER_THOUSAND_GALLONS * (large.gallonsPerDay / PWSA_GALLONS_PER_DAY),
    ) < 1e-9,
  );
  assert.ok(large.electricityCentsPerKwh > small.electricityCentsPerKwh);
  assert.ok(large.waterDollarsPerThousandGallons > small.waterDollarsPerThousandGallons);
  assert.match(large.electricityAssumption, /EIA Pennsylvania price/);
  assert.match(large.electricityAssumption, /Duquesne Light/);
  assert.doesNotMatch(large.electricityAssumption, /average bill/);
  assert.match(large.waterAssumption, /Pittsburgh Water/);
  assert.doesNotMatch(large.waterAssumption, /account lookup/);
  assert.match(large.noiseNote, /ISO 9613-2/);
});

test("daytime-only operation skips the night noise penalty", () => {
  const day = simulateDataCenter({ ...COUNTY_SCALE, runsAllNight: false });
  assert.equal(day.noiseLdnDba, day.noiseLeqDba);
});
