# Capacity Overview & Task Economy Fields — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the parent see, **on the same screen where they create/edit tasks**, how every reward's estimated time-to-reach changes under three effort scenarios (基础 / 现实80% / 满分100%) — recomputed automatically whenever a task is added, edited, or removed. No tab switching.

**Architecture:** Add two fields to the task model (`weeklyDays`, `core`) that the existing admin routes already pass through (they spread `req.body`). Add a pure domain module that computes weekly earning capacity and an ETA helper. Expose one new parent endpoint `GET /api/admin/capacity` that joins capacity with rewards. The capacity overview is a **reusable panel** placed beside the task admin in a responsive split: stacked vertically in portrait, two columns in landscape.

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
server/src/domain/capacity.js      CREATE  taskWeekly(), capacity(tasks), etaWeeks()
server/test/capacity.test.js       CREATE  domain unit tests
server/src/seed.js                 MODIFY  seed tasks gain weeklyDays + core defaults
server/src/routes/parent.routes.js MODIFY  add GET /api/admin/capacity
server/test/routes.test.js         MODIFY  assert capacity endpoint shape
web/src/api.js                     MODIFY  add api.capacity()
web/src/components/CapacityPanel.jsx CREATE  reusable overview (3 numbers + reward table), refetches on reloadKey
web/src/pages/ParentTasksAdmin.jsx MODIFY  add weeklyDays + core inputs; show on rows; onChanged callback
web/src/pages/ParentTasks.jsx      CREATE  responsive split: task admin + live capacity panel
web/src/pages/ParentHome.jsx       MODIFY  任务 section renders ParentTasks; remove standalone 产能; widen container
web/src/theme.css                  MODIFY  .hs-split responsive (portrait stacked / landscape side-by-side)
```

**Layout requirement:** capacity is shown next to task create/edit so ETA changes are visible without switching tabs. `.hs-split` stacks vertically in portrait (scroll up/down) and becomes two columns in landscape (task admin left, capacity right).

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

## Task 4: API client + reusable CapacityPanel

**Files:**
- Modify: `web/src/api.js`
- Create: `web/src/components/CapacityPanel.jsx`

- [ ] **Step 1: Add to `web/src/api.js`** the capacity call (inside the `api` object, e.g. after `logs`):

```js
  capacity: () => req("GET", "/api/admin/capacity"),
```

- [ ] **Step 2: Create `web/src/components/CapacityPanel.jsx`**

The panel refetches whenever its `reloadKey` prop changes, so the parent screen can bump the key after each task add/delete.

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

function Eta({ weeks }) {
  if (weeks == null) return <span style={{ color: "var(--ink-soft)" }}>—</span>;
  const days = Math.round(weeks * 7);
  return <span>{weeks} 周<span style={{ color: "var(--ink-soft)", fontSize: 11 }}>（约{days}天）</span></span>;
}

export default function CapacityPanel({ reloadKey }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.capacity().then(setData); }, [reloadKey]);

  if (!data) return <p style={{ color: "var(--ink-soft)" }}>加载中…</p>;
  const { capacity: cap, rewards } = data;

  const Metric = ({ label, value }) => (
    <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>分/周</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Metric label="基础（核心）" value={cap.base} />
        <Metric label="现实 80%" value={cap.realistic} />
        <Metric label="满分 100%" value={cap.max} />
      </div>

      {cap.base === 0 && (
        <div style={{ background: "#fff4d6", color: "#8a6a10", padding: 8, borderRadius: 10, marginBottom: 10, fontSize: 13 }}>
          还没有标记“核心”的任务，基础场景显示 —。勾选任务的“核心”即可。
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
    </div>
  );
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/src/api.js web/src/components/CapacityPanel.jsx
git commit -m "feat(web): reusable CapacityPanel with three-scenario reward ETAs"
```

---

## Task 5: Task admin — fields + onChanged callback

**Files:**
- Modify: `web/src/pages/ParentTasksAdmin.jsx`

- [ ] **Step 1: Update the component signature** to accept `onChanged` (default no-op):

```jsx
export default function ParentTasksAdmin({ onChanged = () => {} }) {
```

