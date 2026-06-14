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
