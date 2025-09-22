/* ========= CSV + DROPDOWNS + CALCULATOR ========= */
const CSV_FILES = {
  Quartz: "Quartz_tidy.csv",
  Granite: "Granite_tidy.csv",
  Quartzite: "Quartzite_tidy.csv",
  Marble: "Marble_tidy.csv",
};

const LABOR_RATE = 14, REFAB_RATE = 30, ISLAND_SURCHARGE_L = 120, ISLAND_SURCHARGE_W = 43, ISLAND_SURCHARGE_COST = 150;
const PLY_SHEET = { L: 96, W: 48, COST: 70 }, PLY_OFF_L = 3, PLY_OFF_W = 2;

const tableBody = document.getElementById("tableBody");
const suggestBody = document.getElementById("suggestBody");
const prefabSummary = document.getElementById("prefabSummary");

function parseCSV(text){
  const lines = text.replace(/\r/g,"").split("\n").filter(l=>l.trim().length);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map(h=>h.trim().toLowerCase());
  const iStone = headers.findIndex(h=>["stone","name","color"].includes(h));
  const iSize  = headers.findIndex(h=>["size","stock","dimension","dimensions"].includes(h));
  const out=[]; for (let i=1;i<lines.length;i++){ const cols=lines[i].split(",").map(c=>c.trim());
    const stone=iStone>=0?cols[iStone]:cols[0]; const size=iSize>=0?cols[iSize]:cols[1];
    if (stone && size) out.push({stone,size}); }
  return out;
}
async function loadMaterialCSV(path){
  const res = await fetch(path,{cache:"no-store"}); if(!res.ok) throw new Error("fetch "+path); return parseCSV(await res.text());
}
function buildByMaterialStone(store){
  const out={}; for(const mat of Object.keys(store)){ out[mat]={}; for(const r of store[mat]){
    const s=(r.stone||"").trim(), z=(r.size||"").trim(); if(!s||!z) continue; (out[mat][s] ||= new Set()).add(z);
  }} return out;
}
let BY = {};

function setupGlobalStoneSelector(){
  const matSel = document.getElementById("materialSelect");
  const stoneSel = document.getElementById("stoneSelect");
  const hint = document.getElementById("stoneHint");
  if (!matSel || !stoneSel) return;
  function populate(mat){
    stoneSel.disabled = true; stoneSel.innerHTML = '<option value="" disabled selected>Loading…</option>';
    const stones = Object.keys(BY[mat]||{}).sort((a,b)=>a.localeCompare(b));
    stoneSel.innerHTML = ""; const opt0=new Option("Select stone…","",true,true); opt0.disabled=true; stoneSel.append(opt0);
    stones.forEach(s=>stoneSel.append(new Option(s,s)));
    stoneSel.disabled = stones.length===0;
    if(hint) hint.textContent = stones.length ? `Loaded ${stones.length} stones for ${mat}` : `No stones found for ${mat}`;
  }
  matSel.addEventListener("change", ()=>populate(matSel.value));
  stoneSel.addEventListener("change", ()=>{ try{ suggestPieces(); }catch(_){}});
}

function ensureRows(n){
  const cur = tableBody.querySelectorAll("tr").length;
  for(let i=cur+1;i<=n;i++){
    const tr=document.createElement("tr");
    tr.innerHTML = `
      <td class="rownum">${i}</td>
      <td><input class="group" placeholder="A / 1" /></td>
      <td><select class="ptype">
        <option value="Countertop">Countertop</option>
        <option value="Island">Island</option>
        <option value="Bartop">Bartop</option>
        <option value="Backsplash">Backsplash</option>
        <option value="FullBacksplash">Full Backsplash</option>
      </select></td>
      <td><input type="number" class="length" step="0.01" /></td>
      <td><input type="number" class="width" step="0.01" /></td>
      <td><select class="material">
        <option value="Quartz">Quartz</option>
        <option value="Granite">Granite</option>
        <option value="Quartzite">Quartzite</option>
        <option value="Marble">Marble</option>
      </select></td>
      <td><select class="sink">
        <option value="">None</option>
        <option value="kitchen_sink">Kitchen Sink ($180)</option>
        <option value="bathroom_sink">Bathroom Sink ($80)</option>
        <option value="bar_sink">Bar Sink ($80)</option>
      </select></td>
      <td><input type="number" class="refab" step="0.01" placeholder="LF" /></td>
      <td class="sqft"></td><td class="labor"></td><td class="extras"></td><td class="total"></td>`;
    tableBody.appendChild(tr);
  }
}

