import {
  escapeAttr,
  escapeHtml,
  formatDate,
  isoDate,
  truncate,
} from "./utils.mjs";

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4.5 4.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  moon: '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>',
  arrowRight: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  beaker: '<path d="M9 3h6M10 3v6l-5.4 9.1A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.7-2.9L14 9V3"/><path d="M8 15h8"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  spark: '<path d="m12 3 1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  terminal: '<path d="m4 7 5 5-5 5M12 17h8"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h5a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h7"/>',
};

export function icon(name, className = "icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
}

function logoMark() {
  return `<span class="brand-mark" aria-hidden="true">
  <svg viewBox="0 0 40 40" fill="none">
    <rect x="1" y="1" width="38" height="38" rx="11" fill="currentColor" opacity=".1"/>
    <path d="M8 22h5l3-10 7 18 3-8h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="8" cy="22" r="1.8" fill="currentColor"/>
    <circle cx="32" cy="22" r="1.8" fill="currentColor"/>
  </svg>
</span>`;
}

function link(site, route) {
  return `${site.base}${route}`;
}

function absoluteUrl(site, route) {
  try {
    return new URL(route, site.url).toString();
  } catch {
    return site.url;
  }
}

function pageTitle(site, title, isHome = false) {
  if (!title || isHome) return `${site.title} · ${site.latinTitle}`;
  return `${title} · ${site.title}`;
}

function tagList(tags, className = "tag-list") {
  if (!tags || !tags.length) return "";
  return `<ul class="${className}" aria-label="标签">${tags
    .map((tag) => `<li>${escapeHtml(tag)}</li>`)
    .join("")}</ul>`;
}

function currentNav(page, nav) {
  return (
    nav.find(
      (item) =>
        page === item.match ||
        page === `${item.match}.html` ||
        page.startsWith(`${item.match}/`),
    )?.match || ""
  );
}

function topbar(site, page, includeSidebar = true) {
  const active = currentNav(page, site.nav);
  const navLinks = site.nav
    .map(
      (item) => `<a class="topnav-link${active === item.match ? " is-active" : ""}" href="${link(
        site,
        item.href,
      )}"${active === item.match ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`,
    )
    .join("");

  const repoLink = site.repository
    ? `<a class="topbar-repo" href="${escapeAttr(site.repository)}" target="_blank" rel="noopener noreferrer">${icon(
        "arrowUpRight",
      )}<span>GitHub</span></a>`
    : "";

  return `<header class="topbar" data-topbar>
  <div class="topbar-inner">
    ${
      includeSidebar
        ? `<button class="icon-button menu-button" type="button" data-menu-toggle aria-label="打开目录" aria-expanded="false" aria-controls="site-sidebar">
      ${icon("menu")}
    </button>`
        : ""
    }
    <a class="brand" href="${site.base}" aria-label="${escapeAttr(site.title)}首页">
      ${logoMark()}
      <span class="brand-copy">
        <span class="brand-name">模拟电路<span>学习站</span></span>
        <span class="brand-latin">${escapeHtml(site.latinTitle)}</span>
      </span>
    </a>
    <nav class="topnav" aria-label="主导航">${navLinks}</nav>
    <div class="topbar-actions">
      <button class="search-trigger" type="button" data-search-open aria-label="搜索全站">
        ${icon("search")}
        <span class="search-trigger-label">搜索</span>
        <kbd>Ctrl K</kbd>
      </button>
      <button class="icon-button theme-button" type="button" data-theme-toggle aria-label="切换明暗主题">
        <span class="theme-icon theme-icon-sun">${icon("sun")}</span>
        <span class="theme-icon theme-icon-moon">${icon("moon")}</span>
      </button>
      ${repoLink}
    </div>
  </div>
</header>`;
}

function sidebarGroup(site, group, currentRoute) {
  const links = group.notes
    .map((note) => {
      const active = note.route === currentRoute;
      return `<li><a class="side-link${active ? " is-active" : ""}" href="${link(site, note.route)}"${
        active ? ' aria-current="page"' : ""
      }><span>${escapeHtml(note.title)}</span></a></li>`;
    })
    .join("");
  return `<section class="side-group">
  <div class="side-heading"><span>${escapeHtml(group.title)}</span><span class="side-count">${String(
    group.notes.length,
  ).padStart(2, "0")}</span></div>
  <ul class="side-list">${links}</ul>
</section>`;
}

