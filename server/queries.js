// Read-only queries used by the browse screens.
import { TagCodes, displayName } from './tagnames.js';
import { conditionsSql } from './positions.js';
import { nameSql } from './titles.js';
export { TagCodes };
// Every tag row that leaves the server carries how it reads on screen ("alexjones" -> "Alex Jones").
const withDisplay = (t) => ({ ...t, display: displayName(t.name) });

// Newest first by the date in the filename; charts without a date go last.
const ORDER = '(i.taken_at IS NULL), i.taken_at DESC, i.id DESC';

// drawn: true = only charts whose name and date are known (the app draws them itself), false = only the
// ones still shown as the screenshot (no name and date yet), null = both.
const drawnSql = (drawn) => (drawn === true ? ' AND i.id IN (SELECT image_id FROM chart_inputs)' : drawn === false ? ' AND i.id NOT IN (SELECT image_id FROM chart_inputs)' : '');
function filterSql(tags, params, positions = [], name = '', drawn = null) {
  // Images that carry ALL of the given tags (AND), every asked-for number in its position and the word in the name.
  let sql = conditionsSql(positions, params) + nameSql(name, params) + drawnSql(drawn);
  if (!tags.length) return sql;
  const marks = tags.map(() => '?').join(',');
  params.push(...tags, tags.length);
  return sql + ` AND i.id IN (
    SELECT it.image_id FROM image_tags it JOIN tags t ON t.id = it.tag_id
    WHERE t.name IN (${marks}) GROUP BY it.image_id HAVING count(DISTINCT t.id) = ?)`;
}

// The name and birth date a chart was made from, when known: the phone draws the chart itself from them
// (the same drawing as the Quick Chart), so every chart looks the same. null = not read yet, the screenshot shows.
const inputsOf = (r) => (r.input_name !== null && r.input_name !== undefined ? { day: r.day, month: r.month, year: r.year, name: r.input_name } : null);
const INPUT_COLS = 'ci.day, ci.month, ci.year, ci.name AS input_name';
const INPUT_JOIN = 'LEFT JOIN chart_inputs ci ON ci.image_id = i.id';

export function listImages(db, { tags = [], positions = [], name = '', onlyUploaded = false, kind = 'chart', limit = 60, offset = 0, ids = null, drawn = null } = {}) {
  const params = [kind];
  let idSql = '';
  if (ids) { const list = ids.filter((n) => Number.isInteger(n)).slice(0, 50); idSql = list.length ? `AND i.id IN (${list.map(() => '?').join(',')})` : 'AND 0'; params.push(...list); }
  const where = `WHERE i.kind = ? ${filterSql(tags, params, positions, name, drawn)} ${idSql} ${onlyUploaded ? 'AND i.stored_path IS NOT NULL' : ''}`;
  const total = db.prepare(`SELECT count(*) c FROM images i ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT i.id, i.filename, i.title, i.taken_at, i.width, i.height, i.kind, (i.stored_path IS NOT NULL) AS has_file, ${INPUT_COLS}
    FROM images i ${INPUT_JOIN} ${where} ORDER BY ${ORDER} LIMIT ? OFFSET ?`).all(...params, limit, offset);
  for (const r of rows) { r.inputs = inputsOf(r); delete r.day; delete r.month; delete r.year; delete r.input_name; }
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    const tagRows = db.prepare(`SELECT it.image_id, t.name, t.kind FROM image_tags it JOIN tags t ON t.id = it.tag_id
      WHERE it.image_id IN (${ids.map(() => '?').join(',')}) ORDER BY t.kind, t.name`).all(...ids);
    const byImage = new Map(ids.map((id) => [id, []]));
    for (const r of tagRows) byImage.get(r.image_id).push(withDisplay({ name: r.name, kind: r.kind }));
    for (const r of rows) { r.tags = byImage.get(r.id); r.has_file = !!r.has_file; }
  }
  return { total, items: rows, limit, offset };
}

