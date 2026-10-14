// With no WEB_TOKEN on the server nobody gets in: fail closed, never open.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-notoken-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = '';

const { ensureDirs } = await import('../server/config.js');
const { openDb } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');

let server, base;
before(async () => {
  ensureDirs();
  const app = createApp(openDb(':memory:'), { log: () => {} });
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

test('no password on the server: everything answers 503 and says why', async () => {
  for (const p of ['/api/status', '/api/debug/snapshot', '/api/deploy-guard', '/img/1']) {
    const r = await fetch(base + p, { headers: { authorization: 'Bearer ' } });
    assert.equal(r.status, 503, p);
    assert.match((await r.json()).error, /WEB_TOKEN is not set/);
  }
  const login = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: '' }) });
  assert.equal(login.status, 503);
  const link = await fetch(base + '/?t=', { redirect: 'manual' });
  assert.equal(link.status, 503);
  const health = await (await fetch(base + '/api/health')).json();
  assert.equal(health.configured, false);
  assert.equal(health.authenticated, false);
});
