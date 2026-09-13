# 🎴 Flashcard & Practice Modes Architecture Guide

> **Vị trí Triển khai:**
> - **Backend Services & Logic:** [`app/modules/deck/services/deck_service.py`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/app/modules/deck/services/deck_service.py), [`app/modules/deck/routes/play.py`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/app/modules/deck/routes/play.py)
> - **Frontend Pages:** [`client/src/pages/FlashcardPlay.tsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/client/src/pages/FlashcardPlay.tsx), [`client/src/pages/PracticePlay.tsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/client/src/pages/PracticePlay.tsx), [`client/src/pages/DeckDetailPage.tsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/client/src/pages/DeckDetailPage.tsx)
> - **Components:** [`Flashcard3DCard.tsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/client/src/components/flashcard/Flashcard3DCard.tsx), [`FlashcardQuickControlsSheet.tsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/client/src/components/flashcard/FlashcardQuickControlsSheet.tsx), [`FsrsCompleteScreen.tsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/client/src/components/flashcard/FsrsCompleteScreen.tsx), [`DeckRecentHistory.tsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/client/src/components/deck/overview/DeckRecentHistory.tsx)

---

## 🌟 1. Tổng Quan Kiến Trúc (Architecture Overview)

Vocaburn cung cấp hai trụ cột học tập độc lập nhưng tích hợp chặt chẽ:
1. **Flashcard Learning Engine**: Chuyên sâu ghi nhớ dài hạn với thuật toán **FSRS v6**, vòng lặp ôn tập tuần hoàn **Continuous Review**, chế độ nạp từ mới tinh **Learn New Words**, và chế độ đọc lướt tốc độ cao **Speed Skim**.
2. **Practice Interactive Engine**: Luyện tập phản xạ đa giác quan gồm **4-Choice Quiz (MCQ)**, **Spelling Recall (Typing)**, **Audio Dictation (Listening)** và **Roadmap Daily Test**.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             DECK DETAIL PAGE                                     │
│  ┌─────────────────────────────────┐    ┌──────────────────────────────────────┐ │
│  │   ⚡ FLASHCARDS [ ▾ ]           │    │    🎯 PRACTICE [ ▾ ]                 │ │
│  │   (Bấm thân: FSRS ngay 1 chạm)  │    │    (Bấm thân: 4-Choice Quiz ngay)    │ │
│  └─────────────────────────────────┘    └──────────────────────────────────────┘ │
│                   │                                        │                     │
│     ┌─────────────┴─────────────┐            ┌─────────────┴─────────────┐       │
│     ▼                           ▼            ▼                           ▼       │
│  [Modal Sheet: Flashcards]                [Modal Sheet: Practice]                │
│  • FSRS Spaced Repetition (FSRS)          • 4-Choice Quiz (MCQ)                  │
│  • Continuous Review (REV)                • Spelling Recall (Typing)             │
│  • Learn New Words (NEW)                  • Audio Dictation (Listening)          │
│  • Speed Skim (SKIM)                      • Roadmap Daily Test                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 2. Chi Tiết Logic Nghiệp Vụ 4 Chế Độ Flashcard

### 2.1. Chế Độ 1: FSRS Spaced Repetition (`mode = 'fsrs'`)
- **Mục tiêu**: Tối ưu hóa trí nhớ dài hạn dựa trên thuật toán **FSRS v6** (Free Spaced Repetition Scheduler).
- **Lọc Thẻ**: Chỉ phục vụ các thẻ đã đến hạn cần ôn tập hôm nay (`due_date <= now`) hoặc các thẻ mới được xếp lịch theo hạn mức ngày của bộ thẻ.
- **Đánh giá 4 mức (FSRS Grades)**:
  - `1 = Again`: Quên thẻ, reset Stability, đưa thẻ vào vòng Relearning (`state = 3`).
  - `2 = Hard`: Khó nhớ, tăng nhẹ khoảng cách ôn tập.
  - `3 = Good`: Nhớ chuẩn, khoảng cách ôn tập tăng theo hàm mũ lý tưởng.
  - `4 = Easy`: Rất dễ, tăng vọt Stability và khoảng cách ôn tập.
- **Hoàn thành**: Khi hết thẻ đến hạn, hiển thị màn hình `🎉 ALL DUE CARDS COMPLETED!` kèm bộ đếm thời gian FSRS v6 và đồng hồ đếm ngược đến đợt ôn kế tiếp.

### 2.2. Chế Độ 2: Continuous Review (`mode = 'review'` hoặc `REV`) - VÒNG LẶP TUẦN HOÀN LIÊN TỤC
- **Nguyên lý Cốt lõi**:
  - **Định nghĩa**: Ôn tập **toàn bộ các thẻ đã từng học** trong bộ thẻ (`state > 0` hoặc `last_review is not None`).
  - **Không bao giờ kết thúc**: Miễn là bộ thẻ có ít nhất 1 thẻ đã học (`learned_cards >= 1`), chế độ này **KHÔNG BAO GIỜ HẾT**!
  - **Cơ chế xoay vòng liên tục (Continuous Loop)**: Hệ thống ưu tiên các thẻ đã học chưa ôn trong phiên hiện tại; khi người học đã ôn hết một lượt, hệ thống tự động xoay vòng ôn lại từ đầu theo chu kỳ tuần tự hoặc ngẫu nhiên.
  - **Tuyệt đối không nạp thẻ mới**: Khắc phục triệt để lỗi vô tình rơi vào thẻ mới (`NEW`).
  - **Trường hợp ngoại lệ duy nhất**: Nếu bộ thẻ chưa có bất kỳ thẻ nào từng học (`learned_cards == 0`), hệ thống hiển thị màn hình `📚 NO LEARNED CARDS YET` kèm nút chuyển nhanh sang `Start Learning New Cards`.

### 2.3. Chế Độ 3: Learn New Cards (`mode = 'new'` hoặc `NEW`)
- **Nguyên lý Cốt lõi**:
  - **Chỉ phục vụ từ mới tinh**: Hệ thống chỉ lọc các thẻ chưa học bao giờ (`is_new = True`, `state == 0` và `last_review is None`).
  - **Hoàn thành dứt khoát**: Khi người dùng đã học hết toàn bộ từ mới của bộ thẻ trong phiên, hệ thống kết thúc ngay và hiển thị màn hình `🎉 ALL NEW CARDS LEARNED!`.
  - **Tuyệt đối không fallback sang thẻ cũ**: Nghiêm cấm việc fallback tải thẻ đã học khi người dùng đang chủ đích muốn học từ mới.
  - **Nút chuyển đổi ngữ cảnh**: Màn hình hoàn thành cung cấp nút bấm tiện lợi `Start Continuous Review (Learned Cards)` để người học chuyển sang ôn luyện các từ vừa nạp.

### 2.4. Chế Độ 4: Speed Skim (`mode = 'skim'` hoặc `SKIM`)
- **Nguyên lý Cốt lõi**:
  - **Đọc lướt tốc độ cao toàn diện**: Cho phép người học lướt nhanh qua **toàn bộ thẻ trong bộ thẻ** (bao gồm cả thẻ mới lẫn thẻ đã học) nhằm ôn nhanh trước giờ thi hoặc xem trước từ vựng.
  - **Tách rời khỏi Roadmap**: Chế độ này hoàn toàn độc lập với các bước phân loại chặng của Roadmap.
  - **Thứ tự linh hoạt**: Hỗ trợ lướt tuần tự từ thẻ đầu đến cuối (`Sequential`) hoặc xáo trộn ngẫu nhiên (`Random`).

---

## 🎯 3. Chi Tiết 4 Chế Độ Luyện Tập (Practice Engine)

| Chế độ | ID | Icon | Cơ chế Đánh giá & Phản xạ | Dữ liệu Ghi nhận |
| :--- | :---: | :---: | :--- | :--- |
| **4-Choice Quiz** | `mcq` | 🎯 | Trắc nghiệm 4 đáp án (1 đúng, 3 đáp án nhiễu sinh tự động từ `mcq_engine.py`). | Tỷ lệ chính xác %, điểm số, thời gian trả lời ms. |
| **Spelling Recall** | `typing` | ⌨️ | Yêu cầu gõ chính xác chính tả từ vựng, tự động bỏ qua viết hoa/thường và khoảng trắng thừa (`typing_engine.py`). | Điểm chính tả, số lần gõ sai. |
| **Audio Dictation** | `listening` | 🎧 | Phát âm thanh bản ngữ TTS qua Web Audio API, người học nghe và chọn/gõ lại từ vựng. | Tốc độ nghe hiểu, số lần nghe lại. |
| **Roadmap Daily Test** | `test` | 📝 | Bài thi tổng hợp kiểm tra các thẻ trong chặng ngày của Lộ trình (đạt $\ge 80\%$ để vượt chặng). | Trạng thái hoàn thành chặng lộ trình (`stage_2_done`). |

---

## 📱 4. Giao Diện Deck Detail: 2 Nút Đáy Neo Cố Định & Modal Tràn Viền

### 4.1. Thanh 2 Nút Đáy Neo Cố Định (Docked Bottom Dual Study Bar)
- **Vị trí**: Neo cố định tại đáy màn hình (`fixed bottom-0 inset-x-0`) với `max-w-[1700px] 2xl:max-w-[1900px] mx-auto`, nằm trong vùng ngón tay cái dễ bấm nhất (One-Hand Thumb Reachable).
- **Loại bỏ khối thừa**: Loại bỏ nút `Study Now` ở header và khối `DeckQuickStudyLauncher` ở trang Overview giúp trang chi tiết bộ thẻ tập trung tuyệt đối vào chỉ số FSRS và lịch sử học tập.
- **Nút 1 - Học Flashcards (`⚡ Flashcards | ▾`)**: Tông tím chàm `bg-indigo-600`, hiển thị số thẻ đến hạn (`due count`). Bấm thân nút để vào học FSRS 1 chạm; bấm mũi tên `▾` mở bảng chọn chế độ thẻ.
- **Nút 2 - Luyện tập (`🎯 Practice | ▾`)**: Tông xanh ngọc `bg-emerald-600`. Bấm thân nút vào ngay bài trắc nghiệm 4 đáp án; bấm mũi tên `▾` mở bảng chọn bài luyện tập.

### 4.2. Modal Sheets Chọn Chế Độ Học Tràn Viền 100% (`createPortal`)
- **Khắc phục lỗi đè thanh Bottom Nav**: Cả hai bảng chọn chế độ học (`FlashcardModeModal` và `PracticeModeModal`) được mount trực tiếp ra `document.body` bằng `createPortal(..., document.body)` với `z-[300]`.
- **Tràn viền cạnh-sát-cạnh (Full-Width Edge-to-Edge)**:
  - Áp dụng `items-end justify-center` với `w-full rounded-t-3xl`, chạm sát 2 mép màn hình điện thoại cũng như khi co nhỏ cửa sổ trình duyệt trên máy tính, loại bỏ hoàn toàn các khe hở thừa hai bên (`thừa thừa 2 bên`).
  - Bên trong modal sheet bọc bởi `max-w-2xl mx-auto w-full` để đảm bảo hiển thị cân đối trên desktop.

### 4.3. Nhật Ký Luyện Tập Gần Đây (`DeckRecentHistory.tsx`)
- **Backend Sync**: Endpoint `GET /api/v1/deck/{deck_id}/data` tính toán và trả về danh sách `recent_attempts` từ `DeckAttempt` và `UserAnswer`.
- **Hiển thị trực quan**: Thể hiện đầy đủ icon và nhãn của từng chế độ (`FSRS`, `Speed Skim`, `Continuous Review`, `Learn New`, `MCQ`, `Typing`, `Listening`), số lượng thẻ, điểm số, tỷ lệ chính xác % và thời gian học.
- **Chuẩn hóa tiếng Anh**: Sử dụng hoàn toàn tiếng Anh (`Recent Study History`, `No study history recorded yet`).

---

## 🎮 5. Trải Nghiệm Thẻ 3D & Bộ Điều Khiển Nhanh (Card HUD & Controls)

### 5.1. Card Top HUD (Thông Tin Đầu Thẻ Gộp Cụm Tinh Tế)
- **Huy hiệu lượt xem & độ chính xác**: Hiển thị số lần xem kèm icon con mắt `Eye` và tỷ lệ phần trăm đúng trực quan (ví dụ: `👁 4 views • 75%`, chuyển màu Xanh $\ge 80\%$, Vàng $\ge 50\%$, Đỏ $< 50\%$). Nhấp vào để mở ngăn kéo thống kê chi tiết thẻ.
- **Cụm nhận diện mặt thẻ hợp nhất**: Pill bo góc cao cấp `[ FRONT • #12 ]` (xanh chàm dịu mát) và `[ BACK • #12 ]` (xanh ngọc lục bảo).

### 5.2. Cử Chỉ Vuốt Chuyển Câu & Hoàn Tác Cả 2 Mặt (Dual-Face Gestures)
- **Vuốt ngang chuyển câu (`NEXT CARD`)**: Sau khi đã đánh giá thẻ (`hasRated = true`), cử chỉ vuốt ngang hoạt động mượt mà ở **cả mặt trước lẫn mặt sau** (không bị ràng buộc phải lật mặt sau mới được vuốt).
- **Hoàn tác (`UNDO`)**: Vuốt ngược sang trái để hoàn tác đánh giá. Nếu đang ở mặt trước, thẻ tự động lật sang mặt sau để sẵn sàng hiện thanh 4 nút đánh giá FSRS.
- **Hiệu ứng viền động (Border Glow)**: Viền thẻ phát sáng xanh lục khi kéo chuyển câu (`next`) và sáng vàng hổ phách khi kéo hoàn tác (`undo`).
- **Chống lật nhầm**: Cơ chế `Math.hypot(dragOffset) > 10` ngăn chặn việc thả tay sau khi vuốt bị nhận nhầm thành thao tác lật thẻ.

### 5.3. Bảng Điều Khiển Nhanh (Flashcard Quick Controls Sheet)
- **Haptic Feedback Toggle**: Bật/Tắt rung xúc giác 1 chạm trên thiết bị di động (`triggerHaptic('success')`).
- **Nút Hình Ảnh Thẻ 4 Nấc Tuần Hoàn**: Xoay vòng qua 4 trạng thái:
  $$\text{BOTH (Cả 2 mặt)} \longrightarrow \text{FRONT (Chỉ mặt trước)} \longrightarrow \text{BACK (Chỉ mặt sau)} \longrightarrow \text{OFF (Tắt ảnh)}$$
- **Nút Cỡ Chữ Nhanh (Font Size Cycle)**: Xoay vòng trực tiếp: `100% (Normal)` $\rightarrow$ `125% (Large)` $\rightarrow$ `150% (Extra Large)` $\rightarrow$ `85% (Compact)`.
- **Bộ Công Cụ Sửa Thẻ & AI**:
  - ✏️ **Edit Card**: Mở modal sửa nội dung thẻ trực tiếp.
  - 📝 **Card Note**: Mở tab ghi chú cá nhân của thẻ.
  - 🧠 **AI Explain**: Yêu cầu trợ lý Gemini AI phân tích chuyên sâu ngữ cảnh từ vựng.
  - 💡 **AI Hint**: Bật/Tắt gợi ý nhanh cho thẻ.
