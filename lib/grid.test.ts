import assert from "node:assert/strict";
import test from "node:test";
import { closestInServiceLine, describeTransmission } from "./grid.ts";

test("an out-of-service line does not hide the in-service line", () => {
  const line = closestInServiceLine(-80, 40, [
    {
      properties: { STATUS: "NOT IN SERVICE", VOLTAGE: 500, OWNER: "FAR" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-80.01, 40],
          [-79.99, 40],
        ],
      },
    },
    {
      properties: { STATUS: "IN SERVICE", VOLTAGE: 138, OWNER: "DUQUESNE LIGHT CO" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-80.01, 40.01],
          [-79.99, 40.01],
        ],
      },
    },
  ]);
  assert.equal(line?.voltageKv, 138);
  assert.equal(line?.owner, "DUQUESNE LIGHT CO");
  assert.ok((line?.meters ?? 0) > 1000);
  const text = describeTransmission({ status: "found", line: line! });
  assert.match(text, /138 kV, DUQUESNE LIGHT CO/);
  assert.match(text, /not the 15 kV circuit/);
});