// Where one picture sits in the current browse list (same filter, same order),
// so the viewer can swipe to the previous / next one.
export function imageContext(db, id, { tags = [], positions = [], name = '', kind = 'chart', drawn = null } = {}) {
  const params = [kind];
  const ids = db.prepare(`SELECT i.id FROM images i WHERE i.kind = ? ${filterSql(tags, params, positions, name, drawn)} ORDER BY ${ORDER}`).all(...params).map((r) => r.id);
  const at = ids.indexOf(id);
  if (at < 0) return { index: null, total: ids.length, prev: null, next: null };
  return { index: at + 1, total: ids.length, prev: at > 0 ? ids[at - 1] : null, next: at < ids.length - 1 ? ids[at + 1] : null };
}

export function getImage(db, id) {
  const img = db.prepare('SELECT * FROM images WHERE id = ?').get(id);
  if (!img) return null;
  const tags = db.prepare(`SELECT t.name, t.kind, it.source FROM image_tags it JOIN tags t ON t.id = it.tag_id
    WHERE it.image_id = ? ORDER BY t.kind, t.name`).all(id).map(withDisplay);
  const paths = db.prepare('SELECT path FROM image_paths WHERE image_id = ? ORDER BY path').all(id).map((r) => r.path);
  const inputs = inputsOf(db.prepare('SELECT day, month, year, name AS input_name FROM chart_inputs WHERE image_id = ?').get(id) || {});
  return {
    id: img.id, filename: img.filename, kind: img.kind, taken_at: img.taken_at, uploaded_at: img.uploaded_at,
    has_file: !!img.stored_path, size: img.size, width: img.width, height: img.height, sha256: img.sha256,
    title: img.title, title_source: img.title_source, title_check: !!img.title_check,
    inputs, tags, paths,
  };
}

