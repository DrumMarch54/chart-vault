// The combination cards written in the app (server/combo-write.js, paid, one per pair): data/combo-cards-app.json.
// Read and written only here; server/neighbors.js shows them beside the cards the writing chats made.
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const file = () => path.join(config.dataDir, 'combo-cards-app.json');
export function appCards() { try { return JSON.parse(fs.readFileSync(file(), 'utf8')).cards || {}; } catch { return {}; } }
export function saveAppCard(key, card) {
  const cards = appCards(); cards[key] = card;
  fs.mkdirSync(config.dataDir, { recursive: true });
  const tmp = file() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ about: 'Combination cards written in the app (server/combo-write.js), paid, one per pair. A writing chat may move them into tools/combo-cards/batches after the owner grades them.', cards }, null, 1));
  fs.renameSync(tmp, file());
}
