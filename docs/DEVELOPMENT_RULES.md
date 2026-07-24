# 📜 Quy tắc Phát triển Vocaburn (Development Rules)

Tài liệu này định nghĩa các quy tắc kỹ thuật và quy trình làm việc bắt buộc dành cho Nhà phát triển và các AI Agent khi xây dựng, sửa lỗi, hoặc nâng cấp hệ thống **Vocaburn**.

---

## 1. Tuân thủ Quy trình Planning Mode (Bắt buộc với AI Agent)

Khi tiếp nhận các yêu cầu thay đổi tính năng, sửa lỗi phức tạp hoặc tái cấu trúc:
- **Lập Kế hoạch**: Bắt buộc tạo hoặc cập nhật file `implementation_plan.md` trong thư mục artifact để mô tả rõ ràng giải pháp, các file tác động và kế hoạch nghiệm thu.
- **Phê duyệt**: Phải nhận được sự đồng ý phê duyệt (Approval) từ người dùng trước khi tiến hành viết hoặc sửa đổi mã nguồn.
- **Cập nhật Nghiệm thu**: Sau khi hoàn thành, tạo/cập nhật file `walkthrough.md` tổng kết các điểm đã sửa đổi và lệnh kiểm tra.

---

## 2. Quản lý Thư mục Tạm và Scripts Thử nghiệm (Hygiene Rules)

Nhằm giữ cho thư mục gốc dự án luôn sạch sẽ:
- **Thư mục `tmp/` hoặc `scratch/`**: Tất cả các script thử nghiệm nhanh (hotfix), script dọn dẹp dữ liệu, file kiểm tra hoặc file log tạm thời **BẮT BUỘC** phải nằm trong thư mục `tmp/` hoặc `scratch/` của dự án (hoặc thư mục `scratch/` của Ecosystem).
- **Cấm đặt ở thư mục gốc**: Tuyệt đối không lưu các file tạm như `test_db.py`, `debug_sso.py`, `log_output.txt` tại thư mục gốc `C:\Code\Ecosystem\Vocaburn\`.
- **Dọn dẹp**: Tự động dọn dẹp các tệp tạm sau khi hoàn tất kiểm tra.

---

## 3. Kiến trúc Modular Monolith (Hexagonal Style)

Vocaburn tách biệt nghiêm ngặt miền nghiệp vụ giữa 8 module trong `app/modules/`:
- **Models**: Định nghĩa cấu trúc bảng SQLAlchemy tại `models.py`.
- **Schemas**: Định nghĩa Pydantic Schemas tại `schemas.py`.
- **Services**: Chứa Business Logic chính tại `services/` (ví dụ: `deck_service.py`, `excel_service.py`). Mọi tính toán nghiệp vụ phức tạp phải ở Service, không được viết trực tiếp trong Router.
- **Routes**: Định nghĩa API Endpoints tại `routes/` hoặc `routes.py`.
- **Hạn chế Import chéo**: Không import trực tiếp Model/Service chéo giữa các module để tránh vòng lặp phụ thuộc (circular dependency).

---

## 4. Thao tác Cơ sở Dữ liệu & FSRS v6 Best Practices

- **Sử dụng AsyncSession**: Mọi truy vấn DB phải sử dụng bất đồng bộ `AsyncSession` (`from sqlalchemy.ext.asyncio import AsyncSession`).
- **Giao dịch**: Đảm bảo `await db.commit()` sau khi thay đổi dữ liệu và rollback khi xảy ra exception.
- **SQLite WAL Mode**: Dự án sử dụng SQLite WAL mode. Không tự ý sửa đổi pragma cấu hình trong `app/core/db.py`.
- **Alembic Migrations**: Mọi thay đổi cấu trúc bảng bắt buộc phải tạo migration file qua Alembic (`alembic revision --autogenerate -m "description"`).

---

## 5. Đóng gói Frontend & Deploy VPS

- **Cổng Hoạt động Quy định**: **5090** (Backend FastAPI + Phục vụ Static SPA Frontend).
- **Biên dịch Frontend**: Trước khi thử nghiệm nghiệm thu hoặc đẩy mã nguồn lên VPS, bắt buộc phải chạy lệnh biên dịch giao diện:
  ```bash
  python build_vite.py
  ```
  *(Lệnh này đóng gói ứng dụng React từ `client/` sang thư mục sản phẩm tĩnh `app/static/dist`)*.
- **Triển khai lên VPS**: Chạy công cụ tự động hóa [remote_update_vocaburn.py](file:///c:/Code/Ecosystem/remote_update_vocaburn.py) ở thư mục cấp Ecosystem để đẩy mã nguồn lên GitHub và kích hoạt lệnh cập nhật trên VPS qua SSH.

---

## 6. Quy tắc Cập nhật Tài liệu & Changelog

- **Đồng bộ tài liệu**: Khi thay đổi cấu trúc mã nguồn, API hoặc Cơ sở dữ liệu, **bắt buộc** cập nhật các file tài liệu tương ứng trong thư mục `docs/` (`MODULE_STRUCTURE.md`, `DATABASE_STRUCTURE.md`, `API_REFERENCE.md`).
- **Cập nhật Changelog**: Ghi nhận chi tiết thông tin chỉnh sửa vào file [docs/CHANGELOG.md](file:///c:/Code/Ecosystem/Vocaburn/docs/CHANGELOG.md).
