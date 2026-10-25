# 模拟电路学习站 · Analog Circuit Lab

一个用普通文件维护的模拟电路学习站点。Markdown 笔记和独立 HTML 教程放进仓库，构建时自动生成目录、搜索、公式排版、上一页/下一页，并可以通过 GitHub Pages 发布到外网。

![模拟电路学习站首页](docs/preview.png)

## 它解决什么问题

- 把散落在聊天记录、收藏夹和笔记软件里的模拟电路内容集中到一处。
- 让 AI 生成的长文保留公式、代码、表格和排版，而不是变成纯文本。
- 让独立的交互 HTML 教程有一个固定的入口和可分享链接。
- 不绑定数据库或内容平台：所有内容都是可复制、可版本管理的普通文件。

## 已有内容

- **折叠共源共栅 OTA 完整设计方法**：架构、原理、指标权衡、尺寸计算与 SC MDAC 案例。
  - Markdown 版：`content/design/folded-cascode-ota.md`
  - 网页版：`labs/folded-cascode-ota.html`
- **SystemVerilog AFE 行为级建模**：连续时间离散化、模块建模、验证与调试。
  - Markdown 版：`content/modeling/systemverilog-afe-modeling.md`
  - 完整网页版：`labs/afe-systemverilog-tutorial.html`
- **学习路线、读图约定与速查表**：作为站点的导航与复习层。

## 快速开始

需要 Node.js 20.11 或更高版本。

```powershell
npm install
npm run dev
```

打开终端显示的本地地址，默认是 <http://127.0.0.1:4173/>。

```powershell
npm run build    # 输出静态站点到 dist/
npm run preview  # 预览构建产物
npm run check    # 检查内部断链和页面基础 meta
```

## 添加内容

### Markdown 笔记

在 `content/` 下新建 `.md` 文件：

```markdown
---
title: 共源极放大器：从偏置到增益
description: 用一组具体数字走完偏置、增益、摆幅和主极点估算。
section: amplifiers
tags: [共源极, 偏置, 增益]
date: 2026-10-25
author: 你的名字
aiAssisted: true
order: 1
---

## 第一个小节

正文……
```

文件夹名会作为默认模块；也可以使用 `section` 指定。完整的字段、提示框、公式、图片和实验页接法见站内 **添加内容指南**（`content/how-to-add.md`）。

### 独立 HTML 实验页

把自包含 HTML 放进 `labs/`，可选添加同名 `.meta.json`：

```json
{
  "title": "gm/Id 设计空间探索器",
  "description": "拖动参数，观察 gm、ro 与本征增益的变化。",
  "tags": ["gm/Id", "交互工具"],
  "date": "2026-10-25",
  "order": 1,
  "minutes": 15,
  "accent": "copper",
  "cover": "covers/gm-id-cover.svg"
}
```

### 图片和下载文件

- 笔记的图片放在笔记同目录，使用相对路径。
- 公共资源放在 `public/`，例如 `public/downloads/`。
- 封面放在 `public/covers/`。

## 站点结构

```text
content/              Markdown 内容
labs/                 独立 HTML 实验页和 .meta.json
public/               图标、封面、下载文件、社交分享图
src/styles/           站点样式
src/client/           搜索、主题、目录、移动端交互
scripts/              构建、开发服务器、链接检查、内容导入
site.config.mjs       站名、模块、导航、许可信息
.github/workflows/    GitHub Pages 自动部署
```

## 发布到外网

### 方式一：GitHub Pages（推荐）

1. 在 GitHub 新建一个空仓库，例如 `analog-circuit-lab`。
2. 关联远程仓库并推送：

```powershell
git remote add origin https://github.com/<你的用户名>/analog-circuit-lab.git
git branch -M main
git push -u origin main
```

3. 打开仓库 **Settings → Pages**，将 **Source** 设为 **GitHub Actions**。
4. 等待 **Actions → Deploy site** 完成。如果第一次运行发生在 Pages 尚未启用时，进入该次运行点 **Re-run all jobs**。完成后访问：

```text
https://<你的用户名>.github.io/analog-circuit-lab/
```

之后每次 `git push` 都会自动重建并更新。工作流会自动判断项目页与 `username.github.io` 用户页的路径差异。

### 方式二：Netlify / Cloudflare Pages

- 构建命令：`npm run build`
- 输出目录：`dist`
- 环境变量：
  - `BASE_PATH=/`（部署在域名根路径时）
  - `SITE_URL=https://你的域名/`（用于 canonical、分享卡片和 sitemap）

仓库内已包含 `netlify.toml`；Netlify 会自动提供 `URL`，站点也会尝试推断。

### 自定义域名

在 GitHub Pages 中绑定域名后，把 `site.config.mjs` 的 `url` 或工作流里的 `SITE_URL` 改为正式地址，以保证分享卡片和 sitemap 正确。

## 内容与安全说明

- 独立 HTML 页面可以执行 JavaScript。只发布你自己生成或审阅过的页面。
- 站点内容大量由 AI 辅助整理，页面会显示“AI 辅助 · 待校对”提示。关键参数、稳定性和工艺结论必须用教材、SPICE 或实测复核。
- 不要把密钥、内部 PDK、未公开数据或客户资料放进 `content/`、`labs/` 或 `public/`。

## 许可

- **站点代码**：MIT，见 [LICENSE](LICENSE)。
- **原创笔记**：除页面内另有说明外，采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。
- **导入内容**：保留原许可。例如 OTA 文档标注为“仅供学习与研究”，不按 CC BY-SA 重新授权。
- 所有设计示例仅用于教学，不构成可直接用于流片或生产的工程交付。

---

从器件到系统，把每一次推导都接上电源。
