# 🏁 Hướng dẫn Khởi đầu Dành Cho AI & Lập Trình Viên (Vocaburn AI Onboarding Guide)

> **DÀNH CHO AI AGENT (Cursor, Windsurf, Claude Code, Antigravity, Gemini CLI, Copilot...)**:
> Khi người dùng yêu cầu bạn làm việc với dự án **Vocaburn**, bạn **BẮT BUỘC** phải đọc kỹ các tài liệu và các tệp mã nguồn được chỉ định trong tệp này trước khi đưa ra bất kỳ đề xuất thay đổi hoặc viết code nào.
> Sau khi đọc xong, hãy xác nhận bạn đã hiểu toàn diện kiến trúc hệ thống và sẵn sàng nhận yêu cầu từ người dùng: *"Tôi đã đọc xong tài liệu và cấu trúc code của Vocaburn, tôi đã nắm rõ toàn bộ kiến trúc và các quy tắc vàng. Hãy cho tôi biết bạn muốn làm gì tiếp theo!"*

---

## 🧭 BƯỚC 1: Đọc Kỹ Toàn Bộ Tài Liệu Kỹ Thuật (Single Source of Truth)

Bạn cần đọc các file tài liệu theo đúng thứ tự ưu tiên dưới đây để hiểu từ bức tranh tổng thể của Ecosystem đến chi tiết từng module của Vocaburn:

### 1.1. Quy chuẩn chung Toàn Ecosystem (Bắt buộc đọc trước)
1. **[`.agents/AGENTS.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/.agents/AGENTS.md)**: 10 điều răn tối cao của Ecosystem (Zero localStorage, English-only UI, Smart Granular Deployment, Alembic migrations, Thumb-reachability).
2. **[`docs/README.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/docs/README.md)**: Tổng quan các ứng dụng vệ tinh (Vocaburn, CentralAuth, TimeHack, RemiNote), cổng dịch vụ và kiến trúc SSO.
3. **[`docs/DEVELOPMENT_AND_DEPLOYMENT_RULES.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/docs/DEVELOPMENT_AND_DEPLOYMENT_RULES.md)**: Quy tắc deploy VPS, kiểm tra type safety và quản trị DB bằng Alembic.
4. **[`docs/UI_UX_MOBILE_FIRST_STANDARDS.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/docs/UI_UX_MOBILE_FIRST_STANDARDS.md)**: Tiêu chuẩn thiết kế Mobile-First, vùng ngón cái (thumb-reachability), khóa chiều cao `h-[100dvh]` không cuộn trình duyệt thừa.
5. **[`docs/FRONTEND_WHITE_SCREEN_PREVENTION.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/docs/FRONTEND_WHITE_SCREEN_PREVENTION.md)**: Phòng chống lỗi màn hình trắng, ErrorBoundary và Type check.

### 1.2. Tài liệu Chuyên sâu Vocaburn (Trong `Vocaburn/docs/`)
1. **[`Vocaburn/docs/README.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/README.md)**: Trung tâm điều phối tài liệu Vocaburn.
2. **[`Vocaburn/docs/01_architecture/MODULE_STRUCTURE.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/01_architecture/MODULE_STRUCTURE.md)**: Cấu trúc Modular Monolith của 8 modules backend và 15+ màn hình frontend.
3. **[`Vocaburn/docs/01_architecture/DATABASE_STRUCTURE.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/01_architecture/DATABASE_STRUCTURE.md)**: Thiết kế 24 bảng CSDL SQLAlchemy, schema thuật toán FSRS v6 và bảng cài đặt `user_global_settings`.
4. **[`Vocaburn/docs/01_architecture/ECOSYSTEM_INTEGRATION.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/01_architecture/ECOSYSTEM_INTEGRATION.md)**: SSO CentralAuth, Handshake API dynamic discovery và Admin Backdoor (`?backdoor=1`).
5. **[`Vocaburn/docs/03_features_and_ui/FLASHCARD_AND_PRACTICE_MODES.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/03_features_and_ui/FLASHCARD_AND_PRACTICE_MODES.md)**:
   - **4 Chế độ Flashcard**: FSRS v6 chuẩn, Continuous Review (vòng lặp vô tận chỉ thẻ đã học), Learn New Words (chỉ thẻ mới tinh), Speed Skim (đọc lướt nhanh).
   - **4 Bài luyện Practice**: 4-Choice Quiz, Spelling Recall, Audio Dictation, Roadmap Daily Test.
   - **Cử chỉ & Giao diện**: Vuốt chuyển thẻ (Next) / hoàn tác (Undo) ở cả 2 mặt thẻ, thanh 2 nút cố định đáy Deck Detail, modal sheets tràn viền `createPortal`.