function getSinkAddonsSplit(){
  const items=document.querySelectorAll('#sink-options .sink-item'); let kitchen=0,bathroom=0;
  items.forEach(item=>{ const price=Number(item.dataset.price||0);
    const qty=Math.min(20,Math.max(0,parseInt(item.querySelector('.sink-qty')?.value||'0',10))); if(!qty) return;
    const id=item.querySelector('.sink-qty')?.id||''; const amount=price*qty;
    if(id.startsWith('qty-b')) bathroom+=amount; else kitchen+=amount; });
  return {kitchen,bathroom,total:kitchen+bathroom};
}
let currentPlywoodCost=0;
function calculate(){
  const rows=document.querySelectorAll("#inputTable tbody tr");
  let sumSqft=0,sumLabor=0,sumExtras=0,sumTotal=0;
  rows.forEach(row=>{
    const L=parseFloat(row.querySelector(".length")?.value)||0;
    const W=parseFloat(row.querySelector(".width")?.value)||0;
    const ptype=row.querySelector(".ptype")?.value||"Countertop";
    const sinkType=row.querySelector(".sink")?.value||"";
    const refabLF=parseFloat(row.querySelector(".refab")?.value)||0;
    const sqft=Math.ceil((L*W)/144);
    let sinkCost=0; if(sinkType==="kitchen_sink") sinkCost=180; else if(sinkType==="bathroom_sink") sinkCost=80; else if(sinkType==="bar_sink") sinkCost=80;
    const labor=sqft*LABOR_RATE; let extras=sinkCost + refabLF*REFAB_RATE;
    if(ptype==="Island" && L>=ISLAND_SURCHARGE_L && W>=ISLAND_SURCHARGE_W) extras+=ISLAND_SURCHARGE_COST;
    const total=labor+extras;
    row.querySelector(".sqft").innerText=sqft.toFixed(2);
    row.querySelector(".labor").innerText=labor.toFixed(2);
    row.querySelector(".extras").innerText=extras.toFixed(2);
    row.querySelector(".total").innerText=total.toFixed(2);
    sumSqft+=sqft; sumLabor+=labor; sumExtras+=extras; sumTotal+=total;
  });
  const addons=getSinkAddonsSplit();
  const fee=Number(document.getElementById('oversizeFeeInput')?.value||0)||0;
  document.getElementById("totalSqft").innerText=sumSqft.toFixed(2);
  document.getElementById("totalLabor").innerText=sumLabor.toFixed(2);
  document.getElementById("totalExtras").innerText=sumExtras.toFixed(2);
  document.getElementById("totalCost").innerText=(sumTotal+addons.total+currentPlywoodCost+fee).toFixed(2);
  document.getElementById("kitchenSinkInstall").textContent=`$${addons.kitchen.toFixed(2)}`;
  document.getElementById("bathSinkInstall").textContent   =`$${addons.bathroom.toFixed(2)}`;
  document.getElementById("installationCost").textContent  =`$${sumLabor.toFixed(2)}`;
  document.getElementById("fabricationCost").textContent   =`$${(0).toFixed(2)}`;
  document.getElementById("plywoodCost").textContent       =`$${currentPlywoodCost.toFixed(2)}`;
  document.getElementById("grandTotal").textContent        =`$${(sumTotal+addons.total+currentPlywoodCost+fee).toFixed(2)}`;
}

