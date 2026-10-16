/* Chart Vault – reading a chart: the rule-based facts, the AI reading and questions about one chart
   (in the viewer's sheet), "Ask the Vault" (a question answered with charts), and the AI Reading settings
   (key, monthly cap, spend). app.js hands over its plumbing through Reading.install, like tools.js. */
(function (root) {
  'use strict';
  const USAGE_LABELS = {
    'reading.write': 'Write an AI reading', 'reading.again': 'Write a reading again', 'reading.ask': 'Ask about a chart',
    'screen.ask': 'Ask the Vault', 'ask.send': 'Ask the Vault a question', 'ask.example': 'Tap an example question',
    'screen.ai': 'AI Reading settings', 'ai.save': 'Save the AI settings', 'home.ask': 'Ask the Vault (home)',
  };
  const money = (usd) => `$${Number(usd || 0).toFixed(2)}`;

  function install(A) {
    const { h, fill, api, toast, count, go, render, pageTop, routes } = A;
    const postJson = (p, d) => api(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) });

    // The reading's text as it comes from the model: short headers, paragraphs, bullets, **bold**. Built as
    // nodes (never raw HTML): the model's words go through the same text handling as everything else.
    function richText(text) {
      const out = [];
      let para = [], list = null;
      const flush = () => { if (para.length) { out.push(h('p', {}, ...inline(para.join(' ')))); para = []; } if (list) { out.push(list); list = null; } };
      for (const raw of String(text || '').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) { flush(); continue; }
        const hm = /^#{1,6}\s+(.*)$/.exec(line);
        if (hm) { flush(); out.push(h('h4', { class: 'rd-h' }, ...inline(hm[1].replace(/\*\*/g, '')))); continue; }
        const bm = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
        if (bm) { if (para.length) flush(); if (!list) list = h('ul', { class: 'rd-list' }); list.append(h('li', {}, ...inline(bm[1]))); continue; }
        if (list) flush();
        para.push(line);
      }
      flush();
      return out;
    }
    const inline = (s) => s.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) => (part.startsWith('**') && part.endsWith('**') ? h('b', {}, part.slice(2, -2)) : document.createTextNode(part)));

    // A warning about the monthly cap, handed out once per level by the server; "OK" marks it seen.
    function warningNode(w, onSeen) {
      if (!w) return null;
      const $b = h('div', { class: `aiwarn ${w.level}` }, h('span', {}, w.text), h('button', { type: 'button', onclick: async () => { try { await postJson('/api/ai/warning-seen', { level: w.level }); } catch {} $b.remove(); onSeen && onSeen(); } }, 'OK'));
      return $b;
    }
    const spendLine = (s) => (s ? h('div', { class: 'muted small' }, `AI spend this month: ${money(s.spent)} of ${money(s.cap)}${s.level === 'over' ? ' · cap reached' : ''}`) : null);

    // ---------- in the viewer's sheet: Reading ----------
    function section(img) {
      const $facts = h('div', { class: 'stack' }, h('p', { class: 'muted small' }, 'Looking at the numbers…'));
      const $ai = h('div', { class: 'stack' });
      const $root = h('div', { class: 'reading stack' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', {}, 'Reading'), h('span', { class: 'muted small' }, 'From the course rules')), $facts, $ai);
      let state = null;
      const drawFacts = (f) => {
        if (!f || f.missing) { fill($facts, h('p', { class: 'muted small' }, 'No numbers read for this chart yet, so nothing to read. Tap "Type them" above.')); return; }
        const items = (f.facts || []).map((x) => h('div', { class: `fact ${x.severity || 'info'}` }, h('b', {}, x.title), h('span', {}, ' ' + x.text)));
        fill($facts, ...(items.length ? items : [h('p', { class: 'muted small' }, 'Nothing stands out by the rules.')]));
      };
      const drawAi = () => {
        if (!state) { fill($ai, h('p', { class: 'muted small' }, 'Loading…')); return; }
        if (state.error) { fill($ai, h('p', { class: 'err small' }, state.error)); return; }
        const est = state.estimate || {};
        const r = state.reading;
        const price = est.possible ? ` (about ${money(Math.max(est.usd, 0.05))})` : '';
        const keyMissing = state.spend && state.spend.key_set === false;
        const $q = h('input', { type: 'text', placeholder: 'Ask about this chart…', autocomplete: 'off', enterkeyhint: 'send', maxlength: 500 });
        const $askBtn = h('button', { type: 'button', class: 'btn-primary', onclick: () => ask() }, 'Ask');
        const ask = async () => {
          const q = $q.value.trim(); if (!q) { toast('Type a question first', true); return; }
          count('reading.ask'); $askBtn.disabled = true; $askBtn.textContent = 'Thinking…';
          try { const res = await postJson(`/api/images/${img.id}/ask`, { question: q }); state = { ...state, ...res }; toast(`Answered for ${money(res.usd)}`); drawAi(); }
          catch (err) { toast(err.message, true); $askBtn.disabled = false; $askBtn.textContent = 'Ask'; }
        };
        $q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ask(); } });
        const write = async (force) => {
          count(force ? 'reading.again' : 'reading.write');
          const $btn = force ? $again : $write;
          $btn.disabled = true; $btn.textContent = 'Writing… about 30 seconds';
          try { const res = await postJson(`/api/images/${img.id}/reading`, { force }); state = { ...state, ...res }; toast(res.cached ? 'Already written' : `Reading written for ${money(res.usd)}`); drawAi(); }
          catch (err) { toast(err.message, true); $btn.disabled = false; $btn.textContent = force ? `Write Again${price}` : `Write Reading${price}`; }
        };
        const $write = h('button', { type: 'button', class: 'btn-primary btn-block', onclick: () => write(false) }, `Write Reading${price}`);
        const $again = h('button', { type: 'button', onclick: () => write(true) }, `Write Again${price}`);
        fill($ai,
          warningNode(state.warning, () => { state.warning = null; }),
          h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', {}, 'AI Reading'), h('span', { class: 'muted small' }, state.spend && state.spend.model ? state.spend.model : '')),
          !est.possible ? h('p', { class: 'muted small' }, 'A reading needs the name and date first.') :
          keyMissing ? h('div', { class: 'stack' }, h('p', { class: 'muted small' }, 'Add the AI key first, then readings can be written here.'), h('a', { class: 'btn btn-block', href: '#/ai' }, 'AI Reading Settings')) :
          r ? h('div', { class: 'stack' },
            h('div', { class: 'rd-text' }, ...richText(r.text)),
            h('div', { class: 'muted small' }, `Written ${new Date(r.created_at).toLocaleDateString()} · ${money(r.usd)} · build ${r.build || '?'}`),
            $again)
          : h('div', { class: 'stack' }, h('p', { class: 'muted small' }, `Writes the big picture from the course's own words about these numbers: the Nexus, the centers, the patterns, the pain points. Paid once per chart${price}.`), $write),
          est.possible && !keyMissing ? h('div', { class: 'stack' },
            ...(state.answers || []).map((a) => h('div', { class: 'rd-answer' }, h('div', { class: 'rd-q' }, a.question), h('div', { class: 'rd-text' }, ...richText(a.text)), h('div', { class: 'muted small' }, `${money(a.usd)} · ${new Date(a.created_at).toLocaleDateString()}`))),
            h('div', { class: 'row', style: 'flex-wrap:nowrap' }, $q, $askBtn),
            h('p', { class: 'muted small', style: 'margin:0' }, 'For example: "What does the 16 in the mind center do with the 8 life path?" About 10 cents a question.')) : null,
          spendLine(state.spend));
      };
      api(`/api/images/${img.id}/facts`).then(drawFacts).catch((err) => fill($facts, h('p', { class: 'err small' }, err.message)));
      api(`/api/images/${img.id}/reading`).then((r) => { state = r; api('/api/ai/settings').then((s) => { state.spend = { ...state.spend, key_set: s.key_set, model: s.model }; drawAi(); }).catch(() => drawAi()); }).catch((err) => { state = { error: err.message }; drawAi(); });
      drawAi();
      return $root;
    }

    // ---------- Ask the Vault ----------
    const EXAMPLES = ['The five most unbalanced charts', 'Five people most influenced by the number 8', 'Who has 16 in a center and a 1 life path?', 'Charts with 28/1 as life expression', 'Who has the same day vibration as me?'];
    routes.ask = function askView(_, query) {
      count('screen.ask');
      const $q = h('input', { type: 'text', placeholder: 'Ask in plain words…', autocomplete: 'off', enterkeyhint: 'send', maxlength: 400, value: query && query.get('q') ? query.get('q') : '' });
      const $send = h('button', { type: 'button', class: 'btn-primary', onclick: () => send() }, 'Ask');
      const $out = h('div', { class: 'stack' });
      const $spend = h('div', {});
      const cell = (img) => { const label = img.title || (img.tags && img.tags.length ? img.tags[0].display || img.tags[0].name : '') || img.filename; return h('a', { class: 'cell', href: `#/chart/${img.id}` }, img.has_file ? h('img', { class: 'thumb', src: `/thumb/${img.id}`, loading: 'lazy', alt: label }) : h('div', { class: 'nofile' }, 'no file yet'), h('div', { class: 'label' }, label)); };
      const send = async () => {
        const q = $q.value.trim(); if (!q) { toast('Type a question first', true); return; }
        count('ask.send'); $send.disabled = true; $send.textContent = 'Thinking…';
        fill($out, h('p', { class: 'muted' }, 'Searching the vault… about 10 to 20 seconds.'));
        try {
          const r = await postJson('/api/ask', { question: q });
          fill($out, warningNode(r.warning), h('div', { class: 'card' }, h('p', { style: 'margin:0' }, r.answer), h('div', { class: 'muted small', style: 'margin-top:8px' }, `${r.items.length} chart${r.items.length === 1 ? '' : 's'} · ${money(r.usd)} · ${Math.round(r.seconds)} s`)),
            r.items.length ? h('div', { class: 'grid' }, ...r.items.map(cell)) : null);
          fill($spend, spendLine(r.spend));
        } catch (err) { fill($out, h('p', { class: 'err' }, err.message)); }
        $send.disabled = false; $send.textContent = 'Ask';
      };
      $q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
      render(h('div', { class: 'screen stack' }, pageTop('Ask the Vault', '#/'),
        h('p', { class: 'muted small' }, 'A question in plain words; the answer comes with the charts it found. Only charts whose name and date have been read can be found. About a cent a question.'),
        h('div', { class: 'row', style: 'flex-wrap:nowrap' }, $q, $send),
        h('div', { class: 'chips' }, ...EXAMPLES.map((ex) => h('button', { type: 'button', class: 'chip name', onclick: () => { count('ask.example'); $q.value = ex; send(); } }, ex))),
        $out, $spend));
      api('/api/ai/settings').then((s) => { if (!s.key_set) fill($out, h('div', { class: 'card stack' }, h('p', { class: 'muted', style: 'margin:0' }, 'Add the AI key first.'), h('a', { class: 'btn btn-block', href: '#/ai' }, 'AI Reading Settings'))); fill($spend, spendLine(s), warningNode(s.warning)); }).catch(() => {});
      if ($q.value) send();
    };

    // ---------- Settings → AI Reading ----------
    routes.ai = function aiView() {
      count('screen.ai');
      const $key = h('input', { type: 'password', placeholder: 'Paste the AI key (starts with sk-ant-)', autocomplete: 'off', spellcheck: 'false' });
      const $cap = h('input', { type: 'text', inputmode: 'decimal', placeholder: '8', maxlength: 7 });
      const $msg = h('p', { class: 'muted small' }, 'Loading…');
      const $state = h('div', { class: 'card' });
      const $warn = h('div', {});
      const show = (s) => {
        fill($state,
          h('div', { class: 'stat' }, h('span', {}, 'AI key'), h('b', { class: s.key_set ? 'ok' : 'err' }, s.key_set ? `Set, ends in ${s.key_hint}` : 'Not set')),
          h('div', { class: 'stat' }, h('span', {}, 'Spent this month'), h('b', {}, money(s.spent))),
          h('div', { class: 'stat' }, h('span', {}, 'Monthly cap'), h('b', {}, money(s.cap))),
          h('div', { class: 'stat' }, h('span', {}, 'Left this month'), h('b', { class: s.level === 'over' ? 'err' : s.level === 'near' ? 'warn' : 'ok' }, money(s.remaining))),
          h('div', { class: 'stat' }, h('span', {}, 'Calls this month'), h('b', {}, String(s.calls))),
          h('div', { class: 'stat' }, h('span', {}, 'Readings written by'), h('b', { style: 'font-size:16px' }, s.model)),
          h('div', { class: 'stat' }, h('span', {}, 'Questions answered by'), h('b', { style: 'font-size:16px' }, s.ask_model)));
        $cap.value = String(s.cap);
        fill($warn, warningNode(s.warning));
      };
      const save = async (clear = false) => {
        count('ai.save');
        try {
          const body = { cap: $cap.value.trim() };
          if (clear) body.key = ''; else if ($key.value.trim()) body.key = $key.value.trim();
          const s = await api('/api/ai/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
          show(s); $key.value = ''; $msg.textContent = clear ? 'Key removed. Readings and questions are off until a key is added.' : 'Saved.'; $msg.className = 'ok small'; toast('Saved');
        } catch (err) { $msg.textContent = err.message; $msg.className = 'err small'; }
      };
      render(h('div', { class: 'screen stack' }, pageTop('AI Reading'),
        $warn, $state,
        h('div', { class: 'card stack' },
          h('h2', { style: 'margin-top:0' }, 'AI key'),
          h('p', { class: 'muted small' }, 'The key lets the app pay for readings and questions. It is kept on the server only and never shown again: this screen says only its last 4 characters. Pasting a new one replaces the old one.'),
          $key,
          h('h2', {}, 'Monthly cap, in dollars'),
          h('p', { class: 'muted small' }, 'Readings and questions stop when the month\'s spend reaches this. You are warned here and in the app at 80% and at the cap. A reading costs about 30 cents; a question about a chart about 10 cents; a vault question about a cent.'),
          $cap, $msg,
          h('div', { class: 'row', style: 'flex-wrap:nowrap' }, h('button', { type: 'button', class: 'btn-primary', style: 'flex:1', onclick: () => save(false) }, 'Save'), h('button', { type: 'button', class: 'btn-danger', onclick: () => save(true) }, 'Remove key')))));
      api('/api/ai/settings').then((s) => { show(s); $msg.textContent = s.key_set ? 'Leave the key box empty to keep the current key.' : 'No key yet. Paste one and tap Save.'; }).catch((err) => { $msg.textContent = err.message; $msg.className = 'err small'; });
    };

    // The home screen's banner: shows the cap warning when one is pending, else nothing.
    function homeBanner() {
      const $b = h('div', {});
      api('/api/ai/spend').then((s) => fill($b, warningNode(s.warning))).catch(() => {});
      return $b;
    }
    const homeButton = () => h('a', { class: 'btn btn-block quickbtn posbtn', href: '#/ask', onclick: () => count('home.ask') }, h('span', { class: 'qicon' }, '?'), 'Ask the Vault');

    return { section, homeBanner, homeButton, USAGE_LABELS };
  }
  root.Reading = { install };
})(typeof globalThis !== 'undefined' ? globalThis : this);
