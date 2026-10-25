import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import siteConfig from "../../site.config.mjs";
import { loadNotes, groupNotes } from "./content.mjs";
import { loadLabs } from "./labs.mjs";
import { createMarkdown, renderMarkdown } from "./markdown.mjs";
import {
  renderHome,
  renderLabsIndex,
  renderNote,
  renderNotFound,
  renderNotesIndex,
  renderRobots,
  renderSitemap,
} from "./templates.mjs";
import {
  copyDir,
  ensureDir,
  htmlToSearchText,
  rmrf,
  safeJson,
  slugify,
  stripHtml,
  toPosix,
  walkFiles,
  writeFile,
} from "./utils.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const contentDir = path.join(projectRoot, "content");
const labsDir = path.join(projectRoot, "labs");
const publicDir = path.join(projectRoot, "public");
const srcDir = path.join(projectRoot, "src");
const distDir = path.join(projectRoot, "dist");
const katexDir = path.join(projectRoot, "node_modules", "katex", "dist");

function copyStaticAssets() {
  copyDir(publicDir, distDir);
  ensureDir(path.join(distDir, "assets"));

  fs.copyFileSync(path.join(srcDir, "styles", "main.css"), path.join(distDir, "assets", "main.css"));
  fs.copyFileSync(path.join(srcDir, "client", "site.js"), path.join(distDir, "assets", "site.js"));

  const katexTarget = path.join(distDir, "assets", "vendor", "katex");
  ensureDir(katexTarget);
  fs.copyFileSync(path.join(katexDir, "katex.min.css"), path.join(katexTarget, "katex.min.css"));
  copyDir(path.join(katexDir, "fonts"), path.join(katexTarget, "fonts"));

  if (fs.existsSync(labsDir)) {
    copyDir(labsDir, path.join(distDir, "labs"), {
      filter: (entry) => !entry.name.endsWith(".meta.json") && entry.name !== ".DS_Store",
    });
  }

  for (const file of walkFiles(contentDir, (item) => !item.endsWith(".md"))) {
    const relative = toPosix(path.relative(contentDir, file));
    const target = path.join(distDir, "content-assets", relative);
    ensureDir(path.dirname(target));
    fs.copyFileSync(file, target);
  }

  writeFile(path.join(distDir, ".nojekyll"), "");
}

function extractLabHeadings(html) {
  const headings = [];
  const pattern = /<h([1-3])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const text = stripHtml(match[3]).replace(/\s+/g, " ").trim();
    if (!text) continue;
    const idMatch = match[2].match(/\bid=["']([^"']+)["']/i);
    headings.push({ level: Number(match[1]), text, id: idMatch ? idMatch[1] : "" });
    if (headings.length >= 80) break;
  }
  return headings;
}

function buildSearchIndex(notes, labs) {
  const entries = [];
  for (const note of notes) {
    entries.push({
      kind: "note",
      title: note.title,
      href: note.route,
      section: note.section.title,
      description: note.description,
      tags: note.tags,
      updated: note.updated,
      headings: note.headings.map((heading) => ({ text: heading.text, id: heading.id })),
      text: note.searchText,
    });
  }
  for (const lab of labs) {
    entries.push({
      kind: "lab",
      title: lab.title,
      href: lab.route,
      section: "实验工坊",
      description: lab.description,
      tags: lab.tags,
      updated: lab.updated,
      headings: extractLabHeadings(fs.readFileSync(lab.file, "utf8")),
      text: `${lab.description} ${htmlToSearchText(fs.readFileSync(lab.file, "utf8")).slice(0, 20000)}`,
    });
  }
  return entries.sort(
    (a, b) =>
      String(b.updated || "").localeCompare(String(a.updated || "")) ||
      a.title.localeCompare(b.title, "zh-CN"),
  );
}

function injectLiveReload(html, base) {
  const snippet = `<script>new EventSource(${JSON.stringify(
    `${base}__reload`,
  )}).onmessage=function(){location.reload()};</script>`;
  return html.replace("</body>", `${snippet}\n</body>`);
}

