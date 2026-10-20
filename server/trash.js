// Deleting a chart (owner's ask 2026-10-19): nothing is ever lost. The picture and its thumbnail move to
// data/trash/, and everything the database knew about the chart (tags, phone paths, name, typed inputs,
// readings) is kept as one JSON record in deleted_images, so Settings -> Deleted Charts puts it back exactly
// as it was. A deleted filename is skipped by every import until the chart is restored, so the tag file never
// brings a deleted chart back by itself.
//
// Possible duplicates: two charts with the very same picture (same file hash), or the same typed name and
// birth date. The owner keeps several charts of one person on purpose, so the app only LISTS them; the
// owner deletes, or taps "Keep both" and the group stops being listed (duplicates_kept).
import fs from 'node:fs';
import path from 'node:path';
import { paths } from './config.js';
import { COMMIT } from './build.js';
import { fullPathFor, thumbPathFor } from './storage.js';
import { setInputs } from './positions.js';
import { tagKind } from './tags.js';

export class TrashError extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }

const safe = (s) => String(s).replace(/[^\p{L}\p{N}._ -]/gu, '_');

function moveFile(from, to) {
  if (!from || !fs.existsSync(from)) return null;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try { fs.renameSync(from, to); } catch { fs.copyFileSync(from, to); fs.unlinkSync(from); }
  return to;
}

