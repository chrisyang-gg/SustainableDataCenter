import assert from "node:assert/strict";
import test from "node:test";
import { COOLING_MEDIANS, coolingMedian, coolingMedians, DATA_CENTER_PROFILES, GRID_WATER_L_PER_FACILITY_KWH, type DataCenterProfileId } from "./lbnl-simulator.ts";
import {
  applyCoolingSystem, applyDataCenterProfile, DEFAULT_SIMULATOR_INPUT, DUQUESNE_SUMMER_PEAK_MW,
  PA_RESIDENTIAL_CENTS_PER_KWH, PWSA_DOLLARS_PER_THOUSAND_GALLONS,
  PWSA_GALLONS_PER_DAY, simulateDataCenter, type SimulatorInput,
} from "./simulator.ts";

function close(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) <= Math.max(1e-9, Math.abs(expected) * 1e-12), `${actual} != ${expected}`);
}

test("profile transitions load supported cooling medians and preserve unrelated inputs", () => {
  const custom: SimulatorInput = { ...DEFAULT_SIMULATOR_INPUT, facilityMegawatts: 80, hoursPerYear: 4000, cooling: "liquid-dry-cooler", pue: 1.5, siteWueLPerKwh: 0.12 };
  for (const profile of Object.keys(DATA_CENTER_PROFILES) as DataCenterProfileId[]) {
    const changed = applyDataCenterProfile(custom, profile);
    const median = coolingMedian(profile, changed.cooling)!;
    assert.deepEqual(changed, { ...custom, profile, cooling: median.cooling, pue: median.pue, siteWueLPerKwh: median.wue });
    assert.equal(changed.cooling, profile === "smb" || profile === "sps" ? "water-cooled-chiller" : "liquid-dry-cooler");
    assert.equal(custom.pue, 1.5, "applying a profile must not mutate the draft");
  }
  // Same design, distinct Small/Midsize chart rows; not category-mixture values.
  const small = applyDataCenterProfile(DEFAULT_SIMULATOR_INPUT, "smb");
  assert.deepEqual([small.pue, small.siteWueLPerKwh], [1.70, 3.22]);
  const midsize = applyDataCenterProfile(small, "sps");
  assert.deepEqual([midsize.pue, midsize.siteWueLPerKwh], [1.52, 2.90]);
  const large = applyDataCenterProfile(midsize, "hyperscale");
  assert.equal(large.cooling, "airside-adiabatic");
  assert.deepEqual(applyDataCenterProfile(large, "ai"), { ...large, profile: "ai" });
});

test("one MW of IT gives equal annual IT energy across categories without double-counting UPS", () => {
  for (const profile of Object.keys(DATA_CENTER_PROFILES) as DataCenterProfileId[]) {
    const reference = DATA_CENTER_PROFILES[profile];
    const defaults = applyDataCenterProfile(DEFAULT_SIMULATOR_INPUT, profile);
    const input = { ...defaults, facilityMegawatts: defaults.pue };
    const impact = simulateDataCenter(input);
    close(impact.itMegawatts, 1);
    close(impact.itEnergyKwh, 8_760_000);
    close(impact.facilityEnergyKwh, 8_760_000 * defaults.pue);
    close(impact.infrastructureEnergyKwh + impact.itEnergyKwh, impact.facilityEnergyKwh);
    close(impact.infrastructureShare, 1 - 1 / defaults.pue);
    close(impact.directWaterLitersPerYear, 8_760_000 * defaults.siteWueLPerKwh);
    close(impact.indirectWaterLitersPerYear, impact.facilityEnergyKwh * 4.52);
    close(impact.totalWaterLitersPerYear, impact.directWaterLitersPerYear + impact.indirectWaterLitersPerYear);
    assert.deepEqual([impact.upsEfficiencyMin, impact.upsEfficiencyMax], [reference.upsMin, reference.upsMax]);
  }
});

