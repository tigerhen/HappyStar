# Happy Star Implementation Plan

> ✅ **已全部完成**（24 任务，commit `803b4e7`..`f40f8bb`，端到端 17 项冒烟全过；commit `d4195af` 标"已实现"）。本文件保留作为回溯参考；不要按字面重跑。代码与决策以 git history 与 `docs/superpowers/specs/2026-06-14-happy-star-design.md` 为准。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight family points system where two kids self-complete daily tasks to earn star points and request reward redemptions that a parent approves — all over the home LAN.

**Architecture:** A single Node.js process (Fastify) serves a built React SPA and a REST API. All data lives in plain JSON files under `data/` (no database), written atomically. Domain logic is pure functions over in-memory arrays, kept separate from the file I/O and HTTP layers so it can be unit-tested with the built-in `node:test` runner.

**Tech Stack:** Node.js (ESM), Fastify, `@fastify/static`, `@fastify/cookie`, `node:crypto` (scrypt PIN hashing), `node:test` (backend tests), React + Vite + react-router-dom (frontend), Vitest (frontend tests). systemd for autostart.

---

## File Structure

```
happy-star/
  package.json                 root: scripts orchestrating server + web
  server/
    package.json               server deps (fastify, plugins)
    src/
      paths.js                 resolves data dir + file paths
      store.js                 atomic JSON read/write per collection
      time.js                  dayKey() local-day helper
      domain/
        points.js              balance(events, childId)
        tasks.js               countTaskToday(), buildTaskView()
        redeem.js              makeRedemption(), approveRedemption()
        calendar.js            aggregateMonth()
      auth.js                  PIN hash/verify + in-memory sessions
      seed.js                  first-run data seeding
      app.js                   buildApp(): Fastify instance + plugins + routes
      index.js                 entrypoint: build + listen
      routes/
        auth.routes.js
        child.routes.js        tasks list/complete, rewards list/redeem, calendar, me
        parent.routes.js       redemptions, adjust, admin tasks/rewards/pin, logs
    test/
      store.test.js
      time.test.js
      points.test.js
      tasks.test.js
      redeem.test.js
      calendar.test.js
      auth.test.js
      routes.test.js
  web/
    package.json               react, vite, react-router-dom, vitest
    index.html
    vite.config.js
    src/
      main.jsx
      api.js                   fetch wrappers
      theme.css                tokens (neutral bg, yellow accent, star gold)
      App.jsx                  router + session bootstrap
      pages/
        Login.jsx
        ChildHome.jsx          tab shell: Tasks / Rewards / Calendar
        TasksTab.jsx
        RewardsTab.jsx
        CalendarTab.jsx
        ParentHome.jsx
        ParentApprovals.jsx
        ParentTasksAdmin.jsx
        ParentRewardsAdmin.jsx
        ParentAdjust.jsx
        ParentPins.jsx
        ParentLogs.jsx
      components/
        TaskRow.jsx
        RewardRow.jsx
        StarCount.jsx
        Confetti.jsx
    test/
      TaskRow.test.jsx
  deploy/
    happy-star.service
  data/                        runtime (gitignored)
```

**Conventions for the whole plan**
- Node ESM everywhere (`"type": "module"`).
- Run backend tests from `server/`: `npm test` → `node --test`.
- Run frontend tests from `web/`: `npm test` → `vitest run`.
- Commit after every task with the message shown.
- Money/points are integers. IDs are short strings (`crypto.randomUUID()` sliced, or stable slugs for seeds).
- Timezone: server local time (deploy VM is set to China time); day boundaries use local date.

---

## Task 1: Repo scaffold and root scripts

**Files:**
- Create: `package.json`
- Create: `server/package.json`
- Create: `web/package.json`
- Create: `.nvmrc`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "happy-star",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "install:all": "npm --prefix server install && npm --prefix web install",
    "build": "npm --prefix web run build",
    "start": "node server/src/index.js",
    "dev:server": "node --watch server/src/index.js",
    "dev:web": "npm --prefix web run dev",
    "test": "npm --prefix server test && npm --prefix web test"
  }
}
```

- [ ] **Step 2: Create `server/package.json`**

```json
{
  "name": "happy-star-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  },
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/static": "^7.0.4",
    "@fastify/cookie": "^9.3.1"
  }
}
```

- [ ] **Step 3: Create `web/package.json`**

```json
{
  "name": "happy-star-web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0",
    "vitest": "^2.0.5",
    "@testing-library/react": "^16.0.0",
    "jsdom": "^24.1.0"
  }
}
```

- [ ] **Step 4: Create `.nvmrc`**

```
20
```

- [ ] **Step 5: Install dependencies**

Run: `npm run install:all`
Expected: both `server/node_modules` and `web/node_modules` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json server/package.json web/package.json .nvmrc
git commit -m "chore: scaffold root, server, and web packages"
```

---

## Task 2: Paths and atomic JSON store

**Files:**
- Create: `server/src/paths.js`
- Create: `server/src/store.js`
- Test: `server/test/store.test.js`

- [ ] **Step 1: Write `server/src/paths.js`**

```js
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// server/src -> project root -> data
export const DATA_DIR = process.env.HAPPY_STAR_DATA || join(here, "..", "..", "data");

export const FILES = {
  config: "config.json",
  children: "children.json",
  tasks: "tasks.json",
  rewards: "rewards.json",
  events: "events.json",
  redemptions: "redemptions.json",
};

export function filePath(name) {
  return join(DATA_DIR, FILES[name]);
}
```

- [ ] **Step 2: Write the failing test `server/test/store.test.js`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.HAPPY_STAR_DATA = mkdtempSync(join(tmpdir(), "hs-store-"));
const { readCollection, writeCollection } = await import("../src/store.js");

test("readCollection returns default when file missing", async () => {
  assert.deepEqual(await readCollection("events", []), []);
});

test("writeCollection then readCollection round-trips", async () => {
  await writeCollection("tasks", [{ id: "t1", points: 5 }]);
  assert.deepEqual(await readCollection("tasks", []), [{ id: "t1", points: 5 }]);
});

test("write is atomic: no leftover temp file", async () => {
  await writeCollection("rewards", [{ id: "r1" }]);
  const { readdirSync } = await import("node:fs");
  const files = readdirSync(process.env.HAPPY_STAR_DATA);
  assert.equal(files.some((f) => f.endsWith(".tmp")), false);
});

rmSync(process.env.HAPPY_STAR_DATA, { recursive: true, force: true });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — cannot find module `../src/store.js`.

- [ ] **Step 4: Write `server/src/store.js`**

```js
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DATA_DIR, filePath } from "./paths.js";

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readCollection(name, fallback) {
  try {
    const raw = await readFile(filePath(name), "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

export async function writeCollection(name, data) {
  await ensureDir();
  const target = filePath(name);
  const tmp = `${target}.${process.pid}.tmp`;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, target);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS (3 store tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/paths.js server/src/store.js server/test/store.test.js
git commit -m "feat(server): atomic JSON collection store"
```

---

## Task 3: Local-day helper

**Files:**
- Create: `server/src/time.js`
- Test: `server/test/time.test.js`

- [ ] **Step 1: Write the failing test `server/test/time.test.js`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKey } from "../src/time.js";

test("dayKey formats local date as YYYY-MM-DD", () => {
  const d = new Date(2026, 5, 14, 9, 30); // local June 14 2026
  assert.equal(dayKey(d), "2026-06-14");
});

test("dayKey pads single-digit month and day", () => {
  const d = new Date(2026, 0, 3, 0, 0);
  assert.equal(dayKey(d), "2026-01-03");
});

