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
- `creator_id` (INTEGER, NULL): Người tạo bộ thẻ (`users.id`).
- `instruction` (TEXT, NULL): Hướng dẫn học chung của bộ thẻ.
- `cover_image` (VARCHAR(512), NULL): URL ảnh bìa bộ thẻ.
- `time_limit` (INTEGER, default: 0): Giới hạn thời gian học (phút), 0 là không giới hạn.
- `is_active` (BOOLEAN, default: True).
- `is_public` (BOOLEAN, default: True).
- `practice_settings` (JSON, NULL): Cấu hình mặc định cho các chế độ luyện tập.
- `created_at` (DATETIME).

### `flashcards` (Bảng chứa Thẻ Từ vựng - Cột liên kết `deck_id`)
- `id` (INTEGER, Khóa chính).
- `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`): ID bộ thẻ sở hữu.
- `content` (TEXT): Nội dung chính mặt trước thẻ (từ vựng, thuật ngữ, câu hỏi).
- `front_audio_content` (TEXT, NULL) / `back_audio_content` (TEXT, NULL): Văn bản dùng để đọc phát âm mặt trước/sau.
- `front_audio_url` (VARCHAR(512), NULL) / `back_audio_url` (VARCHAR(512), NULL): URL tệp âm thanh lưu trữ.
- `front_img` (VARCHAR(512), NULL) / `back_img` (VARCHAR(512), NULL): URL ảnh minh họa mặt trước/sau.
- `question_type` (VARCHAR(50), default: 'flashcard'): Loại câu hỏi (`flashcard`, `mcq`, `typing`).
- `explanation` (TEXT, NULL): Giải thích chi tiết (hỗ trợ HTML và thẻ phát âm `<ruby>` tạo bởi Gemini AI).
- `others` (JSON, NULL): Chứa tùy chọn bổ sung (ví dụ: các đáp án nhiễu MCQ).
- `created_at` (DATETIME).

### `tags` / `deck_tags`
- `tags`: `id` (Khóa chính), `name` (VARCHAR(50), UNIQUE), `created_at`.
- `deck_tags`: Bảng liên kết nhiều-nhiều giữa `flashcard_decks.id` (`deck_id`) và `tags.id`.

### `deck_collaborators` (Cộng tác viên Bộ thẻ)
Bảng liên kết quản lý bộ thẻ đồng sở hữu giữa nhiều người dùng.
- `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`, Khóa chính).
- `added_at` (DATETIME): Ngày thêm cộng tác viên.

---

## 3. Các bảng Lịch sử, Phiên học & Thuật toán FSRS v6 (`app/modules/deck/models.py`)

### `deck_attempts`
Bảng ghi nhận từng lượt học/luyện tập một bộ thẻ của người dùng.
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`).
- `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`).
- `mode` (VARCHAR(50)): Chế độ học (`sequential`, `random`, `fsrs`, `mastery`).
- `score` (INTEGER, default: 0).
- `total_cards` (INTEGER, default: 0): Số thẻ đã qua trong lượt học.
- `is_archived` (BOOLEAN, default: False).
- `started_at` (DATETIME, INDEX).
- `completed_at` (DATETIME, NULL).

### `card_answers`
Bảng ghi nhận kết quả phản hồi cho từng thẻ trong lượt học.
- `id` (INTEGER, Khóa chính).
- `attempt_id` (INTEGER, Khóa ngoại `deck_attempts.id`, INDEX).
- `card_id` (INTEGER, Khóa ngoại `flashcards.id`, INDEX).
- `is_correct` (BOOLEAN, default: False).
- `active_time` (FLOAT, default: 0.0): Thời gian phản hồi (giây).
- `rating` (INTEGER, NULL): Đánh giá FSRS (1=Again, 2=Hard, 3=Good, 4=Easy).
- `created_at` (DATETIME, INDEX).

### `deck_sessions` (Lưu phiên học dở dang)
Lưu trữ trạng thái tạm thời của người học để tiếp tục sau khi tắt ứng dụng.
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, INDEX).
- `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, INDEX).
- `mode` (VARCHAR): Chế độ học (`classic`, `chaos`, `mastery`, `batch`...).
- `current_index` (INTEGER, default: 0): Chỉ số thẻ hiện tại trong hàng đợi.
- `state_json` (STRING): Chuỗi JSON lưu trữ mảng ID thẻ và trạng thái đúng sai tạm thời.
- `updated_at` (DATETIME).

