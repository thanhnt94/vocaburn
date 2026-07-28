# 📡 Danh sách REST API Endpoints Vocaburn (API Reference)

Tất cả API Endpoints chính của Vocaburn được định nghĩa trong các module tại `app/modules/` và được mount dưới tiền tố chuẩn **`/api/v1/`** (ngoại trừ các endpoint callback và một số endpoints đặc biệt).

- **Base URL Mặc định**: `http://localhost:5090/api/v1`
- **Xác thực**: Qua Session Cookie HttpOnly (`user_id`).

---

## 1. Endpoints Học tập, Flashcards & FSRS v6 (`app/modules/deck/routes/`)

Tất cả các API dưới đây được mount dưới tiền tố: `/api/v1/deck` (được cấu hình qua router `/deck` trong `app/modules/deck/routes/api.py`).

### 1.1. Thao tác Cơ bản (CRUD) & Import (`crud.py`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/deck/template/download` | Tải về file Excel mẫu tiêu chuẩn (`.xlsx`). |
| `POST` | `/deck/preview` | Xem trước (parse) dữ liệu từ file Excel tải lên. |
| `POST` | `/deck/upload` | Import/Tạo mới bộ thẻ từ file Excel mẫu. |
| `POST` | `/deck/import-text` | Import nhanh bộ thẻ từ văn bản thô (Raw text). |
| `POST` | `/deck/create` | Tạo một bộ thẻ trống mới. |
| `POST` | `/deck/validate` | Kiểm tra tính hợp lệ của tệp Excel trước khi import. |
| `GET` | `/deck/{deck_id}/questions` | Lấy danh sách thẻ từ vựng trong bộ thẻ (Hỗ trợ phân trang & tìm kiếm). |
| `POST` | `/deck/{deck_id}/enroll` | Ghi danh người dùng hiện tại vào bộ thẻ. |
| `POST` | `/deck/{deck_id}/archive` | Lưu trữ (archive) hoặc bỏ lưu trữ bộ thẻ đối với người dùng. |
| `DELETE` | `/deck/{deck_id}` | Xóa bộ thẻ (Chỉ chủ sở hữu hoặc Admin). |
| `PATCH` | `/deck/{deck_id}` | Cập nhật thông tin chi tiết bộ thẻ (tiêu đề, mô tả, ảnh bìa...). |
| `GET` | `/deck/users/search` | Tìm kiếm người dùng hệ thống để thêm cộng tác viên. |
| `GET` | `/deck/{deck_id}/collaborators` | Lấy danh sách cộng tác viên của bộ thẻ. |
| `POST` | `/deck/{deck_id}/collaborators` | Thêm cộng tác viên quản lý bộ thẻ. |
| `DELETE` | `/deck/{deck_id}/collaborators/{collab_user_id}` | Gỡ quyền cộng tác viên. |
| `POST` | `/deck/{deck_id}/transfer-ownership` | Chuyển nhượng quyền sở hữu bộ thẻ cho người khác. |
| `POST` | `/deck/{deck_id}/flashcard` | Tạo mới một thẻ từ vựng thủ công vào bộ thẻ. |
| `PATCH` | `/deck/question/{card_id}` | Cập nhật nội dung mặt trước, mặt sau, ảnh hoặc đáp án nhiễu của thẻ. |
| `DELETE` | `/deck/question/{card_id}` | Xóa thẻ khỏi bộ thẻ. |

