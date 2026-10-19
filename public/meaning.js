/* What a number means where it sits. Tap a number on a drawn chart (the viewer, the Quick Chart) and this
   page opens: the course's words for that number in that position, whether it is balanced there, and a
   button to see every vault chart with the same number in the same spot. The server does the lookup
   (GET /api/meaning, server/meaning.js); nothing here guesses a meaning. app.js hands over its plumbing
   through Meaning.install. */
(function (root) {
  'use strict';
  function install({ h, fill, api, count, go, overlay, overlayGone, positionHash }) {
    const VERDICT = { balanced: ['Balanced here', 'ok'], semi: ['Semi-balanced here', 'mid'], unbalanced: ['Unbalanced here', 'err'] };
    const titleCase = (s) => String(s).replace(/(^|[\s(+])([a-z])/g, (m, pre, c) => pre + c.toUpperCase());
    // The passages are course text with a little markdown: bold marks and heading marks go, line breaks inside
    // a paragraph become spaces, blank lines split paragraphs.
    const clean = (t) => String(t).replace(/^\s*(?:#+\s*)?\*\*[^*\n]{1,80}\*\*\s*\n/, '').replace(/\*\*/g, '').replace(/(^|\n)#+\s*/g, '$1').replace(/[ \t]+\n/g, '\n');
    const paras = (text) => clean(text).split(/\n{2,}/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    const tail = (heading) => String(heading || '').split(' > ').pop().replace(/\*\*/g, '').replace(/[^\w\s/'’:().,+&-]/g, '').replace(/\s+/g, ' ').trim();
    const card = (p) => h('div', { class: 'mcard' }, h('div', { class: 'mfrom' }, [p.title, tail(p.heading)].filter(Boolean).join(' · ')), ...paras(p.text).map((t) => h('p', {}, t)));
    const label = (el, text) => h('div', { class: 'wlabel tl' }, text);

    function open({ chart, position, sum, parts }) {
      if (document.querySelector('.mpop')) return; // one at a time: a tap that reaches two listeners opens one page
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
      if (parts && parts.length === 2) q.set('parts', parts.join(','));
      api('/api/meaning?' + q).then((m) => {
        const where = titleCase(m.label);
        $title.textContent = `${m.text} in the ${where}`;
        $sub.textContent = [m.chartLabel, m.name].filter(Boolean).join(' · ');
        const v = VERDICT[m.verdict];
        const show = () => { count('meaning.show_charts'); close(); go(positionHash([{ pos: `${m.chart}.${m.position}`, num: String(m.sum) }])); };
        const none = !m.passages.length && !m.general.length;
        const $top = h('div', { class: 'row mtop' });
        fill($top, v ? h('span', { class: `mverdict ${v[1]}` }, v[0]) : null,
          m.count ? h('button', { type: 'button', class: 'mshow', onclick: show }, `${m.count} chart${m.count === 1 ? '' : 's'} with ${m.text} here ›`) : h('span', { class: 'muted small' }, `No chart in the vault has ${m.text} here.`));
        fill($body, $top,
          m.passages.length ? label(null, `${m.text} in the ${where}`) : null,
          ...m.passages.map(card),
          none ? h('p', { class: 'muted' }, `The course has no words yet for ${m.text} in this position.`) : null,
          m.general.length ? label(null, `About ${m.text} in general`) : null,
          ...m.general.map(card),
          m.combo && m.combo.passages.length ? label(null, `Made of ${m.combo.parts[0]} and ${m.combo.parts[1]}`) : null,
          ...(m.combo ? m.combo.passages.map(card) : []));
      }).catch((err) => fill($body, h('p', { class: 'err' }, err.message)));
    }
    // The position, number and parts a tapped number carries (data- attributes set by numeroscopeSvg in app.js).
    const fromEl = (el) => {
      const [chart, position] = String(el.getAttribute('data-pos') || '').split('.');
      const parts = String(el.getAttribute('data-parts') || '').split(',').map(Number).filter(Boolean);
      return { chart, position, sum: Number(el.getAttribute('data-num')), parts: parts.length === 2 ? parts : null };
    };
    return { open, fromEl };
  }
  root.Meaning = { install };
})(window);
