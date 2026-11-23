/* Research a Group (owner's ask 2026-11-23): type a category ("computer coders", "trans people", "coffee chains"),
   and the AI searches the web in rounds for as many well-known examples as it can find with the name and date a chart needs.
   Four screens on one route:
     #/research                 ask (the box, the size, Past Research)
     #/research?id=N&view=who   who it found, each with a tick (and the vault's own people of that kind)
     #/research?id=N            the results: the summary, every chart drawn, what the group shares
     #/research?id=N&p=3        one person: the chart, the sources, Birth Name / Name Now, a fix, Save to Vault
   Nothing is saved to the vault until Save to Vault. The counting is the same as What This Group Shares
   (app.js groupFinds). app.js hands over its plumbing through Research.install, like lookup.js. */
(function (root) {
  'use strict';
  const USAGE_LABELS = {
    'screen.research': 'Research a Group', 'home.research': 'Research a Group (home)', 
    'research.search': 'Research: search the web', 'research.more': 'Research: keep going or search for more', 'research.angle': 'Research: search from a suggested angle', 'research.angle_own': 'Research: search from my own angle', 'research.check': 'Research: Check the Dates', 'research.done': 'Research: What Next? Done', 'research.past_open': 'Research: open a past research',
    'research.past_remove': 'Research: remove a past research', 'research.tick': 'Research: tick or untick someone', 'research.show': 'Research: Show Charts and Patterns',
    'research.change_who': 'Research: Change Who Is In', 'research.open_person': 'Research: open a person', 'research.name_now': 'Research: Birth Name or Name Now',
    'research.fix': 'Research: keep a fixed name or date', 'research.save': 'Research: Save to Vault', 'research.save_all': 'Research: Save All to Vault',
    'research.summary_again': 'Research: write the reading again', 'research.insight_who': 'Research: open Who on an insight', 'research.every_position': 'Research: open Every Position Counted', 'research.quick': 'Research: open in Quick Chart', 'research.grid_size': 'Research: chart size',
  };

  function install(A) {
    const { routes, h, fill, api, toast, count, go, swap, render, pageTop, drawnChart, chartPng, holdButton, sizeControl, groupFinds, fmtN } = A;
    const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const money = (usd) => { const c = Math.round(usd * 100); return usd < 0.005 ? 'under a cent' : c === 1 ? '1 cent' : usd < 1 ? `${c} cents` : `$${usd.toFixed(2)}`; };
    const longDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${MON[+m[2] - 1]} ${+m[3]}, ${m[1]}` : ''; };
    const whenOf = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
    const send = (url, method, body) => api(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
    const inputsOf = (p, name) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.birth_date || ''); return { name: name || p.chart_name || '', day: m ? +m[3] : '', month: m ? +m[2] : '', year: m ? +m[1] : '' }; };
    const plural = (n, one, many) => `${fmtN(n)} ${n === 1 ? one : many}`;
    const noun = (g) => (g.people.length && g.people.every((p) => p.kind === 'business') ? ['business', 'businesses'] : ['person', 'people']);
    const saveChart = async (name, date, title, svg) => {
      const png = await chartPng(svg);
      return api(`/api/quick/save?name=${encodeURIComponent(name)}&date=${date}${title && title !== name ? `&title=${encodeURIComponent(title)}` : ''}`, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: png });
    };
    const fail = ($el, err) => fill($el, h('p', { class: 'err' }, err.message));

    // ---------- screen 1: ask ----------
    function askView(query) {
      const $q = h('input', { type: 'text', placeholder: 'A kind of person or business…', autocomplete: 'off', enterkeyhint: 'search', maxlength: 200, value: query.get('q') || '' });
      const $go = h('button', { type: 'button', class: 'btn-primary btn-block' }, 'Search');
      const $out = h('div', { class: 'stack' }), $past = h('div', { class: 'stack' });
      const $cost = h('p', { class: 'muted small', style: 'margin:0' }, 'It keeps searching until no new ones turn up, and asks you before spending more than $1.');
      let busy = false;
      // The search runs on the server; this only starts it and opens the screen that watches it.
      const run = async () => {
        const q = $q.value.trim();
        if (!q) { toast('Type a category first.', true); $q.focus(); return; }
        if (busy) return;
        count('research.search');
        busy = true; $go.disabled = true; $go.textContent = 'Starting…';
        try { const r = await send('/api/research', 'POST', { query: q }); go(`#/research?id=${r.id}&view=who`); }
        catch (err) { fail($out, err instanceof TypeError ? new Error('The connection dropped. Look in Past Research below: if the search is there, it started; if not, tap Search again.') : err); pastList(); }
        busy = false; $go.disabled = false; $go.textContent = 'Search';
      };
      $go.onclick = run;
      $q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $q.blur(); } });
      const STATUS = { running: 'Searching now…', paused: 'Waiting for you: keep going?', interrupted: 'Cut short by a restart', failed: 'Failed' };
      const pastList = () => api('/api/research').then((d) => {
        if (d.cost) $cost.textContent = `It searches in rounds of 30 (about ${money(d.cost.round_usd)} each) until no new ones turn up, and asks you before spending more than $${d.cost.limit_usd.toFixed(0)}.`;
        if (!d.items.length) return;
        fill($past, h('h3', { class: 'lookup-past-title' }, 'Past Research'),
          h('div', { class: 'card lookup-past' }, ...d.items.map((it) => h('a', { class: 'lookup-past-row', href: it.status === 'running' ? `#/research?id=${it.id}&view=who` : `#/research?id=${it.id}`, onclick: () => count('research.past_open') },
            h('b', {}, it.category || it.query),
            h('span', { class: 'muted small' }, `${it.found} found · “${it.query}”${STATUS[it.status] ? ` · ${STATUS[it.status]}` : ''}`),
            h('span', { class: 'muted small' }, `${whenOf(it.created_at)} · ${money(it.usd || 0)}`)))));
      }).catch((err) => fail($past, new Error(`Past Research could not load: ${err.message}`)));
      render(h('div', { class: 'screen stack' }, pageTop('Research a Group', '#/'),
        $q, $go, $cost,
        h('p', { class: 'muted small', style: 'margin:0' }, 'It finds as many well-known examples as it can, with their birth name and birth date (a business: its registered name and start date), draws every chart and counts what the group shares against your whole vault. Only public figures; nothing is saved until you tap Save to Vault.'),
        $out, $past));
      api('/api/ai/settings').then((s) => { if (!s.key_set) fill($out, h('div', { class: 'card stack' }, h('p', { class: 'muted', style: 'margin:0' }, 'Add the AI key first.'), h('a', { class: 'btn btn-block', href: '#/ai' }, 'AI Reading Settings'))); }).catch(() => {});
      pastList();
      if (!$q.value) $q.focus(); // the keyboard comes up at once (owner 2026-11-23: its own microphone does the talking)
    }

    // How the search is going (it runs on the server): shown on top of Who It Found and of the results. While it
    // runs the screen asks again every few seconds; `redraw` is called when the state changes. Paused = it would
    // pass the money limit: the owner taps Keep Going or leaves it there.
    let watch = 0;
    function statusCard(g, id, redraw, compact) {
      const each = g.cost ? money(g.cost.round_usd) : 'a few cents';
      const more = async () => {
        count('research.more');
        try { await send(`/api/research/${id}/more`, 'POST'); redraw(); } catch (err) { toast(err.message, true); }
      };
      const moreBtn = (label) => h('button', { type: 'button', class: 'btn btn-block', onclick: more }, label);
      if (g.status === 'running') {
        const mine = ++watch;
        setTimeout(() => { if (mine === watch && location.hash.includes(`id=${id}`)) redraw(); }, 4000);
        return h('div', { class: 'card stack rs-status' }, h('b', {}, `Searching… round ${g.rounds + 1}`),
          h('div', { class: 'muted' }, `${g.people.length} found so far · ${money(g.usd)} spent. A round takes a minute or two. You can leave: it keeps going, and it is kept in Past Research.`));
      }
      watch++;
      if (g.status === 'paused') return h('div', { class: 'card stack rs-status' }, h('b', {}, `Stopped to ask: ${g.people.length} found for ${money(g.usd)}`),
        h('div', { class: 'muted' }, `Another round would pass your $${g.limit.toFixed(0)} limit. Each round is about ${each} and brings up to 30 more.`),
        moreBtn('Keep Going (up to $1 More)'));
      if (g.status === 'interrupted') return h('div', { class: 'card stack rs-status' }, h('b', {}, 'The search was cut short'), h('div', { class: 'muted' }, `${g.stop} ${g.people.length} found for ${money(g.usd)}.`), moreBtn(`Keep Searching (about ${each} a round)`));
      if (g.status === 'failed') return h('div', { class: 'card stack rs-status' }, h('b', {}, 'The search failed'), h('p', { class: 'err', style: 'margin:0' }, g.stop || 'Nothing came back.'), moreBtn(`Try Again (about ${each})`));
      if (g.status === 'checking') {
        const mine = ++watch, c = g.checking || { total: 0, done: 0 };
        setTimeout(() => { if (mine === watch && location.hash.includes(`id=${id}`)) redraw(); }, 4000);
        return h('div', { class: 'card stack rs-status' }, h('b', {}, `Checking the dates… ${c.done} of ${c.total}`),
          h('div', { class: 'muted' }, `Each one is looked up on a web page. ${c.confirmed || 0} confirmed${c.changed ? `, ${c.changed} corrected` : ''} so far · ${money(c.usd || 0)} spent. You can leave: it keeps going.`));
      }
      // On the results the choices are one tap away, never a tall card above the reading.
      if (g.status === 'done' && !g.closed && compact) return h('a', { class: 'btn btn-block', href: `#/research?id=${id}&view=who`, onclick: () => count('research.more') }, 'Find More or Check the Dates');
      if (g.status === 'done' && !g.closed) return whatNext(g, id, redraw);
      return null;
    }

    // What Next? (owner 2026-11-23: "give me a pop-up stating what you want to do or what we could do, and just give me
    // the options"): when a search stops, what happened and every choice with its cost; it stays until Done.
    function whatNext(g, id, redraw) {
      const each = g.cost ? money(g.cost.round_usd) : 'a few cents';
      const open = g.people.filter((p) => !p.checked && !p.fixed && !p.check_failed).length;
      const post = async (path, body, name) => { count(name); try { await send(`/api/research/${id}/${path}`, 'POST', body); redraw(); } catch (err) { toast(err.message, true); } };
      const angle = (a) => h('button', { type: 'button', class: 'rs-angle', onclick: () => post('more', { angle: a }, 'research.angle') }, h('b', {}, a), h('span', { class: 'muted small' }, `about ${each} a round`));
      const $own = h('input', { type: 'text', placeholder: 'Or type your own angle…', autocomplete: 'off', enterkeyhint: 'search', maxlength: 60 });
      const ownGo = () => { const a = $own.value.trim(); if (!a) { toast('Type an angle first.', true); $own.focus(); return; } post('more', { angle: a }, 'research.angle_own'); };
      $own.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ownGo(); } });
      return h('div', { class: 'card stack rs-status rs-next' },
        h('div', { class: 'rs-next-head' }, 'What Next?'),
        h('div', { class: 'muted' }, `${g.stop || 'The search stopped.'} ${plural(g.people.length, 'found', 'found')} in ${g.rounds} round${g.rounds === 1 ? '' : 's'} for ${money(g.usd)}.`.replace(/(\d[\d,]*) found found/, '$1 found')),
        h('div', { class: 'rs-next-title' }, '1. Search From Another Angle'),
        h('div', { class: 'muted small' }, 'A narrower slice of the same group often turns up people the plain search missed.'),
        ...(g.angles || []).map(angle),
        h('div', { class: 'row', style: 'flex-wrap:nowrap' }, $own, h('button', { type: 'button', class: 'btn', onclick: ownGo }, 'Go')),
        (g.tried || []).length ? h('div', { class: 'muted small' }, `Already tried: ${g.tried.join(', ')}`) : null,
        open ? h('div', { class: 'rs-next-title' }, '2. Check the Dates') : null,
        open ? h('div', { class: 'muted small' }, `${open} ${open === 1 ? 'person has a' : 'people have a'} birth date not confirmed on a web page: the AI wrote it from what it already knew, or found none. It looks each one up on a page, fills in missing ones and corrects any that are wrong.`) : null,
        open ? h('button', { type: 'button', class: 'btn btn-block', onclick: () => post('check', {}, 'research.check') }, `Check ${open} Date${open === 1 ? '' : 's'} (about ${money(open * (g.check_each || 0.012))})`) : null,
        h('div', { class: 'rs-next-title' }, `${open ? 3 : 2}. Done`),
        h('button', { type: 'button', class: 'btn-primary btn-block', onclick: () => post('close', {}, 'research.done') }, 'Done: Show What I Have'));
    }

    // ---------- screen 2: who it found ----------
    // `$old` = the screen is already up and only refreshes itself (while the search runs): no blank flash.
    async function whoView(id, $old) {
      const $body = $old || h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Opening…'));
      if (!$old) render(h('div', { class: 'screen stack qscreen rs-screen' }, pageTop('Who It Found', '#/research'), $body));
      let g;
      try { g = await api(`/api/research/${id}`); } catch (err) { fail($body, err); return; }
      const again = () => { if (location.hash === `#/research?id=${id}&view=who` && $body.isConnected) whoView(id, $body); };
      const [one, many] = noun(g);
      const $show = h('button', { type: 'button', class: 'btn-primary btn-block' });
      const onCount = () => g.people.filter((p) => p.on).length + g.vault.filter((v) => v.on).length;
      const label = () => { $show.textContent = `Show Charts and Patterns (${onCount()})`; };
      let saving = Promise.resolve();
      const store = () => { saving = saving.then(() => send(`/api/research/${id}/off`, 'PUT', { p: g.people.filter((p) => !p.on).map((p) => p.ref), v: g.vault.filter((v) => !v.on).map((v) => v.id) })).catch((err) => toast(`The tick was not kept: ${err.message}`, true)); return saving; };
      const row = (item, title, lines, marks) => {
        const $box = h('input', { type: 'checkbox', ...(item.on ? { checked: '' } : {}) });
        $box.checked = !!item.on;
        const $row = h('label', { class: 'rs-row' + (item.on ? '' : ' off') }, $box,
          h('span', { class: 'rs-rowtext' }, h('b', {}, title), ...lines.filter(Boolean).map((t) => h('span', { class: 'muted small' }, t)),
            marks.length ? h('span', { class: 'rs-marks' }, ...marks) : null));
        $box.onchange = () => { item.on = $box.checked; $row.classList.toggle('off', !item.on); count('research.tick'); label(); store(); };
        return $row;
      };
      const mark = (text, cls = '') => h('span', { class: `rs-mark ${cls}` }, text);
      const personRow = (p) => row(p, p.known_as, [
        [p.birth_name && p.birth_name !== p.known_as ? p.birth_name : '', longDate(p.birth_date) || 'date not found'].filter(Boolean).join(' · '),
        p.name_now ? `Name now: ${p.name_now}` : '', p.why || p.who,
        p.member_source ? `Found on ${p.member_source.site}` : p.date_source ? `Found on ${p.date_source.site}` : '',
      ], [
        p.vault ? mark('In Your Vault', 'ok') : null,
        !p.drawable ? mark('No Date: Cannot Be Counted', 'warn') : !p.checked && !p.fixed ? mark(p.check_failed ? 'No Page Found for the Date' : 'Date Not Confirmed', 'warn') : p.was ? mark('Date Corrected', 'ok') : p.confirmed_later ? mark('Date Confirmed', 'ok') : null,
        p.fixed ? mark('Fixed by You') : null,
      ].filter(Boolean));
      label();
      $show.onclick = async () => { count('research.show'); $show.disabled = true; await store(); swap(`#/research?id=${id}`); };
      const unchecked = g.people.filter((p) => p.drawable && !p.checked && !p.fixed).length;
      const top = window.scrollY;
      fill($body, statusCard(g, id, again),
        g.status === 'running' && !g.people.length ? null : h('div', { class: 'card stack' }, h('div', { class: 'simname' }, g.category),
          h('p', { class: 'muted', style: 'margin:0' }, `${plural(g.people.length, one, many)} found online${g.vault.length ? `, ${fmtN(g.vault.length)} more from your vault` : ''}. Untick anyone who does not belong, then show the charts.`),
          g.note ? h('p', { class: 'muted small', style: 'margin:0' }, g.note) : null,
          g.personal ? h('p', { class: 'lookup-warn small' }, `A personal category: only people who said it about themselves in public are listed, each with the page that says so.${g.dropped ? ` ${g.dropped} left out: no such page was found.` : ''}`) : null,
          unchecked ? h('p', { class: 'lookup-warn small' }, `${unchecked} marked Date Not Confirmed: the AI wrote the date from what it already knew, without opening a web page this time. Tap Check the Dates above, or tap a name on the next screen to fix it yourself.`) : null),
        g.people.length ? h('div', { class: 'summary rhead' }, 'Found Online') : g.status === 'running' ? null : h('p', { class: 'muted' }, 'Nobody was found. Go back and say it another way.'),
        g.people.length ? h('div', { class: 'card rs-list' }, ...g.people.map(personRow)) : null,
        g.vault.length ? h('div', { class: 'summary rhead' }, `From Your Vault: ${g.vault_kinds.join(', ')}`) : null,
        g.vault.length ? h('div', { class: 'card rs-list' }, ...g.vault.map((v) => row(v, v.title, [v.inputs ? '' : 'No name and date read yet: cannot be counted'], []))) : null,
        g.people.length ? h('div', { class: 'rs-foot' }, $show) : null);
      if (top) window.scrollTo(0, top); // a refresh while it searches keeps the place
    }

    // ---------- screen 3: the results ----------
    async function resultsView(id, $old) {
      const $body = $old || h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Counting every position…'));
      const $grid = h('div', { class: 'grid rs-grid' });
      const size = sizeControl('researchCols', { min: 1, max: window.innerWidth >= 700 ? 6 : 4, def: window.innerWidth >= 700 ? 5 : 3, countName: 'research.grid_size', apply: (c) => $grid.style.setProperty('--grid-cols', c) });
      if (!$old) render(h('div', { class: 'screen stack rs-screen' }, pageTop('Research a Group', '#/research'), $body));
      let g, s;
      try { [g, s] = await Promise.all([api(`/api/research/${id}`), api(`/api/research/${id}/shares`)]); } catch (err) { fail($body, err); return; }
      const [one, many] = noun(g);
      const on = g.people.filter((p) => p.on), vaultOn = g.vault.filter((v) => v.on);
      const hrefOf = (c) => (c.id ? `#/chart/${c.id}` : `#/research?id=${id}&p=${c.ref}`);

      // The charts: everyone ticked, drawn. A person the vault already has opens that chart.
      const cell = (label, href, inputs, badge, onclick) => h('a', { class: 'cell', href, onclick },
        h('div', { class: 'thumbwrap' }, inputs ? h('div', { class: 'thumb drawn', role: 'img', 'aria-label': label }, drawnChart(inputs)) : h('div', { class: 'nofile' }, 'no date found'),
          badge ? h('span', { class: `rs-badge ${badge[1]}` }, badge[0]) : null),
        h('div', { class: 'label' }, label));
      fill($grid,
        ...on.map((p) => cell(p.known_as, `#/research?id=${id}&p=${p.ref}`, p.chart_name ? inputsOf(p) : null, p.vault ? ['In Vault', 'ok'] : !p.drawable ? ['No Date', 'warn'] : !p.checked && !p.fixed ? ['Not Confirmed', 'warn'] : null, () => count('research.open_person'))),
        ...vaultOn.map((v) => cell(v.title, `#/chart/${v.id}`, v.inputs, ['In Vault', 'ok'], () => count('group.open_chart'))));

      // Save All: every ticked person found online that the vault does not have yet, one after the other.
      const unsaved = () => on.filter((p) => p.drawable && !p.vault);
      const $saveAll = h('button', { type: 'button', class: 'btn btn-block' });
      const saveLabel = () => { const n = unsaved().length; $saveAll.textContent = n ? `Save All ${n} to Vault` : 'Everyone Here Is in Your Vault'; $saveAll.disabled = !n; };
      $saveAll.onclick = async () => {
        const list = unsaved(); if (!list.length) return;
        count('research.save_all'); $saveAll.disabled = true;
        const $tmp = h('div', { class: 'rs-offscreen' }); document.body.append($tmp);
        let done = 0; const failed = [];
        for (const p of list) {
          $saveAll.textContent = `Saving ${done + 1} of ${list.length}…`;
          try { const svg = drawnChart(inputsOf(p)); fill($tmp, svg); const r = await saveChart(p.chart_name, p.birth_date, p.known_as, svg); p.vault = { id: r.id, title: p.known_as }; done++; }
          catch (err) { failed.push(`${p.known_as}: ${err.message}`); }
        }
        $tmp.remove();
        toast(failed.length ? `Saved ${done}. Not saved: ${failed.join('; ')}` : `Saved ${done} to the vault`, failed.length > 0);
        resultsView(id);
      };
      saveLabel();

      // Collapse and expand (owner 2026-11-23: one layout, short, no repeat): the counted insights are cards; the
      // reading (paid, written once for this group, kept) puts one line of the course's words on each card and
      // three to five lines that weave them. A changed group offers Write It Again.
      const ins = s.insights || { expand: [], collapse: [] };
      const cost = g.summary_cost ? `about ${money(g.summary_cost.usd)}` : 'a few cents';
      const $expand = h('div', { class: 'stack' }), $collapse = h('div', { class: 'stack' }), $read = h('div', { class: 'card stack rs-read' });
      const card = (i, note) => h('div', { class: 'card ins' },
        h('div', { class: 'ins-top' }, h('span', { class: 'ins-big' }, i.big),
          h('div', { class: 'ins-headbox' }, h('div', { class: 'ins-head' }, i.head), i.lean ? h('span', { class: 'ins-lean' }, 'Slight Lean') : null,
            h('div', { class: 'ins-count' }, h('b', {}, i.count), i.usual !== null && i.usual !== undefined ? h('span', { class: 'muted' }, ` · usually ${i.usual} in 100`) : null))),
        note ? h('p', { class: 'ins-note' }, note.line) : null,
        ...String(i.detail || '').split(' · ').filter(Boolean).map((d) => h('div', { class: 'muted small' }, d)),
        h('details', { class: 'ins-who', ontoggle: (e) => { if (e.target.open) count('research.insight_who'); } }, h('summary', {}, `Who (${i.people.length})`),
          h('div', { class: 'simpills' }, ...i.people.map((c) => h('a', { class: 'simpill', href: hrefOf(c) }, c.title || 'No name')))));
      const drawReading = (sm, pending) => {
        const stale = sm && sm.key !== s.key;
        const notes = new Map(((sm && !stale && sm.notes) || []).map((x) => [x.key, x]));
        fill($expand, ...ins.expand.map((i) => card(i, notes.get(i.key))), ins.expand.length ? null : h('p', { class: 'muted', style: 'margin:0' }, 'No number fills these charts more than usual yet.'));
        fill($collapse, ...ins.collapse.map((i) => card(i, notes.get(i.key))), ins.collapse.length ? null : h('p', { class: 'muted', style: 'margin:0' }, 'No single place in the chart stands out yet.'));
        const write = (again) => async () => {
          if (again) count('research.summary_again');
          drawReading(sm, true);
          // A dropped connection asks again by itself: free, the server hands back the one being written or stored.
          let r = null, err = null;
          for (let tries = 0; tries < 4 && !r; tries++) {
            try { r = await send(`/api/research/${id}/summary`, 'POST', { again: again && tries === 0 }); err = null; }
            catch (e) { err = e; if (!(e instanceof TypeError)) break; await new Promise((ok) => setTimeout(ok, 4000)); }
          }
          if (r) { drawReading(r.summary, false); if (r.warning) toast(r.warning.text, true); }
          else fill($read, h('b', {}, 'Reading'), h('p', { class: 'err', style: 'margin:0' }, err instanceof TypeError ? 'The connection dropped. Tap Try Again: if the reading was already written, it is free.' : err.message), h('button', { type: 'button', class: 'btn btn-block', onclick: write(again) }, `Try Again (${cost})`));
        };
        const any = ins.expand.length + ins.collapse.length > 0;
        fill($read, h('b', {}, 'Reading'),
          pending ? h('p', { class: 'muted', style: 'margin:0' }, 'Writing the reading… about 20 seconds.') : null,
          !pending && !any ? h('p', { class: 'muted', style: 'margin:0' }, 'Nothing leads in this group yet, so there is nothing to read. Nothing was spent. More charts will show more.') : null,
          !pending && any && (!sm || (!stale && !(sm.lines || []).length)) ? h('button', { type: 'button', class: 'btn btn-block', onclick: write(!!sm) }, `Write the Reading (${cost})`) : null,
          !pending && sm && !stale && sm.lines && sm.lines.length ? h('ul', { class: 'rs-lines' }, ...sm.lines.map((l) => h('li', {}, l))) : null,
          !pending && stale && any ? h('p', { class: 'muted small', style: 'margin:0' }, 'The group has changed since the reading was written.') : null,
          !pending && sm && any && (stale || (sm.lines && sm.lines.length)) ? h('button', { type: 'button', class: 'btn btn-block rs-again', onclick: write(true) }, stale ? `Write the Reading for This Group (${cost})` : `Write It Again (${cost})`) : null);
        return write;
      };
      // The first time a group is shown the reading is written by itself (free while the server is already writing it).
      const write = drawReading(g.summary, false);
      if (!g.summary && s.size >= 3 && g.status !== 'running' && g.status !== 'checking' && ins.expand.length + ins.collapse.length) write(false)();

      const left = [s.undated ? `${plural(s.undated, one, many)} without a full date cannot be counted` : '', s.tagged - s.size - s.undated > 0 ? `${s.tagged - s.size - s.undated} left out: no name and date read yet, or the same person twice` : ''].filter(Boolean).join('; ');
      fill($body, statusCard(g, id, () => { if (location.hash === `#/research?id=${id}` && $body.isConnected) resultsView(id, $body); }, true),
        h('div', { class: 'card stack' }, h('div', { class: 'simname' }, g.category),
          h('p', { class: 'muted', style: 'margin:0' }, `${plural(s.size, one, many)} read: ${fmtN(s.online)} found online${s.from_vault ? `, ${fmtN(s.size - s.online)} from your vault` : ''}.${left ? ` ${left[0].toUpperCase()}${left.slice(1)}.` : ''}`),
          g.personal ? h('p', { class: 'muted small', style: 'margin:0' }, 'A personal category: only people who said it about themselves in public, each with the page that says so.') : null,
          h('a', { class: 'btn btn-block', href: `#/research?id=${id}&view=who`, onclick: () => count('research.change_who') }, `Change Who Is In (${on.length + vaultOn.length} of ${g.people.length + g.vault.length})`)),
        s.size >= 3 ? h('div', { class: 'summary rhead' }, 'Expand: The Whole Chart') : null,
        s.size >= 3 ? $expand : null,
        s.size >= 3 ? h('div', { class: 'summary rhead' }, 'Collapse: One Place in the Chart') : null,
        s.size >= 3 ? $collapse : null,
        s.size >= 3 ? $read : h('p', { class: 'muted' }, 'A group needs at least three with a name and a full date before anything can be said about it.'),
        h('div', { class: 'gridbar' }, h('div', { class: 'summary rhead' }, 'The Charts'), size.node), // the size control sits with its grid: the title fills the top row
        on.length + vaultOn.length ? $grid : h('p', { class: 'muted' }, 'Nobody is ticked. Tap Change Who Is In.'),
        on.length ? $saveAll : null,
        // Every position counted one by one against the vault: kept, folded away (owner 2026-11-23: "maybe that's useful in some cases").
        s.size >= 3 ? h('details', { class: 'rs-every', ontoggle: (e) => { if (e.target.open) count('research.every_position'); } }, h('summary', { class: 'btn btn-block' }, 'Every Position Counted'), h('div', { class: 'qscreen rs-finds' }, groupFinds(s, { chartHref: hrefOf }))) : null,
        h('div', { class: 'muted small' }, `The search cost ${money(g.usd)} · ${g.rounds} round${g.rounds === 1 ? '' : 's'}, ${g.searches} web search${g.searches === 1 ? '' : 'es'} · ${whenOf(g.at)}${g.stop && g.status === 'done' ? ` · ${g.stop}` : ''}`),
        g.status === 'done' && g.closed ? h('button', { type: 'button', class: 'btn btn-block', onclick: async () => { count('research.more'); try { await send(`/api/research/${id}/more`, 'POST', { reopen: true }); go(`#/research?id=${id}&view=who`); } catch (err) { toast(err.message, true); } } }, 'Find More or Check the Dates') : null,
        holdButton('Hold to Remove From Past Research', async () => {
          try { await api(`/api/research/${id}`, { method: 'DELETE' }); count('research.past_remove'); toast('Removed from Past Research'); swap('#/research'); } catch (err) { toast(err.message, true); }
        }));
    }

    // ---------- one person ----------
    async function personView(id, ref) {
      const $body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Opening…'));
      render(h('div', { class: 'screen stack qscreen rs-screen' }, pageTop('Research a Group', `#/research?id=${id}`), $body));
      let g;
      try { g = await api(`/api/research/${id}`); } catch (err) { fail($body, err); return; }
      const draw = () => {
        const p = g.people[ref];
        if (!p) { fill($body, h('p', { class: 'err' }, 'That person is not in this research.')); return; }
        const biz = p.kind === 'business';
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.birth_date || '');
        const box = (ph, value, attrs = {}) => h('input', { type: 'text', inputmode: 'numeric', placeholder: ph, autocomplete: 'off', value, ...attrs });
        const $name = h('input', { type: 'text', placeholder: biz ? 'Registered name' : 'Full birth name', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', value: p.chart_name || '' });
        const $day = box('day', m ? String(+m[3]) : '', { maxlength: 2 }), $month = box('month', m ? String(+m[2]) : '', { maxlength: 2 }), $year = box('year', m ? m[1] : '', { maxlength: 4 });
        const $chart = h('div', { class: 'nscope-box' });
        let now = false, svg = null;
        const inp = () => ({ day: $day.value, month: $month.value, year: $year.value, name: now ? p.name_now : $name.value });
        const paint = () => { svg = drawnChart(inp()); fill($chart, svg); };
        // Birth Name / Name Now (owner 2026-11-23): the birth name is the chart that counts; the changed name is one tap away.
        const $which = p.name_now ? h('div', { class: 'chips' }) : null;
        const chips = () => { if ($which) fill($which, ...[[false, 'Birth Name'], [true, 'Name Now']].map(([v, t]) => h('button', { type: 'button', class: 'chip' + (now === v ? ' active' : ' off'), onclick: () => { now = v; count('research.name_now'); chips(); paint(); $shown.textContent = now ? p.name_now : $name.value; saveText(); } }, t))); };
        const $shown = h('b', {}, p.chart_name || '');
        const $keep = h('button', { type: 'button', class: 'btn btn-block hidden' }, 'Keep This Fix');
        const dateIn = () => { const d = Number($day.value), mo = Number($month.value), y = Number($year.value); return !$day.value.trim() && !$month.value.trim() && !$year.value.trim() ? '' : d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 1000 ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null; };
        const changed = () => $name.value.trim() !== (p.chart_name || '') || dateIn() !== (p.birth_date || '');
        for (const el of [$name, $day, $month, $year]) el.addEventListener('input', () => { if (now) { now = false; chips(); } $shown.textContent = $name.value; paint(); $keep.classList.toggle('hidden', !changed()); });
        $keep.onclick = async () => {
          const date = dateIn();
          if (!$name.value.trim()) { toast('Type a name first.', true); return; }
          if (date === null) { toast('Fill in the whole date, or clear all three boxes.', true); return; }
          count('research.fix'); $keep.disabled = true;
          try { g = await send(`/api/research/${id}/person/${ref}`, 'PUT', { birth_name: $name.value.trim(), birth_date: date }); toast('Fix kept. The counts now use it.'); draw(); } catch (err) { toast(err.message, true); $keep.disabled = false; }
        };
        const $save = h('button', { type: 'button', class: 'btn-primary btn-block' });
        const saveText = () => { $save.textContent = now ? 'Save the Name Now Chart to Vault' : p.vault ? 'In Your Vault ✓ Open the Chart' : 'Save to Vault'; };
        $save.onclick = async () => {
          if (!now && p.vault) { go(`#/chart/${p.vault.id}?sheet=1`); return; }
          const name = (now ? p.name_now : $name.value).trim(), date = dateIn();
          if (!name) { toast('Type a name first.', true); return; }
          if (date === null) { toast('Fill in the whole date, or clear all three boxes to save the name only.', true); return; }
          count('research.save'); $save.disabled = true; $save.textContent = 'Saving…';
          try {
            const r = await saveChart(name, date, p.known_as, svg);
            toast(`Saved “${p.known_as}” to the vault`);
            if (!now) p.vault = { id: r.id, title: p.known_as };
            $save.disabled = false; saveText();
            go(`#/chart/${r.id}?sheet=1`);
          } catch (err) { toast(err.message, true); $save.disabled = false; saveText(); }
        };
        const $quick = h('button', { type: 'button', class: 'btn btn-block', onclick: () => { count('research.quick'); try { localStorage.setItem('quickDraft', JSON.stringify(inp())); } catch {} go('#/quick'); } }, 'Open in Quick Chart');
        const $in = h('button', { type: 'button', class: 'btn btn-block' }, p.on ? 'Take Out of This Group' : 'Put Back Into This Group');
        $in.onclick = async () => {
          count('research.tick'); p.on = !p.on;
          try { await send(`/api/research/${id}/off`, 'PUT', { p: g.people.filter((x) => !x.on).map((x) => x.ref), v: g.vault.filter((v) => !v.on).map((v) => v.id) }); toast(p.on ? 'Back in the group' : 'Taken out of the group'); draw(); } catch (err) { p.on = !p.on; toast(err.message, true); }
        };
        const src = (label, s) => (s ? h('div', {}, h('span', { class: 'muted small' }, `${label} `), h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.site)) : null);
        chips(); paint(); saveText();
        fill($body, h('div', { class: 'card stack lookup-card' },
          $chart, $which,
          h('div', {}, h('h2', { class: 'lookup-who' }, p.known_as), p.who ? h('div', { class: 'muted small' }, p.who) : null),
          h('div', { class: 'lookup-facts' },
            h('div', {}, h('span', { class: 'muted small' }, 'Chart drawn from '), $shown),
            h('div', {}, h('span', { class: 'muted small' }, biz ? 'Registered name ' : 'Birth name '), h('b', {}, p.birth_name || 'not found')),
            p.name_now ? h('div', {}, h('span', { class: 'muted small' }, 'Name now '), h('b', {}, p.name_now)) : null,
            h('div', {}, h('span', { class: 'muted small' }, biz ? 'Started ' : 'Born '), h('b', {}, longDate(p.birth_date) || 'date not found')),
            p.why ? h('div', {}, h('span', { class: 'muted small' }, `In ${g.category} because `), h('b', {}, p.why)) : null),
          p.name_now ? h('p', { class: 'muted small', style: 'margin:0' }, 'The patterns count the birth name. Name Now shows the chart of the name used today.') : null,
          !p.on ? h('p', { class: 'lookup-warn small' }, 'Taken out of this group: not counted in the patterns.') : null,
          !p.drawable ? h('p', { class: 'lookup-warn small' }, 'No full date was found, so this chart cannot be counted in the patterns. Type the date below if you know it.') : !p.checked && !p.fixed ? h('p', { class: 'lookup-warn small' }, p.check_failed ? 'No web page was found that gives this date. It is what the AI already knew. Check it before you rely on it, or fix it below.' : 'Date not confirmed: the AI wrote it from what it already knew, without opening a web page this time. Check the Dates (on the list screen) looks it up.') : null,
          p.was ? h('p', { class: 'muted small', style: 'margin:0' }, `Corrected by Check the Dates.${p.was.birth_date ? ` The search first said ${longDate(p.was.birth_date) || p.was.birth_date}.` : ''}${p.was.birth_name ? ` The birth name was first given as ${p.was.birth_name}.` : ''}`) : null,
          p.fixed ? h('div', { class: 'muted small' }, 'The name or date was fixed by you.') : null,
          src('They belong, found on', p.member_source), src('Name found on', p.name_source), src('Date found on', p.date_source),
          h('div', { class: 'muted small' }, 'Wrong? Fix the name or date here; the chart redraws.'),
          h('div', { class: 'row lookup-fields' }, $day, $month, $year),
          h('div', { class: 'row lookup-fields' }, $name),
          $keep, $save, $quick, $in));
      };
      draw();
    }

    routes.research = function researchView(_, query) {
      count('screen.research');
      const q = query || new URLSearchParams();
      const id = Number(q.get('id'));
      if (!id) return askView(q);
      if (q.get('p') !== null && q.get('p') !== '') return personView(id, Number(q.get('p')));
      if (q.get('view') === 'who') return whoView(id);
      return resultsView(id);
    };
    return { USAGE_LABELS };
  }
  root.Research = { install };
})(typeof globalThis !== 'undefined' ? globalThis : this);
