// Shared by index.html and admin/: defaults, themes, backgrounds, URL helpers, config loading.
// Saved config = config.json in the GitHub repo (written by admin via the contents API).
// URL hash (compressed JSON) is only used for the admin live preview. See docs/architecture.md.

const DEFAULT = {
  to: 'Em',
  from: 'Anh',
  title: 'Một buổi tối, chỉ hai chúng mình',
  message: 'Tuần này anh muốn dành trọn một buổi tối cho em.\nAnh đã chọn sẵn vài nơi, em chỉ cần đến thôi.',
  date: '2026-11-21T19:00',
  stops: [
    { time: '19:00', name: 'Quán B', note: 'Bữa tối', address: '' },
    { time: '21:00', name: 'Quán C', note: 'Cà phê & trò chuyện', address: '' },
  ],
  ask: 'Em sẽ đến chứ?',
  accept: 'Em đồng ý',
  decline: 'Để em nghĩ đã',
  declineMode: 'dodge', // off | dodge | smoke | vanish
  thanks: 'Hẹn gặp em nhé.',
  reply: '',
  replyLabel: 'Nhắn cho anh',
  theme: 'ivory',
  font: 'cormorant',
  intro: true,
  bg: '',      // '' | preset key | custom https URL
  bgDim: 70,   // % of theme colour laid over the photo (keeps text readable)
  bgBlur: 0,   // 0-100 %
  bgX: 50,     // background focal point, % (CSS background-position)
  bgY: 50,
  bgZoom: 100, // 100-300 %
  layout: null, // free layout, see "Free layout" below; null = template layout
  notifyUrl: '',     // Google Apps Script web app URL (docs/notifications.md); lives in the encrypted config
  notifyOpen: false, // also notify when the invite is opened (once per session)
};

