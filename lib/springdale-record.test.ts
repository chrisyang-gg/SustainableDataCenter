import assert from "node:assert/strict";
import test from "node:test";
import { SPRINGDALE_IMPACTS, SPRINGDALE_PARAMETERS } from "./springdale-record.ts";

test("Springdale uses published figures and leaves the rest unknown", () => {
  const byId = new Map(SPRINGDALE_PARAMETERS.map((line) => [line.id, line]));
  assert.equal(byId.get("load")?.value, "Unknown");
  assert.equal(byId.get("pue")?.value, "Unknown");
  assert.equal(byId.get("area")?.value, "47 acres");
  assert.equal(byId.get("cells")?.value, "Unknown");
  assert.equal(byId.get("exhaust")?.value, "Unknown");
  assert.match(byId.get("backup")?.value ?? "", /124 diesel generators/);
  assert.match(byId.get("water")?.value ?? "", /10,000 gallons/);
  assert.equal(byId.get("hours")?.value, "Unknown");
  assert.equal(byId.get("night")?.value, "Unknown");
  for (const impact of SPRINGDALE_IMPACTS) {
    assert.match(impact.value, /Unknown/);
  }
  const blob = JSON.stringify(SPRINGDALE_PARAMETERS);
  assert.doesNotMatch(blob, /"value": "240 MW"/);
  assert.doesNotMatch(blob, /"value": "1"/);
});
