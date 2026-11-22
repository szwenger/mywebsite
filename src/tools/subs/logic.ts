/** Subtitle files: SRT and WebVTT in, SRT or WebVTT out, with a time shift and a speed factor. Times are milliseconds. */
export interface Cue { start: number; end: number; text: string }

const TIME = /(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/;

export function parseTime(s: string): number {
  const m = TIME.exec(s);
  if (!m) return NaN;
  return ((+(m[1] ?? 0) * 60 + +m[2]) * 60 + +m[3]) * 1000 + +m[4].padEnd(3, '0');
}

export function fmtTime(ms: number, sep: ',' | '.'): string {
  const t = Math.max(0, Math.round(ms));
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(t / 3600000))}:${p(Math.floor(t / 60000) % 60)}:${p(Math.floor(t / 1000) % 60)}${sep}${p(t % 1000, 3)}`;
}

/** Reads SRT or WebVTT (detected by content). Blocks without a time line (WEBVTT header, NOTE, STYLE) are skipped. */
export function parseCues(src: string): Cue[] {
  const blocks = src.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split(/\n{2,}/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const i = lines.findIndex((l) => l.includes('-->'));
    if (i < 0) continue;
    const [a, b] = lines[i].split('-->');
    const start = parseTime(a), end = parseTime(b);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    cues.push({ start, end, text: lines.slice(i + 1).join('\n').trim() });
  }
  return cues;
}

/** t' = t × factor + offset. Cues that end before 0 are dropped, a start before 0 is clamped. */
export function shift(cues: Cue[], offsetMs: number, factor = 1): Cue[] {
  return cues
    .map((c) => ({ ...c, start: c.start * factor + offsetMs, end: c.end * factor + offsetMs }))
    .filter((c) => c.end > 0)
    .map((c) => ({ ...c, start: Math.max(0, c.start) }));
}

export const toSrt = (cues: Cue[]): string => cues.map((c, i) => `${i + 1}\n${fmtTime(c.start, ',')} --> ${fmtTime(c.end, ',')}\n${c.text}\n`).join('\n');
export const toVtt = (cues: Cue[]): string => `WEBVTT\n\n${cues.map((c) => `${fmtTime(c.start, '.')} --> ${fmtTime(c.end, '.')}\n${c.text}\n`).join('\n')}`;
