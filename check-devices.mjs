// Device emulation check (not a real phone): WebKit (Safari engine) + Chromium mobile, incl. in-app browser UAs.
// Run once:  npm i --no-save playwright-core && npx playwright-core install webkit
// Then:      npx firebase-tools@13.35.1 emulators:exec --only auth,firestore --project demo-invite "node check-devices.mjs"
//            (invites are seeded into the local Firestore emulator; screenshots go to $OUT or the OS temp dir)
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { webcrypto as wc } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, devices } from 'playwright-core';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT || os.tmpdir();
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.jpg': 'image/jpeg' };
const FB_CFG = "const FIREBASE = { apiKey: 'fake', authDomain: 'localhost', projectId: 'demo-invite', emulator: '127.0.0.1' };";
const srv = http.createServer((q, r) => {
  const p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (p === '/firebase-config.js') { r.writeHead(200, { 'content-type': 'text/javascript' }); return r.end(FB_CFG); }
  let f = path.join(ROOT, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
}).listen(5190);
const BASE = 'http://localhost:5190/';

// Same format as shared.js: AES-GCM, iv(12) ‖ ciphertext, base64url; key = 32 random bytes base64url.
const b64u = b => Buffer.from(b).toString('base64url');
const rawKey = wc.getRandomValues(new Uint8Array(32)), KEY = b64u(rawKey);
const aes = await wc.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
async function encrypt(obj) {
  const iv = wc.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await wc.subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify(obj))));
  return b64u(Buffer.concat([iv, ct]));
}
// Store an invite in the Firestore emulator as a signed-in (emulator) user, like the admin does. -> invite id
const DB = 'http://127.0.0.1:8080/v1/projects/demo-invite/databases/(default)/documents';
const sess = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', { method: 'POST',
  headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true,
    postBody: `id_token=${encodeURIComponent(JSON.stringify({ sub: 'devices', email: 'd@example.com' }))}&providerId=google.com` }) })).json();