/* OCR (light) */
const imageInput=document.getElementById("imageInput");
const runOcrBtn=document.getElementById("runOcrBtn");
const ocrStatus=document.getElementById("ocrStatus");
const previewImg=document.getElementById("previewImg");
let uploadedImageURL=null;
if(imageInput){ imageInput.addEventListener("change",e=>{
  const f=e.target.files?.[0]; if(!f) return; uploadedImageURL=URL.createObjectURL(f);
  if(previewImg){ previewImg.src=uploadedImageURL; previewImg.style.display="block"; }
  if(ocrStatus) ocrStatus.textContent="Image loaded. Click 'Run OCR & Auto-Fill'.";
});}
if(runOcrBtn){ runOcrBtn.addEventListener("click", async ()=>{
  if(!uploadedImageURL){ ocrStatus.textContent="Please choose a sketch image first."; return; }
  ocrStatus.textContent="Running OCR…";
  try{
    const { data } = await Tesseract.recognize(uploadedImageURL,'eng',{ tessedit_char_whitelist:'0123456789xX/.\" \'' });
    const text=data.text||""; ocrStatus.innerHTML="OCR complete. <span class='badge'>Parsing…</span>";
    const parts=parseDimensions(text); if(!parts.length){ ocrStatus.textContent="No dimensions detected."; return; }
    autoFillRows(parts); ocrStatus.textContent=`Auto-filled ${parts.length} item(s).`;
  }catch(e){ console.error(e); ocrStatus.textContent="OCR failed."; }
});}
function parseDimensions(text){
  const cleaned=text.replace(/\s+/g,' ').replace(/[,;]/g,' ').trim(); const out=[];
  const re=/(?:([A-Za-z0-9]+)[:\)\-]?\s*)?(\d+(?:\s+\d+\/\d+)?(?:\.\d+)?)\s*(?:in|")?\s*[xX×]\s*(\d+(?:\s+\d+\/\d+)?(?:\.\d+)?)/g;
  let m; while((m=re.exec(cleaned))!==null){ out.push({ label:m[1]||"", length:toInches(m[2]), width:toInches(m[3]) }); }
  return out;
}
function toInches(s){ s=String(s).trim(); if(s.includes(" ")){ const [w,f]=s.split(" "); return parseFloat(w)+fracToDec(f);} if(s.includes("/")) return fracToDec(s); return parseFloat(s); }
function fracToDec(fr){ const [n,d]=fr.split("/").map(Number); if(!d) return 0; return n/d; }
function autoFillRows(parts){
  const rows=Array.from(tableBody.querySelectorAll("tr")); let idx=0;
  for(let r=0;r<rows.length && idx<parts.length;r++){ const row=rows[r];
    const L=row.querySelector(".length"); const W=row.querySelector(".width"); const G=row.querySelector(".group");
    if((L.value||W.value)) continue; L.value=parts[idx].length.toFixed(2); W.value=parts[idx].width.toFixed(2);
    if(parts[idx].label) G.value=parts[idx].label; idx++; }
  if(idx<parts.length){ const need=parts.length-idx; ensureRows(rows.length+need);
    const all=Array.from(tableBody.querySelectorAll("tr"));
    for(let r=rows.length;r<all.length && idx<parts.length;r++){ const row=all[r];
      row.querySelector(".length").value=parts[idx].length.toFixed(2);
      row.querySelector(".width").value =parts[idx].width.toFixed(2);
      if(parts[idx].label) row.querySelector(".group").value=parts[idx].label; idx++; } }
}

