import { dayKey } from "../time.js";

export function countTaskToday(events, childId, taskId, now) {
  const today = dayKey(now);
  return events.filter(
    (e) =>
      e.type === "task" &&
      e.childId === childId &&
      e.refId === taskId &&
      dayKey(e.createdAt) === today
  ).length;
}

export function buildTaskView(tasks, events, childId, now) {
  return tasks
    .filter((t) => t.enabled)
    .map((t) => {
      const doneToday = countTaskToday(events, childId, t.id, now);
      return {
        id: t.id,
        name: t.name,
        emoji: t.emoji,
        points: t.points,
        dailyLimit: t.dailyLimit,
        doneToday,
        atLimit: doneToday >= t.dailyLimit,
      };
    });
}
