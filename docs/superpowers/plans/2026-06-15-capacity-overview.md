# Capacity Overview & Task Economy Fields — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the parent see, in one place, how every reward's estimated time-to-reach changes under three effort scenarios (基础 / 现实80% / 满分100%) — and have that overview recompute automatically when tasks are added, edited, or removed.

**Architecture:** Add two fields to the task model (`weeklyDays`, `core`) that the existing admin create/update routes already pass through (they spread `req.body`). Add a pure domain module that computes weekly earning capacity from the task set and an ETA helper. Expose one new parent endpoint `GET /api/admin/capacity` that joins capacity with rewards. Add a parent "产能总览" section and the two task-form fields.

**Tech Stack:** Node.js + Fastify, `node:test`; React + Vite, Vitest. No new dependencies. Verified with the Claude Preview MCP (`launch.json` config `happy-star`, port 8080).

**Economy model (agreed):**
- `taskWeekly = points × dailyLimit × weeklyDays`
- `WRP_max = Σ taskWeekly over enabled tasks`
- 三场景周产能：基础 = `Σ taskWeekly over enabled AND core` ；现实 = `round(WRP_max × 0.8)` ；满分 = `WRP_max`
- 每个奖励：`预计到手(周) = round(cost / 场景产能, 1位小数)`；产能为 0 时记 `null`（达不到）。

**Out of scope:** the 元→积分 pricing helper (separate future work); per-child actual-history analytics; changing points/redemption rules.

---

## File Structure

```
server/src/domain/capacity.js     CREATE  taskWeekly(), capacity(tasks), etaWeeks()
server/test/capacity.test.js      CREATE  domain unit tests
server/src/seed.js                MODIFY  seed tasks gain weeklyDays + core defaults
server/src/routes/parent.routes.js MODIFY  add GET /api/admin/capacity
server/test/routes.test.js        MODIFY  assert capacity endpoint shape
web/src/api.js                    MODIFY  add api.capacity()
web/src/pages/ParentCapacity.jsx  CREATE  overview page (3 numbers + reward table)
web/src/pages/ParentHome.jsx      MODIFY  add 产能 section
web/src/pages/ParentTasksAdmin.jsx MODIFY  add weeklyDays + core inputs; show on rows
```

**Conventions**
- Backend tests: `npm --prefix server test`. Frontend: `npm --prefix web test`. Build: `npm run build`.
- Commit after each task with the message shown.
- Domain must tolerate tasks missing the new fields: `weeklyDays ?? 7`, `core ?? false` (existing data files predate these fields).

---

## Task 1: Capacity domain (pure functions, TDD)

**Files:**
- Create: `server/src/domain/capacity.js`
- Test: `server/test/capacity.test.js`

- [ ] **Step 1: Write the failing test `server/test/capacity.test.js`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { taskWeekly, capacity, etaWeeks } from "../src/domain/capacity.js";

test("taskWeekly multiplies points × dailyLimit × weeklyDays", () => {
  assert.equal(taskWeekly({ points: 10, dailyLimit: 1, weeklyDays: 5 }), 50);
  assert.equal(taskWeekly({ points: 2, dailyLimit: 2, weeklyDays: 7 }), 28);
});

test("taskWeekly defaults weeklyDays to 7 when missing", () => {
  assert.equal(taskWeekly({ points: 3, dailyLimit: 1 }), 21);
});

test("capacity computes base (core only), realistic (80%), max", () => {
  const tasks = [
    { points: 10, dailyLimit: 1, weeklyDays: 5, core: true, enabled: true },  // 50
    { points: 2, dailyLimit: 2, weeklyDays: 7, core: false, enabled: true },  // 28
    { points: 6, dailyLimit: 1, weeklyDays: 7, core: false, enabled: true },  // 42
    { points: 99, dailyLimit: 1, weeklyDays: 7, core: true, enabled: false }, // disabled -> ignored
  ];
  const cap = capacity(tasks);
  assert.equal(cap.max, 120);          // 50 + 28 + 42
  assert.equal(cap.base, 50);          // only enabled core
  assert.equal(cap.realistic, 96);     // round(120 * 0.8)
});

test("etaWeeks divides cost by weekly rate, 1 decimal", () => {
  assert.equal(etaWeeks(480, 120), 4);
  assert.equal(etaWeeks(480, 146), 3.3);
});

