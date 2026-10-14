// deploy/autodeploy.sh decides right, with every outside command faked.
// The script stands between a push and an upload being cut off mid-file on the
// server, so each decision it can take is driven here with fake git, curl,
// systemctl and npm on PATH, in a scratch folder: nothing real is touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT = new URL('../deploy/autodeploy.sh', import.meta.url).pathname;
const HEALTHY = '{"ok":true,"busy":false}';
const BUSY = '{"ok":true,"busy":true}';

function fake(dir, name, body) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, '#!/usr/bin/env bash\n' + body);
  fs.chmodSync(p, 0o755);
}

// One cron tick. health: what curl prints, or null for a curl that fails.
// waitedFor: seconds since the script started waiting (writes its state file).
function tick({ health = HEALTHY, active = true, remote = 'bbbb', deployed = 'aaaa', npmOk = true, restartOk = true, waitedFor = null, sawBusy = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-autodeploy-'));
  const bin = path.join(dir, 'bin');
  const app = path.join(dir, 'app');
  fs.mkdirSync(bin); fs.mkdirSync(path.join(app, 'deploy'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(app, 'deploy', 'autodeploy.sh'));
  fs.writeFileSync(path.join(app, '.env'), 'WEB_TOKEN=secret\nPORT=8090\n');
  const installed = path.join(dir, 'installed-autodeploy.sh');
  fs.copyFileSync(SCRIPT, installed);
  const calls = path.join(dir, 'calls.log');
  const state = path.join(dir, 'state');
  const deployedFile = path.join(dir, 'deployed');
  if (deployed !== null) fs.writeFileSync(deployedFile, deployed);
  if (waitedFor !== null) fs.writeFileSync(state, String(Math.floor(Date.now() / 1000) - waitedFor));
  if (sawBusy) fs.writeFileSync(state + '.busy', '');

  fake(bin, 'git', `echo "git $*" >> "${calls}"
case "$1" in
  fetch) exit 0 ;;
  rev-parse) case "$2" in --short) echo ${remote} ;; HEAD) echo aaaa ;; *) echo ${remote} ;; esac ;;
  reset) exit 0 ;;
esac`);
  fake(bin, 'curl', `echo "curl $*" >> "${calls}"\n${health === null ? 'exit 7' : `echo '${health}'`}`);
  fake(bin, 'systemctl', `echo "systemctl $*" >> "${calls}"
case "$1" in is-active) exit ${active ? 0 : 3} ;; restart) exit ${restartOk ? 0 : 1} ;; esac
exit 0`);
  fake(bin, 'npm', `echo "npm $*" >> "${calls}"\nexit ${npmOk ? 0 : 1}`);

  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, APP_DIR: app, LOG: path.join(dir, 'deploy.log'), STATE: state, DEPLOYED: deployedFile };
  const r = spawnSync('bash', [installed], { env, encoding: 'utf8', timeout: 30_000 });
  const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
  const out = { code: r.status, log: read(env.LOG), calls: read(calls), deployed: read(deployedFile).trim(), waiting: fs.existsSync(state), sawBusy: fs.existsSync(state + '.busy') };
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}
const restarted = (t) => /systemctl restart chart-vault/.test(t.calls);

test('already on the newest commit: does nothing, but still touches the log', () => {
  const t = tick({ deployed: 'bbbb' });
  assert.equal(t.code, 0);
  assert.ok(!restarted(t));
  assert.doesNotMatch(t.calls, /curl|reset|npm/);
  assert.equal(t.log, '');
});

test('new commit and the app is idle: reset, install, restart, remember the commit', () => {
  const t = tick();
  assert.match(t.calls, /curl -s -m 5 http:\/\/127\.0\.0\.1:8090\/api\/health/);
  assert.match(t.calls, /git reset -q --hard origin\/main/);
  assert.match(t.calls, /npm ci --omit=dev/);
  assert.ok(restarted(t));
  assert.equal(t.deployed, 'bbbb');
  assert.match(t.log, /deploying aaaa -> bbbb/);
  assert.match(t.log, /restarted chart-vault/);
});

test('app busy: waits and says so', () => {
  const t = tick({ health: BUSY });
  assert.ok(!restarted(t));
  assert.doesNotMatch(t.calls, /reset/);
  assert.ok(t.waiting);
  assert.ok(t.sawBusy);
  assert.match(t.log, /waiting: app busy/);
});

test('app busy for longer than 10 minutes: deploys anyway, says so', () => {
  const t = tick({ health: BUSY, waitedFor: 601 });
  assert.ok(restarted(t));
  assert.match(t.log, /app busy for 600s, deploying anyway/);
  assert.ok(!t.waiting);
});

test('no readable answer while the service is up: waits up to 5 minutes', () => {
  let t = tick({ health: null });
  assert.ok(!restarted(t));
  assert.match(t.log, /waiting: health unreadable/);
  t = tick({ health: 'garbage', waitedFor: 200 });
  assert.ok(!restarted(t));
  t = tick({ health: null, waitedFor: 301 });
  assert.ok(restarted(t));
  assert.match(t.log, /health unreadable for 300s, deploying anyway/);
});

test('no readable answer right after a busy one: keeps waiting the full 10 minutes', () => {
  let t = tick({ health: null, waitedFor: 400, sawBusy: true });
  assert.ok(!restarted(t));
  t = tick({ health: null, waitedFor: 601, sawBusy: true });
  assert.ok(restarted(t));
});

test('service down: nothing to protect, deploys at once without asking', () => {
  const t = tick({ active: false, health: BUSY });
  assert.doesNotMatch(t.calls, /curl/);
  assert.ok(restarted(t));
});

test('install fails: no restart, and the next minute tries again', () => {
  const t = tick({ npmOk: false });
  assert.ok(!restarted(t));
  assert.equal(t.deployed, 'install-failed');
  assert.match(t.log, /npm ci failed/);
});

test('restart fails: logged, commit not marked as deployed', () => {
  const t = tick({ restartOk: false });
  assert.match(t.log, /ERROR: restart failed/);
  assert.equal(t.deployed, 'aaaa');
});
