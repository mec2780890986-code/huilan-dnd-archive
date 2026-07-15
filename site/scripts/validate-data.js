import fs from "node:fs";
const file = new URL("../public/adventures.json", import.meta.url);
const records = JSON.parse(fs.readFileSync(file, "utf8"));
if (!Array.isArray(records) || records.length === 0) throw new Error("adventures.json 没有记录");
const required = ["id", "session", "title", "arc", "summary", "fullText"];
for (const [index, record] of records.entries()) {
  for (const key of required) {
    if (!(key in record)) throw new Error(`第 ${index + 1} 条记录缺少 ${key}`);
  }
}
console.log(`已验证 ${records.length} 条冒险记录。`);
