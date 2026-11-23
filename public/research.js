/* Research a Group (owner's ask 2026-11-23): say a category ("computer coders", "trans people", "coffee chains"),
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
    'screen.research': 'Research a Group', 'home.research': 'Research a Group (home)', 'research.mic': 'Research: speak a category',
    'research.search': 'Research: search the web', 'research.more': 'Research: keep going or search for more', 'research.past_open': 'Research: open a past research',
    'research.past_remove': 'Research: remove a past research', 'research.tick': 'Research: tick or untick someone', 'research.show': 'Research: Show Charts and Patterns',
    'research.change_who': 'Research: Change Who Is In', 'research.open_person': 'Research: open a person', 'research.name_now': 'Research: Birth Name or Name Now',
    'research.fix': 'Research: keep a fixed name or date', 'research.save': 'Research: Save to Vault', 'research.save_all': 'Research: Save All to Vault',
    'research.summary_again': 'Research: write the summary again', 'research.quick': 'Research: open in Quick Chart', 'research.grid_size': 'Research: chart size',
  };

  function install(A) {
    const { routes, h, fill, api, toast, count, go, swap, render, pageTop, drawnChart, chartPng, holdButton, sizeControl, groupFinds, fmtN } = A;
    const SR = root.SpeechRecognition || root.webkitSpeechRecognition;
    const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const money = (usd) => { const c = Math.round(usd * 100); return usd < 0.005 ? 'under a cent' : c === 1 ? '1 cent' : usd < 1 ? `${c} cents` : `$${usd.toFixed(2)}`; };
    const longDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${MON[+m[2] - 1]} ${+m[3]}, ${m[1]}` : ''; };
    const whenOf = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
    const send = (url, method, body) => api(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
    const inputsOf = (p, name) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.birth_date || ''); return { name: name || p.chart_name || '', day: m ? +m[3] : '', month: m ? +m[2] : '', year: m ? +m[1] : '' }; };
    const plural = (n, one, many) => `${fmtN(n)} ${n === 1 ? one : many}`;
    const noun = (g) => (g.people.length && g.people.every((p) => p.kind === 'business') ? ['business', 'businesses'] : ['person', 'people']);
    // The summary as it comes from the model: paragraphs, bullets, **bold**. Built as elements, never as HTML.
    const inline = (s) => s.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) => (part.startsWith('**') && part.endsWith('**') ? h('b', {}, part.slice(2, -2)) : document.createTextNode(part)));
    function richText(text) {
      const out = []; let list = null;
      for (const raw of String(text || '').split('\n')) {
        const line = raw.trim();
        const b = /^[-*•]\s+(.*)$/.exec(line);
        if (b) { if (!list) { list = h('ul', { class: 'rd-list' }); out.push(list); } list.append(h('li', {}, ...inline(b[1]))); continue; }
        list = null;
        if (line) out.push(h('p', {}, ...inline(line.replace(/^#+\s*/, ''))));
      }
      return h('div', { class: 'rd-text' }, ...out);
    }
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
      const $hint = h('div', { class: 'muted small lookup-hint' }, SR ? 'Tap the microphone and say a kind of person or business: "computer coders", "coffee chains".' : 'Type a kind of person or business: "computer coders", "coffee chains".');
      let busy = false, rec = null, listening = false;
      const $mic = h('button', { type: 'button', class: 'lookup-mic', 'aria-label': 'Speak a category' }, '🎙');
      const stopMic = () => { listening = false; $mic.classList.remove('on'); try { rec && rec.stop(); } catch {} };
      $mic.onclick = () => {
        if (!SR) { $q.focus(); return; }
        if (listening) { stopMic(); return; }
        count('research.mic');
        rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
        rec.onresult = (e) => { $q.value = Array.from(e.results).map((r) => r[0].transcript).join(' ').trim(); };
        rec.onerror = (e) => { listening = false; $mic.classList.remove('on'); $hint.textContent = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'The microphone is blocked for this app. Allow it in the phone\'s settings for this site, or type instead.' : e.error === 'no-speech' ? 'Nothing heard. Tap the microphone and try again.' : `The microphone stopped (${e.error}). Tap it to try again, or type instead.`; };
        // A paid search never starts by itself: the words land in the box and the owner taps Search.
        rec.onend = () => { const was = listening; listening = false; $mic.classList.remove('on'); if (was && $q.value) $hint.textContent = 'Check the words, then tap Search.'; };
        try { rec.start(); listening = true; $mic.classList.add('on'); $hint.textContent = 'Listening… say the category.'; } catch { $hint.textContent = 'The microphone could not start. Tap it again, or type instead.'; }
      };
      // The search runs on the server; this only starts it and opens the screen that watches it.
      const run = async () => {
        const q = $q.value.trim();
        if (!q) { toast('Say or type a category first.', true); $q.focus(); return; }
        if (busy) return;
        if (listening) stopMic();
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
        h('div', { class: 'lookup-top' }, $mic, $hint),
        $q, $go, $cost,
        h('p', { class: 'muted small', style: 'margin:0' }, 'It finds as many well-known examples as it can, with their birth name and birth date (a business: its registered name and start date), draws every chart and counts what the group shares against your whole vault. Only public figures; nothing is saved until you tap Save to Vault.'),
        $out, $past));
      api('/api/ai/settings').then((s) => { if (!s.key_set) fill($out, h('div', { class: 'card stack' }, h('p', { class: 'muted', style: 'margin:0' }, 'Add the AI key first.'), h('a', { class: 'btn btn-block', href: '#/ai' }, 'AI Reading Settings'))); }).catch(() => {});
      pastList();
    }

    // How the search is going (it runs on the server): shown on top of Who It Found and of the results. While it
    // runs the screen asks again every few seconds; `redraw` is called when the state changes. Paused = it would
    // pass the money limit: the owner taps Keep Going or leaves it there.
    let watch = 0;
    function statusCard(g, id, redraw) {
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
      return null;
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
        !p.drawable ? mark('No Date: Cannot Be Counted', 'warn') : !p.checked && !p.fixed ? mark('Not Checked Online', 'warn') : null,
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
          unchecked ? h('p', { class: 'lookup-warn small' }, `${unchecked} marked Not Checked Online: the date came from the AI's memory, not from a page it found. Tap the name on the next screen to check or fix it.`) : null),
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
        ...on.map((p) => cell(p.known_as, `#/research?id=${id}&p=${p.ref}`, p.chart_name ? inputsOf(p) : null, p.vault ? ['In Vault', 'ok'] : !p.drawable ? ['No Date', 'warn'] : !p.checked && !p.fixed ? ['Not Checked', 'warn'] : null, () => count('research.open_person'))),
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

      // The summary: written once for this group (paid), kept; a changed group offers Write Again.
      const $sum = h('div', { class: 'card stack rs-summary' });
      const cost = g.summary_cost ? `about ${money(g.summary_cost.usd)}` : 'a few cents';
      const drawSummary = (sm, pending) => {
        const stale = sm && sm.key !== s.key;
        const write = (again) => async () => {
          if (again) count('research.summary_again');
          drawSummary(sm, true);
          // A dropped connection asks again by itself: free, the server hands back the one being written or stored.
          let r = null, err = null;
          for (let tries = 0; tries < 4 && !r; tries++) {
            try { r = await send(`/api/research/${id}/summary`, 'POST', { again: again && tries === 0 }); err = null; }
            catch (e) { err = e; if (!(e instanceof TypeError)) break; await new Promise((ok) => setTimeout(ok, 4000)); }
          }
          if (r) { drawSummary(r.summary, false); if (r.warning) toast(r.warning.text, true); }
          else { fill($sum, h('b', {}, 'What Stands Out'), h('p', { class: 'err', style: 'margin:0' }, err instanceof TypeError ? 'The connection dropped. Tap Try Again: if the summary was already written, it is free.' : err.message), h('button', { type: 'button', class: 'btn btn-block', onclick: write(again) }, `Try Again (${cost})`)); }
        };
        fill($sum, h('b', {}, 'What Stands Out'),
          pending ? h('p', { class: 'muted', style: 'margin:0' }, 'Writing the summary from the finds and the course… about 20 seconds.') : null,
          !pending && !sm ? h('button', { type: 'button', class: 'btn btn-block', onclick: write(false) }, `Write the Summary (${cost})`) : null,
          !pending && sm && sm.none === 'luck' ? h('p', { class: 'muted', style: 'margin:0' }, 'Nothing in this group stands out beyond what luck alone gives, so there is nothing to write about. Nothing was spent. A bigger group may show more.') : null,
          !pending && sm && sm.none === 'small' ? h('p', { class: 'muted', style: 'margin:0' }, 'Fewer than three could be counted, so nothing can be said yet.') : null,
          !pending && sm && sm.text ? richText(sm.text) : null,
          !pending && sm && sm.text ? h('div', { class: 'muted small' }, `Written from the counted finds and the course's words only · it cost ${money(sm.usd || 0)}`) : null,
          !pending && stale ? h('p', { class: 'lookup-warn small' }, `This was written for a group of ${sm.size}. The group has changed since.`) : null,
          !pending && sm && (stale || sm.text) ? h('button', { type: 'button', class: 'btn btn-block', onclick: write(true) }, `Write It Again (${cost})`) : null);
        return write;
      };
      // The first time a group is shown, the summary is written by itself (it is what was asked for, and its cost
      // was on the Search button's screen); after that, only a tap writes one.
      const write = drawSummary(g.summary, false);
      if (!g.summary && s.size >= 3 && g.status !== 'running') write(false)(); // free while the server is already writing it: the same one comes back

      const left = [s.undated ? `${plural(s.undated, one, many)} without a full date cannot be counted` : '', s.tagged - s.size - s.undated > 0 ? `${s.tagged - s.size - s.undated} left out: no name and date read yet, or the same person twice` : ''].filter(Boolean).join('; ');
      fill($body, statusCard(g, id, () => { if (location.hash === `#/research?id=${id}` && $body.isConnected) resultsView(id, $body); }),
        h('div', { class: 'card stack' }, h('div', { class: 'simname' }, g.category),
          h('p', { class: 'muted', style: 'margin:0' }, `${plural(s.size, one, many)} counted: ${fmtN(s.online)} found online${s.from_vault ? `, ${fmtN(s.size - s.online)} from your vault` : ''}. Compared with the ${fmtN(s.rest)} others in your vault.${left ? ` ${left[0].toUpperCase()}${left.slice(1)}.` : ''}`),
          g.personal ? h('p', { class: 'muted small', style: 'margin:0' }, 'A personal category: only people who said it about themselves in public, each with the page that says so.') : null,
          h('a', { class: 'btn btn-block', href: `#/research?id=${id}&view=who`, onclick: () => count('research.change_who') }, `Change Who Is In (${on.length + vaultOn.length} of ${g.people.length + g.vault.length})`)),
        $sum,
        h('div', { class: 'gridbar' }, h('div', { class: 'summary rhead' }, 'The Charts'), size.node), // the size control sits with its grid: the title fills the top row
        on.length + vaultOn.length ? $grid : h('p', { class: 'muted' }, 'Nobody is ticked. Tap Change Who Is In.'),
        on.length ? $saveAll : null,
        s.size >= 3 ? h('div', { class: 'qscreen rs-finds' }, groupFinds(s, { chartHref: hrefOf })) : h('p', { class: 'muted' }, 'A group needs at least three with a name and a full date before anything can be said about it.'),
        h('div', { class: 'muted small' }, `The search cost ${money(g.usd)} · ${g.rounds} round${g.rounds === 1 ? '' : 's'}, ${g.searches} web search${g.searches === 1 ? '' : 'es'} · ${whenOf(g.at)}${g.stop && g.status === 'done' ? ` · ${g.stop}` : ''}`),
        g.status === 'done' ? h('button', { type: 'button', class: 'btn btn-block', onclick: async () => { count('research.more'); try { await send(`/api/research/${id}/more`, 'POST'); go(`#/research?id=${id}&view=who`); } catch (err) { toast(err.message, true); } } }, `Search for More (about ${g.cost ? money(g.cost.round_usd) : 'a few cents'} a round)`) : null,
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
          !p.drawable ? h('p', { class: 'lookup-warn small' }, 'No full date was found, so this chart cannot be counted in the patterns. Type the date below if you know it.') : !p.checked && !p.fixed ? h('p', { class: 'lookup-warn small' }, 'Not checked online: the date came from the AI\'s memory, not from a page it found. Check it before you rely on it.') : null,
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
