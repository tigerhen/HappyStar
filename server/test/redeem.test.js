import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRedemption, approveRedemption } from "../src/domain/redeem.js";

const reward = { id: "r_ice", name: "Ice cream", cost: 60, stock: null };
const now = new Date(2026, 5, 14, 18, 0);

test("makeRedemption creates a pending record with cost snapshot", () => {
  const rd = makeRedemption("haolin", reward, now);
  assert.equal(rd.status, "pending");
  assert.equal(rd.cost, 60);
  assert.equal(rd.childId, "haolin");
  assert.equal(rd.rewardId, "r_ice");
  assert.ok(rd.id);
});

test("approveRedemption succeeds when balance is enough", () => {
  const rd = makeRedemption("haolin", reward, now);
  const res = approveRedemption(rd, reward, 100, now);
  assert.equal(res.ok, true);
  assert.equal(res.event.delta, -60);
  assert.equal(res.event.type, "redeem");
  assert.equal(res.redemption.status, "approved");
  assert.equal(res.stockDelta, 0);
});

test("approveRedemption fails when balance is insufficient", () => {
  const rd = makeRedemption("haolin", reward, now);
  const res = approveRedemption(rd, reward, 30, now);
  assert.equal(res.ok, false);
  assert.equal(res.reason, "insufficient_balance");
});

test("approveRedemption decrements finite stock", () => {
  const limited = { id: "r_toy", cost: 10, stock: 2 };
  const rd = makeRedemption("haolin", limited, now);
  const res = approveRedemption(rd, limited, 50, now);
  assert.equal(res.stockDelta, -1);
});
