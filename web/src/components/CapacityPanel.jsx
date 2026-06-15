import React, { useEffect, useState } from "react";
import { api } from "../api.js";

function Eta({ weeks }) {
  if (weeks == null) return <span style={{ color: "var(--ink-soft)" }}>—</span>;
  const days = Math.round(weeks * 7);
  return <span>{weeks} 周<span style={{ color: "var(--ink-soft)", fontSize: 11 }}>（约{days}天）</span></span>;
}

export default function CapacityPanel({ reloadKey }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.capacity().then(setData); }, [reloadKey]);

  if (!data) return <p style={{ color: "var(--ink-soft)" }}>加载中…</p>;
  const { capacity: cap, rewards } = data;

  const Metric = ({ label, value }) => (
    <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>分/周</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Metric label="基础（核心）" value={cap.base} />
        <Metric label="现实 80%" value={cap.realistic} />
        <Metric label="满分 100%" value={cap.max} />
      </div>

      {cap.base === 0 && (
        <div style={{ background: "#fff4d6", color: "#8a6a10", padding: 8, borderRadius: 10, marginBottom: 10, fontSize: 13 }}>
          还没有标记“核心”的任务，基础场景显示 —。勾选任务的“核心”即可。
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ color: "var(--ink-soft)", textAlign: "left" }}>
            <th style={{ padding: "6px 4px" }}>奖励</th>
            <th style={{ padding: "6px 4px" }}>★</th>
            <th style={{ padding: "6px 4px" }}>基础</th>
            <th style={{ padding: "6px 4px" }}>80%</th>
            <th style={{ padding: "6px 4px" }}>满分</th>
          </tr>
        </thead>
        <tbody>
          {rewards.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ padding: "8px 4px" }}>{r.emoji} {r.name}</td>
              <td style={{ padding: "8px 4px" }}>{r.cost}</td>
              <td style={{ padding: "8px 4px" }}><Eta weeks={r.etaBase} /></td>
              <td style={{ padding: "8px 4px" }}><Eta weeks={r.etaRealistic} /></td>
              <td style={{ padding: "8px 4px" }}><Eta weeks={r.etaMax} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
