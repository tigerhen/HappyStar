import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import GrowthPlanDetail from "../components/GrowthPlanDetail.jsx";

const shortId = (prefix) => `${prefix}_${Date.now().toString(36).slice(-6)}`;

export default function ParentGrowthPlans() {
  const [plans, setPlans] = useState(null);
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [newPlan, setNewPlan] = useState({ childId: "haolin", name: "", startDate: "", endDate: "", targetPoints: 500 });
  const [newItem, setNewItem] = useState({ group: "", name: "", unit: "次", target: 1, weight: 1, optional: false, scheduleMode: "uniform", startDate: "", endDate: "" });
  const [deliverable, setDeliverable] = useState("");

  const load = async () => {
    const [rows, kids] = await Promise.all([api.adminGrowthPlans(), api.children()]);
    setPlans(rows); setChildren(kids); setSelected((id) => rows.some((row) => row.id === id) ? id : (rows[0]?.id || ""));
  };
  useEffect(() => { load(); }, []);
  if (!plans) return <div className="gp-empty">加载计划中...</div>;
  const plan = plans.find((row) => row.id === selected);
  const replace = (next) => setPlans((rows) => rows.map((row) => row.id === next.id ? next : row));
  const save = async (next) => { setBusy(true); try { replace(await api.adminUpdateGrowthPlan(next.id, next)); } finally { setBusy(false); } };
  const progress = async (planId, itemId, delta) => { setBusy(true); try { replace(await api.adminGrowthPlanProgress(planId, itemId, delta)); } finally { setBusy(false); } };
  const toggleDeliverable = async (planId, itemId, done) => { setBusy(true); try { replace(await api.adminGrowthPlanDeliverable(planId, itemId, done)); } finally { setBusy(false); } };

  const createPlan = async (event) => {
    event.preventDefault(); if (!newPlan.name.trim()) return;
    const created = await api.adminCreateGrowthPlan(newPlan);
    setPlans((rows) => [...rows, created]); setSelected(created.id); setNewPlan({ ...newPlan, name: "" });
  };
  const addItem = async (event) => {
    event.preventDefault(); if (!plan || !newItem.group.trim() || !newItem.name.trim()) return;
    const groups = structuredClone(plan.groups || []);
    let group = groups.find((row) => row.name === newItem.group.trim());
    if (!group) { group = { id: shortId("g"), name: newItem.group.trim(), emoji: "★", items: [] }; groups.push(group); }
    group.items.push({ id: shortId("i"), name: newItem.name.trim(), unit: newItem.unit.trim() || "次", target: Math.max(1, Number(newItem.target) || 1), completed: 0, weight: Math.max(.1, Number(newItem.weight) || 1), optional: newItem.optional, scheduleMode: newItem.scheduleMode, startDate: newItem.startDate, endDate: newItem.endDate, completionDates: [] });
    await save({ ...plan, groups }); setNewItem({ ...newItem, name: "" });
  };
  const settle = async (planId) => {
    if (!plan || !window.confirm(`结算“${plan.name}”？\n目标 ${plan.settlement.targetPoints} 分，时间折损 ${plan.settlement.deduction} 分，最终 ${plan.settlement.estimatedPoints} 分。`)) return;
    setBusy(true); try { const result = await api.adminSettleGrowthPlan(planId); replace(result.plan); } finally { setBusy(false); }
  };
  const addDeliverable = async (event) => {
    event.preventDefault(); if (!plan || !deliverable.trim()) return;
    await save({ ...plan, deliverables: [...(plan.deliverables || []), { id: shortId("d"), name: deliverable.trim(), done: false }] }); setDeliverable("");
  };
  const remove = async () => {
    if (!plan || !window.confirm(`删除“${plan.name}”？`)) return;
    await api.adminDeleteGrowthPlan(plan.id); const next = plans.filter((row) => row.id !== plan.id); setPlans(next); setSelected(next[0]?.id || "");
  };

  return <div className="gp-admin-layout">
    <aside className="gp-admin-tools">
      <form className="gp-admin-form" onSubmit={createPlan}>
        <h3>新建计划</h3>
        <select value={newPlan.childId} onChange={(e) => setNewPlan({ ...newPlan, childId: e.target.value })}>{children.map((kid) => <option key={kid.id} value={kid.id}>{kid.name}</option>)}</select>
        <input placeholder="计划名称" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} />
        <div className="gp-form-row"><input type="date" value={newPlan.startDate} onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })} /><input type="date" value={newPlan.endDate} onChange={(e) => setNewPlan({ ...newPlan, endDate: e.target.value })} /></div>
        <button className="gp-primary" type="submit">＋ 新建</button>
      </form>
      {plan?.status === "settled" && <div className="gp-admin-form gp-locked"><h3>计划已结算</h3><div>{plan.settledPoints} ⭐ · {plan.settledAt?.slice(0, 10)}</div></div>}
      {plan && plan.status !== "settled" && <>
        <div className="gp-admin-form">
          <h3>计划设置</h3>
          <input value={plan.name} onChange={(e) => replace({ ...plan, name: e.target.value })} />
          <div className="gp-form-row"><input type="date" value={plan.startDate} onChange={(e) => replace({ ...plan, startDate: e.target.value })} /><input type="date" value={plan.endDate} onChange={(e) => replace({ ...plan, endDate: e.target.value })} /></div>
          <input type="number" min="1" aria-label="计划积分池" value={plan.targetPoints} onChange={(e) => replace({ ...plan, targetPoints: Number(e.target.value) })} />
          <div className="gp-form-row"><button className="gp-primary" disabled={busy} onClick={() => save(plan)}>保存</button><button className="gp-danger" onClick={remove}>删除</button></div>
        </div>
        <form className="gp-admin-form" onSubmit={addItem}>
          <h3>添加进度项目</h3>
          <input placeholder="分组，如语文" value={newItem.group} onChange={(e) => setNewItem({ ...newItem, group: e.target.value })} />
          <input placeholder="项目名称" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
          <div className="gp-form-row"><input placeholder="单位" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} /><input type="number" min="1" aria-label="目标数量" value={newItem.target} onChange={(e) => setNewItem({ ...newItem, target: e.target.value })} /></div>
          <div className="gp-form-row"><input type="number" min="0.1" step="0.1" aria-label="单位工作量" value={newItem.weight} onChange={(e) => setNewItem({ ...newItem, weight: e.target.value })} /><select aria-label="时间规则" value={newItem.scheduleMode} onChange={(e) => setNewItem({ ...newItem, scheduleMode: e.target.value })}><option value="uniform">均匀推进</option><option value="deadline">截止前完成</option></select></div>
          <div className="gp-form-row"><input type="date" aria-label="项目开始日期" value={newItem.startDate} onChange={(e) => setNewItem({ ...newItem, startDate: e.target.value })} /><input type="date" aria-label="项目截止日期" value={newItem.endDate} onChange={(e) => setNewItem({ ...newItem, endDate: e.target.value })} /></div>
          <label className="gp-checkbox"><input type="checkbox" checked={newItem.optional} onChange={(e) => setNewItem({ ...newItem, optional: e.target.checked })} />拓展项目</label>
          <button className="gp-primary" type="submit">＋ 添加项目</button>
        </form>
        <form className="gp-admin-form" onSubmit={addDeliverable}>
          <h3>添加提交物</h3><input placeholder="提交物名称" value={deliverable} onChange={(e) => setDeliverable(e.target.value)} /><button className="gp-primary">＋ 添加</button>
        </form>
      </>}
    </aside>
    <section className="gp-admin-preview">
      <select className="gp-select" value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">选择计划</option>{plans.map((row) => <option key={row.id} value={row.id}>{children.find((kid) => kid.id === row.childId)?.name || row.childId} · {row.name}</option>)}</select>
      {plan ? <GrowthPlanDetail plan={plan} busy={busy} onProgress={progress} onDeliverable={toggleDeliverable} onSettle={settle} /> : <div className="gp-empty">请选择或新建计划</div>}
    </section>
  </div>;
}
