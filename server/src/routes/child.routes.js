import { randomUUID } from "node:crypto";
import { readCollection, writeCollection } from "../store.js";
import { requireSession, requireChild } from "./guard.js";
import { balance } from "../domain/points.js";
import { buildTaskView, countTaskToday } from "../domain/tasks.js";
import { makeRedemption } from "../domain/redeem.js";
import { aggregateMonth } from "../domain/calendar.js";

export async function childRoutes(app) {
  app.get("/api/tasks", async (req, reply) => {
    const s = requireChild(req, reply);
    if (!s) return;
    const [tasks, events] = await Promise.all([
      readCollection("tasks", []),
      readCollection("events", []),
    ]);
    return buildTaskView(tasks, events, s.childId, new Date());
  });

  app.post("/api/tasks/:id/complete", async (req, reply) => {
    const s = requireChild(req, reply);
    if (!s) return;
    const tasks = await readCollection("tasks", []);
    const task = tasks.find((t) => t.id === req.params.id && t.enabled);
    if (!task) return reply.code(404).send({ error: "task_not_found" });

    const events = await readCollection("events", []);
    const now = new Date();
    if (countTaskToday(events, s.childId, task.id, now) >= task.dailyLimit) {
      return reply.code(409).send({ error: "daily_limit" });
    }
    events.push({
      id: `e_${randomUUID().slice(0, 8)}`,
      type: "task",
      childId: s.childId,
      delta: task.points,
      refId: task.id,
      note: "",
      createdAt: now.toISOString(),
    });
    await writeCollection("events", events);
    return { ok: true, balance: balance(events, s.childId) };
  });

  app.get("/api/rewards", async (req, reply) => {
    const s = requireChild(req, reply);
    if (!s) return;
    const [rewards, events] = await Promise.all([
      readCollection("rewards", []),
      readCollection("events", []),
    ]);
    const bal = balance(events, s.childId);
    return rewards
      .filter((r) => r.enabled)
      .map((r) => ({ ...r, affordable: bal >= r.cost }));
  });

  app.post("/api/rewards/:id/redeem", async (req, reply) => {
    const s = requireChild(req, reply);
    if (!s) return;
    const rewards = await readCollection("rewards", []);
    const reward = rewards.find((r) => r.id === req.params.id && r.enabled);
    if (!reward) return reply.code(404).send({ error: "reward_not_found" });
    if (typeof reward.stock === "number" && reward.stock <= 0) {
      return reply.code(409).send({ error: "out_of_stock" });
    }
    const redemptions = await readCollection("redemptions", []);
    const rd = makeRedemption(s.childId, reward, new Date());
    redemptions.push(rd);
    await writeCollection("redemptions", redemptions);
    return rd;
  });

  app.get("/api/calendar", async (req, reply) => {
    const s = requireSession(req, reply);
    if (!s) return;
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const events = await readCollection("events", []);
    const scoped =
      s.role === "child" ? events.filter((e) => e.childId === s.childId) : events;
    return aggregateMonth(scoped, month);
  });
}