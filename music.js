const MUSIC_INDEX_PATH = "content/music.json";
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const FALLBACK_LANGUAGE = "en";
const PLAYING_KEY = "music-playing";
const PLAYER_HEIGHT = 152;

// Chỉ nhận đúng những loại nội dung Spotify cho nhúng, và id đúng 22 ký tự base62.
// Khắt khe ở đây để một link lạ trong music.json không thể đẩy URL tuỳ ý vào iframe.
const SPOTIFY_ORIGIN = "https://open.spotify.com";
const SPOTIFY_TYPES = ["track", "album", "playlist", "episode"];
const SPOTIFY_PATTERN = new RegExp(
  `^https://open\\.spotify\\.com/(?:intl-[a-z]{2}/)?(${SPOTIFY_TYPES.join("|")})/([A-Za-z0-9]{22})(?:[/?].*)?$`
);

const musicCopy = {
  en: {
    emptyTitle: "No playlists yet.",
    emptyText: "The file that holds them is empty.",
    errorTitle: "Playlists did not load.",
    errorText: "Reload the page, or come back later.",
    listEmpty: "This list is still empty.",
    trackCount: (n) => `${n} ${n === 1 ? "track" : "tracks"}`,
    play: (title, artist) => `Play ${title} by ${artist}`,
    nowPlaying: "Now playing",
    preview: "Spotify plays 30 seconds unless you are signed in."
  },
  vi: {
    emptyTitle: "Chưa có danh sách nào.",
    emptyText: "File chứa danh sách đang rỗng.",
    errorTitle: "Không tải được danh sách nhạc.",
    errorText: "Tải lại trang, hoặc quay lại sau.",
    listEmpty: "Danh sách này vẫn còn trống.",
    trackCount: (n) => `${n} bài`,
    play: (title, artist) => `Phát ${title} của ${artist}`,
    nowPlaying: "Đang phát",
    preview: "Spotify chỉ phát 30 giây, trừ khi bạn đã đăng nhập."
  }
};

const shell = document.querySelector("[data-music-shell]");
const statusView = document.querySelector("[data-music-status]");
const tabsElement = document.querySelector("[data-playlist-tabs]");
const listElement = document.querySelector("[data-track-list]");
const emptyElement = document.querySelector("[data-playlist-empty]");
const titleElement = document.querySelector("[data-playlist-title]");
const noteElement = document.querySelector("[data-playlist-note]");
const countElement = document.querySelector("[data-playlist-count]");
const player = document.querySelector("[data-player]");
const playerFrame = document.querySelector("[data-player-frame]");
const playerNote = document.querySelector("[data-player-note]");
const playerClose = document.querySelector("[data-player-close]");

let playlists = [];
let activeSlug = null;
let playing = null;
let embedApi = null;
let controller = null;
let wantsPlay = false;

function activeLanguage() {
  return document.documentElement.lang === "vi" ? "vi" : FALLBACK_LANGUAGE;
}

function dictionary() {
  return musicCopy[activeLanguage()];
}

// Playlist fields are written as { en: "...", vi: "..." }; plain values are shared.
function pick(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[activeLanguage()] ?? value[FALLBACK_LANGUAGE] ?? "";
  }

  return value ?? "";
}

function parseSpotify(url) {
  const match = typeof url === "string" ? url.match(SPOTIFY_PATTERN) : null;

  return match ? { type: match[1], id: match[2] } : null;
}

function embedUrl(link) {
  return `${SPOTIFY_ORIGIN}/embed/${link.type}/${link.id}?utm_source=generator`;
}

function embedUri(link) {
  return `spotify:${link.type}:${link.id}`;
}

function showStatus(titleKey, textKey) {
  const copy = dictionary();

  shell.hidden = true;
  statusView.hidden = false;
  statusView.textContent = `${copy[titleKey]} ${copy[textKey]}`;
}

