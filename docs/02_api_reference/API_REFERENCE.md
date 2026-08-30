# 📡 Danh sách REST API Endpoints Vocaburn (API Reference)

Tất cả API Endpoints chính của Vocaburn được định nghĩa trong 8 module tại `app/modules/` và được mount dưới tiền tố chuẩn **`/api/v1/`** (ngoại trừ các endpoint callback và một số endpoints đặc biệt).

* **Base URL Mặc định**: `http://localhost:5090/api/v1`
* **Xác thực**: Session Cookie HttpOnly (`user_id` đã ký HMAC).

---

## 1. Quản lý Thẻ học, Bộ thẻ & Thao tác Dữ liệu (`/api/v1/deck`)

### 1.1. Thao tác Cơ bản (CRUD) & Import/Export (`crud.py`)

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `GET` | `/deck/template/download` | Tải về tệp Excel mẫu tiêu chuẩn (`.xlsx`). |
| `POST` | `/deck/preview` | Xem trước (parse) dữ liệu tệp Excel trước khi lưu. |
| `POST` | `/deck/upload` | Import/Tạo mới bộ thẻ từ tệp Excel chuẩn. |
| `POST` | `/deck/import-text` | Import nhanh bộ thẻ từ văn bản thô (Raw text). |
| `POST` | `/deck/create` | Tạo một bộ thẻ trống mới. |
| `POST` | `/deck/validate` | Kiểm tra cấu trúc tệp Excel hợp lệ. |
| `GET` | `/deck/{deck_id}/questions` | Lấy danh sách thẻ trong bộ (hỗ trợ phân trang & tìm kiếm). |
| `POST` | `/deck/{deck_id}/enroll` | Ghi danh người dùng hiện tại vào bộ thẻ. |
| `POST` | `/deck/{deck_id}/archive` | Lưu trữ (archive) hoặc bỏ lưu trữ bộ thẻ đối với người dùng. |
| `DELETE` | `/deck/{deck_id}` | Xóa bộ thẻ (chỉ chủ sở hữu hoặc Admin). |
| `PATCH` | `/deck/{deck_id}` | Cập nhật thông tin chi tiết bộ thẻ (tiêu đề, ảnh bìa, mô tả...). |
| `GET` | `/deck/users/search` | Tìm kiếm người dùng hệ thống để thêm cộng tác viên. |
| `GET` | `/deck/{deck_id}/collaborators` | Lấy danh sách cộng tác viên của bộ thẻ. |
| `POST` | `/deck/{deck_id}/collaborators` | Gán quyền cộng tác viên cho người dùng. |
| `DELETE` | `/deck/{deck_id}/collaborators/{collab_user_id}` | Thu hồi quyền cộng tác viên. |
| `POST` | `/deck/{deck_id}/transfer-ownership` | Chuyển nhượng quyền sở hữu bộ thẻ. |
| `POST` | `/deck/{deck_id}/flashcard` | Tạo thủ công một thẻ mới trong bộ thẻ. |
| `PATCH` | `/deck/question/{card_id}` | Cập nhật nội dung mặt trước, mặt sau, ảnh hoặc audio thẻ. |
| `DELETE` | `/deck/question/{card_id}` | Xóa thẻ khỏi bộ thẻ. |

### 1.2. API Luyện tập, FSRS v6 & Ôn tập (`play.py`, `review_routes.py`)

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `GET` | `/deck/{deck_id}/play-data` | Lấy danh sách thẻ cần học/ôn tập theo thuật toán FSRS v6 (stability, difficulty, due, state). |
| `POST` | `/deck/record_answer` | Ghi nhận phản hồi FSRS (Rating 1=Again, 2=Hard, 3=Good, 4=Easy), cập nhật chu kỳ ôn tập tiếp theo & cộng XP. |
| `POST` | `/deck/undo_answer` | Hoàn tác (undo) lượt đánh giá thẻ vừa rồi. |
| `GET` | `/deck/{deck_id}/data` | Lấy thông tin chi tiết bộ thẻ phục vụ giao diện Play. |
| `GET` | `/deck/quick-play-data` | Lấy danh sách thẻ cho chế độ học nhanh ngẫu nhiên. |
| `GET` | `/deck/{deck_id}/session` | Lấy phiên học (session) đang dở dang. |
| `POST` | `/deck/{deck_id}/session` | Tạo mới hoặc cập nhật trạng thái phiên học dở dang. |
| `DELETE` | `/deck/{deck_id}/session` | Xóa phiên học dở dang khi đã hoàn thành. |
| `POST` | `/deck/{deck_id}/next-card` | Chuyển sang thẻ tiếp theo trong phiên. |
| `POST` | `/deck/{deck_id}/ask-ai` | Yêu cầu trợ lý Gemini AI tạo giải thích từ vựng/ngữ pháp chuyên sâu cho thẻ. |
| `POST` | `/deck/{deck_id}/reset-progress` | Reset toàn bộ tiến trình học và chỉ số FSRS của bộ thẻ về trạng thái ban đầu. |
| `POST` | `/deck/explain` | API dịch/giải thích nhanh văn bản bất kỳ bằng AI. |
| `GET` | `/deck/today-review` | Lấy tổng hợp danh sách tất cả các thẻ đến hạn cần ôn tập hôm nay trên toàn hệ thống. |

