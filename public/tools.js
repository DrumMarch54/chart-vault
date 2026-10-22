// The number tools' screens: Today, Coming Days, Number Fun, Price Tool, Relationship, Karmic Connections,
// My Chart. Math in public/numbertools.js, the book's words in public/readings.js (loaded on first use).
// app.js hands over its screen plumbing through Tools.install(...) at startup; nothing here touches the
// vault's charts or tags. Layouts: the six mockups approved on 2026-10-15 (.brain/HISTORY.md).
(function (root) {
  'use strict';
  const T = root.NumberTools, N = root.Numeroscope;
  let A = null; // what app.js hands over: { routes, h, sv, fill, render, count, toast, api, go, numeroscopeSvg, setCleanup, sheet }
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const TZ = 'America/Phoenix'; // the owner's clock, like the day rows
  const todayIn = () => { const p = {}; for (const x of new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date())) p[x.type] = Number(x.value); return { y: p.year, m: p.month, d: p.day }; };
  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const parseIso = (s) => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '')); return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null; };
  const shift = ({ y, m, d }, by) => { const dt = new Date(y, m - 1, d + by); return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }; };
  const nameOf = (v) => T.nameOf(v.sum);
  const remember = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const recall = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? fallback : v; } catch { return fallback; } };

  // The books' words load once, when a tool first needs them (kept out of the app's first paint): the day books
  // in readings.js (273 KB), the business books in bizwords.js (86 KB). Both generated, both in the app shell.
  const loading = {};
  const lazy = (file, name) => () => { if (root[name]) return Promise.resolve(root[name]); if (!loading[name]) loading[name] = new Promise((res) => { const s = document.createElement('script'); s.src = `/${file}?v=` + (root.APP_VERSION || '0'); s.onload = () => res(root[name] || {}); s.onerror = () => res({}); document.head.append(s); }); return loading[name]; };
  const readings = lazy('readings.js', 'Readings');
  const bizwords = lazy('bizwords.js', 'BizWords');
  // The books' words on screen: their short forms spelled out (DV = day vibration, LP = life path, which the app
  // calls the essence) and the paid tool's own names left out. Everything else stays word for word.
  const plain = (t) => String(t || '').replace(/\bDVs?(\d)\b/g, 'day vibration $1').replace(/\bDV\b/g, 'day vibration').replace(/\bLP\b/g, 'essence')
    .replace(/\bLife Path\b/g, 'essence').replace(/\bin the Superdates Tool\b/g, 'in the calendar').replace(/\bthe Superdates Tool\b/g, 'the calendar');
  const noPage = (t) => String(t).replace(/ \(pp?\. [\d, -]+\)$/, '');
  const BIZ_COLOR_WORD = { green: 'Excellent', black: 'Good', orange: 'Can Be Okay', red: 'Avoid' };
  // The success-code group a number belongs to (Superdates pp. 24-27), the one matching the code's kind first.
  const KIND_CAT = { strong: 1, soft: 1, strength: 2, limited: 2, special: 3 };
  const codeGroup = (R, n, kind) => { const gs = (R.codes || []).filter((g) => g.nums.includes(n)); return gs.find((g) => g.cat === KIND_CAT[kind]) || gs[0] || null; };

  // ---------- shared pieces ----------
  const light = () => { document.documentElement.classList.add('light'); A.setCleanup(() => document.documentElement.classList.remove('light')); };
  // The day look of Today and Coming Days (the owner's pick C, 2026-10-16): a soft light page, the planets in a
  // small banner, and the charts drawn exactly as the Quick Chart draws them, on white. The tints color the
  // banner's nebula after the ruler of the day.
  const TINTS = { Sun: '#f6c453', Moon: '#d3d9e8', Mercury: '#9fc9d9', Venus: '#f2c9a0', Mars: '#e58a72', Jupiter: '#dba66b', Saturn: '#e3c995', Uranus: '#8fd3e0', Neptune: '#8aa4f5' };
  const day = () => { document.documentElement.classList.add('day'); A.setCleanup(() => document.documentElement.classList.remove('day')); };
  // The first sentences of a book passage, for the reading rows (tap for the whole page).
  const snippet = (t, n = 2) => (t ? String(t).split(/(?<=[.!?])\s+/).slice(0, n).join(' ') : '');
  const top = (title, back = '#/', right = null) => A.h('div', { class: 'pagetop ttop' }, A.h('a', { class: 'btn iconbtn', href: back, 'aria-label': 'Back' }, '‹'), A.h('h1', {}, title), right);
  const chip = (label, on, onclick) => A.h('button', { type: 'button', class: `chip ${on ? 'active' : 'off'}`, onclick }, label);
  const rate = (r, cls = '') => A.h('span', { class: `rate ${r} ${cls}` }, T.RATING_WORDS[r]);
  // The two-line heading of a number: "15/6  The Enchanter  · what it is".
  const bigNum = (v, note) => A.h('div', { class: 'bignum' }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v)), note ? A.h('span', { class: 'ty' }, note) : null);
  // A sheet with everything the books say about one number in one position. Tap anywhere outside to close.
  async function numberSheet(v, pos, extra) {
    const [R, B] = await Promise.all([readings(), bizwords()]);
    const n = v.sum, name = nameOf(v);
    const parts = [];
    const para = (t) => (t ? String(t).split('\n\n').map((p) => A.h('p', {}, p)) : []);
    const head = (t) => A.h('div', { class: 'muted small', style: 'margin:10px 0 2px;text-transform:uppercase;letter-spacing:.06em' }, t);
    if (pos === 'dv' && R.dayVibration && R.dayVibration[n]) parts.push(head('Day vibration · ' + R.dayVibration[n].keywords), ...para(R.dayVibration[n].text));
    if (pos === 'lp' && R.lifePath && R.lifePath[n]) parts.push(head('Essence of the day · ' + R.lifePath[n].keywords), ...para(R.lifePath[n].text));
    if (pos === 'dvlp' && R.dvlp && R.dvlp[n]) parts.push(head('Natural talent · ' + R.dvlp[n].keywords), ...para(R.dvlp[n].text));
    if (pos === 'outer' && R.outer && R.outer[n]) { const o = R.outer[n]; parts.push(head('Aura of the day'), ...para(o['Aura of the Day']), head('How to act today'), ...para(o['How to Act Today'])); }
    if (pos === 'inner' && R.inner && R.inner[n]) { const o = R.inner[n]; parts.push(head('Inner weather'), ...para(o['Inner Weather']), head('Inner success codes'), ...para(o['Inner Success Codes'])); }
    if (pos === 'target' && R.target && R.target[n]) { const o = R.target[n]; parts.push(head('Alignment'), ...para(o['Alignment Vector']), head('Fastest bridge'), ...para(o['Fastest Bridge'])); }
    const about = (R.outer && R.outer[n] && R.outer[n].about) || (R.inner && R.inner[n] && R.inner[n].about) || (R.target && R.target[n] && R.target[n].about) || null;
    if (about) parts.push(head(`About ${v.text}`), ...para(about));
    if (N.MEANINGS[n]) parts.push(head('In the year rows'), A.h('p', {}, N.MEANINGS[n]));
    if (!parts.length && n < 10 && R.dayVibration && R.dayVibration[n]) parts.push(head(R.dayVibration[n].keywords), ...para(R.dayVibration[n].text));
    const kind = T.codeKind(n), group = kind ? codeGroup(R, n, kind) : null;
    if (group) parts.push(head(`Success code · ${group.name}`), A.h('p', {}, group.text));
    parts.push(...bizParts(B, n, head));
    if (!parts.length) parts.push(A.h('p', { class: 'muted' }, 'The books have no page for this number in this place yet.'));
    return A.sheet(A.h('div', { class: 'numsheet' }, A.h('h3', {}, `${v.text} ${name}`), kind ? A.h('div', { class: 'codes' }, A.h('span', { class: kind === 'avoid' || kind === 'care' ? 'warn' : kind === 'soft' ? 'soft' : '' }, T.CODE_WORDS[kind])) : null, extra || null, ...parts));
  }
  // What the business books say about a number 1-99: The Numbers 10-99 in Business (with its color code), the
  // summary of its family for 1-9, and the general meaning from Numbers Overview 1-99.
  function bizParts(B, n, head) {
    const out = [], b = B.business && B.business[n], fam = B.businessFamilies && B.businessFamilies[n < 10 ? n : 0], o = B.overview && B.overview[n];
    if (b) out.push(head(`In business · ${b.name}${b.color && BIZ_COLOR_WORD[b.color] ? ' · ' + BIZ_COLOR_WORD[b.color] : ''}`), A.h('p', {}, b.text), b.warn ? A.h('p', { class: 'warnline' }, '⚠ ' + b.warn) : null,
      b.color && B.businessColors && B.businessColors[b.color] ? A.h('p', { class: 'muted small' }, `${BIZ_COLOR_WORD[b.color]}: ${B.businessColors[b.color]}.`) : null);
    if (fam) out.push(head(`In business · the ${n} numbers · ${fam.title}`), A.h('p', {}, fam.text));
    if (o) out.push(head(`The number · ${o.name}`), A.h('p', {}, o.text));
    return out.filter(Boolean);
  }
  const POS_WORDS = { dv: 'Day Vibration', lp: 'Essence of the Day', bigLp: 'Big Essence', outer: 'Outer Diamond · Day + Month', inner: 'Inner Diamond · Day + Year', dvlp: 'Natural Talent · Day + Essence', dharma: 'Dharma of the Month · Month + Year', target: 'Target Number · Day + Dharma' };
  const POS_INTRO = { dv: 'The main vibration of the day and where to focus your attention.', lp: 'The emotional energy of the day: what inspiration you receive and how you feel.', outer: 'The day\'s radiance and action: what kind of actions are best to take.', inner: 'The day\'s inner motivation and drive: how the mind, thoughts and emotions work.', dvlp: 'How to connect to the greatest flow, creativity and productivity of the day.', dharma: 'The same for the whole month: the qualities you need to awaken to be successful.', target: 'The day\'s portal to success: the one adjustment that aligns your tone with the day.' };

  // The essence chart and the two psyche charts of a date, drawn exactly like the quick chart's.
  function dateCharts(y, m, d, withPsyche) {
    const data = N.numeroscope({ day: String(d), month: String(m), year: String(y), name: '' });
    const svg = A.numeroscopeSvg(data);
    svg.classList.add('hide-c-main', 'hide-c-vow', 'hide-c-con', 'daychart');
    if (!withPsyche) svg.classList.add('hide-c-psy');
    // The day vibration is drawn at the top of the name chart, which is hidden here, so a copy of it sits
    // under the cube's point: the paid tool's Today page shows the day there (Forecasting p. 23).
    const dayNode = svg.querySelector('[data-chart=main] text.k-day');
    if (dayNode) svg.append(dayNode.cloneNode(true));
    // Essence only: crop to the cube and the day under it so it fills a small grid cell; with the psyche
    // charts, the full width.
    svg.setAttribute('viewBox', withPsyche ? `${371 - 425} 20 850 540` : `${371 - 215} 24 430 330`);
    return svg;
  }
  // Why the date is rated as it is: the rule's own reasons, in the course's words.
  const WHY_WORDS = { super: 'Why a Super Date', good: 'Why only a Good Date', beware: 'Why Beware' };
  // With the book's words loaded, the box also says what a day of that color is for (Cosmic Calendar p. 288).
  const whyBox = (e, R) => { const use = R && R.ratings && R.ratings[e.rating];
    return A.h('div', { class: 'why ' + e.rating }, A.h('div', { class: 'head' }, A.h('span', { class: `rate ${e.rating}` }, T.RATING_WORDS[e.rating]), A.h('span', { class: 'pos' }, WHY_WORDS[e.rating])),
      use ? A.h('p', { class: 'use' }, `${use.practice}: ${use.light}.`) : null,
      A.h('ul', {}, ...e.reasons.map((r) => A.h('li', {}, r)))); };
  // How to use the day, in the book's words: the outer diamond's "How to Act Today", the inner diamond's "Inner
  // Success Codes (How to Use Your Mind Today)", the target's "Fastest Bridge (What to Do Now)", and the target's
  // one-word adjustment (Superdates pp. 113-200).
  function useDay(e, R, sentences = 2) {
    const o = (R.outer || {})[e.outer.sum], i = (R.inner || {})[e.inner.sum], t = (R.target || {})[e.target.sum], q = (R.quality || {})[e.target.ds];
    const item = (label, text, v, pos) => (text ? A.h('div', { class: 'useitem', onclick: () => numberSheet(v, pos) }, A.h('b', {}, label), A.h('p', {}, snippet(text, sentences))) : null);
    if (!o && !i && !t) return null;
    return A.h('div', { class: 'reading useday' },
      A.h('div', { class: 'head' }, A.h('b', {}, 'How to Use the Day'), q ? A.h('span', { class: 'pos' }, 'Your Adjustment: ', A.h('span', { class: 'qword' }, q[0].toUpperCase() + q.slice(1))) : null),
      item('How to Act', o && o['How to Act Today'], e.outer, 'outer'),
      item('How to Use Your Mind', i && i['Inner Success Codes'], e.inner, 'inner'),
      item('What to Do Now', t && t['Fastest Bridge'], e.target, 'target'));
  }
  // The ruler of the day (Cosmic Calendar pp. 51-108): its chapter's title words, keywords and business themes, and
  // Pluto's undertone on days of 9, 18, 27 or with a 0 (p. 104). Tap for the chapter's numerology part.
  function rulerSheet(R, planet) {
    const r = (R.ruler || {})[planet]; if (!r) return;
    const head = (t) => A.h('div', { class: 'muted small', style: 'margin:10px 0 2px;text-transform:uppercase;letter-spacing:.06em' }, t);
    A.sheet(A.h('div', { class: 'numsheet' }, A.h('h3', {}, planet), A.h('p', {}, A.h('b', {}, r.title)), A.h('p', { class: 'kw' }, r.keywords),
      head('The Planet of the Day'), A.h('p', {}, plain(r.essence)), r.link ? A.h('p', {}, r.link) : null, r.dates ? A.h('p', {}, plain(r.dates)) : null,
      head('Business Themes'), A.h('ul', {}, ...r.themes.map((x) => A.h('li', {}, x)))));
  }
  function rulerCard(e, R) {
    const r = (R.ruler || {})[e.ruler]; if (!r) return null;
    const pluto = T.plutoUndertone(e.dv) && R.ruler.Pluto;
    return A.h('div', { class: 'reading', onclick: () => { A.count('today.ruler'); rulerSheet(R, e.ruler); } },
      A.h('div', { class: 'head' }, A.h('b', {}, e.ruler), A.h('span', { class: 'nm' }, r.title), A.h('span', { class: 'pos' }, 'Ruler of the Day')),
      A.h('p', { class: 'kw' }, r.keywords),
      A.h('ul', { class: 'themes' }, ...r.themes.map((x) => A.h('li', {}, x))),
      pluto ? A.h('p', { class: 'muted small', onclick: (ev) => { ev.stopPropagation(); rulerSheet(R, 'Pluto'); } }, `Pluto undertone (a day of ${e.dv.text}): ${R.ruler.Pluto.keywords}. Tap for Pluto.`) : null);
  }
  // A company started on this date (Business Manual pp. 12-18): its day vibration as a business, and the essence.
  function companyCard(e, B) {
    const c = (B.companyDay || {})[e.dv.ds], l = (B.companyDay || {})[e.lp.ds]; if (!c) return null;
    const head = (t) => A.h('div', { class: 'muted small', style: 'margin:10px 0 2px;text-transform:uppercase;letter-spacing:.06em' }, t);
    const full = () => { A.count('today.company'); A.sheet(A.h('div', { class: 'numsheet' }, A.h('h3', {}, 'A Company Started This Day'),
      head(`Day vibration ${e.dv.ds} · a ${e.dv.ds} business`), A.h('p', {}, plain(c.head)), A.h('p', { class: 'kw' }, c.keywords), head('Examples'), A.h('p', {}, plain(c.examples)), c.contra ? A.h('p', { class: 'warnline' }, '⚠ ' + plain(c.contra)) : null, head('Who?'), A.h('p', {}, plain(c.who)),
      l && e.lp.ds !== e.dv.ds ? [head(`Essence ${e.lp.ds} · a ${e.lp.ds} business`), A.h('p', {}, plain(l.head)), A.h('p', { class: 'kw' }, l.keywords)] : null)); };
    return A.h('div', { class: 'reading', onclick: full },
      A.h('div', { class: 'head' }, A.h('b', {}, String(e.dv.ds)), A.h('span', { class: 'nm' }, 'Business'), A.h('span', { class: 'pos' }, 'A Company Started This Day')),
      A.h('p', {}, plain(c.head) + '.'), A.h('p', { class: 'kw' }, c.keywords));
  }
  const psyToggle = (on, onclick) => A.h('button', { type: 'button', class: 'psytog', onclick }, on ? 'Hide Psyche Charts' : 'Show Psyche Charts');

  // ---------- the day's scene: a real photo of the ruler of the day over a starry sky (the paid tool's Today page) ----------
  // NASA photographs (public domain), cropped to the disk and kept small in public/planets/: the Sun by SDO,
  // the Moon by LRO, Mercury by MESSENGER, Venus by Mariner 10, Mars and Jupiter by Hubble and Cassini,
  // Saturn by Cassini, Uranus and Neptune by Voyager 2. Each sits on the sky with a screen blend, so the
  // photo's black background disappears. The sky: star dust, mid stars, a few bright ones with a glint, a
  // Milky Way band and a nebula in the ruler's tint, all seeded by the date so a day always looks the same.
  // The essence (life path) has its own, smaller planet high in the sky.
  function planetScene(e, h = 200, { compact = false } = {}) {
    const sv = A.sv, W = 390;
    const planet = e.ruler, key = planet.toLowerCase(), tint = TINTS[planet] || TINTS.Venus;
    const id = 'sc' + h;
    const svg = sv('svg', { viewBox: `0 0 ${W} ${h}`, class: 'scene', role: 'img', 'aria-label': `Ruler of the day ${planet}, essence ${e.essenceRuler}` });
    const defs = sv('defs', {},
      sv('linearGradient', { id: id + 'sky', x1: 0, y1: 0, x2: 1, y2: 1 }, sv('stop', { offset: 0, 'stop-color': '#04060f' }), sv('stop', { offset: 0.55, 'stop-color': '#0b1024' }), sv('stop', { offset: 1, 'stop-color': '#180f2c' })),
      sv('linearGradient', { id: id + 'mw', x1: 0, y1: 0, x2: 0, y2: 1 }, sv('stop', { offset: 0, 'stop-color': '#c8d0f0', 'stop-opacity': 0 }), sv('stop', { offset: 0.5, 'stop-color': '#c8d0f0', 'stop-opacity': 0.14 }), sv('stop', { offset: 1, 'stop-color': '#c8d0f0', 'stop-opacity': 0 })),
      sv('radialGradient', { id: id + 'neb', cx: 0.5, cy: 0.5, r: 0.5 }, sv('stop', { offset: 0, 'stop-color': tint, 'stop-opacity': 0.26 }), sv('stop', { offset: 1, 'stop-color': tint, 'stop-opacity': 0 })),
      sv('radialGradient', { id: id + 'neb2', cx: 0.5, cy: 0.5, r: 0.5 }, sv('stop', { offset: 0, 'stop-color': '#5a46a0', 'stop-opacity': 0.3 }), sv('stop', { offset: 1, 'stop-color': '#5a46a0', 'stop-opacity': 0 })),
      sv('radialGradient', { id: id + 'glint' }, sv('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.9 }), sv('stop', { offset: 0.3, 'stop-color': '#dce6ff', 'stop-opacity': 0.35 }), sv('stop', { offset: 1, 'stop-color': '#dce6ff', 'stop-opacity': 0 })));
    svg.append(defs, sv('rect', { x: 0, y: 0, width: W, height: h, fill: `url(#${id}sky)` }));
    svg.append(sv('rect', { x: -W, y: h * 0.4 - 60, width: 3 * W, height: 120, fill: `url(#${id}mw)`, transform: `rotate(-28 ${W * 0.55} ${h * 0.4})` }));
    svg.append(sv('ellipse', { cx: 110, cy: h * 0.55, rx: 190, ry: 120, fill: `url(#${id}neb)` }), sv('ellipse', { cx: 300, cy: h * 0.2, rx: 170, ry: 80, fill: `url(#${id}neb2)` }));
    let seed = e.y * 10000 + e.m * 100 + e.d;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const size = planet === 'Saturn' ? h * 1.2 : h * 0.84, cx = planet === 'Saturn' ? 92 : 88, cy = h / 2;
    const eKey = e.essenceRuler.toLowerCase(), eSize = e.essenceRuler === 'Saturn' ? 80 : 56, ex = W - 66, ey = 40;
    const clear = (x, y) => Math.hypot(x - cx, y - cy) < size * (planet === 'Saturn' ? 0.42 : 0.44) || Math.hypot(x - ex, y - ey) < eSize * 0.5;
    const star = (x, y, r, fill, o) => svg.append(sv('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r, fill, opacity: o }));
    for (let i = 0; i < 260; i++) { const x = rnd() * W, y = rnd() * h; if (clear(x, y)) continue; star(x, y, (0.25 + rnd() * 0.35).toFixed(2), '#fff', (0.15 + rnd() * 0.35).toFixed(2)); }
    for (let i = 0; i < 80; i++) { const x = rnd() * W, y = rnd() * h, t = rnd(); if (clear(x, y)) continue; star(x, y, (0.5 + rnd() * 0.8).toFixed(2), t > 0.8 ? '#cfdbff' : t > 0.6 ? '#fff1dc' : '#fff', (0.55 + rnd() * 0.45).toFixed(2)); }
    for (let i = 0; i < 7; i++) { const x = rnd() * W, y = rnd() * h, r = 1.2 + rnd() * 0.8; if (clear(x, y)) continue;
      svg.append(sv('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (r * 5).toFixed(1), fill: `url(#${id}glint)` }), sv('path', { d: `M${(x - r * 4).toFixed(1)} ${y.toFixed(1)}H${(x + r * 4).toFixed(1)}M${x.toFixed(1)} ${(y - r * 4).toFixed(1)}V${(y + r * 4).toFixed(1)}`, stroke: '#fff', 'stroke-width': 0.6, opacity: 0.6 })); }
    // the photos: the ruler of the day, and the essence's planet small and high
    svg.append(sv('image', { href: `/planets/${key}.webp`, x: cx - size / 2, y: cy - size / 2, width: size, height: size, class: 'planet', preserveAspectRatio: 'xMidYMid meet' }));
    svg.append(sv('image', { href: `/planets/${eKey}.webp`, x: ex - eSize / 2, y: ey - eSize / 2, width: eSize, height: eSize, class: 'planet', preserveAspectRatio: 'xMidYMid meet' }));
    const t = (x, y, str, fs, cls, anchor) => sv('text', { x, y, 'font-size': fs, class: cls, 'text-anchor': anchor || 'start' }, str);
    svg.append(t(W - 14, ey + eSize / 2 + 10, `ESSENCE ${e.lp.text} · ${e.essenceRuler.toUpperCase()}`, 9, 'sc-label', 'end'));
    if (compact) { // the banner on Today: only the ruler; the number and the rating sit in the row under it
      svg.append(t(170, cy + 14, 'RULER OF THE DAY', 9.5, 'sc-label'), t(170, cy + 40, planet, 24, 'sc-day'));
      return svg;
    }
    const tx = 178, ty = cy + 30;
    svg.append(t(tx, ty - 22, 'RULER OF THE DAY', 9.5, 'sc-label'), t(tx, ty, planet, 22, 'sc-day'), t(tx, ty + 22, `${e.dv.text} ${nameOf(e.dv)}`, 14, 'sc-num'));
    const word = T.RATING_WORDS[e.rating], pw = word.length * 6.6 + 16;
    svg.append(sv('rect', { x: tx, y: ty + 33, width: pw, height: 20, rx: 10, class: 'sc-pill ' + e.rating }), t(tx + pw / 2, ty + 47, word, 10.5, 'sc-pilltext ' + e.rating, 'middle'));
    return svg;
  }
  // A day full screen: the scene, the essence and psyche charts edge to edge, ‹ › to the days around it.
  function dayFull(date, { onReadings } = {}) {
    let cur = date;
    const psyche = { on: recall('toolsPsyche', true) };
    const $box = A.h('div', {}), $title = A.h('h1', {});
    const close = () => { $pop.remove(); A.overlayGone($pop); document.body.classList.remove('noscroll'); window.removeEventListener('keydown', keys); };
    const keys = (ev) => { if (ev.key === 'Escape') close(); if (ev.key === 'ArrowLeft') move(-1); if (ev.key === 'ArrowRight') move(1); };
    const draw = () => {
      const e = T.dayEnergy(cur.y, cur.m, cur.d); if (!e) return;
      $pop.style.setProperty('--tint', TINTS[e.ruler] || TINTS.Venus);
      $title.textContent = `${DOW[e.weekday].slice(0, 3)}, ${MON[cur.m - 1]} ${cur.d}, ${cur.y}`;
      // The book's words for the day arrive with readings.js; until then the day shows without them.
      const R = root.Readings || null;
      if (!R) readings().then(() => { if (document.body.contains($pop)) draw(); });
      const guide = R && R.planetGuide && R.planetGuide[e.ruler];
      A.fill($box, planetScene(e, 200),
        A.h('div', { class: 'nscope-box' }, dateCharts(cur.y, cur.m, cur.d, psyche.on)),
        A.h('div', { class: 'under' }, psyToggle(psyche.on, () => { psyche.on = !psyche.on; remember('toolsPsyche', psyche.on); draw(); })),
        whyBox(e, R),
        R && R.dayVibration && R.dayVibration[e.dv.sum] ? A.h('p', { class: 'daykw' }, `${e.dv.text} ${nameOf(e.dv)} · ${R.dayVibration[e.dv.sum].keywords}`) : null,
        guide ? A.h('p', { class: 'daykw muted' }, `Ruler ${e.ruler}: ${guide.role}`) : null,
        R ? useDay(e, R, 1) : null,
        A.h('button', { type: 'button', class: 'btn btn-block readbtn', onclick: () => { close(); if (onReadings) onReadings(cur); else A.go(`#/today/${iso(cur.y, cur.m, cur.d)}`); } }, 'Readings for This Day ›'));
    };
    const move = (by) => { cur = shift(cur, by); A.count('dayfull.move'); draw(); };
    const $pop = A.h('div', { class: 'wordpop dayfull' },
      A.h('div', { class: 'pagetop ttop' }, A.h('button', { type: 'button', class: 'btn iconbtn', 'aria-label': 'Close', onclick: close }, '‹'), A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Previous day', onclick: () => move(-1) }, '‹'), $title, A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Next day', onclick: () => move(1) }, '›')),
      $box);
    A.overlay($pop, close); document.body.append($pop); document.body.classList.add('noscroll'); window.addEventListener('keydown', keys);
    draw();
  }

  // ---------- Today (one date's energy) ----------
  function todayView(arg) {
    const now = todayIn();
    let date = parseIso(arg) || now;
    const psyche = { on: recall('toolsPsyche', true) };
    const $title = A.h('h1', {}), $sub = A.h('div', { class: 'tsub muted small' }), $body = A.h('div', {});
    const $date = A.h('input', { type: 'date', class: 'datebox', 'aria-label': 'Date' });
    $date.addEventListener('change', () => { const p = parseIso($date.value); if (p) { date = p; draw(); } });
    // What the book says about this number in this position: keywords and the first sentences.
    const bookBits = (R, pos, v) => {
      const n = v.sum, D = (o) => o || {};
      switch (pos) {
        case 'dv': return { kw: D(R.dayVibration && R.dayVibration[n]).keywords, text: D(R.dayVibration && R.dayVibration[n]).text };
        case 'lp': return { kw: D(R.lifePath && R.lifePath[n]).keywords, text: D(R.lifePath && R.lifePath[n]).text };
        case 'outer': return { text: D(R.outer && R.outer[n])['Aura of the Day'] };
        case 'inner': return { text: D(R.inner && R.inner[n])['Inner Weather'] };
        case 'dvlp': return { kw: D(R.dvlp && R.dvlp[n]).keywords, text: D(R.dvlp && R.dvlp[n]).text };
        case 'dharma': return { text: D(R.outer && R.outer[n]).about || N.MEANINGS[v.ds] };
        case 'target': return { text: D(R.target && R.target[n])['Alignment Vector'] };
        default: return {};
      }
    };
    const draw = async () => {
      const e = T.dayEnergy(date.y, date.m, date.d);
      $date.value = iso(date.y, date.m, date.d);
      if (!e) { A.fill($body, A.h('p', { class: 'err' }, 'That is not a real date.')); return; }
      day();
      const isToday = date.y === now.y && date.m === now.m && date.d === now.d;
      $title.textContent = `${DOW[e.weekday].slice(0, 3)}, ${MON[date.m - 1]} ${date.d}, ${date.y}`;
      $sub.textContent = isToday ? 'Today in Arizona' : 'Tap the date to come back to today';
      const [R, B] = await Promise.all([readings(), bizwords()]);
      const row = (pos, v) => {
        const b = bookBits(R, pos, v);
        return A.h('div', { class: 'reading', onclick: () => numberSheet(v, pos) },
          A.h('div', { class: 'head' }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v)), A.h('span', { class: 'pos' }, POS_WORDS[pos])),
          b.kw ? A.h('p', { class: 'kw' }, b.kw) : null,
          A.h('p', {}, b.text ? snippet(b.text, pos === 'target' ? 3 : 2) : POS_INTRO[pos]),
          pos === 'lp' ? A.h('p', { class: 'muted small', style: 'margin-top:4px' }, `Big essence ${e.bigLp.text} ${nameOf(e.bigLp)}.`) : null);
      };
      A.fill($body,
        A.h('div', { class: 'scenebox', onclick: () => { A.count('today.full'); dayFull(date); } }, planetScene(e, 150, { compact: true })),
        A.h('div', { class: 'dayhead', onclick: () => numberSheet(e.dv, 'dv') }, A.h('b', {}, e.dv.text), A.h('span', { class: 'nm' }, nameOf(e.dv)), A.h('span', { class: `rate ${e.rating}` }, T.RATING_WORDS[e.rating])),
        A.h('div', { class: 'nscope-box', role: 'button', 'aria-label': 'Full screen', onclick: () => { A.count('today.full'); dayFull(date); } }, dateCharts(date.y, date.m, date.d, psyche.on)),
        A.h('div', { class: 'under' }, A.h('span', { class: 'muted small' }, 'Tap the chart for full screen'), psyToggle(psyche.on, () => { psyche.on = !psyche.on; remember('toolsPsyche', psyche.on); A.count('today.psyche'); draw(); })),
        whyBox(e, R),
        useDay(e, R),
        rulerCard(e, R),
        row('dv', e.dv), row('lp', e.lp), row('outer', e.outer), row('inner', e.inner), row('dvlp', e.dvlp), row('dharma', e.dharma), row('target', e.target),
        companyCard(e, B),
        A.h('p', { class: 'muted small', style: 'margin:8px 2px' }, 'Tap a number for the book\'s whole page. Super, Good and Beware follow the success codes and the numbers to avoid in "Success Codes & Superdates"; the ruler of the day and what each color is for come from the "Superdates Cosmic Calendar"; a company started this day from the "Business Manual".'));
    };
    A.render(A.h('div', { class: 'screen qscreen tscreen' },
      A.h('div', { class: 'pagetop ttop' }, A.h('a', { class: 'btn iconbtn', href: '#/', 'aria-label': 'Back' }, '‹'), A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Previous day', onclick: () => { date = shift(date, -1); draw(); } }, '‹'), $title, A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Next day', onclick: () => { date = shift(date, 1); draw(); } }, '›'), A.h('a', { class: 'btn iconbtn', href: '#/coming', 'aria-label': 'Coming Days', title: 'Coming Days' }, '▦')),
      A.h('div', { class: 'row ynav tnav' }, $date, $sub),
      $body));
    draw();
  }

  // ---------- Coming Days: a grid of the days' charts, super dates labelled, tap for full screen ----------
  function comingView(arg) {
    const now = todayIn();
    let start = parseIso(arg) || now;
    // How many charts across: − and + change it and the device remembers (owner 2026-10-16: two across was still
    // too big, one across never used, the list of numbers useless). Phones go up to 5 across, wide screens further.
    const wide = window.innerWidth >= 700;
    const MIN_COLS = 2, MAX_COLS = window.innerWidth >= 1000 ? 8 : wide ? 6 : 5;
    const clampCols = (c) => Math.min(MAX_COLS, Math.max(MIN_COLS, Number(c) || 0));
    const view = { superOnly: false, psyche: recall('comingPsyche', false), cols: clampCols(recall('comingCols', wide ? 4 : 3)) };
    const $body = A.h('div', {}), $chips = A.h('div', { class: 'togglerow' });
    const $date = A.h('input', { type: 'date', class: 'datebox', 'aria-label': 'First day' });
    $date.addEventListener('change', () => { const p = parseIso($date.value); if (p) { start = p; draw(); } });
    const open = (e) => { A.count('coming.open_day'); dayFull({ y: e.y, m: e.m, d: e.d }); };
    const isToday = (e) => e.y === now.y && e.m === now.m && e.d === now.d;
    const setCols = (c) => { view.cols = clampCols(c); remember('comingCols', view.cols); A.count('coming.size'); draw(); };
    const draw = () => {
      $date.value = iso(start.y, start.m, start.d);
      day();
      A.fill($chips, chip('Super Dates Only', view.superOnly, () => { view.superOnly = !view.superOnly; A.count('coming.super_only'); draw(); }),
        chip('Psyche Charts', view.psyche, () => { view.psyche = !view.psyche; remember('comingPsyche', view.psyche); draw(); }),
        A.h('span', { class: 'sizectl', role: 'group', 'aria-label': 'Chart size' },
          A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Smaller charts', disabled: view.cols >= MAX_COLS, onclick: () => setCols(view.cols + 1) }, '−'),
          A.h('span', { class: 'small' }, 'Size'),
          A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Bigger charts', disabled: view.cols <= MIN_COLS, onclick: () => setCols(view.cols - 1) }, '+')));
      let days = T.comingDays(start.y, start.m, start.d, 31).filter(Boolean);
      if (view.superOnly) days = days.filter((e) => e.rating === 'super');
      if (!days.length) { A.fill($body, A.h('p', { class: 'muted' }, 'No Super Dates in these 31 days. Try the next month.')); return; }
      const c = view.cols, tight = c >= 3;
      A.fill($body, A.h('div', { class: 'minis', 'data-cols': String(c), style: `grid-template-columns: repeat(${c}, minmax(0, 1fr))` }, ...days.map((e) => A.h('div', { class: 'mini' + (isToday(e) ? ' today' : '') + (e.rating === 'super' ? ' super' : ''), role: 'button', onclick: () => open(e) },
        A.h('div', { class: 'mhead' }, A.h('span', { class: 'd' }, tight ? `${MON[e.m - 1]} ${e.d}` : `${DOW[e.weekday].slice(0, 3)} ${MON[e.m - 1]} ${e.d}`), A.h('span', { class: `rate ${e.rating}` }, T.RATING_WORDS[e.rating].replace(/ Date$/, ''))),
        // Only the date, the rating and the chart on a card (owner 2026-10-19): no day vibration name, no
        // essence / outer / inner line, no keywords. The full-screen day has the words.
        dateCharts(e.y, e.m, e.d, view.psyche)))));
    };
    A.render(A.h('div', { class: 'screen qscreen tscreen wide' }, top('Coming Days', '#/', A.h('a', { class: 'btn iconbtn', href: '#/today', 'aria-label': 'Today', title: 'Today' }, '☀')),
      $chips,
      A.h('div', { class: 'row ynav tnav' }, A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'A month earlier', onclick: () => { start = shift(start, -31); draw(); } }, '‹'), $date, A.h('span', { class: 'muted small' }, '31 days'), A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'A month later', onclick: () => { start = shift(start, 31); draw(); } }, '›')),
      $body,
      A.h('p', { class: 'muted small', style: 'margin:10px 2px' }, 'Tap a day for full screen and the reasons. Super, Good and Beware follow the success codes and the numbers to avoid in "Success Codes & Superdates".')));
    draw();
  }

  // ---------- the big diamond drawing (Number Fun, Relationship), laid out like the book's Number Fun page ----------
  // One level is one wide band: outer life on the left, inner life on the right, the main diamond in the
  // middle, the outer and inner diamonds at the lower corners, the two unbalanced ones small above them.
  // Triangles are drawn the book's way: thin blue outline, the two digits outside the top corners, the
  // auras outside the sides, the center in a circle, the life expression under the point, the archetype
  // name in small blue inside the top. Measured on The Diamond Method p. 35.
  // One triangle, drawn as the paid tool's Number Fun page draws it (the owner's screenshot, 2026-10-19): a thin
  // blue outline, the two digits outside the top corners, the archetype name in gold inside the top, the center in
  // a thin circle, the auras outside the sides, the life expression under the point. Every number is blue except on
  // the physical main diamond (opts.dark: dark gray, as the tool draws it). An unbalanced diamond's name is red.
  function tri(svg, d, cx, topY, w, opts = {}) {
    const sv = A.sv, hh = w * 0.72, floor = opts.minFont || 6.5, fk = opts.fontK || 1;
    const g = sv('g', { class: 'tri' + (opts.dark ? ' dark' : '') + (opts.unbalanced ? ' unb' : ''), role: 'button', 'aria-label': `${d.text} ${d.name}` });
    g.append(sv('polygon', { points: `${cx - w / 2},${topY} ${cx + w / 2},${topY} ${cx},${topY + hh}`, fill: 'none', stroke: '#2788c7', 'stroke-width': w > 120 ? 2.4 : w > 60 ? 1.6 : w > 30 ? 1 : 0.6 }));
    const f = (k) => Math.max(floor, w * k * fk);
    const t = (x, y, s, size, cls, anchor) => sv('text', { x, y, 'font-size': size, 'text-anchor': anchor || 'middle', class: cls || '' }, s);
    // A long corner text (Relationship: "John 25/7") shrinks so it stays beside its corner.
    const cornerF = (txt) => f(0.18) * Math.min(1, Math.max(0.45, 4 / String(txt).length));
    const aT = opts.aText || String(d.a), bT = opts.bText || String(d.b);
    g.append(t(cx - w / 2 - 3, topY - 3, aT, cornerF(aT), 'bold', 'end'), t(cx + w / 2 + 3, topY - 3, bT, cornerF(bT), 'bold', 'start'));
    const nm = opts.name !== undefined ? opts.name : d.name;
    if (nm && w >= 44) g.append(t(cx, topY + f(0.1) + 3, nm, Math.min(f(0.095), (w * 0.86) / (nm.length * 0.58)), opts.unbalanced ? 'name unb' : opts.dark ? 'name dark' : 'name'));
    const ccy = topY + hh * 0.44, r = w * 0.155 * (1 + (fk - 1) * 0.5); // bigger numbers (the grid's main row) get a somewhat bigger circle
    g.append(sv('circle', { cx, cy: ccy, r, fill: 'none', stroke: '#2788c7', 'stroke-width': w > 120 ? 1.6 : w > 30 ? 1 : 0.5 }), t(cx, ccy + f(0.12) * 0.36, d.center.text, f(fk > 1 ? 0.11 : 0.12), 'bold'));
    // The auras sit outside the sides: the gap is measured where the text is tallest, at its top, where the
    // triangle is wider than at the baseline.
    const sideY = topY + hh * 0.64, auraF = f(0.14), sideX = (w / 2) * (1 - (sideY - auraF * 0.72 - topY) / hh) + 3;
    g.append(t(cx - sideX - 2, sideY, d.outer.text, auraF, 'bold', 'end'), t(cx + sideX + 2, sideY, d.inner.text, auraF, 'bold', 'start'));
    g.append(t(cx, topY + hh + f(0.17) + 1, d.le.text, f(0.17), 'bold'));
    if (opts.onTap) g.addEventListener('click', () => opts.onTap(d));
    svg.append(g);
    return topY + hh + f(0.17) + 4;
  }
  // One level of the big diamond as one band, laid out like the paid tool's page (measured on the owner's
  // screenshot, 2026-10-19, as fractions of the page width): the main diamond in the middle, the outer and inner
  // diamonds low at the sides, the two imbalanced ones small above them, the labels beside them in gray (pink for
  // the imbalanced), the left half (outer life) a touch lighter than the right (inner life). The physical band is
  // the biggest; the emotional and spiritual ones are smaller and pulled in toward the middle, as on the tool's page.
  const BANDS = {
    main: { main: 110, side: 66, unb: 41, top: 32, sideTop: 62, unbTop: 10, sideX: 0.135, unbX: 0.24, bg: ['#cfdbe7', '#c0d1e1'], title: 'PHYSICAL', label: 'main diamond', side_: ['diamond'], unb_: ['imbalanced', 'diamond'] },
    essence: { main: 90, side: 54, unb: 33, top: 30, sideTop: 54, unbTop: 8, sideX: 0.21, unbX: 0.28, bg: ['#dee7ee', '#cfdbe7'], title: 'EMOTIONAL', label: 'essence diamond', side_: ['essence', 'diamond'], unb_: ['imbalanced', 'essence diamond'] },
    integration: { main: 62, side: 40, unb: 26, top: 38, sideTop: 52, unbTop: 8, sideX: 0.28, unbX: 0.33, bg: ['#edf2f6', '#dee7ee'], title: 'SPIRITUAL', label: 'integration diamond', side_: ['integration', 'diamond'], unb_: ['imbalanced', 'integration diamond'] },
  };
  function levelSvg(d, lv, labels, onTap) {
    const sv = A.sv, W = 390, K = BANDS[lv], dark = lv === 'main';
    const svg = sv('svg', { class: 'dia band', role: 'img' });
    const lab = (x, y, s, cls, anchor, size) => svg.append(sv('text', { x, y, 'font-size': size || 9, class: cls || 'lab', 'text-anchor': anchor || 'middle' }, s));
    const lines = (x, y0, words, cls, anchor, size, lh) => words.forEach((wd, i) => lab(x, y0 + i * lh, wd, cls, anchor, size));
    const bottoms = [];
    bottoms.push(tri(svg, d, W / 2, K.top, K.main, { onTap, dark, minFont: 5, aText: labels.aText, bText: labels.bText, name: labels.mainName }));
    lab(W / 2, K.top - 13, labels.mainLabel || K.label);
    const sideCx = Math.round(W * K.sideX);
    bottoms.push(tri(svg, d.outerD, sideCx, K.sideTop, K.side, { onTap, minFont: 5 }), tri(svg, d.innerD, W - sideCx, K.sideTop, K.side, { onTap, minFont: 5 }));
    // "outer diamond" beside the outer diamond's life expression, a word a line, as on the tool's page.
    // A label a word a line; a long custom one ("How John Feels It") in two lines.
    const split = (txt) => { const w = txt.split(' '); if (w.length <= 3) return w; const h = Math.ceil(w.length / 2); return [w.slice(0, h).join(' '), w.slice(h).join(' ')]; };
    const sideWords = split(labels.outerLabel || `outer ${K.side_.join(' ')}`), innerWords = split(labels.innerLabel || `inner ${K.side_.join(' ')}`);
    // On the physical band the side diamond sits at the edge, so its label goes below-left beside the life
    // expression; on the upper bands it goes outside the triangle, left of its left corner, never over the auras.
    if (dark) {
      const sideLe = K.sideTop + K.side * 0.72 + K.side * 0.17 - 2;
      lines(sideCx - 18, sideLe - (sideWords.length - 1) * 4.5, sideWords, 'lab', 'end', 8, 9);
      lines(W - sideCx + 18, sideLe - (innerWords.length - 1) * 4.5, innerWords, 'lab', 'start', 8, 9);
    } else {
      const midY = K.sideTop + K.side * 0.3;
      lines(sideCx - K.side / 2 - 10, midY - (sideWords.length - 1) * 4.5, sideWords, 'lab', 'end', 8, 9);
      lines(W - sideCx + K.side / 2 + 10, midY - (innerWords.length - 1) * 4.5, innerWords, 'lab', 'start', 8, 9);
    }
    if (!labels.noUnbalanced) {
      const ux = Math.round(W * K.unbX);
      bottoms.push(tri(svg, d.outerU, ux, K.unbTop, K.unb, { onTap, unbalanced: true, minFont: 4.5 }), tri(svg, d.innerU, W - ux, K.unbTop, K.unb, { onTap, unbalanced: true, minFont: 4.5 }));
      // The pink labels start under the band's title line, so the two never cross.
      lines(ux - K.unb / 2 - 9, 26, [`outer ${K.unb_[0]}`, ...K.unb_.slice(1)], 'lab unb', 'end', 7, 8);
      lines(W - ux + K.unb / 2 + 9, 26, [`inner ${K.unb_[0]}`, ...K.unb_.slice(1)], 'lab unb', 'start', 7, 8);
    }
    const H = Math.max(...bottoms) + (dark ? 20 : 6);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.prepend(sv('rect', { x: 0, y: 0, width: W / 2, height: H, fill: K.bg[0] }), sv('rect', { x: W / 2, y: 0, width: W / 2, height: H, fill: K.bg[1] }));
    lab(8, 15, labels.title || K.title, 'band-title', 'start', 10.5);
    if (labels.right) lab(W - 8, 15, labels.right, 'lab', 'end', 8);
    if (dark) { lab(W / 4, H - 6, 'OUTER LIFE', 'life', 'middle', 9.5); lab((3 * W) / 4, H - 6, 'INNER LIFE', 'life', 'middle', 9.5); }
    return svg;
  }
  function bigDiamondEl(B, onTap, labels = {}) {
    return A.h('div', { class: 'bigd' },
      levelSvg(B.integration, 'integration', { right: labels.spiritual, noUnbalanced: labels.noUnbalanced }, onTap),
      levelSvg(B.essence, 'essence', { right: labels.emotional, noUnbalanced: labels.noUnbalanced }, onTap),
      levelSvg(B.main, 'main', { title: labels.physicalTitle, right: labels.physical, noUnbalanced: labels.noUnbalanced, aText: labels.aText, bText: labels.bText, mainName: labels.mainName, mainLabel: labels.mainLabel, outerLabel: labels.outer, innerLabel: labels.inner }, onTap));
  }

  // ---------- Number Fun ----------
  // One number's whole big diamond, small, for the grid of every number: the paid tool's "10 by 10" page draws
  // seven triangles per cell: the integration diamond on top, the essence diamond with its outer and inner
  // diamonds beside it, the main diamond (bigger, dark) with its outer and inner diamonds beside it.
  // One cell of All Numbers (owner's pick B, 2026-10-19, out of five mock-ups): the number's own three-level
  // page in miniature, tinted bands, gold names, imbalanced diamonds and all, so the grid reads like the page.
  function cellSvg(x) {
    return A.h('div', { class: 'nfmini' }, bigDiamondEl(T.bigDiamond(x), null, {}));
  }
  function numberFunView(arg) {
    light();
    let n = Math.min(99, Math.max(1, Number(arg) || recall('numberFun', 14)));
    // "All Numbers" (owner 2026-10-19, the paid tool's grid page): every number's main diamond at once, as many
    // across as the − / + choose (remembered per device); tap one to open that number. The chip brings the grid back.
    const wide = window.innerWidth >= 700;
    const MIN_COLS = 2, MAX_COLS = 10; // the paid tool's page is 10 by 10; a phone can go there too, the − / + choose
    const clampCols = (c) => Math.min(MAX_COLS, Math.max(MIN_COLS, Number(c) || 0));
    const view = { grid: !!recall('numberFunGrid', false), cols: clampCols(recall('numberFunCols', wide ? 4 : 2)) };
    const $row = A.h('div', { class: 'numrow' }), $body = A.h('div', {}), $chips = A.h('div', { class: 'togglerow' });
    const $in = A.h('input', { type: 'text', inputmode: 'numeric', class: 'numin', maxlength: 2, 'aria-label': 'Number' });
    $in.addEventListener('change', () => { const v = Number($in.value); if (v >= 1 && v <= 99) { n = v; view.grid = false; A.count('numberfun.type'); draw(); } });
    // A tap on a diamond pops its words up from the bottom (owner 2026-10-19: never a new screen, so the page
    // underneath stays put); "Open" in the sheet goes to that number on purpose.
    const jump = async (d) => {
      if (!(d.code >= 1 && d.code <= 99)) return;
      A.count('numberfun.tap_diamond');
      let close = null;
      const $open = A.h('button', { type: 'button', class: 'btn-primary', onclick: () => { if (close) close(); n = d.code; view.grid = false; A.count('numberfun.open_from_sheet'); draw(); window.scrollTo(0, 0); } }, `Open ${T.val(d.code).text} ${d.name}`);
      close = await numberSheet(T.val(d.code), 'about', $open);
    };
    const setCols = (c) => { view.cols = clampCols(c); remember('numberFunCols', view.cols); A.count('numberfun.size'); draw(); };
    const draw = async () => {
      remember('numberFun', n); remember('numberFunGrid', view.grid); $in.value = String(n);
      A.fill($chips, chip('All Numbers', view.grid, () => { view.grid = !view.grid; A.count('numberfun.grid'); draw(); }),
        view.grid ? A.h('span', { class: 'sizectl', role: 'group', 'aria-label': 'Chart size' },
          A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Smaller charts', disabled: view.cols >= MAX_COLS, onclick: () => setCols(view.cols + 1) }, '−'),
          A.h('span', { class: 'small' }, 'Size'),
          A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Bigger charts', disabled: view.cols <= MIN_COLS, onclick: () => setCols(view.cols - 1) }, '+')) : null);
      $row.classList.toggle('hidden', view.grid);
      if (view.grid) {
        // The paid tool's order: a row per ten, the nineties on top, 0 to 9 across (ten across = its page exactly).
        const c = view.cols, order = [];
        for (let tens = 9; tens >= 0; tens--) for (let u = 0; u <= 9; u++) { const x = tens * 10 + u; if (x >= 1) order.push(x); }
        A.fill($body, A.h('div', { class: 'nftable', 'data-cols': String(c), style: `grid-template-columns: repeat(${c}, minmax(0, 1fr))` },
          ...order.map((x) => A.h('div', { class: 'nfc' + (x === n ? ' today' : ''), role: 'button', 'aria-label': `Open ${T.val(x).text}`, onclick: () => { n = x; view.grid = false; A.count('numberfun.tap_cell'); draw(); window.scrollTo(0, 0); } }, cellSvg(x)))),
          A.h('p', { class: 'muted small', style: 'margin:8px 2px' }, 'Every number\u2019s three levels, the nineties on top. Tap one to see it large.'));
        return;
      }
      A.fill($row, ...Array.from({ length: 99 }, (_, i) => i + 1).map((x) => A.h('button', { type: 'button', class: x === n ? 'active' : '', onclick: () => { n = x; draw(); } }, String(x))));
      const active = $row.querySelector('.active'); if (active) active.scrollIntoView({ inline: 'center', block: 'nearest' });
      const B = T.bigDiamond(n), v = T.val(n);
      const R = await readings();
      const about = (R.outer && R.outer[n] && R.outer[n].about) || (R.dayVibration && R.dayVibration[n] && R.dayVibration[n].text) || '';
      const inOthers = n >= 10 ? T.numbersContaining(n) : [];
      A.fill($body,
        A.h('div', { class: 'bignum', onclick: () => numberSheet(v, n < 10 ? 'dv' : 'about') }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v)), A.h('span', { class: 'ty' }, `Ruler ${N.PLANETS[v.ds]}`)),
        bigDiamondEl(B, jump),
        about ? A.h('div', { class: 'reading', onclick: () => numberSheet(v, n < 10 ? 'dv' : 'about') }, A.h('div', { class: 'head' }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v))), A.h('p', {}, about)) : null,
        inOthers.length ? A.h('div', { class: 'reading' }, A.h('div', { class: 'head' }, A.h('span', { class: 'nm' }, `Where ${v.text} Appears in Other Numbers`)), A.h('div', { class: 'chips', style: 'margin-top:6px' }, ...inOthers.map((x) => A.h('button', { type: 'button', class: 'chip', onclick: () => { n = x; A.count('numberfun.tap_other'); draw(); } }, T.val(x).text)))) : null,
        A.h('p', { class: 'muted small', style: 'margin:8px 2px' }, 'Tap any diamond to open that number. The three levels follow the Diamond Method book: the main diamond, the essence diamond made of its two auras, and the integration diamond above that.'));
    };
    A.render(A.h('div', { class: 'screen qscreen tscreen wide' }, top('Number Fun', '#/', $in), $chips, $row, $body));
    draw();
  }

  // ---------- Price Tool ----------
  // Rules in numbertools.js (priceCheck / priceFind); the books' words in bizwords.js: Marketing Numerology pp. 37-55
  // (the price of each vibration, the $100-$900 prices, the example prices), The Numbers 10-99 in Business (each
  // number's business words and color), Module 12 (which numbers suit which customers and purposes).
  // Layout: design 2a (2026-10-18, owner: "looks like it was thrown together"): the verdict beside the digit sum at
  // the top, the rules as a list (Avoid / Care / Note), the pyramid with its top, weight and ratio in one card, the
  // books' words one card per number (2026-10-19), each passage under its own small head, cut to three lines (tap
  // for the whole page). The pyramid card also draws the price's chart (Numeroscope.sequence). CSS: `.pt` in app.css.
  // The words the book gives a price vibration: the summary (pp. 52-53), else the note of its example price (p. 53),
  // else the number's business name.
  function vibeWords(B, n) {
    const L = (B.prices && B.prices.labels) || {};
    const lab = L['sum' + n] || L['clean' + n] || L['soft' + n];
    if (lab) return lab.words;
    const ex = ((B.prices && B.prices.examples) || []).find((x) => x.sum === n && x.note);
    if (ex) return ex.note.replace(/^an? /, '');
    return (B.business && B.business[n] && B.business[n].name) || '';
  }
  // The book's own text for a price vibration: its digit-sum section (pp. 41-44), else its clean-price section (pp. 38-39).
  const vibeText = (B, n) => { const P = B.prices || {}; const x = (P.sums || {})[n] || (P.clean || {})[n]; return x ? { text: x.text, title: x.title || '', page: x.page } : null; };
  function priceView() {
    light();
    const state = recall('priceTool', { vibe: 23, range: 1, price: '', mode: 'check', view: 'pyramid', chartDay: '' });
    state.view = state.view === 'chart' ? 'chart' : 'pyramid'; state.chartDay = String(state.chartDay || '').replace(/\D/g, '').slice(0, 2);
    if (!T.PRICE_VIBES.some(([v]) => v === state.vibe)) state.vibe = 23;
    if (!T.PRICE_RANGES[state.range]) state.range = 1;
    state.mode = state.mode === 'find' ? 'find' : 'check';
    const $check = A.h('div', {}), $list = A.h('div', {});
    // Find a Price: two pickers (the vibration the price should carry, the range) instead of 22 chips (owner 2026-10-16: "a total mess").
    const $vibe = A.h('select', { class: 'pickbox', 'aria-label': 'What the price should feel like' });
    const $range = A.h('select', { class: 'pickbox', 'aria-label': 'Price range' });
    const $in = A.h('input', { type: 'text', inputmode: 'decimal', placeholder: 'any price', 'aria-label': 'Price' });
    const fmt = (p) => '$' + Number(p).toLocaleString('en-US');
    const cap = (s) => String(s || '').replace(/^./, (x) => x.toUpperCase());
    const topCls = (w) => (w.top && N.TENSION[w.top.sum] ? 'r' : w.ratio >= 0.3 ? 'r' : w.ratio > 0 ? 'y' : 'g');
    let B = root.BizWords || {};
    const label = (t) => A.h('div', { class: 'pt-label' }, t);
    const KIND_WORD = { warn: 'Avoid', care: 'Care', soft: 'Note' };
    const textSheet = (title, text) => A.sheet(A.h('div', { class: 'numsheet' }, A.h('h3', {}, title), ...String(text).split('\n\n').map((p) => A.h('p', {}, p))));
    // What the books say, one card per number in the price (owner 2026-10-19: the cards were "sloppily thrown
    // together", and the same 23/5 came twice, once per book). Each card: where the number sits, the number and its
    // name, the business color, then the books' passages under their own small heads: As a Price (Marketing
    // Numerology pp. 38-44), Any N Price (p. 54), In Business (The Numbers 10-99 in Business), Suits (Module 12).
    // Three lines each; a tap opens the same passages in full, in the same order.
    const POS_LABEL = { sum: 'Digit Sum', clean: 'Clean Number', lead: 'First Two Digits', row: 'In the Price' };
    const titleCase = (t) => String(t || '').replace(/(^|[\s/,])([a-z])/g, (m, a, b) => a + b.toUpperCase());
    const endDot = (t) => (/[.!?]$/.test(t) ? t : t + '.');
    // The passages the books have for one number as it sits in a price. asPrice: the number is the price's own
    // vibration (its digit sum, or its clean number). ds: the digit the price lands on, for "Any N Price" and the customers.
    const passages = (n, { asPrice = false, ds = 0 } = {}) => {
      const P = B.prices || {}, out = [], b = (B.business || {})[n], fam = n < 10 ? (B.businessFamilies || {})[n] : null, own = asPrice ? vibeText(B, n) : null;
      if (own) out.push({ head: 'As a Price', note: cap(own.title || vibeWords(B, n)), text: own.text });
      const hund = ds ? (P.hundreds || {})[ds] : null, hfam = ds ? (P.families || {})[ds] : null;
      if (hund || hfam) out.push({ head: `Any ${ds} Price`, note: hfam ? cap(hfam.words) : '', text: hund ? `Like $${ds}00: ${endDot(hund.text)}` : '' });
      if (b) out.push({ head: 'In Business', note: b.name === nameOf(T.val(n)) ? '' : b.name, text: b.text, warn: b.warn, colorNote: b.color && B.businessColors && B.businessColors[b.color] ? `${BIZ_COLOR_WORD[b.color]}: ${B.businessColors[b.color]}.` : '' });
      else if (fam) out.push({ head: 'In Business', note: fam.title, text: fam.text });
      return out;
    };
    const suitsOf = (n, ds) => (B.codes || []).filter((x) => x.nums && x.nums.includes(n)).map((x) => x.name)
      .concat(ds ? (B.customers || []).filter((x) => x.digits.includes(ds)).map((x) => x.who) : []);
    const subhead = (head, note) => A.h('div', { class: 'pt-subhead' }, A.h('span', {}, head), note ? A.h('span', { class: 'pt-subnote' }, note) : null);
    const pills = (list) => A.h('div', { class: 'codes' }, ...list.map((f) => A.h('span', { class: 'soft' }, titleCase(f))));
    const numCard = (n, pos, opts = {}) => {
      const parts = passages(n, opts), fits = suitsOf(n, opts.ds || 0);
      if (!parts.length && !fits.length) return null;
      const v = T.val(n), b = (B.business || {})[n], color = b && b.color && BIZ_COLOR_WORD[b.color] ? b.color : null;
      const colorPill = () => (color ? A.h('span', { class: 'bizcolor ' + color }, BIZ_COLOR_WORD[color] + ' for Business') : null);
      const open = () => {
        A.count('price.number');
        A.sheet(A.h('div', { class: 'numsheet pt-sheet' },
          A.h('div', { class: 'pt-label' }, POS_LABEL[pos]), A.h('h3', {}, `${v.text} ${nameOf(v)}`), colorPill(),
          ...parts.flatMap((p) => [subhead(p.head, p.note), ...(p.text ? String(p.text).split('\n\n').map((t) => A.h('p', {}, t)) : []),
            p.warn ? A.h('p', { class: 'warnline' }, '⚠ ' + p.warn) : null, p.colorNote ? A.h('p', { class: 'muted small' }, p.colorNote) : null]),
          fits.length ? subhead('Suits') : null, fits.length ? pills(fits) : null));
      };
      return A.h('div', { class: 'reading pt-card pt-num', onclick: open },
        A.h('div', { class: 'pt-numtop' }, A.h('span', { class: 'pt-label' }, POS_LABEL[pos]), colorPill()),
        A.h('div', { class: 'bignum pt-numname' }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v))),
        ...parts.map((p) => A.h('div', { class: 'pt-sub' }, subhead(p.head, p.note), p.text ? A.h('p', { class: 'pt-clamp' }, p.text) : null, p.warn ? A.h('p', { class: 'warnline pt-clamp' }, '⚠ ' + p.warn) : null)),
        fits.length ? A.h('div', { class: 'pt-sub' }, subhead('Suits'), pills(fits)) : null,
        A.h('div', { class: 'pt-more' }, 'Read the whole page ›'));
    };
    const stat = (name, value, cls = '') => A.h('div', {}, A.h('span', {}, name), A.h('b', { class: cls }, value));
    // The price's chart: the course's mini-numeroscope for a number sequence (Numeroscope.sequence), the digits on
    // the central line, the price's digit sum at the bottom, an optional day on top. Drawn by the same drawing as a
    // single name's chart. The day box keeps its focus while typing: only the drawing and its caption are redrawn.
    const dayValue = () => { const d = Number(state.chartDay); return d >= 1 && d <= 31 ? T.val(d) : null; };
    const chartBox = (c) => {
      const $svg = A.h('div', { class: 'pt-chartsvg' }), $cap = A.h('p', { class: 'pt-ratio' });
      const draw = () => {
        const dayV = dayValue(), seq = N.sequence(c.digits.join(''), dayV);
        A.fill($svg, A.singleNameSvg(seq.chart, '', seq.digits.length, dayV));
        $cap.textContent = dayV ? `The digits on the central line add up to ${c.value.text} at the bottom; day ${dayV.text} on top gives the upper half.`
          : `The digits sit on the central line and add up to ${c.value.text} at the bottom. A day on top (the launch day or the business's day) fills the upper half.`;
      };
      const $day = A.h('input', { type: 'text', inputmode: 'numeric', maxlength: '2', placeholder: 'none', value: state.chartDay || '', 'aria-label': 'Day on top of the chart' });
      $day.addEventListener('input', () => { state.chartDay = $day.value.replace(/\D/g, '').slice(0, 2); $day.value = state.chartDay; remember('priceTool', state); A.count('price.chart_day'); draw(); });
      const me = recall('mychart', null);
      draw();
      return A.h('div', { class: 'pt-chart' }, $svg,
        A.h('div', { class: 'pt-dayrow' }, A.h('label', { class: 'pt-daylab' }, A.h('span', {}, 'Day on top'), $day),
          me && me.day && String(me.day) !== state.chartDay ? A.h('button', { type: 'button', class: 'linkbtn', onclick: () => { state.chartDay = String(me.day); $day.value = state.chartDay; remember('priceTool', state); A.count('price.chart_day'); draw(); } }, `Use my day (${me.day})`) : null),
        $cap);
    };
    const drawCheck = () => {
      remember('priceTool', state);
      const c = T.priceCheck($in.value);
      if (!c) { A.fill($check, A.h('p', { class: 'pt-hint' }, 'Type a price to read it: its digit sum, clean number, pyramid, the book\'s rules and what each number in it means in business. Or tap Find a Price to be given prices that fit.')); return; }
      const rows = c.pyramid.slice().reverse();
      const W = c.weight;
      const P = B.prices || {};
      const ex = (P.examples || []).find((x) => x.price === c.price);
      // The numbers in the price the book reads: the digit sum, the clean number, the first two digits (p. 51),
      // a magnetic number standing in the row (p. 40). The book's page for the price's own vibration goes with the
      // clean number when there is one, else with the digit sum; "Any N Price" always with the digit sum.
      const cards = [numCard(c.sum, 'sum', { asPrice: !c.clean || c.clean === c.sum, ds: c.value.ds })];
      if (c.clean && c.clean !== c.sum) cards.push(numCard(c.clean, 'clean', { asPrice: true }));
      const seen = [c.sum, c.clean];
      if (c.lead && !seen.includes(c.lead)) { cards.push(numCard(c.lead, 'lead')); seen.push(c.lead); }
      for (const n of c.rowNums) if (!seen.includes(n)) { cards.push(numCard(n, 'row')); seen.push(n); }
      const rules = [...c.warnings.map((t) => ['warn', t]), ...c.cautions.map((t) => ['care', t]), ...c.notes.map((t) => ['soft', t])];
      const ratioNote = W.ratio >= 0.3 ? 'A heavy pyramid: ratio at or over 0.3' : W.ratio > 0 ? 'Some weight in the pyramid, under the 0.3 line' : 'A light pyramid: no tension numbers';
      // The pyramid card shows the pyramid or the price's chart: one switch, remembered.
      const seg = (label, on, onclick) => A.h('button', { type: 'button', class: 'pt-segbtn' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick }, label);
      const setView = (v) => { state.view = v; A.count(v === 'chart' ? 'price.chart' : 'price.pyramid'); drawCheck(); };
      const chart = state.view === 'chart';
      A.fill($check,
        A.h('div', { class: 'pt-box pt-sum' },
          A.h('div', { class: 'pt-sumrow' },
            A.h('div', { class: 'pt-sumnum', onclick: () => numberSheet(c.value, 'about') }, label('Digit sum'), A.h('div', { class: 'bignum' }, A.h('b', {}, c.value.text), A.h('span', { class: 'nm' }, c.name))),
            A.h('span', { class: 'pt-verdict ' + c.verdict }, T.VERDICT_WORDS[c.verdict])),
          rules.length ? A.h('div', { class: 'pt-rules' }, ...rules.map(([k, t]) => A.h('div', { class: 'pt-rule' }, A.h('span', { class: 'pt-kind ' + k }, KIND_WORD[k]), A.h('span', {}, noPage(t))))) : null),
        A.h('div', { class: 'pt-box pt-pyrbox' },
          A.h('div', { class: 'pt-seg', role: 'group', 'aria-label': 'Pyramid or chart' }, seg('Number Pyramid', !chart, () => setView('pyramid')), seg('Price Chart', chart, () => setView('chart'))),
          chart ? chartBox(c) : A.h('div', {},
            A.h('div', { class: 'pyr' }, ...rows.map((row, i) => A.h('div', { class: 'pyr-row' }, ...row.map((v) => A.h('span', { class: (N.TENSION[v.sum] ? (i === 0 ? 'top-tense' : 'tense') : '') }, i === rows.length - 1 ? String(v.sum) : v.text))))),
            A.h('div', { class: 'pt-stats' }, stat('Top', W.top ? W.top.text : '–'), stat('Weight', String(Number(W.total.toFixed(3)))), stat('Ratio', W.ratio.toFixed(3), W.ratio < 0.3 ? 'ok' : 'err')),
            A.h('p', { class: 'pt-ratio' }, ratioNote))),
        B.prices ? A.h('div', { class: 'wlabel tl pt-section' }, 'What the Books Say') : null,
        ex ? A.h('p', { class: 'bookex pt-ex' }, `One of the book's own example prices: ${fmt(ex.price)} = ${T.val(ex.sum).text}${ex.note ? ', ' + ex.note : ''}.`) : null,
        A.h('div', { class: 'pt-cards' }, ...cards));
    };
    const shortWords = (v) => { const w = vibeWords(B, v); return w ? w.split(/[,;:(]| and /)[0].replace(/^(a|the) /i, '').toLowerCase() : ''; };
    const fillPicks = () => {
      A.fill($vibe, ...T.PRICE_VIBES.map(([v]) => A.h('option', { value: String(v), selected: state.vibe === v }, `${T.val(v).text}${shortWords(v) ? ' · ' + shortWords(v) : ''}`)));
      A.fill($range, ...T.PRICE_RANGES.map(([lo, hi], i) => A.h('option', { value: String(i), selected: state.range === i }, `${fmt(lo)} to ${fmt(hi)}`)));
    };
    $vibe.onchange = () => { state.vibe = Number($vibe.value); A.count('price.vibe'); drawFind(); };
    $range.onchange = () => { state.range = Number($range.value); A.count('price.range'); drawFind(); };
    const drawFind = () => {
      remember('priceTool', state);
      fillPicks();
      const range = T.PRICE_RANGES[state.range];
      const found = T.priceFind(state.vibe, range, 60);
      const words = vibeWords(B, state.vibe), own = vibeText(B, state.vibe), v = T.val(state.vibe);
      const examples = ((B.prices || {}).examples || []).filter((x) => x.sum === state.vibe && x.price >= range[0] && x.price <= range[1]);
      const isEx = new Set(examples.map((x) => x.price));
      // A found price goes into Check a Price, which opens on it.
      const pick = (p) => { $in.value = String(p); state.price = $in.value; A.count('price.pick'); setMode('check'); drawCheck(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      const dot = (cls, t) => A.h('span', {}, A.h('i', { class: cls }), t);
      A.fill($list,
        A.h('div', { class: 'pt-vibe' },
          A.h('div', { class: 'bignum', onclick: () => numberSheet(v, 'about') }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v))),
          words ? A.h('div', { class: 'pt-words' }, cap(words)) : null),
        own ? A.h('div', { class: 'reading pt-card', onclick: () => { A.count('price.vibe_text'); textSheet(`${v.text} Prices`, own.text); } }, A.h('p', {}, snippet(own.text, 2)), A.h('div', { class: 'pt-more' }, 'Read the whole page ›')) : null,
        examples.length ? A.h('div', { class: 'pt-fits' }, label('The Book\'s Own Examples'), A.h('div', { class: 'pt-examples' }, ...examples.map((x) => A.h('button', { type: 'button', class: 'pt-example', onclick: () => pick(x.price) }, fmt(x.price) + (x.note ? ' · ' + x.note : ''))))) : null,
        A.h('div', { class: 'pt-listhead' }, A.h('span', { class: 'wlabel tl' }, found.length ? `${found.length} Prices That Fit` : 'Prices That Fit'), A.h('span', { class: 'pt-legend' }, dot('g', 'light'), dot('y', 'medium'), dot('r', 'heavy'))),
        found.length ? A.h('div', { class: 'prices' }, ...found.map((c) => A.h('button', { type: 'button', class: 'prow', onclick: () => pick(c.price) },
          A.h('span', { class: 'pt-prow-top' }, A.h('b', {}, fmt(c.price)), isEx.has(c.price) ? A.h('span', { class: 'inbook' }, 'book') : null),
          A.h('span', { class: 'pmeta' }, A.h('span', { class: 'ds' }, c.clean && c.sum !== state.vibe ? 'clean' : c.value.text), A.h('span', { class: 'top ' + topCls(c.weight) }, `top ${c.weight.top ? c.weight.top.text : '–'}`)))))
          : A.h('p', { class: 'pt-hint' }, 'No price in this range lands on that number without a warning. Try another range.'),
        A.h('p', { class: 'pt-foot' }, 'Every price here follows the book\'s rules: it adds up to the chosen number (or the number stands in the price followed by zeros), ends in 5, 7 or 9, never puts 4 and 8 together, and is never 12/3 or 16/7. Lightest pyramid first. Tap a price to read it.'));
    };
    // Two jobs, one at a time: Check a Price (type one) or Find a Price (pick what it should feel like). One switch.
    const $tabs = A.h('div', { class: 'pt-switch' });
    const $checkSec = A.h('div', {}, A.h('label', { class: 'pricebox pt-pricebox' }, A.h('span', { class: 'cur' }, '$'), $in), $check);
    const $findSec = A.h('div', {},
      A.h('div', { class: 'picks pt-box' }, A.h('label', { class: 'pick' }, A.h('span', { class: 'muted small' }, 'The price should feel like'), $vibe), A.h('label', { class: 'pick' }, A.h('span', { class: 'muted small' }, 'Between'), $range)),
      $list);
    const tab = (label, on, onclick) => A.h('button', { type: 'button', class: 'pt-tab' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick }, label);
    const setMode = (m) => {
      if (m) { state.mode = m; remember('priceTool', state); }
      A.fill($tabs, tab('Check a Price', state.mode === 'check', () => setMode('check')), tab('Find a Price', state.mode === 'find', () => { A.count('price.find'); setMode('find'); }));
      $checkSec.classList.toggle('hidden', state.mode !== 'check'); $findSec.classList.toggle('hidden', state.mode !== 'find');
    };
    $in.addEventListener('input', () => { state.price = $in.value; drawCheck(); });
    $in.value = state.price || '';
    // The empty box on the right balances the back button, so the title sits in the true middle.
    A.render(A.h('div', { class: 'screen qscreen tscreen pt' }, top('Price Tool', '#/', A.h('span', { class: 'pt-spacer', 'aria-hidden': 'true' })), $tabs, $checkSec, $findSec));
    setMode(); drawCheck(); drawFind();
    // The books' words arrive with bizwords.js: draw again with them.
    if (!root.BizWords) bizwords().then((w) => { B = w; if ($list.isConnected) { drawCheck(); drawFind(); } });
  }

  // ---------- Relationship ----------
  // The paid tool asks for each person's name and birthday (Relations book p. 569); the math uses the day
  // of birth, the month and year are kept with the name so a date can be typed whole.
  function relationView() {
    light();
    const saved = recall('relation', { a: ['', '', '', ''], b: ['', '', '', ''] });
    const field = (ph, v, attrs = {}) => A.h('input', { type: 'text', placeholder: ph, value: v || '', autocomplete: 'off', ...attrs });
    const person = (ph, sv) => { const $n = field(ph, sv[0], { autocapitalize: 'words' }), $d = field('day', sv[1], { inputmode: 'numeric', maxlength: 2, 'aria-label': `${ph} birth day` }), $m = field('month', sv[2], { inputmode: 'numeric', maxlength: 2, 'aria-label': `${ph} birth month` }), $y = field('year', sv[3], { inputmode: 'numeric', maxlength: 4, 'aria-label': `${ph} birth year` }); return { $n, $d, $m, $y, all: [$n, $d, $m, $y] }; };
    const a = person('First person', saved.a || []), b = person('Second person', saved.b || []);
    const $body = A.h('div', {});
    const draw = () => {
      remember('relation', { a: a.all.map((f) => f.value), b: b.all.map((f) => f.value) });
      const da = Number(a.$d.value), db = Number(b.$d.value);
      if (!(da >= 1 && da <= 31 && db >= 1 && db <= 31)) { A.fill($body, A.h('p', { class: 'muted small', style: 'margin:8px 2px' }, 'Type both birth dates. The day of birth (1 to 31) is what counts: the tool reads the two day vibrations together, the paid tool\'s way.')); return; }
      const A1 = T.val(da), B1 = T.val(db), na = a.$n.value.trim() || 'First', nb = b.$n.value.trim() || 'Second';
      const B = T.bigDiamond(A1.ds, B1.ds);
      const le = B.main.le, fa = B.main.outerD, fb = B.main.innerD;
      A.fill($body,
        bigDiamondEl(B, (d) => numberSheet(T.val(d.code), 'about'), { outer: `How ${na} Feels It`, inner: `How ${nb} Feels It`, aText: `${na} ${A1.text}`, bText: `${nb} ${B1.text}`, mainName: `Life expression ${le.text}`, mainLabel: 'The Two Day Vibrations', physicalTitle: 'PHYSICAL', physical: 'What Happens When They Meet', emotional: 'The Meeting of Their Emotions', spiritual: 'Where the Relationship Can Grow', noUnbalanced: true }),
        A.h('div', { class: 'reading', onclick: () => numberSheet(le, 'about') }, A.h('div', { class: 'head' }, A.h('b', {}, le.text), A.h('span', { class: 'nm' }, 'Life Expression of the Relationship')), A.h('p', {}, `${A1.ds} and ${B1.ds} meet in a ${le.text}${nameOf(le) ? ' (' + nameOf(le) + ')' : ''}: the resulting energy, what happens when they are together.`)),
        A.h('div', { class: 'reading' }, A.h('div', { class: 'head' }, A.h('b', {}, fa.text), A.h('span', { class: 'nm' }, `How ${na} Feels It`)), A.h('p', {}, `${na}'s ${A1.ds} with the relationship's ${le.ds}: ${fa.text} ${fa.name}.`)),
        A.h('div', { class: 'reading' }, A.h('div', { class: 'head' }, A.h('b', {}, fb.text), A.h('span', { class: 'nm' }, `How ${nb} Feels It`)), A.h('p', {}, `${nb}'s ${B1.ds} with the relationship's ${le.ds}: ${fb.text} ${fb.name}.`)),
        A.h('div', { class: 'reading', onclick: () => numberSheet(B.essence.le, 'about') }, A.h('div', { class: 'head' }, A.h('b', {}, B.essence.le.text), A.h('span', { class: 'nm' }, 'Essence of the Relationship')), A.h('p', {}, 'The sum of how each feels it: the deeper emotional dimension, one level above what is visible.')),
        A.h('p', { class: 'muted small', style: 'margin:8px 2px' }, 'Built like the paid tool (Relations book, pp. 12-16): the two day vibrations in a little diamond, then unpacked like Number Fun. Tap any diamond for its number.'));
    };
    for (const $f of [...a.all, ...b.all]) $f.addEventListener('input', draw);
    const useMe = async () => { try { const me = await A.api('/api/mychart'); if (!me.day) { A.toast('Set up My Chart first (Settings).', true); return; } a.$n.value = me.name.split(' ')[0] || 'Me'; a.$d.value = String(me.day); a.$m.value = String(me.month || ''); a.$y.value = String(me.year || ''); A.count('relation.use_me'); draw(); } catch (err) { A.toast(err.message, true); } };
    const col = (p) => A.h('div', {}, p.$n, A.h('div', { class: 'dmy' }, p.$d, p.$m, p.$y));
    A.render(A.h('div', { class: 'screen qscreen tscreen' }, top('Relationship'),
      A.h('div', { class: 'two-people' }, col(a), col(b)),
      A.h('div', { class: 'togglerow' }, chip('Me as the First Person', false, useMe)),
      $body));
    draw();
  }

  // ---------- Karmic Connections ----------
  // The rule is the Forecasting book's (shared destiny rhythms = the same birth-year number, T.karmic). The words
  // are the Karmic Connections book's (2026-10-22): under each person the book's own sentence for that verdict,
  // cited by page, and at the foot the whole book as short points with the course words folded (GET /api/book).
  function karmicView() {
    light();
    const saved = recall('karmic', { me: '', others: ['', '', '', ''] });
    const yearField = (v, ph) => A.h('input', { type: 'text', inputmode: 'numeric', maxlength: 4, placeholder: ph, value: v || '', autocomplete: 'off' });
    const $me = yearField(saved.me, 'your birth year'), $others = saved.others.map((v, i) => yearField(v, `birth year ${i + 1}`));
    const $body = A.h('div', {}), $book = A.h('div', {});
    let book = null;
    const bold = (t) => String(t).split('**').map((part, i) => (i % 2 ? A.h('b', {}, part) : part)).filter((x) => x !== '');
    const cite = (c) => (c ? A.h('span', { class: 'mcite' }, `${c.book} p. ${c.page}`) : null);
    const cited = (set) => (set ? set.groups.flatMap((g) => g.points.map((t, i) => A.h('p', {}, ...bold(t), cite(g.cites && g.cites[i])))) : []);
    const verdict = (o) => (!book ? [] : cited(book.sets[o.shared ? (o.sameYear ? 'same' : 'connected') : 'free']));
    const draw = () => {
      remember('karmic', { me: $me.value, others: $others.map((f) => f.value) });
      const k = T.karmic($me.value, $others.map((f) => f.value));
      if (!k) { A.fill($body, A.h('p', { class: 'muted small', style: 'margin:8px 2px' }, 'Type your birth year, then up to four other people\'s. People who share destiny rhythms (the same year number) are karmically connected: the same planets, the same life lessons, year by year.')); return; }
      A.fill($body,
        A.h('div', { class: 'reading' }, A.h('div', { class: 'head' }, A.h('b', {}, `${k.year}`), A.h('span', { class: 'nm' }, `year number ${k.ds} · rhythm ${k.rhythm.join('-')}`)), A.h('p', {}, `Your destiny rhythm: ${k.periods.slice(0, 6).map((p) => `${p.number} (${p.start}–${p.end})`).join(', ')} …`)),
        ...k.others.map((o) => A.h('div', { class: 'reading ' + (o.shared ? 'yes' : 'no') }, A.h('div', { class: 'head' }, A.h('b', {}, String(o.year)), A.h('span', { class: 'nm' }, `year number ${o.ds}`), A.h('span', { class: 'rate ' + (o.shared ? 'super' : 'quiet') }, o.shared ? (o.sameYear ? 'Same year: connected' : 'Karmically connected') : 'Not connected')),
          ...(book ? verdict(o) : [A.h('p', {}, o.shared ? 'Shares your destiny rhythm: the same planets and lessons at the same points of life.' : 'A different rhythm.')]))),
        A.h('p', { class: 'muted small', style: 'margin:8px 2px' }, 'The rule is the Forecasting book\'s (pp. 63-77): shared destiny rhythms come from the same birth-year number. Your own year rows and periods are under Quick Chart ⋮ "Year Rows and Day Vibrations".'));
    };
    const drawBook = () => {
      if (!book) return;
      A.fill($book, A.h('div', { class: 'wlabel tl' }, 'The Karmic Connections Book'),
        A.h('p', { class: 'muted small', style: 'margin:0 2px 8px' }, 'Short points first; "Course Words" opens the book\'s own text. A very similar Higher Self makes a connection extra strong: compare two charts in the vault with Compare or Similar Charts.'),
        ...A.courseWords(book.bits, book.passages));
    };
    A.api('/api/book?slug=karmic-connections-book&sets=connected,same,free').then((b) => { book = b; draw(); drawBook(); A.count('karmic.book'); }).catch((err) => A.fill($book, A.h('p', { class: 'err small' }, err.message)));
    [$me, ...$others].forEach(($f) => $f.addEventListener('input', draw));
    const useMe = async () => { try { const me = await A.api('/api/mychart'); if (!me.year) { A.toast('Set up My Chart first (Settings).', true); return; } $me.value = String(me.year); draw(); } catch (err) { A.toast(err.message, true); } };
    A.render(A.h('div', { class: 'screen qscreen tscreen' }, top('Karmic Connections'),
      A.h('div', { class: 'two-people' }, A.h('div', {}, A.h('div', { class: 'muted small', style: 'padding:0 2px 4px' }, 'You'), $me), A.h('div', {}, A.h('div', { class: 'muted small', style: 'padding:0 2px 4px' }, 'Others'), ...$others)),
      A.h('div', { class: 'togglerow' }, chip('Use My Chart', false, useMe)),
      $body, $book));
    draw();
    if (!$me.value) useMe().catch(() => {});
  }

  // ---------- My Chart (Settings) ----------
  function myChartView() {
    const field = (ph, attrs = {}) => A.h('input', { type: 'text', placeholder: ph, autocomplete: 'off', ...attrs });
    const $name = field('Full name', { autocapitalize: 'words' }), $day = field('day', { inputmode: 'numeric', maxlength: 2 }), $month = field('month', { inputmode: 'numeric', maxlength: 2 }), $year = field('year', { inputmode: 'numeric', maxlength: 4 });
    const $msg = A.h('p', { class: 'muted small' }, 'Loading…');
    const $save = A.h('button', { type: 'button', class: 'btn-primary btn-block', onclick: async () => {
      $save.disabled = true;
      try { const r = await A.api('/api/mychart', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: $name.value, day: $day.value, month: $month.value, year: $year.value }) }); remember('mychart', r); A.count('mychart.save'); $msg.textContent = r.day ? `Saved: ${r.name || '(no name)'}, ${r.day}.${r.month}.${r.year}.` : 'Saved: no birth date set.'; $msg.className = 'ok small'; }
      catch (err) { $msg.textContent = err.message; $msg.className = 'err small'; }
      $save.disabled = false;
    } }, 'Save');
    A.render(A.h('div', { class: 'screen stack' }, top('My Chart', '#/settings'),
      A.h('p', { class: 'muted small' }, 'Your own name and birth date. The Relationship and Karmic Connections tools and the "My Chart" button on the home screen start from it. Kept on the server, never in a chart or a tag.'),
      A.h('div', { class: 'card' }, $name, A.h('div', { class: 'row', style: 'margin-top:8px;flex-wrap:nowrap' }, $day, $month, $year)),
      $save, $msg));
    A.api('/api/mychart').then((me) => { $name.value = me.name || ''; $day.value = me.day || ''; $month.value = me.month || ''; $year.value = me.year || ''; remember('mychart', me); $msg.textContent = me.day ? 'This is what is saved now.' : 'Nothing saved yet.'; }).catch((err) => { $msg.textContent = err.message; $msg.className = 'err small'; });
  }

  // ---------- House Number, Phone and Domain, Business Words (Marketing Numerology; built 2026-10-20) ----------
  // The books' words for these three tools come with placewords.js (generated by tools/make-placewords.mjs); the
  // business words of each number 10-99 with bizwords.js, as in the Price Tool. All three screens share the Price
  // Tool's shapes: the big input box, the summary box with its verdict and rules, the reading cards.
  const placewords = lazy('placewords.js', 'PlaceWords');
  const dateFields = (saved, labels = ['day', 'month', 'year']) => {
    const f = (ph, v, max, label) => A.h('input', { type: 'text', inputmode: 'numeric', maxlength: max, placeholder: ph, value: v || '', autocomplete: 'off', 'aria-label': label });
    const $d = f(labels[0], saved[0], 2, 'Day'), $m = f(labels[1], saved[1], 2, 'Month'), $y = f(labels[2], saved[2], 4, 'Year');
    return { $d, $m, $y, all: [$d, $m, $y], values: () => [$d.value, $m.value, $y.value], day: () => { const d = Number($d.value); return d >= 1 && d <= 31 ? T.val(d) : null; } };
  };
  // My Chart's birth date into a date field trio, for "Use my day".
  const useMine = (fields, after) => async () => { try { const me = await A.api('/api/mychart'); if (!me.day) { A.toast('Set up My Chart first (Settings).', true); return; } fields.$d.value = String(me.day); fields.$m.value = String(me.month || ''); fields.$y.value = String(me.year || ''); after(); } catch (err) { A.toast(err.message, true); } };
  const ruleRow = (kind, text) => A.h('div', { class: 'pt-rule' }, A.h('span', { class: 'pt-kind ' + kind }, { warn: 'Avoid', care: 'Care', soft: 'Note' }[kind]), A.h('span', {}, text));
  const bookCard = (title, text, more) => A.h('div', { class: 'reading pt-card', onclick: more }, A.h('div', { class: 'pt-label' }, title), A.h('p', { class: 'pt-clamp' }, text), more ? A.h('div', { class: 'pt-more' }, 'Read the whole page ›') : null);
  const bizCard = (B, n, label) => {
    const v = T.val(n), b = (B.business || {})[n], o = (B.overview || {})[n], fam = n < 10 ? (B.businessFamilies || {})[n] : null;
    const text = b ? b.text : fam ? fam.text : o ? o.text : '';
    if (!text) return null;
    const color = b && b.color && BIZ_COLOR_WORD[b.color] ? b.color : null;
    const open = () => A.sheet(A.h('div', { class: 'numsheet pt-sheet' }, A.h('div', { class: 'pt-label' }, label), A.h('h3', {}, `${v.text} ${nameOf(v)}`),
      color ? A.h('span', { class: 'bizcolor ' + color }, BIZ_COLOR_WORD[color] + ' for Business') : null,
      b ? A.h('div', { class: 'pt-subhead' }, A.h('span', {}, 'In Business'), b.name !== nameOf(v) ? A.h('span', { class: 'pt-subnote' }, b.name) : null) : null, ...(b ? String(b.text).split('\n\n').map((p) => A.h('p', {}, p)) : []),
      b && b.warn ? A.h('p', { class: 'warnline' }, '⚠ ' + b.warn) : null,
      o ? A.h('div', { class: 'pt-subhead' }, A.h('span', {}, 'The Number Itself'), o.name && o.name !== (b && b.name) ? A.h('span', { class: 'pt-subnote' }, o.name) : null) : null, ...(o ? String(o.text).split('\n\n').map((p) => A.h('p', {}, p)) : []),
      fam ? A.h('p', {}, fam.text) : null));
    return A.h('div', { class: 'reading pt-card pt-num', onclick: open },
      A.h('div', { class: 'pt-numtop' }, A.h('span', { class: 'pt-label' }, label), color ? A.h('span', { class: 'bizcolor ' + color }, BIZ_COLOR_WORD[color] + ' for Business') : null),
      A.h('div', { class: 'bignum pt-numname' }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v))),
      A.h('p', { class: 'pt-clamp' }, text), A.h('div', { class: 'pt-more' }, 'Read the whole page ›'));
  };
  const WORD_NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

  // ---------- House Number ----------
  // Marketing Numerology, "Business house number guide": the house number is its digit sum, a letter is added at its
  // letter value; the business lists say how a 1, 3, 4, 5 or 9 business does in each house. The lecture adds who
  // thrives in each house, the numbers to avoid, and the result number: the house digit beside the person's day
  // digit (a 4 in a 5 house "awakens a subtle nine energy": 54/9).
  function houseView() {
    light();
    const state = recall('houseTool', { number: '', date: ['', '', ''], kind: 'home' });
    state.kind = state.kind === 'business' ? 'business' : 'home';
    const $num = A.h('input', { type: 'text', placeholder: 'house number', value: state.number || '', autocomplete: 'off', autocapitalize: 'characters', 'aria-label': 'House number' });
    const date = dateFields(state.date || []);
    const $body = A.h('div', {}), $kinds = A.h('div', { class: 'togglerow' }), $dateLabel = A.h('div', { class: 'muted small', style: 'padding:0 2px 4px' }, 'Birth date');
    let P = root.PlaceWords || null, B = root.BizWords || null;
    const parse = (raw) => {
      const s = String(raw || '').toUpperCase();
      const digits = (s.match(/\d/g) || []).map(Number), letters = (s.match(/\p{L}/gu) || []).map((c) => [c, N.letterValue(c)]).filter(([, v]) => v);
      if (!digits.length) return null;
      const sum = digits.reduce((a, d) => a + d, 0) + letters.reduce((a, [, v]) => a + v, 0);
      const parts = [digits.join('+')].concat(letters.map(([c, v]) => `${c}(${v})`));
      const compound = Number(digits.join('')) || 0;
      return { value: T.val(sum), sum, parts, compound, text: s.replace(/\s+/g, ''), digits };
    };
    const setKind = (k) => { state.kind = k; remember('houseTool', state); draw(); };
    const draw = () => {
      state.number = $num.value; state.date = date.values(); remember('houseTool', state);
      $dateLabel.textContent = state.kind === 'home' ? 'Birth date' : 'Start date';
      A.fill($kinds, chip('A Home', state.kind === 'home', () => setKind('home')), chip('A Business', state.kind === 'business', () => setKind('business')), A.h('button', { type: 'button', class: 'linkbtn right', onclick: useMine(date, draw) }, 'Use My Chart'));
      const h = parse($num.value);
      if (!h) { A.fill($body, A.h('p', { class: 'pt-hint' }, state.kind === 'home' ? 'Type the number on the street (a letter too, if there is one) and your birth date. The tool reads the house\'s own number, who thrives in it, and how you feel in it.' : 'Type the number on the street (a letter too, if there is one) and the day the business was registered. The tool reads the house\'s own number and how the business does in it.')); return; }
      const v = h.value, ds = v.ds, dayV = date.day();
      const rules = [];
      const avoid = P ? (P.house.avoid || []).find((x) => x.n === h.compound || x.n === h.sum) : null;
      if (avoid) rules.push(['warn', `${avoid.n}: "${avoid.why}."`]);
      if (/48|84/.test(h.digits.join(''))) rules.push(['warn', '4 and 8 side by side pull in opposite directions (the lecture).']);
      if (state.kind === 'home' && ds === 8) rules.push(['care', 'An 8 house: "you should usually avoid the number eight house. It is more beneficial for a spiritual or financial institution."']);
      if (state.kind === 'home' && ds === 9) rules.push(['care', 'A 9 house: "only a few base vibrations live in the strong nine energy. 1, 5 and 6"; more suitable for an organization or business.']);
      if (state.kind === 'home' && ds === 4 && dayV && (dayV.ds === 4 || dayV.ds === 8)) rules.push(['care', 'A 4 house: 4s and 8s should generally avoid living in a number four (the lecture).']);
      const who = P && P.house.homes[ds];
      // the business list: the business's day vibration (its registration day) in this house
      let bizLine = null, bizAbout = null;
      if (state.kind === 'business' && P && dayV) { const list = P.house.business[dayV.ds]; if (list) { bizLine = list.houses[ds]; bizAbout = list.about; } else bizLine = `The guide has no lists for a ${dayV.ds} business: "A numerologist would never normally give a 2, 7 or 8 business."`; }
      const result = dayV ? T.val(ds * 10 + dayV.ds) : null;
      A.fill($body,
        A.h('div', { class: 'pt-box pt-sum' },
          A.h('div', { class: 'pt-sumrow' }, A.h('div', { class: 'pt-sumnum', onclick: () => numberSheet(v, 'about') }, A.h('div', { class: 'pt-label' }, 'The House\'s Number'), A.h('div', { class: 'bignum' }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v)))),
            A.h('span', { class: 'pt-verdict ' + (rules.some(([k]) => k === 'warn') ? 'avoid' : rules.length ? 'care' : 'good') }, rules.some(([k]) => k === 'warn') ? 'Avoid' : rules.length ? 'Only With Care' : `A ${ds} House`)),
          A.h('p', { class: 'pt-formula' }, `${h.parts.join(' + ')} = ${h.sum}${h.sum > 9 ? ' → ' + ds : ''}`),
          rules.length ? A.h('div', { class: 'pt-rules' }, ...rules.map(([k, t]) => ruleRow(k, t))) : null),
        state.kind === 'home' && who ? A.h('div', { class: 'pt-box' }, A.h('div', { class: 'pt-label' }, `Who Thrives in a ${ds} House`), A.h('p', { class: 'pt-quote' }, `"${who.who}."`), who.note ? A.h('p', { class: 'pt-quote muted' }, `"${who.note}."`) : null) : null,
        state.kind === 'business' ? A.h('div', { class: 'pt-box' }, A.h('div', { class: 'pt-label' }, dayV ? `A ${dayV.ds} Business in a ${ds} House` : 'The Business in This House'),
          dayV ? A.h('p', { class: 'pt-quote' }, bizLine) : A.h('p', { class: 'pt-hint', style: 'margin:6px 0 0' }, 'Type the day the business was registered: its day vibration decides which house suits it.'),
          bizAbout ? A.h('p', { class: 'muted small', style: 'margin:8px 0 0' }, bizAbout) : null) : null,
        result && B ? A.h('div', { class: 'wlabel tl pt-section' }, state.kind === 'home' ? 'How You Feel in It' : 'How the Business Feels in It') : null,
        result && B ? bizCard(B, result.sum, `House ${ds} beside ${state.kind === 'home' ? 'your day' : 'its day'} ${dayV.ds}`) : null,
        !dayV ? A.h('p', { class: 'pt-hint' }, state.kind === 'home' ? 'Add your birth date for how you feel in it: the house digit beside your day digit, read as one number.' : '') : null,
        P ? A.h('p', { class: 'pt-foot' }, `${P.house.rule.digitSum} ${P.house.rule.letter}. The lecture's numbers to watch for in a house: ${P.house.avoid.map((x) => x.n).join(', ')}, and 4 next to 8.`) : null, P ? A.h('p', { class: 'pt-foot', style: 'margin-top:4px' }, A.h('button', { type: 'button', class: 'linkbtn', style: 'padding:0', onclick: () => A.sheet(A.h('div', { class: 'numsheet' }, A.h('h3', {}, 'Balancing a House Number'), A.h('p', {}, `The lecture: "${P.house.balancing.how}" to the number, written inside the main door, so 4 becomes 4A (a 5). The letters of each digit:`), ...[1, 2, 3, 4, 5, 6, 7, 8].map((d) => A.h('p', { style: 'margin:2px 0' }, A.h('b', {}, String(d)), ` ${P.house.balancing[d]}`)))) }, 'Balance it with a letter ›')) : null);
    };
    $num.addEventListener('input', draw); for (const $f of date.all) $f.addEventListener('input', draw);
    A.render(A.h('div', { class: 'screen qscreen tscreen pt' }, top('House Number', '#/', A.h('span', { class: 'pt-spacer', 'aria-hidden': 'true' })),
      A.h('div', { class: 'two-people house-in' }, A.h('div', {}, A.h('div', { class: 'muted small', style: 'padding:0 2px 4px' }, 'Number on the street'), $num), A.h('div', {}, $dateLabel, A.h('div', { class: 'dmy' }, date.$d, date.$m, date.$y))),
      $kinds, $body));
    draw();
    Promise.all([P ? P : placewords(), B ? B : bizwords()]).then(([p, b]) => { P = p; B = b; if ($body.isConnected) draw(); });
  }

  // ---------- Phone and Domain ----------
  // Marketing Numerology, "Telephone number for your business": the digit sum (every digit added, the lecture) should
  // land on 1 or 5, 9 for a 9; 18/9 reads as competition; inside the number 12, 16, 48 and 84 sit badly, because a
  // phone number is read in pairs. The number drawn as a chart: the Price Tool's sequence chart (Six Themes book).
  // A domain is a product name: its words on the line (a hyphen or dot is a space, the extension is the last word)
  // and the registration date on top (the domain lecture).
  function phoneView() {
    light();
    const state = recall('phoneTool', { mode: 'phone', phone: '', domain: '', date: ['', '', ''] });
    state.mode = state.mode === 'domain' ? 'domain' : 'phone';
    const $tabs = A.h('div', { class: 'pt-switch' });
    const $phone = A.h('input', { type: 'text', inputmode: 'tel', placeholder: 'as you dial it', value: state.phone || '', autocomplete: 'off', 'aria-label': 'Phone number' });
    const $domain = A.h('input', { type: 'text', inputmode: 'url', placeholder: 'name.com', value: state.domain || '', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', 'aria-label': 'Domain' });
    const date = dateFields(state.date || []);
    const $pbody = A.h('div', {}), $dbody = A.h('div', {});
    let P = root.PlaceWords || null, B = root.BizWords || null;
    const pairsOf = (digits) => { const out = []; for (let i = 0; i < digits.length; i += 2) out.push(digits.slice(i, i + 2)); return out; };
    const drawPhone = () => {
      state.phone = $phone.value; remember('phoneTool', state);
      const digits = $phone.value.replace(/\D/g, '');
      if (digits.length < 4) { A.fill($pbody, A.h('p', { class: 'pt-hint' }, 'Type the number as you dial it, without the country code. Every digit is added for the digit sum; the pairs inside it are read too, the way people say a phone number.')); return; }
      const sum = digits.split('').reduce((a, d) => a + Number(d), 0), v = T.val(sum);
      const rules = [];
      let verdict = 'care', word = 'Only With Care';
      if (sum === 18) { verdict = 'avoid'; word = 'Avoid'; rules.push(['warn', P ? `"${P.phone.bad18}."` : '18/9 reads as competitive.']); }
      else if ([1, 5].includes(v.ds)) { verdict = 'good'; word = 'Good Number'; }
      else if (v.ds === 9) { verdict = 'good'; word = 'Good for a 9'; rules.push(['soft', P ? `A 9 sum suits a 9 business and a 9 person; "${P.phone.not2}"` : 'A 9 sum suits a 9.']); }
      else rules.push(['care', P ? `"${P.phone.land}"` : 'The book lands a business number on 1 or 5, or 9 for a 9.']);
      const pairs = pairsOf(digits);
      const bad = pairs.filter((p) => p.length === 2 && P && P.phone.avoidInside.includes(Number(p)));
      if (bad.length) rules.push(['warn', `${bad.join(', ')} inside the number: "${P.phone.inside}"`]);
      const said = P && P.phone.sums[sum];
      const dayV = date.day();
      const seq = N.sequence(digits, dayV);
      A.fill($pbody,
        A.h('div', { class: 'pt-box pt-sum' },
          A.h('div', { class: 'pt-sumrow' }, A.h('div', { class: 'pt-sumnum', onclick: () => numberSheet(v, 'about') }, A.h('div', { class: 'pt-label' }, 'Digit Sum, Every Digit'), A.h('div', { class: 'bignum' }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v)))), A.h('span', { class: 'pt-verdict ' + verdict }, word)),
          said ? A.h('p', { class: 'pt-words', style: 'margin:4px 4px 0' }, said.replace(/^./, (c) => c.toUpperCase())) : null,
          rules.length ? A.h('div', { class: 'pt-rules' }, ...rules.map(([k, t]) => ruleRow(k, t))) : null),
        A.h('div', { class: 'pt-box' }, A.h('div', { class: 'pt-label' }, 'Read in Pairs'),
          A.h('div', { class: 'codes pairs' }, ...pairs.map((p) => { const n = Number(p), bad = p.length === 2 && P && P.phone.avoidInside.includes(n), b = n >= 10 && B && B.business && B.business[n]; return A.h('span', { class: bad ? 'warn' : b && b.color === 'green' ? '' : 'soft', onclick: () => n >= 10 && numberSheet(T.val(n), 'about') }, n >= 10 ? T.val(n).text : p); })),
          A.h('p', { class: 'muted small', style: 'margin:6px 0 0' }, P ? `Avoid inside the number: ${P.phone.avoidInside.join(', ')}. The book's example: ${P.phone.example}` : '')),
        A.h('div', { class: 'pt-box pt-pyrbox' }, A.h('div', { class: 'pt-label' }, 'The Number as a Chart'),
          A.h('div', { class: 'pt-chart' }, A.h('div', { class: 'pt-chartsvg' }, A.singleNameSvg(seq.chart, '', seq.digits.length, dayV)),
            A.h('p', { class: 'pt-ratio' }, dayV ? `The digits on the central line add up to ${v.text}; day ${dayV.text} on top gives the upper half.` : 'The digits on the central line add up to the digit sum at the bottom. A day on top (the business\'s day) fills the upper half: type it in the date boxes.'))),
        P ? A.h('p', { class: 'pt-foot' }, `${P.phone.land} The lecture: "${P.phone.countryCode}". The sums the book names: ${Object.keys(P.phone.sums).map((n) => T.val(Number(n)).text).join(', ')}.`) : null);
    };
    const drawDomain = () => {
      state.domain = $domain.value; state.date = date.values(); remember('phoneTool', state);
      const words = $domain.value.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[.\-\s/]+/).filter((w) => /\p{L}/u.test(w));
      if (!words.length) { A.fill($dbody, A.h('p', { class: 'pt-hint' }, 'Type the domain, like name.com. Each part is a name on the line (a hyphen or a dot is a space, the ending is the last name); the registration date, from whois.com, goes on top.')); return; }
      const dv = date.day(), inp = { day: date.$d.value, month: date.$m.value, year: date.$y.value, name: words.join(' ') };
      const data = N.numeroscope(inp);
      const vals = words.map((w) => N.nameWord(w).value);
      const le = data.name.le;
      A.fill($dbody,
        A.h('div', { class: 'pt-box pt-sum' },
          A.h('div', { class: 'pt-sumrow' }, A.h('div', { class: 'pt-sumnum', onclick: () => le && numberSheet(le, 'about') }, A.h('div', { class: 'pt-label' }, 'Life Expression'), le ? A.h('div', { class: 'bignum' }, A.h('b', {}, le.text), A.h('span', { class: 'nm' }, nameOf(le))) : A.h('p', { class: 'muted small' }, 'One word has no life expression; add the ending (.com) for one.'))),
          A.h('div', { class: 'codes pairs' }, ...words.map((w, i) => A.h('span', { class: vals[i] && B && B.business && B.business[vals[i].sum] && B.business[vals[i].sum].color === 'green' ? '' : 'soft', onclick: () => vals[i] && numberSheet(vals[i], 'about') }, `${w} ${vals[i] ? vals[i].text : ''}`)))),
        A.h('div', { class: 'nscope-box' }, A.numeroscopeSvg(data)),
        A.h('p', { class: 'pt-ratio' }, dv ? `Drawn like a product's chart: the words on the line, the registration day ${dv.text} on top.` : 'Drawn like a product\'s chart: the words on the line. Type the registration date (whois.com knows it) to fill the top.'),
        P ? A.h('p', { class: 'pt-foot' }, `The lecture: "${P.domain.words}"; "${P.domain.date}". The common ending .com is worth 14/5, "the perfect number value for networking". The course gives no rule for an email address, so there is no email tool.`) : null);
    };
    const tab = (label, on, onclick) => A.h('button', { type: 'button', class: 'pt-tab' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick }, label);
    // The date on top of the chart (the business's start, or a domain's registration date) sits under the box, with
    // one row for both tabs: the row moves to whichever tab is open.
    const $dateRow = A.h('div', { class: 'two-people pt-daterow' }, A.h('div', {}, A.h('div', { class: 'muted small', style: 'padding:0 2px 4px' }, 'Day on top (optional)'), A.h('div', { class: 'dmy' }, date.$d, date.$m, date.$y)), A.h('div', { class: 'togglerow pt-dateright' }, chip('Use My Chart', false, useMine(date, () => { drawPhone(); drawDomain(); }))));
    const $phoneSec = A.h('div', {}, A.h('label', { class: 'pricebox pt-pricebox pt-telbox' }, A.h('span', { class: 'cur' }, '☎'), $phone), $pbody);
    const $domainSec = A.h('div', {}, A.h('label', { class: 'pricebox pt-pricebox pt-telbox' }, A.h('span', { class: 'cur' }, '@'), $domain), $dbody);
    const setMode = (m) => {
      if (m) { state.mode = m; remember('phoneTool', state); A.count(m === 'domain' ? 'phone.domain' : 'phone.phone'); }
      A.fill($tabs, tab('Phone Number', state.mode === 'phone', () => setMode('phone')), tab('Domain', state.mode === 'domain', () => setMode('domain')));
      $phoneSec.classList.toggle('hidden', state.mode !== 'phone'); $domainSec.classList.toggle('hidden', state.mode !== 'domain');
      (state.mode === 'phone' ? $phoneSec : $domainSec).insertBefore($dateRow, (state.mode === 'phone' ? $pbody : $dbody));
    };
    $phone.addEventListener('input', drawPhone); $domain.addEventListener('input', drawDomain); for (const $f of date.all) $f.addEventListener('input', () => { drawPhone(); drawDomain(); });
    A.render(A.h('div', { class: 'screen qscreen tscreen pt' }, top('Phone and Domain', '#/', A.h('span', { class: 'pt-spacer', 'aria-hidden': 'true' })), $tabs, $phoneSec, $domainSec));
    setMode(); drawPhone(); drawDomain();
    Promise.all([P ? P : placewords(), B ? B : bizwords()]).then(([p, b]) => { P = p; B = b; if ($pbody.isConnected) { drawPhone(); drawDomain(); } });
  }

  // ---------- Business Words ----------
  // Marketing Numerology, "TOOL: Business words": enter a number value, get the words worth it, each with the top of its
  // number pyramid and the pyramid's verdict as a color. The words are the 60,000 most common English words valued by
  // the app's letter table (server/words.js); the book's own boost words and personal titles come first, from
  // placewords.js. Check a Word: one word's value, consonants, vowels and pyramid; its charts one tap away.
  function wordsView() {
    light();
    const state = recall('wordsTool', { mode: 'list', value: 19, word: '' });
    state.mode = state.mode === 'check' ? 'check' : 'list';
    const BOOST = [17, 19, 21, 23, 32, 27, 36, 37];
    const $tabs = A.h('div', { class: 'pt-switch' }), $chips = A.h('div', { class: 'togglerow' }), $list = A.h('div', {});
    const $any = A.h('input', { type: 'text', inputmode: 'numeric', maxlength: 2, class: 'numin', placeholder: 'any', 'aria-label': 'Any number from 1 to 99' });
    const $word = A.h('input', { type: 'text', placeholder: 'a word', value: state.word || '', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', 'aria-label': 'Word' });
    const $check = A.h('div', {});
    let P = root.PlaceWords || null;
    const topPill = (w) => A.h('span', { class: 'wtop ' + w.tone }, '▲ ' + (w.top ? w.top.text : '–'));
    const kv = (w) => A.h('span', { class: 'wkv' }, `K ${w.consonants ? w.consonants.text : '–'} · V ${w.vowels ? w.vowels.text : '–'}`);
    const open = (word) => { A.count('words.open'); A.openWord(word, null); };
    const row = (w) => A.h('button', { type: 'button', class: 'wordrow', onclick: () => open(w.word) }, A.h('span', { class: 'wword' }, w.word), kv(w), topPill(w));
    let seq = 0;
    const drawList = async () => {
      remember('wordsTool', state);
      const n = state.value, v = T.val(n);
      A.fill($chips, ...BOOST.map((b) => chip(T.val(b).text, state.value === b, () => { state.value = b; $any.value = ''; A.count('words.pick'); drawList(); })), A.h('label', { class: 'pt-daylab' }, A.h('span', {}, 'or'), $any));
      const mine = ++seq;
      const boost = P && P.boost.lists[n] ? P.boost.lists[n] : [];
      const titles = P ? P.boost.titles.filter((t) => t.values.split('+').map((x) => Number(x.trim().split('/')[0])).includes(n)) : [];
      A.fill($list, A.h('div', { class: 'pt-vibe' }, A.h('div', { class: 'bignum', onclick: () => numberSheet(v, 'about') }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v)))),
        boost.length ? A.h('div', { class: 'pt-fits' }, A.h('div', { class: 'pt-label' }, 'The Book\'s Boost Words'), A.h('div', { class: 'codes' }, ...boost.map((w) => A.h('span', { onclick: () => open(w) }, w)))) : null,
        titles.length ? A.h('div', { class: 'pt-fits' }, A.h('div', { class: 'pt-label' }, 'Personal Titles'), ...titles.map((t) => A.h('p', { class: 'wtitle' }, A.h('b', {}, t.title), ` = ${t.values}`, t.words ? A.h('span', { class: 'muted' }, ` · ${t.words}`) : null))) : null,
        A.h('div', { class: 'pt-listhead' }, A.h('span', { class: 'wlabel tl' }, 'English Words Worth It'), A.h('span', { class: 'pt-legend' }, A.h('span', {}, A.h('i', { class: 'g' }), 'light'), A.h('span', {}, A.h('i', { class: 'y' }), 'medium'), A.h('span', {}, A.h('i', { class: 'r' }), 'heavy'))),
        A.h('p', { class: 'muted small' }, 'Loading…'));
      try {
        const r = await A.api(`/api/words?value=${n}&limit=80`);
        if (mine !== seq) return;
        const $rows = A.h('div', { class: 'wordrows' }, ...r.words.map(row));
        $list.lastChild.replaceWith(r.words.length ? $rows : A.h('p', { class: 'pt-hint' }, 'No common English word adds up to that.'));
        if (r.total > r.words.length) $list.append(A.h('p', { class: 'pt-foot' }, `${r.total} words add up to ${v.text}; the ${r.words.length} most common are listed. K = consonants, V = vowels (the word's sub-vibrations); ▲ = the top of its number pyramid, green when the pyramid is light, red when heavy or a tension number sits on top. Tap a word for its charts and pyramid.`));
        else $list.append(A.h('p', { class: 'pt-foot' }, 'K = consonants, V = vowels (the word\'s sub-vibrations); ▲ = the top of its number pyramid, green when the pyramid is light, red when heavy or a tension number sits on top. Tap a word for its charts and pyramid.'));
      } catch (err) { if (mine === seq) $list.lastChild.replaceWith(A.h('p', { class: 'err small' }, err.message)); }
    };
    let cseq = 0;
    const drawCheck = async () => {
      state.word = $word.value; remember('wordsTool', state);
      const w = $word.value.trim();
      if (!/\p{L}/u.test(w)) { A.fill($check, A.h('p', { class: 'pt-hint' }, 'Type a word: its number value, consonants and vowels, and its number pyramid with the top number the book\'s tool shows.')); return; }
      const mine = ++cseq;
      try {
        const r = await A.api(`/api/words?word=${encodeURIComponent(w)}`);
        if (mine !== cseq) return;
        const rows = r.pyramid.slice().reverse();
        A.fill($check,
          A.h('div', { class: 'pt-box pt-sum' }, A.h('div', { class: 'pt-sumrow' }, A.h('div', { class: 'pt-sumnum', onclick: () => numberSheet(T.val(r.value.sum), 'about') }, A.h('div', { class: 'pt-label' }, r.word), A.h('div', { class: 'bignum' }, A.h('b', {}, r.value.text), A.h('span', { class: 'nm' }, nameOf(T.val(r.value.sum))))), topPill(r)),
            A.h('p', { class: 'pt-words', style: 'margin:4px 4px 0' }, `Consonants ${r.consonants ? r.consonants.text : '–'} · Vowels ${r.vowels ? r.vowels.text : '–'}${r.rank !== null ? ` · common English word` : ''}`)),
          A.h('div', { class: 'pt-box pt-pyrbox' }, A.h('div', { class: 'pt-label' }, 'Number Pyramid'),
            A.h('div', { class: 'pyr' }, ...rows.map((rw, i) => A.h('div', { class: 'pyr-row' }, ...rw.map((x) => A.h('span', { class: N.TENSION[x.sum] ? (i === 0 ? 'top-tense' : 'tense') : '' }, i === rows.length - 1 ? String(x.sum) : x.text))))),
            A.h('p', { class: 'pt-ratio' }, r.ratio >= 0.3 ? `A heavy pyramid: ratio ${r.ratio}, at or over the 0.3 line` : r.ratio > 0 ? `Some weight in the pyramid: ratio ${r.ratio}, under the 0.3 line` : 'A light pyramid: no tension numbers')),
          A.h('button', { type: 'button', class: 'btn btn-block', onclick: () => open(r.word) }, 'Open Its Charts ›'));
      } catch (err) { if (mine === cseq) A.fill($check, A.h('p', { class: 'err small' }, err.message)); }
    };
    $any.addEventListener('input', () => { const n = Number($any.value); if (n >= 1 && n <= 99) { state.value = n; A.count('words.pick'); drawList(); } });
    $word.addEventListener('input', drawCheck);
    const tab = (label, on, onclick) => A.h('button', { type: 'button', class: 'pt-tab' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', onclick }, label);
    const $listSec = A.h('div', {}, $chips, $list);
    const $checkSec = A.h('div', {}, A.h('label', { class: 'pricebox pt-pricebox pt-telbox' }, A.h('span', { class: 'cur' }, 'Aa'), $word), $check);
    const setMode = (m) => {
      if (m) { state.mode = m; remember('wordsTool', state); if (m === 'check') A.count('words.check'); }
      A.fill($tabs, tab('Words for a Number', state.mode === 'list', () => setMode('list')), tab('Check a Word', state.mode === 'check', () => setMode('check')));
      $listSec.classList.toggle('hidden', state.mode !== 'list'); $checkSec.classList.toggle('hidden', state.mode !== 'check');
    };
    const $templates = A.h('div', {});
    A.render(A.h('div', { class: 'screen qscreen tscreen pt' }, top('Business Words', '#/', A.h('span', { class: 'pt-spacer', 'aria-hidden': 'true' })), $tabs, $listSec, $checkSec, $templates));
    setMode(); drawList(); drawCheck();
    (P ? Promise.resolve(P) : placewords()).then((p) => {
      P = p; if (!$list.isConnected) return;
      A.fill($templates, A.h('div', { class: 'wlabel tl pt-section' }, 'The Manual\'s Name Templates'),
        A.h('div', { class: 'pt-box' }, ...p.templates.map((t) => A.h('p', { class: 'wtitle' }, A.h('b', {}, t.code), ` · ${t.values.join(' ')} `, A.h('span', { class: 'muted' }, t.words))),
          A.h('p', { class: 'muted small', style: 'margin:8px 0 0' }, 'A template is the name line of a business numeroscope: one value per word, for a business started on that day vibration (5A for a 5 day). Pick words worth those values from the lists.')));
      if (state.mode === 'list') drawList();
    });
  }

  // ---------- Find a Date, Plan With Year Rows, Famous People (built 2026-10-20) ----------
  const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  const fmtN = (n) => Number(n).toLocaleString('en-US');
  const dateLine = (inp) => { const d = Number(inp.day), m = Number(inp.month), y = Number(inp.year); return d && m && y ? `${d} ${MON[m - 1]} ${y}` : ''; };
  const dmyBox = (date, label) => A.h('div', {}, label ? A.h('div', { class: 'muted small', style: 'padding:0 2px 4px' }, label) : null, A.h('div', { class: 'dmy' }, date.$d, date.$m, date.$y));

  // ---------- Find a Date ----------
  // Superdates Cosmic Calendar ch. 8, "strategic resonance map": pick what the day is for, and the tool lists the
  // Super and Good Dates ahead whose day of the month carries that purpose's numbers (NumberTools.findDates). A
  // business's start day adds the book's company fit: the days that suit its energy and the ones to avoid.
  function findDateView() {
    light();
    const now = todayIn();
    const state = recall('findDateTool', { purpose: 'launch', span: 90, superOnly: false, company: ['', '', ''] });
    if (!T.PURPOSES.some((p) => p.key === state.purpose)) state.purpose = 'launch';
    if (![30, 60, 90].includes(state.span)) state.span = 90;
    let start = now;
    const company = dateFields(state.company || [], ['day', 'month', 'year']);
    const $purposes = A.h('div', { class: 'togglerow' }), $words = A.h('p', { class: 'pt-purpose' }), $spans = A.h('div', { class: 'togglerow' }), $fit = A.h('p', { class: 'muted small pt-fitnote' }), $body = A.h('div', {});
    const $date = A.h('input', { type: 'date', class: 'datebox', 'aria-label': 'First day' });
    $date.addEventListener('change', () => { const p = parseIso($date.value); if (p) { start = p; draw(); } });
    const open = (e) => { A.count('finddate.open_day'); dayFull({ y: e.y, m: e.m, d: e.d }); };
    const draw = () => {
      state.company = company.values(); remember('findDateTool', state);
      $date.value = iso(start.y, start.m, start.d);
      A.fill($purposes, ...T.PURPOSES.map((p) => chip(p.label, state.purpose === p.key, () => { state.purpose = p.key; A.count('finddate.purpose'); draw(); })));
      A.fill($spans, ...[30, 60, 90].map((n) => chip(`${n} Days`, state.span === n, () => { state.span = n; draw(); })),
        chip('Super Dates Only', state.superOnly, () => { state.superOnly = !state.superOnly; A.count('finddate.super_only'); draw(); }));
      const cd = company.day();
      const r = T.findDates(state.purpose, start.y, start.m, start.d, state.span, cd ? cd.sum : null);
      const p = r.purpose;
      A.fill($words, A.h('b', {}, `${p.label} days: ${p.days.join(', ')}`), A.h('span', {}, ` · ${p.words}`));
      const fit = r.fit;
      A.fill($fit, !cd ? 'Add the day your business started and the list says which dates suit its energy (the book\'s company table).'
        : fit.unknown ? `${fit.ds === 8 ? 'An' : 'A'} ${fit.ds} business: the book's company table has rows for 1, 3, 5, 6 and 8 businesses only, so no fit is marked.`
        : `${fit.ds === 8 ? 'An' : 'A'} ${fit.ds} business (started on the ${ordinal(fit.day)}): best on the ${fit.best.map(ordinal).join(', ')}${fit.avoid.length ? `; avoid the ${fit.avoid.map(ordinal).join(' and ')} (${fit.why})` : '; the only day to avoid is a Mercury retrograde week, which the app does not track'}.`);
      let days = r.days;
      if (state.superOnly) days = days.filter((e) => e.rating === 'super');
      const rows = days.map((e) => A.h('div', { class: 'fdrow' + (e.clash ? ' clash' : ''), role: 'button', onclick: () => open(e) },
        dateCharts(e.y, e.m, e.d, false),
        A.h('div', { class: 'fdmid' }, A.h('div', { class: 'fdd' }, `${DOW[e.weekday].slice(0, 3)}, ${MON[e.m - 1]} ${e.d}${e.y !== now.y ? ', ' + e.y : ''}`), A.h('div', { class: 'fdv' }, `Day ${e.dv.text} ${nameOf(e.dv)} · essence ${e.lp.text}`)),
        A.h('div', { class: 'fdr' }, rate(e.rating), e.fits ? A.h('span', { class: 'fit yes' }, 'Fits Your Business') : e.clash ? A.h('span', { class: 'fit no' }, 'Avoid for Your Business') : null)));
      A.fill($body,
        rows.length ? A.h('div', { class: 'fdrows' }, ...rows) : A.h('p', { class: 'pt-hint' }, `No ${state.superOnly ? 'Super Dates' : 'Super or Good Dates'} on a ${p.label.toLowerCase()} day in these ${state.span} days. Try a later start or a longer span.`),
        A.h('p', { class: 'pt-foot' }, `${rows.length} ${rows.length === 1 ? 'date' : 'dates'} in ${state.span} days from ${MON[start.m - 1]} ${start.d}${r.skipped ? `; ${r.skipped} ${r.skipped === 1 ? 'day' : 'days'} with the right number left out as Beware` : ''}. Tap a date for its charts and the reasons. The purpose's numbers are the book's strategic resonance map; Super, Good and Beware follow the success codes, as in Coming Days.`));
    };
    for (const $f of company.all) $f.addEventListener('input', draw);
    A.render(A.h('div', { class: 'screen qscreen tscreen pt' }, top('Find a Date', '#/', A.h('a', { class: 'btn iconbtn', href: '#/coming', 'aria-label': 'Coming Days', title: 'Coming Days' }, '▦')),
      A.h('div', { class: 'wlabel tl' }, 'What the Day Is For'), $purposes, $words,
      A.h('div', { class: 'wlabel tl' }, 'Starting'),
      A.h('div', { class: 'row ynav tnav' }, A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'A month earlier', onclick: () => { start = shift(start, -31); draw(); } }, '‹'), $date, A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'A month later', onclick: () => { start = shift(start, 31); draw(); } }, '›')),
      $spans,
      A.h('div', { class: 'pt-bizrow' }, A.h('div', { class: 'pt-bizhead' }, A.h('span', { class: 'muted small' }, 'Your Business Started (optional)'), A.h('button', { type: 'button', class: 'linkbtn', onclick: useMine(company, draw) }, 'Use My Chart')), A.h('div', { class: 'dmy' }, company.$d, company.$m, company.$y)),
      $fit, $body));
    draw();
  }

  // ---------- Plan With Year Rows ----------
  // Forecasting Numerology, "TOOL: Plan with your Year Rows": a person's year rows searched for the book's good
  // combinations (and the difficult ones to steer around), each hit named and the cells ringed in the same table the
  // Year Rows popup draws (app.js rowsTable). The person: My Chart, a chart in the vault, or a typed name and date.
  function planRowsView() {
    light();
    const now = todayIn();
    const state = recall('planRowsTool', { who: 'me', year: now.y, keys: T.ROW_COMBOS.good.map((c) => c.key), typed: { name: '', date: ['', '', ''] }, vault: null });
    if (!['me', 'vault', 'typed'].includes(state.who)) state.who = 'me';
    if (!Array.isArray(state.keys)) state.keys = T.ROW_COMBOS.good.map((c) => c.key);
    let year = Number(state.year) || now.y, me = recall('mychart', null), focus = null;
    const typed = state.typed || { name: '', date: ['', '', ''] };
    const $name = A.h('input', { type: 'text', placeholder: 'Full name', value: typed.name || '', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', 'aria-label': 'Full name' });
    const date = dateFields(typed.date || []);
    const $search = A.h('input', { type: 'search', placeholder: 'Search the vault by name', autocomplete: 'off', 'aria-label': 'Search the vault by name' });
    const $tabs = A.h('div', { class: 'pt-switch three' }), $who = A.h('div', {}), $chips = A.h('div', { class: 'togglerow' }), $hard = A.h('div', { class: 'togglerow' }), $yearNote = A.h('p', { class: 'muted small ynote' }), $yearTitle = A.h('div', { class: 'wlabel' }), $body = A.h('div', {});
    const $found = A.h('div', { class: 'planfound' });
    const person = () => {
      if (state.who === 'me') return me && me.day ? { day: me.day, month: me.month, year: me.year, name: me.name || '', augment: true, label: me.name || 'My Chart' } : null;
      if (state.who === 'vault') { const v = state.vault; return v && v.inputs && v.inputs.year ? { ...v.inputs, augment: true, label: v.title || v.inputs.name } : null; }
      const d = Number(date.$d.value), m = Number(date.$m.value), y = Number(date.$y.value);
      return d && m && y >= 1000 ? { day: d, month: m, year: y, name: $name.value.trim(), augment: true, label: $name.value.trim() || 'Typed' } : null;
    };
    const save = () => { state.year = year; state.typed = { name: $name.value, date: date.values() }; remember('planRowsTool', state); };
    const setWho = (w) => { state.who = w; focus = null; draw(); };
    const drawWho = () => {
      A.fill($tabs, ...[['me', 'My Chart'], ['vault', 'From the Vault'], ['typed', 'Type a Name']].map(([k, l]) => A.h('button', { type: 'button', class: 'pt-tab' + (state.who === k ? ' on' : ''), onclick: () => setWho(k) }, l)));
      if (state.who === 'me') A.fill($who, me && me.day ? A.h('p', { class: 'planwho' }, A.h('b', {}, me.name || 'My Chart'), A.h('span', {}, dateLine(me))) : A.h('p', { class: 'pt-hint', style: 'margin-top:0' }, 'My Chart has no birth date yet. ', A.h('a', { href: '#/mychart' }, 'Set it up in Settings ›')));
      else if (state.who === 'vault') A.fill($who, $search, state.vault ? A.h('p', { class: 'planwho' }, A.h('b', {}, state.vault.title || state.vault.inputs.name), A.h('span', {}, dateLine(state.vault.inputs)), A.h('a', { href: `#/chart/${state.vault.id}`, class: 'muted small' }, 'Open ›')) : A.h('p', { class: 'muted small', style: 'margin:4px 2px 0' }, 'Type part of a name; charts with a name and a full birth date are listed.'), $hits);
      else A.fill($who, A.h('div', { class: 'two-people house-in' }, A.h('div', {}, A.h('div', { class: 'muted small', style: 'padding:0 2px 4px' }, 'Name'), $name), dmyBox(date, 'Birth date')));
    };
    const $hits = A.h('div', { class: 'famrows' });
    let seq = 0;
    $search.addEventListener('input', async () => {
      const q = $search.value.trim(), mine = ++seq;
      if (!q) { A.fill($hits); return; }
      try {
        const r = await A.api(`/api/images?name=${encodeURIComponent(q)}&limit=12&drawn=1`);
        if (mine !== seq) return;
        const items = r.items.filter((i) => i.inputs && i.inputs.name && i.inputs.year);
        A.fill($hits, ...items.map((i) => A.h('button', { type: 'button', class: 'famrow', onclick: () => { state.vault = { id: i.id, title: i.title || '', inputs: i.inputs }; $search.value = ''; A.fill($hits); A.count('planrows.pick_chart'); focus = null; draw(); } }, A.h('span', { class: 'fg' }, i.title || i.inputs.name), A.h('span', { class: 'fs' }, dateLine(i.inputs)))),
          items.length ? null : A.h('p', { class: 'muted small', style: 'margin:4px 2px' }, 'No chart with that name and a full birth date.'));
      } catch (err) { if (mine === seq) A.fill($hits, A.h('p', { class: 'err small' }, err.message)); }
    });
    const toggle = (k) => { state.keys = state.keys.includes(k) ? state.keys.filter((x) => x !== k) : state.keys.concat(k); focus = null; A.count('planrows.combo'); draw(); };
    const drawChips = () => {
      A.fill($chips, ...T.ROW_COMBOS.good.map((c) => chip(c.label, state.keys.includes(c.key), () => toggle(c.key))));
      A.fill($hard, ...T.ROW_COMBOS.difficult.map((c) => A.h('button', { type: 'button', class: 'chip ' + (state.keys.includes(c.key) ? 'warn' : 'off'), onclick: () => toggle(c.key) }, c.label)));
    };
    const draw = () => {
      save(); drawWho(); drawChips();
      const who = person();
      $yearTitle.textContent = `Year Rows ${year}`;
      if (!who) { $yearNote.textContent = ''; A.fill($found); A.fill($body, A.h('p', { class: 'pt-hint' }, state.who === 'typed' ? 'Type a name and the whole birth date: day, month and year.' : state.who === 'vault' ? 'Pick a chart from the vault above.' : '')); return; }
      if (year < Number(who.year)) year = Number(who.year);
      const r = N.yearRows(who, year);
      if (!r) { $yearNote.textContent = ''; A.fill($found); A.fill($body, A.h('p', { class: 'pt-hint' }, 'Before the birth year.')); return; }
      $yearNote.textContent = `${who.label} · age ${r.formula.age} · ${r.formula.words}${r.hasName ? '' : ' · no name: the life expression and pillar rows are empty'}`;
      const hits = T.rowHits(r.rows, state.keys);
      const shown = focus === null ? hits : hits.filter((x, i) => i === focus);
      const rowMark = new Map();
      for (const x of shown) for (const c of x.cells) { if (!rowMark.has(c.row)) rowMark.set(c.row, new Set()); rowMark.get(c.row).add((c.self === 'psychic' ? 'ps.' : '') + c.col); }
      const isNow = (x) => year === now.y && (now.m > x.month || (now.m === x.month && now.d >= x.day)) && (now.m < x.until.month || (now.m === x.until.month && now.d <= x.until.day));
      const mark = (x, i) => { const cells = rowMark.get(i); const n = isNow(x) ? 'now' : ''; return cells ? { row: `hit ${n}`, cells: [...cells] } : n; };
      const valText = (v) => (v.sum < 10 ? String(v.sum) : v.text);
      const rowSpan = (x) => (x.cells.length > 1 ? `${A.yearRowLabel(r.rows[x.cells[0].row]).split(' – ')[0]} – ${A.yearRowLabel(r.rows[x.row]).split(' – ')[1]}` : A.yearRowLabel(r.rows[x.row]));
      A.fill($found, A.h('div', { class: 'pt-label', style: 'padding:0 2px' }, hits.length ? `Found in ${year}: ${hits.length}` : `Nothing from the list in ${year}`),
        ...hits.map((x, i) => A.h('div', { class: `hitrow ${x.combo.kind}` + (focus === i ? ' on' : ''), role: 'button', onclick: () => { focus = focus === i ? null : i; A.count('planrows.hit'); draw(); } },
          A.h('span', { class: 'hn' }, x.combo.label),
          A.h('span', { class: 'hw' }, x.combo.words, A.h('span', {}, `${rowSpan(x)} · ${T.SELF_WORDS[x.self]}, ${x.cells.length > 1 ? 'down the ' + T.COL_WORDS[x.col] + ' column' : 'the ' + T.COL_WORDS[x.col]}${x.cells.length === 1 && x.value.sum !== x.combo.num ? ' ' + valText(x.value) : ''}`)))),
        hits.length ? A.h('p', { class: 'muted small', style: 'margin:6px 2px 0' }, 'Tap one to see only it in the table; tap again for all.') : null);
      A.fill($body, A.rowsTable(r.rows, A.yearRowLabel, mark), A.h('p', { class: 'muted small', style: 'margin:8px 0 0' }, 'Tap a number for what it means; a sum also shows the two rows above it read as one number.'));
    };
    const moveYear = (by) => { year += by; focus = null; A.count('planrows.year'); draw(); };
    $name.addEventListener('input', draw); for (const $f of date.all) $f.addEventListener('input', draw);
    const $years = A.h('div', { class: 'row ynav' }, A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Previous year', onclick: () => moveYear(-1) }, '‹'), $yearNote, A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Next year', onclick: () => moveYear(1) }, '›'));
    A.render(A.h('div', { class: 'screen qscreen tscreen pt' }, top('Plan With Year Rows', '#/', A.h('span', { class: 'pt-spacer', 'aria-hidden': 'true' })),
      $tabs, $who,
      A.h('div', { class: 'wlabel tl' }, 'Good Combinations'), $chips,
      A.h('div', { class: 'wlabel tl' }, 'Difficult Ones'), $hard,
      A.h('div', { class: 'wcard plancard' }, $yearTitle, $years, $found, $body),
      A.h('p', { class: 'pt-foot' }, 'The lists are the Forecasting book\'s: "17/8 attracts the spotlight. 10/1 would create a winning mentality and drive. 14/5 would attract sales and networking. The money triad (3-5-8) would bring new status and earnings. 15/6 would boost your charisma. And the World Conqueror (5-8-13/4) could boost your career." A triad is read down a column: two rows and their sum.')));
    draw();
    if (!me) A.api('/api/mychart').then((r) => { me = r; remember('mychart', r); if ($body.isConnected) draw(); }).catch(() => {});
  }

  // ---------- Famous People ----------
  // The course's results on 100,000 famous people (the Humanity Archetyping book, public/celebrities.js): by birthday,
  // the careers that rank that day among their most common; by career, its most common birthdays and the book's
  // line on why. "In your vault" counts the charts born on that day (the position search).
  const celebrities = lazy('celebrities.js', 'Celebrities');
  function famousView() {
    light();
    const state = recall('famousTool', { mode: 'day', day: todayIn().d, group: '' });
    state.mode = state.mode === 'career' ? 'career' : 'day';
    state.day = Math.min(31, Math.max(1, Number(state.day) || 1));
    const $tabs = A.h('div', { class: 'pt-switch' }), $body = A.h('div', {});
    const $search = A.h('input', { type: 'search', placeholder: 'Search careers', autocomplete: 'off', 'aria-label': 'Search careers' });
    let C = root.Celebrities || null, vault = {}, seq = 0;
    const setMode = (m) => { state.mode = m; A.count('famous.' + m); draw(); };
    const pickDay = (d) => { state.day = d; state.mode = 'day'; A.count('famous.pick_day'); draw(); };
    const pickGroup = (g) => { state.group = g; state.mode = 'career'; A.count('famous.pick_career'); draw(); };
    const placePill = (p) => A.h('span', { class: 'place' + (p === 1 ? ' top' : '') }, `No. ${p}`);
    const drawDay = () => {
      const d = state.day, v = T.val(d), list = (C.byDay[String(d)] || []).slice().sort((a, b) => a.place - b.place || b.size - a.size);
      const mine = ++seq;
      if (vault[d] === undefined) A.api(`/api/positions/counts?num=${d}`).then((r) => { vault[d] = (r.counts || {})['essence.day'] || 0; if (mine === seq && $body.isConnected) drawDay(); }).catch(() => { vault[d] = null; });
      A.fill($body,
        A.h('div', { class: 'daypick', role: 'group', 'aria-label': 'Day of the month' }, ...Array.from({ length: 31 }, (_, i) => A.h('button', { type: 'button', class: state.day === i + 1 ? 'on' : '', onclick: () => pickDay(i + 1) }, String(i + 1)))),
        A.h('div', { class: 'pt-box pt-sum' },
          A.h('div', { class: 'pt-sumrow' }, A.h('div', { class: 'pt-sumnum', onclick: () => numberSheet(v, 'dv') }, A.h('div', { class: 'pt-label' }, `Born on the ${ordinal(d)}`), A.h('div', { class: 'bignum' }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v)))),
            A.h('button', { type: 'button', class: 'linkbtn', onclick: async () => { try { const me = await A.api('/api/mychart'); if (!me.day) { A.toast('Set up My Chart first (Settings).', true); return; } pickDay(Number(me.day)); } catch (err) { A.toast(err.message, true); } } }, 'My Day')),
          A.h('p', { class: 'pt-formula' }, list.length ? `Among the most common birthdays in ${list.length} ${list.length === 1 ? 'career' : 'careers'} of the ${C.groups.length} in the study.` : 'Not among the top birthdays of any career in the study.'),
          vault[d] ? A.h('a', { class: 'pt-vault', href: `#/?pos=essence.day&num=${d}`, onclick: () => A.count('famous.vault') }, `${fmtN(vault[d])} ${vault[d] === 1 ? 'chart' : 'charts'} in your vault born on the ${ordinal(d)} ›`) : vault[d] === 0 ? A.h('p', { class: 'muted small', style: 'margin:8px 0 0' }, `No chart in your vault is born on the ${ordinal(d)}.`) : null),
        list.length ? A.h('div', { class: 'famrows' }, ...list.map((x) => A.h('button', { type: 'button', class: 'famrow', onclick: () => pickGroup(x.group) }, placePill(x.place), A.h('span', { class: 'fgcol' }, A.h('span', { class: 'fg' }, x.group), A.h('span', { class: 'fs' }, `${fmtN(x.size)} people in the study`)), A.h('span', { class: 'fdays' }, '›')))) : null,
        A.h('p', { class: 'pt-foot' }, `The book's own caution: "${C.note}" Tap a career for its other top birthdays and the book's line on why.`));
    };
    const drawCareer = () => {
      const q = $search.value.trim().toLowerCase();
      const g = state.group ? C.groups.find((x) => x.name === state.group) : null;
      if (g && !q) {
        A.fill($body, $search,
          A.h('div', { class: 'pt-box pt-sum' },
            A.h('div', { class: 'pt-sumrow' }, A.h('div', {}, A.h('div', { class: 'pt-label' }, `${fmtN(g.size)} people in the study`), A.h('div', { class: 'famname' }, g.name)), A.h('button', { type: 'button', class: 'linkbtn', onclick: () => { state.group = ''; draw(); } }, 'All Careers')),
            A.h('div', { class: 'pt-label', style: 'margin-top:10px' }, 'Most common birthdays'),
            A.h('div', { class: 'famdays' }, ...g.ranks.flatMap((rk, i) => rk.days.map((d) => A.h('button', { type: 'button', class: 'famday', onclick: () => pickDay(d) }, A.h('b', {}, ordinal(d)), A.h('span', {}, `No. ${i + 1} · ${fmtN(rk.count)}`))))),
            g.line ? A.h('p', { class: 'pt-quote' }, `"${g.line}"`) : A.h('p', { class: 'muted small', style: 'margin:8px 0 0' }, 'The book lists the days without a line on why.')),
          A.h('p', { class: 'pt-foot' }, 'Tap a day for every career that ranks it, and the charts in your vault born on it.'));
        return;
      }
      const groups = C.groups.filter((x) => !q || x.name.toLowerCase().includes(q));
      A.fill($body, $search,
        groups.length ? A.h('div', { class: 'famrows' }, ...groups.map((x) => A.h('button', { type: 'button', class: 'famrow', onclick: () => { $search.value = ''; pickGroup(x.name); } }, A.h('span', { class: 'fgcol' }, A.h('span', { class: 'fg' }, x.name), A.h('span', { class: 'fs' }, `${fmtN(x.size)} people`)), A.h('span', { class: 'fdays' }, x.ranks.slice(0, 3).flatMap((rk) => rk.days).slice(0, 4).map(ordinal).join(' · '))))) : A.h('p', { class: 'pt-hint' }, 'No career by that name in the study.'),
        A.h('p', { class: 'pt-foot' }, `${C.groups.length} careers, largest first, with their most common birthdays. Tap one for the book's line on why those days.`));
    };
    const draw = () => {
      remember('famousTool', state);
      A.fill($tabs, ...[['day', 'By Birthday'], ['career', 'By Career']].map(([k, l]) => A.h('button', { type: 'button', class: 'pt-tab' + (state.mode === k ? ' on' : ''), onclick: () => setMode(k) }, l)));
      if (!C) { A.fill($body, A.h('p', { class: 'muted' }, 'Loading…')); return; }
      if (state.mode === 'day') drawDay(); else drawCareer();
    };
    $search.addEventListener('input', () => { if (state.mode === 'career') drawCareer(); });
    A.render(A.h('div', { class: 'screen qscreen tscreen pt' }, top('Famous People', '#/', A.h('span', { class: 'pt-spacer', 'aria-hidden': 'true' })), $tabs, $body));
    draw();
    if (!C) celebrities().then((c) => { C = c && c.groups ? c : null; if (!C) { A.fill($body, A.h('p', { class: 'err' }, 'The study could not be loaded. Reload the app and try again.')); return; } if ($body.isConnected) draw(); });
  }

  // The home screen's Tools list (app.js draws the rest of the home screen).
  function homeButtons() {
    const h = A.h, now = todayIn(), e = T.dayEnergy(now.y, now.m, now.d);
    const me = recall('mychart', null);
    const btn = (href, icon, label, sub, name) => h('a', { class: 'btn', href, onclick: () => A.count(name) }, h('span', { class: 'qicon' }, icon), label, sub ? h('span', { class: 'sub' }, sub) : null);
    const $me = btn(me && me.day ? '#/quick?me=1' : '#/mychart', '☰', 'My Chart', me && me.day ? 'year rows, day rows' : 'set it up', 'home.mychart');
    // This phone may not have seen the saved chart yet: ask the server once and fix the button in place.
    if (!me) A.api('/api/mychart').then((r) => { remember('mychart', r); if (r.day) { $me.href = '#/quick?me=1'; $me.querySelector('.sub').textContent = 'year rows, day rows'; } }).catch(() => {});
    return h('div', { class: 'tools' }, h('div', { class: 'summary rhead' }, 'Tools'),
      btn('#/today', '☀', 'Today', e ? `${DOW[e.weekday].slice(0, 3)} ${MON[now.m - 1]} ${now.d} · ${e.dv.text}` : '', 'home.today'),
      btn('#/coming', '▦', 'Coming Days', 'next 31 days', 'home.coming'),
      btn('#/finddate', '◎', 'Find a Date', 'launch, deal, event', 'home.finddate'),
      btn('#/planrows', '≡', 'Plan With Year Rows', 'good periods', 'home.planrows'),
      btn('#/numberfun', '◇', 'Number Fun', '1 to 99', 'home.numberfun'),
      btn('#/famous', '★', 'Famous People', 'by birthday', 'home.famous'),
      btn('#/price', '$', 'Price Tool', '', 'home.price'),
      btn('#/house', '⌂', 'House Number', 'home or business', 'home.house'),
      btn('#/phone', '☎', 'Phone and Domain', '', 'home.phone'),
      btn('#/words', 'Aa', 'Business Words', 'by number', 'home.words'),
      btn('#/archetype', '✦', 'Archetype Words', 'numbers to words', 'home.archetype'),
      btn('#/relation', '⧫', 'Relationship', 'two people', 'home.relation'),
      btn('#/karmic', '∞', 'Karmic Connections', 'shared rhythms', 'home.karmic'),
      $me);
  }

  const USAGE_LABELS = {
    'screen.today': 'Today', 'screen.coming': 'Coming Days', 'screen.numberfun': 'Number Fun', 'screen.price': 'Price Tool', 'screen.relation': 'Relationship', 'screen.karmic': 'Karmic Connections', 'screen.mychart': 'My Chart (settings)',
    'home.today': 'Home → Today', 'home.coming': 'Home → Coming Days', 'home.numberfun': 'Home → Number Fun', 'home.price': 'Home → Price Tool', 'home.relation': 'Home → Relationship', 'home.karmic': 'Home → Karmic Connections', 'home.mychart': 'Home → My Chart',
    'today.psyche': 'Today: psyche charts on or off', 'today.full': 'Today: full screen day', 'today.ruler': 'Today: ruler of the day', 'today.company': 'Today: a company started this day', 'dayfull.move': 'Full screen day: previous or next day', 'coming.open_day': 'Coming Days: open a day', 'coming.size': 'Coming Days: chart size', 'coming.super_only': 'Coming Days: super dates only', 'numberfun.type': 'Number Fun: type a number', 'numberfun.grid': 'Number Fun: All Numbers grid on or off', 'numberfun.size': 'Number Fun: grid chart size', 'numberfun.tap_cell': 'Number Fun: open a number from the grid', 'numberfun.open_from_sheet': 'Number Fun: open a number from its sheet', 'numberfun.tap_diamond': 'Number Fun: tap a diamond', 'numberfun.tap_other': 'Number Fun: tap a number it appears in',
    'screen.house': 'House Number', 'screen.phone': 'Phone and Domain', 'screen.words': 'Business Words', 'home.house': 'Home → House Number', 'home.phone': 'Home → Phone and Domain', 'home.words': 'Home → Business Words',
    'screen.finddate': 'Find a Date', 'screen.planrows': 'Plan With Year Rows', 'screen.famous': 'Famous People', 'home.finddate': 'Home → Find a Date', 'home.planrows': 'Home → Plan With Year Rows', 'home.famous': 'Home → Famous People',
    'finddate.purpose': 'Find a Date: pick a purpose', 'finddate.super_only': 'Find a Date: super dates only', 'finddate.open_day': 'Find a Date: open a day',
    'planrows.pick_chart': 'Plan With Year Rows: pick a chart from the vault', 'planrows.combo': 'Plan With Year Rows: a combination on or off', 'planrows.year': 'Plan With Year Rows: previous or next year', 'planrows.hit': 'Plan With Year Rows: tap a found combination',
    'famous.day': 'Famous People: By Birthday', 'famous.career': 'Famous People: By Career', 'famous.pick_day': 'Famous People: pick a day', 'famous.pick_career': 'Famous People: pick a career', 'famous.vault': 'Famous People: charts in the vault born that day',
    'phone.phone': 'Phone and Domain: the Phone Number tab', 'phone.domain': 'Phone and Domain: the Domain tab', 'words.pick': 'Business Words: pick a number', 'words.check': 'Business Words: Check a Word', 'words.open': 'Business Words: open a word\'s charts',
    'price.find': 'Price Tool: Find a Price', 'price.vibe': 'Price Tool: pick a vibration', 'price.range': 'Price Tool: pick a range', 'price.pick': 'Price Tool: pick a found price', 'price.number': 'Price Tool: a number in the price', 'price.vibe_text': 'Price Tool: the book\'s page for a vibration', 'price.pyramid': 'Price Tool: the number pyramid', 'price.chart': 'Price Tool: the price chart', 'price.chart_day': 'Price Tool: a day on top of the chart', 'relation.use_me': 'Relationship: me as the first person', 'karmic.book': 'Karmic Connections: the book\'s words shown', 'mychart.save': 'My Chart: save',
  };

  function install(app) {
    A = app;
    Object.assign(A.routes, { today: todayView, coming: comingView, numberfun: numberFunView, price: priceView, relation: relationView, karmic: karmicView, mychart: myChartView, house: houseView, phone: phoneView, words: wordsView, finddate: findDateView, planrows: planRowsView, famous: famousView });
    return { homeButtons, USAGE_LABELS, myChart: () => recall('mychart', null) };
  }
  root.Tools = { install, bigDiamondEl, planetScene };
})(typeof globalThis !== 'undefined' ? globalThis : this);
