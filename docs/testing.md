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

- **Server tĩnh** viết bằng `node:http` ở cổng 5178, phục vụ thư mục dự án. Đường dẫn là thư mục thì trả `index.html` (giống cách Vercel và Netlify phục vụ `/admin`).
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
| Không có `pageerror` nào ở mọi trang | Lỗi runtime |

Các chế độ smoke, vanish, off được nạp bằng hash: gọi `pack({...DEFAULT, declineMode})` ngay trong trang admin, giống cách khung xem trước làm.

## Kiểm tra ngoài `check.mjs` (đã làm thủ công)
- **Độ co trang khi mở thư:** cần Chrome có giao diện, vì chế độ chạy ngầm ẩn thanh cuộn. Đo `document.documentElement.clientWidth` trước và sau khi mở: bản cũ 1000 → 990, bản mới 1000 → 1000.
- **Khung hình hiệu ứng mở thư:** chụp ở các mốc 0, 150, 350, 550, 800, 1100, 1600, 2400ms để xem có khoảng trống hay bị cắt không.
- **Tương phản theme:** tính theo công thức WCAG, xem bảng trong [design-system.md](design-system.md).
- **Bản live:** sau mỗi lần deploy, mở trang thiệp và admin trên Pages, kiểm tra không có lỗi JS.

## Chưa có kiểm tra tự động cho
- Safari / iOS, Firefox (chỉ chạy Chrome).
- GitHub API thật (rate limit, token hết hạn).
- Trình duyệt trong Messenger, Zalo.
- Hiệu ứng View Transition và thanh tiến độ CSS (chỉ chạy trên trình duyệt hỗ trợ).
