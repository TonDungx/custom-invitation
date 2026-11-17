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

## Header (trang form)

| Thành phần | Chức năng |
|---|---|
| Chấm và chữ trạng thái | **Đã lưu** (chấm xanh): form khớp bản đã lưu. **Chưa lưu** (chấm vàng): có thay đổi. **Đang lưu…**. **Lỗi khi lưu** (đỏ). |
| Mở trang | Mở link thiệp **đã lưu** trong tab mới (không phải bản đang sửa). |
| Ô chọn thiệp | Các thiệp của tài khoản (tên người nhận · tiêu đề). Đổi thiệp khi còn thay đổi chưa lưu thì hỏi xác nhận. |
| Sao chép link | Chép link thiệp **kèm mã khoá** `…/custom-invitation/?i=<mã thiệp>#k=<khoá>`. Chỉ ai có đúng link này mới xem được nội dung; người nhận **không cần đăng nhập**. Nếu còn thay đổi chưa lưu, thông báo sẽ nhắc bấm Áp dụng. |
| Áp dụng | Lưu thiệp (đã mã hoá) vào Firestore. Chỉ bấm được khi có thay đổi. Phím tắt: **Ctrl+S** (Mac: **Cmd+S**). |
| Nút tròn (chữ cái đầu) | Menu tài khoản: email, **Thiệp mới**, **Nhập thiệp cũ (từ GitHub)** (chỉ hiện khi repo còn `config.json` cũ), **Xoá thiệp này**, **Đăng xuất**. |

Đóng hoặc tải lại trang khi còn thay đổi chưa lưu thì trình duyệt sẽ hỏi xác nhận.

## Các mục

### Lời mời
- **Gửi đến, Ký tên:** tên hai người.
- **Tiêu đề:** dòng chữ lớn đầu thư. Tiêu đề hiện lần lượt từng chữ, nên câu ngắn 4–8 chữ trông đẹp nhất.
- **Lời nhắn:** đoạn văn. **Enter** để xuống dòng, xuống dòng được giữ nguyên trên thiệp.

- **Bố cục trang lời nhắn:** *Bố cục mẫu* (như cũ) hoặc *Tự thiết kế (kéo thả)*. Chọn Tự thiết kế thì hiện nút **Mở trình thiết kế ↗**, và mục **Thiết kế ↗** trong mục lục.

### Trang thiết kế (`/admin/design`, tab riêng)
Mở bằng nút **Mở trình thiết kế ↗**, hoặc vào thẳng `https://tondungx.github.io/custom-invitation/admin/design`.

- Trang thiết kế hiển thị đúng như thiệp thật (theme, font, ảnh nền, lớp phủ), lấy theo **cấu hình đã lưu**. Muốn thấy nội dung vừa sửa ở form thì bấm Áp dụng ở form trước. Quay lại tab thiết kế, nội dung tự cập nhật.
- Header có: **← Cấu hình** (về form), trạng thái, **Xem thử ↗** (mở thiệp với thiết kế chưa lưu trong tab mới), **Áp dụng** (Ctrl+S).
- **Áp dụng ở trang thiết kế** chỉ lưu bố cục và tự bật chế độ Tự thiết kế. **Áp dụng ở form** lưu phần còn lại và giữ nguyên thiết kế. Hai trang không xoá thay đổi của nhau.
- Lần đầu mở (chưa có thiết kế), trang tạo sẵn 5 khối giống bố cục mẫu, trạng thái "Chưa lưu".

**Thanh công cụ:**

| Nút | Chức năng |
|---|---|
| Dọc / Ngang | Chuyển giữa bản cho điện thoại (390×844) và bản cho laptop, PC (1440×900). Mỗi bản lấp đầy màn hình người xem. |
| + Thêm… | Thêm khối thông tin (Lời chào, Tên người nhận, Tiêu đề, Lời nhắn, Chữ ký, Ngày, Thứ & giờ), Chữ tự do, **Ảnh…** (chọn file, nén và mã hoá rồi tải lên), **Đường kẻ**, **Khung**, **Vòng tròn** |
| Bố cục mẫu… | **Cổ điển · đối xứng**, **Tạp chí · lệch trái** (lề trái 8%, chữ ký ở một phần ba bên phải), **Tỷ lệ vàng · có khung** (tiêu đề và lời nhắn ở đường 38.2% / 61.8%). Thay toàn bộ bản đang mở, hoàn tác được. |
| ⅓ | Lưới một phần ba (xanh), bật mặc định |
| φ | Đường tỷ lệ vàng 38.2% / 61.8% (vàng) |
| Lề | Lề an toàn 8% (đỏ nhạt), bật mặc định. Nên giữ chữ bên trong lề. |
| ↶ ↷ | Hoàn tác, làm lại (Ctrl+Z, Ctrl+Shift+Z hoặc Ctrl+Y), tối đa 100 bước |

**Thao tác trên trang:**
- **Kéo phần tử** để di chuyển. Phần tử tự hít (trong 6px) vào: đường tâm, các đường gióng đang bật, mép trái, tâm, mép phải, mép trên, mép dưới của phần tử khác. Vạch hồng hiện ra khi hít. **Giữ Alt** để kéo tự do.
- **Tay nắm hai bên:** đổi bề ngang, mép đối diện đứng yên. Ảnh và khung có thêm **tay nắm trên/dưới** để đổi chiều cao. Đường kẻ chỉ có tay nắm hai bên. Vòng tròn chỉ có 4 góc (giữ tròn).
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

