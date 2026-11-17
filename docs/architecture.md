# Kiến trúc

## 1. Tổng quan

```
  GitHub Pages (code, công khai)                 Firebase (project của chủ site)
  index.html  admin/  shared.js  styles.*        ┌ Auth: đăng nhập Google (chỉ admin)
  firebase-config.js (định danh, công khai)      └ Firestore (firestore.rules):
                                                     invites/{id}          { owner, enc }      ← bản mã
  ┌────────── /admin (đã đăng nhập) ─────────┐       invites/{id}/photos   { owner, data }     ← bản mã
  │ form → mã hoá → :commit invites/{id} ────┼─────► users/{uid}           { keys: {id: key} } ← chỉ chủ
  │ ảnh → nén → mã hoá → photos/{pid}  ──────┼─────► aliases/{sha256(k)}   { invite }          ← link cũ
  │ xem trước: iframe ../index.html?i=…#pack │
  └──────────────────────────────────────────┘
  ┌────────── Trang thiệp ?i=<id>#k=<khoá> (không đăng nhập) ──────────────────────┐
  │ readConfig(): #pack (xem trước) → GET invites/{id} (REST) → giải mã bằng #k     │
  │   chỉ #k (link cũ) → aliases/{sha256(k)} → id; chưa có alias → config.json cũ   │
  │ applyStyle() → render() → reveal(); ảnh "fs:<pid>" → GET photos → giải mã → blob │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

Không có server riêng. Firebase giữ tài khoản và dữ liệu (đã mã hoá); GitHub Pages chỉ host code.

## 2. Các file

### `shared.js` (classic script, nạp ở `<head>` của cả 2 trang)
Khai báo biến và hàm global (không dùng module, để cả hai trang chỉ cần một thẻ `<script src>`).

| Tên | Loại | Mô tả |
|---|---|---|
| `DEFAULT` | object | Cấu hình mặc định, cũng là "schema" ngầm. Xem [config-schema.md](config-schema.md). |
| `BACKGROUNDS` | object | 7 ảnh nền gợi ý: `key → { label, id }` (id ảnh Unsplash). |
| `THEMES` | object | 4 bảng màu: `ivory`, `noir`, `sage`, `blush`, mỗi bảng có `bg, fg, muted, line, accent`. |
| `FONTS` | object | 7 font tiêu đề (`cormorant`, `playfair`, `lora`, `oldstandard`, `bricolage`, `baloo`, `mali`), mỗi font có `display` (CSS font-family) và `q` (tham số Google Fonts). |
| `STYLES` | object | 6 kiểu thiệp: `minimal`, `vintage`, `editorial`, `romance`, `playful`, `cute`. Mỗi kiểu có `label`, `hint`, `font` (font tiêu đề mặc định), tuỳ chọn `body`/`script` = `[CSS family, query Google Fonts]`. |
| `styleKey(cfg)` / `styleFonts(cfg)` | fn | Khoá style hợp lệ (sai → `minimal`). Bộ font `{ display, body, script, scriptItalic, qs }`; `font: 'auto'` hoặc sai → font của style. |
| `BLUR_MAX_PX` | number | 24. Độ mờ 100% = `blur(24px)`. |
| `esc(s)` | fn | Escape HTML `& < > " '`. Mọi chuỗi người dùng nhập đều phải qua hàm này trước khi vào `innerHTML`. |
| `safeUrl(s)` | fn | Trả về URL chuẩn hoá nếu scheme thuộc `http/https/sms/tel/mailto`, ngược lại trả về `''` (chặn `javascript:`). |
| `isUrl(s)` | fn | `true` nếu bắt đầu bằng `http(s)://`. |
| `mapUrl(a)` | fn | Địa chỉ dạng chữ thành link tìm kiếm Google Maps. Nếu là link thì qua `safeUrl`. |
| `socialUrl(base, s)`, `fbUrl`, `igUrl` | fn | Nhận link đầy đủ hoặc handle (`@ten`, `ten`), trả về link Facebook/Instagram. |
| `unsplash(id, w)` | fn | URL ảnh Unsplash với `w`, `q=70`, `auto=format` (tự WebP/AVIF), `fit=crop`. |
| `bgUrl(bg, w)` | fn | `''` → không nền. Key preset → `unsplash()`. Còn lại → chỉ chấp nhận `http(s)`. |
| `b64u` | obj | base64url encode/decode cho `Uint8Array`. |
| `pack(obj)` / `unpack(str)` | async fn | JSON → nén `deflate-raw` (CompressionStream) → base64url, và ngược lại. Chỉ dùng cho hash xem trước. |
| `repoFromLocation()` / `legacyJson(root)` | fn | Chỉ cho thiệp cũ: `"owner/repo"` khi chạy trên `owner.github.io/repo/`; đọc `config.json` cũ (GitHub API rồi Pages). |
| `fsReq(method, path, opts)` / `fsData(doc)` / `fsId(doc)` | async fn / fn | Firestore REST (`FIREBASE.emulator` → emulator). GET thiếu doc → `null`, lỗi khác → `Error(status)`. Đổi giá trị REST (string, integer, bytes, timestamp, map) sang JS. |
| `INVITE_ID`, `storedKey(id)`, `currentKey()` | let / fn | Mã thiệp từ `?i=`. Khoá: `#k=` trong link, nếu không có thì `localStorage['invite-key:<id>']`. |
| `aliasOf(k)` | async fn | Link cũ chỉ có `#k=`: `aliases/{sha256(k)}` → mã thiệp. |
| `readConfig()` | async fn | Đọc cấu hình theo thứ tự ưu tiên (mục 3). Luôn merge với `DEFAULT`. Cờ: `locked`, `missing`, `demo`, `preview`. |
| `applyStyle(cfg)` | fn → Promise | Đặt CSS variables của theme và font (`--display`, `--body`, `--script`, `--script-style`), `data-style` trên `<html>`, nạp font, nạp ảnh nền. Resolve khi font và ảnh sẵn sàng. |
| `loadFont(f)` | fn → Promise | `f = styleFonts(cfg)`. Một thẻ `<link id="font">` cho mọi font của kiểu thiệp. Chờ `document.fonts.load` (glyph "Ểm") cho tiêu đề, chữ ký, thân bài. |
| `applyBackground(cfg, r)` | fn → Promise | Đặt `--dim`, `--blur`, `--bg-img`, class `has-bg`. Decode ảnh trước khi gán để không bị "nhảy" ảnh. |

