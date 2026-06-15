# Happy Star UI Polish Implementation Plan

> ✅ **已全部完成**（10 任务，commit `baaf8c1`..`d86707e`；外加 3 个用户视觉验收 polish：commit `a112482` 中性底色、`f2ba0fd` 待审批孩子真名、`bd0442c` 日志页孩子真名）。本文件保留作为回溯参考；不要按字面重跑。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the child-facing screens (login + tasks/rewards/calendar) up to the approved prototype's "sunny" quality — per-child themed header, a real task-completion animation (check pop + floating `+N`), readable reward progress bars, and confetti on a successful redemption — without touching backend business rules or the parent admin screens' current clean look.

**Architecture:** Frontend-only React/CSS work, plus one small additive backend change: `/api/me` returns the logged-in child's profile (name/emoji/color) so the header can theme itself. No data-model, rule, or route-behavior changes. All existing tests must keep passing.

**Tech Stack:** React + Vite, plain CSS (inline styles + `theme.css` + a new `theme.js` helper), Vitest + Testing Library, `node:test` for the one backend change. Verified visually with the Claude Preview MCP (`launch.json` config `happy-star`, port 8080) already in the repo.

**Out of scope (do NOT change):** points/limit/redemption logic, JSON store, parent admin pages (`ParentTasksAdmin/RewardsAdmin/Adjust/Pins/Logs`), deployment files.

---

## File Structure

```
server/src/routes/auth.routes.js   MODIFY  /api/me returns child profile fields
server/test/routes.test.js         MODIFY  assert /api/me child profile
web/src/theme.css                  MODIFY  warmer tokens + keyframes + helper classes
web/src/theme.js                   CREATE  childTheme(color) -> {header, ink, soft}
web/src/pages/Login.jsx            MODIFY  warm hero + friendlier cards
web/src/App.jsx                    READONLY (already passes `me` through)
web/src/pages/ChildHome.jsx        MODIFY  themed header (avatar+name+slogan+star)
web/src/components/TaskRow.jsx     MODIFY  localized button + check pop + floating +N
web/test/TaskRow.test.jsx          MODIFY  label assertion -> 打卡
web/src/pages/TasksTab.jsx         MODIFY  pass per-row "just completed" signal
web/src/components/RewardRow.jsx   MODIFY  stronger progress bar + star icon
web/src/components/Confetti.jsx    CREATE  lightweight CSS confetti burst
web/src/pages/RewardsTab.jsx       MODIFY  fire confetti on redeem success
web/src/pages/CalendarTab.jsx      MODIFY  today highlight + clearer per-child dots
```

**Conventions**
- Backend tests: `npm --prefix server test`. Frontend tests: `npm --prefix web test`. Build: `npm run build`.
- Commit after each task with the message shown.
- Keep all existing colors readable; per-child colors come only from `theme.js`.
- Do not introduce new dependencies (no animation libraries — CSS only).

---

## Task 1: `/api/me` returns child profile

**Files:**
- Modify: `server/src/routes/auth.routes.js:37-45`
- Test: `server/test/routes.test.js` (extend the existing `/api/me` test)

- [ ] **Step 1: Update the failing assertion in `server/test/routes.test.js`**

