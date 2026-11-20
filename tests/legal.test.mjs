import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Slow: runs a real build. Builds into a temp dir so dist/ stays untouched.
test('CI build fails while the Impressum address is still the placeholder', { timeout: 180_000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'galuin-ci-'));
  try {
    let failure;
    try {
      execFileSync('npx', ['astro', 'build', '--outDir', out], {
        env: { ...process.env, CI: '1' }, stdio: 'pipe', shell: true, encoding: 'utf8',
      });
    } catch (e) { failure = e; }
    assert.ok(failure, 'build should have failed');
    assert.notEqual(failure.status, 0);
    assert.match(`${failure.stdout}${failure.stderr}`, /legal\.ts: set the Impressum address before deploying/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
