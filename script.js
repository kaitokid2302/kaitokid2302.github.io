const DEFAULT_LANGUAGE = "en";
const DEFAULT_THEME = "light";
const LANGUAGE_VALUES = ["en", "vi"];
const THEME_VALUES = ["light", "dark"];

const copy = {
  en: {
    pageTitle: "Dinh Truong Lam — Senior Backend / System Engineer",
    pageDescription:
      "Senior Backend / System Engineer focused on resilient, high-throughput distributed systems.",
    storiesPageTitle: "Stories — Dinh Truong Lam",
    storiesPageDescription:
      "Short stories and photographs from life outside the terminal — travel, milestones, and the ordinary evenings in between.",
    skip: "Skip to main content",
    backToTop: "Back to top",
    backToHome: "Back to home",
    menuOpen: "Menu",
    menuClose: "Close",
    primaryNav: "Primary navigation",
    navWork: "Work",
    navPrinciples: "Principles",
    navStories: "Stories",
    navContact: "Contact",
    preferenceControls: "Theme and language controls",
    languageSwitcher: "Language switcher",
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
    heroIndex: "Profile",
    heroKicker: "Backend Engineer | High-throughput distributed systems",
    heroTitle: "I design systems that hold when traffic spikes.",
    heroLede:
      "I focus on backend flows with real consequences: traffic distribution, data consistency, resilience when dependencies fail, and observability during release.",
    heroCta: "View selected work",
    heroCv: "Download CV ↗",
    profileAndEducation: "Profile and education",
    portraitAlt: "Dinh Truong Lam at a lakeside sunset",
    educationKicker: "Education",
    educationTitle: "ITMO University",
    itmoLinkText: "Visit official site",
    itmoLinkLabel: "Visit ITMO University (opens in a new tab)",
    educationProgram: "Software Engineering",
    educationMeta: "2019—2025 · GPA 3.2 / 4.0",
    educationQsText: "QS #78 worldwide in Computer Science & Information Systems (2024)",
    educationQsLinkLabel: "Read ITMO's QS ranking history (opens in a new tab)",
    educationIcpcText: "Home to the world’s only seven-time ACM ICPC champion team",
    educationIcpcLinkLabel: "Read ITMO's ACM ICPC achievement (opens in a new tab)",
    capabilityLine: "Technical capabilities",
    technologyStack: "Technology stack",
    workKicker: "01 — Selected work",
    workTitle: "Systems told through decisions and outcomes.",
    workIntro:
      "Not a technology list. Each story below is a problem solved through architecture, operation, and explicit trade-offs.",
    case1Title: "Core system flow",
    case1Subtitle: "Latency and resilience",
    case1Detail:
      "At MoMo, replaced per-item RabbitMQ async work with a unified gRPC call, then controlled concurrency, traced distributed flow, and rolled out safely with feature flags.",
    case2Title: "B2B order management",
    case2Subtitle: "Preventing overselling",
    case2Result: "20K+ orders/day",
    case2Detail:
      "Built Spring Boot services around PostgreSQL locking to preserve transactional consistency under load, then used Circuit Breakers to stop downstream failures from cascading.",
    case3Title: "Smart city data",
    case3Subtitle: "Time-series pipeline",
    case3Result: "15M records/day",
    case3Detail:
      "Designed event-driven ingestion for 50+ IoT stations: Kafka ingestion, MinIO claim-check, append-only Cassandra writes, and cache-aside API reads.",
    principlesKicker: "02 — Working principles",
    principlesTitle: "A good system does more than work on a normal day.",
    principle1Title: "Design for failure.",
    principle1Text: "Treat degradation, retries, and idempotency as part of the primary flow.",
    principle2Title: "Measure before optimizing.",
    principle2Text: "Start with latency, saturation, and operational signals instead of intuition.",
    principle3Title: "Roll out with a way back.",
    principle3Text: "Use observability, feature flags, and canaries to reduce blast radius.",
    recognitionKicker: "03 — Foundation",
    recognitionTitle: "Algorithmic foundation",
    storiesKicker: "Stories",
    storiesTitle: "Notes from outside the terminal.",
    storiesIntro:
      "Places, milestones, and the ordinary evenings that turned out to matter more than the milestones.",
    storyBack: "← All stories",
    storyBackPlain: "All stories",
    contactKicker: "04 — Contact",
    contactTitle: "Have a hard backend problem? Start with the architecture.",
    contactEmail: "Email me",
    copyEmail: "Copy email",
    copySuccess: "Email address copied.",
    copyFallback: "dinhtruonglam001@gmail.com"
  },
  vi: {
    pageTitle: "Đinh Trường Lãm — Senior Backend / System Engineer",
    pageDescription:
      "Senior Backend / System Engineer tập trung vào hệ thống phân tán chịu tải cao, bền vững và dễ vận hành.",
    storiesPageTitle: "Câu chuyện — Đinh Trường Lãm",
    storiesPageDescription:
      "Những câu chuyện và hình ảnh ngoài màn hình terminal — nơi đã đi qua, những cột mốc, và các buổi chiều rất đỗi bình thường.",
    skip: "Đi tới nội dung chính",
    backToTop: "Về đầu trang",
    backToHome: "Về trang chủ",
    menuOpen: "Mục lục",
    menuClose: "Đóng",
    primaryNav: "Điều hướng chính",
    navWork: "Công việc",
    navPrinciples: "Nguyên tắc",
    navStories: "Câu chuyện",
    navContact: "Liên hệ",
    preferenceControls: "Tuỳ chọn giao diện và ngôn ngữ",
    languageSwitcher: "Chọn ngôn ngữ",
    switchToDark: "Chuyển sang giao diện tối",
    switchToLight: "Chuyển sang giao diện sáng",
    heroIndex: "Hồ sơ",
    heroKicker: "Backend Engineer | Hệ thống phân tán chịu tải cao",
    heroTitle: "Tôi thiết kế những hệ thống vẫn đứng vững khi lưu lượng tăng.",
    heroLede:
      "Tôi tập trung vào các luồng backend có ảnh hưởng thật: phân phối lưu lượng, tính nhất quán dữ liệu, độ bền khi phụ thuộc gặp sự cố và khả năng quan sát khi triển khai.",
    heroCta: "Xem các hệ thống tiêu biểu",
    heroCv: "Tải CV ↗",
    profileAndEducation: "Hồ sơ và học vấn",
    portraitAlt: "Đinh Trường Lãm bên hồ lúc hoàng hôn",
    educationKicker: "Học vấn",
    educationTitle: "ITMO University",
    itmoLinkText: "Xem trang chính thức",
    itmoLinkLabel: "Truy cập ITMO University (mở trong tab mới)",
    educationProgram: "Kỹ thuật phần mềm",
    educationMeta: "2019—2025 · GPA 3.2 / 4.0",
    educationQsText: "QS hạng #78 thế giới ngành Khoa học Máy tính & Hệ thống Thông tin (2024)",
    educationQsLinkLabel: "Xem lịch sử xếp hạng QS của ITMO (mở trong tab mới)",
    educationIcpcText: "Ngôi trường đứng sau đội tuyển ACM ICPC vô địch thế giới 7 lần",
    educationIcpcLinkLabel: "Xem thành tích ACM ICPC của ITMO (mở trong tab mới)",
    capabilityLine: "Năng lực kỹ thuật",
    technologyStack: "Công nghệ sử dụng",
    workKicker: "01 — Chọn lọc",
    workTitle: "Hệ thống được kể bằng quyết định và kết quả.",
    workIntro:
      "Không phải danh sách công nghệ. Mỗi phần dưới đây là một vấn đề cần giải bằng kiến trúc, vận hành và sự đánh đổi rõ ràng.",
    case1Title: "Core system flow",
    case1Subtitle: "Latency và resilience",
    case1Detail:
      "Tại MoMo, thay xử lý RabbitMQ bất đồng bộ theo từng item bằng một gRPC call thống nhất; kiểm soát concurrency, theo dõi luồng phân tán và rollout an toàn với feature flag.",
    case2Title: "Quản lý đơn hàng B2B",
    case2Subtitle: "Ngăn overselling",
    case2Result: "20K+ đơn/ngày",
    case2Detail:
      "Thiết kế các service Spring Boot với PostgreSQL locking để bảo toàn tính nhất quán giao dịch khi lưu lượng tăng; dùng Circuit Breaker để lỗi downstream không lan thành sự cố dây chuyền.",
    case3Title: "Dữ liệu thành phố thông minh",
    case3Subtitle: "Pipeline time-series",
    case3Result: "15M bản ghi/ngày",
    case3Detail:
      "Tạo pipeline event-driven cho hơn 50 trạm IoT: Kafka ingestion, claim-check với MinIO, ghi append-only vào Cassandra và cache-aside cho lớp API.",
    principlesKicker: "02 — Cách làm việc",
    principlesTitle: "Hệ thống tốt không chỉ chạy được lúc bình thường.",
    principle1Title: "Thiết kế cho lỗi xảy ra.",
    principle1Text: "Xem degradation, retry và idempotency là một phần của luồng chính.",
    principle2Title: "Đo trước khi tối ưu.",
    principle2Text: "Bắt đầu bằng latency, saturation và tín hiệu vận hành thay vì trực giác.",
    principle3Title: "Rollout có đường lui.",
    principle3Text: "Dùng quan sát, feature flag và canary để giảm bán kính rủi ro.",
    recognitionKicker: "03 — Nền tảng",
    recognitionTitle: "Thành tích thuật toán",
    storiesKicker: "Câu chuyện",
    storiesTitle: "Chuyện bên lề, chuyện đời, chuyện dev.",
    storiesIntro:
      "Những nơi từng sống, mấy chuyện vui buồn, và cả những lúc chẳng liên quan gì đến code.",
    storyBack: "← Tất cả câu chuyện",
    storyBackPlain: "Tất cả câu chuyện",
    contactKicker: "04 — Liên hệ",
    contactTitle: "Có bài toán backend khó? Hãy bắt đầu từ kiến trúc.",
    contactEmail: "Gửi email",
    copyEmail: "Sao chép email",
    copySuccess: "Đã sao chép địa chỉ email.",
    copyFallback: "dinhtruonglam001@gmail.com"
  }
};

