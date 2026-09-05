# 📝 Nhật ký Chỉnh sửa Vocaburn (Changelog)

Tài liệu này lưu lại lịch sử thay đổi cấu trúc, tính năng, và các bản vá lỗi của dự án Vocaburn.

### [2026-09-06]
#### Tái Cấu Trúc Giao Diện Cài Đặt Phân Tầng Tab Đa Năng & Thanh Sub-Tab Neo Đáy Di Động (Settings Mobile-First Tab Architecture)
- **Giải Quyết Triệt Để Vấn Đề Cuộn Trang Dài Vô Tận Trên Di Động (Rule 6: Mobile-First App-Like UI)**:
  - Loại bỏ hoàn toàn mô hình 1 trang cuộn dọc vô tận ("dài cả mét") chứa dồn dập toàn bộ cài đặt thuật toán, cử chỉ, telegram, thông báo, giao diện và bảo mật.
  - Phân chia có hệ thống thành 4 tab chuyên biệt với độ tập trung cao:
    - **Tab 1: Gestures (`Move`)**: Flashcard Gestures & Interaction (Cấu hình lật thẻ, nấc đánh giá FSRS, bảng chỉ dẫn cử chỉ la bàn 4 hướng).
    - **Tab 2: Algorithm (`Brain`)**: Learning Algorithm (Orderly Progression, Expansion Mode, Mastery Cycle, Neural Entropy).
    - **Tab 3: Alerts (`Send`)**: Telegram Bot Integration & Browser Web Push Notifications.
    - **Tab 4: General (`ShieldCheck`)**: System Preferences (Dark Matrix Mode, Focus Timer) & Account Security (SSO CentralAuth / Đổi mật khẩu).
- **Thanh Sub-Tab Neo Đáy 1 Tay Cực Kỳ Tiện Lợi Trên Di Động (`One-Hand Bottom Docked Sub-Tab Bar`)**:
  - Neo cố định ngay phía trên thanh điều hướng chính (`Home | Decks | Stats | Settings`), chuẩn công thái học ngón tay cái giúp chuyển đổi giữa các tab cài đặt tức thì chỉ bằng 1 chạm mà không cần phải cuộn lên xuống.
  - Hiệu ứng chuyển động con nhộng (`motion.div layoutId="activeSettingsBottomTabPill"`) mượt mà chuẩn native app.
- **Thanh Chuyển Tab Phân Đoạn Hiện Đại Trên Máy Tính (`Desktop Segmented Switcher`)**:
  - Trên màn hình lớn (desktop), thanh tab tự động biến thành bộ chuyển phân đoạn thanh lịch ngay cạnh tiêu đề trang.
- **Khung Chứa Nội Dung Khép Kín (`Contained Flex Scrollable Viewport`)**:
  - Giới hạn chiều cao vừa khít khung nhìn di động (`fixed inset-0 top-0 bottom-[68px]`), cuộn mượt mà độc lập trong từng tab, hoàn toàn triệt tiêu hiện tượng tràn cuộn toàn trang.

#### Hệ Thống Tùy Biến Thao Tác Lật Thẻ & Cử Chỉ Đánh Giá FSRS La Bàn 4 Hướng (Card Flip & 4-Way Compass Rating Gestures)
- **Tùy Biến Thao Tác Lật Thẻ (`card_flip_trigger`)**:
  - `both` (Mặc định - Tap & Swipe): Chạm vào bất kỳ vị trí nào trên thẻ mặt trước HOẶC vuốt ngang để lật thẻ (kèm phím Space / nút "FLIP CARD").
  - `tap` (Tap to Flip): Chạm vào thẻ để lật, vô hiệu hóa cử chỉ vuốt tránh lật nhầm khi cuộn trang.
  - `button_only` (Button & Space Only): Chỉ lật thẻ khi bấm nút "FLIP CARD" ở thanh điều khiển hoặc phím Space. Không lật khi chạm/vuốt trên thẻ, giúp người học dễ dàng bôi đen, chọn hoặc tra cứu từ vựng trên thẻ mà không bị gián đoạn.