### 1.2. API Luyện tập & Thuật toán FSRS v6 (`play.py`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/deck/{deck_id}/play-data` | Lấy danh sách thẻ cần học/ôn tập theo thuật toán FSRS v6 (gồm độ ổn định stability, độ khó difficulty, trạng thái state, thời hạn due). |
| `POST` | `/deck/record_answer` | Ghi nhận phản hồi FSRS (Rating từ `1` đến `4`), cập nhật chu kỳ ôn tập FSRS tiếp theo & cộng điểm XP. |
| `POST` | `/deck/undo_answer` | Hoàn tác (undo) lượt đánh giá thẻ vừa rồi. |
| `GET` | `/deck/{deck_id}/data` | Lấy thông tin chi tiết một bộ thẻ phục vụ giao diện Play. |
| `GET` | `/deck/quick-play-data` | Lấy danh sách thẻ cho chế độ học nhanh ngẫu nhiên. |
| `GET` | `/deck/{deck_id}/session` | Lấy phiên học (session) đang lưu dở dang. |
| `POST` | `/deck/{deck_id}/session` | Tạo mới hoặc cập nhật trạng thái phiên học dở dang. |
| `DELETE` | `/deck/{deck_id}/session` | Xóa phiên học dở dang khi hoàn thành. |
| `POST` | `/deck/{deck_id}/next-card` | Chuyển sang thẻ tiếp theo trong phiên. |
| `POST` | `/deck/{deck_id}/ask-ai` | Yêu cầu trợ lý Gemini AI tạo giải thích từ vựng/ngữ pháp chuyên sâu cho thẻ. |
| `GET` | `/deck/question/{card_id}/contributions` | Lấy danh sách thảo luận/bình luận đóng góp trên thẻ. |
| `POST` | `/deck/question/{card_id}/contributions` | Gửi bình luận hoặc yêu cầu sửa đổi cho thẻ. |
| `POST` | `/deck/contributions/{contribution_id}/like` | Thích bình luận đóng góp. |
| `DELETE` | `/deck/contributions/{contribution_id}` | Xóa bình luận đóng góp (Chủ bình luận/Admin). |
| `PUT` | `/deck/contributions/{contribution_id}/status` | Duyệt/đóng trạng thái đóng góp sửa đổi. |
| `POST` | `/deck/{deck_id}/reset-progress` | Reset toàn bộ tiến độ học tập và chỉ số FSRS v6 của bộ thẻ về trạng thái như mới. |
| `POST` | `/deck/explain` | API phụ để dịch/giải thích nhanh văn bản bất kỳ bằng AI. |

### 1.3. API Lộ trình Học tập (Roadmap) (`play.py` & `stats.py`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/deck/roadmap/decks` | Lấy danh sách các bộ thẻ có thiết lập lộ trình học hàng ngày. |
| `GET` | `/deck/{deck_id}/roadmap-status` | Lấy tiến độ hoàn thành lộ trình trong ngày của bộ thẻ (số từ mới/ôn tập đã học). |
| `GET` | `/deck/{deck_id}/roadmap-test-questions` | Lấy danh sách câu hỏi kiểm tra lộ trình hàng ngày (Test Mode). |
| `POST` | `/deck/{deck_id}/roadmap-test-submit` | Nộp bài kiểm tra lộ trình để ghi nhận kết quả. |
| `POST` | `/deck/{deck_id}/roadmap-test-reset` | Reset lượt thi thử lộ trình trong ngày. |
| `GET` | `/deck/goals/global` | Lấy cài đặt mục tiêu học tập toàn cục hàng ngày (XP, Số thẻ). |
| `POST` | `/deck/goals/global` | Cập nhật cài đặt mục tiêu học tập toàn cục. |
| `GET` | `/deck/goals/active` | Lấy danh sách mục tiêu đang hoạt động. |
| `POST` | `/deck/goals` | Tạo hoặc cập nhật mục tiêu cụ thể cho bộ thẻ. |
| `POST` | `/deck/goals/remove` | Xóa mục tiêu bộ thẻ. |

