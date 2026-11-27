/* What a number means where it sits. Tap a number on a drawn chart (the viewer, the Quick Chart) once and an
   outline goes round it; tap it again and this page opens: the course's words for that number in that position,
   whether it is balanced there, the name chart's words for the same spot on a sub-chart, the number in general,
   the diamonds it makes or helps make (diamonds are not drawn; server/connections.js), the number it shares a
   center's circle with ("7 and 13/4 in the mind center"), and buttons to see every vault chart with the same
   number in the same spot. The server does the lookup (GET /api/meaning, server/meaning.js); nothing here guesses a
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
    // The number screen (owner's design 2026-11-27, .brain/PLAN-number-screen.md, mockup .brain/mockups/number-screen.html):
    // the band once (number, the spot's course name, chart, the number's title), one line on what the spot is, then
    // labeled parts: 1 the number in this spot (the short points as In Balance / Out of Balance strips, the full
    // course words behind one button), 2 about the number in general (one folded row), 3 the connected diamonds
    // (only the ones this number makes or helps make, server/connections.js; each row opens in place), the circle's
    // pair (until its cards come), 5 Ask About This. Every point has one shape; nothing is reworded.
    const kindOf = (title) => (/out of balance|imbalance|unbalanced/i.test(title || '') ? 'err' : /in balance|balanced/i.test(title || '') ? 'ok' : /^Only With/.test(title || '') ? 'other' : title ? 'topic' : '');
    const capFirst = (t) => t.replace(/^([^A-Za-z0-9]*)([a-z])/, (m, pre, c) => pre + c.toUpperCase());
    const point = (t, c) => h('div', { class: 'mpt' }, h('i', { class: 'mdot', 'aria-hidden': 'true' }),
      h('div', { class: 'mpt-x' }, ...boldParts(capFirst(String(t).trim())), c ? h('div', {}, cite(c)) : null));
    const label = (text, color) => h('div', { class: `ns-label c-${color}` }, h('i', { class: 'mdot', 'aria-hidden': 'true' }), text);
    const group = (g) => {
      const k = kindOf(g.title);
      return h('div', { class: `mgrp ns-strip ${k}` },
        g.title ? h('div', { class: 'mgrp-h' }, k === 'ok' ? 'In Balance' : k === 'err' ? 'Out of Balance' : titleCase(g.title)) : null,
        g.note ? h('div', { class: 'mblk mnote' }, g.note) : null,
        h('div', { class: 'mblk mpts' }, ...g.points.map((t, i) => point(t, g.cites && g.cites[i]))));
    };
    // The short points, where they came from, and the full course words behind one button (shown open when there
    // are no points yet). `empty` = the one line shown when the course has nothing here.
    const wordsBody = ({ bits, passages = [], empty }) => {
      if (!bits && !passages.length) return h('div', { class: 'ns-empty' }, empty);
      const own = bits && bits.groups.some((g) => g.cites && g.cites.some(Boolean));
      const from = bits && !own ? bookPages(passages) : [];
      const foot = [];
      if (from.length) foot.push(h('div', { class: 'mfoot-from' }, `From ${from.join(' · ')}`));
      if (bits && passages.length) {
        const $words = h('div', { class: 'mwords', hidden: true }, ...passages.map(card));
        const $btn = h('button', { type: 'button', class: 'mmore', 'aria-expanded': 'false', onclick: () => {
          $words.hidden = !$words.hidden; $btn.setAttribute('aria-expanded', String(!$words.hidden));
          $btn.textContent = $words.hidden ? 'Course Words' : 'Hide the Course Words';
          if (!$words.hidden) count('meaning.course_words');
        } }, 'Course Words');
        foot.push($btn, $words);
      } else if (passages.length) foot.push(...passages.map(card));
      return h('div', { class: 'ns-words' }, ...(bits ? bits.groups.map(group) : []), foot.length ? h('div', { class: 'mblk mfoot' }, ...foot) : null);
    };
    // A row that opens what is under it in place (the connected diamonds, the general guide).
    const openRow = ({ small, big, tail, body, onOpen }) => { // tail: "Show More" instead of the chevron
      const $in = h('div', { class: 'ns-open', hidden: true }, body);
      const $row = h('button', { type: 'button', class: 'ns-row', 'aria-expanded': 'false', onclick: () => {
        $in.hidden = !$in.hidden; $row.setAttribute('aria-expanded', String(!$in.hidden));
        if (tail) $tail.textContent = $in.hidden ? 'Show More' : 'Show Less';
        if (!$in.hidden && onOpen) onOpen();
      } }, h('div', { class: 'ns-with' }, tail ? null : small ? h('small', {}, small) : null, h('b', {}, big), tail && small ? h('small', {}, small) : null));
      const $tail = h('span', { class: tail ? 'ns-more' : 'ns-chev', 'aria-hidden': 'true' }, tail ? 'Show More' : '›');
      $row.append($tail);
      return [$row, $in];
    };
    // About the number in general (owner 2026-11-23): the owner's own guide and Number Notes, wherever it sits. One
    // folded row: its title and opening lines; open = the opening lines in full, every section of the guide as
    // written, then the owner's notes. Under the spot's own words, never mixed into them.
    const guideBody = (g) => {
      const groups = [...(g.groups || []).map((x) => ({ ...x, title: /^(?:Balanced|Unbalanced) Manifestation$/.test(x.title) ? x.title.replace(' Manifestation', '') : x.title })),
        ...(g.notes || []).map((x) => ({ title: x.title ? `Your Notes on ${x.title}` : 'Your Number Notes', points: x.points, notes: true }))];
      return h('div', { class: 'ns-guide' }, g.intro ? h('div', { class: 'mblk mguide-i' }, ...boldParts(g.intro)) : null,
        ...groups.map(group),
        h('div', { class: 'mblk mfoot-from' }, `From ${[g.book ? `your ${g.book}` : null, g.notes ? 'your Number Notes' : null].filter(Boolean).join(' and ')}`));
    };
    const guideRow = (text, g) => (g ? openRow({ big: g.name || `About ${text}`, small: g.alt || null, tail: true, body: guideBody(g), onOpen: () => count('meaning.number_guide') }) : null);
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

    // Ask About This (owner 2026-11-07): a question about this number in this spot, answered by the AI from the
    // course's words for it (POST /api/meaning/ask, server/spot-ask.js). Paid: the button says so. Answers stay on
    // the page while it is open, newest first.
    const answerParts = (text) => String(text).split(/\n{2,}/).map((t) => t.trim()).filter(Boolean).map((t) => (/^[-*•] /m.test(t)
      ? h('ul', {}, ...t.split('\n').map((l) => l.replace(/^[-*•]\s+/, '').trim()).filter(Boolean).map((l) => h('li', {}, ...boldParts(l))))
      : h('p', {}, ...boldParts(t.replace(/^#+\s*/, '').replace(/\n/g, ' ')))));
    function askBox(m, spot) {
      const $q = h('textarea', { class: 'maskq', rows: 3, maxlength: 500, placeholder: `Ask about ${m.text} here, like “what does it do in love?”` });
      const $answers = h('div', { class: 'stack' });
      const label2 = 'Ask (about 2 to 3 cents)';
      const $btn = h('button', { type: 'button', class: 'btn btn-primary btn-block' }, label2);
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
        $btn.disabled = false; $btn.textContent = label2;
      };
      return h('section', { class: 'ns-sec mask' }, label('Ask About This', 'ask'),
        h('div', { class: 'mblk' }, h('p', { class: 'muted small', style: 'margin:0 0 8px' }, `The AI answers from the course's words on ${m.text} here, the numbers beside it and its connected diamonds, and names its sources.`),
          $q, $btn, $answers));
    }
    // A combination card (owner's parts, never renamed or reordered: combinations.md "How it gets built"): the pair as
    // two chips, the phrases, By Position, What They Share / What Sets Them Apart, What the Course Says, My Reasoning
    // (separate points), At Its Best, At Its Worst, the number they make, and This Is Off. Every "(17/8)" stands out.
    const withNums = (t) => String(t).split(/(\([^()]*\d[^()]*\))/).filter((x) => x !== '').map((x) => (/^\(.*\d.*\)$/.test(x) ? h('span', { class: 'nc-n' }, x) : x));
    const ncPart = (title, ...body) => h('div', { class: 'nc-part' }, h('div', { class: 'nc-pl' }, title), ...body.filter(Boolean));
    function comboCard(c, key, pairName) {
      const chip = (x) => h('span', { class: 'nc-chip' }, `${titleCase(x.short).replace(/ Main Vibration$/, '')} `, h('b', {}, x.text));
      const tag = !c.graded ? h('span', { class: 'nc-tag new' }, 'New · For You to Grade')
        : c.unreviewed && c.unreviewed.length ? h('span', { class: 'nc-tag' }, `Not Graded Yet: ${c.unreviewed.map((u) => ({ phrases: 'Two Phrases', best: 'At Its Best', worst: 'At Its Worst' }[u] || u)).join(', ')}`) : null;
      const $note = h('textarea', { class: 'maskq', rows: 3, maxlength: 1000, placeholder: 'What is wrong with this card? Your words go to the next writing chat.' });
      const $said = h('div', { class: 'muted small' });
      const $send = h('button', { type: 'button', class: 'btn btn-block' }, 'Send');
      const $offBox = h('div', { class: 'nc-offbox', hidden: true }, $note, $send, $said);
      $send.onclick = async () => {
        const note = $note.value.trim();
        if (!note) { $note.focus(); return; }
        $send.disabled = true;
        try {
          await api('/api/combo/off', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, label: pairName, note }) });
          count('meaning.combo_off'); $note.value = ''; $said.textContent = 'Saved. The next writing chat reads it and fixes the card.';
        } catch (err) { $said.textContent = err.message; }
        $send.disabled = false;
      };
      return h('div', { class: 'nc-card' },
        h('div', { class: 'nc-head' }, chip(c.a), h('span', { class: 'nc-plus' }, '+'), chip(c.b), tag),
        h('div', { class: 'nc-phr' }, h('span', { class: 'main' }, c.phrases[0]), c.phrases.length > 1 ? h('span', { class: 'alt' }, c.phrases.slice(1).join(' · ')) : null),
        ncPart('By Position', h('p', {}, ...withNums(c.position))),
        c.share ? ncPart(c.share.title, h('p', {}, ...withNums(c.share.text))) : null,
        c.course ? ncPart('What the Course Says', h('div', { class: 'nc-quote' }, c.course.about ? h('small', {}, `Of ${c.course.about}:`) : null, h('div', {}, ...withNums(c.course.text)))) : null,
        c.reasoning && c.reasoning.length ? ncPart('My Reasoning', h('div', { class: 'mblk mpts nc-pts' }, ...c.reasoning.map((t) => h('div', { class: 'mpt' }, h('i', { class: 'mdot', 'aria-hidden': 'true' }), h('div', { class: 'mpt-x' }, ...withNums(t))))),
          h('div', { class: 'nc-mine' }, 'Past the course: reasoning from the two numbers.')) : null,
        c.best ? ncPart('At Its Best', h('div', { class: 'nc-best' }, ...withNums(c.best))) : null,
        c.worst ? ncPart('At Its Worst', h('div', { class: 'nc-worst' }, ...withNums(c.worst))) : null,
        c.made ? h('div', { class: 'nc-made' }, ...withNums(c.made)) : null,
        c.by === 'app' ? h('div', { class: 'nc-made' }, `Written in the app by ${c.model} on ${c.written} · cost ${money(c.usd)}`) : null,
        h('div', { class: 'nc-foot' }, h('button', { type: 'button', class: 'btn btn-block', onclick: () => { $offBox.hidden = !$offBox.hidden; if (!$offBox.hidden) $note.focus(); } }, 'This Is Off'), $offBox));
    }
    const short = (x) => titleCase(x.short || x.label);
    const money = (n) => `$${Number(n || 0).toFixed(2)}`;
    const cents = (n) => (Number(n) < 1 ? `${Math.max(1, Math.round(Number(n) * 100))}¢` : money(n));
    const spotName = (x) => short(x).replace(/ Main Vibration$/, ''); // "Mind Center 16/7", as the mockup and the course say
    function open({ chart, position, sum, pair, rel, n, at, inputs }) {
      if (document.querySelector('.mpop')) return; // one at a time
      const $num = h('span', { class: 'ns-num' }, String(sum));
      const $title = h('h1', { class: 'mtitle' }, '…');
      const $sub = h('div', { class: 'ns-sub' }, '');
      const $body = h('div', { class: 'ns-body' }, h('p', { class: 'muted' }, 'Reading the course…'));
      const close = () => { $pop.remove(); overlayGone($pop); document.body.classList.remove('noscroll'); window.removeEventListener('keydown', keys); };
      const keys = (e) => { if (e.key === 'Escape') close(); };
      const $pop = h('div', { class: 'wordpop mpop' },
        h('div', { class: 'pagetop ns-top' }, h('button', { type: 'button', class: 'btn iconbtn', 'aria-label': 'Close', onclick: close }, '‹'),
          h('div', { class: 'ns-band' }, $num, h('div', { class: 'ns-t' }, $title, $sub))),
        $body);
      overlay($pop, close); document.body.append($pop); document.body.classList.add('noscroll'); window.addEventListener('keydown', keys);
      const q = new URLSearchParams({ chart, position, sum: String(sum) });
      if (pair && pair.length) q.set('pair', pair.join(','));
      if (n) q.set('n', String(n));
      if (at) q.set('at', at);
      if (inputs) for (const k of ['day', 'month', 'year', 'name']) if (inputs[k] !== undefined && inputs[k] !== null && inputs[k] !== '') q.set(k, String(inputs[k]));
      if (!inputs && rel && rel.length) q.set('rel', rel.map((r) => `${r.position}:${r.sum}`).join(','));
      const showCharts = (m) => () => { count('meaning.show_charts'); close(); go(positionHash([{ pos: `${m.chart}.${m.position}`, num: String(m.sum) }])); };
      const top = (m) => {
        const v = VERDICT[m.verdict];
        return h('div', { class: 'row mtop' }, v ? h('span', { class: `mverdict ${v[1]}` }, v[0]) : null,
          m.count ? h('button', { type: 'button', class: 'mshow', onclick: showCharts(m) }, `${m.count} chart${m.count === 1 ? '' : 's'} with ${m.text} here ›`) : h('span', { class: 'muted small' }, `No chart in the vault has ${m.text} here.`));
      };
      api('/api/meaning?' + q).then((m) => {
        $num.textContent = m.text;
        $title.textContent = short(m);
        $sub.textContent = [m.chartLabel.replace(/ chart$/i, ' Chart'), m.name].filter(Boolean).join(' · ');
        const nc = m.nameChart;
        // 1 the number in this spot
        const spot = h('section', { class: 'ns-sec ns-first' },
          m.what ? h('div', { class: 'ns-what' }, `What this spot is: ${m.what.charAt(0).toLowerCase()}${m.what.slice(1)}`) : null,
          h('div', { class: 'mblk' }, top(m)),
          label(`${m.text} as the ${short(m)}`, 'spot'),
          wordsBody({ bits: m.bits, passages: m.passages, empty: `The course has no words yet for ${m.text} as the ${short(m)}.` }),
          nc ? label(`The Name Chart's Words for ${nc.text} in the ${short(nc)}`, 'name') : null,
          nc ? wordsBody({ bits: nc.bits, passages: nc.passages, empty: '' }) : null);
        // 2 the number in general
        const gen = m.guide ? h('section', { class: 'ns-sec' }, label(`About ${m.text} in General`, 'gen'), ...guideRow(m.text, m.guide)) : null;
        // 3 the connected diamonds: what makes this number, what it helps make
        const num = String(m.sum);
        const partText = (x) => `${short(x)} ${x.text}`;
        const howOf = (r) => {
          if (!r.parts) return 'A diamond behind this number';
          const on = r.chart !== m.chart ? `, on the ${r.chartLabel.replace(/ chart$/i, ' Chart')}` : '';
          if (r.role === 'made') return `What makes this ${num}: ${r.parts.map(partText).join(' beside ')}`;
          const other = r.parts.find((x) => !(x.chart === m.chart && x.position === m.position)) || r.parts[1];
          return `What this ${num} helps make${on}: beside ${partText(other)}`;
        };
        const diaRow = (r) => openRow({ small: howOf(r), big: `${short(r)} ${r.text}${r.name ? ` · ${r.name}` : ''}`, onOpen: () => count('meaning.diamond'),
          body: diaBody(r) });
        // A diamond opens to the course's words for it in this spot; the course rarely has any (owner 2026-11-27: "there
        // really isn't any course material on what a certain diamond means in positions like this"), so then it opens
        // straight to the number's general guide, the same source as About N in General above. With course words, the
        // guide is one folded row under them.
        function diaBody(r) {
          const own = r.bits || r.passages.length;
          return h('div', {}, h('div', { class: 'mblk' }, top(r)),
            own ? wordsBody({ bits: r.bits, passages: r.passages }) : null,
            own && r.guide ? h('div', { class: 'ns-sub2' }, label(`About ${r.text} in General`, 'gen'), ...guideRow(r.text, r.guide)) : null,
            !own && r.guide ? h('div', { class: 'ns-sub2' }, label(`${r.text} · ${r.name || 'In General'}`, 'gen'), r.guide.alt ? h('div', { class: 'ns-empty ns-alt' }, r.guide.alt) : null, guideBody(r.guide)) : null,
            !own && !r.guide ? wordsBody({ empty: `The course has no words yet for ${r.text} as the ${short(r)}.` }) : null);
        }
        const dias = h('section', { class: 'ns-sec' }, label('Connected Diamonds', 'dia'),
          ...(m.related.length ? m.related.flatMap(diaRow) : [h('div', { class: 'ns-empty' }, `${m.text} here is not part of a diamond.`)]));
        // 4 With Its Neighbors (owner 2026-11-27): each number this one makes a combination with, one row each with the
        // pair's first phrase; a row opens the card (server/neighbors.js, knowledge/combo-cards.json). A pair with no
        // card yet says Not Written Yet, costs nothing, and is noted for the next writing chat; a circle partner then
        // shows the course's words on the pair.
        const nbLabel = (x) => (x.kind === 'circle' ? `${spotName(x)} ${x.text}, in the Same Center` : `${x.chart !== m.chart ? `${x.chartLabel.replace(/ chart$/i, ' Chart')} ` : ''}${spotName(x)} ${x.text}`);
        const pairLabel = (x) => `${m.chartLabel.replace(/ chart$/i, ' Chart')} ${spotName(m)} ${m.text} + ${nbLabel(x)}`;
        const nbRow = (x) => openRow({ small: `With ${nbLabel(x)}`, big: x.card ? x.card.phrases[0] : 'Not Written Yet',
          onOpen: () => { count('meaning.combo'); if (!x.card && !x.asked) { x.asked = true; api('/api/combo/wanted', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: x.key, label: pairLabel(x) }) }).catch(() => {}); } },
          body: x.card ? comboCard(x.card, x.key, pairLabel(x)) : missingCard(x) });
        // Not written yet: noted for the writing chats (free), and Write It (owner 2026-11-27: a paid call, one card,
        // the price on the button before the tap and on the card after it; kept for every chart with this pair).
        function missingCard(x) {
          const $btn = h('button', { type: 'button', class: 'btn btn-primary btn-block' }, 'Write It');
          const $note = h('div', { class: 'muted small' }, 'Paid: written by the AI from the course and the card rules. About half a minute.');
          const $wrap = h('div', {},
            h('div', { class: 'ns-empty' }, 'No card yet. Opening it put it on the list for the next writing chat (free), or write it now.'),
            h('div', { class: 'nc-write' }, $btn, $note),
            x.pairWords ? wordsBody({ bits: pairSplit(x.pairWords.bits, [m.text, x.text]), passages: x.pairWords.passages, empty: '' }) : null);
          api('/api/combo/estimate?' + new URLSearchParams({ key: x.key })).then((e) => { if (!$btn.disabled) $btn.textContent = `Write It · about ${cents(e.usd)}`; }).catch(() => {});
          $btn.onclick = async () => {
            count('meaning.combo_write');
            $btn.disabled = true; $btn.textContent = 'Writing… about half a minute';
            try {
              const r = await api('/api/combo/write', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: x.key, label: pairLabel(x) }) });
              x.card = withLabels(r.card);
              const open = $wrap.parentNode;
              const row = open && open.previousElementSibling;
              if (row) { const b = row.querySelector('.ns-with b'); if (b) b.textContent = x.card.phrases[0]; }
              fill($wrap, comboCard(x.card, x.key, pairLabel(x)));
            } catch (err) { $btn.disabled = false; $btn.textContent = 'Write It'; $note.textContent = err.message; $note.className = 'err small'; }
          };
          return $wrap;
        }
        // a card written now comes back with spots only: give its two sides the names the screen shows
        const sideOf = (spot, sum) => (spot === `${m.chart}.${m.position}` && sum === m.sum ? m : nbs.find((y) => `${y.chart}.${y.position}` === spot && y.sum === sum)) || {};
        const named = (x) => ({ ...x, short: sideOf(x.spot, x.sum).short || x.spot, text: sideOf(x.spot, x.sum).text || String(x.sum) });
        const withLabels = (c) => ({ ...c, a: named(c.a), b: named(c.b) });
        const nbs = m.neighbors || [];
        const nbSec = nbs.length ? h('section', { class: 'ns-sec' }, label('With Its Neighbors', 'pair'), ...nbs.flatMap(nbRow)) : null;
        fill($body, spot, gen, dias, nbSec, askBox(m, { chart, position, sum, pair: pair || [], rel: rel || [], n: n || 0, at: at || 'name', inputs: inputs || null }));
      }).catch((err) => fill($body, h('p', { class: 'err' }, err.message)));
    }
    // What a tapped number carries (data- attributes set by numeroscopeSvg in app.js; the chart's name and date sit on the drawing).
    const fromEl = (el) => {
      const [chart, position] = String(el.getAttribute('data-pos') || '').split('.');
      const pair = String(el.getAttribute('data-pair') || '').split(',').map(Number).filter(Boolean);
      const rel = String(el.getAttribute('data-rel') || '').split(',').filter(Boolean).map((x) => { const [p, n] = x.split(':'); return { position: p, sum: Number(n) }; });
      const svg = el.ownerSVGElement || el.closest('svg');
      let inputs = null;
      try { inputs = svg && svg.getAttribute('data-inputs') ? JSON.parse(svg.getAttribute('data-inputs')) : null; } catch { inputs = null; }
      return { chart, position, sum: Number(el.getAttribute('data-num')), pair, rel, n: Number(el.getAttribute('data-n')) || 0, at: el.getAttribute('data-at') || null, inputs };
    };
    return { open, fromEl, openDoc };
  }
  root.Meaning = { install };
})(window);
