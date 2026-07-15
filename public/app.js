const state = { records: [], meta: null };
const $ = (selector) => document.querySelector(selector);
const recordGrid = $("#recordGrid");
const resultCount = $("#resultCount");
const emptyState = $("#emptyState");
const searchInput = $("#searchInput");
const arcFilter = $("#arcFilter");
const characterFilter = $("#characterFilter");
const tagFilter = $("#tagFilter");
const recordDialog = $("#recordDialog");
const dialogContent = $("#dialogContent");
const chatForm = $("#chatForm");
const questionInput = $("#questionInput");
const chatLog = $("#chatLog");
const accessCodeInput = $("#accessCodeInput");

function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c]); }
function formatDate(date) {
  if (!date || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) return "日期未记录";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T00:00:00`));
}
function normalize(value = "") { return String(value).toLowerCase().normalize("NFKC"); }
function searchableText(r) { return [r.title,r.arc,r.location,r.summary,r.fullText,...(r.characters||[]),...(r.npcs||[]),...(r.tags||[]),...(r.loot||[]),...(r.quests||[])].join(" "); }
function option(value) { return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`; }
async function getJSON(url, options) { const res=await fetch(url,options); const data=await res.json().catch(()=>({})); if(!res.ok) throw new Error(data.error||"请求失败。"); return data; }

function makeMeta(records) {
  const unique=(xs)=>[...new Set(xs.filter(Boolean))].sort((a,b)=>a.localeCompare(b,"zh-CN"));
  return { total: records.length, arcs: unique(records.map(x=>x.arc)), characters: unique(records.flatMap(x=>x.characters||[])), tags: unique(records.flatMap(x=>x.tags||[])) };
}
function loadMeta() {
  state.meta=makeMeta(state.records);
  arcFilter.insertAdjacentHTML("beforeend",state.meta.arcs.map(option).join(""));
  characterFilter.insertAdjacentHTML("beforeend",state.meta.characters.map(option).join(""));
  tagFilter.insertAdjacentHTML("beforeend",state.meta.tags.map(option).join(""));
  $("#stats").innerHTML=`<div><strong>${state.meta.total}</strong><span>收录场次</span></div><div><strong>${state.meta.arcs.length}</strong><span>冒险篇章</span></div><div><strong>${state.meta.characters.length}</strong><span>登场角色</span></div>`;
}
function filteredRecords() {
  const q=normalize(searchInput.value.trim());
  return state.records.filter(r=>(!q||normalize(searchableText(r)).includes(q))&&(!arcFilter.value||r.arc===arcFilter.value)&&(!characterFilter.value||(r.characters||[]).includes(characterFilter.value))&&(!tagFilter.value||(r.tags||[]).includes(tagFilter.value))).sort((a,b)=>(Number(a.session)||0)-(Number(b.session)||0));
}
function renderRecords() {
  const records=filteredRecords(); resultCount.textContent=`找到 ${records.length} 条记录`; emptyState.classList.toggle("hidden",records.length!==0);
  recordGrid.innerHTML=records.map(r=>`<article class="record-card" tabindex="0" data-id="${escapeHtml(r.id)}"><div class="record-meta"><span>第 ${r.session} 场</span><time>${escapeHtml(r.date||"日期未记录")}</time></div><h3>${escapeHtml(r.title)}</h3><span class="location">${escapeHtml(r.location||"地点未记录")} · ${escapeHtml(r.arc)}</span><p class="record-summary">${escapeHtml(r.summary)}</p><div class="tags">${(r.tags||[]).slice(0,4).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div></article>`).join("");
}
function showRecord(id) {
  const r=state.records.find(x=>x.id===id); if(!r)return; const join=(xs)=>(xs||[]).map(escapeHtml).join("、")||"未记录";
  dialogContent.innerHTML=`<article class="dialog-body"><p class="dialog-kicker">第 ${r.session} 场 · ${formatDate(r.date)}</p><h2>${escapeHtml(r.title)}</h2><p class="location">${escapeHtml(r.location||"地点未记录")} · ${escapeHtml(r.arc)}</p><div class="dialog-section detail-list"><div><b>玩家角色</b>${join(r.characters)}</div><div><b>重要 NPC</b>${join(r.npcs)}</div></div><div class="dialog-section"><h3>本场摘要</h3><p>${escapeHtml(r.summary)}</p></div><div class="dialog-section"><h3>详细记录</h3><p>${escapeHtml(r.fullText)}</p></div><div class="dialog-section detail-list"><div><b>获得物品</b>${join(r.loot)}</div><div><b>任务与线索</b>${join(r.quests)}</div></div><div class="tags">${(r.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div></article>`;
  recordDialog.showModal();
}
function appendMessage(role,text,sources=[]) { const node=document.createElement("div"); node.className=`message ${role}`; const sh=sources.length?`<div class="sources">检索资料：${sources.map(s=>`第 ${s.session} 场《${escapeHtml(s.title)}》`).join("；")}</div>`:""; node.innerHTML=role==="assistant"?`<span class="avatar">✦</span><div><b>档案书记官</b><p>${escapeHtml(text)}</p>${sh}</div>`:`<div><p>${escapeHtml(text)}</p></div>`; chatLog.appendChild(node); chatLog.scrollTop=chatLog.scrollHeight; return node; }
async function ask(question) {
  appendMessage("user",question); const pending=appendMessage("assistant","正在翻阅相关卷宗……"); const button=chatForm.querySelector("button"); button.disabled=true;
  try { const data=await getJSON("/.netlify/functions/ask",{method:"POST",headers:{"content-type":"application/json","x-access-code":accessCodeInput?.value.trim()||""},body:JSON.stringify({question})}); pending.remove(); appendMessage("assistant",data.answer,data.sources); }
  catch(e){ pending.remove(); appendMessage("assistant",`无法完成查询：${e.message}`); } finally { button.disabled=false; questionInput.focus(); }
}
let debounce; [searchInput,arcFilter,characterFilter,tagFilter].forEach(c=>c.addEventListener(c===searchInput?"input":"change",()=>{clearTimeout(debounce);debounce=setTimeout(renderRecords,c===searchInput?200:0);}));
$("#clearFilters").addEventListener("click",()=>{searchInput.value="";arcFilter.value="";characterFilter.value="";tagFilter.value="";renderRecords();});
recordGrid.addEventListener("click",e=>{const card=e.target.closest(".record-card");if(card)showRecord(card.dataset.id);});
recordGrid.addEventListener("keydown",e=>{if(e.key==="Enter"){const card=e.target.closest(".record-card");if(card)showRecord(card.dataset.id);}});
$("#dialogClose").addEventListener("click",()=>recordDialog.close()); recordDialog.addEventListener("click",e=>{if(e.target===recordDialog)recordDialog.close();});
chatForm.addEventListener("submit",e=>{e.preventDefault();const q=questionInput.value.trim();if(!q)return;questionInput.value="";ask(q);});
document.querySelectorAll(".suggestion").forEach(b=>b.addEventListener("click",()=>{questionInput.value=b.textContent.trim();questionInput.focus();}));
(async()=>{try{state.records=await getJSON("/adventures.json");loadMeta();renderRecords();}catch(e){resultCount.textContent=`载入失败：${e.message}`;}})();
