// Thanh phát nhạc dùng chung cho cả site. Nó nằm ngoài <main> nên router đổi trang
// không đụng tới nó, và tiếng nhạc chạy liên tục khi người xem đi sang trang khác.

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
const playerClose = document.querySelector("[data-player-close]");

let playing = null;
let embedApi = null;
let controller = null;
let wantsPlay = false;

function playerDictionary() {
  return playerCopy[document.documentElement.lang === "vi" ? "vi" : "en"];
}

function parseSpotify(url) {
  const match = typeof url === "string" ? url.match(SPOTIFY_PATTERN) : null;

  return match ? { type: match[1], id: match[2] } : null;
}

function announce() {
  document.dispatchEvent(new CustomEvent("site:track", { detail: playing }));
}

function labelFrame() {
  const frame = playerFrame?.querySelector("iframe");
  if (!frame || !playing) return;

  frame.title = `${playerDictionary().nowPlaying}: ${playing.title} — ${playing.artist}`;
}

// Controller của Spotify cho phép nạp bài mới vào đúng iframe đang mở và bấm play ngay,
// nên tiếng nhạc không đứt khi người nghe bấm sang bài khác.
function mountController(autoplay) {
  wantsPlay = autoplay;
  const uri = `spotify:${playing.type}:${playing.id}`;

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
    created.addListener("ready", () => {
      labelFrame();
      if (wantsPlay) created.play();
    });
  });
}

// Dự phòng cho lúc script iframe-api của Spotify chưa kịp tải: vẫn nhúng được,
// chỉ mất khả năng tự phát.
function mountFrame() {
  const frame = document.createElement("iframe");
  frame.src = `${SPOTIFY_ORIGIN}/embed/${playing.type}/${playing.id}?utm_source=generator`;
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

  if (embedApi) mountController(autoplay);
  else mountFrame();
}

function remember() {
  try {
    sessionStorage.setItem(TRACK_KEY, JSON.stringify(playing));
  } catch {}
}

function forget() {
  try {
    sessionStorage.removeItem(TRACK_KEY);
  } catch {}
}

function play(link, title, artist) {
  if (!player) return;

  playing = { type: link.type, id: link.id, title, artist };
  remember();
  openPlayer(true);
  announce();
}

function stop() {
  playing = null;
  forget();
  controller?.destroy?.();
  controller = null;
  playerFrame.replaceChildren();
  player.hidden = true;
  document.body.classList.remove("has-player");
  announce();
}

// Tải lại trang thật thì dựng lại đúng bài đó trong thanh phát. Loại và id được kiểm
// lại theo đúng luật của link Spotify, nên không có URL lạ nào vào được iframe.
function restore() {
  let stored = null;

  try {
    stored = JSON.parse(sessionStorage.getItem(TRACK_KEY) ?? "null");
  } catch {}

  if (!stored || !SPOTIFY_TYPES.includes(stored.type) || !SPOTIFY_ID.test(stored.id ?? "")) return;

  playing = {
    type: stored.type,
    id: stored.id,
    title: String(stored.title ?? ""),
    artist: String(stored.artist ?? "")
  };

  openPlayer(false);
  announce();
}

window.sitePlayer = {
  parse: parseSpotify,
  play,
  stop,
  current: () => playing
};

if (player) {
  window.onSpotifyIframeApiReady = (api) => {
    embedApi = api;
  };

  const apiScript = document.createElement("script");
  apiScript.src = `${SPOTIFY_ORIGIN}/embed/iframe-api/v1`;
  apiScript.async = true;
  document.head.append(apiScript);

  playerClose.addEventListener("click", stop);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !player.hidden) stop();
  });

  document.addEventListener("site:language", () => {
    if (!playing) return;

    playerNote.textContent = playerDictionary().preview;
    labelFrame();
  });

  restore();
}
