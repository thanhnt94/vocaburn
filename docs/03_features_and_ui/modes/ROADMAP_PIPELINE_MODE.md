# Roadmap Pipeline Mode (Lộ Trình Học Cá Nhân Hóa)

> Điều phối lộ trình học thông minh: kết hợp học từ mới, lướt nhanh, bài tập thực hành (MCQ/Gõ từ) và ôn tập FSRS theo từng chặng trong ngày.

---

## Tổng Quan (Overview)

Roadmap Pipeline Mode là tính năng điều phối chuỗi nhiệm vụ học tập hàng ngày cho từng bộ thẻ (Deck). Thay vì người dùng phải tự nhớ hôm nay cần học bao nhiêu từ mới hay ôn bài ra sao, Roadmap thiết lập một "dây chuyền sản xuất tri thức" tuần tự từng bước (Step-by-step pipeline) và theo dõi tiến độ hoàn thành (Goal tracking / Streak retention).

**File nguồn chính:**
- Frontend:
  - Tab chính: `client/src/components/deck/tabs/DeckRoadmapTab.tsx`
  - Thẻ hiển thị chặng: `client/src/components/deck/roadmap/DeckRoadmapPipelineCard.tsx`
  - Cấu hình mục tiêu: `client/src/components/deck/roadmap/DeckRoadmapGoalForm.tsx`
  - Player Flashcard: `client/src/pages/FlashcardPlay.tsx` (chế độ `mode=roadmap`, `roadmap_new`, `roadmap_review`)
  - Player Thực hành: `client/src/pages/PracticePlay.tsx` (chế độ `roadmap_mcq`, `roadmap_typing`, `roadmap_test`)
- Backend:
  - Endpoint trạng thái roadmap: `app/modules/deck/routes/features.py` hoặc `play.py` (`/api/v1/deck/{id}/roadmap-status`)
  - Lưu tiến độ test chặng: `/roadmap-test-save-progress`
  - Nộp bài test hoàn thành chặng: `/roadmap-test-submit`

---

## Các Loại Chặng Trong Pipeline (Step Types)

Hệ thống Roadmap cho phép người dùng hoặc các template mẫu cấu hình 6 loại bước:

| Mã Bước | Tên Tiếng Việt | Mô Tả | Tham Số Cấu Hình | Điều Hướng / Engine |
| :--- | :--- | :--- | :--- | :--- |
| `new_cards` | **Học Từ Mới** | Học thẻ mới bằng flashcard lật 2 mặt kèm thuật toán FSRS | `daily_count` (số lượng từ/ngày) | Flashcard Engine (`FlashcardPlay.tsx`) |
| `speed_skim` | **Lướt Nhanh** | Xem lướt qua thẻ mới không cần chấm điểm FSRS | `daily_count` (số lượng từ) | Flashcard Engine (`mode=speed_skim`) |
| `mcq` | **Trắc Nghiệm** | Làm bài tập trắc nghiệm 4 đáp án để củng cố khả năng nhận diện | `question_count`, `pass_threshold` (%) | Practice Engine (`PracticePlay.tsx?mode=mcq`) |
| `typing` | **Gõ Từ** | Thực hành gõ chính xác từ vựng để kích hoạt trí nhớ chủ động | `question_count`, `pass_threshold` (%) | Practice Engine (`PracticePlay.tsx?mode=typing`) |
| `fsrs_review` | **Ôn Tập FSRS** | Lặp lại ngắt quãng các từ đã đến hạn theo FSRS v6 chuẩn UTC +0 | `overdue_days` (1, 2, 3 ngày) | Flashcard Engine (`mode=fsrs_review`) |
| `study_time` | **Thời Gian Học** | Duy trì tập trung học tối thiểu một khoảng thời gian | `target_minutes` (phút) | Bấm giờ thời gian thực trong session |

> 📌 *Quy Chuẩn Thời Gian UTC +0 & Cơ Chế Giữ Cố Định Số Lượng Ôn Tập*:
> - Toàn bộ mốc bắt đầu/kết thúc ngày (`00:00:00 UTC` - `23:59:59 UTC`) được tính theo chuẩn **UTC +0**.
> - Chặng `fsrs_review` lọc theo số ngày quá hạn: `cutoff_time = day_end - timedelta(days=(overdue_days - 1))`.
> - **Nguyên tắc bất biến (Invariant Quota)**: Thẻ mới học trong ngày (`min_created >= day_start UTC`) không bao giờ được đếm vào danh sách ôn. Thẻ đã được ôn trong ngày hôm nay (`last_review >= day_start UTC`) đã hoàn thành nghĩa vụ, tuyệt đối không bị đếm lại vào `still_due` kể cả khi bấm Again/Hard với chu kỳ ngắn (1m/5m). Số thẻ cần ôn trong ngày luôn được giữ **cố định**, ôn xong thẻ nào thì thẻ đó hoàn thành và số còn lại giảm dần đều.