function playableTracks(playlist) {
  return (playlist.tracks ?? [])
    .map((track) => ({ ...track, link: parseSpotify(track.spotify) }))
    .filter((track) => track.link);
}

// Đánh dấu theo id bài, không theo danh sách: một bài nằm ở hai danh sách thì cả hai
// chỗ đều sáng lên khi nó đang phát.
function playingKey() {
  return playing ? playing.link.id : null;
}

function renderTabs() {
  tabsElement.replaceChildren(
    ...playlists.map((playlist, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "playlist-tab";
      button.dataset.slug = playlist.slug;

      const number = document.createElement("span");
      number.className = "playlist-tab-index";
      number.textContent = String(index + 1).padStart(2, "0");

      const label = document.createElement("span");
      label.textContent = pick(playlist.title);

      button.append(number, label);
      button.setAttribute("aria-pressed", String(playlist.slug === activeSlug));
      button.addEventListener("click", () => selectPlaylist(playlist.slug, true));

      return button;
    })
  );
}

function renderTracks(playlist) {
  const copy = dictionary();
  const tracks = playableTracks(playlist);
  const key = playingKey();

  titleElement.textContent = pick(playlist.title);
  noteElement.textContent = pick(playlist.note);
  countElement.textContent = tracks.length ? copy.trackCount(tracks.length) : "";
  countElement.hidden = !tracks.length;

  emptyElement.textContent = copy.listEmpty;
  emptyElement.hidden = tracks.length > 0;
  listElement.hidden = !tracks.length;

  listElement.replaceChildren(
    ...tracks.map((track, index) => {
      const item = document.createElement("li");
      item.className = "track";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "track-button";
      button.dataset.key = track.link.id;
      button.setAttribute("aria-label", copy.play(track.title, track.artist));
      button.setAttribute("aria-pressed", String(button.dataset.key === key));

      const number = document.createElement("span");
      number.className = "track-index";
      number.textContent = String(index + 1).padStart(2, "0");
      number.setAttribute("aria-hidden", "true");

      const text = document.createElement("span");
      text.className = "track-text";

      const title = document.createElement("span");
      title.className = "track-title";
      title.textContent = track.title;

      const artist = document.createElement("span");
      artist.className = "track-artist";
      artist.textContent = track.artist;

      text.append(title, artist);

      // Nhãn "Playlist"/"Album" để người xem biết bấm vào sẽ ra cả tập, không phải một bài.
      const badge = document.createElement("span");
      badge.className = "track-badge";
      badge.textContent = track.link.type === "track" ? "" : track.link.type;

      const icon = document.createElement("span");
      icon.className = "track-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.append(...Array.from({ length: 3 }, () => document.createElement("i")));

      button.append(number, text, badge, icon);
      button.addEventListener("click", () => play(playlist.slug, track));

      item.append(button);
      return item;
    })
  );
}

function markPlaying() {
  const key = playingKey();

  listElement.querySelectorAll(".track-button").forEach((button) => {
    const isPlaying = button.dataset.key === key;
    button.setAttribute("aria-pressed", String(isPlaying));
    button.closest(".track")?.classList.toggle("is-playing", isPlaying);
  });
}

function labelFrame() {
  const frame = playerFrame.querySelector("iframe");
  if (!frame || !playing) return;

  frame.title = `${dictionary().nowPlaying}: ${playing.title} — ${playing.artist}`;
}

