# 📝 Nhật ký Chỉnh sửa Vocaburn (Changelog)

Tài liệu này lưu lại lịch sử thay đổi cấu trúc, tính năng, và các bản vá lỗi của dự án Vocaburn.

---

### [2026-09-03]
#### Thiết Kế Lại Bộ Favicon & Mobile App Icon Độc Quyền Theo Hình Mascot Vocaburn
- **Tái Tạo Bộ Nhận Diện Icon Ứng Dụng (`favicon.ico`, `favicon.png`, `apple-touch-icon.png`, `manifest.json`)**:
  - Loại bỏ hoàn toàn favicon cũ (ảnh JPEG nền trắng không rõ nét mang tai nghe từ dự án khác).
  - Tách nền và xử lý độ nét cao cho linh vật **Vocaburn Flame Boy**: cậu bé ngọn lửa 3D đáng yêu với mái tóc lửa rực sáng, mắt to lấp lánh, nụ cười vui tươi và áo choàng siêu anh hùng kèm huy hiệu vàng.
  - **Browser Tab Favicon (`favicon.ico`, `favicon.png`)**: Tách nền trong suốt 100%, hiển thị nổi bật và sạch sẽ trên cả Dark Mode lẫn Light Mode của trình duyệt mà không bị viền trắng.
  - **Mobile App Icon (`apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png`)**: Thiết kế chuẩn Apple Touch Icon và Google PWA với nền gradient tròn tỏa nhiệt (radial gradient) từ vàng cam ấm áp đến đỏ rực hoàng hôn, tạo chiều sâu 3D đẳng cấp khi người dùng thêm ứng dụng ra màn hình chính (Add to Home Screen) trên iPhone và Android.
  - Cập nhật màu chủ đề `theme-color` trong `index.html` và `manifest.json` sang sắc cam lửa `#EA580C`.

#### Tinh Chỉnh Kích Thước Logo Vocaburn Gọn Gàng & Bổ Sung Type Check Cho Pipeline Build
- **Tối Ưu Kích Thước Logo Vocaburn (`VocaburnLogo.tsx`, `Dashboard.tsx`, `Layout.tsx`)**:
  - Tái cấu trúc lại thang kích thước `heightClasses` của component `VocaburnLogo`: `xs` (24px), `sm` (28px), `md` (38px - 40px), `lg` (44px - 48px), `xl` (56px - 80px).
  - Tinh chỉnh thanh Header Dashboard: Giảm padding trên dưới xuống mức tối thiểu `py-1 sm:py-1.5` và tăng kích thước logo lên `height="md"` (`38px`). Nhờ đó, chữ "VOCABURN" to rõ, sống động và dễ đọc hơn 35%, trong khi tổng chiều cao toàn bộ div Header vẫn giữ nguyên mỏng nhẹ (~45px).
  - Chuẩn hóa logo desktop header tại `Layout.tsx` về `height="md"` (38px - 40px).
- **Thực Thi Type Check Trước Build (`build_vite.py`)**:
  - Bổ sung lệnh kiểm tra kiểu TypeScript `npx tsc -p tsconfig.app.json --noEmit` trước khi chạy `vite build` theo đúng Quy chuẩn Phòng ngừa Trắng màn hình.

#### Nâng Cấp Trình Xây Dựng Lộ Trình Động (Dynamic Step Pipeline Builder) & Bộ Lọc Quá Hạn FSRS v6
- **Tái Thiết Kế Giao Diện Cài Đặt Mục Tiêu Lộ Trình (`DeckRoadmapGoalForm.tsx`)**:
  - Chuyển đổi form cài đặt tĩnh cũ sang **Interactive Step Pipeline Builder**, cho phép người dùng tự do lựa chọn, cấu hình, thêm/xóa và sắp xếp thứ tự từng chặng học tập:
    - 🎴 **Học từ mới (`new_cards`)**: Tùy chỉnh số lượng từ mới (`daily_count`, ví dụ: 20 từ) kèm các nút chọn nhanh (10, 15, 20, 30).
    - 🎯 **Trắc nghiệm (`mcq`)**: Tùy chỉnh số câu hỏi test (`question_count`) và ngưỡng điểm % đạt (`pass_threshold`).
    - ⌨️ **Gõ từ vựng (`typing`)**: Luyện nhớ chính xác mặt chữ với số câu và ngưỡng điểm đạt.
    - 🔄 **Ôn tập FSRS v6 (`fsrs_review`)**: Tùy chỉnh điều kiện thẻ quá hạn: *Quá hạn trên 1 ngày* (mốc 23h59 hôm nay, đảm bảo thẻ học trong ngày không bị tính vào quá hạn, giữ mục tiêu ổn định suốt cả ngày), *Tất cả thẻ đến hạn*, hoặc *Quá hạn trên 2-3 ngày*.
    - ⏱️ **Thời gian học (`study_time`)**: Đặt mục tiêu phút tập trung.
  - Tích hợp điều khiển linh hoạt: ⬆️ Di chuyển lên, ⬇️ Di chuyển xuống, 🗑️ Xóa chặng.
  - Hỗ trợ 4 bộ mẫu cấu hình nhanh (Quick Presets): *Tiêu chuẩn*, *Luyện gõ từ*, *Toàn diện*, *Chỉ ôn tập*.