6. **[`Vocaburn/docs/03_features_and_ui/DASHBOARD_AND_DAILY_HUB.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/03_features_and_ui/DASHBOARD_AND_DAILY_HUB.md)**:
   - Bố cục 2-tab Home (`Roadmap` | `Learning`), phân tách độc lập 2 trục cử chỉ (lướt dọc snap-scroll vs vuốt ngang đổi tab).
   - Ngăn kéo thông minh Daily Activity Drawer trượt đáy qua `createPortal` và API phân tích nhịp độ 24h (`/api/v1/stats/daily-summary`).
7. **[`Vocaburn/docs/03_features_and_ui/STUDY_HEADER_TRACKER.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/03_features_and_ui/STUDY_HEADER_TRACKER.md)**: Thanh điều hướng Live HUD 3D flip bar và dải sáng động lực Power Surge.
8. **[`Vocaburn/docs/04_development_and_ops/DEVELOPMENT_RULES.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/04_development_and_ops/DEVELOPMENT_RULES.md)**: Quy tắc Planning Mode, thư mục tạm `scratch/`, tuyệt đối không dùng localStorage, quy trình deploy VPS.
9. **[`Vocaburn/docs/04_development_and_ops/FRONTEND_GUIDE.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/04_development_and_ops/FRONTEND_GUIDE.md)**: React 19 + Tailwind v4 + Zustand store, Type Safety checklist và bản vá Safari/WebKit regex lookbehind trong `build_vite.py`.
10. **[`Vocaburn/docs/02_api_reference/API_REFERENCE.md`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/02_api_reference/API_REFERENCE.md)**: Danh mục toàn bộ REST API endpoints (`/api/v1/...`).

---

## 💻 BƯỚC 2: Đọc & Rà Soát Các Tệp Mã Nguồn Trọng Yếu

Sau khi đọc tài liệu, bạn cần mở và đọc các file code cốt lõi để hiểu cách hệ thống đang vận hành thực tế:

### 2.1. Frontend Code (`Vocaburn/client/src/`)
| Tệp mã nguồn | Nội dung cần nắm |
| :--- | :--- |
| **`App.tsx`** | Định tuyến Router, `ErrorBoundary`, theme provider, root container khóa chiều cao `h-[100dvh] overflow-hidden`. |
| **`store/useAppStore.ts`** | Zustand store toàn cục. Quản lý user settings đồng bộ backend (KHÔNG dùng localStorage), trạng thái âm thanh, theme, study modes. |
| **`pages/home/HomePage.tsx`** | Màn hình chính với 2 tab `Roadmap` vs `Learning`, container snap-scroll dọc và bộ lắng nghe cử chỉ vuốt ngang chuyển tab độc lập. |
| **`components/dashboard/DashboardDailyDrawer.tsx`** | Component ngăn kéo thống kê hoạt động trong ngày, mount ra `document.body` bằng `createPortal`, hiệu ứng kéo vuốt xuống để đóng. |
| **`pages/deck/DeckDetailPage.tsx`** | Chi tiết bộ thẻ với 2 nút học cố định sát đáy (`Flashcards` & `Practice`), modal sheets chọn chế độ học bằng `createPortal`, nhật ký luyện tập gần đây. |
| **`pages/flashcard/FlashcardPlayerPage.tsx`** | Trình phát Flashcard cốt lõi xử lý 4 chế độ (FSRS, Continuous, Learn New, Speed Skim), cử chỉ vuốt next/undo cả 2 mặt thẻ, Quick Controls bar. |
| **`components/study/StudyHeaderTracker.tsx`** | Thanh HUD trên cùng hỗ trợ lật 3D xem thống kê chi tiết và hiệu ứng hào quang Power Surge. |

### 2.2. Backend Code (`Vocaburn/app/`)
| Tệp mã nguồn | Nội dung cần nắm |
| :--- | :--- |
| **`main.py`** | Khởi tạo ứng dụng FastAPI, cấu hình CORS, static files, middleware và nạp routers. |
| **`database.py`** | Cấu hình SQLAlchemy `AsyncSession`, SQLite WAL mode, engine kết nối cơ sở dữ liệu. |
| **`modules/deck/services/deck_service.py`** | Nghiệp vụ thẻ, tính toán FSRS v6, truy vấn thẻ đến hạn ôn (due cards), thẻ mới tinh (new cards), lộ trình Roadmap. |
| **`modules/deck/routes/deck_routes.py`** | REST endpoints xử lý lấy dữ liệu học `/api/v1/deck/{deck_id}/fsrs-play-data`, nộp điểm FSRS `/grade-fsrs`. |
| **`modules/stats/services/analytics_service.py`** | Dịch vụ tổng hợp số liệu học tập trong ngày theo múi giờ client cho Daily Activity Hub. |
| **`modules/auth/` & `modules/sso_module/`** | Cơ chế xác thực JWT SSO CentralAuth và dynamic handshake. |

---

## 🛡️ BƯỚC 3: Ghi Nhớ 10 Điều Răn Vàng (Non-Negotiable Golden Rules)

Bất kỳ dòng code nào bạn viết ra đều **BẮT BUỘC** phải tuân thủ 10 quy tắc sau:

