// Shared by /admin (form) and /admin/design (designer): Google sign-in (Firebase Auth), the user's invites in
// Firestore (REST, encrypted in the browser), photos, toast/status.
// Each page owns part of the config: the designer writes layout.portrait/landscape, the form writes the rest
// (incl. layout.mode). saveConfig() always merges into the LATEST stored invite, so saving one page never wipes
// changes saved from the other.

const FB_SDK = 'https://www.gstatic.com/firebasejs/12.6.0/'; // only Auth is loaded; data goes through REST
let fbAuth, fbA;      // Auth instance + module
let userKeys = {};    // invite id -> AES key (users/{uid}.keys, owner-only)

function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) el = Object.assign(document.body.appendChild(document.createElement('div')), { id: 'toast', className: 'toast', role: 'status' });
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el.t); el.t = setTimeout(() => el.classList.remove('show'), 2600);
}
function setStatus(text, cls = '') {
  const s = document.getElementById('status');
  s.className = 'status ' + cls; s.firstChild.textContent = text;
}

// ---- Account ----
const me = () => fbAuth?.currentUser || null;
const token = () => me().getIdToken();
const fs = async (method, path, opts = {}) => fsReq(method, path, { ...opts, token: await token() });

// Full-screen sign-in panel. Resolves once a user is signed in (also after a reload with a saved session).
async function requireUser() {
  if (!FIREBASE.projectId) { gate('setup'); return new Promise(() => {}); }
  const [{ initializeApp }, A] = await Promise.all([import(FB_SDK + 'firebase-app.js'), import(FB_SDK + 'firebase-auth.js')]);
  fbA = A;
  fbAuth = A.getAuth(initializeApp({ apiKey: FIREBASE.apiKey, authDomain: FIREBASE.authDomain, projectId: FIREBASE.projectId }));
  if (FIREBASE.emulator) {
    A.connectAuthEmulator(fbAuth, `http://${FIREBASE.emulator}:9099`, { disableWarnings: true });
    // Tests: sign in without the Google popup (the emulator accepts an unsigned id_token).
    window.__testSignIn = (sub, email) => A.signInWithCredential(fbAuth, A.GoogleAuthProvider.credential(JSON.stringify({ sub, email, email_verified: true })));
  }
  await fbAuth.authStateReady();
  if (!me()) {
    gate('login');
    await new Promise(ok => { const off = A.onAuthStateChanged(fbAuth, u => { if (u) { off(); ok(); } }); });
  }
  gate(null);
  userKeys = fsData(await fs('GET', '/users/' + me().uid))?.keys || {};
  A.onAuthStateChanged(fbAuth, u => { if (!u) location.reload(); }); // signed out in another tab
  return me();
}
function gate(kind) {
  let g = document.getElementById('gate');
  if (!kind) return g?.remove();
  g ??= Object.assign(document.body.appendChild(document.createElement('div')), { id: 'gate', className: 'gate' });
  g.innerHTML = kind === 'setup'
    ? `<div><h2>Chưa cấu hình Firebase</h2><p class="hint">Trang cần một project Firebase để có tài khoản và nơi lưu thiệp.
       Làm theo <a href="https://github.com/TonDungx/custom-invitation/blob/main/docs/firebase-setup.md" target="_blank" rel="noopener">hướng dẫn</a>
       rồi điền <code>firebase-config.js</code>.</p></div>`
    : `<div><h2>Thiệp mời</h2><p class="hint">Đăng nhập để tạo và quản lý thiệp của bạn. Nội dung được mã hoá trước khi lưu;
       người nhận mở link không cần tài khoản.</p><button class="btn solid" id="google" type="button">
       <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14zM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z"/></svg>
       Đăng nhập bằng Google</button></div>`;
  g.querySelector('#google')?.addEventListener('click', async () => {
    try { await fbA.signInWithPopup(fbAuth, new fbA.GoogleAuthProvider()); }
    catch (e) { if (!/popup-closed|cancelled-popup/.test(e.code)) toast('Không đăng nhập được (' + (e.code || e.message) + ').'); }
  });
}
const signOut = () => fbA.signOut(fbAuth);

// ---- Invites ----
const randomId = () => b64u.enc(crypto.getRandomValues(new Uint8Array(15))); // 20 chars, unguessable
const rememberKey = (id, k) => { userKeys[id] = k; try { localStorage.setItem(KEY_LS + ':' + id, k); } catch {} };
// users/{uid}.keys.<id> = k (or removes it when k is null). Written BEFORE the invite, so a saved invite always has its key.
const putUserKey = (id, k) => fs('PATCH', '/users/' + me().uid, {
  qs: `?updateMask.fieldPaths=${encodeURIComponent('`keys`.`' + id + '`')}`,
  body: k ? { fields: { keys: { mapValue: { fields: { [id]: { stringValue: k } } } } } } : { fields: {} } });
