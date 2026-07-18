function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function decimalValue(value, max, places) {
  const factor = 10 ** places;
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max && Math.abs(value * factor - Math.round(value * factor)) < 1e-8;
}

function optionalMetric(value, max, places, error) {
  if (value === null || value === undefined || value === "") return null;
  if (!decimalValue(value, max, places)) throw new Error(error);
  return value;
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function validateMeasurement(input) {
  if (!input?.childId || typeof input.childId !== "string") throw new Error("bad_child");
  if (!validDate(input.date)) throw new Error("bad_date");
  const heightCm = optionalMetric(input.heightCm, 300, 1, "bad_height");
  const weightKg = optionalMetric(input.weightKg, 500, 2, "bad_weight");
  if (heightCm === null && weightKg === null) throw new Error("measurement_value_required");
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 200) : "";
  return { childId: input.childId, date: input.date, heightCm, weightKg, note };
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
    return {
      latest: null, previous: null,
      latestHeight: null, previousHeight: null, latestWeight: null, previousWeight: null,
      heightChange: null, weightChange: null, nextSuggestedDate: null, due: true,
    };
  }
  const latest = sorted.at(-1);
  const previous = sorted.length > 1 ? sorted.at(-2) : null;
  const heights = sorted.filter((record) => Number.isFinite(record.heightCm));
  const weights = sorted.filter((record) => Number.isFinite(record.weightKg));
  const latestHeight = heights.at(-1) || null;
  const previousHeight = heights.length > 1 ? heights.at(-2) : null;
  const latestWeight = weights.at(-1) || null;
  const previousWeight = weights.length > 1 ? weights.at(-2) : null;
  const nextSuggestedDate = addCalendarMonths(latest.date, 3);
  return {
    latest,
    previous,
    latestHeight,
    previousHeight,
    latestWeight,
    previousWeight,
    heightChange: previousHeight ? round(latestHeight.heightCm - previousHeight.heightCm, 1) : null,
    weightChange: previousWeight ? round(latestWeight.weightKg - previousWeight.weightKg, 2) : null,
    nextSuggestedDate,
    due: today >= nextSuggestedDate,
  };
}
