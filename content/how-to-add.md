---
title: 添加一篇笔记或一个实验页
description: 站点维护说明：Markdown 的目录与元信息、独立 HTML 的接入方式、本地预览、GitHub Pages 自动发布，以及发布前的检查清单。
date: 2026-10-25
author: 模拟电路学习站
aiAssisted: true
hidden: true
noindex: true
order: 98
---

::: tip 一句话版本
Markdown 放进 `content/`，独立网页放进 `labs/`，运行 `npm run dev` 预览，推到 GitHub 就自动上线。
:::

## 站点是怎么长出来的

```text
analog-circuit-lab/
├─ content/                # 笔记源文件（Markdown）
│  ├─ design/              # 文件夹名会作为默认模块
│  ├─ modeling/
│  └─ ...
├─ labs/                   # 独立 HTML 实验页
│  ├─ my-tutorial.html
│  └─ my-tutorial.meta.json
├─ public/                 # 图片、下载文件、封面等静态资源
├─ src/                    # 站点样式和前端脚本
├─ scripts/                # 构建、预览、检查
├─ site.config.mjs         # 站名、导航、模块顺序
└─ dist/                   # 构建产物（不提交到 Git）
```

构建时会自动完成：生成页面、加入侧边栏、计算阅读时间、生成上一页/下一页、生成搜索索引、复制 KaTeX 字体、生成 `sitemap.xml`。你不需要手动改导航。

## 加一篇 Markdown 笔记

### 1. 放到合适的文件夹

例如新建 `content/amplifiers/common-source.md`。文件夹名 `amplifiers` 会映射到 `site.config.mjs` 里的同名模块；如果模块不存在，构建时会自动生成一个以文件夹名命名的临时模块。你也可以用 `section` 明确指定模块 id。

当前可用模块：

| id | 显示名 |
| --- | --- |
| `start` | 开始这里 |
| `fundamentals` | 器件与基础 |
| `amplifiers` | 放大与反馈 |
| `data` | 数据转换 |
| `design` | 设计实战 |
| `modeling` | 建模仿真 |
| `reference` | 参考速查 |

### 2. 在文件开头写元信息

```markdown
---
title: 共源极放大器：从偏置到增益
description: 用一组具体数字走完共源极的偏置、增益、摆幅和主极点估算。
section: amplifiers
tags: [共源极, 偏置, 增益]
date: 2026-10-25
author: 你的名字
aiAssisted: true
featured: false
order: 1
---

正文从一段导读开始。

## 第一个小节

正文……
```

| 字段 | 必填 | 用途 |
| --- | --- | --- |
| `title` | 建议 | 页面标题；省略时使用第一个一级标题或文件名 |
| `description` | 建议 | 摘要、搜索描述、分享卡片 |
| `section` | 否 | 模块 id；默认取文件夹名 |
| `tags` | 否 | 标签，支持数组或逗号分隔 |
| `date` | 否 | 发布日期，格式 `YYYY-MM-DD` |
| `updated` | 否 | 更新日期 |
| `author` | 否 | 作者或整理者 |
| `aiAssisted` | 否 | `true` 时显示“AI 辅助 · 待校对” |
| `reviewed` | 否 | `true` 时表示已人工校对 |
| `featured` | 否 | 是否进入首页精选 |
| `order` | 否 | 同模块排序，数字越小越靠前 |
| `hidden` | 否 | `true` 时不进入侧边栏、笔记列表和搜索，但仍可访问 |
| `draft` | 否 | `true` 时构建跳过该文件 |
| `license` | 否 | 覆盖默认内容许可 |

::: note 标题不要手写目录
页面右侧会自动生成目录。正文里不需要再写“## 目录”+ 锚点列表；构建脚本会尝试移除明显的重复目录，但不如一开始就不写。
:::

### 3. 支持的写法

