import React, { useEffect, useState } from "react";
import { api } from "../api.js";

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
      <div style={{ maxWidth: 360, margin: "40px auto", padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>{picked.emoji}</div>
        <h2 style={{ fontWeight: 500 }}>{picked.name}</h2>
        <input
          type="password" inputMode="numeric" autoFocus value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="输入 PIN"
          style={{ fontSize: 24, textAlign: "center", letterSpacing: 8, padding: 12, width: "100%", borderRadius: 12, border: "1px solid var(--line)" }}
        />
        {error && <p style={{ color: "#cc3333" }}>{error}</p>}
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button onClick={() => { setPicked(null); setPin(""); setError(""); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid var(--line)", background: "#fff" }}>返回</button>
          <button onClick={submit} className="done-btn" style={{ flex: 2, padding: 12 }}>进入</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16, textAlign: "center" }}>
      <h1 style={{ fontWeight: 500 }}>Happy Star ⭐</h1>
      <p style={{ color: "var(--ink-soft)" }}>越努力，越幸运</p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
        {children.map((c) => (
          <button key={c.id} onClick={() => setPicked({ role: "child", childId: c.id, name: c.name, emoji: c.emoji })}
            style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 16, padding: 16, width: 110 }}>
            <div style={{ fontSize: 40 }}>{c.emoji}</div>
            <div>{c.name}</div>
          </button>
        ))}
        <button onClick={() => setPicked({ role: "parent", name: "家长", emoji: "👪" })}
          style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 16, padding: 16, width: 110 }}>
          <div style={{ fontSize: 40 }}>👪</div>
          <div>家长</div>
        </button>
      </div>
    </div>
  );
}
