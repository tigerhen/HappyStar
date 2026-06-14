import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import RewardRow from "../components/RewardRow.jsx";

export default function RewardsTab({ balance }) {
  const [rewards, setRewards] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => { api.rewards().then(setRewards); }, []);

  const redeem = async (id) => {
    try {
      await api.redeem(id);
      setMsg("已提交申请，等家长同意 🎁");
    } catch (e) {
      setMsg(e.code === "out_of_stock" ? "这个奖励没货啦" : "出错了，再试试");
    }
    setTimeout(() => setMsg(""), 2500);
  };

  return (
    <div>
      {msg && <div style={{ background: "#fff4d6", color: "#8a6a10", padding: 8, borderRadius: 10, marginBottom: 8 }}>{msg}</div>}
      {rewards.map((r) => <RewardRow key={r.id} reward={r} balance={balance} onRedeem={redeem} />)}
    </div>
  );
}
