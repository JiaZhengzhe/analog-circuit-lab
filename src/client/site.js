(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const base = body.dataset.base || "/";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value = "") {
    return String(value).toLowerCase().replace(/\s+/g, " ").trim();
  }

  /* Theme ------------------------------------------------------------------ */

  const themeToggle = document.querySelector("[data-theme-toggle]");

  function applyThemeLabel() {
    if (!themeToggle) return;
    const dark = root.dataset.theme === "dark";
    themeToggle.setAttribute("aria-label", dark ? "切换到浅色主题" : "切换到深色主题");
    themeToggle.setAttribute("title", dark ? "切换到浅色主题" : "切换到深色主题");
  }

  applyThemeLabel();

  themeToggle?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("acl-theme", next);
    } catch (error) {
      /* Storage may be unavailable in private modes. */
    }
    applyThemeLabel();
  });

  /* Mobile navigation ------------------------------------------------------ */

  const menuToggle = document.querySelector("[data-menu-toggle]");
  const sidebar = document.getElementById("site-sidebar");
  const scrim = document.querySelector("[data-sidebar-scrim]");

  function closeMenu() {
    body.classList.remove("menu-open");
    menuToggle?.setAttribute("aria-expanded", "false");
    if (scrim) scrim.hidden = true;
  }

  function openMenu() {
    if (!sidebar) return;
    body.classList.add("menu-open");
    menuToggle?.setAttribute("aria-expanded", "true");
    if (scrim) scrim.hidden = false;
  }

  menuToggle?.addEventListener("click", () => {
    if (body.classList.contains("menu-open")) closeMenu();
    else openMenu();
  });
  scrim?.addEventListener("click", closeMenu);
  document.querySelectorAll("[data-menu-close]").forEach((button) => button.addEventListener("click", closeMenu));
  sidebar?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1050) closeMenu();
  });

  /* Search ----------------------------------------------------------------- */

  const layer = document.getElementById("search-layer");
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  const status = document.getElementById("search-status");
  const openButtons = document.querySelectorAll("[data-search-open]");
  const closeButtons = document.querySelectorAll("[data-search-close]");
  let indexPromise = null;
  let entries = [];
  let activeIndex = -1;
  let currentResults = [];
  let lastFocused = null;
  let searchTimer = null;

  function loadIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = fetch(`${base}assets/search-index.json`, { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        entries = Array.isArray(data) ? data : data.entries || [];
        return entries;
      })
      .catch((error) => {
        status.textContent = "搜索索引加载失败，请刷新页面重试。";
        results.innerHTML = `<div class="search-empty"><strong>索引走丢了</strong>${escapeHtml(
          error.message,
        )}</div>`;
        return [];
      });
    return indexPromise;
  }

  function openSearch() {
    if (!layer || !input) return;
    lastFocused = document.activeElement;
    layer.hidden = false;
    body.classList.add("search-open");
    input.value = "";
    activeIndex = -1;
    currentResults = [];
    status.textContent = "正在装载索引…";
    results.innerHTML = "";
    window.requestAnimationFrame(() => input.focus());
    loadIndex().then(() => {
      status.textContent = "输入关键词，检索笔记、标题与实验";
      showIdleState();
    });
  }

  function closeSearch() {
    if (!layer) return;
    layer.hidden = true;
    body.classList.remove("search-open");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  openButtons.forEach((button) => button.addEventListener("click", openSearch));
  closeButtons.forEach((button) => button.addEventListener("click", closeSearch));

  document.addEventListener("keydown", (event) => {
    const isSearchShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
    const isSlash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
    const target = event.target;
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable;

    if (isSearchShortcut) {
      event.preventDefault();
      if (layer?.hidden) openSearch();
      else closeSearch();
      return;
    }

    if (isSlash && !isTyping && layer?.hidden) {
      event.preventDefault();
      openSearch();
      return;
    }

    if (event.key === "Escape") {
      if (!layer?.hidden) closeSearch();
      closeMenu();
    }
  });

  function showIdleState() {
    if (!results) return;
    const latest = entries.slice(0, 5);
    if (!latest.length) {
      results.innerHTML =
        '<div class="search-empty"><strong>还没有可检索的内容</strong>先在 <kbd>content/</kbd> 里放一篇 Markdown。</div>';
      return;
    }
    const items = latest
      .map(
        (entry, index) =>
          `<a class="search-result${index === 0 ? " is-highlighted" : ""}" href="${base}${entry.href}" data-result-index="${index}"${
            entry.kind === "lab" ? ' target="_blank" rel="noopener noreferrer"' : ""
          }>
            <span class="search-result-icon">${searchIcon(entry.kind)}</span>
            <span class="search-result-main">
              <span class="search-result-type">${escapeHtml(entry.kind === "lab" ? "实验" : "笔记")} · ${escapeHtml(
                entry.section || "",
              )}</span>
              <span class="search-result-title">${escapeHtml(entry.title)}</span>
              <span class="search-result-snippet">${escapeHtml(entry.description || "")}</span>
            </span>
          </a>`,
      )
      .join("");
    activeIndex = 0;
    currentResults = latest;
    results.innerHTML = `<div class="search-idle-label">最近更新</div>${items}`;
  }

  function searchIcon(kind) {
    if (kind === "lab") {
      return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6M10 3v6l-5.4 9.1A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.7-2.9L14 9V3"/><path d="M8 15h8"/></svg>';
    }
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>';
  }

  function tokenize(query) {
    return normalize(query).split(" ").filter(Boolean);
  }

  function scoreEntry(entry, tokens, query) {
    const title = normalize(entry.title);
    const description = normalize(entry.description || "");
    const section = normalize(entry.section || "");
    const tags = normalize((entry.tags || []).join(" "));
    const headings = normalize((entry.headings || []).map((heading) => heading.text).join(" "));
    const text = normalize(entry.text || "");
    let score = 0;

    for (const token of tokens) {
      let tokenScore = 0;
      if (title === query) tokenScore += 80;
      if (title.startsWith(token)) tokenScore += 38;
      if (title.includes(token)) tokenScore += 30;
      if (headings.includes(token)) tokenScore += 15;
      if (tags.includes(token)) tokenScore += 13;
      if (section.includes(token)) tokenScore += 9;
      if (description.includes(token)) tokenScore += 7;
      if (text.includes(token)) tokenScore += 2;
      if (!tokenScore) return 0;
      score += tokenScore;
    }
    return score;
  }

  function findSnippet(entry, tokens) {
    const description = String(entry.description || "").trim();
    const matchingHeading = (entry.headings || []).find((heading) =>
      tokens.some((token) => normalize(heading.text).includes(token)),
    );
    if (matchingHeading) {
      return `${matchingHeading.text} — ${description || "打开阅读这一节"}`;
    }
    if (description) return description;
    const source = String(entry.text || "").replace(/\s+/g, " ").trim();
    return source.slice(0, 150);
  }

  function markTokens(html, tokens) {
    let output = html;
    for (const token of tokens.slice().sort((a, b) => b.length - a.length)) {
      if (!token) continue;
      const escapedToken = escapeHtml(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      output = output.replace(new RegExp(`(${escapedToken})`, "gi"), "<mark>$1</mark>");
    }
    return output;
  }

  function renderResults(query) {
    if (!results) return;
    const tokens = tokenize(query);
    if (!tokens.length) {
      showIdleState();
      return;
    }
    const scored = entries
      .map((entry) => ({ entry, score: scoreEntry(entry, tokens, normalize(query)) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || String(b.entry.updated).localeCompare(String(a.entry.updated)))
      .slice(0, 16);

    currentResults = scored.map((item) => item.entry);
    activeIndex = currentResults.length ? 0 : -1;
    status.textContent = scored.length
      ? `${scored.length} 个结果 · 用 ↑ ↓ 选择，Enter 打开`
      : "没有匹配结果";

    if (!scored.length) {
      const suggestions = entries
        .filter((entry) => entry.kind === "note")
        .slice(0, 3)
        .map(
          (entry) =>
            `<a class="search-result" href="${base}${entry.href}"><span class="search-result-icon">${searchIcon(
              entry.kind,
            )}</span><span class="search-result-main"><span class="search-result-type">试试这篇</span><span class="search-result-title">${escapeHtml(
              entry.title,
            )}</span></span></a>`,
        )
        .join("");
      results.innerHTML = `<div class="search-empty"><strong>没有找到“${escapeHtml(
        query,
      )}”</strong>换一个器件名、指标或英文缩写试试。</div>${suggestions}`;
      return;
    }

    results.innerHTML = scored
      .map(({ entry }, index) => {
        const snippet = markTokens(escapeHtml(findSnippet(entry, tokens)), tokens);
        return `<a class="search-result${index === 0 ? " is-highlighted" : ""}" href="${base}${entry.href}" data-result-index="${index}"${
          entry.kind === "lab" ? ' target="_blank" rel="noopener noreferrer"' : ""
        }>
          <span class="search-result-icon">${searchIcon(entry.kind)}</span>
          <span class="search-result-main">
            <span class="search-result-type">${entry.kind === "lab" ? "实验" : "笔记"} · ${escapeHtml(
              entry.section || "",
            )}</span>
            <span class="search-result-title">${markTokens(escapeHtml(entry.title), tokens)}</span>
            <span class="search-result-snippet">${snippet}</span>
          </span>
        </a>`;
      })
      .join("");
  }

  input?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => renderResults(input.value), 70);
  });

  document.addEventListener("keydown", (event) => {
    if (layer?.hidden) return;
    const items = [...(results?.querySelectorAll(".search-result[data-result-index]") || [])];
    if (!items.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = Math.min(items.length - 1, activeIndex + 1);
      updateActive(items);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      updateActive(items);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      const link = items[activeIndex] || items[0];
      if (link) {
        event.preventDefault();
        window.location.href = link.getAttribute("href");
      }
    }
  });

  function updateActive(items) {
    items.forEach((item, index) => item.classList.toggle("is-highlighted", index === activeIndex));
    items[activeIndex]?.scrollIntoView({ block: "nearest" });
  }

  /* Copy helpers ----------------------------------------------------------- */

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        textarea.remove();
        return ok;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  document.querySelectorAll("[data-copy-link]").forEach((button) => {
    button.addEventListener("click", async () => {
      const original = button.innerHTML;
      const ok = await copyText(window.location.href);
      button.innerHTML = ok ? "✓ 链接已复制" : "复制失败，请手动复制地址栏";
      window.setTimeout(() => {
        button.innerHTML = original;
      }, 1800);
    });
  });

  document.querySelectorAll("[data-copy-code]").forEach((button) => {
    button.addEventListener("click", async () => {
      const block = button.closest(".code-block");
      const code = block?.querySelector("code");
      if (!code) return;
      const ok = await copyText(code.textContent);
      button.textContent = ok ? "已复制" : "复制失败";
      window.setTimeout(() => {
        button.textContent = "复制";
      }, 1600);
    });
  });

  /* Reading progress & table of contents ----------------------------------- */

  const articleBody = document.querySelector("[data-article-body]");
  const progressBar = document.querySelector("[data-reading-progress] span");
  const tocLinks = [...document.querySelectorAll(".toc-nav a")];

  function updateReadingProgress() {
    if (!articleBody || !progressBar) return;
    const rect = articleBody.getBoundingClientRect();
    const articleTop = rect.top + window.scrollY;
    const articleHeight = articleBody.offsetHeight;
    const viewport = window.innerHeight;
    const start = articleTop - viewport * 0.25;
    const end = articleTop + articleHeight - viewport + 120;
    const ratio = Math.min(1, Math.max(0, (window.scrollY - start) / Math.max(1, end - start)));
    progressBar.style.width = `${ratio * 100}%`;
    body.classList.add("has-progress");
  }

  function updateToc() {
    if (!tocLinks.length) return;
    const headings = [...articleBody.querySelectorAll("h2[id], h3[id]")];
    if (!headings.length) return;
    let current = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= 150) current = heading;
      else break;
    }
    tocLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${current.id}`;
      link.parentElement.classList.toggle("is-active", active);
    });
  }

  let scrollTicking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(() => {
        updateReadingProgress();
        updateToc();
        scrollTicking = false;
      });
    },
    { passive: true },
  );
  updateReadingProgress();
  updateToc();

  /* Notes filter ----------------------------------------------------------- */

  const filterRoot = document.querySelector("[data-filter-root]");
  if (filterRoot) {
    const chips = [...filterRoot.querySelectorAll("[data-filter]")];
    const groups = [...document.querySelectorAll("[data-group]")];
    const empty = document.querySelector("[data-filter-empty]");

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const selected = chip.dataset.filter;
        chips.forEach((item) => item.classList.toggle("is-active", item === chip));
        let visibleGroups = 0;
        groups.forEach((group) => {
          const show = selected === "all" || group.dataset.group === selected;
          group.classList.toggle("is-filtered", !show);
          if (show) visibleGroups += 1;
        });
        if (empty) empty.hidden = visibleGroups > 0;
        if (selected !== "all") {
          const target = document.getElementById(selected);
          if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      });
    });
  }

  /* Search hint key label -------------------------------------------------- */

  if (/Mac|iPhone|iPad/.test(navigator.platform || "")) {
    document.querySelectorAll(".search-trigger kbd").forEach((kbd) => {
      kbd.textContent = "⌘ K";
    });
  }
})();
