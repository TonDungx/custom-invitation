# Hệ thống thiết kế

## Định hướng
- **Phong cách:** sang trọng, tối giản. Chữ có chân (serif) cỡ lớn kết hợp chữ không chân mảnh, vạch kẻ mảnh, nhiều khoảng trắng, một màu nhấn.
- **Tránh vẻ "do AI làm":** không gradient tím, không hiệu ứng kính mờ, không emoji làm biểu tượng, không icon lấp lánh, không đổ bóng dày. Biểu tượng là SVG nét mảnh cùng một bộ.
- **Nguồn:** hướng thiết kế lấy từ skill `ui-ux-pro-max`:
  - Phong cách: *Minimalism & Swiss Style*.
  - Cặp font gợi ý: *Cormorant / Montserrat*.
  - Ghi chú gợi ý: *Premium dark + gold accent*.
  - Chữ thân bài đổi sang **Be Vietnam Pro** vì font này được thiết kế cho tiếng Việt.

## Kiểu thiệp (styles)

Kiểu thiệp (`STYLES` trong `shared.js`, CSS trong `styles.css`, hoạ tiết/hiệu ứng trong `styles.js`) độc lập với bảng màu: 6 kiểu × 4 bảng màu đều dùng được. Mọi font đều có subset `vietnamese` trên Google Fonts; `check.mjs` kiểm tra lại khi chạy.

| Kiểu | Tham chiếu (skill ui-ux-pro-max) | Font tiêu đề / thân / chữ ký | Đặc trưng | Hiệu ứng |
|---|---|---|---|---|
| Tối giản `minimal` | Minimalism & Swiss | Cormorant / Be Vietnam Pro / Cormorant nghiêng | Như mô tả bên dưới | Chữ hiện từng từ |
| Cổ điển `vintage` | Vintage Analog (film grain) | Old Standard TT / Be Vietnam Pro / Dancing Script | Khung viền đôi + hình thoi, hoa văn góc ở bìa, vân hạt giấy, nút viền `double` | Nút "Mở thư" là dấu sáp, xoay và bung khi mở |
| Tạp chí `editorial` | Editorial Grid / Magazine | Bricolage Grotesque 800 / Be Vietnam Pro | Chữ rất lớn căn trái, đánh số 01–04, drop cap, số ngày khổng lồ; màn ≥ 900px chia cột nhãn + nội dung | Chữ trượt lên theo hàng |
| Lãng mạn `romance` | Cặp font thiệp cưới Great Vibes / Cormorant | Cormorant / Be Vietnam Pro / Great Vibes | Căn giữa, cành hoa line-art tự vẽ ra. Script chỉ cho tên, chữ ký, lời cảm ơn; thứ và giờ dùng Cormorant nghiêng cho dễ đọc | Cánh hoa rơi chậm; hoa bung khi đồng ý |
| Vui tươi `playful` | Neubrutalism | Baloo 2 / Nunito | Card viền 2.5px, bóng lệch cứng, bo nhẹ, nghiêng xen kẽ; tag đen chỉ ở bìa; số ngày trong hình tròn | Nút nảy (spring), confetti khi đồng ý |
| Đáng yêu `cute` | Claymorphism | Mali / Nunito | Nền chấm bi, card viền 3px bo 24px + viền trong kiểu đất sét, số ngày trong trái tim | Nút "Mở thư" hình tim đập; tim bay lên khi đồng ý |

**Quy tắc khi sửa/thêm kiểu (tránh vẻ "do AI làm"):**
- Chỉ dùng 5 token màu (và `color-mix` của chúng), không mã màu cố định. Chữ thân bài luôn trên nền `--bg`; chữ trên nền `--accent` luôn là `--bg` (≥ 4.5:1 theo bảng màu bên dưới).
- Không gradient trang trí, không kính mờ, không emoji, không icon lấp lánh. Hoạ tiết là SVG nét mảnh vẽ bằng `currentColor`.
- Không lặp một motif ở mọi nơi (vd. hàng 3 trái tim, tag ở mọi nhãn). Mỗi kiểu có 1–2 dấu ấn riêng.
- Font script chỉ cho chữ ≥ 1.6rem (tên, chữ ký), không cho số và thông tin cần đọc nhanh.
- Hiệu ứng chạy bằng Web Animations/CSS, tắt hết khi `prefers-reduced-motion`.
- Nút cao ≥ 44px trong mọi kiểu (nút từ chối kiểu "né" dựa vào kích thước nút).

**Thêm một kiểu:** thêm dòng vào `STYLES` (font tiêu đề, tuỳ chọn `body`/`script`), viết rule `[data-style=<key>]` trong `styles.css`, hoạ tiết/hiệu ứng (nếu có) trong `styles.js`. Admin tự sinh ô chọn. Thêm key vào vòng lặp kiểu trong `check.mjs`.

## Màu (`THEMES` trong `shared.js`)

Mỗi theme có 5 token, được gán vào CSS variable trên `<html>`:

| Token | Dùng cho |
|---|---|
| `--bg` | Nền trang, lớp phủ lên ảnh nền |
| `--fg` | Chữ chính, nút đặc, viền nút |
| `--muted` | Chữ phụ, nhãn nhỏ, giờ |
| `--line` | Vạch kẻ section, viền biểu tượng, đường lịch trình |
| `--accent` | Vạch nhấn, chấm lịch trình, vòng tick, thanh tiến độ, nút từ chối "nóng" |

