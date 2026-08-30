# 🔌 Kết nối với Hệ thống Ecosystem (Ecosystem Integration)

Dự án **Vocaburn** hoạt động như một ứng dụng vệ tinh chuyên sâu về ghi nhớ từ vựng và flashcard trong Hệ sinh thái Ecosystem. Ứng dụng liên kết chặt chẽ với **CentralAuth** (Hệ thống Xác thực Tập trung) để cung cấp trải nghiệm Single Sign-On (SSO) mượt mà và quản lý tài khoản đồng bộ.

---

## 1. Bản đồ Cổng & Phân bổ Dịch vụ (Ports & Services)

* **CentralAuth**: Cổng **5000** (Quản lý định danh toàn hệ thống, phân quyền, SSO Provider, AI Hub & Telegram Bot trung tâm).
* **Vocaburn**: Cổng **5090** (FastAPI backend + Phục vụ Static React SPA Frontend).
* **SQLite Database**: Cơ sở dữ liệu của Vocaburn được lưu trữ tập trung tại `Ecosystem/Storage/database/Vocaburn.db`.

---

## 2. Luồng Đăng nhập Tự động (Single Sign-On Flow)

Vocaburn sử dụng luồng Authorization Code Flow định hướng hoàn toàn từ React Client:

```
User truy cập Vocaburn /login
        │
        ▼
   React Component Login.tsx mount
        │
        ├── Gọi API GET /api/v1/auth/config
        │
        ├── SSO bật + không có ?backdoor=1 (hoặc ?fallback=1)
        │       │
        │       ▼
        │   Thiết lập window.location.href = config.jump_url
        │       │ (Chuyển hướng tức thời sang CentralAuth /api/auth/jump/vocaburn-v1)
        │       │
        │       ├── Đã đăng nhập CentralAuth? ➔ Tạo Authorization Code ➔ Chuyển hướng về
        │       │       Vocaburn callback (/auth-center/callback?code=xxx)
        │       │
        │       └── Chưa đăng nhập CentralAuth? ➔ Chuyển hướng về trang đăng nhập CentralAuth
        │
        ▼
    (Nếu có ?backdoor=1 hoặc SSO tắt)
   Hiển thị Form đăng nhập nội bộ (Local Login)
        │
        ▼
   POST /api/v1/auth/login kèm: is_backdoor = true
```

### Xử lý Callback tại Backend (`/auth-center/callback`):
1. Nhận mã `code` từ URL query parameter.
2. Gửi request backchannel sang CentralAuth (`POST /api/auth/token`) để đổi code lấy Access Token.
3. Xác thực Access Token (`GET /api/auth/verify-token`) để lấy thông tin người dùng (`id`, `username`, `email`, `role`).
4. Tìm kiếm hoặc tự động tạo tài khoản trong cơ sở dữ liệu Vocaburn thông qua trường `sso_id`.
5. Tạo chữ ký HMAC bảo mật cho `user_id` qua `cookie_signer.py` và gán Cookie `user_id` (HttpOnly, SameSite='lax', max_age=30 ngày).
6. Điều hướng người dùng về trang chính `/`.

---

## 3. Đồng bộ hóa Database Động (Dynamic DB Discovery Handshake)

Để phục vụ tính năng Admin Hub của CentralAuth tự động nhận diện vị trí tệp cơ sở dữ liệu của Vocaburn mà không cần hardcode đường dẫn trên máy chủ:

* **Endpoint**: `POST /api/admin/sso/handshake`
* **Request Body**:
  ```json
  {
    "client_id": "vocaburn-v1",
    "client_secret": "vocaburn_secret_123"
  }
  ```
* **Xử lý**:
  1. Kiểm tra xác thực `client_id` và `client_secret` khớp với bảng `sso_settings`.
  2. Nếu hợp lệ, tự động tính toán và trả về đường dẫn tệp SQLite Database tuyệt đối trên máy chủ:
  ```json
  {
    "success": true,
    "db_path": "C:\\Users\\...\\Ecosystem\\Storage\\database\\Vocaburn.db"
  }
  ```

---

## 4. Cổng Dự phòng Quản trị (Admin Backdoor Bypass)

Trong trường hợp máy chủ CentralAuth gặp sự cố, mạng nội bộ bị ngắt, hoặc cần đăng nhập trực tiếp bằng tài khoản Admin cục bộ:

* **Đường dẫn Backdoor**: Truy cập `http://localhost:5090/login?backdoor=1` (hoặc `?fallback=1`).
* **Chính sách An ninh**:
  * Form đăng nhập thủ công sẽ hiển thị ngay lập tức.
  * **Chỉ tài khoản Quản trị viên (`role = 'admin'`)** mới được phép đăng nhập qua form này khi SSO đang bật.
  * Tài khoản người dùng thông thường (`role = 'user'`) khi cố gắng đăng nhập qua backdoor sẽ bị chặn với thông báo cảnh báo bảo mật.
* **Lưu ý**: Khuyến nghị mở đường dẫn Backdoor bằng **Tab ẩn danh (Incognito Mode)** để tránh ghi đè Cookie giữa các phiên đăng nhập.
