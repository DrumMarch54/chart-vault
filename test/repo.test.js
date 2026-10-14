// Repo hygiene that has bitten before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' });
let isRepo = true;
try { git('rev-parse', '--git-dir'); } catch { isRepo = false; }

// A file that is ignored but still tracked is put back on every deploy
// (git reset --hard) and silently overwrites what the server wrote.
test('no runtime file is both git-ignored and tracked', { skip: !isRepo && 'not a git checkout' }, () => {
  assert.equal(git('ls-files', '-i', '-c', '--exclude-standard').trim(), '');
});
