function allItems(plan) {
  return (plan.groups || []).flatMap((group) => group.items || []);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dateNumber(value) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function dateStringFromNumber(value) {
  return new Date(value * DAY_MS).toISOString().slice(0, 10);
}

function localDateString(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function timeCoefficient(actualDate, expectedDate) {
  if (!actualDate || !expectedDate) return 1;
  const daysLate = dateNumber(actualDate) - dateNumber(expectedDate);
  if (!Number.isFinite(daysLate)) return 1;
  if (daysLate <= 0) return 1;
  if (daysLate <= 3) return 0.85;
  if (daysLate <= 7) return 0.7;
  return 0.5;
}

export function normalizePlan(plan) {
  const { summary: _summary, ...plain } = plan;
  return {
    ...plain,
    groups: (plain.groups || []).map((group) => ({
      ...group,
      items: (group.items || []).map((item) => {
        const target = Number.isInteger(item.target) && item.target > 0 ? item.target : 1;
        return {
          ...item,
          target,
          completed: Math.max(0, Math.min(target, Number.isInteger(item.completed) ? item.completed : 0)),
          weight: typeof item.weight === "number" && item.weight > 0 ? item.weight : 1,
          optional: item.optional === true,
          scheduleMode: item.scheduleMode === "deadline" ? "deadline" : "uniform",
          completionDates: Array.isArray(item.completionDates) ? item.completionDates.slice(0, Math.max(0, Math.min(target, Number.isInteger(item.completed) ? item.completed : 0))) : [],
        };
      }),
    })),
    deliverables: (plain.deliverables || []).map((item) => ({ ...item, done: item.done === true })),
  };
}

export function summarizePlan(plan) {
  const items = allItems(plan);
  const required = items.filter((item) => !item.optional && Number.isInteger(item.target) && item.target > 0);
  const totalWeight = required.reduce((sum, item) => sum + item.target * (item.weight > 0 ? item.weight : 1), 0);
  const earnedWeight = required.reduce((sum, item) => {
    const weight = item.weight > 0 ? item.weight : 1;
    const completed = Math.max(0, Math.min(item.target, item.completed || 0));
    return sum + completed * weight;
  }, 0);
  const deliverables = plan.deliverables || [];
  const percent = totalWeight ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const deliverablesDone = deliverables.filter((item) => item.done).length;
  return {
    percent,
    completedUnits: required.reduce((sum, item) => sum + Math.max(0, Math.min(item.target, item.completed || 0)), 0),
    totalUnits: required.reduce((sum, item) => sum + item.target, 0),
    deliverablesDone,
    deliverablesTotal: deliverables.length,
    complete: percent === 100 && deliverablesDone === deliverables.length,
  };
}

export function changeItemProgress(plan, itemId, delta, now = new Date()) {
  if (!Number.isInteger(delta) || delta === 0) throw new Error("bad_delta");
  let found = false;
  const groups = (plan.groups || []).map((group) => ({
    ...group,
    items: (group.items || []).map((item) => {
      if (item.id !== itemId) return item;
      found = true;
      const previous = item.completed || 0;
      const completed = Math.max(0, Math.min(item.target, previous + delta));
      let completionDates = Array.isArray(item.completionDates) ? [...item.completionDates] : [];
      if (completed > previous) completionDates.push(...Array(completed - previous).fill(now.toISOString()));
      if (completed < previous) completionDates = completionDates.slice(0, Math.max(0, completionDates.length - (previous - completed)));
      return { ...item, completed, completionDates };
    }),
  }));
  if (!found) throw new Error("item_not_found");
  return { ...plan, groups };
}

export function setDeliverable(plan, itemId, done, now = new Date()) {
  if (typeof done !== "boolean") throw new Error("bad_done");
  let found = false;
  const deliverables = (plan.deliverables || []).map((item) => {
    if (item.id !== itemId) return item;
    found = true;
    return { ...item, done, completedAt: done ? (item.done && item.completedAt ? item.completedAt : now.toISOString()) : null };
  });
  if (!found) throw new Error("deliverable_not_found");
  return { ...plan, deliverables };
}

function expectedDate(plan, item, unitIndex) {
  const start = item.startDate || plan.startDate;
  const end = item.endDate || plan.endDate || start;
  if (!start || !end || item.scheduleMode === "deadline") return end || start;
  const startDay = dateNumber(start);
  const endDay = dateNumber(end);
  const dueDay = startDay + Math.round(((endDay - startDay) * (unitIndex + 1)) / item.target);
  return dateStringFromNumber(dueDay);
}

export function settlementPreview(plan) {
  const required = allItems(plan).filter((item) => !item.optional && Number.isInteger(item.target) && item.target > 0);
  const totalWork = required.reduce((sum, item) => sum + item.target * (item.weight > 0 ? item.weight : 1), 0);
  const targetPoints = Number.isInteger(plan.targetPoints) && plan.targetPoints > 0 ? plan.targetPoints : 0;
  const pointsPerWork = totalWork ? targetPoints / totalWork : 0;
  const breakdown = required.map((item) => {
    const weight = item.weight > 0 ? item.weight : 1;
    const completed = Math.max(0, Math.min(item.target, item.completed || 0));
    const dates = Array.isArray(item.completionDates) ? item.completionDates.slice(0, completed) : [];
    const legacyCount = Math.max(0, completed - dates.length);
    let earned = 0;
    for (let index = 0; index < completed; index += 1) {
      const coefficient = index < legacyCount ? 1 : timeCoefficient(localDateString(dates[index - legacyCount]), expectedDate(plan, item, index));
      earned += pointsPerWork * weight * coefficient;
    }
    const base = pointsPerWork * weight * completed;
    return { itemId: item.id, name: item.name, basePoints: Math.round(base), earnedPoints: Math.round(earned), deduction: Math.round(base - earned), earnedRaw: earned };
  });
  const baseRaw = required.reduce((sum, item) => sum + pointsPerWork * (item.weight > 0 ? item.weight : 1) * Math.max(0, Math.min(item.target, item.completed || 0)), 0);
  const earnedRaw = breakdown.reduce((sum, item) => sum + item.earnedRaw, 0);
  const publicBreakdown = breakdown.map(({ earnedRaw: _earnedRaw, ...item }) => item);
  const summary = summarizePlan(plan);
  return {
    targetPoints,
    basePoints: Math.round(baseRaw),
    estimatedPoints: Math.round(earnedRaw),
    deduction: Math.max(0, Math.round(baseRaw) - Math.round(earnedRaw)),
    ready: summary.complete && plan.status !== "settled",
    settled: plan.status === "settled",
    breakdown: publicBreakdown,
  };
}
