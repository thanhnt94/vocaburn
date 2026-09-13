# 📊 Dashboard & Daily Activity Hub Architecture Guide

> **Vị trí Triển khai:**
> - **Backend API:** [`app/modules/stats/routes/api.py`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/app/modules/stats/routes/api.py) (`GET /api/v1/stats/daily-summary`)
> - **Backend Service:** [`app/modules/stats/services/analytics_service.py`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/app/modules/stats/services/analytics_service.py)
> - **Frontend Page:** [`client/src/pages/Dashboard.tsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/client/src/pages/Dashboard.tsx)
> - **Drawer Component:** [`DashboardDailyDrawer.tsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/client/src/components/dashboard/DashboardDailyDrawer.tsx)
> - **Sections:** [`DashboardRoadmapSection.tsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/client/src/components/dashboard/DashboardRoadmapSection.tsx), [`DashboardQuickDecksWidget.tsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/client/src/components/dashboard/DashboardQuickDecksWidget.tsx)

---

## 🌟 1. Tổng Quan Kiến Trúc (Architecture Overview)

Trang chủ Dashboard là trung tâm điều phối học tập của Vocaburn, áp dụng triết lý thiết kế **Mobile-First**, **Thumb-Reachable**, **Zero localStorage**, và **Zero Clutter**:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             TOP APP HEADER                                       │
│  [ 🔥 Vocaburn ]                   [ 📊 Today ]    [ ⚡ 27d ]    [ 👤 Profile ]   │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [ 📑 Roadmap (3) ]          [ 📖 Learning (4) ]                   [ ⚙️ Settings ] │
│  ══════════════════ (Animated Underline)                                         │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [TAB 1: ROADMAP SECTION]              │  [TAB 2: LEARNING SECTION]             │
│  • Lướt dọc (Vertical Snap-Scroll)    │  • Danh sách bộ thẻ ghim phím tắt     │
│    chuyển đổi bộ thẻ liên mạch         │  • Due count thẻ đến hạn               │
│  • Đếm ngược thời gian ngày UTC       │  • Bảng màu sắc rực rỡ theo chủ đề     │
│  • Mascot cổ vũ tương tác haptic      │  • Nút mở modal học 1 chạm             │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
                 │ (Bấm [📊 Today] hoặc [⚡ 27d])
                 ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│               DAILY ACTIVITY DRAWER (TỰ ĐỘNG MOUNT QUA createPortal)             │
│  [ ─── Drag Handle (Kéo xuống để đóng) ─── ]                                     │
│  📊 Today's Activity • Sunday, Sep 13                        [ 🔄 ]  [ ✕ Close ] │
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Study Time  │  │ Cards Studied│  │   Accuracy   │  │  XP Earned   │          │
│  │   24 mins    │  │   45 cards   │  │     92%      │  │   +180 XP    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                                  │
│  📈 Hourly Study Pulse (Phân bổ thẻ theo 24 giờ: 00:00 - 23:00)                  │
│  🕒 Today's Session Feed (Chi tiết từng phiên học, bộ thẻ, điểm số, thời lượng) │
│  📚 Decks Studied & Learning Modes Breakdown                                     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧭 2. Phân Tách Cử Chỉ Theo Hai Trục (Dual-Axis Gesture Separation)

Nhằm đem lại trải nghiệm vuốt chạm trực quan và hoàn toàn tự nhiên trên thiết bị cảm ứng, hệ thống tách rời độc lập hai trục cử chỉ:

### 2.1. Trục Ngang (Horizontal Axis) - Chuyển Đổi Tab Home (`Roadmap` $\leftrightarrow$ `Learning`)
- **Cơ chế**: Bắt sự kiện `onTouchStart` và `onTouchEnd` ở vùng gốc Dashboard với ngưỡng kích hoạt `|diffX| > 40` và độ lệch ngang vượt trội `|diffX| > |diffY| * 1.2`.
- **Hành vi**:
  - **Vuốt sang trái (`diffX < -40`)**: Chuyển từ `Roadmap` $\rightarrow$ `Learning`.
  - **Vuốt sang phải (`diffX > 40`)**: Chuyển từ `Learning` $\rightarrow$ `Roadmap`.
