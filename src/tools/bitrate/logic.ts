/** Stream and recording maths. Bitrates are kilobits per second, sizes are bytes, 1 kbit = 1000 bits (as encoders and ISPs count). */
export const sizeBytes = (videoKbps: number, audioKbps: number, seconds: number): number => ((videoKbps + audioKbps) * 1000 / 8) * seconds;

/** Video bitrate that fills `bytes` over `seconds` after the audio takes its share. 0 when nothing is left. */
export function videoKbpsForSize(bytes: number, audioKbps: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.max(0, (bytes * 8) / 1000 / seconds - audioKbps);
}

export function fmtBytes(b: number): string {
  if (b < 1000) return `${Math.round(b)} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1, v = b;
  do { v /= 1000; i++; } while (v >= 1000 && i < u.length - 1);
  return `${v.toFixed(i >= 2 ? 2 : 1)} ${u[i]}`;
}

/** Upload speed to keep free for a live stream: 25 % above the stream so one bad second does not drop frames. */
export const uploadNeededKbps = (videoKbps: number, audioKbps: number): number => Math.round((videoKbps + audioKbps) * 1.25);
