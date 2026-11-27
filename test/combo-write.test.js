// Write It (server/combo-write.js): one paid card per pair through the one door (server/ai.js), kept for every chart,
// its price on the card and in "Spent This Month on What". The model here is FAKE: no test ever calls the real one.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-combo-write-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password';
const { useClientFactory, setAiSettings, spendState, spendLog, MODELS } = await import('../server/ai.js');
const { writeCard, cardRequest, cardEstimate } = await import('../server/combo-write.js');

const requests = [];
const answer = { phrases: ['One', 'Two', 'Three'], position: 'Inside they hold back (11/2), tinted with warmth (6).', share: { title: 'What They Share', text: 'Closeness (11/2, 6).' }, course: { about: '', text: '' }, reasoning: ['A point (11/2).'], best: 'Best (11/2) (6).', worst: 'Worst (6) (11/2).', made: '', primary: 'a' };
useClientFactory(() => ({ messages: { create: async (params) => { requests.push(params); return { content: [{ type: 'text', text: JSON.stringify(answer) }], stop_reason: 'end_turn', usage: { input_tokens: 4000, output_tokens: 3000, cache_read_input_tokens: 15000 } }; } } }));
setAiSettings({ key: 'sk-ant-test-0000000000000000', cap: 8 });
const KEY = 'name.solar=11|name.solarExtra=6';

test('the request carries the playbook, the graded cards and the pair; Fable on medium; a price before the tap', () => {
  assert.equal(MODELS.card.id, 'claude-fable-5-2');
  const { user } = cardRequest(KEY);
  assert.match(user, /Emotion center main vibration 11\/2 \(a\)/);
  assert.match(user, /6 and 11\/2 in the emotion center|difficult to say no/i, 'the course on the pair');
  const usd = cardEstimate(KEY);
  assert.ok(usd > 0.1 && usd < 1, `estimate ${usd}`);
});

test('Write It writes once, keeps it, shows it on every chart with the pair, and books the spend as Combination Cards', async () => {
  const card = await writeCard(KEY, { label: 'Emotion Center 11/2 + 6' });
  assert.equal(requests.length, 1);
  const p = requests[0];
  assert.equal(p.output_config.effort, 'medium');
  assert.equal(p.output_config.format.type, 'json_schema');
  assert.match(p.system[0].text, /THE PLAYBOOK/); assert.match(p.system[0].text, /Never the word "circle"/);
  assert.equal(card.by, 'app'); assert.equal(card.model, 'Claude Fable 5.2'); assert.ok(card.usd > 0);
  assert.equal(card.a.spot, 'name.solar');
  await writeCard(KEY);
  assert.equal(requests.length, 1, 'the second tap is free: the stored card');
  const s = spendState();
  assert.equal(s.by[0].area, 'Combination Cards'); assert.equal(s.by[0].calls, 1);
  assert.equal(spendLog(5)[0].area, 'Combination Cards');
  // kept for every chart: the app's store holds it, and the neighbor rows read that store when no chat-written card exists
  const { appCards } = await import('../server/combo-store.js');
  assert.equal(appCards()[KEY].phrases[0], 'One');
});
after(() => fs.rmSync(tmp, { recursive: true, force: true }));
