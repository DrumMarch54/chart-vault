// Is the auto-deploy that cron runs the same script as the one in the repo,
// and is cron actually running it? Cron runs a COPY outside the repo; if that
// copy is missing or old, updates stop or ignore the busy check, and nothing
// else would say so. Answers in words, for the Status screen and the report.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const INSTALLED = process.env.AUTODEPLOY_SCRIPT || '/root/chart-vault-autodeploy.sh';
const LOG = process.env.AUTODEPLOY_LOG || '/root/chart-vault-autodeploy.log';

export function deployGuard({ logLines = 0 } = {}) {
  const repoCopy = path.join(config.root, 'deploy', 'autodeploy.sh');
  let state, note;
  let installed = null;
  try { installed = fs.readFileSync(INSTALLED); } catch {}
  if (!installed) {
    state = 'missing';
    note = 'Automatic updates are not installed on this server. New versions will not arrive until they are.';
  } else if (installed.equals(fs.readFileSync(repoCopy))) {
    state = 'current';
    note = 'Automatic updates are installed and up to date.';
  } else {
    state = 'stale';
    note = 'Automatic updates are installed but an older copy. It replaces itself on the next update.';
  }
  let lastRunAgo = null, tail = [];
  try {
    const st = fs.statSync(LOG);
    lastRunAgo = Math.round((Date.now() - st.mtimeMs) / 1000);
    if (logLines) tail = fs.readFileSync(LOG, 'utf8').trimEnd().split('\n').slice(-logLines);
  } catch {}
  // The script touches its log every minute, so an old log means cron stopped.
  const stalled = state !== 'missing' && (lastRunAgo === null || lastRunAgo > 600);
  if (stalled) {
    note += ' But it has not checked for updates in the last 10 minutes, so it may not be running.';
  }
  return { state, stalled, ok: state === 'current' && !stalled, note, installed_path: INSTALLED, last_check_seconds_ago: lastRunAgo, log_tail: tail };
}