### 1.4. Tương tác Thẻ, Sinh Audio TTS & Tự động hóa (`features.py`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/deck/{deck_id}/practice-settings` | Lấy cài đặt chế độ luyện tập (MCQ, Gõ từ...) của bộ thẻ. |
| `POST` | `/deck/{deck_id}/practice-settings` | Cập nhật cài đặt chế độ luyện tập. |
| `GET` | `/deck/question/{card_id}/note` | Lấy ghi chú cá nhân của người học trên thẻ. |
| `POST` | `/deck/question/{card_id}/note` | Tạo mới hoặc cập nhật ghi chú cá nhân trên thẻ. |
| `POST` | `/deck/question/{card_id}/ignore` | Ẩn/Hiện thẻ này trong các lượt học. |
| `POST` | `/deck/question/{card_id}/star` | Đánh dấu sao (Star) thẻ từ vựng để ôn tập riêng. |
| `GET` | `/deck/{deck_id}/notes` | Lấy tất cả ghi chú cá nhân của người dùng trong bộ thẻ. |
| `GET` | `/deck/{deck_id}/export` | Xuất dữ liệu bộ thẻ ra tệp Excel (`.xlsx`). |
| `POST` | `/deck/{deck_id}/import-analyze` | Phân tích tệp Excel cập nhật bộ thẻ. |
| `POST` | `/deck/{deck_id}/import-update` | Cập nhật bộ thẻ hàng loạt qua Excel. |
| `GET` | `/deck/generate-audio/{card_id}` | Sinh file âm thanh phát âm TTS cho thẻ. |
| `GET` | `/deck/tts/stream` | Stream trực tiếp giọng đọc TTS. |
| `POST` | `/deck/{deck_id}/generate-all-audio` | Kích hoạt tác vụ nền sinh âm thanh cho toàn bộ thẻ trong bộ. |
| `GET` | `/deck/{deck_id}/tts-status` | Kiểm tra tiến độ sinh âm thanh của bộ thẻ. |
| `POST` | `/deck/{deck_id}/generate-all-ai` | Kích hoạt sinh hàng loạt giải thích Gemini AI cho bộ thẻ. |
| `GET` | `/deck/{deck_id}/ai-status` | Xem tiến độ sinh giải thích AI của bộ thẻ. |
| `POST` | `/deck/{deck_id}/generate-all-images` | Sinh hàng loạt ảnh minh họa bằng AI cho bộ thẻ. |
| `GET` | `/deck/{deck_id}/image-status` | Xem tiến độ sinh ảnh minh họa AI. |
| `POST` | `/deck/generate-furigana` | Chuyển đổi văn bản tiếng Nhật thành thẻ phát âm furigana (`<ruby>`). |
| `GET` | `/deck/{deck_id}/furigana-status` | Xem tiến độ sinh furigana cho bộ thẻ. |
| `POST` | `/deck/{deck_id}/generate-all-furigana` | Sinh furigana hàng loạt cho toàn bộ thẻ trong bộ. |

### 1.5. Thống kê & Phân tích chuyên sâu (`stats.py`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/deck/stats/heatmap` | Dữ liệu đóng góp số lượng thẻ học theo ngày dạng Heatmap (365 ngày). |
| `GET` | `/deck/stats/weekly-report` | Báo cáo phân tích hoạt động học tập trong tuần hiện tại. |
| `GET` | `/deck/stats/leitner` | Thống kê số lượng thẻ phân bổ trong 5 hộp Leitner. |
| `GET` | `/deck/stats/speed-accuracy` | Thống kê tốc độ phản hồi trung bình và độ chính xác. |
| `GET` | `/deck/stats/review-forecast` | Biểu đồ dự báo số lượng thẻ đến hạn ôn tập trong 30 ngày tới. |
| `GET` | `/deck/stats/practice` | Lịch sử và thống kê hiệu suất ôn tập. |
| `GET` | `/deck/decks/{deck_id}/mastery` | Chỉ số bộ nhớ FSRS chi tiết cho một bộ thẻ. |
| `GET` | `/deck/gamification/badges` | Danh sách tất cả huy hiệu hệ thống và điều kiện mở khóa. |

