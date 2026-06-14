import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.HAPPY_STAR_DATA = mkdtempSync(join(tmpdir(), "hs-routes-"));
const { seedIfEmpty } = await import("../src/seed.js");
const { buildApp } = await import("../src/app.js");
await seedIfEmpty();
const app = buildApp();

function cookieFrom(res) {
  return res.headers["set-cookie"];
}

test("parent login with correct PIN sets session cookie", async () => {
  const res = await app.inject({ method: "POST", url: "/api/login", payload: { role: "parent", pin: "0000" } });
  assert.equal(res.statusCode, 200);
  assert.ok(cookieFrom(res));
});

test("parent login with wrong PIN is rejected", async () => {
  const res = await app.inject({ method: "POST", url: "/api/login", payload: { role: "parent", pin: "9999" } });
  assert.equal(res.statusCode, 401);
});

test("child login requires valid childId + PIN", async () => {
  const res = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "haolin", pin: "0000" } });
  assert.equal(res.statusCode, 200);
});

test("/api/me reflects logged-in child", async () => {
  const login = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "haolin", pin: "0000" } });
  const cookie = login.headers["set-cookie"];
  const me = await app.inject({ method: "GET", url: "/api/me", headers: { cookie } });
  const body = me.json();
  assert.equal(body.role, "child");
  assert.equal(body.childId, "haolin");
  assert.equal(typeof body.balance, "number");
});

test("after teardown", () => {
  rmSync(process.env.HAPPY_STAR_DATA, { recursive: true, force: true });
});
