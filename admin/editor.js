// Free-layout editor ("Tự thiết kế") for the admin. Pointer Events only, no dependencies.
// Renders with boardItemsHTML() + board.css from the invite, so the canvas is WYSIWYG.
// Usage: const ed = createEditor({ mount, getCfg, onChange, upload }); ed.set(layout); ed.get(); ed.refresh();
// upload(file) -> Promise<src|null> stores a photo (admin/common.js uploadImage: resized + encrypted).

// One-click starting layouts (portrait, design px of 390×844), built on the composition guides.
const PRESETS = (() => {
  const T = (field, cx, cy, w, fs, o = {}) => ({ type: 'field', field, cx, cy, w, fs, rot: 0, font: 'display', align: 'center', color: 'fg', lh: 1.25, ...o });
  const cap = { font: 'body', caps: true, ls: .28, color: 'muted' };
  const S = (shape, cx, cy, w, o = {}) => ({ type: 'shape', shape, cx, cy, w, h: 40, t: 1, rot: 0, color: 'accent', ...o });
  return {
    classic: { label: 'Cổ điển · đối xứng', items: [
      T('greeting', 50, 20, 320, 12, cap), S('line', 50, 25.5, 40),
      T('title', 50, 34, 330, 46, { lh: 1.08 }), T('message', 50, 52, 300, 16, { font: 'body', color: 'muted', lh: 1.75 }),
      T('sign', 50, 66, 300, 26, { italic: true }), T('date', 50, 78, 300, 12, cap)] },
    editorial: { label: 'Tạp chí · lệch trái', items: [ // left edge on the 8% safe margin, signature on the right third
      T('greeting', 46.5, 16, 300, 12, { ...cap, align: 'left' }), T('title', 49, 30, 320, 67.8, { align: 'left', lh: 1 }),
      S('line', 15.7, 44, 60), T('message', 43.9, 56, 280, 16, { font: 'body', color: 'muted', lh: 1.75, align: 'left' }),
      T('sign', 53.5, 74, 300, 25.9, { italic: true, align: 'right' }), T('date', 53.5, 80, 300, 12, { ...cap, align: 'right' })] },
    golden: { label: 'Tỷ lệ vàng · có khung', items: [ // title and message on the 38.2% / 61.8% lines
      S('frame', 50, 50, 342, { h: 760, op: 60 }), T('greeting', 50, 20, 300, 12, cap),
      T('title', 50, 38.2, 300, 41.9, { lh: 1.1 }), S('line', 50, 48, 40),
      T('message', 50, 61.8, 280, 16, { font: 'body', color: 'muted', lh: 1.75 }),
      T('sign', 50, 76, 300, 25.9, { italic: true }), T('date', 50, 84, 300, 9.9, { ...cap, ls: .3 })] },
  };
})();

