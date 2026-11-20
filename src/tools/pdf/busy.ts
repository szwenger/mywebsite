/**
 * Wraps an async action so that calls made while one is still running are dropped (resolve false).
 * Each PDF edit is built from the current document, so a second edit started before the first
 * finished would be built from the old one and silently undo it.
 */
export function oneAtATime<A extends unknown[]>(fn: (...args: A) => Promise<unknown>): (...args: A) => Promise<boolean> {
  let running = false;
  return async (...args) => {
    if (running) return false;
    running = true;
    try { await fn(...args); return true; } finally { running = false; }
  };
}
