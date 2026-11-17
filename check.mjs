// Run: npm i --no-save playwright-core && npx firebase-tools@13.35.1 emulators:exec --only auth,firestore --project demo-invite "node check.mjs"
// (uses installed Chrome; firebase-tools 13 runs on Java 11+). End-to-end: sign in -> admin edit -> Apply (Firestore emulator)
// -> invite renders the saved, encrypted invite.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || os.tmpdir();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const srv = http.createServer((q, r) => {
  let f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
}).listen(5178);
const BASE = 'http://localhost:5178/';
// Always in the future, so the countdown assertion never expires.
const YEAR = new Date().getFullYear() + 1, DATE = `${YEAR}-12-24T19:30`;

// Firebase: point the pages at the local emulators (Auth 9099, Firestore 8080).
const FS = 'http://127.0.0.1:8080/v1/projects/demo-invite/databases/(default)/documents';
const FB_CFG = "const FIREBASE = { apiKey: 'fake', authDomain: 'localhost', projectId: 'demo-invite', emulator: '127.0.0.1' };";
// The real config.json in the repo is the owner's old invite: never let the tests see it. legacy = fake old invite.
let legacy = null;
const legacyPhotos = new Map();
async function setup(c) {
  await c.route(BASE + 'firebase-config.js', r => r.fulfill({ status: 200, body: FB_CFG, contentType: 'text/javascript' }));
  await c.route(BASE + 'config.json', r => legacy ? r.fulfill({ status: 200, json: legacy }) : r.fulfill({ status: 404 }));
  await c.route('https://raw.githubusercontent.com/**', r => r.fulfill({ status: 200, body: legacyPhotos.get(r.request().url()) || Buffer.alloc(0) }));
}
const fsGet = async p => { const r = await fetch(FS + p); return r.ok ? r.json() : null; };

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext();
await setup(ctx);
// Notifications to the owner's Apps Script web app.
const notes = [];
await ctx.route('https://script.google.com/**', r => { notes.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 200, body: 'ok' }); });
const NOTIFY = 'https://script.google.com/macros/s/AKfyTEST_123/exec';
const errors = [];
const page = await ctx.newPage(); await page.setViewportSize({ width: 1440, height: 900 });
page.on('pageerror', e => errors.push('admin: ' + e.message));
// Stored invite, decrypted by the signed-in admin page (same code path as the app).
const plain = () => page.evaluate(() => fetchConfig());
const signIn = (p, sub, email) => p.evaluate(([s, e]) => window.__testSignIn(s, e), [sub, email]);

await page.goto(BASE + 'admin');
await page.waitForSelector('#gate #google');
await signIn(page, 'owner-1', 'owner@example.com');
await page.waitForSelector('#status:has-text("Đã lưu")');
assert.ok(!(await page.locator('#gate').count()), 'gate removed after sign-in');
assert.match(page.url(), /\/admin\/\?i=[\w-]{20}$/, 'first sign-in creates an invite, id in the URL');
const ID = new URL(page.url()).searchParams.get('i'), INV = BASE + '?i=' + ID;
assert.equal(await page.textContent('#who'), 'owner@example.com');
assert.ok(await page.isDisabled('#apply'), 'apply disabled when clean');
assert.ok(await page.isChecked('[name=bg][value=none]'), '"Không" background selected by default');
assert.ok(!(await page.isVisible('#bgCustom')), 'custom URL field hidden unless "Tuỳ chỉnh"');

await page.fill('[name=to]', 'Linh');
await page.fill('[name=from]', 'Minh');
await page.fill('[name=date]', DATE);
const s1 = '#stops .stop:nth-child(1) ';
await page.fill(s1 + '[data-k=name]', 'Nhà hàng Sen <script>alert(1)</script>');
await page.fill(s1 + '[data-k=address]', '12 Lý Thái Tổ, Hà Nội');
await page.fill(s1 + '[data-k=facebook]', 'https://www.facebook.com/nhahangsen');
await page.fill(s1 + '[data-k=instagram]', '@nhahangsen');
await page.fill('[name=reply]', 'javascript:alert(1)');
await page.fill('[name=notifyUrl]', NOTIFY);
await page.check('[name=notifyOpen]');
await page.check('[name=theme][value=noir]');
await page.check('[name=bg][value=candles]', { force: true });
assert.ok(!(await page.isDisabled('#bgOpts')), 'bg sliders enabled when a photo is chosen');
await page.locator('[name=bgBlur]').fill('50');
await page.locator('[name=bgDim]').fill('60');
assert.equal(await page.textContent('output[name=blurOut]'), '50%');
await page.waitForSelector('#status:has-text("Chưa lưu")');
await page.click('nav a[href="#s-stops"]'); await page.waitForTimeout(900);
assert.equal(await page.getAttribute('nav a[href="#s-stops"]', 'aria-current'), 'true', 'scrollspy');
await page.screenshot({ path: OUT + '/admin.png' });

