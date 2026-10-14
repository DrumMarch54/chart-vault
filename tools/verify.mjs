#!/usr/bin/env node
// One command that checks everything and spends nothing: run it before saying
// a change is done.  npm run verify
//   1. every .js/.mjs file parses (a typo here takes the service down on the VPS)
//   2. every shell script parses
//   3. npm test (all of test/*.test.js, including the autodeploy decisions)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = (dir, ext) => fs.readdirSync(path.join(root, dir)).filter((f) => ext.some((e) => f.endsWith(e))).map((f) => path.join(dir, f));
let failed = 0;
const run = (label, cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) { failed++; console.error(`FAIL ${label}`); }
};

for (const f of [...files('server', ['.js']), ...files('public', ['.js']), ...files('tools', ['.js', '.mjs']), ...files('scripts', ['.js', '.mjs']), ...files('test', ['.js'])]) run(`syntax ${f}`, 'node', ['--check', f]);
for (const f of [...files('deploy', ['.sh']), ...files('tools', ['.sh'])]) run(`syntax ${f}`, 'bash', ['-n', f]);
run('npm test', 'npm', ['test', '--silent']);

console.log(failed ? `\nverify: ${failed} problem(s)` : '\nverify: all good');
process.exit(failed ? 1 : 0);
