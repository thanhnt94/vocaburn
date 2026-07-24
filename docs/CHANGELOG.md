# 📝 Nhật ký Chỉnh sửa Vocaburn (Changelog)

Tài liệu này lưu lại lịch sử thay đổi cấu trúc, tính năng, và các bản vá lỗi của dự án Vocaburn.

---

### [2026-07-24]
#### Tái cấu trúc & Chuẩn hóa Hệ thống Tài liệu (.md)
- **Chuẩn hóa `README.md` Thư mục Gốc**:
  - Gỡ bỏ hoàn toàn tên dự án cũ QuizMind, cổng cũ 5080 và lệnh cũ `run_quizmind.py`.
  - Cập nhật chính xác tên **Vocaburn**, cổng quy định **5090**, thuật toán **FSRS v6**, và hướng dẫn khởi chạy standalone `python run_vocaburn.py`.
- **Hợp nhất Thư mục Tài liệu (Single Source of Truth)**:
  - Loại bỏ hoàn toàn thư mục dư thừa `.docs/` (chứa các file chứa thông tin schema/API sai lệch).
  - Quy tụ toàn bộ tài liệu kỹ thuật dự án vào thư mục duy nhất `docs/`.
- **Cập nhật & Tạo mới các tệp tài liệu hướng dẫn trong `docs/`**:
  - `docs/MODULE_STRUCTURE.md`: Mô tả chính xác 8 module backend (`admin`, `ai`, `auth`, `deck`, `gamification`, `notification`, `sso_module`, `stats`) và cấu trúc client React SPA (19 pages, Zustand stores `useAppStore`, `useAuthStore`).
  - `docs/DATABASE_STRUCTURE.md`: Đảm bảo độ chính xác 100% của Schema SQLAlchemy và thông số FSRS v6 (`stability`, `difficulty`, `state`, `step`, `due`).
  - `docs/API_REFERENCE.md` (*Mới*): Liệt kê toàn bộ các REST API Endpoints thực tế (`/api/v1/quiz/...`, `/api/v1/auth/...`, `/api/v1/gamification/...`, `/api/v1/stats/...`).
  - `docs/DEVELOPMENT_RULES.md`: Quy định tuân thủ Planning Mode, quy tắc hygiene directory (`tmp/`/`scratch/`), quy trình đóng gói frontend `python build_vite.py` và triển khai VPS.
  - `docs/ECOSYSTEM_INTEGRATION.md`: Cập nhật chi tiết luồng SSO CentralAuth (port 5000), Handshake DB và Admin Backdoor (`/login?backdoor=1`).
  - `client/README.md`: Hướng dẫn phát triển React 19 + Vite TS + Tailwind v4 và build system.

---

### [2026-07-18]
#### Cải tiến & Refactor
- **Tối ưu hóa UI/UX Dashboard trên Di động (Mobile App UI/UX Redesign)**: Thiết kế lại toàn bộ giao diện di động theo phong cách Mobile App tối giản và trực quan.
  - Bổ sung profile HUD card nổi bật ở đầu trang di động hiển thị thông tin cấp độ (level), chuỗi ngày học liên tục (streak) rực rỡ và thanh trượt tiến trình XP.
  - Thiết kế hệ thống tab switcher di động gồm hai tab "Học tập" (chứa danh sách thẻ lộ trình) và "Thống kê & Rank" (chứa biểu đồ báo cáo FSRS, so sánh ngày, Heatmap, Bảng xếp hạng và Thành tích) giúp giảm tải thông tin, chống rối mắt.
  - Redesign thẻ lộ trình học tập (Roadmap Card) hiển thị ảnh bìa (cover image) lớn hoặc dải gradient HSL nghệ thuật, thanh tiến trình bo tròn và bộ phím tắt hành động nhanh cho lộ trình/FSRS/Luyện tập tự do.
- **Sắp xếp Thư viện theo Lượt học gần nhất (Library Smart Sorting)**: Cải tiến backend API `/api/v1/dashboard/data` để tự động sắp xếp danh sách các bộ thẻ của người dùng theo mốc thời gian học gần nhất giảm dần (`last_studied_at.desc()`). Những bộ thẻ vừa mới chơi hoặc đang học dở sẽ tự động được ưu tiên đưa lên đầu Thư viện để tiện truy cập.
- **Ghi nhận tiến trình chế độ Lật nhanh (Quick Flip Tracking)**: Tích hợp cơ chế tự động gửi kết quả ghi nhận `/record_answer` (với đánh giá `Good` / 3) khi người dùng bấm NEXT CARD ở chế độ Lật nhanh (flip), giúp các thẻ đã xem được thống kê đầy đủ và đẩy mốc thời gian học của bộ thẻ lên trên cùng.
- **Roadmap-driven Study Goals**: Loại bỏ hệ thống đặt mục tiêu học tập (Goals) cũ (thời gian, tổng số thẻ) trên Dashboard và Library. Thay thế hoàn toàn bằng lộ trình học tập tự động hóa **Roadmap** theo từng bộ thẻ (deck-scoped settings).
- **Trang Dashboard mới**: Cập nhật giao diện `Dashboard.tsx` hiển thị widget các bộ thẻ đang học theo lộ trình, hiển thị tiến độ học hàng ngày (số từ mới/cần ôn) và số ngày dự kiến hoàn thành.
- **Trang Chi tiết bộ thẻ**: Bổ sung bảng thông tin tiến trình lộ trình chi tiết bao gồm streak, lịch sử 7 ngày gần nhất, và biểu đồ tiến độ. Cho phép cấu hình số từ mới & giới hạn ôn tập hàng ngày riêng cho từng bộ thẻ.

#### Lỗi đã sửa (Bug Fixes)
- **Hỗ trợ Furigana cho ký tự `々`**: Cập nhật hàm `parseBBCodeToHtml` trong `text.ts` và `ImportFlashcard.tsx` hỗ trợ nhận diện ký tự lặp Kanji `々` (U+3005), giúp hiển thị furigana chính xác cho các từ như `人々[ひとびと]`.
- **Sửa lỗi SQLite Date Casting**: Thay thế `cast(UserAnswer.created_at, Date)` thành `func.date(UserAnswer.created_at)` trong file `play.py` để tránh lỗi `TypeError: fromisoformat: argument must be str` khi chạy truy vấn tính toán streak trên môi trường SQLite.