- **Thông báo qua email:** dán link Web App của Google Apps Script, tuỳ chọn **Báo cả khi người ấy mở thiệp**, bấm **Gửi thử** để kiểm tra. Hướng dẫn cài: [notifications.md](notifications.md).
- **Link nhắn lại:** hiện thành nút sau khi người ấy bấm đồng ý. Ví dụ `https://m.me/<username>` (Messenger), link Zalo, `sms:0901234567`. Để trống thì ẩn.
- **Chữ trên nút nhắn.**

### Phong cách
- **Bảng màu:** Ivory, Noir, Sage, Blush. Mỗi ô có chấm màu chia đôi: nền và màu nhấn.
- **Kiểu thiệp:** Tối giản, Cổ điển, Tạp chí, Lãng mạn, Vui tươi, Đáng yêu. Khác nhau về bố cục, font, hoạ tiết, nút và hiệu ứng; dùng được với mọi bảng màu. Đổi kiểu thì font tiêu đề tự về "Theo kiểu thiệp".
- **Font tiêu đề:** "Theo kiểu thiệp" (mặc định) hoặc chọn riêng: Cormorant, Playfair, Lora, Old Standard, Bricolage, Baloo, Mali. Mỗi ô hiển thị bằng chính font đó.
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
- **Dọn ảnh không dùng:** liệt kê ảnh của thiệp đang mở, giữ lại ảnh mà bản đã lưu hoặc form đang sửa còn dùng (ảnh nền, ảnh trong trang thiết kế), hỏi xác nhận rồi xoá phần còn lại. Có ảnh mới ở trang Thiết kế chưa Áp dụng thì Áp dụng ở đó trước.

## Tài khoản và thiệp

- **Đăng nhập:** mở `/admin` → **Đăng nhập bằng Google**. Ai có tài khoản Google cũng đăng ký được; mỗi người chỉ thấy và sửa thiệp của mình (Firestore Rules chặn ở server).
- **Lần đầu:** tài khoản chưa có thiệp thì tự tạo một thiệp mẫu. Nếu repo còn `config.json` cũ, trang hỏi có **nhập thiệp cũ** không (xem [firebase-setup.md](firebase-setup.md#5-chuyển-thiệp-cũ-vào-tài-khoản)).
- **Nhiều thiệp:** menu tài khoản → **Thiệp mới**; đổi thiệp bằng ô chọn ở header. Link admin có dạng `/admin/?i=<mã thiệp>`.
- **Xoá thiệp:** menu → **Xoá thiệp này**: xoá thiệp, ảnh và link cũ trỏ tới nó. Link đã gửi không mở được nữa.
- Chưa cấu hình Firebase (`firebase-config.js` trống) thì admin chỉ hiện hướng dẫn cài đặt.

## Mã khoá (riêng tư)

- Nội dung thiệp và ảnh được **mã hoá trên trình duyệt** trước khi lưu. Firestore (và Google) chỉ giữ dữ liệu không đọc được.
- Mỗi thiệp có một khoá riêng, tạo tự động. Khoá nằm trong link mà **Sao chép link** tạo ra (đoạn `#k=…`) và trong tài khoản của bạn (`users/{uid}`, chỉ bạn đọc được), nên đăng nhập ở máy nào cũng mở được.
- **Chưa mở khoá** (tài khoản không có khoá của thiệp) thì nút Áp dụng bị khoá, để không ghi đè nội dung thật.

## Lưu (Áp dụng)

1. Bấm **Áp dụng** hoặc **Ctrl+S**.
2. Admin đọc bản mới nhất, gộp phần của trang này, mã hoá, rồi ghi có điều kiện "chưa ai ghi xen giữa" (Firestore `:commit` + `updateTime`). Có người ghi xen thì đọc lại và gộp lại (tối đa 3 lần).
3. Thông báo "Đã lưu (đã mã hoá)." Trang thiệp thấy nội dung mới **ngay** (không còn cache CDN như bản lưu trong repo).

## Tải ảnh từ máy

1. Bấm **Tải ảnh từ máy** hoặc kéo thả ảnh vào mục Ảnh nền.
2. Kiểm tra: phải là ảnh, ≤ 25MB.
3. Nén ngay trên máy: cạnh dài tối đa 2400px, WebP 82% (JPEG nếu trình duyệt không hỗ trợ WebP). Ảnh quá chi tiết thì tự nén nhỏ dần (1800, 1400, 1000px) cho tới khi < 1 MB, vì mỗi ảnh là một document Firestore.
4. Mã hoá rồi lưu vào `invites/<mã thiệp>/photos/<mã ảnh>`; ô ảnh nhận giá trị `fs:<mã ảnh>`, trạng thái chuyển **Chưa lưu**.
5. **Bấm Áp dụng** để thiệp dùng ảnh này.

## Xem trước

- Khung điện thoại hiển thị **bản đang sửa** (chưa lưu), cập nhật 0.2 giây sau mỗi lần gõ.
- Đã bấm "Mở thư" trong khung thì những lần sửa sau không hiện lại phong thư.
- **Xem lại hiệu ứng:** tải lại khung xem trước để xem lại toàn bộ hiệu ứng mở đầu.
