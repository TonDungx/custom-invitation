# Quyết định, giới hạn, bài học

## Quyết định kiến trúc

### QĐ-1: Web tĩnh thuần, không framework, không build
- **Chọn:** 3 file HTML/JS, CSS và JS viết thẳng trong HTML.
- **Lý do:** trang nhỏ, cần nhanh và mượt. Không có bundle framework, không bước build, deploy bằng cách copy file.
- **Đánh đổi:** không có component tái sử dụng hay type-check. Nếu cần nhiều trang hoặc nhiều mẫu thiệp thì nên cân nhắc lại.

### QĐ-2: Lưu cấu hình trong `config.json` của repo, ghi qua GitHub API (đã thay bằng QĐ-13)
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

### QĐ-3: Trang thiệp đọc config qua GitHub API trước, Pages sau (chỉ còn cho link cũ, xem QĐ-13)
- **Bối cảnh:** đo được CDN của Pages cache 600s, và query string không bỏ qua được cache.
- **Chọn:** `api.github.com/repos/{repo}/contents/config.json` với header raw. Lưu xong là thấy trong khoảng 1 phút.
- **Đánh đổi:** giới hạn 60 request/giờ/IP khi không xác thực [Unverified, theo tài liệu GitHub]. Vượt thì rơi xuống bản trên Pages (có thể cũ tới 10 phút).

### QĐ-4: Hash URL vẫn được giữ, chỉ để xem trước
- Admin gửi cấu hình đang sửa vào iframe bằng `#<deflate+base64url>`. Đổi fragment không reload trang. Trang thiệp nghe `hashchange` để vẽ lại.
- Không dùng `postMessage` vì đường hash đã có sẵn và cũng dùng được để test.

### QĐ-5: Ảnh tải lên được lưu trong repo, link gắn commit SHA (đã thay bằng QĐ-13)
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

### QĐ-9: Bố cục tự do: hai bản dọc và ngang, tâm theo %, kích thước theo "px thiết kế"
- **Bối cảnh:** người dùng muốn kéo thả tự do và thiệp lấp đầy mọi màn hình (điện thoại, laptop, PC). Toạ độ pixel cố định thì vỡ trên màn hình khác. Một bản dọc kéo giãn ra màn ngang thì chồng chữ.
- **Chọn (người dùng duyệt):**
  - Hai bản thiết kế: dọc (chuẩn 390×844) và ngang (chuẩn 1440×900).
  - Vị trí là **tâm** theo %, kích thước và cỡ chữ theo px thiết kế, nhân với `--u = min(rộng/390, cao/844)`. Màn hình thấp hơn thì chữ co đúng bằng mức khoảng cách dọc co lại, nên không chồng.
  - Chưa có bản ngang thì dùng bản dọc ở giữa.
- **Kỹ thuật:** CSS container query units, Pointer Events thuần. Không dùng Moveable, interact.js hay canvas (Fabric.js). Phân tích BMAD: `_bmad-output/planning-artifacts/freeform-editor-analysis.md` (chỉ có trên máy, không commit).
- **Đánh đổi:** phải thiết kế hai lần nếu muốn đẹp trên màn ngang. Màn hình tỷ lệ lạ (máy gập, siêu rộng) sẽ có khoảng trống.

### QĐ-10: Trình thiết kế là trang riêng; mỗi trang sở hữu một phần config
- **Bối cảnh:** người dùng muốn trình thiết kế "mở sang hẳn một link mới, tách khỏi dạng điền form".
- **Chọn:** `/admin/design` toàn màn hình. Code dùng chung tách ra `admin/common.js` (lưu, token, thông báo) và `admin/admin.css`.
- **Vấn đề khi có 2 trang:** cả hai cùng ghi `config.json`; nếu mỗi trang ghi đè toàn bộ thì trang lưu sau sẽ xoá thay đổi của trang kia.
- **Giải pháp:** `saveConfig(mutate)` luôn đọc bản mới nhất rồi chỉ thay phần của mình. Trang thiết kế ghi `layout.portrait/landscape` (và bật `mode: free`); trang form ghi mọi trường còn lại cùng `layout.mode`.
- **Đánh đổi:** trang thiết kế hiển thị nội dung **đã lưu** của form, không phải nội dung đang gõ dở ở tab form.