// Free photos (Unsplash License), verified by hand for the date-night mood.
const BACKGROUNDS = {
  candles: { label: 'Nến',      id: '1694588062461-ea9a4f732a87' },
  candle:  { label: 'Ánh nến',  id: '1695041404407-e1afde845b33' },
  bokeh:   { label: 'Phố đêm',  id: '1625941834008-9e0c5b3b69f7' },
  city:    { label: 'Đèn phố',  id: '1432847712612-926caafaa802' },
  wine:    { label: 'Ly vang',  id: '1651346219435-47ec8267940f' },
  flowers: { label: 'Hoa khô',  id: '1649615644692-b26f39484243' },
  still:   { label: 'Tĩnh vật', id: '1755401679272-c2e026885af4' },
};
const unsplash = (id, w) => `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;
// '' | preset key | https URL | "enc:https://…" (encrypted upload, resolve with imageSrc()).
function bgUrl(bg, w) {
  if (!bg) return '';
  if (BACKGROUNDS[bg]) return unsplash(BACKGROUNDS[bg].id, w);
  return httpsSrc(bg);
}
function httpsSrc(s) {
  const enc = String(s || '').startsWith('enc:'), u = safeUrl(enc ? s.slice(4) : s);
  return /^https:/.test(u) ? (enc ? 'enc:' : '') + u : '';
}
const BLUR_MAX_PX = 24;

const THEMES = {
  ivory: { label: 'Ivory', bg: '#F7F4EE', fg: '#1C1917', muted: '#6B635A', line: '#DDD5C8', accent: '#8A6A3B' },
  noir:  { label: 'Noir',  bg: '#0F0E0D', fg: '#EDE8E0', muted: '#9A9188', line: '#2C2925', accent: '#C9A96E' },
  sage:  { label: 'Sage',  bg: '#EEF0EA', fg: '#1F2620', muted: '#5E675F', line: '#D2D8CC', accent: '#4F6B55' },
  blush: { label: 'Blush', bg: '#F6EEEC', fg: '#2A1D1D', muted: '#7A6460', line: '#E6D6D2', accent: '#9C5B5B' },
};

// All families support Vietnamese glyphs.
const FONTS = {
  cormorant: { label: 'Cormorant', display: '"Cormorant Garamond", serif', q: 'Cormorant+Garamond:ital,wght@0,400;0,500;1,400' },
  playfair:  { label: 'Playfair',  display: '"Playfair Display", serif',   q: 'Playfair+Display:ital,wght@0,400;0,500;1,400' },
  lora:      { label: 'Lora',      display: '"Lora", serif',               q: 'Lora:ital,wght@0,400;0,500;1,400' },
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Only allow harmless schemes from user-supplied links (blocks javascript: etc.).
function safeUrl(s) {
  try { const u = new URL(s); return ['http:', 'https:', 'sms:', 'tel:', 'mailto:'].includes(u.protocol) ? u.href : ''; }
  catch { return ''; }
}
const isUrl = s => /^https?:\/\//i.test(s);
const mapUrl = a => !a ? '' : isUrl(a) ? safeUrl(a)
  : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a);
// Accept a full link or just a handle ("@quanb", "quanb").
const socialUrl = (base, s) => !s ? '' : isUrl(s) ? safeUrl(s) : base + encodeURIComponent(s.replace(/^@/, ''));
const fbUrl = s => socialUrl('https://www.facebook.com/', s);
const igUrl = s => socialUrl('https://www.instagram.com/', s);

const b64u = {
  enc: b => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
};
async function pack(obj) {
  const s = new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return b64u.enc(new Uint8Array(await new Response(s).arrayBuffer()));
}
async function unpack(str) {
  const s = new Blob([b64u.dec(str)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(s).text());
}
// "owner/repo" when served from <owner>.github.io/<repo>/, else ''.
function repoFromLocation() {
  const m = location.hostname.match(/^([^.]+)\.github\.io$/);
  return m && location.pathname.split('/')[1] ? `${m[1]}/${location.pathname.split('/')[1]}` : '';
}

// ---- Encryption: config.json and uploaded photos are AES-GCM encrypted in the (public) repo. ----
// The 256-bit key travels only in the link fragment (#k=…), which browsers never send to a server.
// The owner's browser also keeps it in localStorage (same origin as the invite).
const KEY_LS = 'invite-key';
const hashKey = () => location.hash.match(/(?:^#|&)k=([\w-]{43})(?:&|$)/)?.[1] || '';
const storedKey = () => { try { return localStorage.getItem(KEY_LS) || ''; } catch { return ''; } };
const currentKey = () => hashKey() || storedKey();
const newKey = () => b64u.enc(crypto.getRandomValues(new Uint8Array(32)));
const aesKey = k => crypto.subtle.importKey('raw', b64u.dec(k), 'AES-GCM', false, ['encrypt', 'decrypt']);
async function seal(k, bytes) { // -> iv(12) ‖ ciphertext
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(k), bytes));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
}
async function unseal(k, buf) {
  buf = new Uint8Array(buf);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, await aesKey(k), buf.slice(12)));
}
const encryptConfig = async (obj, k) => ({ v: 1, enc: b64u.enc(await seal(k, new TextEncoder().encode(JSON.stringify(obj)))) });
// Plain JSON passes through (configs saved before encryption). Throws {locked} when the key is missing/wrong.
async function openConfig(j, k = currentKey()) {
  if (!j?.enc) return j || {};
  const locked = () => Object.assign(new Error('locked'), { locked: true });
  if (!k) throw locked();
  try { return JSON.parse(new TextDecoder().decode(await unseal(k, b64u.dec(j.enc)))); } catch { throw locked(); }
}
// Encrypted photo references: "enc:https://raw.githubusercontent.com/…/uploads/x.bin" -> blob: URL (cached).
const encCache = new Map();
function imageSrc(src) {
  if (!src?.startsWith('enc:')) return Promise.resolve(src || '');
  if (!encCache.has(src)) encCache.set(src, (async () => {
    const r = await fetch(src.slice(4));
    if (!r.ok) throw new Error(r.status);
    return URL.createObjectURL(new Blob([await unseal(currentKey(), await r.arrayBuffer())]));
  })().catch(() => ''));
  return encCache.get(src);
}
const hydrateImages = root => root.querySelectorAll('img[data-src]').forEach(async im => { im.src = await imageSrc(im.dataset.src); });

// Config source: #hash (admin preview, packed JSON) > config.json via GitHub API (fresh ~60s)
// > config.json on Pages (CDN may be up to 10 min stale) > defaults. Encrypted without key -> { locked: true }.
async function readConfig(localUrl) {
  const D = structuredClone(DEFAULT), h = location.hash.slice(1);
  if (h && !/^k=/.test(h)) try { return { ...D, ...(await unpack(h)), preview: true }; } catch {}
  const repo = repoFromLocation();
  for (const url of [repo && `https://api.github.com/repos/${repo}/contents/config.json`, localUrl]) {
    if (!url) continue;
    try {
      const r = await fetch(url, { headers: { Accept: 'application/vnd.github.raw+json' } });
      if (r.ok) return { ...D, ...(await openConfig(await r.json())) };
    } catch (e) { if (e.locked) return { ...D, locked: true }; }
  }
  return D;
}

