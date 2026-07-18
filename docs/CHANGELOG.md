# 📝 Nhật ký Chỉnh sửa Vocaburn (Changelog)

Tài liệu này lưu lại lịch sử thay đổi cấu trúc, tính năng, và các bản vá lỗi của dự án Vocaburn.

---

### [2026-07-18]
#### Cải tiến & Refactor
- **Roadmap-driven Study Goals**: Loại bỏ hệ thống đặt mục tiêu học tập (Goals) cũ (thời gian, tổng số thẻ) trên Dashboard và Library. Thay thế hoàn toàn bằng lộ trình học tập tự động hóa **Roadmap** theo từng bộ thẻ (deck-scoped settings).
- **Trang Dashboard mới**: Cập nhật giao diện `Dashboard.tsx` hiển thị widget các bộ thẻ đang học theo lộ trình, hiển thị tiến độ học hàng ngày (số từ mới/cần ôn) và số ngày dự kiến hoàn thành.
- **Trang Chi tiết bộ thẻ**: Bổ sung bảng thông tin tiến trình lộ trình chi tiết bao gồm streak, lịch sử 7 ngày gần nhất, và biểu đồ tiến độ. Cho phép cấu hình số từ mới & giới hạn ôn tập hàng ngày riêng cho từng bộ thẻ.

#### Lỗi đã sửa (Bug Fixes)
- **Hỗ trợ Furigana cho ký tự `々`**: Cập nhật hàm `parseBBCodeToHtml` trong `text.ts` và `ImportFlashcard.tsx` hỗ trợ nhận diện ký tự lặp Kanji `々` (U+3005), giúp hiển thị furigana chính xác cho các từ như `人々[ひとびと]`.
- **Sửa lỗi SQLite Date Casting**: Thay thế `cast(UserAnswer.created_at, Date)` thành `func.date(UserAnswer.created_at)` trong file `play.py` để tránh lỗi `TypeError: fromisoformat: argument must be str` khi chạy truy vấn tính toán streak trên môi trường SQLite.
