const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");

const root = `${__dirname}/..`;
const read = (file) => readFileSync(`${root}/${file}`, "utf8");
const playlists = JSON.parse(read("content/music.json"));

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SPOTIFY_PATTERN =
  /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode)\/[A-Za-z0-9]{22}(?:[/?].*)?$/;

test("every playlist has a unique, url-safe slug", () => {
  const slugs = playlists.map((playlist) => playlist.slug);

  for (const slug of slugs) {
    assert.match(slug, SLUG_PATTERN, `slug "${slug}" must be lowercase a-z0-9 and dashes`);
  }

  assert.equal(new Set(slugs).size, slugs.length, "slugs must not repeat");
});

test("playlist titles and notes are written in both languages", () => {
  for (const playlist of playlists) {
    for (const field of ["title", "note"]) {
      const value = playlist[field];

      assert.equal(typeof value, "object", `${playlist.slug}.${field} must be { en, vi }`);
      assert.ok(value.en?.trim(), `${playlist.slug}.${field}.en is required`);
      assert.ok(value.vi?.trim(), `${playlist.slug}.${field}.vi is required`);
    }
  }
});

test("at least one playlist has something in it", () => {
  assert.ok(
    playlists.some((playlist) => playlist.tracks?.length),
    "the page would render nothing to press"
  );
});

test("every track carries a title, an artist, and an embeddable Spotify link", () => {
  for (const playlist of playlists) {
    // Danh sách rỗng là hợp lệ: tab vẫn hiện, chỉ báo là chưa có bài nào.
    assert.ok(Array.isArray(playlist.tracks), `${playlist.slug}.tracks must be an array`);

    for (const track of playlist.tracks) {
      const where = `${playlist.slug} / ${track.title ?? "(no title)"}`;

      assert.ok(track.title?.trim(), `${where}: title is required`);
      assert.ok(track.artist?.trim(), `${where}: artist is required`);
      assert.match(
        track.spotify ?? "",
        SPOTIFY_PATTERN,
        `${where}: spotify must be an open.spotify.com track/album/playlist/episode link`
      );
    }
  }
});

test("tracks are not repeated inside the same playlist", () => {
  for (const playlist of playlists) {
    const ids = playlist.tracks.map((track) => track.spotify.match(SPOTIFY_PATTERN) && track.spotify);

    assert.equal(new Set(ids).size, ids.length, `${playlist.slug} repeats a Spotify link`);
  }
});

test("the music page ships the hooks music.js renders into", () => {
  const html = read("music.html");

  for (const hook of [
    "data-music-shell",
    "data-playlist-tabs",
    "data-track-list",
    "data-playlist-title",
    "data-playlist-note",
    "data-playlist-count",
    "data-playlist-empty",
    "data-music-status"
  ]) {
    assert.ok(html.includes(hook), `music.html is missing ${hook}`);
  }

  assert.match(html, /<script src="script\.js"><\/script>/);
  assert.match(html, /<script type="module" src="music\.js"><\/script>/);
  assert.match(html, /data-title-key="musicPageTitle"/);
});

// Thanh phát nằm ngoài <main> trên cả ba trang, nên router đổi trang không huỷ nó và
// bài đang nghe chạy tiếp.
test("every page carries the shared player outside its main", () => {
  for (const page of ["index.html", "stories.html", "music.html"]) {
    const html = read(page);

    for (const hook of ["data-player", "data-player-frame", "data-player-note", "data-player-close"]) {
      assert.ok(html.includes(hook), `${page} is missing ${hook}`);
    }

    assert.ok(
      html.indexOf("</main>") < html.indexOf('class="now-playing"'),
      `${page}: the player must sit outside <main>, or a page swap would destroy it`
    );

    assert.match(html, /<script type="module" src="player\.js"><\/script>/, page);
    assert.match(html, /<script type="module" src="router\.js"><\/script>/, page);
  }
});

test("pressing a track starts playback instead of only loading the embed", () => {
  const player = read("player.js");

  assert.match(player, /embed\/iframe-api\/v1/, "the embed controller script must be loaded");
  assert.match(player, /onSpotifyIframeApiReady/);
  assert.match(player, /createController\(/);
  assert.match(player, /\.play\(\)/, "something has to call play()");
  assert.match(player, /loadUri\(/, "swapping tracks must reuse the open embed");
});

test("playback survives tab switches, page changes, back, and forward", () => {
  const music = read("music.js");
  const player = read("player.js");
  const router = read("router.js");

  assert.match(music, /history\.pushState/, "each playlist needs its own history entry");
  assert.match(music, /"popstate"/, "back and forward must swap lists without a reload");
  assert.match(player, /sessionStorage/, "the open track must be restored after a real reload");

  assert.match(router, /querySelector\("main"\)/, "only <main> may be swapped");
  assert.match(router, /replaceWith\(nextMain\)/);
  assert.match(router, /window\.location\.href = url\.href/, "a failed swap must fall back to a real load");
});

test("player.js only ever builds Spotify embed urls", () => {
  const player = read("player.js");

  assert.match(player, /SPOTIFY_ORIGIN = "https:\/\/open\.spotify\.com"/);
  assert.match(player, /\$\{SPOTIFY_ORIGIN\}\/embed\//);

  // Bất kỳ host nào khác lọt vào iframe đều là lỗi bảo mật, không phải lỗi hiển thị.
  // Bỏ dấu \ trước đã, vì host trong file được viết dạng regex escape (open\.spotify\.com).
  const hosts = player.replaceAll("\\", "").match(/https:\/\/[a-z0-9.-]+/g) ?? [];
  for (const host of hosts) {
    assert.ok(
      host.startsWith("https://open.spotify.com"),
      `player.js should not reference ${host}`
    );
  }
});

// Bài lưu trong sessionStorage vẫn phải đi qua kiểm tra loại và id trước khi vào iframe.
test("a restored track is validated before it reaches the iframe", () => {
  const player = read("player.js");

  assert.match(player, /SPOTIFY_TYPES\.includes\(stored\.type\)/);
  assert.match(player, /SPOTIFY_ID\.test\(stored\.id/);
});

test("every page links to the music page and both languages name it", () => {
  const script = read("script.js");

  for (const page of ["index.html", "stories.html", "music.html"]) {
    assert.match(read(page), /href="music\.html"/, `${page} must link to the music page`);
  }

  assert.match(script, /navMusic: "Music"/);
  assert.match(script, /navMusic: "Nhạc"/);
  assert.match(script, /musicPageTitle:/);
  assert.match(script, /musicKicker:/);
});
