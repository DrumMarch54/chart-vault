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

  // Which buttons and screens get used, shown on Status as "What You Use Most".
  // A NAME and a count only: never what was typed, never a chart, a tag or a
  // filename. Never throws, never waits, so a count can never break a tap.
  // A renamed or removed button changes its name and its label here, same commit.
  const USAGE_LABELS = {
    'screen.home': 'Home Screen', 'screen.chart': 'Chart Viewer', 'screen.settings': 'Settings', 'screen.quick': 'Quick Chart',
    'screen.tags': 'All Tags', 'screen.upload': 'Upload Screenshots', 'screen.import': 'Import Tags', 'screen.status': 'Status and backup',
    'viewer.add_tag': 'Add a tag to a chart', 'quick.save': 'Save a quick chart', 'quick.full_screen': 'Quick Chart full screen',
    'quick.year_rows': 'Year Rows and Day Vibrations', 'quick.show_parts': 'Show and Hide Parts', 'quick.augment': 'Augmentation On or Off', 'status.backup': 'Back up now', 'status.logout': 'Log out',
    'screen.position': 'Search by Position', 'position.search': 'Run a position search', 'home.quick': 'Home → Quick Chart', 'home.position': 'Home → Search by Position', 'viewer.fix_inputs': 'Fix a chart\'s name or date', 'viewer.number_tap': 'Tap a number on a chart', 'status.recompute': 'Recompute chart numbers',
    'viewer.show_screenshot': 'See the original screenshot', 'viewer.show_drawn': 'Back to the drawn chart', 'viewer.name_tap': 'Tap a name on a chart', 'viewer.year_rows': 'Year Rows from a chart',
    'position.search_more': 'Narrow a position search by another number', 'position.add_more': 'Tap + Another number', 'viewer.whole_pyramid': 'Whole Name Pyramid from a chart', 'quick.whole_pyramid': 'Whole Name Pyramid from the Quick Chart',
    'viewer.similar': 'Similar Charts from a chart', 'screen.similar': 'Similar Charts', 'similar.by': 'Similar Charts: rank by one chart', 'similar.compare': 'Similar Charts → Compare',
    'viewer.delete': 'Delete a chart from the chart page', 'duplicates.delete': 'Delete a chart from Possible Duplicates', 'duplicates.keep': 'Keep a duplicate group', 'deleted.restore': 'Put a deleted chart back',
    'screen.duplicates': 'Possible Duplicates', 'screen.deleted': 'Deleted Charts', 'search.position': 'Search box → a position',
    'viewer.meaning': 'Tap a number on a chart for its meaning', 'quick.meaning': 'Tap a number on the Quick Chart for its meaning', 'meaning.show_charts': 'Meaning → show the charts with that number there', 'meaning.course_words': 'Meaning → open the full course words',
  };
  const count = (name) => { try { fetch('/api/usage', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }).catch(() => {}); } catch { /* counting never breaks a tap */ } };

  // How a tag reads on screen ("alexjones" -> "Alex Jones"). The server decides (server/tagnames.js); every tag
  // row it sends carries `display`, and this map remembers them so a bare name (a search in the address, a
  // stored recent search) reads the same way. The stored tag itself never changes.
  const tagNames = new Map();
  try { for (const [k, v] of Object.entries(JSON.parse(localStorage.getItem('tagnames') || '{}'))) tagNames.set(k, v); } catch {}
  const learnTags = (list) => { for (const t of list || []) if (t && t.display && t.display !== t.name) tagNames.set(t.name, t.display); };
  const pretty = (name) => tagNames.get(name) || (TagCodes.parse(name) ? TagCodes.pretty(name) : String(name).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\p{Ll}/u, (c) => c.toUpperCase()));
  let namesLoaded = false;
  const loadTagNames = () => api('/api/tags/names').then((m) => { namesLoaded = true; for (const [k, v] of Object.entries(m)) tagNames.set(k, v); try { localStorage.setItem('tagnames', JSON.stringify(m)); } catch {} }).catch(() => {});
  const chip = (tag, { onclick, active, removable } = {}) =>
    h('button', { class: `chip ${tag.kind || ''} ${active ? 'active' : ''} ${tag.source === 'app' ? 'app' : ''}`, type: 'button', onclick, title: tag.name },
      h('span', { class: 't' }, pretty(tag.name)),
      tag.count !== undefined ? h('span', { class: 'count' }, ` ${fmtN(tag.count)}`) : null,
      removable ? h('span', { class: 'x' }, '×') : null);

  // ---------- search by position: the catalog of positions (plain words, grouped by chart) ----------
  // Fetched once from the server (server/positions.js is the one list); remembered in browser storage so
  // a search in the address or a recent search reads right before the fetch answers.
  let catalog = null;
  try { catalog = JSON.parse(localStorage.getItem('positions') || 'null'); } catch {}
  // fresh: fetch again even when remembered. The picker always does: a list remembered from an older build
  // lacked the `combo` flag, so "4 meets 9" showed no centers at all on the owner's phone (2026-10-17).
  const loadCatalog = async (fresh = false) => { if (catalog && !fresh) return catalog; catalog = await api('/api/positions'); try { localStorage.setItem('positions', JSON.stringify(catalog)); } catch {} return catalog; };
  const chartLabel = (key) => (key === '*' ? 'any chart' : ((catalog && catalog.charts.find((c) => c.key === key)) || {}).label || key);
  const posLabel = (pos) => { const [chart, key = '*'] = String(pos).split('.'); if (key === '*') return chart === '*' ? 'anywhere' : `anywhere in the ${chartLabel(chart).toLowerCase()}`; const p = catalog && catalog.positions.find((x) => x.chart === chart && x.key === key); return `${p ? p.label : key} · ${chartLabel(chart)}`; };
  // "12" reads 12/3; "/3" reads "digit sum 3".
  const numLabel = (num) => { if (/\+/.test(String(num))) return String(num).split('+').map(numLabel).join(' and '); const m = /^(\d+)?(?:\/(\d))?$/.exec(String(num)); if (!m) return String(num); if (!m[1]) return `digit sum ${m[2]}`; const n = Number(m[1]); return n < 10 ? String(n) : `${n}/${TagCodes.digitSum(n)}`; };
  // A position search is a list of conditions [{ pos, num }], all of which a chart must meet (day 8 AND first
  // name 15). The address carries them pairwise (?pos=essence.day&num=8&pos=name.first&num=15).
  const condLabel = (c) => `${numLabel(c.num)} in ${posLabel(c.pos)}`;
  const searchLabel = (conds) => conds.map(condLabel).join(' and ');
  const condsOf = (query) => { const pos = query.getAll('pos'), num = query.getAll('num'); return pos.map((p, i) => ({ pos: p, num: num[i] || '' })).filter((c) => c.pos && c.num); };
  const condsQuery = (conds, more = {}) => { const p = new URLSearchParams(more); for (const c of conds) { p.append('pos', c.pos); p.append('num', c.num); } return p; };
  const positionHash = (conds) => '#/?' + condsQuery(conds);
  const sameConds = (a, b) => a.length === b.length && a.every((c) => b.some((d) => d.pos === c.pos && d.num === c.num));

  // ---------- routing ----------
  const routes = {};
  let lastRoute = null, lastHash = null; // the screen shown before this one (null = this is the first screen since the page loaded)
  let viewerFromApp = false; // the viewer was opened from another screen here, so Back can use the browser's own history
  let underHash = null; // the screen still drawn under the viewer: closing the viewer onto it needs no redraw, so the list keeps its place
  function route() {
    const hash = location.hash || '#/';
    const [, name = '', arg = ''] = /^#\/([^/?]*)\/?([^?]*)/.exec(hash) || [];
    const query = new URLSearchParams(hash.split('?')[1] || '');
    const view = routes[name] || routes[''];
    closeOverlays();
    if (viewerCleanup) { viewerCleanup(); viewerCleanup = null; }
    // The compare screen lies over the same list as the viewer it was opened from, so going between them
    // keeps what the viewer knows about the screen underneath.
    if (name === 'chart' && lastRoute !== 'chart' && lastRoute !== 'compare') { viewerFromApp = lastRoute !== null; underHash = viewerFromApp ? lastHash : null; }
    const keep = name !== 'chart' && lastRoute === 'chart' && underHash === hash;
    lastRoute = name; lastHash = hash;
    count('screen.' + (name || 'home'));
    if (name !== 'chart' && name !== 'compare') underHash = null;
    // The compare bar belongs to the list screen (browse draws it); the viewer and compare screen lie over
    // the list and leave it as is; any other screen replaces the list and hides it.
    if (name !== '' && name !== 'chart' && name !== 'compare') drawCmpBar(false);
    if (keep) return;
    view(arg, query);
  }
  window.addEventListener('hashchange', route);
  // No pull-to-refresh: a finger dragged down at the top of the page reloads the whole app in the browser
  // and loses what was being done. CSS (overscroll-behavior) stops it in most browsers; this stops the rest.
  // A drag inside something that can still scroll up on its own (a sheet, a list, a popup) is left alone.
  let touchY = null;
  const scrollsUp = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowY; if ((o === 'auto' || o === 'scroll') && n.scrollTop > 0) return true; } return false; };
  document.addEventListener('touchstart', (e) => { touchY = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (touchY === null || e.touches.length !== 1 || !e.cancelable) return;
    if (window.scrollY <= 0 && e.touches[0].clientY > touchY && !scrollsUp(e.target)) e.preventDefault();
  }, { passive: false });
  // A screen change asked for while an overlay's own Close is still stepping back through the history
  // (see overlays below) waits for that step, so the new screen lands on top of the right one.
  const go = (hash) => afterOverlayClosed(() => { location.hash = hash; });
  // Same screen change, but without adding a step to the browser's history (used between charts in the
  // viewer, so the phone's Back button returns to the screen the viewer was opened from, not to the last chart).
  const swap = (hash) => afterOverlayClosed(() => { location.replace(hash); });
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
  // Every overlay (a sheet, a popup, the meaning page, the pyramid) is one step in the phone's Back history
  // (owner 2026-10-19: Back closed the whole screen under the popup and landed on the home screen). Opening one
  // pushes a history step; the phone's Back then closes only that overlay. An overlay closed by its own button
  // steps back the same way, so the history never piles up; anything asked for right after (a screen change)
  // waits for that step through afterOverlayClosed.
  let overlays = []; // [{ el, close }], oldest first
  let meaningUi = null; // set once public/meaning.js is installed (bottom of this file)
  let closingAll = false, pendingBack = 0, afterBack = [];
  const trackOverlay = (el, close = null) => { overlays.push({ el, close }); try { history.pushState({ overlay: true }, '', location.href); } catch {} };
  const untrackOverlay = (el) => {
    const wasTop = overlays.length && overlays[overlays.length - 1].el === el;
    overlays = overlays.filter((o) => o.el !== el);
    if (!closingAll && wasTop && history.state && history.state.overlay) { pendingBack++; history.back(); }
  };
  const afterOverlayClosed = (fn) => { if (pendingBack) afterBack.push(fn); else fn(); };
  function closeOverlays() {
    closingAll = true;
    try { for (const o of [...overlays].reverse()) { if (o.close) o.close(); else o.el.remove(); } } finally { closingAll = false; }
    overlays = []; document.body.classList.remove('noscroll');
  }
  window.addEventListener('popstate', () => {
    if (pendingBack) { pendingBack--; if (!pendingBack) { const fns = afterBack; afterBack = []; for (const fn of fns) fn(); } return; }
    const top = overlays[overlays.length - 1];
    if (top) { closingAll = true; try { if (top.close) top.close(); else top.el.remove(); } finally { closingAll = false; } overlays = overlays.filter((o) => o !== top); if (!overlays.length) document.body.classList.remove('noscroll'); return; }
    // A step left behind by an overlay that was not on top when it closed: skip it, never a dead Back.
    if (history.state && history.state.overlay) history.back();
  });
  function sheet(title, actions) {
    const bg = h('div', { class: 'sheet-bg', onclick: (e) => { if (e.target === bg) close(); } });
    const close = () => { bg.remove(); untrackOverlay(bg); };
    bg.append(h('div', { class: 'sheet' }, h('h3', {}, title),
      ...actions.map((a) => h('button', { type: 'button', class: a.cls || '', onclick: async () => { close(); await a.run(); } }, a.label)),
      h('button', { type: 'button', onclick: close }, 'Cancel')));
    document.body.append(bg); trackOverlay(bg, close);
  }


  // Hold to confirm (owner's rule: destructive taps are hold-to-confirm, never a second dialog). The button
  // fills up while the finger stays on it; letting go early cancels; a full second runs the action once.
  function holdButton(label, run, { cls = 'btn-danger', ms = 1000 } = {}) {
    const $fill = h('span', { class: 'holdfill' });
    const $b = h('button', { type: 'button', class: `hold ${cls}` }, $fill, h('span', { class: 'holdlabel' }, label));
    let timer = null, done = false;
    const stop = () => { if (timer) clearTimeout(timer); timer = null; $b.classList.remove('holding'); };
    $b.addEventListener('pointerdown', (e) => { if (done) return; e.preventDefault(); $b.setPointerCapture(e.pointerId); $b.classList.add('holding'); timer = setTimeout(async () => { timer = null; done = true; $b.disabled = true; try { await run(); } finally { done = false; $b.disabled = false; $b.classList.remove('holding'); } }, ms); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) $b.addEventListener(ev, stop);
    $b.addEventListener('contextmenu', (e) => e.preventDefault());
    return $b;
  }
  // A sheet with words and one hold-to-confirm button. `run` gets a `close` that steps the sheet out of the
  // history the quiet way, so the action may change screens right after.
  function confirmSheet(title, words, label, run) {
    const bg = h('div', { class: 'sheet-bg', onclick: (e) => { if (e.target === bg) close(); } });
    const close = () => { bg.remove(); untrackOverlay(bg); };
    bg.append(h('div', { class: 'sheet' }, h('h3', {}, title), h('p', { class: 'muted small', style: 'margin:0 0 8px' }, words),
      holdButton(label, () => { close(); return run(); }),
      h('button', { type: 'button', onclick: close }, 'Cancel')));
    document.body.append(bg); trackOverlay(bg, close);
  }

  // Pinch-to-zoom + swipes on an image inside a box (pointer events: works
  // with fingers on Samsung Internet and Chrome, and with a mouse on a laptop).
  // Swipes only fire when the picture is not zoomed in. All positions are
  // measured from the box's top-left, so the box can sit anywhere on screen
  // (the compare screen has two half-screen boxes). on.change fires after the
  // owner zooms or pans; view()/set() let a second picture follow along.
  function zoomable(box, img, on = {}) {
    let scale = 1, tx = 0, ty = 0; // transform: translate(tx,ty) scale(scale) with origin 0 0
    let base = null; // layout box of the image at scale 1, relative to the box
    let org = { x: 0, y: 0 }; // the box's top-left on screen
    const pointers = new Map();
    let start = null, lastTap = 0, swipe = null;
    const apply = () => { img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
    const changed = () => { apply(); on.change?.(); };
    const origin = () => { const b = box.getBoundingClientRect(); org = { x: b.left, y: b.top }; };
    const loc = (e) => ({ x: e.clientX - org.x, y: e.clientY - org.y });
    const clamp = () => {
      scale = Math.min(Math.max(scale, 1), 8);
      if (scale === 1 || !base) { tx = 0; ty = 0; return; }
      const W = box.clientWidth, H = box.clientHeight;
      const w = base.w * scale, hh = base.h * scale;
      const left = base.x + tx, right = left + w;
      if (w <= W) tx = (W - w) / 2 - base.x; else { if (left > 0) tx -= left; if (right < W) tx += W - right; }
      const top = base.y + ty, bottom = top + hh;
      if (hh <= H) ty = (H - hh) / 2 - base.y; else { if (top > 0) ty -= top; if (bottom < H) ty += H - bottom; }
    };
    const measure = () => {
      img.style.transform = '';
      const b = box.getBoundingClientRect(), r = img.getBoundingClientRect();
      base = r.width ? { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height } : null;
      clamp(); apply();
    };
    const zoomAt = (cx, cy, factor) => {
      if (!base) return;
      const ns = Math.min(Math.max(scale * factor, 1), 8), k = ns / scale;
      tx = cx - base.x - (cx - base.x - tx) * k; ty = cy - base.y - (cy - base.y - ty) * k; scale = ns; clamp(); changed();
    };
    const reset = () => { scale = 1; tx = 0; ty = 0; measure(); };
    // Which spot of the picture is in the middle of the box, as a fraction of the picture.
    const view = () => (base ? { scale, u: (box.clientWidth / 2 - base.x - tx) / (base.w * scale), v: (box.clientHeight / 2 - base.y - ty) / (base.h * scale) } : { scale: 1, u: 0.5, v: 0.5 });
    const set = (vw) => {
      if (!base) return;
      scale = vw.scale;
      tx = box.clientWidth / 2 - base.x - vw.u * base.w * scale; ty = box.clientHeight / 2 - base.y - vw.v * base.h * scale;
      clamp(); apply();
    };
    img.addEventListener('load', () => { measure(); on.load?.(); }); if (img.complete) measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(box);
    // Every listener on the box goes through here so destroy() removes it: a viewer mounts a drawing over a
    // thumbnail, and two live sets of listeners made one tap fire twice (two pages opened, one close closed one).
    const ac = new AbortController();
    const listen = (type, fn, opts) => box.addEventListener(type, fn, { ...(opts || {}), signal: ac.signal });
    listen('pointerdown', (e) => {
      if (e.target.closest('button, a, input')) return;
      box.setPointerCapture(e.pointerId);
      origin();
      pointers.set(e.pointerId, loc(e));
      const pts = [...pointers.values()];
      if (pts.length === 1) {
        const p = pts[0], now = Date.now();
        if (now - lastTap < 300) { zoomAt(p.x, p.y, scale > 1.5 ? 1 / scale : 2.5); lastTap = 0; swipe = null; }
        else { lastTap = now; swipe = scale === 1 ? { x: p.x, y: p.y, t: now, target: e.target } : null; }
        start = { tx, ty, x: p.x, y: p.y, scale };
      } else if (pts.length === 2) {
        swipe = null;
        start = { tx, ty, scale, dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2 };
      }
    });
    listen('pointermove', (e) => {
      if (!pointers.has(e.pointerId) || !start) return;
      const p = loc(e);
      pointers.set(e.pointerId, p);
      const pts = [...pointers.values()];
      if (pts.length === 2 && start.dist && base) {
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const cx = (pts[0].x + pts[1].x) / 2, cy = (pts[0].y + pts[1].y) / 2;
        const ns = Math.min(Math.max(start.scale * (dist / start.dist), 1), 8), k = ns / start.scale;
        tx = cx - base.x - (start.cx - base.x - start.tx) * k; ty = cy - base.y - (start.cy - base.y - start.ty) * k; scale = ns;
        clamp(); changed();
      } else if (pts.length === 1 && start.x !== undefined && scale > 1) {
        tx = start.tx + (p.x - start.x); ty = start.ty + (p.y - start.y); clamp(); changed();
      } else if (pts.length === 1 && swipe && scale === 1) {
        // Not zoomed: the first clear move decides. Mostly downward, and the owner of the box agrees, and the
        // picture comes loose and follows the finger (on.drag); anything else is a plain swipe, judged on release.
        const dx = p.x - swipe.x, dy = p.y - swipe.y;
        if (!swipe.mode && Math.hypot(dx, dy) > 12) swipe.mode = (dy > Math.abs(dx) * 1.2 && on.dragStart?.() !== false) ? 'drag' : 'swipe';
        if (swipe.mode === 'drag') on.drag?.(dx, Math.max(dy, 0));
      }
    });
    const up = (e) => {
      const p = loc(e);
      pointers.delete(e.pointerId);
      const pts = [...pointers.values()];
      if (swipe && scale === 1 && pts.length === 0) {
        const dx = p.x - swipe.x, dy = p.y - swipe.y;
        if (swipe.mode === 'drag') on.dragEnd?.(dx, dy, Date.now() - swipe.t);
        else if (Math.abs(dx) > 70 && Math.abs(dy) < Math.abs(dx) * 0.7) (dx < 0 ? on.left : on.right)?.();
        else if (dy < -70 && Math.abs(dx) < 60) on.up?.();
        else if (dy > 90 && Math.abs(dx) < 60) on.down?.();
        else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && Date.now() - swipe.t < 300) on.tap?.(swipe.target);
      }
      swipe = null;
      start = pts.length === 1 ? { tx, ty, x: pts[0].x, y: pts[0].y, scale } : null;
    };
    listen('pointerup', up); listen('pointercancel', up);
    listen('wheel', (e) => { e.preventDefault(); origin(); const p = loc(e); zoomAt(p.x, p.y, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    listen('dblclick', (e) => e.preventDefault());
    return { reset, view, set, destroy: () => { ro.disconnect(); ac.abort(); } };
  }

  // ---------- compare: the chart picked to compare with ----------
  // Kept on this phone only (survives a reload), never on the server.
  const PICK_KEY = 'comparePick', CMPVIEW_KEY = 'compareView';
  const readStore = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const writeStore = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let comparePick = readStore(PICK_KEY); // { id, name } or null
  if (comparePick && !Number.isInteger(comparePick.id)) comparePick = null;
  const setPick = (p) => { comparePick = p; writeStore(PICK_KEY, p); drawCmpBar(); };
  // While a chart is picked, a bar at the bottom of the list screens says so (tap it to open that chart, × to stop).
  let $cmpbar = null, cmpBarScreen = false;
  const drawCmpBar = (onList = cmpBarScreen) => {
    cmpBarScreen = onList;
    const want = onList && comparePick;
    document.body.classList.toggle('withcmp', !!want);
    if ($cmpbar) { $cmpbar.remove(); $cmpbar = null; }
    if (!want) return;
    $cmpbar = h('div', { class: 'cmpbar' },
      h('a', { class: 'cmpbar-main', href: `#/chart/${comparePick.id}` },
        h('img', { src: `/thumb/${comparePick.id}`, alt: '' }),
        h('span', { class: 'cmpbar-text' }, h('b', {}, `Comparing ${comparePick.name || 'a chart'}`), h('span', { class: 'muted small' }, 'Open another chart, tap Compare'))),
      h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Stop comparing', onclick: () => { count('compare.cancel'); setPick(null); } }, '×'));
    document.body.append($cmpbar);
  };
  let compareReturn = null; // where the compare screen's back arrow goes
  // Who a chart is, as the viewer's title shows it.
  const imgName = (img) => (img.kind === 'archetype' ? img.tags.map((t) => pretty(t.name)).join(', ') : (img.title || pretty((img.tags.find((t) => t.kind === 'name') || {}).name || '')));

  // ---------- tag suggestion box ----------
  // `empty` gives what the box shows while nothing is typed (the home screen's recent searches).
  // `names`: also offer the charts NAMED what was typed (every chart whose name has a word starting with it,
  // then each distinct name), above the tags.
  function suggestBox($input, { onPick, onPickName = null, allowNew = false, kind = null, alsoArchetype = false, names = false, empty = null }) {
    const $list = h('div', { class: 'suggest hidden' });
    let timer, seq = 0;
    const hide = () => $list.classList.add('hidden');
    const show = (items, q, who = null, spots = []) => {
      fill($list);
      if (!q && empty) { $list.append(...empty()); $list.classList.toggle('hidden', !$list.children.length); return; }
      learnTags(items);
      // A number first ("42", "42 life path"): the position search comes first, because it covers every chart
      // whose name and date are known, while a position tag only covers the charts the owner tagged by hand.
      for (const sp of spots) $list.append(h('button', { type: 'button', onclick: () => { count('search.position'); hide(); go(positionHash(sp.conds)); } },
        h('span', { class: 'chip position', style: 'min-height:32px;font-size:15px;pointer-events:none' }, sp.label),
        h('span', { class: 'count' }, `${fmtN(sp.count)} chart${sp.count === 1 ? '' : 's'}`)));
      if (who && who.count) {
        const one = who.names.length === 1 && who.names[0].count === who.count;
        if (!one) $list.append(h('button', { type: 'button', onclick: () => { count('search.name'); onPickName(q); hide(); } }, h('span', { class: 'chip who', style: 'min-height:32px;font-size:15px;pointer-events:none' }, `Everyone named ${q}`), h('span', { class: 'count' }, `${fmtN(who.count)} chart${who.count === 1 ? '' : 's'}`)));
        for (const n of who.names) $list.append(h('button', { type: 'button', onclick: () => { count('search.name'); onPickName(n.name); hide(); } }, h('span', { class: 'chip who', style: 'min-height:32px;font-size:15px;pointer-events:none' }, n.name), h('span', { class: 'count' }, `${fmtN(n.count)} chart${n.count === 1 ? '' : 's'}`)));
      }
      const exact = items.some((t) => t.name === q || (t.display || '').toLowerCase() === q.toLowerCase());
      if (allowNew && q && !exact) $list.append(h('button', { type: 'button', onclick: () => { onPick(q); hide(); } }, h('span', {}, `Add new tag “${q}”`), h('span', { class: 'count' }, 'new')));
      for (const t of items) $list.append(h('button', { type: 'button', onclick: () => { onPick(t.name, t.pickKind); hide(); } },
        h('span', { class: `chip ${t.kind}`, style: 'min-height:32px;font-size:15px;pointer-events:none' }, pretty(t.name)),
        h('span', { class: 'count' }, t.pickKind === 'archetype' ? `${fmtN(t.count)} archetype pic${t.count === 1 ? '' : 's'}` : `${fmtN(t.count)} chart${t.count === 1 ? '' : 's'}`)));
      $list.classList.toggle('hidden', !$list.children.length);
    };
    const refresh = async () => {
      const q = $input.value.trim(); const my = ++seq;
      if (!q && empty) { show([], ''); return; }
      const params = new URLSearchParams({ q, limit: 25 }); if (kind) params.set('kind', kind);
      try {
        const whoP = names && q ? api('/api/names?' + new URLSearchParams({ q })).catch(() => null) : Promise.resolve(null);
        let items = await api('/api/tags?' + params);
        if (alsoArchetype && q) {
          const ap = new URLSearchParams({ q, limit: 5, kind: 'archetype' });
          const extra = await api('/api/tags?' + ap).catch(() => []);
          items = [...items, ...extra.map((t) => ({ ...t, pickKind: 'archetype' }))];
        }
        const who = await whoP;
        const spots = names ? await positionSpots(q, items).catch(() => []) : [];
        if (my === seq) show(items, q, who, spots);
      } catch {}
    };
    $input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(refresh, 120); });
    $input.addEventListener('focus', refresh);
    $input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const first = $list.querySelector('button'); if (allowNew && $input.value.trim()) onPick($input.value.trim()); else if (first) first.click(); hide(); } if (e.key === 'Escape') hide(); });
    document.addEventListener('pointerdown', (e) => { if (!$list.contains(e.target) && e.target !== $input) hide(); });
    return $list;
  }

  // "42" -> every chart where 42 sits anywhere, then the positions that hold it most; "42 life path" -> only the
  // positions whose name starts with those words (Little life path, Big life path). The position-code tags for the
  // same thing ("42lp") are left out of the list: the position search finds everything they find and more.
  async function positionSpots(q, items) {
    const m = /^\s*(\d{1,3})(?:\/\d)?\s*([A-Za-z][A-Za-z' ]*)?\s*$/.exec(q);
    if (!m) return [];
    const num = Number(m[1]);
    if (!num) return [];
    const words = (m[2] || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const [cat, counts] = await Promise.all([loadCatalog(), api('/api/positions/counts?num=' + num)]);
    const numText = num < 10 ? String(num) : `${num}/${TagCodes.digitSum(num)}`;
    const out = [];
    const matches = (label) => { const l = label.toLowerCase(); return !words || l.startsWith(words) || l.replace(/^(little|big|higher|lower|upper|outer|inner) /, '').startsWith(words) || l.includes(' ' + words); };
    if (!words && counts.total) out.push({ label: `${numText} anywhere`, count: counts.total, conds: [{ pos: '*.*', num: String(num) }] });
    // With words typed, a matching position is listed even at 0 charts: the answer to "42 life path" is a count.
    const rows = cat.positions.filter((p) => (words ? matches(p.label) : counts.counts[`${p.chart}.${p.key}`]))
      .map((p) => ({ label: `${numText} in ${p.label} · ${chartLabel(p.chart)}`, count: counts.counts[`${p.chart}.${p.key}`] || 0, conds: [{ pos: `${p.chart}.${p.key}`, num: String(num) }] }))
      .sort((a, b) => b.count - a.count);
    out.push(...rows.slice(0, words ? 8 : 4));
    if (words) { const codes = TagCodes.expandQuery(q); const drop = new Set(codes); let i = items.length; while (i--) if (drop.has(items[i].name)) items.splice(i, 1); }
    else { let i = items.length; while (i--) if (items[i].kind === 'position' && new RegExp(`^${num}[A-Za-z]`).test(items[i].name)) items.splice(i, 1); }
    return out;
  }

  // ---------- browse ----------
  routes[''] = function browse(_, query) {
    // One tag at a time: picking a tag replaces the search, never narrows it.
    const tag = query.get('tag') || '';
    const kind = query.get('kind') === 'archetype' ? 'archetype' : 'chart';
    // A position search (?pos=name.heart&num=12): every chart with that number in that position, computed
    // from the chart's name and date. Shown and remembered like a tag search.
    const conds = condsOf(query);
    const position = conds.length ? conds : null;
    // A name search (?name=john): every chart whose name has a word starting with that, from the search box.
    const name = query.get('name') || '';
    // ?drawn=0: only the charts still shown as the screenshot (no name and date read yet), from Settings.
    const drawn = query.get('drawn') === '0' ? false : query.get('drawn') === '1' ? true : null;
    const setName = (n) => go('#/?' + new URLSearchParams({ name: n }));
    const setTag = (t, k = kind) => { const p = new URLSearchParams(); if (k === 'archetype') p.set('kind', 'archetype'); if (t) p.set('tag', t); go('#/' + (p.toString() ? '?' + p : '')); };
    const home = !tag && !position && !name && kind === 'chart' && drawn === null;
    const $quickIcon = h('a', { class: 'btn iconbtn gear', href: '#/quick', 'aria-label': 'Quick Chart', title: 'Quick Chart' }, '◈');
    const $gear = h('a', { class: 'btn iconbtn gear', href: '#/settings', 'aria-label': 'Settings', title: 'Settings' }, '⚙');
    const $input = h('input', { type: 'search', placeholder: 'Search names, tags, numbers', autocomplete: 'off', enterkeyhint: 'search' });
    if (tag) $input.value = pretty(tag); // the search box shows what is being searched; typing replaces it
    if (name) $input.value = name;
    if (position) { $input.value = searchLabel(conds); loadCatalog().then(() => { if (document.activeElement !== $input) $input.value = searchLabel(conds); }).catch(() => {}); }
    const showClear = () => $clear.classList.toggle('hidden', !$input.value); // the × only when there is something to clear
    $input.addEventListener('input', showClear);
    const $sugg = suggestBox($input, { kind, alsoArchetype: kind === 'chart', names: kind === 'chart', empty: home ? () => recentNodes(setTag, setName) : null, onPick: (picked, pickKind) => setTag(picked, pickKind || kind), onPickName: setName });
    $input.addEventListener('focus', () => { if ((tag && $input.value === pretty(tag)) || position || (name && $input.value === name)) $input.select(); });
    const $clear = h('button', { type: 'button', class: 'clear', 'aria-label': 'Clear the search', onclick: () => { if (tag || position || name) { setTag('', 'chart'); return; } $input.value = ''; showClear(); $input.focus(); $sugg.classList.add('hidden'); } }, '×');
    showClear();
    const $filters = kind === 'archetype' ? h('div', { class: 'filters' }, chip({ name: 'Archetype Pics', kind: 'name' }, { active: true, removable: true, onclick: () => setTag(tag, 'chart') }))
      : drawn === false ? h('div', { class: 'filters' }, chip({ name: 'Still the screenshot', kind: 'name' }, { active: true, removable: true, onclick: () => setTag('', 'chart') }))
      // One chip per condition: tap it to change that one (the picker opens with the others kept), tap × to drop it.
      // "+ Another number" opens the picker with every condition kept, so the next number narrows these charts.
      : position ? h('div', { class: 'filters' },
        ...conds.map((c, i) => { const rest = conds.filter((_, j) => j !== i); return h('span', { class: 'chip position', title: 'Tap to change, × to remove' },
          h('button', { type: 'button', class: 't', onclick: () => go('#/position?' + condsQuery(rest, { edit: c.num })) }, condLabel(c)),
          h('button', { type: 'button', class: 'x', 'aria-label': `Remove ${condLabel(c)}`, onclick: () => go(rest.length ? positionHash(rest) : '#/') }, '×')); }),
        h('a', { class: 'chip position add', href: '#/position?' + condsQuery(conds), onclick: () => count('position.add_more') }, h('span', { class: 't' }, '+ Another number'))) : null;
    const $summary = h('div', { class: 'summary' }, 'Loading…');
    const $grid = h('div', { class: 'grid' });
    const $sentinel = h('div', { class: 'sentinel' });
    const $recent = h('div', { class: 'recent hidden' });
    // The home screen is the search box and the way into the quick chart; the recently opened charts sit
    // below. The recent searches and the way to every tag drop down from the search box when it is tapped.
    if (tag) rememberSearch([tag], kind);
    if (position) rememberSearch([], kind, { conds });
    if (name) rememberSearch([], kind, { name });
    if (!namesLoaded) loadTagNames().then(() => { if (tag && document.activeElement !== $input) $input.value = pretty(tag); });
    // Under the search bar: three small tiles side by side (the three big stacked buttons were too much, owner 2026-10-16).
    const $acts = h('div', { class: 'acts' },
      h('a', { class: 'act primary', href: '#/quick', onclick: () => count('home.quick') }, h('span', { class: 'qicon' }, '◈'), h('span', { class: 'al' }, 'Quick Chart')),
      h('a', { class: 'act', href: '#/position', onclick: () => count('home.position') }, h('span', { class: 'qicon' }, '⌖'), h('span', { class: 'al' }, 'By Position')),
      readingUi ? readingUi.homeButton() : null);
    drawCmpBar(true);
    render(h('div', { class: `screen ${home ? 'home' : ''}` },
      home ? h('div', { class: 'pagetop hometop' }, h('h1', {}, 'Chart Vault'), $gear) : null,
      h('div', { class: 'searchbar' }, h('div', { class: 'row', style: 'flex-wrap:nowrap;gap:8px' }, h('div', { class: 'searchbox', style: 'flex:1' }, $input, $clear, $sugg), home ? null : $quickIcon, home ? null : $gear), $filters),
      home && readingUi ? readingUi.homeBanner() : null,
      home ? $acts : null, home && toolsUi ? toolsUi.homeButtons() : null,
      $recent, home ? null : $summary, home ? null : $grid, home ? null : $sentinel));
    // Recently Opened charts (this phone remembers the last 48), a grid like a search result, only on the home screen.
    if (home && recentIds().length) {
      api('/api/images?ids=' + recentIds().join(',') + '&limit=50').then((r) => {
        const byId = new Map(r.items.map((i) => [i.id, i]));
        const items = recentIds().map((id) => byId.get(id)).filter(Boolean);
        if (!items.length) return;
        fill($recent, h('div', { class: 'summary rhead' }, 'Recently Opened'), h('div', { class: 'grid' }, ...items.map(cell)));
        $recent.classList.remove('hidden');
      }).catch(() => {});
    }
    if (home) return;

    let offset = 0, total = null, loading = false, done = false;
    const params = () => { const p = new URLSearchParams({ limit: 60, offset, kind }); if (tag) p.append('tag', tag); if (position) for (const c of conds) { p.append('pos', c.pos); p.append('num', c.num); } if (name) p.set('name', name); if (drawn !== null) p.set('drawn', drawn ? '1' : '0'); return p; };
    async function more() {
      if (loading || done) return; loading = true; $sentinel.textContent = 'Loading…';
      try {
        const r = await api('/api/images?' + params());
        total = r.total; offset += r.items.length;
        for (const img of r.items) $grid.append(cell(img));
        done = offset >= total || r.items.length === 0;
        const noun = kind === 'archetype' ? 'archetype pic' : 'chart';
        $summary.textContent = drawn === false ? `${fmtN(total)} ${noun}${total === 1 ? '' : 's'} still showing the screenshot` : position ? `${fmtN(total)} ${noun}${total === 1 ? '' : 's'} with ${searchLabel(conds)}` : name ? `${fmtN(total)} ${noun}${total === 1 ? '' : 's'} named ${name}` : `${fmtN(total)} ${noun}${total === 1 ? '' : 's'}${tag ? '' : ', newest first'}`;
        $sentinel.textContent = done ? (total === 0 ? (drawn === false ? 'Every chart is drawn by the app now.' : kind === 'archetype' && !tag ? 'No archetype pics yet. Add them on the Upload page.' : position ? (conds.length > 1 ? 'No chart has all of these. Remove one with its × to widen the search.' : 'No chart has that number there. Only charts whose name and date have been read can be found this way.') : `No ${noun}s match.`) : '') : '';
      } catch (err) { $sentinel.textContent = err.message; }
      loading = false;
    }
    function cell(img) {
      learnTags(img.tags);
      const label = img.kind === 'archetype'
        ? img.tags.map((t) => pretty(t.name)).join(', ')
        : img.title || pretty((img.tags.find((t) => t.kind === 'name') || img.tags[0] || {}).name || '');
      // A chart whose name and date are known is drawn by the app (every chart looks the same); the rest show the screenshot.
      if (img.inputs) inputsById.set(img.id, img.inputs); else inputsById.delete(img.id);
      return h('a', { class: 'cell', href: `#/chart/${img.id}${location.hash.includes('?') ? '?' + location.hash.split('?')[1] : ''}` },
        img.inputs ? h('div', { class: 'thumb drawn', role: 'img', 'aria-label': label }, drawnChart(img.inputs))
          : img.has_file ? h('img', { class: 'thumb', src: `/thumb/${img.id}`, loading: 'lazy', alt: label }) : h('div', { class: 'nofile' }, 'no file yet'),
        h('div', { class: `label ${label ? '' : 'muted'}` }, label || img.filename));
    }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) more(); }, { rootMargin: '600px' });
    io.observe($sentinel);
    more();
  };
  const kindOf = (name) => (/^\d+$/.test(name) ? 'number' : /^\d+[A-Za-z]/.test(name) ? 'position' : 'name');
  // The last charts opened on this phone, newest first (browser storage; may be empty or blocked).
  const recentIds = () => { try { return (JSON.parse(localStorage.getItem('recent') || '[]') || []).filter(Number.isInteger).slice(0, 48); } catch { return []; } };
  const rememberOpened = (id) => { try { localStorage.setItem('recent', JSON.stringify([id, ...recentIds().filter((x) => x !== id)].slice(0, 48))); } catch {} };
  // The last searches made on this phone, newest first: [{ tags, kind }]. Searching the same tag again moves it to the top.
  // A position search is remembered too: { tags: [], kind, conds: [{ pos, num }] } (older entries: { pos, num }).
  // A name search is remembered too: { tags: [], kind, name }.
  const condsIn = (s) => (Array.isArray(s.conds) ? s.conds : s.pos && s.num ? [{ pos: s.pos, num: s.num }] : []);
  const recentSearches = () => { try { return (JSON.parse(localStorage.getItem('searches') || '[]') || []).filter((s) => s && Array.isArray(s.tags) && (s.tags.length || condsIn(s).length || s.name)).slice(0, 20); } catch { return []; } };
  const rememberSearch = (tags, kind, position = null) => {
    try {
      const kept = recentSearches().filter((s) => (position && position.name ? s.name !== position.name : position ? !sameConds(condsIn(s), position.conds) : !(s.kind === kind && s.tags.length && (s.tags.every((t) => tags.includes(t)) || tags.every((t) => s.tags.includes(t))))));
      localStorage.setItem('searches', JSON.stringify([{ tags, kind, ...(position || {}) }, ...kept].slice(0, 20)));
    } catch {}
  };
  const runSearch = (s) => (condsIn(s).length ? go(positionHash(condsIn(s))) : null);
  // What drops down from an empty search box: the recent searches (tap one to run it again) and the way to every tag.
  const recentNodes = (setTag, setName) => {
    const searches = recentSearches();
    return [
      h('div', { class: 'shead' }, searches.length ? 'Recent Searches' : 'Your recent searches will show here'),
      ...searches.map((s) => h('button', { type: 'button', class: 'rsearch', onclick: () => (condsIn(s).length ? runSearch(s) : s.name ? setName(s.name) : setTag(s.tags[0], s.kind)) },
        h('span', { class: 'chips' }, s.kind === 'archetype' ? h('span', { class: 'chip name', style: 'pointer-events:none' }, 'Archetype Pics') : null,
          condsIn(s).length ? h('span', { class: 'chip position', style: 'pointer-events:none' }, searchLabel(condsIn(s))) : null,
          s.name ? h('span', { class: 'chip who', style: 'pointer-events:none' }, s.name) : null,
          ...s.tags.slice(0, 1).map((t) => h('span', { class: `chip ${kindOf(t)}`, style: 'pointer-events:none' }, pretty(t)))),
        h('span', { class: 'muted', style: 'padding-left:8px' }, '›'))),
      h('a', { class: 'rsearch alltags', href: '#/position' }, h('span', {}, 'Search by Position'), h('span', { class: 'muted' }, '›')),
      h('a', { class: 'rsearch alltags', href: '#/tags' }, h('span', {}, 'All Tags'), h('span', { class: 'muted' }, '›')),
    ];
  };

  // ---------- viewer (full screen) ----------
  let viewerCleanup = null;
  routes.chart = async function viewer(id, query) {
    const qs = query.toString();
    const listQ = new URLSearchParams(); for (const t of query.getAll('tag')) listQ.append('tag', t); if (query.get('kind') === 'archetype') listQ.set('kind', 'archetype'); if (query.get('name')) listQ.set('name', query.get('name'));
    for (const k of ['pos', 'num']) for (const v of query.getAll(k)) listQ.append(k, v);
    if (query.get('drawn')) listQ.set('drawn', query.get('drawn'));
    const backHash = '#/' + (listQ.toString() ? '?' + listQ : '');
    // Back goes to the screen the viewer was opened from (the list, a search, the quick chart). Opened from a
    // link or a fresh load, there is no such screen, so it goes to the list this chart belongs to.
    const back = () => (viewerFromApp ? history.back() : swap(backHash));
    // The viewer lies over the screen it was opened from, which stays drawn underneath: dragging the picture
    // down shows it, and closing the viewer lands back on it exactly where it was. Opened from a link or a
    // fresh load, there is no such screen, so the list this chart belongs to is drawn first.
    if (!viewerFromApp) { routes['']('', listQ); underHash = backHash; }
    document.body.classList.add('fullscreen');
    viewerCleanup = () => document.body.classList.remove('fullscreen');

    // What fills the stage: the app's own drawing of the chart when its name and date are known (the Quick
    // Chart drawing, so every chart looks the same), else the screenshot. "Screenshot" in the top bar shows
    // the original picture; "Drawn" comes back. $img is whichever is on the stage now.
    let $img = null, z = null, mode = 'photo';
    const cached = inputsById.get(Number(id)) || null;
    const $stage = h('div', { class: 'vstage' });
    // The picture is sized from its own proportions to fill the stage, so the small thumbnail shown first
    // (already on the phone from the list) and the full picture that replaces it take exactly the same space.
    // A drawing has its proportions in its viewBox.
    const ratioOf = (el) => { if (el.tagName === 'svg') { const v = (el.getAttribute('viewBox') || '').split(' ').map(Number); return v[2] && v[3] ? v[2] / v[3] : 0; } return el.naturalWidth ? el.naturalWidth / el.naturalHeight : 0; };
    const fit = () => {
      if (!$img || !$img.isConnected) return;
      const r = ratioOf($img); if (!r) return;
      const W = $stage.clientWidth, H = $stage.clientHeight;
      const w = Math.min(W, H * r); $img.style.width = `${w}px`; $img.style.height = `${w / r}px`;
    };
    window.addEventListener('resize', fit);
    // alt is empty on purpose: with text in it the browser draws a "missing picture" icon until the file arrives.
    const photoEl = (src) => { const el = h('img', { class: 'vimg', alt: '', draggable: 'false' }); el.addEventListener('load', fit); el.src = src; return el; };
    const drawnEl = (inp) => { const el = drawnChart(inp); el.classList.add('vimg', 'drawn'); return el; };
    const $count = h('span', { class: 'vcount' }, '');
    const $name = h('span', { class: 'vname' }, '');
    // The ⋮ menu (like the Quick Chart's): the chart's year rows and day vibrations, and the original screenshot.
    const $orig = h('button', { type: 'button', class: 'cmenu-item hidden' }, 'Screenshot');
    const $rows = h('button', { type: 'button', class: 'cmenu-item' }, 'Year Rows and Day Vibrations');
    const $pyrItem = h('button', { type: 'button', class: 'cmenu-item' }, 'Whole Name Pyramid');
    const $simItem = h('button', { type: 'button', class: 'cmenu-item' }, 'Similar Charts');
    const $delItem = h('button', { type: 'button', class: 'cmenu-item danger' }, 'Delete This Chart');
    const $menu = h('div', { class: 'cmenu hidden', role: 'menu' }, $rows, $simItem, $pyrItem, $orig, $delItem);
    const $dots = h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'More', title: 'More', onclick: (e) => { e.stopPropagation(); $menu.classList.toggle('hidden'); } }, '⋮');
    const $more = h('div', { class: 'vmore hidden' }, $dots, $menu);
    const $cmp = h('button', { type: 'button', class: 'vbtn hidden' }, 'Compare');
    const $prev = h('button', { type: 'button', class: 'iconbtn varrow left hidden', 'aria-label': 'Previous' }, '‹');
    const $next = h('button', { type: 'button', class: 'iconbtn varrow right hidden', 'aria-label': 'Next' }, '›');
    const $sheetBody = h('div', { class: 'vsheet-body stack' });
    const $sheet = h('div', { class: 'vsheet' }, h('div', { class: 'vsheet-grip', onclick: () => closeSheet() }, h('span', {})), $sheetBody);
    // Nothing over the picture until it is tapped: no back button, no name. The phone's own Back closes it.
    const $root = h('div', { class: 'viewer bare' },
      $stage,
      h('div', { class: 'vtop' }, h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Back to the list', onclick: back }, '‹'), $name, $count, $cmp, $more),
      $prev, $next, $sheet);
    document.body.append($root);

    let img, ctx = { prev: null, next: null, index: null, total: 0 }, sheetOpen = false;
    // Put a picture or a drawing on the stage; the zoom, swipes and drag start over on it.
    const mount = (el, drawn) => {
      if (z) z.destroy();
      $img = el; mode = drawn ? 'drawn' : 'photo';
      $root.classList.toggle('drawn', drawn);
      fill($stage, el); if (drawn) trimDrawn(el); fit();
      z = zoomable($stage, el, zoomOn);
    };
    const openSheet = () => { sheetOpen = true; $sheet.classList.add('open'); $root.classList.remove('bare'); };
    const closeSheet = () => { sheetOpen = false; $sheet.classList.remove('open'); };
    const toggleBare = () => $root.classList.toggle('bare'); // tap: hide or show the top bar
    const goTo = (nid) => { if (nid) swap(`#/chart/${nid}${qs ? '?' + qs : ''}`); };
    // Drag down and the picture comes loose: it follows the finger, shrinks a little, and the screen underneath
    // shows through. Let go after a real pull and it flies back into its place in the list (or off the bottom
    // when that place is not on screen) and the viewer closes; a short pull settles back.
    let dismissing = false;
    const base = () => { const W = $stage.clientWidth, H = $stage.clientHeight, w = parseFloat($img.style.width) || $img.offsetWidth || 0, hh = parseFloat($img.style.height) || $img.offsetHeight || 0; return { x: (W - w) / 2, y: (H - hh) / 2, w, h: hh }; };
    const cellOf = () => { for (const a of $app.querySelectorAll('a.cell')) { const m = /^#\/chart\/(\d+)(\?|$)/.exec(a.getAttribute('href') || ''); if (m && Number(m[1]) === Number(id)) { const r = a.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight ? r : null; } } return null; };
    const drag = (dx, dy) => {
      if (dismissing) return;
      const p = Math.min(dy / 300, 1);
      $root.classList.add('bare', 'dragging');
      $img.style.transformOrigin = '50% 50%';
      $img.style.transform = `translate(${dx}px, ${dy}px) scale(${1 - 0.25 * p})`;
      $root.style.background = `rgba(${mode === 'drawn' ? '255,255,255' : '0,0,0'},${(1 - 0.92 * p).toFixed(3)})`;
    };
    const settle = () => {
      if (dismissing) return;
      $img.style.transition = 'transform .2s ease'; $root.style.transition = 'background .2s ease';
      $img.style.transform = 'translate(0px, 0px) scale(1)'; $root.style.background = '';
      setTimeout(() => { $img.style.transition = ''; $root.style.transition = ''; $img.style.transformOrigin = ''; $root.classList.remove('dragging'); }, 220);
    };
    const flyOut = (dx, dy) => {
      if (dismissing) return; dismissing = true;
      const b = base(), cell = cellOf();
      $img.style.transition = 'transform .25s ease, opacity .25s ease'; $root.style.transition = 'background .25s ease';
      if (cell) {
        const sc = cell.width / b.w;
        $img.style.transform = `translate(${cell.left + cell.width / 2 - (b.x + b.w / 2)}px, ${cell.top + cell.height / 2 - (b.y + b.h / 2)}px) scale(${sc})`;
      } else $img.style.transform = `translate(${dx}px, ${innerHeight}px) scale(0.5)`;
      $img.style.opacity = '0.35'; $root.style.background = 'rgba(0,0,0,0)';
      setTimeout(back, 240);
    };
    // A tap on a name on the drawn chart's name line opens that name's own charts (pyramid, name chart,
    // vocation, personality), like on the Quick Chart. Any other tap hides or shows the top bar.
    const dayOf = (inp) => (inp ? Numeroscope.numeroscope({ day: inp.day ?? '', month: inp.month ?? '', year: inp.year ?? '', name: inp.name || '' }).essence.day : null);
    const zoomOn = {
      left: () => goTo(ctx.next), right: () => goTo(ctx.prev), up: openSheet,
      down: () => (sheetOpen ? closeSheet() : back()),
      tap: (target) => {
        $menu.classList.add('hidden');
        const p = mode === 'drawn' && target && target.closest ? target.closest('[data-pos]') : null;
        if (p && meaningUi) { pickNumber(p, () => { count('viewer.meaning'); meaningUi.open(meaningUi.fromEl(p)); }); return; }
        if (mode === 'drawn' && clearPick($img)) return;
        const w = mode === 'drawn' && target && target.closest ? target.closest('[data-word]') : null;
        if (w && img && img.inputs) { count('viewer.name_tap'); openWord(w.getAttribute('data-word'), dayOf(img.inputs)); return; }
        if (sheetOpen) closeSheet(); else toggleBare();
      },
      dragStart: () => !sheetOpen && img && (img.has_file || img.inputs), drag,
      dragEnd: (dx, dy, ms) => ((dy > 110 || (dy > 50 && dy / Math.max(ms, 1) > 0.6)) ? flyOut(dx, dy) : settle()),
    };
    // Something shows at once: the drawing when the list already knew the name and date, else the thumbnail.
    if (cached) mount(drawnEl(cached), true); else mount(photoEl(`/thumb/${id}`), false);
    $prev.onclick = () => goTo(ctx.prev); $next.onclick = () => goTo(ctx.next);
    const keys = (e) => { if (e.key === 'ArrowLeft') goTo(ctx.prev); else if (e.key === 'ArrowRight') goTo(ctx.next); else if (e.key === 'Escape') (sheetOpen ? closeSheet() : back()); };
    window.addEventListener('keydown', keys);
    viewerCleanup = () => { $root.remove(); document.body.classList.remove('fullscreen'); window.removeEventListener('keydown', keys); window.removeEventListener('resize', fit); if (z) z.destroy(); };
    // swipe down on the sheet grip closes it
    let gripY = null;
    $sheet.addEventListener('pointerdown', (e) => { if (e.target.closest('.vsheet-grip')) gripY = e.clientY; });
    $sheet.addEventListener('pointerup', (e) => { if (gripY !== null && e.clientY - gripY > 40) closeSheet(); gripY = null; });

    try { img = await api(`/api/images/${id}`); } catch (err) { fill($sheetBody, h('p', { class: 'err' }, err.message)); openSheet(); return; }
    learnTags(img.tags);
    if (query.get('sheet')) openSheet();
    if (img.kind === 'chart') rememberOpened(img.id);
    // The screenshot: the thumbnail first, the full picture replacing it only once it has arrived, so nothing
    // blank or broken shows in between. The drawing: made on the phone from the name and date, at once.
    const showPhoto = () => {
      if (!img.has_file) { if (z) z.destroy(); z = null; $img = null; mode = 'photo'; $root.classList.remove('drawn'); fill($stage, h('div', { class: 'center', style: 'min-height:100%' }, h('p', { class: 'muted' }, 'No picture for this chart yet.'), h('a', { class: 'btn', href: '#/upload' }, 'Go to Upload'))); return; }
      if (!$img || $img.tagName !== 'IMG') mount(photoEl(`/thumb/${img.id}`), false);
      const full = new Image(); full.onload = () => { if ($img && $img.tagName === 'IMG' && $img.isConnected) $img.src = full.src; }; full.src = `/img/${img.id}`;
    };
    const showDrawn = () => mount(drawnEl(img.inputs), true);
    const sameInputs = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    // "Screenshot" / "Drawn" in the top bar, only when the chart has both.
    const drawOrig = () => {
      const can = !!(img.inputs && img.has_file);
      $orig.classList.toggle('hidden', !can);
      $more.classList.toggle('hidden', !img.inputs);
      if (!can) return;
      $orig.textContent = mode === 'drawn' ? 'Screenshot' : 'Drawn';
      $orig.setAttribute('aria-label', mode === 'drawn' ? 'See the original screenshot' : 'Back to the drawn chart');
      $orig.onclick = () => { $menu.classList.add('hidden'); if (mode === 'drawn') { count('viewer.show_screenshot'); showPhoto(); } else { count('viewer.show_drawn'); showDrawn(); } drawOrig(); };
    };
    // Year rows and day vibrations for this person (destiny periods, one year's rows, a day), from the
    // chart's own name and date; the same popup as the Quick Chart's. Needs the whole birth date.
    $rows.onclick = () => {
      $menu.classList.add('hidden');
      const inp = img.inputs;
      if (!inp || !(inp.day && inp.month && inp.year)) { toast('This chart has no full birth date yet. Swipe up and tap "Wrong? Fix" to add it.', true); return; }
      count('viewer.year_rows');
      openForecast({ day: inp.day, month: inp.month, year: inp.year, name: inp.name || '', augment: true });
    };
    // The pyramid of every name run together, from the chart's own name (also a button in the sheet).
    const wholePyramid = () => {
      $menu.classList.add('hidden');
      const inp = img.inputs;
      if (!inp || !inp.name) { toast('This chart has no name read yet. Swipe up and tap "Type them" to add it.', true); return; }
      count('viewer.whole_pyramid');
      openWord(inp.name, dayOf(inp), { wholeName: true });
    };
    $pyrItem.onclick = wholePyramid;
    $simItem.onclick = () => { $menu.classList.add('hidden'); if (!img.inputs) { toast('This chart has no name read yet. Swipe up and tap "Type them" to add it.', true); return; } count('viewer.similar'); go(`#/similar/${img.id}`); };
    // Delete (owner's ask 2026-10-19): hold to confirm; the picture and everything about the chart go to
    // Settings -> Deleted Charts, where it can be put back. Then back to the list, redrawn without it.
    $delItem.onclick = () => {
      $menu.classList.add('hidden');
      confirmSheet(`Delete “${imgName(img) || img.filename}”?`, 'Hold the button to delete. The picture, its tags, name and numbers move to Deleted Charts in Settings, where you can put it back.', 'Hold to Delete', async () => {
        try {
          count('viewer.delete');
          await api(`/api/images/${img.id}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'deleted from the chart page' }) });
          toast('Deleted. Put it back from Settings → Deleted Charts.');
          underHash = null; // the list underneath is drawn again without this chart
          afterOverlayClosed(back);
        } catch (err) { toast(err.message, true); }
      });
    };
    if (img.inputs) { inputsById.set(img.id, img.inputs); if (!(cached && sameInputs(cached, img.inputs) && mode === 'drawn')) showDrawn(); }
    else { inputsById.delete(img.id); showPhoto(); }
    drawOrig();
    const showName = () => { $name.textContent = imgName(img); };
    showName();
    // Compare: on the first chart "Compare" picks it; on another chart the button opens both side by
    // side; on the picked chart it says "✓ Picked" and a tap unpicks it.
    const drawCmp = () => {
      const p = comparePick, mine = !!p && p.id === img.id;
      $cmp.classList.remove('hidden');
      $cmp.classList.toggle('go', !!p && !mine);
      $cmp.classList.toggle('picked', mine);
      $cmp.textContent = !p ? 'Compare' : mine ? '✓ Picked' : '⇄ Compare';
      $cmp.setAttribute('aria-label', !p ? 'Pick this chart to compare' : mine ? 'Picked to compare; tap to unpick' : `Compare with ${p.name || 'the picked chart'}`);
      $cmp.onclick = () => {
        if (!p) { count('compare.pick'); setPick({ id: img.id, name: imgName(img) }); toast('Picked. Now open the other chart, tap it, and tap Compare.'); drawCmp(); }
        else if (mine) { count('compare.unpick'); setPick(null); toast('No chart picked to compare.'); drawCmp(); }
        else { count('compare.open'); compareReturn = location.hash; go(`#/compare/${p.id}/${img.id}`); }
      };
    };
    drawCmp();
    api(`/api/images/${id}/context?${listQ}`).then((c) => {
      ctx = c;
      $count.textContent = c.index ? `${c.index} / ${c.total}` : '';
      $prev.classList.toggle('hidden', !c.prev); $next.classList.toggle('hidden', !c.next);
      for (const nid of [c.next, c.prev]) if (nid && !inputsById.has(nid)) { const pre = new Image(); pre.src = `/img/${nid}`; }
    }).catch(() => {});

    // The chart's own numbers: the name and date read off the picture and every position computed from
    // them. Tap a number to find every chart with it there; "Wrong? Fix" lets the owner correct the inputs.
    const $numbers = h('div', { class: 'numbers stack' });
    let numbers = null, fixing = false;
    const loadNumbers = async () => { try { numbers = await api(`/api/images/${img.id}/numbers`); } catch (err) { numbers = { error: err.message }; } drawNumbers(); };
    const drawNumbers = () => {
      if (img.kind !== 'chart') { fill($numbers); return; }
      if (!numbers) { fill($numbers, h('p', { class: 'muted small' }, 'Loading the numbers…')); return; }
      if (numbers.error) { fill($numbers, h('p', { class: 'err small' }, numbers.error)); return; }
      const inp = numbers.inputs;
      const when = inp && (inp.day || inp.month || inp.year) ? `${inp.day ?? '?'}.${inp.month ?? '?'}.${inp.year ?? '?'}` : '';
      if (fixing) {
        const field = (ph, v, attrs = {}) => h('input', { type: 'text', inputmode: 'numeric', placeholder: ph, autocomplete: 'off', value: v ?? '', ...attrs });
        const $day = field('day', inp && inp.day, { maxlength: 2 }), $month = field('month', inp && inp.month, { maxlength: 2 }), $year = field('year', inp && inp.year, { maxlength: 4 });
        const $name = h('input', { type: 'text', placeholder: 'Full name, exactly as typed into the chart', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', value: inp ? inp.name : '' });
        const $msg = h('p', { class: 'err small' });
        const save = async () => {
          try {
            count('viewer.fix_inputs');
            numbers = await api(`/api/images/${img.id}/inputs`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ day: $day.value.trim(), month: $month.value.trim(), year: $year.value.trim(), name: $name.value }) });
            fixing = false; toast('Numbers recomputed'); drawNumbers();
            const ni = numbers.inputs; img.inputs = ni ? { day: ni.day, month: ni.month, year: ni.year, name: ni.name } : null;
            if (img.inputs) { inputsById.set(img.id, img.inputs); showDrawn(); } else { inputsById.delete(img.id); showPhoto(); }
            drawOrig();
          } catch (err) { $msg.textContent = err.message; }
        };
        fill($numbers, h('b', {}, inp ? 'Fix the name or date' : 'Type the name and date'),
          h('p', { class: 'muted small' }, 'Exactly as typed into the chart: same spelling, every name, Jr or III included. The numbers are recomputed at once.'),
          h('div', { class: 'row qfields fixfields' }, $day, $month, $year), $name, $msg,
          h('div', { class: 'row', style: 'flex-wrap:nowrap' }, h('button', { type: 'button', class: 'btn-primary', style: 'flex:1', onclick: save }, 'Save'), h('button', { type: 'button', onclick: () => { fixing = false; drawNumbers(); } }, 'Cancel')));
        return;
      }
      if (!inp) {
        fill($numbers, h('div', { class: 'row', style: 'justify-content:space-between;flex-wrap:nowrap' }, h('span', { class: 'muted small' }, 'Name and date not read yet, so this chart cannot be found by position.'), h('button', { type: 'button', onclick: () => { fixing = true; drawNumbers(); } }, 'Type them')));
        return;
      }
      const groups = numbers.charts.map((c) => {
        const $chips = h('div', { class: 'chips tchips' });
        $chips.hidden = c.chart !== 'name';
        for (const v of c.values) $chips.append(h('button', { type: 'button', class: 'chip position', onclick: () => { count('viewer.number_tap'); go(positionHash([{ pos: `${c.chart}.${v.position}`, num: String(v.sum) }])); } }, h('span', { class: 't' }, `${v.label}${v.n ? ' ' + (v.n + 1) : ''}`), h('span', { class: 'count' }, v.sum < 10 ? String(v.sum) : v.text)));
        const $arrow = h('span', { class: 'arrow' }, $chips.hidden ? '⌄' : '⌃');
        return [h('button', { type: 'button', class: 'tgroup', onclick: () => { $chips.hidden = !$chips.hidden; $arrow.textContent = $chips.hidden ? '⌄' : '⌃'; } }, h('span', { class: 'tg-title' }, c.label), h('span', { class: 'muted small' }, `${c.values.length} numbers`), $arrow), $chips];
      });
      fill($numbers,
        h('div', { class: 'row', style: 'justify-content:space-between;flex-wrap:nowrap' }, h('div', { style: 'min-width:0' }, h('b', {}, inp.name || '(no name)'), h('div', { class: 'muted small' }, when ? `Born ${when}` : 'No date: name chart only')),
          h('div', { class: 'row', style: 'flex-wrap:nowrap;gap:6px' }, inp.name ? h('button', { type: 'button', onclick: wholePyramid }, 'Pyramid') : null, h('button', { type: 'button', onclick: () => { fixing = true; drawNumbers(); } }, 'Wrong? Fix'))),
        h('div', { class: 'muted small' }, 'Tap a number to find every chart with it in that position.'),
        ...groups.flat());
    };
    if (img.kind === 'chart') loadNumbers();
    const draw = () => {
      const groups = { name: [], position: [], number: [] };
      for (const t of img.tags) groups[t.kind].push(t);
      const $tagInput = h('input', { type: 'text', placeholder: 'Add a tag…', autocomplete: 'off', autocapitalize: 'none', enterkeyhint: 'done' });
      const addTag = async (name) => {
        try { const r = await postJson(`/api/images/${img.id}/tags`, { name }); img = r.image; toast(r.added ? `Added “${name}”` : `“${name}” was already there`); draw(); }
        catch (err) { toast(err.message, true); }
      };
      const $sugg = suggestBox($tagInput, { onPick: addTag, allowNew: true });
      const tagBtn = (t) => chip(t, { onclick: () => sheet(pretty(t.name), [
        { label: `▦ Show all ${img.kind === 'archetype' ? 'archetype pics' : 'charts'} tagged “${pretty(t.name)}”`, run: () => go(`#/?${img.kind === 'archetype' ? 'kind=archetype&' : ''}tag=${encodeURIComponent(t.name)}`) },
        { label: `✕ Remove “${pretty(t.name)}” from this ${img.kind === 'archetype' ? 'picture' : 'chart'}`, cls: 'btn-danger', run: async () => {
          try { const r = await postJson(`/api/images/${img.id}/tags/remove`, { name: t.name }); img = r.image; toast(`Removed “${t.name}”`); draw(); } catch (err) { toast(err.message, true); }
        } },
      ]) });
      // Who this is: the name under the thumbnail. Shown with a Fix button; a seeded guess asks to be confirmed.
      const $who = h('div', { class: 'who-row' });
      let fixingName = false;
      const drawWho = () => {
        if (img.kind !== 'chart') { fill($who); return; }
        if (fixingName) {
          const $in = h('input', { type: 'text', placeholder: 'First and last name, or the name they go by', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', value: img.title || '', maxlength: 80 });
          const save = async () => {
            try { count('viewer.fix_name'); const r = await api(`/api/images/${img.id}/title`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: $in.value }) }); img = r.image; fixingName = false; showName(); toast(img.title ? `Named ${img.title}` : 'Name cleared'); drawWho(); }
            catch (err) { toast(err.message, true); }
          };
          $in.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
          fill($who, h('b', {}, 'Who is this?'), h('p', { class: 'muted small' }, 'Short: first and last name, a stage name, or “Name · Group”. Tags are not changed.'), $in,
            h('div', { class: 'row', style: 'flex-wrap:nowrap' }, h('button', { type: 'button', class: 'btn-primary', style: 'flex:1', onclick: save }, 'Save'), h('button', { type: 'button', onclick: () => { fixingName = false; drawWho(); } }, 'Cancel')));
          setTimeout(() => $in.focus(), 50);
          return;
        }
        const ok = async () => { try { count('viewer.name_ok'); const r = await postJson(`/api/images/${img.id}/title/ok`, {}); img = r.image; toast('Name confirmed'); drawWho(); } catch (err) { toast(err.message, true); } };
        fill($who,
          h('div', { class: 'row', style: 'justify-content:space-between;flex-wrap:nowrap' },
            h('div', { style: 'min-width:0' }, h('b', {}, img.title || 'No name yet'), img.title_check ? h('div', { class: 'muted small' }, 'A guess. Is it right?') : null),
            h('div', { class: 'row', style: 'flex-wrap:nowrap;gap:6px' }, img.title_check ? h('button', { type: 'button', onclick: ok }, 'Yes') : null, h('button', { type: 'button', onclick: () => { fixingName = true; drawWho(); } }, img.title ? 'Fix' : 'Name it'))));
      };
      drawWho();
      fill($sheetBody,
        $who,
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', {}, `${img.tags.length} tag${img.tags.length === 1 ? '' : 's'}`), h('span', { class: 'muted small' }, 'Tap a tag for options')),
        groups.name.length ? h('div', { class: 'chips' }, ...groups.name.map(tagBtn)) : null,
        groups.position.length ? h('div', {}, h('div', { class: 'muted small', style: 'margin-bottom:6px' }, 'Positions'), h('div', { class: 'chips' }, ...groups.position.map(tagBtn))) : null,
        groups.number.length ? h('div', {}, h('div', { class: 'muted small', style: 'margin-bottom:6px' }, 'Numbers'), h('div', { class: 'chips' }, ...groups.number.map(tagBtn))) : null,
        h('div', { class: 'addtag row', style: 'flex-wrap:nowrap' }, $tagInput, h('button', { type: 'button', class: 'btn-primary', onclick: () => { const v = $tagInput.value.trim(); if (v) { count('viewer.add_tag'); addTag(v); $tagInput.value = ''; } } }, 'Add'), $sugg),
        $numbers,
        img.kind === 'chart' && readingUi ? readingUi.section(img) : null,
        h('div', { class: 'small muted' },
          h('div', {}, img.kind === 'archetype' ? 'Type: archetype pic (a picture that represents a number)' : 'Type: chart'),
          h('div', {}, `Taken: ${img.taken_at ? img.taken_at.replace('T', ' ') : 'unknown'}`),
          h('div', {}, img.has_file ? `File: ${fmtBytes(img.size)}, ${img.width}×${img.height}, uploaded ${fmtDate(img.uploaded_at)}` : 'File: not uploaded yet'),
          h('div', { style: 'word-break:break-all' }, img.filename),
          ...img.paths.map((p) => h('div', { style: 'word-break:break-all;padding-left:8px' }, p))));
    };
    draw();
  };

  // ---------- compare two charts ----------
  // Two panes, side by side or one above the other, each pinch-zoomable.
  // "Together" makes both follow the same zoom and position.
  routes.compare = function compareView(arg) {
    const [aId, bId] = arg.split('/');
    if (!/^\d+$/.test(aId || '') || !/^\d+$/.test(bId || '')) return swap('#/');
    const pref = { layout: 'side', linked: true, ...(readStore(CMPVIEW_KEY) || {}) };
    const savePref = () => writeStore(CMPVIEW_KEY, pref);
    // Like the viewer, it lies over the screen underneath. Opened from the viewer, Back returns to it;
    // opened from a link or a fresh load, the home screen is drawn underneath and Back goes there.
    const fromApp = compareReturn !== null;
    const back = () => (fromApp ? history.back() : swap('#/'));
    if (!fromApp) routes['']('', new URLSearchParams());
    document.body.classList.add('fullscreen');

    const pane = (id) => {
      const p = { id };
      p.img = h('img', { class: 'vimg', alt: '', draggable: 'false' });
      p.label = h('a', { class: 'cplabel', href: `#/chart/${id}` }, '');
      p.box = h('div', { class: 'cpane' }, p.img, p.label);
      return p;
    };
    const A = pane(aId), B = pane(bId);
    const $link = h('button', { type: 'button', class: 'vbtn', onclick: () => {
      pref.linked = !pref.linked; savePref(); drawBar(); count(pref.linked ? 'compare.together' : 'compare.apart');
      if (pref.linked && A.z && B.z) B.z.set(A.z.view());
      toast(pref.linked ? 'Together: both charts zoom and move as one.' : 'Apart: each chart zooms on its own.');
    } });
    const $layout = h('button', { type: 'button', class: 'iconbtn', onclick: () => {
      pref.layout = pref.layout === 'side' ? 'stack' : 'side'; savePref(); drawBar(); count('compare.layout');
      toast(pref.layout === 'side' ? 'Side by side' : 'One above the other');
    } });
    const $swap = h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Swap the two charts', title: 'Swap', onclick: () => { count('compare.swap'); swap(`#/compare/${bId}/${aId}`); } }, '⇄');
    const $hint = h('div', { class: 'cphint' }, 'Pinch to zoom · double-tap to zoom in or out');
    const $root = h('div', { class: 'viewer compare' },
      h('div', { class: 'cpanes' }, A.box, B.box),
      h('div', { class: 'vtop' }, h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Back', onclick: back }, '‹'), h('span', { class: 'vname' }, 'Compare'), $link, $layout, $swap),
      $hint);
    const drawBar = () => {
      $root.classList.toggle('stacked', pref.layout === 'stack');
      $link.classList.toggle('go', pref.linked);
      $link.textContent = pref.linked ? '🔗 Together' : 'Apart';
      $link.setAttribute('aria-label', pref.linked ? 'Zoom together is on' : 'Zoom together is off');
      $layout.textContent = pref.layout === 'side' ? '⬒' : '◫';
      $layout.setAttribute('aria-label', pref.layout === 'side' ? 'Put one above the other' : 'Put side by side');
    };
    drawBar();
    document.body.append($root);
    setTimeout(() => $hint.classList.add('gone'), 3500);

    const follow = (from, to) => () => { if (pref.linked && to.z && from.z) to.z.set(from.z.view()); };
    const keys = (e) => { if (e.key === 'Escape') back(); };
    window.addEventListener('keydown', keys);
    viewerCleanup = () => { $root.remove(); document.body.classList.remove('fullscreen'); window.removeEventListener('keydown', keys); if (A.z) A.z.destroy(); if (B.z) B.z.destroy(); };

    // Each pane shows the app's drawing when the chart's name and date are known, else the screenshot.
    for (const [p, other] of [[A, B], [B, A]]) {
      api(`/api/images/${p.id}`).then((img) => {
        learnTags(img.tags);
        p.label.textContent = imgName(img) || img.filename;
        const on = { change: follow(p, other), load: () => { if (pref.linked && other.z && p.z) p.z.set(other.z.view()); } };
        if (img.inputs) { const el = drawnChart(img.inputs); el.classList.add('vimg', 'drawn'); p.box.classList.add('drawn'); fill(p.box, el, p.label); trimDrawn(el); p.z = zoomable(p.box, el, on); }
        else if (img.has_file) { p.img.src = `/img/${img.id}`; p.z = zoomable(p.box, p.img, on); }
        else fill(p.box, h('p', { class: 'cpmsg' }, 'No picture for this chart yet.'), p.label);
      }).catch((err) => { fill(p.box, h('p', { class: 'cpmsg err' }, `Could not open this chart: ${err.message}`)); });
    }
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
    render(h('div', { class: 'screen stack' }, pageTop('Import Tags'),
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
    // Archetype Pics: albums like "15 pics" or "69 and 96 pics". Every picture
    // inside represents the number(s) in the folder name. Not charts.
    const $arch = h('input', { type: 'file', id: 'archfiles', multiple: true, webkitdirectory: true });
    const $pickArch = h('button', { type: 'button', class: 'btn-block', onclick: () => $arch.click() }, 'Import archetype pics (laptop)');
    render(h('div', { class: 'screen stack' }, pageTop('Upload Screenshots'),
      h('div', { class: 'card stack' },
        h('p', {}, 'Only files named in the tag file are sent; everything else is skipped on the phone. Files already here are skipped too, so you can stop and come back any time.'),
        $file, $pick,
        h('p', { class: 'muted small', style: 'margin-top:14px' }, 'On a laptop you can also pick a folder of Gallery albums. Every album folder becomes a tag on the charts inside it: "12 Mind Center" becomes 12mc, any other album keeps its exact name.'),
        $dir, $pickDir,
        h('p', { class: 'muted small', style: 'margin-top:14px' }, 'Archetype Pics are pictures that represent a number, kept apart from charts. Pick the folder that holds albums like "15 pics"; every picture inside gets the number(s) in the album name as tags.'),
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
      h('a', { class: 'btn btn-block', href: '#/quick', style: 'justify-content:space-between' }, 'Quick Chart', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/tags', style: 'justify-content:space-between' }, 'All Tags', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/names', style: 'justify-content:space-between' }, 'Names to Check', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/duplicates', style: 'justify-content:space-between' }, 'Possible Duplicates', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/deleted', style: 'justify-content:space-between' }, 'Deleted Charts', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/?drawn=0', style: 'justify-content:space-between' }, 'Charts Still Showing the Screenshot', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/position', style: 'justify-content:space-between' }, 'Search by Position', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/upload', style: 'justify-content:space-between' }, 'Upload Screenshots', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/import', style: 'justify-content:space-between' }, 'Import Tags', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/mychart', style: 'justify-content:space-between' }, 'My Chart (your own name and birth date)', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/ai', style: 'justify-content:space-between' }, 'AI Reading (key and monthly cap)', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/status', style: 'justify-content:space-between' }, 'Status and backup', h('span', { class: 'muted' }, '›')),
      h('a', { class: 'btn btn-block', href: '#/?kind=archetype', style: 'justify-content:space-between' }, 'Archetype Pics', h('span', { class: 'muted' }, '›'))));
  };

  // ---------- similar charts ----------
  // Charts like this one (owner 2026-10-19): every other chart scored by how many positions hold the same number,
  // per chart. Chips rank by every chart together or by one; each row says "Essence 9 of 11 · Name 3 of 15";
  // tap a row to see the two side by side in Compare.
  routes.similar = async function similarView(id, query) {
    if (!/^\d+$/.test(id || '')) return swap('#/');
    const by = query.get('by') || 'all';
    const $chips = h('div', { class: 'chips' });
    const $list = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Scoring every chart…'));
    const $who = h('h1', {}, 'Similar Charts');
    render(h('div', { class: 'screen stack' }, h('div', { class: 'pagetop' }, h('a', { class: 'btn iconbtn', href: `#/chart/${id}`, 'aria-label': 'Back' }, '‹'), $who),
      h('p', { class: 'muted small' }, 'Charts that hold the same numbers in the same places. Rank by every chart together, or by one chart. Tap a chart to see both side by side.'), $chips, $list));
    let me = null;
    try { me = await api(`/api/images/${id}`); $who.textContent = `Like ${imgName(me) || me.filename}`; } catch {}
    let d;
    try { d = await api(`/api/images/${id}/similar?by=${encodeURIComponent(by)}`); } catch (err) { fill($list, h('p', { class: 'err' }, err.message)); return; }
    const short = { essence: 'Essence', name: 'Name', vocation: 'Vocation', personality: 'Personality', outer: 'Outer Psyche', inner: 'Inner Psyche' };
    fill($chips, ...[{ key: 'all', label: 'Every Chart' }, ...d.charts.filter((c) => d.of[c.key])].map((c) => h('a', { class: `chip ${by === c.key ? 'active' : 'off'}`, href: `#/similar/${id}?by=${c.key}`, onclick: () => count('similar.by') }, short[c.key] || c.label)));
    if (!d.items.length) { fill($list, h('p', { class: 'muted' }, 'No other chart shares a number here yet.')); return; }
    // One line per row naming what is alike, in the course's words (server/similar.js gistOf).
    fill($list, ...d.items.map((it) => {
      return h('a', { class: 'card simrow', href: `#/compare/${id}/${it.id}`, onclick: () => { count('similar.compare'); compareReturn = location.hash; } },
        it.inputs && it.inputs.name ? h('div', { class: 'thumb drawn simthumb', role: 'img' }, drawnChart(it.inputs)) : it.has_file ? h('img', { class: 'thumb simthumb', src: `/thumb/${it.id}`, loading: 'lazy', alt: '' }) : h('div', { class: 'nofile simthumb' }, 'no file'),
        h('div', { class: 'stack', style: 'flex:1;min-width:0;gap:4px' },
          h('div', { class: 'row', style: 'justify-content:space-between;flex-wrap:nowrap' }, h('b', { class: 'ellip' }, it.title || (it.inputs && it.inputs.name) || it.filename), h('span', { class: 'count' }, by === 'all' ? `${it.total} of ${d.totalOf}` : `${it.per[by] || 0} of ${d.of[by] || 0}`)),
          it.inputs ? h('div', { class: 'muted small' }, `${it.inputs.name || ''}${it.inputs.day ? ` · ${it.inputs.day}.${it.inputs.month}.${it.inputs.year}` : ''}`) : null,
          h('div', { class: 'simgist' }, it.gist)));
    }));
  };

  // ---------- possible duplicates ----------
  // Groups of charts that look like the same chart twice: the very same picture, or the same typed name and
  // birth date (owner 2026-10-19). Only listed: the owner keeps several charts of one person on purpose, so
  // each chart has its own Hold to Delete, and "Keep Them All" hides a group that is fine.
  const when = (iso) => (iso ? String(iso).slice(0, 10) : '');
  routes.duplicates = async function duplicatesView() {
    const $list = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Looking…'));
    render(h('div', { class: 'screen stack' }, pageTop('Possible Duplicates'),
      h('p', { class: 'muted small' }, 'Charts that may be the same one twice: the same picture, or the same name and birth date. Several charts of one person can be on purpose: delete only what is really a repeat. Tap a picture to open it.'), $list));
    const draw = async () => {
      let d;
      try { d = await api('/api/duplicates'); } catch (err) { fill($list, h('p', { class: 'err' }, err.message)); return; }
      if (!d.groups.length) { fill($list, h('p', { class: 'muted' }, d.kept ? `No possible duplicates left. ${d.kept} group${d.kept === 1 ? '' : 's'} kept on purpose.` : 'No possible duplicates.')); return; }
      fill($list, h('p', { class: 'muted small' }, `${d.groups.length} group${d.groups.length === 1 ? '' : 's'}${d.kept ? `, ${d.kept} kept on purpose` : ''}`), ...d.groups.map((g) => {
        const $cards = h('div', { class: 'dupcards' }, ...g.charts.map((c) => {
          const $card = h('div', { class: 'dupcard' },
            // The screenshot, not the drawing: two charts with the same name and date draw the same, and the
            // screenshots are what tells a real repeat from a second chart kept on purpose.
            h('a', { href: `#/chart/${c.id}`, class: 'dupthumb' }, c.has_file ? h('img', { class: 'thumb', src: `/thumb/${c.id}`, loading: 'lazy', alt: '' }) : c.inputs && c.inputs.name ? h('div', { class: 'thumb drawn', role: 'img', 'aria-label': c.title || c.filename }, drawnChart(c.inputs)) : h('div', { class: 'nofile' }, 'no file yet')),
            h('div', { class: 'small' }, h('b', {}, c.title || '(no name)')),
            h('div', { class: 'muted small' }, `${when(c.taken_at) || 'no date'} · ${c.tag_count} tag${c.tag_count === 1 ? '' : 's'}${c.readings ? ` · ${c.readings} reading${c.readings === 1 ? '' : 's'}` : ''}`),
            h('div', { class: 'muted small wrap' }, c.filename),
            holdButton('Hold to Delete', async () => {
              try { count('duplicates.delete'); await api(`/api/images/${c.id}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: `duplicate (${g.why})` }) }); toast('Deleted. Put it back from Settings → Deleted Charts.'); await draw(); }
              catch (err) { toast(err.message, true); }
            }));
          return $card;
        }));
        return h('div', { class: 'card stack dupgroup' },
          h('div', { class: 'row', style: 'justify-content:space-between;flex-wrap:nowrap' }, h('b', {}, g.why === 'same picture' ? 'Same picture' : `Same name and birth date${g.charts[0].inputs ? `: ${g.charts[0].inputs.name}, ${g.charts[0].inputs.day}.${g.charts[0].inputs.month}.${g.charts[0].inputs.year}` : ''}`),
            h('button', { type: 'button', onclick: async () => { try { count('duplicates.keep'); await postJson('/api/duplicates/keep', { ids: g.charts.map((c) => c.id) }); toast('Kept. This group is not listed again.'); await draw(); } catch (err) { toast(err.message, true); } } }, 'Keep Them All')),
          $cards);
      }));
    };
    await draw();
  };

  // ---------- deleted charts ----------
  routes.deleted = async function deletedView() {
    const $list = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Looking…'));
    render(h('div', { class: 'screen stack' }, pageTop('Deleted Charts'),
      h('p', { class: 'muted small' }, 'Charts deleted in the app. Nothing here is lost: Put Back returns the chart with its picture, tags, name and numbers. A deleted chart is not brought back by importing the tag file.'), $list));
    const draw = async () => {
      let d;
      try { d = await api('/api/deleted'); } catch (err) { fill($list, h('p', { class: 'err' }, err.message)); return; }
      if (!d.items.length) { fill($list, h('p', { class: 'muted' }, 'No deleted charts.')); return; }
      fill($list, ...d.items.map((c) => h('div', { class: 'card dupcard row', style: 'flex-wrap:nowrap;align-items:flex-start' },
        c.has_file ? h('img', { class: 'thumb small', src: `/api/deleted/${c.id}/thumb`, loading: 'lazy', alt: '' }) : c.inputs && c.inputs.name ? h('div', { class: 'thumb drawn small', role: 'img' }, drawnChart(c.inputs)) : h('div', { class: 'nofile small' }, 'no picture'),
        h('div', { class: 'stack', style: 'flex:1;min-width:0;gap:4px' },
          h('b', {}, c.title || '(no name)'),
          h('div', { class: 'muted small' }, `Deleted ${when(c.deleted_at)}${c.reason ? ` · ${c.reason}` : ''}`),
          h('div', { class: 'muted small' }, `${c.tags.length} tag${c.tags.length === 1 ? '' : 's'}${c.inputs && c.inputs.name ? ` · ${c.inputs.name}` : ''}${c.readings ? ` · ${c.readings} reading${c.readings === 1 ? '' : 's'}` : ''}`),
          h('div', { class: 'muted small wrap' }, c.filename),
          h('button', { type: 'button', class: 'btn-primary', onclick: async () => { try { count('deleted.restore'); const r = await postJson(`/api/deleted/${c.id}/restore`, {}); toast('Put back.'); await draw(); go(`#/chart/${r.id}`); } catch (err) { toast(err.message, true); } } }, 'Put Back')))));
    };
    await draw();
  };

  // ---------- names to check ----------
  // Every chart whose name is still a guess or missing: the picture, the name in a box to tweak, the
  // tags and the typed name as hints. "Looks right" keeps it; "Save" keeps what was typed. Either removes the card.
  routes.names = async function namesView() {
    const $list = h('div', { class: 'stack' });
    const $head = h('p', { class: 'muted' }, 'Loading…');
    render(h('div', { class: 'screen stack' }, pageTop('Names to Check'), $head, $list));
    count('screen.names');
    let r;
    try { r = await api('/api/titles/check'); } catch (err) { $head.textContent = err.message; return; }
    const left = () => { const n = $list.querySelectorAll('.who-card').length; $head.textContent = n ? `${fmtN(n)} chart${n === 1 ? '' : 's'} to look at. The name is what shows under the thumbnail: first and last name, a stage name, or “Name · Group”.` : 'Every chart has a name you have confirmed. Fix any name from the chart itself (open it, swipe up, tap Fix).'; };
    for (const it of r.items) {
      const $in = h('input', { type: 'text', placeholder: 'First and last name', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', value: it.title || '', maxlength: 80 });
      const $card = h('div', { class: 'card who-card' });
      const done = (msg) => { $card.remove(); toast(msg); left(); };
      const save = async () => { const v = $in.value.trim(); if (!v) { toast('Type a name first', true); return; } try { count('names.save'); await api(`/api/images/${it.id}/title`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: v }) }); done(`Named ${v}`); } catch (err) { toast(err.message, true); } };
      const ok = async () => { try { count('names.ok'); await postJson(`/api/images/${it.id}/title/ok`, {}); done(`Kept ${it.title}`); } catch (err) { toast(err.message, true); } };
      $in.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
      const hints = [];
      if (it.typed) hints.push(`Typed into the chart: ${it.typed}`);
      if (it.tags.length) hints.push(`Tags: ${it.tags.map(pretty).join(', ')}`);
      fill($card,
        h('div', { class: 'row', style: 'flex-wrap:nowrap;align-items:flex-start' },
          h('a', { href: `#/chart/${it.id}`, class: 'who-thumb' }, it.has_file ? h('img', { src: `/thumb/${it.id}`, loading: 'lazy', alt: '' }) : h('div', { class: 'nofile' }, 'no file')),
          h('div', { class: 'stack', style: 'flex:1;min-width:0;gap:8px' },
            $in,
            ...hints.map((t) => h('div', { class: 'muted small' }, t)),
            h('div', { class: 'row', style: 'flex-wrap:nowrap' }, it.title ? h('button', { type: 'button', style: 'flex:1', onclick: ok }, 'Looks right') : null, h('button', { type: 'button', class: 'btn-primary', style: 'flex:1', onclick: save }, 'Save')))));
      $list.append($card);
    }
    left();
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
  // Which part of a chart a number belongs to, from its position name ('c.heartExtra' → center).
  const kindOfSlot = (slot) => { const k = slot.replace(/^(c|v|po|pi)\./, ''); return /^(ul|ur|ll|lr)$/.test(k) ? 'aura' : /^(heart|solar)/.test(k) ? 'center' : /^(first|middle|last)$/.test(k) ? 'line' : k === 'big' ? 'le' : k; };
  // Show sheet: which charts and which parts are drawn. This phone remembers the choice.
  const SHOW_CHARTS = [['ess', 'Essence Chart'], ['psy', 'Psyche Charts'], ['main', 'Name Chart'], ['vow', 'Vocation Chart'], ['con', 'Personality Chart']];
  const SHOW_KINDS = [['day', 'Day Numbers'], ['aura', 'Auras in the Corners'], ['center', 'Centers'], ['name', 'Names on the Line'], ['line', 'Line Values'], ['spine', 'Spine'], ['le', 'Life Expressions'], ['pillar', 'Pillars'], ['letters', 'Letter Count'], ['shape', 'Colored Shapes']];
  const SHOW_PRESETS = [['Everything', null], ['Centers only', 'center'], ['Names only', 'name'], ['Life expressions only', 'le']];
  const loadShow = () => { try { const s = JSON.parse(localStorage.getItem('quickShow') || 'null'); if (s && s.charts && s.kinds) return s; } catch {} return { charts: {}, kinds: {} }; };
  const saveShow = (show) => { try { localStorage.setItem('quickShow', JSON.stringify(show)); } catch {} };
  const shown = (show, group, key) => show[group][key] !== false;
  const applyShow = (svg, show) => {
    for (const [k] of SHOW_CHARTS) svg.classList.toggle(`hide-c-${k}`, !shown(show, 'charts', k));
    for (const [k] of SHOW_KINDS) svg.classList.toggle(`hide-k-${k}`, !shown(show, 'kinds', k));
    // Trim the blank above and below what is left (a hidden essence chart leaves no empty top), same width.
    if (!svg.isConnected) return;
    const b = svg.getBBox(); if (!b.height) return;
    const y0 = Math.max(20, Math.floor(b.y - 20)), y1 = Math.min(1290, Math.ceil(b.y + b.height + 20));
    svg.setAttribute('viewBox', `${371 - 425} ${y0} 850 ${y1 - y0}`);
  };
  // The sheet itself: tap a chip to show or hide that chart or part; the chart behind updates at once.
  function showSheet(show, onChange) {
    const bg = h('div', { class: 'sheet-bg', onclick: (e) => { if (e.target === bg) close(); } });
    const close = () => { bg.remove(); untrackOverlay(bg); };
    const $charts = h('div', { class: 'chips' }), $kinds = h('div', { class: 'chips' });
    const draw = () => {
      fill($charts, ...SHOW_CHARTS.map(([k, label]) => h('button', { type: 'button', class: `chip ${shown(show, 'charts', k) ? 'active' : 'off'}`, onclick: () => { show.charts[k] = !shown(show, 'charts', k); change(); } }, label)));
      fill($kinds, ...SHOW_KINDS.map(([k, label]) => h('button', { type: 'button', class: `chip ${shown(show, 'kinds', k) ? 'active' : 'off'}`, onclick: () => { show.kinds[k] = !shown(show, 'kinds', k); change(); } }, label)));
    };
    const change = () => { saveShow(show); onChange(); draw(); };
    const preset = (only) => { show.kinds = {}; if (only) for (const [k] of SHOW_KINDS) show.kinds[k] = (k === only || k === 'shape'); change(); };
    bg.append(h('div', { class: 'sheet showsheet' }, h('h3', {}, 'Show on the chart'),
      h('div', { class: 'chips' }, ...SHOW_PRESETS.map(([label, only]) => h('button', { type: 'button', class: 'chip preset', onclick: () => preset(only) }, label))),
      h('div', { class: 'muted small', style: 'margin:12px 0 6px' }, 'Charts'), $charts,
      h('div', { class: 'muted small', style: 'margin:12px 0 6px' }, 'Numbers'), $kinds,
      h('button', { type: 'button', class: 'btn-primary done', onclick: close }, 'Done')));
    draw(); document.body.append(bg); trackOverlay(bg, close);
  }
  // One rhombus with its two circles, white center line, pillar triangle and (optionally) the faded "big" circle.
  function rhombusShape(cx, cy, hw, hh, fill, o) {
    const g = sv('g');
    g.append(sv('polygon', { points: `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`, fill }));
    g.append(sv('rect', { x: cx - hw, y: cy - o.line / 2, width: hw * 2, height: o.line, fill: '#fff' }));
    const [rx, ry] = Array.isArray(o.r) ? o.r : [o.r, o.r]; // the paid tool's circles are a touch wider than tall
    g.append(sv('ellipse', { cx, cy: cy - o.up, rx, ry, fill: '#fff' }), sv('ellipse', { cx, cy: cy + (o.down || o.up), rx, ry, fill: '#fff' }));
    g.append(sv('polygon', { points: `${cx},${o.tri[0]} ${cx + o.tri[2]},${o.tri[1]} ${cx - o.tri[2]},${o.tri[1]}`, fill }));
    if (o.big) g.append(sv('circle', { cx: o.big[0], cy: o.big[1], r: o.big[2], fill: o.faded }));
    return g;
  }
  function numeroscopeSvg(data) {
    // 850 units across the screen, the drawing centered: the numbers at the far edges keep a thumb's
    // width of white, and the whole set still fits above the fold on a phone.
    const svg = sv('svg', { viewBox: `${371 - 425} 20 850 1270`, class: 'nscope', role: 'img', 'aria-label': 'Numeroscope' });
    const M = L.main, H = L.hex, P = L.psy, S = L.sub;
    // Essence shape: a cube seen from the front, light top and sides, dark front triangle, tinted circles.
    // Every shape and number carries its chart (data-chart) and kind (k-… / data-kind) so the Show sheet can hide parts.
    const grp = (chart, kind, ...nodes) => sv('g', { 'data-chart': chart, 'data-kind': kind || null }, ...nodes.filter(Boolean));
    svg.append(grp('ess', 'shape', sv('polygon', { points: `371,${H.top} ${371 + H.hw},${H.ul} ${371 - H.hw},${H.ul}`, fill: '#ced0e5' }),
      sv('polygon', { points: `${371 - H.hw},${H.ul} ${371 - H.hw},${H.ll} 371,${H.bottom}`, fill: '#ced0e5' }), sv('polygon', { points: `${371 + H.hw},${H.ul} ${371 + H.hw},${H.ll} 371,${H.bottom}`, fill: '#ced0e5' }),
      sv('polygon', { points: `${371 - H.hw},${H.ul} ${371 + H.hw},${H.ul} 371,${H.bottom}`, fill: '#afafd5' }),
      sv('circle', { cx: 371, cy: H.circle[0], r: H.circle[1], fill: '#efeff7' }), sv('circle', { cx: 371, cy: H.small[0], r: H.small[1], fill: '#d6d7eb' })));
    svg.append(grp('psy', 'shape', ...[[P.cxL, '#dde6ef'], [P.cxR, '#c3d5e1']].map(([cx, fill]) => rhombusShape(cx, P.cy, P.hw, P.hh, fill, { line: P.line, up: P.up, down: P.down, r: P.r, tri: P.tri }))));
    svg.append(grp('main', 'shape', rhombusShape(M.cx, M.lineY, M.hw, M.hh, '#eec186', { line: M.line, up: M.circleUp, down: M.circleDown, r: M.r, tri: M.tri, big: M.big, faded: '#f5efe3' }),
      sv('circle', { cx: M.letter[0], cy: M.letter[1], r: M.letter[2], fill: '#fff', stroke: '#a9c3e4', 'stroke-width': 2.5, class: 'k-letters' })));
    svg.append(grp('con', 'shape', rhombusShape(S.left.cx, S.cy, S.hw, S.hh, '#faddd7', { line: S.line, up: S.up, down: S.down, r: S.r, tri: S.tri, big: [S.left.bigX, S.bigY, S.bigR], faded: '#fef0ed' })));
    svg.append(grp('vow', 'shape', rhombusShape(S.right.cx, S.cy, S.hw, S.hh, '#dae7e0', { line: S.line, up: S.up, down: S.down, r: S.r, tri: S.tri, big: [S.right.bigX, S.bigY, S.bigR], faded: '#f6f8f7' })));

    // A number that knows its position (pos = { chart, key, pair, rel, n }) is a tap target: it and an invisible pad
    // behind it carry data-pos / data-num / data-pair / data-rel; the viewer and the Quick Chart outline it on the
    // first tap and open its meaning (public/meaning.js) on the second. Names and the letter count carry none.
    // pair = the numbers sharing a center's circle with it (main and extra vibrations); rel = the diamonds behind it
    // on the same chart ([position, value]), which are not drawn, so the page shows them with the number that makes them.
    const sums = (list) => (list || []).filter((q) => q && q.sum > 0).map((q) => q.sum);
    const posAttrs = (v, pos) => (pos && v && v.sum > 0 ? { 'data-pos': `${pos.chart}.${pos.key}`, 'data-num': String(v.sum), 'data-pair': sums(pos.pair).join(',') || null,
      'data-rel': (pos.rel || []).filter(([, d]) => d && d.sum > 0).map(([k, d]) => `${k}:${d.sum}`).join(',') || null, 'data-n': pos.n || null, role: 'button', 'aria-label': `What ${v.text} means in this position` } : {});
    const txt = (x, y, v, cls, size, anchor, pos) => (v ? sv('text', { x, y, class: cls + (pos && v.sum > 0 ? ' n-hit' : ''), 'font-size': size, 'text-anchor': anchor || 'middle', ...posAttrs(v, pos) }, typeof v === 'string' ? v : v.text) : null);
    const hit = (x, y, v, cls, size, anchor, pos) => {
      if (!v || !pos || !(v.sum > 0)) return null;
      // Rows of numbers sit close side by side, so the pad is only a little wider than the number; rows are far
      // apart, so it is a good deal taller (about 22 px on a phone for the smallest numbers, more when zoomed in).
      const w = Math.max(size * 2.2, size * 0.62 * String(v.text).length) + 16, hh = size * 1.25 + 24;
      const x0 = anchor === 'start' ? x - 8 : anchor === 'end' ? x - w + 8 : x - w / 2;
      return sv('rect', { x: x0, y: y - size - 12, width: w, height: hh, fill: 'transparent', class: 'n-hit ' + ((/k-\w+/.exec(cls) || [''])[0]), ...posAttrs(v, pos) });
    };
    const num = (x, y, v, cls, size, anchor, pos) => [hit(x, y, v, cls, size, anchor, pos), txt(x, y, v, cls, size, anchor, pos)];
    // Color of one number: the paid tool's choice for that position and value (number-colors.js).
    const words = data.name.words.length; // the paid tool's color rules change with how many words the name has
    const tone = (slot, v, bold) => 'n-' + NumberColors.lookup(slot, typeof v === 'string' ? v : (v ? v.text : ''), words) + (bold ? ' n-bold' : '') + ' k-' + kindOfSlot(slot);
    // x offsets of n items on one row: one at the center, two at the measured pair, more spread evenly across it.
    const spread = (n, pair, i) => (n <= 1 || !pair ? 0 : pair[0] + (pair[1] - pair[0]) * i / (n - 1));
    // The numbers of one rhombus. pre = the position prefix in number-colors.js ('' main, 'c.' consonants,
    // 'v.' vowels, 'po.' / 'pi.' psyche), t = that chart's text layout, cx its center, top the day (or null).
    const numbers = (pre, c, t, cx, top) => {
      const sd = t.sideDx || 0, aL = t.auraL ?? cx - t.auraDx + sd, aR = t.auraR ?? cx + t.auraDx + sd, an = t.auraAnchor;
      const nL = t.nameL ?? cx + t.nameDxL + sd, nR = t.nameR ?? cx + t.nameDxR + sd, lineBold = pre === '';
      const chart = { '': 'name', 'c.': 'personality', 'v.': 'vocation', 'po.': 'outer', 'pi.': 'inner' }[pre];
      const at = (key, pair, n, rel) => ({ chart, key, pair, n, rel });
      const MD = [['mindDiamond', c.mindDiamond]], ED = [['emotionDiamond', c.emotionDiamond]], LD = ['leDiamond', c.leDiamond];
      const PD = ['publicDiamond', Numeroscope.joined(top, c.first && c.first.value)];
      const mx = (i) => (t.middle2 && c.middle.length <= 2 ? cx + spread(c.middle.length, t.middle2, i) : nL + (nR - nL) * (i + 1) / (c.middle.length + 1));
      return [
        ...num(cx, t.dvY, top, tone(pre + 'day', top, pre === ''), t.day, null, { chart: 'essence', key: 'day', rel: [['nexus', data.essence.nexus]] }),
        ...num(aL, t.upY, c.upperLeft, tone(pre + 'ul', c.upperLeft), t.small, an, at('upperLeft', null, 0, MD)), ...num(aR, t.upY, c.upperRight, tone(pre + 'ur', c.upperRight), t.small, an, at('upperRight', null, 0, MD)),
        ...num(cx, t.heartY, c.heart, tone(pre + 'heart', c.heart, true), t.heart, null, at('heart', c.heartExtra, 0, MD)),
        ...c.heartExtra.flatMap((v, i) => num(cx + spread(c.heartExtra.length, t.extra2, i), t.heartY + t.extraUp, v, tone(pre + 'heartExtra', v), t.extra, null, at('heartExtra', [c.heart], i, MD))),
        ...(t.spineX ? num(t.spineX, t.spineY, c.spine, tone(pre + 'spine', c.spine), t.spine || t.small, null, at('spine', null, 0, [['spineDiamond', c.spineDiamond]])) : []),
        c.first && txt(nL, t.nameY, c.first.text, 'n-dark k-name', t.name), ...(c.first ? num(nL, t.lineY, c.first.value, tone(pre + 'first', c.first.value, lineBold), t.lineFont, null, at('first', null, 0, [PD, LD])) : []),
        ...c.middle.flatMap((w, i) => [txt(mx(i), t.nameY, w.text, 'n-dark k-name', t.name), ...num(mx(i), t.lineY, w.value, tone(pre + 'middle', w.value, lineBold), t.lineFont, null, at('middle', null, i))]),
        c.last && txt(nR, t.nameY, c.last.text, 'n-dark k-name', t.name), ...(c.last ? num(nR, t.lineY, c.last.value, tone(pre + 'last', c.last.value, lineBold), t.lineFont, null, at('last', null, 0, [LD])) : []),
        ...num(aL, t.lowY, c.lowerLeft, tone(pre + 'll', c.lowerLeft), t.small, an, at('lowerLeft', null, 0, ED)), ...num(aR, t.lowY, c.lowerRight, tone(pre + 'lr', c.lowerRight), t.small, an, at('lowerRight', null, 0, ED)),
        ...num(cx, t.solarY, c.solar, tone(pre + 'solar', c.solar, true), t.solar || t.heart, null, at('solar', c.solarExtra, 0, ED)),
        ...c.solarExtra.flatMap((v, i) => num(cx + spread(c.solarExtra.length, t.solarExtra2, i), t.solarY + t.extraDown, v, tone(pre + 'solarExtra', v), t.extra, null, at('solarExtra', [c.solar], i, ED))),
        ...(t.bigX !== undefined ? num(t.bigX, t.leY, c.big, tone(pre + 'big', c.big, true), t.le, null, at('big')) : []), ...num(cx, t.leY, c.le, tone(pre + 'le', c.le, true), t.le, null, at('le', null, 0, [LD])),
        ...num(cx, t.pillarY, c.pillar, tone(pre + 'pillar', c.pillar, t.pillarBold !== false), t.pillar, null, at('pillar')),
        // Main chart only: an invisible tap target over each name opens that word's own charts (its value below opens the meaning).
        ...(lineBold ? [c.first && tap(nL, c.first), ...c.middle.map((w, i) => tap(mx(i), w)), c.last && tap(nR, c.last)] : []),
      ];
    };
    const tap = (x, w) => sv('rect', { x: x - 50, y: L.main.text.nameY - 32, width: 100, height: 40, fill: 'transparent', class: 'n-tap k-name', 'data-word': w.text, role: 'button', 'aria-label': `Charts of the name ${w.text}` });
    const day = data.essence.day;
    svg.append(grp('main', null, ...numbers('', data.name, { ...M.text, bigX: M.big[0] }, M.cx, day),
      txt(M.letter[0], M.text.letterY, data.name.letters ? String(data.name.letters) : null, 'n-blue n-bold k-letters', M.text.letterFont)));
    svg.append(grp('con', null, ...numbers('c.', data.consonants, { ...S.text, ...S.left }, S.left.cx, day)), grp('vow', null, ...numbers('v.', data.vowels, { ...S.text, ...S.right }, S.right.cx, day)));
    // Psyche Charts: outer psyche in the left blue diamond, inner in the right (confirmed on vault screenshots).
    const bare = (c) => ({ ...c, big: null, middle: [], heartExtra: [], solarExtra: [], first: c.first && { text: '', value: c.first.value }, last: c.last && { text: '', value: c.last.value } });
    svg.append(grp('psy', null, ...numbers('po.', bare(data.psyche.outer), { ...P.text, sideDx: P.sideDxL }, P.cxL, day), ...numbers('pi.', bare(data.psyche.inner), { ...P.text, sideDx: P.sideDxR }, P.cxR, day)));
    // Essence numbers: top aura inside the top of the shape, month and year outside the upper corners,
    // little and big life path in the circle, outer and inner auras beside it. The small circle stays empty.
    const e = data.essence, T = H.text;
    // little and big life path in the circle, outer and inner auras beside it. All dark in the paid tool.
    const ep = (key, rel) => ({ chart: 'essence', key, rel });
    svg.append(grp('ess', null, ...num(371, T.topAuraY, e.topAura, 'n-dark k-aura', T.corner, null, ep('topAura', [['dharmaDiamond', e.dharmaDiamond], ['target', e.target]])), ...num(T.monthX, T.monthY, e.month, 'n-dark n-bold k-line', T.corner, null, ep('month')), ...num(T.yearX, T.monthY, e.year, 'n-dark n-bold k-line', T.corner, null, ep('year')),
      ...num(T.auraL, T.auraY, e.outerAura, 'n-dark k-aura', T.aura, null, ep('outerAura', [['outerDiamond', e.outerDiamond]])), ...num(T.auraR, T.auraY, e.innerAura, 'n-dark k-aura', T.aura, null, ep('innerAura', [['innerDiamond', e.innerDiamond]])),
      ...num(371, T.lpY, e.littleLp, 'n-dark n-bold k-center', T.lp, null, ep('littleLp', [['nexus', e.nexus]])), ...num(371, T.bigLpY, e.bigLp, 'n-dark n-bold k-center', T.lp, null, ep('bigLp'))));
    return svg;
  }
  // A vault chart drawn by the app from its read name and birth date (the Quick Chart drawing, everything
  // shown): the grid, the viewer and Compare show this instead of the screenshot, so every chart looks the
  // same. The name and date of every chart the list has shown are kept here so the viewer can draw at once.
  // Tap a number once: an outline goes round it. Tap it again: its meaning opens (owner 2026-10-19). A tap on
  // another number moves the outline; a tap anywhere else takes it away.
  const pickKey = (el) => ['data-pos', 'data-n', 'data-num'].map((a) => el.getAttribute(a) || '').join('|');
  function clearPick(svg) { if (!svg) return false; const had = !!svg.querySelector('.n-sel'); svg.querySelectorAll('.n-sel').forEach((r) => r.remove()); delete svg.dataset.sel; return had; }
  function pickNumber(el, open) {
    const svg = el.ownerSVGElement || el.closest('svg');
    const key = pickKey(el);
    if (svg.dataset.sel === key) { open(); return; }
    clearPick(svg);
    const t = [...svg.querySelectorAll('text[data-pos]')].find((x) => pickKey(x) === key) || el;
    const b = t.getBBox(), pad = Math.max(6, b.height * 0.28);
    svg.append(sv('rect', { x: b.x - pad, y: b.y - pad * 0.6, width: b.width + pad * 2, height: b.height + pad * 1.2, rx: (b.height + pad * 1.2) / 2, class: 'n-sel' }));
    svg.dataset.sel = key;
  }
  function drawnChart(inp) { return numeroscopeSvg(Numeroscope.numeroscope({ day: inp.day ?? '', month: inp.month ?? '', year: inp.year ?? '', name: inp.name || '' })); }
  // Cut the blank above and below the drawing once it is on the page (same width), so zooming centers on the chart.
  const trimDrawn = (svg) => { if (!svg.isConnected) return; const b = svg.getBBox(); if (!b.height) return; const y0 = Math.max(20, Math.floor(b.y - 20)), y1 = Math.min(1290, Math.ceil(b.y + b.height + 20)); svg.setAttribute('viewBox', `${371 - 425} ${y0} 850 ${y1 - y0}`); };
  const inputsById = new Map();
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
    const tone = (slot, v, bold) => 'n-' + NumberColors.lookup(slot, v ? v.text : '', count) + (bold ? ' n-bold' : '');
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
    const cls = (v, i) => { const t = Numeroscope.TENSION[v.sum]; return 'n-' + (v.sum < 10 ? 'dark' : NumberColors.lookup('first', v.text, 1)) + (t ? (i === 0 ? ' top-tense' : ' tense') : ''); };
    const n = rows.length, wide = n > 8;
    return h('div', { class: 'pyr' + (wide ? ' wide' : ''), style: wide ? `--cell:${Math.max(22, Math.floor((Math.min(innerWidth, 760) - 42) / n))}px` : '' },
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
  // wholeName (owner's ask 2026-10-17): every name run together with no spaces ("MatthewDavidMcConaughey")
  // as one word, so the pyramid of the whole name shows; only the pyramid, the letter charts of a 20-letter
  // "word" would not be readable.
  function openWord(word, day, { wholeName = false } = {}) {
    if (wholeName) word = String(word || '').replace(/\s+/g, '');
    const r = Numeroscope.singleName(word, day);
    if (!r.letters) return;
    day = day && day.text ? day : null;
    const close = () => { $pop.remove(); untrackOverlay($pop); document.body.classList.remove('noscroll'); window.removeEventListener('keydown', keys); };
    const keys = (e) => { if (e.key === 'Escape') close(); };
    const W = r.weight;
    const $table = h('div', { class: 'hidden' }, weightEl(W));
    const $more = h('button', { type: 'button', class: 'linkbtn', onclick: () => { $table.classList.toggle('hidden'); $more.textContent = $table.classList.contains('hidden') ? 'Details' : 'Hide details'; } }, 'Details');
    const small = (title, c, pre) => h('div', { class: 'wcard' }, h('div', { class: 'wlabel' }, title), singleNameSvg(c, pre, c.words.length, day));
    const $pyr = pyramidEl(r);
    const $pop = h('div', { class: 'wordpop' },
      h('div', { class: 'pagetop' }, h('button', { type: 'button', class: 'btn iconbtn', 'aria-label': 'Close', onclick: close }, '‹'), h('h1', { class: wholeName ? 'whole' : '' }, wholeName ? 'Whole Name Pyramid' : word), h('span', { class: 'muted small' }, `${r.letters} letters`)),
      wholeName ? h('p', { class: 'muted small', style: 'margin:0 0 8px;word-break:break-all' }, `All the names together, no spaces: ${word}`) : null,
      h('div', { class: 'wcard' }, h('div', { class: 'wlabel' }, 'Number Pyramid'), $pyr,
        h('div', { class: 'verdict' },
          h('div', {}, h('span', { class: 'muted small' }, 'Weight'), h('b', {}, fmtW(W.total))),
          h('div', {}, h('span', { class: 'muted small' }, 'Ratio'), h('b', { class: W.approved ? 'ok' : 'err' }, W.ratio.toFixed(3))),
          h('div', {}, h('span', { class: 'muted small' }, W.approved ? 'Under 0.3' : '0.3 or over'), h('b', { class: W.approved ? 'ok' : 'err' }, W.approved ? 'Approved' : 'Not approved')),
          $more),
        $table),
      wholeName || day ? null : h('p', { class: 'muted small', style: 'margin:0 0 8px' }, 'Type a birth day to see the top half of the charts and the pillars.'),
      wholeName ? null : h('div', { class: 'wcard' }, h('div', { class: 'wlabel' }, 'Name Chart'), singleNameSvg(r.name, '', r.letters, day)),
      wholeName ? null : h('div', { class: 'two' }, small('Vocation', r.vowels, 'v.'), small('Personality', r.consonants, 'c.')));
    trackOverlay($pop, close); document.body.append($pop); document.body.classList.add('noscroll'); window.addEventListener('keydown', keys);
    // A pyramid wider than the card starts scrolled to its middle, where the top sits, and says it can be swiped.
    if ($pyr.scrollWidth > $pyr.clientWidth) { $pyr.scrollLeft = ($pyr.scrollWidth - $pyr.clientWidth) / 2; $pyr.after(h('p', { class: 'muted small', style: 'margin:2px 6px 0;color:#8a8f9c' }, 'Wider than the screen: swipe the pyramid sideways to see its edges.')); }
  }

  // The chart drawing as a PNG (the app's own styles and font inlined, so the picture is what the screen shows).
  let fontData = null;
  async function chartPng(svg, width = 1612) {
    if (!fontData) { const buf = await fetch('/fonts/open-sans.woff2').then((r) => r.arrayBuffer()); fontData = 'data:font/woff2;base64,' + btoa(String.fromCharCode(...new Uint8Array(buf))); }
    const rules = [];
    for (const sheet of document.styleSheets) { try { for (const rule of sheet.cssRules) if (rule.selectorText && rule.selectorText.includes('.nscope')) rules.push(rule.cssText); } catch {} }
    const clone = svg.cloneNode(true);
    clone.querySelectorAll('.n-sel').forEach((r) => r.remove());
    const [vx, vy, vw, vh] = clone.getAttribute('viewBox').split(' ').map(Number);
    const height = Math.round(width * vh / vw);
    clone.setAttribute('width', width); clone.setAttribute('height', height); clone.setAttribute('xmlns', SVGNS);
    clone.prepend(sv('style', {}, `@font-face{font-family:"Open Sans";src:url(${fontData}) format("woff2");font-weight:300 800}\n${rules.join('\n')}`));
    clone.prepend(sv('rect', { x: vx, y: vy, width: vw, height: vh, fill: '#fff' }));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Could not draw the chart.')); img.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
      return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not make the picture.'))), 'image/png'));
    } finally { URL.revokeObjectURL(url); }
  }

  routes.quick = function quickView(_, query) {
    const field = (ph, attrs = {}) => h('input', { type: 'text', inputmode: 'numeric', placeholder: ph, autocomplete: 'off', ...attrs });
    const $day = field('day', { maxlength: 2 }), $month = field('month', { maxlength: 2 }), $year = field('year', { maxlength: 4 });
    const $name = h('input', { type: 'text', placeholder: 'Full name', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false' });
    const $chart = h('div', { class: 'nscope-box' });
    let data = null, svg = null;
    const show = loadShow();
    // Augmentation (the course rule that lifts a one-digit name value: Sj 4 -> 13/4) is on unless switched
    // off in the menu to see the raw values. Remembered per phone.
    let augment = true; try { augment = localStorage.getItem('quickAugment') !== 'off'; } catch {}
    const input = () => ({ day: $day.value, month: $month.value, year: $year.value, name: $name.value, augment });
    // What was typed stays on this device: back out, come back, and it is still there (owner's rule 2026-10-16).
    const DRAFT = 'quickDraft';
    const saveDraft = () => { try { localStorage.setItem(DRAFT, JSON.stringify({ day: $day.value, month: $month.value, year: $year.value, name: $name.value })); } catch {} };
    const loadDraft = () => { try { const d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); if (d) { $day.value = d.day || ''; $month.value = d.month || ''; $year.value = d.year || ''; $name.value = d.name || ''; } } catch {} };
    const draw = () => {
      data = Numeroscope.numeroscope(input());
      svg = numeroscopeSvg(data); fill($chart, svg); applyShow(svg, show);
    };
    $chart.addEventListener('click', (e) => {
      const p = e.target.closest && e.target.closest('[data-pos]');
      if (p && meaningUi) { pickNumber(p, () => { count('quick.meaning'); meaningUi.open(meaningUi.fromEl(p)); }); return; }
      if (clearPick(svg)) return;
      const t = e.target.closest && e.target.closest('[data-word]'); if (t) openWord(t.getAttribute('data-word'), data && data.essence.day);
    });
    for (const el of [$day, $month, $year, $name]) el.addEventListener('input', () => { saveDraft(); draw(); });
    // The ⋮ menu sits beside the name field, never on the chart: Full screen and Save to Vault. Taps outside close it.
    const $full = h('button', { type: 'button', class: 'cmenu-item' }, 'Full screen');
    const $save = h('button', { type: 'button', class: 'cmenu-item' }, 'Save to Vault');
    const $showBtn = h('button', { type: 'button', class: 'cmenu-item', onclick: () => { count('quick.show_parts'); $menu.classList.add('hidden'); showSheet(show, () => applyShow(svg, show)); } }, 'Show and Hide Parts');
    const $rows = h('button', { type: 'button', class: 'cmenu-item', onclick: () => { count('quick.year_rows'); $menu.classList.add('hidden'); openForecast(input()); } }, 'Year Rows and Day Vibrations');
    const $pyrItem = h('button', { type: 'button', class: 'cmenu-item', onclick: () => { $menu.classList.add('hidden'); if (!$name.value.trim()) { toast('Type a name first.', true); $name.focus(); return; } count('quick.whole_pyramid'); openWord($name.value, data && data.essence.day, { wholeName: true }); } }, 'Whole Name Pyramid');
    const augmentLabel = () => (augment ? 'Augmentation On' : 'Augmentation Off');
    const $augment = h('button', { type: 'button', class: 'cmenu-item', role: 'menuitemcheckbox', 'aria-checked': String(augment), onclick: () => {
      count('quick.augment'); augment = !augment; try { localStorage.setItem('quickAugment', augment ? 'on' : 'off'); } catch {}
      $augment.textContent = augmentLabel(); $augment.setAttribute('aria-checked', String(augment)); $menu.classList.add('hidden'); draw();
    } }, augmentLabel());
    const $menu = h('div', { class: 'cmenu hidden', role: 'menu' }, $full, $showBtn, $rows, $pyrItem, $augment, $save);
    const $dots = h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'More', title: 'More', onclick: (e) => { e.stopPropagation(); $menu.classList.toggle('hidden'); } }, '⋮');
    document.addEventListener('click', (e) => { if (!$menu.contains(e.target)) $menu.classList.add('hidden'); });
    const $home = h('div', { class: 'nscope-home' }, $chart);
    // Full screen: the chart alone, edge to edge, until the X is tapped. The chart element moves into the
    // overlay and back, so what was typed stays. Leaving the screen closes it (route() clears overlays).
    $full.onclick = () => {
      count('quick.full_screen');
      $menu.classList.add('hidden');
      const close = () => { $ov.remove(); untrackOverlay($ov); document.body.classList.remove('fullscreen'); $home.prepend($chart); window.removeEventListener('keydown', keys); };
      const keys = (e) => { if (e.key === 'Escape') close(); };
      const $ov = h('div', { class: 'nsfull' }, h('button', { type: 'button', class: 'cbtn nsfull-x', 'aria-label': 'Leave full screen', onclick: close }, '×'), $chart);
      trackOverlay($ov, close); document.body.append($ov); document.body.classList.add('fullscreen'); window.addEventListener('keydown', keys);
    };
    // Save to Vault: the drawing becomes a chart picture tagged with the typed name, then opens with its tags.
    $save.onclick = async () => {
      count('quick.save');
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
      } catch (err) { toast(err.message, true); $save.disabled = false; $save.textContent = 'Save to Vault'; $menu.classList.add('hidden'); }
    };
    // The whole screen is white like the chart card, the fields are small, the chart runs edge to edge:
    // the chart is what this screen is for. The light look is undone when another screen takes over.
    document.documentElement.classList.add('light');
    viewerCleanup = () => document.documentElement.classList.remove('light');
    render(h('div', { class: 'screen qscreen' },
      h('div', { class: 'row qfields' }, h('a', { class: 'btn iconbtn', href: '#/', 'aria-label': 'Back' }, '‹'), $day, $month, $year),
      h('div', { class: 'row qfields qname' }, $name, $dots, $menu), $home));
    // Opened from the home screen's "My Chart" button: the saved name and birth date fill the boxes.
    const me = query && query.get('me') && toolsUi ? toolsUi.myChart() : null;
    if (me && me.day) { $day.value = String(me.day); $month.value = String(me.month); $year.value = String(me.year); $name.value = me.name || ''; saveDraft(); }
    else loadDraft();
    draw();
    if (!$name.value) setTimeout(() => $name.focus(), 50);
  };

  // ---------- all tags ----------
  // Every tag there is, three ways: the words (people and topics), the position codes grouped by
  // position, and everything grouped by number. Tap a tag to search it. Groups open on tap.
  // ---------- search by position ----------
  // Type a number, see how many charts hold it in every position of every chart, tap one. The counts come
  // from the server's stored chart numbers; the search itself is the browse screen with ?pos=&num=.
  routes.position = async function positionView(_, query) {
    // Conditions already chosen (?pos=&num=, pairwise) are kept and shown at the top: the next number narrows
    // the charts that meet them ("day 8" first, then "first name 15" among those). ?edit= is a number to start with.
    const fixed = condsOf(query);
    const startNum = query.get('edit') || '';
    let chart = 'name'; try { chart = localStorage.getItem('posChart') || 'name'; } catch {}
    // Two numbers ("4" and "9") look for a combination: the two parts of a center or a diamond, either way round.
    const [startA, startB = ''] = startNum.split('+');
    const $num = h('input', { type: 'text', inputmode: 'numeric', placeholder: fixed.length ? 'Next number' : 'Number, like 12', autocomplete: 'off', maxlength: 3, value: startA.replace('/', ''), enterkeyhint: 'search' });
    const $num2 = h('input', { type: 'text', class: 'second', inputmode: 'numeric', placeholder: 'number', autocomplete: 'off', maxlength: 3, value: startB.replace('/', ''), enterkeyhint: 'search', 'aria-label': 'Second number of a combination, meeting the first in a center or diamond' });
    const $ds = h('button', { type: 'button', class: 'chip off', title: 'Digit sum' }, 'as a digit sum');
    let ds = startA.startsWith('/');
    const combo = () => !!($num.value.trim() && $num2.value.trim());
    const $fixed = h('div', { class: 'fixedconds' });
    const $charts = h('div', { class: 'chips tabs' });
    const $list = h('div', { class: 'stack poslist' });
    const $hint = h('p', { class: 'muted small' });
    render(h('div', { class: 'screen' }, pageTop('Search by Position', fixed.length ? positionHash(fixed) : '#/'), $fixed,
      h('div', { class: 'row posnum', style: 'flex-wrap:nowrap' }, $num, h('span', { class: 'muted small andword' }, 'meets'), $num2, $ds), $hint, $charts, $list));
    try { await loadCatalog(true); } catch (err) { if (!catalog) { fill($list, h('p', { class: 'err' }, err.message)); return; } }
    let counts = null, seq = 0;
    const numText = () => { const n = $num.value.trim(); if (!n) return ''; if (combo()) return `${n}+${$num2.value.trim()}`; return ds ? `/${n.slice(-1)}` : n; };
    const fixedParam = () => fixed.map((c) => `${c.pos}:${c.num}`).join(',');
    const refresh = async () => {
      const n = numText(); const my = ++seq;
      $ds.classList.toggle('hidden', combo() || !/^\d$/.test($num.value.trim()));
      if (!n) { counts = null; drawList(); return; }
      try { const c = await api('/api/positions/counts?num=' + encodeURIComponent(n) + (fixed.length ? '&fixed=' + encodeURIComponent(fixedParam()) : '')); if (my === seq) { counts = c; drawList(); } } catch (err) { if (my === seq) { counts = { error: err.message }; drawList(); } }
    };
    // The conditions kept so far, each with its × (dropping one re-opens this picker without it), and the way to
    // the charts that meet them as they are.
    const drawFixed = () => {
      if (!fixed.length) { fill($fixed); return; }
      const total = counts && !counts.error && counts.fixedTotal !== null && counts.fixedTotal !== undefined ? counts.fixedTotal : null;
      fill($fixed, h('div', { class: 'muted small', style: 'margin-bottom:6px' }, 'Every chart found must have:'),
        h('div', { class: 'chips' }, ...fixed.map((c, i) => h('span', { class: 'chip position' }, h('span', { class: 't' }, condLabel(c)),
          h('button', { type: 'button', class: 'x', 'aria-label': `Remove ${condLabel(c)}`, onclick: () => { const rest = fixed.filter((_, j) => j !== i); swap('#/position?' + condsQuery(rest, numText() ? { edit: numText() } : {})); } }, '×')))),
        h('a', { class: 'linkbtn', href: positionHash(fixed) }, total === null ? 'See these charts ›' : `See these ${fmtN(total)} chart${total === 1 ? '' : 's'} ›`));
    };
    const drawCharts = () => fill($charts, ...[{ key: '*', label: 'Any chart' }, ...catalog.charts].map((c) => h('button', { type: 'button', class: `chip ${chart === c.key ? 'active' : 'off'}`, onclick: () => { chart = c.key; try { localStorage.setItem('posChart', chart); } catch {} drawCharts(); drawList(); } }, c.label)));
    const pick = (pos) => { const n = numText(); if (!n) { $num.focus(); toast('Type a number first', true); return; } count(fixed.length ? 'position.search_more' : 'position.search'); go(positionHash([...fixed, { pos, num: n }])); };
    const drawList = () => {
      drawFixed();
      const n = numText();
      const have = `${fmtN(counts ? counts.total : 0)} chart${counts && counts.total === 1 ? '' : 's'}${fixed.length ? ' of these' : ''} have ${numLabel(n)}${combo() ? ' meeting in a center or diamond (one digit means the digit sum, so 4 finds a 13/4 or a 22/4)' : ' somewhere'}. Tap the position it must be in.`;
      $hint.textContent = n ? (counts && !counts.error ? have : '')
        : fixed.length ? 'Type the next number, then tap the position it must be in. Only charts with everything above are counted.'
        : 'Type a number, then tap the position it must be in. Two numbers side by side, like 4 and 9, find them meeting in a center or diamond. Once the charts show, tap “+ Another number” above them to ask for a second position too, like day 8 with first name 15. Charts are found by their name and date, tags or not.';
      if (counts && counts.error) { fill($list, h('p', { class: 'err' }, counts.error)); return; }
      const cnt = (pos) => (counts ? (pos.endsWith('.*') ? (pos === '*.*' ? counts.total : counts.perChart[pos.split('.')[0]] || 0) : counts.counts[pos] || 0) : null);
      const row = (pos, label, note) => { const c = cnt(pos); return h('button', { type: 'button', class: `posrow ${c === 0 ? 'none' : ''}`, onclick: () => pick(pos) }, h('span', { class: 'pl' }, h('span', {}, label), note ? h('span', { class: 'muted small' }, note) : null), h('b', {}, c === null ? '' : fmtN(c))); };
      const out = [];
      if (chart === '*') out.push(row('*.*', 'Anywhere', 'Any position of any chart'), ...catalog.charts.map((c) => row(`${c.key}.*`, `Anywhere in the ${c.label.toLowerCase()}`, c.note)));
      else {
        const c = catalog.charts.find((x) => x.key === chart);
        const list = catalog.positions.filter((p) => p.chart === chart && (!combo() || p.combo));
        out.push(row(`${chart}.*`, `Anywhere in the ${c.label.toLowerCase()}`, combo() ? 'Any center or diamond of it' : c.note), ...list.map((p) => row(`${chart}.${p.key}`, p.label)));
      }
      fill($list, ...out);
    };
    for (const el of [$num, $num2]) {
      el.addEventListener('input', () => { clearTimeout($num.t); $num.t = setTimeout(refresh, 150); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
    }
    $ds.onclick = () => { ds = !ds; $ds.classList.toggle('active', ds); $ds.classList.toggle('off', !ds); refresh(); };
    $ds.classList.toggle('active', ds); $ds.classList.toggle('off', !ds);
    drawCharts(); refresh();
    if (!$num.value) setTimeout(() => $num.focus(), 50);
  };

  routes.tags = async function tagsView() {
    const VIEWS = [['words', 'Words'], ['position', 'By position'], ['number', 'By number']];
    let view = 'words'; try { view = localStorage.getItem('tagsView') || 'words'; } catch {}
    if (!VIEWS.some(([k]) => k === view)) view = 'words';
    const $tabs = h('div', { class: 'chips tabs' });
    const $body = h('div', { class: 'stack' }, h('p', { class: 'muted' }, 'Loading…'));
    render(h('div', { class: 'screen' }, pageTop('All Tags', '#/'), $tabs, $body));
    let all;
    try { all = await api('/api/tags/all'); } catch (err) { fill($body, h('p', { class: 'err' }, err.message)); return; }
    learnTags(all);
    const used = all.filter((t) => t.count > 0);
    const n = (t) => t.charts || t.archetypes;
    const search = (t) => `#/?${!t.charts && t.archetypes ? 'kind=archetype&' : ''}tag=${encodeURIComponent(t.name)}`;
    const tagLink = (t, label) => h('a', { class: `chip ${t.kind}`, href: search(t), title: t.name }, h('span', { class: 't' }, label || pretty(t.name)), h('span', { class: 'count' }, fmtN(n(t))));
    const sumOf = (list) => list.reduce((a, t) => a + n(t), 0);
    const charts = (list) => `${fmtN(list.length)} tag${list.length === 1 ? '' : 's'} · ${fmtN(sumOf(list))} chart${sumOf(list) === 1 ? '' : 's'}`;
    const group = (title, list, chips, open = false) => {
      const $chips = h('div', { class: 'chips tchips' }, ...chips);
      $chips.hidden = !open;
      const $arrow = h('span', { class: 'arrow' }, open ? '⌃' : '⌄');
      const $btn = h('button', { type: 'button', class: 'tgroup', onclick: () => { $chips.hidden = !$chips.hidden; $arrow.textContent = $chips.hidden ? '⌄' : '⌃'; } },
        h('span', { class: 'tg-title' }, title), h('span', { class: 'muted small' }, charts(list)), $arrow);
      return [$btn, $chips];
    };
    const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    const byCount = (a, b) => n(b) - n(a) || byName(a, b);
    const parsed = (t) => TagCodes.parse(t.name);
    const draw = () => {
      fill($tabs, ...VIEWS.map(([k, label]) => h('button', { type: 'button', class: `chip ${view === k ? 'active' : 'off'}`, onclick: () => { view = k; try { localStorage.setItem('tagsView', k); } catch {} draw(); } }, label)));
      const out = [];
      if (view === 'words') {
        const words = used.filter((t) => t.kind === 'name');
        const most = words.filter((t) => n(t) >= 3).sort(byCount);
        if (most.length) out.push(...group('Used the most', most, most.map((t) => tagLink(t)), true));
        const letters = new Map();
        for (const t of words.slice().sort(byName)) { const c = t.name[0].toUpperCase(); const key = /[A-Z]/.test(c) ? c : '#'; if (!letters.has(key)) letters.set(key, []); letters.get(key).push(t); }
        for (const [letter, list] of letters) out.push(...group(letter, list, list.map((t) => tagLink(t))));
        if (!words.length) out.push(h('p', { class: 'muted' }, 'No word tags yet.'));
      } else if (view === 'position') {
        const groups = new Map();
        for (const t of used.filter((t) => t.kind === 'position')) {
          const p = parsed(t);
          const key = p ? (p.label || 'Two numbers together') : 'Other codes';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(t);
        }
        const order = [...groups.entries()].sort((a, b) => sumOf(b[1]) - sumOf(a[1]) || a[0].localeCompare(b[0]));
        for (const [label, list] of order) {
          list.sort((a, b) => { const pa = parsed(a), pb = parsed(b); return (pa && pb ? pa.numbers[0] - pb.numbers[0] : 0) || byName(a, b); });
          out.push(...group(label, list, list.map((t) => { const p = parsed(t); return tagLink(t, p ? p.numbers.map((x) => (x < 10 ? String(x) : `${x}/${TagCodes.digitSum(x)}`)).join(' + ') : t.name); })));
        }
        if (!groups.size) out.push(h('p', { class: 'muted' }, 'No position tags yet.'));
      } else {
        const groups = new Map();
        for (const t of used.filter((t) => t.kind !== 'name')) {
          const p = parsed(t);
          const key = p ? p.numbers[0] : 'other';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(t);
        }
        const order = [...groups.entries()].sort((a, b) => (a[0] === 'other') - (b[0] === 'other') || a[0] - b[0]);
        for (const [num, list] of order) {
          list.sort(byCount);
          const title = num === 'other' ? 'Other' : `${num < 10 ? num : `${num}/${TagCodes.digitSum(num)}`}${TagCodes.NAMES[num] ? ' · ' + TagCodes.NAMES[num] : ''}`;
          out.push(...group(title, list, list.map((t) => {
            const p = parsed(t);
            const label = !p ? t.name : p.numbers.length > 1 ? TagCodes.pretty(t.name) : p.label || (t.archetypes && !t.charts ? 'archetype pics' : 'the number itself');
            return tagLink(t, label);
          })));
        }
        if (!groups.size) out.push(h('p', { class: 'muted' }, 'No number tags yet.'));
      }
      fill($body, ...out);
    };
    draw();
  };

  // ---------- year rows and day vibrations (forecasting, Module 17) ----------
  // From the quick chart's date and name: the destiny periods, one year's rows (main column, aura, shadow
  // column) and the day vibrations of one date. Math: Numeroscope.yearRows / dayRows (public/numeroscope.js).
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const rowText = (v) => (v ? (v.sum < 10 ? String(v.sum) : v.text) : '–');
  // What a number in the rows means: the course's one line, the archetype name, a known combination.
  function meaningSheet(v, vertical) {
    if (!v) return;
    const bg = h('div', { class: 'sheet-bg', onclick: (e) => { if (e.target === bg) close(); } });
    const close = () => { bg.remove(); untrackOverlay(bg); };
    const line = (x) => (x ? h('p', { style: 'margin:0 0 10px' }, h('b', {}, rowText(x)), TagCodes.NAMES[x.sum] ? ` ${TagCodes.NAMES[x.sum]}` : '', h('br'), Numeroscope.MEANINGS[x.sum] || Numeroscope.MEANINGS[x.ds] || '', Numeroscope.combos(x) ? h('span', { class: 'muted' }, h('br'), Numeroscope.combos(x)) : null) : null);
    bg.append(h('div', { class: 'sheet' }, h('h3', {}, 'What it means'), line(v), vertical ? h('p', { class: 'muted small', style: 'margin:0 0 6px' }, 'Read with the two rows above it (vertical):') : null, vertical ? line(vertical) : null,
      h('button', { type: 'button', onclick: close }, 'Close')));
    document.body.append(bg); trackOverlay(bg, close);
  }
  // The owner's clock: Safford, Arizona (no daylight saving). "Today" and "now" in the rows are read there,
  // whatever the phone's own clock says.
  const TZ = 'America/Phoenix';
  const nowIn = (tz) => {
    const p = {}; for (const x of new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date())) p[x.type] = Number(x.value);
    return { y: p.year, m: p.month, d: p.day, minutes: (p.hour % 24) * 60 + p.minute };
  };
  const clock = (mins) => { const h = Math.floor(mins / 60) % 24, m = mins % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  // "12:00–2:40 AM", "10:40 AM–1:20 PM"; the last period ends at 11:59 PM.
  const span = (a, b) => { const end = Math.min(b, 1439), ca = clock(a), cb = clock(end); return ca.slice(-2) === cb.slice(-2) ? `${ca.slice(0, -3)}–${cb}` : `${ca}–${cb}`; };
  function openForecast(input) {
    const e = Numeroscope.essence(input.day, input.month, input.year);
    if (!(e.day && e.month && e.year)) { toast('Type the whole birth date first: day, month and year.', true); return; }
    const birthYear = Number(input.year);
    const now = nowIn(TZ);
    let year = Math.max(now.y, birthYear);
    let date = { y: now.y, m: now.m, d: now.d };
    const close = () => { $pop.remove(); untrackOverlay($pop); document.body.classList.remove('noscroll'); window.removeEventListener('keydown', keys); };
    const keys = (ev) => { if (ev.key === 'Escape') close(); };
    const $periods = h('div', { class: 'periods' }), $yearTitle = h('div', { class: 'wlabel' }), $yearNote = h('p', { class: 'muted small ynote' }), $year = h('div', {});
    const $dayTitle = h('div', { class: 'wlabel' }), $dayNote = h('p', { class: 'muted small ynote', style: 'padding:0 2px 6px' }), $day = h('div', {});
    const $date = h('input', { type: 'date', class: 'datebox', value: `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}` });
    // One table like the paid tool's: period and formula, then the human self (name chart) and the psychic
    // self, each as value, aura, shadow. Source rows show a plain digit, sums and auras always "n/ds".
    const text = (v, plain) => (v ? (plain && v.sum < 10 ? String(v.sum) : v.text) : '–');
    const cell = (v, cls, plain, vertical) => h('div', { class: `yv ${cls || ''}`, onclick: () => meaningSheet(v, vertical) }, text(v, plain));
    const head = () => [h('div', { class: 'yh yg' }, ''), h('div', { class: 'yh yg' }, 'Human self'), h('div', { class: 'yh yg' }, 'Psychic self'),
      h('div', { class: 'yh' }, 'Period'), h('div', { class: 'yh' }, 'Num.'), h('div', { class: 'yh' }, 'Aura'), h('div', { class: 'yh' }, 'Shad.'), h('div', { class: 'yh ps' }, 'Num.'), h('div', { class: 'yh ps' }, 'Aura'), h('div', { class: 'yh ps' }, 'Shad.')];
    const six = (x, now) => { const plain = x.source !== 'sum', p = x.psyche; return [
      cell(x.main, `num ${now}`, plain, x.vertical), cell(x.aura, `aura ${now}`), cell(x.shadow, now, plain, x.verticalShadow),
      cell(p.main, `ps num ${now}`, plain, p.vertical), cell(p.aura, `ps aura ${now}`), cell(p.shadow, `ps ${now}`, plain, p.verticalShadow)]; };
    const FORMULA_WORDS = { year: 'Year digit sum', day: 'Birth day digit sum', sum: 'Sum of two prev.', le: 'Life expression', age: 'Age digit sum', last: 'Last period', this: 'This period', leaving: 'Leaving this period', pillar: 'Pillar digit sum', date: 'Date digit sum', month: 'Month digit sum' };
    const drawPeriods = () => {
      const ps = Numeroscope.destinyPeriods(birthYear, 12).filter((p) => p.start <= birthYear + 99);
      fill($periods, ...ps.map((p) => h('button', { type: 'button', class: `period ${year >= p.start && year <= p.end ? 'active' : ''}`, onclick: () => { year = Math.max(p.start, birthYear); drawYear(); drawPeriods(); } },
        h('b', {}, String(p.number)), h('span', {}, p.years === 1 ? String(p.start) : `${p.start}–${p.end}`), h('span', { class: 'muted' }, p.years === 1 ? `age ${p.start - birthYear}` : `age ${p.start - birthYear}–${p.end - birthYear}`))));
    };
    const drawYear = () => {
      const r = Numeroscope.yearRows(input, year);
      $yearTitle.textContent = `Year rows ${year}`;
      if (!r) { fill($year, h('p', { class: 'muted' }, 'Before the birth year.')); $yearNote.textContent = ''; return; }
      $yearNote.textContent = `Age ${r.formula.age} · ${r.formula.words}${r.hasName ? '' : ' · type a name to fill the life expression and pillar rows'}`;
      const isNow = (x) => year === now.y && (now.m > x.month || (now.m === x.month && now.d >= x.day)) && (now.m < x.until.month || (now.m === x.until.month && now.d <= x.until.day));
      fill($year, h('div', { class: 'yrows' }, ...head(), ...r.rows.flatMap((x) => { const n = isNow(x) ? 'now' : ''; return [
        h('div', { class: `ydate ${n}` }, h('b', {}, `${MON[x.month - 1]} ${x.day} – ${MON[x.until.month - 1]} ${x.until.day}`), h('span', {}, FORMULA_WORDS[x.source])), ...six(x, n)]; })));
    };
    const drawDay = () => {
      const r = Numeroscope.dayRows(input, date.y, date.m, date.d);
      $dayTitle.textContent = `Day vibrations ${MON[date.m - 1]} ${date.d}, ${date.y}`;
      const today = date.y === now.y && date.m === now.m && date.d === now.d;
      fill($dayNote, today ? `Now ${clock(now.minutes)} in Arizona · ` : '', r.fulfillment ? h('span', { onclick: () => meaningSheet(r.fulfillment), style: 'cursor:pointer' }, `Fulfillment number ${rowText(r.fulfillment)}`) : 'Type a name to fill the life expression row and the fulfillment number');
      fill($day, h('div', { class: 'yrows' }, ...head(), ...r.rows.flatMap((x) => { const n = today && now.minutes >= x.from && now.minutes < x.until ? 'now' : ''; return [
        h('div', { class: `ydate ${n}` }, h('b', {}, span(x.from, x.until)), h('span', {}, FORMULA_WORDS[x.source])), ...six(x, n)]; })));
    };
    const drawAll = () => { drawYear(); drawDay(); };
    const shiftDay = (by) => { const dt = new Date(date.y, date.m - 1, date.d + by); date = { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }; $date.value = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`; drawDay(); };
    $date.addEventListener('change', () => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec($date.value); if (m) { date = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }; drawDay(); } });
    const name = String(input.name || '').trim();
    const $pop = h('div', { class: 'wordpop' },
      h('div', { class: 'pagetop' }, h('button', { type: 'button', class: 'btn iconbtn', 'aria-label': 'Close', onclick: close }, '‹'), h('h1', {}, name || 'Year Rows'), h('span', { class: 'muted small' }, `${e.day.sum} ${MON[e.month.sum - 1]} ${birthYear}`)),
      h('div', { class: 'wcard' }, h('div', { class: 'wlabel' }, 'Destiny Periods'), $periods),
      h('div', { class: 'wcard' }, $yearTitle,
        h('div', { class: 'row ynav' }, h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Previous year', onclick: () => { if (year > birthYear) { year--; drawYear(); drawPeriods(); } } }, '‹'), $yearNote, h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Next year', onclick: () => { year++; drawYear(); drawPeriods(); } }, '›')),
        $year, h('p', { class: 'muted small', style: 'margin:8px 0 0' }, 'Tap a number for what it means; a sum also shows the two rows above it read as one number.')),
      h('div', { class: 'wcard' }, $dayTitle,
        h('div', { class: 'row ynav' }, h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Previous day', onclick: () => shiftDay(-1) }, '‹'), $date, h('button', { type: 'button', class: 'cbtn', 'aria-label': 'Next day', onclick: () => shiftDay(1) }, '›')),
        $dayNote, $day,
        h('p', { class: 'muted small', style: 'margin:8px 0 0' }, 'Arizona time. Nine periods of 2 h 40 min from midnight, as in the course book.')));
    trackOverlay($pop, close); document.body.append($pop); document.body.classList.add('noscroll'); window.addEventListener('keydown', keys);
    drawPeriods(); drawAll();
  }

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
        s.archetypes ? stat('Archetype Pics', s.archetypes) : null,
        h('div', { class: 'stat' }, h('span', {}, 'Tagged but no screenshot yet'), h('b', { class: s.missing_count ? 'err' : 'ok' }, fmtN(s.missing_count))),
        stat('Distinct tags', s.tags), stat('Tags added in the app', s.added_in_app), stat('Tags removed in the app', s.removed_in_app),
        h('div', { class: 'stat' }, h('span', {}, 'Space used by screenshots'), h('b', {}, fmtBytes(s.bytes))),
        s.disk ? h('div', { class: 'stat' }, h('span', {}, 'Free space on server'), h('b', {}, fmtBytes(s.disk.free_bytes))) : null),
      s.lost_files.length ? h('div', { class: 'card' }, h('p', { class: 'err' }, `${s.lost_files.length} file(s) are recorded but missing on disk. Tell Claude about this.`), h('div', { class: 'filelist' }, ...s.lost_files.map((f) => h('div', {}, f)))) : null,
      s.missing_count ? h('div', { class: 'card stack' },
        h('button', { type: 'button', class: 'btn-block', onclick: (e) => { $missing.classList.toggle('hidden'); e.target.textContent = $missing.classList.contains('hidden') ? `Show the ${fmtN(s.missing_count)} missing filenames` : 'Hide list'; } }, `Show the ${fmtN(s.missing_count)} missing filenames`),
        $missing, h('a', { class: 'btn btn-primary btn-block', href: '#/upload' }, 'Upload Screenshots')) : null,
      h('div', { class: 'card stack' }, h('h2', { style: 'margin-top:0' }, 'Backup'), $backupMsg,
        h('button', { type: 'button', class: 'btn-block', onclick: async (e) => { count('status.backup'); e.target.disabled = true; e.target.textContent = 'Backing up…'; try { const r = await api('/api/backup/run', { method: 'POST' }); $backupMsg.textContent = `Last backup: ${fmtDate(r.at)} (${r.result})`; toast('Backup done'); } catch (err) { toast(err.message, true); } e.target.disabled = false; e.target.textContent = 'Back up now'; } }, 'Back up now'),
        h('a', { class: 'btn btn-block', href: '/api/backup/download', download: '' }, `Download everything as one zip (${fmtBytes(s.bytes)})`),
        h('a', { class: 'btn btn-block', href: '/api/export/tags.json', download: '' }, 'Download tags only (small JSON file)')),
      s.positions ? h('div', { class: 'card stack' }, h('h2', { style: 'margin-top:0' }, 'Search by Position'),
        stat('Charts with a name and date', s.positions.with_inputs), stat('Charts with a full birth date', s.positions.with_date),
        h('div', { class: 'stat' }, h('span', {}, 'Charts not read yet'), h('b', { class: s.positions.without_inputs ? 'err' : 'ok' }, fmtN(s.positions.without_inputs))),
        s.positions.check ? h('div', { class: 'stat' }, h('span', {}, 'Your position tags that agree with the computed charts'), h('b', {}, `${fmtN(s.positions.check.agree)} of ${fmtN(s.positions.check.tags)}`)) : null,
        h('p', { class: 'muted small' }, 'A tag that disagrees usually means the name or date was misread: open the chart, tap "Wrong? Fix". Charts not read yet get their name and date the same way.'),
        h('button', { type: 'button', class: 'btn-block', onclick: async (e) => { count('status.recompute'); e.target.disabled = true; e.target.textContent = 'Recomputing…'; try { const r = await api('/api/positions/recompute', { method: 'POST' }); toast(`Recomputed ${fmtN(r.recomputed)} charts`); } catch (err) { toast(err.message, true); } e.target.disabled = false; e.target.textContent = 'Recompute Every Chart'; } }, 'Recompute Every Chart')) : null,
      s.ai ? h('div', { class: 'card stack' }, h('h2', { style: 'margin-top:0' }, 'AI Reading'),
        h('div', { class: 'stat' }, h('span', {}, 'AI key'), h('b', { class: s.ai.key_set ? 'ok' : 'err' }, s.ai.key_set ? 'Set' : 'Not set')),
        h('div', { class: 'stat' }, h('span', {}, 'Spent this month'), h('b', {}, `$${Number(s.ai.spent).toFixed(2)} of $${Number(s.ai.cap).toFixed(2)}`)),
        h('a', { class: 'btn btn-block', href: '#/ai' }, 'AI Reading Settings')) : null,
      s.usage && s.usage.length ? h('div', { class: 'card stack' }, h('h2', { style: 'margin-top:0' }, 'What You Use Most'),
        ...s.usage.slice(0, 20).map((u) => stat(USAGE_LABELS[u.name] || u.name, u.count))) : null,
      h('div', { class: 'card stack' },
        s.last_import ? h('p', { class: 'muted small' }, `Last tag import: ${fmtDate(s.last_import.imported_at)}, ${fmtN(s.last_import.images_in_file)} images in file`) : h('p', { class: 'muted small' }, 'No tag file imported yet.'),
        h('p', { class: 'muted small' }, `Chart Vault version ${s.version}, build ${s.commit}`),
        s.updates ? h('p', { class: `small ${s.updates.ok ? 'muted' : 'err'}` }, s.updates.note) : null,
        h('button', { type: 'button', class: 'btn-block', onclick: async () => { count('status.logout'); await api('/api/logout', { method: 'POST' }).catch(() => {}); showLogin(); } }, 'Log out')));
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

  // ---------- number tools (public/tools.js) ----------
  // Today, Coming Days, Number Fun, Price Tool, Relationship, Karmic Connections, My Chart: their screens
  // live in tools.js and get the plumbing here (screens, drawing, counting). A bottom sheet for a number's words.
  const wordsSheet = (content) => {
    const bg = h('div', { class: 'sheet-bg', onclick: (e) => { if (e.target === bg) close(); } });
    const close = () => { bg.remove(); untrackOverlay(bg); };
    bg.append(h('div', { class: 'sheet' }, content, h('button', { type: 'button', onclick: close }, 'Close')));
    document.body.append(bg); trackOverlay(bg, close);
  };
  const toolsUi = window.Tools ? window.Tools.install({ routes, h, sv, fill, render, count, toast, api, go, numeroscopeSvg, sheet: wordsSheet, overlay: trackOverlay, overlayGone: untrackOverlay, setCleanup: (fn) => { viewerCleanup = fn; } }) : null;
  if (toolsUi) Object.assign(USAGE_LABELS, toolsUi.USAGE_LABELS);
  // Reading a chart (facts, AI reading, questions), Ask the Vault and the AI settings live in reading.js.
  const readingUi = window.Reading ? window.Reading.install({ routes, h, fill, api, toast, count, go, render, pageTop }) : null;
  if (readingUi) Object.assign(USAGE_LABELS, readingUi.USAGE_LABELS);
  // What a number means where it sits (public/meaning.js): a tap on a number of a drawn chart.
  meaningUi = window.Meaning ? window.Meaning.install({ h, fill, api, count, go, positionHash, overlay: trackOverlay, overlayGone: untrackOverlay }) : null;

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