- [ ] **Step 2: Update the `EMPTY` form default**:

```js
const EMPTY = { name: "", emoji: "⭐", points: 5, dailyLimit: 1, weeklyDays: 7, core: false, enabled: true };
```

- [ ] **Step 3: Update `add` and `remove` to send new fields and notify the parent**:

```js
  const add = async () => {
    if (!form.name) return;
    await api.adminCreate("tasks", {
      ...form,
      points: Number(form.points),
      dailyLimit: Number(form.dailyLimit),
      weeklyDays: Number(form.weeklyDays),
    });
    setForm(EMPTY); reload(); onChanged();
  };
  const remove = async (id) => { await api.adminDelete("tasks", id); reload(); onChanged(); };
```

- [ ] **Step 4: Add the two inputs to the create form** (inside the `<div className="panel" ...>`, after the 每日上限 input and before the 添加 button):

```jsx
        <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>每周可做天数（作业类填 5）</label>
        <input type="number" min="1" max="7" placeholder="每周可做天数" value={form.weeklyDays} onChange={(e) => setForm({ ...form, weeklyDays: e.target.value })} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={form.core} onChange={(e) => setForm({ ...form, core: e.target.checked })} />
          核心任务（计入“基础”产能）
        </label>
```

- [ ] **Step 5: Show the flags on each task row** — update the per-task row's detail span:

```jsx
          <span style={{ color: "var(--ink-soft)" }}>★{t.points} · {t.dailyLimit}/天 · {t.weeklyDays ?? 7}天/周{t.core ? " · 核心" : ""}</span>
```

