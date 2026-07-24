# 🗄️ Cấu trúc Cơ sở Dữ liệu Vocaburn (Database Structure)

Hệ thống Cơ sở Dữ liệu của Vocaburn được xây dựng dựa trên **SQLite** ở môi trường phát triển (tối ưu hóa ghi đồng thời với chế độ Write-Ahead Logging - WAL). Quản lý cấu trúc bảng và di cư dữ liệu được thực hiện qua **SQLAlchemy Async ORM** và **Alembic Migrations**.

- **Đường dẫn tệp cơ sở dữ liệu mặc định**: `Storage/database/Vocaburn.db` (nằm tại thư mục Storage chung của Ecosystem để dễ dàng đồng bộ và sao lưu).

---

## 1. Các bảng Quản lý Tài khoản & Phân quyền (`app/modules/auth/models.py`)

### `users`
Bảng chứa thông tin tài khoản người dùng (đồng bộ từ CentralAuth hoặc tạo cục bộ).
- `id` (INTEGER, Khóa chính): ID định danh tự tăng.
- `username` (VARCHAR(255), UNIQUE, INDEX): Tên đăng nhập.
- `email` (VARCHAR(255), UNIQUE, INDEX): Địa chỉ email.
- `hashed_password` (VARCHAR(255), NULL): Mật khẩu băm (null nếu đăng nhập thuần qua SSO).
- `full_name` (VARCHAR(255)): Họ và tên hiển thị.
- `role` (VARCHAR(50), default: 'user'): Vai trò người dùng (`admin` hoặc `user`).
- `is_active` (BOOLEAN, default: True): Trạng thái tài khoản.
- `sso_id` (VARCHAR(255), UNIQUE, INDEX, NULL): ID liên kết tài khoản từ CentralAuth.
- `created_at` (DATETIME): Thời điểm tạo tài khoản.

---

## 2. Các bảng Quản lý Danh mục & Học liệu (`app/modules/deck/models.py`)

### `categories`
- `id` (INTEGER, Khóa chính).
- `name` (VARCHAR(255), UNIQUE, INDEX): Tên danh mục (Ví dụ: JLPT N1, Tiếng Anh Giao Tiếp).
- `description` (TEXT, NULL): Mô tả chi tiết.
- `created_at` (DATETIME).

### `flashcard_decks` (Mô hình Bộ Flashcard)
- `id` (INTEGER, Khóa chính).
- `title` (VARCHAR(255), INDEX): Tiêu đề bộ thẻ.
- `description` (TEXT, NULL): Mô tả chi tiết.
- `category_id` (INTEGER, Khóa ngoại `categories.id`).
- `creator_id` (INTEGER, NULL, Khóa ngoại `users.id`): Người tạo bộ thẻ.
- `instruction` (TEXT, NULL): Hướng dẫn học chung của bộ thẻ.
- `cover_image` (VARCHAR(512), NULL): URL ảnh bìa bộ thẻ.
- `time_limit` (INTEGER, default: 0): Giới hạn thời gian học (phút), 0 là không giới hạn.
- `is_active` (BOOLEAN, default: True).
- `is_public` (BOOLEAN, default: True).
- `practice_settings` (JSON, NULL): Cấu hình mặc định cho các chế độ luyện tập.
- `created_at` (DATETIME).

### `flashcards` (Bảng chứa Thẻ Từ vựng - Cột liên kết `quiz_id`)
- `id` (INTEGER, Khóa chính).
- `quiz_id` (INTEGER, Khóa ngoại `flashcard_decks.id`): ID bộ thẻ sở hữu.
- `content` (TEXT): Nội dung chính mặt trước thẻ (từ vựng, thuật ngữ, câu hỏi).
- `front_audio_content` (TEXT, NULL) / `back_audio_content` (TEXT, NULL): Văn bản dùng để đọc phát âm mặt trước/sau.
- `front_audio_url` (VARCHAR(512), NULL) / `back_audio_url` (VARCHAR(512), NULL): URL tệp âm thanh lưu trữ.
- `front_img` (VARCHAR(512), NULL) / `back_img` (VARCHAR(512), NULL): URL ảnh minh họa mặt trước/sau.
- `question_type` (VARCHAR(50), default: 'flashcard'): Loại câu hỏi (`flashcard`, `mcq`, `typing`).
- `explanation` (TEXT, NULL): Giải thích chi tiết (hỗ trợ HTML và thẻ phát âm `<ruby>` tạo bởi Gemini AI).
- `others` (JSON, NULL): Chứa tùy chọn bổ sung (ví dụ: các đáp án nhiễu MCQ).

### `tags` / `deck_tags`
- `tags`: `id` (Khóa chính), `name` (VARCHAR(50), UNIQUE), `created_at`.
- `deck_tags`: Bảng liên kết nhiều-nhiều giữa `flashcard_decks.id` (`quiz_id`) và `tags.id`.

---

## 3. Các bảng Lịch sử & Thuật toán FSRS v6 (`app/modules/deck/models.py`)

