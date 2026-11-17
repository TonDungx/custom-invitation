# Cấu hình thiệp

> **Định dạng lưu:** mỗi thiệp là document Firestore `invites/{id}` = `{ owner: <uid>, v: 1, enc: "<base64url(iv 12 byte ‖ AES-GCM ciphertext)>", updated }`. Nội dung bên dưới là JSON **sau khi giải mã**. Khoá 256-bit (43 ký tự base64url) nằm trong link (`?i=<id>#k=<khoá>`), trong `users/{uid}.keys.<id>` (chỉ chủ đọc được) và `localStorage['invite-key:<id>']`. Ảnh: `invites/{id}/photos/{pid}` = `{ owner, data: bytes(iv ‖ ciphertext) }`, tham chiếu trong config là `"fs:<pid>"`. Xem [firebase-setup.md](firebase-setup.md).
>
> Trước khi có tài khoản, thiệp nằm ở `config.json` + `uploads/` trong repo (cùng cách mã hoá). Trang thiệp vẫn đọc file đó cho link cũ `…/#k=` cho tới khi thiệp được nhập vào tài khoản.

Nguồn định nghĩa duy nhất là object `DEFAULT` trong [`shared.js`](../shared.js). File `config.json` chỉ cần chứa các trường khác mặc định. Khi đọc, cấu hình luôn được merge `{ ...DEFAULT, ...config }`, nên trường thiếu sẽ lấy giá trị mặc định.

## Bảng trường

### Nội dung lời mời
| Trường | Kiểu | Mặc định | Ô trong admin | Hiển thị ở đâu |
|---|---|---|---|---|
| `to` | string ≤ 40 | `"Em"` | Lời mời → Gửi đến | Tên lớn trên phong thư, "Gửi {to},", footer, tiêu đề tab "Gửi {to}" |
| `from` | string ≤ 40 | `"Anh"` | Lời mời → Ký tên | Chữ ký "— {from}", footer, tiêu đề sự kiện lịch "Hẹn hò cùng {from}" |
| `title` | string ≤ 80 | `"Một buổi tối, chỉ hai chúng mình"` | Lời mời → Tiêu đề | Tiêu đề lớn của thư, hiện từng chữ |
| `message` | string ≤ 600, có xuống dòng | 2 câu mẫu | Lời mời → Lời nhắn | Đoạn văn dưới tiêu đề (`white-space: pre-line`, giữ xuống dòng) |

### Thời gian
| Trường | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `date` | string `YYYY-MM-DDTHH:mm` | `"2026-11-21T19:00"` | **Giờ địa phương, không có múi giờ.** Đếm ngược và file lịch dùng giờ trên máy người xem. Ngày không hợp lệ thì ẩn phần Thời gian, nút lịch và ngày trên phong thư. |

### Lịch trình
`stops`: mảng các điểm đến, theo thứ tự hiển thị. Mảng rỗng thì ẩn cả phần Lịch trình. Admin bỏ các dòng trống cả tên lẫn giờ.

| Trường con | Kiểu | Ví dụ | Hiển thị |
|---|---|---|---|
| `time` | string `HH:mm` | `"19:00"` | Cột giờ bên trái |
| `name` | string ≤ 60 | `"Quán B"` | Tên lớn |
| `note` | string ≤ 80 | `"Bữa tối"` | Dòng phụ màu nhạt (ẩn nếu trống) |
| `address` | string ≤ 300 | `"12 Lý Thái Tổ, Hà Nội"` hoặc link Maps | Biểu tượng ghim, mở Google Maps. Chữ thì thành link tìm kiếm, link thì dùng nguyên. |
| `facebook` | string ≤ 200 | `"https://facebook.com/quanb"`, `"quanb"` | Biểu tượng Facebook |
| `instagram` | string ≤ 200 | `"@quanb"` | Biểu tượng Instagram |

Ba biểu tượng chỉ hiện khi có dữ liệu. Không có cái nào thì không có hàng biểu tượng.

