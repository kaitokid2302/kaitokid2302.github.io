const assert = require("node:assert/strict");
const { existsSync, readFileSync, readdirSync } = require("node:fs");
const test = require("node:test");

const root = `${__dirname}/..`;
const read = (file) => readFileSync(`${root}/${file}`, "utf8");
const storyIndex = JSON.parse(read("content/stories.json"));
const LANGUAGES = ["en", "vi"];

const bodiesOf = (slug) =>
  LANGUAGES.map((language) => `content/stories/${slug}.${language}.md`).filter((path) =>
    existsSync(`${root}/${path}`)
  );

test("both pages link the stories tab into primary navigation", () => {
  const home = read("index.html");
  const stories = read("stories.html");

  assert.match(home, /<a href="stories\.html" data-i18n="navStories">Stories<\/a>/);
  assert.match(stories, /<a href="stories\.html" aria-current="page" data-i18n="navStories">/);
  assert.match(stories, /<a href="index\.html#work" data-i18n="navWork">/);
  assert.match(stories, /<a href="index\.html#contact" data-i18n="navContact">/);
});

test("stories page reuses the shared theme, language, and skip-link chrome", () => {
  const stories = read("stories.html");

  assert.match(stories, /<html lang="en" data-theme="light">/);
  assert.match(stories, /data-theme-toggle/);
  assert.match(stories, /data-lang="en"[^>]*class="is-active"/);
  assert.match(stories, /<main id="main" tabindex="-1">/);
  assert.match(stories, /<script src="script\.js"><\/script>/);
  assert.match(stories, /<script src="stories\.js"><\/script>/);
});

test("each page declares which title and description copy it owns", () => {
  const script = read("script.js");

  assert.match(
    read("stories.html"),
    /<body data-title-key="storiesPageTitle" data-description-key="storiesPageDescription">/
  );
  assert.match(script, /document\.body\.dataset\.titleKey \?\? "pageTitle"/);
  assert.match(script, /document\.body\.dataset\.descriptionKey \?\? "pageDescription"/);
  assert.equal((script.match(/storiesPageTitle:/g) ?? []).length, 2);
  assert.equal((script.match(/storiesPageDescription:/g) ?? []).length, 2);
});

test("stories navigation and chrome copy exist in English and Vietnamese", () => {
  const script = read("script.js");

  assert.match(script, /navStories:\s*"Stories"/);
  assert.match(script, /navStories:\s*"Câu chuyện"/);
  assert.match(script, /storyBack:\s*"← All stories"/);
  assert.match(script, /storyBack:\s*"← Tất cả câu chuyện"/);
  assert.equal((script.match(/storiesTitle:/g) ?? []).length, 2);
  assert.equal((script.match(/storiesIntro:/g) ?? []).length, 2);

  const stories = read("stories.js");
  assert.match(stories, /storyMissingTitle: "That story does not exist\."/);
  assert.match(stories, /storyMissingTitle: "Không tìm thấy câu chuyện này\."/);
});

test("story index entries carry both languages and resolve to real files", () => {
  assert.ok(storyIndex.length > 0);

  for (const story of storyIndex) {
    assert.match(story.slug, /^[a-z0-9][a-z0-9-]*$/, `bad slug: ${story.slug}`);
    assert.match(story.date, /^\d{4}-\d{2}-\d{2}$/, `bad date on ${story.slug}`);
    assert.ok(existsSync(`${root}/${story.cover}`), `missing cover: ${story.cover}`);

    for (const field of ["title", "summary", "coverAlt"]) {
      for (const language of LANGUAGES) {
        assert.ok(
          story[field]?.[language]?.trim().length,
          `${story.slug} is missing ${field}.${language}`
        );
      }
    }

    assert.ok(
      existsSync(`${root}/content/stories/${story.slug}.en.md`),
      `${story.slug} has no English body (the fallback language)`
    );
  }
});

