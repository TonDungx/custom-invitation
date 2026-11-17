# Kiến trúc

## 1. Tổng quan

```
                    ┌──────────────────────── GitHub repo (public) ────────────────────────┐
                    │  index.html  admin/index.html  shared.js  config.json  uploads/*.webp │
                    └───────▲───────────────────────────┬───────────────────────▲──────────┘
                            │ PUT contents API           │ git push → Pages build │ PUT contents API
                            │ (config.json)              ▼ (~1 phút)              │ (uploads/…)
  ┌─────────────── /admin ──┴───────────┐     ┌──── GitHub Pages (CDN) ────┐      │
  │ form → read() → JSON                │     │ tondungx.github.io/        │      │
  │   ├─ pack() → iframe ../index.html#… ─────► custom-invitation/         │      │
  │   │          (xem trước, không lưu) │     │  (Cache-Control 600s)      │      │
  │   ├─ Áp dụng → PUT config.json ─────┘     └─────────────┬──────────────┘      │
  │   └─ Tải ảnh → nén → PUT uploads/ ────────────────────────────────────────────┘
  └─────────────────────────────────────┘                   │
                                                            ▼
  ┌──────────── Trang thiệp (index.html) ───────────────────────────────────────────┐
  │ readConfig():  #hash? → api.github.com/…/contents/config.json (raw, ~60s cache)   │
  │                       → ./config.json (Pages, ≤10 phút cũ) → DEFAULT             │
  │ applyStyle() → render() → reveal()                                               │
  └──────────────────────────────────────────────────────────────────────────────────┘
```

Không có server riêng. GitHub đóng hai vai: **nơi lưu dữ liệu** (repo, ghi qua REST API) và **nơi host** (Pages).

## 2. Các file

### `shared.js` (classic script, nạp ở `<head>` của cả 2 trang)
Khai báo biến và hàm global (không dùng module, để cả hai trang chỉ cần một thẻ `<script src>`).

| Tên | Loại | Mô tả |
|---|---|---|
| `DEFAULT` | object | Cấu hình mặc định, cũng là "schema" ngầm. Xem [config-schema.md](config-schema.md). |
| `BACKGROUNDS` | object | 7 ảnh nền gợi ý: `key → { label, id }` (id ảnh Unsplash). |
| `THEMES` | object | 4 bảng màu: `ivory`, `noir`, `sage`, `blush`, mỗi bảng có `bg, fg, muted, line, accent`. |
| `FONTS` | object | 3 font tiêu đề: `cormorant`, `playfair`, `lora`, mỗi font có `display` (CSS font-family) và `q` (tham số Google Fonts). |
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
| `repoFromLocation()` | fn | Trả về `"owner/repo"` khi chạy trên `owner.github.io/repo/`, ngược lại trả về `''` (localhost). |
| `readConfig(localUrl)` | async fn | Đọc cấu hình theo thứ tự ưu tiên (mục 3). Luôn merge với `DEFAULT`. |
| `applyStyle(cfg)` | fn → Promise | Đặt CSS variables của theme và font, nạp font, nạp ảnh nền. Resolve khi font và ảnh sẵn sàng. |
| `loadFont(f)` | fn → Promise | Một thẻ `<link id="font">` cho font tiêu đề và Be Vietnam Pro. Chờ `document.fonts.load`. |
| `applyBackground(cfg, r)` | fn → Promise | Đặt `--dim`, `--blur`, `--bg-img`, class `has-bg`. Decode ảnh trước khi gán để không bị "nhảy" ảnh. |

| `dateParts(s)` | fn | Tách ngày giờ thành `dd, mm, yyyy, time, weekday`, kèm cờ `valid` |
| `REF`, `GUIDES`, `SCALES`, `FIELDS` | const | Màn hình chuẩn của bố cục tự do; đường gióng (một phần ba, vàng, lề); thang cỡ chữ; các khối thông tin liên kết với form |
| `defaultPortrait()` | fn | Bản dọc mặc định khi bật "Tự thiết kế" (mô phỏng bố cục mẫu) |
| `itemStyle(it, z)` | fn | Biến phần tử thành inline style. **Mọi giá trị đều được ép kiểu, giới hạn hoặc lọc theo danh sách cho phép** (dữ liệu từ config). |
| `boardItemsHTML(cfg, items, {fmt, reveal})` | fn | HTML các phần tử theo thứ tự đọc. Admin truyền `fmt = esc`, trang thiệp truyền `fmt = words` và bật hiệu ứng. |
| `freeLayout(cfg)` | fn | Trả về `layout` nếu đang ở chế độ tự do và có bản dọc, ngược lại `null` |

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