Find the existing test `"/api/me reflects logged-in child"` and replace its body with:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server test`
Expected: FAIL — `body.name` is `undefined`.

- [ ] **Step 3: Update `server/src/routes/auth.routes.js` `/api/me` child branch**

Replace lines 37-45 (the `app.get("/api/me", ...)` handler) with:

```js
  app.get("/api/me", async (req, reply) => {
    const session = getSession(req.cookies[COOKIE]);
    if (!session) return reply.code(401).send({ error: "no_session" });
    if (session.role === "child") {
      const [events, children] = await Promise.all([
        readCollection("events", []),
        readCollection("children", []),
      ]);
      const child = children.find((c) => c.id === session.childId) || {};
      return {
        role: "child",
        childId: session.childId,
        balance: balance(events, session.childId),
        name: child.name,
        emoji: child.emoji,
        color: child.color,
      };
    }
    return { role: "parent" };
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server test`
Expected: PASS (all backend tests, count unchanged at 35).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/auth.routes.js server/test/routes.test.js
git commit -m "feat(server): /api/me returns child profile (name/emoji/color)"
```

---

## Task 2: Theme tokens, keyframes, and per-child helper

**Files:**
- Modify: `web/src/theme.css`
- Create: `web/src/theme.js`

- [ ] **Step 1: Replace `web/src/theme.css` with warmer tokens + keyframes**

```css
:root {
  --bg: #fff8ee;            /* warm cream page background */
  --surface: #ffffff;
  --panel: #fffdf8;
  --ink: #4a3f2e;
  --ink-soft: #b3a892;
  --line: #f0e7d6;
  --accent: #ffcc33;        /* yellow: Done button + completed row */
  --accent-strong: #ffb300;
  --accent-ink: #6b5200;
  --star: #ffb300;
  --tab: #ff9f1c;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
button { font: inherit; cursor: pointer; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 16px; box-shadow: 0 2px 10px rgba(180,150,80,.06); }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 2px 10px rgba(180,150,80,.06); }
.done-btn { background: var(--accent); color: var(--accent-ink); border: none; border-radius: 22px; padding: 8px 20px; font-weight: 500; box-shadow: 0 2px 6px rgba(255,179,0,.35); transition: transform .12s; }
.done-btn:active { transform: scale(.95); }

@keyframes hs-pop { 0% { transform: scale(0); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }
@keyframes hs-float { 0% { opacity: 0; transform: translateY(6px) scale(.8); } 25% { opacity: 1; transform: translateY(-2px) scale(1.1); } 100% { opacity: 0; transform: translateY(-28px); } }
@keyframes hs-fall { 0% { transform: translateY(-10vh) rotate(0); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 1; } }
.hs-check-pop { animation: hs-pop .4s cubic-bezier(.34,1.7,.64,1); }
.hs-floatup { animation: hs-float 1s ease-out forwards; }
```

- [ ] **Step 2: Create `web/src/theme.js`**

```js
const CHILD = {
  pink: { header: "#ffe3ec", ink: "#b14a6b", soft: "#e7a8bd", bar: "#ffd2e0" },
  blue: { header: "#e6f1fb", ink: "#185fa5", soft: "#9cc2e8", bar: "#cfe3f7" },
};
const FALLBACK = { header: "#fff0cc", ink: "#8a6a10", soft: "#e0c98a", bar: "#ffe6a8" };

export function childTheme(color) {
  return CHILD[color] || FALLBACK;
}
```

- [ ] **Step 3: Verify build still compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/src/theme.css web/src/theme.js
git commit -m "feat(web): warm theme tokens, animation keyframes, per-child theme helper"
```

---

## Task 3: Login page polish

**Files:**
- Modify: `web/src/pages/Login.jsx`

- [ ] **Step 1: Replace the picker (list) return block in `web/src/pages/Login.jsx`**

Replace the final `return (...)` (the avatar grid, lines 46-64) with:

```jsx
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 56, lineHeight: 1 }}>🌟</div>
      <h1 style={{ fontWeight: 500, margin: "12px 0 2px", fontSize: 30 }}>Happy Star</h1>
      <p style={{ color: "var(--ink-soft)", margin: 0 }}>越努力，越幸运</p>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 4 }}>小星星在等你哦 ⭐</p>
      <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
        {children.map((c) => (
          <button key={c.id} className="card" onClick={() => setPicked({ role: "child", childId: c.id, name: c.name, emoji: c.emoji })}
            style={{ border: "1px solid var(--line)", padding: "18px 12px", width: 120 }}>
            <div style={{ fontSize: 48 }}>{c.emoji}</div>
            <div style={{ marginTop: 6, fontWeight: 500 }}>{c.name}</div>
          </button>
        ))}
        <button className="card" onClick={() => setPicked({ role: "parent", name: "家长", emoji: "👪" })}
          style={{ border: "1px solid var(--line)", padding: "18px 12px", width: 120 }}>
          <div style={{ fontSize: 48 }}>👪</div>
          <div style={{ marginTop: 6, fontWeight: 500 }}>家长</div>
        </button>
      </div>
    </div>
  );
