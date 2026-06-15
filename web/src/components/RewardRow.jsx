import React from "react";

export default function RewardRow({ reward, balance, onRedeem }) {
  const pct = Math.min(100, Math.round((balance / reward.cost) * 100));
  return (
    <div className="card" style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 10, border: "1px solid " + (reward.affordable ? "var(--accent)" : "var(--line)") }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct + "%", background: reward.affordable ? "#ffe08a" : "#f4eddc", zIndex: 0, transition: "width .5s ease" }} />
      <span style={{ position: "relative", fontSize: 26 }}>{reward.emoji}</span>
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>
          {reward.name} <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 400 }}>{reward.category === "spirit" ? "精神" : "物质"}</span>
        </div>
        <div style={{ fontSize: 12, color: "#c97a00" }}>★{reward.cost} · {pct}%</div>
      </div>
      {reward.affordable
        ? <button className="done-btn" style={{ position: "relative" }} onClick={() => onRedeem(reward.id)}>兑换 🎁</button>
        : <span style={{ position: "relative", fontSize: 12, color: "var(--ink-soft)" }}>还差 {reward.cost - balance} ⭐</span>}
    </div>
  );
}
