import { test } from "node:test";
import assert from "node:assert/strict";
import { balance } from "../src/domain/points.js";

const events = [
  { type: "task", childId: "haolin", delta: 10 },
  { type: "task", childId: "haolin", delta: 5 },
  { type: "redeem", childId: "haolin", delta: -8 },
  { type: "task", childId: "zhongxian", delta: 3 },
];

test("balance sums only the child's deltas", () => {
  assert.equal(balance(events, "haolin"), 7);
  assert.equal(balance(events, "zhongxian"), 3);
});

test("balance of unknown child is 0", () => {
  assert.equal(balance(events, "nobody"), 0);
});