### Hồi đáp
| Trường | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `ask` | string ≤ 60 | `"Em sẽ đến chứ?"` | Câu hỏi lớn |
| `accept` | string ≤ 30 | `"Em đồng ý"` | Nút đồng ý (nền đặc) |
| `decline` | string ≤ 30 | `"Để em nghĩ đã"` | Nút từ chối (viền mảnh). Chuỗi rỗng thì ẩn nút. |
| `declineMode` | `"dodge" \| "smoke" \| "vanish" \| "off"` | `"dodge"` | Hành vi nút từ chối, xem [invite-page.md](invite-page.md#5-hồi-đáp). `off` thì ẩn nút. |
| `thanks` | string ≤ 80 | `"Hẹn gặp em nhé."` | Hiện sau khi bấm đồng ý |
| `reply` | URL | `""` | Nút "nhắn lại" sau khi đồng ý. Chỉ nhận `http(s)`, `sms:`, `tel:`, `mailto:`. Rỗng hoặc không hợp lệ thì ẩn. |
| `replyLabel` | string ≤ 30 | `"Nhắn cho anh"` | Chữ trên nút nhắn lại |
| `notifyUrl` | URL | `""` | Link Web App Google Apps Script (chỉ nhận `https://script.google.com/macros/s/…/exec`). Rỗng = tắt thông báo. Xem [notifications.md](notifications.md). |
| `notifyOpen` | boolean | `false` | Báo cả khi người ấy mở thiệp (mỗi tab 1 lần) |

### Phong cách
| Trường | Kiểu | Mặc định | Giá trị |
|---|---|---|---|
| `theme` | string | `"ivory"` | `ivory`, `noir`, `sage`, `blush` (xem [design-system.md](design-system.md)). Sai giá trị thì dùng `ivory`. |
| `style` | string | `"minimal"` | `minimal`, `vintage`, `editorial`, `romance`, `playful`, `cute` (xem [design-system.md](design-system.md#kiểu-thiệp-styles)). Thiếu hoặc sai → `minimal` (config cũ giữ nguyên giao diện). |
| `font` | string | `"auto"` | `auto` (= font của kiểu thiệp), `cormorant`, `playfair`, `lora`, `oldstandard`, `bricolage`, `baloo`, `mali`. Sai giá trị thì dùng font của kiểu thiệp. Admin đặt lại `auto` khi đổi kiểu thiệp. |
| `intro` | boolean | `true` | Hiện phong thư "Mở thư" trước khi vào trang |

### Ảnh nền
| Trường | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `bg` | string | `""` | `""` = không ảnh. `"enc:https://raw.githubusercontent.com/…/uploads/x.bin"` = ảnh tải lên đã mã hoá. Key preset: `candles`, `candle`, `bokeh`, `city`, `wine`, `flowers`, `still`. Hoặc một URL `https://…` (link tự dán hoặc ảnh tải lên). URL không phải `http(s)` bị bỏ qua. |
| `bgDim` | number 0–95 | `70` | % lớp màu nền theme phủ lên ảnh. Bị giới hạn trong khoảng 0–95. |
| `bgBlur` | number 0–100 | `0` | % độ mờ. 100% = 24px. 0 = không mờ. |

| `bgX`, `bgY` | number 0–100 | `50`, `50` | Điểm lấy nét của ảnh nền (%), dùng làm `background-position` và tâm phóng to |
| `bgZoom` | number 100–300 | `100` | % phóng to ảnh nền quanh điểm lấy nét |

### Bố cục tự do (`layout`)
`null` (mặc định) = bố cục mẫu. Khi người dùng chọn "Tự thiết kế":

```jsonc
"layout": {
  "mode": "free",                   // "template": vẫn giữ thiết kế nhưng hiển thị bố cục mẫu
  "portrait":  { "items": [ … ] },  // bản dọc, màn hình chuẩn 390×844
  "landscape": { "items": [ … ] }   // bản ngang, chuẩn 1440×900; null = màn ngang hiện bản dọc ở giữa
}
```

Mỗi phần tử trong `items` (thứ tự trong mảng = thứ tự lớp, phần tử sau nằm trên):

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | string | Định danh duy nhất |
| `type` | `"field"`, `"text"`, `"image"`, `"shape"` | `field` lấy nội dung từ form, `text` là chữ tự do, `image` là ảnh, `shape` là hoạ tiết |
| `src` | string | Khi `type = "image"`: `enc:https://raw…/uploads/x.bin` (ảnh đã mã hoá) hoặc link `https` |
| `shape` | `"line"`, `"frame"`, `"circle"` | Khi `type = "shape"` |
| `h` | number (px thiết kế) | Chiều cao của ảnh và khung |
| `t` | number (px thiết kế) | Độ dày nét của hoạ tiết |
| `rad` | number (px thiết kế) | Bo góc của ảnh và khung |
| `field` | `greeting`, `to`, `title`, `message`, `sign`, `date`, `when` | Khi `type = "field"`: Lời chào ("Gửi {to},"), Tên người nhận, Tiêu đề, Lời nhắn, Chữ ký ("— {from}"), Ngày ("dd · mm · yyyy"), Thứ & giờ |
| `text` | string | Khi `type = "text"`. Có xuống dòng. |
| `cx`, `cy` | number (%) | **Tâm** phần tử theo % chiều rộng và chiều cao màn hình (−50 đến 150) |
| `w` | number (px thiết kế) | Bề ngang. Chiều cao tự theo nội dung. |
| `fs` | number (px thiết kế) | Cỡ chữ |
| `rot` | number (độ) | Góc xoay quanh tâm |
| `font` | `"display"` hoặc `"body"` | Font tiêu đề (theo cấu hình `font` / kiểu thiệp) hoặc font thân bài của kiểu thiệp |
| `color` | `"fg"`, `"muted"`, `"accent"` | Màu theo theme (không dùng mã màu cố định, để đổi theme vẫn hợp) |
| `align` | `"left"`, `"center"`, `"right"` | Căn lề |
| `italic`, `caps` | boolean | Nghiêng, in hoa |
| `ls` | number (em) | Giãn chữ, 0–0.5 |
| `lh` | number | Giãn dòng, 0.8–2.4 |
| `op` | number (%) | Độ đậm, 10–100 |

**Đơn vị "px thiết kế":** khi hiển thị, 1 px thiết kế = `min(rộng màn hình / 390, cao màn hình / 844)` (bản ngang: 1440 và 900). Mọi giá trị được giới hạn và lọc theo danh sách cho phép trong `itemStyle()` trước khi đưa vào CSS.

**Ảnh preset** (Unsplash License, miễn phí):

| Key | Nhãn | Unsplash photo id | Gợi ý theme |
|---|---|---|---|
| `candles` | Nến | `1694588062461-ea9a4f732a87` | noir |
| `candle` | Ánh nến | `1695041404407-e1afde845b33` | noir |
| `bokeh` | Phố đêm | `1625941834008-9e0c5b3b69f7` | noir |
| `city` | Đèn phố | `1432847712612-926caafaa802` | noir |
| `wine` | Ly vang | `1651346219435-47ec8267940f` | noir, ivory |
| `flowers` | Hoa khô | `1649615644692-b26f39484243` | ivory, blush |
| `still` | Tĩnh vật | `1755401679272-c2e026885af4` | ivory, sage |

## Ví dụ `config.json` đầy đủ

```json
{
  "to": "Linh",
  "from": "Minh",
  "title": "Một năm, và một buổi tối",
  "message": "Nhân dịp sinh nhật em, cũng là tròn một năm của chúng mình,\nanh muốn dành trọn một buổi tối chỉ cho em.",
  "date": "2026-12-24T19:30",
  "ask": "Em sẽ đến chứ?",
  "accept": "Em đồng ý",
  "decline": "Để em nghĩ đã",
  "thanks": "Hẹn gặp em nhé.",
  "reply": "https://m.me/username",
  "replyLabel": "Nhắn cho anh",
  "theme": "noir",
  "font": "cormorant",
  "intro": true,
  "declineMode": "smoke",
  "bg": "candles",
  "bgDim": 70,
  "bgBlur": 20,
  "stops": [
    { "time": "19:30", "name": "Nhà hàng Sen", "note": "Bữa tối", "address": "12 Lý Thái Tổ, Hà Nội", "facebook": "nhahangsen", "instagram": "@nhahangsen" },
    { "time": "21:30", "name": "Quán C", "note": "Cà phê & trò chuyện", "address": "", "facebook": "", "instagram": "" }
  ]
}
```

## Thêm một trường cấu hình mới (quy trình)

1. Thêm vào `DEFAULT` trong `shared.js`, kèm comment nếu có giới hạn giá trị.
2. **Admin:** thêm ô nhập vào form.
   - Trường chữ: thêm `name` vào mảng `TEXT`, `fill`/`read` tự xử lý.
   - Radio, checkbox, số: thêm dòng vào `fill()` và `read()`.
3. **Trang thiệp:** dùng `cfg.<trường>` trong `render()`. Chữ người dùng nhập luôn qua `esc()`, link luôn qua `safeUrl()`.
4. Cập nhật bảng trong file này.
5. Thêm assert vào [`check.mjs`](../check.mjs) nếu trường có logic (nhánh, URL, giới hạn giá trị).

Không cần migration: config cũ thiếu trường mới sẽ lấy giá trị `DEFAULT`.
