# Chart Vault

A private web app that keeps a safe copy of numerology chart screenshots and
the tags that go with them. Built for one person, used from a phone first.

## What it does (version 1)

- **Import tags** from a Samsung Smart Switch `UserTag.backup`. Re-importing is
  always safe: new things are added, nothing is deleted or duplicated, and tags
  you changed in the app are kept.
- **Upload screenshots** from the phone's file picker. Only files named in the
  tag file are sent; already-uploaded files are skipped. Stop and resume any time.
- **Browse** a thumbnail grid, newest first. Search with tag suggestions, filter
  by one tag or several (AND), see counts.
- **Chart view** with pinch-to-zoom, tags as chips, add and remove tags.
- **Status** page: how many charts still have no screenshot, and their names.
- **Backup**: a daily copy of the database and images into a backup folder, plus
  a one-tap download of everything as a zip.
- **Login** with one shared password (`WEB_TOKEN`). Nothing is public.

No outside services, no paid APIs. One SQLite file, images on disk.

## Running it

```
cp .env.example .env     # then set WEB_TOKEN and PORT
npm install
npm start
```

Settings (in `.env`):

| Name | Meaning | Default |
|------|---------|---------|
| `WEB_TOKEN` | the login password | (none, login disabled) |
| `PORT` | port to listen on | 3300 |
| `HOST` | address to bind | 127.0.0.1 |
| `DATA_DIR` | database, images, thumbnails | ./data |
| `BACKUP_DIR` | daily backup target | ./backups |

`GET /api/health` answers `{"ok":true}` when the server is up.

## Tests

```
npm test
```

Covers the tag-file parser and merge rules, re-import safety, app edits
surviving imports, login, uploads (hash check, non-images, unknown files),
browsing, suggestions, tag edits, backup and the zip download.
If the real `data/UserTag.backup` is present it is checked too; it is
git-ignored because it contains people's names.

## Layout

```
server/   index.js (start), app.js (routes), import.js (tag file merge),
          storage.js (uploads, thumbnails), queries.js (browse), backup.js, auth.js
public/   index.html, app.js, app.css, sw.js, manifest, icons  (no build step)
test/     node:test files
data/     created at run time (git-ignored)
```

## Data model

- `images` – one row per screenshot filename (the identity of a chart)
- `image_paths` – every phone path the tag file mentioned for it
- `tags` – exact tag text, never changed; kind is for display only
- `image_tags` – which tags each image has, with `source` import or app
- `removed_tags` – tags removed in the app, so an import does not restore them
- `imports` – history with the summary shown after each import
