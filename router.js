// Chuyển trang trong site bằng cách chỉ thay thẻ <main>, giữ nguyên masthead, footer
// và thanh phát nhạc. Nhờ vậy bài đang nghe không bị huỷ khi người xem bấm sang trang
// khác. Bất kỳ lỗi nào cũng rơi về điều hướng thật, nên trang không bao giờ kẹt.

// Tham số truy vấn do chính trang tự quản lý qua history: đổi chúng không phải là
// đổi trang, nên router đứng ngoài. "p" là tab danh sách của trang nhạc (music.js).
const PAGE_OWNED_PARAMS = ["p"];

const loadedScripts = new Set(
  [...document.querySelectorAll("script[src]")].map((script) => script.src)
);

// Danh tính của trang đang hiển thị, bỏ qua những tham số trang tự quản lý.
function pageId(url) {
  const params = new URLSearchParams(url.search);
  PAGE_OWNED_PARAMS.forEach((name) => params.delete(name));

  return `${url.pathname}?${params}`;
}

let rendered = pageId(new URL(window.location.href));

function isSoftLink(link) {
  if (!link || link.origin !== window.location.origin) return false;
  if (link.target || link.hasAttribute("download")) return false;

  return !link.getAttribute("href").startsWith("#");
}

function syncNav(doc) {
  const currentHref = doc.querySelector(".primary-nav a[aria-current]")?.getAttribute("href");

  document.querySelectorAll(".primary-nav a").forEach((link) => {
    if (link.getAttribute("href") === currentHref) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

// Mỗi trang khai báo khoá tiêu đề/mô tả của mình trên <body>; trang chủ dùng mặc định
// nên không có thuộc tính nào, phải xoá hẳn thay vì gán chuỗi rỗng.
function syncBodyKeys(doc) {
  for (const key of ["titleKey", "descriptionKey"]) {
    const value = doc.body.dataset[key];

    if (value) document.body.dataset[key] = value;
    else delete document.body.dataset[key];
  }
}

function loadScript(src, type) {
  return new Promise((resolve) => {
    const element = document.createElement("script");
    if (type) element.type = type;
    element.src = src;
    element.addEventListener("load", resolve);
    element.addEventListener("error", resolve);
    document.body.append(element);
  });
}

// Trang mới có thể cần script mà phiên này chưa tải (ví dụ vào trang nhạc lần đầu).
// Script đã tải rồi thì không tải lại - nó tự dựng lại nội dung qua sự kiện site:page.
async function loadNewScripts(doc) {
  for (const script of doc.querySelectorAll("script[src]")) {
    const src = new URL(script.getAttribute("src"), window.location.href).href;
    if (loadedScripts.has(src)) continue;

    loadedScripts.add(src);
    await loadScript(src, script.getAttribute("type"));
  }
}

// "instant" chứ không để mặc định: styles.css đặt scroll-behavior: smooth, và cuộn
// mượt lúc vừa đổi trang bị huỷ giữa chừng, kết quả là đứng nguyên ở đầu trang.
function restoreScroll(url) {
  const target = url.hash && document.querySelector(url.hash);

  if (target) target.scrollIntoView({ behavior: "instant" });
  else window.scrollTo({ top: 0, behavior: "instant" });
}

async function swap(url, push) {
  const response = await fetch(url.href);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const doc = new DOMParser().parseFromString(await response.text(), "text/html");
  const nextMain = doc.querySelector("main");
  const currentMain = document.querySelector("main");

  if (!nextMain || !currentMain) throw new Error("The page has no <main> to swap");

  if (push) window.history.pushState({ page: url.pathname }, "", url);
  rendered = pageId(url);

  currentMain.replaceWith(nextMain);
  syncBodyKeys(doc);
  syncNav(doc);

  await loadNewScripts(doc);

  document.dispatchEvent(new CustomEvent("site:page", { detail: { path: url.pathname } }));
  restoreScroll(url);
}

async function go(url, push) {
  try {
    await swap(url, push);
  } catch {
    window.location.href = url.href;
  }
}

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.target.closest("a[href]");
  if (!isSoftLink(link)) return;

  const url = new URL(link.href);

  // Vẫn là trang đang mở, chỉ khác neo: để trình duyệt tự cuộn như thường.
  if (pageId(url) === rendered) return;

  event.preventDefault();
  go(url, true);
});

// Back/forward sang trang khác thì thay <main>. Back/forward trong cùng một trang
// (đổi tab danh sách nhạc) là việc của script trang đó.
window.addEventListener("popstate", () => {
  const url = new URL(window.location.href);
  if (pageId(url) === rendered) return;

  go(url, false);
});
