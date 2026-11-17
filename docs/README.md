# Tài liệu dự án: Thiệp mời hẹn hò

Trang web thiệp mời hẹn hò dùng được nhiều lần, chỉnh sửa qua trang `/admin`. Toàn bộ là web tĩnh (HTML/CSS/JS thuần, không framework, không build, không dependency lúc chạy). Host trên GitHub Pages. Dữ liệu lưu trong file `config.json` của chính repo.

| | Link |
|---|---|
| Trang thiệp (link gửi đi) | https://tondungx.github.io/custom-invitation/ |
| Trang cấu hình | https://tondungx.github.io/custom-invitation/admin |
| Mã nguồn | https://github.com/TonDungx/custom-invitation |

## Mục lục

| File | Nội dung | Đọc khi |
|---|---|---|
| [architecture.md](architecture.md) | Cấu trúc file, luồng dữ liệu, nguồn cấu hình, vòng đời trang, API của `shared.js` | Cần hiểu code chạy thế nào trước khi sửa |
| [config-schema.md](config-schema.md) | Từng trường của `config.json`: kiểu, mặc định, ràng buộc, cách hiển thị | Thêm hoặc sửa một tuỳ chọn cấu hình |
| [admin-guide.md](admin-guide.md) | Hướng dẫn dùng `/admin` từng mục, tạo token GitHub, tải ảnh | Người dùng cấu hình thiệp |
| [invite-page.md](invite-page.md) | Từng phần của trang thiệp, mọi hiệu ứng (thời lượng, easing), nút từ chối, thanh cuộn, file lịch | Chỉnh giao diện hoặc chuyển động |
| [design-system.md](design-system.md) | Màu, font, khoảng cách, nguyên tắc thiết kế, a11y | Thêm theme, font, thành phần mới |
| [deployment-and-ops.md](deployment-and-ops.md) | GitHub Pages, cache (số liệu đo thật), commit từ admin, quy trình push, dọn ảnh | Deploy, push code, vận hành |
| [testing.md](testing.md) | `check.mjs`: cách chạy, từng nhóm kiểm tra, cách giả lập GitHub API | Trước khi báo "xong" một thay đổi |
| [decisions-and-limitations.md](decisions-and-limitations.md) | Các quyết định kiến trúc và lý do, giới hạn đã biết, lịch sử lỗi và bài học, ý tưởng tiếp theo | Trước khi đề xuất thay đổi lớn |
| [troubleshooting.md](troubleshooting.md) | Triệu chứng, nguyên nhân, cách xử lý | Khi có lỗi |

## Bắt đầu nhanh

### Người dùng (chỉnh thiệp)
1. Mở `/admin`, sửa nội dung. Khung điện thoại bên phải xem trước ngay.
2. Bấm **Áp dụng**. Lần đầu sẽ hỏi token GitHub, xem [admin-guide.md](admin-guide.md#kết-nối-github-lần-đầu).
3. Gửi link `https://tondungx.github.io/custom-invitation/`. Nội dung mới hiện sau khoảng 1 phút.

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
├── admin/index.html   Trang cấu hình
├── shared.js          Dùng chung: mặc định, theme, font, ảnh nền, URL helper, đọc config, áp style, mô hình bố cục tự do
├── board.css          Style trang thiết kế tự do, dùng chung cho trang thiệp và trình chỉnh sửa (WYSIWYG)
├── admin/editor.js    Trình thiết kế kéo thả (chế độ "Tự thiết kế")
├── config.json        Cấu hình đã lưu (do admin ghi qua GitHub API, KHÔNG sửa tay khi admin đang mở)
├── uploads/           Ảnh nền tải từ máy (do admin ghi)
├── check.mjs          Kiểm thử end-to-end (Playwright + Chrome)
├── docs/              Tài liệu này
└── .gitignore         node_modules/
```

## Tóm tắt kỹ thuật

- **Không có backend.** Admin ghi `config.json` và ảnh vào repo qua GitHub REST API (contents), dùng fine-grained token lưu trong `localStorage` của trình duyệt.
- **Trang thiệp đọc cấu hình** theo thứ tự: hash trong URL (chỉ dùng cho xem trước) → GitHub API (mới, cache khoảng 60s) → `config.json` trên Pages (CDN cache 10 phút) → mặc định.
- **Hiệu năng:** chỉ animate `opacity`, `transform`, `filter`. Không thư viện. Ảnh nền resize theo màn hình. Font tải 1 request. CLS đo được bằng 0.
- **An toàn:** mọi chuỗi người dùng nhập đều được escape. Link chỉ chấp nhận `http`, `https`, `sms`, `tel`, `mailto`.
- **Tiếp cận:** tương phản ≥ 4.5:1 ở cả 4 theme, focus ring rõ ràng, vùng chạm ≥ 44px, tôn trọng `prefers-reduced-motion`.
