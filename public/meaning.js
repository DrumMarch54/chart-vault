/* What a number means where it sits. Tap a number on a drawn chart (the viewer, the Quick Chart) once and an
   outline goes round it; tap it again and this page opens: the course's words for that number in that position,
   whether it is balanced there, the name chart's words for the same spot on a sub-chart, the number it shares a center's circle with ("7 and 13/4 in the mind center"),
   the diamond behind it (diamonds are not drawn), and buttons to see every vault chart with the same number in
   the same spot. The server does the lookup (GET /api/meaning, server/meaning.js); nothing here guesses a
   meaning. app.js hands over its plumbing through Meaning.install. */
(function (root) {
  'use strict';
  function install({ h, fill, api, count, go, overlay, overlayGone, positionHash }) {
    const VERDICT = { balanced: ['Balanced here', 'ok'], semi: ['Semi-balanced here', 'mid'], unbalanced: ['Unbalanced here', 'err'] };
    const titleCase = (s) => String(s).replace(/(^|[\s(+])([a-z])/g, (m, pre, c) => pre + c.toUpperCase());
    // Course text with a little markdown: a leading bold title line, bold marks and heading marks go; line breaks
    // inside a paragraph become spaces; blank lines split paragraphs.
    const clean = (t) => String(t).replace(/^\s*(?:#+\s*)?\*\*[^*\n]{1,80}\*\*\s*\n/, '').replace(/\*\*/g, '').replace(/(^|\n)#+\s*/g, '$1').replace(/[ \t]+\n/g, '\n').replace(/(^|\n)\s*-{3,}\s*(?=\n|$)/g, '$1');
    const paras = (text) => clean(text).split(/\n{2,}/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    const tail = (heading) => String(heading || '').split(' > ').pop().replace(/\*\*/g, '').replace(/[^\w\s/'’:().,+&-]/g, '').replace(/\s+/g, ' ').trim();
    const card = (p) => h('div', { class: 'mcard' }, h('div', { class: 'mfrom' }, [p.title, tail(p.heading)].filter(Boolean).join(' · ')), ...paras(p.text).map((t) => h('p', {}, t)));
    const label = (text) => h('div', { class: 'wlabel tl' }, text);
    // A section: the short points first (knowledge/bits.json, the course's words shortened), the full course words
    // folded under "Course Words" (owner 2026-10-19). With no points yet, the course words show open.
    const pointsCard = (bits) => h('div', { class: 'mbits' }, ...bits.groups.map((g) => h('div', { class: 'mbits-g' },
      g.title ? h('div', { class: `mbits-t ${/out of balance|imbalance|unbalanced/i.test(g.title) ? 'err' : /in balance|balanced/i.test(g.title) ? 'ok' : ''}` }, g.title) : null,
      h('ul', {}, ...g.points.map((t) => h('li', {}, t))))));
    const section = (bits, passages) => {
      if (!bits) return passages.map(card);
      if (!passages.length) return [pointsCard(bits)];
      const $words = h('div', { class: 'mwords', hidden: true }, ...passages.map(card));
      const $btn = h('button', { type: 'button', class: 'mmore', 'aria-expanded': 'false', onclick: () => {
        $words.hidden = !$words.hidden; $btn.setAttribute('aria-expanded', String(!$words.hidden));
        $btn.textContent = `${$words.hidden ? '▸' : '▾'} Course Words (${passages.length})`;
        if (!$words.hidden) count('meaning.course_words');
      } }, `▸ Course Words (${passages.length})`);
      return [pointsCard(bits), $btn, $words];
    };
    const where = (m) => titleCase(m.label);

    function open({ chart, position, sum, pair, rel }) {
      if (document.querySelector('.mpop')) return; // one at a time
      const $title = h('h1', { class: 'mtitle' }, '…');
      const $sub = h('div', { class: 'muted small msub' }, '');
      const $body = h('div', {}, h('p', { class: 'muted' }, 'Reading the course…'));
      const close = () => { $pop.remove(); overlayGone($pop); document.body.classList.remove('noscroll'); window.removeEventListener('keydown', keys); };
      const keys = (e) => { if (e.key === 'Escape') close(); };
      const $pop = h('div', { class: 'wordpop mpop' },
        h('div', { class: 'pagetop' }, h('button', { type: 'button', class: 'btn iconbtn', 'aria-label': 'Close', onclick: close }, '‹'), h('div', { class: 'mhead' }, $title, $sub)),
        $body);
      overlay($pop); document.body.append($pop); document.body.classList.add('noscroll'); window.addEventListener('keydown', keys);
      const q = new URLSearchParams({ chart, position, sum: String(sum) });
      if (pair && pair.length) q.set('pair', pair.join(','));
      if (rel && rel.length) q.set('rel', rel.map((r) => `${r.position}:${r.sum}`).join(','));
      const showCharts = (m) => () => { count('meaning.show_charts'); close(); go(positionHash([{ pos: `${m.chart}.${m.position}`, num: String(m.sum) }])); };
      const top = (m) => {
        const v = VERDICT[m.verdict];
        const $row = h('div', { class: 'row mtop' });
        fill($row, v ? h('span', { class: `mverdict ${v[1]}` }, v[0]) : null,
          m.count ? h('button', { type: 'button', class: 'mshow', onclick: showCharts(m) }, `${m.count} chart${m.count === 1 ? '' : 's'} with ${m.text} here ›`) : h('span', { class: 'muted small' }, `No chart in the vault has ${m.text} here.`));
        return $row;
      };
      api('/api/meaning?' + q).then((m) => {
        $title.textContent = `${m.text} in the ${where(m)}`;
        $sub.textContent = [m.chartLabel, m.name].filter(Boolean).join(' · ');
        const p = m.pair, nc = m.nameChart;
        const others = p ? p.with.map((x) => x.text).join(' and ') : '';
        fill($body, top(m),
          label(`${m.text} in the ${m.chartLabel.replace(/ chart$/i, ' Chart')}'s ${where(m)}`),
          ...section(m.bits, m.passages),
          !m.passages.length && !m.bits ? h('p', { class: 'muted' }, `The course has no words yet for ${m.text} in this position.`) : null,
          nc ? label(`${nc.text} in the Name Chart's ${where(nc)}`) : null,
          ...(nc ? section(nc.bits, nc.passages) : []),
          p ? label(`${m.text} with ${others} in the ${where(m).replace(/ Extra Vibration$/, '')}`) : null,
          p && !p.passages.length && !p.bits ? h('p', { class: 'muted small' }, `The course has nothing yet on ${m.text} together with ${others}.`) : null,
          ...(p ? section(p.bits, p.passages) : []),
          ...m.related.flatMap((r) => [
            h('div', { class: 'mrel' }, h('div', { class: 'mrel-t' }, `${titleCase(r.label)} ${r.text}`), h('div', { class: 'muted small' }, [r.name, 'the diamond behind this number'].filter(Boolean).join(' · '))),
            top(r),
            ...section(r.bits, r.passages),
            !r.passages.length && !r.bits ? h('p', { class: 'muted small' }, `The course has no words yet for ${r.text} here.`) : null,
          ]));
      }).catch((err) => fill($body, h('p', { class: 'err' }, err.message)));
    }
    // What a tapped number carries (data- attributes set by numeroscopeSvg in app.js).
    const fromEl = (el) => {
      const [chart, position] = String(el.getAttribute('data-pos') || '').split('.');
      const pair = String(el.getAttribute('data-pair') || '').split(',').map(Number).filter(Boolean);
      const rel = String(el.getAttribute('data-rel') || '').split(',').filter(Boolean).map((x) => { const [p, n] = x.split(':'); return { position: p, sum: Number(n) }; });
      return { chart, position, sum: Number(el.getAttribute('data-num')), pair, rel };
    };
    return { open, fromEl };
  }
  root.Meaning = { install };
})(window);
