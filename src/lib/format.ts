const DATE_FULL = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_SHORT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

const TIMESTAMP = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const NUMBER = new Intl.NumberFormat("en-GB");

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "2026-09-18" -> "Fri, 18 Sep 2026". Falls back to the raw value. */
export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? DATE_FULL.format(date) : (value ?? "—");
}

export function formatDateShort(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? DATE_SHORT.format(date) : (value ?? "—");
}

export function formatTimestamp(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? TIMESTAMP.format(date) : (value ?? "—");
}

/** "20:00" kept verbatim when well-formed, otherwise an em dash. */
export function formatTime(value: string | null | undefined): string {
  if (typeof value !== "string") return "—";
  const trimmed = value.trim();
  return /^\d{1,2}:\d{2}$/.test(trimmed) ? trimmed.padStart(5, "0") : (trimmed || "—");
}

export function formatNumber(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? NUMBER.format(value)
    : "—";
}

const RELATIVE = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 30],
  ["month", 12],
];

/** "3 hours ago" / "in 2 days", or null when the value is unparseable. */
export function formatRelative(value: string | null | undefined): string | null {
  const date = parseDate(value);
  if (!date) return null;

  let delta = (date.getTime() - Date.now()) / 1000;
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) < size) return RELATIVE.format(Math.round(delta), unit);
    delta /= size;
  }
  return RELATIVE.format(Math.round(delta), "year");
}

/** "20:00" -> 1200 minutes past midnight; null when unparseable. */
export function timeToMinutes(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Shortest gap between two clock times, accounting for the midnight wrap. */
export function minutesBetween(a: string, b: string): number | null {
  const first = timeToMinutes(a);
  const second = timeToMinutes(b);
  if (first === null || second === null) return null;
  const raw = Math.abs(first - second);
  return Math.min(raw, 1440 - raw);
}

export function formatMinutes(value: number | null): string {
  if (value === null) return "—";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}
