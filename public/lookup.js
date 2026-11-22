/* Look Up (owner's ask 2026-11-01; businesses and organizations 2026-11-14): tap the microphone and say a name ("Fifty Cent") or describe
   someone ("the rapper who got shot nine times"). The vault is checked first, for free; then the AI searches
   the web for the birth name and birth date (about 3 to 10 cents) and each person found is drawn as a chart,
   with the name and date in boxes to fix and a Save to Vault button. Nothing is saved until that tap.
   Also opened from the phone's app icon: press and hold it, "Look Up Someone" (manifest shortcut, ?listen=1).
   app.js hands over its plumbing through Lookup.install, like reading.js. */
(function (root) {
  'use strict';
  const USAGE_LABELS = {
    'screen.lookup': 'Look Up', 'home.lookup': 'Look Up (home)', 'lookup.mic': 'Look Up: speak a name',
    'lookup.search': 'Look Up: search the web', 'lookup.web_anyway': 'Look Up: search the web anyway', 'lookup.save': 'Look Up: Save to Vault',
    'lookup.quick': 'Look Up: open in Quick Chart', 'lookup.pick_name': 'Look Up: pick a name', 'lookup.pick_date': 'Look Up: pick a date',
    'lookup.clarify': 'Look Up: add a detail and search again', 'lookup.others': 'Look Up: open Others With This Name', 'lookup.past_open': 'Look Up: open a past search',
    'lookup.past_remove': 'Look Up: remove a past search',
  };

  function install(A) {
    const { routes, h, fill, api, toast, count, go, render, pageTop, drawnChart, chartPng, holdButton } = A;
    const whenOf = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
    const SR = root.SpeechRecognition || root.webkitSpeechRecognition;
    const money = (usd) => { const c = Math.round(usd * 100); return usd < 0.005 ? 'under a cent' : c === 1 ? '1 cent' : usd < 1 ? `${c} cents` : `$${usd.toFixed(2)}`; };
    const postJson = (url, body) => api(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const partialDate = (s) => { const m = /^(\d{4})(?:-(\d{2}))?$/.exec(s || ''); return m ? (m[2] ? `${MON[+m[2] - 1]} ${m[1]}` : m[1]) : ''; };
    const longDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${MON[+m[2] - 1]} ${+m[3]}, ${m[1]}` : ''; };
    const cell = (img) => h('a', { class: 'cell', href: `#/chart/${img.id}` }, img.has_file ? h('img', { class: 'thumb', src: `/thumb/${img.id}`, loading: 'lazy', alt: img.title || '' }) : h('div', { class: 'nofile' }, 'no picture'), h('div', { class: 'label' }, img.title || img.filename));

    // One person found: who, the boxes (name, day, month, year) prefilled, the chart drawn from them and
    // redrawn on every change, the sources, Save to Vault.
    function personCard(p) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.birth_date || '');
      const box = (ph, value, attrs = {}) => h('input', { type: 'text', inputmode: 'numeric', placeholder: ph, autocomplete: 'off', value, ...attrs });
      const biz = p.kind === 'business';
      const names = p.names || [], dates = p.dates || [];
      const $name = h('input', { type: 'text', placeholder: biz ? 'Registered name' : 'Full birth name', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', value: names[0] ? names[0].chart : (p.birth_name || p.known_as || '') });
      const $day = box('day', m ? String(+m[3]) : '', { maxlength: 2 }), $month = box('month', m ? String(+m[2]) : '', { maxlength: 2 }), $year = box('year', m ? m[1] : '', { maxlength: 4 });
      const $chart = h('div', { class: 'nscope-box' });
      let svg = null;
      const inp = () => ({ day: $day.value, month: $month.value, year: $year.value, name: $name.value });
      const draw = () => { svg = drawnChart(inp()); fill($chart, svg); };
      // Every name and date the sources gave, the main answer first; a tap fills the boxes and redraws
      // (owner 2026-11-14: "lay everything out and I will click what's correct"). Typing in a box unmarks them.
      // A business always shows its lists, even with one answer (owner 2026-11-14: "full transparency").
      // A date known only to the year or month is listed but cannot be picked (it cannot be drawn).
      const optList = (title, items, label, sub, onPick) => {
        if (!items.length) return { el: null, clear() {} }; // always shown, with where each was found (owner 2026-11-22: "so I can confirm")
        const first = items.findIndex((it) => !it.partial);
        const btns = items.map((it, i) => it.partial
          ? h('div', { class: 'lookup-opt off' }, h('b', {}, label(it)), h('span', { class: 'muted small' }, [sub(it), 'not a full date, so it cannot be drawn'].filter(Boolean).join(' · ')))
          : h('button', { type: 'button', class: 'lookup-opt' + (i === first ? ' on' : ''), onclick: () => { for (const b of btns) b.classList.toggle('on', b === btns[i]); onPick(it); draw(); } },
            h('b', {}, label(it)), sub(it) ? h('span', { class: 'muted small' }, sub(it)) : null));
        return { el: h('div', { class: 'stack lookup-opts' }, h('div', { class: 'small' }, h('b', {}, title)), ...btns), clear() { for (const b of btns) b.classList.remove('on'); } };
      };
      const where = (it) => (it.from ? `found on ${it.from.site}` : 'no page given for it');
      const nameSub = (n) => [n.what, where(n), n.ending ? (n.with ? `with “${n.ending}”, as registered` : `without “${n.ending}”, the course leaves it out`) : '',
        n.long ? 'over 34 letters: the course uses the shorter name it goes by' : ''].filter(Boolean).join(' · ');
      const nameOpts = optList(biz ? 'Which name goes on the chart? Tap one.' : 'Which birth name? Tap the right one.', names, (n) => n.chart, nameSub, (n) => { count('lookup.pick_name'); $name.value = n.chart; });
      const dateOpts = optList(biz ? 'Which date goes on the chart? Tap one.' : 'Which birth date? Tap the right one.', dates, (d) => longDate(d.date) || partialDate(d.date), (d) => [d.what, where(d)].filter(Boolean).join(' · '), (d) => {
        count('lookup.pick_date'); const [y, mo, dd] = d.date.split('-'); $day.value = String(+dd); $month.value = String(+mo); $year.value = y;
      });
      $name.addEventListener('input', () => nameOpts.clear());
      for (const el of [$day, $month, $year]) el.addEventListener('input', () => dateOpts.clear());
      for (const el of [$name, $day, $month, $year]) el.addEventListener('input', draw);
      const $save = h('button', { type: 'button', class: 'btn-primary btn-block' }, 'Save to Vault');
      $save.onclick = async () => {
        const name = $name.value.trim();
        if (!name) { toast('Type a name first.', true); $name.focus(); return; }
        const d = Number($day.value), mo = Number($month.value), y = Number($year.value);
        // No birth date found is fine (owner 2026-11-10): the chart is saved with the name line only.
        // A half-typed date is still refused, so a wrong date never gets saved by accident.
        const noDate = !$day.value.trim() && !$month.value.trim() && !$year.value.trim();
        if (!noDate && !(d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 1000)) { toast('Fill in the whole birth date, or clear all three boxes to save the name only.', true); return; }
        count('lookup.save');
        $save.disabled = true; $save.textContent = 'Saving…';
        try {
          const date = noDate ? '' : `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const png = await chartPng(svg);
          const title = p.known_as && p.known_as !== name ? p.known_as : '';
          const r = await api(`/api/quick/save?name=${encodeURIComponent(name)}&date=${date}${title ? `&title=${encodeURIComponent(title)}` : ''}`, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: png });
          toast(`Saved “${title || name}” to the vault`);
          // The chart opens OVER this screen, which stays drawn underneath: the button must not stay
          // "Saving…" (owner 2026-11-07). It now opens the saved chart; a second tap never saves twice.
          $save.disabled = false; $save.textContent = 'Saved ✓ Open the Chart';
          $save.onclick = () => go(`#/chart/${r.id}?sheet=1`);
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
          h('div', {}, h('span', { class: 'muted small' }, biz ? 'Registered name ' : 'Birth name '), h('b', {}, p.birth_name || 'not found')),
          biz && p.register ? h('div', {}, h('span', { class: 'muted small' }, 'Recorded in '), h('b', {}, p.register)) : null,
          h('div', {}, h('span', { class: 'muted small' }, biz ? `${(dates[0] && dates[0].what) || 'Registered'} ` : 'Born '), h('b', {}, longDate(p.birth_date) || 'date not found'))),
        biz && names[0] && names[0].ending ? h('p', { class: 'lookup-warn small' }, `The registered name ends in “${names[0].ending}”. The course leaves that out of the chart. Both ways are below: tap the one you want.`) : null,
        biz && dates.length > 1 ? h('p', { class: 'lookup-warn small' }, 'More than one date came back (for example founded and registered). Each one is below with what it is: tap the one you want.') : null,
        biz && names[0] && names[0].long ? h('p', { class: 'lookup-warn small' }, 'This name is over 34 letters. The course uses the shorter name the business goes by: fix it in the box.') : null,
        p.match === 'maybe' ? h('p', { class: 'lookup-warn small' }, `Could be the one you mean${p.match_why ? `: ${p.match_why}` : ''}. Check it is the right person before saving.`) : null,
        p.match === 'same_name' ? h('p', { class: 'lookup-warn small' }, `Same name, probably someone else${p.match_why ? `: ${p.match_why}` : ''}.`) : null,
        p.match === 'fits' && p.match_why ? h('div', { class: 'muted small' }, `Matches what you said: ${p.match_why}`) : null,
        p.sure || (p.match !== 'fits' && !p.note && names.length < 2 && dates.length < 2) ? null : h('p', { class: 'lookup-warn small' }, p.note || (names.length > 1 || dates.length > 1 ? 'More than one answer came back. Tap the right name and date below.' : 'The sources do not agree, or none were found. Check before saving.')),
        p.sure && p.note ? h('p', { class: 'muted small', style: 'margin:0' }, p.note) : null,
        p.sources && p.sources.length ? h('div', { class: 'muted small' }, 'Found on ', ...p.sources.flatMap((s, i) => [i ? ' · ' : '', h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.site)])) : null,
        nameOpts.el, dateOpts.el,
        h('div', { class: 'muted small' }, 'Wrong? Fix the name or date here; the chart redraws.'),
        h('div', { class: 'row lookup-fields' }, $day, $month, $year),
        h('div', { class: 'row lookup-fields' }, $name),
        $save, $quick,
        p.vault && p.vault.length ? h('div', { class: 'stack' }, h('div', { class: 'muted small' }, biz ? 'Already in your vault, the same date or name:' : 'Already in your vault, born that day or with that name:'), h('div', { class: 'grid' }, ...p.vault.map(cell))) : null);
    }

    routes.lookup = function lookupView(_, query) {
      count('screen.lookup');
      const $q = h('input', { type: 'text', placeholder: 'A person, a business, or describe them…', autocomplete: 'off', enterkeyhint: 'search', maxlength: 200, value: query && query.get('q') ? query.get('q') : '' });
      const $go = h('button', { type: 'button', class: 'btn-primary', onclick: () => send(false) }, 'Search');
      const $out = h('div', { class: 'stack' });
      const $hint = h('div', { class: 'muted small lookup-hint' }, SR ? 'Tap the microphone and say a name, a business or an organization, or describe them.' : 'Type a name or a business, or use the microphone on your keyboard.');
      let rec = null, listening = false, searched = false;
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
      // "Not right?" (owner 2026-11-14: "I will click what's correct or clarify"): a detail added to the
      // same words, searched again (paid, like any web search).
      const clarifyBox = (q) => {
        const $more = h('input', { type: 'text', placeholder: 'For example: the one in Texas', autocomplete: 'off', enterkeyhint: 'search', maxlength: 120 });
        const again = () => {
          const d = $more.value.trim();
          if (!d) { toast('Type the detail first.', true); $more.focus(); return; }
          count('lookup.clarify');
          $q.value = `${q}. ${d}`.slice(0, 200); send(true, true);
        };
        $more.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); again(); } });
        return h('div', { class: 'card stack' }, h('b', {}, 'Not right? Tell it more'),
          h('div', { class: 'muted small' }, 'Add a detail and it searches again: about 3 to 10 cents.'),
          $more, h('button', { type: 'button', class: 'btn btn-block', onclick: again }, 'Search Again'));
      };
      // The people found, laid out the same way for a new search and for a past one opened again.
      const showResult = (r) => {
        // Same name, other person (owner 2026-11-22: "show it on the bottom part"): folded under the ones that fit.
        const main = r.people.filter((p) => p.match !== 'same_name'), others = r.people.filter((p) => p.match === 'same_name');
        const head = main.length ? null : h('div', { class: 'card' }, h('p', { style: 'margin:0' }, others.length ? 'Nobody matched everything you said. Others with that name are below; tap to see them.' : r.note || 'Nobody found. Try saying it another way.'));
        const $others = others.length ? h('details', { class: 'card lookup-others', ontoggle: (e) => { if (e.target.open) count('lookup.others'); } },
          h('summary', {}, h('b', {}, `Others With This Name (${others.length})`), h('div', { class: 'muted small' }, 'Probably not who you mean. Tap to see them.')),
          h('div', { class: 'stack' }, ...others.map(personCard))) : null;
        const past = r.past ? h('p', { class: 'lookup-past-head small' }, `Past search from ${whenOf(r.past.at)}. Opening it again is free; tap Search to look it up fresh.`) : null;
        fill($out, past, head, ...main.map(personCard),
          main.length > 1 ? h('p', { class: 'muted small' }, 'More than one could be them. The best match is first.') : null,
          $others,
          r.people.length && r.note ? h('p', { class: 'muted small' }, r.note) : null,
          h('div', { class: 'muted small' }, `${r.past ? 'It cost ' : ''}${money(r.usd)} · ${r.searches} web search${r.searches === 1 ? '' : 'es'} · ${Math.round(r.seconds)} s${r.spend ? ` · $${r.spend.spent.toFixed(2)} of $${r.spend.cap.toFixed(2)} this month` : ''}`),
          r.warning ? h('p', { class: 'lookup-warn small' }, r.warning.text) : null,
          clarifyBox(r.query),
          r.past ? holdButton('Hold to Remove From Past Searches', async () => {
            try { await api(`/api/lookups/${r.id}`, { method: 'DELETE' }); count('lookup.past_remove'); toast('Removed from Past Searches'); location.replace('#/lookup'); } catch (err) { toast(err.message, true); }
          }) : null);
      };
      const send = async (web, quiet) => {
        const q = $q.value.trim();
        if (!q) { toast('Say or type a name first.', true); return; }
        if (listening) stopMic();
        if (!quiet) count(web ? 'lookup.web_anyway' : 'lookup.search');
        $go.disabled = true; $go.textContent = 'Searching…';
        searched = true; fill($past);
        fill($out, h('p', { class: 'muted' }, web ? 'Searching the web… about 10 to 30 seconds.' : 'Looking in your vault, then on the web… about 10 to 30 seconds.'));
        try {
          const r = await postJson('/api/lookup', { query: q, web });
          if (r.vault) {
            fill($out, h('div', { class: 'card stack' }, h('b', {}, 'Already in your vault'),
              h('div', { class: 'grid' }, ...r.vault.map(cell)),
              h('button', { type: 'button', class: 'btn btn-block', onclick: () => send(true) }, 'Search the Web Anyway (about 3 to 10 cents)')));
          } else showResult(r);
        } catch (err) { fill($out, h('p', { class: 'err' }, err.message)); }
        $go.disabled = false; $go.textContent = 'Search';
      };
      // Past Searches (owner 2026-11-16): every web search is kept; a tap opens it again, free. Newest first.
      const $past = h('div', { class: 'stack' });
      const pastList = () => api('/api/lookups').then(({ items }) => {
        if (!items.length || searched) return;
        fill($past, h('h3', { class: 'lookup-past-title' }, 'Past Searches'),
          h('div', { class: 'card lookup-past' }, ...items.map((it) => h('a', { class: 'lookup-past-row', href: `#/lookup?past=${it.id}`, onclick: () => count('lookup.past_open') },
            h('b', {}, `“${it.query}”`),
            h('span', { class: 'muted small' }, it.names ? `Found: ${it.names}` : 'Nobody found'),
            h('span', { class: 'muted small' }, whenOf(it.created_at))))));
      }).catch((err) => fill($past, h('p', { class: 'err' }, `Past Searches could not load: ${err.message}`)));
      const openPast = (id) => {
        fill($out, h('p', { class: 'muted' }, 'Opening the past search…'));
        api(`/api/lookups/${encodeURIComponent(id)}`).then((r) => { $q.value = r.query; showResult(r); })
          .catch((err) => fill($out, h('p', { class: 'err' }, err.message)));
      };
      $q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(false); } });
      render(h('div', { class: 'screen stack' }, pageTop('Look Up', '#/'),
        h('div', { class: 'lookup-top' }, $mic, $hint),
        h('div', { class: 'row', style: 'flex-wrap:nowrap' }, $q, $go),
        h('p', { class: 'muted small', style: 'margin:0' }, 'Your vault is checked first, for free. A web search finds a person\'s birth name and birth date, or a business\'s registered name and founding date: about 3 to 10 cents (it digs further when the date is hard to find). Nothing is saved until you tap Save to Vault.'),
        $out, $past));
      api('/api/ai/settings').then((s) => { if (!s.key_set) fill($out, h('div', { class: 'card stack' }, h('p', { class: 'muted', style: 'margin:0' }, 'Add the AI key first.'), h('a', { class: 'btn btn-block', href: '#/ai' }, 'AI Reading Settings'))); }).catch(() => {});
      if (query && query.get('past')) openPast(query.get('past'));
      else if ($q.value) send(false);
      else if (query && query.get('listen') && SR) setTimeout(() => $mic.click(), 300);
      if (!(query && query.get('past')) && !$q.value) pastList();
    };

    const homeButton = () => h('a', { class: 'act', href: '#/lookup', onclick: () => count('home.lookup') }, h('span', { class: 'qicon' }, '🎙'), h('span', { class: 'al' }, 'Look Up'));
    return { homeButton, USAGE_LABELS };
  }
  root.Lookup = { install };
})(typeof globalThis !== 'undefined' ? globalThis : this);
