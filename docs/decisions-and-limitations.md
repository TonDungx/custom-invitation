# Quyết định, giới hạn, bài học

## Quyết định kiến trúc

### QĐ-1: Web tĩnh thuần, không framework, không build
- **Chọn:** 3 file HTML/JS, CSS và JS viết thẳng trong HTML.
- **Lý do:** trang nhỏ, cần nhanh và mượt. Không có bundle framework, không bước build, deploy bằng cách copy file.
- **Đánh đổi:** không có component tái sử dụng hay type-check. Nếu cần nhiều trang hoặc nhiều mẫu thiệp thì nên cân nhắc lại.

### QĐ-2: Lưu cấu hình trong `config.json` của repo, ghi qua GitHub API
- **Bối cảnh:**
  - Bản đầu nén cấu hình vào hash của URL (`#…`): không cần lưu trữ, nhưng link dài khoảng 600 ký tự. Người dùng thấy không chấp nhận được.
  - Người dùng muốn có nút "Áp dụng để lưu".
- **Chọn:** admin `PUT` `config.json` qua contents API bằng fine-grained token. Link thiệp cố định và ngắn.
- **Phương án bị loại:**
  - Server hoặc DB riêng (Firebase, Supabase…): thêm dịch vụ, thêm khoá.
  - Dịch vụ rút gọn link: phụ thuộc bên thứ ba, vẫn phải tạo link mới mỗi lần sửa.
- **Đánh đổi:**
  - Nội dung thiệp **công khai** trong repo public.
  - Mỗi lần lưu là một commit.
  - Cần token, token nằm trong `localStorage`.

### QĐ-3: Trang thiệp đọc config qua GitHub API trước, Pages sau
- **Bối cảnh:** đo được CDN của Pages cache 600s, và query string không bỏ qua được cache.
- **Chọn:** `api.github.com/repos/{repo}/contents/config.json` với header raw. Lưu xong là thấy trong khoảng 1 phút.
- **Đánh đổi:** giới hạn 60 request/giờ/IP khi không xác thực [Unverified, theo tài liệu GitHub]. Vượt thì rơi xuống bản trên Pages (có thể cũ tới 10 phút).

### QĐ-4: Hash URL vẫn được giữ, chỉ để xem trước
- Admin gửi cấu hình đang sửa vào iframe bằng `#<deflate+base64url>`. Đổi fragment không reload trang. Trang thiệp nghe `hashchange` để vẽ lại.
- Không dùng `postMessage` vì đường hash đã có sẵn và cũng dùng được để test.

### QĐ-5: Ảnh tải lên được lưu trong repo, link gắn commit SHA
- **Chọn:** nén trên máy (≤ 2400px, WebP 0.82), `PUT uploads/<ts>.webp`, link `raw.githubusercontent.com/<repo>/<sha>/<path>`.
- **Lý do:** dùng ngay, không chờ Pages build. Nội dung không bao giờ đổi nên cache không gây vấn đề. Đã đo: raw trả `image/webp` và có CORS.
- **Đánh đổi:** ảnh cũ không tự xoá. Ảnh công khai.

### QĐ-6: Thanh cuộn overlay tự vẽ
- **Bối cảnh:** thanh cuộn gốc trên Windows chiếm khoảng 10px, khi phong thư mở khoá cuộn thì trang co lại. `overflow: overlay` đã bị Chrome bỏ. `scrollbar-gutter: stable` giữ chỗ cố định, không làm thanh nằm đè lên được.
- **Chọn:** ẩn thanh gốc, tự vẽ thanh 4px bằng `transform`, có kéo thả.
- **Đánh đổi:** không có vùng bấm vào rãnh để nhảy trang. Bàn phím và lăn chuột vẫn chạy bình thường.

### QĐ-7: Chỉ animate opacity, transform, filter
Mọi hiệu ứng (hiện dần, phong thư, nút từ chối, hạt khói) đều chạy được bằng card đồ hoạ. Hạt khói dùng `radial-gradient` thay cho `filter: blur` cho rẻ. Khi xoá nút dùng View Transition API, trình duyệt không hỗ trợ thì bỏ qua.

### QĐ-8: Tiêu đề hiện từng chữ, không dùng khung che
Khung che cả khối chữ làm dòng thứ 2 bị cắt giữa chừng, trông nghiệp dư (phản hồi của người dùng). Mỗi chữ là một `inline-block` đi từ mờ sang nét, lệch nhau 70ms.

## Giới hạn đã biết