| `dateParts(s)` | fn | Tách ngày giờ thành `dd, mm, yyyy, time, weekday`, kèm cờ `valid` |
| `REF`, `GUIDES`, `SCALES`, `FIELDS` | const | Màn hình chuẩn của bố cục tự do; đường gióng (một phần ba, vàng, lề); thang cỡ chữ; các khối thông tin liên kết với form |
| `defaultPortrait()` | fn | Bản dọc mặc định khi bật "Tự thiết kế" (mô phỏng bố cục mẫu) |
| `itemStyle(it, z)` | fn | Biến phần tử thành inline style. **Mọi giá trị đều được ép kiểu, giới hạn hoặc lọc theo danh sách cho phép** (dữ liệu từ config). |
| `boardItemsHTML(cfg, items, {fmt, reveal})` | fn | HTML các phần tử theo thứ tự đọc. Admin truyền `fmt = esc`, trang thiệp truyền `fmt = words` và bật hiệu ứng. |
| `freeLayout(cfg)` | fn | Trả về `layout` nếu đang ở chế độ tự do và có bản dọc, ngược lại `null` |

### `styles.css` / `styles.js` (kiểu thiệp)
- `styles.css`: mọi rule nằm dưới `[data-style=…]`, chỉ dùng 5 token màu (+ `color-mix`) nên phối được với mọi bảng màu. Chữ thân bài luôn nằm trên nền `--bg`; chữ trên nền `--accent` luôn là `--bg`.
- `styles.js` (ES module, `index.html` import): `ORN[style]` = SVG hoạ tiết (`rule` thay vạch ngăn, `cover` trên tên, `frame` khung bìa). Nét có class `draw` + `pathLength=1` tự vẽ ra bằng `@keyframes` khi khối được reveal (không dùng selector `[pathLength]`: Chrome không tính lại style khi class tổ tiên đổi). `celebrate(style, el, calm, kind)` = hiệu ứng khi mở thư / đồng ý. `ambient(style, calm)` = cánh hoa rơi (chỉ Lãng mạn), gọi lại mỗi lần render, tự gỡ khi đổi kiểu. Mọi hiệu ứng tắt khi `prefers-reduced-motion`.