function sidebar(site, groups, labs, currentRoute) {
  const groupsHtml = groups.map((group) => sidebarGroup(site, group, currentRoute)).join("");
  const labLinks = labs
    .map(
      (lab) => `<li><a class="side-link side-link-lab${lab.route === currentRoute ? " is-active" : ""}" href="${link(
        site,
        lab.route,
      )}" target="_blank" rel="noopener noreferrer"${
        lab.route === currentRoute ? ' aria-current="page"' : ""
      }><span>${escapeHtml(lab.title)}</span><span class="link-mark">↗</span></a></li>`,
    )
    .join("");

  return `<aside class="sidebar" id="site-sidebar" aria-label="站点目录">
  <div class="sidebar-scroll">
    <button class="sidebar-close" type="button" data-menu-close>
      ${icon("close")}<span>关闭目录</span>
    </button>
    <div class="sidebar-topline"><span>SIGNAL INDEX</span><span>${String(
      groups.reduce((sum, group) => sum + group.notes.length, 0),
    ).padStart(2, "0")}</span></div>
    <nav class="sidebar-nav" aria-label="学习目录">
      <a class="side-link side-link-home${currentRoute === "start-here.html" ? " is-active" : ""}" href="${link(
        site,
        "start-here.html",
      )}">${icon("route")}<span>学习路线</span></a>
      <a class="side-link side-link-home${currentRoute === "notes.html" ? " is-active" : ""}" href="${link(
        site,
        "notes.html",
      )}">${icon("book")}<span>全部笔记</span><span class="side-count">${String(
        groups.reduce((sum, group) => sum + group.notes.length, 0),
      ).padStart(2, "0")}</span></a>
      ${groupsHtml}
      ${
        labs.length
          ? `<section class="side-group side-group-labs">
        <div class="side-heading"><span>实验工坊</span><span class="side-count">${String(labs.length).padStart(
          2,
          "0",
        )}</span></div>
        <ul class="side-list">${labLinks}</ul>
        <a class="side-more" href="${link(site, "labs/index.html")}">全部实验 ${icon("arrowRight")}</a>
      </section>`
          : ""
      }
    </nav>
    <div class="sidebar-card">
      <span class="sidebar-card-kicker">OPEN NOTEBOOK</span>
      <p>把 AI 生成的笔记或网页放进来，它会自动出现在这里。</p>
      <a href="${link(site, "how-to-add.html")}">查看内容维护指南 ${icon("arrowUpRight")}</a>
    </div>
  </div>
</aside>
<div class="sidebar-scrim" data-sidebar-scrim hidden></div>`;
}

function searchDialog() {
  return `<div class="search-layer" id="search-layer" hidden>
  <div class="search-backdrop" data-search-close></div>
  <section class="search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-heading">
    <div class="search-head">
      <div class="search-field">
        ${icon("search")}
        <label class="sr-only" for="search-input" id="search-heading">搜索全站</label>
        <input id="search-input" type="search" placeholder="搜索公式、器件、OTA、AFE…" autocomplete="off" spellcheck="false">
        <button class="icon-button search-close" type="button" data-search-close aria-label="关闭搜索">${icon("close")}</button>
      </div>
      <div class="search-status" aria-live="polite" id="search-status">输入关键词开始检索</div>
    </div>
    <div class="search-results" id="search-results"></div>
    <div class="search-foot">
      <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
      <span><kbd>Enter</kbd> 打开</span>
      <span><kbd>Esc</kbd> 关闭</span>
      <span class="search-foot-brand">ANALOG CIRCUIT LAB</span>
    </div>
  </section>
</div>`;
}

function footer(site) {
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
  <div class="footer-top">
    <div class="footer-brand">
      <a class="brand brand-footer" href="${site.base}">
        ${logoMark()}
        <span class="brand-copy"><span class="brand-name">模拟电路<span>学习站</span></span><span class="brand-latin">${escapeHtml(
          site.latinTitle,
        )}</span></span>
      </a>
      <p>${escapeHtml(site.description)}</p>
    </div>
    <div class="footer-nav">
      <div class="footer-col">
        <span class="footer-heading">学习</span>
        <a href="${link(site, "start-here.html")}">学习路线</a>
        <a href="${link(site, "notes.html")}">全部笔记</a>
        <a href="${link(site, "labs/index.html")}">实验工坊</a>
      </div>
      <div class="footer-col">
        <span class="footer-heading">站点</span>
        <a href="${link(site, "about.html")}">关于本站</a>
        <a href="${link(site, "how-to-add.html")}">添加内容</a>
        <a href="${link(site, "raw/start-here.md")}">Markdown 示例</a>
      </div>
      <div class="footer-col">
        <span class="footer-heading">许可</span>
        <a href="${link(site, "about.html")}">内容许可 · 各页标注</a>
        <span class="footer-muted">站点代码 ${escapeHtml(site.license.code)}</span>
        <span class="footer-muted">静态托管 · 无需数据库</span>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© ${year} ${escapeHtml(site.title)}</span>
    <span class="footer-note">${escapeHtml(site.footerNote)}</span>
    <span class="footer-signal">V<sub>DD</sub> ↗ GND</span>
  </div>
</footer>`;
}

export function layout({
  site,
  title,
  description,
  route = "index.html",
  page = "",
  bodyClass = "",
  content,
  groups = [],
  labs = [],
  includeSidebar = true,
  noindex = false,
  jsonLd = null,
}) {
  const canonical = absoluteUrl(site, route);
  const ogImage = absoluteUrl(site, site.social.image);
  const fullTitle = pageTitle(site, title, route === "index.html");
  const desc = truncate(description || site.description, 180);
  const jsonLdScript = jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll("<", "\\u003c")}</script>`
    : "";
  return `<!doctype html>
<html lang="${escapeAttr(site.lang)}" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeAttr(desc)}">
  <meta name="author" content="${escapeAttr(site.author)}">
  <meta name="theme-color" content="#f3f0e8" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0b1518" media="(prefers-color-scheme: dark)">
  ${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index,follow">'}
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <link rel="icon" href="${link(site, "favicon.svg")}" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${link(site, "apple-touch-icon.png")}">
  <meta property="og:type" content="${route === "index.html" ? "website" : "article"}">
  <meta property="og:site_name" content="${escapeAttr(site.title)}">
  <meta property="og:title" content="${escapeAttr(fullTitle)}">
  <meta property="og:description" content="${escapeAttr(desc)}">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  <meta property="og:image" content="${escapeAttr(ogImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(fullTitle)}">
  <meta name="twitter:description" content="${escapeAttr(desc)}">
  <meta name="twitter:image" content="${escapeAttr(ogImage)}">
  <link rel="stylesheet" href="${link(site, "assets/vendor/katex/katex.min.css")}">
  <link rel="stylesheet" href="${link(site, "assets/main.css")}">
  <script>
    (function () {
      try {
        var saved = localStorage.getItem("acl-theme");
        var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.dataset.theme = saved || (dark ? "dark" : "light");
      } catch (error) {}
    })();
  </script>
  ${jsonLdScript}
</head>
<body class="${escapeAttr(bodyClass)}" data-base="${escapeAttr(site.base)}" data-page="${escapeAttr(page)}">
  <a class="skip-link" href="#main">跳到正文</a>
  <div class="reading-progress" data-reading-progress><span></span></div>
  ${topbar(site, page, includeSidebar)}
  <div class="site-frame${includeSidebar ? "" : " no-sidebar"}">
    ${includeSidebar ? sidebar(site, groups, labs, route) : ""}
    <main class="site-main" id="main">
      ${content}
    </main>
  </div>
  ${footer(site)}
  ${searchDialog()}
  <script src="${link(site, "assets/site.js")}" defer></script>
</body>
</html>`;
}

