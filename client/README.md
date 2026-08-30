# ⚛️ Vocaburn Frontend Client (React SPA)

Thư mục `client/` chứa toàn bộ mã nguồn Frontend của ứng dụng **Vocaburn**, được thiết kế theo kiến trúc Single Page Application (SPA) hiện đại.

---

## 1. Công nghệ & Thư viện Sử dụng

* **Core Framework**: React 19 + TypeScript.
* **Build Tool**: Vite 6.
* **Styling**: TailwindCSS v4 + Custom Glassmorphic Dark UI & 3D CSS Classes (`.perspective-1000`, `.preserve-3d`, `.backface-hidden`).
* **State Management**: Zustand (`useAppStore.ts` quản lý thống nhất thông tin người dùng, cài đặt cá nhân, gamification và cờ tiến trình - đồng bộ Backend DB).
* **Icons**: Lucide React.
* **Animations**: Framer Motion & Canvas Confetti.

---

## 2. Quy trình Biên dịch & Đóng gói (Build Workflow)

Frontend client được đóng gói thành các tài nguyên tĩnh và tích hợp trực tiếp vào FastAPI Backend để phục vụ tại cổng **5090**.

### Lệnh Biên dịch Tự động (Khuyên dùng)
Chạy script tại thư mục gốc Vocaburn:
```bash
python build_vite.py
```
*Script này sẽ thực thi `npm run build` bên trong thư mục `client/` và tự động copy toàn bộ sản phẩm biên dịch vào `app/static/dist` để FastAPI sẵn sàng phục vụ.*

### Lệnh Chạy Dev Server Độc lập (Hot Reload)
```bash
cd client
npm install
npm run dev
```
*Dev server sẽ khởi chạy tại `http://localhost:5173`. Các yêu cầu `/api/v1/` sẽ được tự động proxy về backend FastAPI cổng `5090`.*

---

## 3. Tài liệu Tham chiếu Chi tiết
* Xem hướng dẫn phát triển chi tiết tại: [docs/04_development_and_ops/FRONTEND_GUIDE.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/04_development_and_ops/FRONTEND_GUIDE.md)
* Xem danh mục API đầy đủ tại: [docs/02_api_reference/API_REFERENCE.md](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/docs/02_api_reference/API_REFERENCE.md)
