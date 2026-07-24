# 📡 Danh sách REST API Endpoints Vocaburn (API Reference)

Tất cả API Endpoints chính của Vocaburn được định nghĩa trong các module tại `app/modules/` và được mount dưới tiền tố chuẩn **`/api/v1/`** (ngoại trừ các endpoint callback và health checks công khai).

- **Base URL Mặc định**: `http://localhost:5090/api/v1`
- **Xác thực**: Qua Session Cookie HttpOnly (`user_id`).

---

## 1. Endpoints Học tập & Flashcards FSRS v6 (`app/modules/deck/routes/`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/quiz/{quiz_id}/play-data` | Lấy danh sách thẻ từ vựng và chỉ số FSRS v6 (`stability`, `difficulty`, `state`, `due`) để học. |
| `POST` | `/quiz/record_answer` | Ghi nhận phản hồi FSRS (Rating `1`=Again, `2`=Hard, `3`=Good, `4`=Easy), tính toán chu kỳ ôn tập mới & cộng XP. |
| `GET` | `/quiz/list` | Danh sách bộ Flashcard hiện có của người dùng và cộng đồng. |
| `POST` | `/quiz/create` | Tạo bộ Flashcard mới. |
| `GET` | `/quiz/{id}` | Lấy chi tiết thông tin bộ Flashcard. |
| `PUT` | `/quiz/{id}` | Cập nhật tên, mô tả, cài đặt bộ Flashcard. |
| `DELETE` | `/quiz/{id}` | Xóa bộ Flashcard. |
| `POST` | `/quiz/upload` | Import bộ thẻ từ file mẫu Excel (`.xlsx`). |
| `GET` | `/quiz/template/download` | Tải về file mẫu Excel tiêu chuẩn. |
| `POST` | `/quiz/cards/{card_id}/ask-ai` | Yêu cầu Gemini AI sinh giải thích chuyên sâu (`ai_explanation`) dạng HTML cho thẻ. |
| `GET` | `/quiz/deck/{deck_id}/roadmap-settings` | Lấy cấu hình chỉ tiêu Lộ trình (Roadmap) của bộ thẻ. |
| `POST` | `/quiz/deck/{deck_id}/roadmap-settings` | Cập nhật cấu hình chỉ tiêu Lộ trình (số thẻ mới/ngày, số thẻ ôn tập tối đa/ngày). |

---

## 2. Endpoints Xác thực & SSO (`app/modules/auth/`, `app/modules/sso_module/`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/auth/me` | Lấy thông tin tài khoản người dùng hiện tại (Session, XP, Level, Role). |
| `GET` | `/auth/config` | Lấy cấu hình SSO (kích hoạt hay tắt, URL jump CentralAuth). |
| `POST` | `/auth/login` | Đăng nhập cục bộ bằng Username/Password (Stand-alone mode hoặc Backdoor). |
| `POST` | `/auth/logout` | Đăng xuất, xóa Cookie phiên local và trả về URL logout CentralAuth. |
| `GET` | `/auth-center/callback` | Callback tiếp nhận OAuth2 Code từ CentralAuth để thiết lập phiên làm việc. |
| `POST` | `/api/admin/sso/handshake` | API Handshake bảo mật phục vụ đồng bộ đường dẫn File Cơ sở Dữ liệu động cho CentralAuth. |

---

## 3. Endpoints Game hóa & Thống kê (`app/modules/gamification/`, `app/modules/stats/`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/gamification/profile` | Lấy thông tin chi tiết XP, Cấp độ, Chuỗi Streak và Danh sách Huy hiệu đã đạt. |
| `GET` | `/gamification/badges` | Danh sách tất cả huy hiệu hệ thống và điều kiện mở khóa. |
| `GET` | `/stats/summary` | Báo cáo tổng hợp số thẻ đã học, độ chính xác, tổng thời gian luyện tập. |
| `GET` | `/stats/daily` | Dữ liệu thống kê tiến trình học tập phân bố theo ngày. |

---

## 4. Endpoints Quản trị & Hệ thống (`app/modules/admin/`, `app/main.py`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint kiểm tra trạng thái hoạt động backend Vocaburn. |
| `GET` | `/admin/settings` | Lấy cấu hình toàn cục hệ thống (chỉ dành cho Admin). |
| `POST` | `/admin/settings` | Cập nhật cấu hình hệ thống và tham số FSRS toàn cục. |
| `GET` | `/admin/users` | Danh sách quản lý tất cả tài khoản trong hệ thống. |
