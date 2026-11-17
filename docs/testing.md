# Kiểm thử

## Chạy

```bash
npm i --no-save playwright-core     # chỉ cài tạm, không tạo package.json
node check.mjs                      # dùng Google Chrome đã cài trên máy (channel: 'chrome')
OUT=./shots node check.mjs          # tuỳ chọn: lưu ảnh chụp màn hình vào thư mục khác (mặc định: thư mục tạm của hệ điều hành)
```

Kết quả mong đợi (khoảng 30–40 giây):
```
upload: uploads/<số>.webp 121917 -> 7876 bytes
all checks passed, no JS errors
```
Một assert sai thì script dừng với `AssertionError` và thông báo của assert đó. Có lỗi JS trên trang thì in `ERRORS:` và thoát với mã 1.

Yêu cầu: Node 18 trở lên (đã chạy trên Node 24), Google Chrome đã cài.

## Cách hoạt động

- **Server tĩnh** viết bằng `node:http` ở cổng 5178. Phải trả đúng `Content-Type` cho `.css`: trình duyệt bỏ qua stylesheet có kiểu `text/plain` (từng làm vỡ toàn bộ trang thiết kế trong test), phục vụ thư mục dự án. Đường dẫn là thư mục thì trả `index.html` (giống cách Vercel và Netlify phục vụ `/admin`).
- **GitHub API giả lập** bằng `ctx.route('https://api.github.com/**')`:

  | Request | Phản hồi giả |
  |---|---|
  | `PUT …/contents/uploads/…` | Ghi lại ảnh, trả `commit.sha = "c0ffee"` |
  | `PUT …/contents/config.json` | Ghi lại nội dung vào biến `stored`, trả `content.sha = "sha<n>"` |
  | `GET` khi chưa có `stored` | 404 |
  | `GET` với `Accept: …raw…` | JSON thô |
  | `GET` thường | `{ sha, content: base64 }` |

  Mọi PUT đều phải có `Authorization: Bearer test-token`.
- **`/config.json` local** cũng được route sang `stored`, vì trên localhost `repoFromLocation()` trả về `''` nên trang thiệp đọc `./config.json`.
- **Không ghi gì vào GitHub thật.**

## Danh sách kiểm tra

### Admin
| Kiểm tra | Bảo vệ |
|---|---|
| `/admin` tự chuyển sang `/admin/`, URL không có hash | Đường dẫn tương đối, link gọn |
| Nút Áp dụng bị khoá khi chưa đổi gì | Theo dõi trạng thái đã sửa |
| Ảnh nền mặc định chọn "Không"; ô link ảnh bị ẩn | Lỗi cũ: gán `RadioNodeList.value = ''` không tick được ô nào; `[hidden]` bị CSS đè |
| Chọn ảnh thì mở khoá thanh trượt; hiển thị "50%" | `syncBg` |
| Bấm mục trong mục lục thì mục đó được tô đậm | Scrollspy |
| Áp dụng → hộp token → PUT 1 lần, nội dung đúng (`to`, `bg`, `bgBlur`, `bgDim`) | Luồng lưu |
| Tải ảnh PNG 3000×2000 → file `uploads/<số>.webp`, nhỏ hơn bản gốc, **2400×1600**, link raw gắn `c0ffee`, tự chọn "Tuỳ chỉnh", trạng thái "Chưa lưu" | Nén, resize, link theo commit |