### `user_card_mastery` (Chỉ số Bộ nhớ FSRS v6 & Leitner)
Bảng lưu trữ trạng thái và khoảng thời gian ôn tập riêng cho từng cặp Người dùng - Thẻ từ vựng.
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`, INDEX).
- `card_id` (INTEGER, Khóa ngoại `flashcards.id`, INDEX).
- `is_ignored` (BOOLEAN, default: False): Đánh dấu bỏ qua thẻ này.
- `is_starred` (BOOLEAN, default: False): Đánh dấu sao thẻ quan trọng cần ôn tập riêng.
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

## 4. Các bảng Thiết lập Lộ trình & Ghi chú Cá nhân (`app/modules/deck/models.py`)

### `user_deck_settings`
Lưu trữ thiết lập lộ trình học tập (Roadmap) và tùy chọn cá nhân cho từng bộ thẻ.
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, INDEX).
- `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, INDEX).
- `settings` (JSON, default: '{}'): Cấu hình Lộ trình dạng JSON:
  - `roadmap_active` (BOOLEAN): Trạng thái bật/tắt lộ trình cho bộ thẻ.
  - `roadmap_daily_new` (INTEGER): Chỉ tiêu số thẻ mới cần học mỗi ngày (mặc định: 10).
  - `roadmap_daily_review_max` (INTEGER): Giới hạn số thẻ tối đa cần ôn tập mỗi ngày (mặc định: 50).
- `updated_at` (DATETIME).

### `user_card_notes` (Ghi chú Cá nhân trên Thẻ)
Lưu trữ các ghi chú viết tay của người dùng trên mỗi thẻ từ vựng.
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`, INDEX).
- `card_id` (INTEGER, Khóa ngoại `flashcards.id`, INDEX).
- `content` (TEXT): Nội dung ghi chú.
- `updated_at` (DATETIME).

---

## 5. Mục tiêu Học tập, Game hóa & Thống kê (`app/modules/deck/models.py`, `app/modules/gamification/models.py`, `app/modules/stats/models.py`)

### `user_deck_goals` (Mục tiêu học theo bộ thẻ)
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`, INDEX).
- `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, INDEX).
- `daily_target` (INTEGER, default: 5): Số lượng thẻ mới hàng ngày.
- `daily_time_target` (INTEGER, default: 10): Thời gian học hàng ngày (phút).
- `daily_card_target` (INTEGER, default: 20): Số lượng thẻ xem tối thiểu hàng ngày.
- `streak_count` (INTEGER, default: 0).
- `last_completed_date` (VARCHAR(50), NULL): Ngày hoàn thành gần nhất (`YYYY-MM-DD`).
- `status` (VARCHAR(50), default: 'active').
- `created_at` (DATETIME).

### `user_daily_progress` (Tiến trình hàng ngày của mục tiêu)
- `id` (INTEGER, Khóa chính).
- `goal_id` (INTEGER, Khóa ngoại `user_deck_goals.id`, INDEX).
- `date` (VARCHAR(50), INDEX): Định dạng ngày `YYYY-MM-DD`.
- `count_done` (INTEGER, default: 0): Số lượng thẻ đã hoàn thành.
- `is_target_met` (BOOLEAN, default: False).
- `created_at` (DATETIME).

### `user_global_goals` (Mục tiêu học tập toàn cục)
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`, UNIQUE, INDEX).
- `daily_time_target` (INTEGER, default: 20): Mục tiêu thời gian toàn cục (phút).
- `daily_card_target` (INTEGER, default: 20): Mục tiêu số thẻ toàn cục.
- `daily_new_card_target` (INTEGER, default: 10): Mục tiêu thẻ mới toàn cục.
- `updated_at` (DATETIME).