### QĐ-11: Mã hoá nội dung, khoá nằm trong fragment của link
- **Bối cảnh:** repo public để Pages miễn phí, nên tên, ngày, địa điểm, ảnh đều công khai. Người dùng chọn mã hoá thay vì trả phí cho repo private.
- **Chọn:** AES-GCM 256-bit (WebCrypto). `config.json` = `{v:1, enc}`; ảnh = `uploads/*.bin` (iv ‖ ciphertext). Khoá trong `#k=` (fragment không gửi lên server) và `localStorage`. Phân tích: `_bmad-output/planning-artifacts/privacy-notify-analysis.md` (chỉ có trên máy).
- **Đánh đổi:** link dài thêm khoảng 45 ký tự; mất khoá là mất nội dung (nhập lại được); **lịch sử git vẫn còn các bản rõ trước khi mã hoá** (`config.json` cũ, 3 ảnh `.webp` cũ). Xoá hẳn cần viết lại lịch sử và force-push; chưa làm vì đó là thao tác phá huỷ, cần người dùng đồng ý riêng.

### QĐ-12: Thông báo qua Google Apps Script của chính người dùng
- **Bối cảnh:** người dùng gửi Gmail App Password trong chat. Web tĩnh không giữ được bí mật: đặt mật khẩu vào code đồng nghĩa với công khai nó. **Không dùng, khuyên thu hồi.**
- **Chọn:** Web App Apps Script (`doPost` → `MailApp`), chạy dưới tài khoản người dùng. Trang thiệp `POST` kiểu `no-cors`. URL nằm trong config đã mã hoá. Script giới hạn 30 mail/giờ và escape dữ liệu.
- **Đánh đổi:** người dùng phải tự deploy (khoảng 5 phút). Trang không biết mail đã gửi được chưa (phản hồi opaque).

### QĐ-13: Tài khoản Google + Firestore; nội dung ra khỏi repo
- **Bối cảnh:** người dùng không muốn nội dung cá nhân nằm trong repo (kể cả đã mã hoá) và muốn có tài khoản, đăng nhập Google, **ai cũng đăng ký được**. Phân tích BMAD: `_bmad-output/planning-artifacts/accounts-google-login-analysis.md` (chỉ có trên máy).
- **Chọn:** Firebase Auth (Google) + Firestore, hosting vẫn GitHub Pages.
  - Chỉ nạp **Auth SDK 12.6.0** (gstatic) ở admin; Firestore đi qua **REST** (`fetch`), trang thiệp không nạp SDK nào.
  - Giữ mã hoá phía trình duyệt (QĐ-11): Firestore chỉ chứa bản mã; khoá trong link + `users/{uid}` (chỉ chủ đọc).
  - Ảnh là bytes trong Firestore (< 1 MB/ảnh, tự nén nhỏ dần), không dùng Cloud Storage.
  - Lưu bằng `:commit` có precondition `updateTime` (emulator bỏ qua precondition dạng query `?currentDocument.updateTime=`).
  - Link cũ `…/#k=KEY`: trước khi nhập vẫn đọc `config.json` cũ; khi nhập thì giữ nguyên khoá và ghi `aliases/{sha256(KEY)} → id`.
