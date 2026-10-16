// Facts about a chart from the course's own rules: no AI, free, instant. Everything here is read from the
// Hub notes in .brain/numerology/ (interpretation.md, number-balance.md, number-names.md, positions.md,
// psyche.md); a meaning that is not in those files is not in this file. The raw material is chart_values
// (server/positions.js): one row per number of every position of every chart.
//
// Exports
//   factsFor(db, imageId)    -> { inputs, facts: [...], scores: { imbalance, influence: { '8': n } }, missing: false }
//                              or { missing: true } when the chart has no chart_values.
//                              Each fact: { kind, title, text, positions: [{ chart, position, sum, ds }], severity }.
//                              Kinds in order: nexus, repeated, unbalanced, karmic, tension, centers, rarity, weaving.
//   chartScores(db)          -> Map<imageId, { imbalance, influence: Map<digitSum, weight>, top: [sum, ...] }>
//   rankCharts(db, { by, number, order, limit }) -> [{ id, score, why }]
//   positionRarity(db, chart, position, sum) -> { same, total }
//   BALANCE                  the balance lists and position families (tools/check_facts.mjs reads them)
//
// The formula (interpretation.md "Hierarchy": stand-alone first-link vibrations are the strongest, then
// what addition makes of them)
//   weight(position)  3  essence day, month, year; name chart first, middle, last name; life expression
//                     2  little and big life path; big life expression; the six centers (mind / emotion
//                        center of the name, vocation and personality charts); the name chart pillar
//                     1  everything else (auras, diamonds, spines, sub-chart and psyche positions).
//                        Letter count and the hidden "any name" duplicate are not scored.
//   penalty(position, sum)  3 when the number is on the unbalanced list of the position's family,
//                           1 when it is on the semi-balanced list, 0 otherwise (BALANCE below).
//   imbalance   = sum over positions of weight x penalty
//   influence[d] = sum of weights of the positions whose digit sum is d, plus 1 for every such position
//                  whose compound number is a "teenage" number 10-18 (17/8 counts more for 8 than 26/8).
//   rankCharts by influence with a compound number N (10-99): influence of N's digit sum, plus 1 for each
//                  position holding exactly N.
import { POSITIONS, positionLabel, chartLabel, getInputs } from './positions.js';

