# Deploy và vận hành

## Hạ tầng

| Thành phần | Dịch vụ | Ghi chú |
|---|---|---|
| Mã nguồn | GitHub repo `TonDungx/custom-invitation` (public) | Nhánh `main`. Không chứa nội dung thiệp (sau khi đã nhập thiệp cũ và dọn `config.json`, `uploads/`). |
| Tài khoản + dữ liệu | Firebase Auth (Google) + Firestore, gói Spark | Cài đặt: [firebase-setup.md](firebase-setup.md). Đổi Rules: dán `firestore.rules` vào Console rồi Publish. |
| Hosting | GitHub Pages, deploy từ `main` / thư mục gốc | Bật bằng `gh api -X POST repos/TonDungx/custom-invitation/pages -f "source[branch]=main" -f "source[path]=/"` |
| Đọc config mới | `api.github.com` (contents API) | Không xác thực, từ trình duyệt người xem |
| Ảnh tải lên | `raw.githubusercontent.com/<repo>/<commitSha>/uploads/…` | Đã đo: `Content-Type: image/webp`, `Cache-Control: max-age=300`, có `Access-Control-Allow-Origin: *` |
| Ảnh preset | `images.unsplash.com` | Có `auto=format`, nên trình duyệt hỗ trợ sẽ nhận WebP hoặc AVIF |
| Font | Google Fonts | |

Chi phí: 0 đồng. Repo phải public vì Pages miễn phí không hỗ trợ repo private.

## Cache (số liệu đo thật)

| Tài nguyên | Header đo được | Hệ quả |
|---|---|---|
| File trên Pages (`*.html`, `shared.js`, `config.json`) | `Cache-Control: max-age=600`, `X-Cache: HIT` | CDN có thể trả bản cũ tới **10 phút**. Thêm `?v=123` vẫn là `HIT` cùng `Age`, nên **không** bỏ qua cache bằng query string được. |
| `raw.githubusercontent.com` | `max-age=300` | Không ảnh hưởng, vì link ảnh tải lên gắn commit SHA (nội dung không bao giờ đổi). |

Vì vậy:
- Trang thiệp đọc `config.json` qua **API** trước (thường mới trong khoảng 1 phút), Pages chỉ là dự phòng.
- Sau khi push code, có thể mất khoảng 1 phút để Pages build cộng tới 10 phút cache CDN mới thấy bản mới. Mở bằng cửa sổ ẩn danh hoặc Ctrl+F5 vẫn có thể ra bản cũ do CDN; chỉ cần chờ.

Kiểm tra Pages đã build xong chưa:
```bash
gh api repos/TonDungx/custom-invitation/pages/builds/latest --jq .status   # building | built | errored
```

Kiểm tra bản live đã có thay đổi chưa (thay `<chuỗi>` bằng một đoạn code mới):
```bash
curl -s https://tondungx.github.io/custom-invitation/ | grep -c "<chuỗi>"
```

## Quy trình push code

Admin cũng **commit vào `main`** mỗi lần bấm Áp dụng hoặc Tải ảnh. Vì vậy repo trên máy thường bị chậm hơn bản trên GitHub.

```bash
git pull --rebase      # BẮT BUỘC trước khi push
# ... sửa code, chạy check.mjs ...
git add -A && git commit -m "feat: ..."
git pull --rebase && git push
```

Nếu push bị từ chối với `! [rejected] main -> main (fetch first)`, gần như chắc chắn là do commit từ admin. Chạy `git pull --rebase` rồi push lại. Các commit từ admin chỉ đụng `config.json` và `uploads/`, nên không xung đột với code.

**Đừng sửa `config.json` bằng tay rồi push trong lúc admin đang mở.** Admin giữ `sha` cũ; lần Áp dụng sau sẽ tự lấy sha mới rồi ghi đè lên bản sửa tay.

### Quy ước commit
- `feat:`, `fix:`, `style:`, `docs:`: commit code, có dòng `Co-Authored-By` khi do Claude viết.
- `chore: update invitation`: do admin tạo khi lưu cấu hình.
- `chore: upload background`: do admin tạo khi tải ảnh.

## Firebase

- Định danh project nằm trong `firebase-config.js` (công khai). Quyền nằm trong `firestore.rules`; sửa Rules thì dán lại vào Console → Firestore → Rules → **Publish** (hoặc `firebase deploy --only firestore:rules`).
- Domain chạy admin phải nằm trong **Authentication → Settings → Authorized domains**, nếu không popup đăng nhập báo `auth/unauthorized-domain`.
- Xem dữ liệu: Console → Firestore. Nội dung `enc` và ảnh đều là bản mã; chỉ người có khoá (link hoặc tài khoản chủ) đọc được.
- Sao lưu: Firestore có export ra Cloud Storage (cần gói trả phí) [Unverified]; với quy mô nhỏ, mỗi chủ thiệp giữ link `#k=` là đủ để mở lại.

## Dọn ảnh cũ

Mỗi lần tải ảnh tạo một file mới trong `uploads/`, ảnh cũ không tự xoá. Ảnh sau khi nén thường vài chục đến vài trăm KB.

Xem ảnh nào đang được dùng:
```bash
git pull --rebase
grep -o 'uploads/[0-9]*\.\(webp\|jpg\)' config.json
ls uploads/
```

Xoá ảnh không dùng:
```bash
git rm uploads/<file-không-dùng>.webp
git commit -m "chore: remove unused uploads" && git push
```

Xoá file khỏi `main` không làm hỏng link đang dùng ở commit cũ: link raw gắn commit SHA nên vẫn tải được. Nhưng file vẫn còn trong lịch sử git. Muốn xoá hẳn khỏi lịch sử thì phải viết lại lịch sử, việc này rủi ro và thường không cần.

## Chạy trên máy (local)

Cần một server tĩnh bất kỳ (mở bằng `file://` thì một số đường dẫn và iframe có thể lỗi):
```bash
npx serve .            # http://localhost:3000  và  http://localhost:3000/admin/
# hoặc
python -m http.server 8000
```
Trên localhost:
- `repoFromLocation()` trả về `''`, nên trang thiệp đọc `./config.json` trong thư mục.
- Admin vẫn lưu lên GitHub thật nếu có token và repo, vì repo nhập trong hộp thoại.

## Chuyển sang host hoặc repo khác

- **Đổi tên repo hoặc tài khoản:** không cần sửa code. Thêm domain mới vào **Authorized domains** của Firebase Auth.
- **Tên miền riêng hoặc host khác (Netlify, Vercel…):** `repoFromLocation()` trả về `''`, nên trang thiệp chỉ đọc `config.json` trên host đó. Cần một trong hai cách:
  - Cho repo GitHub tự deploy sang host đó (Netlify/Vercel deploy theo commit, mỗi lần Áp dụng là một lần deploy).
  - Sửa `repoFromLocation()` để trả về repo cố định, giữ việc đọc qua API.
- **Đường dẫn `/admin`:** trang admin tự chuyển `/admin` sang `/admin/`, nên host nào cũng chạy được.
