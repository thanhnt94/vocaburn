# 🔌 Kết nối với Hệ thống Ecosystem (Ecosystem Integration)

Dự án Vocaburn hoạt động như một ứng dụng vệ tinh trong hệ sinh thái của chúng ta. Nó liên kết trực tiếp với **CentralAuth** (hệ thống xác thực tập trung) để cung cấp trải nghiệm Single Sign-On (SSO) mượt mà cho người dùng.

---

## 1. Bản đồ Phân bổ Cổng và Dịch vụ (Ports & Services)

Trong môi trường Ecosystem chạy đa dịch vụ:
- **CentralAuth**: Cổng `5000` (Quản lý tài khoản, phân quyền, SSO Provider).
- **Vocaburn**: Cổng `5090` (FastAPI backend + React SPA frontend).
- **SQLite Database**: Cơ sở dữ liệu SQLite của Vocaburn nằm tập trung tại `Ecosystem/Storage/database/Vocaburn.db`.

---

## 2. Luồng đăng nhập một lần (Single Sign-On Flow)

Vocaburn sử dụng luồng Authorization Code Flow định hướng hoàn toàn bởi React Client (Client-Side Auto-Redirect Flow):

1. **Auto-Redirect**:
   - Khi người dùng truy cập màn hình `/login` của Vocaburn, React component LoginPage sẽ gọi API `GET /api/v1/auth/config`.
   - Nếu SSO được kích hoạt (`sso_enabled: true`) và người dùng không sử dụng đường link dự phòng (backdoor), ứng dụng sẽ chuyển hướng trình duyệt của người dùng đến CentralAuth thông qua `jump_url`:
     ```
     http://localhost:5000/api/auth/jump/vocaburn-v1
     ```
2. **Xử lý Callback**:
   - Sau khi CentralAuth xác thực thành công, nó sẽ redirect người dùng trở lại Vocaburn kèm mã code:
     ```
     /auth-center/callback?code=xxx
     ```
   - API Endpoint `/auth-center/callback` tại backend Vocaburn nhận mã code, gọi API backchannel đến CentralAuth để hoán đổi code lấy dữ liệu người dùng (`id`, `username`, `email`, `password_hash`).
   - Nếu người dùng chưa tồn tại trong local database của Vocaburn, tài khoản mới sẽ tự động được tạo và liên kết qua trường `sso_id`.
   - Backend Vocaburn thiết lập cookie `user_id` (HttpOnly) và chuyển hướng người dùng về trang chủ `/`.

---

## 3. Đồng bộ hóa Database động (Dynamic DB Discovery Handshake)

Để phục vụ tính năng **Đồng bộ hóa tài khoản** hoặc **Kiểm tra trạng thái liên kết (Pairing)** từ Admin Hub của CentralAuth mà không cần cấu hình cứng vị trí file database trên máy chủ, Vocaburn cung cấp một endpoint handshake bảo mật:

- **Endpoint**: `POST /api/admin/sso/handshake`
- **Request Body**:
  ```json
  {
    "client_id": "vocaburn-v1",
    "client_secret": "vocaburn_secret_123"
  }
  ```
- **Xử lý**: Backend kiểm tra trùng khớp `client_id` và `client_secret` với cấu hình trong DB hoặc biến môi trường. Nếu hợp lệ, trả về đường dẫn cơ sở dữ liệu tuyệt đối của file `Vocaburn.db` trên hệ thống file của máy chủ:
  ```json
  {
    "success": true,
    "db_path": "C:\\Code\\Ecosystem\\Storage\\database\\Vocaburn.db"
  }
  ```

---

## 4. Luồng Đăng xuất Toàn cầu (Global SSO Logout Flow)

Khi người dùng thực hiện đăng xuất khỏi Vocaburn:
1. Gửi yêu cầu `POST` tới `/api/auth/logout`.
2. Backend Vocaburn xóa cookie xác thực local (`user_id`).
3. Nếu SSO được kích hoạt, backend trả về URL đăng xuất của CentralAuth:
   ```json
   {
     "status": "success",
     "redirect_url": "http://localhost:5000/auth/logout?client_id=vocaburn-v1"
   }
   ```
4. React Client nhận phản hồi và thiết lập `window.location.href = redirect_url` để xóa bỏ hoàn toàn phiên đăng nhập trên hệ thống CentralAuth.

---

## 5. Cổng dự phòng Admin (Admin Backdoor Bypass)

Khi cần thực hiện cấu hình hoặc sửa lỗi hệ thống trong trường hợp CentralAuth không khả dụng:
- **Đường dẫn Backdoor**: Truy cập `http://localhost:5090/login?backdoor=1` (hoặc `?fallback=1`).
- **Chính sách**: Form đăng nhập cục bộ (Local Login) sẽ xuất hiện. Tuy nhiên, để đảm bảo an toàn, **chỉ tài khoản quản trị viên** (`role = 'admin'` hoặc `is_admin = True` nội bộ) mới được phép đăng nhập trực tiếp qua form này khi SSO đang bật. Tài khoản người dùng thông thường sẽ bị backend chặn với mã lỗi `403 Forbidden`.
