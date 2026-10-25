import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import site from "../site.config.mjs";
import { walkFiles } from "./lib/utils.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const distDir = path.join(projectRoot, "dist");

if (!fs.existsSync(distDir)) {
  console.error("dist/ 不存在，请先运行 npm run build。");
  process.exit(1);
}

const htmlFiles = walkFiles(distDir, (file) => file.endsWith(".html"));
const errors = [];
const checked = new Set();

function targetFor(pageFile, rawHref) {
  const withoutHash = rawHref.split("#")[0].split("?")[0];
  if (!withoutHash) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(withoutHash);
  } catch {
    errors.push(`${path.relative(distDir, pageFile)} → 非法 URL 编码：${rawHref}`);
    return null;
  }

  if (decoded.startsWith("/")) {
    const baseNoSlash = site.base.replace(/\/$/, "");
    if (baseNoSlash && decoded.startsWith(`${baseNoSlash}/`)) {
      decoded = decoded.slice(baseNoSlash.length);
    }
    return path.join(distDir, decoded.replace(/^\/+/, ""));
  }
  return path.resolve(path.dirname(pageFile), decoded);
}

function existsAsPage(target) {
  if (!target) return true;
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true;
  if (!path.extname(target) && fs.existsSync(`${target}.html`)) return true;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    return fs.existsSync(path.join(target, "index.html"));
  }
  return false;
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const hrefs = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)].map((match) => match[1]);
  for (const href of hrefs) {
    if (/^(?:[a-z]+:)?\/\//i.test(href) || /^(?:mailto|tel|data|javascript):/i.test(href)) continue;
    if (href.startsWith("#")) continue;
    const target = targetFor(file, href);
    if (!target) continue;
    const key = `${file}::${target}`;
    if (checked.has(key)) continue;
    checked.add(key);
    if (!existsAsPage(target)) {
      errors.push(`${path.relative(distDir, file)} → 断链：${href}`);
    }
  }

  if (!/<title>[^<]*<\/title>/i.test(html)) {
    errors.push(`${path.relative(distDir, file)} → 缺少 <title>`);
  }
  if (!/<meta\s+name=["']description["']/i.test(html)) {
    errors.push(`${path.relative(distDir, file)} → 缺少 meta description`);
  }
}

if (errors.length) {
  console.error(`\n发现 ${errors.length} 个问题：\n`);
  for (const error of errors) console.error(`  ✕ ${error}`);
  process.exit(1);
}

console.log(`\n  ✓ ${htmlFiles.length} 个 HTML 页面，${checked.size} 条内部链接，全部通过。\n`);
