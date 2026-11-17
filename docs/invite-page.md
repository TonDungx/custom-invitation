# Trang thiệp (`index.html`)

Thứ tự từ trên xuống: **Phong thư (lớp phủ) → Lời nhắn → Thời gian → Lịch trình → Hồi đáp → Footer**. Các lớp nổi: ảnh nền, thanh tiến độ, gợi ý cuộn, thanh cuộn overlay.

Easing dùng chung:
- `--ease: cubic-bezier(.16, 1, .3, 1)`: expo-out, nhanh lúc đầu, dừng rất êm. Dùng cho mọi hiệu ứng "hiện ra".
- `--ease-io: cubic-bezier(.77, 0, .18, 1)`: dùng cho vạch chạy của gợi ý cuộn.
- `cubic-bezier(.4, 0, .2, 1)`: đường cong đều, dùng khi phong thư tan đi (nếu dùng expo-out thì trông như bị cắt cụt).

## 0. Khởi động
- `body` bắt đầu với `opacity: 0`, sau khi có cấu hình, font và ảnh nền (tối đa chờ 1.5s) thì thêm `.ready` và fade-in trong 0.6s. Tránh nháy font hoặc nháy ảnh.
- Phần tử có `[data-r]` hiện khi vào viewport (IntersectionObserver, `rootMargin` đáy −12%): `opacity 0→1` trong 1.2s, `translateY 18px→0` trong 1.4s, trễ `--d × 120ms`.

## 1. Phong thư (cover)
- Lớp `position: fixed` phủ toàn màn hình: "Một lời mời dành cho", tên (`to`), vạch màu nhấn, ngày `dd · mm · yyyy`, nút **Mở thư**.
- Khi hiện, các phần lần lượt xuất hiện (trễ 1–6 nhịp × 120ms). Tên hiện theo kiểu từng chữ (mục 2).
- Trong lúc phong thư hiện: `body.locked` khoá cuộn, thanh cuộn overlay bị ẩn.
- **Bấm Mở thư:**
  - Nội dung phong thư thu nhỏ còn 0.96, lùi lên 1rem, mờ dần sang `blur(8px)` và tan trong 0.9–1.3s.
  - Lớp phong thư mờ dần trong 1.1s (trễ 0.15s), sau đó `visibility: hidden`.
  - **200ms sau** khi bấm, phần lời nhắn bắt đầu hiện, chồng lên lúc phong thư đang tan nên không có khoảng trống.
- `intro: false` thì không có phong thư: trang mở thẳng vào lời nhắn.

## 2. Lời nhắn
- "Gửi {to}," → tiêu đề → vạch → lời nhắn → "— {from}".
- Section cao tối thiểu `100svh`, nội dung căn giữa theo chiều dọc, nên gợi ý cuộn nằm đúng đáy màn hình.
- **Tiêu đề hiện từng chữ** (`.words .w`): mỗi chữ đi từ `opacity 0, blur(12px), translateY(.3em)` về trạng thái bình thường (1.1–1.5s). Chữ sau trễ hơn chữ trước 70ms.
  - Bản cũ dùng khung che cho cả khối chữ, khiến dòng thứ 2 bị cắt ngang giữa chừng và dấu tiếng Việt có thể bị xén. Hiện mỗi chữ là một `inline-block` riêng, không có khung che.
  - Cũng áp dụng cho tên trên phong thư và câu hỏi ở phần Hồi đáp.

### 2b. Trang tự thiết kế (khi `layout.mode = "free"`)
- Thay cho phần Lời nhắn bằng `<section class="board-wrap">` cao `100svh`, chứa một `.board` cho mỗi hướng màn hình.
- **Màn hình dọc:** hiện bản dọc, phủ kín màn hình.
- **Màn hình ngang:** có bản ngang thì hiện bản ngang. Chưa có thì hiện bản dọc ở giữa với tỷ lệ 390:844, cao bằng màn hình.
- Chuyển giữa hai bản hoàn toàn bằng CSS `@media (orientation)`, nên xoay máy là đổi ngay.
- Style phần tử nằm trong [board.css](../board.css): `left/top = cx%/cy%`, `translate(-50%,-50%) rotate()`, `width` và `font-size` theo `--u = min(100cqw/390, 100cqh/844)` (container query units).
- **Hiệu ứng:** mỗi khối hiện từng chữ như tiêu đề bố cục mẫu, các khối nối nhau theo thứ tự đọc (trên xuống, trái sang), lệch 120ms.
- Thứ tự trong DOM là thứ tự đọc, giúp trình đọc màn hình đọc đúng. Thứ tự lớp dùng `z-index`.

