import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import Avatar from "../components/Avatar.jsx";

export default function ParentApprovals() {
  const [list, setList] = useState([]);
  const load = () => api.pending().then(setList);
  useEffect(() => { load(); }, []);

  const decide = async (id, ok) => {
    try { ok ? await api.approve(id) : await api.reject(id, ""); }
    catch (e) { alert(e.code === "insufficient_balance" ? "积分不够，无法通过" : "操作失败"); }
    await load();
  };

  if (list.length === 0) return <p style={{ color: "var(--ink-soft)" }}>没有待审批的兑换 🎉</p>;
  return (
    <div>
      {list.map((r) => {
        const enough = r.currentBalance >= r.cost;
        return (
          <div key={r.id} className="panel" style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar avatar={r.childAvatar} emoji={r.childEmoji} size={32} />
              <span><strong>{r.childName || r.childId}</strong> 想兑换 {r.rewardEmoji} {r.rewardName}（★{r.cost}）</span>
            </div>
            <div style={{ fontSize: 12, color: enough ? "#3b6d11" : "#cc3333" }}>
              当前余额 {r.currentBalance} {enough ? "✓" : "✗ 不足"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="done-btn" disabled={!enough} onClick={() => decide(r.id, true)} style={{ opacity: enough ? 1 : 0.5 }}>通过</button>
              <button onClick={() => decide(r.id, false)} style={{ borderRadius: 20, border: "1px solid var(--line)", background: "#fff", padding: "7px 18px" }}>拒绝</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}