async function seed(cfg) {
  const id = b64u(wc.getRandomValues(new Uint8Array(15)));
  const r = await fetch(`${DB}/invites/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + sess.idToken },
    body: JSON.stringify({ fields: { owner: { stringValue: sess.localId }, enc: { stringValue: await encrypt(cfg) }, v: { integerValue: '1' },
      updated: { timestampValue: new Date().toISOString() } } }) });
  assert.ok(r.ok, 'seed invite: ' + r.status);
  return id;
}

const date = `${new Date().getFullYear() + 1}-02-14T19:00`;
const base = { to: 'Linh', from: 'Minh', title: 'Một buổi tối, chỉ hai chúng mình', date, theme: 'noir', bg: 'candles', bgBlur: 30,
  stops: [{ time: '19:00', name: 'Nhà hàng Sen', note: 'Bữa tối', address: '12 Lý Thái Tổ', instagram: '@sen' }, { time: '21:00', name: 'Quán C', note: 'Cà phê' }],
  reply: 'https://m.me/example' };
const T = (field, cy, w, fs, o = {}) => ({ id: field, type: 'field', field, cx: 50, cy, w, fs, font: 'display', align: 'center', color: 'fg', ...o });
const free = { ...base, layout: { mode: 'free',
  portrait: { items: [T('greeting', 20, 320, 12, { font: 'body', caps: true, ls: .28, color: 'muted' }), T('title', 36, 330, 46),
    { id: 'f', type: 'shape', shape: 'frame', cx: 50, cy: 50, w: 342, h: 760, t: 1, color: 'accent' }, T('message', 56, 300, 16, { font: 'body' }), T('sign', 72, 300, 26, { italic: true })] },
  landscape: { items: [T('title', 40, 900, 64), T('sign', 70, 600, 32, { italic: true })] } } };

const MESSENGER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/460.0.0;FBBV/1;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBCR/;FBID/phone;FBLC/vi_VN;FBOP/5]';
const ZALO = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 Zalo android/12345 ZaloTheme/light ZaloLanguage/vi';
const runs = [
  ['iPhone 13 · Safari', webkit, devices['iPhone 13']],
  ['iPhone SE · Safari', webkit, devices['iPhone SE']],
  ['iPhone 13 · Messenger', webkit, { ...devices['iPhone 13'], userAgent: MESSENGER }, true],
  ['Pixel 7 · Chrome', chromium, devices['Pixel 7']],
  ['Pixel 7 · Zalo', chromium, { ...devices['Pixel 7'], userAgent: ZALO }, true],
  ['iPad Pro 11 ngang · Safari', webkit, devices['iPad Pro 11 landscape']],
];

const results = [];
for (const [layoutName, cfg] of [['mẫu', base], ['tự thiết kế', free]]) {
  const id = await seed(cfg);
  for (const [name, engine, dev, inApp] of runs) {
    const b = await engine.launch(engine === chromium ? { channel: 'chrome' } : {});
    const ctx = await b.newContext(dev), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    const tag = `${name} / ${layoutName}`, file = (name + '-' + layoutName).replace(/[^\w]+/g, '_');
    try {
      await p.goto(BASE + '?i=' + id + '#k=' + KEY); await p.waitForSelector('body.ready', { timeout: 15000 });
      assert.ok(!(await p.isVisible('.locked-msg')), 'decrypts with #k');
      await p.tap('#open'); await p.waitForTimeout(2600);
      const vw = await p.evaluate(() => innerWidth);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal scroll');
      if (cfg.layout) {
        const bd = await p.locator('.board:visible').boundingBox();
        assert.ok(bd && bd.height > 300, 'free board visible');
        const outside = await p.evaluate(() => [...document.querySelectorAll('.board .it')].filter(e => e.offsetParent).some(e => {
          const r = e.getBoundingClientRect(); return r.left < -2 || r.right > innerWidth + 2; }));
        assert.ok(!outside, 'free items stay within the screen width');
      }
      assert.ok(await p.evaluate(() => {
        const cue = document.querySelector('#cue.show');
        if (!cue) return true;
        const c = cue.getBoundingClientRect();
        return ![...document.querySelectorAll('#app section:first-of-type [data-r], #app .it-field, #app .it-text')].some(e => {
          const r = e.getBoundingClientRect(); return r.width && r.bottom > c.top && r.top < c.bottom && r.right > c.left && r.left < c.right; });
      }), 'scroll cue never covers text');
      await p.screenshot({ path: `${OUT}/dev-${file}-1.png` });
      await p.locator('#rsvp').scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
      const n0 = await p.locator('#no').boundingBox();
      await p.tap('#no'); await p.waitForTimeout(700);
      const n1 = await p.locator('#no').boundingBox();
      assert.ok(Math.hypot(n1.x - n0.x, n1.y - n0.y) > 80, 'decline dodges a tap');
      await p.tap('#yes'); await p.waitForTimeout(2300);
      assert.ok(await p.isVisible('.done'), 'accept works');
      assert.ok((await p.getAttribute('#gcal', 'href')).startsWith('https://calendar.google.com/'), 'Google Calendar link');
      assert.equal(await p.isVisible('.inapp'), !!inApp, 'in-app hint only inside apps');
      assert.ok(await p.evaluate(() => [...document.querySelectorAll('.actions .btn')].every(b => b.getBoundingClientRect().height < 60)), 'action buttons stay on one line');
      await p.screenshot({ path: `${OUT}/dev-${file}-2.png` });
      assert.deepEqual(errs, [], 'no JS errors');
      results.push(['OK  ', tag, `${vw}px`]);
    } catch (e) {
      results.push(['FAIL', tag, e.message.split('\n')[0]]);
      await p.screenshot({ path: `${OUT}/dev-${file}-fail.png` }).catch(() => {});
    }
    await b.close();
  }
}
srv.close();
for (const r of results) console.log(r.join('  '));
if (results.some(r => r[0] === 'FAIL')) process.exit(1);
