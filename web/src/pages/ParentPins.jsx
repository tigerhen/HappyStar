import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function ParentPins() {
  const [children, setChildren] = useState([]);
  const [msg, setMsg] = useState("");
  useEffect(() => { api.children().then(setChildren); }, []);

  const setPin = async (role, childId, pin) => {
    if (!pin) return;
    await api.setPin({ role, childId, pin });
    setMsg("PIN 已更新 ✓"); setTimeout(() => setMsg(""), 2000);
  };

  const Row = ({ label, role, childId }) => {
    const [pin, setPinVal] = useState("");
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 8 }}>
        <span style={{ flex: 1 }}>{label}</span>
        <input type="password" inputMode="numeric" placeholder="新 PIN" value={pin} onChange={(e) => setPinVal(e.target.value)} style={{ width: 120 }} />
        <button className="done-btn" onClick={() => setPin(role, childId, pin)}>更新</button>
      </div>
    );
  };

  return (
    <div className="panel">
      <Row label="家长" role="parent" />
      {children.map((c) => <Row key={c.id} label={`${c.emoji} ${c.name}`} role="child" childId={c.id} />)}
      {msg && <div style={{ color: "#3b6d11" }}>{msg}</div>}
    </div>
  );
}
