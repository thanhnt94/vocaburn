# 🗄️ Cấu trúc Cơ sở Dữ liệu Vocaburn (Database Structure)

Hệ thống cơ sở dữ liệu của Vocaburn được xây dựng dựa trên **SQLite** ở môi trường phát triển (chạy tối ưu hóa qua chế độ Write-Ahead Logging - WAL). Định nghĩa bảng và mối quan hệ được quản lý bởi **SQLAlchemy Object-Relational Mapper (ORM)** và **Alembic Migrations**.

- **Đường dẫn tệp cơ sở dữ liệu**: `Storage/database/Vocaburn.db` (nằm ngoài thư mục code dự án để dễ dàng sao lưu và đồng bộ).

---

## 1. Các bảng Quản lý Tài khoản & Phân quyền

### `users`
Bảng chứa thông tin người dùng được đồng bộ từ CentralAuth hoặc tạo cục bộ.
- `id` (INTEGER, Khóa chính): ID định danh tự tăng.
- `username` (VARCHAR(255), UNIQUE, INDEX): Tên đăng nhập.
- `email` (VARCHAR(255), UNIQUE, INDEX): Địa chỉ email.
- `hashed_password` (VARCHAR(255), NULL): Mật khẩu băm (có thể null nếu chỉ đăng nhập qua SSO).
- `full_name` (VARCHAR(255)): Họ và tên hiển thị.
- `role` (VARCHAR(50), default: 'user'): Vai trò ('admin' hoặc 'user').
- `is_active` (BOOLEAN, default: True): Trạng thái hoạt động.
- `sso_id` (VARCHAR(255), UNIQUE, INDEX, NULL): ID định danh liên kết tài khoản từ CentralAuth.
- `created_at` (DATETIME): Thời điểm tạo tài khoản.

---

## 2. Các bảng Quản lý Danh mục & Học liệu (Flashcards & Decks)

### `categories`
- `id` (INTEGER, Khóa chính).
- `name` (VARCHAR(255), UNIQUE, INDEX): Tên danh mục (Ví dụ: JLPT N1, Tiếng Anh giao tiếp).
- `description` (TEXT, NULL): Mô tả chi tiết danh mục.
- `created_at` (DATETIME).

### `flashcard_decks`
- `id` (INTEGER, Khóa chính).
- `title` (VARCHAR(255), INDEX): Tiêu đề của bộ Flashcard.
- `description` (TEXT, NULL): Mô tả chi tiết.
- `category_id` (INTEGER, Khóa ngoại liên kết `categories.id`).
- `creator_id` (INTEGER, NULL): ID của người tạo/tải bộ thẻ lên.
- `instruction` (TEXT, NULL): Chỉ dẫn học tập chung của bộ thẻ.
- `cover_image` (VARCHAR(512), NULL): URL ảnh bìa của bộ thẻ.
- `time_limit` (INTEGER, default: 0): Giới hạn thời gian học (phút), 0 là không giới hạn.
- `is_active` (BOOLEAN, default: True).
- `is_public` (BOOLEAN, default: True).
- `practice_settings` (JSON, NULL): Cấu hình mặc định cho chế độ luyện tập.
- `created_at` (DATETIME).

### `flashcards` (Tên bảng vật lý: `flashcards`, khóa ngoại liên kết qua cột `quiz_id`)
- `id` (INTEGER, Khóa chính).
- `quiz_id` (INTEGER, Khóa ngoại liên kết `flashcard_decks.id`).
- `content` (TEXT): Nội dung chính của thẻ (từ vựng, câu hỏi, ví dụ).
- `front_audio_content` (TEXT, NULL) / `back_audio_content` (TEXT, NULL): Văn bản để phát âm mặt trước/mặt sau.
- `front_audio_url` (VARCHAR(512), NULL) / `back_audio_url` (VARCHAR(512), NULL): URL file âm thanh lưu trữ.
- `front_img` (VARCHAR(512), NULL) / `back_img` (VARCHAR(512), NULL): URL ảnh minh họa mặt trước/mặt sau.
- `question_type` (VARCHAR(50), default: 'flashcard'): Loại câu hỏi (Ví dụ: flashcard, mcq, typing).
- `explanation` (TEXT, NULL): Giải thích chi tiết (có hỗ trợ HTML và thẻ `<ruby>` sinh bởi Gemini AI).
- `others` (JSON, NULL): Các thông tin tùy biến bổ sung khác.

### `tags` / `deck_tags`
Bảng quản lý nhãn dán cho các bộ Flashcard.
- `tags`: `id` (Khóa chính), `name` (VARCHAR(50), UNIQUE), `created_at`.
- `deck_tags` (Bảng liên kết nhiều-nhiều): `quiz_id` (Khóa ngoại `flashcard_decks.id`), `tag_id` (Khóa ngoại `tags.id`).

---

## 3. Các bảng Ghi nhận Lịch sử & Tiến trình Học tập

