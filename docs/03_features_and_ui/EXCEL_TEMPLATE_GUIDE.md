# 📘 Hướng Dẫn Chi Tiết Cấu Trúc & Tạo File Excel Chuẩn Vocaburn

> **Phiên bản áp dụng**: Vocaburn v2.5+ (FSRS v6, Sub-lesson Units, 3 Flashcard Modes & 4 Practice Modes)  
> **Tệp mẫu chuẩn**: [`Vocaburn_Template.xlsx`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/templates/Vocaburn_Template.xlsx) hoặc tải trực tiếp tại nút **"Download Excel Template"** trên giao diện tạo bộ thẻ Vocaburn.

---

## 🎯 1. Tổng Quan Kiến Trúc File Excel Vocaburn

Hệ thống Vocaburn sử dụng định dạng bảng tính Excel (`.xlsx`) hiện đại gồm **6 trang tính (Sheets)** chuyên biệt, phân tách rõ ràng giữa thông tin tổng quan, dữ liệu từ vựng, cấu hình luyện tập, mẫu câu lệnh AI và âm thanh:

| Sheet | Màu sắc chuẩn | Mục đích & Trách nhiệm | Bắt buộc? |
| :--- | :--- | :--- | :--- |
| **`Info`** | 🟣 Indigo (`#4F46E5`) | Khai báo metadata, danh mục, tác giả, bài học con (`sub-lessons`), chế độ học mặc định (`fsrs`, `skim`, `memrise`) và danh sách cột mở rộng. | **Bắt buộc** |
| **`Data`** | 🟢 Emerald (`#059669`) | Chứa danh sách thẻ flashcard, phân nhóm bài học con (`unit`), Kanji, nghĩa, câu ví dụ, âm thanh, hình ảnh và các cột mẹo nhớ (Insight). | **Bắt buộc** |
| **`Practice`** | 🔵 Blue (`#2563EB`) | Cấu hình 4 chế độ luyện tập tự động: Trắc nghiệm (`mcq`), Gõ từ (`typing`), Nghe trắc nghiệm (`audio_mcq`), Nghe chính tả (`audio_typing`). | *Tùy chọn* |
| **`AI_Prompts`** | 🟠 Amber (`#D97706`) | Định nghĩa các nút bấm AI trong giao diện học để tự động sinh giải thích, mẹo nhớ, chiết tự Kanji theo từng biến số của thẻ. | *Tùy chọn* |
| **`Audio`** | 🟢 Teal (`#0D9488`) | Cấu hình phát âm tự động Text-to-Speech (TTS), chọn ngôn ngữ (`ja-JP`, `vi-VN`, `en-US`...) và liên kết cột âm thanh. | *Tùy chọn* |
| **`Collaborators`** | ⚫ Slate (`#475569`) | Phân quyền cộng tác viên (`editor` hoặc `viewer`) cùng tham gia biên soạn bộ thẻ. | *Tùy chọn* |

---

## 🟣 2. Sheet `Info`: Metadata & Cấu Hình Học

Sheet `Info` được thiết kế theo cấu trúc bảng cặp giá trị gồm 5 cột:
`Key` | `Value` | `Tên Tiếng Việt` | `Tùy Chọn Hợp Lệ` | `Hướng Dẫn & Giải Thích Chi Tiết`

### 2.1. Nhóm 1: Thông Tin Chung Bộ Thẻ (General Information)
* **`title`** *(Bắt buộc)*: Tên bộ thẻ hiển thị trên giao diện (Ví dụ: `Từ vựng N2 Shinkanzen Master`).
* **`description`**: Mô tả chi tiết nội dung, cấp độ, đối tượng học và cam kết kết quả.
* **`category`**: Danh mục phân loại (Ví dụ: `Tiếng Nhật`, `Tiếng Anh`, `Y Khoa`, `Lập Trình`...). Hệ thống tự động tạo danh mục nếu chưa tồn tại.
* **`tags`**: Các từ khóa tìm kiếm phân cách bằng dấu phẩy (Ví dụ: `JLPT, N2, Shinkanzen, Goi`).
* **`cover_image`**: URL hình ảnh minh họa bìa bộ thẻ (hỗ trợ JPG, PNG, WebP).
* **`instruction`**: Lời dặn hoặc chỉ dẫn của giáo viên/tác giả gửi tới người học.
* **`is_public`**: `TRUE` (công khai cho toàn bộ cộng đồng cùng học) hoặc `FALSE` (chỉ riêng tài khoản tác giả xem được).
* **`time_limit`**: Thời gian làm bài tối đa (phút). Điền `0` nếu không giới hạn thời gian.

