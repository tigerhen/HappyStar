import { test, expect, vi } from "vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskRow from "../src/components/TaskRow.jsx";

afterEach(cleanup);

test("shows 打卡 button when not at limit and fires onComplete", () => {
  const onComplete = vi.fn();
  render(<TaskRow task={{ id: "t1", name: "完成作业", emoji: "📚", points: 10, dailyLimit: 1, doneToday: 0, atLimit: false }} onComplete={onComplete} flashTs={null} />);
  const btn = screen.getByRole("button", { name: "打卡" });
  fireEvent.click(btn);
  expect(onComplete).toHaveBeenCalledWith("t1");
});

test("shows completed check when atLimit and does not fire", () => {
  const onComplete = vi.fn();
  render(<TaskRow task={{ id: "t2", name: "刷牙", emoji: "🦷", points: 6, dailyLimit: 1, doneToday: 1, atLimit: true }} onComplete={onComplete} flashTs={null} />);
  expect(screen.queryByRole("button", { name: "打卡" })).toBeNull();
  expect(screen.getByText("✓")).toBeTruthy();
});
