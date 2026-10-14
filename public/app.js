/* Chart Vault – phone-first front end. Plain JavaScript, no build step. */
(() => {
  'use strict';
  const $app = document.getElementById('app');
  const $nav = document.getElementById('nav');
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
      h('span', { class: 't' }, tag.name),
      tag.count !== undefined ? h('span', { class: 'count' }, ` ${fmtN(tag.count)}`) : null,
      removable ? h('span', { class: 'x' }, '×') : null);

  // ---------- routing ----------
  const routes = {};
  function route() {
    const hash = location.hash || '#/';
    const [, name = '', arg = ''] = /^#\/([^/?]*)\/?([^?]*)/.exec(hash) || [];
    const query = new URLSearchParams(hash.split('?')[1] || '');
    const view = routes[name] || routes[''];
    for (const a of $nav.querySelectorAll('a')) a.classList.toggle('active', a.dataset.nav === (name || 'browse'));
    closeOverlays();
    view(arg, query);
  }
  window.addEventListener('hashchange', route);
  const go = (hash) => { location.hash = hash; };
  // Like replaceChildren, but skips null/false so a conditional part never shows as the word "null".
  const fill = (el, ...nodes) => el.replaceChildren(...nodes.filter((n) => n !== null && n !== undefined && n !== false));
  const render = (...nodes) => { fill($app, ...nodes); window.scrollTo(0, 0); };

  // ---------- login ----------
  function showLogin() {
    $nav.classList.add('hidden');
    const $pw = h('input', { type: 'password', placeholder: 'Password', autocomplete: 'current-password', autofocus: true, enterkeyhint: 'go' });
    const $msg = h('p', { class: 'err small' });
    const $btn = h('button', { class: 'btn-primary btn-block', type: 'submit' }, 'Log in');
    const form = h('form', { class: 'stack', style: 'width:100%;max-width:360px', onsubmit: async (e) => {
      e.preventDefault(); $btn.disabled = true; $msg.textContent = '';
      try {
        const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: $pw.value }), credentials: 'same-origin' });
        const b = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(b.error || 'Could not log in.');
        $nav.classList.remove('hidden'); route();
      } catch (err) { $msg.textContent = err.message; $btn.disabled = false; }
    } }, $pw, $btn, $msg);
    render(h('div', { class: 'screen center' }, h('img', { src: '/icons/icon-192.png', width: 96, height: 96, alt: '', style: 'border-radius:22px;margin-bottom:16px' }), h('h1', {}, 'Chart Vault'), form));
    setTimeout(() => $pw.focus(), 50);
  }

  // ---------- overlays (sheet, lightbox) ----------
  let overlays = [];
  function closeOverlays() { for (const o of overlays) o.remove(); overlays = []; }
  function sheet(title, actions) {
    const bg = h('div', { class: 'sheet-bg', onclick: (e) => { if (e.target === bg) close(); } });
    const close = () => { bg.remove(); overlays = overlays.filter((o) => o !== bg); };
    bg.append(h('div', { class: 'sheet' }, h('h3', {}, title),
      ...actions.map((a) => h('button', { type: 'button', class: a.cls || '', onclick: async () => { close(); await a.run(); } }, a.label)),
      h('button', { type: 'button', onclick: close }, 'Cancel')));
    document.body.append(bg); overlays.push(bg);
  }

  // Pinch-to-zoom lightbox using pointer events (works with Samsung Internet and Chrome).
  function lightbox(src) {
    const img = h('img', { src, alt: 'Chart, pinch to zoom', draggable: 'false' });
    const box = h('div', { class: 'lightbox' }, img,
      h('button', { type: 'button', class: 'iconbtn close', 'aria-label': 'Close', onclick: () => close() }, '✕'),
      h('div', { class: 'hint' }, 'Pinch to zoom · double-tap · drag to move'));
    const close = () => { box.remove(); overlays = overlays.filter((o) => o !== box); };
    document.body.append(box); overlays.push(box);

    let scale = 1, tx = 0, ty = 0; // transform: translate(tx,ty) scale(scale) with origin 0 0
    let base = null; // natural layout box of the image at scale 1
    const pointers = new Map();
    let start = null, lastTap = 0;
    const apply = () => { img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
    const measure = () => { img.style.transform = ''; const r = img.getBoundingClientRect(); base = { x: r.left, y: r.top, w: r.width, h: r.height }; apply(); };
    const clamp = () => {
      scale = Math.min(Math.max(scale, 1), 8);
      if (scale === 1) { tx = 0; ty = 0; return; }
      const W = box.clientWidth, H = box.clientHeight;
      const w = base.w * scale, hh = base.h * scale;
      // keep the image covering the viewport where it is bigger than it; centre it where smaller
      const minX = Math.min(0, W - (base.x + w)) - base.x + Math.min(0, 0), maxX = Math.max(0, (W - w) / 2 - base.x);
      const left = base.x + tx, right = left + w;
      if (w <= W) tx = (W - w) / 2 - base.x; else { if (left > 0) tx -= left; if (right < W) tx += W - right; }
      const top = base.y + ty, bottom = top + hh;
      if (hh <= H) ty = (H - hh) / 2 - base.y; else { if (top > 0) ty -= top; if (bottom < H) ty += H - bottom; }
      void minX; void maxX;
    };
    const zoomAt = (cx, cy, factor) => {
      const ns = Math.min(Math.max(scale * factor, 1), 8), k = ns / scale;
      // keep the point under (cx,cy) fixed
      tx = cx - base.x - (cx - base.x - tx) * k; ty = cy - base.y - (cy - base.y - ty) * k; scale = ns; clamp(); apply();
    };
    img.addEventListener('load', measure); if (img.complete) measure();
    window.addEventListener('resize', measure);
    box.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      box.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.values()];
      if (pts.length === 1) {
        const now = Date.now();
        if (now - lastTap < 300) { zoomAt(e.clientX, e.clientY, scale > 1.5 ? 1 / scale : 2.5); lastTap = 0; }
        else lastTap = now;
        start = { tx, ty, x: e.clientX, y: e.clientY, scale };
      } else if (pts.length === 2) {
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
      } else if (pts.length === 1 && start.x !== undefined) {
        if (scale > 1) { tx = start.tx + (e.clientX - start.x); ty = start.ty + (e.clientY - start.y); clamp(); apply(); }
        else if (e.clientY - start.y > 90 && Math.abs(e.clientX - start.x) < 60) close(); // swipe down to close
      }
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      const pts = [...pointers.values()];
      start = pts.length === 1 ? { tx, ty, x: pts[0].x, y: pts[0].y, scale } : null;
    };
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    box.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    box.addEventListener('dblclick', (e) => e.preventDefault());
  }

  // ---------- tag suggestion box ----------
  function suggestBox($input, { within = () => [], onPick, allowNew = false, kind = null }) {
    const $list = h('div', { class: 'suggest hidden' });
    let timer, seq = 0;
    const hide = () => $list.classList.add('hidden');
    const show = (items, q) => {
      fill($list);
      const exact = items.some((t) => t.name === q);
      if (allowNew && q && !exact) $list.append(h('button', { type: 'button', onclick: () => { onPick(q); hide(); } }, h('span', {}, `Add new tag “${q}”`), h('span', { class: 'count' }, 'new')));
      for (const t of items) $list.append(h('button', { type: 'button', onclick: () => { onPick(t.name); hide(); } },
        h('span', { class: `chip ${t.kind}`, style: 'min-height:32px;font-size:15px;pointer-events:none' }, t.name), h('span', { class: 'count' }, `${fmtN(t.count)} chart${t.count === 1 ? '' : 's'}`)));
      $list.classList.toggle('hidden', !$list.children.length);
    };
    const refresh = async () => {
      const q = $input.value.trim(); const my = ++seq;
      const params = new URLSearchParams({ q, limit: 25 }); if (kind) params.set('kind', kind); for (const w of within()) params.append('within', w);
      try { const items = await api('/api/tags?' + params); if (my === seq) show(items, q); } catch {}
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
    const $switch = h('div', { class: 'seg' },
      h('button', { type: 'button', class: kind === 'chart' ? 'on' : '', onclick: () => setTags(tags, 'chart') }, 'Charts'),
      h('button', { type: 'button', class: kind === 'archetype' ? 'on' : '', onclick: () => setTags(tags, 'archetype') }, 'Archetype pics'));
    const $input = h('input', { type: 'search', placeholder: tags.length ? 'Add another tag…' : 'Search tags (12mc, politics, a name…)', autocomplete: 'off', enterkeyhint: 'search' });
    const $sugg = suggestBox($input, { within: () => tags, kind, onPick: (name) => { if (!tags.includes(name)) setTags([...tags, name]); $input.value = ''; } });
    const $clear = h('button', { type: 'button', class: 'clear', 'aria-label': 'Clear', onclick: () => { $input.value = ''; $input.focus(); $sugg.classList.add('hidden'); } }, '×');
    const $filters = h('div', { class: 'filters' }, ...tags.map((t) => chip({ name: t, kind: kindOf(t) }, { active: true, removable: true, onclick: () => setTags(tags.filter((x) => x !== t)) })),
      tags.length > 1 ? h('button', { type: 'button', class: 'chip', onclick: () => setTags([]) }, 'Clear all') : null);
    const $summary = h('div', { class: 'summary' }, 'Loading…');
    const $grid = h('div', { class: 'grid' });
    const $sentinel = h('div', { class: 'sentinel' });
    render(h('div', { class: 'screen' },
      h('div', { class: 'searchbar' }, $switch, h('div', { class: 'searchbox' }, $input, $clear, $sugg), tags.length ? $filters : null, $summary),
      $grid, $sentinel));

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
        $summary.textContent = tags.length ? `${fmtN(total)} ${noun}${total === 1 ? '' : 's'} with ${tags.join(' and ')}` : `${fmtN(total)} ${noun}s, newest first`;
        $sentinel.textContent = done ? (total === 0 ? (kind === 'archetype' && !tags.length ? 'No archetype pics yet. Add them on the Upload page.' : `No ${noun}s match.`) : '') : '';
      } catch (err) { $sentinel.textContent = err.message; }
      loading = false;
    }
    function cell(img) {
      const label = img.kind === 'archetype'
        ? img.tags.map((t) => t.name).join(', ')
        : (img.tags.find((t) => t.kind === 'name') || img.tags[0] || {}).name || '';
      return h('a', { class: 'cell', href: `#/chart/${img.id}` },
        img.has_file ? h('img', { class: 'thumb', src: `/thumb/${img.id}`, loading: 'lazy', alt: label }) : h('div', { class: 'nofile' }, 'no file yet'),
        h('div', { class: `label ${label ? '' : 'muted'}` }, label || img.filename));
    }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) more(); }, { rootMargin: '600px' });
    io.observe($sentinel);
    more();
  };
  const kindOf = (name) => (/^\d+$/.test(name) ? 'number' : /^\d+[A-Za-z]/.test(name) ? 'position' : 'name');

  // ---------- detail ----------
  routes.chart = async function detail(id) {
    const $body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Loading…'));
    render(h('div', { class: 'screen' },
      h('div', { class: 'detail-top' }, h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Back', onclick: () => (history.length > 1 ? history.back() : go('#/')) }, '‹'), h('div', { class: 'title', id: 'dtitle' })),
      $body));
    let img;
    try { img = await api(`/api/images/${id}`); } catch (err) { fill($body, h('p', { class: 'err' }, err.message)); return; }
    document.getElementById('dtitle').textContent = img.filename;
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
        { label: `✕ Remove “${t.name}” from this chart`, cls: 'btn-danger', run: async () => {
          try { const r = await postJson(`/api/images/${img.id}/tags/remove`, { name: t.name }); img = r.image; toast(`Removed “${t.name}”`); draw(); } catch (err) { toast(err.message, true); }
        } },
      ]) });
      fill($body, 
        img.has_file
          ? h('img', { class: 'fullimg', src: `/img/${img.id}`, alt: 'Chart', onclick: () => lightbox(`/img/${img.id}`) })
          : h('div', { class: 'card center', style: 'min-height:30vh' }, h('p', {}, 'No screenshot uploaded for this chart yet.'), h('a', { class: 'btn', href: '#/upload' }, 'Go to Upload')),
        img.has_file ? h('p', { class: 'muted small', style: 'text-align:center;margin:4px 0' }, 'Tap the picture to zoom') : null,
        h('div', { class: 'card stack' },
          h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', {}, `${img.tags.length} tag${img.tags.length === 1 ? '' : 's'}`), h('span', { class: 'muted small' }, 'Tap a tag for options')),
          groups.name.length ? h('div', { class: 'chips' }, ...groups.name.map(tagBtn)) : null,
          groups.position.length ? h('div', {}, h('div', { class: 'muted small', style: 'margin-bottom:6px' }, 'Positions'), h('div', { class: 'chips' }, ...groups.position.map(tagBtn))) : null,
          groups.number.length ? h('div', {}, h('div', { class: 'muted small', style: 'margin-bottom:6px' }, 'Numbers'), h('div', { class: 'chips' }, ...groups.number.map(tagBtn))) : null,
          h('div', { class: 'addtag row', style: 'flex-wrap:nowrap' }, $tagInput, h('button', { type: 'button', class: 'btn-primary', onclick: () => { const v = $tagInput.value.trim(); if (v) { addTag(v); $tagInput.value = ''; } } }, 'Add'), $sugg)),
        h('div', { class: 'card small muted' },
          h('div', {}, img.kind === 'archetype' ? 'Type: archetype pic (a picture that represents a number)' : 'Type: chart'),
          h('div', {}, `Taken: ${img.taken_at ? img.taken_at.replace('T', ' ') : 'unknown'}`),
          h('div', {}, img.has_file ? `File: ${fmtBytes(img.size)}, ${img.width}×${img.height}, uploaded ${fmtDate(img.uploaded_at)}` : 'File: not uploaded yet'),
          h('div', {}, 'Phone paths:'), ...img.paths.map((p) => h('div', { style: 'word-break:break-all;padding-left:8px' }, p))));
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
    render(h('div', { class: 'screen stack' }, h('h1', {}, 'Import tags'),
      h('div', { class: 'card stack' },
        h('p', {}, 'Pick the UserTag.backup file from your Smart Switch backup. Safe to repeat: new tags are added, nothing is ever deleted.'),
        $file, $pick),
      $result, $hist));
    loadHist();
  };
  const stat = (label, value) => h('div', { class: 'stat' }, h('span', {}, label), h('b', {}, fmtN(value)));

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
    render(h('div', { class: 'screen stack' }, h('h1', {}, 'Upload screenshots'),
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

  // ---------- status ----------
  routes.status = async function statusView() {
    const $body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Loading…'));
    render(h('div', { class: 'screen' }, h('h1', {}, 'Status'), $body));
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
      $nav.classList.remove('hidden'); route(); checkVersion();
    } catch { render(h('div', { class: 'screen center' }, h('p', { class: 'err' }, 'Cannot reach the server. Check your connection and reload.'))); }
  })();
})();