### 1.6. Phòng Luyện tập Nhóm - Multiplayer Room (`room.py`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/deck/room/active` | Lấy danh sách các phòng học nhóm đang mở. |
| `POST` | `/deck/room/create` | Khởi tạo phòng thi đấu/học nhóm mới cho bộ thẻ. |
| `POST` | `/deck/room/join` | Tham gia vào một phòng bằng mã code (`room_code`). |
| `GET` | `/deck/room/{room_code}` | Lấy thông tin trạng thái phòng học nhóm hiện tại. |
| `POST` | `/deck/room/{room_code}/start` | Bắt đầu vòng chơi thi đấu (Chỉ host phòng). |
| `POST` | `/deck/room/{room_code}/submit` | Gửi đáp án trả lời của người chơi cho câu hỏi hiện tại. |
| `GET` | `/deck/room/{room_code}/leaderboard` | Lấy bảng xếp hạng điểm số thời gian thực trong phòng. |
| `POST` | `/deck/room/{room_code}/chat` | Gửi tin nhắn chat trong phòng. |
| `GET` | `/deck/room/{room_code}/chat` | Lấy danh sách tin nhắn chat trong phòng. |
| `POST` | `/deck/room/{room_code}/next-question` | Chuyển sang câu hỏi tiếp theo. |
| `POST` | `/deck/room/{room_code}/end` | Kết thúc sớm vòng chơi. |

---

## 2. Endpoints Thống kê & Dashboard Tổng quan (`app/modules/stats/routes/`)

Các endpoints này được đăng ký trực tiếp dưới tiền tố `/api/v1`.

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/dashboard/data` | Lấy toàn bộ dữ liệu trang chủ: thông tin user, danh sách bộ thẻ đang học, bộ thẻ tự tạo, bộ thẻ khám phá, chỉ số gamification, tổng hợp stats và thông báo. |
| `GET` | `/stats/detailed` | Báo cáo phân tích tiến trình học tập chi tiết tổng quan. |
| `GET` | `/stats/leaderboard` | Bảng xếp hạng XP người dùng hệ thống theo ngày/tuần/tháng/tất cả. |
| `GET` | `/stats/daily-comparison` | So sánh hiệu suất học tập hôm nay so với hôm qua. |

---

## 3. Endpoints Đăng nhập & Xác thực Local/SSO (`app/modules/auth/`, `app/modules/sso_module/`)

### 3.1. Xác thực Local & Logout (`auth/routes/api.py`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/auth/me` | Lấy thông tin tài khoản người dùng đang đăng nhập (gồm vai trò role, cấp độ, XP). |
| `POST` | `/auth/login` | Đăng nhập cục bộ (Chỉ hoạt động khi chạy Stand-alone hoặc dùng tham số bypass SSO `?backdoor=1`). |
| `GET` | `/logout` | Đăng xuất người dùng, xóa session cookie local và trả về URL logout. |
| `POST` | `/auth/change-password` | Đổi mật khẩu tài khoản cục bộ. |

