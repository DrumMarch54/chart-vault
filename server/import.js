import { basename, dateFromFilename, tagKind } from './tags.js';
import { COMMIT } from './build.js';

export class ImportError extends Error {}

// Parse a Samsung Smart Switch UserTag.backup.
// Accepts the JSON object form {"usertag":[{"_data":..., "tag":...}, ...]}
// and, as a fallback, one JSON object per line.
// Returns { rows, images: Map<filename, { paths:Set, tags:Set }> }.
// Throws ImportError on anything that does not look right, so a bad file is
// never half-imported.
export function parseUserTagBackup(input) {
  let text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  text = text.trim();
  if (!text) throw new ImportError('The file is empty.');

  let rows;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) rows = parsed;
    else if (parsed && Array.isArray(parsed.usertag)) rows = parsed.usertag;
    else throw new ImportError('The file is JSON but has no "usertag" list in it.');
  } catch (err) {
    if (err instanceof ImportError) throw err;
    // Fallback: one object per line.
    rows = [];
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    for (let i = 0; i < lines.length; i++) {
      try {
        rows.push(JSON.parse(lines[i].replace(/,\s*$/, '')));
      } catch {
        throw new ImportError(`Line ${i + 1} is not valid JSON. This does not look like a UserTag.backup file.`);
      }
    }
  }

  const images = new Map();
  const problems = [];
  rows.forEach((row, i) => {
    if (!row || typeof row !== 'object' || typeof row._data !== 'string' || typeof row.tag !== 'string') {
      problems.push(`entry ${i + 1} is missing "_data" or "tag"`);
      return;
    }
    const tag = row.tag; // kept exactly as written
    const file = basename(row._data);
    if (!file) { problems.push(`entry ${i + 1} has an empty file path`); return; }
    if (!tag.trim()) { problems.push(`entry ${i + 1} (${file}) has an empty tag`); return; }
    let img = images.get(file);
    if (!img) { img = { paths: new Set(), tags: new Set() }; images.set(file, img); }
    img.paths.add(row._data);
    img.tags.add(tag);
  });
  if (problems.length) {
    throw new ImportError(`Refusing to import: ${problems.length} bad entr${problems.length === 1 ? 'y' : 'ies'}. First: ${problems.slice(0, 3).join('; ')}`);
  }
  if (images.size === 0) throw new ImportError('The file has no image/tag entries.');
  return { rows, images };
}

// Merge a parsed backup into the database. Safe to run again and again:
// adds what is new, never deletes, never duplicates, never resurrects a tag
// the user removed in the app.
export function importTags(db, parsed, { filename = null } = {}) {
  const insImage = db.prepare('INSERT OR IGNORE INTO images (filename, taken_at) VALUES (?, ?)');
  const getImage = db.prepare('SELECT id FROM images WHERE filename = ?');
  const insPath = db.prepare('INSERT OR IGNORE INTO image_paths (image_id, path) VALUES (?, ?)');
  const insTag = db.prepare('INSERT OR IGNORE INTO tags (name, kind) VALUES (?, ?)');
  const getTag = db.prepare('SELECT id FROM tags WHERE name = ?');
  const isRemoved = db.prepare('SELECT 1 FROM removed_tags WHERE image_id = ? AND tag_id = ?');
  const insLink = db.prepare("INSERT OR IGNORE INTO image_tags (image_id, tag_id, source) VALUES (?, ?, 'import')");
  const insImport = db.prepare(`INSERT INTO imports (filename, rows, images_in_file, tags_in_file, new_images, new_tags, new_links, skipped_removed, build)
    VALUES (@filename, @rows, @images_in_file, @tags_in_file, @new_images, @new_tags, @new_links, @skipped_removed, @build)`);

  const run = db.transaction(() => {
    const summary = {
      filename,
      rows: parsed.rows.length,
      images_in_file: parsed.images.size,
      tags_in_file: 0,
      new_images: 0,
      new_tags: 0,
      new_links: 0,
      skipped_removed: 0,
    };
    const allTags = new Set();
    const tagIds = new Map();
    for (const [file, { paths, tags }] of parsed.images) {
      summary.new_images += insImage.run(file, dateFromFilename(file)).changes;
      const imageId = getImage.get(file).id;
      for (const p of paths) insPath.run(imageId, p);
      for (const tag of tags) {
        allTags.add(tag);
        let tagId = tagIds.get(tag);
        if (tagId === undefined) {
          summary.new_tags += insTag.run(tag, tagKind(tag)).changes;
          tagId = getTag.get(tag).id;
          tagIds.set(tag, tagId);
        }
        if (isRemoved.get(imageId, tagId)) { summary.skipped_removed++; continue; }
        summary.new_links += insLink.run(imageId, tagId).changes;
      }
    }
    summary.tags_in_file = allTags.size;
    insImport.run({ ...summary, build: COMMIT });
    return summary;
  });
  return run();
}