### `board.css`
Style dùng chung cho `.board` và `.it`, để trang thiệp và trình chỉnh sửa hiển thị giống hệt nhau.

### `admin/editor.js`
`createEditor({ mount, getCfg, onChange })` trả về `{ set(layout), get(), ensurePortrait(), refresh() }`.
- Vẽ bằng chính `boardItemsHTML` và `board.css`. Theme, font, ảnh nền của thiệp được gán lên `.board` để đúng WYSIWYG.
- Kéo, co giãn, xoay bằng Pointer Events cùng `setPointerCapture`. Trong lúc kéo chỉ đổi inline style của một phần tử (`paint`); thả tay mới `commit` (vẽ lại và báo `onChange`).
- Hít dính: so mép trái, tâm, mép phải (và mép trên, tâm, mép dưới) của phần tử đang kéo với đường gióng và mép, tâm của các phần tử khác, ngưỡng 6px.
- Co giãn cạnh tính theo trục đã xoay của phần tử. Góc phóng to quanh tâm.
- Lịch sử: mảng ảnh chụp JSON, tối đa 100 bước.
- Sự kiện `input` và `change` bên trong editor bị chặn lan ra form admin.

### `index.html` (trang thiệp)
CSS inline trong `<style>`, JS inline trong `<script type="module">`. Các hàm chính:

| Hàm | Vai trò |
|---|---|
| `boot(first)` | `readConfig` → `applyStyle` (tối đa chờ 1500ms) → `render` → hiện phong thư hoặc reveal → `body.ready`. Chạy lại khi `hashchange` (xem trước trong admin). |
| `render()` | Sinh HTML cho phong thư và các section từ `cfg` bằng template string và `esc()`. Gắn sự kiện, khởi động đếm ngược. |
| `words(s)` | Tách tiêu đề thành `<span class="w" style="--i:n">` từng chữ để hiện lần lượt. |
| `reveal(root, instant)` | IntersectionObserver thêm class `.in` cho `[data-r]` khi vào viewport. `instant=true` (khi admin sửa nội dung) thì hiện ngay. |
| `openCover()` | Bấm "Mở thư": phong thư tan dần, mở khoá cuộn, reveal sau 200ms, bật gợi ý cuộn và thanh cuộn. |
| `setupDecline()` | Gắn hành vi cho nút từ chối theo `declineMode`. |
| `particles(el, n, kind)` | Tạo hạt khói (`smoke`) hoặc bụi (`dust`) bằng Web Animations API, tự xoá khi xong. |
| `removeNo(no)` | Xoá nút từ chối, bọc trong `document.startViewTransition` nếu trình duyệt hỗ trợ. |
| `syncSb()` / `queueSb()` | Thanh cuộn overlay tự vẽ (mục 6 trong [invite-page.md](invite-page.md)). |
| `syncCue()` / `showCue()` | Gợi ý "Cuộn xuống". |
| `downloadIcs(d)` | Tạo và tải file `hen-ho.ics`. |

### `admin/common.js` (dùng chung cho 2 trang admin)

**Mỗi trang sở hữu một phần của thiệp:**
- Trang thiết kế ghi `layout.portrait` và `layout.landscape`.
- Trang form ghi mọi trường còn lại, kể cả `layout.mode`.