// ---------------------------------------------------------------------------------------------------
// The lists. Source: .brain/numerology/number-balance.md (Undernumeroscopes powerpoint, Module 10;
// Name Numeroscope Guide V2; Drive doc "Name Chart - Pillars") and .brain/numerology/psyche.md.
// A family's `unbalanced: 'other'` means every number not on the balanced list is unbalanced.
// ---------------------------------------------------------------------------------------------------
const SUB = ['name', 'vocation', 'personality'];
export const BALANCE = {
  families: {
    // number-balance.md line 9-10: "Name line: balanced 1,2,3,4,5,6,7,8,9,10,14 · semi-balanced 13,15,17 · unbalanced 11,12,16,18"
    line: { positions: ['name.first', 'name.middle', 'name.last'], balanced: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14], semi: [13, 15, 17], unbalanced: [11, 12, 16, 18] },
    // line 11-13: "Center main vibrations: balanced 2,3,5,6,7,10,14 · semi-balanced 4,8,9,11,12,13,15,17 · unbalanced 12,16,18"
    // (12 is on both lists in the source; it is treated as unbalanced here, the exception for the personality chart is a note).
    center: { positions: ['name.heart', 'name.solar', 'vocation.heart', 'personality.heart', 'personality.solar'], balanced: [2, 3, 5, 6, 7, 10, 14], semi: [4, 8, 9, 11, 13, 15, 17], unbalanced: [12, 16, 18] },
    // line 23-24: "Vocation chart: SP must be very balanced 10/1,2,3,5,14/5,6,(7)"
    vocationSolar: { positions: ['vocation.solar'], balanced: [10, 2, 3, 5, 14, 6, 7], semi: [], unbalanced: 'other' },
    // line 16-18: "Center secondary (extra) vibrations: ... avoid 16 and 18; 12/3 ok as secondary under a balanced main"
    centerExtra: { positions: SUB.flatMap((c) => [`${c}.heartExtra`, `${c}.solarExtra`]), balanced: [], semi: [], unbalanced: [16, 18] },
    // line 19-20: "Auras: everything allowed except 16/7. Good 2,3,4,5,6,7,8,9,10,13,14,15,17; compromises 11,12,(18)"
    aura: { positions: [...SUB.flatMap((c) => [`${c}.upperLeft`, `${c}.upperRight`, `${c}.lowerLeft`, `${c}.lowerRight`]), 'essence.outerAura', 'essence.innerAura', 'essence.topAura'], balanced: [2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 17], semi: [11, 12, 18], unbalanced: [16] },
    // line 24: "avoid 15/6 as HD"
    heartsDesire: { positions: ['vocation.le', 'vocation.big'], balanced: [], semi: [], unbalanced: [15] },
    // line 91-92: "good pillars: 21, 24, 30, 32, 36, 41, 42, 50, 54, 58, 60, 63, 64, 69, 70, 79; bad pillar: 48/3; 13/4 and 20/2 depend"
    pillar: { positions: ['name.pillar'], balanced: [21, 24, 30, 32, 36, 41, 42, 50, 54, 58, 60, 63, 64, 69, 70, 79], semi: [13, 20], unbalanced: [48] },
    // psyche.md line 43-44: "Psyche pillar: ... 11, 12, 16, 18 there bring neediness, anxiety or anger"
    psychePillar: { positions: ['outer.pillar', 'inner.pillar'], balanced: [], semi: [], unbalanced: [11, 12, 16, 18] },
    // psyche.md line 40-41: the psychic month (adult transition): "12, 13, 16, 18 are the hard ones"
    psycheChallenge: { positions: ['outer.first'], balanced: [], semi: [], unbalanced: [12, 13, 16, 18] },
  },
  // number-balance.md line 25-26: "Karmic / 'unlucky' numbers generally avoided in core positions: 11, 12, 16, 18"
  karmic: [11, 12, 16, 18],
  karmicPositions: ['essence.day', 'essence.littleLp', 'essence.bigLp', 'name.le', 'name.big', ...SUB.flatMap((c) => [`${c}.heart`, `${c}.solar`]), 'name.pillar', 'outer.pillar', 'inner.pillar', 'outer.heart', 'outer.solar', 'inner.heart', 'inner.solar'],
  // number-balance.md line 26: "4-8 together = tension (Uranus vs Saturn)"
  tension: [4, 8],
  // the four centers of line 15 "At least 2 of 4 centers balanced; max 2 centers with the same main vibration"
  // (line 14 ranks "vocation SP > vocation HC > personality HC = SP", so the four are the sub-chart centers)
  fourCenters: ['vocation.heart', 'vocation.solar', 'personality.heart', 'personality.solar'],
  sixCenters: SUB.flatMap((c) => [`${c}.heart`, `${c}.solar`]),
  psycheCenters: ['outer.heart', 'outer.solar', 'inner.heart', 'inner.solar'],
};
const FAMILY_OF = new Map();
for (const [fam, f] of Object.entries(BALANCE.families)) for (const key of f.positions) FAMILY_OF.set(key, fam);
export const familyOf = (chart, position) => FAMILY_OF.get(`${chart}.${position}`) || null;
// 'unbalanced' | 'semi' | 'balanced' | null (the family has no verdict on this number)
export function judge(chart, position, sum) {
  const fam = FAMILY_OF.get(`${chart}.${position}`);
  if (!fam) return null;
  const f = BALANCE.families[fam];
  if (f.unbalanced === 'other') return f.balanced.includes(sum) ? 'balanced' : 'unbalanced';
  if (f.unbalanced.includes(sum)) return 'unbalanced';
  if (f.semi.includes(sum)) return 'semi';
  if (f.balanced.includes(sum)) return 'balanced';
  return null;
}
const PENALTY = { unbalanced: 3, semi: 1 };

// Weights of the hierarchy (interpretation.md "Hierarchy").
const WEIGHT3 = new Set(['essence.day', 'essence.month', 'essence.year', 'name.first', 'name.middle', 'name.last', 'name.le']);
const WEIGHT2 = new Set(['essence.littleLp', 'essence.bigLp', 'name.big', ...BALANCE.sixCenters, 'name.pillar']);
const UNSCORED = new Set(['anyName', 'letters']);
export const weightOf = (chart, position) => (UNSCORED.has(position) ? 0 : WEIGHT3.has(`${chart}.${position}`) ? 3 : WEIGHT2.has(`${chart}.${position}`) ? 2 : 1);
const teenage = (sum) => sum >= 10 && sum <= 18;

