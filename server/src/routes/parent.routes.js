import { randomUUID } from "node:crypto";
import { readCollection, writeCollection } from "../store.js";
import { requireParent } from "./guard.js";
import { balance } from "../domain/points.js";
import { approveRedemption } from "../domain/redeem.js";
import { capacity, etaWeeks } from "../domain/capacity.js";
import { hashPin } from "../auth.js";
import { summarizePlan, changeItemProgress, setDeliverable, normalizePlan, settlementPreview } from "../domain/growth-plans.js";

function newId(prefix) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

function withPlanSummary(plan) {
  return { ...plan, summary: summarizePlan(plan), settlement: settlementPreview(plan) };
}

export async function parentRoutes(app) {
  app.get("/api/redemptions", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const [redemptions, events, children, rewards] = await Promise.all([
      readCollection("redemptions", []),
      readCollection("events", []),
      readCollection("children", []),
      readCollection("rewards", []),
    ]);
    const status = req.query.status;
    const list = status ? redemptions.filter((r) => r.status === status) : redemptions;
    return list.map((r) => {
      const child = children.find((c) => c.id === r.childId) || {};
      const reward = rewards.find((w) => w.id === r.rewardId) || {};
      return {
        ...r,
        currentBalance: balance(events, r.childId),
        childName: child.name,
        childAvatar: child.avatar,
        childEmoji: child.emoji,
        rewardName: reward.name,
        rewardEmoji: reward.emoji,
      };
    });
  });

  app.post("/api/redemptions/:id/approve", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const redemptions = await readCollection("redemptions", []);
    const idx = redemptions.findIndex((r) => r.id === req.params.id);
    if (idx < 0 || redemptions[idx].status !== "pending")
      return reply.code(404).send({ error: "not_pending" });

    const rewards = await readCollection("rewards", []);
    const reward = rewards.find((r) => r.id === redemptions[idx].rewardId);
    const events = await readCollection("events", []);
    const res = approveRedemption(redemptions[idx], reward || { stock: null }, balance(events, redemptions[idx].childId), new Date());
    if (!res.ok) return reply.code(409).send({ error: res.reason });

    events.push(res.event);
    redemptions[idx] = res.redemption;
    if (res.stockDelta && reward) reward.stock += res.stockDelta;
    await Promise.all([
      writeCollection("events", events),
      writeCollection("redemptions", redemptions),
      writeCollection("rewards", rewards),
    ]);
    return { ok: true };
  });

  app.post("/api/redemptions/:id/reject", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const redemptions = await readCollection("redemptions", []);
    const idx = redemptions.findIndex((r) => r.id === req.params.id);
    if (idx < 0 || redemptions[idx].status !== "pending")
      return reply.code(404).send({ error: "not_pending" });
    redemptions[idx] = { ...redemptions[idx], status: "rejected", decidedAt: new Date().toISOString(), note: req.body?.note || "" };
    await writeCollection("redemptions", redemptions);
    return { ok: true };
  });

  app.post("/api/adjust", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const { childId, delta, note } = req.body || {};
    if (!childId || typeof delta !== "number" || delta <= 0)
      return reply.code(400).send({ error: "bad_adjust" });
    const events = await readCollection("events", []);
    events.push({ id: newId("e"), type: "adjust", childId, delta, refId: null, note: note || "", createdAt: new Date().toISOString() });
    await writeCollection("events", events);
    return { ok: true, balance: balance(events, childId) };
  });

  for (const kind of ["tasks", "rewards"]) {
    app.get(`/api/admin/${kind}`, async (req, reply) => {
      if (!requireParent(req, reply)) return;
      return readCollection(kind, []);
    });
    app.post(`/api/admin/${kind}`, async (req, reply) => {
      if (!requireParent(req, reply)) return;
      const items = await readCollection(kind, []);
      const item = { id: newId(kind === "tasks" ? "t" : "r"), ...req.body };
      items.push(item);
      await writeCollection(kind, items);
      return item;
    });
    app.put(`/api/admin/${kind}/:id`, async (req, reply) => {
      if (!requireParent(req, reply)) return;
      const items = await readCollection(kind, []);
      const idx = items.findIndex((i) => i.id === req.params.id);
      if (idx < 0) return reply.code(404).send({ error: "not_found" });
      items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
      await writeCollection(kind, items);
      return items[idx];
    });
    app.delete(`/api/admin/${kind}/:id`, async (req, reply) => {
      if (!requireParent(req, reply)) return;
      const items = await readCollection(kind, []);
      const next = items.filter((i) => i.id !== req.params.id);
      await writeCollection(kind, next);
      return { ok: true };
    });
  }

  app.get("/api/logs", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    let events = await readCollection("events", []);
    if (req.query.childId) events = events.filter((e) => e.childId === req.query.childId);
    return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  app.get("/api/admin/capacity", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const [tasks, rewards] = await Promise.all([
      readCollection("tasks", []),
      readCollection("rewards", []),
    ]);
    const cap = capacity(tasks);
    const rows = rewards
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        category: r.category,
        cost: r.cost,
        etaBase: etaWeeks(r.cost, cap.base),
        etaRealistic: etaWeeks(r.cost, cap.realistic),
        etaMax: etaWeeks(r.cost, cap.max),
      }));
    return { capacity: cap, rewards: rows };
  });

  app.post("/api/admin/pin", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const { role, childId, pin } = req.body || {};
    if (!pin) return reply.code(400).send({ error: "bad_pin" });
    if (role === "parent") {
      const config = await readCollection("config", {});
      config.parentPinHash = hashPin(pin);
      await writeCollection("config", config);
      return { ok: true };
    }
    if (role === "child") {
      const children = await readCollection("children", []);
      const child = children.find((c) => c.id === childId);
      if (!child) return reply.code(404).send({ error: "child_not_found" });
      child.pinHash = hashPin(pin);
      await writeCollection("children", children);
      return { ok: true };
    }
    return reply.code(400).send({ error: "bad_role" });
  });

  app.get("/api/admin/growth-plans", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const plans = await readCollection("growth-plans", []);
    return plans.map(withPlanSummary);
  });

  app.post("/api/admin/growth-plans", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const body = req.body || {};
    if (!body.childId || !body.name?.trim()) return reply.code(400).send({ error: "bad_plan" });
    const children = await readCollection("children", []);
    if (!children.some((child) => child.id === body.childId)) return reply.code(404).send({ error: "child_not_found" });
    const plans = await readCollection("growth-plans", []);
    const plan = normalizePlan({
      id: newId("gp"), childId: body.childId, name: body.name.trim(),
      startDate: body.startDate || "", endDate: body.endDate || "", status: body.status || "active",
      targetPoints: Number.isInteger(body.targetPoints) ? body.targetPoints : 0,
      groups: Array.isArray(body.groups) ? body.groups : [],
      deliverables: Array.isArray(body.deliverables) ? body.deliverables : [],
    });
    plans.push(plan);
    await writeCollection("growth-plans", plans);
    return withPlanSummary(plan);
  });

  app.put("/api/admin/growth-plans/:id", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const plans = await readCollection("growth-plans", []);
    const index = plans.findIndex((row) => row.id === req.params.id);
    if (index < 0) return reply.code(404).send({ error: "plan_not_found" });
    if (plans[index].status === "settled") return reply.code(409).send({ error: "plan_settled" });
    plans[index] = normalizePlan({ ...plans[index], ...req.body, id: plans[index].id });
    await writeCollection("growth-plans", plans);
    return withPlanSummary(plans[index]);
  });

  app.delete("/api/admin/growth-plans/:id", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const plans = await readCollection("growth-plans", []);
    const target = plans.find((row) => row.id === req.params.id);
    if (!target) return reply.code(404).send({ error: "plan_not_found" });
    if (target.status === "settled") return reply.code(409).send({ error: "plan_settled" });
    await writeCollection("growth-plans", plans.filter((row) => row.id !== req.params.id));
    return { ok: true };
  });

  app.patch("/api/admin/growth-plans/:id/items/:itemId/progress", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const plans = await readCollection("growth-plans", []);
    const index = plans.findIndex((row) => row.id === req.params.id);
    if (index < 0) return reply.code(404).send({ error: "plan_not_found" });
    if (plans[index].status === "settled") return reply.code(409).send({ error: "plan_settled" });
    try {
      plans[index] = changeItemProgress(plans[index], req.params.itemId, req.body?.delta);
    } catch (error) {
      return reply.code(error.message === "item_not_found" ? 404 : 400).send({ error: error.message });
    }
    await writeCollection("growth-plans", plans);
    return withPlanSummary(plans[index]);
  });

  app.patch("/api/admin/growth-plans/:id/deliverables/:itemId", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const plans = await readCollection("growth-plans", []);
    const index = plans.findIndex((row) => row.id === req.params.id);
    if (index < 0) return reply.code(404).send({ error: "plan_not_found" });
    if (plans[index].status === "settled") return reply.code(409).send({ error: "plan_settled" });
    try {
      plans[index] = setDeliverable(plans[index], req.params.itemId, req.body?.done);
    } catch (error) {
      return reply.code(error.message === "deliverable_not_found" ? 404 : 400).send({ error: error.message });
    }
    await writeCollection("growth-plans", plans);
    return withPlanSummary(plans[index]);
  });

  app.post("/api/admin/growth-plans/:id/settle", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const plans = await readCollection("growth-plans", []);
    const index = plans.findIndex((row) => row.id === req.params.id);
    if (index < 0) return reply.code(404).send({ error: "plan_not_found" });
    const plan = plans[index];
    if (plan.status === "settled") return reply.code(409).send({ error: "plan_already_settled" });
    const preview = settlementPreview(plan);
    if (!preview.ready) return reply.code(409).send({ error: "plan_incomplete" });
    if (preview.estimatedPoints <= 0) return reply.code(409).send({ error: "bad_plan_points" });

    const now = new Date();
    const completionTimes = [
      ...(plan.groups || []).flatMap((group) => (group.items || []).filter((item) => !item.optional).flatMap((item) => item.completionDates || [])),
      ...(plan.deliverables || []).map((item) => item.completedAt).filter(Boolean),
    ];
    const completedAt = completionTimes.sort().at(-1) || now.toISOString();
    plans[index] = { ...plan, status: "settled", completedAt, settledAt: now.toISOString(), settledPoints: preview.estimatedPoints };
    const events = await readCollection("events", []);
    events.push({
      id: newId("e"), type: "adjust", childId: plan.childId, delta: preview.estimatedPoints,
      refId: plan.id, note: `成长计划结算：${plan.name}`, createdAt: now.toISOString(),
    });
    await Promise.all([writeCollection("growth-plans", plans), writeCollection("events", events)]);
    return { ok: true, points: preview.estimatedPoints, plan: withPlanSummary(plans[index]), breakdown: preview.breakdown };
  });
}
