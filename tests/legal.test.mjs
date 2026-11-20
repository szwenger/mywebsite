import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Slow: runs a real build. Builds into a temp dir so dist/ stays untouched.
// The site may go live before the address is set: CI must build, and the Impressum then says the address is pending.
test('CI build succeeds with or without the Impressum address', { timeout: 180_000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'galuin-ci-'));
  try {
    let failure;
    try {
      execFileSync('npx', ['astro', 'build', '--outDir', out], {
        env: { ...process.env, CI: '1' }, stdio: 'pipe', shell: true, encoding: 'utf8',
      });
    } catch (e) { failure = e; }
    assert.equal(failure, undefined, `CI build failed: ${failure?.stderr}`);
    assert.ok(existsSync(join(out, 'impressum', 'index.html')));
    assert.match(readFileSync(join(out, 'impressum', 'index.html'), 'utf8'), /Simon Zwenger/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
