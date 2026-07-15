# 灰兰的 D&D 冒险档案馆 — Netlify + DeepSeek 版

本项目使用 Netlify 静态网站、Netlify Function 和 DeepSeek API，无需数据库。

## 部署流程

1. 在 GitHub 新建一个空仓库。
2. 把本项目文件全部上传到仓库根目录。
3. 登录 Netlify，选择 **Add new project → Import an existing project → GitHub**。
4. 选择该仓库。Netlify 会读取 `netlify.toml`，直接点击 Deploy。
5. 进入 **Site configuration → Environment variables**，添加：
   - `DEEPSEEK_API_KEY`：你在 DeepSeek 开放平台创建的 API Key（必填）
   - `DEEPSEEK_MODEL`：`deepseek-v4-flash`（可选，默认即为此模型）
   - `AI_ACCESS_CODE`：你发给玩家的问答口令（强烈建议；可选）
6. 添加变量后，在 Deploys 中点 **Trigger deploy → Deploy site**。

## DeepSeek 设置

网站调用 `https://api.deepseek.com/chat/completions`。默认使用 `deepseek-v4-flash` 的非思考模式，速度更快，适合档案问答。API Key 只保存在 Netlify 环境变量中，不会发送到玩家浏览器。

## 本地预览

```bash
npm install
npm run dev
```

在项目根目录创建 `.env`，内容参考 `.env.example`。

## 更新记录

网站读取 `public/adventures.json`。替换或编辑该文件后，还需同步 Netlify Function 使用的数据：

```bash
node scripts/sync-data.js
```

随后提交到 GitHub，Netlify 会自动更新。

## 安全

不要把 `DEEPSEEK_API_KEY` 写进前端文件或提交到 GitHub。建议设置 `AI_ACCESS_CODE`，否则任何知道网址的人都能消耗你的 API 余额。
