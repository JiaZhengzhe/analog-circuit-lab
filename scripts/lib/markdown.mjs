import path from "node:path";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import katex from "katex";
import { escapeAttr, escapeHtml } from "./utils.mjs";

const CALLOUTS = {
  note: { title: "笔记", icon: "◈" },
  tip: { title: "提示", icon: "✦" },
  insight: { title: "关键洞察", icon: "◎" },
  important: { title: "重要", icon: "◆" },
  warning: { title: "注意", icon: "△" },
  danger: { title: "警告", icon: "✕" },
};

const LANGUAGE_LABELS = {
  js: "JavaScript",
  ts: "TypeScript",
  sh: "Shell",
  bash: "Bash",
  powershell: "PowerShell",
  py: "Python",
  python: "Python",
  sv: "SystemVerilog",
  systemverilog: "SystemVerilog",
  verilog: "Verilog",
  v: "Verilog",
  makefile: "Makefile",
  yaml: "YAML",
  yml: "YAML",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  md: "Markdown",
  markdown: "Markdown",
  text: "Text",
  plaintext: "Text",
  spice: "SPICE",
  matlab: "MATLAB",
  c: "C",
  cpp: "C++",
};

function renderMath(source, displayMode) {
  try {
    return katex.renderToString(source, {
      displayMode,
      throwOnError: false,
      strict: "ignore",
      trust: false,
      output: "htmlAndMathml",
    });
  } catch (error) {
    return `<code class="math-error" title="${escapeAttr(error.message)}">${escapeHtml(source)}</code>`;
  }
}

function mathBlock(state, startLine, endLine, silent) {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const firstLine = state.src.slice(start, max);

  let opener = null;
  let closer = null;
  if (firstLine.startsWith("$$")) {
    opener = "$$";
    closer = "$$";
  } else if (firstLine.startsWith("\\[")) {
    opener = "\\[";
    closer = "\\]";
  }
  if (!opener) return false;

  if (silent) return true;

  const rest = firstLine.slice(opener.length);
  const sameLineClose = rest.indexOf(closer);
  let content = "";
  let nextLine = startLine;

  if (sameLineClose !== -1) {
    content = rest.slice(0, sameLineClose);
  } else {
    const lines = [rest];
    nextLine = startLine + 1;
    let found = false;
    while (nextLine < endLine) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineEnd = state.eMarks[nextLine];
      const line = state.src.slice(lineStart, lineEnd);
      const closeAt = line.indexOf(closer);
      if (closeAt !== -1) {
        lines.push(line.slice(0, closeAt));
        found = true;
        break;
      }
      lines.push(line);
      nextLine += 1;
    }
    if (!found) return false;
    content = lines.join("\n");
  }

  const token = state.push("math_block", "math", 0);
  token.block = true;
  token.content = content.trim();
  token.markup = opener;

  state.line = nextLine + 1;
  return true;
}

function mathInline(state, silent) {
  const src = state.src;
  const start = state.pos;
  let opener = null;
  let closer = null;

  if (src[start] === "$") {
    if (src[start - 1] === "\\" || src[start + 1] === "$") return false;
    opener = "$";
    closer = "$";
  } else if (src.startsWith("\\(", start)) {
    opener = "\\(";
    closer = "\\)";
  } else {
    return false;
  }

  const contentStart = start + opener.length;
  if (!src[contentStart] || /\s/.test(src[contentStart])) return false;

  let cursor = contentStart;
  let closeAt = -1;
  while (cursor < src.length) {
    const found = src.indexOf(closer, cursor);
    if (found === -1) break;
    if (closer === "$" && src[found - 1] === "\\") {
      cursor = found + 1;
      continue;
    }
    closeAt = found;
    break;
  }
  if (closeAt === -1) return false;

  const content = src.slice(contentStart, closeAt);
  if (!content || content.includes("\n") || /\s$/.test(content)) return false;

  // Avoid treating two shell variables or Verilog system tasks such as
  // "$HOME ... $PATH" as inline math. Short, whitespace-free fragments
  // (for example $4kT$ or $mA$) are still accepted.
  if (
    closer === "$" &&
    /\s/.test(content) &&
    !/[\\^_{}=+\-*/<>（）()·×÷≤≥≈α-ωΑ-Ω]/.test(content)
  ) {
    return false;
  }

  if (silent) return true;

  const token = state.push("math_inline", "math", 0);
  token.content = content;
  token.markup = opener;
  state.pos = closeAt + closer.length;
  return true;
}

