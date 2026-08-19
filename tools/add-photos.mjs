#!/usr/bin/env node
// Nạp ảnh vào mục Photos:
//
//   node tools/add-photos.mjs <ten-folder> [--max 1600] [--soft] <anh1> <anh2> ...
//
// Nhận jpg/jpeg/png/heic/heif/webp/avif/tif/tiff. Mỗi ảnh được nén sang .webp
// (cạnh dài tối đa --max, mặc định 1600px) vào assets/photos/<ten-folder>/, rồi
// upsert vào content/photos.json:
//   - nhóm chưa có  → thêm mới, date lấy từ EXIF (fallback: ngày file, rồi tên folder)
//   - nhóm có rồi   → chỉ thêm ảnh mới, KHÔNG đụng date / note / place / alt đã điền
//   - webp đã có trên đĩa nhưng thiếu trong JSON → vá lại entry còn thiếu
//
// --soft: giảm nét (blur nhẹ + quality thấp hơn) — dùng kèm --max nhỏ khi muốn ảnh mờ.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.join(import.meta.dirname, "..");
const INDEX_PATH = path.join(ROOT, "content", "photos.json");
const FOLDER_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const NAME_PATTERN = /^(\d+)-(.+)\.webp$/;
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".avif", ".tif", ".tiff"]);

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const files = [];
let folder = null;
let max = 1600;
let soft = false;

for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--max") {
    max = Number(args[++i]);
    if (!Number.isInteger(max) || max < 100) fail("--max phải là số nguyên ≥ 100");
  } else if (args[i] === "--soft") {
    soft = true;
  } else if (!folder) {
    folder = args[i];
  } else {
    files.push(args[i]);
  }
}

if (!folder || !files.length) {
  fail("Cách dùng: node tools/add-photos.mjs <ten-folder> [--max 1600] [--soft] <anh...>");
}
if (!FOLDER_PATTERN.test(folder)) {
  fail(`Tên folder "${folder}" chỉ được dùng a-z, 0-9 và dấu gạch ngang`);
}

function magick(commandArgs) {
  return execFileSync("magick", commandArgs, { encoding: "utf8" }).trim();
}

// EXIF ghi "2026:03:31 15:52:35" → "2026-03-31". Ảnh không EXIF (screenshot,
// ảnh app nhắn tin đã strip) thì trả về null để rơi xuống nguồn kém tin hơn.
function exifDate(file) {
  try {
    const raw = magick(["identify", "-format", "%[EXIF:DateTimeOriginal]", `${file}[0]`]);
    const match = raw.match(/^(\d{4}):(\d{2}):(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
  } catch {
    return null;
  }
}

function folderDate() {
  const match = folder.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function dimensions(file) {
  return magick(["identify", "-format", "%w %h", `${file}[0]`]).split(" ").map(Number);
}

const destDir = path.join(ROOT, "assets", "photos", folder);
mkdirSync(destDir, { recursive: true });

const existing = readdirSync(destDir).filter((name) => NAME_PATTERN.test(name));
const existingBySlug = new Map(existing.map((name) => [name.match(NAME_PATTERN)[2], name]));

// Đánh số tiếp theo số lớn nhất đang có, không đếm số lượng file — file 02 bị xoá
// thì ảnh mới vẫn phải là 04 chứ không được sinh một 03 thứ hai.
let nextNumber = Math.max(0, ...existing.map((name) => Number(name.match(NAME_PATTERN)[1]))) + 1;

const converted = [];
const patched = [];
const dates = [];

for (const input of files) {
  // Đường dẫn tuyệt đối luôn bắt đầu bằng "/": tên file dạng "-strip.jpg" hay
  // "label:x" sẽ không bị ImageMagick hiểu nhầm thành tuỳ chọn hay coder.
  const file = path.resolve(input);

  if (!existsSync(file)) {
    console.warn(`! Bỏ qua (không tồn tại): ${input}`);
    continue;
  }

  const extension = path.extname(file).toLowerCase();
  if (!EXTENSIONS.has(extension)) {
    console.warn(`! Bỏ qua (đuôi ${extension} không xử lý được): ${input}`);
    continue;
  }

  const slug =
    path
      .basename(file, path.extname(file))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "photo";

  // Chạy lại với cùng file gốc: webp đã có thì không nén lại, nhưng vẫn vá
  // photos.json nếu entry bị thiếu (ví dụ JSON lỡ bị revert).
  const already = existingBySlug.get(slug);
  if (already) {
    const [width, height] = dimensions(path.join(destDir, already));
    patched.push({
      src: `assets/photos/${folder}/${already}`,
      w: width,
      h: height,
      alt: { en: "", vi: "" }
    });
    console.warn(`! Đã có sẵn ${already} — không nén lại, chỉ soát JSON: ${input}`);
    continue;
  }

  const outName = `${String(nextNumber).padStart(2, "0")}-${slug}.webp`;
  const outPath = path.join(destDir, outName);

  magick([
    `${file}[0]`,
    "-auto-orient",
    "-resize", `${max}x${max}>`,
    ...(soft ? ["-gaussian-blur", "0x0.5"] : []),
    "-quality", soft ? "75" : "82",
    outPath
  ]);

  const [width, height] = dimensions(outPath);
  const date = exifDate(file) ?? statSync(file).mtime.toISOString().slice(0, 10);
  dates.push(date);
  nextNumber += 1;

  // Ghi nhận ngay để cùng một file truyền hai lần trong một lần chạy không tạo bản trùng.
  existingBySlug.set(slug, outName);

  converted.push({
    src: `assets/photos/${folder}/${outName}`,
    w: width,
    h: height,
    alt: { en: "", vi: "" }
  });

  const size = Math.round(statSync(outPath).size / 1024);
  console.log(`✓ ${outName}  ${width}×${height}  ${size} KB  (ngày đoán: ${date})`);
}

if (!converted.length && !patched.length) fail("Không có ảnh nào được xử lý.");

const index = existsSync(INDEX_PATH) ? JSON.parse(readFileSync(INDEX_PATH, "utf8")) : [];
let group = index.find((entry) => entry.folder === folder);

if (!group && (converted.length || patched.length)) {
  group = {
    folder,
    date: [...dates].sort()[0] ?? folderDate() ?? new Date().toISOString().slice(0, 10),
    note: { en: "", vi: "" },
    photos: []
  };
  index.unshift(group);
  console.log(`+ Nhóm mới "${folder}", date = ${group.date}`);
}

let added = 0;
for (const photo of [...converted, ...patched]) {
  if (!group.photos.some((entry) => entry.src === photo.src)) {
    group.photos.push(photo);
    added += 1;
  }
}

if (!added) {
  console.log("Không có gì mới: ảnh đã được nén và khai đủ trong content/photos.json.");
  process.exit(0);
}

writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`);

console.log(`\nĐã ghi ${added} ảnh vào content/photos.json.`);
console.log("Việc còn lại của sếp: điền alt (en + vi) cho từng ảnh, note nếu muốn,");
console.log("và sửa date nếu máy đoán sai. Xong chạy: node --test \"tests/*.test.cjs\"");
