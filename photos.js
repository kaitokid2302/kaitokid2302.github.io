const PHOTO_INDEX_PATH = "content/photos.json";
const FALLBACK_LANGUAGE = "en";

const photoCopy = {
  en: {
    photosEmptyTitle: "Nothing here yet.",
    photosEmptyText: "The first photos are on their way.",
    photosErrorText: "The photo index did not load. Try refreshing the page.",
    photoCount: (count) => `${count} ${count === 1 ? "photo" : "photos"}`,
    lightboxLabel: "Photo viewer",
    lightboxClose: "Close",
    lightboxPrev: "Previous photo",
    lightboxNext: "Next photo"
  },
  vi: {
    photosEmptyTitle: "Chưa có ảnh nào.",
    photosEmptyText: "Những tấm đầu tiên đang trên đường tới.",
    photosErrorText: "Không tải được danh sách ảnh. Thử tải lại trang.",
    photoCount: (count) => `${count} ảnh`,
    lightboxLabel: "Xem ảnh phóng to",
    lightboxClose: "Đóng",
    lightboxPrev: "Ảnh trước",
    lightboxNext: "Ảnh sau"
  }
};

let monthsElement = null;
let statusElement = null;
let lightbox = null;

let groups = null;
let lightboxIndex = -1;
let lastFocus = null;

// Router thay cả thẻ <main>, nên phải tra lại DOM mỗi lần vào trang ảnh thay vì
// giữ tham chiếu từ lần tải đầu.
function bind() {
  monthsElement = document.querySelector("[data-photo-months]");
  statusElement = document.querySelector("[data-photos-status]");
  lightbox = document.querySelector("[data-lightbox-root]");

  return Boolean(monthsElement);
}

function onPhotosPage() {
  return Boolean(monthsElement?.isConnected);
}

function activeLanguage() {
  return document.documentElement.lang === "vi" ? "vi" : FALLBACK_LANGUAGE;
}

function photoDictionary() {
  return photoCopy[activeLanguage()];
}

