// The dark looks' colors for fixed-color rules are GENERATED from app.css (tools/make-look-colors.mjs):
// a change to app.css without re-running it would leave a screen half in the old colors.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('the dark-look color section of app.css is up to date', () => {
  assert.doesNotThrow(() => execFileSync('node', ['tools/make-look-colors.mjs', '--check'], { stdio: 'pipe' }));
});
