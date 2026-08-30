# 🗄️ Cấu trúc Cơ sở Dữ liệu Vocaburn (Database Structure)

Hệ thống Cơ sở Dữ liệu của **Vocaburn** được xây dựng dựa trên **SQLite** tối ưu hóa ghi đồng thời với chế độ **Write-Ahead Logging (WAL)**. Quản lý cấu trúc bảng, quan hệ ORM và di cư dữ liệu được thực thi bất đồng bộ qua **SQLAlchemy Async ORM** (`AsyncSession`) và **Alembic Migrations**.

* **Vị trí tệp cơ sở dữ liệu mặc định**: `Storage/database/Vocaburn.db` (lưu trữ tại thư mục Storage dùng chung của Ecosystem).
* **Quy chuẩn Không localStorage**: Toàn bộ cấu hình giao diện, chế độ học, audio và theme đều được lưu trữ trực tiếp tại bảng `user_global_settings`.

---

## 1. Quản lý Tài khoản & Cấu hình Người dùng (`app/modules/auth/models.py`)

### `users`
Bảng chứa thông tin tài khoản người dùng (đồng bộ từ CentralAuth hoặc tạo cục bộ khi chạy stand-alone).
* `id` (INTEGER, Khóa chính, Index): ID tự tăng định danh người dùng.
* `username` (VARCHAR(255), UNIQUE, Index): Tên đăng nhập.
* `email` (VARCHAR(255), UNIQUE, Index): Địa chỉ email.
* `hashed_password` (VARCHAR(255), NULL): Mật khẩu băm (NULL nếu đăng nhập thuần SSO).
* `full_name` (VARCHAR(255)): Họ và tên hiển thị.
* `role` (VARCHAR(50), default: 'user'): Vai trò người dùng (`admin` hoặc `user`).
* `is_active` (BOOLEAN, default: True): Trạng thái hoạt động của tài khoản.
* `sso_id` (VARCHAR(255), UNIQUE, Index, NULL): ID liên kết tài khoản từ CentralAuth.
* `created_at` (DATETIME): Thời điểm tạo tài khoản.

### `user_global_settings` (Tuân thủ No-localStorage Directive)
Bảng trung tâm lưu trữ toàn bộ tùy chọn giao diện, chế độ học tập và trạng thái hiển thị của người dùng, được đồng bộ 2 chiều với Zustand store (`useAppStore.ts`).
* `id` (INTEGER, Khóa chính, Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, UNIQUE, Index, Non-null).
* **Tùy chọn Giao diện & Hiệu ứng**:
  * `theme` (VARCHAR(20), default: 'light'): Giao diện sáng/tối (`light` | `dark`).
  * `focus_timer_active` (BOOLEAN, default: True): Bật/tắt đồng hồ đếm giờ tập trung.
  * `sfx_enabled` (BOOLEAN, default: True): Âm thanh hiệu ứng (SFX).
  * `haptic_enabled` (BOOLEAN, default: True): Phản hồi xúc giác/rung (Haptic).
  * `autoplay_audio` (VARCHAR(20), default: 'never'): Tự động phát âm thanh (`never` | `always` | `question`).
  * `quick_learn_enabled` (BOOLEAN, default: False): Chế độ lật nhanh không cần chấm điểm.
  * `random_enabled` (BOOLEAN, default: False): Xáo trộn thẻ ngẫu nhiên.
  * `show_images` (VARCHAR(20), default: 'always'): Hiển thị ảnh minh họa.
  * `show_fsrs` (BOOLEAN, default: True): Hiển thị chỉ số FSRS trên thẻ.
* **Tùy chọn Chế độ Học & Luyện tập**:
  * `quiz_learning_mode` (VARCHAR(50), default: 'fsrs'): Thuật toán học chính (`fsrs` | `leitner` | `practice`).
  * `practice_submode` (VARCHAR(50), default: 'mcq'): Chế độ luyện tập (`mcq` | `typing` | `listening`).
  * `practice_range` (VARCHAR(20), default: 'all'): Phạm vi thẻ luyện tập (`all` | `learned`).
