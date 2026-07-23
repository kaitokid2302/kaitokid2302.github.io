/**
 * dtr-analytics — Worker nhận beacon từ trang tĩnh và trả số liệu cho stats.html
 *
 * Hai route:
 *   POST /            → nhận 1 lượt xem trang, ghi vào D1
 *   GET  /stats       → trả JSON báo cáo (cần header X-Stats-Key)
 */

// Origin của trang tĩnh được phép bắn beacon về đây.
const SITE_ORIGIN = "https://kaitokid2302.github.io";

// Cắt bớt chuỗi quá dài để không ai nhồi rác vào DB.
const cut = (value, max) =>
  typeof value === "string" && value.length > 0 ? value.slice(0, max) : null;

function corsHeaders(origin) {
  return {
    // stats.html mở bằng file:// nên Origin là "null" → phải dùng "*".
    // An toàn vì /stats đã có X-Stats-Key chặn, còn POST / chỉ ghi thêm dòng.
    "Access-Control-Allow-Origin": origin === SITE_ORIGIN ? SITE_ORIGIN : "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Stats-Key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

async function collect(request, env, headers) {
  // sendBeacon gửi dạng text/plain nên không bị preflight; tự parse JSON ở đây.
  const raw = await request.text();
  if (raw.length > 4000) return new Response(null, { status: 413, headers });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400, headers });
  }

  const cf = request.cf ?? {};

  await env.DB.prepare(
    `INSERT INTO visits (ts, ip, country, city, isp, vid, fp, path, referrer, ua, screen, tz)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      new Date().toISOString(),
      request.headers.get("CF-Connecting-IP"),
      cut(cf.country, 8),
      cut(cf.city, 80),
      cut(cf.asOrganization, 120),
      cut(body.vid, 40),
      cut(body.fp, 40),
      cut(body.path, 200),
      cut(body.referrer, 300),
      cut(request.headers.get("User-Agent"), 400),
      cut(body.screen, 40),
      cut(body.tz, 60)
    )
    .run();

  return new Response(null, { status: 204, headers });
}

const authorized = (request, env) =>
  Boolean(env.STATS_KEY) && request.headers.get("X-Stats-Key") === env.STATS_KEY;

// Xoá sạch bảng visits. Không hoàn tác được — stats.html hỏi xác nhận trước khi gọi.
async function reset(request, env, headers) {
  if (!authorized(request, env)) {
    return Response.json({ error: "Sai key" }, { status: 403, headers });
  }

  const result = await env.DB.prepare(`DELETE FROM visits`).run();

  return Response.json({ deleted: result.meta?.changes ?? 0 }, { headers });
}

async function stats(request, env, headers) {
  if (!authorized(request, env)) {
    return Response.json({ error: "Sai key" }, { status: 403, headers });
  }

  const days = Math.min(
    Number(new URL(request.url).searchParams.get("days")) || 30,
    365
  );
  const since = `-${days} days`;

  const rows = (result) => result.results ?? [];

  const [totals, daily, pages, countries, referrers, browsers, recent] =
    await env.DB.batch([
      env.DB.prepare(
        `SELECT COUNT(*) AS hits,
                COUNT(DISTINCT vid) AS visitors,
                COUNT(DISTINCT ip) AS ips
         FROM visits WHERE ts > datetime('now', ?)`
      ).bind(since),

      env.DB.prepare(
        `SELECT date(ts) AS day, COUNT(*) AS hits, COUNT(DISTINCT vid) AS visitors
         FROM visits WHERE ts > datetime('now', ?)
         GROUP BY day ORDER BY day`
      ).bind(since),

      env.DB.prepare(
        `SELECT COALESCE(path, '(trống)') AS label, COUNT(*) AS hits
         FROM visits WHERE ts > datetime('now', ?)
         GROUP BY label ORDER BY hits DESC LIMIT 10`
      ).bind(since),

      env.DB.prepare(
        `SELECT COALESCE(country, '?') AS label, COUNT(*) AS hits
         FROM visits WHERE ts > datetime('now', ?)
         GROUP BY label ORDER BY hits DESC LIMIT 10`
      ).bind(since),

      env.DB.prepare(
        `SELECT CASE
                  WHEN referrer IS NULL OR referrer = '' THEN '(truy cập thẳng)'
                  ELSE referrer
                END AS label,
                COUNT(*) AS hits
         FROM visits WHERE ts > datetime('now', ?)
         GROUP BY label ORDER BY hits DESC LIMIT 10`
      ).bind(since),

      env.DB.prepare(
        `SELECT CASE
                  WHEN ua LIKE '%Edg/%'     THEN 'Edge'
                  WHEN ua LIKE '%Chrome/%'  THEN 'Chrome'
                  WHEN ua LIKE '%Firefox/%' THEN 'Firefox'
                  WHEN ua LIKE '%Safari/%'  THEN 'Safari'
                  ELSE 'Khác'
                END AS label,
                COUNT(*) AS hits
         FROM visits WHERE ts > datetime('now', ?)
         GROUP BY label ORDER BY hits DESC`
      ).bind(since),

      env.DB.prepare(
        `SELECT ts, ip, country, city, isp, path, referrer, vid
         FROM visits ORDER BY id DESC LIMIT 50`
      ),
    ]);

  return Response.json(
    {
      days,
      totals: rows(totals)[0] ?? { hits: 0, visitors: 0, ips: 0 },
      daily: rows(daily),
      pages: rows(pages),
      countries: rows(countries),
      referrers: rows(referrers),
      browsers: rows(browsers),
      recent: rows(recent),
    },
    { headers }
  );
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request.headers.get("Origin"));
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { headers });

    try {
      if (url.pathname === "/stats") return await stats(request, env, headers);
      if (url.pathname === "/reset" && request.method === "POST")
        return await reset(request, env, headers);
      if (request.method === "POST") return await collect(request, env, headers);
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 500, headers });
    }

    return new Response("dtr-analytics", { headers });
  },
};
