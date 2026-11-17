// Per-style ornaments (inline SVG, stroked/filled with currentColor = --accent via styles.css) and effects.
// Layout/typography of each style lives in styles.css. Colours always come from the theme tokens.

const svg = (vb, body, cls = '') => `<svg class="${cls}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
// pathLength=1 -> styles.css can "draw" any stroke with stroke-dasharray: 1 (class, not [pathLength]: Chrome did not restyle on that selector).
const P = (d, extra = '') => `<path class="draw" pathLength="1" d="${d}"${extra}/>`;
const HEART = 'M12 21s-7.5-4.6-9.6-9.3C1 8.3 3 4.5 6.7 4.5c2.2 0 3.7 1.2 5.3 3.2 1.6-2 3.1-3.2 5.3-3.2C21 4.5 23 8.3 21.6 11.7 19.5 16.4 12 21 12 21z';
const heart = (x, y, s) => `<path d="${HEART}" transform="translate(${x} ${y}) scale(${s})" fill="currentColor" stroke="none"/>`;

// Vintage corner flourish (top-left; the other three are mirrored in CSS).
const CORNER = svg('0 0 64 64',
  P('M4 60V22Q4 4 22 4h38') + P('M11 60V27q0-16 16-16h33') +
  P('M19 19c7-3 13 1 11 9-7 3-13-1-11-9z') + '<circle cx="4" cy="60" r="1.6" fill="currentColor" stroke="none"/><circle cx="60" cy="4" r="1.6" fill="currentColor" stroke="none"/>', 'corner');

export const ORN = {
  vintage: {
    rule: svg('0 0 140 18', P('M2 9h50') + P('M88 9h50') + P('M70 2l7 7-7 7-7-7z') + P('M58 9c0-3 3-4 5 0') + P('M82 9c0-3-3-4-5 0')),
    frame: `<div class="frame" aria-hidden="true">${CORNER.repeat(4)}</div>`,
  },
  romance: {
    // Sprig over the recipient's name: one stem, leaves, a five-petal flower.
    cover: svg('0 0 200 64',
      P('M12 46C46 46 66 26 100 26s56 18 88 18') +
      P('M44 40c3-11 14-15 22-12-4 9-13 14-22 12z') + P('M70 30c-3-9 1-17 9-20 3 8-1 16-9 20z') +
      P('M132 31c8-1 16 4 18 12-9 2-16-3-18-12z') + P('M156 41c3-9 12-13 19-10-3 8-11 12-19 10z') +
      P('M100 26c-6-3-7-11-1-13 4-1 6 3 1 13z') + P('M100 26c3-6 11-7 13-1 1 4-3 6-13 1z') +
      P('M100 26c6 3 7 11 1 13-4 1-6-3-1-13z') + P('M100 26c-3 6-11 7-13 1-1-4 3-6 13-1z') +
      '<circle cx="100" cy="26" r="2" fill="currentColor" stroke="none"/>'),
    rule: svg('0 0 140 24', P('M4 14C30 14 44 8 70 8s40 6 66 6') + P('M36 12c2-7 9-9 14-7-2 6-8 8-14 7z') +
      P('M92 9c6-1 11 3 12 8-6 1-11-2-12-8z') + '<circle cx="70" cy="8" r="2.4" fill="currentColor" stroke="none"/>'),
  },
  playful: {
    rule: svg('0 0 120 20', P('M3 10q7.5-12 15 0t15 0 15 0 15 0 15 0 15 0 15 0 15 0')),
  },
  cute: {
    // One heart between two dotted strokes (dots = zero-length dashes with round caps).
    rule: svg('0 0 88 24', '<path d="M4 13h22M62 13h22" stroke-width="2.4" stroke-dasharray="0 6"/>' + heart(32, 1, 1)),
  },
};

// ---- Effects (Web Animations, fixed-position particles, removed when done) ----
const rnd = (a, b) => a + Math.random() * (b - a);
function bit(cls, x, y, w, h) {
  const p = document.createElement('i');
  p.className = 'sfx ' + cls;
  Object.assign(p.style, { left: x - w / 2 + 'px', top: y - h / 2 + 'px', width: w + 'px', height: h + 'px' });
  document.body.append(p);
  return p;
}
const done = p => () => p.remove();

function confetti(r) {
  const tones = ['t-accent', 't-fg', 't-muted'];
  for (let i = 0; i < 70; i++) {
    const p = bit('confetti ' + tones[i % 3], r.left + r.width / 2, r.top + r.height / 2, rnd(6, 10), rnd(10, 16));
    const a = rnd(-Math.PI * .95, -Math.PI * .05), v = rnd(140, 340), dx = Math.cos(a) * v, dy = Math.sin(a) * v;
    p.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) rotate(${rnd(-360, 360)}deg)`, opacity: 1, offset: .35 },
      { transform: `translate(${dx * 1.4}px,${dy + rnd(260, 420)}px) rotate(${rnd(-720, 720)}deg)`, opacity: 0 },
    ], { duration: rnd(1400, 2200), easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = done(p);
  }
}