// ---------------------------------------------------------------------------------------------------
// Words from the Hub. Archetype names: number-names.md (Undernumeroscopes powerpoint "Designing your
// personality"); energy types for 1-9: the same file's "Energy type" list.
// ---------------------------------------------------------------------------------------------------
export const NAMES = {
  10: 'The Cosmic Fortunemaker', 19: 'The Heavenly Prince', 28: 'The Ambitious Lion', 37: 'The Royal Star of Taurus', 46: 'The Perfect Prodigy', 55: 'Master Communicator', 64: 'The Idealistic Perfectionist', 73: 'The Secret Millionaire', 82: 'The Religious Leader', 91: 'The Golden Titan',
  11: 'Master Harmonizer', 20: 'The Cosmic Torchbearer', 29: 'The Empowerment Coach', 38: 'The Powerful Peacemaker', 47: 'The Intuitive Innovator', 56: 'The Charismatic Orator', 65: 'The Beloved Caretaker', 74: 'The Selfless Saviour', 83: 'The Empathetic Enforcer', 92: 'The Community Sentinel',
  12: 'The Expansive Dynamo', 21: 'The Ambitious Alchemist', 30: 'The Cosmic Thinker', 39: 'The Tenacious Boss', 48: 'The Revolutionary Politician', 57: 'The Adventurer', 66: 'Master Matriarch', 75: 'The Majestic Philosopher', 84: 'The Pioneer', 93: 'The Polymath',
  13: 'The Reformer', 22: 'Master Builder', 31: 'The Unorthodox Genius', 40: 'The Cosmic Hermit', 49: 'The Chaos Organizer', 58: 'The World Conqueror', 67: 'The Mysterious Beauty', 76: 'The Dreamweaver', 85: 'The Strategic World Conqueror', 94: 'The Systems Architect',
  14: 'The Mediator', 23: 'The Royal Star of the Lion', 32: 'The Influencer/Emperor', 41: 'The Merchant', 50: 'The Cosmic Communicator', 59: 'The Truth Herald', 68: 'The Heartfelt Organizer', 77: 'Master Seeker', 86: 'The Social Architect', 95: 'The Assertive Orator',
  15: 'The Enchanter', 24: 'The Queen', 33: 'Master Teacher', 42: 'The World Healer', 51: 'The Socialite', 60: 'The Cosmic Nurturer', 69: 'The Alchemical Lover', 78: 'The Occultist', 87: 'The Wizard', 96: 'The Magnetic Maestro',
  16: 'The Awakening Soul', 25: 'The Spiritual Voyager', 34: 'The Spiritual King', 43: 'The Revolutionary', 52: 'The Philosophical Adventurer', 61: 'The Ethical Purist', 70: 'The Cosmic Seeker', 79: 'The Analytical Sage', 88: 'Master of Karma', 97: 'The Transcendentalist',
  17: 'The Star', 26: 'The Conductor', 35: 'The Chieftain', 44: 'The Master of Structure', 53: 'The Empowerment Advocate', 62: 'The Family Protector', 71: 'The Radiant Magician', 80: 'The Cosmic Powerhouse', 89: 'The Archetypal Visionary', 98: 'The Legacy Builder',
  18: 'The Warrior', 27: 'The Good Shepherd', 36: 'The Triad Manifestor', 45: 'The Innovative Leader', 54: 'The Communication Leader', 63: 'The Veiled Strategist', 72: 'The Unifying Leader', 81: 'The Master of the Bow', 90: 'The Cosmic Warrior', 99: 'Master Finalizer',
};
export const ENERGY = { 1: 'Bold & Pioneering', 2: 'Harmonious & Creative', 3: 'Strategic & Expansive', 4: 'Inventive & Grounded', 5: 'Dynamic & Communicative', 6: 'Harmonious & Aesthetic', 7: 'Global & Contemplative', 8: 'Executive & Purposeful', 9: 'Humanitarian & Purposeful' };
export const nameOf = (sum) => NAMES[sum] || ENERGY[sum] || null;

// psyche.md "The teenage numbers 10-18": what the ego does to the pure number.
export const TEENAGE = {
  10: 'tries to enact all cosmic principles and becomes manic, over-perfectionist',
  11: 'always has itself and the other in the picture',
  12: 'feels vulnerable inside, overthinks, panics, feels like a victim',
  13: 'takes its ego into the building and feels like an outsider when left out',
  14: 'adds networking, business, money: a salesperson',
  15: 'creates emotional drama: love plus ego',
  16: 'reacts with fear, overthinking, obsession, loses grounding',
  17: 'is uncomfortable in the spotlight, hesitates',
  18: 'overreacts: frustration, anger, fanaticism',
};

