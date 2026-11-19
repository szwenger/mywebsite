import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('repo: planning docs, handoff and local files stay out of the public repo', () => {
  let tracked;
  try { tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n'); } catch { return; } // no git: nothing to check
  for (const p of tracked) assert.ok(!/^(docs\/|HANDOFF\.md$)|\.local\.txt$/.test(p), `${p} would be published`);
});
