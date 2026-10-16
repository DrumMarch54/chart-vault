import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { paths } from './config.js';
import { COMMIT } from './build.js';
import { tagKind } from './tags.js';

export const THUMB_WIDTH = 480;
const MAX_UPLOAD = 60 * 1024 * 1024;

// Keep the original filename where we can, so the images folder stays readable
// by a human even without the app. Anything odd becomes "_".
export function safeName(filename) {
  let s = filename.replace(/[^A-Za-z0-9._ ,()\-]/g, '_').replace(/^\.+/, '_');
  if (!s) s = 'image';
  return s.slice(0, 180);
}

export class UploadError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// Pick a stored file name that no other image uses.
function chooseStoredPath(db, image) {
  const base = safeName(image.filename);
  const taken = db.prepare('SELECT 1 FROM images WHERE stored_path = ? AND id != ?');
  if (!taken.get(base, image.id) && !fs.existsSync(path.join(paths.images, base))) return base;
  return `${image.id}_${base}`;
}

export async function makeThumb(fullPath, thumbPath) {
  await fsp.mkdir(path.dirname(thumbPath), { recursive: true });
  const tmp = `${thumbPath}.tmp`;
  await sharp(fullPath, { failOn: 'none' })
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(tmp);
  await fsp.rename(tmp, thumbPath);
}

// Receive one uploaded file for an image that is already known from the tag
// file. Streams to a temp file, checks the hash and that it really is an
// image, makes the thumbnail, then moves it into place and records it.
// Nothing is recorded until the file is safely on disk.
export async function receiveUpload(db, req, { filename, sha256Header }) {
  const image = db.prepare('SELECT * FROM images WHERE filename = ?').get(filename);
  if (!image) throw new UploadError('This file is not in the tag file, so it was not saved.', 404);
  if (image.stored_path) return { already: true, id: image.id };

  await fsp.mkdir(path.join(paths.images, '.tmp'), { recursive: true });
  const tmp = path.join(paths.images, '.tmp', `${image.id}-${crypto.randomBytes(6).toString('hex')}.part`);
  const hash = crypto.createHash('sha256');
  let size = 0;
  try {
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(tmp);
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_UPLOAD) { req.destroy(); reject(new UploadError('File is too big.', 413)); return; }
        hash.update(chunk);
      });
      req.on('error', reject);
      req.on('aborted', () => reject(new UploadError('Upload was cut off.', 400)));
      out.on('error', reject);
      out.on('finish', resolve);
      req.pipe(out);
    });
    if (size === 0) throw new UploadError('The file was empty.');
    const digest = hash.digest('hex');
    if (sha256Header && sha256Header.toLowerCase() !== digest) {
      throw new UploadError('The file arrived damaged (checksum mismatch). It was not saved; it will be retried.');
    }
    let meta;
    try {
      meta = await sharp(tmp, { failOn: 'none' }).metadata();
    } catch {
      throw new UploadError('This is not an image file, so it was not saved.');
    }
    if (!meta.width || !meta.height) throw new UploadError('This is not an image file, so it was not saved.');

    const storedPath = chooseStoredPath(db, image);
    const finalPath = path.join(paths.images, storedPath);
    const thumbRel = storedPath.replace(/\.[^.]*$/, '') + '.webp';
    await makeThumb(tmp, path.join(paths.thumbs, thumbRel));
    await fsp.rename(tmp, finalPath);
    try {
      const r = db.prepare(`UPDATE images SET stored_path = ?, thumb_path = ?, sha256 = ?, size = ?, width = ?, height = ?,
        uploaded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), uploaded_build = ? WHERE id = ? AND stored_path IS NULL`).run(
        storedPath, thumbRel, digest, size, meta.width, meta.height, COMMIT, image.id);
      if (r.changes === 0) {
        // Someone uploaded the same file at the same moment; keep the first.
        await fsp.unlink(finalPath).catch(() => {});
        return { already: true, id: image.id };
      }
    } catch (err) {
      await fsp.unlink(finalPath).catch(() => {});
      throw err;
    }
    return { already: false, id: image.id, size, width: meta.width, height: meta.height };
  } finally {
    await fsp.unlink(tmp).catch(() => {});
  }
}

export function fullPathFor(image) {
  return image.stored_path ? path.join(paths.images, image.stored_path) : null;
}
export function thumbPathFor(image) {
  return image.thumb_path ? path.join(paths.thumbs, image.thumb_path) : null;
}

// Make any thumbnails that are missing (e.g. after restoring from a backup).
export async function ensureThumbs(db, log = () => {}) {
  const rows = db.prepare('SELECT * FROM images WHERE stored_path IS NOT NULL').all();
  let made = 0;
  for (const img of rows) {
    const full = fullPathFor(img);
    if (!fs.existsSync(full)) continue;
    let thumbRel = img.thumb_path || img.stored_path.replace(/\.[^.]*$/, '') + '.webp';
    const thumbAbs = path.join(paths.thumbs, thumbRel);
    if (fs.existsSync(thumbAbs) && img.thumb_path) continue;
    try {
      await makeThumb(full, thumbAbs);
      db.prepare('UPDATE images SET thumb_path = ? WHERE id = ?').run(thumbRel, img.id);
      made++;
    } catch (err) {
      log(`thumbnail failed for ${img.filename}: ${err.message}`);
    }
  }
  return made;
}

// Report files recorded in the database that are not on disk (should be none).
export function findLostFiles(db) {
  return db.prepare('SELECT id, filename, stored_path FROM images WHERE stored_path IS NOT NULL').all()
    .filter((img) => !fs.existsSync(fullPathFor(img)))
    .map((img) => img.filename);
}

// Remove half-uploaded scraps left behind by a crash or restart. They are
// never recorded in the database, so this loses nothing.
export function cleanTempFiles(log = () => {}) {
  const dir = path.join(paths.images, '.tmp');
  let n = 0;
  try { for (const f of fs.readdirSync(dir)) { fs.unlinkSync(path.join(dir, f)); n++; } } catch {}
  if (n) log(`removed ${n} unfinished upload file(s)`);
}

// A Quick chart saved to the vault: a new chart record named after the person and date, tagged with
// the typed name, filed under /Quick chart/. The picture itself then arrives through receiveUpload.
export function createQuickChart(db, { name, date }) {
  const person = String(name || '').trim().replace(/\s+/g, ' ');
  if (!person) throw new UploadError('Type a name first.');
  if (person.length > 120) throw new UploadError('The name is too long.');
  const when = /^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) ? String(date) : '';
  const now = new Date().toISOString();
  const stamp = now.slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
  const filename = `Quick_${person.replace(/[^\p{L}\p{N} ]/gu, '')}${when ? '_' + when : ''}_${stamp}.png`.replace(/ /g, '-');
  return db.transaction(() => {
    db.prepare("INSERT INTO images (filename, taken_at, kind) VALUES (?, ?, 'chart')").run(filename, now.slice(0, 19));
    const id = db.prepare('SELECT id FROM images WHERE filename = ?').get(filename).id;
    db.prepare('INSERT OR IGNORE INTO image_paths (image_id, path) VALUES (?, ?)').run(id, `/Quick chart/${filename}`);
    db.prepare('INSERT OR IGNORE INTO tags (name, kind) VALUES (?, ?)').run(person, tagKind(person));
    const tagId = db.prepare('SELECT id FROM tags WHERE name = ?').get(person).id;
    db.prepare("INSERT OR IGNORE INTO image_tags (image_id, tag_id, source) VALUES (?, ?, 'app')").run(id, tagId);
    return { id, filename };
  })();
}