```

- [ ] **Step 2: Replace the PIN entry block (the `if (picked)` return, lines 25-43) with a softer card**

```jsx
  if (picked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div className="card" style={{ width: 320, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 56 }}>{picked.emoji}</div>
          <h2 style={{ fontWeight: 500, margin: "6px 0 16px" }}>{picked.name}</h2>
          <input
            type="password" inputMode="numeric" autoFocus value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="输入 PIN"
            style={{ fontSize: 24, textAlign: "center", letterSpacing: 8, padding: 12, width: "100%", borderRadius: 12, border: "1px solid var(--line)", background: "#fffdf8" }}
          />
          {error && <p style={{ color: "#cc3333" }}>{error}</p>}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button onClick={() => { setPicked(null); setPin(""); setError(""); }} style={{ flex: 1, padding: 12, borderRadius: 22, border: "1px solid var(--line)", background: "#fff" }}>返回</button>
            <button onClick={submit} className="done-btn" style={{ flex: 2, padding: 12 }}>进入</button>
          </div>
        </div>
      </div>
    );
  }
```

- [ ] **Step 3: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/Login.jsx
git commit -m "feat(web): warmer login hero and avatar/PIN cards"
```

---

## Task 4: Themed child header

**Files:**
- Modify: `web/src/pages/ChildHome.jsx`

- [ ] **Step 1: Replace `web/src/pages/ChildHome.jsx` entirely**

```jsx
import React, { useState } from "react";
import { api } from "../api.js";
import { childTheme } from "../theme.js";
import StarCount from "../components/StarCount.jsx";
import TasksTab from "./TasksTab.jsx";
import RewardsTab from "./RewardsTab.jsx";
import CalendarTab from "./CalendarTab.jsx";

const TABS = [["tasks", "任务"], ["rewards", "奖励"], ["calendar", "日历"]];

export default function ChildHome({ me, onLogout }) {
  const [tab, setTab] = useState("tasks");
  const [balance, setBalance] = useState(me.balance);
  const t = childTheme(me.color);

  const logout = async () => { await api.logout(); onLogout(); };

  return (
    <div style={{ maxWidth: 460, margin: "0 auto", minHeight: "100vh" }}>
      <div style={{ background: t.header, padding: "14px 16px 12px", borderRadius: "0 0 22px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{me.emoji}</div>
            <div>
              <div style={{ fontWeight: 500, color: t.ink }}>{me.name}</div>
              <div style={{ fontSize: 11, color: t.ink, opacity: .7 }}>越努力，越幸运 ⭐</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20 }}><StarCount value={balance} /></div>
            <button onClick={logout} style={{ border: "none", background: "none", color: t.ink, opacity: .6, fontSize: 12, padding: 0 }}>切换 ⤴</button>
          </div>
        </div>
      </div>

      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 12 }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "10px 0", border: "none", background: "none",
              color: tab === id ? "var(--tab)" : "var(--ink-soft)",
              borderBottom: tab === id ? "3px solid var(--tab)" : "3px solid transparent", fontWeight: 500,
            }}>{label}</button>
          ))}
        </div>
        {tab === "tasks" && <TasksTab onBalance={setBalance} />}
        {tab === "rewards" && <RewardsTab balance={balance} />}
        {tab === "calendar" && <CalendarTab childId={me.childId} />}
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
git add web/src/pages/ChildHome.jsx
git commit -m "feat(web): themed child header with avatar, name, slogan"
```

---

## Task 5: TaskRow — localized button, check pop, floating +N

**Files:**
- Modify: `web/test/TaskRow.test.jsx`
- Modify: `web/src/components/TaskRow.jsx`

- [ ] **Step 1: Update `web/test/TaskRow.test.jsx`** (button label is now 打卡; props add `flashTs`)

