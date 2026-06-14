import React from "react";

export default function TaskRow({ task, onComplete }) {
  const done = task.atLimit;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 10,
      borderRadius: 14, border: "1px solid " + (done ? "var(--accent)" : "var(--line)"),
      background: done ? "var(--accent)" : "#fff", transition: "background .3s, border-color .3s",
    }}>
      <span style={{ fontSize: 20 }}>{task.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: done ? "#5a4500" : "var(--ink)" }}>{task.name}</div>
        <div style={{ fontSize: 12, color: done ? "#9a7a12" : "var(--ink-soft)" }}>
          ★{task.points} · {task.doneToday}/{task.dailyLimit}
        </div>
      </div>
      {done ? (
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.55)", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b5200", fontSize: 17 }}>✓</span>
      ) : (
        <button className="done-btn" onClick={() => onComplete(task.id)}>Done</button>
      )}
    </div>
  );
}
