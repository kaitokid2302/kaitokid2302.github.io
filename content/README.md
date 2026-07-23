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

---

# Cách thêm một playlist nhạc

Sửa đúng một file: `content/music.json`. Không cần build, không cần upload nhạc.

## 1. Lấy link Spotify

Trên app hoặc web Spotify: bấm `...` ở bài/playlist → **Share** → **Copy link**. Ra dạng:

```
https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp?si=abc123
```

Phần `?si=...` giữ hay bỏ đều được. Nhận cả 4 loại: `track`, `album`, `playlist`, `episode`.

## 2. Thêm vào JSON

```json
{
  "slug": "ten-list-khong-dau",
  "title": { "en": "...", "vi": "..." },
  "note":  { "en": "...", "vi": "..." },
  "tracks": [
    {
      "title": "Mr. Brightside",
      "artist": "The Killers",
      "spotify": "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp"
    }
  ]
}
```

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| `slug` | string, chỉ `a-z 0-9 -` | Định danh list. Dùng cho link chia sẻ `music.html?p=<slug>` |
| `title`, `note` | song ngữ | Tên và mô tả list. Bắt buộc đủ cả `en` lẫn `vi` |
| `tracks[].title` | string | Tên bài — **phải tự gõ**, trang không hỏi Spotify để lấy tên |
| `tracks[].artist` | string | Nghệ sĩ — cũng phải tự gõ |
| `tracks[].spotify` | URL | Link copy ở bước 1 |

Thứ tự trong mảng chính là thứ tự hiển thị. Playlist đầu tiên là playlist mở sẵn.

## 3. Vì sao phải tự gõ tên bài

Trang **không gọi API Spotify**. Nếu tự lấy tên thì mỗi lần mở trang phải bắn thêm một
request cho từng bài, chậm và dễ hỏng khi Spotify đổi API. Đổi lại, danh sách hiện ra tức
thì, và chỉ khi người xem bấm vào một bài thì iframe Spotify mới được tải.

## 4. Điều cần biết trước khi khoe với người khác

**Người chưa đăng nhập Spotify chỉ nghe được 30 giây mỗi bài.** Đây là giới hạn của
Spotify, không phải lỗi của trang — chính player hiển thị nhãn `Preview`. Ai đã đăng nhập
Spotify trên trình duyệt đó thì nghe đầy đủ. Không có cách nào lách, kể cả trả tiền.

Iframe do Spotify phục vụ, nên khi người xem bấm phát thì Spotify nhìn thấy họ. Trang chỉ
tải iframe sau cú bấm đầu tiên, chưa bấm thì chưa gửi gì sang Spotify.

## 5. Kiểm tra trước khi push

```bash
node --test "tests/*.test.cjs"
```

Test tự bắt: slug trùng nhau, thiếu bản dịch, thiếu tên bài hoặc nghệ sĩ, link Spotify sai
định dạng, cùng một link bị lặp trong một list, và `music.js` lỡ trỏ sang host lạ.

Xem thử bằng mắt (phải chạy qua server, mở thẳng file sẽ không nạp được JSON):

```bash
python3 -m http.server 8765
```

Rồi mở `http://localhost:8765/music.html`.