### 2.2. Nhóm 2: Cài Đặt Học Mặc Định (Creator Study Defaults)
* **`study_learning_mode`**: Chế độ flashcard khởi đầu khi người học bấm vào nút học thẻ:
  * `fsrs`: Thuật toán giãn cách hiện đại **FSRS v6** (Khuyến nghị).
  * `skim`: Chế độ lướt thẻ nhanh (Speed Skim).
  * `memrise`: Chế độ lặp lại tức thì khi sai (Immediate Repeat).
* **`disabled_modes`**: Danh sách các chế độ muốn tắt cho bộ thẻ này (phân cách bằng dấu phẩy). Ví dụ: nếu bộ thẻ là câu đàm thoại dài không phù hợp để gõ phím, hãy điền: `typing, audio_typing`. Để trống nếu cho phép học sinh tự do chọn mọi chế độ.
* **`study_autoplay_audio`**: Tự động phát âm thanh khi lật thẻ: `front` (chỉ mặt trước), `back` (chỉ mặt sau), `always` (cả hai mặt), `none` (tắt).
* **`study_show_images`**: Hiển thị ảnh: `always`, `front`, `back`, `none`.
* **`study_random_enabled`**: `TRUE` (xáo trộn ngẫu nhiên thứ tự thẻ) hoặc `FALSE` (giữ nguyên thứ tự dòng trong file Excel).
* **`study_sfx_enabled`**: `TRUE` (bật âm thanh hiệu ứng tương tác/chúc mừng) hoặc `FALSE`.
* **`study_quick_learn_enabled`**: `TRUE` (tự động chuyển thẻ kế tiếp ngay khi đánh giá) hoặc `FALSE`.
* **`study_haptic_enabled`**: `TRUE` (rung phản hồi nhẹ trên điện thoại di động) hoặc `FALSE`.
* **`study_show_fsrs`**: `TRUE` (hiển thị 4 nút đánh giá FSRS: Again, Hard, Good, Easy) hoặc `FALSE`.
* **`audio_speech_rate`**: Tốc độ phát giọng đọc TTS (từ `0.5` đến `2.0`, mặc định `1.0`).

### 2.3. Nhóm 3: Phân Nhóm Bài Học Con & Cột Động (Sub-lessons & Dynamic Columns)
* **`sub_lesson_enabled`**: `TRUE` (bật phân chia thẻ theo từng bài học/chương/unit nhỏ) hoặc `FALSE`.
* **`sub_lesson_column`**: Tên cột trong sheet `Data` dùng để phân nhóm bài học (thông thường là `unit` hoặc `lesson`, `chuong`, `bai`). Khi bật tính năng này, người học có thể chọn học riêng từng Unit hoặc học toàn bộ bộ thẻ!
* **`custom_columns`**: Danh sách tất cả các cột dữ liệu bổ sung trong sheet `Data` (phân cách bằng dấu phẩy). Ví dụ: `unit, pos, cách đọc, hán việt, nghĩa, câu ví dụ, cách đọc câu ví dụ, nghĩa câu ví dụ, english, từ vựng`.
* **`insight_columns`**: Danh sách các cột mẹo nhớ đặc biệt (phân cách bằng dấu phẩy). Các cột này sẽ được Vocaburn tự động render thành **khung thẻ mẹo nhớ (Insight Card Box)** nổi bật khi lật mặt sau thẻ! Ví dụ: `Cách Nhớ Từ Vựng, Cách nhớ Hán Tự, Cách nhớ cách đọc`.

---

## 🟢 3. Sheet `Data`: Danh Sách Thẻ Flashcard & Dữ Liệu Chi Tiết