## 3. Thời gian
- Ngày cỡ lớn (`clamp(6rem, 30vw, 9.5rem)`), "Tháng M · YYYY", thứ và giờ in nghiêng (`Intl.DateTimeFormat('vi-VN', { weekday: 'long' })`, ví dụ "Thứ Năm").
- **Đếm ngược:** Ngày, Giờ, Phút, Giây, cập nhật mỗi giây, dùng `tabular-nums` để số không nhảy độ rộng. Đến giờ hẹn thì ẩn ô đếm ngược.
- `date` không hợp lệ thì ẩn cả section.

## 4. Lịch trình
- Danh sách `<ol>`. Cột trái là giờ, đường kẻ dọc có chấm màu nhấn, cột phải là tên, ghi chú, biểu tượng.
- **Đường kẻ tự vẽ** từ trên xuống (`scaleY 0→1`, 1.8s, trễ 0.2s) khi vào màn hình. Từng điểm đến hiện lần lượt.
- **Biểu tượng** tròn 44px, nét mảnh 1.3px cùng một bộ: ghim bản đồ, Facebook, Instagram. Rê chuột thì nền tô đầy từ tâm ra (`scale 0→1`, 0.45s), biểu tượng đổi màu. Mở tab mới với `rel="noopener"`, có `aria-label` dạng "Google Maps: {tên quán}".

## 5. Hồi đáp
Hai trạng thái nằm chồng trong cùng một ô grid, nên chuyển trạng thái không làm nhảy bố cục:
- **Đang hỏi:** câu hỏi, nút đồng ý (nền đặc), nút từ chối (viền mảnh).
- **Đã đồng ý** (thêm class `.yes`):
  - Phần đang hỏi mờ đi trong 0.6s.
  - Phần đã đồng ý hiện sau 0.35s.
  - Vòng tròn tự vẽ (1.4s, trễ 0.5s), rồi dấu tick (0.7s, trễ 1.5s).
  - Lời cảm ơn, nút **Thêm vào lịch**, nút nhắn lại (nếu có link).

### Nút từ chối (`declineMode`)
Không chế độ nào chuyển sang trạng thái đã đồng ý hay ghi nhận gì: nút **không bao giờ bấm được**.

| Chế độ | Kích hoạt | Hành vi chi tiết |
|---|---|---|
| `dodge` (Né tránh) | Rê chuột vào (chỉ với chuột), chạm hoặc nhấn (`pointerdown`), bấm phím (`click`) | Chọn ngẫu nhiên một vị trí trong phần giao giữa section Hồi đáp và màn hình, cách mép 16px. Loại vị trí đè lên nút đồng ý hoặc câu hỏi (cộng thêm lề 16px) và vị trí cách chỗ cũ dưới 110px. Thử tối đa 40 lần. Di chuyển bằng `transform` với đường cong hơi nảy `cubic-bezier(.3, 1.35, .5, 1)` trong 0.6s. Trên điện thoại, nút nhảy đi ngay khi ngón tay chạm vào nên không kịp bấm. |
| `smoke` (Bốc khói) | `click` | Mỗi lần bấm: rung 380ms, nóng lên (`--heat = min(1, n/3)` trộn màu chữ và viền sang màu nhấn), bốc `3 + 4n` cụm khói. **Lần thứ 4:** thêm 26 cụm khói, nút mờ, nhoè và co lại (0.9s, trễ 0.25s) rồi bị xoá. Riêng nút này không có hiệu ứng tô nền khi rê chuột, để vẫn thấy màu "nóng". |
| `vanish` (Bốc hơi) | `click` | 46 hạt bụi bay lên. Nút mờ dần, nhoè `blur(10px)`, bay lên 16px, chữ giãn ra trong 1.1s, rồi bị xoá. |
| `off` | — | Không có nút. |

- **Hạt khói và bụi:** thẻ `<i class="fx">` `position: fixed`. Khói dùng `radial-gradient` (rẻ hơn `filter: blur`), bụi là chấm 2–5px. Chạy bằng Web Animations API, 0.9–1.9s, tự xoá khi xong.
- **Khi nút bị xoá:** dùng `document.startViewTransition` nếu có, để nút đồng ý trượt mượt vào giữa. Trình duyệt chưa hỗ trợ thì nút nhảy thẳng vào giữa.

### Thêm vào lịch (`downloadIcs`)
Tạo file `hen-ho.ics` (iCalendar 2.0) ngay trên máy và tải về:

| Trường ICS | Giá trị |
|---|---|
| `DTSTART` | `date` dạng floating (không có múi giờ, hiểu theo giờ địa phương) |
| `DTEND` | `DTSTART` + 4 giờ |
| `SUMMARY` | `Hẹn hò cùng {from}` |
| `LOCATION` | Tên và địa chỉ điểm đến đầu tiên (bỏ địa chỉ nếu là link) |
| `DESCRIPTION` | Các dòng `{time} {name}` |
| `UID` | `{timestamp}@invite` |

