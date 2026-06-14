import { randomUUID } from "node:crypto";

export function makeRedemption(childId, reward, now) {
  return {
    id: `rd_${randomUUID().slice(0, 8)}`,
    childId,
    rewardId: reward.id,
    cost: reward.cost,
    status: "pending",
    requestedAt: now.toISOString(),
    decidedAt: null,
    note: "",
  };
}

export function approveRedemption(redemption, reward, currentBalance, now) {
  if (currentBalance < redemption.cost) {
    return { ok: false, reason: "insufficient_balance" };
  }
  const event = {
    id: `e_${randomUUID().slice(0, 8)}`,
    type: "redeem",
    childId: redemption.childId,
    delta: -redemption.cost,
    refId: redemption.rewardId,
    note: "",
    createdAt: now.toISOString(),
  };
  return {
    ok: true,
    event,
    redemption: { ...redemption, status: "approved", decidedAt: now.toISOString() },
    stockDelta: typeof reward.stock === "number" ? -1 : 0,
  };
}
