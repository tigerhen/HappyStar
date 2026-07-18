import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Login from "../src/pages/Login.jsx";

const mocked = vi.hoisted(() => ({
  children: vi.fn(),
  login: vi.fn(),
}));

vi.mock("../src/api.js", () => ({ api: mocked }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocked.children.mockResolvedValue([]);
});

describe("Login", () => {
  it("uses the illustrated couple avatar throughout the parent login flow", async () => {
    const { container } = render(<Login onLogin={vi.fn()} />);
    const parentButton = await screen.findByRole("button", { name: /家长/ });
    expect(parentButton.querySelector('img[src="/avatars/parents.png"]')).toBeTruthy();

    fireEvent.click(parentButton);
    expect(container.querySelector('img[src="/avatars/parents.png"]')).toBeTruthy();
    expect(screen.getByRole("heading", { name: "家长" })).toBeTruthy();
  });
});