### `deck_attempts`
Bảng ghi nhận mỗi lượt bắt đầu luyện tập một bộ Flashcard của người dùng.
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`).
- `quiz_id` (INTEGER, Khóa ngoại `flashcard_decks.id`).
- `mode` (VARCHAR(50)): Chế độ chơi (sequential, random, mastery).
- `score` (INTEGER, default: 0).
- `total_questions` (INTEGER, default: 0): Tổng số thẻ trong lượt.
- `is_archived` (BOOLEAN, default: False).
- `started_at` (DATETIME).
- `completed_at` (DATETIME, NULL).

### `card_answers` (Tên bảng vật lý: `card_answers`)
Bảng lưu trữ kết quả trả lời cho từng thẻ flashcard trong một lượt học cụ thể.
- `id` (INTEGER, Khóa chính).
- `attempt_id` (INTEGER, Khóa ngoại `deck_attempts.id`).
- `question_id` (INTEGER, Khóa ngoại `flashcards.id`).
- `is_correct` (BOOLEAN, default: False).
- `active_time` (FLOAT, default: 0.0): Thời gian trả lời (giây).
- `rating` (INTEGER, NULL): Đánh giá FSRS (1=Again, 2=Hard, 3=Good, 4=Easy).
- `created_at` (DATETIME).

### `user_card_mastery`
Bảng lưu trữ chỉ số ghi nhớ của người dùng đối với từng thẻ riêng biệt theo thuật toán lặp khoảng cách (Leitner và FSRS v6).
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`).
- `question_id` (INTEGER, Khóa ngoại `flashcards.id`).
- `is_ignored` (BOOLEAN, default: False): Người dùng chọn bỏ qua thẻ này.
- `box_level` (INTEGER, default: 1): Cấp độ hộp Leitner (từ 1 đến 5).
- `consecutive_correct` (INTEGER, default: 0): Số lần trả lời đúng liên tiếp.
- `last_answered` (DATETIME).
- **FSRS v6 Attributes**:
  - `stability` (FLOAT, NULL): Độ ổn định bộ nhớ.
  - `difficulty` (FLOAT, NULL): Độ khó của thẻ đối với người dùng.
  - `state` (INTEGER, default: 0): Trạng thái FSRS (0=New, 1=Learning, 2=Review, 3=Relearning).
  - `step` (INTEGER, default: 0): Bước học tập.
  - `due` (DATETIME, INDEX): Thời hạn ôn tập tiếp theo.
  - `last_review` (DATETIME, NULL): Lần ôn tập cuối cùng.

---

## 4. Các bảng Quản lý Lộ trình & Cấu hình bộ thẻ (Roadmap & Settings)

Hệ thống Mục tiêu Học tập cũ (`user_deck_goals`) đã được gỡ bỏ và thay thế hoàn toàn bằng hệ thống quản lý theo Lộ trình (Roadmap). Các mục tiêu học và giới hạn hàng ngày được lưu trữ tập trung dưới dạng cấu hình JSON.

### `user_deck_settings`
Bảng lưu trữ cấu hình lộ trình học tập và tùy chọn luyện tập của người dùng riêng cho từng bộ thẻ.
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`, INDEX).
- `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, INDEX).
- `settings` (JSON, default: '{}'): Chứa cấu hình lộ trình:
  - `roadmap_active` (BOOLEAN): Trạng thái kích hoạt lộ trình học tập của bộ thẻ này.
  - `roadmap_daily_new` (INTEGER): Chỉ tiêu số lượng thẻ mới cần học mỗi ngày (mặc định: 10).
  - `roadmap_daily_review_max` (INTEGER): Giới hạn số lượng thẻ tối đa cần ôn tập mỗi ngày (mặc định: 50).
- `created_at` (DATETIME).

---

## 5. Các bảng Game hóa (Gamification)

### `user_gamification`
- `user_id` (INTEGER, Khóa chính): Khớp với `users.id`.
- `xp` (INTEGER, default: 0): Tổng điểm kinh nghiệm.
- `level` (INTEGER, default: 1): Cấp độ hiện tại.
- `streak_count` (INTEGER, default: 0): Chuỗi ngày học liên tục toàn cầu.
- `last_activity` (DATETIME): Hoạt động cuối cùng.
- `badges` (JSON, default: '[]'): Danh sách ID các huy hiệu đã mở khóa.

### `badges`
- `id` (VARCHAR(50), Khóa chính): Định danh huy hiệu (Ví dụ: `speed_demon`, `perfect_score`).
- `name` (VARCHAR(100)): Tên hiển thị của huy hiệu.
- `description` (VARCHAR(255)): Yêu cầu mở khóa.
- `icon` (VARCHAR(50)): Tên icon Lucide hiển thị.
- `criteria_type` (VARCHAR(50)): Loại tiêu chí xét thưởng (`xp`, `streak`, `accuracy`, `speed`).
- `criteria_value` (INTEGER): Giá trị ngưỡng cần đạt để mở khóa.

---

## 6. Các bảng Cấu hình Hệ thống & SSO

### `sso_settings`
Bảng quản lý cấu hình kết nối Single Sign-On của Vocaburn tới CentralAuth.
- `id` (INTEGER, Khóa chính).
- `is_enabled` (BOOLEAN, default: False): Trạng thái kích hoạt SSO.
- `server_url` (VARCHAR(255), NULL): URL máy chủ CentralAuth (mặc định: `http://localhost:5000`).
- `client_id` (VARCHAR(100), NULL): ID client của Vocaburn (mặc định: `vocaburn-v1`).
- `client_secret` (VARCHAR(255), NULL): Mã bảo mật client.
- `redirect_uri` (VARCHAR(255), NULL): URI callback nhận kết quả xác thực.
