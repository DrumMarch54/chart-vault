import { config, paths, ensureDirs } from './config.js';
import { openDb } from './db.js';
import { createApp } from './app.js';
import { scheduleBackups } from './backup.js';
import { ensureThumbs, cleanTempFiles } from './storage.js';
import { seedInputs, seedQuickInputs, loadSeedFile } from './positions.js';
import { seedTitles, loadTitleSeed } from './titles.js';

import { remember } from './logbuf.js';
import { COMMIT } from './build.js';

const log = (msg) => { const line = `${new Date().toISOString()} ${msg}`; console.log(line); remember(line); };

ensureDirs();
if (!config.webToken) log('WARNING: WEB_TOKEN is not set. Nobody can log in until it is.');
cleanTempFiles(log);
const db = openDb(paths.db);
// The names and dates read off the vault's pictures (server/chart-inputs.json): added for charts that
// have none yet, never over what is already there.
try { const r = seedInputs(db, loadSeedFile()); if (r.added) log(`position search: loaded inputs for ${r.added} chart(s) from the repo (${r.skipped} already there, ${r.unknown} not in this vault)`); }
catch (err) { log(`position search seed failed: ${err.message}`); }
// Who each chart is (server/chart-titles.json): the name under the thumbnail, added for charts that have
// none yet, never over an owner edit.
try { const r = seedQuickInputs(db); if (r.added) log(`position search: gave ${r.added} Quick Chart save(s) their name and date from the tag and filename`); } catch (err) { log(`quick chart inputs: ${err.message}`); }
try { const r = seedTitles(db, loadTitleSeed()); if (r.added) log(`names: loaded ${r.added} chart name(s) from the repo (${r.skipped} already there, ${r.unknown} not in this vault)`); }
catch (err) { log(`chart name seed failed: ${err.message}`); }
const app = createApp(db, { log });

app.listen(config.port, config.host, () => {
  log(`Chart Vault build ${COMMIT} listening on http://${config.host}:${config.port} (data in ${config.dataDir})`);
  scheduleBackups(db, log);
  ensureThumbs(db, log).then((n) => n && log(`made ${n} missing thumbnail(s)`)).catch((e) => log(`thumbnail sweep failed: ${e.message}`));
});

// A stray promise error is logged (and shows in the report), never fatal.
process.on('unhandledRejection', (err) => log(`unhandled error: ${err && err.stack || err}`));

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { log(`${sig}: closing`); try { db.close(); } catch {} process.exit(0); });
}
