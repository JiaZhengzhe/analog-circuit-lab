import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chokidar from "chokidar";
import { buildSite } from "./lib/build-site.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const distDir = path.join(projectRoot, "dist");
const args = process.argv.slice(2);
const previewOnly = args.includes("--preview");
const portArgIndex = args.indexOf("--port");
const port = Number(portArgIndex >= 0 ? args[portArgIndex + 1] : process.env.PORT || 4173);
const host = "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".csv": "text/csv; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const clients = new Set();
let building = false;
let queued = false;
let watcher = null;

function sendReload() {
  for (const response of clients) {
    response.write("data: reload\n\n");
  }
}

async function rebuild(reason = "") {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  try {
    await buildSite({ dev: true });
    if (reason) console.log(`  ↻ rebuilt (${reason})`);
    sendReload();
  } catch (error) {
    console.error("\n  Build failed:\n", error);
  } finally {
    building = false;
    if (queued) {
      queued = false;
      await rebuild("queued change");
    }
  }
}

function safePath(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(urlPath, `http://${host}:${port}`).pathname);
  } catch {
    return null;
  }
  let relative = pathname.replace(/^\/+/, "");
  const absolute = path.resolve(distDir, relative);
  if (absolute !== distDir && !absolute.startsWith(`${distDir}${path.sep}`)) return null;
  return absolute;
}

function resolveFile(absolute) {
  if (!absolute) return null;
  if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) {
    const index = path.join(absolute, "index.html");
    return fs.existsSync(index) ? index : null;
  }
  if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return absolute;
  if (!path.extname(absolute)) {
    const html = `${absolute}.html`;
    if (fs.existsSync(html)) return html;
    const index = path.join(absolute, "index.html");
    if (fs.existsSync(index)) return index;
  }
  return null;
}

const server = http.createServer((request, response) => {
  const url = request.url || "/";

  if (url.split("?")[0] === "/__reload") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    response.write("retry: 800\n\n");
    clients.add(response);
    const heartbeat = setInterval(() => response.write(": ping\n\n"), 20000);
    request.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(response);
    });
    return;
  }

  const absolute = safePath(url);
  const file = resolveFile(absolute);
  if (!file) {
    const notFound = path.join(distDir, "404.html");
    if (fs.existsSync(notFound)) {
      const body = fs.readFileSync(notFound);
      response.writeHead(404, { "Content-Type": MIME[".html"] });
      response.end(body);
    } else {
      response.writeHead(404, { "Content-Type": MIME[".txt"] });
      response.end("Not found. Run npm run build first.");
    }
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const stats = fs.statSync(file);
  response.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": stats.size,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  fs.createReadStream(file).pipe(response);
});

async function start() {
  await rebuild();
  server.listen(port, host, () => {
    console.log(`\n  Analog Circuit Lab is running at  http://${host}:${port}/`);
    if (previewOnly) console.log("  Preview mode (static build, no watcher)\n");
    else console.log("  Watching content, labs, public and src. Ctrl+C to stop.\n");
  });

  if (!previewOnly) {
    watcher = chokidar.watch(
      [
        path.join(projectRoot, "content"),
        path.join(projectRoot, "labs"),
        path.join(projectRoot, "public"),
        path.join(projectRoot, "src"),
        path.join(projectRoot, "site.config.mjs"),
      ],
      {
        ignoreInitial: true,
        ignored: (filePath) => filePath.includes(`${path.sep}node_modules${path.sep}`),
        awaitWriteFinish: { stabilityThreshold: 120, pollInterval: 40 },
      },
    );

    let timer = null;
    const schedule = (event, filePath) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        rebuild(path.relative(projectRoot, filePath));
      }, 90);
    };
    watcher.on("add", (filePath) => schedule("add", filePath));
    watcher.on("change", (filePath) => schedule("change", filePath));
    watcher.on("unlink", (filePath) => schedule("remove", filePath));
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await watcher?.close();
    for (const client of clients) client.end();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 800);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
