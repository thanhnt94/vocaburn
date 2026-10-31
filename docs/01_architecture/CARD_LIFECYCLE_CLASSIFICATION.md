# 📐 Kiến Trúc Phân Loại Vòng Đời Thẻ Thống Nhất (Card Lifecycle Classification)

> **Tài liệu Single Source of Truth (SSOT)**: Quy định chuẩn toàn diện về phân loại, thứ tự ưu tiên (Waterfall Priority) và logic truy vấn vòng đời của thẻ từ vựng trong Vocaburn.
> Toàn bộ các cách phân loại phân mảnh khác (như `box_level` 1-5, `waiting_review`, `mastered`, các bộ lọc trùng lặp) đều bị bãi bỏ.

---

## 🧭 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Phân Vùng Độc Bản (Mutually Exclusive & Exhaustive)**:
   - Mỗi thẻ từ vựng trong bộ thẻ tại bất kỳ thời điểm nào **CHỈ THUỘC VỀ DUY NHẤT 1 TRẠNG THÁI**.
   - Không có thẻ nào bị trùng lặp giữa các nhóm, không có thẻ nào bị bỏ sót.
   - Tổng số thẻ ở tất cả các trạng thái luôn bằng chính xác 100% `total_cards`:
     $$\text{Total Cards} = \text{New} + \text{Skim} + \text{Practice} + \text{Hybrid} + \text{Learned} + \text{Review}$$

2. **Chia Tách 2 Thế Giới (Two Memory Worlds)**:
   - **Nhánh Đã Review (Reviewed - Chu trình FSRS Spaced Repetition)**: Thẻ đã được chấm điểm trong Flashcard FSRS (`state > 0` và `last_review is not None`).
   - **Nhánh Chưa Review (Pre-Review Acquisition)**: Thẻ chưa từng được chấm điểm trong Flashcard FSRS (`last_review is None` hoặc `state == 0`).

---

## 🌳 2. Cây Thứ Tự Ưu Tiên Phân Loại (Priority Waterfall)

```
                           [ THẺ TỪ VỰNG ]
                                  │
                 ┌────────────────┴────────────────┐
                 ▼                                 ▼
         [ ĐÃ REVIEW (FSRS) ]             [ CHƯA REVIEW ]
                 │                                 │
         Đến hạn hôm nay?                 Thứ tự ưu tiên cao nhất:
        ┌────────┴────────┐                        │
        ▼                 ▼               1. Có học Hybrid Recall?
   [ REVIEW ]        [ LEARNED ]             ➔ HYBRID
  (Đến hạn ôn)      (Đang nhớ tốt)                 │ (Không)
                                          2. Có làm bài Practice (Quiz)?
                                             ➔ PRACTICE
                                                   │ (Không)
                                          3. Có lướt Speed Skim?
                                             ➔ SKIM
                                                   │ (Không)
                                          4. Chưa tương tác gì
                                             ➔ NEW
```

---

## 📋 3. Chi Tiết Định Nghĩa Từng Trạng Thái (6 Trạng Thái Duy Nhất)

### Nhánh 1: Chưa Review (Pre-Review Acquisition)

Theo thứ tự ưu tiên từ cao xuống thấp (thẻ lấy trạng thái của mức độ học tập sâu nhất đã đạt được):

| Thứ tự | Trạng Thái | Điều kiện Logic & Cơ sở Dữ liệu | Ý Nghĩa Thực Tế |
| :---: | :--- | :--- | :--- |
| **P1 (Cao nhất)** | **Hybrid** | Thẻ chưa review FSRS, nhưng có bản ghi trong `UserPracticeStats` với `practice_mode == 'hybrid_drill'`. | Đã học qua chế độ Hybrid Recall (kết hợp cả lướt làm quen lẫn gõ/chọn trắc nghiệm chuyên sâu theo batch). |
| **P2** | **Practice** | Thẻ chưa review FSRS, không có `hybrid_drill`, nhưng có bản ghi trong `UserPracticeStats` với các mode khác (`mcq`, `typing`, `listening`). | Đã làm bài tập trắc nghiệm/gõ từ, chưa học Hybrid, chưa vào FSRS. Nếu thẻ đã cả Skim lẫn Practice thì **ưu tiên hiển thị Practice**. |
| **P3** | **Skim** | Thẻ chưa review FSRS, chưa Practice, chưa Hybrid, nhưng có bản ghi trong `UserAnswer` (`mode IN ('speed_skim', 'skim', 'flip')`) HOẶC `UserCardMastery.last_answered IS NOT NULL`. | Mới chỉ lướt qua xem mặt chữ/nghĩa trong Speed Skim để làm quen ban đầu. |
| **P4 (Mặc định)** | **New** | Thẻ chưa từng có bất kỳ tương tác nào ở trên (`total_cards - (Skim + Practice + Hybrid + Learned + Review)`). | Thẻ mới tinh nguyên vẹn 100%, người học chưa bao giờ nhìn thấy hay tương tác. |

