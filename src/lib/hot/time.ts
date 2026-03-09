import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export const CRAWL_TIMEZONE = 'Asia/Shanghai';
export const SNAPSHOT_HOUR_FORMAT = 'YYYY-MM-DD HH:00:00';

export function toSnapshotHour(input: dayjs.ConfigType = new Date()): string {
  return dayjs(input).tz(CRAWL_TIMEZONE).startOf('hour').format(SNAPSHOT_HOUR_FORMAT);
}

export function parseToSnapshotHour(input: string): string | null {
  const value = input.trim();
  const parsed = dayjs.tz(value, CRAWL_TIMEZONE);
  if (parsed.isValid()) return parsed.startOf('hour').format(SNAPSHOT_HOUR_FORMAT);

  const fallback = dayjs(value);
  if (!fallback.isValid()) return null;
  return fallback.tz(CRAWL_TIMEZONE).startOf('hour').format(SNAPSHOT_HOUR_FORMAT);
}

export function parseDateRangeBoundary(input: string, boundary: 'start' | 'end'): string | null {
  const value = input.trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = dayjs.tz(value, CRAWL_TIMEZONE);
    if (!parsed.isValid()) return null;
    return parsed[boundary === 'start' ? 'startOf' : 'endOf']('day').format('YYYY-MM-DD HH:mm:ss');
  }

  const parsed = dayjs.tz(value, CRAWL_TIMEZONE);
  if (!parsed.isValid()) return null;
  return parsed[boundary === 'start' ? 'startOf' : 'endOf']('hour').format('YYYY-MM-DD HH:mm:ss');
}
