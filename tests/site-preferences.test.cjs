const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const test = require("node:test");

const read = (file) => readFileSync(`${__dirname}/../${file}`, "utf8");

test("first visit is English in the light editorial theme", () => {
  const html = read("index.html");
  const css = read("styles.css");

  assert.match(html, /<html lang="en" data-theme="light">/);
  assert.match(html, /data-theme-toggle/);
  assert.match(html, /data-lang="en"[^>]*class="is-active"/);
  assert.match(css, /:root\s*\{[\s\S]*color-scheme:\s*light/);
  assert.match(css, /:root\[data-theme="dark"\]/);
});

test("preference controls and their stored defaults stay explicit", () => {
  const html = read("index.html");
  const script = read("script.js");

  assert.match(html, /aria-label="Theme switcher"/);
  assert.match(script, /landing-language/);
  assert.match(script, /landing-theme/);
  assert.match(script, /DEFAULT_LANGUAGE\s*=\s*"en"/);
  assert.match(script, /DEFAULT_THEME\s*=\s*"light"/);
});

test("page keeps the supplied editorial hierarchy", () => {
  const html = read("index.html");
  const css = read("styles.css");

  assert.match(html, /class="masthead"/);
  assert.match(html, /class="hero"/);
  assert.match(html, /class="case-list"/);
  assert.match(html, /class="principle-grid"/);
  assert.match(html, /class="[^"]*copy-email[^"]*"/);
  assert.match(css, /--display:/);
  assert.match(css, /\.case\[open\] \.case-open/);
  assert.match(css, /@media \(max-width: 800px\)/);
});

test("interaction layer keeps storage, accessibility, and motion fallbacks", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const script = read("script.js");

  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-pressed=/);
  assert.match(script, /getStoredPreference/);
  assert.match(script, /setStoredPreference/);
  assert.match(script, /try\s*\{/);
  assert.match(script, /aria-pressed/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("mobile preference controls preserve 44px touch targets", () => {
  const css = read("styles.css");

  assert.doesNotMatch(css, /\.theme-toggle\s*\{\s*min-width:\s*40px/);
  assert.doesNotMatch(css, /\.language-toggle button\s*\{\s*min-width:\s*38px/);
  assert.doesNotMatch(css, /\.language-toggle button\s*\{\s*min-width:\s*34px/);
  assert.match(css, /\.text-link\s*\{[\s\S]*min-height:\s*44px/);
});

test("accessible labels follow the selected language", () => {
  const html = read("index.html");
  const script = read("script.js");

  assert.match(html, /class="wordmark"[\s\S]*data-i18n-aria-label="backToTop"/);
  assert.match(html, /class="masthead-actions"[\s\S]*data-i18n-aria-label="preferenceControls"/);
  assert.equal((html.match(/data-i18n-aria-label="technologyStack"/g) ?? []).length, 3);
  assert.match(script, /backToTop:/);
  assert.match(script, /preferenceControls:/);
  assert.match(script, /technologyStack:/);
});

test("primary navigation has English and Vietnamese copy", () => {
  const script = read("script.js");

  assert.match(script, /navWork:\s*"Work"/);
  assert.match(script, /navPrinciples:\s*"Principles"/);
  assert.match(script, /navContact:\s*"Contact"/);
  assert.match(script, /navWork:\s*"Công việc"/);
  assert.match(script, /navPrinciples:\s*"Nguyên tắc"/);
  assert.match(script, /navContact:\s*"Liên hệ"/);
});

test("keyboard navigation retains a valid focus path", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const script = read("script.js");

  assert.match(html, /<main id="main" tabindex="-1">/);
  assert.match(css, /\.menu-toggle\s*\{[\s\S]*min-width:\s*44px/);
  assert.match(script, /event\.key !== "Escape"[\s\S]*menuToggle\?\.focus\(\)/);
});

test("education and portrait identify the verified ITMO program", () => {
  const html = read("index.html");

  assert.match(html, /https:\/\/en\.itmo\.ru\/en\//);
  assert.match(html, /Software Engineering/);
  assert.match(html, /2019—2025/);
  assert.match(html, /GPA 3\.2 \/ 4\.0/);
  assert.match(html, /assets\/lam-sunset-portrait\.webp/);
  assert.match(html, /data-i18n-alt="portraitAlt"/);
  assert.ok(existsSync(`${__dirname}/../assets/lam-sunset-portrait.webp`));
});

test("education links the QS and ICPC evidence to primary ITMO sources", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const script = read("script.js");

  assert.match(html, /class="education-evidence"/);
  assert.match(html, /https:\/\/en\.itmo\.ru\/en\/page\/353\/Rankings\.htm/);
  assert.match(html, /QS #78 worldwide in Computer Science &amp; Information Systems \(2024\)/);
  assert.match(html, /https:\/\/news\.itmo\.ru\/en\/news\/6682\//);
  assert.match(html, /world’s only seven-time ACM ICPC champion team/);
  assert.match(html, /data-i18n="educationQsText"/);
  assert.match(html, /data-i18n="educationIcpcText"/);
  assert.match(script, /educationQsText:/);
  assert.match(script, /educationIcpcText:/);
  assert.match(css, /\.education-evidence a\s*\{[\s\S]*min-height:\s*44px/);
});

test("capabilities resolve to their proof cases", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const script = read("script.js");

  assert.match(html, /id="case-core-flow"/);
  assert.match(html, /id="case-b2b-orders"/);
  assert.match(html, /id="case-smart-city"/);
  assert.match(html, /href="#case-b2b-orders" data-case-target="case-b2b-orders">PostgreSQL/);
  assert.match(html, /href="#case-smart-city" data-case-target="case-smart-city">Kafka/);
  assert.match(html, /href="#case-core-flow" data-case-target="case-core-flow">RabbitMQ/);
  assert.match(html, /href="#case-core-flow" data-case-target="case-core-flow">Grafana/);
  assert.match(script, /function revealCase\(/);
  assert.match(script, /window\.addEventListener\("hashchange", revealCaseFromHash\)/);
  assert.match(css, /\.capability-line a\s*\{[\s\S]*min-height:\s*44px/);
});
