// Thanh phát nhạc dùng chung cho cả site. Nó nằm ngoài <main> nên router đổi trang
// không đụng tới nó, và tiếng nhạc chạy liên tục khi người xem đi sang trang khác.
// Nó giữ luôn cả hàng đợi của danh sách đang nghe, nên tự chạy sang bài kế tiếp.

const SPOTIFY_ORIGIN = "https://open.spotify.com";
const SPOTIFY_TYPES = ["track", "album", "playlist", "episode"];
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

// Chỉ nhận đúng những loại nội dung Spotify cho nhúng, và id đúng 22 ký tự base62.
// Khắt khe ở đây để một link lạ trong music.json không thể đẩy URL tuỳ ý vào iframe.
const SPOTIFY_PATTERN = new RegExp(
  `^https://open\\.spotify\\.com/(?:intl-[a-z]{2}/)?(${SPOTIFY_TYPES.join("|")})/([A-Za-z0-9]{22})(?:[/?].*)?$`
);

const TRACK_KEY = "music-playing";
const PLAYER_HEIGHT = 152;

const playerCopy = {
  en: {
    nowPlaying: "Now playing",
    preview: "Spotify plays 30 seconds unless you are signed in."
  },
  vi: {
    nowPlaying: "Đang phát",
    preview: "Spotify chỉ phát 30 giây, trừ khi bạn đã đăng nhập."
  }
};

const player = document.querySelector("[data-player]");
const playerFrame = document.querySelector("[data-player-frame]");
const playerNote = document.querySelector("[data-player-note]");
const playerPrev = document.querySelector("[data-player-prev]");
const playerNext = document.querySelector("[data-player-next]");
const playerClose = document.querySelector("[data-player-close]");

let queue = [];
let index = -1;
let embedApi = null;
let controller = null;
let wantsPlay = false;
let lastPosition = 0;

function playerDictionary() {
  return playerCopy[document.documentElement.lang === "vi" ? "vi" : "en"];
}

function parseSpotify(url) {
  const match = typeof url === "string" ? url.match(SPOTIFY_PATTERN) : null;

  return match ? { type: match[1], id: match[2] } : null;
}

function playing() {
  return queue[index] ?? null;
}

function announce() {
  document.dispatchEvent(new CustomEvent("site:track", { detail: playing() }));
}

function labelFrame() {
  const frame = playerFrame?.querySelector("iframe");
  const track = playing();
  if (!frame || !track) return;

  frame.title = `${playerDictionary().nowPlaying}: ${track.title} — ${track.artist}`;
}

function updateSteps() {
  if (playerPrev) playerPrev.disabled = index <= 0;
  if (playerNext) playerNext.disabled = index < 0 || index >= queue.length - 1;
}

// Bài chạy hết: Spotify đẩy con trỏ đúng bằng độ dài (cờ isPaused lúc đó vẫn là false,
// nên không dùng được), hoặc kéo con trỏ về 0 rồi dừng. Người nghe tự bấm tạm dừng giữa
// bài thì không rơi vào cả hai kiểu, nên không bị nhảy bài oan.
function onPlayback(event) {
  const position = Number(event?.data?.position ?? 0);
  const duration = Number(event?.data?.duration ?? 0);
  const paused = Boolean(event?.data?.isPaused);

  const ended =
    duration > 0 && lastPosition > 0 && (position >= duration || (paused && position === 0));

  lastPosition = position;

  if (ended) step(1);
}

// Controller của Spotify cho phép nạp bài mới vào đúng iframe đang mở và bấm play ngay,
// nên tiếng nhạc không đứt khi người nghe bấm sang bài khác.
function mountController(autoplay) {
  wantsPlay = autoplay;
  lastPosition = 0;

  const track = playing();
  const uri = `spotify:${track.type}:${track.id}`;

  if (controller) {
    controller.loadUri(uri);
    if (autoplay) controller.play();
    labelFrame();
    return;
  }

  const host = document.createElement("div");
  playerFrame.replaceChildren(host);

  embedApi.createController(host, { uri, width: "100%", height: PLAYER_HEIGHT }, (created) => {
    controller = created;
    created.addListener("playback_update", onPlayback);
    created.addListener("ready", () => {
      labelFrame();
      if (wantsPlay) created.play();
    });
  });
}

