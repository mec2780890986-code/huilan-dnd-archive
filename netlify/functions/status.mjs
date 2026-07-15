const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export default async () => json(200, {
  functionReady: true,
  deepseekKeyConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
  model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
  accessCodeEnabled: Boolean(process.env.AI_ACCESS_CODE)
});
