// Which build (deployed commit) is running. Every record the app writes keeps
// it, so "still broken" and "ran on old code" can be told apart from a phone.
import { execFileSync } from 'node:child_process';
import { config } from './config.js';

function readCommit() {
  if (process.env.BUILD_COMMIT) return process.env.BUILD_COMMIT;
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: config.root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'unknown'; }
}
export const COMMIT = readCommit();
