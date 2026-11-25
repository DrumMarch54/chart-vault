/* Who each person is (owner 2026-11-20): researched facts about the person behind a chart. Three places:
   - the chart sheet's "About" card (section(img)): one sentence, what they do, what happened in their life,
     each a pill that opens every chart of that kind; the turning points by year; where it was read;
   - Kinds of People (#/people): every kind the vault holds with its count, tap one for its charts;
   - the chart list narrowed to a kind (#/?who=field:music): filters(who) draws its chips.
   The facts live on the server (server/people.js, server/chart-people.json). No AI call from here.
   app.js hands over its plumbing through People.install, like reading.js and archetypes.js. */
(function (root) {
  'use strict';
  const USAGE_LABELS = {
    'screen.people': 'Kinds of People', 'people.kind': 'Kinds of People: a kind opened', 'people.pill': 'Chart sheet → About: a kind opened',
    'people.events': 'Chart sheet → About: life events opened', 'people.photo': 'Chart sheet: the photo opened or closed', 'people.to_check': 'Kinds of People → About Cards to Check', 'people.source': 'Chart sheet → About: a source opened',
  };

  function install(A) {
    const { h, fill, api, count, go, render, pageTop, fmtN } = A;
    // The words for a kind ("field:music" -> "Musicians"), learned from every answer that carries them.
    const labels = new Map();
    const learn = (list) => { for (const x of list || []) labels.set(x.who, x.label); };
    const label = (who) => labels.get(who) || String(who).split(':').pop().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    let kindsP = null;
    const loadKinds = () => kindsP || (kindsP = api('/api/people/kinds').then((k) => { learn(k.fields); learn(k.flags); learn(k.kinds); learn(k.deaths); return k; }).catch((e) => { kindsP = null; throw e; }));
    const listHash = (who) => '#/?' + new URLSearchParams([].concat(who).map((w) => ['who', w]));
    const year = (d) => (d ? String(d).slice(0, 4) : '');
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const nice = (iso) => { const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(iso || ''); return m ? [m[3] ? Number(m[3]) : null, m[2] ? MON[Number(m[2]) - 1] : null, m[1]].filter(Boolean).join(' ') : ''; };
    const chartDate = (i) => (i && i.year ? nice(`${i.year}-${String(i.month).padStart(2, '0')}-${String(i.day).padStart(2, '0')}`) : '');
    const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'source'; } };

    // The chips over a list narrowed to a kind: × on the last one goes home, on any other drops just that one.
    function filters(who) {
      const $f = h('div', { class: 'filters' }, ...who.map((w, i) => {
        const rest = who.filter((_, j) => j !== i);
        return h('span', { class: 'chip who', title: '× to remove' }, h('span', { class: 't' }, label(w)),
          h('button', { type: 'button', class: 'x', 'aria-label': `Remove ${label(w)}`, onclick: () => go(rest.length ? listHash(rest) : '#/people') }, '×'));
      }));
      if (who.some((w) => !labels.has(w))) loadKinds().then(() => { $f.querySelectorAll('.t').forEach((el, i) => { el.textContent = label(who[i]); }); }).catch(() => {});
      return $f;
    }

    // One request per chart for the person, shared by the photo beside the name and the About card.
    const personP = new Map();
    const personOf = (img) => {
      const key = `${img.id}:${img.title || ''}`;
      if (!personP.has(key)) personP.set(key, api(`/api/images/${img.id}/person`).then((r) => r.person).catch((e) => { personP.delete(key); throw e; }));
      return personP.get(key);
    };
    const creditLine = (ph) => h('div', { class: 'muted small pcredit' }, 'Photo: ', ph.credit ? `${ph.credit} · ` : '',
      ph.license_url ? h('a', { href: ph.license_url, target: '_blank', rel: 'noopener noreferrer' }, ph.license) : ph.license, ' · ',
      h('a', { href: ph.page, target: '_blank', rel: 'noopener noreferrer' }, 'Wikimedia Commons'));

    // The person's photo at the top of the chart sheet (owner 2026-11-25): a small square beside the name, tap it for
    // the whole picture with who took it under it, tap again to close. Returns [thumb slot, big view]; both stay empty
    // for a chart with no photo, and a photo that fails to load takes itself away.
    function photo(img) {
      const $thumb = h('button', { type: 'button', class: 'pthumb hidden', 'aria-label': 'Show the photo' });
      const $big = h('div', { class: 'pbig hidden' });
      personOf(img).then((p) => {
        const ph = p && p.photo;
        if (!ph) return;
        const gone = () => { $thumb.remove(); $big.remove(); };
        const $img = h('img', { src: ph.url, alt: p.title || 'Photo', decoding: 'async' }); // never lazy: it loads while hidden
        $img.onerror = gone;
        $img.onload = () => $thumb.classList.remove('hidden');
        fill($thumb, $img);
        let drawn = false;
        $thumb.onclick = () => {
          count('people.photo');
          if (!drawn) { fill($big, h('img', { src: ph.url, alt: p.title || 'Photo', onclick: () => $thumb.click() }), creditLine(ph)); drawn = true; }
          const open = $big.classList.toggle('hidden') === false;
          $thumb.classList.toggle('on', open); $thumb.setAttribute('aria-label', open ? 'Hide the photo' : 'Show the photo');
        };
      }).catch(() => {});
      return [$thumb, $big];
    }

    // The chart sheet's card. Draws nothing at all for a chart with no researched person (friends, family, unknowns).
    function section(img) {
      const $root = h('div', { class: 'about stack hidden' });
      personOf(img).then((p) => {
        if (!p) return;
        learn(p.field_names.map((f) => ({ who: `field:${f.value}`, label: f.label }))); learn(p.flag_names.map((f) => ({ who: `flag:${f.value}`, label: f.label })));
        const pill = (who, cls) => h('a', { class: `apill ${cls}`, href: listHash(who), onclick: () => count('people.pill') }, label(who));
        const life = [p.born ? `Born ${year(p.born)}` : null, p.died ? `died ${year(p.died)}${p.age_at_death ? ` at ${p.age_at_death}` : ''}${p.death_name ? ` (${p.death_name.toLowerCase()})` : ''}` : null, p.country].filter(Boolean).join(' · ');
        const $events = h('div', { class: 'aevents hidden' }, ...p.events.map((e) => h('div', { class: 'aevent' }, h('b', {}, e.year || ''), h('span', {}, e.what))));
        const $more = p.events.length ? h('button', { type: 'button', class: 'linkbtn', onclick: () => { count('people.events'); $events.classList.toggle('hidden'); $more.textContent = $events.classList.contains('hidden') ? `Life Events (${p.events.length})` : 'Hide Life Events'; } }, `Life Events (${p.events.length})`) : null;
        fill($root,
          h('div', { class: 'row', style: 'justify-content:space-between;align-items:baseline' }, h('b', {}, 'About'), h('span', { class: 'muted small' }, life)),
          p.summary ? h('div', { class: 'asum' }, p.summary) : null,
          p.roles.length ? h('div', { class: 'muted small' }, p.roles.join(' · ')) : null,
          p.field_names.length || p.flag_names.length ? h('div', { class: 'apills' }, ...p.field_names.map((f) => pill(`field:${f.value}`, 'field')), ...p.flag_names.map((f) => pill(`flag:${f.value}`, 'flag'))) : null,
          $more, $events,
          // What this card rests on, said plainly (owner 2026-11-20): looked up online or from memory, the two birth dates
          // side by side when they differ (the chart always keeps the owner's), and any doubt as "Worth checking".
          p.date_matches === false ? h('div', { class: 'anote warn' }, h('b', {}, 'Birth date differs. '),
            `Your chart: ${chartDate(img.inputs) || 'no date'}. Online: ${nice(p.born) || 'a different date'}. Your chart keeps your date; nothing was changed.`) : null,
          p.note ? h('div', { class: 'anote' }, h('b', {}, 'Worth checking: '), p.note) : null,
          h('div', { class: `abadge ${p.checked ? 'ok' : 'mem'}` }, p.checked ? 'Looked up online' : 'From memory: not looked up online yet, may be out of date'),
          p.sources.length ? h('div', { class: 'muted small asrc' }, 'Read from: ', ...p.sources.map((u, i) => h('a', { href: u, target: '_blank', rel: 'noopener noreferrer', onclick: () => count('people.source') }, (i ? ', ' : '') + host(u)))) : null,
          p.photo ? creditLine(p.photo) : null,
          h('div', { class: 'muted small' }, 'These facts are the app\'s research, kept apart from your chart. Your names, dates and tags are never changed by it.'));
        $root.classList.remove('hidden');
      }).catch(() => {});
      return $root;
    }

    // Kinds of People: what they do, what happened in their lives, how they died; each row = that kind's charts.
    A.routes.people = async function peopleView() {
      const $body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Loading…'));
      render(h('div', { class: 'screen stack qscreen' }, pageTop('Kinds of People', '#/'), $body));
      let k;
      try { k = await loadKinds(); } catch (err) { fill($body, h('p', { class: 'err' }, err.message)); return; }
      const row = (x) => h('a', { class: 'krow', href: listHash(x.who), onclick: () => count('people.kind') },
        h('span', { class: 'kl' }, x.label), h('span', { class: 'kn' }, `${fmtN(x.people)}`), h('span', { class: 'kchev' }, '›'));
      const block = (title, list) => (list.length ? [h('div', { class: 'summary rhead' }, title), h('div', { class: 'klist' }, ...list.map(row))] : []);
      if (!k.people) { fill($body, h('p', { class: 'muted' }, 'Nobody has been looked up yet.')); return; }
      fill($body,
        h('p', { class: 'muted', style: 'margin:0' }, `${fmtN(k.with_charts)} people and groups in the vault have been looked up (${fmtN(k.charts_known)} charts). ${fmtN(k.charts_unknown)} charts have nobody known behind them: friends, family and names nothing was found for.`),
        h('a', { class: 'btn btn-block', href: '#/peoplecheck', onclick: () => count('people.to_check') }, 'About Cards to Check'),
        h('p', { class: 'muted small', style: 'margin:0' }, 'Tap a kind for its charts, then "What This Group Shares" for the numbers they have in common. The count is people, not charts.'),
        ...block('What They Do', k.fields), ...block('What Happened in Their Life', k.flags), ...block('How They Died', k.deaths), ...block('Not a Person', k.kinds.filter((x) => x.who !== 'kind:person')));
    };

    // About Cards to Check: every card that is not settled, so the owner can go through them one by one.
    A.routes.peoplecheck = async function peopleCheckView() {
      const $body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Loading…'));
      render(h('div', { class: 'screen stack qscreen' }, pageTop('About Cards to Check', '#/people'), $body));
      let c;
      try { c = await api('/api/people/check'); } catch (err) { fill($body, h('p', { class: 'err' }, err.message)); return; }
      const row = (x, why) => h('a', { class: 'krow tall', href: `#/chart/${x.image_id}`, onclick: () => count('people.check_open') },
        h('span', { class: 'kl' }, x.title, why ? h('span', { class: 'kwhy' }, why) : null), h('span', { class: 'kchev' }, '›'));
      const block = (title, sub, list, why) => (list.length ? [h('div', { class: 'summary rhead' }, `${title} (${list.length})`), h('p', { class: 'muted small', style: 'margin:0' }, sub), h('div', { class: 'klist' }, ...list.map((x) => row(x, why(x))))] : []);
      let showMemory = false;
      const $mem = h('div', { class: 'stack' });
      const drawMem = () => fill($mem, ...(showMemory ? block('From Memory Only', 'Facts written without looking them up online. Mostly very famous people; recent news may be missing.', c.memory, () => '')
        : c.memory.length ? [h('button', { type: 'button', class: 'btn btn-block showall', onclick: () => { showMemory = true; drawMem(); } }, `Show the ${c.memory.length} From Memory Only`)] : []));
      drawMem();
      fill($body,
        h('p', { class: 'muted', style: 'margin:0' }, 'Tap one to open its chart; the About card says what is going on. Nothing here changed your charts.'),
        ...block('Birth Date Differs', 'The date online is not the date on your chart. Your chart keeps yours.', c.date, (x) => (x.born ? `Online: ${nice(x.born)}` : '')),
        ...block('Worth Checking', 'The research left a note: a doubt, a weak source, or something it could not confirm.', c.note, (x) => x.note || ''),
        $mem);
    };
    USAGE_LABELS['screen.peoplecheck'] = 'About Cards to Check'; USAGE_LABELS['people.check_open'] = 'About Cards to Check: a chart opened';

    const homeButton = () => h('a', { class: 'btn', href: '#/people', onclick: () => count('home.people') }, h('span', { class: 'qicon' }, '☺'), 'Kinds of People', h('span', { class: 'sub' }, 'by career and life'));
    USAGE_LABELS['home.people'] = 'Home → Kinds of People';
    return { section, photo, filters, label, homeButton, USAGE_LABELS };
  }
  root.People = { install };
})(typeof globalThis !== 'undefined' ? globalThis : this);