---

## Luồng Vận Hành & Trải Nghiệm Học (UI Flow)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Trang Deck Roadmap Tab (DeckRoadmapTab.tsx)               │
│    - Xem tiến độ hôm nay (Chặng 1/3, 2/3, 3/3)              │
│    - Số từ đã học / mục tiêu, streak ngày, dự kiến hoàn thành│
└──────────────────────────────┬──────────────────────────────┘
                               │ Bấm "Học ngay" (Learn Now)
┌──────────────────────────────▼──────────────────────────────┐
│ 2. Điều hướng vào Engine tương ứng:                          │
│    - new_cards / speed_skim / fsrs_review -> FlashcardPlay  │
│    - mcq / typing -> PracticePlay                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 3. StudyHeaderTracker HUD hiển thị vị trí chặng:            │
│    - Dot chỉ báo chặng hiện tại (Step Dots: ● ○ ○)           │
│    - Huy hiệu chặng: [RM NEW] hoặc [RM MCQ]...               │
└──────────────────────────────┬──────────────────────────────┘
                               │ Hoàn thành số câu / chỉ tiêu
┌──────────────────────────────▼──────────────────────────────┐
│ 4. Chặng chuyển trạng thái DONE (bg-emerald-50)              │
│    - Tự động gợi ý / chuyển sang chặng tiếp theo            │
│    - Khi xong toàn bộ chặng -> Mở khoá Badge + Thưởng Streak│
└─────────────────────────────────────────────────────────────┘
```

---

## Cơ Chế Tính Điểm, XP & Đạt Mục Tiêu

1. **Điểm thưởng tích luỹ từng câu:**
   - Flashcard New/Review: +6 đến +7 XP (Good/Easy), +10 XP nếu là lần đầu tiên trả lời thẻ.
   - Speed Skim: +3 XP mỗi thẻ lướt qua.
   - Practice MCQ: +3 XP / câu đúng, +1 XP / câu sai.
   - Practice Typing: +5 XP / câu đúng, +1 XP / câu sai.
   - Chuỗi đúng liên tiếp (Streak trong phiên): +1 XP bonus khi streak ≥ 5.
2. **Điểm thưởng Kỷ luật Hoàn thành Mục tiêu Ngày (Discipline Bonus):**
   - Khi hoàn thành tất cả các chặng trong ngày hoặc đạt chỉ tiêu `daily_count` từ mới: Hệ thống backend cấp **+50 Discipline XP**.
3. **Cơ chế Streak & Freeze:**
   - Khi hoàn thành tối thiểu 1 mục tiêu hàng ngày, hệ thống ghi nhận giữ vững chuỗi ngày học (`streak_days`).
   - Nếu ngày hôm đó người dùng bận không học: Cơ chế `check_and_auto_freeze` tự động tiêu thụ 1 thẻ "Bảo vệ Streak" (Streak Freeze) nếu tài khoản còn thẻ.

---

## Cơ Chế Roadmap Test Chặng (`roadmap_test`)

Khi người dùng cấu hình bài kiểm tra điều kiện vượt chặng:
1. **Lưu tiến độ từng bước:** Mỗi khi chọn câu trả lời, frontend gửi `POST /roadmap-test-save-progress` để đảm bảo không bị mất bài nếu lỡ tay thoát ứng dụng hoặc reload trang.
2. **Nộp bài tổng kết:** Khi hoàn thành câu cuối cùng, toàn bộ bài làm được đóng gói và nộp qua `POST /roadmap-test-submit`.
3. **Đánh giá tỉ lệ đỗ (Pass Threshold):**
   - Nếu tỉ lệ trả lời đúng $\ge \text{pass\_threshold}$ (ví dụ 80%): Chặng được đánh dấu Hoàn thành, mở khoá chặng tiếp theo.
   - Nếu không đạt: Hệ thống hiển thị bảng phân tích lỗi sai và yêu cầu làm lại chặng.

---

## Danh Sách Phím Tắt Trong Chế Độ Roadmap

Tương ứng với Engine đang chạy:
- **Nếu đang ở chặng Flashcard / Speed Skim:**
  - `Space` / `Enter`: Lật thẻ / Qua thẻ tiếp theo.
  - `1`, `2`, `3`, `4`: Chấm điểm FSRS (Again, Hard, Good, Easy).
  - `Z`: Hoàn tác (Undo).
  - `R`: Nghe lại âm thanh.
  - `H`: Gợi ý AI (AI Hint).
- **Nếu đang ở chặng Trắc nghiệm (MCQ):**
  - `1`, `2`, `3`, `4`: Chọn nhanh đáp án A, B, C, D.
  - `Space`: Tiếp tục sang câu sau.
- **Nếu đang ở chặng Gõ từ (Typing):**
  - `Enter`: Nộp từ vừa gõ.