| Giới hạn | Ảnh hưởng | Cách khắc phục (nếu cần) |
|---|---|---|
| Nội dung `config.json` và `uploads/` công khai | Ai mở repo cũng đọc được tên, ngày, địa điểm | Chuyển dữ liệu sang kho riêng có xác thực, hoặc dùng GitHub Pro (Pages từ repo private) [Unverified] |
| Admin không có mật khẩu | Ai vào `/admin` cũng xem được giao diện, nhưng **không lưu được** nếu không có token | Đủ an toàn cho mục đích hiện tại |
| Bấm "Đồng ý" không báo cho người gửi | Chỉ biết khi người ấy dùng nút nhắn lại | Thêm webhook hoặc form, ví dụ ghi vào một file khác bằng một token chỉ ghi |
| Một thiệp tại một thời điểm | Mỗi repo chỉ có một `config.json` | Thêm tham số `?id=` và `configs/<id>.json` |
| Ngày giờ không có múi giờ | Người xem ở múi giờ khác thấy đếm ngược lệch | Lưu kèm offset |
| Rate limit API 60/giờ/IP [Unverified] | Vượt thì có thể thấy bản cũ tới 10 phút | Hiếm khi gặp với một thiệp |
| `.ics` không có nhắc nhở; trình duyệt trong Messenger/Zalo có thể chặn tải | Nút lịch không hoạt động ở một số nơi | Thêm link Google Calendar, `VALARM`, gợi ý "mở bằng trình duyệt" |
| Ảnh preset lấy từ Unsplash | Tác giả xoá ảnh thì nền thành màu trơn | Tải ảnh về repo |
| Chỉ kiểm thử tự động trên Chrome | Safari, Firefox chưa được kiểm thử tự động | Thêm WebKit vào `check.mjs` |
| Thanh tiến độ cần `animation-timeline` | Trình duyệt chưa hỗ trợ thì không hiện thanh | Chấp nhận (chỉ là trang trí) |

## Lịch sử lỗi và bài học

| Lỗi | Nguyên nhân gốc | Bài học |
|---|---|---|
| Gợi ý "Cuộn xuống" đè lên footer ở cuối trang | Ẩn bằng sự kiện `scroll` chạy một lần. Cuộn trước khi gợi ý kịp hiện (1.4s) thì nó hiện ra rồi kẹt luôn. | Trạng thái hiển thị phải **tính lại từ trạng thái hiện tại** (vị trí cuộn), không dựa vào sự kiện xảy ra đúng một lần. |
| Ô "Không" (ảnh nền) không được tô chọn | `RadioNodeList.value = ''` không tick ô radio có `value=""` trên Chrome | Không dùng chuỗi rỗng làm giá trị radio. Dùng `none` rồi đổi lại khi đọc và ghi. |
| Ô link ảnh vẫn hiện dù có `hidden`; phong thư vẫn che trang khi tắt intro | CSS `display: grid` của tác giả đè lên `[hidden]` của trình duyệt | Luôn có `[hidden] { display: none !important; }` trong CSS reset. |
| Tiêu đề bị cắt ngang khi hiện | Khung che `overflow: hidden` cho cả khối chữ nhiều dòng | Chữ nhiều dòng hiện theo từng chữ hoặc từng dòng, không che cả khối. |
| Phong thư biến mất đột ngột, có quãng trống | Expo-out dồn gần hết thay đổi vào đầu; nội dung thư lại hiện muộn (350ms) | Dùng đường cong đều cho hiệu ứng biến mất. Cho hai cảnh chồng lên nhau. Kiểm tra bằng cách **chụp từng khung hình**. |
| Trang co 10px khi mở thư | Thanh cuộn gốc chiếm chỗ khi hết khoá cuộn | Kiểm tra trên trình duyệt **có giao diện**, vì chế độ chạy ngầm ẩn thanh cuộn. |
| Ô "Giờ" đè lên ô "Tên quán" trong admin | Ô chọn giờ gốc rộng hơn cột 7rem | Chụp màn hình form ở kích thước thật. |
| Push bị từ chối | Admin đã commit `config.json` lên `main` | Luôn `git pull --rebase` trước khi push. |
| Ngày test ghi cứng sẽ làm test hỏng sau ngày đó | `2026-12-24` cố định trong `check.mjs` | Ngày trong test phải tính tương đối (năm sau). |

## Ý tưởng tiếp theo (chưa làm)
- Nút Google Calendar, nhắc nhở trong `.ics`, gợi ý "mở bằng trình duyệt" khi đang ở trong ứng dụng.
- Nút dọn ảnh không dùng trong `uploads/`.
- Ghi nhận khi người ấy bấm đồng ý (cần một nơi lưu có thể ghi từ phía người xem).
- Nhiều thiệp trong một repo (`?id=`).
- Thẻ Open Graph (ảnh xem trước khi gửi link qua Messenger, Zalo).
- Nhạc nền (tắt mặc định, có nút bật).
