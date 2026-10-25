import { normalizeBase, normalizeSiteUrl } from "./scripts/lib/utils.mjs";

const repository = (process.env.SITE_REPOSITORY || "").trim().replace(/\/+$/, "");
const inferredSiteUrl =
  process.env.SITE_URL ||
  process.env.URL ||
  process.env.CF_PAGES_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:4173/";

export default {
  title: "模拟电路学习站",
  shortTitle: "模拟电路",
  latinTitle: "ANALOG CIRCUIT LAB",
  description:
    "把 AI 生成的模拟电路笔记、推导与交互教程，整理成一张可以随时检索、学习和分享的知识地图。",
  keywords: ["模拟电路", "模拟IC设计", "OTA", "SystemVerilog", "AFE", "学习笔记"],
  lang: "zh-CN",
  author: "模拟电路学习站",
  base: normalizeBase(process.env.BASE_PATH || "/"),
  url: normalizeSiteUrl(inferredSiteUrl),
  repository,
  editBranch: process.env.SITE_BRANCH || "main",
  nav: [
    { label: "学习路线", href: "start-here.html", match: "start-here" },
    { label: "全部笔记", href: "notes.html", match: "notes" },
    { label: "实验工坊", href: "labs/index.html", match: "labs" },
    { label: "关于", href: "about.html", match: "about" },
  ],
  sections: [
    { id: "start", title: "开始这里", latin: "START", description: "路线、方法与使用说明" },
    { id: "fundamentals", title: "器件与基础", latin: "DEVICES", description: "器件模型、符号与数量级" },
    { id: "amplifiers", title: "放大与反馈", latin: "AMPLIFIERS", description: "偏置、增益、频率响应与稳定性" },
    { id: "data", title: "数据转换", latin: "DATA", description: "采样、量化、ADC 与 DAC" },
    { id: "design", title: "设计实战", latin: "DESIGN", description: "从规格到晶体管尺寸的完整推演" },
    { id: "modeling", title: "建模仿真", latin: "MODELING", description: "行为级模型、验证与混合信号" },
    { id: "reference", title: "参考速查", latin: "REFERENCE", description: "公式、单位与检查清单" },
  ],
  footerNote: "AI 可以帮助整理与推导，但结论仍要用教材、仿真和实测去校准。",
  license: {
    content: "CC BY-SA 4.0",
    code: "MIT",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  social: {
    image: "assets/social-card.png",
  },
};