function breadcrumbs(site, items) {
  const parts = [`<a href="${site.base}">首页</a>`];
  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    parts.push(
      isLast
        ? `<span aria-current="page">${escapeHtml(item.label)}</span>`
        : `<a href="${link(site, item.href)}">${escapeHtml(item.label)}</a>`,
    );
  });
  return `<nav class="breadcrumbs" aria-label="面包屑">${parts.join('<span class="crumb-sep">/</span>')}</nav>`;
}

function noteActions(site, note) {
  const repoEdit =
    site.repository && !note.hidden
      ? `<a class="text-action" href="${escapeAttr(
          `${site.repository}/edit/${site.editBranch}/content/${note.relative}`,
        )}" target="_blank" rel="noopener noreferrer">${icon("arrowUpRight")}在 GitHub 编辑</a>`
      : "";
  return `<div class="page-actions">
    <a class="text-action" href="${link(site, note.rawHref)}" download>${icon("download")}下载 Markdown</a>
    <button class="text-action" type="button" data-copy-link data-copied-label="链接已复制">${icon(
      "link",
    )}复制本页链接</button>
    ${repoEdit}
  </div>`;
}

function tocRail(headings) {
  if (!headings.length) return "";
  const items = headings
    .map(
      (heading) =>
        `<li class="toc-level-${heading.level}"><a href="#${escapeAttr(heading.id)}">${escapeHtml(
          heading.text,
        )}</a></li>`,
    )
    .join("");
  return `<aside class="toc-rail" aria-label="本页目录">
    <div class="toc-sticky">
      <div class="toc-heading"><span>ON THIS PAGE</span><span>${String(headings.length).padStart(2, "0")}</span></div>
      <nav class="toc-nav"><ol>${items}</ol></nav>
      <a class="toc-top" href="#main">${icon("arrowRight")}回到顶部</a>
    </div>
  </aside>`;
}

function prevNext(site, prev, next) {
  if (!prev && !next) return "";
  return `<nav class="page-pagination" aria-label="上一篇和下一篇">
    ${
      prev
        ? `<a class="pagination-link pagination-prev" href="${link(site, prev.route)}">
      <span class="pagination-label">${icon("chevronLeft")}上一篇</span>
      <strong>${escapeHtml(prev.title)}</strong>
    </a>`
        : '<span class="pagination-empty"></span>'
    }
    ${
      next
        ? `<a class="pagination-link pagination-next" href="${link(site, next.route)}">
      <span class="pagination-label">下一篇${icon("chevronRight")}</span>
      <strong>${escapeHtml(next.title)}</strong>
    </a>`
        : '<span class="pagination-empty"></span>'
    }
  </nav>`;
}

