# Hướng dẫn trang cấu hình (`/admin`)

Mở `https://tondungx.github.io/custom-invitation/admin`. Gõ `/admin` hay `/admin/` đều được: trang tự chuyển sang có dấu `/` để các đường dẫn tương đối hoạt động.

## Bố cục

```
┌ Header ─────────────────────────────────────────────────────────────────┐
│ Thiệp mời · cấu hình      ● Đã lưu   MỞ TRANG   SAO CHÉP LINK   ÁP DỤNG  │
├──────────────┬──────────────────────────────────┬───────────────────────┤
│ Mục lục      │ Form                             │ Xem trước (điện thoại)│
│  Lời mời     │  Lời mời                         │  ┌─────────┐          │
│  Thời gian   │  Thời gian                       │  │ iframe  │          │
│  Lịch trình  │  Lịch trình                      │  │ trang   │          │
│  Hồi đáp     │  Hồi đáp                         │  │ thiệp   │          │
│  Phong cách  │  Phong cách                      │  └─────────┘          │
│  Ảnh nền     │  Ảnh nền                         │                       │
│ KẾT NỐI GITHUB│                                 │                       │
└──────────────┴──────────────────────────────────┴───────────────────────┘
```

- **≥ 1200px:** 3 cột như trên.
- **960–1200px:** mục lục thành một hàng ngang dính dưới header; form và xem trước 2 cột.
- **< 960px:** một cột, xem trước nằm cuối trang.
- **< 640px:** ẩn chữ "· cấu hình", chữ trạng thái và nút "Mở trang" để header vừa màn hình.

## Header

| Thành phần | Chức năng |
|---|---|
| Chấm và chữ trạng thái | **Đã lưu** (chấm xanh): form khớp bản đã lưu. **Chưa lưu** (chấm vàng): có thay đổi. **Đang lưu…**. **Lỗi khi lưu** (đỏ). |
| Mở trang | Mở link thiệp **đã lưu** trong tab mới (không phải bản đang sửa). |
| Sao chép link | Chép `https://tondungx.github.io/custom-invitation/`. Nếu còn thay đổi chưa lưu, thông báo sẽ nhắc bấm Áp dụng. |
| Áp dụng | Lưu vào `config.json` trong repo. Chỉ bấm được khi có thay đổi. Phím tắt: **Ctrl+S** (Mac: **Cmd+S**). |

Đóng hoặc tải lại trang khi còn thay đổi chưa lưu thì trình duyệt sẽ hỏi xác nhận.

## Các mục

### Lời mời
- **Gửi đến, Ký tên:** tên hai người.
- **Tiêu đề:** dòng chữ lớn đầu thư. Tiêu đề hiện lần lượt từng chữ, nên câu ngắn 4–8 chữ trông đẹp nhất.
- **Lời nhắn:** đoạn văn. **Enter** để xuống dòng, xuống dòng được giữ nguyên trên thiệp.

- **Bố cục trang lời nhắn:** *Bố cục mẫu* (như cũ) hoặc *Tự thiết kế (kéo thả)*. Chọn Tự thiết kế thì hiện mục **Thiết kế** ngay bên dưới và trong mục lục.

### Thiết kế (chế độ Tự thiết kế)
Trang thiết kế hiển thị đúng như thiệp thật (theme, font, ảnh nền, lớp phủ). Nội dung vẫn sửa ở mục Lời mời và Thời gian, trang thiết kế tự cập nhật.

**Thanh công cụ:**

| Nút | Chức năng |
|---|---|
| Dọc / Ngang | Chuyển giữa bản cho điện thoại (390×844) và bản cho laptop, PC (1440×900). Mỗi bản lấp đầy màn hình người xem. |
| + Thêm… | Thêm khối thông tin (Lời chào, Tên người nhận, Tiêu đề, Lời nhắn, Chữ ký, Ngày, Thứ & giờ) hoặc Chữ tự do, đặt ở giữa trang |
| ⅓ | Lưới một phần ba (xanh), bật mặc định |
| φ | Đường tỷ lệ vàng 38.2% / 61.8% (vàng) |
| Lề | Lề an toàn 8% (đỏ nhạt), bật mặc định. Nên giữ chữ bên trong lề. |
| ↶ ↷ | Hoàn tác, làm lại (Ctrl+Z, Ctrl+Shift+Z hoặc Ctrl+Y), tối đa 100 bước |

