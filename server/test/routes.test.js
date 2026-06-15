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
  assert.equal(body.name, "王颢霖");
  assert.equal(body.emoji, "👧");
  assert.equal(body.color, "pink");
});

test("child sees task view and can complete within daily limit", async () => {
  const login = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "haolin", pin: "0000" } });
  const cookie = login.headers["set-cookie"];

  const list = await app.inject({ method: "GET", url: "/api/tasks", headers: { cookie } });
  const tasks = list.json();
  assert.ok(tasks.length > 0);

  const done = await app.inject({ method: "POST", url: "/api/tasks/t_homework/complete", headers: { cookie } });
  assert.equal(done.statusCode, 200);
  assert.equal(done.json().balance, 10);
});

test("completing past the daily limit is rejected", async () => {
  const login = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "zhongxian", pin: "0000" } });
  const cookie = login.headers["set-cookie"];
  await app.inject({ method: "POST", url: "/api/tasks/t_homework/complete", headers: { cookie } });
  const second = await app.inject({ method: "POST", url: "/api/tasks/t_homework/complete", headers: { cookie } });
  assert.equal(second.statusCode, 409);
  assert.equal(second.json().error, "daily_limit");
});

test("child can request a redemption (no deduction yet)", async () => {
  const login = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "haolin", pin: "0000" } });
  const cookie = login.headers["set-cookie"];
  const res = await app.inject({ method: "POST", url: "/api/rewards/r_icecream/redeem", headers: { cookie } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, "pending");
  const me = await app.inject({ method: "GET", url: "/api/me", headers: { cookie } });
  assert.equal(me.json().balance, 10); // unchanged by pending request
});

test("calendar returns aggregated month", async () => {
  const login = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "haolin", pin: "0000" } });
  const cookie = login.headers["set-cookie"];
  const res = await app.inject({ method: "GET", url: "/api/calendar?month=" + new Date().toISOString().slice(0,7), headers: { cookie } });
  assert.equal(res.statusCode, 200);
  assert.equal(typeof res.json(), "object");
});

async function parentCookie() {
  const res = await app.inject({ method: "POST", url: "/api/login", payload: { role: "parent", pin: "0000" } });
  return res.headers["set-cookie"];
}

test("parent lists pending redemptions and approves with deduction", async () => {
  const cookie = await parentCookie();
  // Pre-fund haolin: needs >= 60 to approve the r_icecream (cost 60) pending
  // request created in the earlier child-flow test. Setup fix for plan bug.
  await app.inject({ method: "POST", url: "/api/adjust", headers: { cookie }, payload: { childId: "haolin", delta: 50, note: "test setup" } });

  const list = await app.inject({ method: "GET", url: "/api/redemptions?status=pending", headers: { cookie } });
  const pending = list.json();
  assert.ok(pending.length >= 1);
  const target = pending.find((r) => r.childId === "haolin");

  const before = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "haolin", pin: "0000" } });
  const childCookie = before.headers["set-cookie"];
  const beforeBal = (await app.inject({ method: "GET", url: "/api/me", headers: { cookie: childCookie } })).json().balance;

  const ok = await app.inject({ method: "POST", url: `/api/redemptions/${target.id}/approve`, headers: { cookie } });
  assert.equal(ok.statusCode, 200);

  const afterBal = (await app.inject({ method: "GET", url: "/api/me", headers: { cookie: childCookie } })).json().balance;
  assert.equal(afterBal, beforeBal - target.cost);
});

test("parent manual adjust adds points", async () => {
  const cookie = await parentCookie();
  const res = await app.inject({ method: "POST", url: "/api/adjust", headers: { cookie }, payload: { childId: "zhongxian", delta: 5, note: "好样的" } });
  assert.equal(res.statusCode, 200);
});

test("parent creates a task via admin", async () => {
  const cookie = await parentCookie();
  const res = await app.inject({ method: "POST", url: "/api/admin/tasks", headers: { cookie }, payload: { name: "整理玩具", emoji: "🧸", points: 4, dailyLimit: 1, enabled: true } });
  assert.equal(res.statusCode, 200);
  assert.ok(res.json().id);
});

test("parent changes a child PIN", async () => {
  const cookie = await parentCookie();
  const res = await app.inject({ method: "POST", url: "/api/admin/pin", headers: { cookie }, payload: { role: "child", childId: "haolin", pin: "4321" } });
  assert.equal(res.statusCode, 200);
  const relog = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "haolin", pin: "4321" } });
  assert.equal(relog.statusCode, 200);
});

test("child cannot reach parent routes", async () => {
  const login = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "zhongxian", pin: "0000" } });
  const cookie = login.headers["set-cookie"];
  const res = await app.inject({ method: "GET", url: "/api/redemptions?status=pending", headers: { cookie } });
  assert.equal(res.statusCode, 403);
});

test("after teardown", () => {
  rmSync(process.env.HAPPY_STAR_DATA, { recursive: true, force: true });
});
