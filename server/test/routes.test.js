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
  assert.equal(target.childName, "王颢霖");
  assert.ok(target.rewardName);

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

test("parent capacity endpoint returns three scenarios and reward ETAs", async () => {
  const cookie = await parentCookie();
  const res = await app.inject({ method: "GET", url: "/api/admin/capacity", headers: { cookie } });
  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(typeof body.capacity.max, "number");
  assert.equal(typeof body.capacity.base, "number");
  assert.equal(typeof body.capacity.realistic, "number");
  assert.ok(Array.isArray(body.rewards));
  if (body.rewards.length > 0) {
    const r = body.rewards[0];
    assert.ok("etaBase" in r && "etaRealistic" in r && "etaMax" in r);
    assert.equal(typeof r.cost, "number");
  }
});

test("child cannot reach capacity endpoint", async () => {
  const login = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "zhongxian", pin: "0000" } });
  const cookie = login.headers["set-cookie"];
  const res = await app.inject({ method: "GET", url: "/api/admin/capacity", headers: { cookie } });
  assert.equal(res.statusCode, 403);
});

test("child only sees own growth plans and can persist bounded progress without points", async () => {
  const login = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "zhongxian", pin: "0000" } });
  const cookie = login.headers["set-cookie"];
  const beforeMe = await app.inject({ method: "GET", url: "/api/me", headers: { cookie } });
  const beforeBalance = beforeMe.json().balance;

  const list = await app.inject({ method: "GET", url: "/api/growth-plans", headers: { cookie } });
  assert.equal(list.statusCode, 200);
  assert.ok(list.json().length > 0);
  assert.ok(list.json().every((plan) => plan.childId === "zhongxian"));

  const plan = list.json()[0];
  const item = plan.groups[0].items[0];
  const changed = await app.inject({
    method: "PATCH",
    url: `/api/growth-plans/${plan.id}/items/${item.id}/progress`,
    headers: { cookie },
    payload: { delta: 1 },
  });
  assert.equal(changed.statusCode, 200);
  const updated = changed.json().groups[0].items.find((row) => row.id === item.id);
  assert.equal(updated.completed, Math.min(item.target, item.completed + 1));

  const afterMe = await app.inject({ method: "GET", url: "/api/me", headers: { cookie } });
  assert.equal(afterMe.json().balance, beforeBalance);

  const foreign = await app.inject({ method: "GET", url: "/api/growth-plans/gp_summer_2026_haolin", headers: { cookie } });
  assert.equal(foreign.statusCode, 404);
});

test("parent can list all growth plans and update a deliverable", async () => {
  const cookie = await parentCookie();
  const list = await app.inject({ method: "GET", url: "/api/admin/growth-plans", headers: { cookie } });
  assert.equal(list.statusCode, 200);
  assert.ok(list.json().some((plan) => plan.childId === "haolin"));
  assert.ok(list.json().some((plan) => plan.childId === "zhongxian"));
  const plan = list.json().find((row) => row.deliverables.length);
  const deliverable = plan.deliverables[0];
  const changed = await app.inject({
    method: "PATCH",
    url: `/api/admin/growth-plans/${plan.id}/deliverables/${deliverable.id}`,
    headers: { cookie },
    payload: { done: !deliverable.done },
  });
  assert.equal(changed.statusCode, 200);
  assert.equal(changed.json().deliverables[0].done, !deliverable.done);
});

test("parent settles a completed growth plan exactly once", async () => {
  const cookie = await parentCookie();
  const list = await app.inject({ method: "GET", url: "/api/admin/growth-plans", headers: { cookie } });
  const source = list.json().find((plan) => plan.childId === "zhongxian");
  const early = await app.inject({ method: "POST", url: `/api/admin/growth-plans/${source.id}/settle`, headers: { cookie } });
  assert.equal(early.statusCode, 409);
  assert.equal(early.json().error, "plan_incomplete");

  const completed = {
    ...source,
    groups: source.groups.map((group) => ({ ...group, items: group.items.map((item) => ({
      ...item,
      completed: item.optional ? 0 : item.target,
      completionDates: item.optional ? [] : Array(item.target).fill("2026-07-01T04:00:00.000Z"),
    })) })),
    deliverables: source.deliverables.map((item) => ({ ...item, done: true, completedAt: "2026-07-01T04:00:00.000Z" })),
  };
  const saved = await app.inject({ method: "PUT", url: `/api/admin/growth-plans/${source.id}`, headers: { cookie }, payload: completed });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().settlement.ready, true);

  const childLogin = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "zhongxian", pin: "0000" } });
  const childCookie = childLogin.headers["set-cookie"];
  const before = (await app.inject({ method: "GET", url: "/api/me", headers: { cookie: childCookie } })).json().balance;
  const settled = await app.inject({ method: "POST", url: `/api/admin/growth-plans/${source.id}/settle`, headers: { cookie } });
  assert.equal(settled.statusCode, 200);
  assert.equal(settled.json().points, 500);
  const after = (await app.inject({ method: "GET", url: "/api/me", headers: { cookie: childCookie } })).json().balance;
  assert.equal(after, before + 500);

  const duplicate = await app.inject({ method: "POST", url: `/api/admin/growth-plans/${source.id}/settle`, headers: { cookie } });
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.json().error, "plan_already_settled");
  const events = (await app.inject({ method: "GET", url: "/api/logs?childId=zhongxian", headers: { cookie } })).json();
  assert.equal(events.filter((event) => event.refId === source.id && event.type === "adjust").length, 1);
});

