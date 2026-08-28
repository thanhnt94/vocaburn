# 📝 Nhật ký Chỉnh sửa Vocaburn (Changelog)

Tài liệu này lưu lại lịch sử thay đổi cấu trúc, tính năng, và các bản vá lỗi của dự án Vocaburn.

### [2026-08-28]
#### Tái Cấu Trúc & Module Hóa Toàn Diện Phân Hệ Deck (Frontend)
- **Chuẩn hóa đặt tên Tiền tố `Deck...`**:
  - Gom toàn bộ các component và tab của phân hệ Deck vào thư mục chuyên trách `client/src/components/deck/`.
  - Phân rã 4 tệp khổng lồ (>7.500 dòng code) thành 4 tab tinh gọn: `DeckOverviewTab.tsx`, `DeckCardsTab.tsx`, `DeckRoadmapTab.tsx`, `DeckSettingsTab.tsx`.
- **Tách nhỏ Sub-components độc lập & Tái sử dụng**:
  - `cards/`: `DeckCardItem.tsx`, `DeckCardQuickAdd.tsx`, `DeckCardBatchPasteModal.tsx`, `DeckCardEditModal.tsx`, `DeckCardFilterBar.tsx`.
  - `overview/`: `DeckFsrsStatsCard.tsx`, `DeckQuickStudyLauncher.tsx`, `DeckRecentHistory.tsx`.
  - `roadmap/`: `DeckRoadmapPipelineCard.tsx`, `DeckRoadmapGoalForm.tsx`.
  - `settings/`: `DeckGeneralForm.tsx`, `DeckPracticeConfig.tsx`, `DeckAutomationTools.tsx`, `DeckExcelManager.tsx`, `DeckDangerZone.tsx`, `DeckCollaboratorsModal.tsx`.
  - `modals/`: `DeckStudyModal.tsx`, `DeckCreateModal.tsx`, `DeckJoinRoomModal.tsx`.
- **Tối ưu hóa `DecksPage.tsx` & `DeckDetailPage.tsx`**:
  - Tích hợp các modal dùng chung, giảm hơn 200 dòng inline modal code trong `DecksPage.tsx`.
  - Kết nối hệ thống tab switcher mượt mà bằng Framer Motion trong `DeckDetailPage.tsx`.
- **Dọn dẹp Dead Code**:
  - Loại bỏ hoàn toàn 6 file cũ: `FlashcardDetail.tsx`, `EditFlashcards.tsx`, `EditFlashcard.tsx`, `DeckRoadmap.tsx`, `Library.tsx`, `ManageFlashcards.tsx`.
  - Xác thực TypeScript không có lỗi (`npx tsc --noEmit` code 0).

### [2026-08-15]
#### Nâng Cấp Giao Diện Header Bar Chế Độ Lộ Trình (Roadmap Pro Live HUD Header Bar)
- **Thiết kế Pro Live HUD Header Bar (`RoadmapHeaderTracker.tsx`)**:
  - Tái cấu trúc thanh Header trong chế độ Roadmap (`/flashcard/:id/play?mode=roadmap` và `/practice/:id`) sang phong cách **Dark Glassmorphism** cao cấp (`backdrop-blur-2xl`, viền neon mờ, badge sắc nét).
  - Tích hợp cụm **Pro HUD Chips** bên phải hiển thị đầy đủ thông tin thời gian thực:
    - **Live Card & Session Timer (⏱️)**: Đếm thời gian làm từng thẻ (reset tự động khi chuyển thẻ) và hỗ trợ click để chuyển đổi chế độ xem: Thời gian thẻ này (Card Time) ➔ Thời gian học hôm nay (Today Time) ➔ Tổng thời gian (Total Time).
    - **Điểm XP & Gamification (🏆 / ⚡)**: Hiển thị XP đạt được trong ngày và tổng XP với hiệu ứng nhảy số động `popLayout`.
    - **Chuỗi ngày học Streak (🔥)**: Hiệu ứng pulse và đếm ngày liên tục rực rỡ.
  - Tích hợp **Pipeline Stepper**: Hiển thị rõ ràng các bước trong lộ trình (Học từ mới, Trắc nghiệm MCQ, Ôn tập FSRS...) với tiến độ thẻ chi tiết (`10 / 20`), icon sinh động và hiệu ứng phát sáng cho bước đang kích hoạt.
  - Nút thoát phiên học (`X`) thiết kế phong cách glassmorphism mượt mà.
  - Tương thích Responsive: Hiển thị pipeline đa bước trên Desktop/Tablet và tự động thu gọn thành pill active tinh gọn trên Mobile.
