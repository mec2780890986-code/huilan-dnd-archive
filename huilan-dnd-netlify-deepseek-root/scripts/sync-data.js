import fs from "node:fs";
const source = new URL("../public/adventures.json", import.meta.url);
const target = new URL("../netlify/functions/adventures-data.js", import.meta.url);
const records = JSON.parse(fs.readFileSync(source, "utf8"));
fs.writeFileSync(target, `export default ${JSON.stringify(records)};\n`, "utf8");
console.log(`已同步 ${records.length} 条记录到 AI Function。`);
