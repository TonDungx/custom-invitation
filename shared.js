// Shared by index.html and admin/: defaults, themes, link encoding.
// Config lives in the URL hash (compressed) -> no backend needed.
// ponytail: no server storage; add one only if you need a short fixed link that updates in place.

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
  thanks: 'Hẹn gặp em nhé.',
  reply: '',
  replyLabel: 'Nhắn cho anh',
  theme: 'ivory',
  font: 'cormorant',
  intro: true,
  bg: '',      // '' | preset key | custom https URL
  bgDim: 70,   // % of theme colour laid over the photo (keeps text readable)
  bgBlur: 0,   // 0-100 %
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
function bgUrl(bg, w) {
  if (!bg) return '';
  if (BACKGROUNDS[bg]) return unsplash(BACKGROUNDS[bg].id, w);
  const u = safeUrl(bg);
  return /^https?:/.test(u) ? u : '';
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

// Config source: #hash (admin preview) > config.json via GitHub API (fresh ~60s)
// > config.json on Pages (CDN may be up to 10 min stale) > defaults.
async function readConfig(localUrl) {
  const D = structuredClone(DEFAULT), h = location.hash.slice(1);
  if (h) try { return { ...D, ...(await unpack(h)) }; } catch {}
  const repo = repoFromLocation();
  for (const url of [repo && `https://api.github.com/repos/${repo}/contents/config.json`, localUrl]) {
    if (!url) continue;
    try {
      const r = await fetch(url, { headers: { Accept: 'application/vnd.github.raw+json' } });
      if (r.ok) return { ...D, ...(await r.json()) };
    } catch {}
  }
  return D;
}

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
  document.documentElement.classList.toggle('has-bg', !!url);
  if (!url) { r.removeProperty('--bg-img'); return Promise.resolve(); }
  const img = new Image(); img.src = url;
  return img.decode().catch(() => {}).then(() => r.setProperty('--bg-img', `url("${url}")`));
}