### `admin/index.html` (trang cấu hình)

| Hàm | Vai trò |
|---|---|
| `load()` | Có token: đọc `config.json` qua API có xác thực (luôn mới, lấy `sha`). Không có: `readConfig('../config.json')`. Sau đó `fill()` và ghi nhận trạng thái đã lưu. |
| `fill(c)` / `read()` | Cấu hình → form, form → cấu hình. `read()` là nguồn sự thật khi lưu. |
| `update()` | Debounce 200ms sau mỗi `input`: `pack(read())` → đổi hash của iframe xem trước, cập nhật trạng thái "Chưa lưu"/"Đã lưu". |
| `apply()` | PUT `config.json`. Lỗi 409/422 (sha cũ) thì đọc lại sha và thử 1 lần. Lỗi 401/403/404 thì mở lại hộp nhập token. |
| `askToken()` | `<dialog>` nhập `owner/repo` và token, lưu vào `localStorage['invite-gh']`. |
| `compress(file)` / `upload(file)` | Resize ≤ 2400px → WebP 0.82 (JPEG nếu trình duyệt không encode được WebP) → PUT `uploads/<timestamp>.webp` → URL raw gắn commit SHA. |
| `syncBg()` | Đồng bộ ô ảnh tuỳ chỉnh, thanh trượt, hiển thị %, gợi ý chế độ từ chối. |
| scrollspy | IntersectionObserver trên `form > fieldset` tô đậm mục đang xem trong thanh mục lục. |

## 3. Nguồn cấu hình và thứ tự ưu tiên

`readConfig(localUrl)` thử lần lượt, dừng ở nguồn đầu tiên thành công:

| # | Nguồn | Khi nào | Độ mới |
|---|---|---|---|
| 1 | `location.hash` (giải nén bằng `unpack`) | Chỉ khi URL có `#…`. Admin dùng cho iframe xem trước. | Tức thì |
| 2 | `https://api.github.com/repos/{repo}/contents/config.json` với header `Accept: application/vnd.github.raw+json` | Khi chạy trên `*.github.io/{repo}/` | API trả `Cache-Control: max-age=60` [Unverified, chưa đo trực tiếp header này] |
| 3 | `./config.json` (trang thiệp) hoặc `../config.json` (admin) trên Pages | Khi API lỗi hoặc chạy local | CDN của Pages cache **600s**. Đã đo: thêm `?v=` vào URL **không** bỏ qua được cache. |
| 4 | `DEFAULT` | Không nguồn nào có | — |

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
   ├─ chưa có token → askToken()
   ├─ PUT /contents/config.json { message, content(base64), sha }
   │    ├─ 409/422 → GET sha → PUT lại 1 lần
   │    └─ 401/403/404 → báo lỗi + askToken() → thử lại
   └─ OK → sha mới, saved = body, nút Áp dụng bị vô hiệu

Tải ảnh ─► upload(file)
   ├─ kiểm tra image/*, ≤ 25MB, có token
   ├─ compress(): createImageBitmap → canvas ≤ 2400px → toBlob(webp .82 | jpeg .82)
   ├─ PUT /contents/uploads/<Date.now()>.webp
   └─ bgUrl = https://raw.githubusercontent.com/{repo}/{commitSha}/uploads/…  → chọn "Tuỳ chỉnh", trạng thái "Chưa lưu"
```

Các commit do admin tạo có message `chore: update invitation` (lưu cấu hình) và `chore: upload background` (tải ảnh).

## 6. Vì sao chọn kiến trúc này

Xem đầy đủ trong [decisions-and-limitations.md](decisions-and-limitations.md). Tóm tắt:
- Web tĩnh + GitHub: miễn phí, không phải vận hành server, deploy bằng `git push`.
- Link ngắn cố định: cấu hình nằm trong repo, không nằm trong URL (bản đầu tiên nhét cấu hình vào URL, link dài khoảng 600 ký tự, người dùng thấy không ổn).
- Không framework: 3 file, khoảng 1.100 dòng, không bước build, trang nhẹ.
