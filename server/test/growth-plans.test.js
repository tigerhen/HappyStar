import { test } from "node:test";
import assert from "node:assert/strict";
import {
  summarizePlan,
  changeItemProgress,
  setDeliverable,
  normalizePlan,
  timeCoefficient,
  settlementPreview,
} from "../src/domain/growth-plans.js";

const plan = {
  id: "gp_one",
  groups: [
    {
      id: "g_one",
      items: [
        { id: "required", target: 10, completed: 5, weight: 2, optional: false },
        { id: "second", target: 4, completed: 4, weight: 1, optional: false },
        { id: "stretch", target: 5, completed: 0, weight: 8, optional: true },
      ],
    },
  ],
  deliverables: [{ id: "book", name: "摘抄本", done: false }],
};

test("summarizePlan uses weighted required items and excludes optional items", () => {
  const summary = summarizePlan(plan);
  assert.equal(summary.percent, 58);
  assert.equal(summary.completedUnits, 9);
  assert.equal(summary.totalUnits, 14);
  assert.equal(summary.deliverablesDone, 0);
  assert.equal(summary.deliverablesTotal, 1);
  assert.equal(summary.complete, false);
});

test("changeItemProgress clamps progress and leaves the source plan unchanged", () => {
  const next = changeItemProgress(plan, "required", 99, new Date("2026-07-05T04:00:00Z"));
  assert.equal(next.groups[0].items[0].completed, 10);
  assert.equal(next.groups[0].items[0].completionDates.length, 5);
  assert.equal(next.groups[0].items[0].completionDates[0], "2026-07-05T04:00:00.000Z");
  assert.equal(plan.groups[0].items[0].completed, 5);
  assert.throws(() => changeItemProgress(plan, "required", 0.5), /bad_delta/);
  assert.throws(() => changeItemProgress(plan, "missing", 1), /item_not_found/);
});

test("setDeliverable updates a known deliverable immutably", () => {
  const next = setDeliverable(plan, "book", true, new Date("2026-07-05T04:00:00Z"));
  assert.equal(next.deliverables[0].done, true);
  assert.equal(next.deliverables[0].completedAt, "2026-07-05T04:00:00.000Z");
  assert.equal(plan.deliverables[0].done, false);
  assert.throws(() => setDeliverable(plan, "missing", true), /deliverable_not_found/);
});

test("timeCoefficient applies the four lateness bands", () => {
  assert.equal(timeCoefficient("2026-07-05", "2026-07-05"), 1);
  assert.equal(timeCoefficient("2026-07-08", "2026-07-05"), 0.85);
  assert.equal(timeCoefficient("2026-07-12", "2026-07-05"), 0.7);
  assert.equal(timeCoefficient("2026-07-13", "2026-07-05"), 0.5);
  assert.equal(timeCoefficient("2026-07-13", undefined), 1);
});

test("settlementPreview distributes the pool by unit workload and applies schedules", () => {
  const preview = settlementPreview({
    targetPoints: 240, startDate: "2026-07-01", endDate: "2026-07-10",
    groups: [{ items: [
      { id: "uniform", target: 2, completed: 2, weight: 1, optional: false, scheduleMode: "uniform", completionDates: ["2026-07-05T04:00:00Z", "2026-07-18T04:00:00Z"] },
      { id: "deadline", target: 1, completed: 1, weight: 2, optional: false, scheduleMode: "deadline", completionDates: ["2026-07-12T04:00:00Z"] },
    ] }], deliverables: [],
  });
  assert.equal(preview.basePoints, 240);
  assert.equal(preview.estimatedPoints, 192);
  assert.equal(preview.deduction, 48);
  assert.equal(preview.ready, true);
});

test("settlementPreview treats legacy undated progress as on-time", () => {
  const preview = settlementPreview({ targetPoints: 10, startDate: "2026-07-01", endDate: "2026-07-02", groups: [{ items: [{ id: "old", target: 1, completed: 1, weight: 1, optional: false }] }], deliverables: [] });
  assert.equal(preview.estimatedPoints, 10);
  assert.equal(preview.ready, true);
});

test("settlementPreview rounds only the final total", () => {
  const preview = settlementPreview({ targetPoints: 1, startDate: "2026-07-01", endDate: "2026-07-02", groups: [{ items: [
    { id: "a", target: 1, completed: 1, weight: 1, optional: false },
    { id: "b", target: 1, completed: 1, weight: 1, optional: false },
  ] }], deliverables: [] });
  assert.equal(preview.estimatedPoints, 1);
});

test("normalizePlan removes derived summary and clamps admin supplied progress", () => {
  const normalized = normalizePlan({ ...plan, summary: { percent: 99 }, groups: [{ id: "g", items: [{ id: "i", target: 3, completed: 9, weight: 0 }] }] });
  assert.equal("summary" in normalized, false);
  assert.equal(normalized.groups[0].items[0].completed, 3);
  assert.equal(normalized.groups[0].items[0].weight, 1);
});
