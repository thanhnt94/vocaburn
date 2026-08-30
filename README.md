# Vocaburn: High-Performance FSRS v6 Flashcard & Neural Learning Platform

Vocaburn là ứng dụng học tập flashcard chuyên sâu và lặp lại khoảng cách (Spaced Repetition) hiệu năng cao, được xây dựng với backend **FastAPI** (Python async SQLAlchemy) và frontend **React 19 / TypeScript / Vite** độc lập.

Vocaburn tích hợp thuật toán ghi nhớ hiện đại nhất **FSRS v6 (Free Spaced Repetition Scheduler)**, hệ thống lộ trình học tập (Deck Roadmap), các vòng lặp game hóa (Gamification XP, Streaks, Achievements), giải thích từ vựng tự động bằng **Google Gemini AI**, và tích hợp Single Sign-On (SSO) mượt mà với **CentralAuth**.

---

## 1. Kiến trúc Hệ thống & Cấu trúc Thư mục

Vocaburn tuân thủ mô hình kiến trúc **Modular Monolith (Hexagonal Style)** để đảm bảo sự cô lập miền nghiệp vụ (domain isolation) và giữ cho mã nguồn sạch sẽ, dễ bảo trì.

```
Vocaburn (Root)
├── app/                        # FastAPI Backend Application
│   ├── core/                   # Cấu hình hệ thống dùng chung & Kết nối Database
│   │   ├── config.py           # Quản lý cấu hình biến môi trường (.env)
│   │   ├── db.py               # Kết nối SQLite AsyncSession (WAL mode)
│   │   └── init_db.py          # Khởi tạo Schema & Nạp dữ liệu mặc định
│   ├── modules/                # 8 Module nghiệp vụ cô lập
│   │   ├── admin/              # Dashboard quản lý cấu hình hệ thống & nhật ký admin
│   │   ├── ai/                 # Tích hợp Gemini AI giải thích từ vựng/ngữ pháp
│   │   ├── auth/               # Xác thực tài khoản local, băm mật khẩu & đồng bộ user settings
│   │   ├── deck/               # Quản lý bộ Flashcard, lượt học, chấm điểm, Roadmap & FSRS v6
│   │   ├── gamification/       # Quản lý XP, Cấp độ, Chuỗi ngày (Streak), Freeze & Huy hiệu (Badge)
│   │   ├── notification/       # Quản lý thông báo đẩy (Web Push) & nhắc nhở qua Telegram Bot
│   │   ├── sso_module/         # Single Sign-On Client, callback & Handshake DB với CentralAuth
│   │   └── stats/              # Phân tích & Ghi nhận thống kê tiến trình học tập hàng ngày
│   ├── static/                 # Tài nguyên tĩnh & Thư mục đóng gói Production Frontend (`static/dist`)
│   └── main.py                 # Core Application Router, Middleware, Lifecycle & SPA Handler
├── client/                     # React 19 + TypeScript + Vite + Tailwind v4 SPA Frontend
│   ├── src/
│   │   ├── components/         # Component UI dùng chung, layout glassmorphism & phân hệ deck/
│   │   ├── pages/              # 15 Màn hình ứng dụng (Dashboard, FlashcardPlay, DecksPage...)
│   │   ├── store/              # Zustand global state (useAppStore.ts đồng bộ DB)
│   │   └── lib/                # Utility helpers & API Axios client
│   └── package.json
├── docs/                       # Thư mục Tài liệu Kỹ thuật Duy nhất (Single Source of Truth)
│   ├── README.md               # Mục lục Điều hướng Trung tâm (Documentation Hub)
│   ├── 01_architecture/        # Kiến trúc Hệ thống & Cơ sở Dữ liệu
│   ├── 02_api_reference/       # Danh mục REST API Endpoints chuẩn (/api/v1/...)
│   ├── 03_features_and_ui/     # Tính năng Nghiệp vụ & Giao diện (HUD Tracker Bar)
│   ├── 04_development_and_ops/ # Quy chuẩn Phát triển, No-localStorage, Alembic & Frontend
│   └── 05_changelog/           # Lịch sử Nâng cấp & Nhật ký cập nhật
├── build_vite.py               # Script tự động biên dịch Frontend sang `app/static/dist`
├── run_vocaburn.py             # Script khởi chạy Standalone duy nhất cho Vocaburn
└── requirements.txt            # Thư viện Python phụ thuộc
```

---

## 2. Tính năng Nổi bật

