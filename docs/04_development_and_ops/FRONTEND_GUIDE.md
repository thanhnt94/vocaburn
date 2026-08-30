# ⚛️ Hướng dẫn Phát triển Frontend Vocaburn (Frontend Guide)

Thư mục `client/` chứa toàn bộ mã nguồn Frontend của ứng dụng **Vocaburn**, được thiết kế theo kiến trúc Single Page Application (SPA) hiện đại, hiệu năng cao và phong cách Dark Glassmorphism sang trọng.

---

## 1. Công nghệ & Thư viện Sử dụng

* **Core Framework**: React 19 + TypeScript.
* **Build Tool**: Vite 6.
* **Styling**: TailwindCSS v4 + Custom Glassmorphic Dark UI & 3D CSS Classes (`.perspective-1000`, `.preserve-3d`, `.backface-hidden`).
* **State Management**: Zustand (`useAppStore.ts` quản lý thống nhất thông tin người dùng, cài đặt cá nhân, gamification và cờ tiến trình).
* **Icons**: Lucide React.
* **Animations**: Framer Motion & Canvas Confetti.
* **HTTP Client**: Axios (cấu hình `withCredentials = true` gửi nhận cookie phiên tự động).

---

## 2. Quy chuẩn Đồng bộ Cấu hình (Không dùng localStorage)

Toàn bộ tùy chọn giao diện và chế độ học tập của người dùng được quản lý bởi store Zustand `useAppStore.ts` và đồng bộ vĩnh viễn với cơ sở dữ liệu:

```typescript
// Trong client/src/store/useAppStore.ts
updateUserSettings: async (partialSettings) => {
  set((state) => ({
    userSettings: { ...state.userSettings, ...partialSettings }
  }))
  try {
    await axios.patch('/api/v1/user/settings', partialSettings)
  } catch (e) {
    console.error("Failed to persist user settings to DB", e)
  }
}
```

---

## 3. Quy trình Biên dịch & Đóng gói (Build Workflow)

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