// number-balance.md "Per number, per position (Name Numeroscope Guide V2)": heart center (hc) / solar
// plexus (sp) / aura, B = balanced, U = unbalanced wording. 14 reads as 5; 18 as 9, harsher.
const N9 = { hc: { U: 'hard, self-righteous, critical, feared' }, sp: { U: 'explosive anger, negative self-talk, fertility problems, materialistic' }, aura: { B: 'strength, authority, leadership, structure', U: 'closed, blocked, harsh, judgmental' } };
const N5 = { hc: { B: 'clear communication, well-liked, business skills', U: 'problems in communication, socially, appearance' }, sp: { B: 'active love and family life, expresses needs, close friendships', U: 'racing thoughts, unhealthy risks, shallow' }, aura: { B: 'communication, business, networking, charisma', U: 'money, communication and social problems' } };
export const NOTES = {
  10: { hc: { B: 'turns up the positive qualities of a balanced number', U: 'turns up the negative' }, sp: { B: 'amplifies other numbers, loved', U: 'amplifies the negative, flighty, confused, loved or hated' }, aura: { B: 'turns up positive qualities, flow, "cosmic dimension", luck, loved', U: 'flighty, over-intense' } },
  2: { hc: { B: 'creative, fun, festive', U: 'weak, oversensitive, dependent' }, sp: { B: 'happy, enjoying life, inner balance', U: 'hard to hold together, sadness, dependency' }, aura: { B: 'creative, friendly, gentle, festive', U: 'indifferent, weak, oversensitive' } },
  11: { hc: { U: 'weak, oversensitive, dependent, melancholic' }, sp: { U: 'hard to pull together, sadness, dependency, people pleaser' }, aura: { U: 'lacking protection, withdrawn, oversensitive, turns up the emotions of surrounding numbers' } },
  3: { hc: { B: 'successful, humorous, strong charisma', U: 'stubborn, uncompromising' }, sp: { B: 'successful love/family life, self-confidence, grounded', U: 'hard, materialistic, selfish, willful' }, aura: { B: 'winning mentality, perfectionism, humor, drive', U: 'arrogance, know-it-all, comparing' } },
  12: { hc: { U: "misunderstanding others, misunderstood, drama, victim of others' agenda" }, sp: { U: 'problems in inner life, not seeing yourself clearly, drama in relationships' }, aura: { U: 'misunderstandings and problems, victim' } },
  4: { hc: { U: 'unhappy, complaining, weird, out of place career-wise, lonely, misunderstood' }, sp: { U: 'unhappy with life, unfulfilled longings, infidelity' }, aura: { B: 'innovative, different, out of the box', U: 'opposite and cross, upheaval, unfulfilled desires' } },
  13: { hc: { U: 'extremism, cultic, reverse paradigm' }, sp: { U: 'infidelity, very critical, misunderstood, bitter' }, aura: { B: 'genius, innovation, immortality', U: 'weird, black sheep' } },
  5: N5, 14: N5,
  6: { hc: { B: 'loved by all, magnetic charisma, good upper-body health', U: 'drama in the social field' }, sp: { B: 'good love and sex life, self-esteem, lower-body health, fertility', U: 'victim/pleaser/drama in love life' }, aura: { B: 'charisma, charm, harmony', U: 'softens unbalanced numbers a little' } },
  15: { hc: { U: 'drama around your person' }, sp: { B: 'good sex life, attractiveness, fertility', U: 'mysterious diseases, dramatic, manipulative' }, aura: { B: 'erotic charisma, performer, fascinating power', U: 'drama queen, manipulation' } },
  7: { hc: { B: 'popular, inspiring, unconditionally loving, healing, wise', U: 'fantasy world, ungrounded, lying, seems unstable' }, sp: { B: 'knows self, inner guidance, intuitive', U: 'unrealistic self-image, subconscious controls you' }, aura: { B: 'intuition, international, healing, popularity', U: 'pain, instability, confusion' } },
  16: { hc: { U: 'bony, suffering, shut down' }, sp: { U: 'psychic pain, depression' }, aura: { U: 'anxiety, loss, "bone vibration"' } },
  8: { hc: { U: 'cynical, bitter, distrustful, adversity' }, sp: { U: 'unloved, hard and closed, loneliness, self-esteem issues' }, aura: { B: 'progress, propulsion, power, performing', U: 'adversity, karma, breaks in self-confidence' } },
  17: { hc: { U: 'negative spotlight, shyness, stage fright' }, sp: { U: 'private details revealed, psychopathic traits' }, aura: { U: 'negative spotlight, many problems, paranoia' } },
  9: N9,
  18: { hc: { U: `as 9, harsher: ${N9.hc.U}` }, sp: { U: `as 9, harsher: ${N9.sp.U}` }, aura: { U: 'hard, explosive or pent-up anger' } },
};
// Which column of the guide a position reads from (none for the line, the pillar, the LE).
const NOTE_COLUMN = (chart, position) => {
  if (!SUB.includes(chart)) return null;
  if (position === 'heart' || position === 'heartExtra') return 'hc';
  if (position === 'solar' || position === 'solarExtra') return 'sp';
  if (/^(upperLeft|upperRight|lowerLeft|lowerRight)$/.test(position)) return 'aura';
  return null;
};
function guideNote(chart, position, sum, side = 'U') {
  const col = NOTE_COLUMN(chart, position), n = NOTES[sum];
  return col && n && n[col] && n[col][side] ? n[col][side] : null;
}

