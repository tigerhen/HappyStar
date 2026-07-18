import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import MeasurementsView from "../components/MeasurementsView.jsx";

export default function MeasurementsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.measurements().then(setData).catch(() => setError("测量记录加载失败，请稍后重试"));
  }, []);

  if (error) return <div className="bm-message error">{error}</div>;
  if (!data) return <div className="bm-message">正在加载测量记录…</div>;
  return <MeasurementsView data={data} />;
}
