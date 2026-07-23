const STORY_INDEX_PATH = "content/stories.json";
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const FALLBACK_LANGUAGE = "en";

const storyCopy = {
  en: {
    storiesEmptyTitle: "Nothing published yet.",
    storiesEmptyText: "The first story is being written. Check back soon.",
    storiesErrorTitle: "Stories could not be loaded.",
    storiesErrorText: "The story index did not load. Try refreshing the page.",
    storyMissingTitle: "That story does not exist.",
    storyMissingText: "The link may be out of date. The full list is still here.",
    playVideo: "Play video"
  },
  vi: {
    storiesEmptyTitle: "Chưa có bài nào.",
    storiesEmptyText: "Câu chuyện đầu tiên đang được viết. Sếp quay lại sau nhé.",
    storiesErrorTitle: "Không tải được danh sách.",
    storiesErrorText: "Mục lục câu chuyện không tải được. Thử tải lại trang.",
    storyMissingTitle: "Không tìm thấy câu chuyện này.",
    storyMissingText: "Có thể đường dẫn đã cũ. Danh sách đầy đủ vẫn ở đây.",
    playVideo: "Xem video"
  }
};

const indexView = document.querySelector("[data-stories-index]");
const articleView = document.querySelector("[data-story-article]");
const statusView = document.querySelector("[data-story-status]");
const listElement = document.querySelector("[data-story-list]");

let activeStory = null;

function activeLanguage() {
  return document.documentElement.lang === "vi" ? "vi" : FALLBACK_LANGUAGE;
}

function storyDictionary() {
  return storyCopy[activeLanguage()];
}

// Story fields are written as { en: "...", vi: "..." }; plain values (dates,
// image paths) are shared and returned untouched.
function pick(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[activeLanguage()] ?? value[FALLBACK_LANGUAGE] ?? "";
  }

  return value ?? "";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderInline(text) {
  return text
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) =>
      `<a href="${href}"${href.startsWith("http") ? ' target="_blank" rel="noreferrer"' : ""}>${label}</a>`
    )
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderImages(lines) {
  const figures = lines
    .map((line) => line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))
    .map(([, alt, src]) => `<img src="${src}" alt="${alt}" loading="lazy" decoding="async">`)
    .join("");

  return `<figure class="story-figure${lines.length > 1 ? " is-grid" : ""}">${figures}</figure>`;
}

function renderVideo(line) {
  const [, id, caption = ""] = line.match(/^@youtube:([\w-]+)\s*(.*)$/);
  const label = caption.trim() || storyDictionary().playVideo;

  return `
    <figure class="story-video">
      <button type="button" class="story-video-play" data-video-id="${id}">
        <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" decoding="async">
        <span>${label}</span>
      </button>
    </figure>
  `;
}