- **Đồng Bộ Trạng Thái & Hiển Thị Tiến Độ (`DeckRoadmapPipelineCard.tsx`, `DeckRoadmapTab.tsx`)**:
  - Truyền `status` từ API `/roadmap-status` sang `DeckRoadmapGoalForm` để nạp chính xác pipeline hiện tại của người dùng.
  - Cập nhật mô tả chặng trực quan tại tab *Tiến Độ Hôm Nay*, hiển thị rõ điều kiện quá hạn của FSRS v6.

---

### [2026-09-01]
#### Khắc Phục Lỗ Hổng Bảo Mật (IDOR), Triệt Tiêu Concurrency AsyncSession, Đóng Gói DeckInterface & Nâng Cấp Hệ Thống Thống Kê
- **Vá Toàn Diện Lỗ Hổng Bảo Mật & Phân Quyền (IDOR)**:
  - Bổ sung xác thực quyền sở hữu và vai trò Admin cho các endpoint xóa bộ thẻ `DELETE /api/v1/deck/{deck_id}`, sửa/xóa thẻ `PATCH/DELETE /api/v1/deck/question/{card_id}`.
  - Bảo vệ các thao tác quản lý cột tùy chỉnh (`/{deck_id}/add-column`, `/{deck_id}/rename-column`, `/{deck_id}/delete-column`) và các tác vụ sinh nội dung AI/TTS hàng loạt (`generate-all-audio`, `generate-all-ai`, `generate-all-images`, `generate-all-furigana`).
- **Triệt Tiêu Concurrency Hazard (`AsyncSession`) & Tối Ưu N+1 Query**:
  - Loại bỏ hoàn toàn việc gọi `asyncio.gather(db.execute...)` trên cùng một session `AsyncSession` (nguyên nhân gây lỗi `InterfaceError: cannot perform operation: another operation is in progress`), chuyển sang cơ chế tuần tự an toàn tuyệt đối tại `stats.py`, `play.py`, `api.py`, `analytics_service.py`.
  - Tối ưu hóa hàm kiểm tra huy hiệu `check_badges_async` trong `background_tasks.py` theo mô hình Event-driven, giảm từ 5-8 query tuần tự mỗi lần lật thẻ xuống mức tối thiểu.
  - Xử lý an toàn chống lỗi `NoneType` (Null Safety) cho các biến đếm `mastery.consecutive_correct` và `p_stats.correct_count`.
- **Chuẩn Hóa Kiến Trúc Modular Monolith (`app/modules/deck/interface.py`)**:
  - Tạo mới `DeckInterface` đóng gói ranh giới nghiệp vụ của Module `deck`, cung cấp `get_deck`, `check_user_deck_permission`, `check_card_permission`.
  - Loại bỏ các inline import rải rác trong thân hàm và cập nhật tải tệp mẫu sang `Vocaburn_Template.xlsx`.
- **Nâng Cấp API Thống Kê & Giao Diện Play Stats Drawer Chuyên Sâu**:
  - Bổ sung 2 endpoint mới: `GET /api/v1/deck/question/{card_id}/detailed-stats` (chỉ số FSRS v6, Stability, Difficulty, Retrievability $R\%$, thống kê 4 mức rating và lịch sử 30 lần học) và `GET /api/v1/deck/{deck_id}/overview-stats` (tổng thời gian, ngày hoạt động, phân bố 5 hộp Leitner).
  - Tái cấu trúc `PlayStatsDrawer.tsx` với 3 sub-tab trực quan: **Thẻ này**, **Bộ thẻ**, **Đua top**.
  - Cố định thanh Footer 3 nút điều hướng (`MAP`, `FLASHCARD`, `STATS`) luôn hiển thị ở `bottom-0 z-[300]`, lớp Modal Bản đồ đặt ở `bottom-12 z-[200]`.
