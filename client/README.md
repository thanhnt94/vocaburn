# ⚛️ Vocaburn Frontend Client (React SPA)

Thư mục `client/` chứa toàn bộ mã nguồn Frontend của ứng dụng Vocaburn, được thiết kế theo kiến trúc Single Page Application (SPA) hiện đại.

---

## 1. Công nghệ & Thư viện Sử dụng

- **Core Framework**: React 19 + TypeScript.
- **Build Tool**: Vite 6.
- **Styling**: TailwindCSS v4 + Custom Glassmorphic Dark UI & 3D CSS Classes (`.perspective-1000`, `.preserve-3d`, `.backface-hidden`).
- **State Management**: Zustand (`useAppStore.ts` quản lý dữ liệu học tập/bộ thẻ, `useAuthStore.ts` quản lý phiên đăng nhập SSO).
- **Icons**: Lucide React.
- **Animations**: Framer Motion & Canvas Confetti.

---

## 2. Quy trình Biên dịch & Đóng gói (Build Workflow)

Frontend client được đóng gói thành các tài nguyên tĩnh và tích hợp trực tiếp vào FastAPI Backend để phục vụ tại cổng **5090**.

### Lệnh Biên dịch tự động (Khuyên dùng)
Chạy script tại thư mục gốc Vocaburn:
```bash
python build_vite.py
```
*Script này sẽ thực thi `npm run build` bên trong thư mục `client/` và tự động copy toàn bộ sản phẩm biên dịch vào `app/static/dist` để FastAPI sẵn sàng phục vụ.*

### Lệnh Chạy Dev Server độc lập (Hot Reload)
```bash
cd client
npm install
npm run dev
```
*Dev server sẽ khởi chạy tại `http://localhost:5173`. Các yêu cầu `/api/v1/` sẽ được tự động proxy về backend FastAPI cổng `5090`.*