- **公式**：行内用 `$...$`，独立公式用 `$$ ... $$`。例如 `$g_m=2I_D/V_{ov}$`。
- **提示框**：`::: tip 标题` … `:::`，类型有 `note`、`tip`、`insight`、`important`、`warning`、`danger`。
- **代码**：三个反引号加语言名，例如 ` ```systemverilog `。
- **表格**：标准 Markdown 表格，会自动加横向滚动。
- **图片**：把图片放在笔记同目录（或子目录），用相对路径引用，例如 `![小信号模型](images/cs-model.png)`。构建时会复制到发布目录。
- **下载文件**：放进 `public/downloads/`，用 `/downloads/文件名.zip` 引用。
- **页面内跳转**：直接用标题链接；每篇笔记会自动生成锚点。

## 加一个独立 HTML 实验页

### 1. 放入 HTML

把 AI 生成的自包含网页放进 `labs/`，例如 `labs/gm-id-explorer.html`。建议满足：

- CSS、JS 尽量内嵌，或把依赖放在同一目录；
- 不依赖本地绝对路径；
- 移动端至少能正常阅读；
- 没有需要后端才能工作的功能。

### 2. 可选：加一个同名 `.meta.json`

`labs/gm-id-explorer.meta.json`：

```json
{
  "title": "gm/Id 设计空间探索器",
  "description": "拖动过驱动电压和电流，观察 gm、ro 与本征增益如何变化。",
  "tags": ["gm/Id", "交互工具"],
  "date": "2026-10-25",
  "order": 1,
  "minutes": 15,
  "difficulty": "进阶",
  "accent": "copper",
  "cover": "covers/gm-id-cover.svg",
  "featured": true
}
```

| 字段 | 说明 |
| --- | --- |
| `title` | 卡片标题；省略时自动读取 HTML 的 `<title>` |
| `description` | 卡片摘要；省略时读取 meta description 或正文 |
| `tags` | 标签数组 |
| `accent` | `copper`、`teal`、`violet`、`amber` |
| `cover` | 封面图路径，相对于 `public/` |
| `minutes` | 建议阅读/操作时间 |
| `hidden` | 不进入列表，但文件仍可访问 |

没有 `.meta.json` 也能工作，站点会从 HTML 的 `<title>` 和 `<meta name="description">` 自动提取。

## 本地预览

第一次运行先安装依赖：

```powershell
npm install
npm run dev
```

打开终端给出的地址，通常是 `http://127.0.0.1:4173/`。修改内容后页面会自动刷新。

其他命令：

```powershell
npm run build    # 生成 dist/
npm run preview  # 预览构建产物
npm run check    # 检查内部断链和基础 meta
```

::: warning 不要把 `dist/` 提交进 Git
`dist/` 是构建产物，GitHub Actions 会重新生成。把它留空或忽略即可。`.gitignore` 已经处理了这一点。
:::

## 发布到外网（GitHub Pages）

仓库里已经包含 `.github/workflows/deploy.yml`。只需要做一次初始化：

1. 在 GitHub 新建一个空仓库，例如 `analog-circuit-lab`。不要勾选自动生成 README。
2. 在项目目录里关联远程仓库并推送：

```powershell
git remote add origin https://github.com/<你的用户名>/analog-circuit-lab.git
git branch -M main
git push -u origin main
```

3. 打开 GitHub 仓库的 **Settings → Pages**，把 **Build and deployment → Source** 设为 **GitHub Actions**。
4. 进入 **Actions** 页面，等待 “Deploy site” 工作流完成。
5. 站点地址通常是：

```text
https://<你的用户名>.github.io/analog-circuit-lab/
```

以后每次修改，只需要：

```powershell
git add .
git commit -m "add: gm/id notes"
git push
```

工作流会自动构建并更新外网页面。首次发布可能需要一两分钟。

### 用 Cloudflare Pages 或 Netlify

两者都可以直接连这个仓库：

- Build command：`npm run build`
- Output directory：`dist`
- 环境变量：如果站点部署在域名根路径，设置 `BASE_PATH=/`；同时设置 `SITE_URL=https://你的域名/`，让 canonical、分享卡片和 sitemap 指向正式地址。GitHub Pages 项目页的基础路径由工作流自动设为 `/<仓库名>/`。

### 自定义域名

在 GitHub Pages 的 **Custom domain** 里填入域名，并按提示配置 DNS。然后把仓库变量或工作流中的 `SITE_URL` 改成你的正式地址，避免分享卡片和 sitemap 仍指向 `github.io`。

## 发布前的检查清单

- [ ] 公式在本地渲染正常，没有漏写的 `$`。
- [ ] 代码块标了语言，复制按钮可用。
- [ ] 图片不是本地绝对路径，且移动端没有横向溢出。
- [ ] 引用外部数据或结论时写明了来源和假设。
- [ ] AI 生成的参数、公式和结论至少经过一次独立复核。
- [ ] 页面的 `title` 和 `description` 能独立说明内容。
- [ ] 运行过 `npm run check`，没有断链。
- [ ] 没有把密钥、内部工艺文件或未公开数据放进 `content/` 或 `labs/`。

## 安全提醒

独立 HTML 页面可以运行 JavaScript。不要把来源不明、未审阅的网页直接挂到公开站点上；也不要从不可信页面复制带有外部脚本的代码。这个站点假设**内容由你自己生成或审阅**，静态托管本身不提供内容沙箱。

::: insight 内容维护的最小闭环
每次只做一件事：写一篇 → 本地预览 → 修正一个错误 → 推送。不要先攒十篇再发布。站点不是展厅，是工作台。
:::