| Hàm | Vai trò |
|---|---|
| `requireUser()` | Nạp Firebase Auth (gstatic 12.6.0), hiện màn đăng nhập nếu chưa đăng nhập, đọc `users/{uid}.keys`. Chưa cấu hình Firebase thì hiện hướng dẫn. Emulator: có `window.__testSignIn` cho test. |
| `listInvites()` / `createInvite(cfg, k)` / `deleteInvite(id)` | Thiệp của tài khoản (query `owner == uid`). Tạo: ghi khoá vào `users/{uid}` **trước**, rồi `invites/{id}` (`exists=false`). Xoá: ảnh, alias, thiệp, khoá. |
| `fetchConfig()` | Thiệp `INVITE_ID`, giải mã bằng khoá của tài khoản. `{ locked }` nếu không có khoá, `{ missing }` nếu không có thiệp. |
| `saveConfig(mutate)` | GET bản mới nhất → giải mã → `mutate(latest)` → mã hoá → `:commit` với precondition `updateTime`. Có người ghi xen (400/409) thì làm lại, tối đa 3 lần. Vì luôn trộn vào bản mới nhất, lưu ở trang này **không xoá** thay đổi đã lưu từ trang kia. |
| `uploadImage(file)` / `putPhoto(bytes)` / `cleanPhotos(...cfgs)` | Nén (nhỏ dần tới < 1 MB) → mã hoá → `invites/{id}/photos/{pid}` → `"fs:<pid>"`. Dọn ảnh không còn được tham chiếu. |
| `legacyConfig()` / `importLegacy(json, k)` | Đọc `config.json` cũ; chuyển nội dung + ảnh `raw.githubusercontent.com/…/uploads/…` sang Firestore, giữ khoá, ghi alias `sha256(k)`. |
| `shareLink(base)` | `<site>/?i=<id>#k=<khoá>` |
| `askKey()` | Hộp `<dialog>` dán link/khoá của thiệp cũ |
| `toast(msg)`, `setStatus(text, cls)` | Thông báo, trạng thái trên header |

### `admin/design/index.html` (trang thiết kế)
- Toàn màn hình: thanh công cụ, trang thiết kế lớn nhất có thể (giữ tỷ lệ chuẩn, dùng `cq` units của khung chứa), bảng thuộc tính bên phải. Dưới 900px thì xếp dọc.
- `load()`: `fetchConfig` → `ed.set(layout)`. Chưa có thiết kế thì tạo bản dọc mặc định và tính là "Chưa lưu".
- **Áp dụng:** `saveConfig(remote => ({ ...remote, layout: { ...remote.layout, mode: 'free', ...ed.get() } }))`. Lưu thiết kế đồng thời bật chế độ tự thiết kế.
- **Xem thử:** mở trang thiệp ở tab mới với hash chứa thiết kế chưa lưu. Tab được mở ngay khi bấm (trước bước `await`), để trình duyệt không chặn popup.
- **Quay lại tab** (sự kiện `focus`, khi đã đăng nhập): tải lại nội dung, theme, ảnh nền từ thiệp đã lưu; giữ nguyên thiết kế đang sửa.
- Cần `?i=<id>` (link từ trang form); thiếu thì quay về trang form.

### `admin/index.html` (trang cấu hình)

| Hàm | Vai trò |
|---|---|
| `load()` | `fetchConfig('../config.json')` → `fill()` → ghi nhận trạng thái đã lưu |
| `fill(c)` / `read()` | Cấu hình → form, form → cấu hình. `read()` là nguồn sự thật khi lưu. |
| `update()` | Debounce 200ms sau mỗi `input`: `pack(read())` → đổi hash của iframe xem trước, cập nhật trạng thái "Chưa lưu"/"Đã lưu". |
| `load()` | `requireUser()` → danh sách thiệp → chọn `?i=` (hoặc thiệp mới nhất; chưa có thì tạo, hoặc nhập thiệp cũ) → `fetchConfig()` → điền form. |
| `apply()` | `saveConfig`: ghi các trường của form và `layout.mode`, **giữ nguyên** `layout.portrait/landscape` đang lưu |
| `lay` | Bản thiết kế đọc từ config, chỉ dùng cho khung xem trước. Thiết kế không được tính vào trạng thái "Chưa lưu" của form. |
| sự kiện `focus` | Quay lại từ tab thiết kế: lấy thiết kế mới cho khung xem trước. Nếu form không có thay đổi chưa lưu thì tải lại toàn bộ. |
| `upload(file)` | `uploadImage` (common.js) → `fs:<pid>` → chọn "Tuỳ chỉnh". |
| `syncBg()` | Đồng bộ ô ảnh tuỳ chỉnh, thanh trượt, hiển thị %, gợi ý chế độ từ chối. |
| scrollspy | IntersectionObserver trên `form > fieldset` tô đậm mục đang xem trong thanh mục lục. |

## 3. Nguồn cấu hình và thứ tự ưu tiên

`readConfig()` thử lần lượt, dừng ở nguồn đầu tiên khớp:

| # | Nguồn | Khi nào | Độ mới |
|---|---|---|---|
| 1 | `location.hash` (giải nén bằng `unpack`) | URL có `#…` không phải `#k=`. Admin dùng cho iframe xem trước. | Tức thì |
| 2 | Firestore `invites/{?i=}` qua REST, giải mã bằng `currentKey()` | URL có `?i=` | Tức thì (không cache) |
| 3 | Link cũ chỉ có `#k=`: `aliases/{sha256(k)}` → như #2; chưa có alias → `config.json` cũ trong repo | Link gửi trước khi có tài khoản | Alias: tức thì. `config.json`: GitHub API rồi Pages (cache tới 600s) |
| 4 | `DEFAULT` + cờ `demo` | Không có `?i=` lẫn `#k=` (hoặc chưa cấu hình Firebase) | — |

Kết quả luôn là `{ ...DEFAULT, ...nguồn }`, nên khi thêm trường mới vào `DEFAULT`, config cũ vẫn chạy.

> **Giới hạn của nguồn 2:** API không xác thực bị GitHub giới hạn 60 request/giờ cho mỗi IP [Unverified, theo tài liệu GitHub, chưa kiểm thử]. Vượt giới hạn thì tự rơi xuống nguồn 3.

## 4. Vòng đời trang thiệp

```
DOMContentLoaded (module)
  └─ boot(true)
       ├─ readConfig('config.json')
       ├─ race( applyStyle(cfg) , 1500ms )   ← chờ font và ảnh nền, quá 1.5s thì vẫn hiện
       ├─ render()                           ← innerHTML + gắn sự kiện + đếm ngược
       ├─ intro ? hiện phong thư, khoá cuộn, reveal(cover)
       │        : reveal(#app), showCue()
       └─ body.ready (fade-in 0.6s), queueSb()

Bấm "Mở thư" → openCover()
  ├─ .cover.out  (opacity 1.1s, delay 0.15s; nội dung lùi + mờ)
  ├─ mở khoá cuộn
  ├─ +200ms reveal(#app)   ← chồng lên lúc phong thư đang tan
  └─ showCue() (+1400ms), queueSb()

hashchange (chỉ trong iframe admin) → boot(false)
  └─ giữ trạng thái đã mở; reveal(instant) → không chạy lại animation mỗi lần gõ
```

## 5. Luồng dữ liệu của admin

```
input event ──debounce 200ms──► update()
                                 ├─ pack(read()) → iframe.src = '../index.html#<hash>'   (đổi fragment, không reload)
                                 └─ refreshState(): so sánh JSON.stringify(read()) với `saved`

Áp dụng / Ctrl+S ─► apply()
   ├─ saveConfig(): GET invites/{id} → giải mã → gộp → mã hoá
   ├─ POST :commit { update, currentDocument: { updateTime } }
   │    └─ 400/409 (có người ghi xen) → đọc lại, gộp lại (tối đa 3 lần)
   └─ OK → saved = body, nút Áp dụng bị vô hiệu, cập nhật tên trong ô chọn thiệp

Tải ảnh ─► upload(file)
   ├─ kiểm tra image/*, ≤ 25MB
   ├─ compress(): createImageBitmap → canvas ≤ 2400px → toBlob(webp .82 | jpeg); > 1 MB thì 1800/1400/1000px
   ├─ seal(khoá) → PATCH invites/{id}/photos/{pid}?currentDocument.exists=false
   └─ bgUrl = "fs:<pid>" → chọn "Tuỳ chỉnh", trạng thái "Chưa lưu"
```

## 6. Vì sao chọn kiến trúc này

Xem đầy đủ trong [decisions-and-limitations.md](decisions-and-limitations.md). Tóm tắt:
- Web tĩnh trên GitHub Pages + Firebase (Auth, Firestore) gói miễn phí: không phải vận hành server, deploy bằng `git push`.
- Nội dung không nằm trong repo; vẫn mã hoá phía trình duyệt nên Firebase chỉ giữ bản mã (QĐ-11, QĐ-13).
- Link ngắn cố định: `?i=<id>#k=<khoá>`, cấu hình không nằm trong URL.
- Không framework: 3 file, khoảng 1.100 dòng, không bước build, trang nhẹ.
