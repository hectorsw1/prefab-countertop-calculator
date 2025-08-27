/* ===================== Catalog ===================== */
const PREFAB = {
  Granite: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island:     [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop:     [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: []
  },
  Quartz: {
    Countertop: [[26,96],[26,108],[26,114],[26,120]],
    Island:     [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop:     [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: []
  },
  Quartzite: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island:     [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop:     [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: []
  },
  Marble: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island:     [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop:     [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: []
  }
};

/* ===================== Constants ===================== */
const LABOR_RATE = 14; // $/sqft
const REFAB_RATE = 30; // $/lf
const ISLAND_SURCHARGE_L = 120;
const ISLAND_SURCHARGE_W = 43;
const ISLAND_SURCHARGE_COST = 150;

const PLY_SHEET = { L: 96, W: 48, COST: 70 };
const PLY_OFFSET_LENGTH = 3;
const PLY_OFFSET_WIDTH  = 2;

let currentPlywoodSheets = 0;
let currentPlywoodCost = 0;

/* ===================== Setup ===================== */
document.addEventListener('DOMContentLoaded', () => {
  ensureRows(50);

  // qty inputs live-recalc
  document.querySelectorAll('#sink-options .sink-qty').forEach(input => {
    const clamp = () => {
      let v = parseInt(input.value || '0', 10);
      if (isNaN(v) || v < 0) v = 0;
      if (v > 20) v = 20;
      input.value = String(v);
    };
    input.addEventListener('input', () => { clamp(); calculate(); });
    input.addEventListener('blur', clamp);
  });

  document.getElementById('oversizeFeeInput')?.addEventListener('input', calculate);

  const tbody = document.getElementById('tableBody');
  tbody.addEventListener('input', e => {
    if (e.target.matches('.length,.width,.refab,.group')) calculate();
  });
  tbody.addEventListener('change', e => {
    if (e.target.matches('.ptype,.material,.sink')) calculate();
  });

  calculate();
});

/* ===================== Table helpers ===================== */
function ensureRows(n) {
  const tbody = document.getElementById('tableBody');
  const cur = tbody.querySelectorAll('tr').length;
  for (let i = cur + 1; i <= n; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rownum">${i}</td>
      <td><input class="group" placeholder="A / 1"></td>
      <td>
        <select class="ptype">
          <option value="Countertop">Countertop</option>
          <option value="Island">Island</option>
          <option value="Bartop">Bartop</option>
          <option value="Backsplash">Backsplash</option>
          <option value="FullBacksplash">Full Backsplash</option>
        </select>
      </td>
      <td><input type="number" class="length" step="0.01"></td>
      <td><input type="number" class="width" step="0.01"></td>
      <td>
        <select class="material">
          <option value="Quartz">Quartz</option>
          <option value="Granite">Granite</option>
          <option value="Quartzite">Quartzite</option>
          <option value="Marble">Marble</option>
        </select>
      </td>
      <td>
        <select class="sink">
          <option value="">None</option>
          <option value="kitchen_sink">Kitchen Sink ($180)</option>
          <option value="bathroom_sink">Bathroom Sink ($80)</option>
          <option value="bar_sink">Bar Sink ($80)</option>
        </select>
      </td>
      <td><input type="number" class="refab" step="0.01" placeholder="LF"></td>
      <td class="sqft"></td>
      <td class="labor"></td>
      <td class="extras"></td>
      <td class="total"></td>
    `;
    tbody.appendChild(tr);
  }
}

function getSinkAddonsSplit() {
  const items = document.querySelectorAll('#sink-options .sink-item');
  let kitchen = 0, bathroom = 0;
  items.forEach(item => {
    const price = Number(item.dataset.price || 0);
    const qty = Math.min(20, Math.max(0, parseInt(item.querySelector('.sink-qty')?.value || '0', 10)));
    if (!qty) return;
    const id = item.querySelector('.sink-qty')?.id || '';
    const amount = price * qty;
    if (id.startsWith('qty-b')) bathroom += amount; else kitchen += amount;
  });
  return { kitchen, bathroom, total: kitchen + bathroom };
}

/* ===================== Calculate totals ===================== */
function calculate() {
  // keep plywood totals in sync
  const { sheets, cost } = computePlywoodPlan();
  currentPlywoodSheets = sheets.length;
  currentPlywoodCost = cost;

  const rows = document.querySelectorAll('#inputTable tbody tr');
  let sumSqft=0, sumLabor=0, sumExtras=0, sumTotal=0;

  rows.forEach(row => {
    const L = parseFloat(row.querySelector('.length')?.value) || 0;
    const W = parseFloat(row.querySelector('.width')?.value)  || 0;
    const sink = row.querySelector('.sink')?.value || '';
    const typ  = row.querySelector('.ptype')?.value || 'Countertop';
    const ref  = parseFloat(row.querySelector('.refab')?.value) || 0;

    const sqft = Math.ceil((L * W) / 144);
    let sinkCost = 0;
    if (sink === 'kitchen_sink') sinkCost = 180;
    else if (sink === 'bathroom_sink' || sink === 'bar_sink') sinkCost = 80;

    let extras = sinkCost + ref * REFAB_RATE;
    if (typ === 'Island' && L >= ISLAND_SURCHARGE_L && W >= ISLAND_SURCHARGE_W) {
      extras += ISLAND_SURCHARGE_COST;
    }

    const labor = sqft * LABOR_RATE;
    const total = labor + extras;

    row.querySelector('.sqft').textContent   = sqft.toFixed(2);
    row.querySelector('.labor').textContent  = labor.toFixed(2);
    row.querySelector('.extras').textContent = extras.toFixed(2);
    row.querySelector('.total').textContent  = total.toFixed(2);

    sumSqft += sqft; sumLabor += labor; sumExtras += extras; sumTotal += total;
  });

  const addons = getSinkAddonsSplit();
  const oversizeFee = Number(document.getElementById('oversizeFeeInput')?.value || 0) || 0;

  document.getElementById('totalSqft').textContent   = sumSqft.toFixed(2);
  document.getElementById('totalLabor').textContent  = sumLabor.toFixed(2);
  document.getElementById('totalExtras').textContent = sumExtras.toFixed(2);
  document.getElementById('totalCost').textContent   = (sumTotal + addons.total + currentPlywoodCost + oversizeFee).toFixed(2);

  // totals card
  let kInst=0, bInst=0, fab=0;
  rows.forEach(row=>{
    const sink = row.querySelector('.sink')?.value || '';
    if (sink==='kitchen_sink') kInst+=180;
    else if (sink==='bathroom_sink') bInst+=80;
    else if (sink==='bar_sink') kInst+=80;
    fab += (parseFloat(row.querySelector('.refab')?.value)||0) * REFAB_RATE;
  });
  document.getElementById('kitchenSinkInstall').textContent = `$${(kInst + addons.kitchen).toFixed(2)}`;
  document.getElementById('bathSinkInstall').textContent    = `$${(bInst + addons.bathroom).toFixed(2)}`;
  document.getElementById('installationCost').textContent   = `$${sumLabor.toFixed(2)}`;
  document.getElementById('fabricationCost').textContent    = `$${fab.toFixed(2)}`;
  document.getElementById('plywoodCost').textContent        = `$${currentPlywoodCost.toFixed(2)}`;
  document.getElementById('grandTotal').textContent         = `$${(sumTotal + addons.kitchen + addons.bathroom + currentPlywoodCost + oversizeFee).toFixed(2)}`;
}

/* ===================== Packing (fewest slabs → minimal size; cross-width reuse) ===================== */
const WIDTH_BUCKET_STEP = 0.125; // 1/8"
function bucketWidthKey(w){ return (Math.round(w/WIDTH_BUCKET_STEP)*WIDTH_BUCKET_STEP).toFixed(3); }
function asSL_SW(s){ return [Math.max(s[0],s[1]), Math.min(s[0],s[1])]; }

// Material pool (types share stock). FullBacksplash sourcing handled in candidates.
function poolKeyForPack(mat){ return `${mat}|ALL`; }
function getCandidatesFor(material, type){
  if (type === 'FullBacksplash') {
    // Only larger stock; exclude 4×108 strips
    return []
      .concat(PREFAB[material]?.Countertop||[],
              PREFAB[material]?.Island||[],
              PREFAB[material]?.Bartop||[]);
  }
  // Others can use any family (width check will gate feasibility)
  return []
    .concat(PREFAB[material]?.Countertop||[],
            PREFAB[material]?.Island||[],
            PREFAB[material]?.Bartop||[],
            PREFAB[material]?.Backsplash||[]);
}

function placeIntoOpenBins(openBins, part, width){
  // Best-fit into any open bin whose SW >= width and remaining >= L
  let bestIdx=-1, bestAfter=Infinity;
  for (let i=0;i<openBins.length;i++){
    const b=openBins[i];
    if (b.SW+1e-6>=width && b.remaining+1e-6>=part.L){
      const after=b.remaining-part.L;
      if (after<bestAfter){bestAfter=after; bestIdx=i;}
    }
  }
  if (bestIdx>=0){
    const bin=openBins[bestIdx];
    bin.cuts.push({ part, cutL: part.L, cutW: width });
    bin.remaining -= part.L;
    bin.rowIdxs.add(part.idx);
    return true;
  }
  return false;
}

function packSingleSlabIfPossible(partsW, candidates, width){
  const sumL = partsW.reduce((a,p)=>a+p.L,0);
  const cands = candidates.map(asSL_SW).filter(([SL,SW])=>SW+1e-6>=width).sort((a,b)=>a[0]-b[0]);
  const chosen = cands.find(([SL])=>SL+1e-6>=sumL);
  if (!chosen) return null;
  const [SL,SW]=chosen; let rem=SL; const rows=new Set(); const cuts=[];
  partsW.slice().sort((a,b)=>b.L-a.L).forEach(p=>{cuts.push({part:p,cutL:p.L,cutW:width}); rem-=p.L; rows.add(p.idx);});
  return [{ SL, SW, remaining: rem, cuts, rowIdxs: rows }];
}

function packMultiSizeFFD(partsW, candidates, width){
  const parts = partsW.slice().sort((a,b)=>b.L-a.L);
  const cands = candidates.map(asSL_SW).filter(([SL,SW])=>SW+1e-6>=width).sort((a,b)=>a[0]-b[0]);
  const bins=[];
  parts.forEach(p=>{
    if (placeIntoOpenBins(bins,p,width)) return;
    const chosen=cands.find(([SL])=>SL+1e-6>=p.L);
    if (!chosen){
      bins.push({SL:p.L,SW:width,remaining:0,cuts:[{part:p,cutL:p.L,cutW:width,nofit:true}],rowIdxs:new Set([p.idx])});
      return;
    }
    const [SL,SW]=chosen;
    bins.push({SL,SW,remaining:SL-p.L,cuts:[{part:p,cutL:p.L,cutW:width}],rowIdxs:new Set([p.idx])});
  });
  return bins;
}

function shrinkBins(bins, candidates, width){
  const cands = candidates.map(asSL_SW).filter(([SL,SW])=>SW+1e-6>=width).sort((a,b)=>a[0]-b[0]);
  bins.forEach(b=>{
    const used = b.cuts.reduce((a,c)=>a+c.cutL,0);
    const best = cands.find(([SL])=>SL+1e-6>=used);
    if (best && best[0] < b.SL) { b.SL = best[0]; b.SW = best[1]; b.remaining = b.SL - used; }
  });
  return bins;
}

/* ===================== Suggest Prefab Pieces ===================== */
function suggestPieces(){
  const suggestBody = document.getElementById('suggestBody');
  suggestBody.innerHTML = '';

  // Gather parts (respect typed L×W — no rotation)
  const rows = Array.from(document.querySelectorAll('#inputTable tbody tr'));
  const parts=[];
  rows.forEach((row,i)=>{
    const L=parseFloat(row.querySelector('.length')?.value)||0;
    const W=parseFloat(row.querySelector('.width')?.value)||0;
    const mat=row.querySelector('.material')?.value||'Quartz';
    const typ=row.querySelector('.ptype')?.value||'Countertop';
    const group=(row.querySelector('.group')?.value||'').trim();
    if (L>0 && W>0) parts.push({ idx:i+1, group, L, W, mat, typ });
  });
  if (!parts.length) return;

  // Pool by MATERIAL, then by width bucket (string keys)
  const pools = new Map(); // poolKey -> Map(widthKey -> part[])
  parts.forEach(p=>{
    const pkey = poolKeyForPack(p.mat);
    if (!pools.has(pkey)) pools.set(pkey, new Map());
    const wkey = bucketWidthKey(p.W);
    const byW = pools.get(pkey);
    if (!byW.has(wkey)) byW.set(wkey, []);
    byW.get(wkey).push(p);
  });

  const pieceCounts = {}; // {Material:{'SL×SW':count}}
  const leftoverPieces = [];
  const addCount = (mat, SL, SW) => {
    const key = `${SL.toFixed(0)}×${SW.toFixed(0)}`;
    pieceCounts[mat] = pieceCounts[mat] || {};
    pieceCounts[mat][key] = (pieceCounts[mat][key] || 0) + 1;
  };
  const addRow = (idx, group, typ, cut, source, prefab, left) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx}</td><td>${group}</td><td>${typ}</td><td>${cut}</td><td>${source}</td><td>${prefab}</td><td>${left}</td>`;
    suggestBody.appendChild(tr);
  };

  pools.forEach((byWidth) => {
    // Sort width buckets numerically (strings → numbers) widest → narrowest
    const widthKeys = Array.from(byWidth.keys()).sort((a,b)=>parseFloat(b)-parseFloat(a));

    let carryBins = [];
    const placements = new Map(); // part.idx -> [{...}]

    widthKeys.forEach(wk => {
      const partsW = byWidth.get(wk) || [];
      if (!partsW.length) return;

      const width = partsW[0].W;
      const { mat, typ } = partsW[0];
      const candidates = getCandidatesFor(mat, typ);
      if (!candidates.length){
        partsW.forEach(p=>addRow(p.idx,p.group,p.typ,`${p.L.toFixed(2)}×${p.W.toFixed(2)}`,'No fit','-','—'));
        return;
      }

      // 1) place into existing (wider) open bins first
      const remaining=[];
      partsW.slice().sort((a,b)=>b.L-a.L).forEach(p=>{
        if (!placeIntoOpenBins(carryBins,p,width)) remaining.push(p);
      });

      // 2) open new bins for the rest; prefer single-slab if possible
      let newBins=[];
      if (remaining.length){
        const single = packSingleSlabIfPossible(remaining, candidates, width);
        newBins = single ? single : packMultiSizeFFD(remaining, candidates, width);
      }

      // 3) shrink to smallest viable catalog lengths
      carryBins = shrinkBins(carryBins.concat(newBins), candidates, width);

      // 4) record placements & final-only leftovers
      carryBins.forEach((b, bi) => {
        if (b.SL && b.SW) addCount(mat, b.SL, b.SW);
        let running = b.SL ?? 0;
        const rowsUsed = b.rowIdxs ? Array.from(b.rowIdxs).sort((x,y)=>x-y).join(', ') : '';
        (b.cuts || []).forEach((c, ci) => {
          if (Math.abs(c.cutW - width) > 1e-5) return; // only this width bucket
          running -= c.cutL;
          const isLast = ci === (b.cuts.length - 1);
          const tag = rowsUsed ? `(Piece #${bi+1}; Rows ${rowsUsed})` : `(Piece #${bi+1})`;
          const cutStr  = `${c.cutL.toFixed(2)}×${width.toFixed(2)}`;
          const prefStr = (b.SL && b.SW) ? `${b.SL.toFixed(2)}×${b.SW.toFixed(2)} ${tag}` : '-';

          let leftStr = '—';
          const rem = Math.max(0, running);
          if (b.SL && isLast && rem > 0) {
            leftStr = `${rem.toFixed(2)}×${width.toFixed(2)} ${tag}`;
            leftoverPieces.push(`${rem.toFixed(0)} × ${width.toFixed(0)} ${tag}`);
          }

          const arr = placements.get(c.part.idx) || [];
          arr.push({ group:c.part.group, typ:c.part.typ, cutStr, prefStr, leftStr });
          placements.set(c.part.idx, arr);
        });
      });

      // 5) render rows (original order) for this width
      partsW.slice().sort((a,b)=>a.idx-b.idx).forEach(p=>{
        const arr = (placements.get(p.idx)||[]).filter(pl => pl.cutStr.endsWith(`×${width.toFixed(2)}`));
        if (!arr.length) {
          addRow(p.idx,p.group,p.typ,`${p.L.toFixed(2)}×${p.W.toFixed(2)}`,'No fit','-','—');
        } else {
          arr.forEach((pl,j)=>addRow(p.idx,p.group,p.typ,pl.cutStr, j===0?'Prefab':'Leftover', pl.prefStr, pl.leftStr));
        }
      });
    });
  });

  // Roll-up summary
  const summary = document.getElementById('prefabSummary');
  if (summary){
    const rowsHtml = Object.keys(pieceCounts).length
      ? Object.entries(pieceCounts).map(([mat,sizes]) =>
          Object.entries(sizes).sort((a,b)=>a[0].localeCompare(b[0]))
            .map(([sz,cnt])=>`<tr><td>${mat}</td><td>${sz}</td><td>${cnt}</td></tr>`).join('')
        ).join('')
      : `<tr><td colspan="3" class="muted">No new prefab pieces required (all parts fit into leftovers).</td></tr>`;
    const leftoversHtml = leftoverPieces.length
      ? `<ul style="margin:6px 0; padding-left:18px;">${leftoverPieces.map(x=>`<li>${x}</li>`).join('')}</ul>`
      : `<span class="muted">No leftover pieces</span>`;
    summary.innerHTML = `
      <h3>Prefab roll-up</h3>
      <div class="muted">Counts of pieces used (by prefab size), and leftover piece sizes from the plan.</div>
      <table aria-label="Pieces needed by size">
        <thead><tr><th>Material</th><th>Prefab size (in)</th><th>Count</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div style="margin-top:8px;"><strong>Leftover pieces:</strong> ${leftoversHtml}</div>
    `;
  }
}

/* ===================== Plywood (unchanged logic) ===================== */
// Returns { sheets, cost }
function computePlywoodPlan(){
  const rows = Array.from(document.querySelectorAll('#inputTable tbody tr'));
  const pieces=[];
  rows.forEach(row=>{
    const type=(row.querySelector('.ptype')?.value||'').trim();
    if (!['Countertop','Island','Bartop'].includes(type)) return;
    const rawL=parseFloat(row.querySelector('.length')?.value)||0;
    const rawW=parseFloat(row.querySelector('.width')?.value)||0;
    const adjL=rawL-PLY_OFFSET_LENGTH, adjW=rawW-PLY_OFFSET_WIDTH;
    if (!(adjL>0 && adjW>0)) return;
    const L=Math.max(adjL,adjW), W=Math.min(adjL,adjW);
    pieces.push({ L, W, area:L*W });
  });
  if (!pieces.length) return { sheets:[], cost:0 };
  pieces.sort((a,b)=>b.area-a.area);

  const sheets=[];
  const newSheet = () => ({ leftovers:[{L:PLY_SHEET.L, W:PLY_SHEET.W}], cuts:[] });

  pieces.forEach(p=>{
    let placed=false;
    for (const sh of sheets){
      for (let i=0;i<sh.leftovers.length;i++){
        const r=sh.leftovers[i];
        const fit1=(p.L<=r.L && p.W<=r.W), fit2=(p.L<=r.W && p.W<=r.L);
        if(!fit1 && !fit2) continue;
        const rectL=fit1? r.L:r.W, rectW=fit1? r.W:r.L;
        const rem1={L:rectL-p.L, W:p.W}, rem2={L:rectL, W:rectW-p.W};
        sh.leftovers.splice(i,1);
        [rem1,rem2].forEach(x=>{ if(x.L>1 && x.W>1) sh.leftovers.push(x); });
        sh.cuts.push({L:p.L, W:p.W}); placed=true; break;
      }
      if (placed) break;
    }
    if (!placed){
      const sh=newSheet(), r=sh.leftovers[0];
      const rectL=r.L, rectW=r.W;
      const rem1={L:rectL-p.L, W:p.W}, rem2={L:rectL, W:rectW-p.W};
      sh.leftovers=[]; [rem1,rem2].forEach(x=>{ if(x.L>1 && x.W>1) sh.leftovers.push(x); });
      sh.cuts.push({L:p.L, W:p.W}); sheets.push(sh);
    }
  });

  return { sheets, cost: sheets.length * PLY_SHEET.COST };
}

function suggestPlywood(){
  const { sheets, cost } = computePlywoodPlan();
  const body=document.getElementById('plyBody');
  const sum=document.getElementById('plySummary');
  body.innerHTML='';
  sheets.forEach((sh,i)=>{
    const cuts  = sh.cuts.map(c=>`${c.L.toFixed(2)}×${c.W.toFixed(2)}`).join(', ');
    const lefts = sh.leftovers.map(l=>`${l.L.toFixed(2)}×${l.W.toFixed(2)}`).join(', ');
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i+1}</td><td>${cuts}</td><td>${lefts}</td>`;
    body.appendChild(tr);
  });
  currentPlywoodSheets = sheets.length;
  currentPlywoodCost   = cost;
  if (sum) sum.textContent = `Sheets used: ${sheets.length} × $${PLY_SHEET.COST} = $${cost.toFixed(2)} (plywood piece size = L–3", W–2")`;
  calculate();
}

/* ===================== OCR (same as before) ===================== */
const imageInput = document.getElementById("imageInput");
const runOcrBtn  = document.getElementById("runOcrBtn");
const ocrStatus  = document.getElementById("ocrStatus");
const previewImg = document.getElementById("previewImg");
let uploadedImageURL = null;

if (imageInput) {
  imageInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    uploadedImageURL = url;
    if (previewImg) { previewImg.src = url; previewImg.style.display = "block"; }
    if (ocrStatus) ocrStatus.textContent = "Image loaded. Click 'Run OCR & Auto-Fill'.";
  });
}
if (runOcrBtn) {
  runOcrBtn.addEventListener("click", async () => {
    if (!uploadedImageURL) { if (ocrStatus) ocrStatus.textContent = "Please choose a sketch image first."; return; }
    if (ocrStatus) ocrStatus.textContent = "Running OCR…";
    try {
      const { data } = await Tesseract.recognize(uploadedImageURL, 'eng', { tessedit_char_whitelist: '0123456789xX/." \'' });
      const text = data.text || "";
      if (ocrStatus) ocrStatus.innerHTML = "OCR complete. <span class='badge'>Parsing…</span>";
      const parts = parseDimensions(text);
      if (!parts.length) { if (ocrStatus) ocrStatus.textContent = "No dimensions detected."; return; }
      autoFillRows(parts);
      if (ocrStatus) ocrStatus.textContent = `Auto-filled ${parts.length} item(s).`;
      calculate();
    } catch (e) { console.error(e); if (ocrStatus) ocrStatus.textContent = "OCR failed."; }
  });
}

function parseDimensions(text){
  const cleaned = text.replace(/\s+/g,' ').replace(/[,;]/g,' ').trim();
  const out=[]; const rg=/(?:([A-Za-z0-9]+)[:\)\-]?\s*)?(\d+(?:\s+\d+\/\d+)?(?:\.\d+)?)\s*(?:in|")?\s*[xX×]\s*(\d+(?:\s+\d+\/\d+)?(?:\.\d+)?)/g;
  let m;
  while ((m=rg.exec(cleaned))!==null){
    const label = m[1]?.trim()||'';
    const a = toInches(m[2]); const b = toInches(m[3]);
    out.push({ label, length:a, width:b }); // keep order
  }
  return out;
}
function toInches(s){
  s=String(s).trim();
  if (s.includes(' ')){ const [w,f]=s.split(' '); return parseFloat(w)+fracToDec(f); }
  if (s.includes('/')) return fracToDec(s);
  return parseFloat(s);
}
function fracToDec(fr){ const [n,d]=fr.split('/').map(Number); return (!d||d===0)?0:(n/d); }
function autoFillRows(parts){
  const tbody = document.getElementById('tableBody');
  const rows  = Array.from(tbody.querySelectorAll('tr'));
  let i=0;
  for (let r=0;r<rows.length && i<parts.length;r++){
    const row=rows[r], L=row.querySelector('.length'), W=row.querySelector('.width'), G=row.querySelector('.group');
    if (L.value || W.value) continue;
    L.value = parts[i].length.toFixed(2);
    W.value = parts[i].width.toFixed(2);
    if (parts[i].label) G.value = parts[i].label;
    i++;
  }
  if (i<parts.length){
    ensureRows(rows.length + (parts.length-i));
    const rows2 = Array.from(tbody.querySelectorAll('tr'));
    for (let r=rows.length; r<rows2.length && i<parts.length; r++){
      rows2[r].querySelector('.length').value = parts[i].length.toFixed(2);
      rows2[r].querySelector('.width').value  = parts[i].width.toFixed(2);
      if (parts[i].label) rows2[r].querySelector('.group').value = parts[i].label;
      i++;
    }
  }
}

/* ===================== Expose to HTML buttons ===================== */
window.calculate = calculate;
window.suggestPieces = suggestPieces;
window.suggestPlywood = suggestPlywood;