function hearts(r, n) {
  for (let i = 0; i < n; i++) {
    const s = rnd(12, 24), p = bit('heart', r.left + rnd(0, r.width), r.top + r.height / 2, s, s);
    p.animate([
      { transform: 'translate(0,0) scale(.3)', opacity: 0 },
      { transform: `translate(${rnd(-20, 20)}px,-40px) scale(1)`, opacity: .95, offset: .2 },
      { transform: `translate(${rnd(-70, 70)}px,${-rnd(160, 300)}px) scale(.8) rotate(${rnd(-25, 25)}deg)`, opacity: 0 },
    ], { duration: rnd(1500, 2400), delay: rnd(0, 300), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' }).onfinish = done(p);
  }
}

function petalBurst(r, n) {
  for (let i = 0; i < n; i++) {
    const s = rnd(10, 16), p = bit('petal', r.left + r.width / 2, r.top + r.height / 2, s, s * .7);
    const dx = rnd(-160, 160), dy = rnd(-180, -60);
    p.animate([
      { transform: 'translate(0,0) rotate(0)', opacity: 0 },
      { transform: `translate(${dx * .6}px,${dy}px) rotate(${rnd(-90, 90)}deg)`, opacity: .9, offset: .3 },
      { transform: `translate(${dx}px,${dy + rnd(220, 340)}px) rotate(${rnd(-240, 240)}deg)`, opacity: 0 },
    ], { duration: rnd(2000, 3000), easing: 'cubic-bezier(.25,.6,.4,1)' }).onfinish = done(p);
  }
}

// kind: 'accept' (RSVP yes) | 'open' (cover button). Nothing with reduced motion.
export function celebrate(style, el, calm, kind = 'accept') {
  if (calm || !el) return;
  const r = el.getBoundingClientRect();
  if (kind === 'open') {
    // Wax seal / heart button breaks away as the cover fades.
    if (style === 'vintage') el.animate([{ transform: 'none', opacity: 1 }, { transform: 'rotate(-14deg) scale(1.18)', opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    if (style === 'cute') { el.animate([{ transform: 'none' }, { transform: 'scale(1.25)', opacity: 0 }], { duration: 500, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }); hearts(r, 10); }
    return;
  }
  if (style === 'playful') confetti(r);
  else if (style === 'cute') hearts(r, 16);
  else if (style === 'romance') petalBurst(r, 22);
}

// Slow falling petals behind the content (Lãng mạn only). Re-entrant: admin preview re-renders on every edit.
let amb = null;
export function ambient(style, calm) {
  const want = style === 'romance' && !calm;
  if (!want) { amb?.remove(); amb = null; return; }
  if (amb?.isConnected) return;
  amb = document.createElement('div');
  amb.className = 'amb'; amb.setAttribute('aria-hidden', 'true');
  document.querySelector('.backdrop').after(amb); // same z-index as the photo, painted above it
  for (let i = 0; i < 9; i++) {
    const p = document.createElement('i'), s = rnd(9, 15);
    p.className = 'petal';
    Object.assign(p.style, { left: rnd(0, 100) + '%', width: s + 'px', height: s * .7 + 'px' });
    amb.append(p);
    const drift = rnd(-80, 80), dur = rnd(14000, 24000);
    p.animate([
      { transform: 'translate(0,-5vh) rotate(0)', opacity: 0 },
      { opacity: .55, offset: .1 },
      { transform: `translate(${drift}px,55vh) rotate(${rnd(90, 200)}deg)`, offset: .5 },
      { opacity: .55, offset: .9 },
      { transform: `translate(${-drift / 2}px,105vh) rotate(${rnd(240, 420)}deg)`, opacity: 0 },
    ], { duration: dur, delay: -rnd(0, dur), iterations: Infinity, easing: 'linear' });
  }
}