---

### Nhánh 2: Đã Review (FSRS Spaced Repetition Cycle)

Khi thẻ đã được học và chấm điểm trong Flashcard FSRS (`UserCardMastery.state > 0` và `UserCardMastery.last_review IS NOT NULL`), thẻ chính thức bước vào chu trình giãn cách trí nhớ:

| Trạng Thái | Điều kiện Logic & Cơ sở Dữ liệu | Ý Nghĩa Thực Tế |
| :--- | :--- | :--- |
| **Review** (Due) | `UserCardMastery.state > 0`, `due <= day_end` và `(last_review IS NULL OR last_review < day_start)` (theo chuẩn UTC+0 Rule 11). | Thẻ đã tới hạn cần phải ôn tập lại hôm nay theo thuật toán FSRS v6. |
| **Learned** | `UserCardMastery.state > 0`, và KHÔNG thuộc nhóm `Review` ở trên (tức `due > day_end` hoặc đã review xong hôm nay `last_review >= day_start`). | Thẻ đã học, trí nhớ đang trong thời gian giãn cách tốt, chưa đến ngày cần ôn. |

---

## 🗄️ 4. Câu Lệnh Truy Vấn SQL / SQLAlchemy Mẫu Chuẩn

```python
# 1. Tập hợp thẻ đã review FSRS
reviewed_sub = (
    select(UserCardMastery.card_id)
    .where(
        UserCardMastery.user_id == user_id,
        UserCardMastery.state > 0,
        UserCardMastery.last_review.isnot(None),
        UserCardMastery.card_id.isnot(None)
    )
)

# 2. Thẻ Review (đến hạn ôn hôm nay)
due_res = select(func.count(UserCardMastery.id)).where(
    UserCardMastery.user_id == user_id,
    UserCardMastery.card_id.in_(reviewed_sub),
    UserCardMastery.due <= day_end,
    or_(UserCardMastery.last_review.is_(None), UserCardMastery.last_review < day_start)
)

# 3. Thẻ Learned (đã review, chưa đến hạn)
# learned_count = total_reviewed - review_due_count

# 4. Thẻ Hybrid (chưa review, có hybrid_drill)
hybrid_sub = (
    select(UserPracticeStats.card_id)
    .where(
        UserPracticeStats.user_id == user_id,
        UserPracticeStats.practice_mode == 'hybrid_drill',
        UserPracticeStats.card_id.not_in(reviewed_sub),
        UserPracticeStats.card_id.isnot(None)
    )
)

# 5. Thẻ Practice (chưa review, chưa hybrid, có practice thường)
practice_sub = (
    select(UserPracticeStats.card_id)
    .where(
        UserPracticeStats.user_id == user_id,
        UserPracticeStats.practice_mode != 'hybrid_drill',
        UserPracticeStats.card_id.not_in(reviewed_sub),
        UserPracticeStats.card_id.not_in(hybrid_sub),
        UserPracticeStats.card_id.isnot(None)
    )
)

# 6. Thẻ Skim (chưa review, chưa hybrid, chưa practice, có skim)
skim_sub = (
    select(Flashcard.id)
    .outerjoin(UserCardMastery, and_(UserCardMastery.card_id == Flashcard.id, UserCardMastery.user_id == user_id))
    .where(
        Flashcard.deck_id == deck_id,
        Flashcard.id.not_in(reviewed_sub),
        Flashcard.id.not_in(hybrid_sub),
        Flashcard.id.not_in(practice_sub),
        or_(
            UserCardMastery.last_answered.isnot(None),
            Flashcard.id.in_(select(UserAnswer.card_id).join(DeckAttempt).where(DeckAttempt.user_id == user_id, DeckAttempt.mode.in_(['speed_skim', 'skim', 'flip'])))
        )
    )
)

# 7. Thẻ New (chưa học gì cả)
# new_count = total_cards - (total_reviewed + hybrid_count + practice_count + skim_count)
```

---

## 🎨 5. Đề Xuất Bộ Tên Gọi (Terminology Options)

| Nhóm | Gốc (User) | Phương án A (Học Thuật Chuẩn - Rec.) | Phương án B (Hành Động Trực Quan) | Phương án C (Thuần Việt) |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **New** | `New` | `Fresh` | Thẻ Mới |
| 2 | **Skim** | `Skimmed` | `Previewed` | Đã Lướt |
| 3 | **Practice** | `Drilled` | `Practiced` | Đã Luyện Tập |
| 4 | **Hybrid** | `Hybrid` | `Reinforced` | Đã Học Sâu |
| 5 | **Learned** | `Learned` | `Retained` | Đang Ghi Nhớ |
| 6 | **Review** | `Due Review` | `Due Recall` | Cần Ôn Tập |
