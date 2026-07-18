import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import MeasurementChart from "../src/components/MeasurementChart.jsx";

afterEach(cleanup);

describe("MeasurementChart", () => {
  it("shows an empty state without records", () => {
    render(<MeasurementChart title="身高趋势" unit="cm" records={[]} valueKey="heightCm" color="#b14a6b" />);
    expect(screen.getByText("还没有测量记录")).toBeTruthy();
  });

  it("renders a centered point for one record", () => {
    render(<MeasurementChart title="身高趋势" unit="cm" records={[{ date: "2026-07-18", heightCm: 130 }]} valueKey="heightCm" color="#b14a6b" />);
    const chart = screen.getByLabelText("身高趋势曲线图");
    expect(chart.querySelectorAll("circle").length).toBe(1);
    expect(chart.innerHTML.includes("NaN")).toBe(false);
    expect(screen.getByText("再测量 1 次即可形成趋势")).toBeTruthy();
  });

  it("renders a polyline and all points for multiple records", () => {
    const records = [
      { date: "2026-01-01", weightKg: 28.1 },
      { date: "2026-04-15", weightKg: 29.4 },
      { date: "2026-07-18", weightKg: 30.2 },
    ];
    render(<MeasurementChart title="体重趋势" unit="kg" records={records} valueKey="weightKg" color="#185fa5" />);
    const chart = screen.getByLabelText("体重趋势曲线图");
    expect(chart.querySelectorAll("polyline").length).toBe(1);
    expect(chart.querySelectorAll("circle").length).toBe(3);
    expect(chart.innerHTML.includes("NaN")).toBe(false);
  });

  it("omits records where the selected metric was not measured", () => {
    const records = [
      { date: "2026-01-01", weightKg: 28.1 },
      { date: "2026-04-15", weightKg: null },
      { date: "2026-07-18", weightKg: 30.2 },
    ];
    render(<MeasurementChart title="体重趋势" unit="kg" records={records} valueKey="weightKg" color="#185fa5" />);
    const chart = screen.getByLabelText("体重趋势曲线图");
    expect(chart.querySelectorAll("circle").length).toBe(2);
    expect(chart.querySelectorAll("polyline").length).toBe(1);
    expect(chart.innerHTML.includes("NaN")).toBe(false);
  });
});