function calloutBlock(state, startLine, endLine, silent) {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const line = state.src.slice(start, max);
  const match = line.match(/^:::\s*(note|tip|insight|important|warning|danger)\s*(.*)$/i);
  if (!match) return false;

  const kind = match[1].toLowerCase();
  const customTitle = match[2].trim();
  let nextLine = startLine + 1;
  let found = false;

  while (nextLine < endLine) {
    const candidateStart = state.bMarks[nextLine] + state.tShift[nextLine];
    const candidateEnd = state.eMarks[nextLine];
    const candidate = state.src.slice(candidateStart, candidateEnd).trim();
    if (/^:{3,}$/.test(candidate)) {
      found = true;
      break;
    }
    nextLine += 1;
  }
  if (!found) return false;
  if (silent) return true;

  const oldParent = state.parentType;
  const oldLineMax = state.lineMax;
  state.parentType = "callout";
  state.lineMax = nextLine;

  const token = state.push("callout_open", "div", 1);
  token.block = true;
  token.info = kind;
  token.meta = { kind, title: customTitle || CALLOUTS[kind].title };
  token.map = [startLine, nextLine];

  state.md.block.tokenize(state, startLine + 1, nextLine);
  state.push("callout_close", "div", -1);

  state.parentType = oldParent;
  state.lineMax = oldLineMax;
  state.line = nextLine + 1;
  return true;
}

function inlineText(token) {
  if (!token || !token.children) return "";
  let text = "";
  for (const child of token.children) {
    if (child.type === "text" || child.type === "code_inline") text += child.content;
    else if (child.type === "softbreak" || child.type === "hardbreak") text += " ";
    else if (child.children) text += inlineText(child);
  }
  return text.trim();
}

function taskLists(md) {
  md.core.ruler.after("inline", "task_lists", (state) => {
    for (let index = 0; index < state.tokens.length; index += 1) {
      const inline = state.tokens[index];
      if (inline.type !== "inline" || !inline.children?.length) continue;
      const first = inline.children[0];
      if (!first || first.type !== "text") continue;
      const match = first.content.match(/^\[([ xX])\]\s+/);
      if (!match) continue;

      const done = match[1].toLowerCase() === "x";
      first.content = first.content.slice(match[0].length);
      const checkbox = new state.Token("html_inline", "", 0);
      checkbox.content = `<span class="task-box${done ? " is-done" : ""}" aria-hidden="true">${
        done
          ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 8.5 3.2 3.2L13 4.5"/></svg>'
          : ""
      }</span>`;
      inline.children.unshift(checkbox);
      inline.content = inline.content.replace(/^\[([ xX])\]\s+/, "");

      for (let back = index - 1; back >= Math.max(0, index - 4); back -= 1) {
        if (state.tokens[back].type === "list_item_open") {
          state.tokens[back].attrJoin("class", "task-list-item");
          break;
        }
      }
    }
  });
}

function headingIds(md) {
  md.core.ruler.push("heading_ids", (state) => {
    const used = new Set();
    state.env.headings = [];

    for (let index = 0; index < state.tokens.length; index += 1) {
      const token = state.tokens[index];
      if (token.type !== "heading_open") continue;
      const inline = state.tokens[index + 1];
      if (!inline || inline.type !== "inline") continue;

      const text = inlineText(inline);
      let id = state.env.slugify ? state.env.slugify(text) : "section";
      if (!id) id = "section";
      let unique = id;
      let counter = 2;
      while (used.has(unique)) {
        unique = `${id}-${counter}`;
        counter += 1;
      }
      used.add(unique);
      token.attrSet("id", unique);
      token.attrJoin("class", "anchored-heading");

      if (token.tag === "h2" || token.tag === "h3") {
        state.env.headings.push({ level: Number(token.tag.slice(1)), text, id: unique });
      }

      const anchor = new state.Token("html_inline", "", 0);
      anchor.content = `<a class="heading-anchor" href="#${escapeAttr(unique)}" aria-label="本节链接">#</a>`;
      inline.children.push(anchor);
    }
  });
}

function resolveAsset(src, env) {
  if (!src) return src;
  if (/^(?:[a-z]+:)?\/\//i.test(src) || /^(?:data|mailto|tel):/i.test(src) || src.startsWith("#")) {
    return src;
  }
  if (src.startsWith("/")) return `${env.base}${src.slice(1)}`;
  const joined = path.posix.normalize(path.posix.join(env.contentDir || "", src));
  return `${env.base}content-assets/${joined}`;
}