Mỗi dòng trong sheet `Data` đại diện cho một thẻ flashcard độc lập.

### 3.1. Danh Sách Cột Khuyến Nghị (Header Chuẩn)
```text
id | unit | front | back | pos | cách đọc | hán việt | nghĩa | câu ví dụ | cách đọc câu ví dụ | nghĩa câu ví dụ | english | từ vựng | Cách Nhớ Từ Vựng | Cách nhớ Hán Tự | Cách nhớ cách đọc | front_audio_content | back_audio_content | front_audio_url | back_audio_url | front_img | back_img
```

### 3.2. Ý Nghĩa Chi Tiết Từng Cột
1. **`id`**: Mã định danh thẻ (để trống nếu muốn hệ thống tự động sinh ID ngẫu nhiên).
2. **`unit`**: **Tên bài học con (Sub-lesson)**. Ví dụ: `Unit 1: Khởi đầu mới`, `Unit 2: Vượt khó`... Khi có cột này, Vocaburn sẽ phân loại thẻ thành từng nhóm bài học nhỏ để học sinh học cuốn chiếu.
3. **`front`** *(Bắt buộc)*: Nội dung chính mặt trước của thẻ (Ví dụ: Từ vựng Kanji `契機`).
4. **`back`** *(Bắt buộc)*: Nội dung chính mặt sau của thẻ (Ví dụ: Định nghĩa `Cơ hội, động cơ, bước ngoặt`).
5. **`pos`**: Từ loại (Ví dụ: `Danh từ`, `Động từ nhóm 1`, `Tính từ -na`...).
6. **`cách đọc`**: Phiên âm Furigana/Hiragana/Romaji/Pinyin/IPA (Ví dụ: `けいき`).
7. **`hán việt`**: Âm Hán Việt (đối với tiếng Nhật/tiếng Trung) hoặc từ gốc (Ví dụ: `KHẾ CƠ`).
8. **`nghĩa`**: Giải thích nghĩa tường minh hoặc ngữ cảnh dùng từ.
9. **`câu ví dụ`**: Câu văn ví dụ thực tế sử dụng từ vựng.
10. **`cách đọc câu ví dụ`**: Phiên âm toàn bộ câu ví dụ để luyện đọc.
11. **`nghĩa câu ví dụ`**: Bản dịch tiếng Việt của câu ví dụ.
12. **`english`**: Nghĩa tiếng Anh tương đương (Ví dụ: `opportunity, occasion, turning point`).
13. **`từ vựng`**: Cột phụ trợ từ khóa gốc.
14. **`Cách Nhớ Từ Vựng`** *(Insight)*: Câu chuyện liên tưởng hoặc mẹo ghi nhớ từ vựng.
15. **`Cách nhớ Hán Tự`** *(Insight)*: Phân tích chiết tự các bộ thủ cấu thành chữ Hán.
16. **`Cách nhớ cách đọc`** *(Insight)*: Mẹo nhớ phát âm thông qua âm thanh tương đồng hoặc quy tắc chuyển âm.
17. **`front_audio_url` / `back_audio_url`**: Đường dẫn trực tiếp file âm thanh `.mp3` nếu có sẵn (nếu để trống, hệ thống sẽ dùng TTS tự động từ cấu hình sheet `Audio`).
18. **`front_img` / `back_img`**: Đường dẫn hình ảnh minh họa mặt trước hoặc mặt sau (hỗ trợ link ảnh Unsplash, Cloudinary, Imgur...).

> [!TIP]
> **Hỗ trợ công thức Excel (`=`)**:
> Bạn hoàn toàn có thể dùng các hàm Excel thông dụng như `=TRIM(B2)`, `=CONCATENATE(...)`, `=VLOOKUP(...)` trong sheet `Data`. Vocaburn có bộ biên dịch tự động đọc giá trị tính toán cuối cùng (`data_only=True`) nên công thức hoạt động trơn tru 100%!

---

## 🔵 4. Sheet `Practice`: Cấu Hình Luyện Tập Tương Tác Đa Dạng

Sheet `Practice` cho phép bạn tạo ra các bài kiểm tra trắc nghiệm, bài tập gõ chính tả và luyện nghe hoàn toàn tự động dựa trên các cột trong sheet `Data`:

### 4.1. Cấu Trúc Bảng Cấu Hình
| Cột | Ý nghĩa | Ví dụ giá trị |
| :--- | :--- | :--- |
| **`Mode`** | Loại hình bài tập | `mcq`, `typing`, `audio_mcq`, `audio_typing` |
| **`Question_Column`** | Cột trong `Data` lấy làm đề bài | `front`, `nghĩa`, `câu ví dụ`... |
| **`Answer_Column`** | Cột trong `Data` làm đáp án đúng | `nghĩa`, `front`, `cách đọc`... |
| **`Num_Choices`** | Số lượng đáp án trắc nghiệm | `4` (mặc định), `3`, hoặc `5` |
| **`Enabled`** | Kích hoạt chế độ bài tập | `TRUE` hoặc `FALSE` |
| **`Description`** | Ghi chú mô tả mục tiêu luyện tập | Văn bản tự do giải thích cho giáo viên/học viên |

### 4.2. Bảng 4 Chế Độ Luyện Tập Chuẩn
```text
Mode          | Question_Column | Answer_Column                      | Num_Choices | Enabled | Description
mcq           | front           | nghĩa                              | 4           | TRUE    | Trắc nghiệm: Nhìn từ vựng chọn nghĩa tiếng Việt
mcq           | nghĩa           | front                              | 4           | TRUE    | Trắc nghiệm đảo: Nhìn nghĩa tiếng Việt chọn từ vựng
typing        | nghĩa           | front, từ vựng, cách đọc, english  |             | TRUE    | Gõ từ vựng: Chấp nhận cả Kanji, Hiragana lẫn tiếng Anh
audio_mcq     | front           | nghĩa                              | 4           | TRUE    | Luyện nghe trắc nghiệm: Nghe phát âm chọn nghĩa đúng
audio_typing  | front           | front, cách đọc                    |             | TRUE    | Luyện nghe gõ chính tả (Dictation): Nghe và gõ lại từ
```

> [!IMPORTANT]
> **Chấp nhận nhiều đáp án cho chế độ gõ (`typing` & `audio_typing`)**:
> Khi cấu hình cột `Answer_Column` cho bài tập gõ, bạn có thể liệt kê nhiều cột hợp lệ cách nhau bằng dấu phẩy (Ví dụ: `front, từ vựng, cách đọc, english`). Học sinh gõ bất kỳ đáp án nào trong các cột này đều được hệ thống tính điểm chính xác!

---

## 🟠 5. Sheet `AI_Prompts`: Mẫu Câu Lệnh AI Trợ Giảng Tương Tác

Vocaburn tích hợp AI trực tiếp vào từng thẻ học. Bạn có thể định nghĩa các nút bấm AI trong sheet `AI_Prompts` để người học chỉ cần bấm 1 chạm là AI giải thích ngữ cảnh chi tiết ngay trên màn hình học:

### 5.1. Cấu Trúc Cột
* **`Column_Target`**: Tên cột kết quả hoặc định danh hành động (Ví dụ: `Cách Nhớ Từ Vựng`, `Cách nhớ Hán Tự`, `Giải thích ngữ cảnh`).
* **`Button_Title`**: Tên nút bấm hiển thị trên giao diện học (Ví dụ: `💡 Gợi Ý Mẹo Nhớ`, `🔍 Phân Tích Kanji`).
* **`Prompt_Template`**: Nội dung câu lệnh gửi tới AI. Bạn có thể sử dụng biến đại diện dạng `{tên_cột}` tương ứng với các cột trong sheet `Data`.

### 5.2. Mẫu Câu Lệnh Khuyến Nghị (Best Practice)
1. **Gợi ý cách nhớ từ vựng**:
   ```text
   Từ vựng: {front}
   Cách đọc: {cách đọc}
   Hán tự: {hán việt}
   Nghĩa: {nghĩa}
   
   Hãy giúp tôi sáng tạo 1 mẹo ghi nhớ từ vựng trên thật sinh động, hài hước và dễ thuộc nhất (sử dụng phương pháp liên tưởng âm thanh hoặc hình ảnh).
   ```