test("water accounting uses IT energy on site and facility energy off site, with daily US-gallon conversion", () => {
  const impact = simulateDataCenter({ ...DEFAULT_SIMULATOR_INPUT, facilityMegawatts: 2, pue: 2, hoursPerYear: 1000, siteWueLPerKwh: 0.5 });
  assert.equal(GRID_WATER_L_PER_FACILITY_KWH, 4.52);
  close(impact.directWaterLitersPerYear, 500_000);
  close(impact.indirectWaterLitersPerYear, 9_040_000);
  close(impact.totalWaterLitersPerYear, 9_540_000);
  close(impact.gallonsPerDay, 500_000 / 3.785411784 / 365);
  const fewerHours = simulateDataCenter({ ...impact.configuration, hoursPerYear: 500 });
  close(fewerHours.totalWaterLitersPerYear, impact.totalWaterLitersPerYear / 2);
  const changedPue = simulateDataCenter({ ...impact.configuration, pue: 1 });
  close(changedPue.directWaterLitersPerYear, impact.directWaterLitersPerYear * 2);
  assert.equal(changedPue.indirectWaterLitersPerYear, impact.indirectWaterLitersPerYear);
});

test("all 17 chart rows are selectable, retain their water values, and allow explicit overrides", () => {
  assert.deepEqual(Object.values(COOLING_MEDIANS).map((rows) => rows.length), [3, 7, 7]);
  for (const profile of Object.keys(DATA_CENTER_PROFILES) as DataCenterProfileId[]) {
    for (const row of coolingMedians(profile)) {
      const selected = applyCoolingSystem(applyDataCenterProfile(DEFAULT_SIMULATOR_INPUT, profile), row.cooling);
      const impact = simulateDataCenter(selected);
      assert.deepEqual([impact.configuration.pue, impact.configuration.siteWueLPerKwh], [row.pue, row.wue], "chart medians must not be clamped away");
      close(impact.directWaterLitersPerYear, 25 / row.pue * 8_760_000 * row.wue);
      const custom = simulateDataCenter({ ...selected, pue: 1.31, siteWueLPerKwh: 0.18 });
      assert.equal(custom.configuration.pue, 1.31);
      assert.equal(custom.configuration.siteWueLPerKwh, 0.18);
      assert.match(custom.coolingLabel, /Custom PUE/);
    }
  }
  assert.throws(() => applyCoolingSystem(DEFAULT_SIMULATOR_INPUT, "liquid-dry-only"), /No Figure 4.4 median/);
  const large = applyDataCenterProfile(DEFAULT_SIMULATOR_INPUT, "ai");
  const dry = simulateDataCenter(applyCoolingSystem(large, "liquid-dry-only"));
  assert.equal(dry.directWaterLitersPerYear, 0);
  assert.equal(dry.waterDollarsPerThousandGallons, 0);
  assert.ok(dry.indirectWaterLitersPerYear > 0, "zero site water retains electricity-associated water");
  const assisted = simulateDataCenter(applyCoolingSystem(large, "liquid-dry-cooler"));
  assert.ok(assisted.directWaterLitersPerYear > dry.directWaterLitersPerYear);
});

test("changing cooling loads both medians and changes water/overhead at fixed facility MW", () => {
  const wet = simulateDataCenter(DEFAULT_SIMULATOR_INPUT);
  const dry = simulateDataCenter(applyCoolingSystem(DEFAULT_SIMULATOR_INPUT, "air-cooled-chiller"));
  assert.ok(dry.configuration.pue > wet.configuration.pue);
  assert.ok(dry.configuration.siteWueLPerKwh < wet.configuration.siteWueLPerKwh);
  assert.ok(dry.directWaterLitersPerYear < wet.directWaterLitersPerYear / 50);
  assert.ok(dry.infrastructureEnergyKwh > wet.infrastructureEnergyKwh);
  assert.equal(dry.facilityEnergyKwh, wet.facilityEnergyKwh);
  assert.equal(dry.indirectWaterLitersPerYear, wet.indirectWaterLitersPerYear);
  assert.ok(dry.waterDollarsPerThousandGallons < wet.waterDollarsPerThousandGallons);
  const edited = { ...DEFAULT_SIMULATOR_INPUT, pue: 2.2, siteWueLPerKwh: 4.5 };
  assert.deepEqual(applyCoolingSystem(edited, edited.cooling), DEFAULT_SIMULATOR_INPUT, "restore recovers the selected cooling medians");
});

