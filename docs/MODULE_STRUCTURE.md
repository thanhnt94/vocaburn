# 📁 Cấu trúc Module Vocaburn (Module Structure)

Dự án Vocaburn được thiết kế theo kiến trúc **Modular Monolith**. Mã nguồn backend (FastAPI) nằm trong thư mục `app/` và được chia tách rõ ràng thành các tầng cấu hình hệ thống (Core) và các miền nghiệp vụ riêng biệt (Modules).

---

## 1. Cấu trúc Tổng quan Thư mục Backend

```
Vocaburn (Backend)
├── app/
│   ├── core/                   # Cấu hình dùng chung toàn hệ thống
│   │   ├── config.py           # Khai báo cấu hình từ biến môi trường (.env)
│   │   ├── db.py               # Thiết lập kết nối SQLite & AsyncSession
│   │   └── init_db.py          # Script khởi tạo cơ sở dữ liệu & nạp dữ liệu mẫu (seed)
│   │
│   ├── modules/                # Các module nghiệp vụ tự đóng gói độc lập
│   │   ├── admin/              # Dashboard quản lý cấu hình hệ thống & nhật ký admin
│   │   ├── ai/                 # Tích hợp Gemini AI giải thích từ vựng & ngữ pháp
│   │   ├── auth/               # Xác thực người dùng, băm mật khẩu & quản lý phiên local
│   │   ├── deck/               # Quản lý bộ Flashcard, lượt học, chấm điểm & FSRS
│   │   ├── gamification/       # Quản lý XP, Cấp độ, Chuỗi ngày (Streak) & Huy hiệu (Badge)
│   │   ├── notification/       # Quản lý thông báo đẩy & gửi thông báo qua Telegram
│   │   ├── sso_module/         # Quản lý SSO Client, callback xác thực & Handshake DB
│   │   └── stats/              # Ghi nhận & phân tích thống kê tiến trình học tập hàng ngày
│   │
│   └── main.py                 # Router trung tâm, CORS, Middleware & Khởi chạy ứng dụng
```

---

## 2. Chi tiết Chức năng từng Module Nghiệp vụ (`app/modules/`)

Mỗi module trong `app/modules/` là một đơn vị độc lập chứa đầy đủ: Models (SQLAlchemy), Schemas (Pydantic), Services (Business Logic) và Routes (API Endpoints).

### 2.1. Module `deck` (Quản lý Học tập & Flashcard)
*Đây là trái tim của hệ thống Vocaburn.*
- **Quản lý học liệu**: Định nghĩa và cấu trúc hóa các bộ Flashcard, danh mục (categories), thẻ nhãn dán (tags) và chia sẻ cộng tác (collaborators).
- **Import từ file Excel**: Cung cấp service phân tích file Excel mẫu (`excel_service.py`) để người dùng tải lên hàng loạt thẻ từ vựng một cách nhanh chóng.
- **Hệ thống lặp khoảng cách (Spaced Repetition)**:
  - Tích hợp hệ thống Leitner truyền thống chuyển thẻ qua 5 hộp dựa trên kết quả trả lời đúng/sai liên tiếp.
  - Tích hợp chuẩn **FSRS v6 (Free Spaced Repetition Scheduler)** nâng cao để tối ưu hóa thời gian hiển thị lại dựa trên độ ổn định bộ nhớ (`stability`) và độ khó của thẻ (`difficulty`).
- **Phục vụ luyện tập**: Tích hợp các Engine tùy chọn hình thức kiểm tra như trắc nghiệm (MCQ) và gõ từ vựng (Typing).

### 2.2. Module `sso_module` (Single Sign-On & Kết nối Ecosystem)
- Cung cấp API cấu hình SSO cục bộ và liên lạc đồng bộ với CentralAuth.
- Xử lý endpoint callback `/auth-center/callback` nhận mã xác thực từ CentralAuth, kiểm tra chéo và đồng bộ/tạo tài khoản cục bộ tương ứng.
- Cung cấp endpoint handshake `/api/admin/sso/handshake` phục vụ việc đồng bộ cơ sở dữ liệu động từ xa.

### 2.3. Module `ai` (Trợ lý Học tập Gemini AI)
- Tận dụng Google Gemini API để tự động sinh ra giải thích từ vựng/ngữ pháp chuyên sâu (`ai_explanation`).
- Có cơ chế hàng đợi bất đồng bộ (Background Tasks) để tạo giải thích từ vựng dưới dạng mã HTML sạch, tự động loại bỏ định dạng markdown thô và hỗ trợ thẻ phát âm tiếng Nhật `<ruby>`.

### 2.4. Module `gamification` (Điểm số & Thành tựu)
- Quản lý điểm kinh nghiệm (XP) cho mọi hành động học tập (+10 XP khi trả lời đúng, +2 XP khi sai để khuyến khích nỗ lực).
- Kiểm tra điều kiện mở khóa huy hiệu (`badges`) như trả lời nhanh (Speed Demon), chuỗi trả lời đúng (Perfect Score), v.v. và trao thưởng XP.

### 2.5. Module `stats` (Thống kê & Tiến độ)
- Ghi nhận lịch sử hoạt động học tập hàng ngày của người dùng (`questions_attempted`, `correct_answers`, `total_time_seconds`, `accuracy`).
- Cung cấp dữ liệu trực quan cho biểu đồ tiến độ học tập ở trang tổng quan (Dashboard).

### 2.6. Module `auth` (Quản lý tài khoản cục bộ)
- Cung cấp khả năng đăng nhập, đăng ký và thiết lập mật khẩu cục bộ khi chạy Vocaburn ở chế độ độc lập (Stand-alone mode - tắt SSO).
- Chịu trách nhiệm mã hóa và xác minh mật khẩu bằng cơ chế Werkzeug tương thích toàn hệ thống Ecosystem.

### 2.7. Module `notification` (Thông báo & Nhắc nhở)
- Hỗ trợ thông báo đẩy trực tiếp trên trình duyệt Web (Push API/Web Push).
- Tích hợp cấu hình liên kết Telegram Bot giúp gửi thông báo nhắc nhở học tập hàng ngày và thông báo bảo vệ chuỗi ngày học (Streak Guard).

---

## 3. Cấu trúc Frontend (React Client SPA)

Mã nguồn frontend của Vocaburn nằm trong thư mục `client/` được xây dựng bằng Vite, React 19 và TailwindCSS v4:
- `client/src/components/`: Chứa các component UI dùng chung và tái sử dụng (Button, Card, Modal, Cyberpunk-glassmorphic layouts).
- `client/src/pages/`: Chứa các màn hình chính tương ứng với Router phía Client:
  - `Dashboard`: Bảng điều khiển chính hiển thị tiến độ học tập, chuỗi streak và danh sách bộ Flashcard.
  - `DeckDetail` / `EditFlashcards`: Xem chi tiết bộ Flashcard và chỉnh sửa từ vựng.
  - `StudySession`: Màn hình luyện tập Flashcard hỗ trợ Leitner và hiển thị khoảng thời gian ôn tập tiếp theo.
- `client/src/store/`: Quản lý trạng thái toàn cục của ứng dụng bằng **Zustand** (`useAppStore.ts` quản lý dữ liệu học tập và `useAuthStore.ts` quản lý phiên đăng nhập/SSO).