### Trang thiệp
| Kiểm tra | Bảo vệ |
|---|---|
| Đọc đúng cấu hình đã lưu (tên "Linh" trên phong thư) | Đường đọc config |
| Có class `has-bg`, `--bg-img` trỏ tới Unsplash, độ mờ 50% = `blur(12px)` | Ảnh nền |
| Thanh cuộn overlay ẩn khi phong thư đang đóng | Không lộ thanh cuộn lúc khoá |
| Mở thư → gợi ý cuộn hiện; cuộn → gợi ý ẩn | Gợi ý cuộn |
| Thanh cuộn gốc `scrollbar-width: none`; thanh overlay hiện khi cuộn, nằm sát mép phải, **kéo thì trang cuộn**, đứng yên thì mờ | Lỗi cũ: trang co 10px khi mở thư |
| **Hồi quy:** cuộn ngay sau khi mở thư → gợi ý **không** hiện ở cuối trang | Lỗi cũ: gợi ý đè lên footer |
| Tên quán chứa `<script>` hiển thị thành chữ, không có thẻ `<script>` | XSS |
| `reply = "javascript:alert(1)"` → không có nút nhắn lại | Chặn scheme nguy hiểm |
| 3 biểu tượng với link đúng: Maps (có mã hoá chữ "Lý"), Facebook nguyên link, Instagram từ `@handle` | Chuẩn hoá link |
| Điểm đến không có link thì không có hàng biểu tượng | Ẩn khi trống |
| **Né tránh** × 6: mỗi lần dịch > 100px, không đè nút đồng ý, nằm trong màn hình; không chuyển sang đồng ý | Thuật toán chọn chỗ |
| Đồng ý → tải `.ics` có `DTSTART` đúng | File lịch |
| **Bốc khói:** còn nút sau 3 lần bấm, có khói; lần 4 nút bị xoá, hạt khói tự dọn, không chuyển sang đồng ý | Chế độ smoke |
| **Bốc hơi:** 1 lần bấm, nút bị xoá, hạt tự dọn | Chế độ vanish |
| **Ẩn nút:** không có nút từ chối | Chế độ off |
| Đồng hồ đếm ngược có số khác 0 | Đếm ngược. Ngày test luôn ở năm sau nên assert này không hết hạn. |
| **Thiết kế:** form chỉ hiện nút "Mở trình thiết kế" khi chọn Tự thiết kế, không nhúng trình thiết kế | Tách trang |
| `/admin/design` → `/admin/design/`; 5 khối mặc định, "Chưa lưu"; trang thiết kế cao > 600px trên màn 900px, đúng tỷ lệ 390:844 | Trang thiết kế toàn màn hình |
| Kéo lệch 3px thì bị hít vào gióng hoặc mép gần nhất; giữ Alt thì kéo tự do | Hít dính |
| Kéo cạnh phải: rộng ra, tâm dịch sang phải | Co giãn cạnh |
| Kéo góc: cỡ chữ tăng | Co giãn góc |
| Kéo chấm xoay sang phải tâm: đúng 90° | Xoay và hít góc |
| Bấm cỡ gợi ý 41.9 (16·φ²) | Thang tỷ lệ vàng |
| Ctrl+Z, Ctrl+Shift+Z, Delete, Ctrl+Z | Lịch sử, phím tắt |
| Chữ tự do `<img onerror>` hiện thành chữ trên thiệp | XSS |
| Tạo bản ngang từ bản dọc → 6 phần tử | Bản ngang |
| Lưu ở trang thiết kế → `layout.mode = free`, đủ 2 bản, **vẫn giữ** `to` của form | Lưu và trộn |
| Xem thử → tab mới hiện trang tự thiết kế | Xem thử |
| Sửa `to` ở form rồi lưu → thiết kế **vẫn còn** đủ 6 phần tử | Mỗi trang sở hữu phần của mình |
| Điện thoại 390×844: bản dọc phủ kín, tâm phần tử đúng (cx%, cy%) trong 2px | Hiển thị |
| Laptop 1280×800: hiện bản ngang | Chọn bản theo hướng |
| Laptop khi chưa có bản ngang: bản dọc ở giữa, tỷ lệ 390:844 | Dự phòng |
| `config.json` lưu dạng `{v, enc}`, không chứa chữ "Linh"; giải mã bằng khoá trong `localStorage` ra đúng nội dung | Mã hoá khi lưu |
| Ảnh tải lên là `uploads/*.bin`, không còn chữ ký `WEBP`, giải mã ra ảnh 2400×1600; link `enc:https://raw…/c0ffee/…` | Mã hoá ảnh |
| Trình duyệt mới không có khoá: chỉ hiện "cần link đầy đủ", không có nội dung; mở với `#k=` thì đọc được | Riêng tư |
| Gửi thử → sự kiện `test`; mở thiệp (bật notifyOpen) → đúng 1 `open`; Đồng ý → `accept` kèm tên và ngày; xem trước trong admin → 0 thông báo | Thông báo |
| Link Google Calendar có đúng `dates`; `.ics` có `VALARM` −2 giờ; dòng nhắc chỉ hiện với User-Agent Messenger | Lịch |
| `index.html` có `og:title`, `og:description`, `og:image`; `og.jpg` là JPEG | Ảnh xem trước khi gửi link |
| 3 bố cục mẫu (6, 6, 7 phần tử), thêm vòng tròn (4 góc + xoay), đường kẻ (2 cạnh + xoay), ảnh (8 tay nắm + xoay, giải mã ra `blob:`), tay nắm dưới tăng chiều cao; lưu thành tham chiếu `enc:`; thiệp giải mã ảnh và vẽ khung | Trình thiết kế giai đoạn 2 |
| Dọn ảnh: xoá ảnh mồ côi và ảnh nền chưa lưu, không bao giờ xoá ảnh config đang dùng | Dọn ảnh |
| Không có `pageerror` nào ở mọi trang | Lỗi runtime |

