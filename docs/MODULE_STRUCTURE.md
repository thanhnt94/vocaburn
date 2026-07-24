# 📁 Cấu trúc Module Vocaburn (Module Structure)

Dự án Vocaburn được thiết kế theo kiến trúc **Modular Monolith (Hexagonal Style)**. Hệ thống chia làm 2 phần chính: Mã nguồn Backend (FastAPI) nằm trong thư mục `app/` và Mã nguồn Frontend Client (React SPA) nằm trong thư mục `client/`.

---

## 1. Cấu trúc Tổng quan Thư mục Backend (`app/`)

```
Vocaburn (Backend)
├── app/
│   ├── core/                   # Tầng cấu hình dùng chung toàn hệ thống
│   │   ├── config.py           # Khai báo cấu hình biến môi trường (.env)
│   │   ├── db.py               # Thiết lập kết nối SQLite & AsyncSession
│   │   └── init_db.py          # Script khởi tạo cơ sở dữ liệu & nạp dữ liệu mẫu
│   │
│   ├── modules/                # 8 Module nghiệp vụ tự đóng gói độc lập
│   │   ├── admin/              # Dashboard quản lý cấu hình hệ thống & nhật ký admin
│   │   ├── ai/                 # Tích hợp Gemini AI giải thích từ vựng & ngữ pháp
│   │   ├── auth/               # Xác thực người dùng, băm mật khẩu & quản lý phiên local
│   │   ├── deck/               # Quản lý bộ Flashcard, lượt học, chấm điểm & FSRS v6
│   │   ├── gamification/       # Quản lý XP, Cấp độ, Chuỗi ngày (Streak) & Huy hiệu (Badge)
│   │   ├── notification/       # Quản lý thông báo đẩy & gửi thông báo qua Telegram Bot
│   │   ├── sso_module/         # Quản lý SSO Client, callback xác thực & Handshake DB
│   │   └── stats/              # Ghi nhận & phân tích thống kê tiến trình học tập hàng ngày
│   │
│   ├── static/                 # Thư mục chứa tài nguyên tĩnh & Frontend Dist (`static/dist`)
│   └── main.py                 # Router trung tâm, CORS, Middleware & Khởi chạy ứng dụng
```

---

## 2. Chi tiết 8 Module Nghiệp vụ Backend (`app/modules/`)

Mỗi module trong `app/modules/` là một đơn vị cô lập chứa đầy đủ: Models (SQLAlchemy), Schemas (Pydantic), Services (Business Logic) và Routes (API Endpoints).

### 2.1. Module `deck` (Quản lý Học tập, Flashcard & FSRS v6)
*Đây là trái tim nghiệp vụ của Vocaburn.*
- **Quản lý bộ thẻ (Decks & Flashcards)**: Định nghĩa cấu trúc các bộ thẻ (`flashcard_decks`), thẻ từ vựng (`flashcards`), danh mục (`categories`), thẻ nhãn dán (`tags`) và cài đặt lộ trình cá nhân (`user_deck_settings`).
- **Import dữ liệu từ file Excel**: Service `excel_service.py` hỗ trợ tải lên hàng loạt thẻ từ vựng qua mẫu tệp Excel chuẩn.
- **Tạo phát âm tự động**: Service `audio_generator.py` hỗ trợ chuyển đổi văn bản thành âm thanh và lưu trữ tại `/uploads/audio`.
- **Hệ thống Lặp khoảng cách (Spaced Repetition)**:
  - Tích hợp chuẩn **FSRS v6 (Free Spaced Repetition Scheduler)** cập nhật chính xác `stability`, `difficulty`, `state` (New, Learning, Review, Relearning) dựa trên 4 mức phản hồi (`Again`, `Hard`, `Good`, `Easy`).
  - Hỗ trợ chế độ Leitner 5 hộp truyền thống dự phòng.
- **Phục vụ luyện tập đa dạng**:
  - Service `mcq_engine.py`: Sinh ngẫu nhiên lựa chọn cho bài kiểm tra Trắc nghiệm (MCQ).
  - Service `typing_engine.py`: Đánh giá phản hồi bài kiểm tra Gõ từ vựng (Typing).
  - Room & Collaboration (`room.py`): Cho phép thi đấu/luyện tập bộ thẻ theo phòng đa người chơi.

### 2.2. Module `sso_module` (Single Sign-On & Kết nối Ecosystem)
- Quản lý cấu hình SSO Client và giao tiếp với máy chủ CentralAuth (cổng `5000`).
- Xử lý endpoint callback `/auth-center/callback` trao đổi mã OAuth2 code lấy thông tin người dùng, tự động tạo/đồng bộ tài khoản cục bộ qua `sso_id`.
- Endpoint Handshake `POST /api/admin/sso/handshake`: Phục vụ tính năng tìm kiếm và đồng bộ đường dẫn Cơ sở dữ liệu động từ Admin Hub của CentralAuth.
- Quản lý ký và xác minh an toàn cookie `user_id` qua `cookie_signer.py`.