- **Đồng bộ hóa giao diện FlashcardPlay & PracticePlay (`FlashcardPlay.tsx`, `PracticePlay.tsx`)**:
  - Truyền đầy đủ trạng thái thời gian, điểm XP, streak và tiến độ thẻ sang cho `RoadmapHeaderTracker`.
  - Thanh tiến trình viền dưới Header (*Glow Underline Progress Bar*) chuyển động mượt mà với dải màu gradient `amber ➔ rose ➔ indigo` phản hồi theo tiến độ hoàn thành mục tiêu ngày.

### [2026-08-08]
#### Cập Nhật & Sửa Lỗi Lộ Trình (Roadmap & Dashboard Enhancements)
- **Sửa Lỗi Đếm Tiến Trình Bài Học Flashcard (`FlashcardPlay.tsx`)**:
  - Khắc phục triệt để lỗi hiển thị `20/20` ngay khi vừa bấm vào học từ mới. Loại bỏ việc cộng dồn `sessionAnswers.length` (phiên cũ tích lũy qua nhiều ngày) vào số đếm bài học hàng ngày.
  - Sử dụng trực tiếp dữ liệu chuẩn hóa từ Backend API (`progress.learned`, `progress.reviewed_today`) và xử lý nullish coalescing `?? 0` chính xác cho `0/20` khi bắt đầu ngày mới.
- **Tái Thiết Kế Nút Hành Động CTA Dashboard (`Dashboard.tsx`)**:
  - Chuyển đổi tên bước chính ở dòng 1 sang dạng **IN HOA NỔI BẬT** (`HỌC TỪ MỚI`, `TRẮC NGHIỆM MCQ`, `ÔN TẬP FSRS`, `ĐÃ HOÀN THÀNH ✓`) với font chữ font-black tracking-widest, nâng cao tính trực quan.
  - Phân tầng màu sắc và độ tương phản giữa dòng tiêu đề chính và dòng mô tả phụ bên dưới.
- **Bổ Sung Đếm Ngược Thời Gian Còn Lại Trong Ngày (`Dashboard.tsx`)**:
  - Thêm thẻ đồng hồ đếm ngược thời gian thực (`⏱️ Còn HHh MMm SSs`) ngay trong Hero Mascot Card trên Dashboard để người học dễ dàng theo dõi thời gian còn lại hoàn thành chỉ tiêu trước nửa đêm.
- **Thêm Quy Tắc AI Workspace (`.agents/AGENTS.md`)**:
  - Quy định dừng theo dõi (polling/monitoring) ngay sau khi kích hoạt các script remote update (VD: `remote_update_vocaburn.py`), tối ưu tài nguyên token và phản hồi ngay lập tức cho người dùng.

---

### [2026-07-28]
#### Chuẩn hóa và Đồng bộ Tài liệu
- **Cập nhật `docs/API_REFERENCE.md`**:
  - Khắc phục lỗi viết sai tiền tố URL từ `/quiz/` thành `/deck/` để khớp hoàn toàn với mã nguồn backend FastAPI.
  - Bổ sung đầy đủ tất cả endpoint về Multiplayer Room, tương tác thẻ (Notes, Star, Ignore), đóng góp ý kiến bình luận (Card Contributions), thống kê học tập chuyên sâu, và hệ thống thông báo đẩy (Web Push/Telegram Bot).
- **Cập nhật `docs/DATABASE_STRUCTURE.md`**:
  - Bổ sung chi tiết schema của 12 bảng cơ sở dữ liệu thực tế đang chạy bao gồm: phòng chơi multiplayer, phiên học dở dang, ghi chú cá nhân, cộng tác viên, mục tiêu lộ trình hàng ngày (Roadmap), thống kê chế độ luyện tập nâng cao và luồng bình luận đóng góp của người học.

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