test("every markdown body is listed in the index and uses a language suffix", () => {
  const slugs = new Set(storyIndex.map((story) => story.slug));

  for (const file of readdirSync(`${root}/content/stories`)) {
    if (!file.endsWith(".md")) continue;

    const match = file.match(/^([a-z0-9][a-z0-9-]*)\.(en|vi)\.md$/);
    assert.ok(match, `${file} must be named <slug>.en.md or <slug>.vi.md`);
    assert.ok(slugs.has(match[1]), `${file} is not listed in content/stories.json`);
  }
});

test("translations keep the same photos in the same order", () => {
  const paths = (body) => [...body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map(([, src]) => src);

  for (const story of storyIndex) {
    const bodies = bodiesOf(story.slug);
    if (bodies.length < 2) continue;

    const [first, ...rest] = bodies.map((path) => paths(read(path)));
    for (const other of rest) {
      assert.deepEqual(other, first, `${story.slug} translations disagree on images`);
    }
  }
});

test("every image used inside a story exists and carries alt text", () => {
  for (const story of storyIndex) {
    for (const path of bodiesOf(story.slug)) {
      const images = [...read(path).matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)];
      assert.ok(images.length > 0, `${path} has no images`);

      for (const [, alt, src] of images) {
        assert.ok(alt.trim().length > 0, `image without alt text in ${path}: ${src}`);
        assert.ok(existsSync(`${root}/${src}`), `missing image in ${path}: ${src}`);
      }
    }
  }
});

test("story bodies are language-suffixed with an English fallback", () => {
  const stories = read("stories.js");

  assert.match(stories, /content\/stories\/\$\{slug\}\.\$\{language\}\.md/);
  assert.match(stories, /content\/stories\/\$\{slug\}\.\$\{FALLBACK_LANGUAGE\}\.md/);
  assert.match(stories, /const FALLBACK_LANGUAGE = "en"/);
  assert.match(stories, /document\.addEventListener\("site:language"/);
  assert.match(read("script.js"), /new CustomEvent\("site:language"/);
});

// Both files are classic scripts sharing one global scope, so a duplicated
// top-level name is a SyntaxError that silently kills the whole stories page.
test("script.js and stories.js declare no colliding globals", () => {
  const topLevelNames = (file) =>
    new Set(
      [...read(file).matchAll(/^(?:const|let|var|async function|function)\s+([A-Za-z_$][\w$]*)/gm)].map(
        ([, name]) => name
      )
    );

  const shared = [...topLevelNames("script.js")].filter((name) => topLevelNames("stories.js").has(name));

  assert.deepEqual(shared, [], `these names are declared twice in the global scope: ${shared.join(", ")}`);
});

test("story markdown is escaped before parsing and slugs are validated", () => {
  const stories = read("stories.js");

  assert.match(stories, /const SLUG_PATTERN = \/\^\[a-z0-9\]\[a-z0-9-\]\*\$\//);
  assert.match(stories, /SLUG_PATTERN\.test\(requested\)/);
  assert.match(stories, /function renderMarkdown\(markdown\) \{\s*return escapeHtml\(/);
});

test("story photos stay in webp under a per-story folder", () => {
  for (const story of storyIndex) {
    for (const path of bodiesOf(story.slug)) {
      for (const [, src] of read(path).matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
        assert.match(
          src,
          new RegExp(`^assets/stories/${story.slug}/[^/]+\\.webp$`),
          `unexpected asset path in ${path}: ${src}`
        );
      }
    }
  }
});

test("story body aligns with the story title instead of centering", () => {
  const css = read("styles.css");
  const [, storyBodyRule = ""] = css.match(/\.story-body\s*\{([^}]*)\}/) ?? [];

  assert.match(storyBodyRule, /margin:\s*56px 0 0;/);
  assert.doesNotMatch(storyBodyRule, /\bauto\b/);
});

test("embedded video is click-to-load rather than an eager iframe", () => {
  const stories = read("stories.js");
  const css = read("styles.css");

  assert.match(stories, /story-video-play/);
  assert.match(stories, /youtube-nocookie\.com\/embed\//);
  assert.doesNotMatch(read("stories.html"), /<iframe/);
  assert.match(css, /\.story-video-play span\s*\{[\s\S]*min-height:\s*48px/);
});