// Apply -> encrypted invite in Firestore
await page.click('#apply');
await page.waitForSelector('#status:has-text("Đã lưu")');
const doc = await fsGet('/invites/' + ID);
const UID = await page.evaluate(() => me().uid);
assert.equal(doc.fields.owner.stringValue, UID, 'invite owned by the signed-in user');
assert.ok(doc.fields.enc.stringValue && !JSON.stringify(doc).includes('Linh'), 'invite is encrypted at rest');
const s0 = await plain();
assert.equal(s0.to, 'Linh');
assert.deepEqual([s0.bg, s0.bgBlur, s0.bgDim, s0.notifyUrl], ['candles', 50, 60, NOTIFY]);
const KEY = await page.evaluate(id => userKeys[id], ID);
assert.match(KEY, /^[\w-]{43}$/, '256-bit key in base64url');
assert.equal(await page.evaluate(id => localStorage.getItem('invite-key:' + id), ID), KEY, 'key cached per invite');
assert.equal(new URL(await page.getAttribute('#view', 'href')).search, '?i=' + ID, 'share link carries the invite id');
assert.equal(notes.length, 0, 'admin preview never sends notifications');
// "Gửi thử" sends a test notification.
await page.click('#notifyTest'); await page.waitForTimeout(300);
assert.equal(notes.at(-1)?.event, 'test', 'test notification sent');
assert.ok(await page.isDisabled('#apply'));

// Upload a background from the device: 3000x2000 PNG -> resized to <=2400px WebP, encrypted, stored as Firestore bytes.
const png = Buffer.from(await page.evaluate(() => {
  const c = Object.assign(document.createElement('canvas'), { width: 3000, height: 2000 }), g = c.getContext('2d');
  g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, 3000, 2000); g.fillStyle = '#c9a96e'; g.fillRect(800, 500, 1400, 1000);
  return c.toDataURL('image/png').split(',')[1];
}), 'base64');
await page.setInputFiles('#file', { name: 'photo.png', mimeType: 'image/png', buffer: png });
await page.waitForFunction(() => document.querySelector('[name=bgUrl]').value.startsWith('fs:'));
const photoId = (await page.inputValue('[name=bgUrl]')).slice(3);
const photo = await fsGet(`/invites/${ID}/photos/${photoId}`);
const uploaded = { bytes: Buffer.from(photo.fields.data.bytesValue, 'base64') };
assert.equal(photo.fields.owner.stringValue, UID);
assert.ok(uploaded.bytes.length < png.length, 'compressed smaller than original');
assert.notEqual(uploaded.bytes.subarray(8, 12).toString(), 'WEBP', 'uploaded photo is encrypted, not a readable WebP');
const dims = await page.evaluate(async ([b64, k]) => {
  const plainBytes = await unseal(k, Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
  const b = await createImageBitmap(new Blob([plainBytes])); return [b.width, b.height];
}, [uploaded.bytes.toString('base64'), KEY]);
assert.deepEqual(dims, [2400, 1600], 'decrypts to a 2400px-long-edge image');
await page.waitForFunction(() => document.querySelector('#focalImg').src.startsWith('blob:'));
assert.ok(await page.isChecked('[name=bg][value=custom]'));
assert.ok(await page.isVisible('#bgCustom'));
await page.waitForSelector('#status:has-text("Chưa lưu")');
console.log('upload:', photoId, png.length, '->', uploaded.bytes.length, 'bytes');

// Invite reads the saved invite at ?i=<id> (key cached in this browser)
const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 });
m.on('pageerror', e => errors.push('invite: ' + e.message));
await m.goto(INV);
await m.waitForSelector('body.ready'); await m.waitForTimeout(1200);
assert.equal(await m.textContent('.cover h1'), 'Linh');
assert.equal(notes.filter(n => n.event === 'open').length, 1, 'open notification (notifyOpen) sent once');
const bgState = await m.evaluate(() => ({ has: document.documentElement.classList.contains('has-bg'),
  img: getComputedStyle(document.documentElement).getPropertyValue('--bg-img'), blur: getComputedStyle(document.querySelector('.backdrop'), '::before').filter }));
assert.ok(bgState.has && bgState.img.includes('images.unsplash.com'), 'background photo applied');
assert.equal(bgState.blur, 'blur(12px)', '50% blur = 12px');
await m.screenshot({ path: OUT + '/1-cover.png' });
assert.ok(await m.locator('#sb[hidden]').count(), 'overlay scrollbar hidden while cover is up');
await m.click('#open'); await m.waitForTimeout(2800);
assert.ok(await m.isVisible('#cue.show'), 'scroll cue visible');
await m.screenshot({ path: OUT + '/2-letter.png' });
await m.mouse.wheel(0, 300); await m.waitForTimeout(800);
assert.ok(!(await m.isVisible('#cue.show')), 'scroll cue hides after scroll');
// Overlay scrollbar: native one hidden (no layout width), custom thumb tracks + drags.
assert.equal(await m.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth), 'none');
assert.ok(await m.isVisible('#sb.on i'), 'overlay thumb shows while scrolling');
const sbBox = await m.locator('#sb i').boundingBox();
assert.ok(sbBox.x + sbBox.width <= 390 && sbBox.x >= 390 - 12, 'thumb sits on the right edge, over the page');
const y1 = await m.evaluate(() => scrollY);
await m.mouse.move(sbBox.x + 6, sbBox.y + sbBox.height / 2); await m.mouse.down(); await m.mouse.move(sbBox.x + 6, sbBox.y + sbBox.height / 2 + 120, { steps: 5 }); await m.mouse.up();
assert.ok(await m.evaluate(() => scrollY) > y1 + 200, 'dragging the thumb scrolls the page');
await m.mouse.move(100, 400); await m.waitForTimeout(1900);
assert.ok(!(await m.locator('#sb.on').count()), 'thumb fades when idle');
// Regression: scrolling before the cue's delay must not leave it stuck on (it overlapped the footer).
const m2 = await ctx.newPage(); await m2.setViewportSize({ width: 390, height: 844 });
await m2.goto(INV); await m2.waitForSelector('body.ready'); await m2.click('#open');
await m2.waitForTimeout(400); await m2.mouse.wheel(0, 5000); await m2.waitForTimeout(2500);
assert.ok(!(await m2.isVisible('#cue.show')), 'cue stays hidden at page end');
await m2.screenshot({ path: OUT + '/end.png' }); await m2.close();