- **Đồng Bộ Dữ Liệu & Đổi Tên Quản Trị Viên Thành `admin`**:
  - Tạo Alembic migration `d4e5f6a7b8c9_rename_quizmind_admin_to_admin.py` đổi tên tài khoản mặc định ID 1 thành `admin`.

---

### [2026-08-30]
#### Rà Soát, Chuẩn Hóa 100% Codebase & Quy Hoạch Cây Thư Mục Tài Liệu (`docs/`)
- **Quy Hoạch Cây Thư Mục Tài Liệu Thành 5 Phân Nhóm Chuyên Trách**:
  - `docs/README.md`: Mục lục điều hướng trung tâm liên kết toàn bộ tài liệu dự án.
  - `01_architecture/`: Chứa `MODULE_STRUCTURE.md`, `DATABASE_STRUCTURE.md`, `ECOSYSTEM_INTEGRATION.md`.
  - `02_api_reference/`: Chứa `API_REFERENCE.md`.
  - `03_features_and_ui/`: Chứa `STUDY_HEADER_TRACKER.md`.
  - `04_development_and_ops/`: Chứa `DEVELOPMENT_RULES.md`, `FRONTEND_GUIDE.md`.
  - `05_changelog/`: Chứa `CHANGELOG.md`.
- **Khắc Phục 100% Sai Lệch Schema Cơ Sở Dữ Liệu (`DATABASE_STRUCTURE.md`)**:
  - Bổ sung tài liệu bảng trọng tâm `user_global_settings` phục vụ chính sách Không localStorage (**No-localStorage Directive**).
  - Loại bỏ bảng lỗi thời `user_global_goals`.
  - Bổ sung tài liệu 7 bảng thực tế đang hoạt động: `roadmap_pipeline_history`, `deck_rooms`, `deck_room_participants`, `deck_room_chats`, `xp_transactions`, `user_daily_activities`, `user_badges`, `point_transactions`, `notifications`, `push_subscriptions`, `user_telegram_configs`, `admin_logs`.
  - Chuẩn hóa các trường `last_due` trong `user_card_mastery`, `is_frozen` trong `user_daily_stats`, `is_rescued` trong `user_daily_progress`.
- **Đồng Bộ Hoá Danh Mục REST API (`API_REFERENCE.md`)**:
  - Bổ sung endpoint cấu hình cá nhân `GET /api/v1/user/settings` và `PATCH /api/v1/user/settings`.
  - Bổ sung endpoint ôn tập ngày `GET /api/v1/deck/today-review`.
  - Chuẩn hóa thông tin trả về của `/auth/me` kèm payload `settings`.
- **Đồng Bộ Quy Chuẩn Phát Triển & AI Operating Rules (`DEVELOPMENT_RULES.md`)**:
  - Cập nhật quy tắc bắt buộc về di cư database chỉ qua Alembic (`alembic upgrade head`).
  - Cập nhật quy tắc cấm chạy `npm run build` và cấm polling SSH trong lượt của AI Agent.

---

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

---

### [2026-08-15]
#### Nâng Cấp Giao Diện Header Bar Chế Độ Lộ Trình (Roadmap Pro Live HUD Header Bar)
- **Thiết kế Pro Live HUD Header Bar (`StudyHeaderTracker.tsx`)**:
  - Tái cấu trúc thanh Header trong chế độ Roadmap (`/flashcard/:id/play?mode=roadmap` và `/practice/:id`) sang phong cách **Dark Glassmorphism** cao cấp (`backdrop-blur-2xl`, viền neon mờ, badge sắc nét).
  - Tích hợp cụm **Pro HUD Chips** bên phải hiển thị đầy đủ thông tin thời gian thực:
    - **Live Card & Session Timer (⏱️)**: Đếm thời gian làm từng thẻ (reset tự động khi chuyển thẻ) và hỗ trợ click để chuyển đổi chế độ xem: Thời gian thẻ này (Card Time) ➔ Thời gian học hôm nay (Today Time) ➔ Tổng thời gian (Total Time).
    - **Điểm XP & Gamification (🏆 / ⚡)**: Hiển thị XP đạt được trong ngày và tổng XP với hiệu ứng nhảy số động `popLayout`.
    - **Chuỗi ngày học Streak (🔥)**: Hiệu ứng pulse và đếm ngày liên tục rực rỡ.
  - Tích hợp **Pipeline Stepper**: Hiển thị rõ ràng các bước trong lộ trình (Học từ mới, Trắc nghiệm MCQ, Ôn tập FSRS...) với tiến độ thẻ chi tiết (`10 / 20`), icon sinh động và hiệu ứng phát sáng cho bước đang kích hoạt.
  - Nút thoát phiên học (`X`) thiết kế phong cách glassmorphism mượt mà.
  - Tương thích Responsive: Hiển thị pipeline đa bước trên Desktop/Tablet và tự động thu gọn thành pill active tinh gọn trên Mobile.
