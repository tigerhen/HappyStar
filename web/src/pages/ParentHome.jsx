import React, { useState } from "react";
import { api } from "../api.js";
import ParentApprovals from "./ParentApprovals.jsx";
import ParentTasks from "./ParentTasks.jsx";
import ParentRewards from "./ParentRewards.jsx";
import ParentAdjust from "./ParentAdjust.jsx";
import ParentPins from "./ParentPins.jsx";
import ParentLogs from "./ParentLogs.jsx";

const SECTIONS = [
  ["approvals", "待审批"], ["tasks", "任务"], ["rewards", "奖励"],
  ["adjust", "加分"], ["pins", "PIN"], ["logs", "日志"],
];

export default function ParentHome({ onLogout }) {
  const [sec, setSec] = useState("approvals");
  const logout = async () => { await api.logout(); onLogout(); };
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontWeight: 500 }}>👪 家长</strong>
        <button onClick={logout} style={{ border: "none", background: "none", color: "var(--ink-soft)" }}>退出 ⤴</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}>
        {SECTIONS.map(([id, label]) => (
          <button key={id} onClick={() => setSec(id)} style={{
            padding: "6px 12px", borderRadius: 16, border: "1px solid var(--line)",
            background: sec === id ? "var(--accent)" : "#fff", color: sec === id ? "var(--accent-ink)" : "var(--ink)",
          }}>{label}</button>
        ))}
      </div>
      {sec === "approvals" && <ParentApprovals />}
      {sec === "tasks" && <ParentTasks />}
      {sec === "rewards" && <ParentRewards />}
      {sec === "adjust" && <ParentAdjust />}
      {sec === "pins" && <ParentPins />}
      {sec === "logs" && <ParentLogs />}
    </div>
  );
}