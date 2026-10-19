// Charts like this one (owner's ask 2026-10-19): every other chart scored by how many positions hold the very
// same number, per chart (essence, name, vocation, personality, outer and inner psyche). "Same" = the same
// position, the same repeat index and the same number (12/3 is not 3/3). Hidden helper positions (any name)
// do not count. The owner ranks by every chart together or by one chart; the counts for all six come back
// either way, so the screen can show "Essence 9 of 11 · Name 3 of 15".
import { CHARTS, POSITIONS } from './positions.js';

const HIDDEN = POSITIONS.filter((p) => p.hidden).map((p) => `${p.chart}.${p.key}`);
const hiddenSql = (alias) => (HIDDEN.length ? ` AND (${alias}.chart || '.' || ${alias}.position) NOT IN (${HIDDEN.map((h) => `'${h}'`).join(',')})` : '');

export function similarCharts(db, imageId, { by = 'all', limit = 60 } = {}) {
  const chartKeys = CHARTS.map((c) => c.key);
  const of = {};
  for (const r of db.prepare(`SELECT chart, count(*) AS c FROM chart_values a WHERE image_id = ?${hiddenSql('a')} GROUP BY chart`).all(imageId)) of[r.chart] = r.c;
  const rows = db.prepare(`SELECT b.image_id AS id, b.chart, count(*) AS same
    FROM chart_values a JOIN chart_values b ON b.chart = a.chart AND b.position = a.position AND b.n = a.n AND b.sum = a.sum AND b.image_id != a.image_id
    JOIN images i ON i.id = b.image_id
    WHERE a.image_id = ? AND i.kind = 'chart'${hiddenSql('a')}
    GROUP BY b.image_id, b.chart`).all(imageId);
  const byId = new Map();
  for (const r of rows) {
    if (!byId.has(r.id)) byId.set(r.id, { id: r.id, per: {}, total: 0 });
    const e = byId.get(r.id); e.per[r.chart] = r.same; e.total += r.same;
  }
  const key = chartKeys.includes(by) ? by : 'all';
  const score = (e) => (key === 'all' ? e.total : (e.per[key] || 0));
  const list = [...byId.values()].filter((e) => score(e) > 0).sort((a, b) => score(b) - score(a) || b.total - a.total || a.id - b.id).slice(0, limit);
  if (list.length) {
    const ids = list.map((e) => e.id);
    const info = db.prepare(`SELECT i.id, i.filename, i.title, (i.stored_path IS NOT NULL) AS has_file, ci.day, ci.month, ci.year, ci.name
      FROM images i LEFT JOIN chart_inputs ci ON ci.image_id = i.id WHERE i.id IN (${ids.map(() => '?').join(',')})`).all(...ids);
    const m = new Map(info.map((r) => [r.id, r]));
    for (const e of list) { const r = m.get(e.id) || {}; e.filename = r.filename; e.title = r.title; e.has_file = !!r.has_file; e.inputs = r.name || r.day ? { day: r.day, month: r.month, year: r.year, name: r.name } : null; }
  }
  const totalOf = Object.values(of).reduce((a, b) => a + b, 0);
  return { id: imageId, by: key, of, totalOf, charts: CHARTS.map((c) => ({ key: c.key, label: c.label })), items: list.map((e) => ({ ...e, per: Object.fromEntries(chartKeys.map((k) => [k, e.per[k] || 0])) })) };
}
