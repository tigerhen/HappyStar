import React, { useEffect, useState } from "react";

const COLORS = ["#ffcc33", "#ff9f1c", "#ff6f91", "#5bb85b", "#378add", "#b14a6b"];

export default function Confetti({ fire }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!fire) return;
    const next = Array.from({ length: 40 }, (_, i) => ({
      id: `${fire}-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * 0.25,
      dur: 1.6 + Math.random() * 1.2,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.round(Math.random() * 6),
    }));
    setPieces(next);
    const timer = setTimeout(() => setPieces([]), 3200);
    return () => clearTimeout(timer);
  }, [fire]);

  if (pieces.length === 0) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50 }}>
      {pieces.map((p) => (
        <span key={p.id} style={{
          position: "absolute", left: p.left + "vw", top: 0,
          width: p.size, height: p.size, background: p.color, borderRadius: 2,
          animation: `hs-fall ${p.dur}s linear ${p.delay}s forwards`,
        }} />
      ))}
    </div>
  );
}
