/* What a number means where it sits. Tap a number on a drawn chart (the viewer, the Quick Chart) once and an
   outline goes round it; tap it again and this page opens: the course's words for that number in that position,
   whether it is balanced there, the name chart's words for the same spot on a sub-chart, the number it shares a center's circle with ("7 and 13/4 in the mind center"),
   the diamond behind it (diamonds are not drawn), and buttons to see every vault chart with the same number in
   the same spot. The server does the lookup (GET /api/meaning, server/meaning.js); nothing here guesses a
   meaning. app.js hands over its plumbing through Meaning.install. */
(function (root) {
  'use strict';
  function install({ h, fill, api, count, go, overlay, overlayGone, positionHash }) {
    const VERDICT = { balanced: ['Balanced Here', 'ok'], semi: ['Semi-Balanced Here', 'mid'], unbalanced: ['Unbalanced Here', 'err'] };
    const titleCase = (s) => String(s).replace(/(^|[\s(+])([a-z])/g, (m, pre, c) => pre + c.toUpperCase());
    // Course text with a little markdown: a leading bold title line, bold marks and heading marks go; line breaks
    // inside a paragraph become spaces; blank lines split paragraphs.
    const clean = (t) => String(t).replace(/^\s*(?:#+\s*)?\*\*[^*\n]{1,80}\*\*\s*\n/, '').replace(/\*\*/g, '').replace(/(^|\n)#+\s*/g, '$1').replace(/[ \t]+\n/g, '\n').replace(/(^|\n)\s*-{3,}\s*(?=\n|$)/g, '$1');
    const paras = (text) => clean(text).split(/\n{2,}/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    const tail = (heading) => String(heading || '').split(' > ').pop().replace(/\*\*/g, '').replace(/[^\w\s/'’:().,+&-]/g, '').replace(/\s+/g, ' ').trim();
    // Where the words come from: the book's short name and its page(s) when the passage is from a course PDF with
    // page marks (knowledge/books.json), else the document's title. "Name Numeroscopes book · 7 in the Heart Center · p. 140".
    const pages = (p) => (!p.page ? '' : p.pageEnd && p.pageEnd !== p.page ? `pp. ${p.page}–${p.pageEnd}` : `p. ${p.page}`);
    const card = (p) => h('div', { class: 'mcard' }, h('div', { class: 'mfrom' }, [p.book || p.title, tail(p.heading), pages(p)].filter(Boolean).join(' · ')), ...paras(p.text).map((t) => h('p', {}, t)),
      p.source ? h('button', { type: 'button', class: 'mdocbtn', onclick: () => openDoc(p) }, 'Open the Document ›') : null);

    // "Open the Document" (owner 2026-11-07): the whole document a card's words come from, opened AT those words
    // (marked), with what is written above and below; Show Earlier / Show More read further (GET /api/knowledge/doc,
    // server/doc.js). One step in Back history, over the meaning page.
    const inline = (t) => String(t).replace(/<[^>]*>/g, '').split('**').map((part, i) => (i % 2 ? h('b', {}, part) : part)).filter((x) => x !== '');
    const docBlock = (b) => {
      if (b.heading) return h(`h${Math.min(b.heading + 1, 5)}`, { class: 'dblock dhead', 'data-n': b.n }, ...inline(b.text.replace(/^\*\*|\*\*$/g, '')));
      const lines = b.text.split('\n').map((l) => l.trim()).filter(Boolean);
      const items = lines.filter((l) => /^[-*•]\s+/.test(l));
      if (items.length && items.length === lines.length) return h('ul', { class: 'dblock', 'data-n': b.n }, ...items.map((l) => h('li', {}, ...inline(l.replace(/^[-*•]\s+/, '')))));
      return h('p', { class: 'dblock', 'data-n': b.n }, ...inline(lines.join(' ')));
    };
    function openDoc(p) {
      count('meaning.open_doc');
      const $body = h('div', { class: 'dbody' }, h('p', { class: 'muted' }, 'Opening the document…'));
      const $title = h('h1', { class: 'mtitle' }, p.book || p.title || 'Course Document');
      const close = () => { $pop.remove(); overlayGone($pop); };
      const $pop = h('div', { class: 'wordpop mpop docpop' },
        h('div', { class: 'pagetop' }, h('button', { type: 'button', class: 'btn iconbtn', 'aria-label': 'Close', onclick: close }, '‹'), h('div', { class: 'mhead' }, $title, h('div', { class: 'muted small msub' }, 'The words you were reading are marked in yellow.'))),
        $body);
      overlay($pop, close); document.body.append($pop);
      let from = 0, to = 0, total = 0;
      const $earlier = h('button', { type: 'button', class: 'btn btn-block dmore' }, '↑ Show Earlier');
      const $later = h('button', { type: 'button', class: 'btn btn-block dmore' }, 'Show More ↓');
      const $doc = h('div', { class: 'mcard ddoc' });
      const more = async (dir) => {
        const a = dir < 0 ? Math.max(0, from - 80) : to, b = dir < 0 ? from : to + 80;
        if (a >= b) return;
        const btn = dir < 0 ? $earlier : $later; btn.disabled = true;
        try {
          const w = await api('/api/knowledge/doc?' + new URLSearchParams({ source, from: a, to: b }));
          const nodes = w.blocks.map(docBlock);
          if (dir < 0) { const keep = $doc.firstChild; const y0 = keep ? keep.getBoundingClientRect().top : 0; $doc.prepend(...nodes); from = w.from; if (keep) $pop.scrollTop += keep.getBoundingClientRect().top - y0; }
          else { $doc.append(...nodes); to = w.to; }
        } catch (err) { toastErr(btn, err); }
        btn.disabled = false; showButtons();
      };
      const toastErr = (btn, err) => { btn.textContent = err.message; };
      const showButtons = () => { $earlier.hidden = from <= 0; $later.hidden = to >= total; };
      $earlier.onclick = () => more(-1); $later.onclick = () => more(1);
      // p.number (Year Rows, owner 2026-11-08): that number's own section in the number books.
      let source = p.source || '';
      const q = p.number ? { number: String(p.number) } : { source, text: String(p.text || '').slice(0, 600), heading: p.heading || '' };
      api('/api/knowledge/doc?' + new URLSearchParams(q)).then((w) => {
        source = w.source; from = w.from; to = w.to; total = w.total;
        if (w.book) $title.textContent = w.book;
        if (w.title && !p.book) $title.textContent = w.title;
        fill($doc, ...w.blocks.map(docBlock));
        fill($body, w.at === null || w.at === undefined ? h('p', { class: 'muted small' }, 'These words could not be found in the document, so it opens at the top.') : null, $earlier, $doc, $later);
        showButtons();
        if (w.at !== null && w.at !== undefined) {
          // the found block, and the paragraph under it when it is a heading line
          const hit = $doc.querySelector(`[data-n="${w.at}"]`);
          if (hit) {
            hit.classList.add('dhl');
            if (hit.classList.contains('dhead') && hit.nextElementSibling && !hit.nextElementSibling.classList.contains('dhead')) hit.nextElementSibling.classList.add('dhl');
            requestAnimationFrame(() => hit.scrollIntoView({ block: 'center' }));
          }
        }
      }).catch((err) => fill($body, h('p', { class: 'err' }, err.message)));
    }
    // A section: the short points first (knowledge/bits.json, the course's words shortened), the full course words
    // folded under "Course Words" (owner 2026-10-19). With no points yet, the course words show open.
    // "**words**" in a point = words that should stand out: shown bold (text nodes only, never HTML).
    const boldParts = (t) => String(t).split('**').map((part, i) => (i % 2 ? h('b', {}, part) : part)).filter((x) => x !== '');
    // A point written by hand from a book page carries its own citation (bits "cites": one per point): a small
    // "Essence book p. 47" tag at its end. The other points were written from the course words shown under
    // "Course Words": the card's foot names those books and pages, so every point can be checked in the book.
    // a book page ("Essence book p. 47") or the minute of a lecture ("Sub-chart Rules lecture at 8:07")
    const cite = (c) => (c && c.book ? h('span', { class: 'mcite' }, `${c.book}${c.page ? ` p. ${c.page}` : c.at ? ` at ${c.at.replace(/^0/, '')}` : ''}`) : null);
    const bookPages = (passages) => {
      const by = new Map(), docs = [];
      for (const p of passages) {
        if (p.book && p.page) { const r = by.get(p.book) || { a: p.page, b: p.pageEnd || p.page }; r.a = Math.min(r.a, p.page); r.b = Math.max(r.b, p.pageEnd || p.page); by.set(p.book, r); }
        else if (p.title && !docs.includes(p.title)) docs.push(p.title);
      }
      return [...[...by].map(([book, r]) => `${book} ${r.a === r.b ? `p. ${r.a}` : `pp. ${r.a}–${r.b}`}`), ...docs];
    };
    // The page's look (owner 2026-11-20, pick A of three samples, redone the same day after "one massive blob"):
    // Quick Gist chips on top, colored by balance; a one-line row of jump chips; then one PART per subject (this
    // spot, the name chart's same spot, the circle's pair, each diamond behind it), each with its OWN color: its
    // band, its jump chip's dot and its bullets match. Inside a part every point has the same shape (a colored dot,
    // the course's words, bold words bold, a line between points); In Balance / Out of Balance are solid green / red
    // strips, never text that looks like a point. A part with no words is one short row. Nothing is reworded.
    const kindOf = (title) => (/out of balance|imbalance|unbalanced/i.test(title || '') ? 'err' : /in balance|balanced/i.test(title || '') ? 'ok' : /^Only With/.test(title || '') ? 'other' : title ? 'topic' : '');
    const capFirst = (t) => t.replace(/^([^A-Za-z0-9]*)([a-z])/, (m, pre, c) => pre + c.toUpperCase());
    const point = (t, c) => h('div', { class: 'mpt' }, h('i', { class: 'mdot', 'aria-hidden': 'true' }),
      h('div', { class: 'mpt-x' }, ...boldParts(capFirst(String(t).trim())), c ? h('div', {}, cite(c)) : null));
    // Quick Gist: each point's first bold words as chips, green for In Balance, red for Out of Balance, plain when the
    // course does not split them. Side topics (a titled group like "Name Cleanse", "Only With …") stay out of it.
    const gist = (bits) => {
      if (!bits) return null;
      const rows = bits.groups.map((g) => {
        const k = kindOf(g.title);
        if (k === 'other' || k === 'topic') return null;
        const words = g.points.map((t) => (/\*\*([^*]+)\*\*/.exec(String(t)) || [])[1]).filter(Boolean).slice(0, 5).map((w) => capFirst(w.trim().replace(/[;:,.]+$/, '')));
        return words.length ? h('div', { class: `mgist-r ${k}` }, k ? h('div', { class: 'mgist-l' }, k === 'ok' ? 'In Balance' : 'Out of Balance') : null,
          h('ul', { class: 'mgist-w' }, ...words.map((w) => h('li', {}, w)))) : null;
      }).filter(Boolean);
      return rows.length ? h('div', { class: 'mgist' }, h('div', { class: 'mgist-t' }, 'Quick Gist'), ...rows) : null;
    };
    const part = ({ id, color, title, sub, bits, passages = [], pre = [], note }) => {
      const band = h('div', { class: 'mband' }, h('div', { class: 'mband-t' }, title), sub ? h('div', { class: 'mband-s' }, sub) : null);
      const extra = pre.filter(Boolean);
      if (!bits && !passages.length) {
        return h('section', { class: `mpart c-${color}`, id }, band,
          h('div', { class: 'mblk mempty' }, h('span', { class: 'muted' }, 'No course words yet.'), ...extra));
      }
      const own = bits && bits.groups.some((g) => g.cites && g.cites.some(Boolean));
      const from = bits && !own ? bookPages(passages) : [];
      const foot = [];
      if (from.length) foot.push(h('div', { class: 'mfoot-from' }, `From ${from.join(' · ')}`));
      if (bits && passages.length) {
        const $words = h('div', { class: 'mwords', hidden: true }, ...passages.map(card));
        const $btn = h('button', { type: 'button', class: 'mmore', 'aria-expanded': 'false', onclick: () => {
          $words.hidden = !$words.hidden; $btn.setAttribute('aria-expanded', String(!$words.hidden));
          $btn.textContent = `${$words.hidden ? 'Show' : 'Hide'} the Full Course Words (${passages.length})`;
          if (!$words.hidden) count('meaning.course_words');
        } }, `Show the Full Course Words (${passages.length})`);
        foot.push($btn, $words);
      } else if (passages.length) foot.push(...passages.map(card));
      return h('section', { class: `mpart c-${color}`, id }, band,
        extra.length ? h('div', { class: 'mblk mpre' }, ...extra) : null,
        note ? h('div', { class: 'mblk mnote' }, note) : null,
        ...(bits ? bits.groups.map((g) => {
          const k = kindOf(g.title);
          return h('div', { class: `mgrp ${k}` },
            g.title ? h('div', { class: 'mgrp-h' }, k === 'ok' ? 'In Balance' : k === 'err' ? 'Out of Balance' : titleCase(g.title)) : null,
            g.note ? h('div', { class: 'mblk mnote' }, g.note) : null,
            h('div', { class: 'mblk mpts' }, ...g.points.map((t, i) => point(t, g.cites && g.cites[i]))));
        }) : []),
        foot.length ? h('div', { class: 'mblk mfoot' }, ...foot) : null);
    };
    const where = (m) => titleCase(m.label);
    // A combination's points (owner 2026-11-07): the course writes "3 + 6 Combinations (and 12/3 + 6, 3 + 15/6, etc.)" as
    // one family, so some points are about one exact compound number. A point that names a compound this chart does NOT
    // have moves to its own group, titled with those numbers, so the family's words never pass for this chart's own.
    const COMPOUND = /\b(\d{1,2})\/(\d)\b/g;
    const pairSplit = (bits, own) => {
      if (!bits) return bits;
      const mine = new Set(own);
      const groups = [];
      for (const g of bits.groups) {
        const keep = { ...g, points: [], cites: g.cites ? [] : undefined }, other = { named: new Set(), points: [] };
        g.points.forEach((t, i) => {
          const named = [...String(t).matchAll(COMPOUND)].map((x) => x[0]).filter((x) => !mine.has(x));
          if (!named.length) { keep.points.push(t); if (keep.cites) keep.cites.push(g.cites[i]); return; }
          for (const x of named) other.named.add(x);
          other.points.push(t);
        });
        if (keep.points.length) groups.push(keep);
        if (other.points.length) {
          const n = [...other.named].sort((a, b) => parseInt(a) - parseInt(b));
          const list = n.length > 1 ? `${n.slice(0, -1).join(', ')} or ${n[n.length - 1]}` : n[0];
          groups.push({ title: `Only With ${list}`, note: `This chart has ${own.join(' and ')}, not ${list}. Each point says which numbers it is about; shown because the course writes them as one family.`, points: other.points });
        }
      }
      return { ...bits, groups };
    };

    // "12/3 with 15/6" for a 3 with a 6: the two-digit forms of the same digit sums, as the course's family headings name them.
    const pairExample = (m, p) => { const two = (t) => (/\//.test(t) ? t : `${Number(t) + 9}/${t}`); return `${two(m.text)} with ${p.with.map((x) => two(x.text)).join(' and ')}`; };
    // Ask About This (owner 2026-11-07): a question about this number in this spot, answered by the AI from the
    // course's words for it (POST /api/meaning/ask, server/spot-ask.js). Paid: the button says so. Answers stay on
    // the page while it is open, newest first.
    const answerParts = (text) => String(text).split(/\n{2,}/).map((t) => t.trim()).filter(Boolean).map((t) => (/^[-*•] /m.test(t)
      ? h('ul', {}, ...t.split('\n').map((l) => l.replace(/^[-*•]\s+/, '').trim()).filter(Boolean).map((l) => h('li', {}, ...boldParts(l))))
      : h('p', {}, ...boldParts(t.replace(/^#+\s*/, '').replace(/\n/g, ' ')))));
    function askBox(m, spot) {
      const $q = h('textarea', { class: 'maskq', rows: 3, maxlength: 500, placeholder: `Ask about ${m.text} here, like “what does it do in love?”` });
      const $answers = h('div', { class: 'stack' });
      const label = 'Ask (about 2 to 3 cents)';
      const $btn = h('button', { type: 'button', class: 'btn btn-primary btn-block' }, label);
      $btn.onclick = async () => {
        const question = $q.value.trim();
        if (!question) { $q.focus(); return; }
        count('meaning.ask');
        $btn.disabled = true; $btn.textContent = 'Reading the course…';
        try {
          const r = await api('/api/meaning/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...spot, question }) });
          $answers.prepend(h('div', { class: 'mbits manswer' }, h('div', { class: 'mbits-t' }, question), ...answerParts(r.text),
            h('div', { class: 'mbits-from' }, `Answered from the course's words for this spot · $${Number(r.usd).toFixed(3)}`)));
          $q.value = '';
        } catch (err) {
          $answers.prepend(h('p', { class: 'err' }, err.message));
        }
        $btn.disabled = false; $btn.textContent = label;
      };
      return h('section', { class: 'mpart c-ask mask' }, h('div', { class: 'mband' }, h('div', { class: 'mband-t' }, 'Ask About This')),
        h('div', { class: 'mblk' }, h('p', { class: 'muted small', style: 'margin:0 0 8px' }, `The AI answers from the course's words on ${m.text} here, the numbers beside it and the diamond behind it, and names its sources.`),
        $q, $btn, $answers));
    }
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
      overlay($pop, close); document.body.append($pop); document.body.classList.add('noscroll'); window.addEventListener('keydown', keys);
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
        $sub.textContent = [m.chartLabel.replace(/ chart$/i, ' Chart'), m.name].filter(Boolean).join(' · ');
        const p = m.pair, nc = m.nameChart;
        const others = p ? p.with.map((x) => x.text).join(' and ') : '';
        const center = where(m).replace(/ (Main|Extra) Vibration$/, '');
        const parts = [{ jump: 'This Spot', color: 'spot', id: 'mp-spot', title: `${m.text} in the ${where(m)}`, sub: m.chartLabel.replace(/ chart$/i, ' Chart'), bits: m.bits, passages: m.passages }];
        if (nc) parts.push({ jump: 'Name Chart', color: 'name', id: 'mp-name', title: `${nc.text} in the ${where(nc)}`, sub: 'Name Chart · the same spot there', bits: nc.bits, passages: nc.passages });
        if (p) {
          const ex = pairExample(m, p);
          parts.push({ jump: `With ${others}`, color: 'pair', id: 'mp-pair', title: `${m.text} with ${others}`, sub: `Together in the ${center}`,
            bits: pairSplit(p.bits, [m.text, ...p.with.map((x) => x.text)]), passages: p.passages,
            note: ex === `${m.text} with ${others}` ? null : `Points about another form (like ${ex}) are set apart and named.` });
        }
        // "Mind Center Sub Diamond (Main + Middle Name)" → title "Sub Diamond 35/8", the bracket goes in the line under it
        m.related.forEach((r, i) => {
          const full = titleCase(r.label), inParens = (/\(([^)]*)\)/.exec(full) || [])[1];
          const name = full.replace(/\s*\([^)]*\)/g, '').replace(/^(Mind|Emotion) Center (?=Sub Diamond)/, '');
          parts.push({ jump: `${name.replace(/^Mental |^Emotional /, '')} ${r.text}`, color: /Sub Diamond/.test(name) ? 'sub' : 'dia', id: `mp-rel${i}`, title: `${name} ${r.text}`,
            sub: [inParens, r.name, 'the diamond behind this number'].filter(Boolean).join(' · '), bits: r.bits, passages: r.passages, pre: [top(r)] });
        });
        const jumpTo = (id) => () => { count('meaning.jump'); const el = $pop.querySelector('#' + id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
        const $ask = askBox(m, { chart, position, sum, pair: pair || [], rel: rel || [] }); $ask.id = 'mp-ask';
        const chip = (x) => h('button', { type: 'button', class: `c-${x.color}`, onclick: jumpTo(x.id) }, h('i', { class: 'mdot', 'aria-hidden': 'true' }), x.jump);
        fill($body, top(m), gist(m.bits),
          h('div', { class: 'mjump' }, ...parts.map(chip), chip({ color: 'ask', id: 'mp-ask', jump: 'Ask' })),
          ...parts.map(part), $ask);
      }).catch((err) => fill($body, h('p', { class: 'err' }, err.message)));
    }
    // What a tapped number carries (data- attributes set by numeroscopeSvg in app.js).
    const fromEl = (el) => {
      const [chart, position] = String(el.getAttribute('data-pos') || '').split('.');
      const pair = String(el.getAttribute('data-pair') || '').split(',').map(Number).filter(Boolean);
      const rel = String(el.getAttribute('data-rel') || '').split(',').filter(Boolean).map((x) => { const [p, n] = x.split(':'); return { position: p, sum: Number(n) }; });
      return { chart, position, sum: Number(el.getAttribute('data-num')), pair, rel };
    };
    return { open, fromEl, openDoc };
  }
  root.Meaning = { install };
})(window);
