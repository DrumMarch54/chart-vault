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
        const cx = box.x + box.w / 2, base = Number(t.getAttribute('y')), size = Number(t.getAttribute('font-size'));
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
        spots.push({ pos, chart, key, region, t, pad, cx, cy: base - size * 0.34, base, lab, tilt });
      }
      return { svg, spots };
    }

    // ----- the screen -----
    routes.position = routes.combo = async function positionView(_, query) {
      const conds = A.condsOf(query);
      const $look = h('div', { class: 'stack pm-looking' });
      const $hint = h('div', { class: 'pm-h' });
      const $back = h('button', { type: 'button', class: 'pm-back hidden' }, '‹ Whole Chart');
      const $box = h('div', { class: 'nscope-box pmap' });
      const $under = h('div', { class: 'row pm-under' });
      const $foot = h('div', { class: 'pm-foot' });
      render(h('div', { class: 'screen pm-screen' }, pageTop('Search by Position', () => A.leaveFlow()),
        h('div', { class: 'pm-h' }, 'Looking For'), $look, $hint, h('div', { class: 'pm-wrap' }, $back, $box), $under, $foot));
      try { await A.loadCatalog(true); } catch (err) { if (!A.catalog()) { fill($look, h('p', { class: 'err' }, err.message)); return; } }
      const catalog = A.catalog();
      const posOf = (pos) => { const [chart, key] = pos.split('.'); return catalog.positions.find((p) => p.chart === chart && p.key === key) || null; };
      const chartName = (chart) => titleCase((catalog.charts.find((c) => c.key === chart) || {}).label || chart);
      // A spot as its sheet names it: { pos, label, chart, parts (a center's or diamond's two numbers), made (a diamond) }.
      const spotOf = (pos) => {
        const [chart, key = '*'] = pos.split('.');
        if (key === '*') return { pos, label: 'Anywhere', chart: chart === '*' ? 'Any Spot of Any Chart' : chartName(chart), any: true };
        const p = posOf(pos);
        return { pos, label: titleCase(p ? p.label : key), chart: chartName(chart), parts: p && p.parts ? p.parts.map(titleCase) : null, made: !!(p && p.made), key };
      };
      const condText = (c) => A.numLabel(c.num).replace(/^digit sum (\d)$/, 'Any $1').replace(/\bplain (\d)/g, 'Plain $1').replace(/ and /g, ' + ').replace(/ from /g, ' From ');

      const { svg, spots } = blankChart();
      $box.append(svg);
      let zoom = null, anim = 0;
      const regionBox = (region) => {
        const list = spots.filter((s) => s.region === region);
        const x0 = Math.min(...list.map((s) => Number(s.pad.getAttribute('x')))), x1 = Math.max(...list.map((s) => Number(s.pad.getAttribute('x')) + Number(s.pad.getAttribute('width'))));
        const y0 = Math.min(...list.map((s) => Number(s.pad.getAttribute('y')))), y1 = Math.max(...list.map((s) => Number(s.pad.getAttribute('y')) + Number(s.pad.getAttribute('height'))));
        // The same shape as the whole drawing, the chart centered in it.
        const pad = 14, w = x1 - x0 + 2 * pad, hgt = y1 - y0 + 2 * pad, ratio = VB[2] / VB[3];
        const W = Math.max(w, hgt * ratio), H = W / ratio;
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

      // What each spot shows: the number asked for there (gold, bold), else its short name or nothing.
      const drawSpots = () => {
        const names = styleNow() === 'names';
        for (const s of spots) {
          const c = conds.find((q) => q.pos === s.pos);
          s.t.textContent = c ? condText(c) : names ? shortOf(s.region === 'essence' ? 'essence' : s.region, s.key) : '';
          s.t.classList.toggle('picked', !!c);
          s.t.setAttribute('font-size', c ? s.lab * 1.15 : s.lab);
          s.t.setAttribute('y', s.cy + (c ? s.lab * 1.15 : s.lab) * 0.34);
          if (s.tilt && !c) s.t.setAttribute('transform', `rotate(${s.tilt.toFixed(1)} ${s.cx} ${s.cy})`); else s.t.removeAttribute('transform');
        }
      };
      // The outline round the spot just tapped (the Clean Chart has no names: the outline says where the tap landed).
      const ring = (s) => {
        svg.querySelectorAll('.pm-ring').forEach((r) => r.remove());
        if (!s) return;
        const x = Number(s.pad.getAttribute('x')), w = Number(s.pad.getAttribute('width')), hh = s.lab * 2.1;
        svg.append(sv('rect', { class: 'pm-ring', x: s.cx - Math.min(w, s.lab * 5) / 2, y: s.cy - hh / 2, width: Math.min(w, s.lab * 5), height: hh, rx: hh / 3, fill: 'none', 'stroke-width': s.lab / 7 }));
        return x;
      };
      svg.addEventListener('click', (e) => {
        const pad = e.target.closest && e.target.closest('.pm-pad');
        let s = pad ? spots.find((q) => q.pad === pad) : null;
        if (!s || (zoom && s.region !== zoom) || (!zoom && s.region !== 'name')) {
          // Not on a spot that can be picked from here: a tap on a small chart zooms into it.
          const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
          const m = svg.getScreenCTM(); if (!m) return;
          const p = pt.matrixTransform(m.inverse());
          let best = null, bd = Infinity;
          for (const q of spots) { const d = Math.hypot(q.cx - p.x, q.cy - p.y); if (d < bd) { bd = d; best = q; } }
          if (!best || bd > 150) return;
          if (zoom === best.region) return;
          if (!zoom && best.region === 'name') return;
          count('position.zoom'); setZoom(best.region); return;
        }
        count('position.spot'); ring(s); openSpot(spotOf(s.pos));
      });

      const remember = () => { try { history.replaceState(history.state, '', '#/position?' + A.condsQuery(conds)); } catch {} };
      let seq = 0;
      const drawFoot = async () => {
        if (!conds.length) { fill($foot, h('button', { type: 'button', class: 'btn-primary btn-block', disabled: true }, 'Tap a Spot to Start')); return; }
        const my = ++seq;
        try {
          const r = await api('/api/images?limit=1&' + A.condsQuery(conds));
          if (my !== seq) return;
          const n = r.total;
          fill($foot, h('button', { type: 'button', class: 'btn-primary btn-block', disabled: !n, onclick: () => { count('position.show'); swap(A.positionHash(conds)); } }, n ? `Show ${fmtN(n)} Chart${n === 1 ? '' : 's'}` : 'No Chart Has All of These'));
        } catch (err) { if (my === seq) fill($foot, h('p', { class: 'err' }, err.message)); }
      };
      const drawLooking = () => {
        fill($look, ...(conds.length ? conds.map((c, i) => {
          const s = spotOf(c.pos);
          return h('div', { class: 'pm-cond' },
            h('button', { type: 'button', class: 'pm-cond-main', 'aria-label': `Change ${s.label}`, onclick: () => openSpot(s, i) }, h('b', {}, condText(c)), h('span', { class: 'pl' }, h('span', {}, s.label), h('span', { class: 'muted small' }, s.chart))),
            h('button', { type: 'button', class: 'pm-x', 'aria-label': `Remove ${s.label}`, onclick: () => { conds.splice(i, 1); changed(); } }, '×'));
        }) : [h('p', { class: 'muted pm-empty' }, 'Nothing yet. Tap a spot on the chart, then type the number you want there.')]));
      };
      const changed = () => A.afterOverlayClosed(() => { remember(); drawLooking(); drawSpots(); drawFoot(); });
      const drawUnder = () => {
        const btn = (label, fn) => h('button', { type: 'button', class: 'pm-pill', onclick: fn }, label);
        const chart = zoom || null;
        fill($under,
          chart ? btn(`Anywhere in the ${REGION_NAMES[chart]}`, () => { count('position.anywhere'); openSpot(spotOf(`${chart}.*`)); }) : btn('A Number Anywhere', () => { count('position.anywhere'); openSpot(spotOf('*.*')); }),
          chart === 'essence' ? btn('Higher Self Diamond', hsd) : null,
          btn('Pick From a List', () => { count('position.list'); openList(); }));
      };
      const hsd = () => { count('position.hsd'); go('#/?pattern=hsd'); };

      // ----- sheets -----
      const sheet = (cls, build) => {
        const bg = h('div', { class: 'sheet-bg', onclick: (e) => { if (e.target === bg) close(); } });
        const close = () => { bg.remove(); A.overlayGone(bg); ring(null); };
        const $s = h('div', { class: `sheet pm-sheet ${cls}` }, h('div', { class: 'sheet-grip', onclick: close }, h('span', {})));
        build($s, close); bg.append($s); document.body.append(bg); A.overlay(bg, close);
        return close;
      };
      const numInput = (label, value = '') => { const el = h('input', { type: 'text', class: 'pm-num', inputmode: 'numeric', autocomplete: 'off', maxlength: 3, placeholder: '12', value, 'aria-label': label, enterkeyhint: 'done' }); el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } }); return el; };
      const option = (on, label, note, click) => h('button', { type: 'button', class: `pm-opt ${on ? 'on' : ''}`, onclick: click }, h('i', {}), h('span', { class: 'pl' }, h('span', {}, label), note ? h('span', { class: 'muted small' }, note) : null));
      const family = (d) => `${d}, ${[1, 2, 3].map((k) => show(d + 9 * k)).join(', ')} and so on`;

      // One spot: its number (Exactly / Any / Plain), or two numbers together where the spot has two (a center's
      // circle, a diamond's two parts, or anywhere: any center or diamond). editAt = the condition being changed.
      function openSpot(spot, editAt = null) {
        const old = editAt === null ? '' : conds[editAt].num;
        const others = conds.filter((_, i) => i !== editAt);
        const pair0 = /^(!?)(\d+)\+(!?)(\d+)(?:@(\d+))?$/.exec(old), one0 = /^(\/)?(\d+)$/.exec(old);
        const canPair = spot.any || !!spot.parts;
        // A diamond starts on its two numbers (how the owner thinks of one); a center and "anywhere" on one number.
        let mode = pair0 ? 'pair' : one0 || !spot.made ? 'one' : 'pair';
        let how = one0 ? (one0[1] ? 'any' : 'exact') : null; // null = not chosen yet: Exactly for 12, Any for a one-digit number
        let plainA = !!(pair0 && pair0[1]), plainB = !!(pair0 && pair0[3]), oneWay = !!(pair0 && pair0[5]);
        const $n = numInput('The number you want in this spot', one0 ? one0[2] : '');
        const $a = numInput(spot.parts ? spot.parts[0] : 'First number', pair0 ? pair0[2] : ''), $b = numInput(spot.parts ? spot.parts[1] : 'Second number', pair0 ? pair0[4] : '');
        const $modes = h('div', { class: 'pm-modes' }), $body = h('div', { class: 'stack' }), $count = h('div', { class: 'pm-count muted' });
        const $add = h('button', { type: 'button', class: 'btn-primary btn-block pm-add' }, editAt === null ? 'Add to the Search' : 'Change It');
        const numText = () => {
          if (mode === 'one') { const v = $n.value.trim(); if (!isNum(v)) return ''; const any = how === 'any' || (how === null && Number(v) < 10); return any ? `/${dsOf(v)}` : String(Number(v)); }
          const a = $a.value.trim(), b = $b.value.trim(); if (!isNum(a) || !isNum(b)) return '';
          const part = (v, plain) => (plain && Number(v) < 10 ? '!' : '') + Number(v);
          return `${part(a, plainA)}+${part(b, plainB)}${spot.made && oneWay ? '@' + (dsOf(a) * 10 + dsOf(b)) : ''}`;
        };
        let seqC = 0;
        const recount = async () => {
          const n = numText(); const my = ++seqC;
          $add.disabled = !n;
          if (!n) { $count.textContent = mode === 'one' ? 'Type the number you want here.' : 'Type the two numbers.'; return; }
          try {
            const c = await api('/api/positions/counts?num=' + encodeURIComponent(n) + (others.length ? '&fixed=' + encodeURIComponent(others.map((q) => `${q.pos}:${q.num}`).join(',')) : ''));
            if (my !== seqC) return;
            const [chart, key] = spot.pos.split('.');
            const got = key === '*' ? (chart === '*' ? c.total : c.perChart[chart] || 0) : c.counts[spot.pos] || 0;
            fill($count, h('b', {}, fmtN(got)), ` chart${got === 1 ? ' has' : 's have'} it here${others.length ? ', of the ones with everything else' : ''}`);
          } catch (err) { if (my === seqC) $count.textContent = err.message; }
        };
        const draw = () => {
          fill($modes, ...(canPair ? [['one', spot.made ? 'The Diamond Itself' : 'One Number'], ['pair', spot.made ? 'Its Two Numbers' : spot.any ? 'Two Numbers Together' : 'Both Numbers in the Circle']]
            .map(([k, label]) => h('button', { type: 'button', class: `chip ${mode === k ? 'active' : 'off'}`, onclick: () => { mode = k; draw(); } }, label)) : []));
          if (mode === 'one') {
            const v = $n.value.trim(), d = isNum(v) ? dsOf(v) : 0, big = isNum(v) && Number(v) > 9;
            const cur = how || (big ? 'exact' : 'any');
            const opts = !isNum(v) ? [] : big
              ? [option(cur === 'exact', `Exactly ${show(v)}`, '', () => { how = 'exact'; draw(); }), option(cur === 'any', `Any ${d}`, family(d), () => { how = 'any'; draw(); })]
              : [option(cur === 'any', `Any ${d}`, family(d), () => { how = 'any'; draw(); }), option(cur === 'exact', `A Plain ${d} Only`, `Never a ${show(d + 9)}`, () => { how = 'exact'; draw(); })];
            fill($body, h('div', { class: 'row pm-numrow' }, $n, $count), ...opts,
              spot.key === 'middle' ? h('p', { class: 'muted small' }, 'A person with several middle names is found by any one of them: a second, third or fourth name counts.') : null);
          } else {
            const a = $a.value.trim(), b = $b.value.trim(), ok = isNum(a) && isNum(b);
            const plainChip = (v, on, flip) => (isNum(v) && Number(v) < 10 ? h('button', { type: 'button', class: `chip ${on ? 'active' : 'off'}`, onclick: () => { flip(); draw(); } }, `A Plain ${Number(v)} Only`) : null);
            const way = ok && spot.made && dsOf(a) !== dsOf(b) ? [
              option(!oneWay, 'Either Way Round', `Makes ${show(dsOf(a) * 10 + dsOf(b))} or ${show(dsOf(b) * 10 + dsOf(a))}`, () => { oneWay = false; draw(); }),
              option(oneWay, 'Only This Way Round', `Makes ${show(dsOf(a) * 10 + dsOf(b))}`, () => { oneWay = true; draw(); })] : [];
            const chips = [plainChip(a, plainA, () => { plainA = !plainA; }), plainChip(b, plainB, () => { plainB = !plainB; })].filter(Boolean);
            fill($body,
              h('div', { class: 'pm-pair' }, h('label', {}, h('span', { class: 'muted small' }, spot.parts ? spot.parts[0] : 'One number'), $a), h('label', {}, h('span', { class: 'muted small' }, spot.parts ? spot.parts[1] : 'The other'), $b)),
              $count,
              h('p', { class: 'muted small' }, spot.any ? 'The two meet in a center or a diamond, either way round. One digit means any of its family: 4 also finds 13/4 and 22/4.' : spot.made ? 'One digit means any of its family: 4 also finds 13/4 and 22/4.' : 'The two share the circle, either way round. One digit means any of its family: 4 also finds 13/4 and 22/4.'),
              chips.length ? h('div', { class: 'chips' }, ...chips) : null, ...way);
          }
          recount();
        };
        for (const el of [$n, $a, $b]) el.addEventListener('input', () => { const at = document.activeElement; clearTimeout($n.timer); $n.timer = setTimeout(() => { draw(); if (at && at.isConnected) at.focus(); }, 180); });
        const close = sheet('', ($s) => $s.append(h('h3', {}, spot.label, h('small', { class: 'muted' }, spot.chart + (spot.parts && spot.made ? ` · ${spot.parts.join(' Beside ')}` : ''))), $modes, $body, $add));
        $add.onclick = () => {
          const n = numText(); if (!n) { toast('Type a number first', true); return; }
          count('position.add');
          if (editAt === null) conds.push({ pos: spot.pos, num: n }); else conds[editAt] = { pos: spot.pos, num: n };
          close(); setZoom(null); changed();
        };
        draw();
        setTimeout(() => { const el = mode === 'one' ? $n : $a; if (!el.value) el.focus(); }, 60);
      }

      // Every position as a list, one chart at a time: the numbers as they sit on the chart, then the diamonds
      // (two numbers side by side, not drawn on the chart). The Higher Self Diamond belongs to the essence chart.
      function openList() {
        let chart = zoom || 'name';
        const $tabs = h('div', { class: 'chips tabs' }), $rows = h('div', { class: 'stack poslist' });
        const close = sheet('pm-list', ($s) => $s.append(h('h3', {}, 'Pick From a List'), $tabs, $rows));
        const row = (label, note, fn) => h('button', { type: 'button', class: 'posrow', onclick: () => { close(); A.afterOverlayClosed(fn); } }, h('span', { class: 'pl' }, h('span', {}, label), note ? h('span', { class: 'muted small' }, note) : null), h('span', { class: 'muted' }, '›'));
        const draw = () => {
          fill($tabs, ...catalog.charts.map((c) => h('button', { type: 'button', class: `chip ${chart === c.key ? 'active' : 'off'}`, onclick: () => { chart = c.key; draw(); } }, titleCase(c.label).replace(/ Chart$/, ''))));
          const list = catalog.positions.filter((p) => p.chart === chart);
          const one = (p) => row(titleCase(p.label), p.made && p.parts ? p.parts.map(titleCase).join(' Beside ') : '', () => openSpot(spotOf(`${p.chart}.${p.key}`)));
          fill($rows, row(`Anywhere in the ${chartName(chart)}`, '', () => openSpot(spotOf(`${chart}.*`))),
            h('div', { class: 'pm-h' }, 'Numbers'), ...list.filter((p) => !p.made).map(one),
            h('div', { class: 'pm-h' }, 'Diamonds'), ...list.filter((p) => p.made).map(one),
            chart === 'essence' ? row('Higher Self Diamond', 'The day has the same digit sum as the dharma diamond', hsd) : null);
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
    return { USAGE_LABELS, settingsCard, SETTINGS_WORDS: 'search by position chart names on the spots clean chart blank labels style look of the search chart' };
  }

  root.PositionMap = { install };
}(typeof window !== 'undefined' ? window : globalThis));