### `deck_attempts`
Bảng ghi nhận từng lượt học/luyện tập một bộ thẻ của người dùng.
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`).
- `quiz_id` (INTEGER, Khóa ngoại `flashcard_decks.id`).
- `mode` (VARCHAR(50)): Chế độ học (`sequential`, `random`, `fsrs`, `mastery`).
- `score` (INTEGER, default: 0).
- `total_questions` (INTEGER, default: 0): Số thẻ trong lượt học.
- `is_archived` (BOOLEAN, default: False).
- `started_at` (DATETIME).
- `completed_at` (DATETIME, NULL).

### `card_answers`
Bảng ghi nhận kết quả phản hồi cho từng thẻ trong lượt học.
- `id` (INTEGER, Khóa chính).
- `attempt_id` (INTEGER, Khóa ngoại `deck_attempts.id`).
- `question_id` (INTEGER, Khóa ngoại `flashcards.id`).
- `is_correct` (BOOLEAN, default: False).
- `active_time` (FLOAT, default: 0.0): Thời gian phản hồi (giây).
- `rating` (INTEGER, NULL): Đánh giá FSRS (1=Again, 2=Hard, 3=Good, 4=Easy).
- `created_at` (DATETIME).

### `user_card_mastery` (Chỉ số Bộ nhớ FSRS v6 & Leitner)
Bảng lưu trữ trạng thái và khoảng thời gian ôn tập riêng cho từng cặp Người dùng - Thẻ từ vựng.
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`).
- `question_id` (INTEGER, Khóa ngoại `flashcards.id`).
- `is_ignored` (BOOLEAN, default: False): Đánh dấu thẻ bị bỏ qua.
- `box_level` (INTEGER, default: 1): Cấp độ hộp Leitner (1 đến 5).
- `consecutive_correct` (INTEGER, default: 0): Chuỗi đúng liên tiếp.
- `last_answered` (DATETIME).
- **Thuộc tính FSRS v6 Core**:
  - `stability` (FLOAT, NULL): Độ ổn định bộ nhớ (Memory Stability - thời gian ước tính giữ lại ký ức).
  - `difficulty` (FLOAT, NULL): Độ khó của thẻ đối với người dùng (Card Difficulty từ 1.0 - 10.0).
  - `state` (INTEGER, default: 0): Trạng thái FSRS (0=New, 1=Learning, 2=Review, 3=Relearning).
  - `step` (INTEGER, default: 0): Bước học tập FSRS hiện tại.
  - `due` (DATETIME, INDEX): Thời điểm chính xác cần hiển thị ôn tập lại.
  - `last_review` (DATETIME, NULL): Lần ôn tập gần nhất.

---

## 4. Các bảng Thiết lập Lộ trình & Cấu hình (`app/modules/deck/models.py`)

### `user_deck_settings`
Lưu trữ thiết lập lộ trình học tập (Roadmap) và tùy chọn cá nhân cho từng bộ thẻ.
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`, INDEX).
- `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, INDEX).
- `settings` (JSON, default: '{}'): Cấu hình Lộ trình dạng JSON:
  - `roadmap_active` (BOOLEAN): Trạng thái bật/tắt lộ trình cho bộ thẻ.
  - `roadmap_daily_new` (INTEGER): Chỉ tiêu số thẻ mới cần học mỗi ngày (mặc định: 10).
  - `roadmap_daily_review_max` (INTEGER): Giới hạn số thẻ tối đa cần ôn tập mỗi ngày (mặc định: 50).
- `created_at` (DATETIME).

---

## 5. Các bảng Gamification & Thống kê (`app/modules/gamification/models.py`, `app/modules/stats/models.py`)

### `user_gamification`
- `user_id` (INTEGER, Khóa chính, Khóa ngoại `users.id`).
- `xp` (INTEGER, default: 0): Tổng điểm kinh nghiệm tích lũy.
- `level` (INTEGER, default: 1): Cấp độ người dùng.
- `streak_count` (INTEGER, default: 0): Chuỗi ngày học liên tục.
- `last_activity` (DATETIME): Thời điểm hoạt động gần nhất.
- `badges` (JSON, default: '[]'): Danh sách ID các huy hiệu đã mở khóa.

### `badges`
- `id` (VARCHAR(50), Khóa chính): Định danh huy hiệu (`speed_demon`, `perfect_score`, `streak_master`...).
- `name` (VARCHAR(100)): Tên hiển thị huy hiệu.
- `description` (VARCHAR(255)): Yêu cầu điều kiện đạt.
- `icon` (VARCHAR(50)): Tên biểu tượng hiển thị Lucide.
- `criteria_type` (VARCHAR(50)): Loại tiêu chí (`xp`, `streak`, `accuracy`, `speed`).
- `criteria_value` (INTEGER): Giá trị ngưỡng đạt.

---

## 6. Các bảng Cấu hình SSO (`app/modules/sso_module/models.py`)

### `sso_settings`
- `id` (INTEGER, Khóa chính).
- `is_enabled` (BOOLEAN, default: False): Kích hoạt/Tắt SSO CentralAuth.
- `server_url` (VARCHAR(255), NULL): URL máy chủ CentralAuth (mặc định: `http://localhost:5000`).
- `client_id` (VARCHAR(100), NULL): Client ID đăng ký (mặc định: `vocaburn-v1`).
- `client_secret` (VARCHAR(255), NULL): Mã bí mật Client.
- `redirect_uri` (VARCHAR(255), NULL): Callback URI.
