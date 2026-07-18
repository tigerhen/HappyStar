function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function oneDecimal(value, max) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max && Math.abs(value * 10 - Math.round(value * 10)) < 1e-8;
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

export function validateMeasurement(input) {
  if (!input?.childId || typeof input.childId !== "string") throw new Error("bad_child");
  if (!validDate(input.date)) throw new Error("bad_date");
  if (!oneDecimal(input.heightCm, 300)) throw new Error("bad_height");
  if (!oneDecimal(input.weightKg, 500)) throw new Error("bad_weight");
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 200) : "";
  return { childId: input.childId, date: input.date, heightCm: input.heightCm, weightKg: input.weightKg, note };
}

export function sortMeasurements(records) {
  return [...records].sort((a, b) => a.date.localeCompare(b.date) || a.id?.localeCompare(b.id || "") || 0);
}

export function addCalendarMonths(dateValue, months) {
  if (!validDate(dateValue)) throw new Error("bad_date");
  const [year, month, day] = dateValue.split("-").map(Number);
  const monthIndex = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonth = monthIndex % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function measurementSummary(records, today) {
  const sorted = sortMeasurements(records);
  if (!sorted.length) {
    return { latest: null, previous: null, heightChange: null, weightChange: null, nextSuggestedDate: null, due: true };
  }
  const latest = sorted.at(-1);
  const previous = sorted.length > 1 ? sorted.at(-2) : null;
  const nextSuggestedDate = addCalendarMonths(latest.date, 3);
  return {
    latest,
    previous,
    heightChange: previous ? roundOne(latest.heightCm - previous.heightCm) : null,
    weightChange: previous ? roundOne(latest.weightKg - previous.weightKg) : null,
    nextSuggestedDate,
    due: today >= nextSuggestedDate,
  };
}
