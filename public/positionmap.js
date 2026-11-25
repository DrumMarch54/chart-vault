/* Search by Position (owner 2026-11-25: the old picker and the Combination screen were "almost unusable"; this one
   screen replaces both). The owner taps the spot ON A BLANK NUMEROSCOPE instead of reading a list of 24 names:
   - "Looking For": the conditions chosen so far (the address carries them: #/position?pos=&num=, pairwise);
   - the chart: the app's own drawing (numeroscopeSvg) with every number replaced by the spot's short name
     ("Names on the Spots") or by nothing ("Clean Chart"); Settings -> Search by Position Chart picks which.
     A tap on a small chart zooms into it first; a tap on a spot opens its sheet: type the number, pick Exactly 12/3
     or Any 3, see how many charts have it there, Add to the Search;
   - what is not drawn (the diamonds, a number anywhere, the Higher Self Diamond) is in "Pick From a List" and the
     buttons under the chart;
   - the foot counts the charts that have everything and "Show Charts" lists them (the browse screen, ?pos=&num=).
   Number texts are the server's own (positions.js parseNumber): "12", "/3" (any 3), "3" (a plain 3), "12+5" (two
   numbers meeting in a center or diamond, either way round), "12+5@35" (making 35 only), "!5" (a plain part).
   app.js hands over its plumbing through PositionMap.install, like people.js and archetypes.js. */