- **Hệ Thống Đánh Giá FSRS Đa Năng (`card_rating_mode`)**:
  - `both` (Mặc định - Hybrid): Kích hoạt song song cả 4 nút FSRS truyền thống và cử chỉ vuốt 4 hướng la bàn (4-Way Compass Swipe).
  - `swipe_4way` (4-Way Compass Gesture): Đánh giá 100% bằng cử chỉ vuốt 4 hướng chuẩn công thái học:
    - **Vuốt Trái (←)**: 🔴 **Again** (Học lại, Grade 1)
    - **Vuốt Xuống (↓)**: 🟡 **Hard** (Khó nhớ, Grade 2)
    - **Vuốt Phải (→)**: 🔵 **Good** (Nhớ tốt, Grade 3)
    - **Vuốt Lên (↑)**: 🟢 **Easy** (Dễ nhớ, Grade 4)
    - Thanh điều khiển dưới đáy chuyển thành thanh chỉ dẫn la bàn tối giản, hiển thị các mũi tên định hướng và thời gian giãn cách FSRS thực tế (`1m`, `5m`, `10m`, `4d`).
  - `swipe_2way` (2-Way Horizontal Swipe): Cử chỉ vuốt 2 hướng kinh điển (Trái = Again 🔴, Phải = Good 🔵).
  - `buttons` (Buttons Only): Giữ nguyên 4 nút bấm FSRS cố định, vô hiệu hóa cử chỉ vuốt thẻ.
- **Hiệu Ứng Micro-Interactions & Con Dấu Đánh Giá Động (Dynamic Stamp Badges)**:
  - Tích hợp con dấu đánh giá nổi sống động (`AGAIN`, `HARD`, `GOOD`, `EASY`) xuất hiện ngay trên mặt thẻ khi kéo, xoay nghiêng tự nhiên theo lực quán tính (`-12deg`, `+12deg`) và tăng dần độ đậm nét theo quãng đường kéo.
  - Viền và bóng đổ thẻ tự động phát sáng tương ứng với màu trạng thái mục tiêu (Đỏ, Vàng, Xanh dương, Xanh ngọc).
  - Hoạt cảnh bay thẻ (`Fly-out Animation`) cực mượt khi vượt ngưỡng kéo 65px hoặc vận tốc vẩy tay > 400px/s; tự động bật nảy đàn hồi (`rubber-band spring back`) về tâm khi kéo chưa đủ ngưỡng.
  - Xử lý chuẩn xác không gian 3D: Đặt `motion.div` bao bọc bên ngoài container `preserve-3d`, giải quyết triệt để lỗi đảo ngược trục tọa độ X (`rotateY(180deg)`) vốn có của hiệu ứng lật thẻ CSS 3D.
- **Lưu Trữ Đồng Bộ Database & Phân Cấp Cài Đặt Chuẩn Rule 4 (No LocalStorage)**:
  - Tạo Alembic migration `e1f2a3b4c5d6_add_card_flip_and_rating_settings.py` bổ sung 2 cột `card_flip_trigger` và `card_rating_mode` vào bảng `user_global_settings`.
  - Đồng bộ toàn diện qua Zustand store `useSettingsStore` và endpoint `/api/v1/user/settings`.
  - Hỗ trợ ghi đè cài đặt riêng biệt cho từng bộ thẻ (`DeckPersonalSettings` & `usePlaySettings` `user_deck_settings.study_overrides`).
  - Trang Cài đặt tài khoản (`Settings.tsx`) bổ sung khu vực **Flashcard Gestures & Interaction** kèm bộ mô phỏng cử chỉ la bàn 4 hướng tương tác sinh động (Interactive 4-Way Compass Visualizer) chuẩn tiếng Anh 100% theo Rule 7.

