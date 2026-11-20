import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// legal.ts throws on import under CI while the address is the placeholder; that counts as "no address".
let hasAddress = false;
try { ({ hasAddress } = await import('../src/data/legal.ts')); } catch { /* placeholder under CI */ }

// Slow: runs a real build. Builds into a temp dir so dist/ stays untouched.
test('CI build fails while the Impressum address is the placeholder and succeeds once it is set', { timeout: 180_000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'galuin-ci-'));
  try {
    let failure;
    try {
      execFileSync('npx', ['astro', 'build', '--outDir', out], {
        env: { ...process.env, CI: '1' }, stdio: 'pipe', shell: true, encoding: 'utf8',
      });
    } catch (e) { failure = e; }
    if (hasAddress) {
      assert.equal(failure, undefined, `CI build failed: ${failure?.stderr}`);
      assert.ok(existsSync(join(out, 'impressum', 'index.html')));
    } else {
      assert.ok(failure, 'build should have failed');
      assert.notEqual(failure.status, 0);
      assert.match(`${failure.stdout}${failure.stderr}`, /legal\.ts: set the Impressum address before deploying/);
    }
  } finally { rmSync(out, { recursive: true, force: true }); }
});