2. **Phân tích chiết tự Hán tự**:
   ```text
   Từ vựng: {front}
   Hán tự: {hán việt}
   Nghĩa: {nghĩa}
   
   Hãy phân tích chi tiết các bộ thủ cấu tạo nên chữ Hán này và kể một câu chuyện ngắn giúp ghi nhớ từng nét chữ.
   ```
3. **Đặt câu ví dụ thực tế trong giao tiếp**:
   ```text
   Từ vựng: {front} ({cách đọc})
   Nghĩa: {nghĩa}
   
   Hãy đặt 3 câu ví dụ từ cấp độ thường ngày đến trang trọng trong công sở có sử dụng từ vựng trên kèm dịch nghĩa tiếng Việt.
   ```

---

## 🟢 6. Sheet `Audio`: Cấu Hình Text-to-Speech (TTS) Tự Động

Sheet `Audio` giúp hệ thống tự động nhận diện và phát âm chuẩn bản xứ cho các thẻ từ vựng mà không cần bạn phải tự thu âm hoặc chèn thủ công từng file MP3:

| Cột | Giá trị mẫu 1 (Mặt trước) | Giá trị mẫu 2 (Mặt sau) | Ghi chú |
| :--- | :--- | :--- | :--- |
| **`Config_Name`** | `Front Audio (Tiếng Nhật)` | `Back Audio (Tiếng Việt)` | Tên cấu hình âm thanh |
| **`Source_Text_Column`** | `cách đọc` (hoặc `front`) | `nghĩa` (hoặc `back`) | Cột văn bản nguồn để đọc |
| **`Target_Audio_URL_Column`** | `front_audio_url` | `back_audio_url` | Cột lưu URL nếu có sẵn |
| **`Language_Or_Voice`** | `ja-JP` | `vi-VN` | Mã ngôn ngữ theo chuẩn BCP-47 |
| **`Speech_Rate`** | `1.0` | `1.0` | Tốc độ đọc (0.5 đến 2.0) |
| **`Enabled`** | `TRUE` | `TRUE` | Trạng thái kích hoạt |

---

## ⚫ 7. Sheet `Collaborators`: Quản Lý Cộng Tác Viên Biên Soạn

Cho phép phân quyền những người dùng khác trong hệ thống cùng truy cập và chỉnh sửa bộ thẻ:
* **`Username_Or_Email`**: Tên đăng nhập (SSO username) hoặc địa chỉ email của cộng tác viên.
* **`Role`**:
  * `editor`: Có toàn quyền thêm, sửa, xóa thẻ và điều chỉnh cấu hình bộ thẻ.
  * `viewer`: Chỉ có quyền học và xem trước, không thể thay đổi dữ liệu.

---

## 🚀 8. Quy Trình Sử Dụng & Nhập File Vào Vocaburn

1. **Bước 1**: Tải file mẫu chuẩn `Vocaburn_Template.xlsx` về máy tính từ nút **"Download Excel Template"** trên giao diện Vocaburn hoặc từ thư mục [`Vocaburn/templates/`](file:///c:/Users/thanh/OneDrive/CodeHub/Ecosystem/Vocaburn/templates/).
2. **Bước 2**: Mở file bằng Microsoft Excel, Google Sheets, WPS Office hoặc LibreOffice.
3. **Bước 3**: Điền tiêu đề, danh mục ở sheet `Info`. Nhập danh sách từ vựng, Kanji, nghĩa và bài học con (`unit`) ở sheet `Data`.
4. **Bước 4**: Lưu file dưới định dạng `.xlsx`.
5. **Bước 5**: Trên giao diện web Vocaburn, chọn **"Create Deck" ➜ Kéo thả file Excel vào ô Upload**.
6. **Bước 6**: Hệ thống sẽ hiển thị bảng **Xem trước dữ liệu (Interactive Preview)** kiểm tra số lượng thẻ, bài học con và các chế độ luyện tập.
7. **Bước 7**: Bấm **"Save & Create Deck"** để hoàn tất. Bộ thẻ của bạn đã sẵn sàng cho FSRS v6, Flashcard và 4 chế độ Practice!