assert.equal(await m.locator('.stop h3 script').count(), 0, 'XSS: no script element');
assert.match(await m.textContent('.stop h3'), /<script>/);
assert.equal(await m.locator('.done a.btn:not(#gcal)').count(), 0, 'javascript: link dropped');
const hrefs = await m.$$eval('.stop:first-child .links a', a => a.map(x => x.href));
assert.equal(hrefs.length, 3);
assert.match(hrefs[0], /google\.com\/maps.*L%C3%BD/);
assert.equal(hrefs[1], 'https://www.facebook.com/nhahangsen');
assert.equal(hrefs[2], 'https://www.instagram.com/nhahangsen');
assert.equal(await m.locator('.stop:nth-child(2) .links').count(), 0, 'no links -> no icon row');

await m.locator('.stops').scrollIntoViewIfNeeded(); await m.waitForTimeout(2000);
await m.screenshot({ path: OUT + '/3-stops.png' });
await m.locator('#rsvp').scrollIntoViewIfNeeded(); await m.waitForTimeout(1200);
// Decline button (default mode "dodge"): it flees and never accepts/declines anything.
const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
await m.waitForTimeout(1500);
for (let i = 0; i < 6; i++) {
  const before = await m.locator('#no').boundingBox();
  await m.locator('#no').dispatchEvent('pointerdown'); await m.waitForTimeout(700);
  const after = await m.locator('#no').boundingBox(), yes = await m.locator('#yes').boundingBox();
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) > 100, 'dodge moved');
  assert.ok(!overlap(after, yes), 'dodge never lands on the accept button');
  assert.ok(after.x >= 0 && after.x + after.width <= 390, 'dodge stays on screen');
}
await m.screenshot({ path: OUT + '/dodge.png' });
assert.ok(!(await m.locator('#rsvp.yes').count()), 'decline did nothing');
await m.click('#yes'); await m.waitForTimeout(2400);
const acc = notes.find(n => n.event === 'accept');
assert.ok(acc && acc.to === 'Linh' && acc.date === DATE, 'accept notification sent with name and date');
// Calendar: Google Calendar link + .ics with a 2h reminder.
const gcal = new URL(await m.getAttribute('#gcal', 'href'));
assert.equal(gcal.hostname, 'calendar.google.com');
assert.equal(gcal.searchParams.get('dates'), `${YEAR}1224T193000/${YEAR}1224T233000`);
assert.equal(await m.locator('.inapp').count(), 0, 'no in-app hint in a normal browser');
const dl = m.waitForEvent('download'); await m.click('#ics');
const ics = fs.readFileSync(await (await dl).path(), 'utf8');
assert.match(ics, new RegExp(`DTSTART:${YEAR}1224T193000`));
assert.match(ics, /BEGIN:VALARM[\s\S]*TRIGGER:-PT2H/, '.ics has a 2h reminder');
// Other decline modes, configured through the URL hash (same path the admin preview uses).
for (const mode of ['smoke', 'vanish']) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: 390, height: 844 });
  p.on('pageerror', e => errors.push(mode + ': ' + e.message));
  await p.goto(BASE); await p.waitForSelector('body.ready');
  const h = await p.evaluate(mode => pack({ ...DEFAULT, intro: false, declineMode: mode }), mode);
  await p.goto(BASE + '#' + h); await p.waitForSelector('body.ready');
  await p.locator('#rsvp').scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
  const clicks = mode === 'smoke' ? 4 : 1;
  for (let i = 0; i < clicks; i++) {
    await p.click('#no'); await p.waitForTimeout(250);
    if (mode === 'smoke' && i === 2) { assert.ok(await p.locator('.fx.smoke').count() > 0, 'smoke particles'); await p.screenshot({ path: OUT + '/smoke.png' }); }
    if (mode === 'smoke' && i < 3) assert.equal(await p.locator('#no').count(), 1, 'survives first 3 clicks');
  }
  if (mode === 'vanish') { await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/vanish.png' }); }
  await p.waitForTimeout(2000);
  assert.equal(await p.locator('#no').count(), 0, mode + ': button removed');
  assert.equal(await p.locator('.fx').count(), 0, mode + ': particles cleaned up');
  assert.ok(!(await p.locator('#rsvp.yes').count()), mode + ': decline did nothing');
  await p.close();
}
{ // off -> no decline button
  const p = await ctx.newPage(); await p.goto(BASE); await p.waitForSelector('body.ready');
  const h = await p.evaluate(() => pack({ ...DEFAULT, intro: false, declineMode: 'off' }));
  await p.goto(BASE + '#' + h); await p.waitForSelector('body.ready');
  assert.equal(await p.locator('#no').count(), 0, 'off: no decline button'); await p.close();
}

