import fs from "node:fs";
import path from "node:path";
import {
  decodeEntities,
  isoDate,
  makeExcerpt,
  parseTags,
  slugify,
  toPosix,
  truncate,
  walkFiles,
} from "./utils.mjs";

const ACCENTS = new Set(["copper", "teal", "violet", "amber"]);

function extractMeta(html, name) {
  const pattern = new RegExp(
    `<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  return decodeEntities((html.match(pattern) || [])[1] || "").trim();
}

function extractTitle(html) {
  return decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function loadLabs({ labsDir, site }) {
  if (!fs.existsSync(labsDir)) return { labs: [], warnings: [] };
  const files = walkFiles(labsDir, (file) => file.toLowerCase().endsWith(".html")).sort();
  const labs = [];
  const warnings = [];

  for (const file of files) {
    const relative = toPosix(path.relative(labsDir, file));
    if (relative.toLowerCase() === "index.html") {
      warnings.push(`${relative}: labs/index.html 由站点自动生成，已跳过`);
      continue;
    }

    const sidecarFile = file.replace(/\.html$/i, ".meta.json");
    let meta = {};
    if (fs.existsSync(sidecarFile)) {
      try {
        meta = JSON.parse(fs.readFileSync(sidecarFile, "utf8"));
      } catch (error) {
        warnings.push(`${toPosix(path.relative(labsDir, sidecarFile))}: JSON 解析失败 (${error.message})`);
      }
    }

    const html = fs.readFileSync(file, "utf8");
    const stat = fs.statSync(file);
    const title =
      String(meta.title || extractTitle(html) || path.basename(file, ".html"))
        .replace(/\s+/g, " ")
        .trim();
    const description = truncate(
      String(meta.description || extractMeta(html, "description") || makeExcerpt(html, 185)).trim(),
      240,
    );
    const date = isoDate(meta.date) || isoDate(stat.mtime);
    const tags = meta.tags ? parseTags(meta.tags) : ["交互教程"];
    const route = `labs/${relative}`;
    const accent = ACCENTS.has(meta.accent) ? meta.accent : ["copper", "teal", "violet"][labs.length % 3];

    labs.push({
      kind: "lab",
      type: "lab",
      file,
      relative,
      route,
      href: route,
      title,
      description,
      excerpt: makeExcerpt(description, 120),
      date,
      updated: isoDate(meta.updated) || date,
      tags,
      order: Number.isFinite(Number(meta.order)) ? Number(meta.order) : 999,
      hidden: meta.hidden === true,
      featured: meta.featured !== false,
      cover: String(meta.cover || "").trim(),
      accent,
      minutes: Number.isFinite(Number(meta.minutes)) ? Number(meta.minutes) : null,
      difficulty: String(meta.difficulty || "").trim(),
      note: String(meta.note || "").trim(),
      id: slugify(relative.replace(/\.html$/i, "")),
      searchText: `${title} ${description} ${tags.join(" ")}`,
    });
  }

  labs.sort(
    (a, b) => a.order - b.order || b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "zh-CN"),
  );
  const visible = labs.filter((lab) => !lab.hidden);
  visible.forEach((lab, index) => {
    lab.number = index + 1;
  });

  return { labs, visible, warnings };
}