**Thao tác trên trang:**
- **Kéo phần tử** để di chuyển. Phần tử tự hít (trong 6px) vào: đường tâm, các đường gióng đang bật, mép trái, tâm, mép phải, mép trên, mép dưới của phần tử khác. Vạch hồng hiện ra khi hít. **Giữ Alt** để kéo tự do.
- **Tay nắm hai bên:** đổi bề ngang, mép đối diện đứng yên.
- **Tay nắm 4 góc:** phóng to, thu nhỏ cả cỡ chữ lẫn bề ngang quanh tâm.
- **Chấm tròn phía trên:** xoay. Tự hít vào 0°, ±90°, ±180° (trong 3°). **Giữ Shift** để xoay theo bước 15°.
- **Bàn phím** (khi trang thiết kế đang được chọn): mũi tên dịch 0.5% (Shift: 5%), Delete xoá, Ctrl+D nhân bản, Esc bỏ chọn.

**Bảng thuộc tính** (khi chọn một phần tử): nội dung, font (tiêu đề hoặc thân bài), màu (chữ chính, chữ phụ, màu nhấn), cỡ chữ, **thang tỷ lệ** (1.25 / 1.333 / 1.618), **cỡ gợi ý theo thang** (bấm để chọn, gốc 16px; thang vàng: 6.1, 9.9, 16, 25.9, 41.9, 67.8…), bề ngang, góc xoay, giãn chữ, giãn dòng, độ đậm, căn lề, nghiêng, in hoa; các nút Căn giữa ngang, Đưa lên, Đưa xuống, Nhân bản, Xoá.

**Bản ngang:** lúc đầu trống, màn hình ngang sẽ hiện bản dọc ở giữa đúng tỷ lệ. Bấm **Tạo bản ngang từ bản dọc** để sao chép (cỡ được nhân 900/844 để giữ nhịp dọc), rồi kéo lại cho hợp khổ ngang.

**Gợi ý bố cục đẹp:**
- Đặt điểm nhấn (tên, tiêu đề) tại giao điểm lưới một phần ba hoặc đường tỷ lệ vàng.
- Dùng 2–3 cỡ chữ cạnh nhau trên cùng một thang, ví dụ thang vàng 16 / 25.9 / 41.9.
- Giữ mọi chữ trong lề an toàn 8%.
- Để trống khoảng 10% phía dưới cho gợi ý "Cuộn xuống".

### Thời gian
Ô chọn ngày giờ của trình duyệt. Giờ tính theo máy người xem, không có múi giờ.

### Lịch trình
Mỗi điểm đến là một thẻ:
- **Giờ, Tên quán, Ghi chú.**
- **Google Maps:** gõ địa chỉ (tự tạo link tìm kiếm) hoặc dán link Google Maps.
- **Facebook:** link trang hoặc chỉ tên trang (`nhahangsen`).
- **Instagram:** link hoặc `@ten` hoặc `ten`.
- Nút **✕** để xoá điểm đến. **+ Thêm điểm đến** để thêm (con trỏ nhảy vào ô Giờ của dòng mới).
- Dòng để trống cả Giờ lẫn Tên sẽ bị bỏ khi lưu.

### Hồi đáp
- **Câu hỏi, Nút đồng ý, Lời cảm ơn.**
- **Nút từ chối:** chữ trên nút. Bị khoá khi chọn "Ẩn nút".
- **Khi bấm nút từ chối:** chọn hành vi, có dòng mô tả ngay dưới:

  | Lựa chọn | Hành vi |
  |---|---|
  | Né tránh | Rê chuột hoặc chạm vào là nút nhảy chỗ khác |
  | Bốc khói | Nóng dần và bốc khói, lần bấm thứ 4 thì cháy mất |
  | Bốc hơi | Bấm một lần là tan thành bụi |
  | Ẩn nút | Chỉ có nút đồng ý |

- **Link nhắn lại:** hiện thành nút sau khi người ấy bấm đồng ý. Ví dụ `https://m.me/<username>` (Messenger), link Zalo, `sms:0901234567`. Để trống thì ẩn.
- **Chữ trên nút nhắn.**

### Phong cách
- **Bảng màu:** Ivory, Noir, Sage, Blush. Mỗi ô có chấm màu chia đôi: nền và màu nhấn.
- **Font tiêu đề:** Cormorant, Playfair, Lora. Mỗi ô hiển thị bằng chính font đó.
- **Hiện phong thư mở đầu:** bật/tắt màn "Mở thư".