const cnt = await m.$$eval('#count b', b => b.map(x => x.textContent));
assert.ok(cnt.some(v => v !== '00'), 'countdown ticking');

// ---------- Free layout designer ("Tự thiết kế") ----------
{
  const a = await ctx.newPage(); await a.setViewportSize({ width: 1440, height: 900 });
  a.on('pageerror', e => errors.push('designer: ' + e.message));
  // The form only links to the designer (separate page) when "Tự thiết kế" is chosen.
  await a.goto(BASE + 'admin/'); await a.waitForSelector('#status:has-text("Đã lưu")');
  assert.ok(!(await a.isVisible('#designLink')), 'no designer link in template mode');
  await a.check('[name=layoutMode][value=free]', { force: true });
  assert.ok(await a.isVisible(`#designLink a[href="design/?i=${ID}"]`), 'designer link in free mode');
  assert.equal(await a.locator('.board').count(), 0, 'no designer embedded in the form page');
  await a.goto(BASE + 'admin/design?i=' + ID); await a.waitForSelector('.ed-stage .board .it');
  assert.ok(a.url().endsWith('/admin/design/?i=' + ID), 'designer page at /admin/design/');
  assert.equal(await a.locator('.board .it').count(), 5, 'default portrait has 5 blocks');
  await a.waitForSelector('#status:has-text("Chưa lưu")'); // a brand-new design can be applied right away
  const stage = await a.locator('.ed-stage').boundingBox(), brd = await a.locator('.ed-stage .board').boundingBox();
  assert.ok(brd.height > 600 && brd.y + brd.height <= 900, 'board uses the full height of the screen: ' + Math.round(brd.height));
  assert.ok(Math.abs(brd.width / brd.height - 390 / 844) < .01, 'portrait board keeps 390:844');
  // Read the title item back from what is rendered (its inline CSS variables).
  const title = () => a.evaluate(() => {
    const el = document.querySelector('.board .it[data-id=title]');
    if (!el) return undefined;
    const g = k => +el.style.getPropertyValue('--' + k);
    return { cx: g('cx'), cy: g('cy'), w: g('w'), fs: g('fs'), rot: g('rot') };
  });
  const box = sel => a.locator(sel).boundingBox();
  const drag = async (sel, dx, dy, opts = {}) => {
    const b = await box(sel); const x = b.x + b.width / 2, y = b.y + b.height / 2;
    if (opts.alt) await a.keyboard.down('Alt');
    await a.mouse.move(x, y); await a.mouse.down(); await a.mouse.move(x + dx, y + dy, { steps: 6 }); await a.mouse.up();
    if (opts.alt) await a.keyboard.up('Alt');
    await a.waitForTimeout(150);
  };
  // Move: a small nudge snaps back to the vertical centre line; Alt disables snapping.
  const bw = (await box('.ed-stage .board')).width;
  await drag('.board .it[data-id=title]', 3, 0);
  const raw = 50 + 3 / bw * 100, snapped = (await title()).cx;
  assert.ok(Math.abs(snapped - raw) > .1, `snaps to the nearest guide or edge (raw ${raw.toFixed(2)} -> ${snapped})`);
  await drag('.board .it[data-id=title]', 40, 0, { alt: true });
  const moved = await title();
  assert.ok(moved.cx > 55, 'Alt-drag moves freely: ' + moved.cx);
  // Resize right edge: wider, centre shifts right by half the growth.
  const w0 = moved.w;
  await drag('.ed-sel b[data-h=e]', 30, 0);
  const rs = await title();
  assert.ok(rs.w > w0 + 10 && rs.cx > moved.cx, 'edge resize widens and shifts centre');
  // Corner scales the font size.
  const fs0 = rs.fs;
  await drag('.ed-sel b[data-h=se]', 40, 40);
  assert.ok((await title()).fs > fs0, 'corner scales text');
  // Rotate: drag the knob to the right of the centre -> ~90°, snapped exactly.
  const it = await box('.board .it[data-id=title]'), knob = await box('.ed-sel b[data-h=rot]');
  await a.mouse.move(knob.x + 7, knob.y + 7); await a.mouse.down();
  await a.mouse.move(it.x + it.width / 2 + 200, it.y + it.height / 2 + 1, { steps: 8 }); await a.mouse.up();
  assert.equal((await title()).rot, 90, 'rotation snaps to 90°');
  // Modular scale chip (golden): 16·φ² = 41.9.
  await a.click('.ed-props [data-fs="41.9"]');
  assert.equal((await title()).fs, 41.9, 'scale chip sets size');
  // Undo / redo / delete via keyboard.
  await a.locator('.board').focus();
  await a.keyboard.press('Control+z'); assert.notEqual((await title()).fs, 41.9, 'undo');
  await a.keyboard.press('Control+Shift+z'); assert.equal((await title()).fs, 41.9, 'redo');
  await a.keyboard.press('Delete'); assert.equal(await title(), undefined, 'delete');
  await a.keyboard.press('Control+z'); assert.ok(await title(), 'undo delete');
  // Free text with markup stays text.
  await a.selectOption('.ed-add', 'text');
  await a.fill('.ed-props [data-p=text]', '<img src=x onerror=alert(1)>Save the date');
  await a.locator('.ed-props [data-p=text]').blur();
  // Landscape: empty until generated from portrait.
  await a.click('[data-orient=landscape]');
  assert.ok(await a.isVisible('.ed-empty'), 'landscape empty state');
  await a.click('[data-act=from-portrait]');
  assert.equal(await a.locator('.board[data-o=landscape] .it').count(), 6, 'landscape generated from portrait');
  await a.screenshot({ path: OUT + '/designer.png' });
  // Save and render on real screens.
  await a.click('#apply'); await a.waitForSelector('#status:has-text("Đã lưu")');
  const saved = (await plain()).layout;
  assert.equal(saved.mode, 'free'); assert.equal(saved.portrait.items.length, 6); assert.equal(saved.landscape.items.length, 6);
  assert.equal((await plain()).to, 'Linh', 'designer save keeps the form fields');
  // Preview opens the invite with the current design.
  const [pop] = await Promise.all([a.waitForEvent('popup'), a.click('#preview')]);
  await pop.waitForSelector('body.ready'); assert.ok(await pop.locator('.board-wrap').count(), 'preview shows the free layout'); await pop.close();
  await a.close();
  // Form save afterwards keeps the designer's layout (each page owns its fields).
  const fm = await ctx.newPage(); await fm.goto(BASE + 'admin/'); await fm.waitForSelector('#status:has-text("Đã lưu")');
  await fm.fill('[name=to]', 'Linh2'); await fm.waitForSelector('#status:has-text("Chưa lưu")');
  await fm.click('#apply'); await fm.waitForSelector('#status:has-text("Đã lưu")');
  const merged = await plain();
  assert.equal(merged.to, 'Linh2'); assert.equal(merged.layout.portrait.items.length, 6, 'form save keeps the design');
  assert.equal(merged.layout.mode, 'free');
  await fm.fill('[name=to]', 'Linh'); await fm.click('#apply'); await fm.waitForSelector('#status:has-text("Đã lưu")');
  await fm.close();

  const show = async (w, h, o) => {
    const v = await ctx.newPage(); await v.setViewportSize({ width: w, height: h });
    v.on('pageerror', e => errors.push(`invite ${w}x${h}: ` + e.message));
    await v.goto(o ? BASE + '#' + o : INV); await v.waitForSelector('body.ready');
    if (await v.isVisible('#open')) await v.click('#open');
    await v.waitForTimeout(2600); return v;
  };
  // Phone portrait: portrait board fills the screen; title centre at (cx%, cy%) of the board.
  let v = await show(390, 844);
  assert.ok(await v.isVisible('.board[data-o=portrait]') && !(await v.isVisible('.board[data-o=landscape]')));
  const pb = await v.locator('.board[data-o=portrait]').boundingBox();
  assert.ok(Math.abs(pb.width - 390) < 1 && Math.abs(pb.height - 844) < 1, 'portrait board fills the phone');
  const t = saved.portrait.items.find(i => i.id === 'title'), tb = await v.locator('.board[data-o=portrait] .it[data-id=title]').boundingBox();
  assert.ok(Math.abs(tb.x + tb.width / 2 - t.cx / 100 * 390) < 2 && Math.abs(tb.y + tb.height / 2 - t.cy / 100 * 844) < 2, 'item centred at its saved position');
  assert.equal(await v.locator('.board img').count(), 0, 'free text markup is escaped');
  await v.screenshot({ path: OUT + '/free-phone.png' }); await v.close();
  // Laptop landscape: landscape board.
  v = await show(1280, 800);
  assert.ok(await v.isVisible('.board[data-o=landscape]') && !(await v.isVisible('.board[data-o=portrait]')), 'landscape design on laptop');
  await v.screenshot({ path: OUT + '/free-laptop.png' }); await v.close();
  // No landscape design: laptop shows the portrait board centred at 390:844.
  const p2 = await ctx.newPage(); await p2.goto(BASE); await p2.waitForSelector('body.ready');
  const h2 = await p2.evaluate(l => pack({ ...DEFAULT, intro: false, layout: { mode: 'free', portrait: l.portrait, landscape: null } }), saved); await p2.close();
  v = await show(1280, 800, h2);
  const fb = await v.locator('.board[data-o=portrait]').boundingBox();
  assert.ok(Math.abs(fb.width / fb.height - 390 / 844) < .01 && Math.abs(fb.x + fb.width / 2 - 640) < 2, 'portrait fallback centred at 390:844');
  await v.close();
}