### [2026-09-05]
#### Kiến Trúc Workbook Đa Sheet Trực Quan Cho Excel Import & Export (Multi-Sheet Workbook Architecture)
- **Tách Biệt Dữ Liệu & Cấu Hình Thành 6 Sheet Chuyên Biệt (`excel_service.py`)**:
  - Loại bỏ hoàn toàn việc nhồi nhét mã JSON thô vào một ô duy nhất trong sheet `Info` (`ai_prompts`, `audio_pairs`, `mcq_active_pairs`, `typing_active_pairs`, `collaborators`, `practice_settings`).
  - Chuyển đổi toàn diện sang mô hình bảng tính đa sheet chuẩn văn phòng:
    - **Sheet `Info`** (Indigo `#4F46E5`): Chứa metadata cơ bản (tiêu đề, mô tả, danh mục, nhãn, ảnh bìa, cài đặt học mặc định `study_*`, danh sách cột tùy chỉnh `custom_columns`, cột mẹo ghi nhớ `insight_columns`). 100% sạch mã JSON thô.
    - **Sheet `Data`** (Emerald `#059669`): Bảng dữ liệu thẻ flashcard với các cột lõi và toàn bộ các cột tùy chỉnh phong phú (`pos`, `cách đọc`, `hán việt`, `câu ví dụ`, `english`, v.v.).
    - **Sheet `Practice`** (Blue `#2563EB`): Bảng cấu hình từng dòng cho trắc nghiệm (MCQ), luyện gõ từ (Typing) và luyện nghe (Listening) gồm các cột: `Mode`, `Question_Column`, `Answer_Column`, `Num_Choices`, `Enabled`, `Description`. Riêng chế độ Typing hỗ trợ danh sách nhiều cột đáp án chấp nhận được bằng cách phân tách dấu phẩy (ví dụ: `front, từ vựng, cách đọc, english`).
    - **Sheet `AI_Prompts`** (Amber `#D97706`): Bảng cấu hình prompt AI cho từng cột mục tiêu (`Column_Target`, `Button_Title`, `Prompt_Template`), cho phép người dùng viết câu lệnh nhiều dòng tự nhiên mà không cần bọc chuỗi JSON hay escape dấu nháy.
    - **Sheet `Audio`** (Teal `#0D9488`): Bảng cấu hình Text-to-Speech đa ngôn ngữ (`Config_Name`, `Source_Text_Column`, `Target_Audio_URL_Column`, `Language_Or_Voice`, `Speech_Rate`, `Enabled`).
    - **Sheet `Collaborators`** (Slate `#475569`): Bảng quản lý cộng tác viên theo hàng ngang (`Username_Or_Email`, `Role`).
- **Tương Thích Ngược 100% Cho Mọi File Excel Cũ (`parse_deck_excel`)**:
  - Bộ bóc tách thông minh kiểm tra sự hiện diện của các sheet chuyên biệt (`Practice`, `AI_Prompts`, `Audio`, `Collaborators`). Nếu tìm thấy, ưu tiên sử dụng cấu hình từ các sheet này.
  - Nếu người dùng tải lên file Excel 1 hoặc 2 sheet kiểu cũ, hệ thống tự động fallback đọc từ chuỗi JSON hoặc cặp chuỗi trong sheet `Info` mà không làm gián đoạn quy trình import.
- **Tạo Mẫu Excel Tải Xuống Chuẩn N2 Nhật Ngữ Mới (`generate_template_excel`)**:
  - File mẫu được sinh ra trực tiếp dưới định dạng 6 sheet với đầy đủ định dạng OpenPyXL chuyên nghiệp: tiêu đề màu sắc theo từng chủ đề, viền mỏng tinh tế, độ rộng cột tự căn chỉnh, hỗ trợ ngắt dòng (wrap text) cho prompt.
  - Tích hợp bộ từ vựng JLPT N2 thực tế kèm Kanji, cách đọc, âm Hán Việt, ví dụ câu, mẹo nhớ cách đọc và mẫu prompt AI phân tích chiết tự Hán tự chi tiết.

#### Nâng Cấp Toàn Diện Hệ Thống Excel Import & Export: Khắc Phục Lỗi Ánh Xạ Media, Bổ Sung Chế Độ Merge / Replace & Modal Xác Nhận Trực Quan
- **Sửa Lỗi Ánh Xạ Thuộc Tính Media & Audio Khi Cập Nhật Qua Excel (`features.py`)**:
  - Khắc phục lỗi `others.pop(...)` trả về `None` do các trường `front_audio_content`, `back_audio_content`, `front_audio_url`, `back_audio_url`, `front_img`, `back_img` đã được tách ra ở cấp root của object card. Giờ đây hệ thống ưu tiên đọc trực tiếp từ `c_data.get(...)`, bảo toàn trọn vẹn toàn bộ link audio và ảnh minh họa khi người dùng cập nhật thẻ qua file Excel.
  - Xử lý ép kiểu an toàn cho trường ID (`int(float(str(raw_id).strip()))`), sửa triệt để lỗi so sánh chuỗi với số nguyên (`str` vs `int`) khiến hệ thống không nhận diện được thẻ đã có sẵn trong cơ sở dữ liệu.