1. 🚫 **Strict "Zero localStorage"**:
   - Tuyệt đối **KHÔNG** dùng `localStorage` hay `sessionStorage` để lưu settings, theme, chế độ học hay âm thanh.
   - Mọi cài đặt người dùng đều được lưu ở bảng `user_global_settings` trên DB qua `/api/v1/user/settings` và đồng bộ qua `useAppStore.ts`.
2. 🌐 **Giao diện 100% Tiếng Anh (English-Only UI)**:
   - Tất cả nhãn hiển thị, nút bấm, placeholder, thông báo toast, modal title đều phải là tiếng Anh.
3. 📱 **Mobile-First & Vùng Ngón Cái (Thumb Reachability)**:
   - Nút hành động chính (CTA, Start Study, Next, Grade...) và bộ chuyển tab điều hướng **phải nằm ở đáy màn hình**, vừa tầm ngón cái khi cầm điện thoại 1 tay.
   - App shell luôn khóa `h-[100dvh] overflow-hidden`. Không để thanh cuộn trình duyệt ngoài cùng bị cuộn thừa thãi.
4. 🎴 **Modal & Bottom Sheet Tràn Viền 100% bằng `createPortal`**:
   - Tất cả bottom action sheets và popup phải mount trực tiếp ra `document.body` qua `createPortal` và dùng `fixed inset-x-0 bottom-0 z-[280+]` để không bị thụt lề 2 bên và không bị kẹt CSS `transform`.
5. 🔄 **Phân Tách Cử Chỉ 2 Trục Độc Lập**:
   - Trục dọc (lướt lên/xuống) dành riêng cho cuộn danh sách thẻ/roadmap.
   - Trục ngang (vuốt trái/phải) dành riêng cho chuyển tab. Tuyệt đối không để lướt dọc bị nhầm thành chuyển tab.
6. 🛡️ **Bắt Buộc Type Check Trước Khi Deploy**:
   - Trước khi deploy hay báo hoàn thành, phải chạy lệnh kiểm tra type safety:
     `cmd /c npx.cmd tsc -p tsconfig.app.json --noEmit`
   - Tuyệt đối không để sót biến chưa khai báo hoặc sai kiểu dữ liệu TypeScript.
7. 🍏 **Tương Thích Trình Duyệt WebKit / iOS Safari**:
   - WebKit cũ trên iOS sẽ bị crash trắng màn hình nếu gặp Regex Positive Lookbehind `(?<=...)`. Toàn bộ regex phải dùng non-capturing group `(?:...)` hoặc chạy qua bộ lọc `fix_lookbehinds` trong `build_vite.py`.
8. 🚫 **Không Chạy `npm run build` Trực Tiếp Trong Lượt Chat**:
   - AI không được tự ý gõ `npm run build` vì tốn tài nguyên và dễ timeout. Script deploy tự động gọi `build_vite.py`.
9. 🚀 **Chiến Lược Deploy Phân Tầng Thông Minh (Smart Deploy)**:
   - Thay đổi Frontend (TSX/CSS): Dùng lệnh deploy siêu tốc `remote_update_vocaburn.py --fast` (2 giây, không restart service).
   - Thay đổi Backend: Dùng `remote_update_vocaburn.py` (tự động restart systemd và hiển thị log).
10. 🗄️ **Di Cư Cơ Sở Dữ Liệu Duy Nhất Bằng Alembic**:
    - Không chạy script SQL trực tiếp để sửa cấu trúc DB trên production. Mọi thay đổi bảng phải tạo file version trong `alembic/versions/`.

---

## ⚡ BƯỚC 4: Các Lệnh Vận Hành Chuẩn Trên Windows

Khi bạn cần kiểm tra code hoặc deploy lên máy chủ VPS, sử dụng các lệnh chuẩn sau (dùng PowerShell):

```powershell
# 1. Kiểm tra 100% Type Safety Frontend:
cmd /c npx.cmd tsc -p tsconfig.app.json --noEmit

# 2. Deploy Frontend siêu tốc (~2 giây, không ngắt quãng người dùng):
C:\Users\thanh\AppData\Local\Python\bin\python.exe remote_update_vocaburn.py --fast

# 3. Deploy Backend hoặc toàn bộ (Sync code + Restart systemd + Kiểm tra logs):
C:\Users\thanh\AppData\Local\Python\bin\python.exe remote_update_vocaburn.py
```

---

## 🎯 BƯỚC 5: Phản Hồi Khi Khởi Đầu

Khi người dùng mở đầu bằng lệnh yêu cầu đọc `START.md` hoặc yêu cầu làm việc trên Vocaburn, bạn hãy:
1. Xác nhận ngắn gọn: Bạn đã đọc xong các tài liệu trong `Vocaburn/docs/` và `docs/`, đã xem qua các file code cốt lõi, và nắm vững 10 quy tắc vàng.
2. Trình bày sẵn sàng chờ lệnh: Hỏi người dùng muốn thực hiện tính năng, sửa lỗi hay nâng cấp phần nào của Vocaburn để bắt đầu thực thi.
