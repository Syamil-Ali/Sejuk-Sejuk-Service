import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const MALAYSIA_TZ = "Asia/Kuala_Lumpur";

export function malaysiaWeek(reference = new Date()) {
  const [year, month, day] = formatInTimeZone(reference, MALAYSIA_TZ, "yyyy-MM-dd")
    .split("-")
    .map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(Date.UTC(year, month - 1, day - daysSinceMonday))
    .toISOString()
    .slice(0, 10);
  const nextMonday = new Date(
    Date.UTC(year, month - 1, day - daysSinceMonday + 7),
  )
    .toISOString()
    .slice(0, 10);
  return {
    from: fromZonedTime(`${monday}T00:00:00`, MALAYSIA_TZ),
    toExclusive: fromZonedTime(`${nextMonday}T00:00:00`, MALAYSIA_TZ),
  };
}

export function inclusiveRange(from: string, to: string) {
  const start = fromZonedTime(`${from}T00:00:00`, MALAYSIA_TZ);
  const [year, month, day] = to.split("-").map(Number);
  const nextCalendarDay = new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
  const end = fromZonedTime(`${nextCalendarDay}T00:00:00`, MALAYSIA_TZ);
  if (end <= start) throw new Error("End date must be on or after start date.");
  return { from: start, toExclusive: end };
}