- **Hiện Thực Hóa Tham Số `mode` Cho Import Update (`merge` vs `replace`)**:
  - `mode == "merge"`: Giữ nguyên các thẻ hiện có trong bộ thẻ, cập nhật các thẻ trùng ID và thêm mới các thẻ chưa có ID.
  - `mode == "replace"`: Đồng bộ chính xác 1:1 theo file Excel. Tự động xóa sạch các thẻ trong cơ sở dữ liệu không còn xuất hiện trong file Excel (đồng thời dọn dẹp các bảng con `UserCardMastery`, `UserPracticeStats`, `UserCardNote`, `UserAnswer` an toàn).
  - Trả về số liệu thống kê chi tiết trong response: `updated_count`, `added_count`, `deleted_count`, `total_cards`.
- **Lọc Sạch Mã Lỗi Công Thức Excel & Chuẩn Hóa Dữ Liệu Số (`excel_service.py`)**:
  - Tự động phát hiện và loại bỏ các mã lỗi tính toán công thức Excel phổ biến (`#REF!`, `#VALUE!`, `#N/A!`, `#N/A`, `#DIV/0!`, `#NAME?`, `#NUM!`, `#NULL!`, `#SPILL!`, `#CALC!`), tránh gây ô nhiễm dữ liệu từ vựng.
  - Chuẩn hóa số nguyên, ngăn chặn hiện tượng số/mã bị chuyển thành số thập phân (như `1.0` thành `"1"`).
- **Thêm Modal Phân Tích & Xác Nhận Diff Trước Khi Cập Nhật Thẻ (`DeckExcelManager.tsx`)**:
  - Khi người dùng tải file lên, hệ thống gọi trước API `/{deck_id}/import-analyze` và mở Modal xem trước:
    - Hiển thị trực quan số lượng thẻ mới sẽ thêm (`+New Cards`), số thẻ sẽ cập nhật (`Matched Cards`), và số thẻ sẽ xóa (`Missing Cards`).
    - Cho phép chọn chế độ đồng bộ ngay trên giao diện: **Merge (Safe)** hoặc **Replace (Exact Sync)** với giải thích rõ ràng trước khi bấm **Apply Changes**.
- **Chuẩn Hóa 100% Giao Diện Sang Tiếng Anh Theo Rule 7 (`DeckExcelManager.tsx`, `ImportFlashcard.tsx`)**:
  - Chuyển toàn bộ các nhãn, placeholder, mô tả và thông báo từ tiếng Việt sang chuẩn tiếng Anh chuyên nghiệp trên cả trang Import độc lập lẫn component quản lý Excel trong Deck Settings.

#### Khắc Phục Lỗi FSRS Bị Dừng Sau 1 Thẻ: Cho Phép Tiếp Tục Học Từ Mới
- **Sửa Điều Kiện Ưu Tiên Thẻ Tiếp Theo Trong Chế Độ FSRS (`app/modules/deck/routes/play.py`)**:
  - Khắc phục lỗi điều kiện `len(all_learned_cards) == 0` khiến hệ thống dừng phiên học FSRS ngay lập tức sau khi người dùng đánh giá thẻ đầu tiên (do số thẻ đã học tăng lên 1 và thẻ đó chưa đến hạn ôn tập trong 4-10 phút tiếp theo).
  - Tách bạch rõ ràng logic giữa các chế độ:
    - **Chế độ Ôn tập FSRS (`fsrs_review`, hoặc chặng ôn tập trong Roadmap)**: Giữ nguyên tắc chỉ ôn thẻ đến hạn (`due <= now`), không tự ý nạp từ mới. Khi hết thẻ đến hạn sẽ hoàn thành chặng.
    - **Chế độ FSRS Tự Do (`fsrs`)**: Sau khi ôn xong các thẻ đến hạn, hệ thống tiếp tục nạp các thẻ mới còn lại trong bộ thẻ (`all_new_cards`) để người học tiếp tục tiến trình cho đến khi hoàn thành toàn bộ thẻ của bộ.
    - **Màn hình Hoàn thành FSRS (`FsrsCompleteScreen`)**: Chỉ kích hoạt khi bộ thẻ **thực sự đã học hết từ mới** VÀ **không còn thẻ nào đến hạn ôn tập**, hiển thị thời gian đếm ngược chính xác đến thẻ sắp đến hạn tiếp theo.