### 1.3. Lộ trình Học tập (Roadmap) & Mục tiêu (`roadmap.py`)

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `GET` | `/deck/roadmap/decks` | Lấy danh sách các bộ thẻ có thiết lập lộ trình học hàng ngày. |
| `GET` | `/deck/{deck_id}/roadmap-status` | Lấy tiến độ hoàn thành các bước trong lộ trình ngày (từ mới, ôn tập, MCQ). |
| `GET` | `/deck/{deck_id}/roadmap-test-questions` | Lấy danh sách câu hỏi kiểm tra lộ trình hàng ngày (Test Mode). |
| `POST` | `/deck/{deck_id}/roadmap-test-submit` | Nộp bài kiểm tra lộ trình để ghi nhận kết quả. |
| `POST` | `/deck/{deck_id}/roadmap-test-reset` | Reset lượt làm bài thi thử lộ trình trong ngày. |
| `GET` | `/deck/goals/active` | Lấy danh sách mục tiêu bộ thẻ đang hoạt động. |
| `POST` | `/deck/goals` | Tạo hoặc cập nhật mục tiêu hàng ngày cho bộ thẻ. |
| `POST` | `/deck/goals/remove` | Xóa mục tiêu của bộ thẻ. |
| `GET` | `/deck/{deck_id}/pipeline-history` | Xem lịch sử các phiên bản pipeline lộ trình học của bộ thẻ. |
| `POST` | `/deck/{deck_id}/pipeline-history` | Lưu vết thay đổi pipeline lộ trình học mới. |

### 1.4. Tương tác Thẻ, Sinh Âm thanh TTS & AI (`features.py`)

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `GET` | `/deck/{deck_id}/practice-settings` | Lấy cài đặt chế độ luyện tập (MCQ, Gõ từ...) của bộ thẻ. |
| `POST` | `/deck/{deck_id}/practice-settings` | Cập nhật cài đặt chế độ luyện tập. |
| `GET` | `/deck/question/{card_id}/note` | Lấy ghi chú cá nhân của người học trên thẻ. |
| `POST` | `/deck/question/{card_id}/note` | Tạo mới hoặc cập nhật ghi chú cá nhân trên thẻ. |
| `POST` | `/deck/question/{card_id}/ignore` | Ẩn/Hiện thẻ trong các lượt học. |
| `POST` | `/deck/question/{card_id}/star` | Đánh dấu sao thẻ từ vựng để ôn tập riêng. |
| `GET` | `/deck/{deck_id}/notes` | Lấy tất cả ghi chú cá nhân của người dùng trong bộ thẻ. |
| `GET` | `/deck/{deck_id}/export` | Xuất dữ liệu bộ thẻ ra tệp Excel (`.xlsx`). |
| `POST` | `/deck/{deck_id}/import-analyze` | Phân tích tệp Excel cập nhật bộ thẻ. |
| `POST` | `/deck/{deck_id}/import-update` | Cập nhật bộ thẻ hàng loạt qua Excel. |
| `GET` | `/deck/generate-audio/{card_id}` | Sinh tệp âm thanh phát âm TTS cho thẻ. |
| `GET` | `/deck/tts/stream` | Stream trực tiếp giọng đọc TTS qua HTTP. |
| `POST` | `/deck/{deck_id}/generate-all-audio` | Kích hoạt tác vụ nền sinh âm thanh cho toàn bộ thẻ trong bộ. |
| `GET` | `/deck/{deck_id}/tts-status` | Kiểm tra tiến độ sinh âm thanh của bộ thẻ. |
| `POST` | `/deck/{deck_id}/generate-all-ai` | Kích hoạt tác vụ nền sinh giải thích Gemini AI hàng loạt cho bộ thẻ. |
| `GET` | `/deck/{deck_id}/ai-status` | Xem tiến độ sinh giải thích AI của bộ thẻ. |
| `POST` | `/deck/{deck_id}/generate-all-images` | Sinh hàng loạt ảnh minh họa bằng AI cho bộ thẻ. |
| `GET` | `/deck/{deck_id}/image-status` | Xem tiến độ sinh ảnh minh họa AI. |
| `POST` | `/deck/generate-furigana` | Chuyển đổi văn bản tiếng Nhật thành thẻ phát âm furigana (`<ruby>`). |
| `GET` | `/deck/{deck_id}/furigana-status` | Xem tiến độ sinh furigana cho bộ thẻ. |
| `POST` | `/deck/{deck_id}/generate-all-furigana` | Sinh furigana hàng loạt cho toàn bộ thẻ trong bộ. |