const inviteFields = (enc, owner) => ({ fields: { owner: { stringValue: owner }, enc: { stringValue: enc }, v: { integerValue: '1' },
  updated: { timestampValue: new Date().toISOString() } } });

// [{ id, cfg, updated }] newest first. Invites whose key is unknown on this account are listed as locked.
async function listInvites() {
  const rows = await fs('POST', ':runQuery', { body: { structuredQuery: { from: [{ collectionId: 'invites' }],
    where: { fieldFilter: { field: { fieldPath: 'owner' }, op: 'EQUAL', value: { stringValue: me().uid } } } } } });
  const out = [];
  for (const r of rows.filter(r => r.document)) {
    const id = fsId(r.document), d = fsData(r.document);
    let cfg; try { cfg = await openConfig(d, userKeys[id]); } catch { cfg = { locked: true }; }
    out.push({ id, cfg, updated: d.updated });
  }
  return out.sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
}
async function createInvite(cfg = {}, k = newKey()) {
  const id = randomId();
  await putUserKey(id, k);
  rememberKey(id, k);
  await fs('PATCH', '/invites/' + id, { qs: '?currentDocument.exists=false', body: inviteFields((await encryptConfig(cfg, k)).enc, me().uid) });
  return id;
}
async function deleteInvite(id) {
  const q = (coll, parent = '') => fs('POST', parent + ':runQuery', { body: { structuredQuery: { from: [{ collectionId: coll }],
    where: { fieldFilter: { field: { fieldPath: 'owner' }, op: 'EQUAL', value: { stringValue: me().uid } } } } } });
  for (const r of await q('photos', '/invites/' + id)) if (r.document) await fs('DELETE', '/invites/' + id + '/photos/' + fsId(r.document));
  for (const r of await q('aliases')) if (r.document && fsData(r.document).invite === id) await fs('DELETE', '/aliases/' + fsId(r.document));
  await fs('DELETE', '/invites/' + id);
  await putUserKey(id, null);
  delete userKeys[id];
}

// Current invite (INVITE_ID), decrypted. { locked: true } if this account has no key for it.
async function fetchConfig() {
  const d = fsData(await fs('GET', '/invites/' + INVITE_ID));
  if (!d) return { ...structuredClone(DEFAULT), missing: true };
  try { return { ...structuredClone(DEFAULT), ...(await openConfig(d, userKeys[INVITE_ID])) }; }
  catch { return { ...structuredClone(DEFAULT), locked: true }; }
}
// GET latest -> decrypt -> mutate(latest) -> encrypt -> PATCH only if nobody wrote in between (updateTime precondition).
// Returns the saved (plain) object. Throws on errors.
async function saveConfig(mutate) {
  const k = userKeys[INVITE_ID];
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await fs('GET', '/invites/' + INVITE_ID);
    if (!doc) throw new Error('thiệp đã bị xoá');
    const next = mutate(await openConfig(fsData(doc), k));
    try { // :commit, not PATCH ?currentDocument.updateTime= (the emulator ignored that query precondition)
      await fs('POST', ':commit', { body: { writes: [{ update: { name: doc.name, ...inviteFields((await encryptConfig(next, k)).enc, me().uid) },
        currentDocument: { updateTime: doc.updateTime } }] } });
      return next;
    } catch (e) { if (e.status !== 400 && e.status !== 409) throw e; } // written meanwhile: merge again
  }
  throw new Error('xung đột, thử lại');
}

