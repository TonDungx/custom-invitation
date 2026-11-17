# Tài liệu dự án: Thiệp mời hẹn hò

Trang web thiệp mời hẹn hò dùng được nhiều lần, chỉnh sửa qua trang `/admin`. Toàn bộ là web tĩnh (HTML/CSS/JS thuần, không framework, không build, không dependency lúc chạy). Host trên GitHub Pages. Dữ liệu lưu trong file `config.json` của chính repo.

| | Link |
|---|---|
| Trang thiệp (link gửi đi) | `https://tondungx.github.io/custom-invitation/#k=<mã khoá>`, lấy bằng nút **Sao chép link** trong admin |
| Trang cấu hình (form) | https://tondungx.github.io/custom-invitation/admin |
| Trang thiết kế (kéo thả) | https://tondungx.github.io/custom-invitation/admin/design |
| Mã nguồn | https://github.com/TonDungx/custom-invitation |

## Mục lục

| File | Nội dung | Đọc khi |
|---|---|---|
| [architecture.md](architecture.md) | Cấu trúc file, luồng dữ liệu, nguồn cấu hình, vòng đời trang, API của `shared.js` | Cần hiểu code chạy thế nào trước khi sửa |
| [config-schema.md](config-schema.md) | Từng trường của `config.json`: kiểu, mặc định, ràng buộc, cách hiển thị | Thêm hoặc sửa một tuỳ chọn cấu hình |
| [admin-guide.md](admin-guide.md) | Hướng dẫn dùng `/admin` từng mục, tài khoản và nhiều thiệp, tải ảnh | Người dùng cấu hình thiệp |
| [invite-page.md](invite-page.md) | Từng phần của trang thiệp, mọi hiệu ứng (thời lượng, easing), nút từ chối, thanh cuộn, file lịch | Chỉnh giao diện hoặc chuyển động |
| [firebase-setup.md](firebase-setup.md) | Tạo project Firebase, bật đăng nhập Google, dán Rules, điền `firebase-config.js`, nhập thiệp cũ | Cài đặt lần đầu, chuyển dữ liệu cũ |
| [design-system.md](design-system.md) | Màu, font, kiểu thiệp (style), khoảng cách, nguyên tắc thiết kế, a11y | Thêm theme, font, kiểu thiệp, thành phần mới |
| [deployment-and-ops.md](deployment-and-ops.md) | GitHub Pages, cache (số liệu đo thật), commit từ admin, quy trình push, dọn ảnh | Deploy, push code, vận hành |
| [testing.md](testing.md) | `check.mjs`: cách chạy, từng nhóm kiểm tra, cách giả lập GitHub API | Trước khi báo "xong" một thay đổi |
| [decisions-and-limitations.md](decisions-and-limitations.md) | Các quyết định kiến trúc và lý do, giới hạn đã biết, lịch sử lỗi và bài học, ý tưởng tiếp theo | Trước khi đề xuất thay đổi lớn |
| [notifications.md](notifications.md) | Cài thông báo email bằng Google Apps Script (từng bước) | Muốn biết khi người ấy mở thiệp, bấm Đồng ý |
| [troubleshooting.md](troubleshooting.md) | Triệu chứng, nguyên nhân, cách xử lý | Khi có lỗi |

## Bắt đầu nhanh

### Người dùng (chỉnh thiệp)
1. Mở `/admin`, **đăng nhập bằng Google** (chủ site cài Firebase một lần: [firebase-setup.md](firebase-setup.md)).
2. Sửa nội dung. Khung điện thoại bên phải xem trước ngay. Bấm **Áp dụng**.
3. Bấm **Sao chép link** và gửi đi (`…/?i=<mã thiệp>#k=<khoá>`). Người nhận không cần tài khoản.

### Lập trình viên (sửa code)
```bash
git pull --rebase            # admin cũng commit vào repo (config.json, uploads/), luôn pull trước
# sửa index.html / admin/index.html / shared.js
npx serve .                  # hoặc server tĩnh bất kỳ; mở http://localhost:3000/admin/
npm i --no-save playwright-core && node check.mjs   # kiểm thử E2E, dùng Chrome đã cài
git push                     # GitHub Pages tự deploy, khoảng 1 phút
```

