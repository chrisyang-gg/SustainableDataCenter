import assert from "node:assert/strict";
import test from "node:test";
import { complianceAtPin, violationVerdict } from "./compliance.ts";

const quiet = {
  floodZones: [],
  floodChecked: true,
  units: [],
  geologyChecked: true,
  noiseLdnDba: 40,
  no2Micrograms: 10,
};

test("a floodway stops the site under the floodplain rule", () => {
  const rows = complianceAtPin({
    ...quiet,
    floodZones: [{ code: "AE", detail: "FLOODWAY" }],
  });
  const flood = rows.find((row) => row.id === "nfip");
  const security = rows.find((row) => row.id === "pe-23");
  const tia = rows.find((row) => row.id === "tia-942");
  assert.equal(flood?.mark, "violation");
  assert.match(flood?.finding ?? "", /60\.3\(d\)\(3\)/);
  assert.equal(security?.mark, "gap");
  assert.equal(tia?.mark, "aside");
  assert.match(tia?.finding ?? "", /not claimed/);
  assert.match(violationVerdict(rows), /Potential violation/);
});

test("a 1% floodplain is a design condition, and a quiet pin is not a certification", () => {
  const floodplain = complianceAtPin({
    ...quiet,
    floodZones: [{ code: "AE", detail: null }],
  });
  assert.equal(floodplain.find((row) => row.id === "nfip")?.mark, "violation");

  const clear = complianceAtPin(quiet);
  assert.equal(clear.find((row) => row.id === "nfip")?.mark, "clear");
  assert.equal(clear.find((row) => row.id === "pe-23")?.mark, "clear");
  assert.match(clear.find((row) => row.id === "pe-23")?.finding ?? "", /not an authorization/);
  assert.equal(clear.find((row) => row.id === "customer")?.mark, "aside");
});

test("a missed flood service is not described as a clear site", () => {
  const rows = complianceAtPin({ ...quiet, floodChecked: false });
  assert.equal(rows.find((row) => row.id === "nfip")?.mark, "unchecked");
  assert.equal(rows.find((row) => row.id === "tia-942")?.mark, "aside");
  assert.match(rows.find((row) => row.id === "tia-942")?.finding ?? "", /did not respond/);
  assert.equal(rows.find((row) => row.id === "pe-23")?.mark, "unchecked");
  assert.doesNotMatch(violationVerdict(rows), /No potential regulatory violation/);
});

test("a landslide deposit has to be answered in the location plan", () => {
  const rows = complianceAtPin({
    ...quiet,
    units: [
      {
        name: "Landslide deposits",
        age: "",
        lithology: "",
        description: "Colluvium",
      },
    ],
  });
  const security = rows.find((row) => row.id === "pe-23");
  assert.equal(security?.mark, "gap");
  assert.match(security?.finding ?? "", /landslide/);
  assert.equal(rows.find((row) => row.id === "nfip")?.mark, "clear");
  assert.match(violationVerdict(rows), /not a violation by itself/);
});

test("a screen above a published level is an exceedance, and a quiet screen is not", () => {
  const loud = complianceAtPin({ ...quiet, noiseLdnDba: 92, no2Micrograms: 52_660 });
  assert.equal(loud.find((row) => row.id === "noise")?.mark, "exceedance");
  assert.equal(loud.find((row) => row.id === "air")?.mark, "exceedance");
  assert.match(violationVerdict(loud), /No potential regulatory violation/);
  assert.match(violationVerdict(loud), /Potential exceedance/);

  const calm = complianceAtPin(quiet);
  assert.equal(calm.find((row) => row.id === "noise")?.mark, "clear");
  assert.equal(calm.find((row) => row.id === "air")?.mark, "clear");
  assert.match(violationVerdict(calm), /^No potential regulatory violation/);
});
