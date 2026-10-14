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

// Numbered schema changes, run once each at startup, in order. The number of
// the last one applied is kept in PRAGMA user_version. Never edit or reorder a
// shipped entry; add a new one at the end.
export const MIGRATIONS = [
  // 1: the original schema (CREATE IF NOT EXISTS, so databases made before
  //    migrations existed pass through unchanged)
  (db) => db.exec(SCHEMA),
  // 2: remember which build wrote an import and an upload
  (db) => {
    db.exec('ALTER TABLE imports ADD COLUMN build TEXT');
    db.exec('ALTER TABLE images ADD COLUMN uploaded_build TEXT');
  },
  // 3: a picture is a chart (default) or an archetype pic (a picture that
  //    visually represents a number, from the owner's "15 pics" albums)
  (db) => {
    db.exec("ALTER TABLE images ADD COLUMN kind TEXT NOT NULL DEFAULT 'chart'");
    db.exec('CREATE INDEX IF NOT EXISTS idx_images_kind ON images(kind)');
  },
];

export function migrate(db) {
  const have = db.pragma('user_version', { simple: true });
  for (let n = have + 1; n <= MIGRATIONS.length; n++) {
    db.transaction(() => { MIGRATIONS[n - 1](db); db.pragma(`user_version = ${n}`); })();
  }
  return { from: have, to: MIGRATIONS.length };
}

export function openDb(file) {
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  migrate(db);
  return db;
}
