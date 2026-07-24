# 🔌 Kết nối với Hệ thống Ecosystem (Ecosystem Integration)

Dự án **Vocaburn** hoạt động như một ứng dụng vệ tinh trong Hệ sinh thái Ecosystem. Ứng dụng liên kết trực tiếp với **CentralAuth** (Hệ thống Xác thực Tập trung) để cung cấp trải nghiệm Single Sign-On (SSO) mượt mà cho người dùng.

---

## 1. Bản đồ Cổng & Phân bổ Dịch vụ (Ports & Services)

- **CentralAuth**: Cổng **5000** (Quản lý tài khoản toàn hệ thống, phân quyền, SSO Provider).
- **Vocaburn**: Cổng **5090** (FastAPI backend + React SPA frontend).
- **SQLite Database**: Cơ sở dữ liệu của Vocaburn được lưu trữ tập trung tại `Ecosystem/Storage/database/Vocaburn.db`.

---

## 2. Luồng Đăng nhập Tự động (Single Sign-On Flow)

Vocaburn sử dụng luồng Authorization Code Flow định hướng hoàn toàn từ React Client:

1. **Auto-Redirect**:
   - Khi truy cập `/login`, React component `Login.tsx` gọi API `GET /api/v1/auth/config`.
   - Nếu SSO được bật (`sso_enabled: true`) và không có tham số dự phòng (`backdoor`), ứng dụng tự động chuyển hướng trình duyệt đến CentralAuth qua URL:
     ```
     http://localhost:5000/api/auth/jump/vocaburn-v1
     ```
2. **Xử lý Callback**:
   - Sau khi xác thực, CentralAuth redirect về Vocaburn:
     ```
     /auth-center/callback?code=xxx
     ```
   - API Endpoint `/auth-center/callback` tại backend Vocaburn tiếp nhận `code`, trao đổi qua backchannel với CentralAuth để lấy thông tin tài khoản (`id`, `username`, `email`).
   - Tự động tạo/đồng bộ tài khoản trong local DB qua trường `sso_id`.
   - Gán Cookie `user_id` (HttpOnly, đã qua mã hóa `cookie_signer.py`) và chuyển hướng về trang chính `/`.

---

## 3. Đồng bộ hóa Database Động (Dynamic DB Discovery Handshake)

Để phục vụ Admin Hub của CentralAuth tự động phát hiện đường dẫn cơ sở dữ liệu của Vocaburn mà không cần cấu hình cứng trên máy chủ:

- **Endpoint**: `POST /api/admin/sso/handshake`
- **Request Body**:
  ```json
  {
    "client_id": "vocaburn-v1",
    "client_secret": "vocaburn_secret_123"
  }
  ```
- **Phản hồi**: Kiểm tra `client_id` & `client_secret`. Nếu hợp lệ, trả về đường dẫn tệp cơ sở dữ liệu tuyệt đối:
  ```json
  {
    "success": true,
    "db_path": "C:\\Code\\Ecosystem\\Storage\\database\\Vocaburn.db"
  }
  ```

---

## 4. Cổng Dự phòng Quản trị (Admin Backdoor Bypass)

Trong trường hợp máy chủ CentralAuth gặp sự cố hoặc cần truy cập quản trị local:
- **Đường dẫn Backdoor**: Truy cập `http://localhost:5090/login?backdoor=1` (hoặc `?fallback=1`).
- **Chính sách An ninh**: Màn hình đăng nhập thủ công sẽ hiển thị. Tuy nhiên, **chỉ tài khoản quản trị viên** (`role = 'admin'`) mới được phép đăng nhập trực tiếp qua form khi SSO đang bật. Tài khoản người dùng thông thường sẽ bị chặn với lỗi `403 Forbidden`.
