/** Builds an iCalendar (.ics) file for one event. Timed events are written in UTC, so every calendar app shows the right local time. */
export interface IcsEvent {
  uid: string;
  now: number;
  title: string;
  /** Milliseconds for a timed event, `YYYY-MM-DD` for an all-day event (the end date is the last day, inclusive). */
  start: number | string;
  end: number | string;
  location?: string;
  description?: string;
  url?: string;
  remindMin?: number;
  repeat?: '' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
}

const esc = (s: string): string => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const utc = (ms: number): string => new Date(ms).toISOString().replace(/[-:]|\.\d{3}/g, '');
const day = (d: string): string => d.replace(/-/g, '');
const nextDay = (d: string): string => new Date(Date.parse(`${d}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
const enc = new TextEncoder();

/** RFC 5545: lines are at most 75 octets, continuation lines start with a space. */
export function fold(line: string): string {
  const out: string[] = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildIcs(e: IcsEvent): string {
  const allDay = typeof e.start === 'string';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//galuin.com//tools//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${utc(e.now)}`,
    allDay ? `DTSTART;VALUE=DATE:${day(e.start as string)}` : `DTSTART:${utc(e.start as number)}`,
    allDay ? `DTEND;VALUE=DATE:${day(nextDay(e.end as string))}` : `DTEND:${utc(e.end as number)}`,
    `SUMMARY:${esc(e.title)}`,
  ];
  if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
  if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
  if (e.url) lines.push(`URL:${e.url}`);
  if (e.repeat) lines.push(`RRULE:FREQ=${e.repeat}`);
  if (e.remindMin != null && e.remindMin >= 0) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, `TRIGGER:-PT${Math.round(e.remindMin)}M`, 'END:VALARM');
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
