# 灰兰的 D&D 冒险档案馆 — Netlify + DeepSeek

本项目由静态网页、Netlify Function 和 DeepSeek API 组成，无需数据库。Codex 用于修改、检查和维护代码；线上问答仍由 Netlify Function 调用 DeepSeek API。Codex 不是托管 DeepSeek API 的服务器。

## 当前问答方式

`netlify/functions/ask.mjs` 会把档案放在问题之前发送给 DeepSeek。当前 19 场档案约 28 万字符，可以完整进入 DeepSeek V4 的上下文，不再使用旧版的“每场最多 3,800 字符、总计最多 24,000 字符”截取方式。

模型以 JSON 返回回答和实际使用的记录 ID。网页只展示这些记录作为来源。档案将来超过安全上限时，函数会自动改用本地检索，并按问题挑选能放入上限的完整场次。

## GitHub 与 Netlify 部署

1. 把修改后的文件提交并推送到已经连接 Netlify 的 GitHub 仓库。
2. Netlify 读取 `netlify.toml`，运行 `npm run build`，然后部署 `public` 和 `netlify/functions`。
3. 在 Netlify 的 **Site configuration → Environment variables** 设置：

   - `DEEPSEEK_API_KEY`：必填，只放在 Netlify 环境变量中。
   - `DEEPSEEK_MODEL`：可选，默认 `deepseek-v4-flash`。
   - `AI_ACCESS_CODE`：强烈建议设置，防止公开网站被他人消耗 API 额度。
   - `DEEPSEEK_THINKING`：可选。填 `enabled` 开启思考模式；未设置时使用 `disabled`，响应更快。
   - `DEEPSEEK_MAX_OUTPUT_TOKENS`：可选，默认 `4000`，允许范围 `500`–`12000`。
   - `AI_MAX_CONTEXT_CHARS`：可选，默认 `700000`，允许范围 `50000`–`900000`。当前档案无需修改此项。

4. 推送后查看 Netlify 的 **Deploys**。如果自动部署未启动，点击 **Trigger deploy → Deploy site**。

不要把 `.env`、API Key 或 Netlify 环境变量的值提交到 GitHub。

## 本地运行与验证

```bash
npm install
npm run build
npm test
npm run dev
```

本地运行 Netlify Function 时，在项目根目录创建不会提交的 `.env`：

```dotenv
DEEPSEEK_API_KEY=你的密钥
DEEPSEEK_MODEL=deepseek-v4-flash
AI_ACCESS_CODE=自定义访问口令
DEEPSEEK_THINKING=disabled
```

## 更新档案

网页读取 `public/adventures.json`，Netlify Function 使用同步生成的 `netlify/functions/adventures-data.js`。修改 JSON 后执行：

```bash
node scripts/sync-data.js
npm run build
npm test
```

确认通过后提交这两个数据文件。只修改 `public/adventures.json` 会导致网页和 AI 使用不同版本的档案。

## 精度与速度设置

先使用默认的 `deepseek-v4-flash` 和关闭思考模式。档案全文已经进入上下文，大部分人物、事件、物品和跨场次问题不再受旧检索截断影响。

复杂的因果分析仍不理想时，把 `DEEPSEEK_THINKING` 设为 `enabled`。如果准确度仍不足，再把 `DEEPSEEK_MODEL` 改为 `deepseek-v4-pro`。这两项会增加响应时间或费用，修改后需要在 Netlify 重新部署。

