// Audio sample maths for the trimmer. Channels are arrays of floats in -1..1.

/** Cuts [start, end) seconds out of every channel. Times are clamped to the clip. */
export function trim(channels: Float32Array[], rate: number, start: number, end: number): Float32Array[] {
  const len = channels[0]?.length ?? 0;
  const a = Math.min(len, Math.max(0, Math.round(start * rate)));
  const b = Math.min(len, Math.max(a, Math.round(end * rate)));
  return channels.map((c) => c.slice(a, b));
}

/** Linear fade in and out, in place. Fades longer than half the clip are shortened so they never overlap. */
export function fade(channels: Float32Array[], rate: number, inSec: number, outSec: number): void {
  const len = channels[0]?.length ?? 0;
  let fi = Math.round(inSec * rate), fo = Math.round(outSec * rate);
  if (fi + fo > len) { const k = len / Math.max(fi + fo, 1); fi = Math.floor(fi * k); fo = Math.floor(fo * k); }
  for (const c of channels) {
    for (let i = 0; i < fi; i++) c[i] *= i / fi;
    for (let i = 0; i < fo; i++) c[len - 1 - i] *= i / fo;
  }
}

/** Largest absolute sample across all channels. */
export function peakOf(channels: Float32Array[]): number {
  let p = 0;
  for (const c of channels) for (let i = 0; i < c.length; i++) { const v = Math.abs(c[i]); if (v > p) p = v; }
  return p;
}

/** Scales the clip so its loudest sample is `target`. Silence is left alone. Returns the gain used. */
export function normalize(channels: Float32Array[], target = 0.98): number {
  const p = peakOf(channels);
  if (p === 0) return 1;
  const g = target / p;
  for (const c of channels) for (let i = 0; i < c.length; i++) c[i] *= g;
  return g;
}

/** Averages all channels into one. */
export function toMono(channels: Float32Array[]): Float32Array[] {
  if (channels.length <= 1) return channels;
  const out = new Float32Array(channels[0].length);
  for (const c of channels) for (let i = 0; i < out.length; i++) out[i] += c[i] / channels.length;
  return [out];
}

/** Per-bucket maximum absolute value across all channels, for drawing a waveform `buckets` columns wide. */
export function peaks(channels: Float32Array[], buckets: number): Float32Array {
  const len = channels[0]?.length ?? 0;
  const out = new Float32Array(buckets);
  if (!len) return out;
  const size = len / buckets;
  for (let b = 0; b < buckets; b++) {
    const from = Math.floor(b * size), to = Math.max(from + 1, Math.floor((b + 1) * size));
    let m = 0;
    for (const c of channels) for (let i = from; i < to && i < len; i++) { const v = Math.abs(c[i]); if (v > m) m = v; }
    out[b] = m;
  }
  return out;
}

/** 16-bit PCM WAV file with interleaved channels. Samples are clipped to -1..1. */
export function encodeWav(channels: Float32Array[], rate: number): Uint8Array {
  const n = channels.length, len = channels[0]?.length ?? 0;
  const bytes = len * n * 2;
  const buf = new ArrayBuffer(44 + bytes);
  const v = new DataView(buf);
  const tag = (o: number, t: string) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  tag(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, n, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * n * 2, true); v.setUint16(32, n * 2, true); v.setUint16(34, 16, true);
  tag(36, 'data'); v.setUint32(40, bytes, true);
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < n; c++) {
      const x = Math.max(-1, Math.min(1, channels[c][i]));
      v.setInt16(o, x < 0 ? Math.round(x * 0x8000) : Math.round(x * 0x7fff), true);
      o += 2;
    }
  }
  return new Uint8Array(buf);
}

/** 83.4 becomes "1:23.4"; hours only when needed. */
export function clock(sec: number): string {
  const t = Math.max(0, sec);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t - h * 3600 - m * 60;
  const ss = (s < 10 ? '0' : '') + s.toFixed(1);
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "1:23.4", "83.4" and "1:02:03" to seconds; NaN when it is none of those. */
export function parseClock(text: string): number {
  const p = text.trim().replace(',', '.').split(':');
  if (p.length > 3 || p.some((x) => !/^\d+(\.\d+)?$/.test(x))) return NaN;
  return p.reduce((acc, x) => acc * 60 + Number(x), 0);
}
