/* Chart Vault – phone-first front end. Plain JavaScript, no build step. */
(() => {
  'use strict';
  const $app = document.getElementById('app');
  const $toast = document.getElementById('toast');

  // ---------- helpers ----------
  const h = (tag, attrs = {}, ...children) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  };
  const fmtN = (n) => Number(n || 0).toLocaleString();
  const fmtBytes = (b) => (b >= 1e9 ? (b / 1e9).toFixed(2) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB');
  const fmtDate = (iso) => (iso ? new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').toLocaleString() : '—');
  const niceDate = (iso) => (iso ? iso.slice(0, 10) : '');
  let toastTimer;
  const toast = (msg, isErr = false) => {
    $toast.textContent = msg; $toast.className = isErr ? 'err' : '';
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $toast.classList.add('hidden'), isErr ? 6000 : 3000);
  };

  async function api(path, opts = {}) {
    const res = await fetch(path, { credentials: 'same-origin', ...opts });
    if (res.status === 401) { showLogin(); throw new Error('Please log in.'); }
    let body = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) body = await res.json();
    if (!res.ok) throw new Error((body && body.error) || `Server error (${res.status})`);
    return body;
  }
  const postJson = (path, data) => api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });

  const chip = (tag, { onclick, active, removable } = {}) =>
    h('button', { class: `chip ${tag.kind || ''} ${active ? 'active' : ''} ${tag.source === 'app' ? 'app' : ''}`, type: 'button', onclick, title: tag.name },
      h('span', { class: 't' }, TagCodes.pretty(tag.name)),
      tag.count !== undefined ? h('span', { class: 'count' }, ` ${fmtN(tag.count)}`) : null,
      removable ? h('span', { class: 'x' }, '×') : null);

  // ---------- routing ----------
  const routes = {};
  let lastRoute = null; // the screen shown before this one (null = this is the first screen since the page loaded)
  let viewerFromApp = false; // the viewer was opened from another screen here, so Back can use the browser's own history
  function route() {
    const hash = location.hash || '#/';
    const [, name = '', arg = ''] = /^#\/([^/?]*)\/?([^?]*)/.exec(hash) || [];
    const query = new URLSearchParams(hash.split('?')[1] || '');
    const view = routes[name] || routes[''];
    closeOverlays();
    if (viewerCleanup) { viewerCleanup(); viewerCleanup = null; }
    if (name === 'chart' && lastRoute !== 'chart') viewerFromApp = lastRoute !== null;
    lastRoute = name;
    view(arg, query);
  }
  window.addEventListener('hashchange', route);
  const go = (hash) => { location.hash = hash; };
  // Same screen change, but without adding a step to the browser's history (used between charts in the
  // viewer, so the phone's Back button returns to the screen the viewer was opened from, not to the last chart).
  const swap = (hash) => { location.replace(hash); };
  // Like replaceChildren, but skips null/false so a conditional part never shows as the word "null".
  const fill = (el, ...nodes) => el.replaceChildren(...nodes.filter((n) => n !== null && n !== undefined && n !== false));
  const render = (...nodes) => { fill($app, ...nodes); window.scrollTo(0, 0); };

  // ---------- login ----------
  function showLogin() {
    const $pw = h('input', { type: 'password', placeholder: 'Password', autocomplete: 'current-password', autofocus: true, enterkeyhint: 'go' });
    const $msg = h('p', { class: 'err small' });
    const $btn = h('button', { class: 'btn-primary btn-block', type: 'submit' }, 'Log in');
    const form = h('form', { class: 'stack', style: 'width:100%;max-width:360px', onsubmit: async (e) => {
      e.preventDefault(); $btn.disabled = true; $msg.textContent = '';
      try {
        const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: $pw.value }), credentials: 'same-origin' });
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error || 'Could not log in.');
        route();
      } catch (err) { $msg.textContent = err.message; $btn.disabled = false; }
    } }, $pw, $btn, $msg);
    render(h('div', { class: 'screen center' }, h('img', { src: '/icons/icon-192.png', width: 96, height: 96, alt: '', style: 'border-radius:22px;margin-bottom:16px' }), h('h1', {}, 'Chart Vault'), form));
    setTimeout(() => $pw.focus(), 50);
  }

  // ---------- overlays (sheet, lightbox) ----------
  let overlays = [];
  function closeOverlays() { for (const o of overlays) o.remove(); overlays = []; document.body.classList.remove('noscroll'); }
  function sheet(title, actions) {
    const bg = h('div', { class: 'sheet-bg', onclick: (e) => { if (e.target === bg) close(); } });
    const close = () => { bg.remove(); overlays = overlays.filter((o) => o !== bg); };
    bg.append(h('div', { class: 'sheet' }, h('h3', {}, title),
      ...actions.map((a) => h('button', { type: 'button', class: a.cls || '', onclick: async () => { close(); await a.run(); } }, a.label)),
      h('button', { type: 'button', onclick: close }, 'Cancel')));
    document.body.append(bg); overlays.push(bg);
  }


  // Pinch-to-zoom + swipes on an image inside a box (pointer events: works
  // with fingers on Samsung Internet and Chrome, and with a mouse on a laptop).
  // Swipes only fire when the picture is not zoomed in.
  function zoomable(box, img, on = {}) {
    let scale = 1, tx = 0, ty = 0; // transform: translate(tx,ty) scale(scale) with origin 0 0
    let base = null; // natural layout box of the image at scale 1
    const pointers = new Map();
    let start = null, lastTap = 0, swipe = null;
    const apply = () => { img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
    const measure = () => { img.style.transform = ''; const r = img.getBoundingClientRect(); base = { x: r.left, y: r.top, w: r.width, h: r.height }; apply(); };
    const clamp = () => {
      scale = Math.min(Math.max(scale, 1), 8);
      if (scale === 1) { tx = 0; ty = 0; return; }
      const W = box.clientWidth, H = box.clientHeight;
      const w = base.w * scale, hh = base.h * scale;
      const left = base.x + tx, right = left + w;
      if (w <= W) tx = (W - w) / 2 - base.x; else { if (left > 0) tx -= left; if (right < W) tx += W - right; }
      const top = base.y + ty, bottom = top + hh;
      if (hh <= H) ty = (H - hh) / 2 - base.y; else { if (top > 0) ty -= top; if (bottom < H) ty += H - bottom; }
    };
    const zoomAt = (cx, cy, factor) => {
      if (!base) return;
      const ns = Math.min(Math.max(scale * factor, 1), 8), k = ns / scale;
      tx = cx - base.x - (cx - base.x - tx) * k; ty = cy - base.y - (cy - base.y - ty) * k; scale = ns; clamp(); apply();
    };
    const reset = () => { scale = 1; tx = 0; ty = 0; measure(); };
    img.addEventListener('load', measure); if (img.complete) measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    box.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, a, input')) return;
      box.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.values()];
      if (pts.length === 1) {
        const now = Date.now();
        if (now - lastTap < 300) { zoomAt(e.clientX, e.clientY, scale > 1.5 ? 1 / scale : 2.5); lastTap = 0; swipe = null; }
        else { lastTap = now; swipe = scale === 1 ? { x: e.clientX, y: e.clientY, t: now } : null; }
        start = { tx, ty, x: e.clientX, y: e.clientY, scale };
      } else if (pts.length === 2) {
        swipe = null;
        start = { tx, ty, scale, dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2 };
      }
    });
    box.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId) || !start) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.values()];
      if (pts.length === 2 && start.dist) {
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2;
        const ns = Math.min(Math.max(start.scale * (dist / start.dist), 1), 8), k = ns / start.scale;
        tx = cx - base.x - (start.cx - base.x - start.tx) * k; ty = cy - base.y - (start.cy - base.y - start.ty) * k; scale = ns;
        clamp(); apply();
      } else if (pts.length === 1 && start.x !== undefined && scale > 1) {
        tx = start.tx + (e.clientX - start.x); ty = start.ty + (e.clientY - start.y); clamp(); apply();
      }
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      const pts = [...pointers.values()];
      if (swipe && scale === 1 && pts.length === 0) {
        const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
        if (Math.abs(dx) > 70 && Math.abs(dy) < Math.abs(dx) * 0.7) (dx < 0 ? on.left : on.right)?.();
        else if (dy < -70 && Math.abs(dx) < 60) on.up?.();
        else if (dy > 90 && Math.abs(dx) < 60) on.down?.();
        else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && Date.now() - swipe.t < 300) on.tap?.();
      }
      swipe = null;
      start = pts.length === 1 ? { tx, ty, x: pts[0].x, y: pts[0].y, scale } : null;
    };
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    box.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    box.addEventListener('dblclick', (e) => e.preventDefault());
    return { reset, destroy: () => window.removeEventListener('resize', onResize) };
  }

  // ---------- tag suggestion box ----------
  function suggestBox($input, { within = () => [], onPick, allowNew = false, kind = null, alsoArchetype = false }) {
    const $list = h('div', { class: 'suggest hidden' });
    let timer, seq = 0;
    const hide = () => $list.classList.add('hidden');
    const show = (items, q) => {
      fill($list);
      const exact = items.some((t) => t.name === q);
      if (allowNew && q && !exact) $list.append(h('button', { type: 'button', onclick: () => { onPick(q); hide(); } }, h('span', {}, `Add new tag “${q}”`), h('span', { class: 'count' }, 'new')));
      for (const t of items) $list.append(h('button', { type: 'button', onclick: () => { onPick(t.name, t.pickKind); hide(); } },
        h('span', { class: `chip ${t.kind}`, style: 'min-height:32px;font-size:15px;pointer-events:none' }, TagCodes.pretty(t.name)),
        h('span', { class: 'count' }, t.pickKind === 'archetype' ? `${fmtN(t.count)} archetype pic${t.count === 1 ? '' : 's'}` : `${fmtN(t.count)} chart${t.count === 1 ? '' : 's'}`)));
      $list.classList.toggle('hidden', !$list.children.length);
    };
    const refresh = async () => {
      const q = $input.value.trim(); const my = ++seq;
      const params = new URLSearchParams({ q, limit: 25 }); if (kind) params.set('kind', kind); for (const w of within()) params.append('within', w);
      try {
        let items = await api('/api/tags?' + params);
        if (alsoArchetype && q) {
          const ap = new URLSearchParams({ q, limit: 5, kind: 'archetype' });
          const extra = await api('/api/tags?' + ap).catch(() => []);
          items = [...items, ...extra.map((t) => ({ ...t, pickKind: 'archetype' }))];
        }
        if (my === seq) show(items, q);
      } catch {}
    };
    $input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(refresh, 120); });
    $input.addEventListener('focus', refresh);
    $input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const first = $list.querySelector('button'); if (allowNew && $input.value.trim()) onPick($input.value.trim()); else if (first) first.click(); hide(); } if (e.key === 'Escape') hide(); });
    document.addEventListener('pointerdown', (e) => { if (!$list.contains(e.target) && e.target !== $input) hide(); });
    return $list;
  }

  // ---------- browse ----------
  routes[''] = function browse(_, query) {
    const tags = query.getAll('tag');
    const kind = query.get('kind') === 'archetype' ? 'archetype' : 'chart';
    const setTags = (t, k = kind) => { const p = new URLSearchParams(); if (k === 'archetype') p.set('kind', 'archetype'); for (const x of t) p.append('tag', x); go('#/' + ((t.length || k === 'archetype') ? '?' + p : '')); };
    const $quick = h('a', { class: 'btn iconbtn gear', href: '#/quick', 'aria-label': 'Quick chart', title: 'Quick chart' }, '◈');
    const $gear = h('a', { class: 'btn iconbtn gear', href: '#/settings', 'aria-label': 'Settings', title: 'Settings' }, '⚙');
    const $input = h('input', { type: 'search', placeholder: tags.length ? 'Add another tag…' : 'Search (12/3 mind center, politics, a name…)', autocomplete: 'off', enterkeyhint: 'search' });
    const $sugg = suggestBox($input, { within: () => tags, kind, alsoArchetype: kind === 'chart', onPick: (name, pickKind) => { if (pickKind && pickKind !== kind) setTags([name], pickKind); else if (!tags.includes(name)) setTags([...tags, name]); $input.value = ''; } });
    const $clear = h('button', { type: 'button', class: 'clear', 'aria-label': 'Clear', onclick: () => { $input.value = ''; $input.focus(); $sugg.classList.add('hidden'); } }, '×');
    const $filters = h('div', { class: 'filters' },
      kind === 'archetype' ? chip({ name: 'Archetype pics', kind: 'name' }, { active: true, removable: true, onclick: () => setTags(tags, 'chart') }) : null,
      ...tags.map((t) => chip({ name: t, kind: kindOf(t) }, { active: true, removable: true, onclick: () => setTags(tags.filter((x) => x !== t)) })),
      tags.length > 1 ? h('button', { type: 'button', class: 'chip', onclick: () => setTags([]) }, 'Clear all') : null);
    const $summary = h('div', { class: 'summary' }, 'Loading…');
    const $grid = h('div', { class: 'grid' });
    const $sentinel = h('div', { class: 'sentinel' });
    const $recent = h('div', { class: 'recent hidden' });
    // The home screen (nothing searched) shows this phone's recent searches and recently opened charts,
    // not every chart newest first: the owner always starts from a search.
    const home = !tags.length && kind === 'chart';
    if (tags.length) rememberSearch(tags, kind);
    const searches = home ? recentSearches() : [];
    const $searches = home ? h('div', { class: 'rsearches' },
      searches.length ? h('div', { class: 'summary', style: 'padding-bottom:4px' }, 'Recent searches') : null,
      ...searches.map((s) => h('button', { type: 'button', class: 'rsearch', onclick: () => setTags(s.tags, s.kind) },
        h('span', { class: 'chips' }, s.kind === 'archetype' ? h('span', { class: 'chip name', style: 'pointer-events:none' }, 'Archetype pics') : null,
          ...s.tags.map((t) => h('span', { class: `chip ${kindOf(t)}`, style: 'pointer-events:none' }, TagCodes.pretty(t)))),
        h('span', { class: 'muted', style: 'padding-left:8px' }, '›'))),
      searches.length ? null : h('p', { class: 'muted', style: 'padding:8px 2px' }, 'Search a name or a tag above. Your recent searches will show here.')) : null;
    render(h('div', { class: 'screen' },
      h('div', { class: 'searchbar' }, h('div', { class: 'row', style: 'flex-wrap:nowrap;gap:8px' }, h('div', { class: 'searchbox', style: 'flex:1' }, $input, $clear, $sugg), $quick, $gear), (tags.length || kind === 'archetype') ? $filters : null),
      $searches, $recent, home ? null : $summary, home ? null : $grid, home ? null : $sentinel));
    // Recently opened charts (this phone remembers the last 12), only on the home screen.
    if (home && recentIds().length) {
      api('/api/images?ids=' + recentIds().join(',') + '&limit=50').then((r) => {
        const byId = new Map(r.items.map((i) => [i.id, i]));
        const items = recentIds().map((id) => byId.get(id)).filter(Boolean);
        if (!items.length) return;
        fill($recent, h('div', { class: 'summary', style: 'padding-bottom:4px' }, 'Recently opened'), h('div', { class: 'recent-row' }, ...items.map(cell)));
        $recent.classList.remove('hidden');
      }).catch(() => {});
    }
    if (home) return;

    let offset = 0, total = null, loading = false, done = false;
    const params = () => { const p = new URLSearchParams({ limit: 60, offset, kind }); for (const t of tags) p.append('tag', t); return p; };
    async function more() {
      if (loading || done) return; loading = true; $sentinel.textContent = 'Loading…';
      try {
        const r = await api('/api/images?' + params());
        total = r.total; offset += r.items.length;
        for (const img of r.items) $grid.append(cell(img));
        done = offset >= total || r.items.length === 0;
        const noun = kind === 'archetype' ? 'archetype pic' : 'chart';
        $summary.textContent = tags.length ? `${fmtN(total)} ${noun}${total === 1 ? '' : 's'} with ${tags.map(TagCodes.pretty).join(' and ')}` : `${fmtN(total)} ${noun}s, newest first`;
        $sentinel.textContent = done ? (total === 0 ? (kind === 'archetype' && !tags.length ? 'No archetype pics yet. Add them on the Upload page.' : `No ${noun}s match.`) : '') : '';
      } catch (err) { $sentinel.textContent = err.message; }
      loading = false;
    }
    function cell(img) {
      const label = img.kind === 'archetype'
        ? img.tags.map((t) => t.name).join(', ')
        : (img.tags.find((t) => t.kind === 'name') || img.tags[0] || {}).name || '';
      return h('a', { class: 'cell', href: `#/chart/${img.id}${location.hash.includes('?') ? '?' + location.hash.split('?')[1] : ''}` },
        img.has_file ? h('img', { class: 'thumb', src: `/thumb/${img.id}`, loading: 'lazy', alt: label }) : h('div', { class: 'nofile' }, 'no file yet'),
        h('div', { class: `label ${label ? '' : 'muted'}` }, label || img.filename));
    }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) more(); }, { rootMargin: '600px' });
    io.observe($sentinel);
    more();
  };
  const kindOf = (name) => (/^\d+$/.test(name) ? 'number' : /^\d+[A-Za-z]/.test(name) ? 'position' : 'name');
  // The last charts opened on this phone, newest first (browser storage; may be empty or blocked).
  const recentIds = () => { try { return (JSON.parse(localStorage.getItem('recent') || '[]') || []).filter(Number.isInteger).slice(0, 12); } catch { return []; } };
  const rememberOpened = (id) => { try { localStorage.setItem('recent', JSON.stringify([id, ...recentIds().filter((x) => x !== id)].slice(0, 12))); } catch {} };
  // The last searches made on this phone, newest first: [{ tags, kind }]. Adding a tag to a search
  // replaces the narrower search it grew from, so one lookup does not leave a trail of half-searches.
  const recentSearches = () => { try { return (JSON.parse(localStorage.getItem('searches') || '[]') || []).filter((s) => s && Array.isArray(s.tags) && s.tags.length).slice(0, 20); } catch { return []; } };
  const rememberSearch = (tags, kind) => {
    try {
      const kept = recentSearches().filter((s) => !(s.kind === kind && (s.tags.every((t) => tags.includes(t)) || tags.every((t) => s.tags.includes(t)))));
      localStorage.setItem('searches', JSON.stringify([{ tags, kind }, ...kept].slice(0, 20)));
    } catch {}
  };

  // ---------- viewer (full screen) ----------
  let viewerCleanup = null;
  routes.chart = async function viewer(id, query) {
    const qs = query.toString();
    const listQ = new URLSearchParams(); for (const t of query.getAll('tag')) listQ.append('tag', t); if (query.get('kind') === 'archetype') listQ.set('kind', 'archetype');
    const backHash = '#/' + (listQ.toString() ? '?' + listQ : '');
    // Back goes to the screen the viewer was opened from (the list, a search, the quick chart). Opened from a
    // link or a fresh load, there is no such screen, so it goes to the list this chart belongs to.
    const back = () => (viewerFromApp ? history.back() : swap(backHash));
    document.body.classList.add('fullscreen');
    viewerCleanup = () => document.body.classList.remove('fullscreen');

    // alt is empty on purpose: with text in it the browser draws a "missing picture" icon until the file arrives.
    const $img = h('img', { class: 'vimg', alt: '', draggable: 'false' });
    const $stage = h('div', { class: 'vstage' }, $img);
    // The picture is sized from its own proportions to fill the stage, so the small thumbnail shown first
    // (already on the phone from the list) and the full picture that replaces it take exactly the same space.
    const fit = () => {
      if (!$img.naturalWidth || !$img.isConnected) return;
      const W = $stage.clientWidth, H = $stage.clientHeight, r = $img.naturalWidth / $img.naturalHeight;
      const w = Math.min(W, H * r); $img.style.width = `${w}px`; $img.style.height = `${w / r}px`;
    };
    $img.addEventListener('load', fit); window.addEventListener('resize', fit);
    $img.src = `/thumb/${id}`;
    const $count = h('span', { class: 'vcount' }, '');
    const $name = h('span', { class: 'vname' }, '');
    const $prev = h('button', { type: 'button', class: 'iconbtn varrow left hidden', 'aria-label': 'Previous' }, '‹');
    const $next = h('button', { type: 'button', class: 'iconbtn varrow right hidden', 'aria-label': 'Next' }, '›');
    const $sheetBody = h('div', { class: 'vsheet-body stack' });
    const $sheet = h('div', { class: 'vsheet' }, h('div', { class: 'vsheet-grip', onclick: () => closeSheet() }, h('span', {})), $sheetBody);
    const $root = h('div', { class: 'viewer' },
      $stage,
      h('div', { class: 'vtop' }, h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Back to the list', onclick: back }, '‹'), $name, $count),
      $prev, $next, $sheet);
    render($root);

    let img, ctx = { prev: null, next: null, index: null, total: 0 }, sheetOpen = false;
    const openSheet = () => { sheetOpen = true; $sheet.classList.add('open'); $root.classList.remove('bare'); };
    const closeSheet = () => { sheetOpen = false; $sheet.classList.remove('open'); };
    const toggleBare = () => $root.classList.toggle('bare'); // tap: hide or show the top bar
    const goTo = (nid) => { if (nid) swap(`#/chart/${nid}${qs ? '?' + qs : ''}`); };
    const z = zoomable($stage, $img, { left: () => goTo(ctx.next), right: () => goTo(ctx.prev), up: openSheet, down: () => (sheetOpen ? closeSheet() : back()), tap: () => (sheetOpen ? closeSheet() : toggleBare()) });
    $prev.onclick = () => goTo(ctx.prev); $next.onclick = () => goTo(ctx.next);
    const keys = (e) => { if (e.key === 'ArrowLeft') goTo(ctx.prev); else if (e.key === 'ArrowRight') goTo(ctx.next); else if (e.key === 'Escape') (sheetOpen ? closeSheet() : back()); };
    window.addEventListener('keydown', keys);
    viewerCleanup = () => { document.body.classList.remove('fullscreen'); window.removeEventListener('keydown', keys); window.removeEventListener('resize', fit); z.destroy(); };
    // swipe down on the sheet grip closes it
    let gripY = null;
    $sheet.addEventListener('pointerdown', (e) => { if (e.target.closest('.vsheet-grip')) gripY = e.clientY; });
    $sheet.addEventListener('pointerup', (e) => { if (gripY !== null && e.clientY - gripY > 40) closeSheet(); gripY = null; });

    try { img = await api(`/api/images/${id}`); } catch (err) { fill($sheetBody, h('p', { class: 'err' }, err.message)); openSheet(); return; }
    if (query.get('sheet')) openSheet();
    if (img.kind === 'chart') rememberOpened(img.id);
    // The full picture replaces the thumbnail only once it has arrived, so nothing blank or broken shows in between.
    if (img.has_file) { const full = new Image(); full.onload = () => { if ($img.isConnected) $img.src = full.src; }; full.src = `/img/${img.id}`; } else { $img.removeAttribute('src'); fill($stage, h('div', { class: 'center', style: 'min-height:100%' }, h('p', { class: 'muted' }, 'No picture for this chart yet.'), h('a', { class: 'btn', href: '#/upload' }, 'Go to Upload'))); }
    $name.textContent = img.kind === 'archetype' ? img.tags.map((t) => t.name).join(', ') : ((img.tags.find((t) => t.kind === 'name') || {}).name || '');
    api(`/api/images/${id}/context?${listQ}`).then((c) => {
      ctx = c;
      $count.textContent = c.index ? `${c.index} / ${c.total}` : '';
      $prev.classList.toggle('hidden', !c.prev); $next.classList.toggle('hidden', !c.next);
      for (const nid of [c.next, c.prev]) if (nid) { const pre = new Image(); pre.src = `/img/${nid}`; }
    }).catch(() => {});

    const draw = () => {
      const groups = { name: [], position: [], number: [] };
      for (const t of img.tags) groups[t.kind].push(t);
      const $tagInput = h('input', { type: 'text', placeholder: 'Add a tag…', autocomplete: 'off', autocapitalize: 'none', enterkeyhint: 'done' });
      const addTag = async (name) => {
        try { const r = await postJson(`/api/images/${img.id}/tags`, { name }); img = r.image; toast(r.added ? `Added “${name}”` : `“${name}” was already there`); draw(); }
        catch (err) { toast(err.message, true); }
      };
      const $sugg = suggestBox($tagInput, { onPick: addTag, allowNew: true });
      const tagBtn = (t) => chip(t, { onclick: () => sheet(t.name, [
        { label: `▦ Show all ${img.kind === 'archetype' ? 'archetype pics' : 'charts'} tagged “${t.name}”`, run: () => go(`#/?${img.kind === 'archetype' ? 'kind=archetype&' : ''}tag=${encodeURIComponent(t.name)}`) },
        { label: `✕ Remove “${t.name}” from this ${img.kind === 'archetype' ? 'picture' : 'chart'}`, cls: 'btn-danger', run: async () => {
          try { const r = await postJson(`/api/images/${img.id}/tags/remove`, { name: t.name }); img = r.image; toast(`Removed “${t.name}”`); draw(); } catch (err) { toast(err.message, true); }
        } },
      ]) });
      fill($sheetBody,
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', {}, `${img.tags.length} tag${img.tags.length === 1 ? '' : 's'}`), h('span', { class: 'muted small' }, 'Tap a tag for options')),
        groups.name.length ? h('div', { class: 'chips' }, ...groups.name.map(tagBtn)) : null,
        groups.position.length ? h('div', {}, h('div', { class: 'muted small', style: 'margin-bottom:6px' }, 'Positions'), h('div', { class: 'chips' }, ...groups.position.map(tagBtn))) : null,
        groups.number.length ? h('div', {}, h('div', { class: 'muted small', style: 'margin-bottom:6px' }, 'Numbers'), h('div', { class: 'chips' }, ...groups.number.map(tagBtn))) : null,
        h('div', { class: 'addtag row', style: 'flex-wrap:nowrap' }, $tagInput, h('button', { type: 'button', class: 'btn-primary', onclick: () => { const v = $tagInput.value.trim(); if (v) { addTag(v); $tagInput.value = ''; } } }, 'Add'), $sugg),
        h('div', { class: 'small muted' },
          h('div', {}, img.kind === 'archetype' ? 'Type: archetype pic (a picture that represents a number)' : 'Type: chart'),
          h('div', {}, `Taken: ${img.taken_at ? img.taken_at.replace('T', ' ') : 'unknown'}`),
          h('div', {}, img.has_file ? `File: ${fmtBytes(img.size)}, ${img.width}×${img.height}, uploaded ${fmtDate(img.uploaded_at)}` : 'File: not uploaded yet'),
          h('div', { style: 'word-break:break-all' }, img.filename),
          ...img.paths.map((p) => h('div', { style: 'word-break:break-all;padding-left:8px' }, p))));
    };
    draw();
  };

  // ---------- import tags ----------
  routes.import = async function importView() {
    const $file = h('input', { type: 'file', id: 'tagfile' });
    const $pick = h('button', { type: 'button', class: 'btn-primary btn-block', onclick: () => $file.click() }, 'Choose UserTag.backup');
    const $result = h('div', {});
    const $hist = h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Loading history…'));
    $file.addEventListener('change', async () => {
      const f = $file.files[0]; if (!f) return;
      $pick.textContent = 'Importing…'; $pick.disabled = true;
      fill($result, h('p', { class: 'muted' }, `Reading ${f.name} (${fmtBytes(f.size)})…`));
      try {
        const s = await api('/api/import?filename=' + encodeURIComponent(f.name), { method: 'POST', body: f });
        fill($result, h('div', { class: 'card' }, h('h2', { class: 'ok', style: 'margin-top:0' }, 'Import done'),
          stat('Entries in file', s.rows), stat('Images in file', s.images_in_file), stat('Tags in file', s.tags_in_file),
          stat('New images', s.new_images), stat('New tags', s.new_tags), stat('New image–tag links', s.new_links),
          s.skipped_removed ? stat('Skipped (removed by you in the app)', s.skipped_removed) : null,
          h('p', { class: 'muted small' }, s.new_images ? 'Next: go to Upload to add the screenshots for the new images.' : 'Nothing was deleted. Importing the same file again is always safe.')));
        loadHist();
      } catch (err) { fill($result, h('div', { class: 'card' }, h('p', { class: 'err' }, err.message), h('p', { class: 'muted small' }, 'Nothing was changed.'))); }
      $pick.textContent = 'Choose UserTag.backup'; $pick.disabled = false; $file.value = '';
    });
    async function loadHist() {
      try {
        const rows = await api('/api/imports');
        fill($hist, h('h2', { style: 'margin-top:0' }, 'Past imports'), rows.length ? null : h('p', { class: 'muted' }, 'None yet.'),
          ...rows.map((r) => h('div', { class: 'stat small' }, h('span', {}, `${fmtDate(r.imported_at)}`), h('span', { class: 'muted' }, `+${r.new_images} images, +${r.new_tags} tags, +${r.new_links} links`))));
      } catch (err) { fill($hist, h('p', { class: 'err' }, err.message)); }
    }
    render(h('div', { class: 'screen stack' }, pageTop('Import tags'),
      h('div', { class: 'card stack' },
        h('p', {}, 'Pick the UserTag.backup file from your Smart Switch backup. Safe to repeat: new tags are added, nothing is ever deleted.'),
        $file, $pick),
      $result, $hist));
    loadHist();
  };
  const stat = (label, value) => h('div', { class: 'stat' }, h('span', {}, label), h('b', {}, fmtN(value)));
  // Header for pages that hang off Settings: back arrow + title.
  const pageTop = (title, backTo = '#/settings') => h('div', { class: 'pagetop' }, h('a', { class: 'btn iconbtn', href: backTo, 'aria-label': 'Back' }, '‹'), h('h1', {}, title));

  // ---------- upload images ----------
  let activeUpload = null; // the progress card of an upload that is still running
  const warnLeave = (e) => { e.preventDefault(); e.returnValue = 'An upload is still running.'; };
  routes.upload = function uploadView() {
    // No accept filter on purpose: with one, Android opens the photo-gallery picker, which
    // cannot handle thousands of files and has no filename search. Without it, the Files picker opens.
    const $file = h('input', { type: 'file', id: 'imgfiles', multiple: true });
    const $pick = h('button', { type: 'button', class: 'btn-primary btn-block', onclick: () => $file.click() }, 'Choose screenshots');
    const $plan = h('div', {});
    const $missing = h('div', { class: 'card stack' }, h('p', { class: 'muted' }, 'Checking what is still missing…'));
    // Laptop only: pick a whole folder tree (e.g. DCIM). Gallery album folders
    // become tags with the album's exact name.
    const $dir = h('input', { type: 'file', id: 'dirfiles', multiple: true, webkitdirectory: true });
    const $pickDir = h('button', { type: 'button', class: 'btn-block', onclick: () => $dir.click() }, 'Import album folders (laptop)');
    // Archetype pics: albums like "15 pics" or "69 and 96 pics". Every picture
    // inside represents the number(s) in the folder name. Not charts.
    const $arch = h('input', { type: 'file', id: 'archfiles', multiple: true, webkitdirectory: true });
    const $pickArch = h('button', { type: 'button', class: 'btn-block', onclick: () => $arch.click() }, 'Import archetype pics (laptop)');
    render(h('div', { class: 'screen stack' }, pageTop('Upload screenshots'),
      h('div', { class: 'card stack' },
        h('p', {}, 'Only files named in the tag file are sent; everything else is skipped on the phone. Files already here are skipped too, so you can stop and come back any time.'),
        $file, $pick,
        h('p', { class: 'muted small', style: 'margin-top:14px' }, 'On a laptop you can also pick a folder of Gallery albums. Every album folder becomes a tag on the charts inside it: "12 Mind Center" becomes 12mc, any other album keeps its exact name.'),
        $dir, $pickDir,
        h('p', { class: 'muted small', style: 'margin-top:14px' }, 'Archetype pics are pictures that represent a number, kept apart from charts. Pick the folder that holds albums like "15 pics"; every picture inside gets the number(s) in the album name as tags.'),
        $arch, $pickArch),
      $plan, $missing));
    $file.addEventListener('change', () => plan([...$file.files]));
    $dir.addEventListener('change', () => planFolders([...$dir.files], 'chart'));
    $arch.addEventListener('change', () => planFolders([...$arch.files], 'archetype'));
    if (activeUpload) fill($plan, activeUpload.card); // an upload is still running: show its progress again
    showMissing();

    const IMG_RE = /\.(jpe?g|png|webp)$/i;
    // Album folder name -> tag. "9 Mind Center" is how the owner names the
    // album; "9mc" is how they tag the same thing on a picture.
    const albumTag = (folder) => { const m = /^(\d+)\s*mind\s*cent(er|re)$/i.exec(folder.trim()); return m ? `${m[1]}mc` : folder.trim(); };
    const NOT_ALBUMS = new Set(['Screenshots', 'Camera', 'DCIM', '.thumbnails']);
    // "69 and 96 pics" -> ["69", "96"]; a folder with no number keeps its name as the tag
    const archTags = (folder) => { const nums = folder.match(/\d+/g); return nums && nums.length ? [...new Set(nums)] : [folder.trim()]; };
    async function planFolders(files, kind) {
      const isArch = kind === 'archetype';
      const tagsFor = (folder) => (isArch ? archTags(folder) : [albumTag(folder)]);
      if (!files.length) return;
      const groups = new Map();
      for (const f of files) {
        if (!IMG_RE.test(f.name)) continue;
        const parts = (f.webkitRelativePath || f.name).split('/');
        const folder = parts.length >= 2 ? parts[parts.length - 2] : '(no folder)';
        if (!groups.has(folder)) groups.set(folder, []);
        groups.get(folder).push(f);
      }
      if (!groups.size) { fill($plan, h('div', { class: 'card' }, h('p', { class: 'err' }, 'No pictures found in that folder.'))); return; }
      const rows = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
      const boxes = new Map();
      const $table = h('div', {}, ...rows.map(([folder, list]) => {
        const defaultOn = isArch ? list.length <= 1500 : (!NOT_ALBUMS.has(folder) && list.length <= 1500);
        const cb = h('input', { type: 'checkbox', style: 'width:26px;height:26px', checked: defaultOn });
        boxes.set(folder, cb);
        return h('label', { class: 'stat', style: 'gap:12px;cursor:pointer' }, h('span', { class: 'row', style: 'flex-wrap:nowrap' }, cb, h('span', {}, folder, ' ', ...tagsFor(folder).map((t) => h('span', { class: `chip ${kindOf(t)}`, style: 'min-height:30px;font-size:14px;pointer-events:none;margin-right:4px' }, t)))), h('b', {}, fmtN(list.length)));
      }));
      const $start = h('button', { type: 'button', class: 'btn-primary btn-block', onclick: async () => {
        const albumOf = new Map();
        const todo = [], plain = [];
        for (const [folder, list] of rows) {
          if (boxes.get(folder).checked) for (const f of list) { albumOf.set(f, { album: folder, tags: tagsFor(folder), kind }); todo.push(f); }
          else if (!isArch) plain.push(...list);
        }
        // Unticked chart folders use the normal rule: only files named in the tag file.
        let extra = [];
        if (plain.length) {
          fill($plan, h('div', { class: 'card' }, h('p', {}, `Checking ${fmtN(plain.length)} files from unticked folders against the tag file…`)));
          const byName = new Map(); for (const f of plain) if (!byName.has(f.name)) byName.set(f.name, f);
          const names = [...byName.keys()];
          try {
            for (let i = 0; i < names.length; i += 500) { const r = await postJson('/api/upload/check', { names: names.slice(i, i + 500) }); extra.push(...r.wanted.map((n) => byName.get(n))); }
          } catch (err) { fill($plan, h('div', { class: 'card' }, h('p', { class: 'err' }, err.message))); return; }
        }
        run([...todo, ...extra], albumOf);
      } }, 'Start');
      fill($plan, h('div', { class: 'card stack' },
        h('p', {}, isArch
          ? `Found ${fmtN(rows.length)} albums of archetype pics. Every picture in a ticked album is added as an archetype pic with the tags shown next to it. Unticked albums are skipped.`
          : `Found ${fmtN(rows.length)} folders. Ticked folders are chart albums: every picture in them is added and gets the tag shown next to the folder. "9 Mind Center" becomes 9mc. Unticked folders only contribute files named in the tag file.`),
        $table,
        isArch ? null : h('p', { class: 'muted small' }, 'Screenshots and Camera are unticked on purpose. Untick anything else that is not charts.'),
        $start));
    }

    // The phone's file picker cannot hand over thousands of files at once, so
    // show what is still missing in chunks, with the text to type in the
    // picker's search box to select one chunk at a time.
    async function showMissing() {
      try {
        const s = await api('/api/status');
        if (!s.missing_count) { fill($missing, h('p', { class: 'ok' }, 'Every tagged chart has its screenshot. Nothing is missing.')); return; }
        const groups = new Map();
        for (const m of s.missing) {
          const mt = /^Screenshot_(\d{6})/.exec(m.filename);
          const key = mt ? `Screenshot_${mt[1]}` : 'other';
          groups.set(key, (groups.get(key) || 0) + 1);
        }
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const label = (k) => `${MONTHS[Number(k.slice(15, 17)) - 1] || '?'} ${k.slice(11, 15)}`;
        fill($missing, 
          h('h2', { style: 'margin-top:0' }, `${fmtN(s.missing_count)} still missing`),
          h('p', { class: 'muted small' }, 'One month at a time: tap Choose screenshots, tap the search in the picker, type one code below, select all results, tap Done, then tap Upload. Each code is a year and month.'),
          ...[...groups.entries()].sort().map(([k, n]) => h('div', { class: 'stat' },
            k === 'other' ? h('span', {}, 'Not screenshots (Charts, Camera, WhatsApp folders)') : h('span', {}, h('code', { style: 'font-size:17px' }, k), h('span', { class: 'muted small' }, ` ${label(k)}`)),
            h('b', {}, fmtN(n)))));
      } catch (err) { fill($missing, h('p', { class: 'err' }, err.message)); }
    }

    async function plan(files) {
      if (!files.length) return;
      fill($plan, h('div', { class: 'card' }, h('p', {}, `Checking ${fmtN(files.length)} files against the tag file…`)));
      const byName = new Map(); for (const f of files) if (!byName.has(f.name)) byName.set(f.name, f);
      const names = [...byName.keys()];
      let wanted = [], already = 0, unknown = 0;
      try {
        for (let i = 0; i < names.length; i += 500) {
          const r = await postJson('/api/upload/check', { names: names.slice(i, i + 500) });
          wanted.push(...r.wanted); already += r.already; unknown += r.unknown;
        }
      } catch (err) { fill($plan, h('div', { class: 'card' }, h('p', { class: 'err' }, err.message))); return; }
      const todo = wanted.map((n) => byName.get(n));
      const $start = h('button', { type: 'button', class: 'btn-primary btn-block', disabled: !todo.length, onclick: () => run(todo) }, todo.length ? `Upload ${fmtN(todo.length)} file${todo.length === 1 ? '' : 's'}` : 'Nothing to upload');
      fill($plan, h('div', { class: 'card stack' },
        stat('Files you picked', files.length), stat('Charts to upload now', todo.length), stat('Already uploaded (skipped)', already), stat('Not in the tag file (skipped)', unknown),
        h('p', { class: 'muted small' }, 'Keep this screen open while it runs. If it stops, just pick the files again: it continues where it left off.'),
        $start));
    }

    async function run(todo, albumOf = new Map()) {
      const total = todo.length, totalBytes = todo.reduce((s, f) => s + f.size, 0);
      let doneN = 0, doneBytes = 0, failed = [], skipped = 0, stopped = false;
      const $bar = h('div', { class: 'bar' }, h('div', {}));
      const $line = h('div', {}, 'Starting…');
      const $cur = h('div', { class: 'muted small', style: 'word-break:break-all' });
      const $fails = h('div', { class: 'filelist' });
      const $stop = h('button', { type: 'button', class: 'btn-block', onclick: () => { stopped = true; $stop.disabled = true; $stop.textContent = 'Stopping after the current file…'; } }, 'Stop');
      const card = h('div', { class: 'card stack' }, $line, $bar, $cur, $stop, $fails);
      activeUpload = { card };
      fill($plan, card);
      window.addEventListener('beforeunload', warnLeave);
      let lock = null;
      try { lock = await navigator.wakeLock?.request('screen'); } catch {}
      const update = () => {
        $bar.firstChild.style.width = `${Math.round((doneBytes / Math.max(totalBytes, 1)) * 100)}%`;
        $line.textContent = `${fmtN(doneN)} of ${fmtN(total)} uploaded (${fmtBytes(doneBytes)} of ${fmtBytes(totalBytes)})${failed.length ? `, ${failed.length} failed` : ''}`;
      };
      const waitOnline = () => new Promise((r) => { if (navigator.onLine !== false) return r(); $cur.textContent = 'No connection. Waiting…'; window.addEventListener('online', () => r(), { once: true }); });
      const sha256 = async (f) => { try { const d = await crypto.subtle.digest('SHA-256', await f.arrayBuffer()); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join(''); } catch { return null; } };
      async function sendOne(f) {
        for (let attempt = 1; attempt <= 6; attempt++) {
          await waitOnline();
          try {
            const hash = await sha256(f);
            const res = await fetch('/api/upload/file?name=' + encodeURIComponent(f.name), { method: 'PUT', credentials: 'same-origin', headers: { 'content-type': f.type || 'application/octet-stream', ...(hash ? { 'x-sha256': hash } : {}) }, body: f });
            if (res.status === 401) { showLogin(); throw new Error('logged out'); }
            const b = await res.json().catch(() => ({}));
            if (res.ok) { if (b.already) skipped++; return; }
            if (res.status === 404 || res.status === 413 || (res.status === 400 && !/damaged|cut off/.test(b.error || ''))) throw Object.assign(new Error(b.error || `Error ${res.status}`), { final: true });
            throw new Error(b.error || `Error ${res.status}`);
          } catch (err) {
            if (err.final || err.message === 'logged out' || attempt === 6) throw err;
            $cur.textContent = `Problem with ${f.name}: ${err.message}. Retrying…`;
            await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 20000)));
          }
        }
      }
      const queue = [...todo];
      async function worker() {
        while (queue.length && !stopped) {
          const f = queue.shift();
          $cur.textContent = `Sending ${f.name} (${fmtBytes(f.size)})`;
          try {
            const album = albumOf.get(f);
            if (album) {
              const m = await postJson('/api/album/mark', { filename: f.name, album: album.album, tags: album.tags, kind: album.kind });
              if (m.has_file) { skipped++; doneN++; doneBytes += f.size; update(); continue; }
            }
            await sendOne(f);
          } catch (err) { failed.push(f); $fails.append(h('div', { class: 'err' }, `${f.name}: ${err.message}`)); if (err.message === 'logged out') return; }
          doneN++; doneBytes += f.size; update();
        }
      }
      update();
      await Promise.all([worker(), worker()]);
      activeUpload = null;
      window.removeEventListener('beforeunload', warnLeave);
      try { await lock?.release(); } catch {}
      const ok = doneN - failed.length;
      $cur.textContent = '';
      $stop.replaceWith(h('div', { class: 'stack' },
        h('p', { class: failed.length ? 'err' : 'ok' }, stopped ? `Stopped. ${fmtN(ok)} uploaded so far.` : failed.length ? `Finished with ${failed.length} failure${failed.length === 1 ? '' : 's'}. ${fmtN(ok)} uploaded.` : `All done: ${fmtN(ok)} uploaded.`),
        failed.length ? h('button', { type: 'button', class: 'btn-primary btn-block', onclick: () => run(failed, albumOf) }, `Retry ${failed.length} failed`) : null,
        h('a', { class: 'btn btn-block', href: '#/' }, 'Go to Browse'),
        h('a', { class: 'btn btn-block', href: '#/status' }, 'See what is still missing')));
      showMissing();
    }
  };

  // ---------- settings ----------
  routes.settings = function settingsView() {
    render(h('div', { class: 'screen stack' }, pageTop('Settings', '#/'),
      h('a', { class: 'btn btn-block', href: '#/quick', style: 'justify-content:space-between' }, 'Quick chart', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/upload', style: 'justify-content:space-between' }, 'Upload screenshots', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/import', style: 'justify-content:space-between' }, 'Import tags', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/status', style: 'justify-content:space-between' }, 'Status and backup', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/?kind=archetype', style: 'justify-content:space-between' }, 'Archetype pics', h('span', { class: 'muted' }, '›'))));
  };

  // ---------- quick chart ----------
  // Type a birth date and a name, see the numeroscope at once. Shapes and
  // positions are copied from the paid tool's screenshots (same proportions);
  // the math is public/numeroscope.js. Number colors come later.
  const SVGNS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs = {}, ...children) => {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined && v !== false) el.setAttribute(k, v);
    for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  };
  // Layout of the quick chart, in drawing units. Every number below was measured on the paid
  // tool's screenshots (the owner's own chart in the vault): the orange diamond's top is y=357,
  // its center x=371, its height 756. Text y values are baselines.
  const L = Numeroscope.LAYOUT;
  // One rhombus with its two circles, white center line, pillar triangle and (optionally) the faded "big" circle.
  function rhombusShape(cx, cy, hw, hh, fill, o) {
    const g = sv('g');
    g.append(sv('polygon', { points: `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`, fill }));
    g.append(sv('rect', { x: cx - hw, y: cy - o.line / 2, width: hw * 2, height: o.line, fill: '#fff' }));
    g.append(sv('circle', { cx, cy: cy - o.up, r: o.r, fill: '#fff' }), sv('circle', { cx, cy: cy + (o.down || o.up), r: o.r, fill: '#fff' }));
    g.append(sv('polygon', { points: `${cx},${o.tri[0]} ${cx + o.tri[2]},${o.tri[1]} ${cx - o.tri[2]},${o.tri[1]}`, fill }));
    if (o.big) g.append(sv('circle', { cx: o.big[0], cy: o.big[1], r: o.big[2], fill: o.faded }));
    return g;
  }
  function numeroscopeSvg(data) {
    const svg = sv('svg', { viewBox: '-32 20 806 1270', class: 'nscope', role: 'img', 'aria-label': 'Numeroscope' });
    const M = L.main, H = L.hex, P = L.psy, S = L.sub;
    // Essence shape: a cube seen from the front, light top and sides, dark front triangle, tinted circles.
    svg.append(sv('polygon', { points: `371,${H.top} ${371 + H.hw},${H.ul} ${371 - H.hw},${H.ul}`, fill: '#ced0e5' }),
      sv('polygon', { points: `${371 - H.hw},${H.ul} ${371 - H.hw},${H.ll} 371,${H.bottom}`, fill: '#ced0e5' }), sv('polygon', { points: `${371 + H.hw},${H.ul} ${371 + H.hw},${H.ll} 371,${H.bottom}`, fill: '#ced0e5' }),
      sv('polygon', { points: `${371 - H.hw},${H.ul} ${371 + H.hw},${H.ul} 371,${H.bottom}`, fill: '#afafd5' }),
      sv('circle', { cx: 371, cy: H.circle[0], r: H.circle[1], fill: '#efeff7' }), sv('circle', { cx: 371, cy: H.small[0], r: H.small[1], fill: '#d6d7eb' }));
    for (const [cx, fill] of [[P.cxL, '#dde6ef'], [P.cxR, '#c3d5e1']]) svg.append(rhombusShape(cx, P.cy, P.hw, P.hh, fill, { line: P.line, up: P.up, r: P.r, tri: P.tri }));
    svg.append(rhombusShape(M.cx, M.lineY, M.hw, M.hh, '#eec186', { line: M.line, up: M.circleUp, down: M.circleDown, r: M.r, tri: M.tri, big: M.big, faded: '#f5efe3' }));
    svg.append(rhombusShape(S.left.cx, S.cy, S.hw, S.hh, '#faddd7', { line: S.line, up: S.up, down: S.down, r: S.r, tri: S.tri, big: [S.left.bigX, S.bigY, S.bigR], faded: '#fef0ed' }));
    svg.append(rhombusShape(S.right.cx, S.cy, S.hw, S.hh, '#dae7e0', { line: S.line, up: S.up, down: S.down, r: S.r, tri: S.tri, big: [S.right.bigX, S.bigY, S.bigR], faded: '#f6f8f7' }));
    svg.append(sv('circle', { cx: M.letter[0], cy: M.letter[1], r: M.letter[2], fill: '#fff', stroke: '#a9c3e4', 'stroke-width': 2.5 }));

    const txt = (x, y, v, cls, size, anchor) => (v ? sv('text', { x, y, class: cls, 'font-size': size, 'text-anchor': anchor || 'middle' }, typeof v === 'string' ? v : v.text) : null);
    // Color of one number: the paid tool's choice for that position and value (number-colors.js).
    const oneMiddle = data.name.middle.length === 1;
    const tone = (slot, v, bold) => 'n-' + NumberColors.lookup(slot, typeof v === 'string' ? v : (v ? v.text : ''), oneMiddle) + (bold ? ' n-bold' : '');
    // x offsets of n items on one row: one at the center, two at the measured pair, more spread evenly across it.
    const spread = (n, pair, i) => (n <= 1 || !pair ? 0 : pair[0] + (pair[1] - pair[0]) * i / (n - 1));
    // The numbers of one rhombus. pre = the position prefix in number-colors.js ('' main, 'c.' consonants,
    // 'v.' vowels, 'po.' / 'pi.' psyche), t = that chart's text layout, cx its center, top the day (or null).
    const numbers = (pre, c, t, cx, top) => {
      const sd = t.sideDx || 0, aL = t.auraL ?? cx - t.auraDx + sd, aR = t.auraR ?? cx + t.auraDx + sd, an = t.auraAnchor;
      const nL = t.nameL ?? cx + t.nameDxL + sd, nR = t.nameR ?? cx + t.nameDxR + sd, lineBold = pre === '';
      return [
        txt(cx, t.dvY, top, tone(pre + 'day', top, pre === ''), t.day),
        c.upperLeft && txt(aL, t.upY, c.upperLeft, tone(pre + 'ul', c.upperLeft), t.small, an), c.upperRight && txt(aR, t.upY, c.upperRight, tone(pre + 'ur', c.upperRight), t.small, an),
        c.heart && txt(cx, t.heartY, c.heart, tone(pre + 'heart', c.heart, true), t.heart),
        ...c.heartExtra.map((v, i) => txt(cx + spread(c.heartExtra.length, t.extra2, i), t.heartY + t.extraUp, v, tone(pre + 'heartExtra', v), t.extra)),
        t.spineX && c.spine && txt(t.spineX, t.spineY, c.spine, tone(pre + 'spine', c.spine), t.small),
        c.first && txt(nL, t.nameY, c.first.text, 'n-dark', t.name), c.first && txt(nL, t.lineY, c.first.value, tone(pre + 'first', c.first.value, lineBold), t.lineFont),
        ...c.middle.flatMap((w, i) => { const x = t.middle2 && c.middle.length <= 2 ? cx + spread(c.middle.length, t.middle2, i) : nL + (nR - nL) * (i + 1) / (c.middle.length + 1); return [txt(x, t.nameY, w.text, 'n-dark', t.name), txt(x, t.lineY, w.value, tone(pre + 'middle', w.value, lineBold), t.lineFont)]; }),
        c.last && txt(nR, t.nameY, c.last.text, 'n-dark', t.name), c.last && txt(nR, t.lineY, c.last.value, tone(pre + 'last', c.last.value, lineBold), t.lineFont),
        c.lowerLeft && txt(aL, t.lowY, c.lowerLeft, tone(pre + 'll', c.lowerLeft), t.small, an), c.lowerRight && txt(aR, t.lowY, c.lowerRight, tone(pre + 'lr', c.lowerRight), t.small, an),
        c.solar && txt(cx, t.solarY, c.solar, tone(pre + 'solar', c.solar, true), t.solar || t.heart),
        ...c.solarExtra.map((v, i) => txt(cx + spread(c.solarExtra.length, t.solarExtra2, i), t.solarY + t.extraDown, v, tone(pre + 'solarExtra', v), t.extra)),
        t.bigX !== undefined && c.big && txt(t.bigX, t.leY, c.big, tone(pre + 'big', c.big, true), t.le), c.le && txt(cx, t.leY, c.le, tone(pre + 'le', c.le, true), t.le),
        c.pillar && txt(cx, t.pillarY, c.pillar, tone(pre + 'pillar', c.pillar, t.pillarBold !== false), t.pillar),
        // Main chart only: an invisible tap target over each name and its value opens that word's own charts.
        ...(lineBold ? [c.first && tap(nL, c.first), ...c.middle.map((w, i) => tap(t.middle2 && c.middle.length <= 2 ? cx + spread(c.middle.length, t.middle2, i) : nL + (nR - nL) * (i + 1) / (c.middle.length + 1), w)), c.last && tap(nR, c.last)] : []),
      ];
    };
    const tap = (x, w) => sv('rect', { x: x - 50, y: L.main.text.nameY - 32, width: 100, height: 88, fill: 'transparent', class: 'n-tap', 'data-word': w.text, role: 'button', 'aria-label': `Charts of the name ${w.text}` });
    const day = data.essence.day;
    svg.append(...numbers('', data.name, { ...M.text, bigX: M.big[0] }, M.cx, day).filter(Boolean));
    svg.append(...numbers('c.', data.consonants, { ...S.text, ...S.left }, S.left.cx, day).filter(Boolean), ...numbers('v.', data.vowels, { ...S.text, ...S.right }, S.right.cx, day).filter(Boolean));
    svg.append(txt(M.letter[0], M.text.letterY, data.name.letters ? String(data.name.letters) : null, 'n-blue n-bold', M.text.letterFont));
    // Psyche charts: outer psyche in the left blue diamond, inner in the right (confirmed on vault screenshots).
    const bare = (c) => ({ ...c, big: null, middle: [], heartExtra: [], solarExtra: [], first: c.first && { text: '', value: c.first.value }, last: c.last && { text: '', value: c.last.value } });
    svg.append(...numbers('po.', bare(data.psyche.outer), { ...P.text, sideDx: P.sideDxL }, P.cxL, day).filter(Boolean), ...numbers('pi.', bare(data.psyche.inner), { ...P.text, sideDx: P.sideDxR }, P.cxR, day).filter(Boolean));
    // Essence numbers: top aura inside the top of the shape, month and year outside the upper corners,
    // little and big life path in the circle, outer and inner auras beside it. The small circle stays empty.
    const e = data.essence, T = H.text;
    // little and big life path in the circle, outer and inner auras beside it. All dark in the paid tool.
    svg.append(txt(371, T.topAuraY, e.topAura, 'n-dark', T.corner), txt(T.monthX, T.monthY, e.month, 'n-dark n-bold', T.corner), txt(T.yearX, T.monthY, e.year, 'n-dark n-bold', T.corner),
      txt(T.auraL, T.auraY, e.outerAura, 'n-dark', T.aura), txt(T.auraR, T.auraY, e.innerAura, 'n-dark', T.aura),
      txt(371, T.lpY, e.littleLp, 'n-dark n-bold', T.lp), txt(371, T.bigLpY, e.bigLp, 'n-dark n-bold', T.lp));
    return svg;
  }
  // One word's own charts (Module 12): the numeroscope with every letter as a name, its vowel
  // (vocation) and consonant (personality) charts, the number pyramid and its tension weight.
  // Drawn in its own 400x440 box; the small charts are the same drawing at a smaller width.
  function singleNameSvg(c, pre, count, day) {
    const cx = 200, cy = 240, hw = 150, hh = 205, up = 80, r = 60, stroke = '#8fb4d9';
    const svg = sv('svg', { viewBox: '0 0 400 540', class: 'nscope single', role: 'img', 'aria-label': 'Single name chart' });
    svg.append(sv('polygon', { points: `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`, fill: '#fff', stroke, 'stroke-width': 2.5 }),
      sv('line', { x1: cx - hw, y1: cy, x2: cx + hw, y2: cy, stroke, 'stroke-width': 2.5 }),
      sv('circle', { cx, cy: cy - up, r, fill: '#fff', stroke: '#cfe0f0', 'stroke-width': 2 }), sv('circle', { cx, cy: cy + up, r, fill: '#fff', stroke: '#cfe0f0', 'stroke-width': 2 }),
      sv('circle', { cx, cy: cy + hh + 28, r: 25, fill: '#f0f0f4' }), sv('polygon', { points: `${cx},${cy + hh + 56} ${cx + 22},${cy + hh + 86} ${cx - 22},${cy + hh + 86}`, fill: '#dde6ef' }),
      sv('circle', { cx: cx + hw * 0.74, cy: cy - hh + 14, r: 17, fill: '#fff', stroke: '#c7c7cf', 'stroke-width': 2 }));
    const txt = (x, y, v, cls, size, anchor) => (v ? sv('text', { x, y, class: cls, 'font-size': size, 'text-anchor': anchor || 'middle' }, typeof v === 'string' ? v : v.text) : null);
    const tone = (slot, v, bold) => 'n-' + NumberColors.lookup(slot, v ? v.text : '', false) + (bold ? ' n-bold' : '');
    const plain = (vals) => vals.map((v) => String(v.sum)).join('  ');
    const letters = c.words, n = letters.length, span = hw * 0.78;
    const xAt = (i) => (n <= 1 ? cx : cx - span + 2 * span * i / (n - 1));
    const hasX = c.heartExtra.length > 0, hasS = c.solarExtra.length > 0;
    svg.append(...[
      day && txt(cx, cy - hh - 14, day, 'n-gray', 21),
      count ? txt(cx + hw * 0.74, cy - hh + 20, String(count), 'n-gray n-bold', 17) : null,
      c.upperLeft && txt(cx - hw * 0.56, cy - hh * 0.46, c.upperLeft, tone(pre + 'ul', c.upperLeft), 21, 'end'), c.upperRight && txt(cx + hw * 0.56, cy - hh * 0.46, c.upperRight, tone(pre + 'ur', c.upperRight), 21, 'start'),
      c.heart && txt(cx, cy - up + (hasX ? -2 : 9), c.heart, tone(pre + 'heart', c.heart, true), 26),
      hasX && txt(cx, cy - up + 22, plain(c.heartExtra), tone(pre + 'heartExtra', c.heartExtra[0]), 14),
      ...letters.flatMap((w, i) => [txt(xAt(i), cy - 7, w.text, 'n-dark', 22), txt(xAt(i), cy + 21, String(w.value.sum), 'n-dark' + (i === 0 || i === n - 1 ? ' n-bold' : ''), 20)]),
      c.lowerLeft && txt(cx - hw * 0.56, cy + hh * 0.46 + 8, c.lowerLeft, tone(pre + 'll', c.lowerLeft), 21, 'end'), c.lowerRight && txt(cx + hw * 0.56, cy + hh * 0.46 + 8, c.lowerRight, tone(pre + 'lr', c.lowerRight), 21, 'start'),
      c.solar && txt(cx, cy + up + (hasS ? -1 : 9), c.solar, tone(pre + 'solar', c.solar, true), 26),
      hasS && txt(cx, cy + up + 23, plain(c.solarExtra), tone(pre + 'solarExtra', c.solarExtra[0]), 14),
      c.le && txt(cx, cy + hh + 36, c.le, tone(pre + 'le', c.le, true), 24),
      c.pillar && txt(cx, cy + hh + 82, c.pillar, 'n-gray', 15),
    ].filter(Boolean));
    return svg;
  }
  const fmtW = (x) => String(Number(x.toFixed(5)));
  function pyramidEl(r) {
    const rows = r.pyramid.slice().reverse();
    const W = r.weight, topCell = W.top;
    const cls = (v, i) => { const t = Numeroscope.TENSION[v.sum]; return 'n-' + (v.sum < 10 ? 'dark' : NumberColors.lookup('first', v.text, false)) + (t ? (i === 0 ? ' top-tense' : ' tense') : ''); };
    return h('div', { class: 'pyr' },
      ...rows.map((row, i) => h('div', { class: 'pyr-row' }, ...row.map((v) => h('span', { class: cls(v, i) }, i === rows.length - 1 ? String(v.sum) : v.text)))),
      h('div', { class: 'pyr-row letters' }, ...r.name.words.map((w) => h('span', {}, w.text))),
      topCell && Numeroscope.TENSION[topCell.sum] ? h('p', { class: 'err small', style: 'margin:8px 0 0' }, `The top of the pyramid is ${topCell.text}: ${fmtW(W.penalty)} penalty points added.`) : null);
  }
  function weightEl(W) {
    const row = (label, count, weight) => h('div', { class: 'wrow' + (count ? '' : ' muted') }, h('span', {}, label), h('span', {}, `× ${count}`), h('b', {}, fmtW(weight)));
    return h('div', { class: 'card wtable' },
      h('div', { class: 'wrow head muted small' }, h('span', {}, 'In the pyramid'), h('span', {}, 'Count'), h('span', {}, 'Weight')),
      ...W.numbers.map((x) => row(x.value.text, x.count, x.weight)),
      ...W.combos.map((x) => row(`${x.made.sum} from ${x.a.sum} + ${x.b.sum}`, x.count, x.weight)),
      W.penalty ? row(`${W.top.text} on top, penalty`, 1, W.penalty) : null,
      h('div', { class: 'wrow total' }, h('span', {}, 'Total weight'), h('span', {}), h('b', {}, fmtW(W.total))),
      h('div', { class: 'wrow total' }, h('span', {}, 'Total ratio'), h('span', {}, `${fmtW(W.total)} / ${W.cells}`), h('b', { class: W.approved ? 'ok' : 'err' }, W.ratio.toFixed(3))),
      h('p', { class: 'muted small', style: 'margin:8px 0 0' }, W.approved ? 'Under 0.3: the name is approved.' : '0.3 or over: the name is not approved.'));
  }
  // The popup for one word of the name line: pyramid first with its weight, then the word's own chart,
  // then its vocation and personality charts. The full weight table stays behind "Details".
  function openWord(word, day) {
    const r = Numeroscope.singleName(word, day);
    if (!r.letters) return;
    day = day && day.text ? day : null;
    const close = () => { $pop.remove(); overlays = overlays.filter((o) => o !== $pop); document.body.classList.remove('noscroll'); window.removeEventListener('keydown', keys); };
    const keys = (e) => { if (e.key === 'Escape') close(); };
    const W = r.weight;
    const $table = h('div', { class: 'hidden' }, weightEl(W));
    const $more = h('button', { type: 'button', class: 'linkbtn', onclick: () => { $table.classList.toggle('hidden'); $more.textContent = $table.classList.contains('hidden') ? 'Details' : 'Hide details'; } }, 'Details');
    const small = (title, c, pre) => h('div', { class: 'wcard' }, h('div', { class: 'wlabel' }, title), singleNameSvg(c, pre, c.words.length, day));
    const $pop = h('div', { class: 'wordpop' },
      h('div', { class: 'pagetop' }, h('button', { type: 'button', class: 'btn iconbtn', 'aria-label': 'Close', onclick: close }, '‹'), h('h1', {}, word), h('span', { class: 'muted small' }, `${r.letters} letters`)),
      h('div', { class: 'wcard' }, h('div', { class: 'wlabel' }, 'Number pyramid'), pyramidEl(r),
        h('div', { class: 'verdict' },
          h('div', {}, h('span', { class: 'muted small' }, 'Weight'), h('b', {}, fmtW(W.total))),
          h('div', {}, h('span', { class: 'muted small' }, 'Ratio'), h('b', { class: W.approved ? 'ok' : 'err' }, W.ratio.toFixed(3))),
          h('div', {}, h('span', { class: 'muted small' }, W.approved ? 'Under 0.3' : '0.3 or over'), h('b', { class: W.approved ? 'ok' : 'err' }, W.approved ? 'Approved' : 'Not approved')),
          $more),
        $table),
      day ? null : h('p', { class: 'muted small', style: 'margin:0 0 8px' }, 'Type a birth day to see the top half of the charts and the pillars.'),
      h('div', { class: 'wcard' }, h('div', { class: 'wlabel' }, 'Name chart'), singleNameSvg(r.name, '', r.letters, day)),
      h('div', { class: 'two' }, small('Vocation', r.vowels, 'v.'), small('Personality', r.consonants, 'c.')));
    overlays.push($pop); document.body.append($pop); document.body.classList.add('noscroll'); window.addEventListener('keydown', keys);
  }

  // The chart drawing as a PNG (the app's own styles and font inlined, so the picture is what the screen shows).
  let fontData = null;
  async function chartPng(svg, width = 1612) {
    if (!fontData) { const buf = await fetch('/fonts/open-sans.woff2').then((r) => r.arrayBuffer()); fontData = 'data:font/woff2;base64,' + btoa(String.fromCharCode(...new Uint8Array(buf))); }
    const rules = [];
    for (const sheet of document.styleSheets) { try { for (const rule of sheet.cssRules) if (rule.selectorText && rule.selectorText.includes('.nscope')) rules.push(rule.cssText); } catch {} }
    const clone = svg.cloneNode(true);
    const [, , vw, vh] = clone.getAttribute('viewBox').split(' ').map(Number);
    const height = Math.round(width * vh / vw);
    clone.setAttribute('width', width); clone.setAttribute('height', height); clone.setAttribute('xmlns', SVGNS);
    clone.prepend(sv('style', {}, `@font-face{font-family:"Open Sans";src:url(${fontData}) format("woff2");font-weight:300 800}\n${rules.join('\n')}`));
    clone.prepend(sv('rect', { x: -32, y: 20, width: vw, height: vh, fill: '#fff' }));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Could not draw the chart.')); img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
      return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not make the picture.'))), 'image/png'));
    } finally { URL.revokeObjectURL(url); }
  }

  routes.quick = function quickView() {
    const field = (ph, attrs = {}) => h('input', { type: 'text', inputmode: 'numeric', placeholder: ph, autocomplete: 'off', ...attrs });
    const $day = field('day', { maxlength: 2 }), $month = field('month', { maxlength: 2 }), $year = field('year', { maxlength: 4 });
    const $name = h('input', { type: 'text', placeholder: 'Full name', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false' });
    const $chart = h('div', { class: 'nscope-box' });
    let data = null, svg = null;
    const draw = () => {
      data = Numeroscope.numeroscope({ day: $day.value, month: $month.value, year: $year.value, name: $name.value });
      svg = numeroscopeSvg(data); fill($chart, svg);
    };
    $chart.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-word]'); if (t) openWord(t.getAttribute('data-word'), data && data.essence.day); });
    for (const el of [$day, $month, $year, $name]) el.addEventListener('input', draw);
    // The ⋮ menu sits beside the name field, never on the chart: Full screen and Save to vault. Taps outside close it.
    const $full = h('button', { type: 'button', class: 'cmenu-item' }, 'Full screen');
    const $save = h('button', { type: 'button', class: 'cmenu-item' }, 'Save to vault');
    const $menu = h('div', { class: 'cmenu hidden', role: 'menu' }, $full, $save);
    const $dots = h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'More', title: 'More', onclick: (e) => { e.stopPropagation(); $menu.classList.toggle('hidden'); } }, '⋮');
    document.addEventListener('click', (e) => { if (!$menu.contains(e.target)) $menu.classList.add('hidden'); });
    const $home = h('div', { class: 'nscope-home' }, $chart);
    // Full screen: the chart alone, edge to edge, until the X is tapped. The chart element moves into the
    // overlay and back, so what was typed stays. Leaving the screen closes it (route() clears overlays).
    $full.onclick = () => {
      $menu.classList.add('hidden');
      const close = () => { $ov.remove(); overlays = overlays.filter((o) => o !== $ov); document.body.classList.remove('fullscreen'); $home.prepend($chart); window.removeEventListener('keydown', keys); };
      const keys = (e) => { if (e.key === 'Escape') close(); };
      const $ov = h('div', { class: 'nsfull' }, h('button', { type: 'button', class: 'cbtn nsfull-x', 'aria-label': 'Leave full screen', onclick: close }, '×'), $chart);
      overlays.push($ov); document.body.append($ov); document.body.classList.add('fullscreen'); window.addEventListener('keydown', keys);
    };
    // Save to vault: the drawing becomes a chart picture tagged with the typed name, then opens with its tags.
    $save.onclick = async () => {
      const name = $name.value.trim();
      if (!name) { toast('Type a name first.', true); $name.focus(); return; }
      const d = Number($day.value), m = Number($month.value), y = Number($year.value);
      const date = d && m && y >= 1000 ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
      $save.disabled = true; $save.textContent = 'Saving…'; $menu.classList.remove('hidden');
      try {
        const png = await chartPng(svg);
        const r = await api(`/api/quick/save?name=${encodeURIComponent(name)}&date=${date}`, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: png });
        toast(`Saved “${name}” to the vault`);
        go(`#/chart/${r.id}?sheet=1`);
      } catch (err) { toast(err.message, true); $save.disabled = false; $save.textContent = 'Save to vault'; $menu.classList.add('hidden'); }
    };
    render(h('div', { class: 'screen' },
      h('div', { class: 'row', style: 'flex-wrap:nowrap;gap:8px;margin-top:4px' }, h('a', { class: 'btn iconbtn', href: '#/', 'aria-label': 'Back' }, '‹'), $day, $month, $year),
      h('div', { class: 'row qname', style: 'flex-wrap:nowrap;gap:8px;margin-top:8px' }, $name, $dots, $menu), $home));
    draw();
    setTimeout(() => $name.focus(), 50);
  };

  // ---------- status ----------
  routes.status = async function statusView() {
    const $body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Loading…'));
    render(h('div', { class: 'screen' }, pageTop('Status'), $body));
    let s;
    try { s = await api('/api/status'); } catch (err) { fill($body, h('p', { class: 'err' }, err.message)); return; }
    const $backupMsg = h('p', { class: 'muted small' }, s.last_backup ? `Last backup: ${fmtDate(s.last_backup)} (${s.last_backup_result})` : 'No backup made yet. One runs automatically every day.');
    const $missing = h('div', { class: 'filelist hidden' }, ...s.missing.map((m) => h('div', {}, m.filename, m.taken_at ? h('span', { class: 'muted' }, `  ${niceDate(m.taken_at)}`) : null)));
    fill($body, 
      h('div', { class: 'card' },
        stat('Charts with tags', s.images), stat('Screenshots uploaded', s.uploaded),
        s.archetypes ? stat('Archetype pics', s.archetypes) : null,
        h('div', { class: 'stat' }, h('span', {}, 'Tagged but no screenshot yet'), h('b', { class: s.missing_count ? 'err' : 'ok' }, fmtN(s.missing_count))),
        stat('Distinct tags', s.tags), stat('Tags added in the app', s.added_in_app), stat('Tags removed in the app', s.removed_in_app),
        h('div', { class: 'stat' }, h('span', {}, 'Space used by screenshots'), h('b', {}, fmtBytes(s.bytes))),
        s.disk ? h('div', { class: 'stat' }, h('span', {}, 'Free space on server'), h('b', {}, fmtBytes(s.disk.free_bytes))) : null),
      s.lost_files.length ? h('div', { class: 'card' }, h('p', { class: 'err' }, `${s.lost_files.length} file(s) are recorded but missing on disk. Tell Claude about this.`), h('div', { class: 'filelist' }, ...s.lost_files.map((f) => h('div', {}, f)))) : null,
      s.missing_count ? h('div', { class: 'card stack' },
        h('button', { type: 'button', class: 'btn-block', onclick: (e) => { $missing.classList.toggle('hidden'); e.target.textContent = $missing.classList.contains('hidden') ? `Show the ${fmtN(s.missing_count)} missing filenames` : 'Hide list'; } }, `Show the ${fmtN(s.missing_count)} missing filenames`),
        $missing, h('a', { class: 'btn btn-primary btn-block', href: '#/upload' }, 'Upload screenshots')) : null,
      h('div', { class: 'card stack' }, h('h2', { style: 'margin-top:0' }, 'Backup'), $backupMsg,
        h('button', { type: 'button', class: 'btn-block', onclick: async (e) => { e.target.disabled = true; e.target.textContent = 'Backing up…'; try { const r = await api('/api/backup/run', { method: 'POST' }); $backupMsg.textContent = `Last backup: ${fmtDate(r.at)} (${r.result})`; toast('Backup done'); } catch (err) { toast(err.message, true); } e.target.disabled = false; e.target.textContent = 'Back up now'; } }, 'Back up now'),
        h('a', { class: 'btn btn-block', href: '/api/backup/download', download: '' }, `Download everything as one zip (${fmtBytes(s.bytes)})`),
        h('a', { class: 'btn btn-block', href: '/api/export/tags.json', download: '' }, 'Download tags only (small JSON file)')),
      h('div', { class: 'card stack' },
        s.last_import ? h('p', { class: 'muted small' }, `Last tag import: ${fmtDate(s.last_import.imported_at)}, ${fmtN(s.last_import.images_in_file)} images in file`) : h('p', { class: 'muted small' }, 'No tag file imported yet.'),
        h('p', { class: 'muted small' }, `Chart Vault version ${s.version}, build ${s.commit}`),
        s.updates ? h('p', { class: `small ${s.updates.ok ? 'muted' : 'err'}` }, s.updates.note) : null,
        h('button', { type: 'button', class: 'btn-block', onclick: async () => { await api('/api/logout', { method: 'POST' }).catch(() => {}); showLogin(); } }, 'Log out')));
  };

  // ---------- new version notice ----------
  // The build this page was loaded from; a different one on the server means a new version.
  let knownCommit = window.APP_VERSION && window.APP_VERSION !== '__V__' ? window.APP_VERSION : null;
  async function checkVersion() {
    try {
      const hResp = await fetch('/api/health', { credentials: 'same-origin', cache: 'no-store' });
      const hb = await hResp.json();
      if (knownCommit === null) knownCommit = hb.commit;
      else if (hb.commit !== knownCommit && !document.getElementById('newver') && !activeUpload) {
        document.body.append(h('button', { id: 'newver', type: 'button', class: 'btn-primary', onclick: () => location.reload() }, `Updated to build ${hb.commit}, tap to reload`));
      }
    } catch {}
  }
  setInterval(checkVersion, 15_000);
  window.addEventListener('hashchange', checkVersion);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });

  // ---------- start ----------
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js?v=' + (window.APP_VERSION || '0'), { updateViaCache: 'none' }).catch(() => {});
  (async () => {
    try {
      const me = await fetch('/api/me', { credentials: 'same-origin' }).then((r) => r.json());
      if (!me.loggedIn) return showLogin();
      route(); checkVersion();
    } catch { render(h('div', { class: 'screen center' }, h('p', { class: 'err' }, 'Cannot reach the server. Check your connection and reload.'))); }
  })();
})();
