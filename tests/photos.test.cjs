const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const test = require("node:test");

const root = `${__dirname}/..`;
const read = (file) => readFileSync(`${root}/${file}`, "utf8");
const photoIndex = JSON.parse(read("content/photos.json"));
const LANGUAGES = ["en", "vi"];

test("every page links the photos tab into primary navigation", () => {
  assert.match(read("index.html"), /<a href="photos\.html" data-i18n="navPhotos">Photos<\/a>/);
  assert.match(read("stories.html"), /<a href="photos\.html" data-i18n="navPhotos">Photos<\/a>/);
  assert.match(read("music.html"), /<a href="photos\.html" data-i18n="navPhotos">Photos<\/a>/);
  assert.match(read("photos.html"), /<a href="photos\.html" aria-current="page" data-i18n="navPhotos">/);
});

test("photos page reuses the shared chrome and declares its own copy keys", () => {
  const photos = read("photos.html");

  assert.match(photos, /<html lang="en" data-theme="light">/);
  assert.match(photos, /data-theme-toggle/);
  assert.match(photos, /data-lang="en"[^>]*class="is-active"/);
  assert.match(photos, /<main id="main" tabindex="-1">/);
  assert.match(photos, /<body data-title-key="photosPageTitle" data-description-key="photosPageDescription">/);
  assert.match(photos, /<script src="script\.js"><\/script>/);
  assert.match(photos, /<script type="module" src="player\.js"><\/script>/);
  assert.match(photos, /<script type="module" src="router\.js"><\/script>/);
  assert.match(photos, /<script type="module" src="photos\.js"><\/script>/);
  assert.match(photos, /data-player\b/);
});

test("photos chrome copy exists in English and Vietnamese", () => {
  const script = read("script.js");

  for (const key of [
    "photosPageTitle",
    "photosPageDescription",
    "navPhotos",
    "photosKicker",
    "photosTitle",
    "photosIntro"
  ]) {
    assert.equal(
      (script.match(new RegExp(`${key}:`, "g")) ?? []).length,
      2,
      `script.js phải có "${key}" ở cả hai ngôn ngữ`
    );
  }

  const photosScript = read("photos.js");
  for (const language of LANGUAGES) {
    assert.match(photosScript, new RegExp(`${language}: \\{`), `photos.js thiếu bản ${language}`);
  }
});

test("photo index entries are well-formed", () => {
  assert.ok(Array.isArray(photoIndex), "photos.json phải là một mảng");

  const folders = photoIndex.map((group) => group.folder);
  assert.equal(new Set(folders).size, folders.length, "folder bị trùng trong photos.json");

  for (const group of photoIndex) {
    assert.match(group.folder, /^[a-z0-9][a-z0-9-]*$/, `folder "${group.folder}" sai định dạng`);
    assert.match(group.date, /^\d{4}-\d{2}-\d{2}$/, `date của "${group.folder}" phải là YYYY-MM-DD`);
    assert.ok(Array.isArray(group.photos) && group.photos.length > 0, `"${group.folder}" không có ảnh`);

    if (group.note) {
      for (const language of LANGUAGES) {
        assert.equal(typeof group.note[language], "string", `note của "${group.folder}" thiếu bản ${language}`);
      }
    }
  }
});

test("every photo file exists, has real dimensions, and both alt texts", () => {
  const sources = photoIndex.flatMap((group) => group.photos.map((photo) => photo.src));
  assert.equal(new Set(sources).size, sources.length, "một ảnh bị khai hai lần");

  for (const group of photoIndex) {
    for (const photo of group.photos) {
      assert.ok(
        photo.src.startsWith(`assets/photos/${group.folder}/`),
        `${photo.src} phải nằm trong assets/photos/${group.folder}/`
      );
      assert.ok(existsSync(`${root}/${photo.src}`), `Thiếu file ảnh: ${photo.src}`);
      assert.ok(Number.isInteger(photo.w) && photo.w > 0, `${photo.src} thiếu chiều rộng thật`);
      assert.ok(Number.isInteger(photo.h) && photo.h > 0, `${photo.src} thiếu chiều cao thật`);

      for (const language of LANGUAGES) {
        assert.ok(
          typeof photo.alt?.[language] === "string" && photo.alt[language].trim().length > 0,
          `${photo.src} thiếu alt bản ${language}`
        );
      }
    }
  }
});

test("photos.js escapes user content and stays on the same origin", () => {
  const script = read("photos.js");

  assert.match(script, /escapeHtml/);
  assert.doesNotMatch(script, /https?:\/\//, "photos.js không được gọi ra host ngoài");
  assert.match(script, /site:page/, "photos.js phải dựng lại nội dung khi router thay <main>");
  assert.match(script, /site:language/, "photos.js phải vẽ lại khi đổi ngôn ngữ");
});