test("etaWeeks returns null when rate is 0 or missing", () => {
  assert.equal(etaWeeks(480, 0), null);
  assert.equal(etaWeeks(480, undefined), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — cannot find module `../src/domain/capacity.js`.

- [ ] **Step 3: Write `server/src/domain/capacity.js`**

```js
export function taskWeekly(task) {
  const days = task.weeklyDays ?? 7;
  return (task.points || 0) * (task.dailyLimit || 0) * days;
}

export function capacity(tasks) {
  const enabled = tasks.filter((t) => t.enabled);
  const max = enabled.reduce((sum, t) => sum + taskWeekly(t), 0);
  const base = enabled
    .filter((t) => t.core)
    .reduce((sum, t) => sum + taskWeekly(t), 0);
  return { base, realistic: Math.round(max * 0.8), max };
}

export function etaWeeks(cost, weeklyRate) {
  if (!weeklyRate || weeklyRate <= 0) return null;
  return Math.round((cost / weeklyRate) * 10) / 10;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/domain/capacity.js server/test/capacity.test.js
git commit -m "feat(server): capacity domain (weekly earning + reward ETA)"
```

---

## Task 2: Seed tasks get `weeklyDays` + `core` defaults

**Files:**
- Modify: `server/src/seed.js`

- [ ] **Step 1: Update the tasks block in `server/src/seed.js`**

Replace the `writeCollection("tasks", [...])` array with the version below (adds `weeklyDays` and `core`; 完成作业 and 主动阅读 marked core, homework is weekdays-only):

```js
    await writeCollection("tasks", [
      { id: "t_homework", name: "完成作业", emoji: "📚", points: 10, dailyLimit: 1, weeklyDays: 5, core: true, enabled: true },
      { id: "t_read", name: "主动阅读", emoji: "📖", points: 2, dailyLimit: 2, weeklyDays: 7, core: true, enabled: true },
      { id: "t_clean", name: "打扫卫生", emoji: "🧹", points: 6, dailyLimit: 1, weeklyDays: 7, core: false, enabled: true },
      { id: "t_help", name: "主动帮助他人", emoji: "💗", points: 3, dailyLimit: 2, weeklyDays: 7, core: false, enabled: true },
    ]);
```

- [ ] **Step 2: Verify it loads and re-seeds cleanly**

Run: `rm -rf /tmp/hs-seedcheck && HAPPY_STAR_DATA=/tmp/hs-seedcheck node -e "import('./server/src/seed.js').then(async m=>{await m.seedIfEmpty();const {readCollection}=await import('./server/src/store.js');console.log((await readCollection('tasks',[]))[0])})"`
Expected: prints the `完成作业` object including `weeklyDays: 5` and `core: true`.

- [ ] **Step 3: Run backend tests (unchanged count)**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/src/seed.js
git commit -m "feat(server): seed tasks with weeklyDays and core flags"
```

---

## Task 3: `GET /api/admin/capacity` endpoint

**Files:**
- Modify: `server/src/routes/parent.routes.js`
- Modify: `server/test/routes.test.js`

- [ ] **Step 1: Append a failing test to `server/test/routes.test.js`** (before the teardown test)

```js
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
  const login = await app.inject({ method: "POST", url: "/api/login", payload: { role: "child", childId: "haolin", pin: "0000" } });
  const cookie = login.headers["set-cookie"];
  const res = await app.inject({ method: "GET", url: "/api/admin/capacity", headers: { cookie } });
  assert.equal(res.statusCode, 403);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — 404 on `/api/admin/capacity`.

- [ ] **Step 3: Add the route in `server/src/routes/parent.routes.js`**

Add this import near the top (after the existing `approveRedemption` import):

```js
import { capacity, etaWeeks } from "../domain/capacity.js";
```

Add this handler inside `parentRoutes` (e.g., just before the `app.post("/api/admin/pin", ...)` handler):

```js
  app.get("/api/admin/capacity", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const [tasks, rewards] = await Promise.all([
      readCollection("tasks", []),
      readCollection("rewards", []),
    ]);
    const cap = capacity(tasks);
    const rows = rewards
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        category: r.category,
        cost: r.cost,
        etaBase: etaWeeks(r.cost, cap.base),
        etaRealistic: etaWeeks(r.cost, cap.realistic),
        etaMax: etaWeeks(r.cost, cap.max),
      }));
    return { capacity: cap, rewards: rows };
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/parent.routes.js server/test/routes.test.js
git commit -m "feat(server): GET /api/admin/capacity (scenarios + reward ETAs)"
```

---

## Task 4: API client + 产能总览 page + ParentHome wiring

**Files:**
- Modify: `web/src/api.js`
- Create: `web/src/pages/ParentCapacity.jsx`
- Modify: `web/src/pages/ParentHome.jsx`

- [ ] **Step 1: Add to `web/src/api.js`** the capacity call (inside the `api` object, e.g. after `logs`):

```js
  capacity: () => req("GET", "/api/admin/capacity"),
```

- [ ] **Step 2: Create `web/src/pages/ParentCapacity.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

function Eta({ weeks }) {
  if (weeks == null) return <span style={{ color: "var(--ink-soft)" }}>—</span>;
  const days = Math.round(weeks * 7);
  return <span>{weeks} 周<span style={{ color: "var(--ink-soft)", fontSize: 11 }}>（约{days}天）</span></span>;
}

export default function ParentCapacity() {
  const [data, setData] = useState(null);
  useEffect(() => { api.capacity().then(setData); }, []);

  if (!data) return <p style={{ color: "var(--ink-soft)" }}>加载中…</p>;
  const { capacity: cap, rewards } = data;

  const Metric = ({ label, value, hint }) => (
    <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{hint}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Metric label="基础（核心任务）" value={cap.base} hint="分/周" />
        <Metric label="现实 80%" value={cap.realistic} hint="分/周" />
        <Metric label="满分 100%" value={cap.max} hint="分/周" />
      </div>

      {cap.base === 0 && (
        <div style={{ background: "#fff4d6", color: "#8a6a10", padding: 8, borderRadius: 10, marginBottom: 10, fontSize: 13 }}>
          还没有标记“核心”的任务，基础场景无法估算（显示 —）。在「任务」页勾选核心任务即可。
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "var(--ink-soft)", textAlign: "left" }}>
            <th style={{ padding: "6px 4px" }}>奖励</th>
            <th style={{ padding: "6px 4px" }}>★</th>
            <th style={{ padding: "6px 4px" }}>基础</th>
            <th style={{ padding: "6px 4px" }}>80%</th>
            <th style={{ padding: "6px 4px" }}>满分</th>
          </tr>
        </thead>
        <tbody>
          {rewards.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ padding: "8px 4px" }}>{r.emoji} {r.name}</td>
              <td style={{ padding: "8px 4px" }}>{r.cost}</td>
              <td style={{ padding: "8px 4px" }}><Eta weeks={r.etaBase} /></td>
              <td style={{ padding: "8px 4px" }}><Eta weeks={r.etaRealistic} /></td>
              <td style={{ padding: "8px 4px" }}><Eta weeks={r.etaMax} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 10 }}>增删或修改任务后，回到本页即自动刷新。</p>
    </div>
  );
}
```

- [ ] **Step 3: Wire it into `web/src/pages/ParentHome.jsx`**

Add the import:

```jsx
import ParentCapacity from "./ParentCapacity.jsx";
```

Add `["capacity", "产能"]` to the `SECTIONS` array (e.g. right after `["approvals", "待审批"]`):

```jsx
const SECTIONS = [
  ["approvals", "待审批"], ["capacity", "产能"], ["tasks", "任务"], ["rewards", "奖励"],
  ["adjust", "加分"], ["pins", "PIN"], ["logs", "日志"],
];
```

Add the render line alongside the other `{sec === ... && <... />}` lines:

```jsx
      {sec === "capacity" && <ParentCapacity />}
```

- [ ] **Step 4: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add web/src/api.js web/src/pages/ParentCapacity.jsx web/src/pages/ParentHome.jsx
git commit -m "feat(web): 产能总览 page with three-scenario reward ETAs"
```

---

## Task 5: Task admin — `每周可做天数` + `核心` inputs

**Files:**
- Modify: `web/src/pages/ParentTasksAdmin.jsx`

- [ ] **Step 1: Update the `EMPTY` form default** in `web/src/pages/ParentTasksAdmin.jsx`:

```js
const EMPTY = { name: "", emoji: "⭐", points: 5, dailyLimit: 1, weeklyDays: 7, core: false, enabled: true };
```

- [ ] **Step 2: Add the two inputs to the create form** (inside the `<div className="panel" ...>`, after the 每日上限 input and before the 添加 button):

```jsx
        <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>每周可做天数（作业类填 5）</label>
        <input type="number" min="1" max="7" placeholder="每周可做天数" value={form.weeklyDays} onChange={(e) => setForm({ ...form, weeklyDays: e.target.value })} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={form.core} onChange={(e) => setForm({ ...form, core: e.target.checked })} />
          核心任务（计入“基础”产能）
        </label>
```

- [ ] **Step 3: Include the new fields when creating** — update the `add` function's `adminCreate` call:

```js
  const add = async () => {
    if (!form.name) return;
    await api.adminCreate("tasks", {
      ...form,
      points: Number(form.points),
      dailyLimit: Number(form.dailyLimit),
      weeklyDays: Number(form.weeklyDays),
    });
    setForm(EMPTY); reload();
  };
```

- [ ] **Step 4: Show the flags on each task row** — update the per-task row's detail span:

```jsx
          <span style={{ color: "var(--ink-soft)" }}>★{t.points} · {t.dailyLimit}/天 · {t.weeklyDays ?? 7}天/周{t.core ? " · 核心" : ""}</span>
```

- [ ] **Step 5: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add web/src/pages/ParentTasksAdmin.jsx
git commit -m "feat(web): task admin sets weeklyDays and core flag"
```

---

## Task 6: Visual verification (executor self-check)

**Files:** none.

- [ ] **Step 1: Full build** — Run: `npm run build` (expect `web/dist`).
- [ ] **Step 2: Start preview** — `preview_start` name `happy-star`.
- [ ] **Step 3: Log in as 家长 (`0000`), open 产能**. Confirm:
  - Three metrics show 基础 / 现实80% / 满分100% as 分/周. With seed tasks (作业 10×1×5=50 core, 阅读 2×2×7=28 core, 打扫 6×1×7=42, 帮助 3×2×7=42): base = 50 + 28 = **78**, max = 50 + 28 + 42 + 42 = **162**, realistic = round(162×0.8) = **130**.
  - Reward table lists each reward with three ETA columns; a reward priced 480 shows ≈6.2周(基础) / ≈3.7周(80%) / ≈3.0周(满分).
- [ ] **Step 4: Open 任务, add a task** (e.g. 跳绳, 5分, 上限1, 7天, 非核心 → 35分/周), then return to 产能 — confirm 满分 rose from 162 to 197 and ETAs shortened. Delete it and confirm it reverts.
- [ ] **Step 5: Toggle a core task off** (create one without 核心 vs with) and confirm 基础 changes while 满分 stays.
- [ ] **Step 6: Run full suite** — `npm test` (backend all PASS incl. capacity; frontend 2 PASS).
- [ ] **Step 7: Stop preview** (`preview_stop`). Commit any fixes.

```bash
git add -A
git commit -m "test: capacity overview visual verification"
```

---

## Self-Review notes

- Requirement "增删任务能总览奖励预计到手变化" → Task 3 endpoint recomputes from live `tasks.json`; Task 4 page re-fetches on mount; Task 6 step 4 verifies add/delete shifts it.
- Requirement "基础 / 80% / 100% 三档" → `capacity()` returns `{ base, realistic, max }` (Task 1); page shows all three (Task 4).
- "基础 = 只算核心任务" → `core` flag (Task 2 seed, Task 5 admin input, Task 1 `base` filter).
- "每周可做天数" → `weeklyDays` field (Task 2 seed, Task 5 admin input, Task 1 `taskWeekly`).
- Backward-compat: domain defaults `weeklyDays ?? 7`, `core ?? false`, so pre-existing data files without these fields still compute (older tasks contribute 0 to 基础 until re-marked) — verified by Task 1's "defaults weeklyDays" test.
- Admin create/update need no route change: existing handlers spread `req.body`, so `weeklyDays`/`core` persist automatically (Task 5 relies on this).
- Type consistency: endpoint returns `{ capacity: { base, realistic, max }, rewards: [{ id, name, emoji, category, cost, etaBase, etaRealistic, etaMax }] }`; `ParentCapacity` consumes exactly these names; `etaWeeks` returns a number or `null`, and `<Eta>` renders `null` as "—".

Reviewer focus: confirm 基础 excludes non-core and disabled tasks; confirm ETA columns update after task add/delete without a manual refresh beyond re-entering the 产能 tab; confirm a reward unreachable under 基础 (base=0) shows "—" rather than Infinity/NaN.
