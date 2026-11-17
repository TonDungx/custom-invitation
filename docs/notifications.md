# Thông báo qua email (Google Apps Script)

Khi người ấy bấm **Đồng ý** (và tuỳ chọn: khi **mở thiệp**), bạn nhận một email từ chính tài khoản Gmail của mình.

- **Không cần App Password hay mật khẩu nào.** Script chạy trong tài khoản Google của bạn và gửi mail bằng `MailApp`.
- **Email nhận nằm trong script** (tài khoản Google của bạn), không nằm trong repo public.
- **Link webhook** được lưu **trong `config.json` đã mã hoá**, nên chỉ ai có link thiệp mới biết. Script còn tự giới hạn 30 mail mỗi giờ để chống spam.

## Cài đặt (khoảng 5 phút, làm 1 lần)

1. Đăng nhập Google bằng tài khoản muốn **nhận** thông báo (ví dụ `duongtondung3@gmail.com`).
2. Mở https://script.google.com và bấm **New project** (Dự án mới).
3. Xoá hết nội dung có sẵn. Dán toàn bộ nội dung file [`tools/notify.gs`](../tools/notify.gs).
   - Mặc định mail gửi về chính tài khoản đang đăng nhập (`Session.getEffectiveUser()`).
   - Muốn gửi tới địa chỉ khác thì sửa dòng `const TO = …` thành `const TO = 'email@gmail.com';`.
4. Bấm 💾 **Save**, đặt tên ví dụ `Thiep moi - thong bao`.
5. Bấm **Deploy → New deployment**.
   - Bấm biểu tượng ⚙ cạnh "Select type", chọn **Web app**.
   - **Execute as:** *Me (email của bạn)*.
   - **Who has access:** *Anyone*.
   - Bấm **Deploy**.
6. Google hỏi quyền: **Authorize access**, chọn tài khoản, rồi **Advanced → Go to … (unsafe) → Allow**.
   - Màn "unsafe" là bình thường với script cá nhân chưa qua kiểm duyệt của Google. Quyền được xin là gửi email thay bạn.
7. Copy **Web app URL**, dạng `https://script.google.com/macros/s/AKfy…/exec`.
8. Vào trang admin → mục **Hồi đáp** → **Thông báo qua email**: dán link vào ô, tuỳ chọn tick **Báo cả khi người ấy mở thiệp**, bấm **Gửi thử**.
9. Kiểm tra hộp thư (cả mục **Spam**). Thấy mail "Thử thông báo thiệp mời" là chạy. Bấm **Áp dụng** để lưu.

## Nội dung email

| Sự kiện | Tiêu đề mail | Khi nào |
|---|---|---|
| `accept` | "{tên} đã bấm "{chữ trên nút}"" | Người ấy bấm nút đồng ý |
| `open` | "{tên} vừa mở thiệp" | Mở thiệp (nếu bật), mỗi tab trình duyệt chỉ báo 1 lần |
| `test` | "Thử thông báo thiệp mời" | Nút Gửi thử trong admin |

Thân mail gồm: sự kiện, thời điểm (theo máy người xem), ngày hẹn, thiết bị (User-Agent rút gọn).

**Không gửi thông báo khi:** đang xem trước trong admin, bấm **Xem thử** ở trang thiết kế, hoặc trang thiệp đang nằm trong iframe. Nếu chính bạn mở link thật và bấm Đồng ý thì **vẫn** gửi, vì trang không phân biệt được ai đang mở.

## Sửa script về sau
Sửa code xong phải **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy** thì bản mới mới chạy. Link `/exec` giữ nguyên.

## Gỡ bỏ
Xoá link trong admin rồi Áp dụng, hoặc **Deploy → Manage deployments → Archive**.

## Giới hạn
- Gmail cá nhân gửi được khoảng 100 mail/ngày qua Apps Script [Unverified, theo hạn mức Google công bố, có thể thay đổi].
- Trang thiệp gửi với `mode: no-cors`, nên không biết mail đã gửi thành công hay chưa. Lỗi (sai link, script chưa deploy) chỉ thấy qua việc không nhận được mail.
- [Unverified] Apps Script web app xử lý `doPost` rồi mới trả redirect. Đây là cách làm phổ biến, nhưng chưa thử với tài khoản của bạn. Bước **Gửi thử** ở trên chính là để kiểm chứng.
