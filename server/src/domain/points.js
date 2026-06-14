export function balance(events, childId) {
  return events
    .filter((e) => e.childId === childId)
    .reduce((sum, e) => sum + (e.delta || 0), 0);
}