test("parent manages measurements while child only reads own records", async () => {
  const cookie = await parentCookie();
  const first = await app.inject({ method: "POST", url: "/api/admin/measurements", headers: { cookie }, payload: {
    childId: "zhongxian", date: "2026-01-18", heightCm: 128.5, weightKg: 27.3, note: "首次",
  } });
  assert.equal(first.statusCode, 200);
  assert.ok(first.json().id.startsWith("m_"));

  const duplicate = await app.inject({ method: "POST", url: "/api/admin/measurements", headers: { cookie }, payload: {
    childId: "zhongxian", date: "2026-01-18", heightCm: 129, weightKg: 28,
  } });
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.json().error, "measurement_date_exists");

  const other = await app.inject({ method: "POST", url: "/api/admin/measurements", headers: { cookie }, payload: {
    childId: "haolin", date: "2026-01-18", heightCm: 145, weightKg: 36,
  } });
  assert.equal(other.statusCode, 200);

  const updated = await app.inject({ method: "PUT", url: `/api/admin/measurements/${first.json().id}`, headers: { cookie }, payload: {
    date: "2026-04-18", heightCm: 130.2, weightKg: 28.1, note: "复测",
  } });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().heightCm, 130.2);

  const childLogin = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "zhongxian", pin: "0000" } });
  const childCookie = childLogin.headers["set-cookie"];
  const childList = await app.inject({ method: "GET", url: "/api/measurements", headers: { cookie: childCookie } });
  assert.equal(childList.statusCode, 200);
  assert.equal(childList.json().records.length, 1);
  assert.ok(childList.json().records.every((row) => row.childId === "zhongxian"));
  assert.equal(childList.json().summary.latest.date, "2026-04-18");

  const forbidden = await app.inject({ method: "POST", url: "/api/admin/measurements", headers: { cookie: childCookie }, payload: {
    childId: "zhongxian", date: "2026-07-18", heightCm: 131, weightKg: 29,
  } });
  assert.equal(forbidden.statusCode, 403);

  const removed = await app.inject({ method: "DELETE", url: `/api/admin/measurements/${first.json().id}`, headers: { cookie } });
  assert.equal(removed.statusCode, 200);
});

test("concurrent measurement requests preserve records and date uniqueness", async () => {
  const cookie = await parentCookie();
  const create = (date, heightCm) => app.inject({
    method: "POST", url: "/api/admin/measurements", headers: { cookie },
    payload: { childId: "zhongxian", date, heightCm, weightKg: 29 },
  });

  const distinct = await Promise.all([
    create("2026-05-01", 130.1),
    create("2026-06-01", 130.8),
  ]);
  assert.deepEqual(distinct.map((response) => response.statusCode), [200, 200]);

  const duplicate = await Promise.all([
    create("2026-07-01", 131.2),
    create("2026-07-01", 131.3),
  ]);
  assert.deepEqual(duplicate.map((response) => response.statusCode).sort(), [200, 409]);

  const list = await app.inject({ method: "GET", url: "/api/admin/measurements?childId=zhongxian", headers: { cookie } });
  assert.deepEqual(list.json().records.map((row) => row.date), ["2026-05-01", "2026-06-01", "2026-07-01"]);
});

test("measurement routes preserve a missing metric as null", async () => {
  const cookie = await parentCookie();
  const created = await app.inject({ method: "POST", url: "/api/admin/measurements", headers: { cookie }, payload: {
    childId: "haolin", date: "2025-02-17", heightCm: 137, weightKg: null,
  } });
  assert.equal(created.statusCode, 200);
  assert.equal(created.json().heightCm, 137);
  assert.equal(created.json().weightKg, null);

  const updated = await app.inject({ method: "PUT", url: `/api/admin/measurements/${created.json().id}`, headers: { cookie }, payload: {
    date: "2025-02-17", heightCm: null, weightKg: 40.65,
  } });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().heightCm, null);
  assert.equal(updated.json().weightKg, 40.65);

  const empty = await app.inject({ method: "POST", url: "/api/admin/measurements", headers: { cookie }, payload: {
    childId: "haolin", date: "2025-05-23", heightCm: null, weightKg: null,
  } });
  assert.equal(empty.statusCode, 400);
  assert.equal(empty.json().error, "measurement_value_required");

  const childLogin = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "haolin", pin: "4321" } });
  const childList = await app.inject({ method: "GET", url: "/api/measurements", headers: { cookie: childLogin.headers["set-cookie"] } });
  const imported = childList.json().records.find((row) => row.date === "2025-02-17");
  assert.equal(imported.heightCm, null);
  assert.equal(imported.weightKg, 40.65);
});

test("after teardown", () => {
  rmSync(process.env.HAPPY_STAR_DATA, { recursive: true, force: true });
});
