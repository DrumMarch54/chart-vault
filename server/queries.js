// Read-only queries used by the browse screens.

// Newest first by the date in the filename; charts without a date go last.
const ORDER = '(i.taken_at IS NULL), i.taken_at DESC, i.id DESC';

function filterSql(tags, params) {
  // Images that carry ALL of the given tags (AND).
  if (!tags.length) return '';
  const marks = tags.map(() => '?').join(',');
  params.push(...tags, tags.length);
  return `AND i.id IN (
    SELECT it.image_id FROM image_tags it JOIN tags t ON t.id = it.tag_id
    WHERE t.name IN (${marks}) GROUP BY it.image_id HAVING count(DISTINCT t.id) = ?)`;
}

export function listImages(db, { tags = [], onlyUploaded = false, limit = 60, offset = 0 } = {}) {
  const params = [];
  const where = `WHERE 1=1 ${filterSql(tags, params)} ${onlyUploaded ? 'AND i.stored_path IS NOT NULL' : ''}`;
  const total = db.prepare(`SELECT count(*) c FROM images i ${where}`).get(...params).c;
  const rows = db.prepare(`SELECT i.id, i.filename, i.taken_at, i.width, i.height, (i.stored_path IS NOT NULL) AS has_file
    FROM images i ${where} ORDER BY ${ORDER} LIMIT ? OFFSET ?`).all(...params, limit, offset);
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    const tagRows = db.prepare(`SELECT it.image_id, t.name, t.kind FROM image_tags it JOIN tags t ON t.id = it.tag_id
      WHERE it.image_id IN (${ids.map(() => '?').join(',')}) ORDER BY t.kind, t.name`).all(...ids);
    const byImage = new Map(ids.map((id) => [id, []]));
    for (const r of tagRows) byImage.get(r.image_id).push({ name: r.name, kind: r.kind });
    for (const r of rows) { r.tags = byImage.get(r.id); r.has_file = !!r.has_file; }
  }
  return { total, items: rows, limit, offset };
}

export function getImage(db, id) {
  const img = db.prepare('SELECT * FROM images WHERE id = ?').get(id);
  if (!img) return null;
  const tags = db.prepare(`SELECT t.name, t.kind, it.source FROM image_tags it JOIN tags t ON t.id = it.tag_id
    WHERE it.image_id = ? ORDER BY t.kind, t.name`).all(id);
  const paths = db.prepare('SELECT path FROM image_paths WHERE image_id = ? ORDER BY path').all(id).map((r) => r.path);
  return {
    id: img.id, filename: img.filename, taken_at: img.taken_at, uploaded_at: img.uploaded_at,
    has_file: !!img.stored_path, size: img.size, width: img.width, height: img.height, sha256: img.sha256,
    tags, paths,
  };
}

// Tag suggestions. With `within` tags set, counts are narrowed to images that
// already match those tags, so you only see tags you can still combine with.
export function suggestTags(db, { q = '', within = [], limit = 30 } = {}) {
  const params = [];
  let scope = '';
  if (within.length) {
    const marks = within.map(() => '?').join(',');
    params.push(...within, within.length);
    scope = `AND it.image_id IN (SELECT it2.image_id FROM image_tags it2 JOIN tags t2 ON t2.id = it2.tag_id
      WHERE t2.name IN (${marks}) GROUP BY it2.image_id HAVING count(DISTINCT t2.id) = ?)`;
  }
  let match = '';
  const needle = q.trim();
  if (needle) {
    params.push(`%${escapeLike(needle)}%`);
    match = `AND t.name LIKE ? ESCAPE '\\' COLLATE NOCASE`;
  }
  const excl = within.length ? `AND t.name NOT IN (${within.map(() => '?').join(',')})` : '';
  if (within.length) params.push(...within);
  const rows = db.prepare(`SELECT t.name, t.kind, count(it.image_id) AS count
    FROM tags t JOIN image_tags it ON it.tag_id = t.id ${scope}
    WHERE 1=1 ${match} ${excl}
    GROUP BY t.id HAVING count > 0
    ORDER BY count DESC, t.name COLLATE NOCASE LIMIT ?`).all(...params, limit * 3);
  // Prefer tags that start with what was typed.
  const lower = needle.toLowerCase();
  rows.sort((a, b) => {
    const as = a.name.toLowerCase().startsWith(lower) ? 0 : 1;
    const bs = b.name.toLowerCase().startsWith(lower) ? 0 : 1;
    if (as !== bs) return as - bs;
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
  return rows.slice(0, limit);
}

export function allTags(db) {
  return db.prepare(`SELECT t.name, t.kind, count(it.image_id) AS count FROM tags t
    LEFT JOIN image_tags it ON it.tag_id = t.id GROUP BY t.id ORDER BY t.name COLLATE NOCASE`).all();
}

export function statusReport(db) {
  const g = (sql) => db.prepare(sql).get();
  const missing = db.prepare(`SELECT filename, taken_at FROM images WHERE stored_path IS NULL
    ORDER BY (taken_at IS NULL), taken_at DESC, id DESC`).all();
  return {
    images: g('SELECT count(*) c FROM images').c,
    uploaded: g('SELECT count(*) c FROM images WHERE stored_path IS NOT NULL').c,
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
  const images = db.prepare('SELECT id, filename, stored_path, sha256, taken_at, uploaded_at FROM images ORDER BY filename').all();
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
