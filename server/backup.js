import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { ZipArchive } from 'archiver';
import { config, paths } from './config.js';
import { exportTags } from './queries.js';

const DAY = 24 * 3600 * 1000;

async function copyNewFiles(srcDir, dstDir) {
  await fsp.mkdir(dstDir, { recursive: true });
  let copied = 0;
  const entries = await fsp.readdir(srcDir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    if (!e.isFile()) continue;
    const src = path.join(srcDir, e.name);
    const dst = path.join(dstDir, e.name);
    const s = await fsp.stat(src);
    const d = await fsp.stat(dst).catch(() => null);
    if (d && d.size === s.size) continue;
    await fsp.copyFile(src, `${dst}.tmp`);
    await fsp.rename(`${dst}.tmp`, dst);
    copied++;
  }
  return copied;
}

// Snapshot the database with SQLite's own online backup (safe while in use).
export async function snapshotDb(db, dest) {
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await db.backup(`${dest}.tmp`);
  await fsp.rename(`${dest}.tmp`, dest);
}

let running = null;
export function runBackup(db, log = console.log) {
  if (running) return running;
  running = (async () => {
    const started = Date.now();
    const dir = config.backupDir;
    await fsp.mkdir(dir, { recursive: true });
    await snapshotDb(db, path.join(dir, 'chart-vault.sqlite'));
    await fsp.writeFile(path.join(dir, 'tags.json.tmp'), JSON.stringify(exportTags(db), null, 1));
    await fsp.rename(path.join(dir, 'tags.json.tmp'), path.join(dir, 'tags.json'));
    const copied = await copyNewFiles(paths.images, path.join(dir, 'images'));
    const thumbs = await copyNewFiles(paths.thumbs, path.join(dir, 'thumbs'));
    const now = new Date().toISOString();
    const result = `ok: ${copied} new image file(s), ${thumbs} thumbnail(s), took ${Math.round((Date.now() - started) / 1000)}s`;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_backup', ?)").run(now);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_backup_result', ?)").run(result);
    await fsp.writeFile(path.join(dir, 'LAST_BACKUP.txt'), `${now}\n${result}\n`);
    log(`backup ${result}`);
    return { at: now, result, copied };
  })().catch((err) => {
    const msg = `failed: ${err.message}`;
    try { db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_backup_result', ?)").run(msg); } catch {}
    log(`backup ${msg}`);
    throw err;
  }).finally(() => { running = null; });
  return running;
}

// Daily: check every 15 minutes whether the last backup is older than a day.
export function scheduleBackups(db, log = console.log) {
  const check = () => {
    const last = (db.prepare("SELECT value FROM settings WHERE key = 'last_backup'").get() || {}).value;
    if (!last || Date.now() - Date.parse(last) > DAY) runBackup(db, log).catch(() => {});
  };
  setTimeout(check, 30_000).unref();
  setInterval(check, 15 * 60_000).unref();
}

// One zip with the database, a readable tags.json and every image.
export async function streamZip(db, res) {
  const stamp = new Date().toISOString().slice(0, 10);
  const snap = path.join(config.dataDir, `.zip-snapshot-${Date.now()}.sqlite`);
  await snapshotDb(db, snap);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="chart-vault-backup-${stamp}.zip"`);
  const zip = new ZipArchive({ zlib: { level: 1 } }); // images are already compressed
  const cleanup = () => fsp.unlink(snap).catch(() => {});
  zip.on('error', (err) => { console.error('zip error', err); cleanup(); res.destroy(err); });
  res.on('close', cleanup);
  zip.pipe(res);
  zip.file(snap, { name: 'chart-vault.sqlite' });
  zip.append(JSON.stringify(exportTags(db), null, 1), { name: 'tags.json' });
  zip.append(['Chart Vault backup', `Made ${new Date().toISOString()}`, '',
    'chart-vault.sqlite = the database (images, tags, app changes)',
    'tags.json = the same tags in plain readable JSON',
    'images/ = the original screenshots'].join('\n'), { name: 'README.txt' });
  if (fs.existsSync(paths.images)) zip.directory(paths.images, 'images', (entry) => (entry.name.startsWith('.tmp') ? false : entry));
  await zip.finalize();
}