- [ ] **Step 6: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add web/src/pages/ParentTasksAdmin.jsx
git commit -m "feat(web): task admin sets weeklyDays/core and notifies on change"
```

---

## Task 6: Responsive split layout (task admin + live capacity)

**Files:**
- Modify: `web/src/theme.css`
- Create: `web/src/pages/ParentTasks.jsx`
- Modify: `web/src/pages/ParentHome.jsx`

- [ ] **Step 1: Add the responsive split rule to `web/src/theme.css`** (append at end)

```css
.hs-split { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
.hs-split > div { min-width: 0; }
@media (orientation: landscape) and (min-width: 760px) {
  .hs-split { grid-template-columns: 1fr 1fr; }
}
.hs-col-title { font-size: 16px; font-weight: 500; margin: 0 0 10px; }
```

- [ ] **Step 2: Create `web/src/pages/ParentTasks.jsx`** (the combined screen; bumps `reloadKey` when tasks change so the panel refetches)

```jsx
import React, { useState } from "react";
import ParentTasksAdmin from "./ParentTasksAdmin.jsx";
import CapacityPanel from "../components/CapacityPanel.jsx";

export default function ParentTasks() {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div className="hs-split">
      <div>
        <h3 className="hs-col-title">任务管理</h3>
        <ParentTasksAdmin onChanged={() => setReloadKey((k) => k + 1)} />
      </div>
      <div>
        <h3 className="hs-col-title">产能总览</h3>
        <CapacityPanel reloadKey={reloadKey} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into `web/src/pages/ParentHome.jsx`**

Replace the `ParentTasksAdmin` import with `ParentTasks`:

```jsx
import ParentTasks from "./ParentTasks.jsx";
```

Remove the now-unused `ParentCapacity` import if a previous draft added one (there should be none — `CapacityPanel` is only used inside `ParentTasks`).

In `SECTIONS`, keep the existing entries (no separate 产能 entry — capacity now lives inside 任务). The array stays:

```jsx
const SECTIONS = [
  ["approvals", "待审批"], ["tasks", "任务"], ["rewards", "奖励"],
  ["adjust", "加分"], ["pins", "PIN"], ["logs", "日志"],
];
```

Change the tasks render line from `<ParentTasksAdmin />` to:

```jsx
      {sec === "tasks" && <ParentTasks />}
```

Widen the page container so two columns have room — change the outer wrapper's `maxWidth` from `520` to `880`:

```jsx
    <div style={{ maxWidth: 880, margin: "0 auto", padding: 12 }}>
```

- [ ] **Step 4: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds with no unresolved imports.

- [ ] **Step 5: Commit**

```bash
git add web/src/theme.css web/src/pages/ParentTasks.jsx web/src/pages/ParentHome.jsx
git commit -m "feat(web): task admin and capacity side-by-side (responsive split)"
```

---

## Task 7: Visual verification (executor self-check)

**Files:** none.

- [ ] **Step 1: Full build** — Run: `npm run build` (expect `web/dist`).
- [ ] **Step 2: Start preview** — `preview_start` name `happy-star`.
- [ ] **Step 3: Log in as 家长 (`0000`), open 任务**. Confirm task admin and 产能总览 appear together (one screen). With seed tasks (作业 10×1×5=50 core, 阅读 2×2×7=28 core, 打扫 6×1×7=42, 帮助 3×2×7=42): 基础 = **78**, 满分 = **162**, 现实 = round(162×0.8) = **130**. A reward priced 480 shows ≈6.2周(基础) / ≈3.7周(80%) / ≈3.0周(满分).
- [ ] **Step 4: Add a task** (跳绳, 5分, 上限1, 7天 → 35分/周, 非核心) and confirm the right-hand 满分 jumps from 162 to 197 and ETAs shorten **without leaving the page**. Delete it and confirm it reverts.
- [ ] **Step 5: Add a core task vs a non-core task** and confirm 基础 changes only when 核心 is checked, while 满分 changes either way.
- [ ] **Step 6: Check responsive layout** — use `preview_resize` (or the MCP's viewport control) to a landscape width (e.g. 1024×720): the two panels sit side-by-side. At a portrait width (e.g. 420×860): they stack, task admin on top, capacity below (scroll to see).
- [ ] **Step 7: Run full suite** — `npm test` (backend all PASS incl. capacity; frontend 2 PASS).
- [ ] **Step 8: Stop preview** (`preview_stop`). Commit any fixes.

```bash
git add -A
git commit -m "test: capacity overview + responsive split verification"
```

---

## Self-Review notes

- "任务创建时直接看到产能总览、不来回切换" → Task 6 puts `ParentTasksAdmin` and `CapacityPanel` in one `.hs-split` screen; Task 5's `onChanged` bumps `reloadKey` so the panel refetches on every add/delete (Task 7 step 4 verifies live update).
- "竖屏上下、横屏左右" → Task 6 `.hs-split` CSS: 1 column by default (portrait), 2 columns under `(orientation: landscape) and (min-width: 760px)`; Task 7 step 6 verifies both.
- "基础 / 80% / 100% 三档" → `capacity()` returns `{ base, realistic, max }` (Task 1); panel shows all three (Task 4).
- "基础 = 只算核心任务" → `core` flag (Task 2 seed, Task 5 admin input, Task 1 `base` filter).
- "每周可做天数" → `weeklyDays` field (Task 2 seed, Task 5 admin input, Task 1 `taskWeekly`).
- Backward-compat: domain defaults `weeklyDays ?? 7`, `core ?? false`; pre-existing data computes (older tasks count 0 toward 基础 until re-marked) — covered by Task 1's defaults test.
- Admin create/update need no route change: existing handlers spread `req.body`, so `weeklyDays`/`core` persist automatically (Task 5 relies on this).
- Type consistency: endpoint returns `{ capacity: { base, realistic, max }, rewards: [{ id, name, emoji, category, cost, etaBase, etaRealistic, etaMax }] }`; `CapacityPanel` consumes exactly these names; `etaWeeks` returns a number or `null`, rendered as "—" by `<Eta>`. `ParentTasksAdmin` gains prop `onChanged`; `ParentTasks` supplies it and owns `reloadKey`; `CapacityPanel` consumes `reloadKey`.

Reviewer focus: confirm the capacity panel updates immediately after add/delete (no manual refresh); confirm portrait stacks / landscape splits; confirm 基础 excludes non-core and disabled tasks; confirm an unreachable-under-基础 reward (base=0) shows "—" not Infinity/NaN; confirm the wider 880 container didn't visually break the other parent sections (approvals/logs/etc.).