### 2.3. Module `ai` (Trợ lý Học tập Gemini AI)
- Tận dụng Google Gemini API để sinh tự động giải thích từ vựng/ngữ pháp chuyên sâu (`ai_explanation`).
- Hàng đợi bất đồng bộ (Background Tasks) chuyển đổi kết quả trả về thành mã HTML sạch, tự động loại bỏ định dạng markdown thô và thêm thẻ đọc phát âm tiếng Nhật `<ruby>`.

### 2.4. Module `gamification` (Điểm số, Streak & Huy hiệu)
- Quản lý điểm kinh nghiệm (XP): cộng +10 XP khi trả lời đúng, +2 XP khi trả lời sai.
- Quản lý chuỗi ngày học liên tục toàn cầu (`streak_count`).
- Tự động kiểm tra và mở khóa các huy hiệu thành tựu (`badges`) dựa trên tiêu chí XP, Streak, Accuracy và Speed.

### 2.5. Module `stats` (Thống kê Tiến độ)
- Ghi nhận chi tiết lịch sử học tập hàng ngày (`questions_attempted`, `correct_answers`, `total_time_seconds`, `accuracy`).
- Cung cấp dữ liệu báo cáo thống kê cho trang Dashboard và biểu đồ phân tích cá nhân.

### 2.6. Module `auth` (Quản lý Tài khoản Cục bộ)
- Quản lý đăng nhập, đăng ký và khôi phục mật khẩu cục bộ khi chạy Vocaburn ở chế độ Stand-alone (tắt SSO).
- Mã hóa mật khẩu an toàn theo cơ chế băm tương thích toàn bộ hệ sinh thái Ecosystem.

### 2.7. Module `notification` (Thông báo & Nhắc nhở)
- Hỗ trợ gửi thông báo đẩy trình duyệt Web Push.
- Service `reminder_scheduler.py` & `bot_service.py`: Tích hợp Telegram Bot gửi tin nhắn nhắc nhở học tập hàng ngày và thông báo bảo vệ chuỗi ngày học (Streak Guard).

### 2.8. Module `admin` (Quản trị Hệ thống)
- Dashboard quản trị cấu hình hệ thống, quản lý tài khoản người dùng, xem nhật ký truy cập và thiết lập thông số toàn cục.

---

## 3. Cấu trúc Frontend Client (`client/`)

Mã nguồn Frontend nằm trong thư mục `client/` được xây dựng bằng Vite, React 19, TypeScript và TailwindCSS v4:

```
client/src/
├── components/                 # UI components dùng chung (Card, Modal, Drawer, Buttons)
├── hooks/                      # Custom React hooks (useAudio, useDebounce, useHotkeys)
├── lib/                        # Axios client instance, API helper functions
├── store/                      # Quản lý state toàn cục bằng Zustand
│   ├── useAppStore.ts          # State tiến độ học tập, bộ thẻ, theme
│   └── useAuthStore.ts         # State phiên đăng nhập, thông tin User, cấu hình SSO
├── pages/                      # 19 Màn hình chính của ứng dụng
│   ├── Dashboard.tsx           # Bảng điều khiển chính, lộ trình học, streak & thống kê
│   ├── FlashcardPlay.tsx       # Màn hình học Flashcard FSRS v6 (giao diện 3D flip card, full-height)
│   ├── PracticePlay.tsx        # Màn hình luyện tập đa chế độ (Flashcard, MCQ, Typing)
│   ├── EditFlashcards.tsx      # Quản lý danh sách thẻ trong bộ
│   ├── EditFlashcard.tsx       # Tạo/Chỉnh sửa chi tiết một thẻ từ vựng
│   ├── FlashcardDetail.tsx     # Chi tiết bộ thẻ & thông số FSRS
│   ├── DeckRoadmap.tsx         # Thiết lập lộ trình mục tiêu học tập hàng ngày
│   ├── RoadmapHub.tsx          # Trung tâm tổng hợp lộ trình bộ thẻ
│   ├── ImportFlashcard.tsx     # Import bộ thẻ từ file Excel
│   ├── Library.tsx / Manage... # Thư viện bộ thẻ cá nhân & cộng đồng
│   ├── FlashcardRoom.tsx / RoomJoin.tsx # Phòng luyện tập nhóm
│   ├── Stats.tsx / Profile.tsx # Báo cáo thống kê & Trang cá nhân
│   ├── Admin.tsx / Settings.tsx# Trang quản trị & Cấu hình ứng dụng
│   └── Landing.tsx / Login.tsx # Trang giới thiệu & Đăng nhập
├── App.tsx                     # React Router setup & Protected Route Guard
├── main.tsx                    # React Root Mounting Point
└── index.css                   # Global Styles & Custom 3D CSS Classes (.perspective-1000...)
```
