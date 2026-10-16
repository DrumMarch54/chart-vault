// Who a chart is: the name shown under its thumbnail and at the top of the viewer.
// Kept on the image row (title, title_source, title_check), never as a tag: tags stay exactly as the
// owner wrote them and are for searching; the name is for reading at a glance. "First Last", a stage
// name when that is how the person is known, "Name · Group" when the group is what they are known for.
//
// Seed: server/chart-titles.json, one entry per filename, decided once from the owner's tags, the
// name typed into the paid tool, and what a chat knew. Merge-only at startup: a chart that already
// has a name (an owner edit above all) is never touched. check = the owner should confirm it.
import fs from 'node:fs';

export const MAX_TITLE = 80;

export function loadTitleSeed() {
  try { return JSON.parse(fs.readFileSync(new URL('./chart-titles.json', import.meta.url), 'utf8')); } catch { return []; }
}

export function seedTitles(db, seed) {
  const find = db.prepare('SELECT id, title FROM images WHERE filename = ?');
  const put = db.prepare('UPDATE images SET title = ?, title_source = ?, title_check = ? WHERE id = ?');
  let added = 0, skipped = 0, unknown = 0;
  db.transaction(() => {
    for (const s of seed) {
      const row = find.get(s.filename);
      if (!row) { unknown++; continue; }
      if (row.title !== null) { skipped++; continue; }
      put.run(clean(s.title), s.source || 'known', s.check ? 1 : 0, row.id);
      added++;
    }
  })();
  return { added, skipped, unknown };
}

export function clean(title) {
  return String(title || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE);
}

// The owner typed (or fixed) the name: it is theirs now and needs no checking. An empty name is allowed
// (the thumbnail falls back to the first tag) and is still "decided by the owner".
export function setTitle(db, imageId, title) {
  const t = clean(title);
  db.prepare("UPDATE images SET title = ?, title_source = 'owner', title_check = 0 WHERE id = ?").run(t, imageId);
  return t;
}

export function acceptTitle(db, imageId) {
  db.prepare('UPDATE images SET title_check = 0 WHERE id = ?').run(imageId);
}

// Charts whose name still needs the owner's eye: flagged by the seed (a guess, a first name with no
// last name), or empty. Owner-decided names are never listed; "Looks right" clears the flag.
export function titlesToCheck(db, limit = 500) {
  const rows = db.prepare(`SELECT i.id, i.filename, i.title, i.title_source, i.title_check, (i.stored_path IS NOT NULL) AS has_file, c.name AS typed
    FROM images i LEFT JOIN chart_inputs c ON c.image_id = i.id
    WHERE i.kind = 'chart' AND COALESCE(i.title_source, '') != 'owner'
      AND (i.title_check = 1 OR i.title IS NULL OR i.title = '')
    ORDER BY (i.title IS NULL OR i.title = '') DESC, i.title_check DESC, (i.taken_at IS NULL), i.taken_at DESC, i.id DESC LIMIT ?`).all(limit);
  const tagsFor = db.prepare(`SELECT t.name FROM image_tags it JOIN tags t ON t.id = it.tag_id WHERE it.image_id = ? AND t.kind = 'name' ORDER BY t.name`);
  for (const r of rows) { r.has_file = !!r.has_file; r.tags = tagsFor.all(r.id).map((t) => t.name); }
  return rows;
}

export function titleStats(db) {
  const g = (sql) => db.prepare(sql).get().c;
  return {
    named: g("SELECT count(*) c FROM images WHERE kind = 'chart' AND title IS NOT NULL AND title != ''"),
    unnamed: g("SELECT count(*) c FROM images WHERE kind = 'chart' AND (title IS NULL OR title = '')"),
    by_owner: g("SELECT count(*) c FROM images WHERE kind = 'chart' AND title_source = 'owner'"),
    to_check: titlesToCheck(db).length,
  };
}

// SQL that narrows images to those whose name has a word STARTING with `word`, any case:
// "john" finds "John Smith", "Elton John" and "Johnny Depp"; "smith" finds "John Smith".
export function nameSql(word, params) {
  const w = clean(word).toLowerCase();
  if (!w) return '';
  params.push(`% ${escapeLike(w)}%`);
  return ` AND (' ' || lower(i.title)) LIKE ? ESCAPE '\\'`;
}

// Name suggestions for the search box: every distinct name with a word starting with what was typed,
// most charts first; plus how many charts match the word itself.
export function suggestNames(db, q, { kind = 'chart', limit = 12 } = {}) {
  const w = clean(q).toLowerCase();
  if (!w) return { word: '', count: 0, names: [] };
  const params = [kind];
  const where = `WHERE i.kind = ? AND i.title IS NOT NULL AND i.title != '' ${nameSql(w, params)}`;
  const count = db.prepare(`SELECT count(*) c FROM images i ${where}`).get(...params).c;
  const names = db.prepare(`SELECT i.title AS name, count(*) AS count FROM images i ${where} GROUP BY i.title ORDER BY count DESC, i.title COLLATE NOCASE LIMIT ?`).all(...params, limit);
  return { word: w, count, names };
}

function escapeLike(s) { return s.replace(/[\\%_]/g, (c) => '\\' + c); }
