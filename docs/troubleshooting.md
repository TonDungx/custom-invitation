# Xử lý sự cố

| Triệu chứng | Nguyên nhân có thể | Cách xử lý |
|---|---|---|
| Đã bấm Áp dụng nhưng link thiệp vẫn hiện nội dung cũ | Cache: API khoảng 60s; nếu bị giới hạn request thì rơi xuống Pages, cache tới 10 phút | Chờ 1–10 phút. Kiểm tra commit `chore: update invitation` đã có trên GitHub. Kiểm tra trực tiếp: `curl -s https://api.github.com/repos/TonDungx/custom-invitation/contents/config.json -H "Accept: application/vnd.github.raw+json"` |
| Admin báo "Token hoặc repo không đúng quyền" | Token hết hạn hoặc bị thu hồi, chưa chọn đúng repo, thiếu quyền Contents: Read and write, repo nhập sai | Tạo token mới theo [admin-guide.md](admin-guide.md#kết-nối-github-lần-đầu), bấm **Kết nối GitHub** để nhập lại |
| Admin báo "Lỗi khi lưu (5xx)" hoặc lỗi mạng | GitHub gặp sự cố hoặc mất mạng | Thử lại. Thay đổi vẫn còn trong form miễn là chưa đóng tab. |
| Mở admin ở máy khác không thấy nút lưu hoạt động | Token chỉ lưu ở trình duyệt cũ | Nhập token (tạo mới nếu không còn) |
| Admin hiện nội dung cũ hơn bản đã lưu | Chưa có token nên admin đọc qua API không xác thực hoặc qua Pages (có cache) | Kết nối GitHub: khi có token, admin luôn đọc bản mới nhất |
| `git push` bị `rejected (fetch first)` | Admin đã commit lên `main` | `git pull --rebase && git push` |
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
