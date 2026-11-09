import assert from "node:assert/strict";
import test from "node:test";
import { interiorPoint, parcelCandidates, parcelWhere } from "./parcel.ts";

test("parcel IDs accept the PIN and the map-block-lot", () => {
  assert.deepEqual(parcelCandidates("0364N00065000000"), {
    pins: ["0364N00065000000"],
    lots: [],
  });
  assert.deepEqual(parcelCandidates("0364-N-00065-0000-00"), {
    pins: ["0364N00065000000"],
    lots: ["0364-N-00065-0000-00", "364-N-65"],
  });
  assert.deepEqual(parcelCandidates("364 n 65"), {
    pins: [],
    lots: ["364-N-65"],
  });
  assert.equal(parcelCandidates(""), null);
  assert.equal(parcelCandidates("364-N-65'; drop table"), null);
  const where = parcelWhere({
    pins: ["0364N00065000000"],
    lots: ["364-N-65"],
  });
  assert.equal(where, "PIN='0364N00065000000' OR MAPBLOCKLOT='364-N-65'");
});

test("an interior point stays inside the parcel ring", () => {
  const point = interiorPoint({
    type: "Polygon",
    coordinates: [
      [
        [-80.095, 40.3955],
        [-80.0951, 40.3959],
        [-80.0949, 40.3959],
        [-80.0949, 40.3955],
        [-80.095, 40.3955],
      ],
    ],
  });
  assert.ok(point);
  assert.ok(point.longitude < -80.0949 && point.longitude > -80.0951);
  assert.ok(point.latitude > 40.3955 && point.latitude < 40.3959);
});