### 🧠 Thuật toán Lặp khoảng cách FSRS v6 (Free Spaced Repetition Scheduler)
Vocaburn áp dụng chuẩn FSRS v6 để tối ưu hóa thời gian ôn tập từng thẻ từ vựng:
- Thuật toán theo dõi chính xác **Stability** (độ ổn định bộ nhớ) và **Difficulty** (độ khó của thẻ đối với từng người dùng).
- Chuyển đổi linh hoạt giữa 4 trạng thái thẻ: `New (0)`, `Learning (1)`, `Review (2)`, `Relearning (3)`.
- 4 mức đánh giá phản hồi trực tiếp khi lật thẻ: **AGAIN** (1), **HARD** (2), **GOOD** (3), **EASY** (4).
- Hỗ trợ chế độ hộp Leitner 1-5 dự phòng.

### 🏆 Vòng lặp Gamification & Lộ trình Học tập (Roadmap)
- **Hệ thống Điểm số (XP)**: Cộng +10 XP cho câu trả lời đúng, +2 XP cho nỗ lực trả lời sai.
- **Chuỗi ngày học (Streak)**: Theo dõi và bảo vệ streak hàng ngày, hỗ trợ nhắc nhở qua Telegram Bot.
- **Huy hiệu Thành tựu (Badges)**: Tự động mở khóa các danh hiệu đặc biệt (Speed Demon, Perfect Score, Goal Crusher).
- **Lộ trình Bộ thẻ (Deck Roadmap)**: Cho phép thiết lập pipeline các chặng học (Từ mới ➔ MCQ ➔ FSRS ➔ Test Mode) cho từng bộ flashcard.

### 🤖 Trợ lý AI Giải thích Từ vựng Gemini AI
- Tích hợp Google Gemini API chạy qua Background Task để tạo giải thích từ vựng và ngữ pháp chuyên sâu (`ai_explanation`).
- Tự động sinh mã HTML sạch, hỗ trợ đọc phát âm kanji bằng thẻ `<ruby>` (ví dụ: `<ruby>忖度<rt>そんたく</rt></ruby>`).

---

## 3. Hướng dẫn Khởi chạy Dự án

Vocaburn chạy trên cổng quy định **5090**.

### Yêu cầu Hệ thống
- Python 3.10+
- Node.js 18+ (npm)

### Khởi chạy Nhanh (Stand-alone Launch - Đề xuất)
Chạy tệp khởi tạo duy nhất tại thư mục gốc:
```bash
python run_vocaburn.py
```
*Lệnh này sẽ tự động kiểm tra dependencies, biên dịch giao diện Frontend sang `app/static/dist`, khởi tạo cơ sở dữ liệu SQLite và chạy Uvicorn server tại `http://localhost:5090`.*

### Khởi chạy ở Môi trường Phát triển (Developer Mode - Hot Reload)
Khi cần chỉnh sửa mã nguồn client và xem thay đổi ngay lập tức:

1. **Khởi chạy Backend (FastAPI)**:
   ```bash
   pip install -r requirements.txt
   python app/core/init_db.py
   python -m uvicorn app.main:app --reload --port 5090
   ```

2. **Khởi chạy Frontend Dev Server (Vite)**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   *Truy cập `http://localhost:5173`. Các yêu cầu API sẽ được tự động proxy về backend cổng 5090.*

---

## 4. Tham chiếu Tài liệu Kỹ thuật Chi tiết

Toàn bộ tài liệu kỹ thuật đã được phân loại chuẩn tại thư mục [docs/](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/README.md):

- 🧭 **Mục lục Điều hướng Trung tâm**: [docs/README.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/README.md)
- 🏗️ **Kiến trúc Module Backend & Client**: [docs/01_architecture/MODULE_STRUCTURE.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/01_architecture/MODULE_STRUCTURE.md)
- 🗄️ **Cấu trúc Cơ sở Dữ liệu & FSRS Schema**: [docs/01_architecture/DATABASE_STRUCTURE.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/01_architecture/DATABASE_STRUCTURE.md)
- 🔌 **Tích hợp SSO CentralAuth & Handshake**: [docs/01_architecture/ECOSYSTEM_INTEGRATION.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/01_architecture/ECOSYSTEM_INTEGRATION.md)
- 📡 **Danh sách REST API Endpoints**: [docs/02_api_reference/API_REFERENCE.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/02_api_reference/API_REFERENCE.md)
- 🧭 **Đặc tả Live HUD Tracker Bar**: [docs/03_features_and_ui/STUDY_HEADER_TRACKER.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/03_features_and_ui/STUDY_HEADER_TRACKER.md)
- ⚙️ **Quy tắc Phát triển & Deploy VPS**: [docs/04_development_and_ops/DEVELOPMENT_RULES.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/04_development_and_ops/DEVELOPMENT_RULES.md)
- ⚛️ **Hướng dẫn Phát triển Frontend**: [docs/04_development_and_ops/FRONTEND_GUIDE.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/04_development_and_ops/FRONTEND_GUIDE.md)
- 📝 **Nhật ký Thay đổi (Changelog)**: [docs/05_changelog/CHANGELOG.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/05_changelog/CHANGELOG.md)