(function (root) {
  'use strict';
  const USAGE_LABELS = {
    'position.spot': 'Search by Position: a spot tapped on the chart', 'position.zoom': 'Search by Position: a small chart zoomed into',
    'position.list': 'Search by Position → Pick From a List', 'position.anywhere': 'Search by Position → A Number Anywhere',
    'position.add': 'Search by Position → Add to the Search', 'position.show': 'Search by Position → Show Charts',
    'position.hsd': 'Higher Self Diamond charts from Search by Position', 'position.style': 'Settings → Search by Position Chart',
  };
  const STYLE_KEY = 'posMapStyle';
  const STYLES = [['names', 'Names on the Spots'], ['clean', 'Clean Chart']];
  const styleNow = () => { try { return localStorage.getItem(STYLE_KEY) === 'clean' ? 'clean' : 'names'; } catch { return 'names'; } };

  // What is written on a spot. The psyche charts' line is the month and the year (owner 2026-11-25).
  const SHORT = { day: 'Day', month: 'Month', year: 'Year', topAura: 'Dharma', outerAura: 'Outer', innerAura: 'Inner', littleLp: 'Life Path', bigLp: 'Big',
    upperLeft: 'Aura', upperRight: 'Aura', lowerLeft: 'Aura', lowerRight: 'Aura', heart: 'Mind', heartExtra: 'Sub', solar: 'Emotion', solarExtra: 'Sub',
    spine: 'Spine', first: 'First', middle: 'Middle', last: 'Last', big: 'Big', le: 'Life Exp.', pillar: 'Pillar', letters: 'Letters' };
  const SHORT_BY_CHART = {
    name: { upperLeft: 'Public', upperRight: 'Friends', lowerLeft: 'Associates', lowerRight: 'Love' },
    vocation: { le: 'Desire' }, personality: { le: 'Persona' },
    outer: { first: 'Month', last: 'Year' }, inner: { first: 'Month', last: 'Year' },
  };
  const shortOf = (chart, key) => (SHORT_BY_CHART[chart] && SHORT_BY_CHART[chart][key]) || SHORT[key] || key;
  const SMALL_WORDS = new Set(['and', 'of', 'the', 'in', 'a', 'or', 'only']);
  const titleCase = (s) => String(s).replace(/[A-Za-z][A-Za-z']*/g, (w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w[0].toUpperCase() + w.slice(1)));
  const dsOf = (v) => { let n = Number(v); while (n > 9) n = String(n).split('').reduce((t, d) => t + Number(d), 0); return n; };
  const show = (v) => (Number(v) > 9 ? `${Number(v)}/${dsOf(v)}` : String(Number(v)));
  const isNum = (v) => /^\d{1,3}$/.test(v) && Number(v) > 0;
  const REGION_NAMES = { essence: 'Essence Chart', name: 'Name Chart', outer: 'Outer Psyche Chart', inner: 'Inner Psyche Chart', personality: 'Personality Chart', vocation: 'Vocation Chart' };
  const VB = [371 - 425, 20, 850, 1270];

  function install(A) {
    const { routes, h, sv, fill, api, toast, count, go, swap, render, pageTop, fmtN } = A;

    // ----- the blank chart -----
    // The app's own drawing of a made-up chart (one middle name, so every spot exists), its numbers taken off.
    // Every spot keeps its tap pad (rect.n-hit[data-pos]); `spots` lists them with the region they are drawn in.
    function blankChart() {
      const svg = A.numeroscopeSvg(root.Numeroscope.numeroscope({ day: 15, month: 6, year: 1985, name: 'Anna Marie Smith' }));
      svg.classList.add('pmap-svg'); svg.setAttribute('aria-label', 'A blank chart: tap a spot to search it');
      svg.querySelectorAll('text.k-name, rect[data-word]').forEach((el) => el.remove());
      const L = root.Numeroscope.LAYOUT;
      const letter = svg.querySelector('text.k-letters');
      if (letter) { // the letter count carries no position in the drawing; here it is a spot like the others
        const [cx, cy, r] = L.main.letter;
        letter.setAttribute('data-pos', 'name.letters');
        letter.before(sv('rect', { x: cx - r - 8, y: cy - r - 8, width: 2 * r + 16, height: 2 * r + 16, fill: 'transparent', class: 'n-hit', 'data-pos': 'name.letters' }));
      }
      const angleOf = { name: L.main, personality: L.sub, vocation: L.sub, outer: L.psy, inner: L.psy };
      const spots = [];
      for (const t of svg.querySelectorAll('text[data-pos]')) {
        const pad = t.previousElementSibling && t.previousElementSibling.matches('rect[data-pos]') ? t.previousElementSibling : null;
        if (!pad) { t.remove(); continue; }
        const pos = t.getAttribute('data-pos'), [chart, key] = pos.split('.');
        const box = { x: Number(pad.getAttribute('x')), y: Number(pad.getAttribute('y')), w: Number(pad.getAttribute('width')), h: Number(pad.getAttribute('height')) };
        const cx = box.x + box.w / 2, base = Number(t.getAttribute('y')), size = Number(t.getAttribute('font-size')), bold = /\bn-bold\b/.test(t.getAttribute('class') || '');
        const g = t.closest('g[data-chart]'), where = g ? g.getAttribute('data-chart') : 'main';
        const region = where === 'ess' || where === 'day' ? 'essence' : where === 'main' ? 'name' : where === 'con' ? 'personality' : where === 'vow' ? 'vocation' : cx < 371 ? 'outer' : 'inner';
        // The chart whose shape the spot sits beside (the day above a small chart is the essence day, drawn there).
        const lab = region === 'name' ? 23 : region === 'essence' ? 15 : 11.5;
        const edge = /^(upper|lower)(Left|Right)$/.exec(key), shape = angleOf[region];
        const tilt = edge && shape ? (((edge[1] === 'upper') === (edge[2] === 'Left')) ? -1 : 1) * Math.atan2(shape.hh, shape.hw) * 180 / Math.PI : 0;
        for (const a of ['data-num', 'data-pair', 'data-rel', 'data-n', 'role', 'aria-label']) { t.removeAttribute(a); pad.removeAttribute(a); }
        t.setAttribute('class', 'pm-lab'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('x', cx);
        pad.setAttribute('class', 'pm-pad'); pad.setAttribute('role', 'button');
        // Wide enough for a thumb on the name chart; the small charts are zoomed into before a spot is tapped.
        const grow = Math.max(0, (region === 'name' ? 78 : 30) - box.w);
        if (grow) { pad.setAttribute('x', box.x - grow / 2); pad.setAttribute('width', box.w + grow); }
        spots.push({ pos, chart, key, region, t, pad, cx, cy: base - size * 0.34, base, lab, tilt, size, bold });
      }
      return { svg, spots };
    }

    // ----- words -----
    // A position's short name for the list and the sheets: no "(upper left)" tails; a center is one thing.
    const SHORT_LABEL = { heart: 'Mind Center', solar: 'Emotion Center', heartExtra: 'Mind Center Sub Vibration', solarExtra: 'Emotion Center Sub Vibration', heartSubDiamond: 'Mind Sub Diamond', solarSubDiamond: 'Emotion Sub Diamond' };
    const cat = () => A.catalog();
    const posOf = (pos) => { const [chart, key] = pos.split('.'); return (cat().positions || []).find((p) => p.chart === chart && p.key === key) || null; };
    const chartName = (chart) => titleCase(((cat().charts || []).find((c) => c.key === chart) || {}).label || chart);
    const bare = (label) => titleCase(String(label).replace(/\s*\(.*\)\s*$/, ''));
    const tail = (label) => { const m = /\(([^)]*)\)\s*$/.exec(String(label)); return m ? titleCase(m[1]).replace(/ \+ /g, ' + ') : ''; };
    const shortLabel = (p) => SHORT_LABEL[p.key] || bare(p.label);
    // What a diamond is made of, short: "Public + Friends", "Mind Center + Middle Name".
    const partsNote = (p) => (p.parts ? p.parts.map((x) => bare(x).replace(/ Aura$/, '').replace(/ Main Vibration$/, '').replace(/^Day Vibration$/, 'Day').replace(/^Little Life Path$/, 'Life Path')).join(' + ') : tail(p.label));
    // Has this chart a center with sub vibrations (name, vocation, personality)? The psyche charts' centers have none.
    const hasSub = (chart, which) => !!posOf(`${chart}.${which}Extra`);
    const centerOf = (pos) => { const [chart, key] = pos.split('.'); const m = /^(heart|solar)(Extra)?$/.exec(key); return m && hasSub(chart, m[1]) ? { chart, which: m[1] } : null; };
    // A condition as the screen says it: "15/6", "Any 4", "Plain 4", "Any 4 + Any 9", "35/8 From 12/3 + 5".
    const condText = (num) => A.numLabel(num).replace(/ and /g, ' + ').replace(/ from /g, ' From ');
    // A spot as its sheet names it.
    const spotOf = (pos) => {
      const [chart, key = '*'] = pos.split('.');
      if (key === '*') return { pos, label: 'Anywhere', chart: chart === '*' ? 'Any Spot of Any Chart' : chartName(chart), any: true };
      const p = posOf(pos);
      return { pos, key, label: p ? (p.made ? shortLabel(p) : bare(p.label)) : key, chart: chartName(chart), parts: p && p.parts ? p.parts.map(bare) : null, made: !!(p && p.made) };
    };
    // How a condition reads in a row: "Emotion Center Sub Vibration" + "Name Chart"; a center's two numbers either way round
    // read "Emotion Center, Either Way Round".
    const rowWords = (c) => {
      const s = spotOf(c.pos), center = centerOf(c.pos);
      if (center && /\+/.test(c.num)) return { label: `${SHORT_LABEL[center.which]}, Either Way Round`, chart: s.chart };
      return { label: s.label, chart: s.chart };
    };

    // ----- the results' head (app.js browse draws it for a position search) -----
    function resultsHead(conds, { edit, remove, back }) {
      const $title = h('h1', {}, 'Charts');
      const $note = h('p', { class: 'muted small pm-note hidden' }, 'The charts with it the most times come first.');
      const $rows = h('div', { class: 'stack pm-looking' });
      const draw = () => fill($rows, ...conds.map((c, i) => {
        const w = rowWords(c);
        return h('div', { class: 'pm-cond' },
          h('button', { type: 'button', class: 'pm-cond-main', 'aria-label': `Change ${w.label}`, onclick: () => edit(conds) }, h('b', {}, condText(c.num)), h('span', { class: 'pl' }, h('span', {}, w.label), h('span', { class: 'muted small' }, w.chart))),
          h('button', { type: 'button', class: 'pm-x', 'aria-label': `Remove ${w.label}`, onclick: () => remove(conds.filter((_, j) => j !== i)) }, '×'));
      }), h('button', { type: 'button', class: 'pm-addspot', onclick: () => { count('position.add_more'); edit(conds); } }, '+ Add Another Spot'));
      draw();
      A.loadCatalog().then(draw).catch(() => {});
      const node = h('div', { class: 'pm-results' }, h('div', { class: 'pagetop' }, h('button', { type: 'button', class: 'btn iconbtn', 'aria-label': 'Back', onclick: back }, '‹'), $title), $rows, $note);
      return { node, setTotal: (n, most) => { $title.textContent = `${fmtN(n)} Chart${n === 1 ? '' : 's'}`; $note.classList.toggle('hidden', !most || !n); } };
    }

    // ----- the screen -----
    routes.position = routes.combo = async function positionView(_, query) {
      const back = A.takePositionReturn();
      const conds = back || A.condsOf(query);
      const $look = h('div', { class: 'stack pm-looking' });
      const $hint = h('div', { class: 'pm-h' });
      const $back = h('button', { type: 'button', class: 'pm-back hidden' }, '‹ Whole Chart');
      const $box = h('div', { class: 'nscope-box pmap' });
      const $under = h('div', { class: 'row pm-under' });
      const $foot = h('div', { class: 'pm-foot' });
      render(h('div', { class: 'screen pm-screen' }, pageTop('Search by Position', () => A.leaveFlow()),
        h('div', { class: 'pm-h' }, 'Looking For'), $look, $hint, h('div', { class: 'pm-wrap' }, $back, $box), $under, $foot));
      try { await A.loadCatalog(true); } catch (err) { if (!cat()) { fill($look, h('p', { class: 'err' }, err.message)); return; } }

      const { svg, spots } = blankChart();
      $box.append(svg);
      let zoom = null, anim = 0;
      // The view round one small chart: its own shape (the box gets shorter), never taller than the whole drawing.
      const regionBox = (region) => {
        const list = spots.filter((s) => s.region === region);
        const x0 = Math.min(...list.map((s) => Number(s.pad.getAttribute('x')))), x1 = Math.max(...list.map((s) => Number(s.pad.getAttribute('x')) + Number(s.pad.getAttribute('width'))));
        const y0 = Math.min(...list.map((s) => s.cy - s.size)), y1 = Math.max(...list.map((s) => s.cy + s.size));
        const pad = 18; let W = x1 - x0 + 2 * pad, H = y1 - y0 + 2 * pad;
        const tall = VB[3] / VB[2]; if (H / W > tall) W = H / tall;
        return [(x0 + x1) / 2 - W / 2, (y0 + y1) / 2 - H / 2, W, H];
      };
      const setView = (to) => {
        cancelAnimationFrame(anim);
        const from = (svg.getAttribute('viewBox') || VB.join(' ')).split(' ').map(Number);
        let still = false; try { still = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}
        if (still) { svg.setAttribute('viewBox', to.join(' ')); return; }
        const t0 = performance.now();
        const step = (now) => { const k = Math.min(1, (now - t0) / 220), e = 1 - (1 - k) * (1 - k); svg.setAttribute('viewBox', from.map((v, i) => v + (to[i] - v) * e).join(' ')); if (k < 1) anim = requestAnimationFrame(step); };
        anim = requestAnimationFrame(step);
      };
      const setZoom = (region) => {
        zoom = region; setView(region ? regionBox(region) : VB);
        $back.classList.toggle('hidden', !region); svg.classList.toggle('zoomed', !!region);
        for (const s of spots) { const off = !!region && s.region !== region; s.t.classList.toggle('off', off); s.pad.classList.toggle('off', off); }
        $hint.textContent = region ? `${REGION_NAMES[region]}: Tap a Spot` : 'Tap a Spot on the Chart';
        drawUnder();
      };
      $back.onclick = () => setZoom(null);

      // Where a condition shows on the chart: its own spot; a center's two numbers either way round sit on the main
      // vibration. Only the first spot of a kind (one middle name, one sub vibration on the blank chart).
      const spotFor = (c) => spots.find((s) => s.pos === c.pos);
      // A picked number looks like a number of a real chart (owner 2026-11-25): the size and weight that spot has
      // on a drawn chart, the chart's own dark ink, a soft gold mark behind it so it stands out.
      const drawSpots = () => {
        const names = styleNow() === 'names';
        svg.querySelectorAll('.pm-mark').forEach((r) => r.remove());
        const shown = new Map(conds.map((c) => [spotFor(c), c]));
        for (const s of spots) {
          const c = shown.get(s);
          if (c) {
            const text = condText(c.num);
            s.t.textContent = text; s.t.setAttribute('class', 'pm-lab picked' + (s.bold ? ' b' : ''));
            s.t.setAttribute('font-size', s.size); s.t.setAttribute('y', s.base); s.t.removeAttribute('transform');
            const w = s.size * 0.6 * text.length + s.size * 0.8, hh = s.size * 1.35;
            s.t.before(sv('rect', { class: 'pm-mark', x: s.cx - w / 2, y: s.base - s.size * 1.02, width: w, height: hh, rx: hh / 2.6 }));
          } else {
            s.t.textContent = names ? shortOf(s.region === 'essence' ? 'essence' : s.region, s.key) : '';
            s.t.setAttribute('class', 'pm-lab' + (zoom && s.region !== zoom ? ' off' : ''));
            s.t.setAttribute('font-size', s.lab); s.t.setAttribute('y', s.cy + s.lab * 0.34);
            if (s.tilt) s.t.setAttribute('transform', `rotate(${s.tilt.toFixed(1)} ${s.cx} ${s.cy})`); else s.t.removeAttribute('transform');
          }
        }
      };
      // The outline round the spot just tapped (the Clean Chart has no names: the outline says where the tap landed).
      const ring = (s) => {
        svg.querySelectorAll('.pm-ring').forEach((r) => r.remove());
        if (!s) return;
        const w = Math.min(Number(s.pad.getAttribute('width')), s.lab * 5), hh = s.lab * 2.1;
        svg.append(sv('rect', { class: 'pm-ring', x: s.cx - w / 2, y: s.cy - hh / 2, width: w, height: hh, rx: hh / 3, fill: 'none', 'stroke-width': s.lab / 7 }));
      };
      svg.addEventListener('click', (e) => {
        const pad = e.target.closest && e.target.closest('.pm-pad');
        const s = pad ? spots.find((q) => q.pad === pad) : null;
        if (!s || (zoom && s.region !== zoom) || (!zoom && s.region !== 'name')) {
          // Not on a spot that can be picked from here: a tap on a small chart zooms into it.
          const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
          const m = svg.getScreenCTM(); if (!m) return;
          const p = pt.matrixTransform(m.inverse());
          let best = null, bd = Infinity;
          for (const q of spots) { const d = Math.hypot(q.cx - p.x, q.cy - p.y); if (d < bd) { bd = d; best = q; } }
          if (!best || bd > 150 || zoom === best.region || (!zoom && best.region === 'name')) return;
          count('position.zoom'); setZoom(best.region); return;
        }
        count('position.spot'); ring(s); openPos(s.pos);
      });

      const remember = () => { try { history.replaceState(history.state, '', '#/position?' + A.condsQuery(conds)); } catch {} };
      if (back) remember();
      let seq = 0;
      const drawFoot = async () => {
        if (!conds.length) { fill($foot, h('button', { type: 'button', class: 'btn-primary btn-block', disabled: true }, 'Tap a Spot to Start')); return; }
        const my = ++seq;
        try {
          const r = await api('/api/images?limit=1&' + A.condsQuery(conds));
          if (my !== seq) return;
          const n = r.total;
          fill($foot, h('button', { type: 'button', class: 'btn-primary btn-block', disabled: !n, onclick: () => { count('position.show'); A.showPositionResults(conds.slice()); } }, n ? `Show ${fmtN(n)} Chart${n === 1 ? '' : 's'}` : 'No Chart Has All of These'));
        } catch (err) { if (my === seq) fill($foot, h('p', { class: 'err' }, err.message)); }
      };
      const drawLooking = () => {
        fill($look, ...(conds.length ? conds.map((c, i) => {
          const w = rowWords(c);
          return h('div', { class: 'pm-cond' },
            h('button', { type: 'button', class: 'pm-cond-main', 'aria-label': `Change ${w.label}`, onclick: () => openPos(c.pos) }, h('b', {}, condText(c.num)), h('span', { class: 'pl' }, h('span', {}, w.label), h('span', { class: 'muted small' }, w.chart))),
            h('button', { type: 'button', class: 'pm-x', 'aria-label': `Remove ${w.label}`, onclick: () => { conds.splice(i, 1); changed(); } }, '×'));
        }) : [h('p', { class: 'muted pm-empty' }, 'Nothing yet. Tap a spot on the chart, then type the number you want there.')]));
      };
      const changed = () => A.afterOverlayClosed(() => { remember(); drawLooking(); drawSpots(); drawFoot(); });
      const drawUnder = () => {
        const btn = (label, fn) => h('button', { type: 'button', class: 'pm-pill', onclick: fn }, label);
        fill($under,
          zoom ? btn(`Anywhere in the ${REGION_NAMES[zoom]}`, () => { count('position.anywhere'); openPos(`${zoom}.*`); }) : btn('A Number Anywhere', () => { count('position.anywhere'); openPos('*.*'); }),
          zoom === 'essence' ? btn('Higher Self Diamond', hsd) : null,
          btn('Pick From a List', () => { count('position.list'); openList(); }));
      };
      const hsd = () => { count('position.hsd'); go('#/?pattern=hsd'); };
      // A tap anywhere on a spot: a center with sub vibrations opens the center; a spot already searched opens its
      // condition to change (owner 2026-11-25: never a second condition on the same spot).
      const openPos = (pos) => { const center = centerOf(pos); if (center) openCenter(center); else { const at = conds.findIndex((c) => c.pos === pos); openSpot(spotOf(pos), at < 0 ? null : at); } };
      const replaceAt = (indices, next) => { const keep = conds.filter((_, i) => !indices.includes(i)); conds.splice(0, conds.length, ...keep, ...next); };

      // ----- sheets -----
      const sheet = (cls, build) => {
        const bg = h('div', { class: 'sheet-bg', onclick: (e) => { if (e.target === bg) close(); } });
        const close = () => { bg.remove(); A.overlayGone(bg); ring(null); };
        const $s = h('div', { class: `sheet pm-sheet ${cls}` }, h('div', { class: 'sheet-grip', onclick: close }, h('span', {})));
        build($s, close); bg.append($s); document.body.append(bg); A.overlay(bg, close);
        return close;
      };
      const numInput = (label, value = '') => { const el = h('input', { type: 'text', class: 'pm-num', inputmode: 'numeric', autocomplete: 'off', maxlength: 3, placeholder: '–', value, 'aria-label': label, enterkeyhint: 'done' }); el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } }); return el; };
      const option = (on, label, note, click) => h('button', { type: 'button', class: `pm-opt ${on ? 'on' : ''}`, onclick: click }, h('i', {}), h('span', { class: 'pl' }, h('span', {}, label), note ? h('span', { class: 'muted small' }, note) : null));
      const family = (d) => `${d}, ${[1, 2, 3].map((k) => show(d + 9 * k)).join(', ')} and so on`;
      // How many charts have everything: the other conditions and the new one(s).
      const counter = ($count, others) => {
        let my = 0;
        return async (next) => {
          const run = ++my;
          if (!next) return;
          try {
            const r = await api('/api/images?limit=1&' + A.condsQuery([...others, ...next]));
            if (run !== my) return;
            const n = r.total;
            fill($count, h('b', {}, fmtN(n)), ` chart${n === 1 ? ' has' : 's have'} this${others.length ? ' and everything else' : ''}`);
          } catch (err) { if (run === my) $count.textContent = err.message; }
        };
      };
      const onType = (els, draw) => { for (const el of els) el.addEventListener('input', () => { clearTimeout(els[0].timer); els[0].timer = setTimeout(() => { const at = document.activeElement; draw(); if (at && at.isConnected) at.focus(); }, 180); }); };
      // One number's kind: a big one is Exactly 12/3 or Any 3; a one-digit one is Any 4 or A Plain 4 Only.
      // `exact` true = the number itself. The text a single condition carries: "12", "/3", "4" (plain), "/4".
      const oneText = (v, exact) => (exact ? String(Number(v)) : `/${dsOf(v)}`);
      const kindChips = (v, exact, set) => (!isNum(v) ? null : h('div', { class: 'chips pm-kinds' }, ...(Number(v) > 9
        ? [[true, `Exactly ${show(v)}`], [false, `Any ${dsOf(v)}`]] : [[false, `Any ${dsOf(v)}`], [true, `A Plain ${Number(v)} Only`]])
        .map(([e, label]) => h('button', { type: 'button', class: `chip ${exact === e ? 'active' : 'off'}`, onclick: () => set(e) }, label))));
      const parseOne = (num) => { const m = /^(\/)?(\d+)$/.exec(num || ''); return m ? { v: m[2], exact: !m[1] } : null; };

      // One spot: its number (Exactly / Any / Plain). A diamond and "anywhere" also take two numbers together.
      function openSpot(spot, editAt = null) {
        const old = editAt === null ? '' : conds[editAt].num;
        const others = conds.filter((_, i) => i !== editAt);
        const pair0 = /^(!?)(\d+)\+(!?)(\d+)(?:@(\d+))?$/.exec(old), one0 = parseOne(old);
        const canPair = spot.any || spot.made;
        let mode = pair0 ? 'pair' : one0 || !spot.made ? 'one' : 'pair';
        let exact = one0 ? one0.exact : null; // null = not chosen: Exactly for 12, Any for a one-digit number
        let plainA = !!(pair0 && pair0[1]), plainB = !!(pair0 && pair0[3]), oneWay = !!(pair0 && pair0[5]);
        const $n = numInput('The number you want in this spot', one0 ? one0.v : '');
        const $a = numInput(spot.parts ? spot.parts[0] : 'First number', pair0 ? pair0[2] : ''), $b = numInput(spot.parts ? spot.parts[1] : 'Second number', pair0 ? pair0[4] : '');
        const $modes = h('div', { class: 'pm-modes' }), $body = h('div', { class: 'stack' }), $count = h('div', { class: 'pm-count muted' });
        const $add = h('button', { type: 'button', class: 'btn-primary btn-block pm-add' }, editAt === null ? 'Add to the Search' : 'Change It');
        const recount = counter($count, others);
        const isExact = (v) => (exact === null ? Number(v) > 9 : exact);
        const numText = () => {
          if (mode === 'one') { const v = $n.value.trim(); return isNum(v) ? oneText(v, isExact(v)) : ''; }
          const a = $a.value.trim(), b = $b.value.trim(); if (!isNum(a) || !isNum(b)) return '';
          const part = (v, plain) => (plain && Number(v) < 10 ? '!' : '') + Number(v);
          return `${part(a, plainA)}+${part(b, plainB)}${spot.made && oneWay ? '@' + (dsOf(a) * 10 + dsOf(b)) : ''}`;
        };
        const draw = () => {
          fill($modes, ...(canPair ? [['one', spot.made ? 'The Diamond Itself' : 'One Number'], ['pair', spot.made ? 'Its Two Numbers' : 'Two Together']]
            .map(([k, label]) => h('button', { type: 'button', class: `chip ${mode === k ? 'active' : 'off'}`, onclick: () => { mode = k; draw(); } }, label)) : []));
          if (mode === 'one') {
            const v = $n.value.trim();
            fill($body, h('div', { class: 'row pm-numrow' }, $n, $count), kindChips(v, isExact(v), (e) => { exact = e; draw(); }),
              isNum(v) && !isExact(v) ? h('p', { class: 'muted small pm-fam' }, family(dsOf(v))) : null,
              spot.key === 'middle' ? h('p', { class: 'muted small' }, 'Someone with several middle names is found by any one of them: a second, third or fourth name counts.') : null);
          } else {
            const a = $a.value.trim(), b = $b.value.trim(), ok = isNum(a) && isNum(b);
            const plainChip = (v, on, flip) => (isNum(v) && Number(v) < 10 ? h('button', { type: 'button', class: `chip ${on ? 'active' : 'off'}`, onclick: () => { flip(); draw(); } }, `A Plain ${Number(v)} Only`) : null);
            const way = ok && spot.made && dsOf(a) !== dsOf(b) ? [
              option(!oneWay, 'Either Way Round', `Makes ${show(dsOf(a) * 10 + dsOf(b))} or ${show(dsOf(b) * 10 + dsOf(a))}`, () => { oneWay = false; draw(); }),
              option(oneWay, 'Only This Way Round', `Makes ${show(dsOf(a) * 10 + dsOf(b))}`, () => { oneWay = true; draw(); })] : [];
            const chips = [plainChip(a, plainA, () => { plainA = !plainA; }), plainChip(b, plainB, () => { plainB = !plainB; })].filter(Boolean);
            fill($body,
              h('div', { class: 'pm-pair' }, h('label', {}, h('span', { class: 'muted small' }, spot.parts ? spot.parts[0] : 'One Number'), $a), h('label', {}, h('span', { class: 'muted small' }, spot.parts ? spot.parts[1] : 'The Other'), $b)),
              $count,
              h('p', { class: 'muted small' }, spot.any ? 'The two meet in a center or a diamond, either way round. One digit means any of its family: 4 also finds 13/4 and 22/4.' : 'One digit means any of its family: 4 also finds 13/4 and 22/4.'),
              chips.length ? h('div', { class: 'chips' }, ...chips) : null, ...way);
          }
          const n = numText(); $add.disabled = !n;
          if (!n) $count.textContent = mode === 'one' ? 'Type the number you want here.' : 'Type the two numbers.';
          recount(n ? [{ pos: spot.pos, num: n }] : null);
        };
        onType([$n, $a, $b], draw);
        const close = sheet('', ($s) => $s.append(h('h3', {}, spot.label, h('small', { class: 'muted' }, spot.chart + (spot.parts && spot.made ? ` · ${spot.parts.join(' Beside ')}` : ''))), $modes, $body,
          editAt === null ? $add : h('div', { class: 'row pm-acts' }, h('button', { type: 'button', class: 'pm-remove', onclick: () => { conds.splice(editAt, 1); close(); changed(); } }, 'Remove'), $add)));
        $add.onclick = () => {
          const n = numText(); if (!n) { toast('Type a number first', true); return; }
          count('position.add');
          replaceAt(editAt === null ? [] : [editAt], [{ pos: spot.pos, num: n }]);
          close(); setZoom(null); changed();
        };
        draw();
        setTimeout(() => { const el = mode === 'one' ? $n : $a; if (!el.value) el.focus(); }, 60);
      }

      // A center (owner 2026-11-25, "kind of confusing"): ONE sheet for the circle, whichever number was tapped.
      // Main Vibration and Sub Vibration, fill one or both. Both: Exactly Like This (main 4, a sub vibration 9: two
      // conditions) or Either Way Round (the two in the circle whichever is main: one combination condition).
      // Several sub vibrations: any one of them counts. The sub diamond (main + middle name) is in the list.
      function openCenter({ chart, which }) {
        const mainPos = `${chart}.${which}`, subPos = `${chart}.${which}Extra`;
        const at = conds.map((c, i) => (c.pos === mainPos || c.pos === subPos ? i : -1)).filter((i) => i >= 0);
        const others = conds.filter((_, i) => !at.includes(i));
        let main = null, sub = null, either = false;
        for (const i of at) {
          const c = conds[i], pair = /^(!?)(\d+)\+(!?)(\d+)$/.exec(c.num);
          if (pair) { either = true; main = { v: pair[2], exact: Number(pair[2]) > 9 || !!pair[1] }; sub = { v: pair[4], exact: Number(pair[4]) > 9 || !!pair[3] }; }
          else if (c.pos === mainPos) main = parseOne(c.num); else sub = parseOne(c.num);
        }
        const kind = { main: main ? main.exact : null, sub: sub ? sub.exact : null };
        const $m = numInput('Main vibration', main ? main.v : ''), $s2 = numInput('Sub vibration', sub ? sub.v : '');
        const $body = h('div', { class: 'stack' }), $count = h('div', { class: 'pm-count muted' });
        const $add = h('button', { type: 'button', class: 'btn-primary btn-block pm-add' }, at.length ? 'Change It' : 'Add to the Search');
        const recount = counter($count, others);
        const ex = (k, v) => (kind[k] === null ? Number(v) > 9 : kind[k]);
        const next = () => {
          const m = $m.value.trim(), s = $s2.value.trim(), hm = isNum(m), hs = isNum(s);
          if (hm && hs && either) { const part = (v, e) => (Number(v) > 9 ? (e ? String(Number(v)) : String(dsOf(v))) : (e ? '!' : '') + Number(v)); return [{ pos: mainPos, num: `${part(m, ex('main', m))}+${part(s, ex('sub', s))}` }]; }
          return [hm ? { pos: mainPos, num: oneText(m, ex('main', m)) } : null, hs ? { pos: subPos, num: oneText(s, ex('sub', s)) } : null].filter(Boolean);
        };
        const draw = () => {
          const m = $m.value.trim(), s = $s2.value.trim(), both = isNum(m) && isNum(s);
          const box = (k, label, $el, v) => h('label', {}, h('span', { class: 'muted small' }, label), $el, kindChips(v, ex(k, v), (e) => { kind[k] = e; draw(); }));
          fill($body, h('div', { class: 'pm-pair' }, box('main', 'Main Vibration', $m, m), box('sub', 'Sub Vibration', $s2, s)),
            both ? option(!either, 'Exactly Like This', `${condText(oneText(m, ex('main', m)))} is the main vibration, ${condText(oneText(s, ex('sub', s)))} a sub vibration`, () => { either = false; draw(); }) : null,
            both ? option(either, 'Either Way Round', 'The two share the circle, whichever is the main vibration', () => { either = true; draw(); }) : null,
            $count, h('p', { class: 'muted small' }, 'Fill one box or both. Someone with several sub vibrations is found by any one of them.'));
          const n = next(); $add.disabled = !n.length;
          if (!n.length) $count.textContent = 'Type a number in one box or both.';
          recount(n.length ? n : null);
        };
        onType([$m, $s2], draw);
        const close = sheet('', ($s) => $s.append(h('h3', {}, SHORT_LABEL[which], h('small', { class: 'muted' }, chartName(chart))), $body,
          at.length ? h('div', { class: 'row pm-acts' }, h('button', { type: 'button', class: 'pm-remove', onclick: () => { replaceAt(at, []); close(); changed(); } }, 'Remove'), $add) : $add));
        $add.onclick = () => { const n = next(); if (!n.length) { toast('Type a number first', true); return; } count('position.add'); replaceAt(at, n); close(); setZoom(null); changed(); };
        draw();
        setTimeout(() => { if (!$m.value && !$s2.value) $m.focus(); }, 60);
      }

      // Every position as a list (owner 2026-11-25: the long stack of rows "looks like total shit"): the six charts
      // as a block of buttons, then the chart's spots grouped two to a row, the diamonds last with what makes them.
      const GROUPS = {
        essence: [['Birth Date', ['day', 'month', 'year']], ['Life Path', ['littleLp', 'bigLp']], ['Auras', ['outerAura', 'innerAura', 'topAura']], ['Diamonds', ['outerDiamond', 'innerDiamond', 'dharmaDiamond', 'nexus', 'target', 'challengeDiamond']]],
        rhombus: [['The Name Line', ['first', 'middle', 'last', 'letters']], ['Centers', ['heart', 'solar']], ['Auras', ['upperLeft', 'upperRight', 'lowerLeft', 'lowerRight']], ['Down the Middle', ['spine', 'le', 'big', 'pillar']],
          ['Diamonds', ['mindDiamond', 'emotionDiamond', 'publicDiamond', 'spineDiamond', 'leDiamond', 'heartSubDiamond', 'solarSubDiamond', 'mentalFlow', 'emotionalFlow']]],
      };
      GROUPS.rhombusPsyche = GROUPS.rhombus.map(([g, keys]) => [g === 'The Name Line' ? 'Month and Year' : g, keys]);
      function openList() {
        let chart = zoom || 'name';
        const $tabs = h('div', { class: 'pm-seg' }), $rows = h('div', { class: 'stack pm-groups' });
        const close = sheet('pm-list', ($s) => $s.append(h('h3', {}, 'Pick From a List'), $tabs, $rows));
        const pick = (fn) => { close(); A.afterOverlayClosed(fn); };
        const draw = () => {
          fill($tabs, ...cat().charts.map((c) => h('button', { type: 'button', class: chart === c.key ? 'on' : '', onclick: () => { chart = c.key; draw(); } }, titleCase(c.label).replace(/ Chart$/, ''))));
          const groups = chart === 'essence' ? GROUPS.essence : chart === 'outer' || chart === 'inner' ? GROUPS.rhombusPsyche : GROUPS.rhombus;
          const item = (p) => h('button', { type: 'button', class: 'pm-item', onclick: () => pick(() => openPos(`${p.chart}.${p.key}`)) },
            h('span', {}, shortLabel(p)), p.made || (GROUPS.rhombus[4][1].includes(p.key) && tail(p.label)) ? h('small', {}, partsNote(p)) : null);
          const out = [h('button', { type: 'button', class: 'pm-item pm-wide', onclick: () => pick(() => openPos(`${chart}.*`)) }, h('span', {}, `Anywhere in the ${chartName(chart)}`), h('span', { class: 'muted' }, '›'))];
          for (const [g, keys] of groups) {
            const list = keys.map((k) => posOf(`${chart}.${k}`)).filter(Boolean);
            if (chart === 'essence' && g === 'Diamonds') list.push(null);
            if (!list.length) continue;
            out.push(h('div', { class: 'pm-h' }, g), h('div', { class: 'pm-grid' }, ...list.map((p) => (p ? item(p) : h('button', { type: 'button', class: 'pm-item', onclick: () => pick(hsd) }, h('span', {}, 'Higher Self Diamond'), h('small', {}, 'Day Matches the Dharma Diamond'))))));
          }
          fill($rows, ...out);
        };
        draw();
      }

      drawLooking(); drawSpots(); setZoom(null); drawFoot();
    };

    // Settings: which of the two charts the search screen shows.
    function settingsCard() {
      const $card = h('div', { class: 'card stack' });
      const NOTES = { names: 'Every spot shows its name, like Mind or First.', clean: 'The spots are empty. The name shows after you tap one.' };
      const draw = () => {
        const cur = styleNow();
        fill($card, h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', {}, 'Search by Position Chart'), h('span', { class: 'muted small' }, NOTES[cur])),
          h('div', { class: 'chips' }, ...STYLES.map(([v, label]) => h('button', { type: 'button', class: `chip ${cur === v ? 'active' : 'off'}`, onclick: () => { try { localStorage.setItem(STYLE_KEY, v); } catch {} count('position.style'); draw(); } }, label))));
      };
      draw();
      return $card;
    }
    return { USAGE_LABELS, settingsCard, resultsHead, SETTINGS_WORDS: 'search by position chart names on the spots clean chart blank labels style look of the search chart' };
  }

  root.PositionMap = { install };
}(typeof window !== 'undefined' ? window : globalThis));