```jsx
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskRow from "../src/components/TaskRow.jsx";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix web test`
Expected: FAIL — no button named `打卡` (current label is `Done`).

- [ ] **Step 3: Replace `web/src/components/TaskRow.jsx`**

```jsx
import React, { useEffect, useRef, useState } from "react";

export default function TaskRow({ task, onComplete, flashTs }) {
  const done = task.atLimit;
  const [floatKey, setFloatKey] = useState(0);
  const prev = useRef(flashTs);

  useEffect(() => {
    if (flashTs && flashTs !== prev.current) {
      prev.current = flashTs;
      setFloatKey((k) => k + 1);
    }
  }, [flashTs]);

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 10,
      borderRadius: 16, border: "1px solid " + (done ? "var(--accent)" : "var(--line)"),
      background: done ? "var(--accent)" : "#fff",
      boxShadow: "0 2px 10px rgba(180,150,80,.06)",
      transition: "background .35s, border-color .35s",
    }}>
      <span style={{ fontSize: 26 }}>{task.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: done ? "#5a4500" : "var(--ink)", fontWeight: 500 }}>{task.name}</div>
        <div style={{ fontSize: 12, color: done ? "#9a7a12" : "var(--ink-soft)" }}>
          ★{task.points} · {task.doneToday}/{task.dailyLimit}
        </div>
      </div>

      {floatKey > 0 && (
        <span key={floatKey} className="hs-floatup" style={{ position: "absolute", right: 18, top: 6, fontWeight: 500, color: "#c97a00", pointerEvents: "none" }}>
          +{task.points} ⭐
        </span>
      )}

      {done ? (
        <span key={"c" + floatKey} className={floatKey ? "hs-check-pop" : ""} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2f7d32", fontSize: 18 }}>✓</span>
      ) : (
        <button className="done-btn" onClick={() => onComplete(task.id)}>打卡</button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix web test`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/TaskRow.jsx web/test/TaskRow.test.jsx
git commit -m "feat(web): TaskRow 打卡 label, check pop, floating +N animation"
```

---

## Task 6: TasksTab — emit the "just completed" signal

**Files:**
- Modify: `web/src/pages/TasksTab.jsx`

- [ ] **Step 1: Replace `web/src/pages/TasksTab.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import TaskRow from "../components/TaskRow.jsx";

export default function TasksTab({ onBalance }) {
  const [tasks, setTasks] = useState([]);
  const [msg, setMsg] = useState("");
  const [flash, setFlash] = useState(null); // { id, ts }

  const load = () => api.tasks().then(setTasks);
  useEffect(() => { load(); }, []);

  const complete = async (id) => {
    try {
      const res = await api.completeTask(id);
      onBalance(res.balance);
      setFlash({ id, ts: Date.now() });
      await load();
    } catch (e) {
      setMsg(e.code === "daily_limit" ? "今天这个任务已达上限啦" : "出错了，再试试");
      setTimeout(() => setMsg(""), 2000);
    }
  };

  return (
    <div>
      {msg && <div style={{ background: "#fff4d6", color: "#8a6a10", padding: 8, borderRadius: 10, marginBottom: 8 }}>{msg}</div>}
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} onComplete={complete} flashTs={flash && flash.id === t.id ? flash.ts : null} />
      ))}
      {tasks.length === 0 && <p style={{ color: "var(--ink-soft)" }}>今天没有任务啦 🎉</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles and tests pass**

Run: `npm --prefix web run build && npm --prefix web test`
Expected: build succeeds; TaskRow tests PASS.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/TasksTab.jsx
git commit -m "feat(web): TasksTab passes per-row just-completed signal"
```

---

## Task 7: RewardRow — readable progress bar + star icon

**Files:**
- Modify: `web/src/components/RewardRow.jsx`

- [ ] **Step 1: Replace `web/src/components/RewardRow.jsx`**

```jsx
import React from "react";

export default function RewardRow({ reward, balance, onRedeem }) {
  const pct = Math.min(100, Math.round((balance / reward.cost) * 100));
  return (
    <div className="card" style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 10, border: "1px solid " + (reward.affordable ? "var(--accent)" : "var(--line)") }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct + "%", background: reward.affordable ? "#ffe08a" : "#f4eddc", zIndex: 0, transition: "width .5s ease" }} />
      <span style={{ position: "relative", fontSize: 26 }}>{reward.emoji}</span>
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>
          {reward.name} <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 400 }}>{reward.category === "spirit" ? "精神" : "物质"}</span>
        </div>
        <div style={{ fontSize: 12, color: "#c97a00" }}>★{reward.cost} · {pct}%</div>
      </div>
      {reward.affordable
        ? <button className="done-btn" style={{ position: "relative" }} onClick={() => onRedeem(reward.id)}>兑换 🎁</button>
        : <span style={{ position: "relative", fontSize: 12, color: "var(--ink-soft)" }}>还差 {reward.cost - balance} ⭐</span>}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/RewardRow.jsx