// Group fields are written as { en: "...", vi: "..." }; plain values (dates,
// image paths) are shared and returned untouched.
function pick(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    // Chuỗi rỗng coi như chưa dịch: rơi về bản en; cả hai cùng rỗng thì ẩn.
    return value[activeLanguage()] || value[FALLBACK_LANGUAGE] || "";
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

function formatWith(options, isoDate) {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;

  return new Intl.DateTimeFormat(activeLanguage() === "vi" ? "vi-VN" : "en-GB", {
    ...options,
    timeZone: "UTC"
  }).format(parsed);
}

function monthLabel(month) {
  const label = formatWith({ month: "long", year: "numeric" }, `${month}-01`);

  // vi-VN trả về "tháng 8 năm 2026" viết thường; đầu đề thì viết hoa chữ đầu.
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dayLabel(isoDate) {
  return formatWith({ day: "numeric", month: "short" }, isoDate);
}

function showStatus(text) {
  statusElement.textContent = text;
  statusElement.hidden = false;
  monthsElement.hidden = true;
}

function groupHtml(group, offset) {
  const note = pick(group.note);
  const place = pick(group.place);
  const photos = group.photos
    .map(
      (photo, index) => `
        <button type="button" data-lightbox-open="${offset + index}">
          <img
            src="${escapeHtml(photo.src)}"
            alt="${escapeHtml(pick(photo.alt))}"
            width="${Number(photo.w)}"
            height="${Number(photo.h)}"
            loading="lazy"
            decoding="async"
          >
        </button>
      `
    )
    .join("");

  return `
    <article class="photo-group">
      <div class="group-meta">
        <p class="group-date">${escapeHtml(dayLabel(group.date))}</p>
        ${place ? `<p class="group-place">${escapeHtml(place)}</p>` : ""}
      </div>
      <div>
        ${note ? `<p class="group-note">${escapeHtml(note)}</p>` : ""}
        <div class="photo-grid${group.photos.length === 1 ? " is-single" : ""}">${photos}</div>
      </div>
    </article>
  `;
}

function render() {
  if (!groups.length) {
    const dictionary = photoDictionary();
    showStatus(`${dictionary.photosEmptyTitle} ${dictionary.photosEmptyText}`);
    return;
  }

  const byMonth = new Map();
  let offset = 0;

  for (const group of groups) {
    const month = group.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(group);
  }

  monthsElement.innerHTML = [...byMonth]
    .map(([month, monthGroups]) => {
      const count = monthGroups.reduce((total, group) => total + group.photos.length, 0);
      const body = monthGroups
        .map((group) => {
          const html = groupHtml(group, offset);
          offset += group.photos.length;
          return html;
        })
        .join("");

      return `
        <section class="photo-month">
          <header class="month-head">
            <h3>${escapeHtml(monthLabel(month))}</h3>
            <p class="month-count">${escapeHtml(photoDictionary().photoCount(count))}</p>
          </header>
          ${body}
        </section>
      `;
    })
    .join("");

  statusElement.hidden = true;
  monthsElement.hidden = false;
  localizeLightbox();
}

function localizeLightbox() {
  const dictionary = photoDictionary();
  lightbox.setAttribute("aria-label", dictionary.lightboxLabel);
  lightbox.querySelector("[data-lightbox-close]").setAttribute("aria-label", dictionary.lightboxClose);
  lightbox.querySelector("[data-lightbox-prev]").setAttribute("aria-label", dictionary.lightboxPrev);
  lightbox.querySelector("[data-lightbox-next]").setAttribute("aria-label", dictionary.lightboxNext);
}

function allPhotos() {
  return groups.flatMap((group) => group.photos);
}

function showLightboxPhoto(index) {
  const photos = allPhotos();
  lightboxIndex = (index + photos.length) % photos.length;

  const photo = photos[lightboxIndex];
  const image = lightbox.querySelector("[data-lightbox-img]");
  image.src = photo.src;
  image.alt = pick(photo.alt);

  lightbox.querySelector("[data-lightbox-caption]").textContent = pick(photo.alt);
  lightbox.querySelector("[data-lightbox-counter]").textContent =
    `${lightboxIndex + 1} / ${photos.length}`;
}

function openLightbox(index) {
  lastFocus = document.activeElement;
  showLightboxPhoto(index);
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  lightbox.querySelector("[data-lightbox-close]").focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = "";
  lastFocus?.focus();
}

async function loadAndRender() {
  let loaded = null;
  try {
    const response = await fetch(PHOTO_INDEX_PATH);
    if (!response.ok) throw new Error("Photo index unavailable");
    loaded = await response.json();
  } catch {
    loaded = null;
  }

  // Người xem có thể đã chuyển trang trong lúc chờ mạng: <main> cũ đã bị router
  // gỡ rồi, các tham chiếu DOM ở đây đã chết - không được đụng vào.
  if (!onPhotosPage()) return;

  if (!loaded) {
    groups = null;
    showStatus(photoDictionary().photosErrorText);
    return;
  }

  groups = loaded;
  groups.sort((a, b) => b.date.localeCompare(a.date));
  render();
}

document.addEventListener("click", (event) => {
  if (!onPhotosPage()) return;

  const trigger = event.target.closest("[data-lightbox-open]");
  if (trigger) {
    openLightbox(Number(trigger.dataset.lightboxOpen));
    return;
  }

  if (lightbox.hidden) return;

  if (event.target.closest("[data-lightbox-close]")) closeLightbox();
  else if (event.target.closest("[data-lightbox-prev]")) showLightboxPhoto(lightboxIndex - 1);
  else if (event.target.closest("[data-lightbox-next]")) showLightboxPhoto(lightboxIndex + 1);
  // Bấm ra vùng nền tối (ngoài ảnh và thanh điều khiển) thì đóng.
  else if (event.target === lightbox || event.target.tagName === "FIGURE") closeLightbox();
});

// aria-modal thì Tab không được rơi ra nội dung bị lớp phủ che khuất.
function trapFocus(event) {
  const buttons = [...lightbox.querySelectorAll("button")];
  const first = buttons[0];
  const last = buttons[buttons.length - 1];

  if (!lightbox.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// Bắt ở capture phase: player.js cũng nghe Escape trên document để tắt nhạc -
// đóng lightbox mà kéo theo tắt bài đang phát (và mất hàng đợi) là sai.
document.addEventListener(
  "keydown",
  (event) => {
    if (!onPhotosPage() || !lightbox || lightbox.hidden) return;

    if (event.key === "Escape") {
      event.stopPropagation();
      closeLightbox();
    } else if (event.key === "ArrowLeft") showLightboxPhoto(lightboxIndex - 1);
    else if (event.key === "ArrowRight") showLightboxPhoto(lightboxIndex + 1);
    else if (event.key === "Tab") trapFocus(event);
  },
  true
);

document.addEventListener("site:language", () => {
  if (!onPhotosPage()) return;

  // Lần tải trước hỏng: thử lại - nếu vẫn hỏng, thông báo lỗi hiện bằng ngôn ngữ mới.
  if (!groups) {
    loadAndRender();
    return;
  }

  render();
  if (!lightbox.hidden && lightboxIndex >= 0) showLightboxPhoto(lightboxIndex);
});

// Router vừa gắn <main> mới vào: nếu là trang ảnh thì dựng lại nội dung. Khoá cuộn
// của lightbox nằm trên <body> (router không thay thẻ này) nên phải tự nhả ra.
document.addEventListener("site:page", () => {
  document.body.style.overflow = "";
  if (bind()) loadAndRender();
});

if (bind()) loadAndRender();
