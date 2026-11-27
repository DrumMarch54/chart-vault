// With Its Neighbors (server/neighbors.js) and the combination cards (knowledge/combo-cards.json).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chart-vault-neighbors-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.BACKUP_DIR = path.join(tmp, 'backups');
process.env.WEB_TOKEN = 'test-password';
const { neighborsFor, PAIRS, cardKey, loadCards } = await import('../server/neighbors.js');
const { diamondsOf } = await import('../server/insight.js');
const { computeValues } = await import('../server/positions.js');
const { comboReport } = await import('../server/combo-notes.js');
const ELVIS = { day: 8, month: 1, year: 1935, name: 'Elvis Aaron Presley' };
const list = (x) => x.map((r) => `${r.spot.chart}.${r.spot.position}=${r.spot.sum}${r.card ? ` [${r.card.phrases[0]}]` : ''}`);

test('Elvis public aura 17/8: mind center 16/7 with its graded card, first name 18/9, friends aura 17/8', () => {
  assert.deepEqual(list(neighborsFor({ chart: 'name', position: 'upperLeft', inputs: ELVIS, sum: 17 })),
    ['name.heart=16 [Nervous Celebrity]', 'name.first=18', 'name.upperRight=17']);
  assert.equal(neighborsFor({ chart: 'name', position: 'upperLeft', inputs: ELVIS, sum: 5 }), null, 'a stale drawing gives nothing');
});

test('a center lists its circle first; the essence day stays on the chart it was tapped on', () => {
  const heart = list(neighborsFor({ chart: 'name', position: 'heart', inputs: ELVIS }));
  assert.equal(heart[0], 'name.heartExtra=14');
  const day = neighborsFor({ chart: 'essence', position: 'day', at: 'vocation', inputs: ELVIS });
  assert.ok(day.some((x) => x.spot.chart === 'vocation' && x.spot.position === 'first'));
  assert.ok(!day.some((x) => x.spot.chart === 'personality'), 'not the other numeroscopes');
});

test('the line diamond pair (first + last) only without a middle name; names next to each other always', () => {
  const two = { day: 8, month: 1, year: 1935, name: 'Elvis Presley' };
  assert.ok(list(neighborsFor({ chart: 'vocation', position: 'first', inputs: two })).some((x) => x.startsWith('vocation.last=')));
  assert.ok(!list(neighborsFor({ chart: 'vocation', position: 'first', inputs: ELVIS })).some((x) => x.startsWith('vocation.last=')), 'Elvis has a middle name');
  assert.ok(list(neighborsFor({ chart: 'vocation', position: 'first', inputs: ELVIS })).some((x) => x.startsWith('vocation.middle=')));
});

// One list (CLAUDE.md: diamondsOf is the one list of what a combination is): every pair the research tool counts is a
// neighbor pair here, except a center with a middle name (owner 2026-11-26: the middle name is not part of the circle's read).
test('every combination the research tool counts is a neighbor pair here', () => {
  const pairs = new Set(PAIRS.map(([a, b]) => [a, b].sort().join('|')));
  for (const inp of [ELVIS, { day: 19, month: 5, year: 1998, name: 'Peter Joshua Shicora' }, { day: 29, month: 11, year: 2001, name: 'John Smith' }]) {
    const values = computeValues(inp);
    const spotOf = new Map(); for (const v of values) { const k = `${v.chart}.${v.position}`; if (!spotOf.has(v.sum)) spotOf.set(v.sum, new Set()); spotOf.get(v.sum).add(k); }
    for (const d of diamondsOf(values)) {
      if (/(heartExtra|heartSubDiamond|solarExtra|solarSubDiamond)$/.test(d.spot)) continue; // center + middle name
      if (/Names Next to Each Other/.test(d.label || '')) continue; // read off the line in neighborsFor
      const xs = [...(spotOf.get(d.x) || [])], ys = [...(spotOf.get(d.y) || [])];
      assert.ok(xs.some((a) => ys.some((b) => pairs.has([a, b].sort().join('|')))), `${d.spot} ${d.label || ''}: ${d.x} + ${d.y}`);
    }
  }
});

test('the graded cards are in, keyed by the two spots and numbers; each shows on a chart that holds the pair', () => {
  const cards = loadCards();
  assert.ok(Object.keys(cards).length >= 28);
  const k = cardKey('name.solar', 13, 'name.solarExtra', 8);
  assert.equal(cards[k].phrases[0], 'The Rebel and the Judge');
  assert.equal(cards[k].best, 'Changes things for real (13/4) and sees them through to the end (8).');
  assert.equal(cardKey('b.x', 2, 'a.y', 9), cardKey('a.y', 9, 'b.x', 2), 'either order, one key');
  for (const c of Object.values(cards)) {
    assert.ok(c.phrases.length >= 3, `${c.a.spot}+${c.b.spot}: three phrases`);
    assert.ok(c.position && c.best && c.worst, `${c.a.spot}+${c.b.spot}: By Position, At Its Best, At Its Worst`);
  }
  // the owner's own psyche charts (19 May 1998): the twins read their card
  const own = { day: 19, month: 5, year: 1998, name: 'Peter Joshua Shicora' };
  const twins = neighborsFor({ chart: 'outer', position: 'mindDiamond', inputs: own, sum: 71 });
  assert.ok(twins.some((x) => x.card && x.card.phrases[0] === 'Principled Magician'));
});

test('tapped while missing and This Is Off reach the snapshot', async () => {
  const { noteWanted, noteOff } = await import('../server/combo-notes.js');
  assert.equal(noteWanted('bad key', 'x'), null);
  noteWanted('name.first=18|name.upperLeft=17', 'Public Aura 17/8 + First Name 18/9');
  noteWanted('name.first=18|name.upperLeft=17', 'Public Aura 17/8 + First Name 18/9');
  noteOff(cardKey('name.solar', 13, 'name.solarExtra', 8), 'Emotion Center 13/4 + 8', 'The phrase is too long');
  const rep = comboReport().join('\n');
  assert.match(rep, /2x name\.first=18\|name\.upperLeft=17/);
  assert.match(rep, /"The phrase is too long"/);
});
after(() => fs.rmSync(tmp, { recursive: true, force: true }));