// Add a tag to an image from the app. Clears any "removed" mark so the tag
// shows again and future imports may keep it.
export function addTagToImage(db, imageId, name) {
  if (typeof name !== 'string' || !name.trim()) throw new ImportError('Tag is empty.');
  return db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO tags (name, kind) VALUES (?, ?)').run(name, tagKind(name));
    const tagId = db.prepare('SELECT id FROM tags WHERE name = ?').get(name).id;
    db.prepare('DELETE FROM removed_tags WHERE image_id = ? AND tag_id = ?').run(imageId, tagId);
    const added = db.prepare("INSERT OR IGNORE INTO image_tags (image_id, tag_id, source) VALUES (?, ?, 'app')").run(imageId, tagId).changes;
    return { tagId, added: added === 1 };
  })();
}

// Remove a tag from an image in the app and remember that, so a later import
// of the tag file does not bring it back. The tag itself is never deleted.
export function removeTagFromImage(db, imageId, name) {
  return db.transaction(() => {
    const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(name);
    if (!tag) return { removed: false };
    const removed = db.prepare('DELETE FROM image_tags WHERE image_id = ? AND tag_id = ?').run(imageId, tag.id).changes;
    db.prepare('INSERT OR IGNORE INTO removed_tags (image_id, tag_id) VALUES (?, ?)').run(imageId, tag.id);
    return { removed: removed === 1 };
  })();
}

// A picture that sits in a Gallery album folder (e.g. "12 Mind Center" or
// "15 pics"). Makes sure the image exists (it may not be in the tag file at
// all), remembers the phone path, and adds the given tags. `kind` is 'chart'
// or 'archetype' (a picture that represents a number, not a chart). Safe to
// repeat. Never changes the kind of a picture that already exists.
export const IMAGE_KINDS = ['chart', 'archetype'];
export function markAlbumMember(db, { filename, album, tags, kind = 'chart' }) {
  if (typeof filename !== 'string' || !filename.trim()) throw new ImportError('Missing file name.');
  if (typeof album !== 'string' || !album.trim()) throw new ImportError('Missing album name.');
  if (!IMAGE_KINDS.includes(kind)) throw new ImportError('Unknown picture type.');
  const names = Array.isArray(tags) ? tags : [album];
  if (!names.length || names.some((t) => typeof t !== 'string' || !t.trim() || t.length > 120)) throw new ImportError('Bad tag list.');
  if (album.length > 120 || filename.length > 255) throw new ImportError('Name is too long.');
  return db.transaction(() => {
    const created = db.prepare('INSERT OR IGNORE INTO images (filename, taken_at, kind) VALUES (?, ?, ?)').run(filename, dateFromFilename(filename), kind).changes === 1;
    const img = db.prepare('SELECT id, stored_path, kind FROM images WHERE filename = ?').get(filename);
    db.prepare('INSERT OR IGNORE INTO image_paths (image_id, path) VALUES (?, ?)').run(img.id, `/DCIM/${album}/${filename}`);
    let tagged = 0;
    for (const name of names) {
      db.prepare('INSERT OR IGNORE INTO tags (name, kind) VALUES (?, ?)').run(name, tagKind(name));
      const tagId = db.prepare('SELECT id FROM tags WHERE name = ?').get(name).id;
      if (db.prepare('SELECT 1 FROM removed_tags WHERE image_id = ? AND tag_id = ?').get(img.id, tagId)) continue;
      tagged += db.prepare("INSERT OR IGNORE INTO image_tags (image_id, tag_id, source) VALUES (?, ?, 'album')").run(img.id, tagId).changes;
    }
    return { id: img.id, has_file: !!img.stored_path, created, tagged: tagged > 0, kind: img.kind };
  })();
}