- **Rung haptic**: Kích hoạt rung xúc giác nhẹ `navigator.vibrate(8)` xác nhận đổi tab.
- **Loại bỏ tình trạng 3 tab liên tiếp**: Loại bỏ hoàn toàn tab thứ 3 trên thanh điều hướng, giúp cử chỉ vuốt 2 chiều dứt khoát, không bị nhảy nhầm tab.

### 2.2. Trục Dọc (Vertical Axis) - Snap-Scroll Chuyển Đổi Bộ Thẻ Roadmap
- **Cơ chế**: Container cuộn dọc chuyên dụng `snap-y snap-mandatory scroll-smooth` bên trong `DashboardRoadmapSection.tsx`.
- **Hành vi**:
  - Khi lướt ngón tay dọc trên điện thoại hoặc lăn con lăn chuột trên desktop, các thẻ roadmap trượt dọc liền mạch với quán tính vật lý tự nhiên của hệ điều hành.
  - Tự động hít (snap) chính xác vào từng bộ thẻ và cập nhật bộ đếm `< 1/3 >` theo thời gian thực.
  - Desktop hỗ trợ lăn chuột chuyển thẻ với debounce 350ms.

---

## 📊 3. Ngăn Kéo Thống Kê Hoạt Động Ngày (DashboardDailyDrawer)

Thay vì đặt tab Daily chen chúc trên thanh điều hướng, toàn bộ tính năng thống kê hôm nay được tổ chức thành một **Bottom Sheet / Drawer** thông minh:

### 3.1. Điểm Kích Hoạt (Triggers)
1. **Nút Pill `[ 📊 Today ]`**: Đặt cố định tại cụm tiện ích góc trên bên phải thanh Header.
2. **Huy hiệu Chuỗi Ngày `[ ⚡ 27d ]`**: Nhấp trực tiếp vào chuỗi ngày cũng kích hoạt mở ngăn kéo thống kê.
3. **Thẻ Bấm Desktop (Cột 1 Sidebar)**: Nút `Today's Activity Report` mở popup dạng modal trên màn hình lớn mà không làm xáo trộn bố cục song song giữa Cột 2 (Roadmap Hub) và Cột 3 (Quick Decks Hub).

### 3.2. Cấu Trúc Kỹ Thuật (Technical Implementation)
- **Portal Mount**: Sử dụng `createPortal(..., document.body)` với `z-[280]` đưa ngăn kéo thoát hoàn toàn khỏi mọi stacking context con, đảm bảo luôn nổi trên mọi thanh điều hướng.
- **Kéo Vuốt Tự Nhiên (Pull-Down to Dismiss)**: Trang bị thanh gạt tay (drag handle bar) ở trên đỉnh, người dùng có thể kéo vuốt nhẹ xuống dưới ($> 60\text{px}$) bằng ngón cái để đóng ngăn kéo.
- **Đóng qua Phím ESC & Backdrop**: Hỗ trợ phím `Escape` và chạm vào lớp nền mờ đen `bg-slate-950/60 backdrop-blur-sm` để đóng.
- **Animation**: Sử dụng `Framer Motion` với hiệu ứng trượt lò xo (`type: "spring", damping: 28, stiffness: 320`).

### 3.3. Các Khối Nội Dung Thống Kê (Dashboard Metrics)
1. **Bộ 4 Thẻ HUD Nhanh**:
   - **⏱️ Study Time**: Tổng số phút học thực tế (tính từ `DeckAttempt.time_spent` và `UserAnswer.response_time_ms`), kèm mốc thời gian bắt đầu $\rightarrow$ kết thúc phiên gần nhất.
   - **🎴 Cards Studied**: Tổng số thẻ đã học kèm phân bổ cụ thể `+X new` (từ mới lần đầu) và `Y rev` (lượt ôn lặp lại).
   - **🎯 Accuracy**: Tỷ lệ trả lời đúng thực tế trong ngày (%) kèm số câu đúng / sai.
   - **⚡ XP Earned**: Điểm kinh nghiệm nhận được hôm nay và điểm streak tích lũy.