### Ảnh nền
- **Ô ảnh:** Không, 7 ảnh gợi ý, Tuỳ chỉnh.
- **Tuỳ chỉnh:** hiện ô "Link ảnh (https)". Ô ảnh Tuỳ chỉnh tự hiển thị ảnh thu nhỏ của link đó.
- **Tải ảnh từ máy:** bấm nút hoặc **kéo thả ảnh vào khung mục Ảnh nền** (khung có viền nét đứt khi kéo vào). Xem chi tiết bên dưới.
- **Độ phủ màu nền (0–95%):** càng cao chữ càng dễ đọc, ảnh càng chìm. Nên để 60–80% cho ảnh nhiều chi tiết.
- **Làm mờ (0–100%):** 0% là nét. 20–50% cho cảm giác mềm, sang.
- **Điểm lấy nét:** kéo chấm trên ảnh nhỏ tới phần ảnh muốn giữ khi màn hình cắt bớt ảnh (ví dụ ngọn nến).
- **Phóng to (100–300%):** phóng ảnh quanh điểm lấy nét.
- Các thanh trượt và điểm lấy nét bị khoá khi chọn "Không".

## Kết nối GitHub (lần đầu)

Nút Áp dụng và Tải ảnh ghi vào repo, nên cần một **fine-grained personal access token**:

1. Mở https://github.com/settings/personal-access-tokens/new
2. **Token name:** tuỳ ý, ví dụ `custom-invitation admin`.
3. **Expiration:** tuỳ chọn. Hết hạn thì tạo lại.
4. **Repository access:** *Only select repositories*, chọn `custom-invitation`.
5. **Permissions → Repository permissions → Contents:** *Read and write*. Không cần quyền nào khác.
6. Bấm **Generate token** và copy.
7. Trong admin, bấm **Áp dụng** (hoặc **Kết nối GitHub** ở thanh trái), dán vào ô **Token**. Ô **Repo** đã tự điền `tondungx/custom-invitation`.

Token lưu trong `localStorage` của trình duyệt đang dùng (key `invite-gh`). Đổi máy hoặc trình duyệt thì nhập lại. Muốn thu hồi: vào https://github.com/settings/personal-access-tokens, chọn token, **Revoke**.

> **Bảo mật:** token chỉ có quyền ghi nội dung **một repo này**. Mọi trang trên `tondungx.github.io` dùng chung một origin, nên các repo Pages khác của cùng tài khoản đọc được `localStorage` này. Đừng host code không tin cậy dưới cùng tài khoản.

## Lưu (Áp dụng)

1. Bấm **Áp dụng** hoặc **Ctrl+S**.
2. Admin gửi `PUT config.json` lên GitHub, tạo commit `chore: update invitation`.
3. Thông báo "Đã lưu. Link thiệp hiển thị nội dung mới sau khoảng 1 phút."
4. Trang thiệp đọc config qua GitHub API, nên thường thấy nội dung mới sau khoảng 1 phút. Nếu API bị giới hạn, trang dùng bản trên Pages, có thể chậm tới khoảng 10 phút.

Nếu ai đó (hoặc tab khác) vừa lưu trước, admin tự lấy phiên bản mới nhất và ghi đè. **Bản lưu sau thắng.**

## Tải ảnh từ máy

1. Bấm **Tải ảnh từ máy** hoặc kéo thả ảnh vào mục Ảnh nền.
2. Kiểm tra: phải là ảnh, ≤ 25MB. Chưa có token thì hỏi token.
3. Nén ngay trên máy: cạnh dài tối đa 2400px, WebP chất lượng 82% (JPEG nếu trình duyệt không hỗ trợ WebP). Ví dụ: PNG 3000×2000 từ 119 KB còn 8 KB.
4. Đẩy lên `uploads/<thời-điểm>.webp`, tạo commit `chore: upload background`.
5. Tự chọn **Tuỳ chỉnh** với link `https://raw.githubusercontent.com/<repo>/<commit>/uploads/…`, trạng thái chuyển **Chưa lưu**.
6. **Bấm Áp dụng** để thiệp dùng ảnh này.

Ảnh dùng được ngay, không phải chờ Pages build, vì link gắn với commit cụ thể. Ảnh nằm trong repo public. Ảnh cũ không tự xoá, xem cách dọn ở [deployment-and-ops.md](deployment-and-ops.md#dọn-ảnh-cũ).

## Xem trước

- Khung điện thoại hiển thị **bản đang sửa** (chưa lưu), cập nhật 0.2 giây sau mỗi lần gõ.
- Đã bấm "Mở thư" trong khung thì những lần sửa sau không hiện lại phong thư.
- **Xem lại hiệu ứng:** tải lại khung xem trước để xem lại toàn bộ hiệu ứng mở đầu.