// Deliberately a small Markdown subset: headings, paragraphs, lists, quotes,
// images, rules, and a @youtube: directive. Input is escaped before parsing,
// so a story file can never inject raw HTML.
function renderMarkdown(markdown) {
  return escapeHtml(markdown.replace(/\r\n/g, "\n"))
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return "";

      if (lines.every((line) => /^!\[[^\]]*\]\([^)\s]+\)$/.test(line))) return renderImages(lines);
      if (lines[0].startsWith("@youtube:")) return renderVideo(lines[0]);
      if (/^-{3,}$/.test(lines[0])) return "<hr>";

      if (/^#{2,3}\s/.test(lines[0])) {
        const level = lines[0].startsWith("### ") ? 3 : 2;
        return `<h${level}>${renderInline(lines[0].replace(/^#{2,3}\s/, ""))}</h${level}>`;
      }

      if (lines.every((line) => line.startsWith("- "))) {
        const items = lines.map((line) => `<li>${renderInline(line.slice(2))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }

      if (lines.every((line) => line.startsWith("&gt;"))) {
        const quote = lines.map((line) => line.replace(/^&gt;\s?/, "")).join(" ");
        return `<blockquote><p>${renderInline(quote)}</p></blockquote>`;
      }

      return `<p>${renderInline(lines.join(" "))}</p>`;
    })
    .join("\n");
}

function formatDate(isoDate) {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;

  return new Intl.DateTimeFormat(activeLanguage() === "vi" ? "vi-VN" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(parsed);
}

function metaLine(story) {
  const tags = pick(story.tags) || [];

  return [formatDate(story.date), pick(story.place), ...tags].filter(Boolean).join(" · ");
}

function showView(view) {
  [indexView, articleView, statusView].forEach((element) => {
    if (element) element.hidden = element !== view;
  });
}

function showStatus(titleKey, textKey) {
  if (!statusView) return;

  const dictionary = storyDictionary();
  statusView.querySelector("[data-story-status-title]").textContent = dictionary[titleKey];
  statusView.querySelector("[data-story-status-text]").textContent = dictionary[textKey];
  statusView.dataset.storyStatusKeys = `${titleKey}|${textKey}`;
  showView(statusView);
}

function renderList(stories) {
  activeStory = null;

  if (!stories.length) {
    showStatus("storiesEmptyTitle", "storiesEmptyText");
    return;
  }

  listElement.innerHTML = stories
    .map(
      (story) => `
        <li class="story-card">
          <a href="stories.html?s=${story.slug}">
            <figure>
              <img src="${story.cover}" alt="${escapeHtml(pick(story.coverAlt))}" loading="lazy" decoding="async">
            </figure>
            <p class="kicker">${escapeHtml(metaLine(story))}</p>
            <h3>${escapeHtml(pick(story.title))}</h3>
            <p class="story-card-summary">${escapeHtml(pick(story.summary))}</p>
          </a>
        </li>
      `
    )
    .join("");

  showView(indexView);
}

// A story is written per language as <slug>.en.md / <slug>.vi.md. If a
// translation has not been written yet, the English body is served instead.
async function fetchStoryBody(slug) {
  const language = activeLanguage();
  const response = await fetch(`content/stories/${slug}.${language}.md`);
  if (response.ok) return response.text();

  if (language === FALLBACK_LANGUAGE) throw new Error(`Story body missing: ${slug}`);

  const fallback = await fetch(`content/stories/${slug}.${FALLBACK_LANGUAGE}.md`);
  if (!fallback.ok) throw new Error(`Story body missing: ${slug}`);

  return fallback.text();
}

async function renderStory(story) {
  const body = await fetchStoryBody(story.slug);
  const title = pick(story.title);

  activeStory = story;
  articleView.querySelector("[data-story-meta]").textContent = metaLine(story);
  articleView.querySelector("[data-story-title]").textContent = title;
  articleView.querySelector("[data-story-summary]").textContent = pick(story.summary);
  articleView.querySelector("[data-story-body]").innerHTML = renderMarkdown(body);

  document.title = `${title} — Dinh Truong Lam`;
  document.querySelector("meta[name='description']")?.setAttribute("content", pick(story.summary));
  showView(articleView);
}

async function route() {
  const requested = new URLSearchParams(window.location.search).get("s");

  let stories;
  try {
    const response = await fetch(STORY_INDEX_PATH);
    if (!response.ok) throw new Error("Story index unavailable");
    stories = await response.json();
  } catch {
    showStatus("storiesErrorTitle", "storiesErrorText");
    return;
  }

  stories.sort((a, b) => b.date.localeCompare(a.date));

  if (!requested) {
    renderList(stories);
    return;
  }

  const story = SLUG_PATTERN.test(requested) && stories.find((entry) => entry.slug === requested);
  if (!story) {
    showStatus("storyMissingTitle", "storyMissingText");
    return;
  }

  try {
    await renderStory(story);
  } catch {
    showStatus("storyMissingTitle", "storyMissingText");
  }
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-video-id]");
  if (!trigger) return;

  const frame = document.createElement("iframe");
  frame.src = `https://www.youtube-nocookie.com/embed/${trigger.dataset.videoId}?autoplay=1`;
  frame.title = trigger.textContent.trim();
  frame.allow = "accelerometer; autoplay; encrypted-media; picture-in-picture";
  frame.allowFullscreen = true;
  trigger.replaceWith(frame);
});

document.addEventListener("site:language", () => {
  if (activeStory) {
    renderStory(activeStory).catch(() => showStatus("storyMissingTitle", "storyMissingText"));
    return;
  }

  if (statusView && !statusView.hidden) {
    const [titleKey, textKey] = (statusView.dataset.storyStatusKeys ?? "").split("|");
    if (titleKey && textKey) showStatus(titleKey, textKey);
    return;
  }

  route();
});

route();
