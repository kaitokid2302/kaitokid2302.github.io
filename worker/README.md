# dtr-analytics

Đếm lượt truy cập cho trang tĩnh trên GitHub Pages, chạy bằng Cloudflare Worker + D1.

Đang chạy tại: `https://dtr-analytics.mra2322001-raycast-relay.workers.dev`

```
[kaitokid2302.github.io]  --sendBeacon-->  [Worker]  --SQL-->  [D1]
                                              ^
                                              | fetch /stats
                                    [stats.html mở local]
```

Trang HTML vẫn ở nguyên GitHub Pages. Worker và D1 chạy trên Cloudflare (24/7,
không ngủ). `stats.html` mở bằng double-click trên máy, dữ liệu vẫn lấy từ cloud.

## Setup (làm một lần)

Chạy từ trong thư mục `worker/`:

```bash
cd worker && npm install
```

**1. Tạo database**

```bash
npx wrangler d1 create dtr-analytics
```

Lệnh in ra một `database_id`. Mở `wrangler.jsonc`, thay `PASTE_DATABASE_ID_HERE`
bằng id đó.

**2. Tạo bảng**

```bash
npx wrangler d1 execute dtr-analytics --remote --file=schema.sql
```

**3. Đặt mật khẩu cho trang stats**

```bash
npx wrangler secret put STATS_KEY
```

Nó hỏi giá trị — gõ một chuỗi bất kỳ tự nghĩ ra (đây là mật khẩu để xem số liệu).
Không viết chuỗi này vào bất kỳ file nào trong repo.

**4. Deploy**

```bash
npx wrangler deploy
```

In ra URL dạng `https://dtr-analytics.<subdomain>.workers.dev`. Copy lại.

**5. Nối trang chính vào Worker**

Mở `../script.js`, tìm dòng:

```js
const ANALYTICS_ENDPOINT = "";
```

Dán URL ở bước 4 vào. Commit và push — GitHub Pages tự cập nhật.

## Xem số liệu

Double-click `stats.html`. Lần đầu nó hỏi URL Worker và `STATS_KEY`; nhập xong
trình duyệt nhớ luôn cho các lần sau.

## Bảng `visits`

| Cột | Nghĩa |
|---|---|
| `ts` | Thời điểm ISO |
| `ip` | IP khách (Cloudflare đưa qua header `CF-Connecting-IP`) |
| `country` / `city` / `isp` | Cloudflare tự nhận diện từ IP, không cần API ngoài |
| `vid` | UUID trang tự phát, lưu trong localStorage khách — nhận diện khách quay lại |
| `fp` | Fingerprint trình duyệt (hash 16 ký tự). Safari/Brave làm nhiễu → chỉ đúng ~40–60% |
| `path` / `referrer` | Trang nào, tới từ đâu |

## Lệnh hay dùng

```bash
npx wrangler tail                    # xem log real-time
npm run schema                       # chạy lại schema.sql
npx wrangler d1 execute dtr-analytics --remote --command "SELECT COUNT(*) FROM visits"
```

## Giới hạn free tier

100.000 request/ngày cho Worker, 5GB cho D1. Không cần thẻ tín dụng, vượt quota
thì Cloudflare chặn request chứ không tính tiền.
