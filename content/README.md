# Cách đăng một câu chuyện mới

Không cần build, không cần cài gì. Thêm file → push → xong.

## 1. Chuẩn bị ảnh

Tạo thư mục riêng cho bài, tên thư mục **trùng với slug** của bài:

```
assets/stories/<slug>/
```

Nén ảnh sang `.webp` trước khi bỏ vào (ảnh gốc từ điện thoại 3–6 MB, sau khi nén còn
~200 KB). Trên máy có ImageMagick:

```bash
magick input.jpg -resize 1600x1600\> -quality 82 assets/stories/<slug>/01-ten-anh.webp
```

Quy ước đặt tên: `01-`, `02-`… để ảnh tự sắp đúng thứ tự khi nhìn trong thư mục.

## 2. Viết nội dung — mỗi ngôn ngữ một file

```
content/stories/<slug>.en.md    ← bắt buộc (bản dự phòng khi thiếu bản dịch)
content/stories/<slug>.vi.md    ← tuỳ chọn
```

Người xem bấm nút **EN / VI** trên đầu trang thì trang tự nạp file tương ứng. Nếu chưa
viết bản `vi`, trang sẽ hiển thị bản `en` thay thế — không bị vỡ.

## 3. Khai báo bài vào mục lục

Thêm một object vào đầu mảng trong `content/stories.json`:

```json
{
  "slug": "ten-bai-khong-dau",
  "date": "2026-07-23",
  "cover": "assets/stories/ten-bai-khong-dau/01-anh-bia.webp",
  "title":    { "en": "...", "vi": "..." },
  "summary":  { "en": "...", "vi": "..." },
  "place":    { "en": "...", "vi": "..." },
  "tags":     { "en": ["Life"], "vi": ["Đời sống"] },
  "coverAlt": { "en": "...", "vi": "..." }
}
```

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `slug` | string, chỉ `a-z 0-9 -` | Định danh bài. Dùng làm tên file `.md`, tên thư mục ảnh, và tham số URL `stories.html?s=<slug>` |
| `date` | string `YYYY-MM-DD` | Ngày tạo bài. Hiển thị trên trang và dùng để sắp xếp (mới nhất lên đầu) |
| `cover` | đường dẫn ảnh | Ảnh bìa trên trang danh sách |
| `coverAlt` | song ngữ | Mô tả ảnh bìa cho trình đọc màn hình — bắt buộc |
| `place`, `tags` | song ngữ | Hiện trên dòng meta, cạnh ngày tháng |

Thứ tự trong file JSON không quan trọng — trang tự sắp theo `date` giảm dần.

## 4. Cú pháp Markdown được hỗ trợ

Đây là **một tập con của Markdown** do `stories.js` tự dịch (không dùng thư viện ngoài).
Toàn bộ nội dung được escape trước khi dịch, nên viết HTML thẳng trong `.md` sẽ **không**
chạy — đó là chủ ý, để nội dung không bao giờ chèn được script vào trang.

| Viết | Ra cái gì |
|---|---|
| `## Tiêu đề` / `### Tiêu đề nhỏ` | Heading |
| Đoạn văn cách nhau bằng **một dòng trống** | `<p>` |
| `**đậm**`, `*nghiêng*`, `` `code` `` | Định dạng chữ |
| `[chữ hiển thị](https://…)` | Link (link ngoài tự mở tab mới) |
| `> trích dẫn` | Blockquote cỡ lớn |
| `- mục` | Danh sách |
| `---` | Đường kẻ ngang |
| `![mô tả ảnh](assets/stories/<slug>/anh.webp)` | Ảnh tràn rộng ra ngoài cột chữ |
| Hai/ba dòng ảnh **liền nhau** (không có dòng trống) | Lưới ảnh nằm cạnh nhau |
| `@youtube:VIDEO_ID Chú thích` | Video YouTube dạng bấm-mới-tải |

Hai quy ước bắt buộc:

- **Ảnh luôn phải có mô tả trong `![...]`.** Test sẽ fail nếu để trống.
- **Video không tự host.** Upload lên YouTube (để *Unlisted* nếu không muốn công khai) rồi
  dán ID vào `@youtube:`. Trang chỉ tải ảnh thumbnail; người xem bấm mới nạp iframe thật.

## 5. Kiểm tra trước khi push

```bash
node --test "tests/*.test.cjs"
```

Bộ test tự kiểm: mọi ảnh được nhắc trong `.md` có tồn tại thật không, có mô tả chưa, cả
hai ngôn ngữ đã đủ field chưa, bản dịch có dùng đúng bộ ảnh theo đúng thứ tự không.

Xem thử bằng mắt (phải chạy qua server, mở thẳng file `.html` sẽ không nạp được nội dung
vì trình duyệt chặn `fetch` trên `file://`):

```bash
python3 -m http.server 8765
```

Rồi mở `http://localhost:8765/stories.html`.
