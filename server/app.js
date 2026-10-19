import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { requireAuth, isAuthed, NO_TOKEN_MSG, passwordMatches, setSessionCookie, clearSessionCookie, isValidSession, loginAllowed, recordFailure, clearFailures } from './auth.js';
import { parseUserTagBackup, importTags, addTagToImage, removeTagFromImage, markAlbumMember, ImportError } from './import.js';
import { receiveUpload, createQuickChart, UploadError, fullPathFor, thumbPathFor, makeThumb, findLostFiles } from './storage.js';
import { listImages, getImage, imageContext, suggestTags, allTags, tagNames, statusReport, exportTags, bumpUsage, usageReport } from './queries.js';
import { runBackup, streamZip, isBackupRunning } from './backup.js';
import { setTitle, acceptTitle, titlesToCheck, titleStats, suggestNames, MAX_TITLE } from './titles.js';
import { snapshot } from './snapshot.js';
import { getMyChart, setMyChart } from './mychart.js';
import { deployGuard } from './deployguard.js';
import { catalog, positionCounts, parseNumber, parseCondition, parseFixed, getInputs, setInputs, clearInputs, valuesFor, recomputeAll, inputStats, tagCheck, InputError } from './positions.js';
import { COMMIT } from './build.js';
import { paths } from './config.js';
import { aiSettings, setAiSettings, spendState, pendingWarning, markWarningSeen, AiError } from './ai.js';
import { readingFor, writeReading, answerQuestion, deleteReadings, readingEstimate, readingChoices } from './reading.js';
import { askVault } from './ask.js';
import { factsFor } from './facts.js';
import { meaningFor, countWith } from './meaning.js';

const MAX_IMPORT = 50 * 1024 * 1024;