// ---------- Privacy: without the key the invite shows nothing ----------
{
  const c2 = await browser.newContext(); await setup(c2); // fresh browser: no key in localStorage, not signed in
  const v = await c2.newPage(); v.on('pageerror', e => errors.push('locked: ' + e.message));
  await v.goto(INV); await v.waitForSelector('body.ready');
  assert.ok(await v.isVisible('.locked-msg'), 'no key -> locked message');
  assert.ok(!(await v.content()).includes('Linh'), 'no content without the key');
  await v.goto(INV + '#k=' + KEY); await v.reload(); await v.waitForSelector('.cover h1');
  assert.equal(await v.textContent('.cover h1'), 'Linh', 'link with #k= decrypts, no sign-in needed');
  await v.goto(BASE + '?i=nope#k=' + KEY); await v.reload(); await v.waitForSelector('body.ready');
  assert.ok((await v.textContent('.locked-msg h1')).includes('Không mở được'), 'unknown invite -> not found message');
  await v.goto(BASE); await v.reload(); await v.waitForSelector('body.ready');
  assert.ok(await v.isVisible('footer a[href="admin/"]'), 'no invite id -> demo with "create your own" link');
  // Messenger / Zalo in-app browser: hint to open in the real browser.
  const ia = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/MessengerForiOS;FBAV/450.0]' });
  await setup(ia);
  await ia.route('https://script.google.com/**', r => r.fulfill({ status: 200, body: 'ok' }));
  const w = await ia.newPage(); await w.goto(INV + '#k=' + KEY); await w.waitForSelector('#open'); await w.click('#open');
  await w.locator('#rsvp').scrollIntoViewIfNeeded(); await w.waitForTimeout(1500); await w.click('#yes');
  assert.ok(await w.isVisible('.inapp'), 'in-app browser hint shown');
  await c2.close(); await ia.close();
}

