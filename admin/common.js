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

// Latest config. With a token: authenticated API read (fresh, no CDN cache). Without: readConfig().
async function fetchConfig(localUrl) {
  if (hasToken()) {
    const r = await fetch(ghApi('config.json'), { headers: authH(), cache: 'no-store' }).catch(() => null);
    if (r?.ok) return { ...structuredClone(DEFAULT), ...JSON.parse(fromB64((await r.json()).content)) };
  }
  return readConfig(localUrl);
}

// GET latest -> mutate(remote) -> PUT with its sha. Retries once on a concurrent write (409/422).
// Returns the saved object, or null if the user cancelled the token dialog. Throws on other errors.
async function saveConfig(mutate, message = 'chore: update invitation') {
  if (!hasToken() && !(await askToken())) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const g = await fetch(ghApi('config.json'), { headers: authH(), cache: 'no-store' });
    const j = g.ok ? await g.json() : null;
    const next = mutate(j ? JSON.parse(fromB64(j.content)) : {});
    const r = await fetch(ghApi('config.json'), { method: 'PUT', headers: authH(),
      body: JSON.stringify({ message, content: toB64(JSON.stringify(next, null, 2) + '\n'), ...(j && { sha: j.sha }) }) });
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
