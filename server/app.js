import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { requireAuth, isAuthed, NO_TOKEN_MSG, passwordMatches, setSessionCookie, clearSessionCookie, isValidSession, loginAllowed, recordFailure, clearFailures } from './auth.js';
import { parseUserTagBackup, importTags, addTagToImage, removeTagFromImage, markAlbumMember, ImportError } from './import.js';
import { receiveUpload, createQuickChart, UploadError, fullPathFor, thumbPathFor, makeThumb, findLostFiles } from './storage.js';
import { listImages, getImage, imageContext, suggestTags, allTags, statusReport, exportTags } from './queries.js';
import { runBackup, streamZip, isBackupRunning } from './backup.js';
import { snapshot } from './snapshot.js';
import { deployGuard } from './deployguard.js';
import { COMMIT } from './build.js';
import { paths } from './config.js';

const MAX_IMPORT = 50 * 1024 * 1024;

function asList(v) {
  if (v === undefined || v === null || v === '') return [];
  return (Array.isArray(v) ? v : [v]).map(String).filter((s) => s.length);
}

export function createApp(db, { log = console.log } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.set('etag', false);

  // Any error answer must never be cached: a 404 for the app's own CSS during
  // a deploy was once kept by the browser AND Cloudflare and outlived the fix.
  app.use((req, res, next) => {
    const writeHead = res.writeHead;
    res.writeHead = function (status, ...rest) {
      if (status >= 400) {
        res.setHeader('Cache-Control', 'no-store, must-revalidate');
        res.setHeader('CDN-Cache-Control', 'no-store');
      }
      return writeHead.call(this, status, ...rest);
    };
    next();
  });

  // --- public: app shell and login ---
  const pub = path.join(config.root, 'public');
  // The HTML is never cached; the code files it points at carry the commit in
  // their address (?v=...), so every deploy is a brand-new address and no
  // browser or CDN cache can keep an old version alive.
  const sendIndex = (req, res) => {
    // Sign-in link: /?t=<password> logs this browser in once and drops the
    // password from the address.
    if (typeof req.query.t === 'string') {
      res.setHeader('Cache-Control', 'no-store');
      if (!config.webToken) return res.status(503).type('text').send(NO_TOKEN_MSG);
      if (!loginAllowed(req.ip)) return res.status(429).type('text').send('Too many tries. Wait a minute and try again.');
      if (!passwordMatches(req.query.t)) { recordFailure(req.ip); return res.status(401).type('text').send('Not authorised.'); }
      clearFailures(req.ip);
      setSessionCookie(res);
      return res.redirect(302, '/');
    }
    const html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8').replace(/__V__/g, COMMIT);
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.type('html').send(html);
  };
  app.get(['/', '/index.html'], sendIndex);
  app.get('/sw.js', (req, res) => {
    const js = fs.readFileSync(path.join(pub, 'sw.js'), 'utf8').replace(/__V__/g, COMMIT);
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Service-Worker-Allowed', '/');
    res.type('application/javascript').send(js);
  });
  // public/CLAUDE.md holds notes for Claude sessions, not for the web.
  app.use((req, res, next) => (/\.md$/i.test(req.path) ? res.status(404).json({ error: 'Not found.' }) : next()));
  app.use(express.static(pub, { index: false, maxAge: '365d', immutable: true }));

  // The only API answer without the password: used by the deploy script (busy =
  // wait before restarting), by the app to notice a new version, and by
  // tools/report.mjs to tell "down" from "refused".
  app.get('/api/health', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, version: appVersion(), commit: COMMIT, busy: isBusy(), configured: !!config.webToken, authenticated: !!config.webToken && isAuthed(req) });
  });

  app.post('/api/login', express.json({ limit: '10kb' }), (req, res) => {
    if (!config.webToken) return res.status(503).json({ error: NO_TOKEN_MSG });
    if (!loginAllowed(req.ip)) return res.status(429).json({ error: 'Too many tries. Wait a minute and try again.' });
    if (!passwordMatches(req.body && req.body.password)) {
      recordFailure(req.ip);
      return res.status(401).json({ error: 'Wrong password.' });
    }
    clearFailures(req.ip);
    setSessionCookie(res);
    res.json({ ok: true });
  });
  app.post('/api/logout', (req, res) => { clearSessionCookie(res); res.json({ ok: true }); });
  app.get('/api/me', (req, res) => res.json({ loggedIn: isValidSession(req.headers.cookie) }));

  // --- everything below needs the password ---
  app.use('/api', requireAuth);
  app.use(['/img', '/thumb'], requireAuth);

  // Browse
  app.get('/api/images', (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    res.json(listImages(db, { tags: asList(req.query.tag), onlyUploaded: req.query.uploaded === '1', kind: req.query.kind === 'archetype' ? 'archetype' : 'chart', limit, offset }));
  });
  app.get('/api/images/:id', (req, res) => {
    const img = getImage(db, Number(req.params.id));
    if (!img) return res.status(404).json({ error: 'No such chart.' });
    res.json(img);
  });
  app.get('/api/images/:id/context', (req, res) => {
    const id = Number(req.params.id);
    if (!getImage(db, id)) return res.status(404).json({ error: 'No such chart.' });
    res.json(imageContext(db, id, { tags: asList(req.query.tag), kind: req.query.kind === 'archetype' ? 'archetype' : 'chart' }));
  });
  app.get('/api/tags', (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 200);
    res.json(suggestTags(db, { q: String(req.query.q || ''), within: asList(req.query.within), kind: req.query.kind === 'archetype' ? 'archetype' : 'chart', limit }));
  });
  app.get('/api/tags/all', (req, res) => res.json(allTags(db)));

  // Edit tags on one chart
  app.post('/api/images/:id/tags', express.json({ limit: '10kb' }), (req, res) => {
    const img = getImage(db, Number(req.params.id));
    if (!img) return res.status(404).json({ error: 'No such chart.' });
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'Type a tag first.' });
    if (name.length > 200) return res.status(400).json({ error: 'That tag is too long.' });
    const r = addTagToImage(db, img.id, name);
    res.json({ ...r, image: getImage(db, img.id) });
  });
  app.post('/api/images/:id/tags/remove', express.json({ limit: '10kb' }), (req, res) => {
    const img = getImage(db, Number(req.params.id));
    if (!img) return res.status(404).json({ error: 'No such chart.' });
    const name = typeof req.body?.name === 'string' ? req.body.name : '';
    const r = removeTagFromImage(db, img.id, name);
    res.json({ ...r, image: getImage(db, img.id) });
  });

  // Files
  app.get('/img/:id', (req, res) => {
    const img = db.prepare('SELECT * FROM images WHERE id = ?').get(Number(req.params.id));
    const p = img && fullPathFor(img);
    if (!p || !fs.existsSync(p)) return res.status(404).json({ error: 'No file uploaded for this chart yet.' });
    res.setHeader('Cache-Control', 'private, max-age=31536000');
    res.sendFile(p);
  });
  app.get('/thumb/:id', async (req, res, next) => {
    try {
      const img = db.prepare('SELECT * FROM images WHERE id = ?').get(Number(req.params.id));
      if (!img || !img.stored_path) return res.status(404).json({ error: 'No file uploaded for this chart yet.' });
      let t = thumbPathFor(img);
      if (!t || !fs.existsSync(t)) {
        const full = fullPathFor(img);
        if (!fs.existsSync(full)) return res.status(404).json({ error: 'File missing on disk.' });
        const rel = img.stored_path.replace(/\.[^.]*$/, '') + '.webp';
        t = path.join(paths.thumbs, rel);
        await makeThumb(full, t);
        db.prepare('UPDATE images SET thumb_path = ? WHERE id = ?').run(rel, img.id);
      }
      res.setHeader('Cache-Control', 'private, max-age=31536000');
      res.sendFile(t);
    } catch (err) { next(err); }
  });

  // Import tag file
  app.post('/api/import', express.raw({ type: () => true, limit: MAX_IMPORT }), (req, res, next) => {
    try {
      if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'No file received.' });
      const parsed = parseUserTagBackup(req.body);
      const filename = String(req.query.filename || 'UserTag.backup').slice(0, 200);
      const summary = importTags(db, parsed, { filename });
      log(`import ${filename}: ${JSON.stringify(summary)}`);
      res.json(summary);
    } catch (err) {
      if (err instanceof ImportError) return res.status(400).json({ error: err.message });
      next(err);
    }
  });
  app.get('/api/imports', (req, res) => res.json(db.prepare('SELECT * FROM imports ORDER BY id DESC LIMIT 50').all()));

  // Upload images. Step 1: which of these filenames do we still need?
  app.post('/api/upload/check', express.json({ limit: '5mb' }), (req, res) => {
    const names = Array.isArray(req.body?.names) ? req.body.names.filter((n) => typeof n === 'string') : null;
    if (!names) return res.status(400).json({ error: 'Send a list of names.' });
    const find = db.prepare('SELECT stored_path FROM images WHERE filename = ?');
    const wanted = [], already = [];
    let unknown = 0;
    const unknownSample = [];
    const seen = new Set();
    for (const n of names) {
      if (seen.has(n)) continue;
      seen.add(n);
      const row = find.get(n);
      if (!row) { unknown++; if (unknownSample.length < 3) unknownSample.push(n); }
      else if (row.stored_path) already.push(n);
      else wanted.push(n);
    }
    log(`upload check: ${names.length} picked, ${wanted.length} wanted, ${already.length} already, ${unknown} unknown${unknownSample.length ? ` (e.g. ${unknownSample.join(', ')})` : ''}`);
    res.json({ wanted, already: already.length, unknown });
  });
  // Album folders: "this file is in Gallery album X" becomes the tag X.
  app.post('/api/album/mark', express.json({ limit: '10kb' }), (req, res, next) => {
    try {
      const r = markAlbumMember(db, { filename: req.body?.filename, album: req.body?.album, tags: req.body?.tags, kind: req.body?.kind || 'chart' });
      if (r.created || r.tagged) log(`album "${req.body.album}": ${req.body.filename}${r.created ? ` (new ${r.kind})` : ''}${r.tagged ? ' tagged' : ''}`);
      res.json(r);
    } catch (err) {
      if (err instanceof ImportError) return res.status(400).json({ error: err.message });
      next(err);
    }
  });
  // Step 2: one file per request, raw body.
  app.put('/api/upload/file', async (req, res, next) => {
    lastUpload = Date.now();
    try {
      const filename = String(req.query.name || '');
      if (!filename) return res.status(400).json({ error: 'Missing file name.' });
      const result = await receiveUpload(db, req, { filename, sha256Header: req.get('x-sha256') });
      lastUpload = Date.now();
      if (!result.already) log(`uploaded #${result.id} ${filename} (${result.size} bytes)`);
      res.json(result);
    } catch (err) {
      if (err instanceof UploadError) { log(`upload refused ${req.query.name}: ${err.message}`); return res.status(err.status).json({ error: err.message }); }
      next(err);
    }
  });

  // Quick chart "Save to vault": the page sends the drawn chart as a PNG; it becomes a chart record
  // tagged with the typed name, like any uploaded screenshot.
  app.put('/api/quick/save', async (req, res, next) => {
    lastUpload = Date.now();
    let made = null;
    try {
      made = createQuickChart(db, { name: req.query.name, date: req.query.date });
      const result = await receiveUpload(db, req, { filename: made.filename, sha256Header: req.get('x-sha256') });
      log(`quick chart saved #${result.id} ${made.filename} (${result.size} bytes)`);
      res.json(result);
    } catch (err) {
      if (made) db.prepare('DELETE FROM images WHERE id = ? AND stored_path IS NULL').run(made.id);
      if (err instanceof UploadError) { log(`quick chart save refused: ${err.message}`); return res.status(err.status).json({ error: err.message }); }
      next(err);
    }
  });

  // Status, export, backup
  app.get('/api/status', (req, res) => {
    const report = statusReport(db);
    report.lost_files = findLostFiles(db);
    report.disk = diskInfo();
    report.version = appVersion();
    report.commit = COMMIT;
    report.updates = deployGuard();
    res.json(report);
  });
  app.get('/api/export/tags.json', (req, res) => {
    res.setHeader('Content-Disposition', `attachment; filename="chart-vault-tags-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(exportTags(db));
  });
  app.post('/api/backup/run', async (req, res, next) => {
    try { res.json(await runBackup(db, log)); } catch (err) { next(err); }
  });
  app.get('/api/backup/download', async (req, res, next) => {
    try { await streamZip(db, res); } catch (err) { next(err); }
  });

  // Is the auto-deploy script that cron runs the same as the repo copy?
  app.get('/api/deploy-guard', (req, res) => res.json(deployGuard({ logLines: 10 })));

  // Plain-text state for Claude (tools/report.mjs). Password required like everything else.
  app.get('/api/debug/snapshot', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(snapshot(db, { scope: String(req.query.scope || 'full'), id: req.query.id ? String(req.query.id) : null, commit: COMMIT, busy: isBusy(), version: appVersion() }));
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'That file is too big.' });
    log(`error ${req.method} ${req.url}: ${err && err.stack || err}`);
    if (res.headersSent) return res.destroy();
    res.status(500).json({ error: 'Something went wrong on the server. Nothing was changed.' });
  });
  return app;
}

let lastUpload = 0;
// Busy while a backup runs or a file arrived in the last 20 seconds.
function isBusy() { return isBackupRunning() || Date.now() - lastUpload < 20_000; }
function appVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(config.root, 'package.json'), 'utf8')).version; } catch { return '?'; }
}
function diskInfo() {
  try {
    const s = fs.statfsSync(config.dataDir);
    return { free_bytes: s.bavail * s.bsize, total_bytes: s.blocks * s.bsize };
  } catch { return null; }
}