// ---------- Link preview (Open Graph) ----------
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const k of ['og:title', 'og:description', 'og:image']) assert.ok(html.includes(`property="${k}"`), k);
  const og = fs.readFileSync(path.join(ROOT, 'og.jpg'));
  assert.ok(og[0] === 0xFF && og[1] === 0xD8, 'og.jpg is a JPEG');
}

// ---------- Designer P2: shapes, presets, encrypted photo ----------
{
  const a = await ctx.newPage(); await a.setViewportSize({ width: 1440, height: 900 });
  a.on('pageerror', e => errors.push('designer2: ' + e.message)); a.on('dialog', d => d.accept());
  await a.goto(BASE + 'admin/design/?i=' + ID); await a.waitForSelector('.ed-stage .board .it');
  for (const [k, n] of [['classic', 6], ['editorial', 6], ['golden', 7]]) {
    await a.selectOption('.ed-preset', k);
    assert.equal(await a.locator('.board .it').count(), n, 'preset ' + k);
  }
  assert.equal(await a.locator('.board .it-shape .sh.frame').count(), 1, 'golden preset has a frame');
  await a.selectOption('.ed-add', 'shape:circle');
  assert.equal(await a.locator('.board .sh.circle').count(), 1, 'circle added');
  assert.equal(await a.locator('.ed-sel b[data-h]').count(), 5, 'circle: 4 corners + rotate');
  await a.selectOption('.ed-add', 'shape:line');
  assert.equal(await a.locator('.ed-sel b[data-h]').count(), 3, 'line: 2 sides + rotate');
  // Photo item: uploaded encrypted, rendered decrypted.
  const [chooser] = await Promise.all([a.waitForEvent('filechooser'), a.selectOption('.ed-add', 'image')]);
  await chooser.setFiles({ name: 'p.png', mimeType: 'image/png', buffer: png });
  await a.waitForFunction(() => document.querySelector('.board .it-image img')?.src.startsWith('blob:'));
  assert.ok(await a.evaluate(() => document.querySelector('.board .it-image img').naturalWidth) > 0, 'decrypted photo renders');
  assert.equal(await a.locator('.ed-sel b[data-h]').count(), 9, 'photo: 8 handles + rotate');
  // Bottom handle changes height only.
  const hb = await a.locator('.ed-sel b[data-h=s]').boundingBox(), h0 = await a.evaluate(() => +document.querySelector('.board .it-image').style.getPropertyValue('--h'));
  await a.mouse.move(hb.x + 5, hb.y + 3); await a.mouse.down(); await a.mouse.move(hb.x + 5, hb.y + 43, { steps: 5 }); await a.mouse.up();
  assert.ok(await a.evaluate(() => +document.querySelector('.board .it-image').style.getPropertyValue('--h')) > h0, 'bottom handle grows height');
  await a.click('#apply'); await a.waitForSelector('#status:has-text("Đã lưu")');
  const lay = (await plain()).layout.portrait.items;
  assert.ok(lay.some(i => i.type === 'image' && /^fs:[\w-]+$/.test(i.src)), 'photo saved as encrypted Firestore reference');
  await a.close();
  // The invite renders the photo (decrypted) and the shapes.
  const v = await ctx.newPage(); await v.setViewportSize({ width: 390, height: 844 });
  await v.goto(INV); await v.waitForSelector('body.ready'); await v.click('#open'); await v.waitForTimeout(2500);
  assert.ok(await v.evaluate(() => document.querySelector('.board .it-image img')?.src.startsWith('blob:')), 'invite decrypts the photo');
  assert.ok(await v.locator('.board .sh.frame').count(), 'invite draws the frame');
  await v.screenshot({ path: OUT + '/p2-phone.png' }); await v.close();
}