#### Tối Ưu Hóa Giao Diện Di Động Cho Chế Độ Typing (Gõ Từ Vựng): Thu Gọn Thành 1 Hàng Duy Nhất
- **Di Chuyển Ô Nhập Liệu Xuống Thanh Điều Khiển Dưới Cùng (`PracticeBottomBar.tsx`, `PracticeTypingCard.tsx`, `PracticePlay.tsx`)**:
  - Loại bỏ hoàn toàn thanh tab điều hướng di động (`MAP | PLAY | STATS`) riêng biệt trong chế độ gõ từ (`baseMode === 'typing'`).
  - Đưa khung nhập từ vựng (`input`) từ thân card xuống vị trí của thanh action bar dưới cùng (`PracticeBottomBar.tsx`), khắc phục triệt để hiện tượng bàn phím ảo đẩy card câu hỏi lên quá cao trên màn hình điện thoại.
  - Bố cục 1 hàng duy nhất (`Single-row docked bottom bar`):
    - **Bên trái**: Nút Option / Cài đặt (`⚙️`) gọn gàng.
    - **Ở giữa**: Ô nhập liệu từ vựng (`flex-1`) tự động lấy nét (`autoFocus` và tự động focus lại khi chuyển câu hỏi mới).
    - **Bên phải**: Nút **Kiểm tra** nhỏ gọn, tự động sáng màu khi có văn bản và hỗ trợ phím **Enter** gửi đáp án ngay lập tức.
    - **Loại bỏ hoàn toàn nút Skip**: Không cho phép bỏ qua câu hỏi trong chế độ typing.
  - **Trạng thái sau khi nộp đáp án**: Khối phản hồi (Feedback) hiển thị rõ ràng trên thân card; thanh điều khiển dưới đáy chuyển thành nút **Tiếp tục (Continue)** chiếm toàn bộ không gian kèm nút nghe phát âm âm thanh (Audio).
  - **Bảo Toàn 100% Các Chế Độ Luyện Tập Khác**: Các chế độ trắc nghiệm (`mcq`), nghe (`listening`), lật thẻ (`flip`), thi thử lộ trình (`roadmap_test`) hoàn toàn giữ nguyên thanh điều khiển cũ, nút skip và 3 tab chân trang (`MAP | PLAY | STATS`).

---

### [2026-09-03]
#### Tối Ưu Toàn Diện Giao Diện Desktop: Loại Bỏ Cuộn Tràn Viền & Mở Rộng Kích Thước Full-Width
- **Khắc Phục Hoàn Toàn Lỗi Cuộn Cả Cửa Sổ Trên Desktop (`Layout.tsx`, `DecksPage.tsx`, `Stats.tsx`, `DeckDetailPage.tsx`)**:
  - Sửa lỗi chiều cao cửa sổ bị cộng dồn (`pt-[60px]` + `min-h-screen` = 100vh + 60px) gây ra thanh cuộn dọc không đáng có ở toàn bộ window và làm các thanh công cụ dưới đáy (Pagination, Search, New Deck, Tabs) bị đẩy xuống khuất tầm nhìn.
  - Thiết lập Layout desktop chuẩn native app: cố định chiều cao màn hình `md:h-screen md:w-screen md:overflow-hidden`, phần nội dung thẻ/bảng bên trong tự động co giãn (`flex-1 min-h-0 overflow-y-auto`) và các thanh công cụ hành động luôn ghim nổi ở chân trang một cách gọn gàng, 100% không bị che khuất.
  - **Giữ nguyên 100% giao diện mobile**: Các thuộc tính màn hình điện thoại (`fixed inset-0 top-0 bottom-[68px]`, mobile bottom bar) được bảo toàn nguyên vẹn, không bị ảnh hưởng.