function asList(v) {
  if (v === undefined || v === null || v === '') return [];
  return (Array.isArray(v) ? v : [v]).map(String).filter((s) => s.length);
}
// ?pos=name.heart&num=12 (or num=/3 for a digit sum): the position search. pos and num may repeat, pairwise
// (?pos=essence.day&num=8&pos=name.first&num=15): a chart must meet every pair. A pair that cannot be read
// is dropped, not an error.
function positionsOf(q) {
  const pos = asList(q.pos), num = asList(q.num);
  return pos.map((p, i) => parseCondition(p, num[i])).filter(Boolean);
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

  // Browse. ?drawn=1 = only charts the app draws itself (name and date known), ?drawn=0 = only the ones
  // still shown as the screenshot; nothing = every chart.
  const drawnOf = (q) => (q.drawn === '1' ? true : q.drawn === '0' ? false : null);
  app.get('/api/images', (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 60, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const ids = req.query.ids ? String(req.query.ids).split(',').map(Number) : null;
    res.json(listImages(db, { tags: asList(req.query.tag), positions: positionsOf(req.query), name: String(req.query.name || ''), onlyUploaded: req.query.uploaded === '1', kind: req.query.kind === 'archetype' ? 'archetype' : 'chart', limit, offset, ids, drawn: drawnOf(req.query) }));
  });
  app.get('/api/images/:id', (req, res) => {
    const img = getImage(db, Number(req.params.id));
    if (!img) return res.status(404).json({ error: 'No such chart.' });
    res.json(img);
  });
  app.get('/api/images/:id/context', (req, res) => {
    const id = Number(req.params.id);
    if (!getImage(db, id)) return res.status(404).json({ error: 'No such chart.' });
    res.json(imageContext(db, id, { tags: asList(req.query.tag), positions: positionsOf(req.query), name: String(req.query.name || ''), kind: req.query.kind === 'archetype' ? 'archetype' : 'chart', drawn: drawnOf(req.query) }));
  });

  // Who a chart is: the name under the thumbnail. The owner types or fixes it ("Who is this?"), or
  // confirms a seeded one; "Names to check" lists the ones still waiting on them.
  app.put('/api/images/:id/title', express.json({ limit: '10kb' }), (req, res) => {
    const img = getImage(db, Number(req.params.id));
    if (!img) return res.status(404).json({ error: 'No such chart.' });
    if (typeof req.body?.title !== 'string') return res.status(400).json({ error: 'Type a name first.' });
    if (req.body.title.trim().length > MAX_TITLE) return res.status(400).json({ error: `That name is too long (${MAX_TITLE} letters at most).` });
    const title = setTitle(db, img.id, req.body.title);
    log(`name set by owner for #${img.id} ${img.filename}: "${title}" (was "${img.title || ''}")`);
    res.json({ title, image: getImage(db, img.id) });
  });
  app.post('/api/images/:id/title/ok', (req, res) => {
    const img = getImage(db, Number(req.params.id));
    if (!img) return res.status(404).json({ error: 'No such chart.' });
    acceptTitle(db, img.id);
    res.json({ ok: true, image: getImage(db, img.id) });
  });
  app.get('/api/titles/check', (req, res) => res.json({ items: titlesToCheck(db), ...titleStats(db) }));
  app.get('/api/names', (req, res) => res.json(suggestNames(db, String(req.query.q || ''), { kind: req.query.kind === 'archetype' ? 'archetype' : 'chart' })));

  // Search by chart position: the catalog of positions, how many charts hold a number in each,
  // and one chart's typed inputs with everything computed from them.
  app.get('/api/positions', (req, res) => res.json(catalog()));
  app.get('/api/positions/counts', (req, res) => {
    const num = parseNumber(req.query.num);
    if (!num) return res.status(400).json({ error: 'Type a number first, like 12 or 12/3.' });
    res.json(positionCounts(db, num, parseFixed(req.query.fixed)));
  });
  app.get('/api/images/:id/numbers', (req, res) => {
    const img = getImage(db, Number(req.params.id));
    if (!img) return res.status(404).json({ error: 'No such chart.' });
    res.json({ inputs: getInputs(db, img.id), charts: valuesFor(db, img.id) });
  });
  // The owner fixes a misread name or date (or types one for a chart nobody could read): recomputes at once.
  app.put('/api/images/:id/inputs', express.json({ limit: '10kb' }), (req, res, next) => {
    try {
      const img = getImage(db, Number(req.params.id));
      if (!img) return res.status(404).json({ error: 'No such chart.' });
      const b = req.body || {};
      if (b.clear) { clearInputs(db, img.id); log(`inputs cleared for #${img.id} ${img.filename}`); return res.json({ inputs: null, charts: [] }); }
      const inputs = setInputs(db, img.id, { day: b.day, month: b.month, year: b.year, name: b.name }, { source: 'owner' });
      log(`inputs set by owner for #${img.id} ${img.filename}: ${inputs.day || '?'}.${inputs.month || '?'}.${inputs.year || '?'} "${inputs.name}"`);
      res.json({ inputs, charts: valuesFor(db, img.id) });
    } catch (err) {
      if (err instanceof InputError) return res.status(400).json({ error: err.message });
      next(err);
    }
  });
  app.post('/api/positions/recompute', (req, res) => {
    const n = recomputeAll(db);
    log(`recomputed the chart numbers of ${n} charts`);
    res.json({ recomputed: n, ...inputStats(db), check: tagCheck(db) });
  });
  // What a number means in a position (a number tapped twice on a drawn chart): the course's words, the balance
  // verdict and how many vault charts hold it there. ?pair=13 = the numbers sharing its circle (a center's main and
  // extra vibrations); ?rel=mindDiamond:61,... = the diamonds behind it on the same chart, each with its own count.
  app.get('/api/meaning', (req, res) => {
    const pair = String(req.query.pair || '').split(',').map(Number).filter((x) => Number.isInteger(x) && x > 0).slice(0, 4);
    const rel = String(req.query.rel || '').split(',').map((x) => x.split(':')).filter((x) => x.length === 2).map(([position, sum]) => ({ position, sum: Number(sum) })).slice(0, 4);
    const m = meaningFor({ chart: String(req.query.chart || ''), position: String(req.query.position || ''), sum: Number(req.query.sum), pair, rel });
    if (!m) return res.status(400).json({ error: 'That position or number is not one the app knows.' });
    res.json({ ...m, count: countWith(db, m.chart, m.position, m.sum), related: m.related.map((r) => ({ ...r, count: countWith(db, r.chart, r.position, r.sum) })) });
  });
  app.get('/api/tags', (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 200);
    res.json(suggestTags(db, { q: String(req.query.q || ''), within: asList(req.query.within), kind: req.query.kind === 'archetype' ? 'archetype' : 'chart', limit }));
  });
  app.get('/api/tags/all', (req, res) => res.json(allTags(db)));
  app.get('/api/tags/names', (req, res) => res.json(tagNames(db)));

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

  // Which buttons and screens get used: a name and a count, nothing else.
  // Always 200: a count may never fail a tap, and a bad name is just dropped.
  app.post('/api/usage', express.json({ limit: '2kb' }), (req, res) => {
    let counted = false;
    try { counted = bumpUsage(db, req.body && req.body.name); } catch (err) { log(`usage: ${err && err.message}`); }
    res.json({ ok: true, counted });
  });
  app.get('/api/usage', (req, res) => res.json(usageReport(db)));

  // My chart: the owner's own name and birth date (server/mychart.js), for the tools that start from a person.
  app.get('/api/mychart', (req, res) => res.json(getMyChart()));
  app.put('/api/mychart', express.json({ limit: '4kb' }), (req, res) => {
    const b = req.body || {};
    const day = Number(b.day) || 0, month = Number(b.month) || 0, year = Number(b.year) || 0;
    const any = day || month || year;
    if (any && !(day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1000 && year <= 9999)) return res.status(400).json({ error: 'The birth date needs a day (1-31), a month (1-12) and a four-digit year.' });
    const saved = setMyChart(b);
    log(`my chart saved: ${saved.name ? 'name set' : 'no name'}, date ${saved.day ? 'set' : 'not set'}`);
    res.json(saved);
  });

  // --- AI: readings, questions, the vault search; the key, the cap and the spend (server/ai.js) ---
  // The key never comes back out: the settings answer says set / not set and the last 4 characters.
  app.get('/api/ai/settings', (req, res) => res.json({ ...aiSettings(), warning: pendingWarning() }));
  app.put('/api/ai/settings', express.json({ limit: '4kb' }), (req, res, next) => {
    try {
      const b = req.body || {};
      const out = setAiSettings({ key: typeof b.key === 'string' ? b.key : undefined, cap: b.cap });
      log(`ai settings saved: key ${out.key_set ? 'set' : 'cleared'}, cap $${out.cap}`);
      res.json(out);
    } catch (err) { if (err instanceof AiError) return res.status(400).json({ error: err.message }); next(err); }
  });
  app.get('/api/ai/spend', (req, res) => res.json({ ...spendState(), warning: pendingWarning() }));
  app.post('/api/ai/warning-seen', express.json({ limit: '1kb' }), (req, res) => { markWarningSeen(req.body && req.body.level); res.json({ ok: true }); });
  // Rule-based facts about one chart: free, instant, no AI.
  app.get('/api/images/:id/facts', (req, res) => {
    const img = getImage(db, Number(req.params.id));
    if (!img) return res.status(404).json({ error: 'No such chart.' });
    res.json(factsFor(db, img.id));
  });
  app.get('/api/images/:id/reading', (req, res) => {
    const img = getImage(db, Number(req.params.id));
    if (!img) return res.status(404).json({ error: 'No such chart.' });
    res.json({ ...readingFor(db, img.id), estimate: readingEstimate(db, img.id), choices: readingChoices(), spend: spendState(), warning: pendingWarning() });
  });
  const aiRoute = (fn) => async (req, res, next) => {
    const img = getImage(db, Number(req.params.id));
    if (!img) return res.status(404).json({ error: 'No such chart.' });
    try { res.json(await fn(img, req.body || {})); } catch (err) { if (err instanceof AiError) return res.status(400).json({ error: err.message }); next(err); }
  };
  app.post('/api/images/:id/reading', express.json({ limit: '2kb' }), aiRoute(async (img, body) => {
    const r = await writeReading(db, img.id, { length: body.length, focus: body.focus, note: body.note }, { force: !!body.force });
    if (!r.cached) log(`reading written for #${img.id} (${r.reading.label}): $${r.usd} in ${r.seconds}s`);
    return { ...r, spend: spendState(), warning: pendingWarning() };
  }));
  app.delete('/api/images/:id/reading', aiRoute(async (img) => ({ deleted: deleteReadings(db, img.id), ...readingFor(db, img.id) })));
  app.post('/api/images/:id/ask', express.json({ limit: '4kb' }), aiRoute(async (img, body) => {
    const r = await answerQuestion(db, img.id, body.question, { length: body.length });
    return { ...r, spend: spendState(), warning: pendingWarning() };
  }));
  app.post('/api/ask', express.json({ limit: '4kb' }), async (req, res, next) => {
    try {
      const r = await askVault(db, req.body && req.body.question);
      log(`ask: ${r.ids.length} charts, ${r.turns} turns, $${r.usd}`);
      res.json({ ...r, spend: spendState(), warning: pendingWarning() });
    } catch (err) { if (err instanceof AiError) return res.status(400).json({ error: err.message }); next(err); }
  });

  // Status, export, backup
  app.get('/api/status', (req, res) => {
    const report = statusReport(db);
    report.usage = usageReport(db, 40);
    report.lost_files = findLostFiles(db);
    report.disk = diskInfo();
    report.version = appVersion();
    report.commit = COMMIT;
    report.updates = deployGuard();
    report.positions = inputStats(db);
    report.positions.check = (({ tags, agree, disagree, unknown }) => ({ tags, agree, disagree, unknown }))(tagCheck(db));
    report.ai = aiSettings();
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
