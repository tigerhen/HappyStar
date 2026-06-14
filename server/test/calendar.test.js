import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateMonth } from "../src/domain/calendar.js";

const events = [
  { type: "task", childId: "haolin", delta: 10, createdAt: new Date(2026, 5, 14, 8).toISOString() },
  { type: "task", childId: "haolin", delta: 5, createdAt: new Date(2026, 5, 14, 9).toISOString() },
  { type: "task", childId: "zhongxian", delta: 8, createdAt: new Date(2026, 5, 14, 9).toISOString() },
  { type: "redeem", childId: "haolin", delta: -60, createdAt: new Date(2026, 5, 13, 19).toISOString() },
  { type: "task", childId: "haolin", delta: 4, createdAt: new Date(2026, 4, 30, 8).toISOString() },
];

test("aggregateMonth sums positive task points per child per day", () => {
  const days = aggregateMonth(events, "2026-06");
  assert.equal(days["2026-06-14"].earned.haolin, 15);
  assert.equal(days["2026-06-14"].earned.zhongxian, 8);
});

test("aggregateMonth flags days with a redemption", () => {
  const days = aggregateMonth(events, "2026-06");
  assert.equal(days["2026-06-13"].hasRedemption, true);
  assert.equal(days["2026-06-14"].hasRedemption, false);
});

test("aggregateMonth ignores other months", () => {
  const days = aggregateMonth(events, "2026-06");
  assert.equal(days["2026-05-30"], undefined);
});