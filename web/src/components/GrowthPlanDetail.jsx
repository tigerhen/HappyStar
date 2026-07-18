import React, { useState } from "react";

export default function GrowthPlanDetail({ plan, onProgress, onDeliverable, onSettle, busy = false }) {
  const [open, setOpen] = useState(() => new Set(plan.groups?.[0] ? [plan.groups[0].id] : []));
  const toggle = (id) => setOpen((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const summary = plan.summary || {};
  const settlement = plan.settlement || { targetPoints: plan.targetPoints || 0, estimatedPoints: 0, deduction: 0 };
  const locked = busy || settlement.settled;

  return (
    <div className="gp-detail">
      <section className="gp-summary">
        <div className="gp-summary-head">
          <div><div className="gp-kicker">{plan.startDate} 至 {plan.endDate}</div><h2>{plan.name}</h2></div>
          <div className="gp-target">约 {plan.targetPoints || 0}<span> ⭐</span></div>
        </div>
        <div className="gp-overall"><strong aria-label={`计划完成度 ${summary.percent || 0}%`}>{summary.percent || 0}%</strong><div className="gp-track"><i style={{ width: `${summary.percent || 0}%` }} /></div></div>
        <div className="gp-summary-meta"><span>必做进度 {summary.completedUnits || 0}/{summary.totalUnits || 0}</span><span>提交物 {summary.deliverablesDone || 0}/{summary.deliverablesTotal || 0}</span></div>
      </section>

      <section className={`gp-settlement ${settlement.ready ? "ready" : ""} ${settlement.settled ? "settled" : ""}`}>
        <div><span>目标</span><strong>{settlement.targetPoints} ⭐</strong></div>
        <div><span>{settlement.settled ? "已结算" : "预计"}</span><strong>{settlement.settled ? plan.settledPoints : settlement.estimatedPoints} ⭐</strong></div>
        <div><span>时间折损</span><strong>{settlement.deduction}</strong></div>
        {settlement.ready && onSettle && <button disabled={busy} onClick={() => onSettle(plan.id)}>确认完成并结算</button>}
      </section>

      <div className="gp-section-title"><h3>计划进度</h3><span>点击科目展开</span></div>
      {(plan.groups || []).map((group) => {
        const isOpen = open.has(group.id);
        const items = group.items || [];
        const done = items.reduce((sum, item) => sum + item.completed, 0);
        const total = items.reduce((sum, item) => sum + item.target, 0);
        return <section className={`gp-group ${isOpen ? "open" : ""}`} key={group.id}>
          <button className="gp-group-head" onClick={() => toggle(group.id)} aria-expanded={isOpen}>
            <span className="gp-group-icon">{group.emoji || "★"}</span>
            <span><b>{group.name}</b><small>{items.length}个项目 · {done}/{total}</small></span>
            <span className="gp-chevron">⌄</span>
          </button>
          {isOpen && <div className="gp-items">{items.map((item) => {
            const rate = item.target ? Math.round(item.completed / item.target * 100) : 0;
            return <div className="gp-item" key={item.id}>
              <div className="gp-item-copy"><div>{item.name}{item.optional && <span className="gp-optional">拓展</span>}</div><div className="gp-mini"><i><em style={{ width: `${rate}%` }} /></i><span>{rate}%</span></div></div>
              <div className="gp-counter">
                <button disabled={locked || item.completed <= 0} aria-label={`${item.name}减少进度`} onClick={() => onProgress(plan.id, item.id, -1)}>−</button>
                <output>{item.completed}/{item.target}{item.unit}</output>
                <button className="plus" disabled={locked || item.completed >= item.target} aria-label={`${item.name}增加进度`} onClick={() => onProgress(plan.id, item.id, 1)}>＋</button>
              </div>
            </div>;
          })}</div>}
        </section>;
      })}

      <div className="gp-section-title"><h3>提交物</h3><span>开学前逐项确认</span></div>
      <div className="gp-deliverables">{(plan.deliverables || []).map((item) =>
        <button key={item.id} className={item.done ? "done" : ""} disabled={locked} onClick={() => onDeliverable(plan.id, item.id, !item.done)}>
          <span className="gp-check">{item.done ? "✓" : ""}</span><span>{item.name}</span>
        </button>
      )}</div>
    </div>
  );
}