function resolveLink(href, env) {
  if (!href) return href;
  if (/^(?:[a-z]+:)?\/\//i.test(href) || /^(?:mailto|tel|data|javascript):/i.test(href)) return href;
  if (href.startsWith("#")) return href;
  if (href.startsWith("/")) return `${env.base}${href.slice(1)}`;

  const [target, hash = ""] = href.split("#");
  if (!target) return href;
  if (target.endsWith(".md")) {
    const joined = path.posix.normalize(path.posix.join(env.contentDir || "", target));
    const route = joined.replace(/\.md$/i, ".html");
    return `${env.base}${route}${hash ? `#${hash}` : ""}`;
  }
  return href;
}

function createFenceRenderer(md) {
  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const info = (token.info || "").trim();
    const language = info.split(/\s+/)[0].toLowerCase();
    const label = LANGUAGE_LABELS[language] || (language ? language.toUpperCase() : "TEXT");
    let highlighted;
    let cssClass = "";

    if (language && hljs.getLanguage(language)) {
      try {
        highlighted = hljs.highlight(token.content, {
          language,
          ignoreIllegals: true,
        }).value;
        cssClass = ` language-${escapeAttr(language)}`;
      } catch {
        highlighted = escapeHtml(token.content);
      }
    } else {
      highlighted = escapeHtml(token.content);
    }

    return `<div class="code-block">
  <div class="code-toolbar">
    <span class="code-language">${escapeHtml(label)}</span>
    <button class="copy-code" type="button" data-copy-code aria-label="复制这段代码">复制</button>
  </div>
  <pre class="code-pre" tabindex="0"><code class="hljs${cssClass}">${highlighted}</code></pre>
</div>`;
  };
}

function sanitizeRenderedHtml(html) {
  return String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<(iframe|object|embed|form|base|meta|link|style)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<(iframe|object|embed|base|meta|link|style)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(srcdoc)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s(href|src)\s*=\s*("|')\s*(?:javascript|data:text\/html)[^"']*\2/gi,
      ' $1="#"',
    );
}

export function createMarkdown(site) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    breaks: false,
    highlight: null,
  });

  md.block.ruler.before("fence", "math_block", mathBlock, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  md.inline.ruler.before("escape", "math_inline", mathInline);

  md.block.ruler.before("fence", "callout", calloutBlock, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });

  taskLists(md);
  headingIds(md);
  createFenceRenderer(md);

  md.renderer.rules.math_inline = (tokens, index) =>
    `<span class="math-inline">${renderMath(tokens[index].content, false)}</span>`;
  md.renderer.rules.math_block = (tokens, index) =>
    `<div class="math-display">${renderMath(tokens[index].content, true)}</div>`;

  md.renderer.rules.callout_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const kind = token.meta.kind;
    const title = token.meta.title;
    return `<div class="callout callout-${kind}">
  <div class="callout-title"><span class="callout-icon" aria-hidden="true">${CALLOUTS[kind].icon}</span><span>${md.renderInline(
    title,
  )}</span></div>
  <div class="callout-body">`;
  };
  md.renderer.rules.callout_close = () => `</div></div>`;

  md.renderer.rules.table_open = () => '<div class="table-scroll"><table>';
  md.renderer.rules.table_close = () => "</table></div>";

  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const hrefIndex = token.attrIndex("href");
    if (hrefIndex >= 0) {
      const original = token.attrs[hrefIndex][1];
      if (/^(?:https?:)?\/\//i.test(original)) {
        token.attrSet("target", "_blank");
        token.attrSet("rel", "noopener noreferrer");
        token.attrJoin("class", "external-link");
      } else {
        token.attrs[hrefIndex][1] = resolveLink(original, env);
      }
    }
    return self.renderToken(tokens, index, options);
  };

  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const srcIndex = token.attrIndex("src");
    if (srcIndex >= 0) token.attrs[srcIndex][1] = resolveAsset(token.attrs[srcIndex][1], env);
    token.attrSet("loading", "lazy");
    token.attrSet("decoding", "async");
    return self.renderToken(tokens, index, options);
  };

  return md;
}

export function renderMarkdown(md, source, env) {
  const tokens = md.parse(source, env);
  const html = md.renderer.render(tokens, md.options, env);
  return {
    html: sanitizeRenderedHtml(html),
    headings: env.headings || [],
  };
}

export function cleanMarkdownBody(body) {
  let text = String(body || "").replace(/\r\n/g, "\n").trim();

  // The page header already renders the title, so remove a leading H1.
  text = text.replace(/^#\s+[^\n]+\n+/, "");

  // Remove a commonplace hand-written "## 目录" block only when it is clearly
  // a list of in-page links. This keeps imported AI documents tidy while
  // avoiding destructive edits to ordinary prose.
  const lines = text.split("\n");
  const tocIndex = lines.findIndex((line) => /^##\s*目录\s*$/.test(line.trim()));
  if (tocIndex >= 0 && tocIndex <= 30) {
    let end = tocIndex + 1;
    let anchorLinks = 0;
    while (end < lines.length) {
      const line = lines[end];
      if (/^\s*---\s*$/.test(line)) break;
      if (/^##\s+/.test(line)) break;
      if (/\]\(#/.test(line)) anchorLinks += 1;
      end += 1;
    }
    if (anchorLinks >= 3 && end < lines.length && /^\s*---\s*$/.test(lines[end] || "")) {
      lines.splice(tocIndex, end - tocIndex + 1);
      text = lines.join("\n").trim();
    }
  }

  return text.replace(/^\s*---\s*\n+/, "").trim();
}
