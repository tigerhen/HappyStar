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
