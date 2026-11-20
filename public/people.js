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
    'people.events': 'Chart sheet → About: life events opened', 'people.source': 'Chart sheet → About: a source opened',
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

    // The chart sheet's card. Draws nothing at all for a chart with no researched person (friends, family, unknowns).
    function section(img) {
      const $root = h('div', { class: 'about stack hidden' });
      api(`/api/images/${img.id}/person`).then(({ person: p }) => {
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
          p.date_matches === false ? h('div', { class: 'anote warn' }, 'The birth date on this chart differs from the one the sources give. ', p.note || '') : p.note ? h('div', { class: 'anote' }, p.note) : null,
          h('div', { class: 'muted small asrc' }, p.checked && p.sources.length ? 'Read from: ' : 'From general knowledge, not looked up online yet.',
            ...p.sources.map((u, i) => h('a', { href: u, target: '_blank', rel: 'noopener noreferrer', onclick: () => count('people.source') }, (i ? ', ' : '') + host(u)))));
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
        h('p', { class: 'muted small', style: 'margin:0' }, 'Tap a kind for its charts, then "What This Group Shares" for the numbers they have in common. The count is people, not charts.'),
        ...block('What They Do', k.fields), ...block('What Happened in Their Life', k.flags), ...block('How They Died', k.deaths), ...block('Not a Person', k.kinds.filter((x) => x.who !== 'kind:person')));
    };

    const homeButton = () => h('a', { class: 'btn', href: '#/people', onclick: () => count('home.people') }, h('span', { class: 'qicon' }, '☺'), 'Kinds of People', h('span', { class: 'sub' }, 'by career and life'));
    USAGE_LABELS['home.people'] = 'Home → Kinds of People';
    return { section, filters, label, homeButton, USAGE_LABELS };
  }
  root.People = { install };
})(typeof globalThis !== 'undefined' ? globalThis : this);