// ---- Email notifications via the owner's Google Apps Script web app (docs/notifications.md) ----
// Only Apps Script URLs are accepted. "no-cors" + text/plain = simple request: no preflight, opaque reply.
const notifyEndpoint = u => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u || '') ? u : '';
function sendNotify(url, c) {
  const body = JSON.stringify({ event: c.event, to: c.to, from: c.from, accept: c.accept, date: c.date,
    at: new Date().toLocaleString('vi-VN'), ua: navigator.userAgent });
  return fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true, body }).catch(() => {});
}

// ---- Date parts (shared by the template layout and free-layout fields) ----
function dateParts(s) {
  const d = new Date(s), pad = n => String(n).padStart(2, '0');
  if (isNaN(d)) return { valid: false, d };
  return { valid: true, d, dd: pad(d.getDate()), mm: pad(d.getMonth() + 1), yyyy: d.getFullYear(),
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    weekday: new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(d) };
}

// ---- Free layout ("Tự thiết kế") ----
// layout = { mode: 'template'|'free', portrait: { items } | null, landscape: { items } | null }
// Item position = centre in % of the screen (cx, cy). Size + font size = "design px" of a
// reference screen (REF), rendered with --u = min(100cqw / refW, 100cqh / refH):
// a shorter screen shrinks text by the same factor as the vertical spacing -> never overlaps.
const REF = { portrait: [390, 844], landscape: [1440, 900] };
// Composition guides in % (both axes). "golden" = 1/φ² and 1/φ.
const GUIDES = { thirds: [100 / 3, 200 / 3], golden: [38.197, 61.803], safe: [8, 92] };
// Modular type scales: font sizes on base·ratioⁿ relate harmoniously.
const SCALES = { 1.25: 'Major third 1.25', 1.333: 'Perfect fourth 1.333', 1.618: 'Tỷ lệ vàng 1.618' };
// Content blocks bound to form fields (label, text getter).
const FIELDS = {
  greeting: ['Lời chào', c => `Gửi ${c.to},`],
  to:       ['Tên người nhận', c => c.to],
  title:    ['Tiêu đề', c => c.title],
  message:  ['Lời nhắn', c => c.message],
  sign:     ['Chữ ký', c => `— ${c.from}`],
  date:     ['Ngày', c => { const p = dateParts(c.date); return p.valid ? `${p.dd} · ${p.mm} · ${p.yyyy}` : ''; }],
  when:     ['Thứ & giờ', c => { const p = dateParts(c.date); return p.valid ? `${p.weekday}, ${p.time}` : ''; }],
};
const ALIGN = ['left', 'center', 'right'], COLORS = ['fg', 'muted', 'accent'], SHAPES = ['line', 'frame', 'circle'];

// Starting point when the user first switches to "Tự thiết kế": mirrors the template letter.
function defaultPortrait() {
  const t = (id, field, cy, w, fs, o = {}) => ({ id, type: 'field', field, cx: 50, cy, w, fs, rot: 0, font: 'display', align: 'center', color: 'fg', lh: 1.25, ...o });
  return { items: [
    t('greeting', 'greeting', 24, 320, 12, { font: 'body', caps: true, ls: .28, color: 'muted' }),
    t('title', 'title', 36, 340, 46, { lh: 1.08 }),
    t('message', 'message', 55, 310, 16, { font: 'body', color: 'muted', lh: 1.75 }),
    t('sign', 'sign', 69, 300, 26, { italic: true }),
    t('date', 'date', 80, 300, 12, { font: 'body', ls: .28, color: 'muted' }),
  ] };
}

