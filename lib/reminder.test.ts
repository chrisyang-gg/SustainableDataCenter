import assert from "node:assert/strict";
import test from "node:test";
import { ordinanceReminder, pinReminder, reminderLabel } from "./reminder.ts";
import {
  describeChannel,
  describeStream,
  describeWell,
  milesBetween,
  parseNwisSites,
  searchBox,
} from "./water.ts";

test("ordinance colors follow the review wording", () => {
  assert.equal(ordinanceReminder("Not listed", "none").tone, "debated");
  assert.equal(
    ordinanceReminder("Not listed; unlisted uses prohibited", "none").tone,
    "no",
  );
  assert.equal(
    ordinanceReminder(
      "Not listed; unlisted uses are prohibited unless found similar to a listed use",
      "none",
    ).tone,
    "debated",
  );
  assert.equal(
    ordinanceReminder("Permitted by right in the C/I and I districts", "adopted").tone,
    "ok",
  );
  assert.equal(
    ordinanceReminder("Permitted in the G-1 General Industrial District", "adopted").tone,
    "ok",
  );
  assert.equal(
    ordinanceReminder(
      "Not listed; unlisted uses are permitted by right in the I-1 district",
      "none",
    ).tone,
    "ok",
  );
  assert.equal(
    ordinanceReminder("Conditional use in the LI and HI districts", "adopted").tone,
    "debated",
  );
  assert.equal(
    ordinanceReminder("Special exception in the R-2 Residential District", "adopted").tone,
    "debated",
  );
  assert.equal(
    ordinanceReminder("Proposed conditional use in the LI district", "proposed").tone,
    "debated",
  );
  assert.equal(reminderLabel("ok"), "Possible");
  assert.equal(reminderLabel("no"), "Not possible");
});

test("a floodway or landslide deposit makes the pin stricter", () => {
  const landslide = pinReminder(
    "ok",
    [{ code: "X", detail: "Area of minimal flood hazard" }],
    [
      {
        name: "Areas with scattered or localized landslide deposits",
        age: "Quaternary",
        lithology: "Lithology not stated",
        description: "Landslide deposits generally present.",
      },
    ],
  );
  assert.equal(landslide.tone, "debated");

  const floodway = pinReminder(
    "debated",
    [{ code: "AE", detail: "FLOODWAY" }],
    [],
  );
  assert.equal(floodway.tone, "no");

  const specialFlood = pinReminder("ok", [{ code: "AE", detail: null }], []);
  assert.equal(specialFlood.tone, "debated");

  const blocked = pinReminder("no", [], []);
  assert.equal(blocked.tone, "no");
});

test("a failed water lookup is not described as an empty search", () => {
  assert.equal(
    searchBox(40.46356, -79.9673),
    "-80.08730,40.34356,-79.84730,40.58356",
  );
  assert.equal(
    describeStream({ status: "unavailable" }, null),
    "The USGS stream-site service did not respond for this pin.",
  );
  assert.equal(
    describeStream({ status: "empty" }, null),
    "No active USGS stream site is within 8 miles.",
  );
  assert.equal(
    describeWell({ status: "unavailable" }),
    "The USGS groundwater-site service did not respond for this pin.",
  );
  assert.equal(
    describeChannel({ status: "found", value: 0.4 }),
    "The nearest mapped stream channel is about 0.4 miles from this pin.",
  );
});

test("nearest gage distance uses the site coordinates", () => {
  const rdb = [
    "# comment",
    "agency_cd\tsite_no\tstation_nm\tsite_tp_cd\tdec_lat_va\tdec_long_va",
    "5s\t15s\t50s\t7s\t16s\t16s",
    "USGS\t03049819\tGirtys Run at Millvale, PA\tST\t40.4778333\t-79.9700278",
  ].join("\n");
  const sites = parseNwisSites(rdb, "stream") as Array<
    { latitude: number; longitude: number; name: string }
  >;
  assert.equal(sites.length, 1);
  assert.equal(sites[0].name, "Girtys Run at Millvale, PA");
  const miles = milesBetween(40.46356, -79.9673, sites[0].latitude, sites[0].longitude);
  assert.ok(miles > 0.5 && miles < 2);
});
