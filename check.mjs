// Run: npm i --no-save playwright-core && node check.mjs   (uses installed Chrome)
// End-to-end check: admin edit -> Apply (GitHub API mocked) -> invite renders saved config.
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

// Fake GitHub contents API (one file in memory).
let stored = null, puts = 0, uploaded = null;
async function fakeGitHub(route) {
  const req = route.request();
  if (req.method() === 'PUT' && req.url().includes('/contents/uploads/')) {
    assert.equal(req.headers().authorization, 'Bearer test-token');
    uploaded = { path: req.url().split('/contents/')[1], bytes: Buffer.from(JSON.parse(req.postData()).content, 'base64') };
    return route.fulfill({ status: 201, json: { content: { path: uploaded.path }, commit: { sha: 'c0ffee' } } });
  }
  if (req.method() === 'PUT') {
    assert.equal(req.headers().authorization, 'Bearer test-token');
    const b = JSON.parse(req.postData()); puts++;
    stored = Buffer.from(b.content, 'base64').toString('utf8');
    return route.fulfill({ status: 201, json: { content: { sha: 'sha' + puts } } });
  }
  if (!stored) return route.fulfill({ status: 404, json: {} });
  if (req.headers().accept?.includes('raw')) return route.fulfill({ status: 200, body: stored, contentType: 'application/json' });
  return route.fulfill({ status: 200, json: { sha: 'sha' + puts, content: Buffer.from(stored).toString('base64') } });
}

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext();
await ctx.route('https://api.github.com/**', fakeGitHub);
// On localhost there is no repo in the URL, so the invite falls back to ./config.json: serve the saved file there.
await ctx.route(BASE + 'config.json', r => stored ? r.fulfill({ status: 200, body: stored, contentType: 'application/json' }) : r.fulfill({ status: 404 }));
const errors = [];
const page = await ctx.newPage(); await page.setViewportSize({ width: 1440, height: 900 });
page.on('pageerror', e => errors.push('admin: ' + e.message));

await page.goto(BASE + 'admin');
await page.waitForSelector('#status:has-text("Đã lưu")');
assert.ok(page.url().endsWith('/admin/'), 'redirect to trailing slash, no hash in URL');
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

// Apply -> token dialog -> save
await page.click('#apply');
await page.fill('#ghf [name=repo]', 'owner/repo');
await page.fill('#ghf [name=token]', 'test-token');
await page.click('#ghf button[value=ok]');
await page.waitForSelector('#status:has-text("Đã lưu")');
assert.equal(puts, 1);
assert.equal(JSON.parse(stored).to, 'Linh');
assert.deepEqual([JSON.parse(stored).bg, JSON.parse(stored).bgBlur, JSON.parse(stored).bgDim], ['candles', 50, 60]);
assert.ok(await page.isDisabled('#apply'));

// Upload a background from the device: 3000x2000 PNG -> resized to <=2400px WebP, committed, URL pinned to commit sha.
const png = Buffer.from(await page.evaluate(() => {
  const c = Object.assign(document.createElement('canvas'), { width: 3000, height: 2000 }), g = c.getContext('2d');
  g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, 3000, 2000); g.fillStyle = '#c9a96e'; g.fillRect(800, 500, 1400, 1000);
  return c.toDataURL('image/png').split(',')[1];
}), 'base64');
await page.setInputFiles('#file', { name: 'photo.png', mimeType: 'image/png', buffer: png });
await page.waitForFunction(() => document.querySelector('[name=bgUrl]').value.includes('c0ffee'));
assert.match(uploaded.path, /^uploads\/\d+\.webp$/);
assert.ok(uploaded.bytes.length < png.length, 'compressed smaller than original');
const dims = await page.evaluate(async b64 => { const b = await createImageBitmap(await (await fetch('data:image/webp;base64,' + b64)).blob()); return [b.width, b.height]; }, uploaded.bytes.toString('base64'));
assert.deepEqual(dims, [2400, 1600], 'resized to 2400px long edge');
assert.equal(await page.inputValue('[name=bgUrl]'), `https://raw.githubusercontent.com/owner/repo/c0ffee/${uploaded.path}`);
assert.ok(await page.isChecked('[name=bg][value=custom]'));
assert.ok(await page.isVisible('#bgCustom'));
await page.waitForSelector('#status:has-text("Chưa lưu")');
console.log('upload:', uploaded.path, png.length, '->', uploaded.bytes.length, 'bytes');

