import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY = { name: "", emoji: "⭐", points: 5, dailyLimit: 1, weeklyDays: 7, core: false, enabled: true };

export default function ParentTasksAdmin({ onChanged = () => {} }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const reload = async () => setItems(await (await fetch("/api/admin/tasks")).json());
  useEffect(() => { reload(); }, []);

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

  return (
    <div>
      <div className="panel" style={{ marginBottom: 12, display: "grid", gap: 8 }}>
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
        <button className="done-btn" onClick={add}>添加任务</button>
      </div>
      {items.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderBottom: "1px solid var(--line)" }}>
          <span>{t.emoji}</span><span style={{ flex: 1 }}>{t.name}</span>
          <span style={{ color: "var(--ink-soft)" }}>★{t.points} · {t.dailyLimit}/天 · {t.weeklyDays ?? 7}天/周{t.core ? " · 核心" : ""}</span>
          <button onClick={() => remove(t.id)} style={{ border: "none", background: "none", color: "#cc3333" }}>删除</button>
        </div>
      ))}
    </div>
  );
}
