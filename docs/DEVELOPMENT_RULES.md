# 📜 Quy tắc Phát triển Vocaburn (Development Rules)

Tài liệu này định nghĩa các quy tắc và quy chuẩn bắt buộc mà mọi nhà phát triển (hoặc AI Agent) cần tuân thủ khi viết mã nguồn, sửa lỗi hoặc cấu trúc lại (refactor) dự án Vocaburn.

---

## 1. Quản lý File Tạm và Scripts Thử nghiệm (Hygiene)

Nhằm giữ cho thư mục gốc dự án luôn sạch sẽ, dễ theo dõi:
- **Thư mục `tmp/` hoặc `scratch/`**: Mọi script sửa lỗi nhanh (hotfix), script dọn dẹp, kiểm tra dữ liệu, hoặc file log tạm thời **BẮT BUỘC** phải nằm trong thư mục `tmp/` (hoặc `scratch/`) của dự án Vocaburn hoặc thư mục `scratch/` ở cấp độ Ecosystem.
- **Không đặt trực tiếp ở gốc**: Tuyệt đối không lưu các file như `test_db.py`, `debug_sso.py`, `log_output.txt` tại thư mục gốc `c:\Code\Ecosystem\Vocaburn\`.
- **Dọn dẹp**: Xóa bỏ các file tạm sau khi đã hoàn thành nhiệm vụ sửa lỗi hoặc chạy thử.

---

## 2. Kiến trúc Modular Monolith và Cách Tổ chức Code

Vocaburn được thiết kế theo kiến trúc **Modular Monolith (Hexagonal Style)**. Mỗi miền nghiệp vụ (domain) phải được cô lập tối đa:
- **Tách biệt logic**: Mã nguồn nghiệp vụ chính nằm trong `app/modules/<module_name>/`.
  - **Models**: Định nghĩa cấu trúc bảng SQLAlchemy tại `models.py`.
  - **Schemas**: Định nghĩa Pydantic Schemas đầu vào/đầu ra tại `schemas.py`.
  - **Services**: Chứa Business Logic chính tại `services/` hoặc `service.py`. Tất cả tính toán nghiệp vụ phức tạp phải ở đây, không được viết trực tiếp trong Router.
  - **Routes**: Định nghĩa API endpoints FastAPI tại `routes/` hoặc `routes.py`.
- **Nguyên tắc Import chéo**:
  - Hạn chế tối đa việc import trực tiếp model hoặc service chéo giữa các module để tránh vòng lặp phụ thuộc (circular dependency).
  - Nếu cần lấy dữ liệu từ module khác, hãy sử dụng các Dependency Injection hoặc qua các Interface/Service dùng chung.

---

## 3. Quy tắc Thao tác Cơ sở Dữ liệu (Database Best Practices)

- **Sử dụng Bất đồng bộ (AsyncSession)**: Mọi truy vấn cơ sở dữ liệu phải được thực hiện thông qua SQLAlchemy AsyncSession (`from sqlalchemy.ext.asyncio import AsyncSession`).
- **Giao dịch (Transactions)**: Luôn đảm bảo thực hiện `await db.commit()` sau khi thay đổi dữ liệu (thêm, sửa, xóa) và thực hiện rollback nếu có lỗi xảy ra.
- **SQLite WAL Mode**: Dự án sử dụng SQLite WAL (Write-Ahead Logging) mode nhằm cải thiện hiệu năng ghi đồng thời. Không tự ý thay đổi các thiết lập pragma trong [db.py](file:///c:/Code/Ecosystem/Vocaburn/app/core/db.py).
- **Di cư Schema (Alembic Migrations)**: Mọi thay đổi về cấu trúc bảng database bắt buộc phải được tạo file migration thông qua Alembic (`alembic revision --autogenerate -m "description"`).

---

## 4. Quản lý Quy trình và Cấu hình Cổng (Ports)

- **Port quy định**: Cổng hoạt động mặc định của Vocaburn là **5090** (xác định trong `run_vocaburn.py`). 
- **CentralAuth**: Vocaburn kết nối trực tiếp đến CentralAuth trên cổng mặc định **5000** để lấy thông tin xác thực SSO.
- **Biến môi trường**: Các cấu hình nhạy cảm hoặc thay đổi theo môi trường (như `GEMINI_API_KEY`, `CENTRAL_AUTH_URL`) phải được khai báo trong file `.env` ở thư mục gốc của Vocaburn hoặc thư mục Ecosystem. Không được hardcode các khóa bảo mật này vào mã nguồn.

---

## 5. Quy trình Sửa lỗi và Cập nhật Lên VPS

Mỗi khi thực hiện thay đổi và triển khai lên máy chủ VPS:
1. **Kiểm tra cục bộ**: Chạy thử nghiệm và đảm bảo ứng dụng backend + frontend chạy không có lỗi.
2. **Biên dịch Frontend**: Luôn chạy script biên dịch frontend (chạy `build_vite.py` tự động thông qua `run_vocaburn.py` hoặc chạy thủ công) để cập nhật các asset tĩnh sang thư mục `app/static/dist`.
3. **Sử dụng tool remote update**: Chạy [remote_update_vocaburn.py](file:///c:/Code/Ecosystem/remote_update_vocaburn.py) để tự động hóa quá trình đẩy mã nguồn lên GitHub và kích hoạt lệnh cập nhật trên VPS qua SSH.

---

## 6. Quy tắc Cập nhật Tài liệu và Nhật ký Chỉnh sửa (Documentation & Changelog)

Để đảm bảo tài liệu kỹ thuật luôn đồng bộ với các thay đổi mã nguồn:
- **Cập nhật tài liệu tương ứng**: Khi thực hiện bất kỳ cải tiến, sửa đổi tính năng, hoặc thay đổi cấu trúc dữ liệu nào, **bắt buộc** phải cập nhật lại các file hướng dẫn `.md` liên quan của dự án (ví dụ: `DATABASE_STRUCTURE.md`, `DEVELOPMENT_RULES.md`, `.docs/` guides) để phản ánh đúng thực tế hiện tại của code.
- **Cập nhật Lịch sử chỉnh sửa**: Mỗi lần thay đổi tính năng hoặc cấu trúc code, bạn phải ghi chú chi tiết vào file [CHANGELOG.md](file:///c:/Code/Ecosystem/Vocaburn/docs/CHANGELOG.md) bao gồm: ngày chỉnh sửa, nội dung thay đổi, lý do, và danh sách các file bị tác động.