* **Tùy chọn Hiển thị & Công cụ Thẻ**:
  * `score_mode` (VARCHAR(20), default: 'all'): Chế độ tính điểm (`today` | `all`).
  * `time_mode` (VARCHAR(20), default: 'card'): Chế độ hiển thị thời gian (`card` | `today` | `all`).
  * `last_deck_id` (INTEGER, NULL): ID bộ thẻ học gần nhất.
  * `paste_columns` (JSON, default: `['front', 'back']`): Cấu hình cột khi dán nhanh hàng loạt.
  * `quick_add_columns` (JSON, default: `['front', 'back']`): Cấu hình cột khi thêm thẻ nhanh.
  * `updated_at` (DATETIME): Thời điểm cập nhật thiết lập gần nhất.

---

## 2. Quản lý Danh mục & Học liệu Flashcard (`app/modules/deck/models.py`)

### `categories`
* `id` (INTEGER, Khóa chính, Index).
* `name` (VARCHAR(255), UNIQUE, Index): Tên danh mục (ví dụ: *JLPT N1*, *IELTS Band 8.0*).
* `description` (TEXT, NULL): Mô tả danh mục.
* `created_at` (DATETIME).

### `flashcard_decks`
* `id` (INTEGER, Khóa chính, Index).
* `title` (VARCHAR(255), Index): Tiêu đề bộ thẻ.
* `description` (TEXT, NULL): Mô tả chi tiết.
* `category_id` (INTEGER, Khóa ngoại `categories.id`, Index).
* `creator_id` (INTEGER, NULL): Người tạo/tải lên bộ thẻ (`users.id`).
* `instruction` (TEXT, NULL): Hướng dẫn học chung của bộ thẻ.
* `cover_image` (VARCHAR(512), NULL): URL ảnh bìa bộ thẻ.
* `time_limit` (INTEGER, default: 0): Giới hạn thời gian (phút), 0 là không giới hạn.
* `is_active` (BOOLEAN, default: True): Trạng thái hoạt động.
* `is_public` (BOOLEAN, default: True): Trạng thái công khai trong Thư viện chung.
* `practice_settings` (JSON, NULL): Cấu hình mặc định cho các chế độ luyện tập (MCQ, Typing).
* `created_at` (DATETIME).

### `flashcards`
* `id` (INTEGER, Khóa chính, Index).
* `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, Index): ID bộ thẻ sở hữu.
* `content` / `front` (TEXT, Non-null): Nội dung mặt trước thẻ (từ vựng, kanji, câu hỏi).
* `front_audio_content` (TEXT, NULL) / `back_audio_content` (TEXT, NULL): Văn bản dùng để đọc phát âm mặt trước/sau.
* `front_audio_url` / `audio` (VARCHAR(512), NULL) / `back_audio_url` (VARCHAR(512), NULL): URL tệp âm thanh TTS đã sinh.
* `front_img` (VARCHAR(512), NULL) / `back_img` (VARCHAR(512), NULL): URL ảnh minh họa mặt trước/sau.
* `question_type` (VARCHAR(50), default: 'flashcard'): Phân loại thẻ (`flashcard`, `mcq`, `typing`).
* `explanation` / `back` (TEXT, NULL): Giải thích chi tiết mặt sau (hỗ trợ HTML và thẻ `<ruby>` sinh bởi Gemini AI).
* `others` (JSON, NULL): Đáp án nhiễu (distractors) hoặc dữ liệu mở rộng cho câu hỏi trắc nghiệm.
* `created_at` (DATETIME, NULL).

### `tags` / `deck_tags`
* `tags`: `id` (Khóa chính), `name` (VARCHAR(50), UNIQUE, Index), `created_at`.
* `deck_tags`: Bảng liên kết nhiều-nhiều giữa `flashcard_decks.id` (`deck_id`) và `tags.id` (`tag_id`).

### `deck_collaborators`
Bảng phân quyền cộng tác viên đồng quản lý bộ thẻ.
* `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, Khóa chính).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Khóa chính).
* `added_at` (DATETIME): Thời điểm gán quyền cộng tác viên.

---

## 3. Thuật toán FSRS v6, Lịch sử & Phiên Học (`app/modules/deck/models.py`)

### `deck_attempts`
Bảng ghi nhận từng lượt học/luyện tập một bộ thẻ.
* `id` (INTEGER, Khóa chính, Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, Index).
* `mode` (VARCHAR(50)): Chế độ học (`sequential`, `random`, `fsrs`, `mastery`, `roadmap`).
* `score` (INTEGER, default: 0): Điểm số đạt được trong lượt học.
* `total_cards` (INTEGER, default: 0): Tổng số thẻ đã qua.
* `is_archived` (BOOLEAN, default: False): Trạng thái lưu trữ.
* `started_at` (DATETIME, Index): Thời điểm bắt đầu.
* `completed_at` (DATETIME, NULL): Thời điểm kết thúc.

