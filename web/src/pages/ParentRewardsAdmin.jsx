import React, { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY = { name: "", emoji: "🎁", category: "material", cost: 50, stock: null, enabled: true };

export default function ParentRewardsAdmin() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const reload = async () => setItems(await (await fetch("/api/admin/rewards")).json());
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
