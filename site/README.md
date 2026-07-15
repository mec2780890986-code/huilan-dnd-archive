# 灰兰的 D&D 冒险档案馆 — Netlify 版

本项目已经改造成 Netlify 静态网站 + Netlify Function。无需数据库。

## 最简单的部署流程

1. 在 GitHub 新建一个空仓库。
2. 把本项目文件全部上传到仓库根目录。
3. 登录 Netlify，选择 **Add new project → Import an existing project → GitHub**。
4. 选择该仓库。Netlify 会读取 `netlify.toml`，直接点击 Deploy。
5. 进入 **Site configuration → Environment variables**，添加：
   - `OPENAI_API_KEY`：你的 OpenAI API Key（必填）
   - `OPENAI_MODEL`：`gpt-5-mini`（可选）
   - `AI_ACCESS_CODE`：你发给玩家的问答口令（强烈建议；可选）
6. 添加变量后，在 Deploys 中点 **Trigger deploy → Deploy site**。

## 本地预览

```bash
npm install
npm run dev
```

## 更新记录

网站读取 `public/adventures.json`。替换或编辑该文件后提交到 GitHub，Netlify 会自动更新。

同时还需更新 `netlify/functions/adventures-data.js`，以便 AI 使用同一批记录。最省事的方法是运行下面脚本（本项目已附带）：

```bash
node scripts/sync-data.js
```

## 安全

API Key 只配置在 Netlify 环境变量中，不能写进前端文件。建议配置 `AI_ACCESS_CODE`，否则任何知道网址的人都能调用你的 API。
