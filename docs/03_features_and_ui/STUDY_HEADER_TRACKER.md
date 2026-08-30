# 🧭 StudyHeaderTracker — Header Tracker Bar & Live HUD Guide

> **Vị trí Component:** `client/src/components/StudyHeaderTracker.tsx`  
> **Sử dụng trong:** `FlashcardPlay.tsx`, `PracticePlay.tsx`

---

## 🌟 1. Tổng Quan (Overview)

`StudyHeaderTracker` là thanh điều khiển và theo dõi tiến độ học tập đa năng, phong cách **Dark Glassmorphism** cao cấp, tích hợp **hệ thống lật 2 mặt 3D (Dual-Face 3D Flip)** và **hiệu ứng Power Surge**:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [✕]  🛣️ N2 Vocabulary (Roadmap)          [●●○]  [ 🛣️ RM ]  [ 8 / 20 ]           │  ◄ Face 1
└──────────────────────────────────────────────────────────────────────────────────┘
                                   ↕ Bấm để lật (Click to Flip)
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [✕]  ⏱️ 4s • 12m  │  🎯 8/20 (12 left)  │  🎯 95%  │  ⚡ 2.4s/card  │  🏆 +40 XP │  ◄ Face 2 (HUD)
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 2. Cấu Trúc 2 Mặt (Dual-Face System)

Người dùng có thể **chạm/click vào bất kỳ đâu trên thanh** để chuyển đổi mượt mà giữa 2 mặt:

### 🔹 Face 1: Tên Bộ Thẻ & Chế Độ Học (Deck & Mode Identification)
* **Exit Button `[✕]`**: Nút thoát phiên học nhanh cố định bên trái.
* **Deck Emoji & Title**: Biểu tượng và tên bộ từ vựng (tự động thu gọn thông minh trên mobile).
* **Step Dots Stepper**: Các chấm thể hiện số chặng của Lộ trình (ví dụ: `Chặng 1/3` ●●○).
* **Mode Badge**: Huy hiệu viết tắt của chế độ học hiện tại (ví dụ: `RM`, `NEW`, `FSRS`, `REV`, `MCQ`, `TYP`...).
* **Micro Progress Pill**: Hiển thị tiến độ dạng phân số (`8 / 20`) hoặc đếm ngược (`Còn 5` / `5 left`).

### 🔹 Face 2: Live HUD Metrics Dashboard (Chỉ Số Trực Tiếp)
* **⏱️ Card Timer & Today Time**: Đếm giây cho thẻ hiện tại + tổng thời gian học trong ngày.
* **🎯 Progress & Remaining**: Số thẻ đã qua / tổng số thẻ (`8/20 (12 left)`).
* **📊 Accuracy %**: Tỷ lệ trả lời đúng thời gian thực (`95%`).
* **⚡ Avg Speed**: Tốc độ phản xạ trung bình trên mỗi thẻ (`2.4s/card`).
* **🏆 XP Points**: Điểm kinh nghiệm kiếm được trong phiên (`+40 XP`).
* **🔥 Streak Flame**: Chuỗi ngày học liên tục (`7d`).

---

## ⚡ 3. Hiệu Ứng Power Surge (Expansion Overlay)

Mỗi khi người dùng đánh giá và ghi nhận thêm tiến độ, một dải sáng **Power Surge** toàn màn hình sẽ kích hoạt với các thông điệp động lực:
* **`VOCAB PROGRESS!`**: Khi ghi nhận thêm từ mới hoặc câu trả lời đúng.
* **`DAILY GOAL REACHED!`**: Khi hoàn thành mục tiêu ngày.
* **`⚡ OUTSTANDING EFFORT!`** / **`🚀 GOAL CRUSHED!`** / **`👑 LIMIT BREAKER!`** / **`🔥 ON FIRE!`**: Khi học vượt chỉ tiêu ngày (Overachieve).

---

## 🏷️ 4. Danh Sách Mode Badges & Templates (Mode Meta Dictionary)

| Mode ID | Emoji | Acronym (Badge) | Label Tiếng Anh | Màu sắc / Style |
| :--- | :---: | :---: | :--- | :--- |
| `roadmap` | 🛣️ | **`RM`** | Roadmap Guided | Amber (Hổ phách) |
| `roadmap_new` | 🛣️ | **`RM`** | Roadmap - New Cards | Amber (Hổ phách) |
| `roadmap_review` | 🛣️ | **`RM`** | Roadmap - Review | Emerald (Xanh lục) |
| `new` / `new_cards` | ✨ | **`NEW`** | Learn New Cards | Indigo (Tím chàm) |
| `fsrs` / `fsrs_review` | 🧠 | **`FSRS`** | FSRS v6 Spaced Repetition | Emerald (Xanh lục) |
| `review` / `rev` | 📚 | **`REV`** | Review Only | Teal (Xanh mòng két) |
| `flip` | 🔄 | **`FLIP`** | Free Flip Mode | Amber (Hổ phách) |
| `mcq` / `roadmap_mcq` | 🎯 | **`MCQ`** | Multiple Choice Quiz | Rose (Hồng đỏ) |
| `typing` / `roadmap_typing`| ⌨️ | **`TYP`** | Typing Mode | Purple (Tím) |
| `listening` / `audio` | 🎧 | **`LIS`** | Listening Mode | Sky Blue (Xanh da trời) |
| `roadmap_test` | 🏆 | **`TEST`** | Roadmap Test | Amber (Hổ phách) |

---

## 🛠️ 5. Props Reference (Bảng Thuộc Tính)

```tsx
<StudyHeaderTracker
  // Bộ thẻ & Lộ trình
  deckTitle="N2 Vocabulary (From Thảo Lê)"
  pipeline={rawPipeline}                 // Danh sách các bước trong Roadmap
  currentStepIndex={0}                   // Bước hiện tại (0-indexed)
  
  // Tiến độ học
  subProgressCurr={8}                    // Số thẻ hiện tại
  subProgressTotal={20}                  // Mục tiêu tổng số thẻ
  progressPillText="8 / 20"              // (Optional) Text tùy biến, ví dụ: "Còn 3"
  
  // Chế độ học
  activeMode="roadmap"                   // 'roadmap' | 'new' | 'fsrs' | 'review' | 'flip' | 'mcq' | 'typing' | 'listening'

  // Hiệu suất & Gamification
  streakCount={7}                        // Số ngày streak
  xp={1540}                              // Tổng XP
  sessionXP={40}                         // XP kiếm được trong phiên
  answeredCount={10}                     // Số câu đã trả lời
  correctCount={9}                       // Số câu đúng (tính Accuracy %)
  cardTimeSeconds={4}                    // Số giây cho thẻ này
  todayTimeMinutes={12}                  // Tổng số phút học hôm nay
  
  // Nút hành động
  onExit={() => navigate('/dashboard')}  // Hàm callback khi bấm nút X
/>
```
