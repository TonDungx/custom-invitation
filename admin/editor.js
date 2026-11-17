// Free-layout editor ("Tự thiết kế") for the admin. Pointer Events only, no dependencies.
// Renders with boardItemsHTML() + board.css from the invite, so the canvas is WYSIWYG.
// Usage: const ed = createEditor({ mount, getCfg, onChange }); ed.set(layout); ed.get(); ed.refresh();

function createEditor({ mount, getCfg, onChange }) {
  let layout = { portrait: null, landscape: null }, orient = 'portrait', selId = null;
  let show = { thirds: true, golden: false, safe: true }, ratio = 1.618;
  const undo = [], redo = [];
  const uid = () => Math.random().toString(36).slice(2, 8);
  const cur = () => layout[orient];
  const item = id => cur()?.items.find(i => i.id === id);
  const snapshot = () => JSON.stringify(layout);

  mount.innerHTML = `
    <div class="ed-bar">
      <div class="seg" role="group" aria-label="Màn hình">
        <button type="button" data-orient="portrait">Dọc</button><button type="button" data-orient="landscape">Ngang</button>
      </div>
      <select class="ed-add" aria-label="Thêm phần tử">
        <option value="">+ Thêm…</option>
        <optgroup label="Khối thông tin">${Object.entries(FIELDS).map(([k, [l]]) => `<option value="field:${k}">${l}</option>`).join('')}</optgroup>
        <option value="text">Chữ tự do</option>
      </select>
      <div class="seg" role="group" aria-label="Đường gióng">
        <button type="button" data-guide="thirds" title="Lưới một phần ba">⅓</button>
        <button type="button" data-guide="golden" title="Tỷ lệ vàng 38.2% / 61.8%">φ</button>
        <button type="button" data-guide="safe" title="Lề an toàn 8%">Lề</button>
      </div>
      <div class="seg" role="group" aria-label="Lịch sử">
        <button type="button" data-act="undo" title="Hoàn tác (Ctrl+Z)">↶</button><button type="button" data-act="redo" title="Làm lại (Ctrl+Shift+Z)">↷</button>
      </div>
    </div>
    <div class="ed-empty" hidden>
      <p>Chưa có bản ngang. Màn hình ngang (laptop, PC) đang hiện bản dọc ở giữa.</p>
      <button type="button" class="btn" data-act="from-portrait">Tạo bản ngang từ bản dọc</button>
    </div>
    <div class="ed-stage"><div class="board" tabindex="0" aria-label="Trang thiết kế"></div></div>
    <p class="hint ed-tip">Kéo để di chuyển · cạnh: đổi bề ngang · góc: phóng to/thu nhỏ · chấm tròn: xoay (Shift: bước 15°) · giữ Alt để tắt hít dính · phím mũi tên: dịch (Shift: dịch xa) · Delete: xoá · Ctrl+D: nhân bản</p>
    <div class="ed-props"></div>`;
  const $ = s => mount.querySelector(s), board = $('.board'), props = $('.ed-props');

  // ---------- render ----------
  function draw() {
    const d = cur();
    $('.ed-empty').hidden = !!d;
    $('.ed-stage').hidden = !d;
    board.dataset.o = orient;
    mount.querySelectorAll('[data-orient]').forEach(b => b.setAttribute('aria-pressed', b.dataset.orient === orient));
    mount.querySelectorAll('[data-guide]').forEach(b => b.setAttribute('aria-pressed', !!show[b.dataset.guide]));
    $('[data-act=undo]').disabled = !undo.length; $('[data-act=redo]').disabled = !redo.length;
    if (!d) { props.innerHTML = ''; return; }
    // WYSIWYG: the invite's theme, font and background, scoped to the board.
    const c = getCfg(), t = THEMES[c.theme] || THEMES.ivory, fo = FONTS[c.font] || FONTS.cormorant;
    const img = bgUrl(c.bg, 960);
    loadFont(fo);
    board.style.cssText = `--bg:${t.bg};--fg:${t.fg};--muted:${t.muted};--accent:${t.accent};--line:${t.line};` +
      `--display:${fo.display};--body:"Be Vietnam Pro",system-ui,sans-serif;color:${t.fg};background-color:${t.bg};` +
      `--bimg:${img ? `url("${img}")` : 'none'};--bx:${num(c.bgX, 0, 100, 50)}%;--by:${num(c.bgY, 0, 100, 50)}%;` +
      `--bz:${num(c.bgZoom, 100, 300, 100) / 100};--bdim:${img ? num(c.bgDim, 0, 95, 70) / 100 : 0};--bblur:${num(c.bgBlur, 0, 100, 0) / 100 * BLUR_MAX_PX * .6}px`;
    const lines = ['thirds', 'golden', 'safe'].filter(k => show[k]).flatMap(k => GUIDES[k].map(p => [k, p]));
    board.innerHTML = lines.map(([k, p]) => `<i class="gl v ${k}" style="left:${p}%"></i><i class="gl h ${k}" style="top:${p}%"></i>`).join('') +
      `<i class="gl v center" style="left:50%"></i><i class="gl h center" style="top:50%"></i>` +
      boardItemsHTML(getCfg(), d.items) +
      `<div class="ed-sel" hidden>${['w', 'e', 'nw', 'ne', 'sw', 'se'].map(h => `<b data-h="${h}"></b>`).join('')}<b data-h="rot"></b></div><div class="ed-snap"></div>`;
    if (!item(selId)) selId = null;
    board.querySelectorAll('.it').forEach(el => el.classList.toggle('sel', el.dataset.id === selId));
    placeSel(); drawProps();
  }
  const elOf = id => board.querySelector(`.it[data-id="${CSS.escape(id)}"]`);

  // Selection frame: same centre + rotation as the item, untransformed size.
  function placeSel() {
    const s = $('.ed-sel'), it = item(selId), el = it && elOf(selId);
    if (!s) return;
    s.hidden = !el;
    if (!el) return;
    Object.assign(s.style, { left: it.cx + '%', top: it.cy + '%', width: el.offsetWidth + 'px', height: el.offsetHeight + 'px',
      transform: `translate(-50%, -50%) rotate(${it.rot || 0}deg)` });
  }
  // Fast path while dragging: update one item's inline style only.
  function paint(it) {
    const el = elOf(it.id), z = cur().items.indexOf(it);
    if (el) el.setAttribute('style', itemStyle(it, z));
    placeSel();
  }

  // ---------- history ----------
  function checkpoint() { undo.push(snapshot()); if (undo.length > 100) undo.shift(); redo.length = 0; }
  function commit() { draw(); onChange(); }
  function travel(from, to) {
    if (!from.length) return;
    to.push(snapshot()); layout = JSON.parse(from.pop()); commit();
  }

  // ---------- properties panel ----------
  function drawProps() {
    const it = item(selId);
    if (!it) { props.innerHTML = '<p class="hint">Chọn một phần tử trên trang để chỉnh.</p>'; return; }
    const steps = [-2, -1, 0, 1, 2, 3, 4, 5].map(n => Math.round(16 * ratio ** n * 10) / 10);
    const opt = (v, cur, l) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${l}</option>`;
    props.innerHTML = `
      <div class="grid">
        ${it.type === 'field'
          ? `<label class="full"><span class="lbl">Nội dung (lấy từ form)</span><select data-p="field">${Object.entries(FIELDS).map(([k, [l]]) => opt(k, it.field, l)).join('')}</select></label>`
          : `<label class="full"><span class="lbl">Nội dung</span><textarea data-p="text" rows="2">${esc(it.text)}</textarea></label>`}
        <label><span class="lbl">Font</span><select data-p="font">${opt('display', it.font, 'Tiêu đề (serif)')}${opt('body', it.font, 'Thân bài')}</select></label>
        <label><span class="lbl">Màu</span><select data-p="color">${opt('fg', it.color, 'Chữ chính')}${opt('muted', it.color, 'Chữ phụ')}${opt('accent', it.color, 'Màu nhấn')}</select></label>
        <label><span class="lbl">Cỡ chữ (px)</span><input type="number" data-p="fs" min="4" max="800" step="0.5" value="${it.fs}"></label>
        <label><span class="lbl">Thang tỷ lệ</span><select data-scale>${Object.entries(SCALES).map(([v, l]) => opt(v, ratio, l)).join('')}</select></label>
        <div class="full"><span class="lbl">Cỡ gợi ý theo thang (gốc 16px)</span>
          <div class="chips">${steps.map(v => `<button type="button" data-fs="${v}"${Math.abs(v - it.fs) < .05 ? ' aria-pressed="true"' : ''}>${v}</button>`).join('')}</div></div>
        <label><span class="lbl">Bề ngang (px)</span><input type="number" data-p="w" min="4" max="4000" step="1" value="${Math.round(it.w)}"></label>
        <label><span class="lbl">Xoay (°)</span><input type="number" data-p="rot" min="-180" max="180" step="1" value="${Math.round(it.rot || 0)}"></label>
        <label><span class="lbl">Giãn chữ <output>${it.ls || 0}em</output></span><input type="range" data-p="ls" min="0" max="0.5" step="0.01" value="${it.ls || 0}"></label>
        <label><span class="lbl">Giãn dòng <output>${it.lh || 1.25}</output></span><input type="range" data-p="lh" min="0.8" max="2.4" step="0.05" value="${it.lh || 1.25}"></label>
        <label><span class="lbl">Độ đậm <output>${it.op ?? 100}%</output></span><input type="range" data-p="op" min="10" max="100" step="5" value="${it.op ?? 100}"></label>
        <div><span class="lbl">Căn lề</span><div class="seg">${['left', 'center', 'right'].map((a, i) =>
          `<button type="button" data-align="${a}" aria-pressed="${(it.align || 'center') === a}">${['Trái', 'Giữa', 'Phải'][i]}</button>`).join('')}</div></div>
        <div><span class="lbl">Kiểu</span><div class="seg">
          <button type="button" data-tog="italic" aria-pressed="${!!it.italic}"><em>Nghiêng</em></button>
          <button type="button" data-tog="caps" aria-pressed="${!!it.caps}">IN HOA</button></div></div>
        <div class="full ed-actions">
          <button type="button" class="btn ghost" data-act="center-x">Căn giữa ngang</button>
          <button type="button" class="btn ghost" data-act="up">Đưa lên</button>
          <button type="button" class="btn ghost" data-act="down">Đưa xuống</button>
          <button type="button" class="btn ghost" data-act="dup">Nhân bản</button>
          <button type="button" class="btn ghost" data-act="del">Xoá</button>
        </div>
      </div>`;
  }

  // Inputs inside the editor never reach the admin form's own listener.
  mount.addEventListener('input', e => {
    e.stopPropagation();
    const it = item(selId), p = e.target.dataset.p;
    if (!it || !p) return;
    if (!e.target.dataset.live) { checkpoint(); e.target.dataset.live = 1; } // one undo step per edit gesture
    const v = e.target.value;
    it[p] = ['fs', 'w', 'rot', 'ls', 'lh', 'op'].includes(p) ? +v : v;
    if (p === 'text' || p === 'field') { const el = elOf(it.id); if (el) el.firstChild.textContent = itemText(getCfg(), it); }
    const out = e.target.closest('label')?.querySelector('output');
    if (out) out.textContent = p === 'ls' ? v + 'em' : p === 'op' ? v + '%' : v;
    paint(it);
  });
  mount.addEventListener('change', e => {
    e.stopPropagation();
    if (e.target.dataset.scale) { ratio = +e.target.value; drawProps(); return; }
    if (e.target.dataset.p) { delete e.target.dataset.live; onChange(); if (['field', 'font'].includes(e.target.dataset.p)) draw(); }
  });

  mount.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const it = item(selId), d = b.dataset;
    if (d.orient) { orient = d.orient; selId = null; draw(); return; }
    if (d.guide) { show[d.guide] = !show[d.guide]; draw(); return; }
    if (d.act === 'undo') return travel(undo, redo);
    if (d.act === 'redo') return travel(redo, undo);
    if (d.act === 'from-portrait') {
      // Same vertical rhythm on a 1440×900 screen: scale sizes by the reference-height ratio.
      checkpoint();
      const k = REF.landscape[1] / REF.portrait[1];
      layout.landscape = { items: (layout.portrait?.items || []).map(i => ({ ...i, id: uid(), w: Math.round(i.w * k), fs: Math.round(i.fs * k * 10) / 10 })) };
      return commit();
    }
    if (!it) return;
    checkpoint();
    if (d.fs) it.fs = +d.fs;
    else if (d.align) it.align = d.align;
    else if (d.tog) it[d.tog] = !it[d.tog];
    else if (d.act === 'center-x') it.cx = 50;
    else if (d.act === 'dup') { const c = { ...it, id: uid(), cx: it.cx + 3, cy: it.cy + 3 }; cur().items.push(c); selId = c.id; }
    else if (d.act === 'del') { cur().items.splice(cur().items.indexOf(it), 1); selId = null; }
    else if (d.act === 'up' || d.act === 'down') {
      const a = cur().items, i = a.indexOf(it), j = i + (d.act === 'up' ? 1 : -1);
      if (j < 0 || j >= a.length) { undo.pop(); return; }
      [a[i], a[j]] = [a[j], a[i]];
    } else { undo.pop(); return; }
    commit();
  });

  $('.ed-add').addEventListener('change', e => {
    e.stopPropagation();
    const v = e.target.value; e.target.value = '';
    if (!v || !cur()) return;
    checkpoint();
    const [, field] = v.split(':'), big = orient === 'landscape' ? 1.07 : 1;
    const it = { id: uid(), type: field ? 'field' : 'text', cx: 50, cy: 50, w: Math.round(280 * big), fs: Math.round(20 * big), rot: 0,
      font: 'display', align: 'center', color: 'fg', lh: 1.25, ...(field ? { field } : { text: 'Chữ mới' }) };
    cur().items.push(it); selId = it.id; commit(); board.focus();
  });

  // ---------- pointer: select, move, resize, rotate ----------
  const R = () => board.getBoundingClientRect();
  const unit = r => Math.min(r.width / REF[orient][0], r.height / REF[orient][1]); // CSS px per design px
  // Bounds of every other item in %, for smart guides.
  function targets(skipId, r) {
    const xs = [50], ys = [50];
    for (const k of ['thirds', 'golden', 'safe']) if (show[k]) { xs.push(...GUIDES[k]); ys.push(...GUIDES[k]); }
    board.querySelectorAll('.it').forEach(el => {
      if (el.dataset.id === skipId) return;
      const b = el.getBoundingClientRect(), l = (b.left - r.left) / r.width * 100, t = (b.top - r.top) / r.height * 100;
      const w = b.width / r.width * 100, h = b.height / r.height * 100;
      xs.push(l, l + w / 2, l + w); ys.push(t, t + h / 2, t + h);
    });
    return { xs, ys };
  }
  // Snap the item's left/centre/right (top/centre/bottom) to the nearest target within 6px.
  function snap(it, r, tg) {
    const el = elOf(it.id), b = el.getBoundingClientRect();
    const hw = b.width / 2 / r.width * 100, hh = b.height / 2 / r.height * 100;
    const best = (vals, offs, size, c) => {
      let m = null;
      for (const o of offs) for (const v of vals) { const d = v - (c + o); if (Math.abs(d) * size / 100 <= 6 && (!m || Math.abs(d) < Math.abs(m.d))) m = { d, v }; }
      return m;
    };
    const mx = best(tg.xs, [-hw, 0, hw], r.width, it.cx), my = best(tg.ys, [-hh, 0, hh], r.height, it.cy);
    if (mx) it.cx += mx.d;
    if (my) it.cy += my.d;
    $('.ed-snap').innerHTML = (mx ? `<i class="v" style="left:${mx.v}%"></i>` : '') + (my ? `<i class="h" style="top:${my.v}%"></i>` : '');
  }

  board.addEventListener('pointerdown', e => {
    const h = e.target.closest('[data-h]')?.dataset.h, el = e.target.closest('.it');
    if (!h && !el) { if (selId) { selId = null; draw(); } return; }
    e.preventDefault(); board.focus({ preventScroll: true });
    if (el && el.dataset.id !== selId) { selId = el.dataset.id; draw(); }
    const it = item(selId), r = R(), u = unit(r), x0 = e.clientX, y0 = e.clientY, it0 = { ...it };
    const cx0 = r.left + it.cx / 100 * r.width, cy0 = r.top + it.cy / 100 * r.height; // centre in px
    const tg = !h ? targets(selId, r) : null;
    const before = snapshot();
    board.setPointerCapture(e.pointerId);
    const move = ev => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!h) {
        it.cx = it0.cx + dx / r.width * 100; it.cy = it0.cy + dy / r.height * 100;
        paint(it);
        if (!ev.altKey) { snap(it, r, tg); paint(it); } else $('.ed-snap').innerHTML = '';
      } else if (h === 'rot') {
        let a = Math.atan2(ev.clientY - cy0, ev.clientX - cx0) * 180 / Math.PI + 90;
        a = ((a + 540) % 360) - 180;
        if (ev.shiftKey) a = Math.round(a / 15) * 15;
        else for (const s of [-180, -90, 0, 90, 180]) if (Math.abs(a - s) < 3) a = s;
        it.rot = Math.round(a * 10) / 10; paint(it);
      } else if (h === 'w' || h === 'e') {
        // Width along the item's own (rotated) x axis; the opposite edge stays put.
        const t = (it0.rot || 0) * Math.PI / 180, ax = Math.cos(t), ay = Math.sin(t);
        const along = (dx * ax + dy * ay) * (h === 'e' ? 1 : -1);
        const wpx = Math.max(16, it0.w * u + along), grow = wpx - it0.w * u, s = h === 'e' ? 1 : -1;
        it.w = wpx / u;
        it.cx = it0.cx + s * grow / 2 * ax / r.width * 100; it.cy = it0.cy + s * grow / 2 * ay / r.height * 100;
        paint(it);
      } else {
        // Corners scale text (size + width) around the centre.
        const k = Math.max(.1, Math.hypot(ev.clientX - cx0, ev.clientY - cy0) / Math.max(1, Math.hypot(x0 - cx0, y0 - cy0)));
        it.fs = Math.round(it0.fs * k * 2) / 2; it.w = it0.w * k; paint(it);
      }
    };
    const up = () => {
      board.removeEventListener('pointermove', move); $('.ed-snap').innerHTML = '';
      it.cx = Math.round(it.cx * 100) / 100; it.cy = Math.round(it.cy * 100) / 100; it.w = Math.round(it.w);
      if (snapshot() !== before) { undo.push(before); redo.length = 0; commit(); }
    };
    board.addEventListener('pointermove', move);
    board.addEventListener('lostpointercapture', up, { once: true });
  });

  // ---------- keyboard (board focused) ----------
  board.addEventListener('keydown', e => {
    const it = item(selId), mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? travel(redo, undo) : travel(undo, redo); }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); return travel(redo, undo); }
    if (e.key === 'Escape') { selId = null; return draw(); }
    if (!it) return;
    const step = e.shiftKey ? 5 : .5, mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (mv) { e.preventDefault(); checkpoint(); it.cx += mv[0]; it.cy += mv[1]; return commit(); }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); return $('[data-act=del]').click(); }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); return $('[data-act=dup]').click(); }
  });
  new ResizeObserver(() => placeSel()).observe(board);

  return {
    set(l) {
      layout = { portrait: l?.portrait ? structuredClone(l.portrait) : null, landscape: l?.landscape ? structuredClone(l.landscape) : null };
      undo.length = redo.length = 0; selId = null; draw();
    },
    ensurePortrait() { if (!layout.portrait) { layout.portrait = defaultPortrait(); draw(); } },
    get: () => structuredClone(layout),
    refresh: draw, // form content changed -> re-render texts
  };
}