export function renderNote({ site, note, html, headings, prev, next, groups, labs }) {
  const aiBadge = note.aiAssisted
    ? `<span class="status-badge status-ai" title="AI 辅助整理，仍需人工核对">AI 辅助${note.reviewed ? " · 已校对" : " · 待校对"}</span>`
    : "";
  const updatedNote =
    note.updated && note.updated !== note.date
      ? `<span class="meta-item">${icon("clock")}更新于 ${escapeHtml(formatDate(note.updated))}</span>`
      : "";
  const content = `<div class="content-layout${headings.length ? " has-toc" : ""}">
    <article class="article prose">
      ${breadcrumbs(site, [
        { label: note.section.title, href: "notes.html" },
        { label: note.title },
      ])}
      <header class="page-header">
        <div class="eyebrow-row">
          <span class="eyebrow"><span class="eyebrow-line"></span>${escapeHtml(note.section.title)}</span>
          <span class="note-number">NOTE ${String(note.number).padStart(2, "0")}</span>
          ${aiBadge}
        </div>
        <h1>${escapeHtml(note.title)}</h1>
        <p class="page-lede">${escapeHtml(note.description)}</p>
        <div class="page-meta">
          <span class="meta-item">${icon("clock")}${note.readingMinutes} 分钟阅读</span>
          ${
            note.date
              ? `<span class="meta-item">${icon("file")}${escapeHtml(formatDate(note.date))}</span>`
              : ""
          }
          ${updatedNote}
          <span class="meta-item">${escapeHtml(note.author)}</span>
        </div>
        <div class="page-meta-bottom">
          ${tagList(note.tags)}
          ${noteActions(site, note)}
        </div>
      </header>
      ${note.aiAssisted && !note.reviewed ? `<div class="content-disclaimer">${icon("info")}<p>本文由 AI 辅助整理，适合作为学习提纲与设计思路；关键公式、工艺参数与结论请结合教材、SPICE 仿真或实测复核。</p></div>` : ""}
      <div class="article-body" data-article-body>
        ${html}
      </div>
      <footer class="article-footer">
        <div class="article-license">
          <span class="article-footer-label">LICENSE</span>
          <p>${
            note.licenseUrl
              ? `本文采用 <a href="${escapeAttr(
                  note.licenseUrl,
                )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                  note.license,
                )}</a> 许可。引用或改编请保留出处与相同方式共享。`
              : `${escapeHtml(note.license)}。引用或改编请注明出处。`
          }</p>
        </div>
        <div class="article-signoff">
          <span class="signoff-line"></span>
          <span>${escapeHtml(site.latinTitle)} · ${escapeHtml(note.section.latin || "NOTE")}</span>
        </div>
      </footer>
      ${prevNext(site, prev, next)}
    </article>
    ${tocRail(headings)}
  </div>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: note.title,
    description: note.description,
    datePublished: note.date,
    dateModified: note.updated,
    author: { "@type": "Organization", name: note.author },
    publisher: { "@type": "Organization", name: site.title },
    mainEntityOfPage: absoluteUrl(site, note.route),
    inLanguage: site.lang,
    keywords: note.tags.join(", "),
  };

  return layout({
    site,
    title: note.title,
    description: note.description,
    route: note.route,
    page: note.route,
    bodyClass: "page-note",
    content,
    groups,
    labs,
    noindex: note.noindex,
    jsonLd,
  });
}

function statBar(notes, labs) {
  const sections = new Set(notes.map((note) => note.sectionId)).size;
  const items = [
    { value: String(notes.length).padStart(2, "0"), label: "篇学习笔记" },
    { value: String(labs.length).padStart(2, "0"), label: "个交互实验" },
    { value: String(sections).padStart(2, "0"), label: "个知识模块" },
    { value: "AI", label: "辅助整理 · 人工校对" },
  ];
  return `<div class="stat-strip">${items
    .map(
      (item) => `<div class="stat"><span class="stat-value">${item.value}</span><span class="stat-label">${item.label}</span></div>`,
    )
    .join("")}</div>`;
}

function signalVisual() {
  return `<div class="signal-panel" aria-label="从传感器到 ADC 的模拟信号链示意图">
  <div class="signal-panel-head">
    <span><i class="live-dot"></i> SIGNAL CHAIN / 01</span>
    <span>CONTINUOUS → BITS</span>
  </div>
  <svg class="signal-svg" viewBox="0 0 620 470" role="img" aria-labelledby="signal-title signal-desc">
    <title id="signal-title">模拟前端信号链</title>
    <desc id="signal-desc">传感器信号经过低噪声放大、抗混叠滤波、可编程增益放大，最终进入模数转换器。</desc>
    <defs>
      <pattern id="signal-grid" width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M28 0H0V28" fill="none" stroke="var(--grid-line)" stroke-width=".7"/>
      </pattern>
      <linearGradient id="signal-fade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="var(--teal)" stop-opacity=".15"/>
        <stop offset="1" stop-color="var(--copper)" stop-opacity=".38"/>
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="618" height="468" rx="20" fill="url(#signal-grid)" stroke="var(--panel-border)"/>
    <g class="chain">
      <path d="M44 155H576" stroke="var(--wire)" stroke-width="1.2" stroke-dasharray="3 7" opacity=".5"/>
      <g class="chain-node" transform="translate(44 122)">
        <rect width="88" height="66" rx="10" fill="var(--panel)" stroke="var(--panel-border)"/>
        <text x="12" y="23" class="svg-kicker">SENSOR</text>
        <path d="M14 44h18l5-10 8 20 8-10h21" fill="none" stroke="var(--teal)" stroke-width="1.8" stroke-linecap="round"/>
        <text x="12" y="60" class="svg-micro">µV / pA</text>
      </g>
      <g class="chain-node" transform="translate(157 122)">
        <rect width="88" height="66" rx="10" fill="var(--panel)" stroke="var(--panel-border)"/>
        <text x="12" y="23" class="svg-kicker">LNA</text>
        <path d="M25 34v22M25 34l26 11-26 11" fill="none" stroke="var(--copper)" stroke-width="1.7" stroke-linejoin="round"/>
        <text x="12" y="60" class="svg-micro">eₙ · GBW</text>
      </g>
      <g class="chain-node" transform="translate(270 122)">
        <rect width="88" height="66" rx="10" fill="var(--panel)" stroke="var(--panel-border)"/>
        <text x="12" y="23" class="svg-kicker">AAF</text>
        <path d="M14 47c8-18 19-18 27 0s19 18 27 0" fill="none" stroke="var(--violet)" stroke-width="1.7"/>
        <text x="12" y="60" class="svg-micro">f_c · order</text>
      </g>
      <g class="chain-node" transform="translate(383 122)">
        <rect width="88" height="66" rx="10" fill="var(--panel)" stroke="var(--panel-border)"/>
        <text x="12" y="23" class="svg-kicker">PGA</text>
        <path d="M20 52V38M32 52V32M44 52V42M56 52V27" stroke="var(--teal)" stroke-width="2" stroke-linecap="round"/>
        <text x="12" y="60" class="svg-micro">× 1…16</text>
      </g>
      <g class="chain-node" transform="translate(496 122)">
        <rect width="80" height="66" rx="10" fill="var(--panel)" stroke="var(--panel-border)"/>
        <text x="12" y="23" class="svg-kicker">ADC</text>
        <path d="M15 50h10v-7h10v-7h10v-7h10v-7h10" fill="none" stroke="var(--copper)" stroke-width="1.8"/>
        <text x="12" y="60" class="svg-micro">N bit · fs</text>
      </g>
    </g>
    <g class="wave-group">
      <text x="44" y="234" class="svg-label">输入：连续时间</text>
      <path d="M44 280c16-28 31-28 47 0s31 28 47 0 31-28 47 0 31 28 47 0 31-28 47 0 31 28 47 0 31-28 47 0 31 28 47 0" fill="none" stroke="var(--teal)" stroke-width="1.8" stroke-linecap="round" opacity=".75"/>
      <path d="M44 280c16-46 31-46 47 0s31 46 47 0 31-46 47 0 31 46 47 0 31-46 47 0" fill="none" stroke="url(#signal-fade)" stroke-width="7" stroke-linecap="round" opacity=".9"/>
      <text x="44" y="327" class="svg-label">输出：量化后的时间序列</text>
      <g class="quant-steps" fill="none" stroke="var(--copper)" stroke-width="2">
        <path d="M392 366h21v-12h20v12h21v-22h20v22h21v-36h20v36h21v-22h20v22h21v-12h20"/>
      </g>
      <path d="M384 352v34" stroke="var(--wire)" stroke-width="1" stroke-dasharray="3 5" opacity=".55"/>
      <text x="44" y="404" class="svg-micro">NOISE · BANDWIDTH · SETTLING · LINEARITY</text>
    </g>
    <g class="signal-tags">
      <g transform="translate(44 424)">
        <rect width="150" height="24" rx="12" fill="var(--chip-bg)" stroke="var(--panel-border)"/>
        <circle cx="14" cy="12" r="3" fill="var(--teal)"/>
        <text x="25" y="16" class="svg-tag">低噪声前端</text>
      </g>
      <g transform="translate(205 424)">
        <rect width="150" height="24" rx="12" fill="var(--chip-bg)" stroke="var(--panel-border)"/>
        <circle cx="14" cy="12" r="3" fill="var(--violet)"/>
        <text x="25" y="16" class="svg-tag">频率与稳定度</text>
      </g>
      <g transform="translate(366 424)">
        <rect width="190" height="24" rx="12" fill="var(--chip-bg)" stroke="var(--panel-border)"/>
        <circle cx="14" cy="12" r="3" fill="var(--copper)"/>
        <text x="25" y="16" class="svg-tag">从连续量到比特</text>
      </g>
    </g>
  </svg>
  <div class="signal-caption"><span>FIG. 01</span><span>把每一次推导，放回一条完整的信号链里。</span></div>