test("dayKey accepts ISO string", () => {
  assert.equal(dayKey("2026-06-14T23:00:00").slice(0, 7), "2026-06");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — cannot find module `../src/time.js`.

- [ ] **Step 3: Write `server/src/time.js`**

```js
export function dayKey(input) {
  const d = input instanceof Date ? input : new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/time.js server/test/time.test.js
git commit -m "feat(server): local-day key helper"
```

---

## Task 4: Points balance (pure domain)

**Files:**
- Create: `server/src/domain/points.js`
- Test: `server/test/points.test.js`

- [ ] **Step 1: Write the failing test `server/test/points.test.js`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { balance } from "../src/domain/points.js";

const events = [
  { type: "task", childId: "haolin", delta: 10 },
  { type: "task", childId: "haolin", delta: 5 },
  { type: "redeem", childId: "haolin", delta: -8 },
  { type: "task", childId: "zhongxian", delta: 3 },
];

test("balance sums only the child's deltas", () => {
  assert.equal(balance(events, "haolin"), 7);
  assert.equal(balance(events, "zhongxian"), 3);
});

test("balance of unknown child is 0", () => {
  assert.equal(balance(events, "nobody"), 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — cannot find module `../src/domain/points.js`.

- [ ] **Step 3: Write `server/src/domain/points.js`**

```js
export function balance(events, childId) {
  return events
    .filter((e) => e.childId === childId)
    .reduce((sum, e) => sum + (e.delta || 0), 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/domain/points.js server/test/points.test.js
git commit -m "feat(server): point balance aggregation"
```

---

## Task 5: Task domain — daily count and view

**Files:**
- Create: `server/src/domain/tasks.js`
- Test: `server/test/tasks.test.js`

- [ ] **Step 1: Write the failing test `server/test/tasks.test.js`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { countTaskToday, buildTaskView } from "../src/domain/tasks.js";

const now = new Date(2026, 5, 14, 10, 0);
const events = [
  { type: "task", childId: "haolin", refId: "t_read", delta: 2, createdAt: new Date(2026, 5, 14, 8).toISOString() },
  { type: "task", childId: "haolin", refId: "t_read", delta: 2, createdAt: new Date(2026, 5, 13, 8).toISOString() },
  { type: "task", childId: "zhongxian", refId: "t_read", delta: 2, createdAt: new Date(2026, 5, 14, 9).toISOString() },
];

test("countTaskToday counts only same child + task + local day", () => {
  assert.equal(countTaskToday(events, "haolin", "t_read", now), 1);
  assert.equal(countTaskToday(events, "zhongxian", "t_read", now), 1);
});

test("buildTaskView marks done count and atLimit", () => {
  const tasks = [{ id: "t_read", name: "Read", points: 2, dailyLimit: 2, enabled: true }];
  const view = buildTaskView(tasks, events, "haolin", now);
  assert.equal(view[0].doneToday, 1);
  assert.equal(view[0].atLimit, false);
});

test("buildTaskView excludes disabled tasks", () => {
  const tasks = [{ id: "t_x", enabled: false, dailyLimit: 1, points: 1 }];
  assert.equal(buildTaskView(tasks, events, "haolin", now).length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — cannot find module `../src/domain/tasks.js`.

- [ ] **Step 3: Write `server/src/domain/tasks.js`**

```js
import { dayKey } from "../time.js";

export function countTaskToday(events, childId, taskId, now) {
  const today = dayKey(now);
  return events.filter(
    (e) =>
      e.type === "task" &&
      e.childId === childId &&
      e.refId === taskId &&
      dayKey(e.createdAt) === today
  ).length;
}

export function buildTaskView(tasks, events, childId, now) {
  return tasks
    .filter((t) => t.enabled)
    .map((t) => {
      const doneToday = countTaskToday(events, childId, t.id, now);
      return {
        id: t.id,
        name: t.name,
        emoji: t.emoji,
        points: t.points,
        dailyLimit: t.dailyLimit,
        doneToday,
        atLimit: doneToday >= t.dailyLimit,
      };
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/domain/tasks.js server/test/tasks.test.js
git commit -m "feat(server): task daily-count and view domain"
```

---

## Task 6: Redemption domain

**Files:**
- Create: `server/src/domain/redeem.js`
- Test: `server/test/redeem.test.js`

- [ ] **Step 1: Write the failing test `server/test/redeem.test.js`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRedemption, approveRedemption } from "../src/domain/redeem.js";

const reward = { id: "r_ice", name: "Ice cream", cost: 60, stock: null };
const now = new Date(2026, 5, 14, 18, 0);

test("makeRedemption creates a pending record with cost snapshot", () => {
  const rd = makeRedemption("haolin", reward, now);
  assert.equal(rd.status, "pending");
  assert.equal(rd.cost, 60);
  assert.equal(rd.childId, "haolin");
  assert.equal(rd.rewardId, "r_ice");
  assert.ok(rd.id);
});

test("approveRedemption succeeds when balance is enough", () => {
  const rd = makeRedemption("haolin", reward, now);
  const res = approveRedemption(rd, reward, 100, now);
  assert.equal(res.ok, true);
  assert.equal(res.event.delta, -60);
  assert.equal(res.event.type, "redeem");
  assert.equal(res.redemption.status, "approved");
  assert.equal(res.stockDelta, 0);
});

test("approveRedemption fails when balance is insufficient", () => {
  const rd = makeRedemption("haolin", reward, now);
  const res = approveRedemption(rd, reward, 30, now);
  assert.equal(res.ok, false);
  assert.equal(res.reason, "insufficient_balance");
});

test("approveRedemption decrements finite stock", () => {
  const limited = { id: "r_toy", cost: 10, stock: 2 };
  const rd = makeRedemption("haolin", limited, now);
  const res = approveRedemption(rd, limited, 50, now);
  assert.equal(res.stockDelta, -1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — cannot find module `../src/domain/redeem.js`.

- [ ] **Step 3: Write `server/src/domain/redeem.js`**

```js
import { randomUUID } from "node:crypto";

export function makeRedemption(childId, reward, now) {
  return {
    id: `rd_${randomUUID().slice(0, 8)}`,
    childId,
    rewardId: reward.id,
    cost: reward.cost,
    status: "pending",
    requestedAt: now.toISOString(),
    decidedAt: null,
    note: "",
  };
}

export function approveRedemption(redemption, reward, currentBalance, now) {
  if (currentBalance < redemption.cost) {
    return { ok: false, reason: "insufficient_balance" };
  }
  const event = {
    id: `e_${randomUUID().slice(0, 8)}`,
    type: "redeem",
    childId: redemption.childId,
    delta: -redemption.cost,
    refId: redemption.rewardId,
    note: "",
    createdAt: now.toISOString(),
  };
  return {
    ok: true,
    event,
    redemption: { ...redemption, status: "approved", decidedAt: now.toISOString() },
    stockDelta: typeof reward.stock === "number" ? -1 : 0,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/domain/redeem.js server/test/redeem.test.js
git commit -m "feat(server): redemption create/approve domain"
```

---

## Task 7: Calendar aggregation

**Files:**
- Create: `server/src/domain/calendar.js`
- Test: `server/test/calendar.test.js`

- [ ] **Step 1: Write the failing test `server/test/calendar.test.js`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateMonth } from "../src/domain/calendar.js";

const events = [
  { type: "task", childId: "haolin", delta: 10, createdAt: new Date(2026, 5, 14, 8).toISOString() },
  { type: "task", childId: "haolin", delta: 5, createdAt: new Date(2026, 5, 14, 9).toISOString() },
  { type: "task", childId: "zhongxian", delta: 8, createdAt: new Date(2026, 5, 14, 9).toISOString() },
  { type: "redeem", childId: "haolin", delta: -60, createdAt: new Date(2026, 5, 13, 19).toISOString() },
  { type: "task", childId: "haolin", delta: 4, createdAt: new Date(2026, 4, 30, 8).toISOString() },
];

test("aggregateMonth sums positive task points per child per day", () => {
  const days = aggregateMonth(events, "2026-06");
  assert.equal(days["2026-06-14"].earned.haolin, 15);
  assert.equal(days["2026-06-14"].earned.zhongxian, 8);
});

test("aggregateMonth flags days with a redemption", () => {
  const days = aggregateMonth(events, "2026-06");
  assert.equal(days["2026-06-13"].hasRedemption, true);
  assert.equal(days["2026-06-14"].hasRedemption, false);
});

test("aggregateMonth ignores other months", () => {
  const days = aggregateMonth(events, "2026-06");
  assert.equal(days["2026-05-30"], undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — cannot find module `../src/domain/calendar.js`.

- [ ] **Step 3: Write `server/src/domain/calendar.js`**

```js
import { dayKey } from "../time.js";

export function aggregateMonth(events, month) {
  const days = {};
  for (const e of events) {
    const key = dayKey(e.createdAt);
    if (key.slice(0, 7) !== month) continue;
    if (!days[key]) days[key] = { earned: {}, hasRedemption: false };
    if (e.type === "redeem") {
      days[key].hasRedemption = true;
    } else if (e.delta > 0) {
      days[key].earned[e.childId] = (days[key].earned[e.childId] || 0) + e.delta;
    }
  }
  return days;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/domain/calendar.js server/test/calendar.test.js
git commit -m "feat(server): monthly calendar aggregation"
```

---

## Task 8: Auth — PIN hashing and sessions

**Files:**
- Create: `server/src/auth.js`
- Test: `server/test/auth.test.js`

- [ ] **Step 1: Write the failing test `server/test/auth.test.js`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPin, verifyPin, createSession, getSession, deleteSession } from "../src/auth.js";

test("hashPin produces salted hash that verifies", () => {
  const h = hashPin("1234");
  assert.notEqual(h, "1234");
  assert.equal(verifyPin("1234", h), true);
  assert.equal(verifyPin("0000", h), false);
});

test("sessions store and expire", () => {
  const id = createSession({ role: "child", childId: "haolin" }, 1000);
  assert.equal(getSession(id).role, "child");
  deleteSession(id);
  assert.equal(getSession(id), null);
});

test("expired session returns null", async () => {
  const id = createSession({ role: "parent" }, -1); // already expired
  assert.equal(getSession(id), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — cannot find module `../src/auth.js`.

- [ ] **Step 3: Write `server/src/auth.js`**

```js
import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from "node:crypto";

export function hashPin(pin) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(String(pin), salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPin(pin, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, derived] = stored.split(":");
  const check = scryptSync(String(pin), salt, 32);
  const expected = Buffer.from(derived, "hex");
  return check.length === expected.length && timingSafeEqual(check, expected);
}

const sessions = new Map();

export function createSession(payload, ttlMs) {
  const id = randomUUID();
  sessions.set(id, { ...payload, expiresAt: Date.now() + ttlMs });
  return id;
}

export function getSession(id) {
  const s = sessions.get(id);
  if (!s) return null;
  if (s.expiresAt <= Date.now()) {
    sessions.delete(id);
    return null;
  }
  return s;
}

export function deleteSession(id) {
  sessions.delete(id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/auth.js server/test/auth.test.js
git commit -m "feat(server): PIN hashing and in-memory sessions"
```

---

## Task 9: First-run seed

**Files:**
- Create: `server/src/seed.js`

- [ ] **Step 1: Write `server/src/seed.js`**

```js
import { readCollection, writeCollection } from "./store.js";
import { hashPin } from "./auth.js";

const DEFAULT_PARENT_PIN = "0000";
const DEFAULT_CHILD_PIN = "0000";

export async function seedIfEmpty() {
  const config = await readCollection("config", null);
  if (!config) {
    await writeCollection("config", {
      parentPinHash: hashPin(DEFAULT_PARENT_PIN),
      sessionTtlMinutes: 120,
    });
  }
  const children = await readCollection("children", null);
  if (!children) {
    await writeCollection("children", [
      { id: "haolin", name: "王颢霖", emoji: "👧", color: "pink", pinHash: hashPin(DEFAULT_CHILD_PIN) },
      { id: "zhongxian", name: "王仲贤", emoji: "👦", color: "blue", pinHash: hashPin(DEFAULT_CHILD_PIN) },
    ]);
  }
  if ((await readCollection("tasks", null)) === null) {
    await writeCollection("tasks", [
      { id: "t_homework", name: "完成作业", emoji: "📚", points: 10, dailyLimit: 1, enabled: true },
      { id: "t_read", name: "主动阅读", emoji: "📖", points: 2, dailyLimit: 2, enabled: true },
      { id: "t_clean", name: "打扫卫生", emoji: "🧹", points: 6, dailyLimit: 1, enabled: true },
      { id: "t_help", name: "主动帮助他人", emoji: "💗", points: 3, dailyLimit: 2, enabled: true },
    ]);
  }
  if ((await readCollection("rewards", null)) === null) {
    await writeCollection("rewards", [
      { id: "r_freeday", name: "自己安排一天", emoji: "🌈", category: "spirit", cost: 200, stock: null, enabled: true },
      { id: "r_icecream", name: "冰淇淋", emoji: "🍦", category: "material", cost: 60, stock: null, enabled: true },
      { id: "r_coins", name: "虚拟游戏币×100", emoji: "🎮", category: "material", cost: 50, stock: null, enabled: true },
    ]);
  }
  if ((await readCollection("events", null)) === null) await writeCollection("events", []);
  if ((await readCollection("redemptions", null)) === null) await writeCollection("redemptions", []);
}
```

- [ ] **Step 2: Sanity-check it loads**

Run: `node -e "import('./server/src/seed.js').then(m=>console.log(typeof m.seedIfEmpty))"`
Expected: prints `function`.

- [ ] **Step 3: Commit**

```bash
git add server/src/seed.js
git commit -m "feat(server): first-run data seeding with defaults"
```

---

## Task 10: Auth routes + app skeleton

**Files:**
- Create: `server/src/app.js`
- Create: `server/src/routes/auth.routes.js`
- Test: `server/test/routes.test.js`

- [ ] **Step 1: Write the failing test `server/test/routes.test.js`**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — cannot find module `../src/app.js`.

- [ ] **Step 3: Write `server/src/routes/auth.routes.js`**

```js
import { readCollection } from "../store.js";
import { verifyPin, createSession, deleteSession, getSession } from "../auth.js";
import { balance } from "../domain/points.js";

const COOKIE = "hs_sid";

export async function authRoutes(app) {
  app.post("/api/login", async (req, reply) => {
    const { role, childId, pin } = req.body || {};
    const config = await readCollection("config", null);
    const ttlMs = (config?.sessionTtlMinutes || 120) * 60 * 1000;

    if (role === "parent") {
      if (!verifyPin(pin, config.parentPinHash)) return reply.code(401).send({ error: "bad_pin" });
      const sid = createSession({ role: "parent" }, ttlMs);
      reply.setCookie(COOKIE, sid, { path: "/", httpOnly: true, sameSite: "lax" });
      return { role: "parent" };
    }
    if (role === "child") {
      const children = await readCollection("children", []);
      const child = children.find((c) => c.id === childId);
      if (!child || !verifyPin(pin, child.pinHash)) return reply.code(401).send({ error: "bad_pin" });
      const sid = createSession({ role: "child", childId }, ttlMs);
      reply.setCookie(COOKIE, sid, { path: "/", httpOnly: true, sameSite: "lax" });
      return { role: "child", childId };
    }
    return reply.code(400).send({ error: "bad_role" });
  });

  app.post("/api/logout", async (req, reply) => {
    const sid = req.cookies[COOKIE];
    if (sid) deleteSession(sid);
    reply.clearCookie(COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/api/me", async (req, reply) => {
    const session = getSession(req.cookies[COOKIE]);
    if (!session) return reply.code(401).send({ error: "no_session" });
    if (session.role === "child") {
      const events = await readCollection("events", []);
      return { role: "child", childId: session.childId, balance: balance(events, session.childId) };
    }
    return { role: "parent" };
  });
}
```

- [ ] **Step 4: Write `server/src/app.js`**

```js
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth.routes.js";

export function buildApp() {
  const app = Fastify({ logger: false });
  app.register(cookie);
  app.register(authRoutes);
  return app;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS (routes auth tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/app.js server/src/routes/auth.routes.js server/test/routes.test.js
git commit -m "feat(server): auth routes (login/logout/me) + app skeleton"
```

---

## Task 11: Auth guard helper

**Files:**
- Modify: `server/src/app.js` (add a `decorate` for guard)
- Create: `server/src/routes/guard.js`

- [ ] **Step 1: Write `server/src/routes/guard.js`**

```js
import { getSession } from "../auth.js";

const COOKIE = "hs_sid";

export function requireSession(req, reply) {
  const session = getSession(req.cookies[COOKIE]);
  if (!session) {
    reply.code(401).send({ error: "no_session" });
    return null;
  }
  return session;
}

export function requireParent(req, reply) {
  const session = requireSession(req, reply);
  if (!session) return null;
  if (session.role !== "parent") {
    reply.code(403).send({ error: "parent_only" });
    return null;
  }
  return session;
}

export function requireChild(req, reply, childId) {
  const session = requireSession(req, reply);
  if (!session) return null;
  if (session.role !== "child" || (childId && session.childId !== childId)) {
    reply.code(403).send({ error: "child_only" });
    return null;
  }
  return session;
}
```

- [ ] **Step 2: No new behavior to test in isolation — verify it imports**

Run: `node -e "import('./server/src/routes/guard.js').then(m=>console.log(Object.keys(m).join(',')))"`
Expected: prints `requireSession,requireParent,requireChild`.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/guard.js
git commit -m "feat(server): session/role guard helpers"
```

---

## Task 12: Child routes — tasks, rewards, redeem, calendar

**Files:**
- Create: `server/src/routes/child.routes.js`
- Modify: `server/src/app.js` (register childRoutes)
- Modify: `server/test/routes.test.js` (append child-flow tests)

- [ ] **Step 1: Append failing tests to `server/test/routes.test.js`** (before the teardown `test("after teardown"...)`)

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — 404 on `/api/tasks` (route not registered).

- [ ] **Step 3: Write `server/src/routes/child.routes.js`**

```js
import { randomUUID } from "node:crypto";
import { readCollection, writeCollection } from "../store.js";
import { requireSession, requireChild } from "./guard.js";
import { balance } from "../domain/points.js";
import { buildTaskView, countTaskToday } from "../domain/tasks.js";
import { makeRedemption } from "../domain/redeem.js";
import { aggregateMonth } from "../domain/calendar.js";

export async function childRoutes(app) {
  app.get("/api/tasks", async (req, reply) => {
    const s = requireChild(req, reply);
    if (!s) return;
    const [tasks, events] = await Promise.all([
      readCollection("tasks", []),
      readCollection("events", []),
    ]);
    return buildTaskView(tasks, events, s.childId, new Date());
  });

  app.post("/api/tasks/:id/complete", async (req, reply) => {
    const s = requireChild(req, reply);
    if (!s) return;
    const tasks = await readCollection("tasks", []);
    const task = tasks.find((t) => t.id === req.params.id && t.enabled);
    if (!task) return reply.code(404).send({ error: "task_not_found" });

    const events = await readCollection("events", []);
    const now = new Date();
    if (countTaskToday(events, s.childId, task.id, now) >= task.dailyLimit) {
      return reply.code(409).send({ error: "daily_limit" });
    }
    events.push({
      id: `e_${randomUUID().slice(0, 8)}`,
      type: "task",
      childId: s.childId,
      delta: task.points,
      refId: task.id,
      note: "",
      createdAt: now.toISOString(),
    });
    await writeCollection("events", events);
    return { ok: true, balance: balance(events, s.childId) };
  });

  app.get("/api/rewards", async (req, reply) => {
    const s = requireChild(req, reply);
    if (!s) return;
    const [rewards, events] = await Promise.all([
      readCollection("rewards", []),
      readCollection("events", []),
    ]);
    const bal = balance(events, s.childId);
    return rewards
      .filter((r) => r.enabled)
      .map((r) => ({ ...r, affordable: bal >= r.cost }));
  });

  app.post("/api/rewards/:id/redeem", async (req, reply) => {
    const s = requireChild(req, reply);
    if (!s) return;
    const rewards = await readCollection("rewards", []);
    const reward = rewards.find((r) => r.id === req.params.id && r.enabled);
    if (!reward) return reply.code(404).send({ error: "reward_not_found" });
    if (typeof reward.stock === "number" && reward.stock <= 0) {
      return reply.code(409).send({ error: "out_of_stock" });
    }
    const redemptions = await readCollection("redemptions", []);
    const rd = makeRedemption(s.childId, reward, new Date());
    redemptions.push(rd);
    await writeCollection("redemptions", redemptions);
    return rd;
  });

  app.get("/api/calendar", async (req, reply) => {
    const s = requireSession(req, reply);
    if (!s) return;
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const events = await readCollection("events", []);
    const scoped =
      s.role === "child" ? events.filter((e) => e.childId === s.childId) : events;
    return aggregateMonth(scoped, month);
  });
}
```

- [ ] **Step 4: Register in `server/src/app.js`**

```js
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth.routes.js";
import { childRoutes } from "./routes/child.routes.js";

export function buildApp() {
  const app = Fastify({ logger: false });
  app.register(cookie);
  app.register(authRoutes);
  app.register(childRoutes);
  return app;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS (all route tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/child.routes.js server/src/app.js server/test/routes.test.js
git commit -m "feat(server): child routes for tasks, rewards, redeem, calendar"
```

---

## Task 13: Parent routes — approvals, adjust, admin, logs, pin

**Files:**
- Create: `server/src/routes/parent.routes.js`
- Modify: `server/src/app.js` (register parentRoutes)
- Modify: `server/test/routes.test.js` (append parent-flow tests)

- [ ] **Step 1: Append failing tests to `server/test/routes.test.js`** (before teardown)

```js
async function parentCookie() {
  const res = await app.inject({ method: "POST", url: "/api/login", payload: { role: "parent", pin: "0000" } });
  return res.headers["set-cookie"];
}

test("parent lists pending redemptions and approves with deduction", async () => {
  const cookie = await parentCookie();
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — 404 on `/api/redemptions`.

- [ ] **Step 3: Write `server/src/routes/parent.routes.js`**

```js
import { randomUUID } from "node:crypto";
import { readCollection, writeCollection } from "../store.js";
import { requireParent } from "./guard.js";
import { balance } from "../domain/points.js";
import { approveRedemption } from "../domain/redeem.js";
import { hashPin } from "../auth.js";

function newId(prefix) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

export async function parentRoutes(app) {
  app.get("/api/redemptions", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const redemptions = await readCollection("redemptions", []);
    const status = req.query.status;
    const list = status ? redemptions.filter((r) => r.status === status) : redemptions;
    const events = await readCollection("events", []);
    return list.map((r) => ({ ...r, currentBalance: balance(events, r.childId) }));
  });

  app.post("/api/redemptions/:id/approve", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const redemptions = await readCollection("redemptions", []);
    const idx = redemptions.findIndex((r) => r.id === req.params.id);
    if (idx < 0 || redemptions[idx].status !== "pending")
      return reply.code(404).send({ error: "not_pending" });

    const rewards = await readCollection("rewards", []);
    const reward = rewards.find((r) => r.id === redemptions[idx].rewardId);
    const events = await readCollection("events", []);
    const res = approveRedemption(redemptions[idx], reward || { stock: null }, balance(events, redemptions[idx].childId), new Date());
    if (!res.ok) return reply.code(409).send({ error: res.reason });

    events.push(res.event);
    redemptions[idx] = res.redemption;
    if (res.stockDelta && reward) reward.stock += res.stockDelta;
    await Promise.all([
      writeCollection("events", events),
      writeCollection("redemptions", redemptions),
      writeCollection("rewards", rewards),
    ]);
    return { ok: true };
  });

  app.post("/api/redemptions/:id/reject", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const redemptions = await readCollection("redemptions", []);
    const idx = redemptions.findIndex((r) => r.id === req.params.id);
    if (idx < 0 || redemptions[idx].status !== "pending")
      return reply.code(404).send({ error: "not_pending" });
    redemptions[idx] = { ...redemptions[idx], status: "rejected", decidedAt: new Date().toISOString(), note: req.body?.note || "" };
    await writeCollection("redemptions", redemptions);
    return { ok: true };
  });

  app.post("/api/adjust", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const { childId, delta, note } = req.body || {};
    if (!childId || typeof delta !== "number" || delta <= 0)
      return reply.code(400).send({ error: "bad_adjust" });
    const events = await readCollection("events", []);
    events.push({ id: newId("e"), type: "adjust", childId, delta, refId: null, note: note || "", createdAt: new Date().toISOString() });
    await writeCollection("events", events);
    return { ok: true, balance: balance(events, childId) };
  });

  for (const kind of ["tasks", "rewards"]) {
    app.post(`/api/admin/${kind}`, async (req, reply) => {
      if (!requireParent(req, reply)) return;
      const items = await readCollection(kind, []);
      const item = { id: newId(kind === "tasks" ? "t" : "r"), ...req.body };
      items.push(item);
      await writeCollection(kind, items);
      return item;
    });
    app.put(`/api/admin/${kind}/:id`, async (req, reply) => {
      if (!requireParent(req, reply)) return;
      const items = await readCollection(kind, []);
      const idx = items.findIndex((i) => i.id === req.params.id);
      if (idx < 0) return reply.code(404).send({ error: "not_found" });
      items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
      await writeCollection(kind, items);
      return items[idx];
    });
    app.delete(`/api/admin/${kind}/:id`, async (req, reply) => {
      if (!requireParent(req, reply)) return;
      const items = await readCollection(kind, []);
      const next = items.filter((i) => i.id !== req.params.id);
      await writeCollection(kind, next);
      return { ok: true };
    });
  }

  app.get("/api/logs", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    let events = await readCollection("events", []);
    if (req.query.childId) events = events.filter((e) => e.childId === req.query.childId);
    return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  app.post("/api/admin/pin", async (req, reply) => {
    if (!requireParent(req, reply)) return;
    const { role, childId, pin } = req.body || {};
    if (!pin) return reply.code(400).send({ error: "bad_pin" });
    if (role === "parent") {
      const config = await readCollection("config", {});
      config.parentPinHash = hashPin(pin);
      await writeCollection("config", config);
      return { ok: true };
    }
    if (role === "child") {
      const children = await readCollection("children", []);
      const child = children.find((c) => c.id === childId);
      if (!child) return reply.code(404).send({ error: "child_not_found" });
      child.pinHash = hashPin(pin);
      await writeCollection("children", children);
      return { ok: true };
    }
    return reply.code(400).send({ error: "bad_role" });
  });
}
```

- [ ] **Step 4: Register in `server/src/app.js`**

```js
import { parentRoutes } from "./routes/parent.routes.js";
// inside buildApp, after childRoutes:
  app.register(parentRoutes);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS (all backend tests).

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/parent.routes.js server/src/app.js server/test/routes.test.js
git commit -m "feat(server): parent routes (approvals, adjust, admin, logs, pin)"
```

---

## Task 14: Server entrypoint with static hosting + seed

**Files:**
- Create: `server/src/index.js`
- Modify: `server/src/app.js` (serve `web/dist` when present)

- [ ] **Step 1: Add static hosting to `server/src/app.js`**

Replace the file with:

```js
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import fstatic from "@fastify/static";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { authRoutes } from "./routes/auth.routes.js";
import { childRoutes } from "./routes/child.routes.js";
import { parentRoutes } from "./routes/parent.routes.js";

const here = dirname(fileURLToPath(import.meta.url));
const WEB_DIST = join(here, "..", "..", "web", "dist");

export function buildApp() {
  const app = Fastify({ logger: false });
  app.register(cookie);
  app.register(authRoutes);
  app.register(childRoutes);
  app.register(parentRoutes);

  if (existsSync(WEB_DIST)) {
    app.register(fstatic, { root: WEB_DIST });
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url.startsWith("/api/")) return reply.code(404).send({ error: "not_found" });
      return reply.sendFile("index.html");
    });
  }
  return app;
}
```

- [ ] **Step 2: Write `server/src/index.js`**

```js
import { buildApp } from "./app.js";
import { seedIfEmpty } from "./seed.js";

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";

await seedIfEmpty();
const app = buildApp();
app.listen({ port: PORT, host: HOST }).then(() => {
  console.log(`Happy Star running at http://${HOST}:${PORT}`);
});
```

- [ ] **Step 3: Run the backend test suite again (static block is guarded by existsSync, tests still pass)**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 4: Smoke-start the server**

Run: `PORT=8099 node server/src/index.js &` then `curl -s localhost:8099/api/me`
Expected: `{"error":"no_session"}`. Stop the process afterward.

- [ ] **Step 5: Commit**

```bash
git add server/src/index.js server/src/app.js
git commit -m "feat(server): entrypoint with seed + SPA static hosting"
```

---

## Task 15: Frontend scaffold + theme + API client

**Files:**
- Create: `web/index.html`
- Create: `web/vite.config.js`
- Create: `web/src/main.jsx`
- Create: `web/src/theme.css`
- Create: `web/src/api.js`

- [ ] **Step 1: Write `web/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <title>Happy Star ⭐</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Write `web/vite.config.js`** (dev proxy to backend; jsdom for tests)

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8080" } },
  test: { environment: "jsdom" },
});
```

- [ ] **Step 3: Write `web/src/theme.css`** (neutral bg, yellow accent, per-child colors)

```css
:root {
  --bg: #f2f2ef;
  --surface: #ffffff;
  --panel: #fafaf8;
  --ink: #3d3d3d;
  --ink-soft: #a8a29a;
  --line: #ececec;
  --accent: #ffcc33;        /* yellow: Done button + completed row */
  --accent-ink: #6b5200;
  --star: #ffb300;
  --pink: #ffe3ec;
  --blue: #e6f1fb;
  --green: #eaf3de;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; background: var(--bg); color: var(--ink); }
button { font: inherit; cursor: pointer; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 16px; }
.done-btn { background: var(--accent); color: var(--accent-ink); border: none; border-radius: 20px; padding: 7px 18px; font-weight: 500; }
```

- [ ] **Step 4: Write `web/src/api.js`**

```js
async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "request_failed" }));
    throw Object.assign(new Error(err.error), { status: res.status, code: err.error });
  }
  return res.json();
}

export const api = {
  me: () => req("GET", "/api/me"),
  login: (payload) => req("POST", "/api/login", payload),
  logout: () => req("POST", "/api/logout"),
  children: () => req("GET", "/api/children").catch(() => []),
  tasks: () => req("GET", "/api/tasks"),
  completeTask: (id) => req("POST", `/api/tasks/${id}/complete`),
  rewards: () => req("GET", "/api/rewards"),
  redeem: (id) => req("POST", `/api/rewards/${id}/redeem`),
  calendar: (month) => req("GET", `/api/calendar?month=${month}`),
  pending: () => req("GET", "/api/redemptions?status=pending"),
  approve: (id) => req("POST", `/api/redemptions/${id}/approve`),
  reject: (id, note) => req("POST", `/api/redemptions/${id}/reject`, { note }),
  adjust: (payload) => req("POST", "/api/adjust", payload),
  logs: (childId) => req("GET", "/api/logs" + (childId ? `?childId=${childId}` : "")),
  setPin: (payload) => req("POST", "/api/admin/pin", payload),
  adminCreate: (kind, item) => req("POST", `/api/admin/${kind}`, item),
  adminUpdate: (kind, id, item) => req("PUT", `/api/admin/${kind}/${id}`, item),
  adminDelete: (kind, id) => req("DELETE", `/api/admin/${kind}/${id}`),
};
```

> NOTE: `/api/children` is not in the backend. Add it now to `auth.routes.js` so the login screen can list avatars. Insert this route in `authRoutes`:
> ```js
> app.get("/api/children", async () => {
>   const children = await readCollection("children", []);
>   return children.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, color: c.color }));
> });
> ```
> Then re-run `npm --prefix server test` (still PASS) and include `server/src/routes/auth.routes.js` in this task's commit.

- [ ] **Step 5: Write `web/src/main.jsx`**

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./theme.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

- [ ] **Step 6: Commit**

```bash
git add web/index.html web/vite.config.js web/src/main.jsx web/src/theme.css web/src/api.js server/src/routes/auth.routes.js
git commit -m "feat(web): scaffold, theme tokens, API client; add /api/children"
```

---

## Task 16: App shell + session bootstrap + Login

**Files:**
- Create: `web/src/App.jsx`
- Create: `web/src/pages/Login.jsx`

- [ ] **Step 1: Write `web/src/App.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { api } from "./api.js";
import Login from "./pages/Login.jsx";
import ChildHome from "./pages/ChildHome.jsx";
import ParentHome from "./pages/ParentHome.jsx";

export default function App() {
  const [me, setMe] = useState(undefined); // undefined=loading, null=anon

  const refresh = () => api.me().then(setMe).catch(() => setMe(null));
  useEffect(() => { refresh(); }, []);

  if (me === undefined) return <div style={{ padding: 24 }}>加载中…</div>;

  return (
    <Routes>
      <Route path="/login" element={me ? <Navigate to="/" /> : <Login onLogin={refresh} />} />
      <Route path="/*" element={
        !me ? <Navigate to="/login" />
        : me.role === "parent" ? <ParentHome onLogout={refresh} />
        : <ChildHome me={me} onLogout={refresh} />
      } />
    </Routes>
  );
}
```

- [ ] **Step 2: Write `web/src/pages/Login.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Login({ onLogin }) {
  const [children, setChildren] = useState([]);
  const [picked, setPicked] = useState(null); // {role, childId, name, emoji}
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { api.children().then(setChildren); }, []);

  const submit = async () => {
    setError("");
    try {
      await api.login(picked.role === "parent"
        ? { role: "parent", pin }
        : { role: "child", childId: picked.childId, pin });
      onLogin();
    } catch (e) {
      setError("PIN 不对，再试试");
      setPin("");
    }
  };

  if (picked) {
    return (
      <div style={{ maxWidth: 360, margin: "40px auto", padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>{picked.emoji}</div>
        <h2 style={{ fontWeight: 500 }}>{picked.name}</h2>
        <input
          type="password" inputMode="numeric" autoFocus value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="输入 PIN"
          style={{ fontSize: 24, textAlign: "center", letterSpacing: 8, padding: 12, width: "100%", borderRadius: 12, border: "1px solid var(--line)" }}
        />
        {error && <p style={{ color: "#cc3333" }}>{error}</p>}
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button onClick={() => { setPicked(null); setPin(""); setError(""); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid var(--line)", background: "#fff" }}>返回</button>
          <button onClick={submit} className="done-btn" style={{ flex: 2, padding: 12 }}>进入</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16, textAlign: "center" }}>
      <h1 style={{ fontWeight: 500 }}>Happy Star ⭐</h1>
      <p style={{ color: "var(--ink-soft)" }}>越努力，越幸运</p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
        {children.map((c) => (
          <button key={c.id} onClick={() => setPicked({ role: "child", childId: c.id, name: c.name, emoji: c.emoji })}
            style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 16, padding: 16, width: 110 }}>
            <div style={{ fontSize: 40 }}>{c.emoji}</div>
            <div>{c.name}</div>
          </button>
        ))}
        <button onClick={() => setPicked({ role: "parent", name: "家长", emoji: "👪" })}
          style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 16, padding: 16, width: 110 }}>
          <div style={{ fontSize: 40 }}>👪</div>
          <div>家长</div>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual verify (after Task 17–22 the routed pages exist; for now stub-run)**

This task compiles only once `ChildHome` and `ParentHome` exist (Tasks 17 & 20). Proceed to those, then verify together in Task 23.

- [ ] **Step 4: Commit**

```bash
git add web/src/App.jsx web/src/pages/Login.jsx
git commit -m "feat(web): app shell, session bootstrap, avatar+PIN login"
```

---

## Task 17: Shared components — StarCount, TaskRow

**Files:**
- Create: `web/src/components/StarCount.jsx`
- Create: `web/src/components/TaskRow.jsx`
- Test: `web/test/TaskRow.test.jsx`

- [ ] **Step 1: Write `web/src/components/StarCount.jsx`** (animated count-up)

```jsx
import React, { useEffect, useRef, useState } from "react";

export default function StarCount({ value }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const dur = 600;
    let raf;
    const step = (t) => {
      const p = Math.min((t - start) / dur, 1);
      setShown(Math.round(from + (to - from) * p));
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 500, color: "#c97a00" }}>
      {shown} <span style={{ color: "var(--star)" }}>★</span>
    </span>
  );
}
```

- [ ] **Step 2: Write the failing test `web/test/TaskRow.test.jsx`**

```jsx
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskRow from "../src/components/TaskRow.jsx";

test("shows Done button when not at limit and fires onComplete", () => {
  const onComplete = vi.fn();
  render(<TaskRow task={{ id: "t1", name: "完成作业", emoji: "📚", points: 10, dailyLimit: 1, doneToday: 0, atLimit: false }} onComplete={onComplete} />);
  const btn = screen.getByRole("button", { name: /done/i });
  fireEvent.click(btn);
  expect(onComplete).toHaveBeenCalledWith("t1");
});

test("shows completed check when atLimit and does not fire", () => {
  const onComplete = vi.fn();
  render(<TaskRow task={{ id: "t2", name: "刷牙", emoji: "🦷", points: 6, dailyLimit: 1, doneToday: 1, atLimit: true }} onComplete={onComplete} />);
  expect(screen.queryByRole("button", { name: /done/i })).toBeNull();
  expect(screen.getByText("✓")).toBeTruthy();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm --prefix web test`
Expected: FAIL — cannot find `../src/components/TaskRow.jsx`.

- [ ] **Step 4: Write `web/src/components/TaskRow.jsx`**

```jsx
import React from "react";

export default function TaskRow({ task, onComplete }) {
  const done = task.atLimit;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 10,
      borderRadius: 14, border: "1px solid " + (done ? "var(--accent)" : "var(--line)"),
      background: done ? "var(--accent)" : "#fff", transition: "background .3s, border-color .3s",
    }}>
      <span style={{ fontSize: 20 }}>{task.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: done ? "#5a4500" : "var(--ink)" }}>{task.name}</div>
        <div style={{ fontSize: 12, color: done ? "#9a7a12" : "var(--ink-soft)" }}>
          ★{task.points} · {task.doneToday}/{task.dailyLimit}
        </div>
      </div>
      {done ? (
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b5200", fontSize: 17 }}>✓</span>
      ) : (
        <button className="done-btn" onClick={() => onComplete(task.id)}>Done</button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm --prefix web test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/StarCount.jsx web/src/components/TaskRow.jsx web/test/TaskRow.test.jsx
git commit -m "feat(web): StarCount and TaskRow components"
```

---

## Task 18: ChildHome shell + TasksTab

**Files:**
- Create: `web/src/pages/ChildHome.jsx`
- Create: `web/src/pages/TasksTab.jsx`

- [ ] **Step 1: Write `web/src/pages/ChildHome.jsx`** (tab shell + header)

```jsx
import React, { useState } from "react";
import { api } from "../api.js";
import StarCount from "../components/StarCount.jsx";
import TasksTab from "./TasksTab.jsx";
import RewardsTab from "./RewardsTab.jsx";
import CalendarTab from "./CalendarTab.jsx";

const TABS = [["tasks", "任务"], ["rewards", "奖励"], ["calendar", "日历"]];

export default function ChildHome({ me, onLogout }) {
  const [tab, setTab] = useState("tasks");
  const [balance, setBalance] = useState(me.balance);

  const logout = async () => { await api.logout(); onLogout(); };

  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 4px" }}>
        <button onClick={logout} style={{ border: "none", background: "none", color: "var(--ink-soft)" }}>切换 ⤴</button>
        <StarCount value={balance} />
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 12 }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "10px 0", border: "none", background: "none",
            color: tab === id ? "#e8852b" : "var(--ink-soft)",
            borderBottom: tab === id ? "3px solid #ff9f1c" : "3px solid transparent", fontWeight: 500,
          }}>{label}</button>
        ))}
      </div>
      {tab === "tasks" && <TasksTab onBalance={setBalance} />}
      {tab === "rewards" && <RewardsTab balance={balance} />}
      {tab === "calendar" && <CalendarTab childId={me.childId} />}
    </div>
  );
}
```

- [ ] **Step 2: Write `web/src/pages/TasksTab.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import TaskRow from "../components/TaskRow.jsx";

export default function TasksTab({ onBalance }) {
  const [tasks, setTasks] = useState([]);
  const [msg, setMsg] = useState("");

  const load = () => api.tasks().then(setTasks);
  useEffect(() => { load(); }, []);

  const complete = async (id) => {
    try {
      const res = await api.completeTask(id);
      onBalance(res.balance);
      await load();
    } catch (e) {
      setMsg(e.code === "daily_limit" ? "今天这个任务已达上限啦" : "出错了，再试试");
      setTimeout(() => setMsg(""), 2000);
    }
  };

  return (
    <div>
      {msg && <div style={{ background: "#fff4d6", color: "#8a6a10", padding: 8, borderRadius: 10, marginBottom: 8 }}>{msg}</div>}
      {tasks.map((t) => <TaskRow key={t.id} task={t} onComplete={complete} />)}
      {tasks.length === 0 && <p style={{ color: "var(--ink-soft)" }}>今天没有任务啦 🎉</p>}
    </div>
  );
}
```

- [ ] **Step 3: Commit** (tab compiles after Tasks 19–20 add RewardsTab/CalendarTab; commit together is fine since imports resolve at build in Task 23 — but to keep each commit loadable, create minimal placeholders now)

Create `web/src/pages/RewardsTab.jsx` and `web/src/pages/CalendarTab.jsx` as one-line placeholders to be replaced next:

```jsx
export default function RewardsTab() { return null; }
```
```jsx
export default function CalendarTab() { return null; }
```

```bash
git add web/src/pages/ChildHome.jsx web/src/pages/TasksTab.jsx web/src/pages/RewardsTab.jsx web/src/pages/CalendarTab.jsx
git commit -m "feat(web): ChildHome tab shell and TasksTab"
```

---

## Task 19: RewardsTab

**Files:**
- Modify: `web/src/pages/RewardsTab.jsx` (replace placeholder)
- Create: `web/src/components/RewardRow.jsx`

- [ ] **Step 1: Write `web/src/components/RewardRow.jsx`**

```jsx
import React from "react";

export default function RewardRow({ reward, balance, onRedeem }) {
  const pct = Math.min(100, Math.round((balance / reward.cost) * 100));
  return (
    <div style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 10, borderRadius: 14, border: "1px solid var(--line)", background: "#fff" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct + "%", background: reward.affordable ? "#fff3c4" : "#f3f1ec", zIndex: 0, transition: "width .4s" }} />
      <span style={{ position: "relative", fontSize: 20 }}>{reward.emoji}</span>
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {reward.name} <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{reward.category === "spirit" ? "精神" : "物质"}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>★{reward.cost}</div>
      </div>
      {reward.affordable
        ? <button className="done-btn" style={{ position: "relative" }} onClick={() => onRedeem(reward.id)}>兑换</button>
        : <span style={{ position: "relative", fontSize: 12, color: "var(--ink-soft)" }}>还差 {reward.cost - balance}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Write `web/src/pages/RewardsTab.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import RewardRow from "../components/RewardRow.jsx";

export default function RewardsTab({ balance }) {
  const [rewards, setRewards] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => { api.rewards().then(setRewards); }, []);

  const redeem = async (id) => {
    try {
      await api.redeem(id);
      setMsg("已提交申请，等家长同意 🎁");
    } catch (e) {
      setMsg(e.code === "out_of_stock" ? "这个奖励没货啦" : "出错了，再试试");
    }
    setTimeout(() => setMsg(""), 2500);
  };

  return (
    <div>
      {msg && <div style={{ background: "#fff4d6", color: "#8a6a10", padding: 8, borderRadius: 10, marginBottom: 8 }}>{msg}</div>}
      {rewards.map((r) => <RewardRow key={r.id} reward={r} balance={balance} onRedeem={redeem} />)}
    </div>
  );
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds (no missing imports).

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/RewardsTab.jsx web/src/components/RewardRow.jsx
git commit -m "feat(web): RewardsTab with progress bars and redeem"
```

---

## Task 20: CalendarTab

**Files:**
- Modify: `web/src/pages/CalendarTab.jsx` (replace placeholder)

- [ ] **Step 1: Write `web/src/pages/CalendarTab.jsx`**

```jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const COLORS = { haolin: "#d4537e", zhongxian: "#378add" };

function monthMatrix(month) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  return cells;
}

export default function CalendarTab() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState({});
  useEffect(() => { api.calendar(month).then(setData); }, [month]);
  const cells = useMemo(() => monthMatrix(month), [month]);

  const shift = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button onClick={() => shift(-1)} style={{ border: "none", background: "none" }}>‹</button>
        <strong style={{ fontWeight: 500 }}>{month}</strong>
        <button onClick={() => shift(1)} style={{ border: "none", background: "none" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, fontSize: 10, color: "var(--ink-soft)", textAlign: "center", marginBottom: 4 }}>
        {["一", "二", "三", "四", "五", "六", "日"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((key, i) => {
          if (!key) return <div key={i} />;
          const day = data[key];
          return (
            <div key={key} style={{ aspectRatio: "1", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--line)", padding: 3, fontSize: 9 }}>
              <div style={{ color: "var(--ink-soft)" }}>{Number(key.slice(-2))} {day?.hasRedemption ? "🎁" : ""}</div>
              {day && Object.entries(day.earned).map(([cid, pts]) => (
                <div key={cid} style={{ color: COLORS[cid] || "var(--ink)" }}>+{pts}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/CalendarTab.jsx
git commit -m "feat(web): CalendarTab month grid with per-child scores"
```

---

## Task 21: ParentHome + Approvals

**Files:**
- Create: `web/src/pages/ParentHome.jsx`
- Create: `web/src/pages/ParentApprovals.jsx`

- [ ] **Step 1: Write `web/src/pages/ParentHome.jsx`** (section switcher)

```jsx
import React, { useState } from "react";
import { api } from "../api.js";
import ParentApprovals from "./ParentApprovals.jsx";
import ParentTasksAdmin from "./ParentTasksAdmin.jsx";
import ParentRewardsAdmin from "./ParentRewardsAdmin.jsx";
import ParentAdjust from "./ParentAdjust.jsx";
import ParentPins from "./ParentPins.jsx";
import ParentLogs from "./ParentLogs.jsx";

const SECTIONS = [
  ["approvals", "待审批"], ["tasks", "任务"], ["rewards", "奖励"],
  ["adjust", "加分"], ["pins", "PIN"], ["logs", "日志"],
];

export default function ParentHome({ onLogout }) {
  const [sec, setSec] = useState("approvals");
  const logout = async () => { await api.logout(); onLogout(); };
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontWeight: 500 }}>👪 家长</strong>
        <button onClick={logout} style={{ border: "none", background: "none", color: "var(--ink-soft)" }}>退出 ⤴</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}>
        {SECTIONS.map(([id, label]) => (
          <button key={id} onClick={() => setSec(id)} style={{
            padding: "6px 12px", borderRadius: 16, border: "1px solid var(--line)",
            background: sec === id ? "var(--accent)" : "#fff", color: sec === id ? "var(--accent-ink)" : "var(--ink)",
          }}>{label}</button>
        ))}
      </div>
      {sec === "approvals" && <ParentApprovals />}
      {sec === "tasks" && <ParentTasksAdmin />}
      {sec === "rewards" && <ParentRewardsAdmin />}
      {sec === "adjust" && <ParentAdjust />}
      {sec === "pins" && <ParentPins />}
      {sec === "logs" && <ParentLogs />}
    </div>
  );
}
```

- [ ] **Step 2: Write `web/src/pages/ParentApprovals.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function ParentApprovals() {
  const [list, setList] = useState([]);
  const load = () => api.pending().then(setList);
  useEffect(() => { load(); }, []);

  const decide = async (id, ok) => {
    try { ok ? await api.approve(id) : await api.reject(id, ""); }
    catch (e) { alert(e.code === "insufficient_balance" ? "积分不够，无法通过" : "操作失败"); }
    await load();
  };

  if (list.length === 0) return <p style={{ color: "var(--ink-soft)" }}>没有待审批的兑换 🎉</p>;
  return (
    <div>
      {list.map((r) => {
        const enough = r.currentBalance >= r.cost;
        return (
          <div key={r.id} className="panel" style={{ marginBottom: 10 }}>
            <div>孩子 <strong>{r.childId}</strong> 想兑换（★{r.cost}）</div>
            <div style={{ fontSize: 12, color: enough ? "#3b6d11" : "#cc3333" }}>
              当前余额 {r.currentBalance} {enough ? "✓" : "✗ 不足"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="done-btn" disabled={!enough} onClick={() => decide(r.id, true)} style={{ opacity: enough ? 1 : 0.5 }}>通过</button>
              <button onClick={() => decide(r.id, false)} style={{ borderRadius: 20, border: "1px solid var(--line)", background: "#fff", padding: "7px 18px" }}>拒绝</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Add placeholders for the remaining parent sections so ParentHome builds**

Create one-line placeholders (replaced in Task 22):
```jsx
export default function ParentTasksAdmin() { return null; }
```
(repeat for `ParentRewardsAdmin.jsx`, `ParentAdjust.jsx`, `ParentPins.jsx`, `ParentLogs.jsx` with matching names)

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/ParentHome.jsx web/src/pages/ParentApprovals.jsx web/src/pages/ParentTasksAdmin.jsx web/src/pages/ParentRewardsAdmin.jsx web/src/pages/ParentAdjust.jsx web/src/pages/ParentPins.jsx web/src/pages/ParentLogs.jsx
git commit -m "feat(web): ParentHome shell and approvals"
```

---

## Task 22: Parent admin sections (tasks, rewards, adjust, pins, logs)

**Files:**
- Modify: `web/src/pages/ParentTasksAdmin.jsx`
- Modify: `web/src/pages/ParentRewardsAdmin.jsx`
- Modify: `web/src/pages/ParentAdjust.jsx`
- Modify: `web/src/pages/ParentPins.jsx`
- Modify: `web/src/pages/ParentLogs.jsx`

- [ ] **Step 1: Write `web/src/pages/ParentTasksAdmin.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY = { name: "", emoji: "⭐", points: 5, dailyLimit: 1, enabled: true };

export default function ParentTasksAdmin() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const reload = async () => setItems(await (await fetch("/api/tasks")).json());
  useEffect(() => { reload(); }, []);

  const add = async () => {
    if (!form.name) return;
    await api.adminCreate("tasks", { ...form, points: Number(form.points), dailyLimit: Number(form.dailyLimit) });
    setForm(EMPTY); reload();
  };
  const remove = async (id) => { await api.adminDelete("tasks", id); reload(); };

  return (
    <div>
      <div className="panel" style={{ marginBottom: 12, display: "grid", gap: 8 }}>
        <input placeholder="任务名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="emoji" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
        <input type="number" placeholder="分值" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
        <input type="number" placeholder="每日上限" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} />
        <button className="done-btn" onClick={add}>添加任务</button>
      </div>
      {items.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderBottom: "1px solid var(--line)" }}>
          <span>{t.emoji}</span><span style={{ flex: 1 }}>{t.name}</span>
          <span style={{ color: "var(--ink-soft)" }}>★{t.points} · {t.dailyLimit}/天</span>
          <button onClick={() => remove(t.id)} style={{ border: "none", background: "none", color: "#cc3333" }}>删除</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `web/src/pages/ParentRewardsAdmin.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY = { name: "", emoji: "🎁", category: "material", cost: 50, stock: null, enabled: true };

export default function ParentRewardsAdmin() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const reload = async () => setItems(await (await fetch("/api/rewards")).json());
  useEffect(() => { reload(); }, []);

  const add = async () => {
    if (!form.name) return;
    await api.adminCreate("rewards", { ...form, cost: Number(form.cost), stock: form.stock === "" || form.stock === null ? null : Number(form.stock) });
    setForm(EMPTY); reload();
  };
  const remove = async (id) => { await api.adminDelete("rewards", id); reload(); };

  return (
    <div>
      <div className="panel" style={{ marginBottom: 12, display: "grid", gap: 8 }}>
        <input placeholder="奖励名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="emoji" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="material">物质</option>
          <option value="spirit">精神</option>
        </select>
        <input type="number" placeholder="所需积分" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        <input placeholder="库存(留空=无限)" value={form.stock ?? ""} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <button className="done-btn" onClick={add}>添加奖励</button>
      </div>
      {items.map((r) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderBottom: "1px solid var(--line)" }}>
          <span>{r.emoji}</span><span style={{ flex: 1 }}>{r.name}</span>
          <span style={{ color: "var(--ink-soft)" }}>★{r.cost}{typeof r.stock === "number" ? ` · 库存${r.stock}` : ""}</span>
          <button onClick={() => remove(r.id)} style={{ border: "none", background: "none", color: "#cc3333" }}>删除</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `web/src/pages/ParentAdjust.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function ParentAdjust() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState("");
  const [delta, setDelta] = useState(5);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { api.children().then((c) => { setChildren(c); setChildId(c[0]?.id || ""); }); }, []);

  const submit = async () => {
    try {
      await api.adjust({ childId, delta: Number(delta), note });
      setMsg("已加分 ✓"); setNote("");
    } catch { setMsg("失败，分值需为正数"); }
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div className="panel" style={{ display: "grid", gap: 8 }}>
      <select value={childId} onChange={(e) => setChildId(e.target.value)}>
        {children.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
      </select>
      <input type="number" min="1" value={delta} onChange={(e) => setDelta(e.target.value)} />
      <input placeholder="备注（可选）" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="done-btn" onClick={submit}>加分</button>
      {msg && <div style={{ color: "#3b6d11" }}>{msg}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Write `web/src/pages/ParentPins.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function ParentPins() {
  const [children, setChildren] = useState([]);
  const [msg, setMsg] = useState("");
  useEffect(() => { api.children().then(setChildren); }, []);

  const setPin = async (role, childId, pin) => {
    if (!pin) return;
    await api.setPin({ role, childId, pin });
    setMsg("PIN 已更新 ✓"); setTimeout(() => setMsg(""), 2000);
  };

  const Row = ({ label, role, childId }) => {
    const [pin, setPinVal] = useState("");
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 8 }}>
        <span style={{ flex: 1 }}>{label}</span>
        <input type="password" inputMode="numeric" placeholder="新 PIN" value={pin} onChange={(e) => setPinVal(e.target.value)} style={{ width: 120 }} />
        <button className="done-btn" onClick={() => setPin(role, childId, pin)}>更新</button>
      </div>
    );
  };

  return (
    <div className="panel">
      <Row label="家长" role="parent" />
      {children.map((c) => <Row key={c.id} label={`${c.emoji} ${c.name}`} role="child" childId={c.id} />)}
      {msg && <div style={{ color: "#3b6d11" }}>{msg}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Write `web/src/pages/ParentLogs.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const TYPE_LABEL = { task: "打卡", adjust: "加分", redeem: "兑换" };

export default function ParentLogs() {
  const [logs, setLogs] = useState([]);
  const [childId, setChildId] = useState("");
  const [children, setChildren] = useState([]);
  useEffect(() => { api.children().then(setChildren); }, []);
  useEffect(() => { api.logs(childId).then(setLogs); }, [childId]);

  return (
    <div>
      <select value={childId} onChange={(e) => setChildId(e.target.value)} style={{ marginBottom: 8 }}>
        <option value="">全部孩子</option>
        {children.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
      </select>
      {logs.map((e) => (
        <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderBottom: "1px solid var(--line)", fontSize: 13 }}>
          <span>{TYPE_LABEL[e.type]} · {e.childId} {e.note ? `（${e.note}）` : ""}</span>
          <span style={{ color: e.delta >= 0 ? "#3b6d11" : "#cc3333" }}>{e.delta >= 0 ? "+" : ""}{e.delta}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds with no unresolved imports.

- [ ] **Step 7: Commit**

```bash
git add web/src/pages/ParentTasksAdmin.jsx web/src/pages/ParentRewardsAdmin.jsx web/src/pages/ParentAdjust.jsx web/src/pages/ParentPins.jsx web/src/pages/ParentLogs.jsx
git commit -m "feat(web): parent admin sections (tasks, rewards, adjust, pins, logs)"
```

---

## Task 23: End-to-end smoke test (build + run + click-through)

**Files:** none (verification task)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: `web/dist` produced.

- [ ] **Step 2: Start the server**

Run: `PORT=8080 node server/src/index.js`
Expected: logs `Happy Star running at http://0.0.0.0:8080`.

- [ ] **Step 3: Manual click-through in a browser at `http://localhost:8080`**

Verify each, checking against the spec's acceptance points:
- Login as 王颢霖 (PIN `0000`) → Tasks tab shows seeded tasks.
- Tap a task's `Done` → row turns yellow with ✓, top star count animates up.
- Tap same task past its daily limit → friendly "已达上限" message, no extra points.
- Rewards tab → progress bars; tap 兑换 on an affordable reward → "等家长同意".
- Calendar tab → today shows your earned points.
- Logout, login as 家长 (PIN `0000`) → 待审批 shows the pending redemption with balance check.
- Approve → child balance drops by the cost; reject another → no change.
- 加分 → child total increases; 任务/奖励 add+delete works; PIN update lets the child log in with the new PIN; 日志 lists events newest-first.

- [ ] **Step 4: Restart persistence check**

Stop and restart the server; confirm balances, tasks, and rewards persist (data is in `data/*.json`).

- [ ] **Step 5: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "test: end-to-end smoke verification and fixes"
```

---

## Task 24: Deployment artifacts + README run section

**Files:**
- Create: `deploy/happy-star.service`
- Modify: `README.md` (fill the run/deploy section with verified steps)

- [ ] **Step 1: Write `deploy/happy-star.service`**

```ini
[Unit]
Description=Happy Star family points
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/happy-star
Environment=PORT=8080
Environment=HOST=0.0.0.0
Environment=HAPPY_STAR_DATA=/opt/happy-star/data
ExecStart=/usr/bin/node server/src/index.js
Restart=always
User=happystar

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Update `README.md` run section** with the verified commands

Replace the "运行（实现后补全）" section body with:

```bash
npm run install:all   # 安装 server 与 web 依赖
npm run build         # 构建前端到 web/dist
npm start             # 启动（默认 0.0.0.0:8080）
# 浏览器访问 http://<内网IP>:8080
```

And add a deploy subsection:

```markdown
### 开机自启（systemd）

1. 把项目放到 `/opt/happy-star`，`npm run install:all && npm run build`。
2. 建用户：`sudo useradd -r -s /bin/false happystar && sudo chown -R happystar /opt/happy-star`。
3. `sudo cp deploy/happy-star.service /etc/systemd/system/`。
4. `sudo systemctl enable --now happy-star`。

默认 PIN 全为 `0000`，首次登录后请在家长「PIN」页修改全部 PIN。
```

- [ ] **Step 3: Commit**

```bash
git add deploy/happy-star.service README.md
git commit -m "docs: systemd service and verified run/deploy steps"
```

---

## Self-Review notes (already reconciled against the spec)

- Spec §4 data model → Tasks 2, 9 (store + seed) define every file/field used.
- Spec §5 rules → Task 5 (daily limit), Task 6/13 (redeem deduct + balance guard, never negative), Task 4/12 (balance from events).
- Spec §6 roles/PIN → Tasks 8, 10, 11, 13 (login, guards, parent PIN admin).
- Spec §7 UI (neutral bg + yellow accent, task row right-side status, week tabs, calendar, rewards progress) → Tasks 15–22; matches `docs/prototypes/task-list-states.html`.
- Spec §7 animations → Task 17 (StarCount count-up), TaskRow color transition; confetti deferred as polish (not blocking; can be added to RewardsTab redeem success later — out of core acceptance).
- Spec §8 API → Tasks 10, 12, 13 implement every listed endpoint; `/api/children` added in Task 15.
- Spec §10 deploy/seed → Tasks 9, 14, 24.
- Spec §11 acceptance → Task 23 verifies each point.

Naming consistency: collection names (`config/children/tasks/rewards/events/redemptions`), event shape (`type/childId/delta/refId/note/createdAt`), and redemption shape (`status/cost/childId/rewardId/decidedAt`) are identical across store, domain, routes, and frontend.
