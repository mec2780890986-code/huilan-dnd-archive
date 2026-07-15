import assert from "node:assert/strict";
import records from "../netlify/functions/adventures-data.js";
import askHandler, {
  buildArchiveContext,
  extractTerms,
  parseModelAnswer,
  rankRecords
} from "../netlify/functions/ask.mjs";

const full = buildArchiveContext("卓尔宝库发生了什么？", records, 700_000);
assert.equal(full.truncated, false, "当前档案应当完整进入上下文");
assert.equal(full.includedRecords.length, records.length, "完整上下文不得漏掉场次");
assert.ok(full.context.length > 240_000, "上下文不应再被旧的 24,000 字符上限截断");
assert.ok(full.context.includes(records.at(-1).fullText), "最后一场的全文应当进入上下文");

const terms = extractTerms("卓尔宝库发生了什么？");
assert.ok(terms.includes("卓尔"), "中文问题应生成可命中的短词");
assert.ok(terms.includes("宝库"), "中文问题应生成可命中的短词");

const ranked = rankRecords("卓尔宝库发生了什么？", records);
assert.equal(ranked[0].record.title, "序章：卓尔宝库", "降级检索应把标题匹配场次排在首位");

const parsed = parseModelAnswer(
  JSON.stringify({ answer: "测试回答", source_ids: [records[0].id, "unknown-id", records[0].id] }),
  records
);
assert.equal(parsed.answer, "测试回答");
assert.deepEqual(parsed.sourceRecords.map((record) => record.id), [records[0].id]);

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.DEEPSEEK_API_KEY;
const originalAccessCode = process.env.AI_ACCESS_CODE;
let upstreamRequest;
try {
  process.env.DEEPSEEK_API_KEY = "test-key";
  delete process.env.AI_ACCESS_CODE;
  globalThis.fetch = async (url, options) => {
    upstreamRequest = { url, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({
      choices: [{
        finish_reason: "stop",
        message: {
          content: JSON.stringify({ answer: "模拟回答", source_ids: [records[0].id] })
        }
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const response = await askHandler(new Request("https://example.test/.netlify/functions/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "卓尔宝库发生了什么？" })
  }));
  const responseBody = await response.json();

  assert.equal(response.status, 200);
  assert.equal(responseBody.answer, "模拟回答");
  assert.deepEqual(responseBody.sources.map((source) => source.id), [records[0].id]);
  assert.equal(responseBody.archive.recordsUsedAsContext, records.length);
  assert.equal(responseBody.archive.truncated, false);
  assert.equal(upstreamRequest.url, "https://api.deepseek.com/chat/completions");
  assert.ok(upstreamRequest.body.messages[1].content.includes(records[0].fullText));
  assert.ok(upstreamRequest.body.messages[1].content.includes(records.at(-1).fullText));
  assert.equal(upstreamRequest.body.messages[2].content, "玩家问题：卓尔宝库发生了什么？");
  assert.equal(upstreamRequest.body.response_format.type, "json_object");
} finally {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.DEEPSEEK_API_KEY;
  else process.env.DEEPSEEK_API_KEY = originalApiKey;
  if (originalAccessCode === undefined) delete process.env.AI_ACCESS_CODE;
  else process.env.AI_ACCESS_CODE = originalAccessCode;
}

console.log(`AI 档案上下文测试通过：${records.length} 场，${full.context.length} 字符。`);

