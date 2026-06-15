import React, { useEffect, useRef, useState } from "react";

export default function TaskRow({ task, onComplete, flashTs }) {
  const done = task.atLimit;
  const [floatKey, setFloatKey] = useState(0);
  const prev = useRef(flashTs);

  useEffect(() => {
    if (flashTs && flashTs !== prev.current) {
      prev.current = flashTs;
      setFloatKey((k) => k + 1);
    }
  }, [flashTs]);

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 10,
      borderRadius: 16, border: "1px solid " + (done ? "var(--accent)" : "var(--line)"),
      background: done ? "var(--accent)" : "#fff",
      boxShadow: "0 2px 10px rgba(180,150,80,.06)",
      transition: "background .35s, border-color .35s",
    }}>
      <span style={{ fontSize: 26 }}>{task.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: done ? "#5a4500" : "var(--ink)", fontWeight: 500 }}>{task.name}</div>
        <div style={{ fontSize: 12, color: done ? "#9a7a12" : "var(--ink-soft)" }}>
          ★{task.points} · {task.doneToday}/{task.dailyLimit}
        </div>
      </div>

      {floatKey > 0 && (
        <span key={floatKey} className="hs-floatup" style={{ position: "absolute", right: 18, top: 6, fontWeight: 500, color: "#c97a00", pointerEvents: "none" }}>
          +{task.points} ⭐
        </span>
      )}

      {done ? (
        <span key={"c" + floatKey} className={floatKey ? "hs-check-pop" : ""} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2f7d32", fontSize: 18 }}>✓</span>
      ) : (
        <button className="done-btn" onClick={() => onComplete(task.id)}>打卡</button>
      )}
    </div>
  );
}
