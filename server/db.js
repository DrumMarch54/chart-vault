import Database from 'better-sqlite3';

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,          -- the identity of a chart (basename from the tag file)
  stored_path TEXT,                       -- relative path inside the images dir, NULL until uploaded
  thumb_path TEXT,                        -- relative path inside the thumbs dir, NULL until made
  sha256 TEXT,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  taken_at TEXT,                          -- date parsed from Screenshot_YYYYMMDD_HHMMSS names, for "newest first"
  uploaded_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS image_paths (
  image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  path TEXT NOT NULL,                     -- every phone path the tag file mentioned for this image
  PRIMARY KEY (image_id, path)
);
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,              -- exactly as written, case-sensitive
  kind TEXT NOT NULL,                     -- position | number | name
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS image_tags (
  image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  source TEXT NOT NULL,                   -- import | app
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (image_id, tag_id)
);
-- Tags the user removed in the app. A later tag-file import must not bring them back.
CREATE TABLE IF NOT EXISTS removed_tags (
  image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  removed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (image_id, tag_id)
);
CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY,
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  filename TEXT,
  rows INTEGER, images_in_file INTEGER, tags_in_file INTEGER,
  new_images INTEGER, new_tags INTEGER, new_links INTEGER, skipped_removed INTEGER
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE INDEX IF NOT EXISTS idx_image_tags_tag ON image_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_images_uploaded ON images(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_images_taken ON images(taken_at);
`;

export function openDb(file) {
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.exec(SCHEMA);
  return db;
}
