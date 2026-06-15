import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const COLORS = { haolin: "#d4537e", zhongxian: "#378add" };

function monthMatrix(month) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  return cells;
}

export default function CalendarTab() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState({});
  useEffect(() => { api.calendar(month).then(setData); }, [month]);
  const cells = useMemo(() => monthMatrix(month), [month]);
  const today = new Date().toISOString().slice(0, 10);

  const shift = (delta) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button onClick={() => shift(-1)} style={{ border: "none", background: "none" }}>‹</button>
        <strong style={{ fontWeight: 500 }}>{month}</strong>
        <button onClick={() => shift(1)} style={{ border: "none", background: "none" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, fontSize: 10, color: "var(--ink-soft)", textAlign: "center", marginBottom: 4 }}>
        {["一", "二", "三", "四", "五", "六", "日"].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((key, i) => {
          if (!key) return <div key={i} />;
          const day = data[key];
          const isToday = key === today;
          return (
            <div key={key} style={{
              aspectRatio: "1", borderRadius: 8, padding: 3, fontSize: 9,
              background: isToday ? "#fff3c4" : "var(--surface)",
              border: isToday ? "2px solid var(--accent-strong)" : "1px solid var(--line)",
            }}>
              <div style={{ color: "var(--ink-soft)" }}>{Number(key.slice(-2))} {day?.hasRedemption ? "🎁" : ""}</div>
              {day && Object.entries(day.earned).map(([cid, pts]) => (
                <div key={cid} style={{ display: "inline-block", marginTop: 2, marginRight: 2, padding: "0 4px", borderRadius: 8, fontWeight: 500, color: "#fff", background: COLORS[cid] || "#888" }}>+{pts}</div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}