test("run snapshots normalize invalid inputs; UPS comes only from the category", () => {
  const input = { ...DEFAULT_SIMULATOR_INPUT, profile: "invalid", cooling: "invalid", pue: 0, siteWueLPerKwh: -1, hoursPerYear: Infinity, coolingCells: 0, backupFraction: 0, upsEfficiencyMin: 1 };
  const impact = simulateDataCenter(input as unknown as SimulatorInput);
  assert.equal(impact.configuration.profile, "sps");
  assert.equal(impact.configuration.cooling, "water-cooled-chiller");
  assert.equal(impact.configuration.pue, 1);
  assert.equal(impact.configuration.hoursPerYear, 1);
  assert.equal(impact.configuration.siteWueLPerKwh, 0);
  assert.deepEqual([impact.upsEfficiencyMin, impact.upsEfficiencyMax], [80, 94]);
  assert.equal(impact.infrastructureEnergyKwh, 0);
  assert.equal(impact.noiseLeqDba, null);
  assert.equal(impact.no2Micrograms, 0);
  input.facilityMegawatts = 200;
  assert.equal(impact.configuration.facilityMegawatts, 25, "saved calculations must not change with the draft");
  for (const value of Object.values(impact)) if (typeof value === "number") assert.ok(Number.isFinite(value));
});

test("prices use facility electricity and direct water only; noise and diesel screen retain scale behavior", () => {
  const small = simulateDataCenter({ ...DEFAULT_SIMULATOR_INPUT, facilityMegawatts: 5, coolingCells: 2, backupFraction: 0 });
  const large = simulateDataCenter({ ...DEFAULT_SIMULATOR_INPUT, facilityMegawatts: 100, coolingCells: 40 });
  assert.equal(small.no2Micrograms, 0);
  assert.ok(large.noiseLeqDba !== null && small.noiseLeqDba !== null && large.noiseLeqDba > small.noiseLeqDba);
  assert.ok(large.no2Micrograms > 1_000 && large.no2Micrograms < 10_000);
  assert.ok(large.stacks > 1);
  close(large.electricityCentsPerKwh, PA_RESIDENTIAL_CENTS_PER_KWH * (100 / DUQUESNE_SUMMER_PEAK_MW));
  close(large.waterDollarsPerThousandGallons, PWSA_DOLLARS_PER_THOUSAND_GALLONS * (large.gallonsPerDay / PWSA_GALLONS_PER_DAY));
  assert.ok(large.waterDollarsPerThousandGallons > small.waterDollarsPerThousandGallons);
  assert.match(large.electricityAssumption, /app assumption/);
  assert.match(large.noiseNote, /ISO 9613-2/);
});

test("daytime-only operation skips the night noise penalty without changing water or energy", () => {
  const night = simulateDataCenter(DEFAULT_SIMULATOR_INPUT);
  const day = simulateDataCenter({ ...DEFAULT_SIMULATOR_INPUT, runsAllNight: false });
  assert.equal(day.noiseLdnDba, day.noiseLeqDba);
  assert.ok((night.noiseLdnDba ?? 0) > (night.noiseLeqDba ?? 0));
  assert.equal(day.facilityEnergyKwh, night.facilityEnergyKwh);
  assert.equal(day.totalWaterLitersPerYear, night.totalWaterLitersPerYear);
});
