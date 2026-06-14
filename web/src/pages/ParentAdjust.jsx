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
