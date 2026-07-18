import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateMeasurement,
  sortMeasurements,
  measurementSummary,
  addCalendarMonths,
} from "../src/domain/measurements.js";

test("validateMeasurement accepts valid values and rejects invalid precision or dates", () => {
  assert.deepEqual(validateMeasurement({ childId: "haolin", date: "2026-07-18", heightCm: 142.5, weightKg: 35, note: "晨起" }), {
    childId: "haolin", date: "2026-07-18", heightCm: 142.5, weightKg: 35, note: "晨起",
  });
  assert.throws(() => validateMeasurement({ childId: "haolin", date: "2026-02-30", heightCm: 140, weightKg: 30 }), /bad_date/);
  assert.throws(() => validateMeasurement({ childId: "haolin", date: "2026-07-18", heightCm: 142.55, weightKg: 30 }), /bad_height/);
  assert.throws(() => validateMeasurement({ childId: "haolin", date: "2026-07-18", heightCm: 142, weightKg: 30.255 }), /bad_weight/);
  assert.throws(() => validateMeasurement({ childId: "", date: "2026-07-18", heightCm: 142, weightKg: 30 }), /bad_child/);
});

test("validateMeasurement accepts either metric and normalizes missing values", () => {
  assert.deepEqual(validateMeasurement({ childId: "zhongxian", date: "2025-02-17", heightCm: 122 }), {
    childId: "zhongxian", date: "2025-02-17", heightCm: 122, weightKg: null, note: "",
  });
  assert.deepEqual(validateMeasurement({ childId: "haolin", date: "2026-03-01", weightKg: 40.65 }), {
    childId: "haolin", date: "2026-03-01", heightCm: null, weightKg: 40.65, note: "",
  });
  assert.throws(() => validateMeasurement({ childId: "haolin", date: "2026-03-01", heightCm: null, weightKg: null }), /measurement_value_required/);
});

test("sortMeasurements orders records by date without mutating input", () => {
  const rows = [{ id: "b", date: "2026-07-18" }, { id: "a", date: "2026-01-02" }];
  assert.deepEqual(sortMeasurements(rows).map((row) => row.id), ["a", "b"]);
  assert.equal(rows[0].id, "b");
});

test("addCalendarMonths clamps to the target month end", () => {
  assert.equal(addCalendarMonths("2026-01-31", 3), "2026-04-30");
  assert.equal(addCalendarMonths("2026-07-18", 3), "2026-10-18");
});

test("measurementSummary returns latest changes and three-month reminder", () => {
  const summary = measurementSummary([
    { date: "2026-01-01", heightCm: 130.2, weightKg: 28.1 },
    { date: "2026-04-15", heightCm: 132.8, weightKg: 29.4 },
  ], "2026-07-18");
  assert.equal(summary.latest.heightCm, 132.8);
  assert.equal(summary.heightChange, 2.6);
  assert.equal(summary.weightChange, 1.3);
  assert.equal(summary.nextSuggestedDate, "2026-07-15");
  assert.equal(summary.due, true);
});

test("measurementSummary handles the first measurement and empty state", () => {
  const first = measurementSummary([{ date: "2026-07-18", heightCm: 130, weightKg: 28 }], "2026-07-18");
  assert.equal(first.heightChange, null);
  assert.equal(first.nextSuggestedDate, "2026-10-18");
  assert.equal(first.due, false);
  const empty = measurementSummary([], "2026-07-18");
  assert.equal(empty.latest, null);
  assert.equal(empty.nextSuggestedDate, null);
  assert.equal(empty.due, true);
});

test("measurementSummary uses independent valid histories for height and weight", () => {
  const summary = measurementSummary([
    { date: "2025-02-17", heightCm: 122, weightKg: null },
    { date: "2025-10-05", heightCm: 124, weightKg: 25 },
    { date: "2025-12-13", heightCm: 125, weightKg: null },
    { date: "2026-03-01", heightCm: 129, weightKg: 24.6 },
  ], "2026-03-01");
  assert.equal(summary.latestHeight.date, "2026-03-01");
  assert.equal(summary.previousHeight.date, "2025-12-13");
  assert.equal(summary.heightChange, 4);
  assert.equal(summary.latestWeight.date, "2026-03-01");
  assert.equal(summary.previousWeight.date, "2025-10-05");
  assert.equal(summary.weightChange, -0.4);
});
