import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import Avatar from "../components/Avatar.jsx";

export default function Login({ onLogin }) {
  const [children, setChildren] = useState([]);
  const [picked, setPicked] = useState(null); // {role, childId, name, emoji}
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { api.children().then(setChildren); }, []);

  const submit = async () => {
    setError("");
    try {
      await api.login(picked.role === "parent"
        ? { role: "parent", pin }
        : { role: "child", childId: picked.childId, pin });
      onLogin();
    } catch (e) {
      setError("PIN 不对，再试试");
      setPin("");
    }
  };

  if (picked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div className="card" style={{ width: 320, padding: 24, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}><Avatar avatar={picked.avatar} emoji={picked.emoji} size={72} /></div>
          <h2 style={{ fontWeight: 500, margin: "6px 0 16px" }}>{picked.name}</h2>
          <input
            type="password" inputMode="numeric" autoFocus value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="输入 PIN"
            style={{ fontSize: 24, textAlign: "center", letterSpacing: 8, padding: 12, width: "100%", borderRadius: 12, border: "1px solid var(--line)", background: "#fffdf8" }}
          />
          {error && <p style={{ color: "#cc3333" }}>{error}</p>}
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button onClick={() => { setPicked(null); setPin(""); setError(""); }} style={{ flex: 1, padding: 12, borderRadius: 22, border: "1px solid var(--line)", background: "#fff" }}>返回</button>
            <button onClick={submit} className="done-btn" style={{ flex: 2, padding: 12 }}>进入</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 56, lineHeight: 1 }}>🌟</div>
      <h1 style={{ fontWeight: 500, margin: "12px 0 2px", fontSize: 30 }}>Happy Star</h1>
      <p style={{ color: "var(--ink-soft)", margin: 0 }}>越努力，越幸运</p>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 4 }}>小星星在等你哦 ⭐</p>
      <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
        {children.map((c) => (
          <button key={c.id} className="card" onClick={() => setPicked({ role: "child", childId: c.id, name: c.name, avatar: c.avatar, emoji: c.emoji })}
            style={{ border: "1px solid var(--line)", padding: "18px 12px", width: 120 }}>
            <div style={{ display: "flex", justifyContent: "center" }}><Avatar avatar={c.avatar} emoji={c.emoji} size={56} /></div>
            <div style={{ marginTop: 6, fontWeight: 500 }}>{c.name}</div>
          </button>
        ))}
        <button className="card" onClick={() => setPicked({ role: "parent", name: "家长", emoji: "👪" })}
          style={{ border: "1px solid var(--line)", padding: "18px 12px", width: 120 }}>
          <div style={{ fontSize: 48 }}>👪</div>
          <div style={{ marginTop: 6, fontWeight: 500 }}>家长</div>
        </button>
      </div>
    </div>
  );
}
