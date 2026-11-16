import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { chromium } from 'playwright-core';

// Run: npm i --no-save playwright-core && node check.mjs   (uses installed Chrome)
const ROOT = path.dirname((await import('node:url')).fileURLToPath(import.meta.url));
const OUT = (await import('node:os')).tmpdir();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let f = path.join(ROOT, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
}).listen(5178);

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
page.on('pageerror', e => errors.push('admin: ' + e.message));
page.on('console', m => m.type() === 'error' && errors.push('admin console: ' + m.text()));

// /admin without slash must redirect
await page.goto('http://localhost:5178/admin');
await page.waitForFunction(() => location.hash.length > 10);
assert.match(page.url(), /\/admin\/#/);

// edit fields -> preview updates
await page.fill('[name=to]', 'Linh');
await page.fill('[name=from]', 'Minh');
await page.fill('[name=date]', '2026-12-24T19:30');
await page.fill('#stops .stop:nth-child(1) [data-k=name]', 'Nhà hàng Sen <script>alert(1)</script>');
await page.fill('#stops .stop:nth-child(1) [data-k=address]', '12 Lý Thái Tổ, Hà Nội');
await page.fill('[name=reply]', 'javascript:alert(1)');
await page.check('[name=theme][value=noir]');
await page.waitForTimeout(1500);
await page.screenshot({ path: OUT + '/admin.png' });
const link = await page.getAttribute('#view', 'href');
console.log('link length:', link.length, link);

// Invite page (mobile)
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
m.on('pageerror', e => errors.push('invite: ' + e.message));
await m.goto(link.replace('localhost:5178/', 'localhost:5178/'));
await m.waitForSelector('body.ready');
await m.waitForTimeout(1500);
await m.screenshot({ path: OUT + '/1-cover.png' });
assert.equal(await m.textContent('.cover h1'), 'Linh');
await m.click('#open');
await m.waitForTimeout(1600);
await m.screenshot({ path: OUT + '/2-letter.png' });
// XSS check: name is rendered as text, reply javascript: dropped
assert.equal(await m.locator('.stop h3 script').count(), 0);
assert.match(await m.textContent('.stop h3'), /<script>/);
assert.equal(await m.locator('.done a.btn').count(), 0);
assert.match(await m.getAttribute('.dir', 'href'), /google\.com\/maps.*L%C3%BD/);
assert.equal(await m.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(15, 14, 13)');
for (const [i, sel] of [[3, '.when'], [4, '.stops'], [5, '#rsvp']]) {
  await m.locator(sel).scrollIntoViewIfNeeded(); await m.waitForTimeout(1800);
  await m.screenshot({ path: OUT + `/${i}.png` });
}
await m.click('#yes'); await m.waitForTimeout(2400);
await m.screenshot({ path: OUT + '/6-yes.png' });
const dl = m.waitForEvent('download'); await m.click('#ics');
const ics = fs.readFileSync(await (await dl).path(), 'utf8');
assert.match(ics, /DTSTART:20261224T193000/);
console.log(ics.split('\r\n').slice(4, 10).join('\n'));

// Countdown shows numbers
const cnt = await m.$$eval('#count b', b => b.map(x => x.textContent));
console.log('countdown', cnt);
assert.ok(cnt.some(v => v !== '00'));

// Perf: long tasks / layout shift
const perf = await m.evaluate(() => ({ cls: performance.getEntriesByType('layout-shift')?.reduce((a, e) => a + e.value, 0), dom: document.getElementsByTagName('*').length }));
console.log('perf', perf);

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no JS errors');
await browser.close(); srv.close();