/* Prefab planning (CSV-aware simplified) */
const WIDTH_BUCKET_STEP=0.125;
function bucketKey(w){ return (Math.round(w/WIDTH_BUCKET_STEP)*WIDTH_BUCKET_STEP).toFixed(3); }
function parseSizeTuple(sz){ const [L,W]=String(sz).toLowerCase().split('x').map(Number); return (isFinite(L)&&isFinite(W))?[Math.max(L,W),Math.min(L,W)]:null; }
function getCandidates(material,type,stone){
  if(type==="Bartop") return [[108,14],[108,16]];
  if(type==="Countertop") return [[96,26],[108,26],[114,26],[120,26]];
  if(type==="Island") return [[108,28],[108,32],[108,36],[108,39],[108,42],[108,52]];
  if(type==="Backsplash") return [[108,4],[108,7]];
  const by=BY[material]||{}; const set=new Set();
  if(stone && by[stone]) by[stone].forEach(s=>set.add(s)); else Object.values(by).forEach(S=>S.forEach(s=>set.add(s)));
  const list=[...set].map(parseSizeTuple).filter(Boolean);
  if(type==="FullBacksplash") return [...list,[108,16],[108,14],[96,26],[108,26],[114,26],[120,26],[108,28],[108,32],[108,36],[108,39],[108,42],[108,52],[108,4],[108,7];
  return list;
}
function packWidthBucket(parts,cands,width){
  const EPS=1e-6; const sizes=cands.filter(([SL,SW])=>SW+EPS>=width).sort((a,b)=>a[0]-b[0]);
  if(!sizes.length) return parts.map(p=>({SL:p.L,SW:width,remaining:0,nofit:true,cuts:[{part:p,cutL:p.L}]}));
  const maxSL=Math.max(...sizes.map(([SL])=>SL)); const bins=[]; const list=parts.slice().sort((a,b)=>b.L-a.L);
  for(const p of list){
    if(p.L-EPS>maxSL){ bins.push({SL:p.L,SW:width,remaining:0,nofit:true,cuts:[{part:p,cutL:p.L}]}); continue; }
    let placed=false;
    for(const b of bins){ if(!b.nofit && b.remaining+EPS>=p.L){ b.cuts.push({part:p,cutL:p.L}); b.remaining-=p.L; placed=true; break; } }
    if(!placed){ const best=sizes.find(([SL])=>SL+EPS>=p.L) || sizes[sizes.length-2];
      bins.push({SL:best[0],SW:best[1],remaining:best[0]-p.L,cuts:[{part:p,cutL:p.L}]}); }
  }
  return bins;
}
function addSuggestRow(idx,group,typ,cut,source,prefab,left){
  const tr=document.createElement("tr");
  tr.innerHTML=`<td>${idx}</td><td>${group}</td><td>${typ}</td><td>${cut}</td><td>${source}</td><td>${prefab}</td><td>${left}</td>`;
  suggestBody.appendChild(tr);
}
function suggestPieces(){
  suggestBody.innerHTML=""; prefabSummary.innerHTML="";
  const parts=[]; Array.from(tableBody.querySelectorAll("tr")).forEach((row,i)=>{
    const L=parseFloat(row.querySelector(".length")?.value)||0;
    const W=parseFloat(row.querySelector(".width")?.value)||0;
    const mat=row.querySelector(".material")?.value||"Quartz";
    const typ=row.querySelector(".ptype")?.value||"";
    const group=(row.querySelector(".group")?.value||"").trim();
    const stone=(document.getElementById("stoneSelect")?.value||"").trim();
    if(L>0 && W>0) parts.push({idx:i+1, group, L:Math.max(L,W), W:Math.min(L,W), mat, typ, stone});
  });
  if(!parts.length) return;
  const pools=new Map();
  parts.forEach(p=>{ const k=`${p.mat}|${p.typ}`; if(!pools.has(k)) pools.set(k,new Map());
    const wk=bucketKey(p.W); const byW=pools.get(k); (byW.get(wk)||byW.set(wk,[]).get(wk)).push(p); });
  const pieceCounts={};
  const addCount=(mat,SL,SW)=>{ const K=`${SL}×${SW}`; (pieceCounts[mat] ||= {}); pieceCounts[mat][K]=(pieceCounts[mat][K]||0)+1; };
  pools.forEach((byW,key)=>{
    const [mat,typ]=key.split("|");
    byW.forEach(arr=>{
      const width=arr[0].W; const cands=getCandidates(mat,typ,arr[0].stone);
      if(!cands.length){ arr.forEach(p=>addSuggestRow(p.idx,p.group,typ,`${p.L.toFixed(2)}×${p.W.toFixed(2)}`,"No fit","-","-")); return; }
      const bins=packWidthBucket(arr,cands,width);
      bins.forEach((b,bi)=>{
        if(!b.nofit && b.SL && b.SW) addCount(mat,b.SL,b.SW);
        let running=b.SL||0;
        (b.cuts||[]).forEach(c=>{
          running -= c.cutL;
          const cutStr=`${c.cutL.toFixed(2)}×${width.toFixed(2)}`;
          const prefabStr=(b.SL&&b.SW)?`${b.SL.toFixed(2)}×${b.SW.toFixed(2)} (Piece #${bi+1})`:"-";
          const leftStr=b.SL?`${Math.max(0,running).toFixed(2)}×${width.toFixed(2)} (Piece #${bi+1})`:"-";
          addSuggestRow(c.part.idx,c.part.group,typ,cutStr,b.nofit?"No fit":"Prefab",prefabStr,leftStr);
        });
      });
    });
  });
  const rowsHtml = Object.keys(pieceCounts).length
    ? Object.entries(pieceCounts).map(([mat,sizes])=>Object.entries(sizes)
        .sort((a,b)=>a[0].localeCompare(b[0]))
        .map(([sz,cnt])=>`<tr><td>${mat}</td><td>${sz}</td><td>${cnt}</td></tr>`).join("")
      ).join("")
    : `<tr><td colspan="3" class="muted">No prefab pieces required.</td></tr>`;
  prefabSummary.innerHTML = `<h3>Prefab roll-up</h3>
    <table><thead><tr><th>Material</th><th>Prefab size (in)</th><th>Count</th></tr></thead>
    <tbody>${rowsHtml}</tbody></table>`;
}

/* Plywood planner */
function computePlywoodPlan(){
  const rows=Array.from(tableBody.querySelectorAll("tr")); const pcs=[];
  rows.forEach(r=>{
    const typ=(r.querySelector(".ptype")?.value||"").trim();
    if(!["Countertop","Island","Bartop","Backsplash"].includes(typ)) return;
    const RL=parseFloat(r.querySelector(".length")?.value)||0;
    const RW=parseFloat(r.querySelector(".width")?.value)||0;
    let L=Math.max(RL-PLY_OFF_L, RW-PLY_OFF_W);
    let W=Math.min(RL-PLY_OFF_L, RW-PLY_OFF_W);
    if(L>0 && W>0) pcs.push({L,W,area:L*W});
  });
  pcs.sort((a,b)=>b.area-a.area);
  const sheets=[]; const newSheet=()=>({leftovers:[{L:PLY_SHEET.L,W:PLY_SHEET.W}],cuts:[]});
  pcs.forEach(p=>{
    let placed=false;
    for(const sh of sheets){
      for(let i=0;i<sh.leftovers.length;i++){
        const r=sh.leftovers[i]; const fit1=p.L<=r.L && p.W<=r.W; const fit2=p.L<=r.W && p.W<=r.L;
        if(!fit1 && !fit2) continue;
        const RL=fit1?r.L:r.W; const RW=fit1?r.W:r.L;
        const rem1={L:RL-p.L,W:p.W}; const rem2={L:RL,W:RW-p.W};
        sh.leftovers.splice(i,1); [rem1,rem2].forEach(x=>{ if(x.L>1 && x.W>1) sh.leftovers.push(x); });
        sh.cuts.push({L:p.L,W:p.W}); placed=true; break;
      }
      if(placed) break;
    }
    if(!placed){
      const sh=newSheet(); const r=sh.leftovers[0];
      const rem1={L:r.L-p.L,W:p.W}; const rem2={L:r.L,W:r.W-p.W};
      sh.leftovers=[]; [rem1,rem2].forEach(x=>{ if(x.L>1 && x.W>1) sh.leftovers.push(x); });
      sh.cuts.push({L:p.L,W:p.W}); sheets.push(sh);
    }
  });
  return { sheets, cost: sheets.length * PLY_SHEET.COST };
}
function suggestPlywood(){
  const { sheets, cost } = computePlywoodPlan();
  const plyBody=document.getElementById("plyBody");
  const plySummary=document.getElementById("plySummary");
  plyBody.innerHTML="";
  sheets.forEach((sh,idx)=>{
    const cuts=sh.cuts.map(c=>`${c.L.toFixed(2)}×${c.W.toFixed(2)}`).join(", ");
    const left=sh.leftovers.map(l=>`${l.L.toFixed(2)}×${l.W.toFixed(2)}`).join(", ");
    const tr=document.createElement("tr"); tr.innerHTML=`<td>${idx+1}</td><td>${cuts}</td><td>${left}</td>`; plyBody.appendChild(tr);
  });
  currentPlywoodCost = cost;
  if(plySummary) plySummary.textContent = `Sheets used: ${sheets.length} × $${PLY_SHEET.COST} = $${currentPlywoodCost.toFixed(2)} (plywood: L–3", W–2")`;
  calculate();
}

/* Boot */
document.addEventListener("DOMContentLoaded", async ()=>{
  ensureRows(30);

  document.querySelectorAll('#sink-options .sink-qty').forEach(input=>{
    const clamp=()=>{ let v=parseInt(input.value||"0",10); if(isNaN(v)||v<0) v=0; if(v>20) v=20; input.value=String(v); };
    input.addEventListener("input", ()=>{ clamp(); calculate(); });
    input.addEventListener("blur", clamp);
  });
  const fee=document.getElementById("oversizeFeeInput"); if(fee) fee.addEventListener("input", calculate);

  const store={ Quartz:[], Granite:[], Quartzite:[], Marble:[] };
  try{
    for(const [mat,path] of Object.entries(CSV_FILES)){ store[mat]=await loadMaterialCSV(path); }
    BY = buildByMaterialStone(store);
    document.getElementById("stoneHint").textContent = "CSV data loaded. Choose a material, then stone.";
  }catch(e){
    console.warn("CSV load failed", e); BY = { Quartz:{}, Granite:{}, Quartzite:{}, Marble:{} };
    document.getElementById("stoneHint").textContent = "Could not load CSVs. Check filenames/paths.";
  }

  setupGlobalStoneSelector();
  calculate();
});
