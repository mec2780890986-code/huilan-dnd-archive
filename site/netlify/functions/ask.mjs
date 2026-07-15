import records from "./adventures-data.js";

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  },
  body: JSON.stringify(body)
});

function normalize(value = "") {
  return String(value).toLowerCase().normalize("NFKC");
}

function terms(question) {
  const normalized = normalize(question);
  const items = normalized.match(/[a-z0-9_]{2,}|[\u3400-\u9fff·]{2,12}/g) || [];
  const stop = new Set(["什么", "哪些", "怎么", "为什么", "是否", "可以", "我们", "你们", "他们", "这个", "那个", "记录", "冒险", "总结", "一下"]);
  return [...new Set(items.filter((x) => !stop.has(x)))];
}

function recordText(record) {
  return [record.title, record.arc, record.location, record.summary, record.fullText,
    ...(record.characters || []), ...(record.npcs || []), ...(record.tags || []),
    ...(record.loot || []), ...(record.quests || [])].join("\n");
}

function score(record, questionTerms, question) {
  const text = normalize(recordText(record));
  let value = text.includes(normalize(question)) ? 30 : 0;
  for (const term of questionTerms) {
    if (!text.includes(term)) continue;
    value += 3;
    if (normalize(record.title).includes(term)) value += 8;
    if ((record.characters || []).some((x) => normalize(x).includes(term))) value += 6;
    if ((record.npcs || []).some((x) => normalize(x).includes(term))) value += 6;
    if ((record.tags || []).some((x) => normalize(x).includes(term))) value += 4;
  }
  return value;
}

function excerpts(text, questionTerms, maxChars = 3800) {
  const clean = String(text || "").replace(/\r/g, "");
  if (!clean) return "";
  const lines = clean.split("\n").map((x) => x.trim()).filter(Boolean);
  const selected = [];
  const seen = new Set();
  for (let i = 0; i < lines.length; i++) {
    const lineNorm = normalize(lines[i]);
    if (!questionTerms.some((t) => lineNorm.includes(t))) continue;
    for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 2); j++) {
      if (!seen.has(j)) { selected.push(lines[j]); seen.add(j); }
    }
    if (selected.join("\n").length >= maxChars) break;
  }
  const output = selected.length ? selected.join("\n") : lines.slice(0, 35).join("\n");
  return output.slice(0, maxChars);
}

function selectRecords(question) {
  const qTerms = terms(question);
  const ranked = records.map((record) => ({ record, score: score(record, qTerms, question) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const fallback = ranked.length ? ranked : [...records].slice(-4).reverse().map((record) => ({ record, score: 0 }));
  return { qTerms, selected: fallback };
}

function buildContext(selected, qTerms) {
  let total = 0;
  const blocks = [];
  for (const { record } of selected) {
    const block = `【第 ${record.session} 场｜${record.title}】\n篇章：${record.arc}\n地点：${record.location || "未记录"}\n角色：${(record.characters || []).join("、") || "未记录"}\nNPC：${(record.npcs || []).join("、") || "未记录"}\n摘要：${record.summary || "无"}\n相关原文：\n${excerpts(record.fullText, qTerms)}`;
    if (total + block.length > 24000) break;
    blocks.push(block); total += block.length;
  }
  return blocks.join("\n\n");
}

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "仅支持 POST 请求。" });

  const expectedCode = process.env.AI_ACCESS_CODE;
  if (expectedCode && request.headers.get("x-access-code") !== expectedCode) {
    return json(401, { error: "AI 访问口令不正确。" });
  }

  let payload;
  try { payload = await request.json(); }
  catch { return json(400, { error: "请求格式无效。" }); }

  const question = String(payload?.question || "").trim().slice(0, 600);
  if (!question) return json(400, { error: "请输入问题。" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json(503, { error: "网站尚未配置 OPENAI_API_KEY。" });

  const { qTerms, selected } = selectRecords(question);
  const context = buildContext(selected, qTerms);
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "authorization": `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      instructions: "你是灰兰 D&D 团的档案书记官。只能依据提供的冒险档案回答，不得把规则知识、模组原文或推测冒充本团已经发生的事实。资料不足时明确说现有记录中没有足够信息。使用简体中文，先直接回答，再列出关键依据。末尾必须写‘资料来源：’，列出实际使用的场次编号和标题。",
      input: `玩家问题：${question}\n\n冒险档案：\n${context}`,
      max_output_tokens: 1000
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("OpenAI error", data);
    return json(response.status === 429 ? 429 : 502, { error: data?.error?.message || "AI 服务请求失败。" });
  }

  return json(200, {
    answer: data.output_text || (data.output || []).flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text).join("\n").trim() || "模型没有返回文本。",
    sources: selected.map(({ record }) => ({ id: record.id, session: record.session, title: record.title, date: record.date || "" }))
  });
};
