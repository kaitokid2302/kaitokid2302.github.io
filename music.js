const MUSIC_INDEX_PATH = "content/music.json";
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const FALLBACK_LANGUAGE = "en";

// Chỉ nhận đúng những loại nội dung Spotify cho nhúng, và id đúng 22 ký tự base62.
// Khắt khe ở đây để một link lạ trong music.json không thể đẩy URL tuỳ ý vào iframe.
const SPOTIFY_TYPES = ["track", "album", "playlist", "episode"];
const SPOTIFY_PATTERN = new RegExp(
  `^https://open\\.spotify\\.com/(?:intl-[a-z]{2}/)?(${SPOTIFY_TYPES.join("|")})/([A-Za-z0-9]{22})(?:[/?].*)?$`
);

const musicCopy = {
  en: {
    emptyTitle: "No playlists yet.",
    emptyText: "The first list is still being argued about. Check back soon.",
    errorTitle: "Playlists could not be loaded.",
    errorText: "The playlist index did not load. Try refreshing the page.",
    trackCount: (n) => `${n} ${n === 1 ? "track" : "tracks"}`,
    play: (title, artist) => `Play ${title} by ${artist}`,
    nowPlaying: "Now playing",
    preview: "Spotify plays a 30-second preview unless you are signed in."
  },
  vi: {
    emptyTitle: "Chưa có playlist nào.",
    emptyText: "Danh sách đầu tiên vẫn đang được cãi nhau. Quay lại sau nhé.",
    errorTitle: "Không tải được playlist.",
    errorText: "Mục lục playlist không tải được. Thử tải lại trang.",
    trackCount: (n) => `${n} bài`,
    play: (title, artist) => `Phát ${title} của ${artist}`,
    nowPlaying: "Đang phát",
    preview: "Spotify chỉ phát thử 30 giây, trừ khi bạn đã đăng nhập."
  }
};

const shell = document.querySelector("[data-music-shell]");
const statusView = document.querySelector("[data-music-status]");
const tabsElement = document.querySelector("[data-playlist-tabs]");
const listElement = document.querySelector("[data-track-list]");
const titleElement = document.querySelector("[data-playlist-title]");
const noteElement = document.querySelector("[data-playlist-note]");
const countElement = document.querySelector("[data-playlist-count]");
const player = document.querySelector("[data-player]");
const playerFrame = document.querySelector("[data-player-frame]");
const playerClose = document.querySelector("[data-player-close]");

let playlists = [];
let activeSlug = null;
let playingKey = null;

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
  return `https://open.spotify.com/embed/${link.type}/${link.id}?utm_source=generator`;
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
      button.addEventListener("click", () => selectPlaylist(playlist.slug));

      return button;
    })
  );
}

function renderTracks(playlist) {
  const copy = dictionary();
  const tracks = playableTracks(playlist);

  titleElement.textContent = pick(playlist.title);
  noteElement.textContent = pick(playlist.note);
  countElement.textContent = copy.trackCount(tracks.length);

  listElement.replaceChildren(
    ...tracks.map((track, index) => {
      const key = `${playlist.slug}:${track.link.id}`;
      const item = document.createElement("li");
      item.className = "track";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "track-button";
      button.dataset.key = key;
      button.setAttribute("aria-label", copy.play(track.title, track.artist));
      button.setAttribute("aria-pressed", String(key === playingKey));

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
      button.addEventListener("click", () => play(key, track));

      item.append(button);
      return item;
    })
  );
}

function markPlaying() {
  listElement.querySelectorAll(".track-button").forEach((button) => {
    const isPlaying = button.dataset.key === playingKey;
    button.setAttribute("aria-pressed", String(isPlaying));
    button.closest(".track")?.classList.toggle("is-playing", isPlaying);
  });
}

function play(key, track) {
  const copy = dictionary();
  playingKey = key;

  const frame = document.createElement("iframe");
  frame.src = embedUrl(track.link);
  frame.title = `${copy.nowPlaying}: ${track.title} — ${track.artist}`;
  frame.loading = "lazy";
  frame.allow = "clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  frame.setAttribute("frameborder", "0");

  playerFrame.replaceChildren(frame);
  player.hidden = false;
  document.body.classList.add("has-player");
  markPlaying();
}

function stop() {
  playingKey = null;
  playerFrame.replaceChildren();
  player.hidden = true;
  document.body.classList.remove("has-player");
  markPlaying();
}

function selectPlaylist(slug) {
  const playlist = playlists.find((entry) => entry.slug === slug) ?? playlists[0];
  if (!playlist) return;

  activeSlug = playlist.slug;

  const url = new URL(window.location.href);
  url.searchParams.set("p", activeSlug);
  window.history.replaceState({}, "", url);

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
  } catch {
    showStatus("errorTitle", "errorText");
  }
}

playerClose?.addEventListener("click", stop);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !player.hidden) stop();
});

// Đổi ngôn ngữ trên masthead thì vẽ lại nhãn, giữ nguyên bài đang phát.
document.addEventListener("site:language", () => {
  if (playlists.length) render();
});

boot();