### 3.2. Single Sign-On (SSO) & Kết nối Ecosystem (`sso_module/routes.py`)

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/api/v1/auth/config` | Lấy cấu hình SSO hiện tại (bật/tắt, URL jump của CentralAuth). |
| `GET` | `/api/sso/config` | API Admin lấy cấu hình cài đặt SSO Client. |
| `POST` | `/api/sso/config` | API Admin cập nhật cấu hình SSO Client. |
| `GET` | `/auth-center/callback` | Callback nhận OAuth2 Authorization Code từ CentralAuth, handshake và thiết lập Cookie phiên. |
| `POST` | `/api/admin/sso/handshake` | API handshake bảo mật phục vụ Admin Hub của CentralAuth để tự động phát hiện đường dẫn tệp DB SQLite Vocaburn. |

---

## 4. Endpoints Game hóa (`app/modules/gamification/routes.py`)

Các endpoints này được mount dưới tiền tố `/api/v1/gamification`.

| Phương thức | Path | Mô tả |
|---|---|---|
| `GET` | `/gamification/leaderboard` | Bảng xếp hạng XP và hiệu suất (Top 5) kèm thứ hạng của người dùng hiện tại. |
| `GET` | `/gamification/challenges` | Danh sách các thử thách học tập hàng ngày/tuần và trạng thái hoàn thành. |
| `GET` | `/gamification/badges/progress` | Danh sách tiến độ tích lũy mở khóa huy hiệu của người dùng. |

---

## 5. Endpoints Thông báo Đẩy & Telegram Bot (`app/modules/notification/routes/`)

Tất cả các API được mount dưới tiền tố `/api/v1/notification`.

| Phương thức | Path | Mô tả |
|---|---|---|
| `POST` | `/notification/read-all` | Đánh dấu đã đọc tất cả thông báo hệ thống. |
| `GET` | `/notification/vapid-public-key` | Lấy khóa VAPID Public Key để cấu hình Web Push trên trình duyệt. |
| `POST` | `/notification/push/subscribe` | Đăng ký nhận thông báo đẩy Web Push của thiết bị. |
| `POST` | `/notification/push/unsubscribe` | Hủy đăng ký thông báo đẩy. |
| `GET` | `/notification/telegram/config` | Lấy cấu hình liên kết tài khoản Telegram Bot của người dùng hiện tại. |
| `POST` | `/notification/telegram/config` | Lưu/Liên kết mã chat ID Telegram để bot gửi tin nhắn nhắc nhở bảo vệ Streak. |

---

## 6. Endpoints Quản trị Hệ thống (`app/modules/admin/routes/`)

Chỉ cho phép tài khoản có vai trò `admin` truy cập. Mount dưới tiền tố `/api/v1/admin`.

| Phương thức | Path | Mô tả |
|---|---|---|
| `POST` | `/admin/ecosystem-sync` | Đồng bộ cấu hình bảo mật và danh sách tài khoản đồng bộ từ CentralAuth. |
| `GET` | `/admin/stats` | Thống kê tổng quan hệ thống (tổng user, tổng bộ thẻ, số câu trả lời...). |
| `GET` | `/admin/sso` | Lấy cấu hình SSO hiện tại. |
| `POST` | `/admin/sso` | Cập nhật cấu hình SSO. |
| `POST` | `/admin/sso/test` | Kiểm tra kết nối tới máy chủ CentralAuth. |
| `GET` | `/admin/ai` | Lấy cấu hình kết nối Google Gemini API (Model, API Key). |
| `POST` | `/admin/ai` | Cập nhật cấu hình Gemini API. |
| `POST` | `/admin/ai/list-models` | Liệt kê các model Gemini khả dụng bằng API Key cấu hình. |
| `GET` | `/admin/users` | Lấy danh sách tất cả tài khoản người dùng trong hệ thống (Hỗ trợ phân trang). |
| `POST` | `/admin/users/{user_id}/role` | Thay đổi phân quyền vai trò người dùng (`admin` / `user`). |
| `GET` | `/admin/maintenance` | Lấy trạng thái chế độ bảo trì hệ thống. |
| `POST` | `/admin/maintenance/toggle` | Bật/tắt chế độ bảo trì hệ thống (Maintenance Mode). |
| `GET` | `/admin/telegram` | Lấy cấu hình Telegram Bot chung của hệ thống. |
| `POST` | `/admin/telegram` | Cập nhật thông số Token Telegram Bot. |
| `POST` | `/admin/telegram/test` | Gửi tin nhắn thử nghiệm tới admin. |
| `POST` | `/admin/telegram/broadcast` | Gửi tin nhắn thông báo hàng loạt tới toàn bộ người học đã đăng ký bot. |
| `GET` | `/admin/decks` | Quản lý danh sách toàn bộ các bộ thẻ trong hệ thống. |
