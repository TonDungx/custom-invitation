// Shared by /admin (form) and /admin/design (designer): GitHub storage, token dialog, toast, status.
// Each page owns part of config.json: the designer writes layout.portrait/landscape, the form writes the
// rest (incl. layout.mode). saveConfig() always merges into the LATEST remote file, so saving one page
// never wipes changes saved from the other.

const GH_KEY = 'invite-gh';
let gh = {}; try { gh = JSON.parse(localStorage.getItem(GH_KEY)) || {}; } catch {}
gh.repo ||= repoFromLocation();

const ghApi = path => `https://api.github.com/repos/${gh.repo}/contents/${path}`;
const authH = () => ({ Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json' });
const toB64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const fromB64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
const hasToken = () => !!(gh.token && gh.repo);

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

// Token dialog (created on first use).
function askToken() {
  let d = document.getElementById('dlg');
  if (!d) {
    d = document.body.appendChild(document.createElement('dialog'));
    d.id = 'dlg';
    d.innerHTML = `<h2>Kết nối GitHub</h2>
      <p class="hint">Nút Áp dụng lưu nội dung vào <code>config.json</code> trong repo. Cần một token chỉ có quyền ghi vào repo này.</p>
      <ol>
        <li><a class="hint" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Tạo fine-grained token</a></li>
        <li>Repository access → Only select repositories → chọn repo bên dưới</li>
        <li>Permissions → Contents → Read and write</li>
      </ol>
      <form method="dialog" id="ghf">
        <label><span class="lbl">Repo (owner/name)</span><input name="repo" required pattern="[\\w.-]+/[\\w.-]+"></label>
        <label><span class="lbl">Token</span><input name="token" type="password" required autocomplete="off"><span class="hint">Chỉ lưu trong trình duyệt này.</span></label>
        <div class="row"><button class="btn ghost" value="cancel" formnovalidate>Huỷ</button><button class="btn solid" value="ok">Lưu</button></div>
      </form>`;
  }
  const fm = d.querySelector('#ghf');
  fm.repo.value = gh.repo || ''; fm.token.value = gh.token || '';
  d.showModal();
  return new Promise(ok => d.addEventListener('close', () => {
    if (d.returnValue !== 'ok') return ok(false);
    gh = { repo: fm.repo.value.trim(), token: fm.token.value.trim() };
    try { localStorage.setItem(GH_KEY, JSON.stringify(gh)); } catch {}
    ok(true);
  }, { once: true }));
}

// ---- Encryption key (see shared.js). Stored per browser; the share link carries it as #k=… ----
const setKey = k => { try { localStorage.setItem(KEY_LS, k); } catch {} };
// Absolute share link for the invite, with the key. base = relative path to the site root.
const shareLink = base => new URL(base, location.href).href + '#k=' + storedKey();

// Ask for the full invite link (or the bare key) when this browser doesn't have the key yet.
function askKey() {
  let d = document.getElementById('dlgKey');
  if (!d) {
    d = document.body.appendChild(document.createElement('dialog'));
    d.id = 'dlgKey';
    d.innerHTML = `<h2>Mở khoá thiệp</h2>
      <p class="hint">Nội dung thiệp đã được mã hoá. Dán <b>link thiệp đầy đủ</b> (có đoạn <code>#k=…</code>) mà bạn đã gửi đi, hoặc chỉ phần mã sau <code>k=</code>.</p>
      <form method="dialog" id="keyf">
        <label><span class="lbl">Link thiệp hoặc mã khoá</span><input name="key" required autocomplete="off"></label>
        <div class="row"><button class="btn ghost" value="cancel" formnovalidate>Huỷ</button><button class="btn solid" value="ok">Mở khoá</button></div>
      </form>`;
  }
  const fm = d.querySelector('#keyf'); fm.key.value = '';
  d.showModal();
  return new Promise(ok => d.addEventListener('close', () => {
    const k = fm.key.value.match(/(?:k=)?([\w-]{43})\s*$/)?.[1];
    if (d.returnValue !== 'ok' || !k) return ok(false);
    setKey(k); ok(true);
  }, { once: true }));
}

// Raw remote config.json ({ json, sha }) or null if it doesn't exist yet.
async function getRemote() {
  const g = await fetch(ghApi('config.json'), { headers: authH(), cache: 'no-store' });
  if (g.status === 404) return null;
  if (!g.ok) throw new Error(g.status);
  const j = await g.json();
  return { json: JSON.parse(fromB64(j.content)), sha: j.sha };
}

// Latest config, decrypted. With a token: authenticated API read (fresh, no CDN cache). Without: readConfig().
// Encrypted but no key in this browser -> asks for the link. Returns { locked: true } if the user gives up.
async function fetchConfig(localUrl) {
  for (;;) {
    let c;
    try {
      const rem = hasToken() ? await getRemote().catch(() => undefined) : undefined;
      c = rem === undefined ? await readConfig(localUrl) : { ...structuredClone(DEFAULT), ...(await openConfig(rem?.json)) };
    } catch (e) { if (!e.locked) throw e; c = { locked: true }; }
    if (!c.locked) { if (!storedKey()) setKey(newKey()); return c; } // plain/new config: start encrypting
    if (!(await askKey())) return { ...structuredClone(DEFAULT), locked: true };
  }
}

// GET latest -> decrypt -> mutate(remote) -> encrypt -> PUT with its sha. Retries once on a concurrent write.
// Returns the saved (plain) object, or null if the user cancelled. Throws on other errors.
async function saveConfig(mutate, message = 'chore: update invitation') {
  if (!hasToken() && !(await askToken())) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    let rem;
    try { rem = await getRemote(); }
    catch (e) {
      if (e.message !== '401' && e.message !== '403') throw e;
      toast('Token hoặc repo không đúng quyền. Kiểm tra lại.');
      return (await askToken()) ? saveConfig(mutate, message) : null;
    }
    let plain;
    try { plain = await openConfig(rem?.json); }
    catch { if (!(await askKey())) return null; attempt--; continue; } // wrong/missing key: ask, then retry
    if (!storedKey()) setKey(newKey());
    const next = mutate(plain);
    const body = JSON.stringify(await encryptConfig(next, storedKey()), null, 2) + '\n';
    const r = await fetch(ghApi('config.json'), { method: 'PUT', headers: authH(),
      body: JSON.stringify({ message, content: toB64(body), ...(rem && { sha: rem.sha }) }) });
    if (r.ok) return next;
    if (r.status === 409 || r.status === 422) continue;
    if (r.status === 401 || r.status === 403 || r.status === 404) {
      toast('Token hoặc repo không đúng quyền. Kiểm tra lại.');
      return (await askToken()) ? saveConfig(mutate, message) : null;
    }
    throw new Error(r.status);
  }
  throw new Error('xung đột, thử lại');
}

// ---- Photos: resize in the browser, encrypt, commit to uploads/. Returns "enc:https://raw…/<commit>/uploads/x.bin". ----
// The raw URL is pinned to the commit, so it works immediately (no Pages rebuild) and never changes.
async function compress(file) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * s), height: Math.round(bmp.height * s) });
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  const enc = type => new Promise(ok => c.toBlob(ok, type, .82));
  const b = await enc('image/webp');
  return b?.type === 'image/webp' ? b : enc('image/jpeg'); // older Safari can't encode WebP
}
const blobB64 = b => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.readAsDataURL(b); });
async function uploadImage(file) {
  if (!file?.type.startsWith('image/')) { toast('Chỉ nhận file ảnh.'); return null; }
  if (file.size > 25e6) { toast('Ảnh lớn quá (tối đa 25MB).'); return null; }
  if (!storedKey()) setKey(newKey());
  const sealed = new Blob([await seal(storedKey(), new Uint8Array(await (await compress(file)).arrayBuffer()))]);
  const path = `uploads/${Date.now()}.bin`;
  const commit = await putFile(path, await blobB64(sealed), 'chore: upload photo');
  if (!commit) return null;
  toast(`Đã tải ảnh (${Math.round(sealed.size / 1024)} KB, đã mã hoá). Bấm Áp dụng để dùng.`);
  return `enc:https://raw.githubusercontent.com/${gh.repo}/${commit}/${path}`;
}

// Commit any file (base64 content) and return the commit sha.
async function putFile(path, b64, message) {
  if (!hasToken() && !(await askToken())) return null;
  const r = await fetch(ghApi(path), { method: 'PUT', headers: authH(), body: JSON.stringify({ message, content: b64 }) });
  if (r.status === 401 || r.status === 403 || r.status === 404) {
    toast('Token hoặc repo không đúng quyền.');
    return (await askToken()) ? putFile(path, b64, message) : null;
  }
  if (!r.ok) throw new Error(r.status);
  return (await r.json()).commit.sha;
}
