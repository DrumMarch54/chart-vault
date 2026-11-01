/* Look Up Someone (owner's ask 2026-11-01): tap the microphone and say a name ("Fifty Cent") or describe
   someone ("the rapper who got shot nine times"). The vault is checked first, for free; then the AI searches
   the web for the birth name and birth date (about 2 to 4 cents) and each person found is drawn as a chart,
   with the name and date in boxes to fix and a Save to Vault button. Nothing is saved until that tap.
   Also opened from the phone's app icon: press and hold it, "Look Up Someone" (manifest shortcut, ?listen=1).
   app.js hands over its plumbing through Lookup.install, like reading.js. */
(function (root) {
  'use strict';
  const USAGE_LABELS = {
    'screen.lookup': 'Look Up Someone', 'home.lookup': 'Look Up Someone (home)', 'lookup.mic': 'Look Up: speak a name',
    'lookup.search': 'Look Up: search the web', 'lookup.web_anyway': 'Look Up: search the web anyway', 'lookup.save': 'Look Up: Save to Vault',
    'lookup.quick': 'Look Up: open in Quick Chart',
  };

  function install(A) {
    const { routes, h, fill, api, toast, count, go, render, pageTop, drawnChart, chartPng } = A;
    const SR = root.SpeechRecognition || root.webkitSpeechRecognition;
    const money = (usd) => { const c = Math.round(usd * 100); return usd < 0.005 ? 'under a cent' : c === 1 ? '1 cent' : usd < 1 ? `${c} cents` : `$${usd.toFixed(2)}`; };
    const postJson = (url, body) => api(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const longDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${MON[+m[2] - 1]} ${+m[3]}, ${m[1]}` : ''; };
    const cell = (img) => h('a', { class: 'cell', href: `#/chart/${img.id}` }, img.has_file ? h('img', { class: 'thumb', src: `/thumb/${img.id}`, loading: 'lazy', alt: img.title || '' }) : h('div', { class: 'nofile' }, 'no picture'), h('div', { class: 'label' }, img.title || img.filename));

    // One person found: who, the boxes (name, day, month, year) prefilled, the chart drawn from them and
    // redrawn on every change, the sources, Save to Vault.
    function personCard(p) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.birth_date || '');
      const box = (ph, value, attrs = {}) => h('input', { type: 'text', inputmode: 'numeric', placeholder: ph, autocomplete: 'off', value, ...attrs });
      const $name = h('input', { type: 'text', placeholder: 'Full birth name', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', value: p.birth_name || p.known_as || '' });
      const $day = box('day', m ? String(+m[3]) : '', { maxlength: 2 }), $month = box('month', m ? String(+m[2]) : '', { maxlength: 2 }), $year = box('year', m ? m[1] : '', { maxlength: 4 });
      const $chart = h('div', { class: 'nscope-box' });
      let svg = null;
      const inp = () => ({ day: $day.value, month: $month.value, year: $year.value, name: $name.value });
      const draw = () => { svg = drawnChart(inp()); fill($chart, svg); };
      for (const el of [$name, $day, $month, $year]) el.addEventListener('input', draw);
      const $save = h('button', { type: 'button', class: 'btn-primary btn-block' }, 'Save to Vault');
      $save.onclick = async () => {
        const name = $name.value.trim();
        if (!name) { toast('Type a name first.', true); $name.focus(); return; }
        const d = Number($day.value), mo = Number($month.value), y = Number($year.value);
        if (!(d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 1000)) { toast('Fill in the whole birth date first.', true); return; }
        count('lookup.save');
        $save.disabled = true; $save.textContent = 'Saving…';
        try {
          const date = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const png = await chartPng(svg);
          const title = p.known_as && p.known_as !== name ? p.known_as : '';
          const r = await api(`/api/quick/save?name=${encodeURIComponent(name)}&date=${date}${title ? `&title=${encodeURIComponent(title)}` : ''}`, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: png });
          toast(`Saved “${title || name}” to the vault`);
          go(`#/chart/${r.id}?sheet=1`);
        } catch (err) { toast(err.message, true); $save.disabled = false; $save.textContent = 'Save to Vault'; }
      };
      const $quick = h('button', { type: 'button', class: 'btn btn-block', onclick: () => {
        count('lookup.quick');
        try { localStorage.setItem('quickDraft', JSON.stringify(inp())); } catch {}
        go('#/quick');
      } }, 'Open in Quick Chart');
      draw();
      return h('div', { class: 'card stack lookup-card' },
        $chart,
        h('div', {}, h('h2', { class: 'lookup-who' }, p.known_as || p.birth_name), p.who ? h('div', { class: 'muted small' }, p.who) : null),
        h('div', { class: 'lookup-facts' },
          h('div', {}, h('span', { class: 'muted small' }, 'Birth name '), h('b', {}, p.birth_name || 'not found')),
          h('div', {}, h('span', { class: 'muted small' }, 'Born '), h('b', {}, longDate(p.birth_date) || 'date not found'))),
        p.sure ? null : h('p', { class: 'lookup-warn small' }, p.note || 'The sources do not agree, or none were found. Check before saving.'),
        p.sure && p.note ? h('p', { class: 'muted small', style: 'margin:0' }, p.note) : null,
        p.sources && p.sources.length ? h('div', { class: 'muted small' }, 'Found on ', ...p.sources.flatMap((s, i) => [i ? ' · ' : '', h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.site)])) : null,
        h('div', { class: 'muted small' }, 'Wrong? Fix the name or date here; the chart redraws.'),
        h('div', { class: 'row lookup-fields' }, $day, $month, $year),
        h('div', { class: 'row lookup-fields' }, $name),
        $save, $quick,
        p.vault && p.vault.length ? h('div', { class: 'stack' }, h('div', { class: 'muted small' }, 'Already in your vault, born that day or with that name:'), h('div', { class: 'grid' }, ...p.vault.map(cell))) : null);
    }

    routes.lookup = function lookupView(_, query) {
      count('screen.lookup');
      const $q = h('input', { type: 'text', placeholder: 'A name, or describe them…', autocomplete: 'off', enterkeyhint: 'search', maxlength: 200, value: query && query.get('q') ? query.get('q') : '' });
      const $go = h('button', { type: 'button', class: 'btn-primary', onclick: () => send(false) }, 'Search');
      const $out = h('div', { class: 'stack' });
      const $hint = h('div', { class: 'muted small lookup-hint' }, SR ? 'Tap the microphone and say a name, or describe the person.' : 'Type a name, or use the microphone on your keyboard.');
      let rec = null, listening = false;
      const $mic = h('button', { type: 'button', class: 'lookup-mic', 'aria-label': 'Speak a name' }, '🎙');
      const stopMic = () => { listening = false; $mic.classList.remove('on'); try { rec && rec.stop(); } catch {} };
      $mic.onclick = () => {
        if (!SR) { $q.focus(); return; }
        if (listening) { stopMic(); return; }
        count('lookup.mic');
        rec = new SR();
        rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
        let heard = '';
        rec.onresult = (e) => { heard = Array.from(e.results).map((r) => r[0].transcript).join(' ').trim(); $q.value = heard; };
        rec.onerror = (e) => {
          listening = false; $mic.classList.remove('on');
          $hint.textContent = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'The microphone is blocked for this app. Allow it in the phone\'s settings for this site, or type instead.' : e.error === 'no-speech' ? 'Nothing heard. Tap the microphone and try again.' : `The microphone stopped (${e.error}). Tap it to try again, or type instead.`;
        };
        rec.onend = () => { const was = listening; listening = false; $mic.classList.remove('on'); if (was && heard) send(false); };
        try { rec.start(); listening = true; $mic.classList.add('on'); $hint.textContent = 'Listening… say the name.'; } catch (err) { $hint.textContent = 'The microphone could not start. Tap it again, or type instead.'; }
      };
      const send = async (web) => {
        const q = $q.value.trim();
        if (!q) { toast('Say or type a name first.', true); return; }
        if (listening) stopMic();
        count(web ? 'lookup.web_anyway' : 'lookup.search');
        $go.disabled = true; $go.textContent = 'Searching…';
        fill($out, h('p', { class: 'muted' }, web ? 'Searching the web… about 10 to 30 seconds.' : 'Looking in your vault, then on the web… about 10 to 30 seconds.'));
        try {
          const r = await postJson('/api/lookup', { query: q, web });
          if (r.vault) {
            fill($out, h('div', { class: 'card stack' }, h('b', {}, 'Already in your vault'),
              h('div', { class: 'grid' }, ...r.vault.map(cell)),
              h('button', { type: 'button', class: 'btn btn-block', onclick: () => send(true) }, 'Search the Web Anyway (about 3 cents)')));
          } else {
            const head = r.people.length ? null : h('div', { class: 'card' }, h('p', { style: 'margin:0' }, r.note || 'Nobody found. Try saying it another way.'));
            fill($out, head, ...r.people.map(personCard),
              r.people.length > 1 ? h('p', { class: 'muted small' }, 'More than one person fits. The best match is first.') : null,
              r.people.length && r.note ? h('p', { class: 'muted small' }, r.note) : null,
              h('div', { class: 'muted small' }, `${money(r.usd)} · ${r.searches} web search${r.searches === 1 ? '' : 'es'} · ${Math.round(r.seconds)} s${r.spend ? ` · $${r.spend.spent.toFixed(2)} of $${r.spend.cap.toFixed(2)} this month` : ''}`),
              r.warning ? h('p', { class: 'lookup-warn small' }, r.warning.text) : null);
          }
        } catch (err) { fill($out, h('p', { class: 'err' }, err.message)); }
        $go.disabled = false; $go.textContent = 'Search';
      };
      $q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(false); } });
      render(h('div', { class: 'screen stack' }, pageTop('Look Up Someone', '#/'),
        h('div', { class: 'lookup-top' }, $mic, $hint),
        h('div', { class: 'row', style: 'flex-wrap:nowrap' }, $q, $go),
        h('p', { class: 'muted small', style: 'margin:0' }, 'Your vault is checked first, for free. A web search finds the birth name and birth date: about 2 to 4 cents. Nothing is saved until you tap Save to Vault.'),
        $out));
      api('/api/ai/settings').then((s) => { if (!s.key_set) fill($out, h('div', { class: 'card stack' }, h('p', { class: 'muted', style: 'margin:0' }, 'Add the AI key first.'), h('a', { class: 'btn btn-block', href: '#/ai' }, 'AI Reading Settings'))); }).catch(() => {});
      if ($q.value) send(false);
      else if (query && query.get('listen') && SR) setTimeout(() => $mic.click(), 300);
    };

    const homeButton = () => h('a', { class: 'act', href: '#/lookup', onclick: () => count('home.lookup') }, h('span', { class: 'qicon' }, '🎙'), h('span', { class: 'al' }, 'Look Up'));
    return { homeButton, USAGE_LABELS };
  }
  root.Lookup = { install };
})(typeof globalThis !== 'undefined' ? globalThis : this);
