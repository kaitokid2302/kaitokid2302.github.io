-- Bảng lưu mỗi lượt xem trang.
-- Chạy MỘT LẦN lúc setup:
--   npx wrangler d1 execute dtr-analytics --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS visits (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       TEXT NOT NULL,  -- thời điểm ISO, vd "2026-07-23T09:14:22.481Z"
  ip       TEXT,           -- IP khách, Cloudflare đưa qua header CF-Connecting-IP
  country  TEXT,           -- mã 2 ký tự, vd "VN"
  city     TEXT,           -- vd "Hanoi"
  isp      TEXT,           -- nhà mạng, vd "Viettel Group"
  vid      TEXT,           -- visitor id: UUID trang tự phát, lưu trong localStorage khách
  fp       TEXT,           -- fingerprint: hash 16 ký tự từ đặc điểm trình duyệt
  path     TEXT,           -- trang nào, vd "/stories.html"
  referrer TEXT,           -- tới từ đâu, vd "https://www.google.com/"
  ua       TEXT,           -- User-Agent đầy đủ
  screen   TEXT,           -- vd "1512x982@2"
  tz       TEXT            -- vd "Asia/Ho_Chi_Minh"
);

CREATE INDEX IF NOT EXISTS idx_visits_ts  ON visits(ts);
CREATE INDEX IF NOT EXISTS idx_visits_vid ON visits(vid);