| Theme | bg | fg | muted | line | accent | Tương phản fg / muted / accent trên nền |
|---|---|---|---|---|---|---|
| Ivory | `#F7F4EE` | `#1C1917` | `#6B635A` | `#DDD5C8` | `#8A6A3B` | 15.93 / 5.38 / 4.55 |
| Noir | `#0F0E0D` | `#EDE8E0` | `#9A9188` | `#2C2925` | `#C9A96E` | 15.81 / 6.23 / 8.62 |
| Sage | `#EEF0EA` | `#1F2620` | `#5E675F` | `#D2D8CC` | `#4F6B55` | 13.48 / 5.11 / 5.13 |
| Blush | `#F6EEEC` | `#2A1D1D` | `#7A6460` | `#E6D6D2` | `#9C5B5B` | 14.21 / 4.81 / 4.52 |

Tỷ lệ tương phản được tính theo công thức WCAG. Tất cả ≥ 4.5:1 (mức AA cho chữ thường). Khi thêm theme, tính lại cho đủ 3 cặp này.

`noir` đặt `color-scheme: dark` để các thành phần gốc của trình duyệt (ô nhập, thanh cuộn) cũng theo nền tối. Thẻ `<meta name="theme-color">` lấy theo `--bg` để thanh địa chỉ trên điện thoại cùng màu nền.

Trang admin cố định bảng màu Ivory, thêm `--panel #FFF`, `--ok #4F6B55`, `--err #9C3B3B`.

## Chữ

| Vai trò | Font | Cỡ / dáng |
|---|---|---|
| Tiêu đề (`--display`) | Cormorant Garamond, Playfair Display hoặc Lora (chọn trong admin), 400 | `clamp(2.6rem, 10.5vw, 4.25rem)`, line-height 1.08, `text-wrap: balance` |
| Số ngày | font tiêu đề | `clamp(6rem, 30vw, 9.5rem)` |
| Chữ nghiêng (chữ ký, thứ, lời cảm ơn) | `--script` (mặc định = font tiêu đề, italic) | 1.6–1.75rem |
| Thân bài (`--body`) | Be Vietnam Pro 300 | 1rem / 1.75, lời nhắn 1.05rem |
| Nhãn (`.eyebrow`) | Be Vietnam Pro 400, CHỮ HOA | 0.75rem, `letter-spacing: .28em`, màu muted |
| Nút | Be Vietnam Pro 400, CHỮ HOA | 0.75rem, `letter-spacing: .24em` |

- Tất cả font đều hỗ trợ tiếng Việt. Khi tải font, trang chờ font tiêu đề có sẵn glyph "Ểm" (chữ có dấu chồng) trước khi hiện.
- Một request Google Fonts gồm mọi font của kiểu thiệp (tiêu đề, thân bài, chữ ký) và Be Vietnam Pro, `display=swap`.
- Số dùng `lining-nums` (số cao đều). Đếm ngược và giờ dùng thêm `tabular-nums` (số rộng đều).

## Khoảng cách và bố cục
- Cột nội dung: `width: min(100% − 3rem, 34rem)`, căn giữa. Lề hai bên 24px trên điện thoại.
- Đệm trên dưới mỗi section: `clamp(5rem, 16vh, 9rem)`. Các section ngăn bằng vạch 1px `--line`.
- Có ảnh nền: vạch section dùng `fg` 12% để hợp với ảnh.

## Thành phần

| Thành phần | Mô tả |
|---|---|
| `.btn` | Cao 3.25rem (52px), viền 1px, góc vuông, chữ hoa giãn. Rê chuột: nền `fg` quét từ trái sang (`scaleX`, 0.55s). Nhấn: `scale(.98)`. |
| `.btn.solid` | Nền `fg`, chữ `bg`. Rê chuột thì quét màu `accent`. |
| `.btn.ghost` | Viền `line`, chữ `muted` (nút từ chối). |
| `.rule` | Vạch 3rem × 1px màu `accent`, tự vẽ ra (`scaleX`). |
| `.links a` | Nút tròn 44px chứa biểu tượng. |
| Biểu tượng | SVG 24×24, viền `currentColor` 1.3px, đầu nét tròn. Bộ: ghim bản đồ, Facebook, Instagram, mũi tên. |

## Tiếp cận (a11y)
- `:focus-visible` hiện viền 1px màu `accent`, cách 4px. Không bỏ viền focus ở đâu.
- Vùng chạm ≥ 44px: nút, biểu tượng, thanh trượt, ô chọn trong admin.
- Biểu tượng có `aria-label`. SVG trang trí có `aria-hidden`.
- Lời cảm ơn nằm trong `aria-live="polite"`. Thông báo của admin là `role="status"`.
- Admin: mọi ô nhập đều có nhãn nhìn thấy được, không chỉ dùng placeholder.
- `lang="vi"` trên `<html>`.
- `prefers-reduced-motion` được tôn trọng, xem [invite-page.md](invite-page.md#8-chuyển-động-giảm-prefers-reduced-motion-reduce).

## Thêm theme hoặc font
- **Theme:** thêm một dòng vào `THEMES` với đủ 5 token, kiểm tra 3 tỷ lệ tương phản ≥ 4.5. Admin tự sinh ô chọn.
- **Font:** thêm vào `FONTS` với `display` (tên CSS) và `q` (tham số `family=` của Google Fonts, cần italic 400 và weight 400, 500). Font phải có bộ ký tự tiếng Việt. Admin tự sinh ô chọn có chữ mẫu bằng font đó.
- **Ảnh nền preset:** thêm vào `BACKGROUNDS` với id ảnh Unsplash có giấy phép *Unsplash License* (không phải Unsplash+). Ảnh nên tối hoặc dịu, ít chi tiết ở giữa, không có người lạ.