Các chế độ smoke, vanish, off được nạp bằng hash: gọi `pack({...DEFAULT, declineMode})` ngay trong trang admin, giống cách khung xem trước làm.

## Kiểm tra ngoài `check.mjs` (đã làm thủ công)
- **Độ co trang khi mở thư:** cần Chrome có giao diện, vì chế độ chạy ngầm ẩn thanh cuộn. Đo `document.documentElement.clientWidth` trước và sau khi mở: bản cũ 1000 → 990, bản mới 1000 → 1000.
- **Khung hình hiệu ứng mở thư:** chụp ở các mốc 0, 150, 350, 550, 800, 1100, 1600, 2400ms để xem có khoảng trống hay bị cắt không.
- **Tương phản theme:** tính theo công thức WCAG, xem bảng trong [design-system.md](design-system.md).
- **Bản live:** sau mỗi lần deploy, mở trang thiệp và admin trên Pages, kiểm tra không có lỗi JS.

## `check-devices.mjs`: giả lập thiết bị

```bash
npm i --no-save playwright-core && npx playwright@1.48.2 install webkit   # 1 lần
node check-devices.mjs
```
Tạo một `config.json` đã mã hoá (bằng Node WebCrypto, cùng định dạng với `shared.js`) và mở trang thiệp bằng `#k=`. Chạy 6 cấu hình × 2 bố cục (mẫu, tự thiết kế):

| Thiết bị | Engine |
|---|---|
| iPhone 13, iPhone SE (320×568), iPad Pro 11 ngang | WebKit (lõi của Safari) |
| iPhone 13 với User-Agent Messenger | WebKit |
| Pixel 7, Pixel 7 với User-Agent Zalo | Chrome |

Kiểm tra trên mỗi máy:
- Giải mã được bằng `#k`.
- Không cuộn ngang; phần tử của bố cục tự do không tràn mép.
- Gợi ý cuộn không đè chữ.
- Chạm vào nút từ chối thì nó né.
- Chạm Đồng ý thì chạy; có link Google Calendar.
- Dòng nhắc "mở bằng trình duyệt" **chỉ** hiện trong ứng dụng.
- Các nút không gãy dòng; không có lỗi JS.

**Lỗi thật bộ này đã bắt được:**
- Một lần chạm làm nút từ chối né 2 lần (sự kiện `pointerdown` rồi `click`), lần thứ hai đo vị trí lúc nút đang trượt dở nên có thể **đè lên nút Đồng ý**.
- Trên iPhone SE, gợi ý cuộn đè lên chữ ký.
- Nút "Lịch Apple / Outlook" gãy dòng.

**Giới hạn:** WebKit của Playwright trên Windows không giống hệt Safari trên iPhone, và User-Agent giả không tái hiện được mọi hành vi của trình duyệt trong ứng dụng thật (chặn tải file, cookie…). Vẫn cần thử một lần trên máy thật.

## Chưa có kiểm tra tự động cho
- Safari thật trên iPhone, Firefox (`check-devices.mjs` chỉ giả lập bằng WebKit và Chrome).
- GitHub API thật (rate limit, token hết hạn).
- Trình duyệt trong Messenger, Zalo.
- Hiệu ứng View Transition và thanh tiến độ CSS (chỉ chạy trên trình duyệt hỗ trợ).
