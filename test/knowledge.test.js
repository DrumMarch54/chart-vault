// The course passages for AI readings (server/knowledge.js over knowledge/index.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { computeValues } from '../server/positions.js';
import { coreText, contextFor, chunksFor, knowledgeInfo } from '../server/knowledge.js';

const INDEX = new URL('../knowledge/index.json', import.meta.url);
const peter = computeValues({ day: 19, month: 5, year: 1998, name: 'Peter' });

test('the index exists, parses and has passages for every number 1-99', () => {
  const idx = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  assert.ok(idx.sources.length > 100, 'sources');
  assert.ok(idx.chunks.length > 1000, 'chunks');
  const c = idx.chunks[0];
  for (const k of ['id', 'source', 'title', 'heading', 'numbers', 'mentions', 'topics', 'text']) assert.ok(k in c, k);
  const have = new Set(idx.chunks.flatMap((x) => x.numbers));
  for (let n = 1; n <= 99; n++) assert.ok(have.has(n), `no passage about ${n}`);
  assert.equal(knowledgeInfo().missing, false);
});

test('a passage from a course PDF carries the book page it starts on; the page marks never reach the text', () => {
  const idx = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  const books = JSON.parse(fs.readFileSync(new URL('../knowledge/books.json', import.meta.url), 'utf8')).books;
  for (const slug of Object.keys(books)) {
    const s = idx.sources.find((x) => x.slug === slug);
    assert.ok(s && s.book === books[slug].book, `${slug} is a book in the index`);
    const own = idx.chunks.filter((c) => c.source === slug);
    assert.ok(own.length && own.filter((c) => c.page).length / own.length > 0.85, `${slug}: nearly every passage has a page`);
    for (const c of own) { assert.doesNotMatch(c.text, /<!--\s*page/, c.id); if (c.page) assert.ok(c.pageEnd >= c.page, c.id); }
  }
  const seven = idx.chunks.find((c) => c.source === 'name-numeroscopes-book' && /7 IN THE HEART CENTER$/.test(c.heading));
  assert.equal(seven.page, 140, 'the Name Numeroscopes book has "7 in the heart center" on page 140');
  const od = idx.chunks.find((c) => c.source === 'essence-codes-part-1' && /Outer Diamond 14$/.test(c.heading));
  assert.equal(od.page, 18);
  assert.equal(idx.chunks.find((c) => c.source === 'biz-superdates-int').page, undefined, 'a file without page marks has no pages');
});

test('contextFor: Peter, 19 May 1998 stays under the budget and has the day vibration and a life expression', () => {
  const budget = 40000;
  const r = contextFor(peter, { budgetChars: budget });
  assert.ok(r.chars > 0 && r.chars <= budget, `chars ${r.chars}`);
  assert.equal(r.text.length, r.chars);
  assert.match(r.text, /^## Day vibration 19\/1 \(essence chart\)$/m);
  assert.match(r.text, /^## Life expression \d+(\/\d)? \(/m);
  assert.match(r.text, /^\[source: .+\]$/m);
  assert.ok(r.used.length > 5 && r.used.every((u) => u.chunks.length > 0));
  assert.ok(r.text.indexOf('## Day vibration') < r.text.indexOf('## Life expression'), 'the day comes first');
  const small = contextFor(peter, { budgetChars: 3000 });
  assert.ok(small.chars <= 3000);
});

test('contextFor: the same call twice gives byte-identical text', () => {
  const a = contextFor(peter, { budgetChars: 120000 });
  const b = contextFor(peter, { budgetChars: 120000 });
  assert.equal(a.text, b.text);
  assert.ok(a.chars <= 120000);
});

test('contextFor: focus love puts a love aura or emotion center section in the first third', () => {
  const r = contextFor(peter, { budgetChars: 60000, focus: 'love' });
  const third = r.text.slice(0, Math.ceil(r.text.length / 3));
  assert.match(third, /^## (Love aura|Lower right aura|Emotion center|Emotional diamond)\b/m);
});

test('coreText is the same string on every call and in the target size', () => {
  const a = coreText(), b = coreText();
  assert.equal(a, b);
  assert.ok(a.length >= 40000 && a.length <= 80000, `core ${a.length}`);
  assert.match(a, /SYSTEM PROMPT/);
  assert.match(a, /Chart Notes/);
});

test('chunksFor(16, mindCenter) finds the course on 16 in the mind center', () => {
  const list = chunksFor(16, 'mindCenter');
  assert.ok(list.length >= 1 && list.length <= 5);
  assert.ok(list.every((c) => c.numbers.includes(16)));
  assert.ok(list[0].topics.includes('mindCenter'));
});

test('a missing index answers empty, never throws', () => {
  const code = `const K = await import(${JSON.stringify(new URL('../server/knowledge.js', import.meta.url).href)});
    const r = K.contextFor([{ chart: 'essence', position: 'day', n: 0, sum: 19, ds: 1 }]);
    console.log(JSON.stringify({ r, c: K.chunksFor(5), info: K.knowledgeInfo() }));`;
  const out = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, KNOWLEDGE_INDEX: '/nonexistent/index.json' }, encoding: 'utf8' }));
  assert.deepEqual(out.r, { text: '', used: [], chars: 0, missing: true });
  assert.deepEqual(out.c, []);
  assert.equal(out.info.missing, true);
});
