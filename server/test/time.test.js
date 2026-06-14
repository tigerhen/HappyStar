import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKey } from "../src/time.js";

test("dayKey formats local date as YYYY-MM-DD", () => {
  const d = new Date(2026, 5, 14, 9, 30); // local June 14 2026
  assert.equal(dayKey(d), "2026-06-14");
});

test("dayKey pads single-digit month and day", () => {
  const d = new Date(2026, 0, 3, 0, 0);
  assert.equal(dayKey(d), "2026-01-03");
});

test("dayKey accepts ISO string", () => {
  assert.equal(dayKey("2026-06-14T23:00:00").slice(0, 7), "2026-06");
});