// Dự phòng cho lúc script iframe-api của Spotify chưa kịp tải: vẫn nhúng được,
// chỉ mất khả năng tự phát và tự sang bài.
function mountFrame() {
  const track = playing();
  const frame = document.createElement("iframe");
  frame.src = `${SPOTIFY_ORIGIN}/embed/${track.type}/${track.id}?utm_source=generator`;
  frame.loading = "lazy";
  frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  frame.setAttribute("frameborder", "0");

  playerFrame.replaceChildren(frame);
  labelFrame();
}

function openPlayer(autoplay) {
  playerNote.textContent = playerDictionary().preview;
  player.hidden = false;
  document.body.classList.add("has-player");
  updateSteps();

  if (embedApi) mountController(autoplay);
  else mountFrame();
}

function remember() {
  try {
    sessionStorage.setItem(TRACK_KEY, JSON.stringify({ index, queue }));
  } catch {}
}

function forget() {
  try {
    sessionStorage.removeItem(TRACK_KEY);
  } catch {}
}

// Hết danh sách thì đứng lại ở bài cuối, không quay vòng.
function step(delta) {
  const target = index + delta;
  if (target < 0 || target >= queue.length) return;

  index = target;
  remember();
  openPlayer(true);
  announce();
}

function play(tracks, position) {
  if (!player) return;

  queue = tracks.map((track) => ({
    type: track.link.type,
    id: track.link.id,
    title: track.title,
    artist: track.artist
  }));
  index = position;

  if (!playing()) return;

  remember();
  openPlayer(true);
  announce();
}

function stop() {
  queue = [];
  index = -1;
  lastPosition = 0;
  forget();
  controller?.destroy?.();
  controller = null;
  playerFrame.replaceChildren();
  player.hidden = true;
  document.body.classList.remove("has-player");
  updateSteps();
  announce();
}

function validTrack(track) {
  return (
    track &&
    SPOTIFY_TYPES.includes(track.type) &&
    SPOTIFY_ID.test(track.id ?? "") && {
      type: track.type,
      id: track.id,
      title: String(track.title ?? ""),
      artist: String(track.artist ?? "")
    }
  );
}

// Tải lại trang thật thì dựng lại đúng bài đó và cả hàng đợi. Loại và id được kiểm
// lại theo đúng luật của link Spotify, nên không có URL lạ nào vào được iframe.
function restore() {
  let stored = null;

  try {
    stored = JSON.parse(sessionStorage.getItem(TRACK_KEY) ?? "null");
  } catch {}

  if (!Array.isArray(stored?.queue)) return;

  const restored = stored.queue.map(validTrack);
  if (!restored.length || !restored.every(Boolean)) return;

  queue = restored;
  index = Number.isInteger(stored.index) ? stored.index : 0;

  if (!playing()) return;

  openPlayer(false);
  announce();
}

window.sitePlayer = {
  parse: parseSpotify,
  play,
  stop,
  current: playing
};

if (player) {
  window.onSpotifyIframeApiReady = (api) => {
    embedApi = api;
  };

  const apiScript = document.createElement("script");
  apiScript.src = `${SPOTIFY_ORIGIN}/embed/iframe-api/v1`;
  apiScript.async = true;
  document.head.append(apiScript);

  playerPrev.addEventListener("click", () => step(-1));
  playerNext.addEventListener("click", () => step(1));
  playerClose.addEventListener("click", stop);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !player.hidden) stop();
  });

  document.addEventListener("site:language", () => {
    if (!playing()) return;

    playerNote.textContent = playerDictionary().preview;
    labelFrame();
  });

  restore();
}