// Tag suggestions. With `within` tags set, counts are narrowed to images that
// already match those tags, so you only see tags you can still combine with.
export function suggestTags(db, { q = '', within = [], kind = 'chart', limit = 30 } = {}) {
  const params = [kind];
  let scope = 'AND it.image_id IN (SELECT id FROM images WHERE kind = ?)';
  if (within.length) {
    const marks = within.map(() => '?').join(',');
    params.push(...within, within.length);
    scope += ` AND it.image_id IN (SELECT it2.image_id FROM image_tags it2 JOIN tags t2 ON t2.id = it2.tag_id
      WHERE t2.name IN (${marks}) GROUP BY it2.image_id HAVING count(DISTINCT t2.id) = ?)`;
  }
  let match = '';
  const needle = q.trim();
  if (needle) {
    // "19/1 first" also finds the stored "19fn" (public/tag-codes.js); "alex jones" finds the stored "alexjones".
    const forms = [`%${escapeLike(needle)}%`, ...TagCodes.expandQuery(needle).map((f) => escapeLike(f))];
    if (/\s/.test(needle)) forms.push(`%${escapeLike(needle.replace(/\s+/g, ''))}%`);
    params.push(...forms);
    match = `AND (${forms.map(() => "t.name LIKE ? ESCAPE '\\' COLLATE NOCASE").join(' OR ')})`;
  }
  const excl = within.length ? `AND t.name NOT IN (${within.map(() => '?').join(',')})` : '';
  if (within.length) params.push(...within);
  const rows = db.prepare(`SELECT t.name, t.kind, count(it.image_id) AS count
    FROM tags t JOIN image_tags it ON it.tag_id = t.id ${scope}
    WHERE 1=1 ${match} ${excl}
    GROUP BY t.id HAVING count > 0
    ORDER BY count DESC, t.name COLLATE NOCASE LIMIT ?`).all(...params, limit * 3);
  // Prefer tags that start with what was typed (spaces aside).
  const lower = needle.toLowerCase(), tight = lower.replace(/\s+/g, '');
  const starts = (t) => t.name.toLowerCase().startsWith(lower) || t.name.toLowerCase().startsWith(tight) || displayName(t.name).toLowerCase().startsWith(lower);
  rows.sort((a, b) => {
    const as = starts(a) ? 0 : 1;
    const bs = starts(b) ? 0 : 1;
    if (as !== bs) return as - bs;
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
  return rows.slice(0, limit).map(withDisplay);
}

// Every tag with how many charts and how many archetype pics carry it (the All tags screen).
export function allTags(db) {
  return db.prepare(`SELECT t.name, t.kind, count(it.image_id) AS count,
      count(CASE WHEN i.kind = 'chart' THEN 1 END) AS charts, count(CASE WHEN i.kind = 'archetype' THEN 1 END) AS archetypes
    FROM tags t LEFT JOIN image_tags it ON it.tag_id = t.id LEFT JOIN images i ON i.id = it.image_id
    GROUP BY t.id ORDER BY t.name COLLATE NOCASE`).all().map(withDisplay);
}

// How every tag reads on screen, only where that differs from the stored name: { stored: shown }.
export function tagNames(db) {
  const out = {};
  for (const { name } of db.prepare('SELECT name FROM tags').all()) { const d = displayName(name); if (d !== name) out[name] = d; }
  return out;
}

export function statusReport(db) {
  const g = (sql) => db.prepare(sql).get();
  const missing = db.prepare(`SELECT filename, taken_at FROM images WHERE stored_path IS NULL AND kind = 'chart'
    ORDER BY (taken_at IS NULL), taken_at DESC, id DESC`).all();
  return {
    images: g("SELECT count(*) c FROM images WHERE kind = 'chart'").c,
    uploaded: g("SELECT count(*) c FROM images WHERE stored_path IS NOT NULL AND kind = 'chart'").c,
    archetypes: g("SELECT count(*) c FROM images WHERE kind = 'archetype'").c,
    archetypes_uploaded: g("SELECT count(*) c FROM images WHERE kind = 'archetype' AND stored_path IS NOT NULL").c,
    missing_count: missing.length,
    missing,
    tags: g('SELECT count(*) c FROM tags').c,
    links: g('SELECT count(*) c FROM image_tags').c,
    removed_in_app: g('SELECT count(*) c FROM removed_tags').c,
    added_in_app: g("SELECT count(*) c FROM image_tags WHERE source = 'app'").c,
    bytes: g('SELECT COALESCE(sum(size),0) s FROM images').s,
    last_import: db.prepare('SELECT * FROM imports ORDER BY id DESC LIMIT 1').get() || null,
    last_backup: (db.prepare("SELECT value FROM settings WHERE key = 'last_backup'").get() || {}).value || null,
    last_backup_result: (db.prepare("SELECT value FROM settings WHERE key = 'last_backup_result'").get() || {}).value || null,
  };
}

// Portable export of everything the tag file knew plus app changes. Goes
// into every backup so the tags can be read without this app.
export function exportTags(db) {
  const images = db.prepare('SELECT id, filename, kind, stored_path, sha256, taken_at, uploaded_at FROM images ORDER BY filename').all();
  const tags = db.prepare('SELECT it.image_id, t.name, it.source FROM image_tags it JOIN tags t ON t.id = it.tag_id ORDER BY t.name').all();
  const removed = db.prepare('SELECT r.image_id, t.name FROM removed_tags r JOIN tags t ON t.id = r.tag_id').all();
  const byImage = new Map(images.map((i) => [i.id, { ...i, tags: [], removed_tags: [] }]));
  for (const t of tags) byImage.get(t.image_id).tags.push(t.name);
  for (const r of removed) byImage.get(r.image_id).removed_tags.push(r.name);
  return {
    exported_at: new Date().toISOString(),
    app: 'chart-vault',
    images: [...byImage.values()].map(({ id, ...rest }) => rest),
  };
}

function escapeLike(s) { return s.replace(/[\\%_]/g, (c) => '\\' + c); }

// Which buttons and screens get used: a NAME and a count, nothing else (never
// what was typed, never a chart, a tag or a filename). The Status screen shows
// them as "What you use most". A bad name is dropped; a count may never fail.
export const USAGE_NAME = /^[a-z0-9][a-z0-9_.-]{0,59}$/;
export function bumpUsage(db, name) {
  if (typeof name !== 'string' || !USAGE_NAME.test(name)) return false;
  db.prepare(`INSERT INTO usage (name, count, last_at) VALUES (?, 1, ?)
    ON CONFLICT(name) DO UPDATE SET count = count + 1, last_at = excluded.last_at`).run(name, new Date().toISOString());
  return true;
}
export function usageReport(db, limit = 100) {
  return db.prepare('SELECT name, count, last_at FROM usage ORDER BY count DESC, name LIMIT ?').all(limit);
}
