/** Builds an ffmpeg command line for the jobs people look up again and again. The command runs on their machine, nothing is processed here. */
export type Task = 'compress' | 'size' | 'trim' | 'audio' | 'gif';
export type Encoder = 'libx264' | 'libx265' | 'libsvtav1' | 'h264_nvenc' | 'hevc_nvenc' | 'av1_nvenc';
export type AudioFmt = 'mp3' | 'aac' | 'opus' | 'flac';

export interface FfOpts {
  task: Task; input: string; encoder: Encoder;
  quality: number; height: number; fps: number;
  start: string; end: string; exact: boolean;
  audioFmt: AudioFmt; audioKbps: number;
  gifWidth: number; gifFps: number;
  sizeMB: number; durationSec: number;
}
export interface FfResult { cmd: string; warning?: 'size' }

export const q = (p: string): string => (/^[\w./:\\-]+$/.test(p) ? p : `"${p.replace(/"/g, '\\"')}"`);
const stem = (f: string): string => f.replace(/\.[^./\\]+$/, '');

function video(o: FfOpts, rate?: number): string[] {
  const nv = o.encoder.endsWith('_nvenc');
  const a = [`-c:v ${o.encoder}`];
  if (rate) a.push(`-b:v ${rate}k`, `-maxrate ${rate}k`, `-bufsize ${rate * 2}k`);
  else if (nv) a.push('-rc vbr', `-cq ${o.quality}`, '-b:v 0');
  else a.push(`-crf ${o.quality}`);
  a.push(nv ? '-preset p5' : o.encoder === 'libsvtav1' ? '-preset 6' : '-preset medium');
  if (o.encoder === 'libx265' || o.encoder === 'hevc_nvenc') a.push('-tag:v hvc1');
  const vf = [o.height > 0 ? `scale=-2:${o.height}` : '', o.fps > 0 ? `fps=${o.fps}` : ''].filter(Boolean);
  if (vf.length) a.push(`-vf ${vf.join(',')}`);
  return a;
}

export function buildFfmpeg(o: FfOpts): FfResult {
  const inp = o.input.trim() || 'input.mp4';
  const i = `-i ${q(inp)}`;
  const seek = [o.start && `-ss ${o.start}`, o.end && `-to ${o.end}`].filter(Boolean).join(' ');
  const join = (...p: (string | string[] | false | undefined)[]) => ['ffmpeg', ...p.flat().filter(Boolean)].join(' ');
  switch (o.task) {
    case 'compress':
      return { cmd: join(i, video(o), '-c:a aac -b:a 128k', '-movflags +faststart', q(`${stem(inp)}-compressed.mp4`)) };
    case 'size': {
      const total = (o.sizeMB * 8192) / Math.max(1, o.durationSec); // MiB to kbit, spread over the duration
      const rate = Math.floor(total - 128);
      if (rate < 50) return { cmd: '', warning: 'size' };
      return { cmd: join(i, video(o, rate), '-c:a aac -b:a 128k', '-movflags +faststart', q(`${stem(inp)}-${o.sizeMB}mb.mp4`)) };
    }
    case 'trim':
      return { cmd: o.exact
        ? join(seek, i, video(o), '-c:a aac -b:a 128k', q(`${stem(inp)}-cut.mp4`))
        : join(seek, i, '-c copy -avoid_negative_ts make_zero', q(`${stem(inp)}-cut.${/\.([^.\\/]+)$/.exec(inp)?.[1] ?? 'mp4'}`)) };
    case 'audio': {
      const codec = { mp3: ['libmp3lame', 'mp3'], aac: ['aac', 'm4a'], opus: ['libopus', 'opus'], flac: ['flac', 'flac'] }[o.audioFmt];
      return { cmd: join(i, '-vn', `-c:a ${codec[0]}`, o.audioFmt !== 'flac' && `-b:a ${o.audioKbps}k`, q(`${stem(inp)}.${codec[1]}`)) };
    }
    case 'gif':
      return { cmd: join(seek, i, `-vf "fps=${o.gifFps},scale=${o.gifWidth}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"`, '-loop 0', q(`${stem(inp)}.gif`)) };
  }
}
