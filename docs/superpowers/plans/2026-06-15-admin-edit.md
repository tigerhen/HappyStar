# Task & Reward Inline Edit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the parent edit existing tasks and rewards (not just create/delete). Clicking 编辑 on a row loads it into the top form, which switches to "save changes" mode; saving calls the existing `PUT` endpoint.

**Architecture:** Frontend-only. The backend already exposes `PUT /api/admin/tasks/:id` and `PUT /api/admin/rewards/:id`, and `api.adminUpdate(kind, id, item)` already wraps them. Each admin page gains an `editingId` state: `null` = create mode (current behavior), otherwise edit mode. No backend, data-model, or route changes.

**Tech Stack:** React + Vite. No new dependencies. Verified with the Claude Preview MCP (`launch.json` config `happy-star`, port 8080).

**Out of scope:** changing validation rules, capacity logic, or the `enabled` toggle UX (kept as-is — edit preserves whatever `enabled` value the item had).

---

## File Structure

```
web/src/pages/ParentTasksAdmin.jsx    MODIFY  add edit mode (editingId, save/cancel, 编辑 button)
web/src/pages/ParentRewardsAdmin.jsx  MODIFY  add edit mode (editingId, save/cancel, 编辑 button)
```

**Conventions**
- Build check after each task: `npm --prefix web run build`.
- Commit after each task with the message shown.
- Edit must call `onChanged()` for tasks too, so the capacity panel refetches after an edit (a points/weeklyDays change moves capacity).

---

## Task 1: Edit mode for tasks

**Files:**
- Modify: `web/src/pages/ParentTasksAdmin.jsx`

- [ ] **Step 1: Replace `web/src/pages/ParentTasksAdmin.jsx` entirely**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY = { name: "", emoji: "⭐", points: 5, dailyLimit: 1, weeklyDays: 7, core: false, enabled: true };

export default function ParentTasksAdmin({ onChanged = () => {} }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const reload = async () => setItems(await (await fetch("/api/admin/tasks")).json());
  useEffect(() => { reload(); }, []);

  const payload = () => ({
    ...form,
    points: Number(form.points),
    dailyLimit: Number(form.dailyLimit),
    weeklyDays: Number(form.weeklyDays),
  });

  const save = async () => {
    if (!form.name) return;
    if (editingId) await api.adminUpdate("tasks", editingId, payload());
    else await api.adminCreate("tasks", payload());
    setForm(EMPTY); setEditingId(null); reload(); onChanged();
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setForm({
      name: t.name, emoji: t.emoji, points: t.points, dailyLimit: t.dailyLimit,
      weeklyDays: t.weeklyDays ?? 7, core: !!t.core, enabled: t.enabled !== false,
    });
  };
  const cancel = () => { setForm(EMPTY); setEditingId(null); };
  const remove = async (id) => { await api.adminDelete("tasks", id); if (id === editingId) cancel(); reload(); onChanged(); };

  return (
    <div>
      <div className="panel" style={{ marginBottom: 12, display: "grid", gap: 8 }}>
        {editingId && <div style={{ fontSize: 13, color: "var(--tab)" }}>正在编辑：{form.name || "（未命名）"}</div>}
        <input placeholder="任务名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="emoji" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
        <input type="number" placeholder="分值" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
        <input type="number" placeholder="每日上限" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} />
        <label style={{ fontSize: 13, color: "var(--ink-soft)" }}>每周可做天数（作业类填 5）</label>
        <input type="number" min="1" max="7" placeholder="每周可做天数" value={form.weeklyDays} onChange={(e) => setForm({ ...form, weeklyDays: e.target.value })} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <input type="checkbox" checked={form.core} onChange={(e) => setForm({ ...form, core: e.target.checked })} />
          核心任务（计入“基础”产能）
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="done-btn" onClick={save} style={{ flex: 1 }}>{editingId ? "保存修改" : "添加任务"}</button>
          {editingId && <button onClick={cancel} style={{ borderRadius: 22, border: "1px solid var(--line)", background: "#fff", padding: "8px 18px" }}>取消</button>}
        </div>
      </div>
      {items.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderBottom: "1px solid var(--line)", background: t.id === editingId ? "#fff8e1" : "transparent" }}>
          <span>{t.emoji}</span><span style={{ flex: 1 }}>{t.name}</span>
          <span style={{ color: "var(--ink-soft)" }}>★{t.points} · {t.dailyLimit}/天 · {t.weeklyDays ?? 7}天/周{t.core ? " · 核心" : ""}</span>
          <button onClick={() => startEdit(t)} style={{ border: "none", background: "none", color: "var(--tab)" }}>编辑</button>
          <button onClick={() => remove(t.id)} style={{ border: "none", background: "none", color: "#cc3333" }}>删除</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/ParentTasksAdmin.jsx
git commit -m "feat(web): inline edit for tasks (save changes via PUT)"
```

---

## Task 2: Edit mode for rewards

**Files:**
- Modify: `web/src/pages/ParentRewardsAdmin.jsx`

- [ ] **Step 1: Replace `web/src/pages/ParentRewardsAdmin.jsx` entirely**

```jsx
import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY = { name: "", emoji: "🎁", category: "material", cost: 50, stock: null, enabled: true };