2. **Biểu Đồ Nhịp Độ Học Tập 24 Giờ (Hourly Study Pulse)**:
   - Thể hiện trực quan tần suất thẻ học theo từng giờ từ `00:00` đến `23:00`.
   - Cột khung giờ cao điểm nhất (Peak Hour) được làm nổi bật với dải màu cam rực rỡ `from-orange-500 to-amber-400`.
   - Di chuột / Chạm vào cột để xem tooltip chính xác số thẻ học tại khung giờ đó.
3. **Nhật Ký Từng Phiên Học (Today's Session Feed)**:
   - Danh sách chi tiết từng phiên học gồm: Ảnh bìa bộ thẻ / Emoji, Tên bộ thẻ, Huy hiệu chế độ (`FSRS`, `Continuous Review`, `Learn New`, `Speed Skim`, `MCQ`, `Typing`, `Listening`), mốc giờ bắt đầu, thời lượng, số lượng thẻ, điểm số và độ chính xác.
   - Bấm vào một phiên học bất kỳ sẽ điều hướng ngay đến bộ thẻ đó và tự động đóng ngăn kéo.
4. **Phân Bổ Bộ Thẻ & Phương Pháp Học**:
   - Thống kê các bộ thẻ được học nhiều nhất trong ngày kèm số lượng thẻ.
   - Tỷ trọng các phương pháp học (Flashcards vs Practice quizzes).
5. **Trạng Thái Khởi Đầu Thân Thiện (Empty State)**:
   - Khi người dùng chưa học gì trong ngày, hiển thị lời khuyên tích cực kèm nút bấm `Start Learning Now` (tự động đóng ngăn kéo và đưa người dùng đến bài học).

---

## 📡 4. Backend Analytics Endpoint (`GET /api/v1/stats/daily-summary`)

### 4.1. Thông Số Yêu Cầu
- **URL**: `/api/v1/stats/daily-summary`
- **Method**: `GET`
- **Query Parameters**:
  - `tz_offset` (int, default `-420` cho UTC+7): Chênh lệch múi giờ của máy khách tính bằng phút (`new Date().getTimezoneOffset()`), đảm bảo thống kê tính đúng từ `00:00:00` đến `23:59:59` theo giờ địa phương của người dùng.

### 4.2. Cấu Trúc Dữ Liệu Phản Hồi (JSON Response)
```json
{
  "date_str": "Sunday, Sep 13, 2026",
  "summary": {
    "total_cards": 45,
    "new_cards": 15,
    "reviewed_cards": 30,
    "correct_count": 42,
    "wrong_count": 3,
    "accuracy": 93,
    "total_time_seconds": 1440,
    "total_time_minutes": 24,
    "total_sessions": 3,
    "first_session_time": "08:15",
    "last_session_time": "14:30",
    "xp_earned": 180,
    "points_earned": 30,
    "streak_count": 27,
    "streak_completed_today": true
  },
  "hourly_activity": [0, 0, 0, 0, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "sessions": [
    {
      "attempt_id": 1024,
      "deck_id": 18,
      "deck_title": "N2 Danh Động Từ",
      "deck_cover": "covers/n2.jpg",
      "mode": "fsrs",
      "total_cards": 30,
      "score": 93,
      "accuracy": 93,
      "time_spent": 900,
      "started_at": "2026-09-13T14:15:00Z"
    }
  ],
  "decks_studied": [
    { "deck_id": 18, "title": "N2 Danh Động Từ", "cards_count": 45 }
  ],
  "mode_breakdown": [
    { "mode": "fsrs", "sessions_count": 2 },
    { "mode": "mcq", "sessions_count": 1 }
  ],
  "roadmap_goals": []
}
```
