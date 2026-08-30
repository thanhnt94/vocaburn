# 📁 Cấu trúc Module Vocaburn (Module Structure)

Dự án **Vocaburn** được thiết kế theo kiến trúc **Modular Monolith (Hexagonal Style)**, phân định rõ ràng giữa tầng nghiệp vụ Backend (**FastAPI** Python Async) và tầng giao diện Client (**React 19 / TypeScript / Vite** SPA).

---

## 1. Cấu trúc Tổng quan Thư mục Backend (`app/`)

```
Vocaburn (Backend)
├── app/
│   ├── core/                   # Cấu hình hệ thống & Kết nối Cơ sở Dữ liệu
│   │   ├── config.py           # Quản lý cấu hình biến môi trường (.env, SECRET_KEY, URLs)
│   │   ├── db.py               # Kết nối SQLite AsyncEngine & AsyncSession (WAL mode)
│   │   └── init_db.py          # Script khởi tạo cơ sở dữ liệu & nạp dữ liệu mẫu ban đầu
│   │
│   ├── modules/                # 8 Module nghiệp vụ cô lập độc lập
│   │   ├── admin/              # Dashboard quản trị, cấu hình động & nhật ký admin
│   │   ├── ai/                 # Tích hợp Gemini AI giải thích từ vựng & furigana <ruby>
│   │   ├── auth/               # Xác thực local, cookie signer, đồng bộ user_global_settings
│   │   ├── deck/               # Flashcards, Decks, FSRS v6, Roadmap, MCQ, Audio TTS, Rooms
│   │   ├── gamification/       # Quản lý XP, Level, Streak, Freeze, Badges & Transactions
│   │   ├── notification/       # Quản lý Web Push (VAPID) & Telegram Bot nhắc nhở học
│   │   ├── sso_module/         # CentralAuth SSO client, Handshake DB discovery & Cookie Signer
│   │   └── stats/              # Thống kê tiến trình hàng ngày, Heatmap, Báo cáo tuần & Forecast
│   │
│   ├── static/                 # Tài nguyên tĩnh & Thư mục đóng gói Frontend Production (`dist/`)
│   └── main.py                 # Router trung tâm, Signed Cookie Middleware, CORS, GZip & SPA Handler
```

---

## 2. Chi tiết 8 Module Nghiệp vụ Backend (`app/modules/`)

Mỗi module nghiệp vụ tự đóng gói độc lập bao gồm: **Models** (SQLAlchemy), **Schemas** (Pydantic), **Services** (Business Logic) và **Routes** (FastAPI Routers).

### 2.1. Module `deck` (Quản lý Học tập, Flashcard, FSRS v6 & Roadmap)
*Trọng tâm nghiệp vụ của Vocaburn:*
* **Quản lý Bộ thẻ & Thẻ học**: Cấu trúc các bảng `flashcard_decks`, `flashcards`, `categories`, `tags`, `deck_collaborators`.
* **Import & Export Excel**: Service `excel_service.py` hỗ trợ nhập/xuất tệp Excel theo mẫu chuẩn.
* **Tự động sinh Âm thanh TTS**: Service `audio_generator.py` chuyển đổi văn bản thành âm thanh lưu trữ tại `/uploads/audio`.
* **Thuật toán Spaced Repetition FSRS v6**:
  * Chuẩn **FSRS v6** tính toán chính xác `stability`, `difficulty`, `state` (0=New, 1=Learning, 2=Review, 3=Relearning) qua 4 mức đánh giá (*Again, Hard, Good, Easy*).
  * Hỗ trợ mô hình hộp Leitner 1-5 truyền thống dự phòng.
* **Hệ thống Lộ trình Bộ thẻ (Deck Roadmap)**:
  * Route `roadmap.py`: Quản lý pipeline các chặng học (Từ mới ➔ MCQ ➔ FSRS ➔ Test Mode), lưu lịch sử điều chỉnh pipeline (`roadmap_pipeline_history`).