git commit -m "feat(web): readable reward progress bar with percent and star icon"
```

---

## Task 8: Confetti component + fire on redeem

**Files:**
- Create: `web/src/components/Confetti.jsx`
- Modify: `web/src/pages/RewardsTab.jsx`

- [ ] **Step 1: Create `web/src/components/Confetti.jsx`**

```jsx
import React, { useEffect, useState } from "react";

const COLORS = ["#ffcc33", "#ff9f1c", "#ff6f91", "#5bb85b", "#378add", "#b14a6b"];

export default function Confetti({ fire }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!fire) return;
    const next = Array.from({ length: 40 }, (_, i) => ({
      id: `${fire}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      dur: 1.6 + Math.random() * 1.2,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.round(Math.random() * 6),
    }));
    setPieces(next);
    const timer = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(timer);
  }, [fire]);

  if (pieces.length === 0) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50 }}>
      {pieces.map((p) => (
        <span key={p.id} style={{
          position: "absolute", left: p.left + "vw", top: 0,
          width: p.size, height: p.size, background: p.color, borderRadius: 2,
          animation: `hs-fall ${p.dur}s linear ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace `web/src/pages/RewardsTab.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import RewardRow from "../components/RewardRow.jsx";
import Confetti from "../components/Confetti.jsx";

export default function RewardsTab({ balance }) {
  const [rewards, setRewards] = useState([]);
  const [msg, setMsg] = useState("");
  const [fire, setFire] = useState(0);

  useEffect(() => { api.rewards().then(setRewards); }, []);

  const redeem = async (id) => {
    try {
      await api.redeem(id);
      setMsg("已提交申请，等家长同意 🎁");
      setFire(Date.now());
    } catch (e) {
      setMsg(e.code === "out_of_stock" ? "这个奖励没货啦" : "出错了，再试试");
    }
    setTimeout(() => setMsg(""), 2500);
  };

  return (
    <div>
      <Confetti fire={fire} />
      {msg && <div style={{ background: "#fff4d6", color: "#8a6a10", padding: 8, borderRadius: 10, marginBottom: 8 }}>{msg}</div>}
      {rewards.map((r) => <RewardRow key={r.id} reward={r} balance={balance} onRedeem={redeem} />)}
    </div>
  );
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/Confetti.jsx web/src/pages/RewardsTab.jsx
git commit -m "feat(web): confetti burst on successful redemption request"
```

---

## Task 9: Calendar — today highlight + clearer per-child dots

**Files:**
- Modify: `web/src/pages/CalendarTab.jsx`

- [ ] **Step 1: In `web/src/pages/CalendarTab.jsx`, add a `today` constant** just after the `const cells = useMemo(...)` line:

```jsx
  const today = new Date().toISOString().slice(0, 10);
```

- [ ] **Step 2: Replace the day-cell render block** (the `cells.map((key, i) => { ... })` callback) with this version (adds today ring and rounded color chips):

```jsx
        {cells.map((key, i) => {
          if (!key) return <div key={i} />;
          const day = data[key];
          const isToday = key === today;
          return (
            <div key={key} style={{
              aspectRatio: "1", borderRadius: 8, padding: 3, fontSize: 9,
              background: isToday ? "#fff3c4" : "var(--surface)",
              border: isToday ? "2px solid var(--accent-strong)" : "1px solid var(--line)",
            }}>
              <div style={{ color: "var(--ink-soft)" }}>{Number(key.slice(-2))} {day?.hasRedemption ? "🎁" : ""}</div>
              {day && Object.entries(day.earned).map(([cid, pts]) => (
                <div key={cid} style={{ display: "inline-block", marginTop: 2, marginRight: 2, padding: "0 4px", borderRadius: 8, fontWeight: 500, color: "#fff", background: COLORS[cid] || "#888" }}>+{pts}</div>
              ))}
            </div>
          );
        })}
```

- [ ] **Step 3: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/CalendarTab.jsx
git commit -m "feat(web): calendar today highlight and clearer per-child chips"
```

---

## Task 10: Visual verification with Claude Preview

**Files:** none (verification task for the executor)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: `web/dist` produced, no errors.

- [ ] **Step 2: Start the preview server**

Use the Claude Preview MCP: `preview_start` with name `happy-star` (config already in `.claude/launch.json`, port 8080).

- [ ] **Step 3: Capture and confirm each child screen** (PIN for everyone is `0000`)

For 王颢霖 (pink) verify against the approved prototype:
- Login: warm cream background, friendly avatar cards, mascot 🌟.
- Child header: pink bar, avatar + name + slogan, animated star count.
- Tasks: tap 打卡 → row turns yellow, ✓ pops, `+N ⭐` floats up, header star count rolls up.
- Rewards: progress bars clearly filled, percent shown, affordable reward has 兑换 🎁 button; tapping it shows confetti + "等家长同意".
- Calendar: today cell highlighted; earned points shown as colored chips.

Then log in as 王仲贤 and confirm the header is **blue** (per-child theming works).

- [ ] **Step 4: Confirm nothing regressed for the parent**

Log in as 家长 (`0000`); confirm the admin sections still render and approvals still work (this plan did not change them).

- [ ] **Step 5: Run the whole test suite once more**

Run: `npm test`
Expected: backend 35 PASS, frontend 2 PASS.

- [ ] **Step 6: Stop the preview server** (`preview_stop`).

- [ ] **Step 7: Commit any fixes made during verification**

```bash
git add -A
git commit -m "test: UI polish visual verification and fixes"
```

---

## Self-Review notes (reconciled against the diagnosis the user approved)

- "登录偏灰平" → Task 3 (warm hero, mascot, card avatars).
- "缺头像+名字+slogan+专属色" → Task 1 (profile from `/api/me`) + Task 4 (themed header) + Task 2 (`childTheme`).
- "无对勾弹入/+N上浮动画" → Task 5 (`hs-check-pop`, `hs-floatup`) + Task 6 (signal wiring).
- "Done 还是英文" → Task 5 (button label `打卡`).
- "进度条太淡几乎看不见" → Task 7 (stronger fill, percent, star icon).
- "兑换无 confetti" → Task 8 (`Confetti` + fire on redeem).
- "日历偏稀疏" → Task 9 (today highlight, colored chips).
- Parent admin "优先级低、保持素净" → explicitly untouched (Task 10 step 4 only regression-checks).

Placeholder scan: no TBD/TODO; every step shows complete code. Type consistency: new prop `flashTs` is defined in TaskRow (Task 5) and supplied by TasksTab (Task 6); `childTheme(color)` returns `{header, ink, soft, bar}` and only `header`/`ink` are consumed in Task 4; `Confetti` takes a numeric `fire` prop set via `Date.now()` in Task 8. `/api/me` new fields (`name/emoji/color`) are produced in Task 1 and consumed via `me` in Task 4.

Risk note for the reviewer: `me` is loaded once in `App.jsx` at session bootstrap; after Task 1 it carries the child profile, so no extra fetch is needed. If `App.jsx` were changed to stop passing the full `me` object, Task 4's header would lose its theme — verify `App.jsx` still passes `me` straight through (it currently does).
