// The connection list (server/connections.js): every diamond a number makes or helps make, and nothing else.
import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionsFor, MADE_BY, DIAMOND_PARTS } from '../server/connections.js';
import { computeValues } from '../server/positions.js';

const ELVIS = { day: 8, month: 1, year: 1935, name: 'Elvis Aaron Presley' };
const show = (list) => list.map((x) => `${x.role} ${x.chart}.${x.position}=${x.sum}`);

test('Elvis public aura 17/8: made by the public diamond 89/8, helps make the mental diamond 88/7, no sub diamond', () => {
  const c = connectionsFor({ chart: 'name', position: 'upperLeft', inputs: ELVIS });
  assert.deepEqual(show(c), ['made name.publicDiamond=89', 'helps name.mindDiamond=88']);
  assert.deepEqual(c[0].parts.map((p) => `${p.chart}.${p.position}:${p.sum}`), ['essence.day:8', 'name.first:18']);
});

test('Elvis day 8: every diamond the day is part of, on the essence and on the chart it was tapped on', () => {
  const c = connectionsFor({ chart: 'essence', position: 'day', at: 'name', inputs: ELVIS });
  assert.deepEqual(show(c).sort(), ['helps essence.innerDiamond=89', 'helps essence.nexus=89', 'helps essence.outerDiamond=81', 'helps essence.target=81', 'helps name.publicDiamond=89', 'helps name.spineDiamond=87'].sort());
  const v = connectionsFor({ chart: 'essence', position: 'day', at: 'vocation', inputs: ELVIS });
  assert.ok(v.some((x) => x.chart === 'vocation' && x.position === 'publicDiamond'));
  assert.ok(!v.some((x) => x.chart === 'name'), 'only the numeroscope it was tapped on');
});

test('a middle name and its sub vibration: the sub diamond of that middle name only', () => {
  const two = { day: 8, month: 1, year: 1935, name: 'Elvis Aaron Jon Presley' };
  const m1 = connectionsFor({ chart: 'name', position: 'middle', n: 1, inputs: two });
  assert.deepEqual(m1.map((x) => `${x.position}#${x.n}`), ['heartSubDiamond#1', 'solarSubDiamond#1']);
  const e0 = connectionsFor({ chart: 'name', position: 'heartExtra', n: 0, inputs: two });
  assert.deepEqual(e0.map((x) => `${x.role} ${x.position}#${x.n}`), ['made heartSubDiamond#0']);
  const heart = connectionsFor({ chart: 'name', position: 'heart', inputs: two });
  assert.deepEqual(heart.map((x) => `${x.role} ${x.position}#${x.n}`), ['made mindDiamond#0', 'helps heartSubDiamond#0', 'helps heartSubDiamond#1']);
});

test('a number not in the drawing (stale inputs) gives no list; the pillar is part of no diamond', () => {
  assert.equal(connectionsFor({ chart: 'name', position: 'middle', inputs: { day: 8, month: 1, year: 1935, name: 'Elvis Presley' } }), null);
  assert.deepEqual(connectionsFor({ chart: 'name', position: 'pillar', inputs: ELVIS }), []);
  assert.equal(connectionsFor({ chart: 'name', position: 'heart' }), null);
});

// The construction rule behind MADE_BY, on many shapes of chart: the sum is the two parts' digit sums added, the
// diamond the same two digit sums side by side. A wrong entry would put a diamond under a number it does not make.
test('every MADE_BY pair holds on every chart: sum = ds + ds, diamond = ds beside ds', () => {
  const people = [ELVIS, { day: 19, month: 12, year: 1984, name: 'Katrine Marie Hansen' }, { day: 29, month: 11, year: 2001, name: 'John Smith' },
    { day: 4, month: 7, year: 1966, name: 'Ann Lee Jr' }, { day: 22, month: 2, year: 1999, name: 'Shicora' }, { day: 31, month: 10, year: 1950, name: 'Mary Ann Jo Beth Kay' }];
  let checked = 0;
  for (const inp of people) {
    const vals = new Map(computeValues(inp).map((v) => [`${v.chart}.${v.position}.${v.n}`, v]));
    for (const v of vals.values()) {
      const made = MADE_BY[v.position];
      if (!made) continue;
      const c = connectionsFor({ chart: v.chart, position: v.position, n: v.n, inputs: inp });
      const d = c.find((x) => x.role === 'made');
      if (!d) { assert.ok(!vals.get(`${v.chart}.${made}.${v.n}`), `${v.chart}.${v.position} ${inp.name}: the diamond exists but is not listed`); continue; }
      const [a, b] = d.parts.map((p) => vals.get(`${p.chart}.${p.position}.${p.n}`));
      assert.equal(v.sum, a.ds + b.ds, `${inp.name} ${v.chart}.${v.position} = ${a.position} + ${b.position}`);
      assert.equal(d.sum, a.ds * 10 + b.ds, `${inp.name} ${v.chart}.${made} = ${a.position} beside ${b.position}`);
      checked++;
    }
  }
  assert.ok(checked > 100, `checked ${checked}`);
});

test('every diamond in the list has two real parts', () => {
  for (const d of DIAMOND_PARTS) assert.equal(d.parts.length, 2, `${d.chart}.${d.position}`);
  assert.ok(DIAMOND_PARTS.some((d) => d.chart === 'outer' && d.position === 'mentalFlow'));
});
