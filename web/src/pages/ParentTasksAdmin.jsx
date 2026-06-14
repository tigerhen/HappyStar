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
