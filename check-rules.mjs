// Firestore security rules check against the local emulator (no real project needed).
// Run:  npx firebase-tools@13.35.1 emulators:exec --project demo-invite "node check-rules.mjs"
// (firebase-tools 13 runs on Java 11+.)
import assert from 'node:assert';

const P = 'demo-invite', DB = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`;
const AUTH = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1`;

// Emulator Google sign-in: a fake id_token is accepted by the Auth emulator.
async function signIn(sub, email) {
  const r = await fetch(`${AUTH}/accounts:signInWithIdp?key=fake`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true,
      postBody: `id_token=${encodeURIComponent(JSON.stringify({ sub, email, email_verified: true }))}&providerId=google.com` }) });
  const j = await r.json(); assert.ok(j.idToken, JSON.stringify(j));
  return { uid: j.localId, token: j.idToken };
}
const req = (method, path, { token, body, qs = '' } = {}) => fetch(`${DB}/${path}${qs}`, { method,
  headers: { 'content-type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) });
const inviteDoc = (owner, extra = {}) => ({ fields: { owner: { stringValue: owner }, enc: { stringValue: 'x'.repeat(100) },
  v: { integerValue: '1' }, updated: { timestampValue: new Date().toISOString() }, ...extra } });
const ok = async (p, msg) => { const r = await p; if (!r.ok) assert.fail(`${msg}: expected allow, got ${r.status} ${await r.text()}`); return r; };
const no = async (p, msg) => { const r = await p; assert.equal(r.status, 403, `${msg}: expected 403, got ${r.status}`); };

const a = await signIn('alice-' + Date.now(), 'alice@example.com'), b = await signIn('bob-' + Date.now(), 'bob@example.com');
const id = 'inv' + Date.now();

// Invites
await no(req('PATCH', `invites/${id}`, { body: inviteDoc(a.uid) }), 'anonymous create');
await no(req('PATCH', `invites/${id}`, { token: b.token, body: inviteDoc(a.uid) }), 'create for someone else');
await no(req('PATCH', `invites/${id}`, { token: a.token, body: inviteDoc(a.uid, { extra: { stringValue: 'x' } }) }), 'unknown field');
await no(req('PATCH', `invites/${id}`, { token: a.token, body: inviteDoc(a.uid, { enc: { stringValue: 'x'.repeat(400001) } }) }), 'oversized');
await ok(req('PATCH', `invites/${id}`, { token: a.token, body: inviteDoc(a.uid), qs: '?currentDocument.exists=false' }), 'owner create');
await ok(req('GET', `invites/${id}`), 'anonymous get (link)');
await no(req('PATCH', `invites/${id}`, { token: b.token, body: inviteDoc(b.uid) }), 'other user takes over');
await no(req('DELETE', `invites/${id}`, { token: b.token }), 'other user delete');
await ok(req('PATCH', `invites/${id}`, { token: a.token, body: inviteDoc(a.uid) }), 'owner update');

// "My invites" query: only with owner filter = me.
const q = (token, owner) => fetch(`${DB}:runQuery`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + token },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'invites' }],
    ...(owner && { where: { fieldFilter: { field: { fieldPath: 'owner' }, op: 'EQUAL', value: { stringValue: owner } } } }) } }) });
const mine = await (await ok(q(a.token, a.uid), 'list own')).json();
assert.ok(mine.some(x => x.document?.name.endsWith(id)), 'own invite listed');
await no(q(b.token, a.uid), 'list someone else');
await no(q(a.token), 'list everything');

// Photos
const photo = (owner, n) => ({ fields: { owner: { stringValue: owner }, data: { bytesValue: Buffer.alloc(n, 7).toString('base64') } } });
await no(req('PATCH', `invites/${id}/photos/p1`, { token: b.token, body: photo(b.uid, 10) }), 'photo into someone else\'s invite');
await no(req('PATCH', `invites/${id}/photos/p1`, { token: a.token, body: photo(a.uid, 1000001) }), 'photo too big');
await ok(req('PATCH', `invites/${id}/photos/p1`, { token: a.token, body: photo(a.uid, 900000) }), 'owner photo');
const pj = await (await ok(req('GET', `invites/${id}/photos/p1`), 'anonymous photo get')).json();
assert.equal(Buffer.from(pj.fields.data.bytesValue, 'base64').length, 900000, 'bytes round-trip');
await no(req('PATCH', `invites/${id}/photos/p1`, { token: a.token, body: photo(a.uid, 10) }), 'photos are immutable');
await no(req('DELETE', `invites/${id}/photos/p1`, { token: b.token }), 'other user deletes photo');

// Aliases (old links)
const alias = (owner, invite) => ({ fields: { owner: { stringValue: owner }, invite: { stringValue: invite } } });
await no(req('PATCH', `aliases/h1`, { token: b.token, body: alias(b.uid, id) }), 'alias to someone else\'s invite');
await ok(req('PATCH', `aliases/h1`, { token: a.token, body: alias(a.uid, id) }), 'owner alias');
await ok(req('GET', `aliases/h1`), 'anonymous alias get');
const qa = (token, owner) => fetch(`${DB}:runQuery`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + token },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'aliases' }], where: { fieldFilter: { field: { fieldPath: 'owner' }, op: 'EQUAL', value: { stringValue: owner } } } } }) });
await ok(qa(a.token, a.uid), 'list own aliases');
await no(qa(b.token, a.uid), "list someone else's aliases");

// Users (keys)
await ok(req('PATCH', `users/${a.uid}`, { token: a.token, body: { fields: { keys: { mapValue: { fields: { [id]: { stringValue: 'k' } } } } } } }), 'own keys');
await no(req('GET', `users/${a.uid}`, { token: b.token }), 'read someone else\'s keys');
await no(req('GET', `users/${a.uid}`), 'anonymous keys');

await ok(req('DELETE', `invites/${id}/photos/p1`, { token: a.token }), 'owner deletes photo');
await ok(req('DELETE', `invites/${id}`, { token: a.token }), 'owner deletes invite');
console.log('rules: all checks passed');