export default function ParentRewardsAdmin() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const reload = async () => setItems(await (await fetch("/api/admin/rewards")).json());
  useEffect(() => { reload(); }, []);

  const payload = () => ({
    ...form,
    cost: Number(form.cost),
    stock: form.stock === "" || form.stock === null ? null : Number(form.stock),
  });

  const save = async () => {
    if (!form.name) return;
    if (editingId) await api.adminUpdate("rewards", editingId, payload());
    else await api.adminCreate("rewards", payload());
    setForm(EMPTY); setEditingId(null); reload();
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setForm({
      name: r.name, emoji: r.emoji, category: r.category, cost: r.cost,
      stock: typeof r.stock === "number" ? r.stock : null, enabled: r.enabled !== false,
    });
  };
  const cancel = () => { setForm(EMPTY); setEditingId(null); };
  const remove = async (id) => { await api.adminDelete("rewards", id); if (id === editingId) cancel(); reload(); };

  return (
    <div>
      <div className="panel" style={{ marginBottom: 12, display: "grid", gap: 8 }}>
        {editingId && <div style={{ fontSize: 13, color: "var(--tab)" }}>正在编辑：{form.name || "（未命名）"}</div>}
        <input placeholder="奖励名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="emoji" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="material">物质</option>
          <option value="spirit">精神</option>
        </select>
        <input type="number" placeholder="所需积分" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        <input placeholder="库存(留空=无限)" value={form.stock ?? ""} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="done-btn" onClick={save} style={{ flex: 1 }}>{editingId ? "保存修改" : "添加奖励"}</button>
          {editingId && <button onClick={cancel} style={{ borderRadius: 22, border: "1px solid var(--line)", background: "#fff", padding: "8px 18px" }}>取消</button>}
        </div>
      </div>
      {items.map((r) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderBottom: "1px solid var(--line)", background: r.id === editingId ? "#fff8e1" : "transparent" }}>
          <span>{r.emoji}</span><span style={{ flex: 1 }}>{r.name}</span>
          <span style={{ color: "var(--ink-soft)" }}>★{r.cost}{typeof r.stock === "number" ? ` · 库存${r.stock}` : ""}</span>
          <button onClick={() => startEdit(r)} style={{ border: "none", background: "none", color: "var(--tab)" }}>编辑</button>
          <button onClick={() => remove(r.id)} style={{ border: "none", background: "none", color: "#cc3333" }}>删除</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm --prefix web run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/ParentRewardsAdmin.jsx
git commit -m "feat(web): inline edit for rewards (save changes via PUT)"
```

---

## Task 3: Visual verification

**Files:** none.

- [ ] **Step 1:** `npm run build`, then `preview_start` (name `happy-star`).
- [ ] **Step 2:** Log in as 家长 (`0000`) → 任务. Click 编辑 on 完成作业; confirm the form fills with its values, button reads 保存修改, the row is highlighted. Change 分值 10→12, click 保存修改; confirm the row shows ★12 and the **产能总览 refetches** (满分/现实/基础 change accordingly) without leaving the page.
- [ ] **Step 3:** Click 取消 while editing another task; confirm the form resets to the create defaults and the button reverts to 添加任务.
- [ ] **Step 4:** 奖励 section: 编辑 a reward, change 所需积分, 保存修改; confirm the row updates. Edit stock from a number to empty (→ 无限) and confirm the row drops the 库存 label.
- [ ] **Step 5:** Add a brand-new task and a new reward (create path still works after the refactor).
- [ ] **Step 6:** `npm test` — backend 42 PASS, frontend 2 PASS (unchanged). `preview_stop`.
- [ ] **Step 7:** Commit any fixes.

```bash
git add -A
git commit -m "test: admin edit verification"
```

---

## Self-Review notes

- Backend already supports edit (`PUT /api/admin/{kind}/:id`, `api.adminUpdate`); this plan only adds the UI, so no server/test changes — frontend test count stays 2.
- Create path is preserved: `editingId === null` keeps the original `adminCreate` behavior; the submit button and handler branch on `editingId`.
- Tasks edit calls `onChanged()` (same as create/delete) so `CapacityPanel` refetches when points/dailyLimit/weeklyDays/core change (Task 3 step 2 verifies live capacity update). Rewards edit has no capacity coupling, so no `onChanged` there.
- `enabled` is preserved through edit (`startEdit` reads `r.enabled !== false`; existing items default to enabled), so editing never silently disables an item.
- Delete-while-editing guard: `remove` calls `cancel()` if the deleted row was being edited, avoiding a stale `editingId` that would turn the next create into an update of a now-missing id.
- Type consistency: `payload()` coerces numbers exactly as the old `add()` did; `adminUpdate(kind, id, item)` and `adminCreate(kind, item)` signatures match `api.js`.

Reviewer focus: edit then save persists (reload shows new values); capacity refetches after a task edit; 取消 fully resets; create still works; editing stock to empty yields unlimited (no 库存 label).
