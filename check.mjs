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
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
}).listen(5178);
const BASE = 'http://localhost:5178/';

// Fake GitHub contents API (one file in memory).
let stored = null, puts = 0;
async function fakeGitHub(route) {
  const req = route.request();
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
await page.fill('[name=date]', '2026-12-24T19:30');
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
await m.click('#open'); await m.waitForTimeout(2800);
assert.ok(await m.isVisible('#cue.show'), 'scroll cue visible');
await m.screenshot({ path: OUT + '/2-letter.png' });
await m.mouse.wheel(0, 300); await m.waitForTimeout(800);
assert.ok(!(await m.isVisible('#cue.show')), 'scroll cue hides after scroll');
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
await m.click('#yes'); await m.waitForTimeout(2400);
const dl = m.waitForEvent('download'); await m.click('#ics');
assert.match(fs.readFileSync(await (await dl).path(), 'utf8'), /DTSTART:20261224T193000/);
const cnt = await m.$$eval('#count b', b => b.map(x => x.textContent));
assert.ok(cnt.some(v => v !== '00'), 'countdown ticking');

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'all checks passed, no JS errors');
await browser.close(); srv.close();
if (errors.length) process.exit(1);
