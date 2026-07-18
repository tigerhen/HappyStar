import React, { useState } from "react";
import { api } from "../api.js";
import { childTheme } from "../theme.js";
import StarCount from "../components/StarCount.jsx";
import Avatar from "../components/Avatar.jsx";
import TasksTab from "./TasksTab.jsx";
import RewardsTab from "./RewardsTab.jsx";
import CalendarTab from "./CalendarTab.jsx";
import GrowthPlansTab from "./GrowthPlansTab.jsx";

const TABS = [["tasks", "任务"], ["plans", "计划"], ["rewards", "奖励"], ["calendar", "日历"]];

export default function ChildHome({ me, onLogout }) {
  const [tab, setTab] = useState("tasks");
  const [balance, setBalance] = useState(me.balance);
  const t = childTheme(me.color);

  const logout = async () => { await api.logout(); onLogout(); };

  return (
    <div style={{ maxWidth: 460, margin: "0 auto", minHeight: "100vh" }}>
      <div style={{ background: t.header, padding: "14px 16px 12px", borderRadius: "0 0 22px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40 }}><Avatar avatar={me.avatar} emoji={me.emoji} size={40} /></div>
            <div>
              <div style={{ fontWeight: 500, color: t.ink }}>{me.name}</div>
              <div style={{ fontSize: 11, color: t.ink, opacity: .7 }}>越努力，越幸运 ⭐</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20 }}><StarCount value={balance} /></div>
            <button onClick={logout} style={{ border: "none", background: "none", color: t.ink, opacity: .6, fontSize: 12, padding: 0 }}>切换 ⤴</button>
          </div>
        </div>
      </div>

      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 12 }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "10px 0", border: "none", background: "none",
              color: tab === id ? "var(--tab)" : "var(--ink-soft)",
              borderBottom: tab === id ? "3px solid var(--tab)" : "3px solid transparent", fontWeight: 500,
            }}>{label}</button>
          ))}
        </div>
        {tab === "tasks" && <TasksTab onBalance={setBalance} />}
        {tab === "plans" && <GrowthPlansTab />}
        {tab === "rewards" && <RewardsTab balance={balance} />}
        {tab === "calendar" && <CalendarTab childId={me.childId} />}
      </div>
    </div>
  );
}