// ---------- Layout styles (STYLES) ----------
{
  // Admin: picking a style resets the title font to "Theo kiểu thiệp" and is saved.
  const a = await ctx.newPage(); await a.setViewportSize({ width: 1440, height: 900 });
  a.on('pageerror', e => errors.push('admin-style: ' + e.message));
  await a.goto(BASE + 'admin/'); await a.waitForSelector('#status:has-text("Đã lưu")');
  assert.equal(await a.locator('[name=style]').count(), Object.keys(await a.evaluate(() => STYLES)).length, 'one tile per style');
  await a.check('[name=font][value=lora]', { force: true });
  await a.check('[name=style][value=vintage]', { force: true });
  assert.ok(await a.isChecked('[name=font][value=auto]'), 'new style -> font follows the style');
  await a.click('#apply'); await a.waitForSelector('#status:has-text("Đã lưu")');
  const sv = await plain();
  assert.deepEqual([sv.style, sv.font], ['vintage', 'auto']);
  await a.close();

  const v = await ctx.newPage();
  v.on('pageerror', e => errors.push('style: ' + e.message));
  await v.goto(BASE); await v.waitForSelector('body.ready');
  const open = async c => {
    const h = await v.evaluate(c => pack(c), c);
    await v.goto('about:blank'); // fresh load: a hash-only change keeps the "already opened" state
    await v.goto(BASE + '#' + h); await v.waitForSelector('body.ready');
    await v.waitForTimeout(1200);
  };
  // Old configs (no "style", explicit font) look exactly as before.
  await open({ font: 'cormorant' });
  assert.deepEqual(await v.evaluate(() => [document.documentElement.dataset.style, getComputedStyle(document.documentElement).getPropertyValue('--display').trim()]),
    ['minimal', '"Cormorant Garamond", serif'], 'no style -> minimal');
  for (const w of [320, 390]) for (const style of ['vintage', 'editorial', 'romance', 'playful', 'cute']) {
    await v.setViewportSize({ width: w, height: 700 });
    await open({ style, theme: 'blush', to: 'Nguyễn Thị Yến Nhi', title: 'Một buổi tối, chỉ hai chúng mình', date: DATE });
    const r = await v.evaluate(async () => {
      const cs = getComputedStyle(document.documentElement), fams = ['--display', '--body', '--script'].map(k => cs.getPropertyValue(k).split(',')[0].trim().replace(/"/g, ''));
      await document.fonts.ready;
      return { style: document.documentElement.dataset.style,
        // A real webfont face with the Vietnamese subset loaded for each family (not a system fallback).
        fonts: fams.filter(f => ![...document.fonts].some(ff => ff.family.replace(/"/g, '') === f && ff.status === 'loaded' && /1EA0/i.test(ff.unicodeRange))),
        overflow: document.documentElement.scrollWidth - innerWidth,
        coverHidden: [...document.querySelectorAll('#cover [data-r]')].filter(e => !e.classList.contains('in')).length,
        drawn: [...document.querySelectorAll('#cover .in svg .draw')].every(p => getComputedStyle(p).animationName === 'draw') };
    });
    assert.equal(r.style, style);
    assert.deepEqual(r.fonts, [], `${style}: Vietnamese webfonts loaded`);
    assert.ok(r.overflow <= 0, `${style} @${w}: no horizontal scroll`);
    assert.equal(r.coverHidden, 0, `${style}: every cover element revealed`);
    assert.ok(r.drawn, `${style}: ornaments draw in`);
    await v.click('#open'); await v.waitForTimeout(400);
    for (let y = 0; y < 5000; y += 500) { await v.mouse.wheel(0, 500); await v.waitForTimeout(80); }
    await v.waitForTimeout(400);
    assert.ok(await v.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${style} @${w}: page has no horizontal scroll`);
    if (w === 390) await v.screenshot({ path: `${OUT}/style-${style}.png`, fullPage: true });
  }
  // Effects: confetti on accept (playful); nothing with reduced motion; petals only for romance.
  await v.setViewportSize({ width: 390, height: 844 });
  await open({ style: 'playful', intro: false, date: DATE });
  await v.locator('#yes').scrollIntoViewIfNeeded(); await v.click('#yes');
  assert.ok(await v.locator('.sfx.confetti').count() > 0, 'playful: confetti on accept');
  await open({ style: 'romance', intro: false });
  assert.ok(await v.locator('.amb .petal').count() > 0, 'romance: falling petals');
  await open({ style: 'minimal', intro: false });
  assert.equal(await v.locator('.amb').count(), 0, 'petals removed when the style changes');
  await v.emulateMedia({ reducedMotion: 'reduce' });
  await open({ style: 'romance', intro: false, date: DATE });
  assert.equal(await v.locator('.amb').count(), 0, 'reduced motion: no petals');
  await v.locator('#yes').scrollIntoViewIfNeeded(); await v.click('#yes');
  assert.equal(await v.locator('.sfx').count(), 0, 'reduced motion: no particles');
  await v.close();
}

// ---------- Clean unused photos ----------
{
  const orphan = await page.evaluate(async id => putPhoto(await seal(userKeys[id], new Uint8Array([1, 2, 3])), id), ID);
  const a = await ctx.newPage(); a.on('dialog', d => d.accept());
  await a.goto(BASE + 'admin/?i=' + ID); await a.waitForSelector('#status:has-text("Đã lưu")');
  await a.click('#clean'); await a.waitForTimeout(1500);
  assert.equal(await fsGet(`/invites/${ID}/photos/${orphan.slice(3)}`), null, 'orphan photo deleted');
  const used = JSON.stringify(await plain());
  for (const pid of used.match(/fs:[\w-]+/g)) assert.ok(await fsGet(`/invites/${ID}/photos/${pid.slice(3)}`), 'never deletes a photo the invite uses');
  await a.close();
}

// ---------- Accounts: separation, several invites, import of the old GitHub invite ----------
{
  // Old invite (config.json in the repo, encrypted with LK) + one encrypted and one plain photo in uploads/.
  const LK = await page.evaluate(() => newKey());
  const rawEnc = 'https://raw.githubusercontent.com/o/r/abc/uploads/1.bin', rawPlain = 'https://raw.githubusercontent.com/o/r/abc/uploads/2.webp';
  legacyPhotos.set(rawEnc, Buffer.from(await page.evaluate(async k => [...await seal(k, new TextEncoder().encode('old-photo-1'))], LK)));
  legacyPhotos.set(rawPlain, Buffer.from('old-photo-2'));
  legacy = await page.evaluate(([k, a, b]) => encryptConfig({ ...DEFAULT, to: 'Người cũ', bg: 'enc:' + a,
    layout: { mode: 'free', portrait: { items: [{ id: 'p', type: 'image', src: b, cx: 50, cy: 50, w: 100, h: 100 }] } } }, k), [LK, rawEnc, rawPlain]);

  { // Before the import, links already sent (…/#k=LK) still read the old config.json.
    const c5 = await browser.newContext(); await setup(c5);
    const o = await c5.newPage(); await o.goto(BASE + '#k=' + LK); await o.waitForSelector('.cover h1');
    assert.equal(await o.textContent('.cover h1'), 'Người cũ', 'old link works before the import');
    await c5.close();
  }
  // A second account: starts empty, sees none of owner-1's invites, is offered the import (old link pasted).
  const c3 = await browser.newContext(); await setup(c3);
  const b = await c3.newPage(); b.on('pageerror', e => errors.push('account2: ' + e.message));
  b.on('dialog', d => d.accept());
  await b.goto(BASE + 'admin/?i=' + ID); await b.waitForSelector('#gate #google');
  await signIn(b, 'owner-2', 'me@example.com');
  await b.waitForSelector('#dlgKey[open]');                       // no saved key in this browser -> paste the old link
  await b.fill('#keyf [name=key]', BASE + '#k=' + LK); await b.click('#keyf button[value=ok]');
  await b.waitForSelector('#status:has-text("Đã lưu")');
  const ID2 = new URL(b.url()).searchParams.get('i');
  assert.notEqual(ID2, ID, "another account never opens someone else's invite");
  assert.equal(await b.locator('#inv option').count(), 1, 'only own invites listed');
  const imp = await b.evaluate(() => fetchConfig());
  assert.equal(imp.to, 'Người cũ', 'old invite imported');
  assert.match(imp.bg, /^fs:/); assert.match(imp.layout.portrait.items[0].src, /^fs:/, 'old photos moved to Firestore');
  assert.equal(await b.evaluate(id => userKeys[id], ID2), LK, 'import keeps the old key');
  const p1 = await fsGet(`/invites/${ID2}/photos/${imp.bg.slice(3)}`), p2 = await fsGet(`/invites/${ID2}/photos/${imp.layout.portrait.items[0].src.slice(3)}`);
  const dec = await b.evaluate(([x, y, k]) => Promise.all([x, y].map(async s => new TextDecoder().decode(await unseal(k, Uint8Array.from(atob(s), c => c.charCodeAt(0)))))),
    [p1.fields.data.bytesValue, p2.fields.data.bytesValue, LK]);
  assert.deepEqual(dec, ['old-photo-1', 'old-photo-2'], 'both old photos decrypt with the invite key');
  // Links already sent (…/#k=LK, no id) still open, in a fresh browser without sign-in.
  legacy = null;
  const c4 = await browser.newContext(); await setup(c4);
  const o = await c4.newPage(); await o.goto(BASE + '#k=' + LK); await o.waitForSelector('.cover h1');
  assert.equal(await o.textContent('.cover h1'), 'Người cũ', 'old link resolves through the alias');
  await c4.close();
  // Second invite, delete it.
  await b.click('#acct summary'); await b.click('#newInv'); await b.waitForURL(u => !u.href.includes(ID2)); await b.waitForSelector('#status:has-text("Đã lưu")');
  const ID3 = new URL(b.url()).searchParams.get('i');
  assert.equal(await b.locator('#inv option').count(), 2, 'two invites');
  await b.click('#acct summary'); await b.click('#delInv'); await b.waitForURL(u => !u.href.includes(ID3)); await b.waitForSelector('#status:has-text("Đã lưu")');
  assert.equal(await fsGet('/invites/' + ID3), null, 'deleted invite is gone');
  assert.equal(await b.locator('#inv option').count(), 1);
  // Sign out -> back to the sign-in screen.
  await b.click('#acct summary'); await b.click('#logout'); await b.waitForSelector('#gate #google');
  await c3.close();
}

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'all checks passed, no JS errors');
await browser.close(); srv.close();
if (errors.length) process.exit(1);