- **Phương án bị loại:** Supabase (dự án miễn phí tự tạm dừng sau 1 tuần không hoạt động, theo trang pricing của Supabase: thiệp gửi đi có thể chết); repo private (Pages miễn phí cần repo public).
- **Đánh đổi:** thêm một dịch vụ bên ngoài, chủ site phải tự tạo project (~10 phút); hạn mức miễn phí dùng chung cho mọi người đăng ký; chưa có giới hạn số thiệp/ảnh mỗi tài khoản (cần App Check hoặc hạn mức trong Rules nếu bị lạm dụng).

## Giới hạn đã biết

| Giới hạn | Ảnh hưởng | Cách khắc phục (nếu cần) |
|---|---|---|
| Lịch sử git còn bản rõ trước khi mã hoá | `config.json` cũ và 3 ảnh `.webp` cũ vẫn xem được qua lịch sử commit | Viết lại lịch sử (`git filter-repo`) và force-push. Thao tác phá huỷ, cần đồng ý riêng. |
| Mất khoá | Không đọc lại được config | Nhập lại nội dung, lưu với khoá mới |
| Ai cũng đăng ký được | Hạn mức miễn phí Firestore dùng chung; một người có thể tạo nhiều thiệp/ảnh | App Check, hạn mức trong Rules |
| Popup đăng nhập Google trong app Messenger/Zalo | Có thể bị chặn | Chỉ admin cần đăng nhập; mở admin bằng trình duyệt thường |
| Thông báo cần người dùng tự deploy Apps Script | Chưa deploy thì không có mail | Làm theo [notifications.md](notifications.md) |
| Một thiệp tại một thời điểm | Mỗi repo chỉ có một `config.json` | Thêm tham số `?id=` và `configs/<id>.json` |
| Ngày giờ không có múi giờ | Người xem ở múi giờ khác thấy đếm ngược lệch | Lưu kèm offset |
| Rate limit API 60/giờ/IP [Unverified] | Vượt thì có thể thấy bản cũ tới 10 phút | Hiếm khi gặp với một thiệp |
| Trình duyệt trong Messenger/Zalo có thể chặn tải `.ics` | Nút "Lịch Apple / Outlook" có thể không chạy trong ứng dụng | Đã có nút Google Calendar và dòng nhắc "mở bằng trình duyệt" |
| Ảnh preset lấy từ Unsplash | Tác giả xoá ảnh thì nền thành màu trơn | Tải ảnh về repo |
| Chưa thử trên máy thật | `check-devices.mjs` giả lập WebKit và Chrome mobile, không thay được iPhone và ứng dụng thật | Gửi link cho chính mình và thử trên điện thoại |
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
| `board.css` không áp dụng trong test, trang thiết kế vỡ | Server test trả `.css` với kiểu `text/plain` | Server tĩnh tự viết phải map đủ kiểu file. Khi thấy lỗi giao diện chỉ trong test, kiểm tra Network trước. |
| Nút từ chối có thể nhảy đè lên nút Đồng ý (chỉ khi dùng cảm ứng) | Một lần chạm sinh `pointerdown` và `click`, nên né 2 lần; lần 2 đo vị trí lúc nút đang trượt dở nên tính sai gốc | Không đo vị trí qua `getBoundingClientRect` khi có transition đang chạy; dùng offset bố cục. Thử cảm ứng bằng `tap`, không chỉ `dispatchEvent`. |
| Gợi ý cuộn đè chữ ký trên iPhone SE | Màn thấp nên nội dung chạm vùng gợi ý | Kiểm tra màn nhỏ (320×568) cho mọi lớp phủ cố định |
| Ngày test ghi cứng sẽ làm test hỏng sau ngày đó | `2026-12-24` cố định trong `check.mjs` | Ngày trong test phải tính tương đối (năm sau). |

## Ý tưởng tiếp theo (chưa làm)
- **Trình thiết kế P3:** danh sách lớp, khoá phần tử.
- Xoá bản rõ khỏi lịch sử git (cần đồng ý vì là thao tác phá huỷ).
- Nhiều thiệp trong một repo (`?id=`).
- Nhạc nền (tắt mặc định, có nút bật).