function createEditor({ mount, getCfg, onChange, upload }) {
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
        <optgroup label="Ảnh & hoạ tiết">
          <option value="image">Ảnh…</option>
          <option value="shape:line">Đường kẻ</option>
          <option value="shape:frame">Khung</option>
          <option value="shape:circle">Vòng tròn</option>
        </optgroup>
      </select>
      <select class="ed-preset" aria-label="Bố cục mẫu">
        <option value="">Bố cục mẫu…</option>
        ${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
      </select>
      <input type="file" class="ed-file" accept="image/*" hidden>
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
    <p class="hint ed-tip">Kéo để di chuyển · cạnh: đổi kích thước một chiều · góc: phóng to/thu nhỏ · chấm tròn: xoay (Shift: bước 15°) · giữ Alt để tắt hít dính · phím mũi tên: dịch (Shift: dịch xa) · Delete: xoá · Ctrl+D: nhân bản</p>
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
    const c = getCfg(), t = THEMES[c.theme] || THEMES.ivory, fo = styleFonts(c);
    const img = bgUrl(c.bg, 960);
    loadFont(fo);
    const bimg = board.style.getPropertyValue('--bimg');
    board.style.cssText = `--bg:${t.bg};--fg:${t.fg};--muted:${t.muted};--accent:${t.accent};--line:${t.line};` +
      `--display:${fo.display};--body:${fo.body};color:${t.fg};background-color:${t.bg};` +
      `--bimg:${bimg || 'none'};--bx:${num(c.bgX, 0, 100, 50)}%;--by:${num(c.bgY, 0, 100, 50)}%;` +
      `--bz:${num(c.bgZoom, 100, 300, 100) / 100};--bdim:${img ? num(c.bgDim, 0, 95, 70) / 100 : 0};--bblur:${num(c.bgBlur, 0, 100, 0) / 100 * BLUR_MAX_PX * .6}px`;
    if (board.dataset.bg !== img) { board.dataset.bg = img; imageSrc(img).then(u => { if (board.dataset.bg === img) board.style.setProperty('--bimg', u ? `url("${u}")` : 'none'); }); }
    const lines = ['thirds', 'golden', 'safe'].filter(k => show[k]).flatMap(k => GUIDES[k].map(p => [k, p]));
    board.innerHTML = lines.map(([k, p]) => `<i class="gl v ${k}" style="left:${p}%"></i><i class="gl h ${k}" style="top:${p}%"></i>`).join('') +
      `<i class="gl v center" style="left:50%"></i><i class="gl h center" style="top:50%"></i>` +
      boardItemsHTML(getCfg(), d.items) +
      `<div class="ed-sel" hidden>${handlesFor(item(selId)).map(h => `<b data-h="${h}"></b>`).join('')}<b data-h="rot"></b></div><div class="ed-snap"></div>`;
    hydrateImages(board);
    if (!item(selId)) selId = null;
    board.querySelectorAll('.it').forEach(el => el.classList.toggle('sel', el.dataset.id === selId));
    placeSel(); drawProps();
  }
  // Which resize handles make sense: text/line only stretch sideways; boxes also vertically; circle keeps 1:1.
  function handlesFor(it) {
    if (!it) return [];
    const k = it.type === 'shape' ? it.shape : it.type;
    if (k === 'line') return ['w', 'e'];
    if (k === 'circle') return ['nw', 'ne', 'sw', 'se'];
    return k === 'image' || k === 'frame' ? ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se'] : ['w', 'e', 'nw', 'ne', 'sw', 'se'];
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
    const range = (p, l, min, max, step, v, unit = '') => `<label><span class="lbl">${l} <output>${v}${unit}</output></span><input type="range" data-p="${p}" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;
    const numIn = (p, l, min, max, step, v) => `<label><span class="lbl">${l}</span><input type="number" data-p="${p}" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;
    const actions = `<div class="full ed-actions">
          <button type="button" class="btn ghost" data-act="center-x">Căn giữa ngang</button>
          <button type="button" class="btn ghost" data-act="up">Đưa lên</button>
          <button type="button" class="btn ghost" data-act="down">Đưa xuống</button>
          <button type="button" class="btn ghost" data-act="dup">Nhân bản</button>
          <button type="button" class="btn ghost" data-act="del">Xoá</button>
        </div>`;
    const common = numIn('w', 'Bề ngang (px)', 4, 4000, 1, Math.round(it.w)) + numIn('rot', 'Xoay (°)', -180, 180, 1, Math.round(it.rot || 0));
    if (it.type === 'image') {
      props.innerHTML = `<div class="grid">
        <div class="full"><button type="button" class="btn" data-act="img">Thay ảnh…</button> <span class="hint">Ảnh được nén và mã hoá trước khi lưu.</span></div>
        ${common}${numIn('h', 'Chiều cao (px)', 4, 4000, 1, Math.round(it.h || 100))}
        ${range('rad', 'Bo góc', 0, 200, 1, it.rad || 0, 'px')}${range('op', 'Độ đậm', 10, 100, 5, it.op ?? 100, '%')}${actions}</div>`;
      return;
    }
    if (it.type === 'shape') {
      props.innerHTML = `<div class="grid">
        <label><span class="lbl">Hình</span><select data-p="shape">${opt('line', it.shape, 'Đường kẻ')}${opt('frame', it.shape, 'Khung')}${opt('circle', it.shape, 'Vòng tròn')}</select></label>
        <label><span class="lbl">Màu</span><select data-p="color">${opt('fg', it.color, 'Chữ chính')}${opt('muted', it.color, 'Chữ phụ')}${opt('accent', it.color, 'Màu nhấn')}</select></label>
        ${common}${it.shape === 'frame' ? numIn('h', 'Chiều cao (px)', 4, 4000, 1, Math.round(it.h || 100)) + range('rad', 'Bo góc', 0, 200, 1, it.rad || 0, 'px') : ''}
        ${range('t', 'Độ dày nét', .5, 12, .5, it.t || 1, 'px')}${range('op', 'Độ đậm', 10, 100, 5, it.op ?? 100, '%')}${actions}</div>`;
      return;
    }
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
        ${actions}
      </div>`;
  }

  // Inputs inside the editor never reach the admin form's own listener.
  mount.addEventListener('input', e => {
    e.stopPropagation();
    const it = item(selId), p = e.target.dataset.p;
    if (!it || !p) return;
    if (!e.target.dataset.live) { checkpoint(); e.target.dataset.live = 1; } // one undo step per edit gesture
    const v = e.target.value;
    it[p] = ['fs', 'w', 'h', 't', 'rad', 'rot', 'ls', 'lh', 'op'].includes(p) ? +v : v;
    if (p === 'text' || p === 'field') { const el = elOf(it.id); if (el) el.firstChild.textContent = itemText(getCfg(), it); }
    const out = e.target.closest('label')?.querySelector('output');
    if (out) out.textContent = v + ({ ls: 'em', op: '%', rad: 'px', t: 'px' }[p] || '');
    paint(it);
  });
  mount.addEventListener('change', e => {
    e.stopPropagation();
    if (e.target.dataset.scale) { ratio = +e.target.value; drawProps(); return; }
    if (e.target.dataset.p) { delete e.target.dataset.live; onChange(); if (['field', 'font', 'shape'].includes(e.target.dataset.p)) draw(); }
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
      layout.landscape = { items: (layout.portrait?.items || []).map(i => scaleItem(i, k)) };
      return commit();
    }
    if (d.act === 'img') return pickImage(it);
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
    if (v === 'image') { undo.pop(); return pickImage(null); }
    const [kind, sub] = v.split(':'), big = orient === 'landscape' ? 1.07 : 1;
    const it = kind === 'shape'
      ? { id: uid(), type: 'shape', shape: sub, cx: 50, cy: 50, w: Math.round((sub === 'line' ? 60 : sub === 'circle' ? 120 : 260) * big), h: Math.round(320 * big), t: 1, rot: 0, color: 'accent' }
      : { id: uid(), type: kind === 'field' ? 'field' : 'text', cx: 50, cy: 50, w: Math.round(280 * big), fs: Math.round(20 * big), rot: 0,
        font: 'display', align: 'center', color: 'fg', lh: 1.25, ...(kind === 'field' ? { field: sub } : { text: 'Chữ mới' }) };
    cur().items.push(it); selId = it.id; commit(); board.focus();
  });

  // Photo: new item (target null) or replace the selected image's source.
  let pickTarget = null;
  function pickImage(target) {
    if (!upload) return;
    pickTarget = target; $('.ed-file').click();
  }
  $('.ed-file').addEventListener('change', async e => {
    e.stopPropagation();
    const file = e.target.files[0]; e.target.value = '';
    if (!file || !cur()) return;
    const src = await upload(file);
    if (!src) return;
    checkpoint();
    const t = pickTarget && item(pickTarget.id);
    if (t) t.src = src;
    else {
      const bmp = await createImageBitmap(file).catch(() => null), ratio = bmp ? bmp.height / bmp.width : 1.25; bmp?.close();
      const w = orient === 'landscape' ? 360 : 220, it = { id: uid(), type: 'image', src, cx: 50, cy: 50, w, h: Math.round(w * ratio), rot: 0, rad: 0 };
      cur().items.push(it); selId = it.id;
    }
    commit();
  });

  $('.ed-preset').addEventListener('change', e => {
    e.stopPropagation();
    const p = PRESETS[e.target.value]; e.target.value = '';
    if (!p || !cur()) return;
    if (cur().items.length && !confirm(`Thay toàn bộ bản ${orient === 'portrait' ? 'dọc' : 'ngang'} bằng "${p.label}"? (Hoàn tác được bằng Ctrl+Z)`)) return;
    checkpoint();
    const k = orient === 'landscape' ? REF.landscape[1] / REF.portrait[1] : 1;
    cur().items = p.items.map(i => scaleItem(i, k)); selId = null; commit();
  });

  // Copy an item with sizes scaled by k (portrait -> landscape keeps the vertical rhythm).
  function scaleItem(i, k) {
    const r = v => v == null ? v : Math.round(v * k * 10) / 10;
    return { ...i, id: uid(), w: Math.round(i.w * k), fs: r(i.fs), h: r(i.h), t: r(i.t), rad: r(i.rad) };
  }

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
      } else if (h === 'n' || h === 's') {
        // Height along the item's own (rotated) y axis; the opposite edge stays put.
        const t = (it0.rot || 0) * Math.PI / 180, ax = -Math.sin(t), ay = Math.cos(t);
        const along = (dx * ax + dy * ay) * (h === 's' ? 1 : -1);
        const hpx = Math.max(8, it0.h * u + along), grow = hpx - it0.h * u, s = h === 's' ? 1 : -1;
        it.h = hpx / u;
        it.cx = it0.cx + s * grow / 2 * ax / r.width * 100; it.cy = it0.cy + s * grow / 2 * ay / r.height * 100;
        paint(it);
      } else if (h === 'w' || h === 'e') {
        // Width along the item's own (rotated) x axis; the opposite edge stays put.
        const t = (it0.rot || 0) * Math.PI / 180, ax = Math.cos(t), ay = Math.sin(t);
        const along = (dx * ax + dy * ay) * (h === 'e' ? 1 : -1);
        const wpx = Math.max(16, it0.w * u + along), grow = wpx - it0.w * u, s = h === 'e' ? 1 : -1;
        it.w = wpx / u;
        it.cx = it0.cx + s * grow / 2 * ax / r.width * 100; it.cy = it0.cy + s * grow / 2 * ay / r.height * 100;
        paint(it);
      } else {
        // Corners scale the whole item (text size, box) around the centre, keeping proportions.
        const k = Math.max(.1, Math.hypot(ev.clientX - cx0, ev.clientY - cy0) / Math.max(1, Math.hypot(x0 - cx0, y0 - cy0)));
        it.w = it0.w * k;
        if (it0.fs != null) it.fs = Math.round(it0.fs * k * 2) / 2;
        if (it0.h != null) it.h = it0.h * k;
        paint(it);
      }
    };
    const up = () => {
      board.removeEventListener('pointermove', move); $('.ed-snap').innerHTML = '';
      it.cx = Math.round(it.cx * 100) / 100; it.cy = Math.round(it.cy * 100) / 100; it.w = Math.round(it.w);
      if (it.h != null) it.h = Math.round(it.h);
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
