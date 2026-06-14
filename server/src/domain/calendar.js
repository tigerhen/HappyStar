import { dayKey } from "../time.js";

export function aggregateMonth(events, month) {
  const days = {};
  for (const e of events) {
    const key = dayKey(e.createdAt);
    if (key.slice(0, 7) !== month) continue;
    if (!days[key]) days[key] = { earned: {}, hasRedemption: false };
    if (e.type === "redeem") {
      days[key].hasRedemption = true;
    } else if (e.delta > 0) {
      days[key].earned[e.childId] = (days[key].earned[e.childId] || 0) + e.delta;
    }
  }
  return days;
}