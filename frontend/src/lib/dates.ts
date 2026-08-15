import { endOfWeek, startOfWeek } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const MALAYSIA_TZ = "Asia/Kuala_Lumpur";

export function malaysiaWeek(reference = new Date()) {
  const localDay = new Date(
    formatInTimeZone(reference, MALAYSIA_TZ, "yyyy-MM-dd'T'HH:mm:ss"),
  );
  const start = startOfWeek(localDay, { weekStartsOn: 1 });
  const end = endOfWeek(localDay, { weekStartsOn: 1 });
  return {
    from: fromZonedTime(
      `${formatInTimeZone(start, MALAYSIA_TZ, "yyyy-MM-dd")}T00:00:00`,
      MALAYSIA_TZ,
    ),
    toExclusive: fromZonedTime(
      `${formatInTimeZone(new Date(end.getTime() + 86400000), MALAYSIA_TZ, "yyyy-MM-dd")}T00:00:00`,
      MALAYSIA_TZ,
    ),
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
