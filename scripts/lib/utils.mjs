import fs from "node:fs";
import path from "node:path";

export function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function normalizeBase(value = "/") {
  let base = String(value || "/").trim();
  if (!base.startsWith("/")) base = `/${base}`;
  if (!base.endsWith("/")) base = `${base}/`;
  return base.replace(/\/{2,}/g, "/");
}

export function normalizeSiteUrl(value = "http://localhost:4173/") {
  const url = String(value || "").trim();
  return url.endsWith("/") ? url : `${url}/`;
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function escapeAttr(value = "") {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

export function decodeEntities(value = "") {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    hellip: "…",
    mdash: "—",
    ndash: "–",
    times: "×",
    middot: "·",
    rarr: "→",
    larr: "←",
  };
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

export function stripHtml(value = "") {
  return decodeEntities(
    String(value)
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<(br|\/p|\/li|\/h[1-6]|\/tr|\/div)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(value, length = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length).replace(/[，。；、\s]+$/g, "")}…`;
}

export function makeExcerpt(markdown = "", length = 150) {
  const text = String(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/^:::\s*[a-z-]*\s*.*$/gim, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+.*$/gm, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_~`>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return truncate(text, length);
}

export function readingTime(markdown = "") {
  const text = String(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ");
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const latin = (text.replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
  const minutes = Math.max(1, Math.ceil(cjk / 380 + latin / 220));
  return minutes;
}

export function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y} 年 ${m} 月 ${d} 日`;
  }
  const match = String(value).match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (!match) return String(value);
  return `${match[1]} 年 ${match[2].padStart(2, "0")} 月 ${match[3].padStart(2, "0")} 日`;
}

export function isoDate(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
      value.getDate(),
    ).padStart(2, "0")}`;
  }
  const match = String(value).match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

export function dateForSort(value) {
  const iso = isoDate(value);
  return iso || "1970-01-01";
}

export function slugify(value = "") {
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90) || "section";
}

export function parseTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  return String(value)
    .split(/[,，;；]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

export function walkFiles(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(full, predicate));
    else if (entry.isFile() && predicate(full)) output.push(full);
  }
  return output;
}

export function copyDir(source, target, options = {}) {
  if (!fs.existsSync(source)) return;
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (options.filter && !options.filter(entry)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(from, to, options);
    else if (entry.isFile()) {
      ensureDir(path.dirname(to));
      fs.copyFileSync(from, to);
    }
  }
}

export function writeFile(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

export function markdownSearchText(markdown = "") {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/^:::\s*[a-z-]*\s*.*$/gim, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\\\[[\s\S]*?\\\]/g, " ")
    .replace(/\$[^$\n]*\$/g, " ")
    .replace(/\\\([^)]*?\\\)/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, " ")
    .replace(/^\s*\|?[\s:|-]{4,}\|?\s*$/gm, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[$*_`>|~]/g, " ")
    .replace(/\\[,;:!]/g, " ")
    .replace(/\\([a-zA-Z]+)/g, " $1 ")
    .replace(/\s+/g, " ")
    .trim();
}

export function htmlToSearchText(html = "") {
  return stripHtml(html)
    .replace(/\s+/g, " ")
    .replace(/\s+([，。；：！？、])/g, "$1")
    .trim();
}

export function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028");
}

export function pluralNotes(count) {
  return `${count} 篇`;
}
