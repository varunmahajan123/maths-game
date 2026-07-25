// The daily rolls over at midnight IST (UTC+5:30), not UTC.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istDateString(nowMs = Date.now()) {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

// GALTI #N: launch date is #1.
export function dailyNumber(dateStr, launchDateStr) {
  const days = Math.round((Date.parse(dateStr) - Date.parse(launchDateStr)) / 86_400_000);
  return days + 1;
}

export function previousDateString(dateStr) {
  return new Date(Date.parse(dateStr) - 86_400_000).toISOString().slice(0, 10);
}
