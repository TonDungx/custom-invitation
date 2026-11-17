# Cài đặt Firebase (tài khoản + nơi lưu thiệp)

Từ bản có tài khoản, nội dung thiệp **không còn nằm trong repo**. Mỗi người đăng nhập bằng Google, thiệp lưu trong Firestore và được mã hoá ngay trên trình duyệt trước khi gửi đi. Repo chỉ còn code.

Cần làm **một lần**, khoảng 10 phút, bằng tài khoản Google của chủ site. Gói miễn phí (Spark) không cần thẻ.

> Theo giao diện Console 11/2026: menu trái chia theo **Product categories** (Databases & Storage, Security, AI services…), không còn mục "Build". Nếu tên nút khác, dùng ô **Search for products** ở góc trên trái để tìm theo tên (Authentication, Firestore). Không cần dùng khung Gemini bên phải.

## 1. Tạo project
1. Vào <https://console.firebase.google.com> → **Create a project**.
2. Đặt tên, ví dụ `custom-invitation`. Google Analytics: **tắt** (không cần).
3. Xong sẽ vào trang **Project Overview** ("Hello, …"), góc tên project có nhãn **Spark plan** (miễn phí).

## 2. Bật đăng nhập Google
1. Menu trái: **Security** → **Authentication** → **Get started**.
2. Tab **Sign-in method** → chọn **Google** → bật **Enable** → ô *Support email* chọn email của bạn → **Save**.
3. Tab **Settings** → **Authorized domains** → **Add domain** → nhập `tondungx.github.io` → Add. (`localhost` có sẵn.)

## 3. Tạo Firestore và dán Rules
1. Menu trái: **Databases & Storage** → **Firestore** → **Create database**.
2. Nếu được hỏi phiên bản (edition): chọn bản **Standard** (bản có trong gói miễn phí) [Unverified: tuỳ giao diện có thể không hỏi]. *Database ID* để mặc định `(default)`.
3. Location: `asia-southeast1` (Singapore). **Không đổi được về sau.**
4. Chế độ bảo mật: **Start in production mode** → **Create**.
5. Khi database tạo xong: tab **Rules** → xoá hết nội dung → dán toàn bộ file [`firestore.rules`](../firestore.rules) → **Publish**.

## 4. Lấy cấu hình web và điền vào repo
1. Về **Project Overview** → nút **+ Add app** (ngay dưới tên project) → chọn biểu tượng **Web `</>`**.
2. *App nickname*: `web`. **Không** tick *Firebase Hosting* → **Register app**.
3. Màn hình hiện đoạn code có `const firebaseConfig = { … }`. Chỉ cần 3 dòng `apiKey`, `authDomain`, `projectId` → copy vào [`firebase-config.js`](../firebase-config.js) (hoặc gửi cho người cài đặt). Không cần chạy `npm install firebase` như màn hình gợi ý → **Continue to console**.
   Xem lại sau: bánh răng **Settings → Project settings → General → Your apps**.

```js
const FIREBASE = {
  apiKey: 'AIza…',
  authDomain: 'custom-invitation-xxxx.firebaseapp.com',
  projectId: 'custom-invitation-xxxx',
  emulator: '',
};
```

Các giá trị này **công khai**, không phải mật khẩu. Ai được đọc/ghi gì do `firestore.rules` quyết định.

4. Commit + push. Chờ Pages build (khoảng 1 phút, CDN có thể cũ tới 10 phút).

## 5. Chuyển thiệp cũ vào tài khoản
1. Mở `/admin` → **Đăng nhập bằng Google** bằng email bạn muốn làm chủ thiệp.
2. Tài khoản chưa có thiệp và repo còn `config.json` cũ → trang hỏi **"Nhập thiệp cũ?"** → OK. (Hoặc menu tài khoản → **Nhập thiệp cũ (từ GitHub)**.)
3. Trình duyệt này chưa có khoá cũ thì trang hỏi link thiệp cũ: dán link đầy đủ có `#k=…`.
4. Xong: nội dung và ảnh được chép sang Firestore (vẫn mã hoá, **giữ nguyên khoá**). Link cũ đã gửi đi vẫn mở được.

## 6. Dọn dữ liệu cũ khỏi repo (sau bước 5)
- Xoá `config.json` và thư mục `uploads/` bằng một commit mới.
- Lịch sử git vẫn còn bản cũ (gồm cả bản **chưa mã hoá** trước khi có mã hoá). Muốn xoá hẳn phải viết lại lịch sử và force-push: thao tác không hoàn tác được, làm riêng khi chủ repo đồng ý.

## Giới hạn gói miễn phí
- Ai cũng đăng ký được, nên dung lượng và lượt đọc/ghi miễn phí dùng chung cho mọi người. [Unverified] Hạn mức cụ thể xem tại <https://firebase.google.com/pricing>. Khi vượt hạn mức, Spark **dừng phục vụ** chứ không tính tiền.
- Ảnh lưu thẳng trong Firestore (mỗi ảnh < 1 MB sau nén và mã hoá), không dùng Cloud Storage.
- Chưa có giới hạn số thiệp/ảnh cho mỗi tài khoản. Nếu bị lạm dụng: bật **App Check** hoặc thêm hạn mức trong Rules.

## Chạy thử trên máy (không cần project thật)
Xem [testing.md](testing.md): toàn bộ test chạy trên Firebase Emulator với project giả `demo-invite`.