// Delete one chart: its record goes to deleted_images, its files to the trash folder, the row goes away
// (tags links, paths, inputs, values and readings follow by ON DELETE CASCADE; the tags themselves stay).
export function deleteImage(db, id, { reason = '', build = COMMIT } = {}) {
  const img = db.prepare('SELECT * FROM images WHERE id = ?').get(id);
  if (!img) throw new TrashError('No such chart.', 404);
  const record = {
    image: img,
    tags: db.prepare('SELECT t.name, it.source, it.created_at FROM image_tags it JOIN tags t ON t.id = it.tag_id WHERE it.image_id = ?').all(id),
    removed_tags: db.prepare('SELECT t.name, r.removed_at FROM removed_tags r JOIN tags t ON t.id = r.tag_id WHERE r.image_id = ?').all(id),
    paths: db.prepare('SELECT path FROM image_paths WHERE image_id = ?').all(id).map((r) => r.path),
    inputs: db.prepare('SELECT day, month, year, name, source, build FROM chart_inputs WHERE image_id = ?').get(id) || null,
    readings: db.prepare('SELECT * FROM readings WHERE image_id = ?').all(id),
  };
  const stamp = `${id}_`;
  const trashPath = img.stored_path ? path.join(paths.trash, stamp + safe(path.basename(img.stored_path))) : null;
  const thumbTrash = img.thumb_path ? path.join(paths.trash, 'thumb_' + stamp + safe(path.basename(img.thumb_path))) : null;
  const movedFull = moveFile(fullPathFor(img), trashPath);
  const movedThumb = moveFile(thumbPathFor(img), thumbTrash);
  const out = db.transaction(() => {
    db.prepare('DELETE FROM deleted_images WHERE filename = ?').run(img.filename);
    const r = db.prepare(`INSERT INTO deleted_images (filename, kind, title, record, trash_path, thumb_trash_path, reason, build)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(img.filename, img.kind, img.title, JSON.stringify(record), movedFull ? path.basename(movedFull) : null, movedThumb ? path.basename(movedThumb) : null, String(reason || '').slice(0, 500), build);
    db.prepare('DELETE FROM images WHERE id = ?').run(id);
    return { deleted_id: r.lastInsertRowid, id, filename: img.filename, title: img.title, tags: record.tags.length, file_kept: !!movedFull };
  })();
  return out;
}

export function isDeletedFilename(db, filename) {
  return !!db.prepare('SELECT 1 FROM deleted_images WHERE filename = ?').get(filename);
}

export function listDeleted(db) {
  return db.prepare('SELECT id, filename, kind, title, reason, build, deleted_at, trash_path, record FROM deleted_images ORDER BY id DESC').all().map((r) => {
    const rec = JSON.parse(r.record);
    return { id: r.id, filename: r.filename, kind: r.kind, title: r.title, reason: r.reason, build: r.build, deleted_at: r.deleted_at,
      has_file: !!r.trash_path && fs.existsSync(path.join(paths.trash, r.trash_path)), tags: rec.tags.map((t) => t.name), inputs: rec.inputs ? { day: rec.inputs.day, month: rec.inputs.month, year: rec.inputs.year, name: rec.inputs.name } : null,
      taken_at: rec.image.taken_at, readings: rec.readings.length };
  });
}

export function trashFilePath(db, deletedId) {
  const r = db.prepare('SELECT trash_path, thumb_trash_path FROM deleted_images WHERE id = ?').get(deletedId);
  if (!r) return null;
  const p = r.thumb_trash_path ? path.join(paths.trash, r.thumb_trash_path) : r.trash_path ? path.join(paths.trash, r.trash_path) : null;
  return p && fs.existsSync(p) ? p : null;
}

// Put a deleted chart back: same filename, same tags, paths, name, typed inputs and readings; the picture
// returns from the trash. The chart gets a new id (filename is the identity, ids never were).
export function restoreImage(db, deletedId) {
  const row = db.prepare('SELECT * FROM deleted_images WHERE id = ?').get(deletedId);
  if (!row) throw new TrashError('No such deleted chart.', 404);
  if (db.prepare('SELECT 1 FROM images WHERE filename = ?').get(row.filename)) throw new TrashError('A chart with this file name is already in the vault.', 409);
  const rec = JSON.parse(row.record);
  const img = rec.image;
  const id = db.transaction(() => {
    const cols = ['filename', 'stored_path', 'thumb_path', 'sha256', 'size', 'width', 'height', 'taken_at', 'uploaded_at', 'created_at', 'uploaded_build', 'kind', 'title', 'title_source', 'title_check'];
    db.prepare(`INSERT INTO images (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...cols.map((c) => img[c] ?? null));
    const newId = db.prepare('SELECT id FROM images WHERE filename = ?').get(row.filename).id;
    for (const p of rec.paths) db.prepare('INSERT OR IGNORE INTO image_paths (image_id, path) VALUES (?, ?)').run(newId, p);
    const tagId = (name) => { db.prepare('INSERT OR IGNORE INTO tags (name, kind) VALUES (?, ?)').run(name, tagKind(name)); return db.prepare('SELECT id FROM tags WHERE name = ?').get(name).id; };
    for (const t of rec.tags) db.prepare('INSERT OR IGNORE INTO image_tags (image_id, tag_id, source, created_at) VALUES (?, ?, ?, ?)').run(newId, tagId(t.name), t.source, t.created_at);
    for (const t of rec.removed_tags) db.prepare('INSERT OR IGNORE INTO removed_tags (image_id, tag_id, removed_at) VALUES (?, ?, ?)').run(newId, tagId(t.name), t.removed_at);
    if (rec.inputs) {
      try { setInputs(db, newId, rec.inputs, { source: rec.inputs.source || 'owner', build: rec.inputs.build || COMMIT }); } catch {}
    }
    for (const r of rec.readings) {
      const { id: _old, image_id: _img, ...rest } = r;
      const keys = Object.keys(rest);
      db.prepare(`INSERT INTO readings (image_id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`).run(newId, ...keys.map((k) => rest[k]));
    }
    db.prepare('DELETE FROM deleted_images WHERE id = ?').run(deletedId);
    return newId;
  })();
  if (row.trash_path && img.stored_path) moveFile(path.join(paths.trash, row.trash_path), fullPathFor(img));
  if (row.thumb_trash_path && img.thumb_path) moveFile(path.join(paths.trash, row.thumb_trash_path), thumbPathFor(img));
  return { id, filename: row.filename, title: row.title };
}

// --- possible duplicates ---
const groupKey = (ids) => [...ids].sort((a, b) => a - b).join(',');

export function keepDuplicates(db, ids) {
  const list = (Array.isArray(ids) ? ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (list.length < 2) throw new TrashError('Pick at least two charts.');
  db.prepare('INSERT OR IGNORE INTO duplicates_kept (ids) VALUES (?)').run(groupKey(list));
  return { kept: groupKey(list) };
}

export function findDuplicates(db) {
  const kept = new Set(db.prepare('SELECT ids FROM duplicates_kept').all().map((r) => r.ids));
  const rows = db.prepare(`SELECT i.id, i.filename, i.title, i.taken_at, i.sha256, i.size, (i.stored_path IS NOT NULL) AS has_file,
      ci.day, ci.month, ci.year, ci.name AS input_name,
      (SELECT count(*) FROM image_tags it WHERE it.image_id = i.id) AS tag_count,
      (SELECT count(*) FROM readings r WHERE r.image_id = i.id) AS readings
    FROM images i LEFT JOIN chart_inputs ci ON ci.image_id = i.id WHERE i.kind = 'chart' ORDER BY i.id`).all();
  const chart = (r) => ({ id: r.id, filename: r.filename, title: r.title, taken_at: r.taken_at, has_file: !!r.has_file, size: r.size, tag_count: r.tag_count, readings: r.readings,
    inputs: r.input_name || r.day || r.year ? { day: r.day, month: r.month, year: r.year, name: r.input_name } : null });
  const groups = [];
  const seenPicture = new Set();
  const byHash = new Map();
  for (const r of rows) if (r.sha256 && r.has_file) { if (!byHash.has(r.sha256)) byHash.set(r.sha256, []); byHash.get(r.sha256).push(r); }
  for (const list of byHash.values()) if (list.length > 1) {
    const ids = list.map((r) => r.id); const key = groupKey(ids);
    for (const id of ids) seenPicture.add(id);
    if (!kept.has(key)) groups.push({ why: 'same picture', key, charts: list.map(chart) });
  }
  const byInputs = new Map();
  for (const r of rows) {
    if (!r.input_name || !r.day || !r.month || !r.year) continue;
    const k = `${r.input_name.toLowerCase().replace(/\s+/g, ' ').trim()}|${r.day}.${r.month}.${r.year}`;
    if (!byInputs.has(k)) byInputs.set(k, []); byInputs.get(k).push(r);
  }
  for (const list of byInputs.values()) if (list.length > 1) {
    // A group already listed as the same picture is not listed twice.
    const ids = list.map((r) => r.id); const key = groupKey(ids);
    if (groups.some((g) => g.key === key)) continue;
    if (!kept.has(key)) groups.push({ why: 'same name and birth date', key, charts: list.map(chart) });
  }
  groups.sort((a, b) => (a.why === b.why ? 0 : a.why === 'same picture' ? -1 : 1) || b.charts[b.charts.length - 1].id - a.charts[a.charts.length - 1].id);
  return { groups, kept: kept.size };
}