- **Đồng bộ hóa giao diện FlashcardPlay & PracticePlay (`FlashcardPlay.tsx`, `PracticePlay.tsx`)**:
  - Truyền đầy đủ trạng thái thời gian, điểm XP, streak và tiến độ thẻ sang cho `StudyHeaderTracker`.
  - Thanh tiến trình viền dưới Header (*Glow Underline Progress Bar*) chuyển động mượt mà với dải màu gradient `amber ➔ rose ➔ indigo` phản hồi theo tiến độ hoàn thành mục tiêu ngày.

---

### [2026-08-08]
#### Cập Nhật & Sửa Lỗi Lộ Trình (Roadmap & Dashboard Enhancements)
- **Sửa Lỗi Đếm Tiến Trình Bài Học Flashcard (`FlashcardPlay.tsx`)**:
  - Khắc phục triệt để lỗi hiển thị `20/20` ngay khi vừa bấm vào học từ mới. Loại bỏ việc cộng dồn `sessionAnswers.length` vào số đếm bài học hàng ngày.
  - Sử dụng trực tiếp dữ liệu chuẩn hóa từ Backend API (`progress.learned`, `progress.reviewed_today`) và xử lý nullish coalescing `?? 0` chính xác cho `0/20` khi bắt đầu ngày mới.
- **Tái Thiết Kế Nút Hành Động CTA Dashboard (`Dashboard.tsx`)**:
  - Chuyển đổi tên bước chính ở dòng 1 sang dạng **IN HOA NỔI BẬT** (`HỌC TỪ MỚI`, `TRẮC NGHIỆM MCQ`, `ÔN TẬP FSRS`, `ĐÃ HOÀN THÀNH ✓`) với font chữ font-black tracking-widest, nâng cao tính trực quan.
- **Bổ Sung Đếm Ngược Thời Gian Còn Lại Trong Ngày (`Dashboard.tsx`)**:
  - Thêm thẻ đồng hồ đếm ngược thời gian thực (`⏱️ Còn HHh MMm SSs`) ngay trong Hero Mascot Card trên Dashboard để người học dễ dàng theo dõi thời gian còn lại hoàn thành chỉ tiêu trước nửa đêm.

---

### [2026-07-28]
#### Chuẩn hóa và Đồng bộ Tài liệu
- **Cập nhật `docs/API_REFERENCE.md`**:
  - Khắc phục lỗi viết sai tiền tố URL từ `/quiz/` thành `/deck/` để khớp hoàn toàn với mã nguồn backend FastAPI.
  - Bổ sung đầy đủ tất cả endpoint về Multiplayer Room, tương tác thẻ (Notes, Star, Ignore), đóng góp ý kiến bình luận (Card Contributions), thống kê học tập chuyên sâu, và hệ thống thông báo đẩy (Web Push/Telegram Bot).
- **Cập nhật `docs/DATABASE_STRUCTURE.md`**:
  - Bổ sung chi tiết schema của 12 bảng cơ sở dữ liệu thực tế đang chạy.

---

### [2026-07-24]
#### Tái cấu trúc & Chuẩn hóa Hệ thống Tài liệu (.md)
- **Chuẩn hóa `README.md` Thư mục Gốc**:
  - Gỡ bỏ hoàn toàn tên dự án cũ QuizMind, cổng cũ 5080 và lệnh cũ `run_quizmind.py`.
  - Cập nhật chính xác tên **Vocaburn**, cổng quy định **5090**, thuật toán **FSRS v6**, và hướng dẫn khởi chạy standalone `python run_vocaburn.py`.
- **Hợp nhất Thư mục Tài liệu (Single Source of Truth)**:
  - Loại bỏ hoàn toàn thư mục dư thừa `.docs/`.
  - Quy tụ toàn bộ tài liệu kỹ thuật dự án vào thư mục duy nhất `docs/`.
