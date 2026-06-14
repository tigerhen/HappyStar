import { test } from "node:test";
import assert from "node:assert/strict";
import { countTaskToday, buildTaskView } from "../src/domain/tasks.js";

const now = new Date(2026, 5, 14, 10, 0);
const events = [
  { type: "task", childId: "haolin", refId: "t_read", delta: 2, createdAt: new Date(2026, 5, 14, 8).toISOString() },
  { type: "task", childId: "haolin", refId: "t_read", delta: 2, createdAt: new Date(2026, 5, 13, 8).toISOString() },
  { type: "task", childId: "zhongxian", refId: "t_read", delta: 2, createdAt: new Date(2026, 5, 14, 9).toISOString() },
];

test("countTaskToday counts only same child + task + local day", () => {
  assert.equal(countTaskToday(events, "haolin", "t_read", now), 1);
  assert.equal(countTaskToday(events, "zhongxian", "t_read", now), 1);
});

test("buildTaskView marks done count and atLimit", () => {
  const tasks = [{ id: "t_read", name: "Read", points: 2, dailyLimit: 2, enabled: true }];
  const view = buildTaskView(tasks, events, "haolin", now);
  assert.equal(view[0].doneToday, 1);
  assert.equal(view[0].atLimit, false);
});

test("buildTaskView excludes disabled tasks", () => {
  const tasks = [{ id: "t_x", enabled: false, dailyLimit: 1, points: 1 }];
  assert.equal(buildTaskView(tasks, events, "haolin", now).length, 0);
});