### 1.5. Thảo luận & Đóng góp trên Thẻ (`community.py`)

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `GET` | `/deck/question/{card_id}/contributions` | Lấy danh sách thảo luận/đóng góp trên thẻ. |
| `POST` | `/deck/question/{card_id}/contributions` | Gửi bình luận hoặc yêu cầu sửa đổi cho thẻ. |
| `POST` | `/deck/contributions/{contribution_id}/like` | Thích/Bỏ thích bình luận đóng góp. |
| `DELETE` | `/deck/contributions/{contribution_id}` | Xóa bình luận đóng góp (chủ bài viết hoặc Admin). |
| `PUT` | `/deck/contributions/{contribution_id}/status` | Duyệt/Đóng trạng thái đóng góp sửa đổi. |

### 1.6. Phòng Học Nhóm Thi Đấu Realtime (`room.py`)

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `GET` | `/deck/room/active` | Lấy danh sách các phòng học nhóm đang mở. |
| `POST` | `/deck/room/create` | Khởi tạo phòng thi đấu/học nhóm mới cho bộ thẻ. |
| `POST` | `/deck/room/join` | Tham gia vào một phòng bằng mã code (`room_code`). |
| `GET` | `/deck/room/{room_code}` | Lấy thông tin trạng thái phòng học nhóm hiện tại. |
| `POST` | `/deck/room/{room_code}/start` | Bắt đầu vòng chơi thi đấu (chỉ host phòng). |
| `POST` | `/deck/room/{room_code}/submit` | Gửi đáp án trả lời của người chơi cho câu hỏi hiện tại. |
| `GET` | `/deck/room/{room_code}/leaderboard` | Lấy bảng xếp hạng điểm số thời gian thực trong phòng. |
| `POST` | `/deck/room/{room_code}/chat` | Gửi tin nhắn chat trong phòng. |
| `GET` | `/deck/room/{room_code}/chat` | Lấy danh sách tin nhắn chat trong phòng. |
| `POST` | `/deck/room/{room_code}/next-question` | Chuyển sang câu hỏi tiếp theo. |
| `POST` | `/deck/room/{room_code}/end` | Kết thúc sớm vòng chơi. |

---

## 2. Xác thực, Cài đặt Cá nhân & SSO (`/api/v1/auth`, `/api/v1/user`, `/api/admin/sso`)

### 2.1. Xác thực & Cài đặt Người dùng (`auth/routes/api.py`)

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `GET` | `/auth/me` | Lấy thông tin tài khoản người dùng và toàn bộ `settings` từ DB. |
| `GET` | `/user/settings` | Lấy cấu hình giao diện & tùy chọn học tập từ bảng `user_global_settings`. |
| `PATCH` | `/user/settings` | Cập nhật cấu hình giao diện & tùy chọn học tập (tuân thủ No-localStorage). |
| `POST` | `/auth/login` | Đăng nhập cục bộ (yêu cầu `is_backdoor: true` nếu SSO đang bật). |
| `GET` | `/logout` | Đăng xuất người dùng, xóa cookie và hỗ trợ chuyển hướng CentralAuth. |
| `POST` | `/auth/change-password` | Đổi mật khẩu tài khoản cục bộ. |

### 2.2. SSO Client & Handshake (`sso_module/routes.py`)

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `GET` | `/api/v1/auth/config` | Lấy cấu hình SSO phục vụ client auto-redirect (`jump_url`, `sso_enabled`). |
| `GET` | `/api/sso/config` | API Admin lấy cấu hình cài đặt SSO Client. |
| `POST` | `/api/sso/config` | API Admin cập nhật cấu hình SSO Client. |
| `GET` | `/auth-center/callback` | Endpoint callback tiếp nhận mã OAuth2 code từ CentralAuth, tạo cookie phiên. |
| `POST` | `/api/admin/sso/handshake` | API handshake bảo mật phục vụ Admin Hub của CentralAuth tự động phát hiện đường dẫn tệp SQLite Database. |

