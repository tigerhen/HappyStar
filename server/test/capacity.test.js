import { test } from "node:test";
import assert from "node:assert/strict";
import { taskWeekly, capacity, etaWeeks } from "../src/domain/capacity.js";

test("taskWeekly multiplies points × dailyLimit × weeklyDays", () => {
  assert.equal(taskWeekly({ points: 10, dailyLimit: 1, weeklyDays: 5 }), 50);
  assert.equal(taskWeekly({ points: 2, dailyLimit: 2, weeklyDays: 7 }), 28);
});

test("taskWeekly defaults weeklyDays to 7 when missing", () => {
  assert.equal(taskWeekly({ points: 3, dailyLimit: 1 }), 21);
});

test("capacity computes base (core only), realistic (80%), max", () => {
  const tasks = [
    { points: 10, dailyLimit: 1, weeklyDays: 5, core: true, enabled: true },  // 50
    { points: 2, dailyLimit: 2, weeklyDays: 7, core: false, enabled: true },  // 28
    { points: 6, dailyLimit: 1, weeklyDays: 7, core: false, enabled: true },  // 42
    { points: 99, dailyLimit: 1, weeklyDays: 7, core: true, enabled: false }, // disabled -> ignored
  ];
  const cap = capacity(tasks);
  assert.equal(cap.max, 120);          // 50 + 28 + 42
  assert.equal(cap.base, 50);          // only enabled core
  assert.equal(cap.realistic, 96);     // round(120 * 0.8)
});

test("etaWeeks divides cost by weekly rate, 1 decimal", () => {
  assert.equal(etaWeeks(480, 120), 4);
  assert.equal(etaWeeks(480, 146), 3.3);
});

test("etaWeeks returns null when rate is 0 or missing", () => {
  assert.equal(etaWeeks(480, 0), null);
  assert.equal(etaWeeks(480, undefined), null);
});
