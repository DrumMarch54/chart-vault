/* Archetype lines (owner 2026-10-21): words on the combination of numbers. Two places:
   - the chart sheet's "Archetypes" cards (section(img)): the lines the server draws on every chart
     (server/archetypes.js LINES), each a bright wording, the other wordings, and the shadow;
   - the Archetype Words tool (#/archetype): type numbers, give each a position if wanted, read the wordings.
   The words themselves live on the server (server/archetype-words.js); the owner corrects them there.
   app.js hands over its plumbing through Archetypes.install, like reading.js and tools.js. */
(function (root) {
  'use strict';
  let A = null;
  const USAGE_LABELS = {
    'screen.archetype': 'Archetype Words', 'home.archetype': 'Home → Archetype Words', 'archetype.open': 'Chart sheet → an archetype line opened in Archetype Words',
    'archetype.more': 'Archetype Words: more wordings', 'archetype.swap': 'Archetype Words: swap the order', 'archetype.position': 'Archetype Words: pick a position',
  };

  function install(app) {
    A = app;
    const { h, fill, api, count } = A;
    const an = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    const partsLine = (parts) => parts.map((p) => `${p.text}${p.label ? ' ' + p.label.toLowerCase() : ''}`).join(' · ');
    const toolHash = (parts) => '#/archetype?' + parts.map((p) => `num=${p.sum}&pos=${encodeURIComponent(p.chart && p.position ? `${p.chart}.${p.position}` : '')}`).join('&');

    // One line as a card: title, the numbers, the first bright wording big, the other bright wordings small, the
    // shadow in its own line. A tap opens the tool with these numbers.
    const card = (line) => h('a', { class: 'arch', href: toolHash(line.parts), onclick: () => count('archetype.open') },
      h('div', { class: 'arch-head' }, h('span', { class: 'arch-title' }, line.title), h('span', { class: 'muted small' }, partsLine(line.parts))),
      h('div', { class: 'arch-bright' }, cap(line.bright[0])),
      line.bright.length > 1 ? h('div', { class: 'muted small' }, 'or ' + line.bright.slice(1).join(' · ')) : null,
      line.shadow.length ? h('div', { class: 'arch-shadow' }, h('span', {}, 'Shadow: '), line.shadow[0]) : null);

    // The chart sheet section. Loads on its own; says so when the chart has no numbers yet.
    function section(img) {
      const $body = h('div', { class: 'stack' }, h('p', { class: 'muted small' }, 'Putting words on the numbers…'));
      const $root = h('div', { class: 'archetypes stack' },
        h('div', { class: 'row', style: 'justify-content:space-between;align-items:baseline' }, h('b', {}, 'Archetypes'), h('span', { class: 'muted small' }, 'Tap one for more wordings')), $body);
      api(`/api/images/${img.id}/archetypes`).then((r) => {
        if (r.missing || !r.lines.length) { fill($body, h('p', { class: 'muted small' }, 'No numbers read for this chart yet, so no archetypes. Tap "Type them" above.')); return; }
        fill($body, ...r.lines.map(card));
      }).catch((err) => fill($body, h('p', { class: 'err small' }, err.message)));
      return $root;
    }

    // ---------- the tool: Archetype Words ----------
    // Rows of numbers (two or three), each with an optional position for its label; the wordings under them.
    // The first number gives the adjective, the second the noun, a third is the crown. ?num=&pos= pairwise.
    A.routes.archetype = async function archetypeView(_, query) {
      const nums = query.getAll('num'), poss = query.getAll('pos');
      const rows = nums.map((n, i) => ({ num: n, pos: poss[i] || '' })).filter((r) => r.num);
      while (rows.length < 2) rows.push({ num: '', pos: '' });
      const $rows = h('div', { class: 'stack' });
      const $out = h('div', { class: 'stack' });
      A.render(h('div', { class: 'screen' }, A.pageTop('Archetype Words', '#/'),
        h('p', { class: 'muted small' }, 'Two or three numbers. The first gives the adjective, the second the noun, a third is the crown over them: 24/6 then 12/3 reads "wholesome expander".'),
        $rows, $out));
      try { await A.loadCatalog(); } catch {}
      let seq = 0;
      const complete = () => rows.filter((r) => /^\d{1,3}$/.test(r.num.trim()));
      const remember = () => { try { history.replaceState(history.state, '', '#/archetype?' + complete().map((r) => `num=${r.num.trim()}&pos=${encodeURIComponent(r.pos)}`).join('&')); } catch {} };
      const draw = async () => {
        remember();
        const done = complete();
        if (done.length < 2) { fill($out, h('p', { class: 'muted small' }, 'Type two numbers to read them together.')); return; }
        const my = ++seq;
        try {
          const r = await api('/api/archetypes/phrase?' + done.map((x) => `num=${x.num.trim()}&pos=${encodeURIComponent(x.pos)}`).join('&'));
          if (my !== seq) return;
          const list = (items, cls) => h('div', { class: 'stack' }, ...items.map((t) => h('div', { class: cls }, cap(t))));
          fill($out,
            h('div', { class: 'arch-block' }, h('b', {}, 'In the light'), list(r.bright, 'arch-bright')),
            h('div', { class: 'arch-block shadow' }, h('b', {}, 'In the shadow'), list(r.shadow, 'arch-shadow')),
            h('div', { class: 'row', style: 'flex-wrap:nowrap' },
              h('button', { type: 'button', style: 'flex:1', onclick: () => { count('archetype.swap'); const [a, b] = rows; rows[0] = b; rows[1] = a; drawRows(); draw(); } }, 'Swap the Order')),
            ...r.parts.map((p) => p.words ? h('div', { class: 'arch-words' },
              h('div', { class: 'row', style: 'justify-content:space-between;align-items:baseline' }, h('b', {}, `${p.text} ${p.words.title}`), h('span', { class: 'muted small' }, p.role === 'crown' ? 'the crown' : p.role === 'noun' ? 'gives the noun' : 'gives the adjective')),
              p.words.alt ? h('div', { class: 'muted small' }, p.words.alt) : null,
              h('div', { class: 'small' }, h('span', { class: 'muted' }, 'Bright: '), `${p.words.adj.join(', ')} · ${p.words.noun.join(', ')}`),
              h('div', { class: 'small' }, h('span', { class: 'muted' }, 'Shadow: '), `${p.words.shadowAdj.join(', ')} · ${p.words.shadowNoun.join(', ')}`)) : null),
            h('p', { class: 'muted small' }, `These words are a first draft from the course's own titles. Tell the chat which word is wrong and it changes the word bank.`));
        } catch (err) { if (my === seq) fill($out, h('p', { class: 'err' }, err.message)); }
      };
      // The position sheet for a row: the same rows as Search by Position, no counts.
      const pickPosition = (row) => {
        count('archetype.position');
        let chart = (row.pos.split('.')[0] || 'name'); if (chart === '*') chart = 'name';
        const bg = h('div', { class: 'sheet-bg', onclick: (e) => { if (e.target === bg) close(); } });
        const close = () => { bg.remove(); A.overlayGone(bg); };
        const $charts = h('div', { class: 'chips tabs' }), $list = h('div', { class: 'stack poslist' });
        bg.append(h('div', { class: 'sheet possheet' }, h('div', { class: 'sheet-grip', onclick: close }, h('span', {})), h('h3', {}, `Where is ${A.numLabel(row.num.trim() || '?')}?`),
          h('button', { type: 'button', class: 'btn-block', onclick: () => { row.pos = ''; close(); drawRows(); draw(); } }, 'No position, just the number'), $charts, $list));
        document.body.append(bg); A.overlay(bg, close);
        const drawList = () => fill($list, ...A.posRows(chart, null, false, (pos) => { row.pos = pos; close(); drawRows(); draw(); }).filter((el) => !el.textContent.startsWith('Anywhere')));
        const drawCharts = () => fill($charts, ...A.catalog().charts.map((c) => h('button', { type: 'button', class: `chip ${chart === c.key ? 'active' : 'off'}`, onclick: () => { chart = c.key; drawCharts(); drawList(); } }, c.label)));
        drawCharts(); drawList();
      };
      const drawRows = () => {
        fill($rows, ...rows.map((row, i) => {
          const $num = h('input', { type: 'text', inputmode: 'numeric', placeholder: i === 0 ? 'First number' : i === 1 ? 'Second number' : 'Third number (crown)', autocomplete: 'off', maxlength: 3, value: row.num, 'aria-label': ['The number that gives the adjective', 'The number that gives the noun', 'The crown number'][i] });
          $num.addEventListener('input', () => { row.num = $num.value; clearTimeout($num.t); $num.t = setTimeout(draw, 250); });
          $num.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $num.blur(); } });
          const $pos = h('button', { type: 'button', class: `cpos ${row.pos ? '' : 'empty'}`, onclick: () => pickPosition(row) }, h('span', { class: 't' }, row.pos ? A.posLabel(row.pos) : 'Position (optional)'), h('span', { class: 'muted' }, '›'));
          const $x = i >= 2 ? h('button', { type: 'button', class: 'x', 'aria-label': 'Remove the third number', onclick: () => { rows.splice(i, 1); drawRows(); draw(); } }, '×') : null;
          return h('div', { class: 'crow' }, $num, $pos, $x);
        }), rows.length < 3 ? h('button', { type: 'button', class: 'btn-block', onclick: () => { rows.push({ num: '', pos: '' }); drawRows(); $rows.querySelectorAll('input')[2].focus(); } }, '+ A Third Number, the Crown') : null);
      };
      drawRows(); draw();
      if (!rows[0].num) setTimeout(() => { const i = $rows.querySelector('input'); if (i) i.focus(); }, 50);
    };

    return { section, USAGE_LABELS };
  }
  root.Archetypes = { install };
})(window);
