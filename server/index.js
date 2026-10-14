import { config, paths, ensureDirs } from './config.js';
import { openDb } from './db.js';
import { createApp } from './app.js';
import { scheduleBackups } from './backup.js';
import { ensureThumbs, cleanTempFiles } from './storage.js';

const log = (msg) => console.log(`${new Date().toISOString()} ${msg}`);

ensureDirs();
if (!config.webToken) log('WARNING: WEB_TOKEN is not set. Nobody can log in until it is.');
cleanTempFiles(log);
const db = openDb(paths.db);
const app = createApp(db, { log });

app.listen(config.port, config.host, () => {
  log(`Chart Vault listening on http://${config.host}:${config.port} (data in ${config.dataDir})`);
  scheduleBackups(db, log);
  ensureThumbs(db, log).then((n) => n && log(`made ${n} missing thumbnail(s)`)).catch((e) => log(`thumbnail sweep failed: ${e.message}`));
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { log(`${sig}: closing`); try { db.close(); } catch {} process.exit(0); });
}