- **Mở Rộng Kích Thước Ngang Full-Size Trên Desktop (Loại bỏ giới hạn `max-w-5xl`)**:
  - Chuyển đổi các khối chứa hẹp (1024px) sang chuẩn màn ảnh rộng `w-full max-w-[1700px] 2xl:max-w-[1900px] px-4 sm:px-6 lg:px-8 xl:px-10` trên tất cả các trang:
    - **Kho bộ thẻ (`DecksPage.tsx`)**: Chuyển lưới từ 2 cột (`grid-cols-2`) thành lưới đáp ứng 4 cột (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4`). 8 bộ thẻ trên trang giờ đây hiển thị trọn vẹn trong 2 hàng ngang cân đối, lấp đầy không gian màn hình lớn mà không cần phải cuộn chuột.
    - **Thống kê & Xếp hạng (`Stats.tsx`, `LeaderboardTab.tsx`, `PersonalStatsTab.tsx`, `GlobalStatsTab.tsx`)**: Bảng xếp hạng từ hạng 4 đến 50 tự động chia 2 cột đối xứng trên desktop (`grid-cols-1 xl:grid-cols-2`), tối ưu hóa toàn bộ diện tích hiển thị.
    - **Chi tiết bộ thẻ (`DeckDetailPage.tsx`, `DeckCardsTab.tsx`, `DeckRoadmapTab.tsx`, `DeckOverviewTab.tsx`, `DeckSettingsTab.tsx`)**: Mở rộng toàn bộ chiều ngang hiển thị bảng thẻ từ, lộ trình và cài đặt.
    - **Bảng điều khiển & Cài đặt (`Dashboard.tsx`, `Settings.tsx`, `Landing.tsx`)**: Mở rộng thanh điều hướng và bố cục biểu đồ theo độ rộng màn hình.

#### Nâng Cấp Bảng Xếp Hạng: Thời Gian Học (Study Time) & Trạng Thái Hoạt Động (Active / Away / Offline)
- **Thay Thế Accuracy Bằng Bảng Xếp Hạng Thời Gian Học (`LeaderboardTab.tsx`, `Stats.tsx`, `analytics_service.py`)**:
  - Loại bỏ chỉ số `Accuracy` trên bộ lọc danh mục của Leaderboard và thay thế bằng **`Time` (Thời gian học)**.
  - Backend tính toán tổng thời gian học tập (`total_time_seconds`) từ bảng `user_daily_stats` tương ứng với từng mốc thời gian: *Hôm nay (Today)*, *Tuần này (Week)*, *Tháng này (Month)* và *Mọi lúc (All Time)*.
  - Tự động định dạng thời gian trực quan, thẩm mỹ: `< 60s` hiện số giây (`45s`), `< 60m` hiện số phút (`35m`), `> 1h` hiện giờ và phút (`2h 15m`).
- **Hiển Thị Trạng Thái Hoạt Động Của Người Dùng (Real-time Presence Status Indicator)**:
  - Bổ sung `PresenceTracker` (`app/core/presence.py`) ghi nhận thời điểm hoạt động gần nhất của từng người dùng qua middleware xác thực và dữ liệu hoạt động trong database.
  - Phân cấp 3 trạng thái rõ ràng:
    - 🟢 **Active now / Đang hoạt động (Xanh lá)**: Hoạt động trong vòng 5 phút trở lại (có hiệu ứng vòng hào quang `animate-ping` tinh tế trên avatar).
    - 🟡 **Away / Vừa mới active (Vàng/Cam)**: Không tương tác trong khoảng 5 - 30 phút (kèm thông tin thời gian như `12m ago`).
    - ⚪ **Offline (Xám nhạt)**: Hiển thị chính xác khoảng cách thời gian từ lần active gần nhất cho tất cả các tài khoản (ví dụ: `2h ago`, `3d ago`, `1mo ago`), kết hợp `func.coalesce(UserGamification.last_activity, User.created_at)` đảm bảo 100% tài khoản đều có mốc thời gian rõ ràng.
  - Hiển thị đồng bộ khoảng cách active trên cả bục vinh danh Top 3 (Podium) và danh sách xếp hạng thành viên từ #4 đến #50 (ngay cạnh Level của tài khoản: `Lv.X • 3h ago`).
  - Tương thích hoàn toàn với widget Bảng xếp hạng mini trong chế độ học flashcard (`FlashcardPlay.tsx`).

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
