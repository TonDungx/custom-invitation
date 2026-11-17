# Xử lý sự cố

| Triệu chứng | Nguyên nhân có thể | Cách xử lý |
|---|---|---|
| Thiệp hiện "Thiệp này cần link đầy đủ" | Link thiếu đoạn `#k=…`, hoặc bị cắt khi copy | Gửi lại link lấy từ nút **Sao chép link** trong admin |
| Thiệp hiện "Không mở được thiệp" | `?i=` sai, thiệp đã bị xoá, hoặc mất mạng | Kiểm tra mạng; lấy lại link bằng **Sao chép link** |
| Admin chỉ hiện "Chưa cấu hình Firebase" | `firebase-config.js` còn trống | Làm theo [firebase-setup.md](firebase-setup.md) |
| Bấm "Đăng nhập bằng Google" báo `auth/unauthorized-domain` | Domain chưa có trong Authorized domains | Firebase Console → Authentication → Settings → Authorized domains → thêm domain |
| Popup đăng nhập bị chặn / không mở | Trình duyệt chặn popup, hoặc đang trong app Messenger/Zalo | Cho phép popup; mở admin bằng trình duyệt thường |
| Admin hỏi "Mở khoá thiệp cũ" khi nhập | Trình duyệt này không có khoá của thiệp cũ | Dán link thiệp cũ đầy đủ đã gửi (có `#k=`) |
| Admin báo "Chưa mở khoá", nút Áp dụng bị khoá | Tài khoản không có khoá của thiệp này | Mở thiệp bằng đúng tài khoản đã tạo nó |
| Không nhận được mail thông báo | Chưa deploy, link sai, chưa Áp dụng sau khi dán link, mail vào Spam, script sửa mà chưa deploy bản mới | Làm lại theo [notifications.md](notifications.md); dùng nút **Gửi thử** |
| Dán link vào Messenger không thấy ảnh xem trước | Messenger cache ảnh cũ của link | Chờ cache hết hạn, hoặc dùng Sharing Debugger của Facebook để làm mới [Unverified] |
| Admin báo "Lỗi khi lưu (403)" | Hết phiên đăng nhập, hoặc Rules trên Console khác `firestore.rules` | Tải lại trang (đăng nhập lại); dán lại Rules và Publish |
| Admin báo "Lỗi khi lưu" khác hoặc lỗi mạng | Firebase gặp sự cố, vượt hạn mức miễn phí, hoặc mất mạng | Thử lại. Thay đổi vẫn còn trong form miễn là chưa đóng tab. |
| Trang thiết kế hiện tên, tiêu đề cũ | Trang thiết kế dùng nội dung đã lưu | Bấm Áp dụng ở form, rồi quay lại tab thiết kế (tự cập nhật), hoặc tải lại trang |
| Khung xem trước ở form chưa có thiết kế mới | Chưa bấm Áp dụng ở trang thiết kế | Áp dụng ở trang thiết kế, rồi quay lại tab form |
| Sửa code xong push nhưng web chưa đổi | Pages đang build hoặc CDN cache 10 phút | `gh api repos/TonDungx/custom-invitation/pages/builds/latest --jq .status`, chờ `built` rồi thêm tối đa 10 phút |
| Ảnh nền không hiện | URL không phải `https`, ảnh bị xoá hoặc chặn hotlink, link Unsplash chết | Dùng **Tải ảnh từ máy** thay cho link ngoài. Kiểm tra trong tab Network. |
| Tải ảnh báo "Chỉ nhận file ảnh" | File không có kiểu `image/*` (ví dụ HEIC trên một số trình duyệt máy tính) | Đổi ảnh sang JPG hoặc PNG rồi tải lại |
| Tải ảnh xong nhưng thiệp không đổi nền | Chưa bấm Áp dụng | Tải ảnh chỉ đặt ảnh vào form. Cần bấm **Áp dụng**. |
| Nút "Thêm vào lịch" không phản hồi | Trình duyệt trong Messenger, Zalo hoặc Instagram chặn tải file | Mở link bằng Safari hoặc Chrome (menu ⋯ → Mở bằng trình duyệt) |
| Đếm ngược lệch vài giờ | Người xem ở múi giờ khác (ngày giờ không có múi giờ) | Giới hạn đã biết, xem [decisions-and-limitations.md](decisions-and-limitations.md) |
| Không thấy hiệu ứng (chữ hiện ngay) | Máy bật "Giảm chuyển động" (Reduce motion) | Đúng thiết kế, để tôn trọng cài đặt tiếp cận |
| Không thấy thanh tiến độ trên cùng | Trình duyệt chưa hỗ trợ `animation-timeline` | Đúng thiết kế (chỉ là trang trí) |
| Nút đồng ý nhảy thẳng vào giữa khi nút từ chối biến mất, không trượt | Trình duyệt chưa hỗ trợ View Transitions | Đúng thiết kế |
| Trang trắng, không hiện gì | Lỗi JS (thường do `config.json` sửa tay bị sai cú pháp JSON) | Mở DevTools → Console. Kiểm tra JSON: `node -e "JSON.parse(require('fs').readFileSync('config.json','utf8'))"`. Nếu `config.json` lỗi, `readConfig` bỏ qua và dùng mặc định; trang trắng thì lỗi ở chỗ khác. |
| `check.mjs` lỗi `Cannot find package 'playwright-core'` | Chưa cài | `npm i --no-save playwright-core` |
| `check.mjs` lỗi không tìm thấy Chrome | Chưa cài Google Chrome | Cài Chrome, hoặc đổi `channel: 'chrome'` thành `'msedge'` |
| `check.mjs` lỗi `EADDRINUSE :5178` | Một lần chạy trước chưa tắt | Tắt tiến trình `node` cũ hoặc đổi cổng trong file |
| `/admin` hiện danh sách file hoặc 404 khi chạy local | Server tĩnh không tự trả `index.html` cho thư mục | Mở `/admin/` (có dấu `/`) hoặc dùng `npx serve` |
