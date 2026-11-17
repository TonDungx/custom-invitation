# Cấu hình (`config.json`)

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

### Phong cách
| Trường | Kiểu | Mặc định | Giá trị |
|---|---|---|---|
| `theme` | string | `"ivory"` | `ivory`, `noir`, `sage`, `blush` (xem [design-system.md](design-system.md)). Sai giá trị thì dùng `ivory`. |
| `font` | string | `"cormorant"` | `cormorant`, `playfair`, `lora`. Sai giá trị thì dùng `cormorant`. |
| `intro` | boolean | `true` | Hiện phong thư "Mở thư" trước khi vào trang |

### Ảnh nền
| Trường | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `bg` | string | `""` | `""` = không ảnh. Key preset: `candles`, `candle`, `bokeh`, `city`, `wine`, `flowers`, `still`. Hoặc một URL `https://…` (link tự dán hoặc ảnh tải lên). URL không phải `http(s)` bị bỏ qua. |
| `bgDim` | number 0–95 | `70` | % lớp màu nền theme phủ lên ảnh. Bị giới hạn trong khoảng 0–95. |
| `bgBlur` | number 0–100 | `0` | % độ mờ. 100% = 24px. 0 = không mờ. |

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
