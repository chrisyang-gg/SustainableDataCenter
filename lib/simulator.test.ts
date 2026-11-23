import assert from "node:assert/strict";
import test from "node:test";
import { COOLING_SYSTEMS, DATA_CENTER_PROFILES, GRID_WATER_L_PER_FACILITY_KWH, type DataCenterProfileId } from "./lbnl-simulator.ts";
import {
  applyDataCenterProfile, DEFAULT_SIMULATOR_INPUT, DUQUESNE_SUMMER_PEAK_MW,
  PA_RESIDENTIAL_CENTS_PER_KWH, PWSA_DOLLARS_PER_THOUSAND_GALLONS,
  PWSA_GALLONS_PER_DAY, simulateDataCenter, type SimulatorInput,
} from "./simulator.ts";

function close(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) <= Math.max(1e-9, Math.abs(expected) * 1e-12), `${actual} != ${expected}`);
}

test("four categories use Figure 4.5 medians and Table 4.3 UPS ranges", () => {
  assert.deepEqual(Object.values(DATA_CENTER_PROFILES).map(({ pue, wue, upsMin, upsMax }) => [pue, wue, upsMin, upsMax]), [
    [1.91, 0.32, 77, 85], [1.68, 0.67, 80, 94], [1.22, 0.32, 90, 99], [1.14, 0.61, 90, 99],
  ]);
  const custom: SimulatorInput = { ...DEFAULT_SIMULATOR_INPUT, facilityMegawatts: 80, hoursPerYear: 4000, cooling: "liquid-dry-cooler", pue: 1.5, siteWueLPerKwh: 0.12 };
  for (const profile of Object.keys(DATA_CENTER_PROFILES) as DataCenterProfileId[]) {
    const changed = applyDataCenterProfile(custom, profile);
    assert.deepEqual(changed, { ...custom, profile, pue: DATA_CENTER_PROFILES[profile].pue, siteWueLPerKwh: DATA_CENTER_PROFILES[profile].wue });
    assert.equal(custom.pue, 1.5, "applying a profile must not mutate the draft");
  }
});

test("one MW of IT gives equal annual IT energy across categories without double-counting UPS", () => {
  for (const profile of Object.keys(DATA_CENTER_PROFILES) as DataCenterProfileId[]) {
    const reference = DATA_CENTER_PROFILES[profile];
    const input = { ...applyDataCenterProfile(DEFAULT_SIMULATOR_INPUT, profile), facilityMegawatts: reference.pue };
    const impact = simulateDataCenter(input);
    close(impact.itMegawatts, 1);
    close(impact.itEnergyKwh, 8_760_000);
    close(impact.facilityEnergyKwh, 8_760_000 * reference.pue);
    close(impact.infrastructureEnergyKwh + impact.itEnergyKwh, impact.facilityEnergyKwh);
    close(impact.infrastructureShare, 1 - 1 / reference.pue);
    close(impact.directWaterLitersPerYear, 8_760_000 * reference.wue);
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

test("nine cooling designs retain explicit PUE/WUE without inventing design coefficients", () => {
  assert.equal(COOLING_SYSTEMS.length, 9);
  assert.equal(new Set(COOLING_SYSTEMS.map(({ id }) => id)).size, 9);
  for (const { id } of COOLING_SYSTEMS) {
    const impact = simulateDataCenter({ ...DEFAULT_SIMULATOR_INPUT, cooling: id, pue: 1.31, siteWueLPerKwh: 0.18 });
    assert.equal(impact.configuration.cooling, id);
    assert.equal(impact.configuration.pue, 1.31);
    assert.equal(impact.configuration.siteWueLPerKwh, 0.18);
    assert.ok(impact.directWaterLitersPerYear > 0);
  }
  const dry = simulateDataCenter({ ...DEFAULT_SIMULATOR_INPUT, cooling: "air-cooled-chiller", siteWueLPerKwh: 0 });
  assert.equal(dry.directWaterLitersPerYear, 0);
  assert.equal(dry.waterDollarsPerThousandGallons, 0);
  assert.ok(dry.indirectWaterLitersPerYear > 0, "zero site water retains electricity-associated water");
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
