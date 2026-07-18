import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import GrowthPlanDetail from "../src/components/GrowthPlanDetail.jsx";

afterEach(cleanup);

const plan = {
  id: "gp_one", name: "暑假成长计划", startDate: "2026-07-01", endDate: "2026-08-31", targetPoints: 500,
  summary: { percent: 50, completedUnits: 2, totalUnits: 4, deliverablesDone: 0, deliverablesTotal: 1 },
  settlement: { targetPoints: 500, estimatedPoints: 426, deduction: 74, ready: true, settled: false },
  groups: [{ id: "math", name: "数学", emoji: "➗", items: [
    { id: "book", name: "暑假作业", unit: "份", completed: 2, target: 4, optional: false },
    { id: "stretch", name: "拓展阅读", unit: "本", completed: 0, target: 1, optional: true },
  ] }],
  deliverables: [{ id: "review", name: "家长检查", done: false }],
};

describe("GrowthPlanDetail", () => {
  it("renders completion and optional status", () => {
    render(<GrowthPlanDetail plan={plan} onProgress={() => {}} onDeliverable={() => {}} />);
    expect(screen.getByLabelText("计划完成度 50%")).toBeTruthy();
    expect(screen.getByText("拓展")).toBeTruthy();
  });

  it("reports progress and deliverable actions", () => {
    const onProgress = vi.fn();
    const onDeliverable = vi.fn();
    render(<GrowthPlanDetail plan={plan} onProgress={onProgress} onDeliverable={onDeliverable} />);
    fireEvent.click(screen.getByLabelText("暑假作业增加进度"));
    fireEvent.click(screen.getByText("家长检查"));
    expect(onProgress).toHaveBeenCalledWith("gp_one", "book", 1);
    expect(onDeliverable).toHaveBeenCalledWith("gp_one", "review", true);
  });

  it("shows settlement estimate and lets a parent confirm", () => {
    const onSettle = vi.fn();
    render(<GrowthPlanDetail plan={plan} onProgress={() => {}} onDeliverable={() => {}} onSettle={onSettle} />);
    expect(screen.getByText("预计")).toBeTruthy();
    expect(screen.getByText("426 ⭐")).toBeTruthy();
    expect(screen.getByText("74")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "确认完成并结算" }));
    expect(onSettle).toHaveBeenCalledWith("gp_one");
  });
});