---

## 3. Thống kê & Báo cáo Phân tích (`/api/v1/stats`, `/api/v1/deck/stats`)

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `GET` | `/dashboard/data` | Lấy toàn bộ dữ liệu trang chủ: thông tin user, danh sách bộ thẻ, gamification, thông báo. |
| `GET` | `/stats/detailed` | Báo cáo phân tích tiến trình học tập chi tiết tổng quan. |
| `GET` | `/stats/leaderboard` | Bảng xếp hạng XP theo ngày/tuần/tháng/tất cả. |
| `GET` | `/stats/daily-comparison` | So sánh hiệu suất học tập hôm nay so với hôm qua. |
| `GET` | `/deck/stats/heatmap` | Dữ liệu đóng góp số lượng thẻ học theo ngày dạng Heatmap (365 ngày). |
| `GET` | `/deck/stats/weekly-report` | Báo cáo phân tích hoạt động học tập trong tuần hiện tại. |
| `GET` | `/deck/stats/leitner` | Thống kê số lượng thẻ phân bổ trong 5 hộp Leitner. |
| `GET` | `/deck/stats/speed-accuracy` | Thống kê tốc độ phản xạ trung bình và độ chính xác. |
| `GET` | `/deck/stats/review-forecast` | Biểu đồ dự báo số lượng thẻ đến hạn ôn tập trong 30 ngày tới. |
| `GET` | `/deck/stats/practice` | Lịch sử và hiệu suất làm bài theo chế độ luyện tập. |
| `GET` | `/deck/decks/{deck_id}/mastery` | Chỉ số bộ nhớ FSRS chi tiết cho một bộ thẻ. |

---

## 4. Game hóa & Thành tựu (`/api/v1/gamification`)

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `GET` | `/gamification/leaderboard` | Bảng xếp hạng XP và hiệu suất (Top 5) kèm vị trí người dùng hiện tại. |
| `GET` | `/gamification/challenges` | Danh sách các thử thách học tập hàng ngày/tuần và trạng thái hoàn thành. |
| `GET` | `/gamification/badges/progress` | Danh sách tiến độ tích lũy mở khóa huy hiệu của người dùng. |
| `GET` | `/deck/gamification/badges` | Danh sách tất cả huy hiệu hệ thống và điều kiện mở khóa. |

---

## 5. Thông báo Đẩy & Telegram Bot (`/api/v1/notification`)

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `POST` | `/notification/read-all` | Đánh dấu đã đọc tất cả thông báo hệ thống. |
| `GET` | `/notification/vapid-public-key` | Lấy khóa VAPID Public Key cấu hình Web Push trên trình duyệt. |
| `POST` | `/notification/push/subscribe` | Đăng ký nhận thông báo đẩy Web Push của thiết bị. |
| `POST` | `/notification/push/unsubscribe` | Hủy đăng ký nhận thông báo đẩy. |
| `GET` | `/notification/telegram/config` | Lấy cấu hình liên kết tài khoản Telegram Bot của người dùng. |
| `POST` | `/notification/telegram/config` | Lưu/Liên kết mã chat ID Telegram để bot gửi tin nhắn nhắc nhở và Streak Guard. |

---

## 6. Quản trị Hệ thống (`/api/v1/admin`)

*Chỉ tài khoản có vai trò `role = 'admin'` mới được phép truy cập.*

| Method | Endpoint Path | Mô tả Chi tiết |
|---|---|---|
| `GET` | `/admin/configs` | Lấy danh sách các cấu hình động hệ thống (`system_configs`). |
| `POST` | `/admin/configs` | Cập nhật cấu hình động hệ thống. |
| `GET` | `/admin/users` | Lấy danh sách toàn bộ tài khoản người dùng trong hệ thống. |
| `POST` | `/admin/users` | Tạo mới tài khoản người dùng thủ công. |
| `PATCH` | `/admin/users/{user_id}` | Cập nhật thông tin tài khoản (vai trò role, trạng thái active). |
| `DELETE` | `/admin/users/{user_id}` | Vô hiệu hóa hoặc xóa tài khoản người dùng. |
| `GET` | `/admin/logs` | Xem nhật ký các hoạt động quản trị viên (`admin_logs`). |