## Cấu trúc thư mục

```
custom-invitation/
├── index.html         Trang thiệp (HTML + CSS + JS inline)
├── admin/index.html   Trang cấu hình (form)
├── admin/design/      Trang thiết kế kéo thả, toàn màn hình
├── admin/admin.css    Style dùng chung cho 2 trang admin
├── admin/common.js    Dùng chung cho 2 trang admin: đăng nhập Google, thiệp trong Firestore, ảnh, nhập thiệp cũ, thông báo
├── firebase-config.js Định danh project Firebase (công khai, không phải bí mật)
├── firestore.rules    Quyền đọc/ghi Firestore (ai sửa được thiệp nào)
├── firebase.json      Cấu hình Firebase Emulator cho test
├── check-rules.mjs    Test Rules trên emulator
├── shared.js          Dùng chung: mặc định, theme, font, ảnh nền, URL helper, đọc config, áp style, mô hình bố cục tự do
├── board.css          Style trang thiết kế tự do, dùng chung cho trang thiệp và trình chỉnh sửa (WYSIWYG)
├── styles.css         Bố cục, chữ, nút, hoạ tiết của từng kiểu thiệp ([data-style=…]); "Tối giản" = CSS gốc trong index.html
├── styles.js          Hoạ tiết SVG và hiệu ứng riêng của từng kiểu thiệp (confetti, tim, cánh hoa, dấu sáp)
├── admin/editor.js    Thành phần trình thiết kế (dùng trong admin/design)
├── config.json        Cấu hình đã lưu, **mã hoá AES-GCM** (do admin ghi qua GitHub API, không sửa tay)
├── uploads/           Ảnh tải từ máy, **mã hoá** (*.bin; vài *.webp cũ chưa mã hoá)
├── og.jpg             Ảnh xem trước khi gửi link (Open Graph, 1200×630)
├── tools/notify.gs    Script Google Apps Script gửi email thông báo (deploy ở tài khoản Google của bạn)
├── check.mjs          Kiểm thử end-to-end (Playwright + Chrome)
├── check-devices.mjs  Kiểm thử giả lập thiết bị: iPhone (WebKit), Android, iPad, Messenger, Zalo
├── docs/              Tài liệu này
└── .gitignore         node_modules/
```

## Tóm tắt kỹ thuật

- **Không có server riêng.** Tài khoản (đăng nhập Google) và dữ liệu nằm ở Firebase; repo chỉ có code. Quyền đọc/ghi do `firestore.rules` quyết định; ai cũng đăng ký được, mỗi người chỉ sửa thiệp của mình.
- **Riêng tư:** nội dung và ảnh được mã hoá AES-GCM 256-bit trên trình duyệt trước khi lưu. Khoá nằm trong link gửi đi (`#k=…`, không bao giờ gửi lên server) và trong tài khoản của chủ thiệp.
- **Thông báo:** email qua Google Apps Script của chính bạn ([notifications.md](notifications.md)).
- **Trang thiệp đọc cấu hình** theo thứ tự: hash trong URL (chỉ dùng cho xem trước) → `invites/{?i=}` qua Firestore REST (không SDK) → link cũ `#k=` (alias, rồi `config.json` cũ) → thiệp demo.
- **Hiệu năng:** chỉ animate `opacity`, `transform`, `filter`. Không thư viện. Ảnh nền resize theo màn hình. Font tải 1 request. CLS đo được bằng 0.
- **An toàn:** mọi chuỗi người dùng nhập đều được escape. Link chỉ chấp nhận `http`, `https`, `sms`, `tel`, `mailto`.
- **Tiếp cận:** tương phản ≥ 4.5:1 ở cả 4 theme, focus ring rõ ràng, vùng chạm ≥ 44px, tôn trọng `prefers-reduced-motion`.