// ---------------------------------------------------------------------------------------------------
// Wording helpers
// ---------------------------------------------------------------------------------------------------
export const fmt = (sum, ds) => (sum < 10 ? String(sum) : `${sum}/${ds}`);
const named = (sum, ds) => { const nm = nameOf(sum); return nm ? `${fmt(sum, ds)} (${nm})` : fmt(sum, ds); };
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
// "mind center" / "mind center of the vocation chart" / "day vibration"
export function where(chart, position) {
  const label = lower(positionLabel(chart, position));
  if (chart === 'name' || chart === 'essence') return label;
  return `${label} of the ${lower(chartLabel(chart))}`;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pos = (r) => ({ chart: r.chart, position: r.position, sum: r.sum, ds: r.ds });
const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

// Positions that are a copy of another position by construction (chart-construction.md), so they do not
// count as a repeat: the inner psyche line is the month and year, its LE is the essence dharma line.
const STRUCTURAL_COPY = new Set(['inner.first', 'inner.last', 'inner.le', 'outer.last']);
const VALUES_SQL = 'SELECT chart, position, n, sum, ds FROM chart_values WHERE image_id = ? ORDER BY rowid';

// ---------------------------------------------------------------------------------------------------
// factsFor
// ---------------------------------------------------------------------------------------------------
export function factsFor(db, imageId) {
  const rows = db.prepare(VALUES_SQL).all(imageId);
  if (!rows.length) return { missing: true };
  const order = new Map(POSITIONS.map((p, i) => [`${p.chart}.${p.key}`, i]));
  rows.sort((a, b) => (order.get(`${a.chart}.${a.position}`) ?? 999) - (order.get(`${b.chart}.${b.position}`) ?? 999) || a.n - b.n);
  const at = (chart, position, n = 0) => rows.find((r) => r.chart === chart && r.position === position && r.n === n) || null;
  const facts = [];

  // 1. nexus (interpretation.md "Start with the Nexus (day + LP) before anything else")
  const day = at('essence', 'day'), llp = at('essence', 'littleLp'), blp = at('essence', 'bigLp'), nexus = at('essence', 'nexus');
  if (day && llp && nexus) {
    const bigText = blp && blp.sum !== llp.sum ? ` The big life path is ${named(blp.sum, blp.ds)}.` : '';
    facts.push({
      kind: 'nexus', title: 'Start here: the nexus', severity: 'info',
      text: `Day ${named(day.sum, day.ds)} with life path ${named(llp.sum, llp.ds)} makes the nexus ${named(nexus.sum, nexus.ds)}: the ego in conversation with the soul.${bigText}`,
      positions: [day, llp, blp, nexus].filter(Boolean).map(pos),
    });
  }

  // 2. repeated numbers (interpretation.md "Prioritize patterns, repeated numbers")
  const scored = rows.filter((r) => !UNSCORED.has(r.position) && !STRUCTURAL_COPY.has(`${r.chart}.${r.position}`));
  const bySum = new Map(), byDs = new Map();
  for (const r of scored) {
    if (r.sum >= 10) { if (!bySum.has(r.sum)) bySum.set(r.sum, []); bySum.get(r.sum).push(r); }
    if (!byDs.has(r.ds)) byDs.set(r.ds, []); byDs.get(r.ds).push(r);
  }
  const repeats = [...bySum.entries()].filter(([, l]) => l.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 6);
  for (const [sum, l] of repeats) {
    facts.push({
      kind: 'repeated', title: `${fmt(sum, l[0].ds)} appears ${l.length} times`, severity: l.length >= 3 ? 'note' : 'info',
      text: `${named(sum, l[0].ds)} sits in the ${list(l.map((r) => where(r.chart, r.position)))}.`,
      positions: l.map(pos),
    });
  }
  const dominant = [...byDs.entries()].filter(([, l]) => l.length >= 4).sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  for (const [ds, l] of dominant) {
    const compounds = [...new Set(l.map((r) => fmt(r.sum, r.ds)))];
    facts.push({
      kind: 'repeated', title: `The digit ${ds} dominates: ${l.length} positions`, severity: l.length >= 8 ? 'note' : 'info',
      text: `${ENERGY[ds] ? `${ds} (${ENERGY[ds]})` : ds} is the digit sum of ${l.length} positions: ${compounds.join(', ')}. Where: ${l.length > 8 ? `${l.slice(0, 8).map((r) => where(r.chart, r.position)).join(', ')} and ${l.length - 8} more` : list(l.map((r) => where(r.chart, r.position)))}.`,
      positions: l.map(pos),
    });
  }

  // 3. unbalanced / semi-balanced numbers in their position families (BALANCE)
  for (const r of rows) {
    const verdict = judge(r.chart, r.position, r.sum);
    if (verdict !== 'unbalanced' && verdict !== 'semi') continue;
    const fam = familyOf(r.chart, r.position);
    const note = guideNote(r.chart, r.position, r.sum, 'U');
    const place = where(r.chart, r.position);
    let text = verdict === 'unbalanced' ? `${fmt(r.sum, r.ds)} is unbalanced as ${place}.` : `${fmt(r.sum, r.ds)} is semi-balanced as ${place}.`;
    if (fam === 'vocationSolar') text = `${fmt(r.sum, r.ds)} as ${place}: the course wants this center very balanced (10/1, 2, 3, 5, 14/5, 6, 7).`;
    if (fam === 'heartsDesire') text = `${fmt(r.sum, r.ds)} as ${place}: the course says avoid 15/6 here.`;
    if (fam === 'pillar') text = verdict === 'unbalanced' ? `${fmt(r.sum, r.ds)} as ${place}: the course lists 48/3 as a bad pillar.` : `${fmt(r.sum, r.ds)} as ${place}: the course says 13/4 and 20/2 depend on the rest of the chart.`;
    if (fam === 'psychePillar') text = `${fmt(r.sum, r.ds)} as ${place}: here 11, 12, 16 and 18 bring neediness, anxiety or anger.`;
    if (fam === 'psycheChallenge') text = `${fmt(r.sum, r.ds)} as ${place}: one of the hard numbers for the adult transition (12, 13, 16, 18).`;
    if (fam === 'centerExtra') text = `${fmt(r.sum, r.ds)} as ${place}: the course says avoid 16 and 18 as extra vibrations.`;
    if (fam === 'aura' && verdict === 'semi') text = `${fmt(r.sum, r.ds)} as ${place} is a compromise; judge it by the diamond it forms.`;
    if (fam === 'center' && r.sum === 12 && r.chart === 'personality') text += ' Exception: 12 is acceptable in the personality chart in an otherwise clean setup with a strong 37/1.';
    if (note) text += ` The guide's note for ${fmt(r.sum, r.ds)} here: ${note}.`;
    facts.push({ kind: 'unbalanced', title: `${fmt(r.sum, r.ds)} in the ${place}`, severity: verdict === 'unbalanced' ? 'pain' : 'note', text, positions: [pos(r)] });
  }

  // 4. karmic numbers in core positions (number-balance.md; the teenage meaning from psyche.md)
  for (const r of rows) {
    if (!BALANCE.karmic.includes(r.sum) || !BALANCE.karmicPositions.includes(`${r.chart}.${r.position}`)) continue;
    const place = where(r.chart, r.position);
    facts.push({
      kind: 'karmic', title: `Karmic ${fmt(r.sum, r.ds)} in the ${place}`, severity: r.chart === 'essence' ? 'note' : 'pain',
      text: `${named(r.sum, r.ds)} sits in the ${place}, a core position where the course avoids 11, 12, 16 and 18. As a teenage number, ${fmt(r.sum, r.ds)} ${TEENAGE[r.sum]}.`,
      positions: [pos(r)],
    });
  }

  // 5. tension: 4 and 8 together in one chart's line or centers; too many centers alike; too few balanced
  const LINE_AND_CENTERS = { essence: ['day', 'month', 'year'], name: ['first', 'middle', 'last', 'le', 'heart', 'solar'], vocation: ['first', 'middle', 'last', 'le', 'heart', 'solar'], personality: ['first', 'middle', 'last', 'le', 'heart', 'solar'] };
  for (const [chart, keys] of Object.entries(LINE_AND_CENTERS)) {
    const here = rows.filter((r) => r.chart === chart && keys.includes(r.position));
    const fours = here.filter((r) => r.ds === 4), eights = here.filter((r) => r.ds === 8);
    if (fours.length && eights.length) {
      facts.push({
        kind: 'tension', title: `4 and 8 together in the ${lower(chartLabel(chart))}`, severity: 'note',
        text: `${list(fours.map((r) => `${fmt(r.sum, r.ds)} as ${where(r.chart, r.position)}`))} and ${list(eights.map((r) => `${fmt(r.sum, r.ds)} as ${where(r.chart, r.position)}`))}: 4 and 8 together make tension (Uranus against Saturn).`,
        positions: [...fours, ...eights].map(pos),
      });
    }
  }
  const six = BALANCE.sixCenters.map((k) => { const [c, p] = k.split('.'); return at(c, p); }).filter(Boolean);
  const same = new Map();
  for (const r of six) { if (!same.has(r.sum)) same.set(r.sum, []); same.get(r.sum).push(r); }
  for (const [sum, l] of same) if (l.length > 2) {
    facts.push({ kind: 'tension', title: `${fmt(sum, l[0].ds)} is the main vibration of ${l.length} centers`, severity: 'note', text: `The course allows at most two centers with the same main vibration; ${fmt(sum, l[0].ds)} is in the ${list(l.map((r) => where(r.chart, r.position)))}.`, positions: l.map(pos) });
  }
  const four = BALANCE.fourCenters.map((k) => { const [c, p] = k.split('.'); return at(c, p); }).filter(Boolean);
  if (four.length === 4) {
    const bal = four.filter((r) => judge(r.chart, r.position, r.sum) === 'balanced');
    if (bal.length < 2) facts.push({ kind: 'tension', title: `Only ${bal.length} of the four sub-chart centers ${bal.length === 1 ? 'is' : 'are'} balanced`, severity: 'pain', text: `The course wants at least two of the four vocation and personality centers balanced. Here: ${list(four.map((r) => `${fmt(r.sum, r.ds)} ${where(r.chart, r.position)}`))}.`, positions: four.map(pos) });
  }

  // 6. the centers, counted
  if (six.length) {
    const count = { balanced: 0, semi: 0, unbalanced: 0, open: 0 };
    const parts = six.map((r) => { const v = judge(r.chart, r.position, r.sum) || 'open'; count[v]++; return `${fmt(r.sum, r.ds)} ${where(r.chart, r.position)}${v === 'open' ? '' : ` (${v === 'semi' ? 'semi-balanced' : v})`}`; });
    const psyche = BALANCE.psycheCenters.map((k) => { const [c, p] = k.split('.'); return at(c, p); }).filter(Boolean);
    const psycheText = psyche.length ? ` Psyche centers: ${list(psyche.map((r) => `${fmt(r.sum, r.ds)} ${where(r.chart, r.position)}`))}.` : '';
    facts.push({
      kind: 'centers', title: `Centers: ${count.balanced} balanced, ${count.semi} semi-balanced, ${count.unbalanced} unbalanced`, severity: count.unbalanced ? 'note' : 'info',
      text: `${parts.join('; ')}.${psycheText}`,
      positions: [...six, ...psyche].map(pos),
    });
  }

  // 7. rarity of each top number across the vault
  const RARITY_POSITIONS = [['essence', 'day'], ['essence', 'littleLp'], ['essence', 'bigLp'], ['essence', 'nexus'], ['name', 'le'], ['name', 'heart'], ['name', 'solar'], ['name', 'pillar'], ['name', 'first'], ['name', 'last']];
  for (const [chart, position] of RARITY_POSITIONS) {
    const r = at(chart, position);
    if (!r) continue;
    const { same: n, total: m } = positionRarity(db, chart, position, r.sum);
    const rare = n >= 1 && n <= 3;
    facts.push({
      kind: 'rarity', title: `${fmt(r.sum, r.ds)} as ${where(chart, position)}: ${n} of ${m} charts`, severity: rare ? 'note' : 'info',
      text: `${n} of ${m} charts in the vault have ${fmt(r.sum, r.ds)} as ${where(chart, position)}${rare ? (n === 1 ? ': only this one' : ': rare') : ''}.`,
      positions: [pos(r)],
    });
  }

  // 8. weaving pairs (interpretation.md "Narrative weaving": works between any two neighbors)
  const month = at('essence', 'month'), year = at('essence', 'year'), od = at('essence', 'outerDiamond'), id = at('essence', 'innerDiamond'), oa = at('essence', 'outerAura'), ia = at('essence', 'innerAura');
  const weave = (title, a, b, makes, extra = '') => {
    if (!a || !b) return;
    const made = makes ? ` make ${where(makes.chart, makes.position)} ${named(makes.sum, makes.ds)}` : ' are read together';
    facts.push({ kind: 'weaving', title, severity: 'info', text: `${cap(where(a.chart, a.position))} ${named(a.sum, a.ds)} and ${where(b.chart, b.position)} ${named(b.sum, b.ds)}${made}.${extra}`, positions: [a, b, makes].filter(Boolean).map(pos) });
  };
  weave('Day and month', day, month, od, oa ? ` The outer aura is ${fmt(oa.sum, oa.ds)}.` : '');
  weave('Day and year', day, year, id, ia ? ` The inner aura is ${fmt(ia.sum, ia.ds)}.` : '');
  weave('Life expression and pillar', at('name', 'le'), at('name', 'pillar'), null);
  weave('Mind center and emotion center', at('name', 'heart'), at('name', 'solar'), null);
  weave('First and last name', at('name', 'first'), at('name', 'last'), at('name', 'leDiamond'));

  const s = scoreRows(rows);
  return { inputs: getInputs(db, imageId), facts, scores: { imbalance: s.imbalance, influence: Object.fromEntries([...s.influence].sort((a, b) => a[0] - b[0]).map(([d, w]) => [String(d), w])) }, missing: false };
}

// ---------------------------------------------------------------------------------------------------
// Scores. One pass over chart_values; rows come back as arrays (raw) and the lookups are two-level maps,
// so 700 charts / 75k rows score in well under 200 ms.
// ---------------------------------------------------------------------------------------------------
// chart -> position -> { w, penalty: Map<sum, 3|1> } for every catalog position (penalties from BALANCE)
const INFO = new Map();
for (const p of POSITIONS) {
  if (!INFO.has(p.chart)) INFO.set(p.chart, new Map());
  const penalty = new Map();
  const fam = FAMILY_OF.get(`${p.chart}.${p.key}`);
  if (fam) {
    const f = BALANCE.families[fam];
    for (let n = 1; n <= 99; n++) { const v = f.unbalanced === 'other' ? (f.balanced.includes(n) ? null : 'unbalanced') : f.unbalanced.includes(n) ? 'unbalanced' : f.semi.includes(n) ? 'semi' : null; if (v) penalty.set(n, PENALTY[v]); }
  }
  INFO.get(p.chart).set(p.key, { w: weightOf(p.chart, p.key), penalty });
}
function newScore() { return { imbalance: 0, influence: new Map(), top: [] }; }
function addRaw(s, chart, position, sum, ds) {
  const info = INFO.get(chart)?.get(position);
  if (!info || !info.w) return;
  const pen = info.penalty.get(sum);
  if (pen) s.imbalance += info.w * pen;
  s.influence.set(ds, (s.influence.get(ds) || 0) + info.w + (sum >= 10 && sum <= 18 ? 1 : 0));
  if (info.w === 3) s.top.push(sum);
}
function scoreRows(rows) { const s = newScore(); for (const r of rows) addRaw(s, r.chart, r.position, r.sum, r.ds); return s; }

export function chartScores(db) {
  const charts = new Set(db.prepare("SELECT id FROM images WHERE kind = 'chart'").raw().all().map((r) => r[0]));
  const rows = db.prepare('SELECT image_id, chart, position, sum, ds FROM chart_values').raw().all();
  const out = new Map();
  for (const [id, chart, position, sum, ds] of rows) {
    if (!charts.has(id)) continue;
    let s = out.get(id);
    if (!s) { s = newScore(); out.set(id, s); }
    addRaw(s, chart, position, sum, ds);
  }
  return out;
}

const digitSum = (n) => { while (n > 9) n = String(n).split('').reduce((a, c) => a + Number(c), 0); return n; };

export function rankCharts(db, { by = 'imbalance', number = null, order = 'desc', limit = 5 } = {}) {
  if (by !== 'imbalance' && by !== 'influence') throw new Error(`rankCharts: by must be imbalance or influence, not ${by}`);
  let d = null, exact = null;
  if (by === 'influence') {
    const n = Number(number);
    if (!Number.isInteger(n) || n < 1 || n > 99) throw new Error('rankCharts by influence needs a number 1-99');
    d = digitSum(n); exact = n >= 10 ? n : null;
  }
  const scores = chartScores(db);
  const exactCount = exact ? new Map(db.prepare("SELECT v.image_id, count(*) AS c FROM chart_values v WHERE v.sum = ? GROUP BY v.image_id").all(exact).map((r) => [r.image_id, r.c])) : null;
  const ranked = [...scores].map(([id, s]) => ({ id, score: by === 'imbalance' ? s.imbalance : (s.influence.get(d) || 0) + (exactCount ? exactCount.get(id) || 0 : 0) }));
  ranked.sort((a, b) => (order === 'asc' ? a.score - b.score : b.score - a.score) || a.id - b.id);
  const top = ranked.slice(0, Math.max(0, Number(limit) || 0));
  const values = db.prepare(VALUES_SQL);
  for (const item of top) {
    const rows = values.all(item.id);
    let parts;
    if (by === 'imbalance') {
      parts = rows.map((r) => ({ r, w: weightOf(r.chart, r.position) * (PENALTY[judge(r.chart, r.position, r.sum)] || 0) })).filter((p) => p.w > 0);
    } else {
      parts = rows.map((r) => ({ r, w: r.ds === d ? weightOf(r.chart, r.position) + (teenage(r.sum) ? 1 : 0) + (exact && r.sum === exact ? 1 : 0) : 0 })).filter((p) => p.w > 0 && !UNSCORED.has(p.r.position));
    }
    parts.sort((a, b) => b.w - a.w);
    item.why = parts.length ? parts.slice(0, 6).map((p) => `${fmt(p.r.sum, p.r.ds)} ${where(p.r.chart, p.r.position)}`).join(', ') + (parts.length > 6 ? ` and ${parts.length - 6} more` : '') : (by === 'imbalance' ? 'no unbalanced or semi-balanced number in a judged position' : `no position with digit sum ${d}`);
  }
  return top;
}

// How many charts hold `sum` in a position / how many charts have any value there.
export function positionRarity(db, chart, position, sum) {
  const same = db.prepare("SELECT count(DISTINCT v.image_id) AS c FROM chart_values v JOIN images i ON i.id = v.image_id WHERE i.kind = 'chart' AND v.chart = ? AND v.position = ? AND v.sum = ?").get(chart, position, sum).c;
  const total = db.prepare("SELECT count(DISTINCT v.image_id) AS c FROM chart_values v JOIN images i ON i.id = v.image_id WHERE i.kind = 'chart' AND v.chart = ? AND v.position = ?").get(chart, position).c;
  return { same, total };
}
