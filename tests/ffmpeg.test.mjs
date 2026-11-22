import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFfmpeg, q } from '../src/tools/ffmpeg/logic.ts';

const base = { task: 'compress', input: 'clip.mkv', encoder: 'libx264', quality: 23, height: 0, fps: 0, start: '', end: '', exact: false, audioFmt: 'mp3', audioKbps: 192, gifWidth: 480, gifFps: 12, sizeMB: 10, durationSec: 60 };
const cmd = (o) => buildFfmpeg({ ...base, ...o }).cmd;

test('compress with x264 uses CRF and faststart', () => {
  assert.equal(cmd({}), 'ffmpeg -i clip.mkv -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k -movflags +faststart clip-compressed.mp4');
});

test('NVENC uses constant quality instead of CRF; HEVC gets the hvc1 tag; scale and fps combine in one filter', () => {
  const c = cmd({ encoder: 'hevc_nvenc', quality: 28, height: 720, fps: 30 });
  assert.ok(c.includes('-c:v hevc_nvenc -rc vbr -cq 28 -b:v 0 -preset p5 -tag:v hvc1 -vf scale=-2:720,fps=30'));
  assert.ok(!c.includes('-crf'));
  assert.ok(cmd({ encoder: 'libx265' }).includes('-crf 23 -preset medium -tag:v hvc1'));
  assert.ok(cmd({ encoder: 'libsvtav1' }).includes('-c:v libsvtav1 -crf 23 -preset 6'));
});

test('target size: bitrate is the size over the duration minus 128 kbit/s of audio', () => {
  // 10 MiB over 60 s = 1365.3 kbit/s, minus 128
  const c = cmd({ task: 'size', sizeMB: 10, durationSec: 60 });
  assert.ok(c.includes('-b:v 1237k -maxrate 1237k -bufsize 2474k'), c);
  assert.ok(c.endsWith('clip-10mb.mp4'));
});

test('target size that leaves nothing for video is refused', () => {
  assert.deepEqual(buildFfmpeg({ ...base, task: 'size', sizeMB: 1, durationSec: 3600 }), { cmd: '', warning: 'size' });
});

test('trim: stream copy keeps the container, exact cut re-encodes', () => {
  assert.equal(cmd({ task: 'trim', start: '00:01:00', end: '00:02:30' }), 'ffmpeg -ss 00:01:00 -to 00:02:30 -i clip.mkv -c copy -avoid_negative_ts make_zero clip-cut.mkv');
  assert.ok(cmd({ task: 'trim', start: '10', exact: true }).startsWith('ffmpeg -ss 10 -i clip.mkv -c:v libx264'));
});

test('audio extraction: codec, extension and no bitrate for FLAC', () => {
  assert.equal(cmd({ task: 'audio' }), 'ffmpeg -i clip.mkv -vn -c:a libmp3lame -b:a 192k clip.mp3');
  assert.equal(cmd({ task: 'audio', audioFmt: 'flac' }), 'ffmpeg -i clip.mkv -vn -c:a flac clip.flac');
  assert.ok(cmd({ task: 'audio', audioFmt: 'aac' }).endsWith('clip.m4a'));
});

test('gif uses a generated palette', () => {
  const c = cmd({ task: 'gif', start: '5', end: '9' });
  assert.ok(c.startsWith('ffmpeg -ss 5 -to 9 -i clip.mkv -vf "fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 clip.gif'));
});

test('file names with spaces are quoted, and an empty name falls back to input.mp4', () => {
  assert.equal(q('my video (1).mp4'), '"my video (1).mp4"');
  assert.equal(q('C:\\clips\\a.mp4'), 'C:\\clips\\a.mp4');
  assert.ok(cmd({ input: '' }).startsWith('ffmpeg -i input.mp4 '));
  assert.ok(cmd({ input: 'my video.mp4' }).endsWith('"my video-compressed.mp4"'));
});
