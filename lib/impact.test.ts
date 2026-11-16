import assert from "node:assert/strict";
import test from "node:test";
import { distanceToGeometry, distanceToLines } from "./distance.ts";
import { typicalDischargeCfs } from "./water.ts";
import {
  CELL_SOUND_POWER_DBA,
  continuousLdn,
  coolingCells,
  EPA_OUTDOOR_LDN_DBA,
  FEEDER_PEAK_MVA,
  isLoadMw,
  outdoorLevelDba,
  peopleImpact,
  plumeMicrograms,
  plumePeakMeters,
  plumeScreenMeters,
  soundPowerDba,
  streamflowShare,
  withdrawalGallonsPerDay,
} from "./impact.ts";

test("ten equal cooling cells add 10 decibels, and distance follows ISO 9613-2", () => {
  assert.equal(coolingCells(25), 10);
  assert.equal(soundPowerDba(10), CELL_SOUND_POWER_DBA + 10);
  const meters = 140 * 0.3048;
  const level = outdoorLevelDba(118, meters);
  const divergence = 20 * Math.log10(meters) + 11;
  assert.ok(Math.abs(level - (118 - divergence - 0.002 * meters)) < 1e-9);
  assert.ok(level > 70 && level < 76);
  const ldn = continuousLdn(level);
  assert.ok(ldn - level > 6 && ldn - level < 7);
  assert.equal(EPA_OUTDOOR_LDN_DBA, 55);
});

test("a full-load generator hour is stronger near homes than far away", () => {
  const near = plumeMicrograms(20, 200);
  const far = plumeMicrograms(20, 2000);
  assert.ok(near > far);
  assert.ok(near > 0);
});

test("a home beside the stack uses the buoyant ground-level peak", () => {
  assert.equal(plumePeakMeters(), 25);
  assert.equal(plumeScreenMeters(4), 25);
  const beside = peopleImpact({
    megawatts: 100,
    homes: { meters: 4, onBuilding: false },
    streamflowCfs: null,
    floodZones: [],
  });
  assert.equal(beside.receiverMeters, 4);
  assert.ok((beside.plumeMeters ?? 0) > 400);
  assert.ok((beside.no2Micrograms ?? 0) > 1_000);
  assert.ok((beside.no2Micrograms ?? 0) < 10_000);
  assert.ok((beside.pm10Micrograms ?? 0) > 0);
  const past = peopleImpact({
    megawatts: 100,
    homes: { meters: 4000, onBuilding: false },
    streamflowCfs: null,
    floodZones: [],
  });
  assert.equal(past.plumeMeters, 4000);
  assert.ok((past.no2Micrograms ?? 0) < (beside.no2Micrograms ?? 0));
});

test("water is a share of streamflow and load is a multiple of a neighborhood feeder", () => {
  const gallons = withdrawalGallonsPerDay(25);
  assert.ok(gallons > 10_000);
  const share = streamflowShare(gallons, 10_000);
  assert.ok(share < 0.01);
  const impact = peopleImpact({
    megawatts: 25,
    homes: { meters: 1609.344, onBuilding: false },
    streamflowCfs: 10_000,
    floodZones: [{ code: "AE", detail: null }],
  });
  assert.equal(impact.feederMultiple, 25 / FEEDER_PEAK_MVA);
  assert.ok(impact.noiseLeqDba !== null && impact.noiseLeqDba < impact.soundPowerDba);
  assert.equal(impact.streamflowShare, share);
  assert.match(impact.floodNote ?? "", /Zone AE/);
  assert.equal(isLoadMw(5), true);
  assert.equal(isLoadMw(7), false);
});

test("a pin on a home uses the 15 meter floor, and a point inside a ring is zero miles away", () => {
  const onHome = peopleImpact({
    megawatts: 25,
    homes: { meters: 0, onBuilding: true },
    streamflowCfs: null,
    floodZones: [],
  });
  assert.equal(onHome.receiverMeters, 15);
  assert.equal(onHome.streamflowShare, null);
  const ring = [
    [-80, 40],
    [-79.99, 40],
    [-79.99, 40.01],
    [-80, 40.01],
    [-80, 40],
  ];
  assert.equal(
    distanceToGeometry(-79.995, 40.005, { type: "Polygon", coordinates: [ring] }),
    0,
  );
  const outside = distanceToGeometry(-80.01, 40.005, {
    type: "Polygon",
    coordinates: [ring],
  });
  assert.ok(outside > 500 && outside < 1200);
});

test("a transmission line through the pin is zero meters, and one north is about a kilometer", () => {
  assert.equal(
    distanceToLines(-80, 40, [
      [
        [-80.01, 40],
        [-79.99, 40],
      ],
    ]),
    0,
  );
  const north = distanceToLines(-80, 40, [
    [
      [-80.01, 40.01],
      [-79.99, 40.01],
    ],
  ]);
  assert.ok(north > 1000 && north < 1200);
});

test("a missing live discharge can fall back to the long-term day", () => {
  const rdb = [
    "agency_cd\tsite_no\tparameter_cd\tts_id\tloc_web_ds\tmonth_nu\tday_nu\tbegin_yr\tend_yr\tcount_nu\tmean_va",
    "USGS\t1\t00060\t1\t\t11\t8\t2007\t2014\t8\t40",
    "USGS\t1\t00060\t1\t\t11\t9\t2007\t2014\t8\t80",
  ].join("\n");
  assert.equal(typicalDischargeCfs(rdb, 11, 8), 40);
  assert.equal(typicalDischargeCfs(rdb, 1, 1), 60);
});