Không có nhắc nhở (`VALARM`). Mỗi thiết bị xử lý file khác nhau:
- iPhone Safari: thường hiện ngay bảng "Thêm vào Lịch".
- PC: tải file về, phải tự mở.
- Android: tuỳ máy.
- Trình duyệt trong Messenger hoặc Zalo: có thể chặn tải file.

[Unverified] Cách xử lý theo từng thiết bị ở trên dựa trên hiểu biết chung, chưa thử trên máy thật.

## 6. Footer
"{from} & {to}" cỡ chữ nhỏ, có khoảng đệm cho tai thỏ (`env(safe-area-inset-bottom)`).

## 7. Lớp nổi

### Ảnh nền (`.backdrop`)
- Lớp `position: fixed` với `z-index: -1`. Dùng `fixed` thay cho `background-attachment: fixed` vì cách sau bị giật trên iOS.
- `::before` là ảnh (`background-size: cover`, `filter: blur(var(--blur))`, mở rộng ra ngoài `2 × blur` để mép không bị nhạt). `::after` là lớp màu nền theme với `opacity: var(--dim)`.
- Khi hiện: ảnh phóng nhẹ từ 1.08 về 1 trong 2.6s, mờ dần vào trong 1.2s.
- Phong thư dùng đúng các lớp này, nên lúc phong thư tan, nền không đổi.
- **Điểm lấy nét và phóng to:** `background-position` và `transform-origin` = (`bgX`%, `bgY`%), `transform: scale(bgZoom/100)`.
- **Kích thước ảnh tải về:** ảnh Unsplash có `w = ceil(innerWidth × devicePixelRatio / 480) × 480`, tối đa 2400. Có làm mờ thì chia 960 (nửa độ phân giải, vì chi tiết đã bị mờ đi).
- Ảnh được `decode()` xong mới gán, nên không có cảnh ảnh hiện từng phần.

### Thanh tiến độ (`.progress`)
Vạch 2px màu nhấn ở mép trên, dài theo phần đã cuộn. Thuần CSS (`animation-timeline: scroll(root)`), nằm trong `@supports`. Trình duyệt chưa hỗ trợ thì không hiện.

### Gợi ý cuộn (`.cue`)
- Chữ "Cuộn xuống" kèm vạch dọc có đoạn sáng chạy lặp lại mỗi 2s, ở giữa đáy màn hình.
- Hiện 1.4s sau khi mở thư, **chỉ khi** `scrollY < 40` và trang còn nội dung bên dưới. Trạng thái được tính lại mỗi lần cuộn, nên không thể kẹt lại.
  - Lỗi cũ: gợi ý chỉ ẩn một lần, nếu cuộn trước khi nó hiện thì nó nằm đè lên footer.
- Bấm vào thì cuộn mượt tới section thứ 2.

### Thanh cuộn overlay (`.sb`)
- Thanh cuộn gốc bị ẩn (`scrollbar-width: none` và `::-webkit-scrollbar { display: none }`). Lý do: thanh gốc trên Windows chiếm khoảng 10px bề ngang, nên khi phong thư mở khoá cuộn, cả trang co lại 10px (đã đo trên Chrome thật: 1000px → 990px).
- Thay bằng một thanh tự vẽ 4px nằm đè lên trang:
  - Cao bằng `max(40px, vh² / scrollHeight)`, vị trí đặt bằng `transform`, cập nhật tối đa một lần mỗi khung hình.
  - Hiện khi cuộn, đứng yên 1.2s thì mờ đi.
  - Rê chuột vào thì hiện và rộng lên 6px. Kéo được (`setPointerCapture`).
  - Ẩn khi trang không đủ dài để cuộn hoặc khi phong thư đang khoá cuộn.

## 8. Chuyển động giảm (`prefers-reduced-motion: reduce`)
- Mọi transition còn 0.01ms, không có độ trễ: nội dung hiện ngay.
- Không có khói và bụi, không dùng View Transition, vạch của gợi ý cuộn đứng yên.
- Nút từ chối vẫn né hoặc biến mất (đó là chức năng), chỉ không có animation.

## 9. Hiệu năng (đã áp dụng)
- Chỉ animate `opacity`, `transform`, `filter`. Không animate `width`, `height` hay `top`.
- Sự kiện cuộn là `passive`. Thanh cuộn overlay gom cập nhật qua `requestAnimationFrame`.
- Không thư viện JS. Một request font (`display=swap`), có `preconnect` tới Google Fonts và `api.github.com`.
- Bố cục không nhảy: hai trạng thái Hồi đáp chồng trong một ô grid, ô đếm ngược dùng `tabular-nums`. CLS đo bằng 0.
- Nút từ chối khi bị xoá không để lại phần tử nào; hạt khói và bụi tự xoá.
