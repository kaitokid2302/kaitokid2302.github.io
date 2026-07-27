const MUSIC_INDEX_PATH = "content/music.json";
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const FALLBACK_LANGUAGE = "en";

const musicCopy = {
  en: {
    emptyTitle: "No playlists yet.",
    emptyText: "The file that holds them is empty.",
    errorTitle: "Playlists did not load.",
    errorText: "Reload the page, or come back later.",
    listEmpty: "This list is still empty.",
    trackCount: (n) => `${n} ${n === 1 ? "track" : "tracks"}`,
    play: (title, artist) => `Play ${title} by ${artist}`
  },
  vi: {
    emptyTitle: "Chưa có danh sách nào.",
    emptyText: "File chứa danh sách đang rỗng.",
    errorTitle: "Không tải được danh sách nhạc.",
    errorText: "Tải lại trang, hoặc quay lại sau.",
    listEmpty: "Danh sách này vẫn còn trống.",
    trackCount: (n) => `${n} bài`,
    play: (title, artist) => `Phát ${title} của ${artist}`
  }
};

let shell = null;
let statusView = null;
let tabsElement = null;
let listElement = null;
let emptyElement = null;
let titleElement = null;
let noteElement = null;
let countElement = null;

let playlists = [];
let activeSlug = null;

// Router thay cả thẻ <main>, nên phải tra lại DOM mỗi lần vào trang nhạc thay vì
// giữ tham chiếu từ lần tải đầu.
function bind() {
  shell = document.querySelector("[data-music-shell]");
  statusView = document.querySelector("[data-music-status]");
  tabsElement = document.querySelector("[data-playlist-tabs]");
  listElement = document.querySelector("[data-track-list]");
  emptyElement = document.querySelector("[data-playlist-empty]");
  titleElement = document.querySelector("[data-playlist-title]");
  noteElement = document.querySelector("[data-playlist-note]");
  countElement = document.querySelector("[data-playlist-count]");

  return Boolean(shell);
}

function onMusicPage() {
  return Boolean(shell?.isConnected);
}

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

function showStatus(titleKey, textKey) {
  const copy = dictionary();

  shell.hidden = true;
  statusView.hidden = false;
  statusView.textContent = `${copy[titleKey]} ${copy[textKey]}`;
}

function playableTracks(playlist) {
  return (playlist.tracks ?? [])
    .map((track) => ({ ...track, link: window.sitePlayer.parse(track.spotify) }))
    .filter((track) => track.link);
}

// Đánh dấu theo id bài, không theo danh sách: một bài nằm ở hai danh sách thì cả hai
// chỗ đều sáng lên khi nó đang phát.
function playingId() {
  return window.sitePlayer.current()?.id ?? null;
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
  const current = playingId();

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
      button.setAttribute("aria-pressed", String(track.link.id === current));

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
      button.addEventListener("click", () =>
        window.sitePlayer.play(track.link, track.title, track.artist)
      );

      item.append(button);
      return item;
    })
  );
}

function markPlaying() {
  if (!onMusicPage()) return;

  const current = playingId();

  listElement.querySelectorAll(".track-button").forEach((button) => {
    const isPlaying = button.dataset.key === current;
    button.setAttribute("aria-pressed", String(isPlaying));
    button.closest(".track")?.classList.toggle("is-playing", isPlaying);
  });
}

// Đổi tab thì đẩy một mục vào history, để back/forward chuyển qua lại giữa các danh sách
// mà không tải lại trang — nhạc trong thanh phát vẫn chạy tiếp.
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
  if (!bind()) return;

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

window.addEventListener("popstate", () => {
  if (!onMusicPage() || !playlists.length) return;

  activeSlug = null;
  selectPlaylist(new URL(window.location.href).searchParams.get("p"));
});

document.addEventListener("site:track", markPlaying);

// Đổi ngôn ngữ trên masthead thì vẽ lại nhãn, giữ nguyên bài đang phát.
document.addEventListener("site:language", () => {
  if (onMusicPage() && playlists.length) render();
});

// Router vừa gắn <main> mới vào: nếu đó là trang nhạc thì dựng lại danh sách.
document.addEventListener("site:page", () => {
  activeSlug = null;
  boot();
});

boot();
