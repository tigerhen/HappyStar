import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ParentMeasurements from "../src/pages/ParentMeasurements.jsx";

const mocked = vi.hoisted(() => ({
  children: vi.fn(),
  adminMeasurements: vi.fn(),
  adminCreateMeasurement: vi.fn(),
  adminUpdateMeasurement: vi.fn(),
  adminDeleteMeasurement: vi.fn(),
}));

vi.mock("../src/api.js", () => ({ api: mocked }));

const record = { id: "m1", childId: "haolin", date: "2026-07-18", heightCm: 132.1, weightKg: 29, note: "暑假测量" };
const response = { records: [record], summary: { latest: record, due: false, nextSuggestedDate: "2026-10-18" } };

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocked.children.mockResolvedValue([{ id: "haolin", name: "王颢霖" }]);
  mocked.adminMeasurements.mockResolvedValue(response);
  mocked.adminUpdateMeasurement.mockResolvedValue(record);
});

describe("ParentMeasurements", () => {
  it("loads a child and updates an existing record from the edit form", async () => {
    render(<ParentMeasurements />);
    await screen.findByText("暑假测量", {}, { timeout: 10000 });
    fireEvent.click(screen.getByLabelText("编辑 2026-07-18 的记录"));
    expect(screen.getByLabelText("身高（cm）").value).toBe("132.1");
    fireEvent.change(screen.getByLabelText("体重（kg）"), { target: { value: "29.4" } });
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));
    await waitFor(() => expect(mocked.adminUpdateMeasurement).toHaveBeenCalledWith("m1", {
      childId: "haolin", date: "2026-07-18", heightCm: 132.1, weightKg: 29.4, note: "暑假测量",
    }));
  }, 20000);

  it("ignores a stale response after switching children", async () => {
    let resolveHaolin;
    const haolinRequest = new Promise((resolve) => { resolveHaolin = resolve; });
    const zhongxianRecord = { ...record, id: "m2", childId: "zhongxian", note: "仲贤记录" };
    mocked.children.mockResolvedValue([
      { id: "haolin", name: "王颢霖" },
      { id: "zhongxian", name: "王仲贤" },
    ]);
    mocked.adminMeasurements.mockImplementation((childId) => childId === "haolin"
      ? haolinRequest
      : Promise.resolve({ records: [zhongxianRecord], summary: { latest: zhongxianRecord, due: true } }));

    render(<ParentMeasurements />);
    fireEvent.change(await screen.findByLabelText("孩子"), { target: { value: "zhongxian" } });
    await screen.findByText("仲贤记录", {}, { timeout: 10000 });
    await act(async () => {
      resolveHaolin({ records: [record], summary: { latest: record, due: true } });
      await haolinRequest;
    });
    expect(screen.queryByText("暑假测量")).toBeNull();
    expect(screen.getByText("仲贤记录")).toBeTruthy();
  }, 20000);

  it("locks child selection while a save is pending", async () => {
    let resolveUpdate;
    const updateRequest = new Promise((resolve) => { resolveUpdate = resolve; });
    mocked.children.mockResolvedValue([
      { id: "haolin", name: "王颢霖" },
      { id: "zhongxian", name: "王仲贤" },
    ]);
    mocked.adminUpdateMeasurement.mockReturnValue(updateRequest);

    render(<ParentMeasurements />);
    await screen.findByText("暑假测量", {}, { timeout: 10000 });
    fireEvent.click(screen.getByLabelText("编辑 2026-07-18 的记录"));
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));
    expect(screen.getByLabelText("孩子").disabled).toBe(true);
    await act(async () => { resolveUpdate(record); await updateRequest; });
    await waitFor(() => expect(screen.getByLabelText("孩子").disabled).toBe(false));
  }, 20000);
});