// Absolute share link: <site>/?i=<id>#k=<key>. base = relative path from this page to the site root.
const shareLink = (base, id = INVITE_ID) => new URL(base, location.href).href.replace(/[?#].*$/, '') + '?i=' + id + '#k=' + (userKeys[id] || '');

// ---- Photos: resized in the browser, encrypted, stored as bytes in invites/{id}/photos (< 1 MB per doc). ----
async function compress(file, max = 2400, q = .82) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * s), height: Math.round(bmp.height * s) });
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  const enc = type => new Promise(ok => c.toBlob(ok, type, q));
  const b = await enc('image/webp');
  return b?.type === 'image/webp' ? b : enc('image/jpeg'); // older Safari can't encode WebP
}
const PHOTO_MAX = 990000;
// Bytes (already encrypted with the invite key) -> "fs:<photoId>".
async function putPhoto(sealed, id = INVITE_ID) {
  const pid = randomId();
  await fs('PATCH', `/invites/${id}/photos/${pid}`, { qs: '?currentDocument.exists=false', body: { fields: {
    owner: { stringValue: me().uid }, data: { bytesValue: btoa(Array.from(sealed, c => String.fromCharCode(c)).join('')) } } } });
  return 'fs:' + pid;
}
async function uploadImage(file) {
  if (!file?.type.startsWith('image/')) { toast('Chỉ nhận file ảnh.'); return null; }
  if (file.size > 25e6) { toast('Ảnh lớn quá (tối đa 25MB).'); return null; }
  let sealed;
  for (const [max, q] of [[2400, .82], [1800, .78], [1400, .72], [1000, .7]]) { // shrink until it fits one document
    sealed = await seal(userKeys[INVITE_ID], new Uint8Array(await (await compress(file, max, q)).arrayBuffer()));
    if (sealed.length < PHOTO_MAX) break;
  }
  if (sealed.length >= PHOTO_MAX) { toast('Ảnh quá chi tiết, không nén đủ nhỏ. Thử ảnh khác.'); return null; }
  const src = await putPhoto(sealed);
  toast(`Đã tải ảnh (${Math.round(sealed.length / 1024)} KB, đã mã hoá). Bấm Áp dụng để dùng.`);
  return src;
}
// Photos of the current invite not referenced by any of the given configs -> deleted. Returns [deleted, total].
async function cleanPhotos(...cfgs) {
  const rows = await fs('POST', `/invites/${INVITE_ID}:runQuery`, { body: { structuredQuery: { from: [{ collectionId: 'photos' }],
    where: { fieldFilter: { field: { fieldPath: 'owner' }, op: 'EQUAL', value: { stringValue: me().uid } } } } } });
  const ids = rows.filter(r => r.document).map(r => fsId(r.document)), used = JSON.stringify(cfgs);
  const unused = ids.filter(p => !used.includes('fs:' + p));
  for (const p of unused) await fs('DELETE', `/invites/${INVITE_ID}/photos/${p}`);
  return [unused.length, ids.length];
}

// ---- Import the invite saved before accounts (config.json + uploads/ in the GitHub repo) ----
// Keeps the same key, so links already sent (…/#k=KEY) keep working through aliases/{sha256(KEY)}.
const legacyConfig = () => legacyJson(location.href.replace(/admin\/.*$/, ''));
async function importLegacy(json, k) {
  const cfg = await openConfig(json, k); // throws { locked } on a wrong key
  k = json.enc ? k : newKey();
  const id = await createInvite({}, k);
  INVITE_ID = id;
  // Every old photo (encrypted .bin or plain .webp in the repo) -> re-stored as an encrypted Firestore photo.
  const map = new Map();
  for (const src of new Set(JSON.stringify(cfg).match(/(?:enc:)?https:\/\/raw\.githubusercontent\.com\/[^"]+?\/uploads\/[\w.-]+/g) || [])) {
    const bytes = new Uint8Array(await (await fetch(src.replace(/^enc:/, ''))).arrayBuffer());
    map.set(src, await putPhoto(src.startsWith('enc:') ? bytes : await seal(k, bytes), id));
  }
  const moved = JSON.parse(JSON.stringify(cfg).replace(/(?:enc:)?https:\/\/raw\.githubusercontent\.com\/[^"]+?\/uploads\/[\w.-]+/g, s => map.get(s)));
  await saveConfig(() => moved);
  await fs('PATCH', '/aliases/' + await sha256hex(k), { body: { fields: { owner: { stringValue: me().uid }, invite: { stringValue: id } } } });
  return id;
}

// Ask for the old invite link (or the bare key) when this browser doesn't have it.
function askKey() {
  let d = document.getElementById('dlgKey');
  if (!d) {
    d = document.body.appendChild(document.createElement('dialog'));
    d.id = 'dlgKey';
    d.innerHTML = `<h2>Mở khoá thiệp cũ</h2>
      <p class="hint">Thiệp cũ đã được mã hoá. Dán <b>link thiệp cũ đầy đủ</b> (có đoạn <code>#k=…</code>), hoặc chỉ phần mã sau <code>k=</code>.</p>
      <form method="dialog" id="keyf">
        <label><span class="lbl">Link thiệp hoặc mã khoá</span><input name="key" required autocomplete="off"></label>
        <div class="row"><button class="btn ghost" value="cancel" formnovalidate>Huỷ</button><button class="btn solid" value="ok">Mở khoá</button></div>
      </form>`;
  }
  const fm = d.querySelector('#keyf'); fm.key.value = '';
  d.showModal();
  return new Promise(ok => d.addEventListener('close', () => {
    ok(d.returnValue === 'ok' ? fm.key.value.match(/(?:k=)?([\w-]{43})\s*$/)?.[1] || '' : '');
  }, { once: true }));
}
