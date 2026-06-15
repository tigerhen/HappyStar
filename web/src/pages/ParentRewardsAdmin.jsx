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
