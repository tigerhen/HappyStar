import React, { useEffect, useRef, useState } from "react";

export default function StarCount({ value }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const dur = 600;
    let raf;
    const step = (t) => {
      const p = Math.min((t - start) / dur, 1);
      setShown(Math.round(from + (to - from) * p));
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 500, color: "#c97a00" }}>
      {shown} <span style={{ color: "var(--star)" }}>★</span>
    </span>
  );
}
