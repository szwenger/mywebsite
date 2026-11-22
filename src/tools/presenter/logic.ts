/** mm:ss, floored, never negative. A 90 minute talk reads 90:00. */
export function fmtTime(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** True once the timer has reached a valid target (minutes). */
export function isOver(secs: number, targetMin: number): boolean {
  return Number.isFinite(targetMin) && targetMin > 0 && secs >= targetMin * 60;
}

/** Banked milliseconds plus the stretch since `startedAt` (null while paused). Uses timestamps, so a throttled background tab does not lose time. */
export function elapsedMs(banked: number, startedAt: number | null, now: number): number {
  return startedAt === null ? banked : banked + Math.max(0, now - startedAt);
}

export function clampPage(n: number, total: number): number {
  return Math.min(Math.max(1, n), Math.max(1, total));
}
