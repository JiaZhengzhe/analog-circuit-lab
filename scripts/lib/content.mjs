import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cleanMarkdownBody } from "./markdown.mjs";
import {
  dateForSort,
  escapeHtml,
  isoDate,
  makeExcerpt,
  markdownSearchText,
  parseTags,
  readingTime,
  slugify,
  toPosix,
  truncate,
  walkFiles,
} from "./utils.mjs";

function titleCaseFolder(folder) {
  return folder
    .replace(/[-_]+/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .trim();
}

function sectionFor(rawSection, contentDir, siteSections) {
  const folder = contentDir ? contentDir.split("/")[0] : "start";
  const lookup = String(rawSection || folder).trim();
  const match = siteSections.find(
    (section) =>
      section.id.toLowerCase() === lookup.toLowerCase() ||
      section.title === lookup ||
      section.title.toLowerCase() === lookup.toLowerCase(),
  );
  if (match) return match;

  const id = slugify(lookup || "notes");
  return {
    id,
    title: lookup || titleCaseFolder(folder) || "笔记",
    latin: id.toUpperCase(),
    description: "",
    dynamic: true,
  };
}

export function loadNotes({ contentDir, site }) {
  const files = walkFiles(contentDir, (file) => file.endsWith(".md")).sort();
  const notes = [];
  const warnings = [];
  const routeSet = new Set();

  for (const file of files) {
    const relative = toPosix(path.relative(contentDir, file));
    const raw = fs.readFileSync(file, "utf8");
    let parsed;
    try {
      parsed = matter(raw);
    } catch (error) {
      warnings.push(`${relative}: frontmatter 解析失败，已跳过 (${error.message})`);
      continue;
    }

    const data = parsed.data || {};
    if (data.draft === true) {
      warnings.push(`${relative}: draft: true，未发布`);
      continue;
    }

    const contentPath = toPosix(path.dirname(relative)) === "." ? "" : toPosix(path.dirname(relative));
    const route = relative.replace(/\.md$/i, ".html");
    if (routeSet.has(route)) {
      warnings.push(`${relative}: 与已有页面路由冲突，已跳过`);
      continue;
    }
    routeSet.add(route);

    const h1Match = parsed.content.match(/^#\s+(.+?)\s*$/m);
    const title = String(data.title || (h1Match ? h1Match[1] : path.basename(file, ".md")))
      .replace(/[*_`]/g, "")
      .trim();
    const body = cleanMarkdownBody(parsed.content);
    const stat = fs.statSync(file);
    const date = isoDate(data.date) || isoDate(data.updated) || isoDate(stat.mtime);
    const updated = isoDate(data.updated) || date;
    const section = sectionFor(data.section, contentPath, site.sections);
    const tags = parseTags(data.tags);
    const hidden = data.hidden === true || data.unlisted === true;
    const description = truncate(
      String(data.description || data.summary || makeExcerpt(body, 185)).trim(),
      220,
    );
    const author = String(data.author || site.author).trim();
    const aiAssisted = data.aiAssisted === true;
    const reviewed = data.reviewed === true;

    notes.push({
      kind: "note",
      type: "note",
      file,
      relative,
      contentPath,
      route,
      href: route,
      rawHref: `raw/${relative}`,
      title,
      description,
      body,
      excerpt: makeExcerpt(body, 130),
      searchText: markdownSearchText(body).slice(0, 60000),
      date,
      updated,
      sortDate: dateForSort(updated),
      section,
      sectionId: section.id,
      tags,
      hidden,
      author,
      aiAssisted,
      reviewed,
      readingMinutes: readingTime(body),
      order: Number.isFinite(Number(data.order)) ? Number(data.order) : 999,
      featured: data.featured === true,
      showToc: data.toc !== false,
      license: String(data.license || site.license.content),
      licenseUrl: String(data.licenseUrl || (data.license ? "" : site.license.url)),
      sourceUrl: String(data.sourceUrl || ""),
      noindex: data.noindex === true,
      h1: h1Match ? escapeHtml(h1Match[1]) : "",
    });
  }

  notes.sort((a, b) => {
    const sectionOrder = (note) => {
      const index = site.sections.findIndex((section) => section.id === note.sectionId);
      return index === -1 ? 999 : index;
    };
    return (
      sectionOrder(a) - sectionOrder(b) ||
      a.order - b.order ||
      b.sortDate.localeCompare(a.sortDate) ||
      a.title.localeCompare(b.title, "zh-CN")
    );
  });

  const visible = notes.filter((note) => !note.hidden);
  visible.forEach((note, index) => {
    note.number = index + 1;
  });
  notes.forEach((note, index) => {
    if (note.number == null) note.number = index + 1;
  });

  return { notes, visible, warnings };
}

export function groupNotes(notes, sections) {
  const groups = [];
  for (const section of sections) {
    const items = notes.filter((note) => note.sectionId === section.id);
    if (items.length) groups.push({ ...section, notes: items });
  }
  const known = new Set(groups.map((group) => group.id));
  for (const note of notes) {
    if (!known.has(note.sectionId)) {
      groups.push({
        ...note.section,
        notes: notes.filter((item) => item.sectionId === note.sectionId),
      });
      known.add(note.sectionId);
    }
  }
  return groups;
}