// Controller của Spotify cho phép nạp bài mới vào đúng iframe đang mở và bấm play ngay,
// nên tiếng nhạc không đứt khi người nghe bấm sang bài khác.
function mountController(autoplay) {
  wantsPlay = autoplay;
  const uri = embedUri(playing.link);

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

// Dự phòng cho lúc script iframe-api của Spotify không tải được: vẫn nhúng được,
// chỉ mất khả năng tự phát.
function mountFrame() {
  const frame = document.createElement("iframe");
  frame.src = embedUrl(playing.link);
  frame.loading = "lazy";
  frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  frame.setAttribute("frameborder", "0");

  playerFrame.replaceChildren(frame);
  labelFrame();
}

function openPlayer(autoplay) {
  playerNote.textContent = dictionary().preview;
  player.hidden = false;
  document.body.classList.add("has-player");

  if (embedApi) mountController(autoplay);
  else mountFrame();
}

function remember() {
  try {
    sessionStorage.setItem(PLAYING_KEY, `${playing.slug}:${playing.link.id}`);
  } catch {}
}

function forget() {
  try {
    sessionStorage.removeItem(PLAYING_KEY);
  } catch {}
}

function play(slug, track) {
  playing = { slug, link: track.link, title: track.title, artist: track.artist };
  remember();
  openPlayer(true);
  markPlaying();
}

function stop() {
  playing = null;
  forget();
  controller?.destroy?.();
  controller = null;
  playerFrame.replaceChildren();
  player.hidden = true;
  document.body.classList.remove("has-player");
  markPlaying();
}

// Rời trang rồi quay lại thì dựng lại đúng bài đó trong thanh phát. Chỉ đọc slug và id
// từ sessionStorage rồi tra ngược trong music.json, nên không có URL lạ nào vào được iframe.
function restore() {
  let stored = null;

  try {
    stored = sessionStorage.getItem(PLAYING_KEY);
  } catch {}

  if (!stored) return;

  const [slug, id] = stored.split(":");
  const playlist = playlists.find((entry) => entry.slug === slug);
  const track = playlist && playableTracks(playlist).find((entry) => entry.link.id === id);

  if (!track) return;

  playing = { slug, link: track.link, title: track.title, artist: track.artist };
  openPlayer(false);
}

// Đổi tab thì đẩy một mục vào history, để back/forward chuyển qua lại giữa các danh sách
// mà không tải lại trang — nhạc trong iframe vẫn chạy tiếp.
function selectPlaylist(slug, push = false) {
  const playlist = playlists.find((entry) => entry.slug === slug) ?? playlists[0];
  if (!playlist) return;

  activeSlug = playlist.slug;

  const url = new URL(window.location.href);
  url.searchParams.set("p", activeSlug);

  if (push && url.href !== window.location.href) {
    window.history.pushState({ playlist: activeSlug }, "", url);
  } else {
    window.history.replaceState({ playlist: activeSlug }, "", url);
  }

  renderTabs();
  renderTracks(playlist);
  markPlaying();
}

function render() {
  if (!playlists.length) {
    showStatus("emptyTitle", "emptyText");
    return;
  }

  statusView.hidden = true;
  shell.hidden = false;
  selectPlaylist(activeSlug ?? new URL(window.location.href).searchParams.get("p"));
}

async function boot() {
  try {
    const response = await fetch(MUSIC_INDEX_PATH);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const parsed = await response.json();

    playlists = (Array.isArray(parsed) ? parsed : []).filter(
      (playlist) => typeof playlist?.slug === "string" && SLUG_PATTERN.test(playlist.slug)
    );

    render();
    restore();
    markPlaying();
  } catch {
    showStatus("errorTitle", "errorText");
  }
}

window.onSpotifyIframeApiReady = (api) => {
  embedApi = api;
};

const apiScript = document.createElement("script");
apiScript.src = `${SPOTIFY_ORIGIN}/embed/iframe-api/v1`;
apiScript.async = true;
document.head.append(apiScript);

playerClose?.addEventListener("click", stop);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !player.hidden) stop();
});

window.addEventListener("popstate", () => {
  if (playlists.length) selectPlaylist(new URL(window.location.href).searchParams.get("p"));
});

// Đổi ngôn ngữ trên masthead thì vẽ lại nhãn, giữ nguyên bài đang phát.
document.addEventListener("site:language", () => {
  if (!playlists.length) return;

  render();
  markPlaying();

  if (playing) {
    playerNote.textContent = dictionary().preview;
    labelFrame();
  }
});

boot();
