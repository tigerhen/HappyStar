export function taskWeekly(task) {
  const days = task.weeklyDays ?? 7;
  return (task.points || 0) * (task.dailyLimit || 0) * days;
}

export function capacity(tasks) {
  const enabled = tasks.filter((t) => t.enabled);
  const max = enabled.reduce((sum, t) => sum + taskWeekly(t), 0);
  const base = enabled
    .filter((t) => t.core)
    .reduce((sum, t) => sum + taskWeekly(t), 0);
  return { base, realistic: Math.round(max * 0.8), max };
}

export function etaWeeks(cost, weeklyRate) {
  if (!weeklyRate || weeklyRate <= 0) return null;
  return Math.round((cost / weeklyRate) * 10) / 10;
}
