import assert from "node:assert/strict";
import test from "node:test";
import { withdrawalGallonsPerDay } from "./impact.ts";
import { feederSupport, registrationNote, streamSupport } from "./support.ts";

test("a load above the feeder peak is a no, and a smaller load stays unpublished", () => {
  const large = feederSupport(25);
  assert.equal(large.verdict, "no");
  assert.match(large.headline, /cannot carry/);
  assert.match(large.detail, /4\.2 times/);
  const small = feederSupport(5);
  assert.equal(small.verdict, "unestablished");
  assert.match(small.detail, /0\.8 times/);
  assert.match(small.detail, /unpublished|no hosting-capacity/);
});

test("stream support follows the 10 and 20 percent flow lines", () => {
  assert.equal(streamSupport(null).verdict, "unchecked");
  const easy = streamSupport(0.014);
  assert.equal(easy.verdict, "within");
  assert.match(easy.detail, /1\.4%/);
  assert.match(easy.detail, /10% high-protection/);
  const middle = streamSupport(0.15);
  assert.equal(middle.verdict, "within");
  assert.match(middle.detail, /outside their 10%/);
  const over = streamSupport(0.21);
  assert.equal(over.verdict, "no");
  assert.match(over.detail, /21\.0%/);
});

test("registration follows the two Chapter 110 lines", () => {
  assert.match(registrationNote(withdrawalGallonsPerDay(5)), /under the 10,000/);
  assert.match(registrationNote(withdrawalGallonsPerDay(25)), /crosses the 10,000/);
  assert.match(registrationNote(withdrawalGallonsPerDay(25)), /under that line/);
  assert.match(registrationNote(withdrawalGallonsPerDay(100)), /both registration lines/);
});
