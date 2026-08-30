# 📚 Trung tâm Tài liệu Kỹ thuật Vocaburn (Documentation Hub)

Chào mừng bạn đến với **Trung tâm Tài liệu Kỹ thuật Duy nhất (Single Source of Truth)** của dự án **Vocaburn**. Toàn bộ tài liệu được phân loại khoa học thành 5 phân nhóm chuyên trách dưới đây:

---

## 🧭 Cây Thư mục & Mục lục Điều hướng

```
docs/
├── 01_architecture/              # 🏗️ Kiến trúc Hệ thống & Cơ sở Dữ liệu
│   ├── MODULE_STRUCTURE.md       # Cấu trúc 8 Modules Backend & Frontend Components
│   ├── DATABASE_STRUCTURE.md     # Cấu trúc 24 Bảng Cơ sở Dữ liệu & Schema FSRS v6
│   └── ECOSYSTEM_INTEGRATION.md  # Tích hợp SSO CentralAuth, Handshake API & Backdoor
│
├── 02_api_reference/             # 📡 Đặc tả REST API
│   └── API_REFERENCE.md          # Danh mục toàn bộ REST API Endpoints chuẩn (/api/v1/...)
│
├── 03_features_and_ui/           # 🎴 Tính năng Nghiệp vụ & Giao diện
│   └── STUDY_HEADER_TRACKER.md   # Hướng dẫn Live HUD Tracker Bar, 3D Flip & Power Surge
│
├── 04_development_and_ops/       # ⚙️ Quy chuẩn Phát triển & Vận hành
│   ├── DEVELOPMENT_RULES.md      # Quy tắc Planning Mode, No-localStorage, Alembic & Deploy
│   └── FRONTEND_GUIDE.md         # Hướng dẫn phát triển React 19, Vite TS & Tailwind v4
│
└── 05_changelog/                 # 📝 Lịch sử Nâng cấp & Bản vá
    └── CHANGELOG.md              # Nhật ký chi tiết các đợt phát triển & cập nhật
```

---

## 📖 Chi tiết Các Nhóm Tài liệu

### 1. 🏗️ [Kiến trúc & Cơ sở Dữ liệu](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/01_architecture/)
* **[MODULE_STRUCTURE.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/01_architecture/MODULE_STRUCTURE.md)**: Chi tiết kiến trúc Modular Monolith của 8 module Backend (`deck`, `auth`, `sso_module`, `gamification`, `stats`, `ai`, `notification`, `admin`) và cấu trúc 15 màn hình React SPA Frontend.
* **[DATABASE_STRUCTURE.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/01_architecture/DATABASE_STRUCTURE.md)**: Đặc tả chi tiết 24 bảng SQLAlchemy models, bao gồm bảng `user_global_settings` (No-localStorage), thuật toán FSRS v6, phòng học nhóm multiplayer và hệ thống Lộ trình bộ thẻ.
* **[ECOSYSTEM_INTEGRATION.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/01_architecture/ECOSYSTEM_INTEGRATION.md)**: Hướng dẫn kết nối Single Sign-On với CentralAuth (port 5000), cơ chế Dynamic DB Discovery Handshake và cổng dự phòng Admin Backdoor (`?backdoor=1`).

---

### 2. 📡 [Đặc tả REST API](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/02_api_reference/)
* **[API_REFERENCE.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/02_api_reference/API_REFERENCE.md)**: Bảng tra cứu toàn diện 100% REST Endpoints dưới tiền tố `/api/v1/`: CRUD bộ thẻ, FSRS play data, chấm điểm FSRS, Lộ trình Roadmap, Audio TTS, bình luận cộng đồng, phòng chơi multiplayer, thống kê và quản trị hệ thống.

---

### 3. 🎴 [Tính năng Nghiệp vụ & Giao diện](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/03_features_and_ui/)
* **[STUDY_HEADER_TRACKER.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/03_features_and_ui/STUDY_HEADER_TRACKER.md)**: Tài liệu chi tiết về thanh điều hướng `StudyHeaderTracker` với hệ thống lật 2 mặt 3D (Dual-Face Flip) và dải sáng động lực Power Surge.

---

### 4. ⚙️ [Quy chuẩn Phát triển & Vận hành](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/04_development_and_ops/)
* **[DEVELOPMENT_RULES.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/04_development_and_ops/DEVELOPMENT_RULES.md)**: Bộ quy tắc bắt buộc cho lập trình viên và AI Coding Agent: quy trình Planning Mode, dọn dẹp thư mục tạm (`scratch/`), tuyệt đối không dùng localStorage, di cư DB qua Alembic và quy định không polling SSH khi deploy VPS.
* **[FRONTEND_GUIDE.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/04_development_and_ops/FRONTEND_GUIDE.md)**: Hướng dẫn phát triển giao diện React 19 + TypeScript + TailwindCSS v4, quản lý state Zustand đồng bộ backend và quy trình đóng gói `build_vite.py`.

---

### 5. 📝 [Nhật ký Chỉnh sửa](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/05_changelog/)
* **[CHANGELOG.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/05_changelog/CHANGELOG.md)**: Ghi nhận lịch sử chi tiết tất cả các phiên bản nâng cấp, tái cấu trúc và các bản vá lỗi của Vocaburn.
