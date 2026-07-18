import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import MeasurementsView from "../src/components/MeasurementsView.jsx";

afterEach(cleanup);

const records = [
  { id: "m1", date: "2026-04-18", heightCm: 130, weightKg: 28.2, note: "春季测量" },
  { id: "m2", date: "2026-07-18", heightCm: 132.1, weightKg: 29, note: "暑假测量" },
];

describe("MeasurementsView", () => {
  it("prompts for a first measurement when there is no data", () => {
    render(<MeasurementsView data={{ records: [], summary: { latest: null, due: true } }} />);
    expect(screen.getByText("建议现在进行首次测量")).toBeTruthy();
    expect(screen.getAllByText("还没有测量记录").length).toBe(2);
  });

  it("shows latest values, changes, recommendation, and history", () => {
    render(<MeasurementsView data={{
      records,
      summary: { latest: records[1], previous: records[0], heightChange: 2.1, weightChange: 0.8, nextSuggestedDate: "2026-10-18", due: false },
    }} />);
    expect(screen.getAllByText("132.1 cm").length).toBeGreaterThan(0);
    expect(screen.getByText("较上次 +2.1 cm")).toBeTruthy();
    expect(screen.getAllByText("29 kg").length).toBeGreaterThan(0);
    expect(screen.getByText("下次建议测量：2026-10-18")).toBeTruthy();
    expect(screen.getByText("暑假测量")).toBeTruthy();
  });

  it("offers edit and delete controls only when handlers are provided", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<MeasurementsView data={{ records, summary: { latest: records[1], due: true } }} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText("编辑 2026-07-18 的记录"));
    fireEvent.click(screen.getByLabelText("删除 2026-07-18 的记录"));
    expect(onEdit).toHaveBeenCalledWith(records[1]);
    expect(onDelete).toHaveBeenCalledWith(records[1]);
  });
});
