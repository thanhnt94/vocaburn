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
│   │   ├── auth/               # Xác thực tài khoản local, băm mật khẩu & phiên làm việc
│   │   ├── deck/               # Quản lý bộ Flashcard, lượt học, chấm điểm & FSRS v6
│   │   ├── gamification/       # Quản lý XP, Cấp độ, Chuỗi ngày (Streak) & Huy hiệu (Badge)
│   │   ├── notification/       # Quản lý thông báo đẩy & nhắc nhở qua Telegram Bot
│   │   ├── sso_module/         # Single Sign-On Client, callback & Handshake DB với CentralAuth
│   │   └── stats/              # Phân tích & Ghi nhận thống kê tiến trình học tập hàng ngày
│   ├── static/                 # Tài nguyên tĩnh & Thư mục đóng gói Production Frontend (`static/dist`)
│   └── main.py                 # Core Application Router, Middleware, Lifecycle & SPA Handler
├── client/                     # React 19 + TypeScript + Vite + Tailwind v4 SPA Frontend
│   ├── src/
│   │   ├── components/         # Component UI dùng chung & layout glassmorphism
│   │   ├── pages/              # Màn hình ứng dụng (Dashboard, FlashcardPlay, EditFlashcards...)
│   │   ├── store/              # Zustand global state (useAppStore, useAuthStore)
│   │   └── lib/                # Utility helpers & API Axios client
│   └── package.json
├── docs/                       # Thư mục Tài liệu Kỹ thuật Duy nhất (Single Source of Truth)
│   ├── MODULE_STRUCTURE.md     # Chi tiết cấu trúc các Module Backend & Frontend
│   ├── DATABASE_STRUCTURE.md   # Cấu trúc Cơ sở Dữ liệu & Schema FSRS v6
│   ├── API_REFERENCE.md        # Danh sách REST API Endpoints chuẩn (/api/v1/...)
│   ├── DEVELOPMENT_RULES.md    # Quy tắc phát triển, Hygiene (tmp/scratch) & Deployment
│   ├── ECOSYSTEM_INTEGRATION.md# Hướng dẫn kết nối SSO CentralAuth, Handshake & Backdoor
│   └── CHANGELOG.md            # Lịch sử cập nhật dự án
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
- **Lộ trình Bộ thẻ (Deck Roadmap)**: Cho phép thiết lập chỉ tiêu số thẻ mới cần học và số thẻ tối đa cần ôn tập mỗi ngày cho từng bộ flashcard.

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

## 4. Tham chiếu Tài liệu Kỹ thuật

- **Kiến trúc Module Backend & Client**: Xem [docs/MODULE_STRUCTURE.md](file:///c:/Code/Ecosystem/Vocaburn/docs/MODULE_STRUCTURE.md)
- **Cấu trúc Cơ sở Dữ liệu & FSRS Schema**: Xem [docs/DATABASE_STRUCTURE.md](file:///c:/Code/Ecosystem/Vocaburn/docs/DATABASE_STRUCTURE.md)
- **Danh sách REST API Endpoints**: Xem [docs/API_REFERENCE.md](file:///c:/Code/Ecosystem/Vocaburn/docs/API_REFERENCE.md)
- **Quy tắc Phát triển & Deploy VPS**: Xem [docs/DEVELOPMENT_RULES.md](file:///c:/Code/Ecosystem/Vocaburn/docs/DEVELOPMENT_RULES.md)
- **Tích hợp SSO CentralAuth**: Xem [docs/ECOSYSTEM_INTEGRATION.md](file:///c:/Code/Ecosystem/Vocaburn/docs/ECOSYSTEM_INTEGRATION.md)
- **Hướng dẫn Phát triển Frontend**: Xem [client/README.md](file:///c:/Code/Ecosystem/Vocaburn/client/README.md)
