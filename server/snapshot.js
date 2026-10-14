// Plain-text picture of what the app is doing, for Claude to read with
// tools/report.mjs. Never includes the password or the cookie secret.
import fs from 'node:fs';
import path from 'node:path';
import { config, paths } from './config.js';
import { statusReport, getImage } from './queries.js';
import { recentLogs } from './logbuf.js';
import { fullPathFor, thumbPathFor } from './storage.js';
import { deployGuard } from './deployguard.js';

const started = Date.now();
const fmtB = (b) => (b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round((b || 0) / 1e3) + ' KB');

function blank(text) {
  // Belt and braces: if the password ever shows up in a log line, hide it.
  if (!config.webToken) return text;
  return text.split(config.webToken).join('[password]');
}

export function snapshot(db, { scope = 'full', id = null, commit = 'unknown', busy = false, version = '' } = {}) {
  const out = [];
  const line = (...a) => out.push(a.join(''));
  const s = statusReport(db);

  if (id !== null && id !== '') {
    const row = /^\d+$/.test(id) ? db.prepare('SELECT id FROM images WHERE id = ?').get(Number(id)) : db.prepare('SELECT id FROM images WHERE filename = ?').get(id);
    const img = row && getImage(db, row.id);
    if (!img) { line(`No chart with id or filename "${id}".`); return out.join('\n'); }
    const raw = db.prepare('SELECT * FROM images WHERE id = ?').get(img.id);
    line(`CHART ${img.id}: ${img.filename}`);
    line(`taken: ${img.taken_at || 'unknown'}   uploaded: ${img.uploaded_at ? `${img.uploaded_at} by build ${raw.uploaded_build || 'unknown'}` : 'no'}`);
    line(`file: ${img.has_file ? `${raw.stored_path} (${fmtB(img.size)}, ${img.width}x${img.height}, sha256 ${img.sha256})` : 'none yet'}`);
    if (img.has_file) line(`on disk: image ${fs.existsSync(fullPathFor(raw)) ? 'yes' : 'MISSING'}, thumb ${thumbPathFor(raw) && fs.existsSync(thumbPathFor(raw)) ? 'yes' : 'missing'}`);
    line(`tags (${img.tags.length}): ${img.tags.map((t) => `${t.name}[${t.kind}${t.source === 'app' ? ',app' : ''}]`).join(', ')}`);
    const removed = db.prepare('SELECT t.name, r.removed_at FROM removed_tags r JOIN tags t ON t.id = r.tag_id WHERE r.image_id = ?').all(img.id);
    if (removed.length) line(`removed in app: ${removed.map((r) => `${r.name} (${r.removed_at})`).join(', ')}`);
    line(`phone paths: ${img.paths.join(' | ')}`);
    return out.join('\n');
  }

  line('CHART VAULT SNAPSHOT  ', new Date().toISOString());
  line(`version ${version} commit ${commit}  up ${Math.round((Date.now() - started) / 60000)} min  busy ${busy}`);
  line(`data dir ${config.dataDir}  backup dir ${config.backupDir}  port ${config.port}  schema ${db.pragma('user_version', { simple: true })}  password ${config.webToken ? 'set' : 'NOT SET'}`);
  const g = deployGuard({ logLines: scope === 'short' ? 3 : 15 });
  line(`auto-update: ${g.state} (${g.installed_path}), last check ${g.last_check_seconds_ago === null ? 'never' : `${g.last_check_seconds_ago}s ago`}. ${g.note}`);
  for (const l of g.log_tail) line('  deploy log: ', blank(l));
  if (s.disk) line(`disk free ${fmtB(s.disk.free_bytes)} of ${fmtB(s.disk.total_bytes)}`);
  line('');
  line('COUNTS');
  line(`charts with tags ${s.images}   uploaded ${s.uploaded}   missing screenshot ${s.missing_count}   archetype pics ${s.archetypes} (${s.archetypes_uploaded} uploaded)`);
  line(`distinct tags ${s.tags}   image-tag links ${s.links}   added in app ${s.added_in_app}   removed in app ${s.removed_in_app}`);
  line(`screenshot bytes ${fmtB(s.bytes)}   lost files (recorded but not on disk) ${s.lost_files ? s.lost_files.length : 0}`);
  line('');
  line('LAST IMPORT ', s.last_import ? `${s.last_import.imported_at} build ${s.last_import.build || 'unknown'} ${s.last_import.filename}: rows ${s.last_import.rows}, images ${s.last_import.images_in_file}, new images ${s.last_import.new_images}, new tags ${s.last_import.new_tags}, new links ${s.last_import.new_links}, skipped removed ${s.last_import.skipped_removed}` : 'none');
  line('LAST BACKUP ', s.last_backup ? `${s.last_backup} ${s.last_backup_result}` : 'none');
  line('');
  const recentUp = db.prepare('SELECT id, filename, uploaded_at, uploaded_build, size FROM images WHERE uploaded_at IS NOT NULL ORDER BY uploaded_at DESC LIMIT 10').all();
  line('RECENT UPLOADS');
  for (const r of recentUp) line(`  ${r.uploaded_at} build ${r.uploaded_build || 'unknown'} #${r.id} ${r.filename} ${fmtB(r.size)}`);
  if (!recentUp.length) line('  none');
  const recentTags = db.prepare(`SELECT it.created_at, i.id, i.filename, t.name FROM image_tags it JOIN images i ON i.id = it.image_id JOIN tags t ON t.id = it.tag_id
    WHERE it.source = 'app' ORDER BY it.created_at DESC LIMIT 10`).all();
  const recentRemoved = db.prepare(`SELECT r.removed_at, i.id, i.filename, t.name FROM removed_tags r JOIN images i ON i.id = r.image_id JOIN tags t ON t.id = r.tag_id
    ORDER BY r.removed_at DESC LIMIT 10`).all();
  line('RECENT TAG EDITS IN APP');
  for (const r of recentTags) line(`  ${r.created_at} added "${r.name}" to #${r.id} ${r.filename}`);
  for (const r of recentRemoved) line(`  ${r.removed_at} removed "${r.name}" from #${r.id} ${r.filename}`);
  if (!recentTags.length && !recentRemoved.length) line('  none');
  line('');
  const n = scope === 'short' ? 20 : 300;
  line(`LAST ${n} LOG LINES`);
  for (const l of recentLogs(n)) line('  ', blank(l));

  if (scope !== 'short') {
    line('');
    const byMonth = new Map();
    for (const m of s.missing) { const k = (/^Screenshot_(\d{6})/.exec(m.filename) || [])[1] || 'other'; byMonth.set(k, (byMonth.get(k) || 0) + 1); }
    line(`MISSING SCREENSHOTS BY MONTH (${s.missing_count})`);
    for (const [k, v] of [...byMonth.entries()].sort()) line(`  ${k} ${v}`);
    line('');
    line('MISSING SCREENSHOT FILENAMES');
    for (const m of s.missing) line('  ', m.filename);
    if (s.lost_files && s.lost_files.length) { line(''); line('LOST FILES'); for (const f of s.lost_files) line('  ', f); }
    line('');
    const topTags = db.prepare('SELECT t.name, t.kind, count(it.image_id) c FROM tags t JOIN image_tags it ON it.tag_id = t.id GROUP BY t.id ORDER BY c DESC LIMIT 40').all();
    line('TOP 40 TAGS');
    for (const t of topTags) line(`  ${t.name} [${t.kind}] ${t.c}`);
    line('');
    const imports = db.prepare('SELECT * FROM imports ORDER BY id DESC LIMIT 10').all();
    line('IMPORT HISTORY');
    for (const i of imports) line(`  ${i.imported_at} build ${i.build || 'unknown'} ${i.filename}: +${i.new_images} images, +${i.new_tags} tags, +${i.new_links} links, skipped ${i.skipped_removed}`);
    line('');
    const newest = db.prepare('SELECT id, filename, taken_at, (stored_path IS NOT NULL) f FROM images ORDER BY (taken_at IS NULL), taken_at DESC, id DESC LIMIT 15').all();
    line('NEWEST 15 CHARTS (what Browse shows first)');
    for (const r of newest) line(`  #${r.id} ${r.filename} ${r.taken_at || ''} ${r.f ? 'file' : 'NO FILE'}`);
    line('');
    line('FOLDERS');
    for (const d of [paths.images, paths.thumbs, config.backupDir]) {
      try { line(`  ${d}: ${fs.readdirSync(d).filter((f) => !f.startsWith('.')).length} entries`); } catch { line(`  ${d}: missing`); }
    }
  }
  return out.join('\n');
}
