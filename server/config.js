import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load a simple KEY=VALUE .env file without any extra dependency.
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv(path.join(ROOT, '.env'));

export const config = {
  root: ROOT,
  port: Number(process.env.PORT || 3300),
  host: process.env.HOST || '127.0.0.1',
  webToken: process.env.WEB_TOKEN || '',
  dataDir: path.resolve(ROOT, process.env.DATA_DIR || './data'),
  backupDir: path.resolve(ROOT, process.env.BACKUP_DIR || './backups'),
};

export const paths = {
  db: path.join(config.dataDir, 'chart-vault.sqlite'),
  images: path.join(config.dataDir, 'images'),
  thumbs: path.join(config.dataDir, 'thumbs'),
  secret: path.join(config.dataDir, 'cookie-secret'),
  trash: path.join(config.dataDir, 'trash'),      // pictures of deleted charts, until restored
};

export function ensureDirs() {
  for (const dir of [config.dataDir, paths.images, paths.thumbs, paths.trash, config.backupDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