const num = (v, lo, hi, dflt) => { v = +v; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt; };
function itemText(cfg, it) { return it.type === 'field' ? (FIELDS[it.field]?.[1](cfg) ?? '') : String(it.text ?? ''); }
// Inline style from an item. Every value is coerced/whitelisted (config is user data).
function itemStyle(it, z) {
  return `--cx:${num(it.cx, -50, 150, 50)};--cy:${num(it.cy, -50, 150, 50)};--w:${num(it.w, 4, 4000, 200)};` +
    `--h:${num(it.h, 1, 4000, 100)};--t:${num(it.t, .5, 40, 1)};--rad:${num(it.rad, 0, 2000, 0)};` +
    `--fs:${num(it.fs, 4, 800, 16)};--rot:${num(it.rot, -360, 360, 0)};--op:${num(it.op ?? 100, 0, 100, 100) / 100};z-index:${z};` +
    `text-align:${ALIGN.includes(it.align) ? it.align : 'center'};color:var(--${COLORS.includes(it.color) ? it.color : 'fg'});` +
    `font-family:var(--${it.font === 'body' ? 'body' : 'display'});font-style:${it.italic ? 'italic' : 'normal'};` +
    `text-transform:${it.caps ? 'uppercase' : 'none'};letter-spacing:${num(it.ls, -.1, 1, 0)}em;line-height:${num(it.lh, .8, 3, 1.25)}`;
}
// Items HTML in reading order (top→bottom, left→right) for accessibility; z-index keeps layer order.
// opts.fmt(text) -> inner HTML (escaped!). opts.reveal adds the reveal hooks (word-by-word for text).
// Images render with data-src: call hydrateImages(root) afterwards (decrypts "enc:" photos).
function boardItemsHTML(cfg, items, { fmt = esc, reveal = false } = {}) {
  return items.map((it, z) => [it, z]).sort((a, b) => a[0].cy - b[0].cy || a[0].cx - b[0].cx)
    .map(([it, z], i) => {
      const r = reveal ? ` data-r style="--d:${i + 1}"` : '';
      const inner = it.type === 'image' ? `<img class="im" data-src="${esc(httpsSrc(it.src))}" alt="" draggable="false"${r}>`
        : it.type === 'shape' ? `<i class="sh ${SHAPES.includes(it.shape) ? it.shape : 'line'}"${r}></i>`
        : `<div class="tx${reveal ? ' words' : ''}"${r}>${fmt(itemText(cfg, it))}</div>`;
      return `<div class="it it-${esc(it.type || 'text')}" data-id="${esc(it.id)}" style="${itemStyle(it, z)}">${inner}</div>`;
    }).join('');
}
const freeLayout = cfg => cfg.layout?.mode === 'free' && cfg.layout.portrait?.items?.length ? cfg.layout : null;

// Sets theme tokens + loads the display font. Resolves once the font is usable.
function applyStyle(cfg) {
  const t = THEMES[cfg.theme] || THEMES.ivory, f = FONTS[cfg.font] || FONTS.cormorant, r = document.documentElement.style;
  for (const k of ['bg', 'fg', 'muted', 'line', 'accent']) r.setProperty('--' + k, t[k]);
  r.setProperty('--display', f.display);
  r.colorScheme = cfg.theme === 'noir' ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg);
  return Promise.all([loadFont(f), applyBackground(cfg, r)]);
}

function loadFont(f) {
  const href = `https://fonts.googleapis.com/css2?family=${f.q}&family=Be+Vietnam+Pro:wght@300;400;500&display=swap`;
  let link = document.getElementById('font');
  if (link?.href === href) return Promise.resolve();
  link ??= Object.assign(document.head.appendChild(document.createElement('link')), { id: 'font', rel: 'stylesheet' });
  return new Promise(ok => { link.onload = link.onerror = ok; link.href = href; })
    .then(() => document.fonts.load(`400 1em ${f.display}`, 'Ểm'));
}

// Sets --bg-img / --dim / --blur. Blurred photos are fetched smaller (detail is blurred away anyway).
function applyBackground(cfg, r) {
  const blur = Math.min(100, Math.max(0, +cfg.bgBlur || 0)) / 100 * BLUR_MAX_PX;
  const w = Math.min(2400, Math.ceil(innerWidth * devicePixelRatio / (blur ? 960 : 480)) * 480);
  const url = bgUrl(cfg.bg, w);
  r.setProperty('--dim', Math.min(95, Math.max(0, cfg.bgDim ?? 70)) / 100);
  r.setProperty('--blur', blur + 'px');
  r.setProperty('--bgx', num(cfg.bgX, 0, 100, 50) + '%');
  r.setProperty('--bgy', num(cfg.bgY, 0, 100, 50) + '%');
  r.setProperty('--bgz', num(cfg.bgZoom, 100, 300, 100) / 100);
  document.documentElement.classList.toggle('has-bg', !!url);
  if (!url) { r.removeProperty('--bg-img'); return Promise.resolve(); }
  return imageSrc(url).then(src => {
    const img = new Image(); img.src = src;
    return img.decode().catch(() => {}).then(() => r.setProperty('--bg-img', `url("${src}")`));
  });
}