### `card_answers`
Ghi nhận kết quả chi tiết từng lần trả lời thẻ trong một lượt học.
* `id` (INTEGER, Khóa chính, Index).
* `attempt_id` (INTEGER, Khóa ngoại `deck_attempts.id`, Index).
* `card_id` (INTEGER, Khóa ngoại `flashcards.id`, Index).
* `is_correct` (BOOLEAN, default: False): Đúng/Sai.
* `active_time` (FLOAT, default: 0.0): Thời gian phản hồi thẻ (giây).
* `rating` (INTEGER, NULL): Đánh giá FSRS (1=Again, 2=Hard, 3=Good, 4=Easy).
* `created_at` (DATETIME, Index).

### `deck_sessions`
Lưu trữ phiên học dở dang để người học tiếp tục ngay khi mở lại ứng dụng.
* `id` (INTEGER, Khóa chính, Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, Index).
* `mode` (VARCHAR): Chế độ học (`classic`, `chaos`, `mastery`, `batch`, `roadmap`).
* `current_index` (INTEGER, default: 0): Vị trí thẻ hiện tại trong hàng đợi.
* `state_json` (TEXT): JSON lưu mảng thứ tự ID thẻ và kết quả làm bài dở dang.
* `updated_at` (DATETIME).

### `user_card_mastery` (Chỉ số Bộ nhớ FSRS v6 & Leitner)
Quản lý trạng thái và khoảng thời gian ôn tập riêng cho từng cặp Người dùng - Thẻ.
* `id` (INTEGER, Khóa chính, Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `card_id` (INTEGER, Khóa ngoại `flashcards.id`, Index).
* `is_ignored` (BOOLEAN, default: False): Đánh dấu bỏ qua thẻ.
* `is_starred` (BOOLEAN, default: False): Đánh dấu sao thẻ quan trọng để ôn riêng.
* `box_level` (INTEGER, default: 1): Cấp độ hộp Leitner (1 đến 5).
* `consecutive_correct` (INTEGER, default: 0): Chuỗi trả lời đúng liên tiếp.
* `last_answered` (DATETIME).
* **Thông số FSRS v6 Core**:
  * `stability` (FLOAT, NULL): Độ bền bộ nhớ (Memory Stability - số ngày ước tính giữ lại 90% khả năng nhớ lại).
  * `difficulty` (FLOAT, NULL): Độ khó của thẻ đối với người dùng (Card Difficulty từ 1.0 đến 10.0).
  * `state` (INTEGER, default: 0): Trạng thái FSRS (`0=New`, `1=Learning`, `2=Review`, `3=Relearning`).
  * `step` (INTEGER, default: 0): Bước học FSRS hiện tại.
  * `due` (DATETIME, Index): Thời điểm chính xác cần ôn tập lại.
  * `last_due` (DATETIME, NULL): Hạn ôn tập trước đó.
  * `last_review` (DATETIME, NULL): Lần ôn tập gần nhất.

---

## 4. Lộ trình Học tập (Roadmap) & Ghi chú Cá nhân (`app/modules/deck/models.py`)

### `user_deck_settings`
* `id` (INTEGER, Khóa chính, Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, Index).
* `settings` (JSON, NULL): Cấu hình Lộ trình học (Pipeline các bước: Học từ mới, MCQ, Ôn tập FSRS, Test, chỉ tiêu số thẻ hàng ngày).
* `updated_at` (DATETIME).

### `user_deck_goals`
* `id` (INTEGER, Khóa chính, Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, Index).
* `daily_target` (INTEGER, default: 5): Chỉ tiêu số thẻ mới mỗi ngày.
* `daily_time_target` (INTEGER, default: 10): Chỉ tiêu thời gian học (phút).
* `daily_card_target` (INTEGER, default: 20): Chỉ tiêu tổng số thẻ xem trong ngày.
* `streak_count` (INTEGER, default: 0): Chuỗi ngày hoàn thành mục tiêu liên tục của bộ thẻ.
* `last_completed_date` (VARCHAR(50), NULL): Ngày hoàn thành gần nhất (`YYYY-MM-DD`).
* `last_completed_at` (DATE, NULL).
* `status` (VARCHAR(50), default: 'active'): Trạng thái mục tiêu (`active`, `paused`, `completed`).
* `created_at` (DATETIME).

### `user_daily_progress`
* `id` (INTEGER, Khóa chính, Index).
* `goal_id` (INTEGER, Khóa ngoại `user_deck_goals.id`, Index).
* `date` (VARCHAR(50), Index): Ngày học (`YYYY-MM-DD`).
* `date_val` (DATE, NULL, Index).
* `count_done` (INTEGER, default: 0): Số thẻ đã hoàn thành trong ngày.
* `is_target_met` (BOOLEAN, default: False): Đã đạt chỉ tiêu ngày chưa.
* `is_rescued` (BOOLEAN, default: False): Đã dùng thẻ bảo vệ streak để cứu ngày chưa.
* `created_at` (DATETIME).

### `roadmap_pipeline_history`
Lưu vết các phiên bản pipeline lộ trình học tập của người dùng.
* `id` (INTEGER, Khóa chính, Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, Index).
* `pipeline_json` (JSON, Non-null): Cấu trúc pipeline các bước học.
* `changed_at` (DATETIME).
* `change_type` (VARCHAR(20)): Phân loại thay đổi (`initial`, `upgrade`, `downgrade`, `reorder`).
* `change_summary` (TEXT, NULL): Tóm tắt nội dung thay đổi.
* `effective_from` (DATE, Non-null): Ngày bắt đầu áp dụng.
* `effective_until` (DATE, NULL): Ngày kết thúc áp dụng (NULL = đang hiệu lực).

### `user_practice_stats`
Thống kê hiệu suất làm bài theo từng chế độ luyện tập nâng cao cho mỗi thẻ.
* `id` (INTEGER, Khóa chính, Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `card_id` (INTEGER, Khóa ngoại `flashcards.id`, Index).
* `practice_mode` (VARCHAR(50), default: 'mcq'): Chế độ luyện tập (`mcq`, `typing`, `listening`).
* `correct_count` (INTEGER, default: 0): Số lần làm đúng.
* `wrong_count` (INTEGER, default: 0): Số lần làm sai.
* `total_time_spent` (FLOAT, default: 0.0): Tổng thời gian đã học thẻ này (giây).
* `last_practiced` (DATETIME).

### `user_card_notes`
* `id` (INTEGER, Khóa chính, Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `card_id` (INTEGER, Khóa ngoại `flashcards.id`, Index).
* `content` (TEXT, Non-null): Nội dung ghi chú viết tay của người học.
* `updated_at` (DATETIME).

---

## 5. Phòng Học Nhóm Realtime — Multiplayer Room (`app/modules/deck/models.py`)

### `deck_rooms`
* `id` (INTEGER, Khóa chính, Index).
* `deck_id` (INTEGER, Khóa ngoại `flashcard_decks.id`, Index).
* `room_code` (VARCHAR(20), UNIQUE, Index): Mã phòng tham gia.
* `host_id` (INTEGER, Khóa ngoại `users.id`, Index): ID người tạo/chủ phòng.
* `status` (VARCHAR(50), default: 'waiting'): Trạng thái phòng (`waiting`, `active`, `finished`).
* `settings` (JSON, NULL): Cấu hình phòng (thời gian mỗi câu, số lượng câu).
* `created_at` (DATETIME).
* `started_at` (DATETIME, NULL).
* `finished_at` (DATETIME, NULL).

### `deck_room_participants`
* `id` (INTEGER, Khóa chính, Index).
* `deck_room_id` (INTEGER, Khóa ngoại `deck_rooms.id`, Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `is_ready` (BOOLEAN, default: False): Trạng thái sẵn sàng.
* `score` (INTEGER, default: 0): Điểm số thi đấu.
* `total_answered` (INTEGER, default: 0): Số câu đã hoàn thành.
* `joined_at` (DATETIME).
* `last_active` (DATETIME).

### `deck_room_chats`
* `id` (INTEGER, Khóa chính, Index).
* `deck_room_id` (INTEGER, Khóa ngoại `deck_rooms.id`, ondelete='CASCADE', Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `message` (TEXT, Non-null): Nội dung tin nhắn chat trong phòng.
* `created_at` (DATETIME).

---

## 6. Đóng góp ý kiến & Thảo luận trên Thẻ (`app/modules/deck/models.py`)

### `card_contributions`
* `id` (INTEGER, Khóa chính, Index).
* `card_id` (INTEGER, Khóa ngoại `flashcards.id`, ondelete='CASCADE', Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, ondelete='CASCADE', Index).
* `parent_id` (INTEGER, Khóa ngoại `card_contributions.id`, ondelete='CASCADE', NULL, Index): Hỗ trợ luồng phản hồi lồng nhau (Replies).
* `type` (VARCHAR(20), default: 'comment', Non-null): Phân loại (`comment`, `correction`).
* `content` (TEXT, Non-null): Nội dung bình luận/đóng góp.
* `status` (VARCHAR(20), default: 'active', Non-null): Trạng thái (`active`, `pending_review`, `resolved`, `ignored`).
* `likes_count` (INTEGER, default: 0, Non-null).
* `created_at` (DATETIME).
* `updated_at` (DATETIME).

### `contribution_likes`
* `user_id` (INTEGER, Khóa ngoại `users.id`, ondelete='CASCADE', Khóa chính).
* `contribution_id` (INTEGER, Khóa ngoại `card_contributions.id`, ondelete='CASCADE', Khóa chính).

---

## 7. Game hóa, Điểm số & Huy hiệu (`app/modules/gamification/models.py`)

### `user_gamification`
* `user_id` (INTEGER, Khóa chính, Khóa ngoại `users.id`).
* `xp` (INTEGER, default: 0): Tổng điểm kinh nghiệm tích lũy (+10 đúng, +2 sai).
* `level` (INTEGER, default: 1): Cấp độ người dùng.
* `streak_count` (INTEGER, default: 0): Chuỗi ngày học liên tục toàn cầu.
* `streak_points` (INTEGER, default: 0): Đơn vị tiền thưởng tích lũy (dùng mua đóng băng streak).
* `streak_freeze_count` (INTEGER, default: 0): Số lượng thẻ đóng băng streak đang có (tối đa 2).
* `last_freeze_used_at` (DATETIME, NULL): Lần tự động sử dụng đóng băng streak gần nhất.
* `last_activity` (DATETIME).
* `badges` (JSON, default: `[]`): Danh sách ID các huy hiệu đã mở khóa.

### `badges`
* `id` (VARCHAR(50), Khóa chính): Định danh huy hiệu (`speed_demon`, `perfect_score`, `streak_master`...).
* `name` (VARCHAR(100)): Tên hiển thị huy hiệu.
* `description` (VARCHAR(255)): Điều kiện mở khóa.
* `icon` (VARCHAR(50)): Tên icon Lucide.
* `criteria_type` (VARCHAR(50)): Loại tiêu chuẩn (`xp`, `streak`, `accuracy`).
* `criteria_value` (INTEGER): Giá trị ngưỡng đạt được.

### `user_daily_activities`
* `id` (INTEGER, Khóa chính, Autoincrement).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index, Non-null).
* `activity_date` (DATE, Index, Non-null): Ngày ghi nhận hoạt động.
* `created_at` (DATETIME).

### `xp_transactions`
* `id` (INTEGER, Khóa chính, Autoincrement).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index, Non-null).
* `amount` (INTEGER, Non-null): Số XP cộng/trừ.
* `source` (VARCHAR(100), Non-null): Nguồn cộng XP (`quiz_answer`, `streak_bonus`, `badge_unlock`, `daily_goal`).
* `created_at` (DATETIME, Index).

### `user_badges`
* `user_id` (INTEGER, Khóa ngoại `users.id`, Khóa chính).
* `badge_id` (VARCHAR(50), Khóa ngoại `badges.id`, Khóa chính).
* `earned_at` (DATETIME).

### `point_transactions`
* `id` (INTEGER, Khóa chính, Autoincrement).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index, Non-null).
* `amount` (INTEGER, Non-null): Số điểm thưởng giao dịch.
* `source` (VARCHAR(100), Non-null): Nguồn giao dịch (`daily_target`, `double_target`, `buy_freeze`).
* `created_at` (DATETIME, Index).

---

## 8. Thông báo Đẩy & Telegram Bot (`app/modules/notification/models.py`)

### `notifications`
* `id` (INTEGER, Khóa chính).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `title` (VARCHAR(100)): Tiêu đề thông báo.
* `message` (VARCHAR(255)): Nội dung chi tiết.
* `type` (VARCHAR(50)): Phân loại (`level_up`, `badge`, `system`, `streak`).
* `is_read` (BOOLEAN, default: False): Trạng thái đã đọc.
* `created_at` (DATETIME).

### `push_subscriptions`
* `id` (INTEGER, Khóa chính, Index).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `endpoint` (VARCHAR(512), UNIQUE, Index): Endpoint Web Push của trình duyệt.
* `p256dh` (VARCHAR(255)): Khóa công khai mã hóa.
* `auth` (VARCHAR(255)): Chuỗi bí mật xác thực Web Push.
* `created_at` (DATETIME).

### `user_telegram_configs`
* `id` (INTEGER, Khóa chính, Index).
* `user_id` (INTEGER, UNIQUE, Index): Khóa liên kết tài khoản Vocaburn.
* `telegram_chat_id` (VARCHAR(100), NULL, Index): Chat ID của người dùng trên Telegram.
* `connect_token` (VARCHAR(50), UNIQUE, NULL): Token bảo mật ghép nối tài khoản qua Telegram Bot.
* `reminder_time` (VARCHAR(10), default: '20:00'): Giờ gửi thông báo nhắc nhở hàng ngày (HH:MM).
* `is_active` (BOOLEAN, default: True): Trạng thái bật/tắt nhận tin nhắn.
* `streak_guard_enabled` (BOOLEAN, default: True): Bật thông báo khẩn cấp bảo vệ chuỗi Streak trước nửa đêm.
* `weekly_summary_enabled` (BOOLEAN, default: True): Nhận báo cáo tổng kết tuần.
* `inactivity_alert_enabled` (BOOLEAN, default: True): Cảnh báo khi không học nhiều ngày.
* `created_at` (DATETIME).
* `updated_at` (DATETIME).

---

## 9. Thống kê Hàng ngày (`app/modules/stats/models.py`)

### `user_daily_stats`
* `id` (INTEGER, Khóa chính).
* `user_id` (INTEGER, Khóa ngoại `users.id`, Index).
* `date` (DATETIME, default: `datetime.utcnow`): Thời điểm ghi nhận.
* `questions_attempted` (INTEGER, default: 0): Tổng số thẻ/câu hỏi đã làm trong ngày.
* `correct_answers` (INTEGER, default: 0): Số câu trả lời đúng.
* `total_time_seconds` (INTEGER, default: 0): Tổng thời gian học (giây).
* `accuracy` (FLOAT, default: 0.0): Tỷ lệ phần trăm trả lời đúng.
* `is_active` (BOOLEAN, default: True): Đánh dấu ngày học hợp lệ.
* `is_frozen` (BOOLEAN, default: False): Đánh dấu ngày được đóng băng bảo vệ streak.

---

## 10. Cấu hình Hệ thống, SSO & Nhật ký Admin (`app/modules/sso_module/models.py`, `app/modules/admin/models.py`)

### `sso_settings`
* `id` (INTEGER, Khóa chính, Index).
* `is_enabled` (BOOLEAN, default: False): Trạng thái kích hoạt SSO CentralAuth.
* `server_url` (VARCHAR(255), NULL): Địa chỉ URL CentralAuth Server (mặc định: `http://localhost:5000`).
* `client_id` (VARCHAR(100), NULL): Client ID đăng ký (mặc định: `vocaburn-v1`).
* `client_secret` (VARCHAR(255), NULL): Client Secret xác thực.
* `redirect_uri` (VARCHAR(255), NULL): URI callback nhận Authorization Code.

### `system_configs`
* `id` (VARCHAR(50), Khóa chính): Khóa cấu hình hệ thống (ví dụ: `sso_config`, `maintenance_mode`).
* `value` (JSON): Dữ liệu cấu hình dạng JSON.
* `updated_at` (DATETIME).

### `admin_logs`
* `id` (INTEGER, Khóa chính).
* `admin_id` (INTEGER): ID quản trị viên thực hiện hành động.
* `action` (VARCHAR(100)): Tên hành động quản trị.
* `details` (VARCHAR(255)): Chi tiết tác vụ.
* `created_at` (DATETIME).