export async function buildSite(options = {}) {
  const startedAt = performance.now();
  const site = siteConfig;
  const warnings = [];

  rmrf(distDir);
  ensureDir(distDir);
  copyStaticAssets();

  const { notes, visible: visibleNotes, warnings: noteWarnings } = loadNotes({ contentDir, site });
  warnings.push(...noteWarnings);
  const { labs, visible: visibleLabs, warnings: labWarnings } = loadLabs({ labsDir, site });
  warnings.push(...labWarnings);
  for (const lab of visibleLabs) {
    if (lab.cover && !/^https?:\/\//i.test(lab.cover) && !fs.existsSync(path.join(publicDir, lab.cover))) {
      warnings.push(`${lab.relative}: 封面不存在 (${lab.cover})，已使用默认封面`);
      lab.cover = "";
    }
  }

  const groups = groupNotes(visibleNotes, site.sections);
  const orderedNotes = groups.flatMap((group) => group.notes);
  const md = createMarkdown(site);

  for (const note of notes) {
    const env = {
      base: site.base,
      contentDir: note.contentPath,
      slugify,
      headings: [],
      page: note,
    };
    const rendered = renderMarkdown(md, note.body, env);
    note.html = rendered.html;
    note.headings = rendered.headings;

    const index = orderedNotes.findIndex((item) => item.route === note.route);
    const prev = index > 0 ? orderedNotes[index - 1] : null;
    const next = index >= 0 && index < orderedNotes.length - 1 ? orderedNotes[index + 1] : null;

    const html = renderNote({
      site,
      note,
      html: note.html,
      headings: note.headings,
      prev,
      next,
      groups,
      labs: visibleLabs,
    });
    writeFile(path.join(distDir, note.route), html);

    const rawTarget = path.join(distDir, note.rawHref);
    ensureDir(path.dirname(rawTarget));
    fs.copyFileSync(note.file, rawTarget);
  }

  let homeHtml = renderHome({ site, notes: visibleNotes, labs: visibleLabs, groups });
  let notesHtml = renderNotesIndex({ site, notes: visibleNotes, groups, labs: visibleLabs });
  let labsHtml = renderLabsIndex({ site, labs: visibleLabs, groups });
  const notFoundHtml = renderNotFound({ site, groups, labs: visibleLabs });

  if (options.dev) {
    homeHtml = injectLiveReload(homeHtml, site.base);
    notesHtml = injectLiveReload(notesHtml, site.base);
    labsHtml = injectLiveReload(labsHtml, site.base);
  }

  writeFile(path.join(distDir, "index.html"), homeHtml);
  writeFile(path.join(distDir, "notes.html"), notesHtml);
  writeFile(path.join(distDir, "labs", "index.html"), labsHtml);
  writeFile(path.join(distDir, "404.html"), notFoundHtml);

  const searchIndex = buildSearchIndex(visibleNotes, visibleLabs);
  writeFile(path.join(distDir, "assets", "search-index.json"), safeJson({ entries: searchIndex }));

  if (options.dev) {
    for (const note of notes) {
      const target = path.join(distDir, note.route);
      writeFile(target, injectLiveReload(fs.readFileSync(target, "utf8"), site.base));
    }
  }

  const sitemapUrls = [
    { route: "index.html", lastmod: new Date().toISOString().slice(0, 10) },
    { route: "notes.html", lastmod: new Date().toISOString().slice(0, 10) },
    { route: "labs/index.html", lastmod: new Date().toISOString().slice(0, 10) },
    { route: "about.html", lastmod: notes.find((note) => note.route === "about.html")?.updated || "" },
    ...visibleNotes
      .filter((note) => !note.noindex)
      .map((note) => ({ route: note.route, lastmod: note.updated })),
    ...visibleLabs.map((lab) => ({ route: lab.route, lastmod: lab.updated })),
  ];
  writeFile(path.join(distDir, "sitemap.xml"), renderSitemap(site, sitemapUrls));
  writeFile(path.join(distDir, "robots.txt"), renderRobots(site));

  const elapsed = Math.round(performance.now() - startedAt);
  if (!options.silent) {
    const pageCount = notes.length + 4;
    console.log(`\n  Analog Circuit Lab  ${site.base}`);
    console.log(`  ${pageCount} pages · ${visibleLabs.length} labs · built in ${elapsed} ms`);
    if (warnings.length) {
      console.log("\n  Warnings:");
      warnings.forEach((warning) => console.log(`   ! ${warning}`));
    }
    console.log(`  → ${path.relative(process.cwd(), distDir)}\n`);
  }

  return { site, notes, visibleNotes, labs, visibleLabs, groups, warnings, elapsed };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  buildSite().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