### `user_practice_stats` (Thống kê hiệu năng luyện tập nâng cao)
Thống kê số lần trả lời đúng/sai theo từng chế độ luyện tập riêng cho mỗi thẻ.
- `id` (INTEGER, Khóa chính).
- `user_id` (INTEGER, Khóa ngoại `users.id`, INDEX).
- `card_id` (INTEGER, Khóa ngoại `flashcards.id`, INDEX).
- `practice_mode` (VARCHAR(50), default: 'mcq'): Chế độ luyện tập (`mcq`, `typing`, `listening`).
- `correct_count` (INTEGER, default: 0).
- `wrong_count` (INTEGER, default: 0).
- `total_time_spent` (FLOAT, default: 0.0): Tổng thời gian đã làm (giây).
- `last_practiced` (DATETIME).

### `user_gamification` (Thông tin Điểm số & Streak)
- `user_id` (INTEGER, Khóa chính, Khóa ngoại `users.id`).
- `xp` (INTEGER, default: 0): Tổng điểm kinh nghiệm tích lũy.
- `level` (INTEGER, default: 1): Cấp độ người dùng.
- `streak_count` (INTEGER, default: 0): Chuỗi ngày học liên tục.
- `last_activity` (DATETIME): Thời điểm hoạt động gần nhất.
- `badges` (JSON, default: '[]'): Danh sách ID các huy hiệu đã mở khóa.

### `badges` (Danh mục Huy hiệu Hệ thống)
- `id` (VARCHAR(50), Khóa chính): Định danh huy hiệu (`speed_demon`, `perfect_score`, `streak_master`...).
- `name` (VARCHAR(100)): Tên hiển thị huy hiệu.
- `description` (VARCHAR(255)): Yêu cầu điều kiện đạt.
- `icon` (VARCHAR(50)): Tên biểu tượng hiển thị Lucide.
- `criteria_type` (VARCHAR(50)): Loại tiêu chí (`xp`, `streak`, `accuracy`, `speed`).
- `criteria_value` (INTEGER): Giá trị ngưỡng đạt.

---

## 6. Đóng góp ý kiến & Thảo luận trên Thẻ (`app/modules/deck/models.py`)

### `card_contributions`
Lưu trữ các bình luận hoặc đóng góp sửa lỗi cho thẻ từ vựng.
- `id` (INTEGER, Khóa chính).
- `card_id` (INTEGER, Khóa ngoại `flashcards.id`, INDEX).
- `user_id` (INTEGER, Khóa ngoại `users.id`, INDEX).
- `parent_id` (INTEGER, Khóa ngoại `card_contributions.id`, NULL, INDEX): Liên kết để tạo luồng trả lời (Reply).
- `type` (VARCHAR(20), default: 'comment'): Phân loại đóng góp (`comment`, `correction`).
- `content` (TEXT): Nội dung bình luận.
- `status` (VARCHAR(20), default: 'active'): Trạng thái (`active`, `pending_review`, `resolved`, `ignored`).
- `likes_count` (INTEGER, default: 0).
- `created_at` (DATETIME).
- `updated_at` (DATETIME).

### `contribution_likes` (Lượt thích đóng góp)
Bảng liên kết để quản lý lượt thích của người dùng đối với mỗi bình luận.
- `user_id` (INTEGER, Khóa ngoại `users.id`, Khóa chính).
- `contribution_id` (INTEGER, Khóa ngoại `card_contributions.id`, Khóa chính).

---

## 7. Các bảng cấu hình Hệ thống & SSO (`app/modules/sso_module/models.py`, `app/modules/admin/models.py`)

### `sso_settings`
- `id` (INTEGER, Khóa chính).
- `is_enabled` (BOOLEAN, default: False): Kích hoạt/Tắt SSO CentralAuth.
- `server_url` (VARCHAR(255), NULL): URL máy chủ CentralAuth.
- `client_id` (VARCHAR(100), NULL): Client ID đăng ký (mặc định: `vocaburn-v1`).
- `client_secret` (VARCHAR(255), NULL): Mã bí mật Client.
- `redirect_uri` (VARCHAR(255), NULL): Callback URI.

### `system_configs`
Quản lý cấu hình động toàn cục của Vocaburn (như bật/tắt chế độ bảo trì, API keys...).
- `key` (VARCHAR(100), Khóa chính): Khóa cấu hình.
- `value` (TEXT, NULL): Giá trị lưu trữ.
- `description` (VARCHAR(255), NULL): Mô tả vai trò của cấu hình này.
- `updated_at` (DATETIME).