* **Đa dạng Chế độ Luyện tập**:
  * `mcq_engine.py`: Sinh ngẫu nhiên đáp án nhiễu cho trắc nghiệm.
  * `typing_engine.py`: Chấm điểm phản hồi gõ từ vựng.
  * `room.py`: Quản lý phòng học thi đấu realtime (`deck_rooms`, `deck_room_participants`, `deck_room_chats`).
  * `community.py`: Thảo luận & đóng góp sửa đổi thẻ học (`card_contributions`, `contribution_likes`).
  * `review_routes.py`: Endpoint tổng hợp thẻ cần ôn tập trong ngày (`/api/v1/deck/today-review`).

### 2.2. Module `auth` (Xác thực Cục bộ & Quản lý Cài đặt Cá nhân)
* Quản lý đăng nhập, đăng ký và đổi mật khẩu khi chạy stand-alone (tắt SSO) hoặc qua cổng quản trị `?backdoor=1`.
* **Quản lý Cài đặt Không Dùng localStorage**: Service `user_settings_service.py` quản lý bảng `user_global_settings`, đồng bộ mọi tùy chọn giao diện (theme, SFX, haptic, audio autoplay, chế độ học, cột paste/quick-add) qua endpoint `/api/v1/user/settings`.

### 2.3. Module `sso_module` (Single Sign-On CentralAuth & Dynamic Handshake)
* Giao tiếp với máy chủ CentralAuth (cổng `5000`) qua Authorization Code Flow.
* Xử lý callback `/auth-center/callback`, đổi mã code lấy thông tin user và gán Cookie `user_id` đã qua mã hóa `cookie_signer.py`.
* Endpoint Handshake bảo mật `POST /api/admin/sso/handshake` phục vụ Admin Hub của CentralAuth tự động phát hiện đường dẫn tệp SQLite Database.

### 2.4. Module `ai` (Trợ lý Học tập Gemini AI)
* Tích hợp Google Gemini API qua Background Tasks để tạo giải thích chi tiết (`ai_explanation`).
* Tự động sinh mã HTML chuẩn hóa, hỗ trợ thẻ đọc phiên âm tiếng Nhật `<ruby>` (ví dụ: `<ruby>忖度<rt>そんたく</rt></ruby>`).

### 2.5. Module `gamification` (Điểm số, Streak, Đóng băng & Huy hiệu)
* Ghi nhận XP (+10 đúng, +2 sai), cấp độ (Level) và chuỗi ngày học (`streak_count`).
* Quản lý tiền thưởng tích lũy (`streak_points`) và thẻ đóng băng streak (`streak_freeze_count`).
* Ghi nhận lịch sử giao dịch điểm qua `xp_transactions` và `point_transactions`.
* Tự động mở khóa và theo dõi tiến độ huy hiệu (`badges`, `user_badges`).

### 2.6. Module `notification` (Web Push & Telegram Bot)
* Hỗ trợ thông báo đẩy trình duyệt Web Push qua chuẩn VAPID (`push_subscriptions`).
* Tích hợp Telegram Bot (`bot_service.py`, `reminder_scheduler.py`) gửi thông báo học tập định kỳ và thông báo Streak Guard bảo vệ chuỗi ngày học trước nửa đêm.

### 2.7. Module `stats` (Thống kê Tiến trình Học tập)
* Ghi nhận hoạt động hàng ngày (`user_daily_stats`): số thẻ, số câu đúng, tổng thời gian, độ chính xác.
* Cung cấp dữ liệu Heatmap 365 ngày, báo cáo tuần, dự báo số thẻ đến hạn ôn tập trong 30 ngày (Review Forecast) và biểu đồ phân bổ Leitner.

### 2.8. Module `admin` (Quản trị Hệ thống)
* Quản lý thông số cấu hình động toàn cục (`system_configs`) và nhật ký quản trị viên (`admin_logs`).

---

## 3. Cấu trúc Frontend Client (`client/`)

Mã nguồn Frontend nằm tại thư mục `client/` được xây dựng bằng **React 19**, **TypeScript**, **Vite 6** và **TailwindCSS v4**:

```
client/src/
├── components/                 # UI components dùng chung & layout glassmorphism
│   ├── deck/                   # 🎴 Phân hệ Deck (Tập trung toàn bộ UI & sub-modules của Deck)
│   │   ├── tabs/               # 4 Tab chính: DeckOverviewTab, DeckCardsTab, DeckRoadmapTab, DeckSettingsTab
│   │   ├── cards/              # DeckCardItem, DeckCardQuickAdd, DeckCardBatchPasteModal, DeckCardEditModal, DeckCardFilterBar
│   │   ├── settings/           # DeckGeneralForm, DeckPracticeConfig, DeckAutomationTools, DeckExcelManager, DeckDangerZone, DeckCollaboratorsModal
│   │   ├── overview/           # DeckFsrsStatsCard, DeckQuickStudyLauncher, DeckRecentHistory
│   │   ├── roadmap/            # DeckRoadmapPipelineCard, DeckRoadmapGoalForm
│   │   ├── modals/             # DeckStudyModal, DeckCreateModal, DeckJoinRoomModal
│   │   └── DeckPagination.tsx  # Phân trang bộ thẻ
│   ├── StudyHeaderTracker.tsx  # Thanh Live HUD Tracker Bar 3D Flip & Power Surge
│   ├── CardContributionsModal.tsx # Modal đóng góp & bình luận thẻ
│   ├── Navbar.tsx / Sidebar.tsx# Điều hướng & Menu ứng dụng
│   └── MascotCard.tsx          # Card hiển thị Linh vật & đếm ngược mục tiêu
├── hooks/                      # Custom React hooks (useAudio, useRoadmapStatus, useSessionStats...)
├── lib/                        # Axios client instance, API helper functions, text parser & audio utils
├── store/                      # Quản lý state toàn cục bằng Zustand (useAppStore.ts)
├── pages/                      # 15 Màn hình chính của ứng dụng
│   ├── Admin.tsx               # Bảng điều khiển quản trị hệ thống (/admin)
│   ├── Dashboard.tsx           # Bảng điều khiển chính, lộ trình học, streak & thống kê
│   ├── DeckDetailPage.tsx      # Màn hình chi tiết bộ thẻ & tab switcher (/decks/:id)
│   ├── DecksPage.tsx           # Trung tâm quản lý tất cả bộ thẻ (/decks)
│   ├── FlashcardPlay.tsx       # Màn hình học Flashcard FSRS v6 (3D flip card, full-height)
│   ├── FlashcardRoom.tsx       # Phòng luyện tập nhóm đối kháng (/room/:code)
│   ├── ImportFlashcard.tsx     # Nhập liệu flashcard từ Excel hoặc văn bản thô
│   ├── Landing.tsx             # Trang giới thiệu ứng dụng
│   ├── Login.tsx               # Trang đăng nhập (Auto SSO redirect & form backdoor)
│   ├── PracticePlay.tsx        # Màn hình luyện tập đa chế độ (MCQ, Typing, Listening, Test)
│   ├── Profile.tsx             # Trang hồ sơ cá nhân & huy hiệu đạt được
│   ├── RoadmapHub.tsx          # Trung tâm tổng hợp lộ trình tất cả bộ thẻ (/roadmap)
│   ├── RoomJoin.tsx            # Tham gia phòng luyện tập đối kháng
│   ├── Settings.tsx            # Cài đặt tùy chọn cá nhân (đồng bộ DB)
│   └── Stats.tsx               # Báo cáo thống kê & Biểu đồ phân tích chuyên sâu
├── App.tsx                     # React Router setup & Route Guards
├── main.tsx                    # React Root Mounting Point
└── index.css                   # Global Styles & Custom 3D CSS Classes (.perspective-1000...)
```

---

## 4. Quản lý State Toàn cục & Quy chuẩn Không localStorage

Mọi trạng thái người dùng, tùy chọn giao diện, chế độ học và audio được quản lý tập trung trong file Zustand **`useAppStore.ts`**:
1. Khi khởi động, gọi `fetchMe()` để lấy thông tin tài khoản và cấu hình `settings` từ DB qua `GET /api/v1/auth/me`.
2. Khi người dùng thay đổi bất kỳ cài đặt nào (theme, SFX, chế độ học, v.v.), action `updateUserSettings()` sẽ cập nhật ngay vào Zustand state và gửi yêu cầu bất đồng bộ `PATCH /api/v1/user/settings` để lưu trữ vĩnh viễn trên Server.
3. Không sử dụng `localStorage` hay `sessionStorage`, đảm bảo dữ liệu đồng nhất trên mọi thiết bị và trình duyệt.
