import React, { useState } from "react";
import { api } from "../api.js";
import StarCount from "../components/StarCount.jsx";
import TasksTab from "./TasksTab.jsx";
import RewardsTab from "./RewardsTab.jsx";
import CalendarTab from "./CalendarTab.jsx";

const TABS = [["tasks", "任务"], ["rewards", "奖励"], ["calendar", "日历"]];

export default function ChildHome({ me, onLogout }) {
  const [tab, setTab] = useState("tasks");
  const [balance, setBalance] = useState(me.balance);

  const logout = async () => { await api.logout(); onLogout(); };

  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 4px" }}>
        <button onClick={logout} style={{ border: "none", background: "none", color: "var(--ink-soft)" }}>切换 ⤴</button>
        <StarCount value={balance} />
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 12 }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: "10px 0", border: "none", background: "none",
            color: tab === id ? "#e8852b" : "var(--ink-soft)",
            borderBottom: tab === id ? "3px solid #ff9f1c" : "3px solid transparent", fontWeight: 500,
          }}>{label}</button>
        ))}
      </div>
      {tab === "tasks" && <TasksTab onBalance={setBalance} />}
      {tab === "rewards" && <RewardsTab balance={balance} />}
      {tab === "calendar" && <CalendarTab childId={me.childId} />}
    </div>
  );
}