const languageButtons = document.querySelectorAll("[data-lang]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".primary-nav");
const copyButton = document.querySelector(".copy-email");
const copyStatus = document.querySelector(".copy-status");
const skillLinks = document.querySelectorAll("[data-case-target]");

let currentLanguage = DEFAULT_LANGUAGE;
let currentTheme = DEFAULT_THEME;

function getStoredPreference(key, fallback, validValues) {
  try {
    const value = localStorage.getItem(key);
    return validValues.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function setStoredPreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function dictionaryFor(language = currentLanguage) {
  return copy[language] ?? copy[DEFAULT_LANGUAGE];
}

function setMenuState(isOpen) {
  if (!menuToggle || !navigation) return;

  const dictionary = dictionaryFor();
  navigation.classList.toggle("is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? dictionary.menuClose : dictionary.menuOpen;
}

function updateThemeControl() {
  if (!themeToggle) return;

  const dictionary = dictionaryFor();
  const nextAction = currentTheme === "dark" ? dictionary.switchToLight : dictionary.switchToDark;
  themeToggle.setAttribute("aria-pressed", String(currentTheme === "dark"));
  themeToggle.setAttribute("aria-label", nextAction);
  themeToggle.title = nextAction;
}

function setTheme(theme, persist = true) {
  currentTheme = THEME_VALUES.includes(theme) ? theme : DEFAULT_THEME;
  document.documentElement.dataset.theme = currentTheme;
  document.documentElement.style.colorScheme = currentTheme;
  updateThemeControl();

  if (persist) setStoredPreference("landing-theme", currentTheme);
}

function setLanguage(language, persist = true) {
  currentLanguage = LANGUAGE_VALUES.includes(language) ? language : DEFAULT_LANGUAGE;
  const dictionary = dictionaryFor();

  // Each page names its own title/description keys on <body>; the landing page
  // keeps the defaults.
  const titleKey = document.body.dataset.titleKey ?? "pageTitle";
  const descriptionKey = document.body.dataset.descriptionKey ?? "pageDescription";

  document.documentElement.lang = currentLanguage;
  document.title = dictionary[titleKey];
  document.querySelector("meta[name='description']")?.setAttribute("content", dictionary[descriptionKey]);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key]) element.textContent = dictionary[key];
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    if (dictionary[key]) element.setAttribute("aria-label", dictionary[key]);
  });

  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    const key = element.dataset.i18nAlt;
    if (dictionary[key]) element.setAttribute("alt", dictionary[key]);
  });

  languageButtons.forEach((button) => {
    const isActive = button.dataset.lang === currentLanguage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  updateThemeControl();
  setMenuState(navigation?.classList.contains("is-open") ?? false);

  if (persist) setStoredPreference("landing-language", currentLanguage);

  document.dispatchEvent(new CustomEvent("site:language", { detail: { language: currentLanguage } }));
}

function revealCase(caseId) {
  const caseStudy = document.getElementById(caseId);
  if (caseStudy instanceof HTMLDetailsElement) caseStudy.open = true;
}

function revealCaseFromHash() {
  revealCase(window.location.hash.slice(1));
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.lang));
});

themeToggle?.addEventListener("click", () => {
  setTheme(currentTheme === "light" ? "dark" : "light");
});

menuToggle?.addEventListener("click", () => {
  setMenuState(!navigation?.classList.contains("is-open"));
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuState(false));
});

skillLinks.forEach((link) => {
  link.addEventListener("click", () => revealCase(link.dataset.caseTarget));
});

window.addEventListener("hashchange", revealCaseFromHash);
revealCaseFromHash();

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !navigation?.classList.contains("is-open")) return;

  setMenuState(false);
  menuToggle?.focus();
});

copyButton?.addEventListener("click", async () => {
  const dictionary = dictionaryFor();

  try {
    if (!navigator.clipboard) throw new Error("Clipboard API is unavailable");
    await navigator.clipboard.writeText(copyButton.dataset.email);
    copyStatus.textContent = dictionary.copySuccess;
  } catch {
    copyStatus.textContent = dictionary.copyFallback;
  }
});

setLanguage(getStoredPreference("landing-language", DEFAULT_LANGUAGE, LANGUAGE_VALUES), false);
setTheme(getStoredPreference("landing-theme", DEFAULT_THEME, THEME_VALUES), false);