</div>`;
}

function sectionCards(notes, site) {
  const byId = (id) => notes.find((note) => note.sectionId === id);
  const cards = [
    {
      number: "01",
      kicker: "BUILD INTUITION",
      title: "先建立数量级直觉",
      text: "从符号、单位与器件模型出发，知道每个参数大概在哪个量级，再开始推公式。",
      note: byId("fundamentals") || byId("reference"),
      href: "notes.html",
      cta: "从基础读起",
      accent: "teal",
    },
    {
      number: "02",
      kicker: "DESIGN THE CIRCUIT",
      title: "再把电路推到底",
      text: "以 OTA 为样本，把规格、增益、摆幅、噪声与功耗放进同一张权衡表里。",
      note: byId("design"),
      href: byId("design")?.route || "notes.html",
      cta: "阅读设计实战",
      accent: "copper",
    },
    {
      number: "03",
      kicker: "MODEL & VERIFY",
      title: "最后交给仿真",
      text: "用行为级模型把系统跑起来，让 AFE、ADC 与数字验证在同一个时间轴上对话。",
      note: byId("modeling"),
      href: byId("modeling")?.route || "labs/index.html",
      cta: "进入建模仿真",
      accent: "violet",
    },
  ];

  return `<div class="section-cards">${cards
    .map(
      (card) => `<a class="section-card accent-${card.accent}" href="${link(site, card.href)}">
      <div class="section-card-top"><span>${card.number}</span><span>${card.kicker}</span></div>
      <h3>${card.title}</h3>
      <p>${card.text}</p>
      <div class="section-card-bottom">
        <span>${card.note ? escapeHtml(card.note.section.title) : card.cta}</span>
        <span class="section-card-arrow">${icon("arrowUpRight")}</span>
      </div>
    </a>`,
    )
    .join("")}</div>`;
}

function featuredNotes(notes, site) {
  if (!notes.length) return "";
  return `<div class="feature-grid">${notes
    .map(
      (note) => `<a class="feature-note" href="${link(site, note.route)}">
      <div class="feature-note-index">${String(note.number).padStart(2, "0")}</div>
      <div class="feature-note-body">
        <div class="feature-note-eyebrow"><span>${escapeHtml(note.section.title)}</span>${
          note.aiAssisted ? "<span>AI 辅助</span>" : ""
        }</div>
        <h3>${escapeHtml(note.title)}</h3>
        <p>${escapeHtml(note.excerpt)}</p>
        <div class="feature-note-meta"><span>${note.readingMinutes} 分钟</span><span>${escapeHtml(
          note.tags.slice(0, 2).join(" · "),
        )}</span></div>
      </div>
      <span class="feature-note-arrow">${icon("arrowUpRight")}</span>
    </a>`,
    )
    .join("")}</div>`;
}

function labCover(lab, site) {
  if (lab.cover) {
    return `<img src="${link(site, lab.cover)}" alt="" decoding="async">`;
  }
  return `<div class="lab-cover-fallback accent-${lab.accent}">
    <span>LAB / ${String(lab.number).padStart(2, "0")}</span>
    <svg viewBox="0 0 420 220" role="img" aria-label="实验页封面占位图">
      <path d="M0 164h110l22-48 32 94 28-126 36 80h192" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M0 164h420" stroke="currentColor" stroke-width=".6" opacity=".3"/>
      <circle cx="192" cy="164" r="4" fill="currentColor"/>
    </svg>
    <strong>${escapeHtml(lab.title)}</strong>
  </div>`;
}

function labCard(lab, site, index = 0) {
  return `<a class="lab-card accent-${lab.accent}" href="${link(site, lab.route)}"${
    lab.route.endsWith(".html") ? ' target="_blank" rel="noopener"' : ""
  }>
    <div class="lab-card-cover">${labCover(lab, site)}<span class="lab-number">LAB ${String(
      index + 1,
    ).padStart(2, "0")}</span><span class="lab-open">${icon("arrowUpRight")}</span></div>
    <div class="lab-card-body">
      <div class="lab-card-meta"><span>${escapeHtml(lab.tags[0] || "交互教程")}</span>${
        lab.minutes ? `<span>${lab.minutes} 分钟</span>` : "<span>独立网页</span>"
      }</div>
      <h3>${escapeHtml(lab.title)}</h3>
      <p>${escapeHtml(lab.description)}</p>
      <div class="lab-card-foot"><span>打开实验</span><span class="lab-card-rule"></span><span>↗</span></div>
    </div>
  </a>`;
}

export function renderHome({ site, notes, labs, groups }) {
  const featuredOrder = [...notes].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.sortDate.localeCompare(a.sortDate);
  });
  const recent = featuredOrder.slice(0, 3);
  const content = `<div class="home">
    <section class="hero">
      <div class="hero-copy">
        <p class="hero-eyebrow"><span class="pulse-dot"></span> ANALOG CIRCUIT LAB <span>/</span> FIELD NOTES</p>
        <h1>把模拟电路，<br>学成一张<span class="scribble">连得起来</span>的地图。</h1>
        <p class="hero-lede">从器件物理到数据转换器，把 AI 生成的笔记、公式推导与交互教程收进同一个地方。可以检索，可以顺着路线读，也可以直接把一个实验页分享出去。</p>
        <div class="hero-actions">
          <a class="button button-primary" href="${link(site, "start-here.html")}">沿学习路线开始 ${icon(
            "arrowRight",
          )}</a>
          <a class="button button-ghost" href="${link(site, "labs/index.html")}">${icon("beaker")}浏览实验工坊</a>
        </div>
        <ul class="hero-features">
          <li>${icon("check")}Markdown 自动排版</li>
          <li>${icon("check")}公式 / 代码 / 目录</li>
          <li>${icon("check")}独立 HTML 教程</li>
        </ul>
      </div>
      <div class="hero-visual">${signalVisual()}</div>
    </section>
    ${statBar(notes, labs)}
    <section class="home-section path-section">
      <div class="section-heading">
        <div><span class="section-kicker">LEARNING PATH / 03 STEPS</span><h2>一条可以反复往返的路线</h2></div>
        <p>先有直觉，再做设计，最后用模型和仿真验证。每一步都不必等上一步“完全学完”。</p>
      </div>
      ${sectionCards(notes, site)}
    </section>
    <section class="home-section">
      <div class="section-heading">
        <div><span class="section-kicker">RECENT NOTES</span><h2>最近入库</h2></div>
        <a class="section-more" href="${link(site, "notes.html")}">全部笔记 ${icon("arrowRight")}</a>
      </div>
      ${featuredNotes(recent, site)}
    </section>
    <section class="home-section lab-section">
      <div class="section-heading">
        <div><span class="section-kicker">INTERACTIVE BENCH</span><h2>不是只有公式，<br>还有能打开的电路。</h2></div>
        <p>独立网页保留了完整的排版、图表与交互，不需要插件。新网页放进 <code>labs/</code> 就会自动上架。</p>
      </div>
      <div class="lab-grid">${labs.map((lab, index) => labCard(lab, site, index)).join("")}
        <a class="lab-invite" href="${link(site, "how-to-add.html")}">
          <span class="lab-invite-kicker">ADD YOUR OWN</span>
          <strong>下一篇 AI 生成的网页，<br>也可以放在这里。</strong>
          <span class="lab-invite-link">查看接入方式 ${icon("arrowUpRight")}</span>
        </a>
      </div>
    </section>
    <section class="home-section growth-section">
      <div class="growth-copy">
        <span class="section-kicker">A NOTEBOOK THAT GROWS</span>
        <h2>像搭实验台一样，<br>慢慢把知识接起来。</h2>
        <p>不锁进某个平台，也不需要数据库。所有内容都是普通文件：Markdown 负责可读性，HTML 负责交互，Git 负责版本，静态托管负责把它带到外网。</p>
        <a class="text-link" href="${link(site, "how-to-add.html")}">阅读内容维护指南 ${icon("arrowRight")}</a>
      </div>
      <div class="growth-steps">
        <div class="growth-step"><span>01</span><div><strong>写</strong><p>用 AI 生成笔记、推导或一个自包含网页。</p></div></div>
        <div class="growth-step"><span>02</span><div><strong>放</strong><p>Markdown 放进 <code>content/</code>，网页放进 <code>labs/</code>。</p></div></div>
        <div class="growth-step"><span>03</span><div><strong>推送</strong><p>提交到 GitHub，站点自动构建并更新外网链接。</p></div></div>
      </div>
    </section>
    <section class="home-cta">
      <div><span class="section-kicker">START FROM HERE</span><h2>先读完这一页，<br>再决定从哪里下手。</h2></div>
      <a class="button button-light" href="${link(site, "start-here.html")}">打开学习路线 ${icon("arrowRight")}</a>
      <span class="cta-coordinate">31°14′N / 121°28′E · SIGNAL ON</span>
    </section>
  </div>`;

  return layout({
    site,
    title: "",
    description: site.description,
    route: "index.html",
    page: "home",
    bodyClass: "page-home",
    content,
    groups,
    labs,
    includeSidebar: false,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.title,
      description: site.description,
      url: site.url,
      inLanguage: site.lang,
    },
  });
}

function noteListCard(note, site) {
  return `<a class="note-card" href="${link(site, note.route)}" data-category="${escapeAttr(note.sectionId)}">
    <div class="note-card-top">
      <span class="note-card-number">${String(note.number).padStart(2, "0")}</span>
      <span class="note-card-section">${escapeHtml(note.section.title)}</span>
      ${note.aiAssisted ? '<span class="note-card-ai">AI</span>' : ""}
    </div>
    <h3>${escapeHtml(note.title)}</h3>
    <p>${escapeHtml(note.excerpt)}</p>
    <div class="note-card-bottom">
      <div class="note-card-tags">${note.tags
        .slice(0, 3)
        .map((tag) => `<span>${escapeHtml(tag)}</span>`)
        .join("")}</div>
      <span class="note-card-time">${note.readingMinutes} min</span>
    </div>
    <span class="note-card-arrow">${icon("arrowUpRight")}</span>
    <span class="note-card-watermark" aria-hidden="true">${String(note.number).padStart(2, "0")}</span>
  </a>`;
}

export function renderNotesIndex({ site, notes, groups, labs }) {
  const filters = groups
    .map(
      (group) =>
        `<button class="filter-chip" type="button" data-filter="${escapeAttr(group.id)}">${escapeHtml(
          group.title,
        )}<span>${group.notes.length}</span></button>`,
    )
    .join("");
  const sections = groups
    .map(
      (group) => `<section class="notes-group" id="${escapeAttr(group.id)}" data-group="${escapeAttr(
        group.id,
      )}">
      <div class="notes-group-heading">
        <div><span class="section-kicker">${escapeHtml(group.latin || "SECTION")}</span><h2>${escapeHtml(
          group.title,
        )}</h2></div>
        <p>${escapeHtml(group.description || "")}</p>
      </div>
      <div class="notes-grid">${group.notes.map((note) => noteListCard(note, site)).join("")}</div>
    </section>`,
    )
    .join("");

  const content = `<div class="index-page">
    <header class="index-hero">
      ${breadcrumbs(site, [{ label: "全部笔记" }])}
      <div class="index-hero-grid">
        <div>
          <span class="section-kicker">THE NOTEBOOK / ${String(notes.length).padStart(2, "0")} ENTRIES</span>
          <h1>所有笔记，<br>按一条知识脉络排好。</h1>
        </div>
        <p>这里不是零散链接的堆叠。每篇笔记都有明确的模块、阅读时间和 Markdown 原文；你可以按顺序读，也可以带着问题跳进任意一页。</p>
      </div>
      <div class="filter-bar" data-filter-root>
        <button class="filter-chip is-active" type="button" data-filter="all">全部<span>${notes.length}</span></button>
        ${filters}
      </div>
    </header>
    <div class="notes-index-body" data-notes-root>
      ${sections}
      <div class="filter-empty" data-filter-empty hidden>这个模块还没有笔记。可以先从学习路线开始。</div>
    </div>
    <div class="index-bottombar">
      <span>没有看到想找的内容？</span>
      <button class="text-link" type="button" data-search-open>${icon("search")}搜索全站</button>
      <a class="text-link" href="${link(site, "how-to-add.html")}">添加一篇笔记 ${icon("arrowRight")}</a>
    </div>
  </div>`;

  return layout({
    site,
    title: "全部笔记",
    description: "按知识模块整理的全部模拟电路学习笔记：器件基础、设计实战、建模仿真与参考速查。",
    route: "notes.html",
    page: "notes",
    bodyClass: "page-index",
    content,
    groups,
    labs,
  });
}

export function renderLabsIndex({ site, labs, groups }) {
  const cards = labs.map((lab, index) => labCard(lab, site, index)).join("");
  const content = `<div class="index-page labs-page">
    <header class="index-hero labs-hero">
      ${breadcrumbs(site, [{ label: "实验工坊" }])}
      <div class="index-hero-grid">
        <div>
          <span class="section-kicker">INTERACTIVE BENCH / ${String(labs.length).padStart(2, "0")} LABS</span>
          <h1>把公式接通，<br>让电路在这里跑起来。</h1>
        </div>
        <p>这里存放独立的 HTML 教程与交互页面。它们保留自己的排版、图表和脚本，部署后就是一个可以直接分享的链接。</p>
      </div>
      <div class="labs-manifest">
        <span><i class="live-dot"></i>${labs.length} 个实验在线</span>
        <span>独立 HTML · 移动端可读</span>
        <span>无需登录 · 无需插件</span>
      </div>
    </header>
    <div class="lab-grid lab-grid-index">
      ${cards}
      <a class="lab-invite lab-invite-large" href="${link(site, "how-to-add.html")}">
        <span class="lab-invite-kicker">OPEN SLOT</span>
        <strong>这里还留着<br>一个实验位。</strong>
        <p>将自包含 HTML 放进 <code>labs/</code>，配一个简单的 <code>.meta.json</code>，它就会自动出现在这个页面。</p>
        <span class="lab-invite-link">查看接入方式 ${icon("arrowUpRight")}</span>
      </a>
    </div>
    <div class="lab-note">
      ${icon("info")}
      <p>实验页由 AI 辅助生成，数值和结论用于演示，不代表某个 PDK、芯片或实测结果。学习时请结合自己的仿真环境复核。</p>
    </div>
  </div>`;

  return layout({
    site,
    title: "实验工坊",
    description: "可交互的模拟电路实验与独立 HTML 教程：折叠共源共栅 OTA、AFE SystemVerilog 行为级建模。",
    route: "labs/index.html",
    page: "labs",
    bodyClass: "page-labs",
    content,
    groups,
    labs,
  });
}

export function renderNotFound({ site, groups, labs }) {
  const content = `<div class="not-found">
    <div class="not-found-grid">
      <div class="nf-code">404</div>
      <div class="nf-copy">
        <span class="section-kicker">SIGNAL LOST</span>
        <h1>这条支路<br>没有接通。</h1>
        <p>页面可能已经被移动、改名，或者地址里少了一个字符。先回到主线，再重新找一下。</p>
        <div class="hero-actions">
          <a class="button button-primary" href="${site.base}">回到首页 ${icon("arrowRight")}</a>
          <a class="button button-ghost" href="${link(site, "notes.html")}">浏览全部笔记</a>
        </div>
      </div>
    </div>
  </div>`;
  return layout({
    site,
    title: "页面未找到",
    description: "页面未找到。",
    route: "404.html",
    page: "404",
    bodyClass: "page-404",
    content,
    groups,
    labs,
    includeSidebar: false,
    noindex: true,
  });
}

export function renderRobots(site, includeSitemap = true) {
  return `User-agent: *\nAllow: /\n${includeSitemap ? `Sitemap: ${new URL("sitemap.xml", site.url)}` : ""}\n`;
}

export function renderSitemap(site, urls) {
  const entries = urls
    .map(({ route, lastmod }) => {
      const loc = absoluteUrl(site, route);
      return `  <url>\n    <loc>${escapeHtml(loc)}</loc>${
        lastmod ? `\n    <lastmod>${escapeHtml(isoDate(lastmod) || lastmod)}</lastmod>` : ""
      }\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
