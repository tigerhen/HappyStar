import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import GrowthPlanDetail from "../components/GrowthPlanDetail.jsx";

export default function GrowthPlansTab() {
  const [plans, setPlans] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.growthPlans().then((rows) => { setPlans(rows); setSelected(rows[0]?.id || null); }); }, []);
  if (!plans) return <div className="gp-empty">加载计划中...</div>;
  if (!plans.length) return <div className="gp-empty">还没有成长计划</div>;
  const plan = plans.find((row) => row.id === selected) || plans[0];
  const replace = (next) => setPlans((rows) => rows.map((row) => row.id === next.id ? next : row));
  const progress = async (planId, itemId, delta) => { setBusy(true); try { replace(await api.growthPlanProgress(planId, itemId, delta)); } finally { setBusy(false); } };
  const deliver = async (planId, itemId, done) => { setBusy(true); try { replace(await api.growthPlanDeliverable(planId, itemId, done)); } finally { setBusy(false); } };
  return <div>
    {plans.length > 1 && <select className="gp-select" value={plan.id} onChange={(event) => setSelected(event.target.value)}>{plans.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>}
    <GrowthPlanDetail plan={plan} busy={busy} onProgress={progress} onDeliverable={deliver} />
  </div>;
}