// Invite reads the saved config (via API) at the short URL
const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 });
m.on('pageerror', e => errors.push('invite: ' + e.message));
await m.goto(BASE);
await m.waitForSelector('body.ready'); await m.waitForTimeout(1200);
assert.equal(await m.textContent('.cover h1'), 'Linh');
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
await m2.goto(BASE); await m2.waitForSelector('body.ready'); await m2.click('#open');
await m2.waitForTimeout(400); await m2.mouse.wheel(0, 5000); await m2.waitForTimeout(2500);
assert.ok(!(await m2.isVisible('#cue.show')), 'cue stays hidden at page end');
await m2.screenshot({ path: OUT + '/end.png' }); await m2.close();

assert.equal(await m.locator('.stop h3 script').count(), 0, 'XSS: no script element');
assert.match(await m.textContent('.stop h3'), /<script>/);
assert.equal(await m.locator('.done a.btn').count(), 0, 'javascript: link dropped');
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
const dl = m.waitForEvent('download'); await m.click('#ics');
assert.match(fs.readFileSync(await (await dl).path(), 'utf8'), new RegExp(`DTSTART:${YEAR}1224T193000`));
// Other decline modes, configured through the URL hash (same path the admin preview uses).
for (const mode of ['smoke', 'vanish']) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: 390, height: 844 });
  p.on('pageerror', e => errors.push(mode + ': ' + e.message));
  await p.goto(BASE + 'admin/'); await p.waitForSelector('#pv');
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
  const p = await ctx.newPage(); await p.goto(BASE + 'admin/'); await p.waitForSelector('#pv');
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
  assert.ok(await a.isVisible('#designLink a[href="design/"]'), 'designer link in free mode');
  assert.equal(await a.locator('.board').count(), 0, 'no designer embedded in the form page');
  await a.goto(BASE + 'admin/design'); await a.waitForSelector('.ed-stage .board .it');
  assert.ok(a.url().endsWith('/admin/design/'), 'designer page at /admin/design/');
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
  const saved = JSON.parse(stored).layout;
  assert.equal(saved.mode, 'free'); assert.equal(saved.portrait.items.length, 6); assert.equal(saved.landscape.items.length, 6);
  assert.equal(JSON.parse(stored).to, 'Linh', 'designer save keeps the form fields');
  // Preview opens the invite with the current design.
  const [pop] = await Promise.all([a.waitForEvent('popup'), a.click('#preview')]);
  await pop.waitForSelector('body.ready'); assert.ok(await pop.locator('.board-wrap').count(), 'preview shows the free layout'); await pop.close();
  await a.close();
  // Form save afterwards keeps the designer's layout (each page owns its fields).
  const fm = await ctx.newPage(); await fm.goto(BASE + 'admin/'); await fm.waitForSelector('#status:has-text("Đã lưu")');
  await fm.fill('[name=to]', 'Linh2'); await fm.waitForSelector('#status:has-text("Chưa lưu")');
  await fm.click('#apply'); await fm.waitForSelector('#status:has-text("Đã lưu")');
  const merged = JSON.parse(stored);
  assert.equal(merged.to, 'Linh2'); assert.equal(merged.layout.portrait.items.length, 6, 'form save keeps the design');
  assert.equal(merged.layout.mode, 'free');
  await fm.fill('[name=to]', 'Linh'); await fm.click('#apply'); await fm.waitForSelector('#status:has-text("Đã lưu")');
  await fm.close();

  const show = async (w, h, o) => {
    const v = await ctx.newPage(); await v.setViewportSize({ width: w, height: h });
    v.on('pageerror', e => errors.push(`invite ${w}x${h}: ` + e.message));
    await v.goto(BASE + (o ? '#' + o : '')); await v.waitForSelector('body.ready');
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
  const p2 = await ctx.newPage(); await p2.goto(BASE + 'admin/'); await p2.waitForSelector('#pv');
  const h2 = await p2.evaluate(l => pack({ ...DEFAULT, intro: false, layout: { mode: 'free', portrait: l.portrait, landscape: null } }), saved); await p2.close();
  v = await show(1280, 800, h2);
  const fb = await v.locator('.board[data-o=portrait]').boundingBox();
  assert.ok(Math.abs(fb.width / fb.height - 390 / 844) < .01 && Math.abs(fb.x + fb.width / 2 - 640) < 2, 'portrait fallback centred at 390:844');
  await v.close();
}

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'all checks passed, no JS errors');
await browser.close(); srv.close();
if (errors.length) process.exit(1);
