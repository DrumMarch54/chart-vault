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

  // The book's words load once, when a tool first needs them (246 KB, kept out of the app's first paint).
  let readingsLoading = null;
  const readings = () => { if (root.Readings) return Promise.resolve(root.Readings); if (!readingsLoading) readingsLoading = new Promise((res) => { const s = document.createElement('script'); s.src = '/readings.js?v=' + (root.APP_VERSION || '0'); s.onload = () => res(root.Readings || {}); s.onerror = () => res({}); document.head.append(s); }); return readingsLoading; };

  // ---------- shared pieces ----------
  const light = () => { document.documentElement.classList.add('light'); A.setCleanup(() => document.documentElement.classList.remove('light')); };
  // The night look of Today and Coming Days: the sky continues under the whole page, the accent follows
  // the ruler of the day (approved as mockup B, 2026-10-15).
  const TINTS = { Sun: '#f6c453', Moon: '#d3d9e8', Mercury: '#9fc9d9', Venus: '#f2c9a0', Mars: '#e58a72', Jupiter: '#dba66b', Saturn: '#e3c995', Uranus: '#8fd3e0', Neptune: '#8aa4f5' };
  const night = (planet) => { const el = document.documentElement; el.classList.add('night'); el.style.setProperty('--tint', TINTS[planet] || TINTS.Venus); A.setCleanup(() => { el.classList.remove('night'); el.style.removeProperty('--tint'); }); };
  // The first sentences of a book passage, for the reading rows (tap for the whole page).
  const snippet = (t, n = 2) => (t ? String(t).split(/(?<=[.!?])\s+/).slice(0, n).join(' ') : '');
  const top = (title, back = '#/', right = null) => A.h('div', { class: 'pagetop ttop' }, A.h('a', { class: 'btn iconbtn', href: back, 'aria-label': 'Back' }, '‹'), A.h('h1', {}, title), right);
  const chip = (label, on, onclick) => A.h('button', { type: 'button', class: `chip ${on ? 'active' : 'off'}`, onclick }, label);
  const rate = (r, cls = '') => A.h('span', { class: `rate ${r} ${cls}` }, T.RATING_WORDS[r]);
  // The two-line heading of a number: "15/6  The Enchanter  · what it is".
  const bigNum = (v, note) => A.h('div', { class: 'bignum' }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v)), note ? A.h('span', { class: 'ty' }, note) : null);
  // A sheet with everything the books say about one number in one position. Tap anywhere outside to close.
  async function numberSheet(v, pos, extra) {
    const R = await readings();
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
    if (!parts.length) parts.push(A.h('p', { class: 'muted' }, 'The books have no page for this number in this place yet.'));
    const kind = T.codeKind(n);
    A.sheet(A.h('div', { class: 'numsheet' }, A.h('h3', {}, `${v.text} ${name}`), kind ? A.h('div', { class: 'codes' }, A.h('span', { class: kind === 'avoid' || kind === 'care' ? 'warn' : kind === 'soft' ? 'soft' : '' }, T.CODE_WORDS[kind])) : null, extra || null, ...parts));
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
  // The codes a date holds, as chips: green strong, blue soft, red to avoid.
  const codeChips = (e) => A.h('div', { class: 'codes' }, ...e.codes.map((c) => A.h('span', { class: c.kind === 'avoid' || c.kind === 'care' || c.kind === 'limited' ? 'warn' : c.kind === 'soft' ? 'soft' : '', onclick: () => numberSheet(c.value, c.pos) }, `${c.value.text} ${T.POSITION_WORDS[c.pos] || c.pos} · ${c.words}`)));
  // Why the date is rated as it is: the rule's own reasons, in the course's words.
  const WHY_WORDS = { super: 'Why a Super Date', good: 'Why only a Good Date', beware: 'Why Beware' };
  const whyBox = (e) => A.h('div', { class: 'why ' + e.rating }, A.h('div', { class: 'head' }, A.h('span', { class: `rate ${e.rating}` }, T.RATING_WORDS[e.rating]), A.h('span', { class: 'pos' }, WHY_WORDS[e.rating])),
    A.h('ul', {}, ...e.reasons.map((r) => A.h('li', {}, r))));
  const psyToggle = (on, onclick) => A.h('button', { type: 'button', class: 'psytog', onclick }, on ? 'Hide Psyche Charts' : 'Show Psyche Charts');

  // ---------- the day's scene: a real photo of the ruler of the day over a starry sky (the paid tool's Today page) ----------
  // NASA photographs (public domain), cropped to the disk and kept small in public/planets/: the Sun by SDO,
  // the Moon by LRO, Mercury by MESSENGER, Venus by Mariner 10, Mars and Jupiter by Hubble and Cassini,
  // Saturn by Cassini, Uranus and Neptune by Voyager 2. Each sits on the sky with a screen blend, so the
  // photo's black background disappears. The sky: star dust, mid stars, a few bright ones with a glint, a
  // Milky Way band and a nebula in the ruler's tint, all seeded by the date so a day always looks the same.
  // The essence (life path) has its own, smaller planet high in the sky.
  function planetScene(e, h = 200) {
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
      A.fill($box, planetScene(e, 200),
        A.h('div', { class: 'nscope-box' }, dateCharts(cur.y, cur.m, cur.d, psyche.on)),
        A.h('div', { class: 'under' }, psyToggle(psyche.on, () => { psyche.on = !psyche.on; remember('toolsPsyche', psyche.on); draw(); })),
        whyBox(e),
        A.h('button', { type: 'button', class: 'btn btn-block readbtn', onclick: () => { close(); if (onReadings) onReadings(cur); else A.go(`#/today/${iso(cur.y, cur.m, cur.d)}`); } }, 'Readings for This Day ›'));
    };
    const move = (by) => { cur = shift(cur, by); A.count('dayfull.move'); draw(); };
    const $pop = A.h('div', { class: 'wordpop dayfull' },
      A.h('div', { class: 'pagetop ttop' }, A.h('button', { type: 'button', class: 'btn iconbtn', 'aria-label': 'Close', onclick: close }, '‹'), A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Previous day', onclick: () => move(-1) }, '‹'), $title, A.h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Next day', onclick: () => move(1) }, '›')),
      $box);
    A.overlay($pop); document.body.append($pop); document.body.classList.add('noscroll'); window.addEventListener('keydown', keys);
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
      night(e.ruler);
      const isToday = date.y === now.y && date.m === now.m && date.d === now.d;
      $title.textContent = `${DOW[e.weekday].slice(0, 3)}, ${MON[date.m - 1]} ${date.d}, ${date.y}`;
      $sub.textContent = isToday ? 'Today in Arizona' : 'Tap the date to come back to today';
      const R = await readings();
      const row = (pos, v) => {
        const b = bookBits(R, pos, v);
        return A.h('div', { class: 'reading', onclick: () => numberSheet(v, pos) },
          A.h('div', { class: 'head' }, A.h('b', {}, v.text), A.h('span', { class: 'nm' }, nameOf(v)), A.h('span', { class: 'pos' }, POS_WORDS[pos])),
          b.kw ? A.h('p', { class: 'kw' }, b.kw) : null,
          A.h('p', {}, b.text ? snippet(b.text, pos === 'target' ? 3 : 2) : POS_INTRO[pos]),
          pos === 'lp' ? A.h('p', { class: 'muted small', style: 'margin-top:4px' }, `Big essence ${e.bigLp.text} ${nameOf(e.bigLp)}.`) : null);
      };
      A.fill($body,
        A.h('div', { class: 'scenebox', onclick: () => { A.count('today.full'); dayFull(date); } }, planetScene(e, 200)),
        A.h('div', { class: 'nscope-box', role: 'button', 'aria-label': 'Full screen', onclick: () => { A.count('today.full'); dayFull(date); } }, dateCharts(date.y, date.m, date.d, psyche.on)),
        A.h('div', { class: 'under' }, A.h('span', { class: 'muted small' }, 'Tap the chart for full screen'), psyToggle(psyche.on, () => { psyche.on = !psyche.on; remember('toolsPsyche', psyche.on); A.count('today.psyche'); draw(); })),
        whyBox(e),
        A.h('div', { class: 'bignum', onclick: () => numberSheet(e.dv, 'dv') }, A.h('b', {}, e.dv.text), A.h('span', { class: 'nm' }, nameOf(e.dv)), A.h('span', { class: 'ty' }, `Day Vibration · Ruler ${e.ruler}`)),
        codeChips(e),
        row('dv', e.dv), row('lp', e.lp), row('outer', e.outer), row('inner', e.inner), row('dvlp', e.dvlp), row('dharma', e.dharma), row('target', e.target),
        A.h('p', { class: 'muted small', style: 'margin:8px 2px' }, 'Tap a number for the book\'s whole page. Super, Good and Beware follow the success codes and the numbers to avoid in "Success Codes & Superdates".'));
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
    const view = { mode: recall('comingMode', 'charts'), superOnly: false, psyche: recall('comingPsyche', false), cols: recall('comingCols', 2) };
    const $body = A.h('div', {}), $chips = A.h('div', { class: 'togglerow' });
    const $date = A.h('input', { type: 'date', class: 'datebox', 'aria-label': 'First day' });
    $date.addEventListener('change', () => { const p = parseIso($date.value); if (p) { start = p; draw(); } });
    const open = (e) => { A.count('coming.open_day'); dayFull({ y: e.y, m: e.m, d: e.d }); };
    const isToday = (e) => e.y === now.y && e.m === now.m && e.d === now.d;
    const draw = () => {
      $date.value = iso(start.y, start.m, start.d);
      const first = T.dayEnergy(start.y, start.m, start.d); night(first ? first.ruler : 'Venus');
      A.fill($chips, chip('Charts', view.mode === 'charts', () => { view.mode = 'charts'; remember('comingMode', 'charts'); draw(); }), chip('List', view.mode === 'list', () => { view.mode = 'list'; remember('comingMode', 'list'); A.count('coming.list'); draw(); }),
        chip('Super Dates Only', view.superOnly, () => { view.superOnly = !view.superOnly; A.count('coming.super_only'); draw(); }),
        view.mode === 'charts' ? chip('Psyche Charts', view.psyche, () => { view.psyche = !view.psyche; remember('comingPsyche', view.psyche); draw(); }) : null,
        view.mode === 'charts' ? chip(view.cols === 2 ? 'Bigger' : 'Smaller', false, () => { view.cols = view.cols === 2 ? 1 : 2; remember('comingCols', view.cols); A.count('coming.size'); draw(); }) : null);
      let days = T.comingDays(start.y, start.m, start.d, 31).filter(Boolean);
      if (view.superOnly) days = days.filter((e) => e.rating === 'super');
      if (!days.length) { A.fill($body, A.h('p', { class: 'muted' }, 'No Super Dates in these 31 days. Try the next month.')); return; }
      const num = (label, v) => A.h('div', {}, A.h('span', {}, label), A.h('b', {}, v.text));
      if (view.mode === 'list') {
        A.fill($body, A.h('div', { class: 'days' }, ...days.map((e) => A.h('div', { class: 'dayrow' + (isToday(e) ? ' today' : ''), role: 'button', onclick: () => open(e) },
          A.h('div', { class: 'd' }, A.h('b', {}, String(e.d)), A.h('span', {}, `${DOW[e.weekday].slice(0, 3)} ${MON[e.m - 1]}`)),
          A.h('div', { class: 'nums' }, num('Day', e.dv), num('Essence', e.lp), num('Outer', e.outer), num('Inner', e.inner), num('Target', e.target)),
          A.h('span', { class: `rate ${e.rating}` }, T.RATING_WORDS[e.rating].replace(' date', ''))))));
      } else {
        A.fill($body, A.h('div', { class: 'minis cols' + view.cols }, ...days.map((e) => A.h('div', { class: 'mini' + (isToday(e) ? ' today' : '') + (e.rating === 'super' ? ' super' : ''), role: 'button', onclick: () => open(e) },
          A.h('div', { class: 'mhead' }, A.h('span', { class: 'd' }, `${DOW[e.weekday].slice(0, 3)} ${MON[e.m - 1]} ${e.d}`), A.h('span', { class: `rate ${e.rating}` }, T.RATING_WORDS[e.rating].replace(' date', ''))),
          dateCharts(e.y, e.m, e.d, view.psyche),
          A.h('div', { class: 'mfoot' }, A.h('b', {}, e.dv.text), A.h('span', { class: 'muted small nm' }, nameOf(e.dv))),
          A.h('div', { class: 'mfoot muted small' }, `Essence ${e.lp.text} · Outer ${e.outer.text} · Inner ${e.inner.text}`)))));
      }
    };
    A.render(A.h('div', { class: 'screen qscreen tscreen' }, top('Coming Days', '#/', A.h('a', { class: 'btn iconbtn', href: '#/today', 'aria-label': 'Today', title: 'Today' }, '☀')),
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
  function tri(svg, d, cx, topY, w, opts = {}) {
    const sv = A.sv, hh = w * 0.75, pad = 0;
    const g = sv('g', { class: 'tri' + (opts.unbalanced ? ' unb' : ''), role: 'button', 'aria-label': `${d.text} ${d.name}` });
    const stroke = opts.unbalanced ? '#e0a0a0' : '#4f86c6';
    g.append(sv('polygon', { points: `${cx - w / 2},${topY} ${cx + w / 2},${topY} ${cx},${topY + hh}`, fill: '#fff', stroke, 'stroke-width': w > 120 ? 2.2 : 1.4 }));
    const f = (k) => Math.max(6.5, w * k);
    const t = (x, y, s, size, cls, anchor) => sv('text', { x, y, 'font-size': size, 'text-anchor': anchor || 'middle', class: cls || '' }, s);
    const bold = (opts.strong ? 'big ' : '') + 'bold';
    g.append(t(cx - w / 2 - 3, topY - 4, opts.aText || String(d.a), f(0.17), bold, 'end'), t(cx + w / 2 + 3, topY - 4, opts.bText || String(d.b), f(0.17), bold, 'start'));
    const nm = opts.name !== undefined ? opts.name : d.name;
    if (nm && w >= 56) g.append(t(cx, topY + f(0.12) + 2, nm, Math.min(f(0.075), (w * 0.84) / (nm.length * 0.56)), opts.unbalanced ? 'name unb' : 'name'));
    const ccy = topY + hh * 0.42, r = w * 0.14;
    g.append(sv('circle', { cx, cy: ccy, r, fill: '#fff', stroke, 'stroke-width': 1.2 }), t(cx, ccy + f(0.1) * 0.36, d.center.text, f(0.1), 'bold'));
    // The auras sit outside the sides (book p. 35): the gap is measured where the text is tallest, at its
    // top, where the triangle is wider than at the baseline.
    const sideY = topY + hh * 0.62, auraF = f(opts.strong ? 0.1 : 0.11), sideX = (w / 2) * (1 - (sideY - auraF * 0.72 - topY) / hh) + 4;
    g.append(t(cx - sideX - 2, sideY, d.outer.text, auraF, 'aura', 'end'), t(cx + sideX + 2, sideY, d.inner.text, auraF, 'aura', 'start'));
    g.append(t(cx, topY + hh + f(0.17) + 1, d.le.text, f(0.16), bold));
    if (opts.onTap) g.addEventListener('click', () => opts.onTap(d));
    svg.append(g);
    return topY + hh + f(0.17) + 4;
  }
  function levelSvg(d, lv, labels, onTap) {
    const sv = A.sv, W = 390, H = labels.noUnbalanced ? 216 : 240;
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dia band', role: 'img' });
    svg.append(sv('rect', { x: 0, y: 0, width: W / 2, height: H, fill: lv === 'main' ? '#e7eef6' : lv === 'essence' ? '#edf2f8' : '#f3f6fa' }), sv('rect', { x: W / 2, y: 0, width: W / 2, height: H, fill: lv === 'main' ? '#cfdde9' : lv === 'essence' ? '#d9e4ee' : '#e4ecf4' }));
    const lab = (x, y, s, cls, anchor) => svg.append(sv('text', { x, y, 'font-size': 9, class: cls || 'lab', 'text-anchor': anchor || 'middle' }, s));
    lab(8, 14, labels.title, 'band-title', 'start'); lab(W - 8, 14, labels.right, 'lab', 'end');
    const top = labels.noUnbalanced ? 50 : 60;
    const mainBottom = tri(svg, d, W / 2, top, 140, { onTap, strong: true, aText: labels.aText, bText: labels.bText, name: labels.mainName });
    lab(W / 2, Math.min(H - 6, mainBottom + 10), labels.mainLabel || (lv === 'main' ? 'Main Diamond' : lv === 'essence' ? 'Essence Diamond' : 'Integration Diamond'));
    const mid = labels.noUnbalanced ? 96 : 122;
    const ob = tri(svg, d.outerD, 62, mid, 92, { onTap }); lab(62, Math.min(H - 6, ob + 10), labels.outerLabel || 'Outer Diamond');
    const ib = tri(svg, d.innerD, W - 62, mid, 92, { onTap }); lab(W - 62, Math.min(H - 6, ib + 10), labels.innerLabel || 'Inner Diamond');
    if (!labels.noUnbalanced) {
      tri(svg, d.outerU, 62, 42, 52, { onTap, unbalanced: true }); lab(62, 30, 'Outer Unbalanced', 'lab unb');
      tri(svg, d.innerU, W - 62, 42, 52, { onTap, unbalanced: true }); lab(W - 62, 30, 'Inner Unbalanced', 'lab unb');
    }
    if (lv === 'main') { lab(W / 4, H - 6, 'OUTER LIFE', 'life'); lab((3 * W) / 4, H - 6, 'INNER LIFE', 'life'); }
    return svg;
  }
  function bigDiamondEl(B, onTap, labels = {}) {
    return A.h('div', { class: 'bigd' },
      levelSvg(B.integration, 'integration', { title: 'SPIRITUAL · The Integration Diamond', right: labels.spiritual || 'How It Evolves Fastest', noUnbalanced: labels.noUnbalanced }, onTap),
      levelSvg(B.essence, 'essence', { title: 'EMOTIONAL · The Essence Diamond', right: labels.emotional || 'Hidden Motivation', noUnbalanced: labels.noUnbalanced }, onTap),
      levelSvg(B.main, 'main', { title: labels.physicalTitle || 'PHYSICAL · The Main Diamond', right: labels.physical || 'How It Acts', noUnbalanced: labels.noUnbalanced, aText: labels.aText, bText: labels.bText, mainName: labels.mainName, mainLabel: labels.mainLabel, outerLabel: labels.outer, innerLabel: labels.inner }, onTap));
  }

  // ---------- Number Fun ----------
  function numberFunView(arg) {
    light();
    let n = Math.min(99, Math.max(1, Number(arg) || recall('numberFun', 14)));
    const $row = A.h('div', { class: 'numrow' }), $body = A.h('div', {});
    const $in = A.h('input', { type: 'text', inputmode: 'numeric', class: 'numin', maxlength: 2, 'aria-label': 'Number' });
    $in.addEventListener('change', () => { const v = Number($in.value); if (v >= 1 && v <= 99) { n = v; A.count('numberfun.type'); draw(); } });
    const jump = (d) => { if (d.code >= 1 && d.code <= 99) { n = d.code; A.count('numberfun.tap_diamond'); draw(); } };
    const draw = async () => {
      remember('numberFun', n); $in.value = String(n);
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
    A.render(A.h('div', { class: 'screen qscreen tscreen' }, top('Number Fun', '#/', $in), $row, $body));
    draw();
  }

  // ---------- Price Tool ----------
  function priceView() {
    light();
    const state = recall('priceTool', { vibe: 23, range: 1, price: '' });
    const $check = A.h('div', {}), $list = A.h('div', {}), $vibes = A.h('div', { class: 'vib' }), $ranges = A.h('div', { class: 'vib' });
    const $in = A.h('input', { type: 'text', inputmode: 'decimal', placeholder: 'any price', 'aria-label': 'Price' });
    const fmt = (p) => '$' + Number(p).toLocaleString('en-US');
    const topCls = (w) => (w.top && N.TENSION[w.top.sum] ? 'r' : w.ratio >= 0.3 ? 'r' : w.ratio > 0 ? 'y' : 'g');
    const drawCheck = () => {
      remember('priceTool', state);
      const c = T.priceCheck($in.value);
      if (!c) { A.fill($check, A.h('p', { class: 'muted small', style: 'margin:6px 2px' }, 'Type a price to read it: digit sum, clean number, the pyramid and the book\'s warnings.')); return; }
      const rows = c.pyramid.slice().reverse();
      const W = c.weight;
      A.fill($check,
        A.h('div', { class: 'bignum', onclick: () => numberSheet(c.value, 'about') }, A.h('b', {}, c.value.text), A.h('span', { class: 'nm' }, c.name), A.h('span', { class: 'ty' }, 'digit sum')),
        A.h('div', { class: 'codes' }, ...c.warnings.map((w) => A.h('span', { class: 'warn' }, w)), ...c.notes.map((t) => A.h('span', { class: 'soft' }, t))),
        A.h('div', { class: 'pyr' }, ...rows.map((row, i) => A.h('div', { class: 'pyr-row' }, ...row.map((v) => A.h('span', { class: (N.TENSION[v.sum] ? (i === 0 ? 'top-tense' : 'tense') : '') }, i === rows.length - 1 ? String(v.sum) : v.text))))),
        A.h('div', { class: 'verdict' }, A.h('div', {}, A.h('span', { class: 'muted small' }, 'Pyramid top'), A.h('b', {}, W.top ? W.top.text : '–')), A.h('div', {}, A.h('span', { class: 'muted small' }, 'Weight'), A.h('b', {}, String(Number(W.total.toFixed(3))))), A.h('div', {}, A.h('span', { class: 'muted small' }, 'Ratio'), A.h('b', { class: W.ratio < 0.3 ? 'ok' : 'err' }, W.ratio.toFixed(3))), A.h('div', {}, A.h('span', { class: 'muted small' }, 'Verdict'), A.h('b', { class: c.good ? 'ok' : 'err' }, c.good ? 'Good price' : 'Avoid'))));
    };
    const drawFind = () => {
      remember('priceTool', state);
      A.fill($vibes, ...T.PRICE_VIBES.map(([v, why]) => A.h('button', { type: 'button', class: 'chip' + (state.vibe === v ? ' active' : ''), title: why, onclick: () => { state.vibe = v; A.count('price.vibe'); drawFind(); } }, T.val(v).text, A.h('small', {}, why.split(/[,;:(]/)[0].toLowerCase()))));
      A.fill($ranges, ...T.PRICE_RANGES.map(([lo, hi], i) => A.h('button', { type: 'button', class: 'chip' + (state.range === i ? ' active' : ''), onclick: () => { state.range = i; A.count('price.range'); drawFind(); } }, `${fmt(lo)}–${fmt(hi)}`)));
      const found = T.priceFind(state.vibe, T.PRICE_RANGES[state.range], 60);
      const why = (T.PRICE_VIBES.find(([v]) => v === state.vibe) || [])[1] || '';
      A.fill($list, A.h('p', { class: 'muted small', style: 'margin:2px 2px 8px' }, `${T.val(state.vibe).text}: ${why}.`),
        found.length ? A.h('div', { class: 'prices' }, ...found.map((c) => A.h('div', { class: 'prow', role: 'button', onclick: () => { $in.value = String(c.price); state.price = $in.value; A.count('price.pick'); drawCheck(); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
          A.h('b', {}, fmt(c.price)), A.h('span', { class: 'ds' }, c.value.text), A.h('span', { class: 'top ' + topCls(c.weight) }, `top ${c.weight.top ? c.weight.top.text : '–'}`)))) : A.h('p', { class: 'muted' }, 'No price in this range lands on that number without a warning.'),
        A.h('p', { class: 'muted small', style: 'margin:10px 2px' }, 'The book\'s rules: the digit sum lands on the chosen vibration, the last digit is 5, 7 or 9 (or a clean 21, 23, 24, 32 with zeros), never 4 and 8 together, never 12/3, 16/7 or a bare 18. Green, yellow and red is the number pyramid\'s weight, lightest first. Tap a price to read it above.'));
    };
    $in.addEventListener('input', () => { state.price = $in.value; drawCheck(); });
    $in.value = state.price || '';
    A.render(A.h('div', { class: 'screen qscreen tscreen' }, top('Price Tool'),
      A.h('div', { class: 'wlabel tl' }, 'Check a Price'), A.h('div', { class: 'pricebox' }, A.h('span', { class: 'cur' }, '$'), $in), $check,
      A.h('div', { class: 'wlabel tl', style: 'padding-top:16px' }, 'Find a Price'), $vibes, $ranges, $list));
    drawCheck(); drawFind();
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
        bigDiamondEl(B, (d) => numberSheet(T.val(d.code), 'about'), { outer: `How ${na} Feels It`, inner: `How ${nb} Feels It`, aText: `${na} ${A1.text}`, bText: `${nb} ${B1.text}`, mainName: `Life expression ${le.text}`, mainLabel: 'The Two Day Vibrations', physicalTitle: 'PHYSICAL · The Two Day Vibrations', physical: 'What Happens When They Meet', emotional: 'The Meeting of Their Emotions', spiritual: 'Where the Relationship Can Grow', noUnbalanced: true }),
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
  function karmicView() {
    light();
    const saved = recall('karmic', { me: '', others: ['', '', '', ''] });
    const yearField = (v, ph) => A.h('input', { type: 'text', inputmode: 'numeric', maxlength: 4, placeholder: ph, value: v || '', autocomplete: 'off' });
    const $me = yearField(saved.me, 'your birth year'), $others = saved.others.map((v, i) => yearField(v, `birth year ${i + 1}`));
    const $body = A.h('div', {});
    const draw = () => {
      remember('karmic', { me: $me.value, others: $others.map((f) => f.value) });
      const k = T.karmic($me.value, $others.map((f) => f.value));
      if (!k) { A.fill($body, A.h('p', { class: 'muted small', style: 'margin:8px 2px' }, 'Type your birth year, then up to four other people\'s. People who share destiny rhythms (the same year number) are karmically connected: the same planets, the same life lessons, year by year.')); return; }
      A.fill($body,
        A.h('div', { class: 'reading' }, A.h('div', { class: 'head' }, A.h('b', {}, `${k.year}`), A.h('span', { class: 'nm' }, `year number ${k.ds} · rhythm ${k.rhythm.join('-')}`)), A.h('p', {}, `Your destiny rhythm: ${k.periods.slice(0, 6).map((p) => `${p.number} (${p.start}–${p.end})`).join(', ')} …`)),
        ...k.others.map((o) => A.h('div', { class: 'reading ' + (o.shared ? 'yes' : 'no') }, A.h('div', { class: 'head' }, A.h('b', {}, String(o.year)), A.h('span', { class: 'nm' }, `year number ${o.ds}`), A.h('span', { class: 'rate ' + (o.shared ? 'super' : 'quiet') }, o.shared ? (o.sameYear ? 'Same year: connected' : 'Karmically connected') : 'Not connected')),
          A.h('p', {}, o.shared ? 'Shares your destiny rhythm: the same planets and lessons at the same points of life. With a close relationship this is a karmic connection.' : 'A different rhythm. A close relationship is still possible, without a karmic contract.'))),
        A.h('p', { class: 'muted small', style: 'margin:8px 2px' }, 'From Forecasting Numerology pp. 63-77: shared destiny rhythms come from the same birth-year number. Your own year rows and periods are under Quick Chart ⋮ "Year Rows and Day Vibrations".'));
    };
    [$me, ...$others].forEach(($f) => $f.addEventListener('input', draw));
    const useMe = async () => { try { const me = await A.api('/api/mychart'); if (!me.year) { A.toast('Set up My Chart first (Settings).', true); return; } $me.value = String(me.year); draw(); } catch (err) { A.toast(err.message, true); } };
    A.render(A.h('div', { class: 'screen qscreen tscreen' }, top('Karmic Connections'),
      A.h('div', { class: 'two-people' }, A.h('div', {}, A.h('div', { class: 'muted small', style: 'padding:0 2px 4px' }, 'You'), $me), A.h('div', {}, A.h('div', { class: 'muted small', style: 'padding:0 2px 4px' }, 'Others'), ...$others)),
      A.h('div', { class: 'togglerow' }, chip('Use My Chart', false, useMe)),
      $body));
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
      btn('#/numberfun', '◇', 'Number Fun', '1 to 99', 'home.numberfun'),
      btn('#/price', '$', 'Price Tool', '', 'home.price'),
      btn('#/relation', '⧫', 'Relationship', 'two people', 'home.relation'),
      btn('#/karmic', '∞', 'Karmic Connections', 'shared rhythms', 'home.karmic'),
      $me);
  }

  const USAGE_LABELS = {
    'screen.today': 'Today', 'screen.coming': 'Coming Days', 'screen.numberfun': 'Number Fun', 'screen.price': 'Price Tool', 'screen.relation': 'Relationship', 'screen.karmic': 'Karmic Connections', 'screen.mychart': 'My Chart (settings)',
    'home.today': 'Home → Today', 'home.coming': 'Home → Coming Days', 'home.numberfun': 'Home → Number Fun', 'home.price': 'Home → Price Tool', 'home.relation': 'Home → Relationship', 'home.karmic': 'Home → Karmic Connections', 'home.mychart': 'Home → My Chart',
    'today.psyche': 'Today: psyche charts on or off', 'today.full': 'Today: full screen day', 'dayfull.move': 'Full screen day: previous or next day', 'coming.open_day': 'Coming Days: open a day', 'coming.size': 'Coming Days: bigger or smaller', 'coming.list': 'Coming Days: list view', 'coming.charts': 'Coming Days: charts view', 'coming.super_only': 'Coming Days: super dates only', 'numberfun.type': 'Number Fun: type a number', 'numberfun.tap_diamond': 'Number Fun: tap a diamond', 'numberfun.tap_other': 'Number Fun: tap a number it appears in',
    'price.vibe': 'Price Tool: pick a vibration', 'price.range': 'Price Tool: pick a range', 'price.pick': 'Price Tool: pick a found price', 'relation.use_me': 'Relationship: me as the first person', 'mychart.save': 'My Chart: save',
  };

  function install(app) {
    A = app;
    Object.assign(A.routes, { today: todayView, coming: comingView, numberfun: numberFunView, price: priceView, relation: relationView, karmic: karmicView, mychart: myChartView });
    return { homeButtons, USAGE_LABELS, myChart: () => recall('mychart', null) };
  }
  root.Tools = { install, bigDiamondEl, planetScene };
})(typeof globalThis !== 'undefined' ? globalThis : this);
