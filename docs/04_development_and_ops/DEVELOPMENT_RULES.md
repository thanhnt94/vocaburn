# 📜 Quy tắc Phát triển Vocaburn (Development Rules)

Tài liệu này định nghĩa các quy tắc kỹ thuật, tiêu chuẩn an toàn và quy trình làm việc bắt buộc dành cho Nhà phát triển và các AI Coding Agent khi xây dựng, sửa lỗi hoặc nâng cấp hệ thống **Vocaburn**.

---

## 1. Tuân thủ Quy trình Planning Mode (Bắt buộc với AI Agent)

Khi tiếp nhận các yêu cầu thay đổi tính năng, sửa lỗi phức tạp hoặc tái cấu trúc:
* **Lập Kế hoạch**: Bắt buộc tạo hoặc cập nhật file `implementation_plan.md` trong thư mục artifact để mô tả rõ ràng giải pháp, các file tác động và kế hoạch nghiệm thu.
* **Phê duyệt**: Phải nhận được sự đồng ý phê duyệt (Approval) từ người dùng trước khi tiến hành viết hoặc sửa đổi mã nguồn.
* **Cập nhật Nghiệm thu**: Sau khi hoàn thành, tạo/cập nhật file `walkthrough.md` tổng kết các điểm đã sửa đổi và lệnh kiểm tra.

---

## 2. Quản lý Thư mục Tạm và Scripts Thử nghiệm (Hygiene Rules)

Nhằm giữ cho thư mục gốc dự án luôn sạch sẽ:
* **Thư mục `tmp/` hoặc `scratch/`**: Tất cả các script thử nghiệm nhanh (hotfix), script dọn dẹp dữ liệu, file kiểm tra hoặc file log tạm thời **BẮT BUỘC** phải nằm trong thư mục `tmp/` hoặc `scratch/` của dự án (hoặc thư mục `scratch/` của Ecosystem).
* **Cấm đặt ở thư mục gốc**: Tuyệt đối không lưu các file tạm như `test_db.py`, `debug_sso.py`, `log_output.txt` tại thư mục gốc `Vocaburn/`.
* **Dọn dẹp**: Tự động dọn dẹp các tệp tạm sau khi hoàn tất kiểm tra.

---

## 3. Kiến trúc Modular Monolith (Hexagonal Style)

Vocaburn tách biệt nghiêm ngặt miền nghiệp vụ giữa 8 module trong `app/modules/`:
* **Models**: Định nghĩa cấu trúc bảng SQLAlchemy tại `models.py`.
* **Schemas**: Định nghĩa Pydantic Schemas tại `schemas.py`.
* **Services**: Chứa Business Logic chính tại `services/` (ví dụ: `deck_service.py`, `excel_service.py`). Mọi tính toán nghiệp vụ phức tạp phải ở Service, không được viết trực tiếp trong Router.
* **Routes**: Định nghĩa API Endpoints tại `routes/` hoặc `routes.py`.
* **Hạn chế Import chéo**: Không import trực tiếp Model/Service chéo giữa các module để tránh vòng lặp phụ thuộc (circular dependency).

---

## 4. Tuyệt đối Không Sử dụng localStorage (No localStorage Directive)

* **Quy chuẩn Bắt buộc**: Tuyệt đối **KHÔNG** sử dụng browser `localStorage` hoặc `sessionStorage` để lưu trữ cài đặt người dùng, tùy chọn giao diện, cờ trạng thái, theme hay chế độ học tập.
* **Đồng bộ Cơ sở Dữ liệu**: Toàn bộ cấu hình người dùng, giao diện (sáng/tối), chế độ học (FSRS/Leitner/Practice), tùy chọn âm thanh (SFX, Haptic, Autoplay) và cờ tiến trình **PHẢI** được lưu trữ trong bảng `user_global_settings` thông qua API `/api/v1/user/settings` và đồng bộ qua Zustand store (`useAppStore.ts`) để đảm bảo trải nghiệm xuyên suốt trên mọi thiết bị.

---

## 5. Thao tác Cơ sở Dữ liệu & Quy tắc Di cư Alembic

* **Sử dụng AsyncSession**: Mọi truy vấn DB phải sử dụng bất đồng bộ `AsyncSession` (`from sqlalchemy.ext.asyncio import AsyncSession`).
* **Giao dịch**: Đảm bảo `await db.commit()` sau khi thay đổi dữ liệu và rollback khi xảy ra exception.
* **SQLite WAL Mode**: Dự án sử dụng SQLite WAL mode. Không tự ý sửa đổi pragma cấu hình trong `app/core/db.py`.
* **Di cư Schema qua Alembic Duy nhất**: **KHÔNG BAO GIỜ** tạo ad-hoc python script sửa DB trực tiếp hay chèn câu lệnh SQL thô vào script deploy. Mọi thay đổi schema bảng bắt buộc phải tạo migration file qua Alembic trong `migrations/versions/` hoặc `alembic/versions/`.

---

## 6. Đóng gói Frontend & Triển khai VPS (Remote Deployment Rules)

* **Cổng Hoạt động Quy định**: **5090** (Backend FastAPI + Phục vụ Static SPA Frontend).
* **Biên dịch Frontend Tự động**: Script `remote_update_vocaburn.py` đã tích hợp sẵn lệnh `build_vite.py` (`npm run build`).
* **Quy tắc Nghiêm ngặt cho AI Agent**:
  * **KHÔNG chạy `npm run build` thủ công** trong lượt xử lý của AI hoặc tạo task background đợi build.
  * **KHÔNG chạy vòng lặp polling/monitoring SSH** sau khi kích hoạt `remote_update_vocaburn.py`.
  * Sửa code xong là phản hồi ngay cho người dùng để tiết kiệm token và tránh tắc nghẽn giao tiếp.

---

## 7. Quy tắc Cập nhật Tài liệu & Changelog

* **Đồng bộ tài liệu**: Khi thay đổi cấu trúc mã nguồn, API hoặc Cơ sở dữ liệu, **bắt buộc** cập nhật các file tài liệu tương ứng trong thư mục `docs/` (`01_architecture/`, `02_api_reference/`, `04_development_and_ops/`).
* **Cập nhật Changelog**: Ghi nhận chi tiết thông tin chỉnh sửa vào file [docs/05_changelog/CHANGELOG.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/05_changelog/CHANGELOG.md).
