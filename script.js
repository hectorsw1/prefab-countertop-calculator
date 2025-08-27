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

/* ===================== Table & helpers ===================== */
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

/* ===================== Calculate ===================== */
function calculate() {
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

  document.getElementById('totalSqft')?.innerText   = sumSqft.toFixed(2);
  document.getElementById('totalLabor')?.innerText  = sumLabor.toFixed(2);
  document.getElementById('totalExtras')?.innerText = sumExtras.toFixed(2);
  document.getElementById('totalCost')?.innerText   = (sumTotal + addons.total + currentPlywoodCost + oversizeFee).toFixed(2);

  let kInst=0, bInst=0, fab=0;
  rows.forEach(row => {
    const sink = row.querySelector('.sink')?.value || '';
    if (sink==='kitchen_sink') kInst+=180;
    else if (sink==='bathroom_sink') bInst+=80;
    else if (sink==='bar_sink') kInst+=80;
    fab += (parseFloat(row.querySelector('.refab')?.value)||0) * REFAB_RATE;
  });
  document.getElementById('kitchenSinkInstall')?.replaceChildren(`$${(kInst + addons.kitchen).toFixed(2)}`);
  document.getElementById('bathSinkInstall')?.replaceChildren(`$${(bInst + addons.bathroom).toFixed(2)}`);
  document.getElementById('installationCost')?.replaceChildren(`$${sumLabor.toFixed(2)}`);
  document.getElementById('fabricationCost')?.replaceChildren(`$${fab.toFixed(2)}`);
  document.getElementById('plywoodCost')?.replaceChildren(`$${currentPlywoodCost.toFixed(2)}`);
  document.getElementById('grandTotal')?.replaceChildren(`$${(sumTotal + addons.kitchen + addons.bathroom + currentPlywoodCost + oversizeFee).toFixed(2)}`);
}

/* ===================== Packing (fewest slabs → upgrade → final shrink; cross-width reuse) ===================== */
const WIDTH_BUCKET_STEP = 0.125; // 1/8"
function bucketWidthKey(w){ return (Math.round(w/WIDTH_BUCKET_STEP)*WIDTH_BUCKET_STEP).toFixed(3); }
function asSL_SW(s){ return [Math.max(s[0],s[1]), Math.min(s[0],s[1])]; }

function poolKeyForPack(mat){ return `${mat}|ALL`; }
function getCandidatesFor(material, type){
  if (type === 'FullBacksplash') {
    return []
      .concat(PREFAB[material]?.Countertop||[],
              PREFAB[material]?.Island||[],
              PREFAB[material]?.Bartop||[]);
  }
  return []
    .concat(PREFAB[material]?.Countertop||[],
            PREFAB[material]?.Island||[],
            PREFAB[material]?.Bartop||[],
            PREFAB[material]?.Backsplash||[]);
}

// Create a new bin from candidates for a given width and initial length need
function openBin(candsSW, needL){
  const chosen = candsSW.find(c => c.SL + 1e-6 >= needL);
  if (!chosen) return null;
  return {
    SL: chosen.SL,
    SW: chosen.SW,
    remaining: chosen.SL - needL,
    cuts: [],
    rowIdxs: new Set(),
    used: needL,
    ladder: candsSW.map(c => c.SL).sort((a,b)=>a-b)
  };
}

function tryPlaceOrUpgrade(bin, part, width){
  if (bin.SW + 1e-6 < width) return false;
  if (bin.remaining + 1e-6 >= part.L){
    bin.cuts.push({ part, cutL: part.L, cutW: width });
    bin.remaining -= part.L;
    bin.used += part.L;
    bin.rowIdxs.add(part.idx);
    return true;
  }
  const needTotal = bin.used + part.L;
  const nextSL = bin.ladder.find(SL => SL + 1e-6 >= needTotal);
  if (nextSL && nextSL > bin.SL + 1e-6) {
    bin.remaining = nextSL - needTotal;
    bin.SL = nextSL;
    bin.cuts.push({ part, cutL: part.L, cutW: width });
    bin.used = needTotal;
    bin.rowIdxs.add(part.idx);
    return true;
  }
  return false;
}

function finalShrink(bins){
  bins.forEach(b=>{
    const best = b.ladder.find(SL => SL + 1e-6 >= b.used);
    if (best && best < b.SL - 1e-6){
      b.SL = best;
      b.remaining = b.SL - b.used;
    }
  });
  return bins;
}

/* ===================== Suggest Prefab Pieces ===================== */
function suggestPieces(){
  const suggestBody = document.getElementById('suggestBody');
  suggestBody.innerHTML = '';

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

  // Pool by material then width
  const pools = new Map(); // poolKey -> Map(widthKey -> parts[])
  parts.forEach(p=>{
    const key = poolKeyForPack(p.mat);
    if (!pools.has(key)) pools.set(key, new Map());
    const wk = bucketWidthKey(p.W);
    const m = pools.get(key);
    if (!m.has(wk)) m.set(wk, []);
    m.get(wk).push(p);
  });

  const pieceCounts = {};
  const leftoverPieces = [];
  const addCount = (mat, SL, SW) => {
    const k = `${SL.toFixed(0)}×${SW.toFixed(0)}`;
    pieceCounts[mat] = pieceCounts[mat] || {};
    pieceCounts[mat][k] = (pieceCounts[mat][k] || 0) + 1;
  };
  const addRow = (idx, group, typ, cut, source, prefab, left) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx}</td><td>${group}</td><td>${typ}</td><td>${cut}</td><td>${source}</td><td>${prefab}</td><td>${left}</td>`;
    suggestBody.appendChild(tr);
  };

  pools.forEach((byWidth, poolKey) => {
    let bins = [];
    const widthKeys = Array.from(byWidth.keys()).sort((a,b)=>parseFloat(b)-parseFloat(a));
    const placements = new Map(); // partidx -> [{...}]

    widthKeys.forEach(wk=>{
      const partsW = (byWidth.get(wk)||[]).slice().sort((a,b)=>b.L-a.L);
      if (!partsW.length) return;

      const width = partsW[0].W;
      const mat   = partsW[0].mat;
      const typ   = partsW[0].typ;

      const cand = getCandidatesFor(mat, typ)
        .map(asSL_SW)
        .filter(([SL,SW]) => SW + 1e-6 >= width);

      if (!cand.length){
        partsW.forEach(p=>addRow(p.idx,p.group,p.typ,`${p.L.toFixed(2)}×${p.W.toFixed(2)}`,'No fit','-','—'));
        return;
      }

      // Ladder groups by SW
      const cBySW = new Map();
      cand.forEach(([SL,SW])=>{
        const arr = cBySW.get(SW) || [];
        arr.push({SL,SW});
        cBySW.set(SW, arr);
      });
      cBySW.forEach(arr => arr.sort((a,b)=>a.SL-b.SL));

      partsW.forEach(p=>{
        // (1) Try existing bins first (may be wider)
        let placed = false;
        // Best-fit: least leftover after placement/upgrade
        let bestIdx = -1, bestAfter = Infinity;
        bins.forEach((b,i)=>{
          if (b.SW + 1e-6 < width) return;
          let after = Infinity;
          if (b.remaining + 1e-6 >= p.L) after = b.remaining - p.L;
          else {
            const needTotal = b.used + p.L;
            const nextSL = b.ladder.find(SL => SL + 1e-6 >= needTotal);
            if (nextSL) after = nextSL - needTotal;
          }
          if (after < bestAfter){ bestAfter = after; bestIdx = i; }
        });
        if (bestIdx >= 0 && tryPlaceOrUpgrade(bins[bestIdx], p, width)) {
          placed = true;
        }

        // (2) Open new bin if needed — ***choose the NARROWEST SW that fits***
        if (!placed){
          const SWs = Array.from(cBySW.keys()).sort((a,b)=>a-b); // <-- ascending (narrow first)
          for (const SW of SWs){
            const ladder = cBySW.get(SW);
            const b = openBin(ladder, p.L);
            if (b){
              b.cuts.push({ part:p, cutL:p.L, cutW:width });
              b.rowIdxs.add(p.idx);
              bins.push(b);
              placed = true;
              break;
            }
          }
          if (!placed){
            addRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${width.toFixed(2)}`, 'No fit', '-', '—');
          }
        }
      });

      // record provisional placements for this width
      bins.forEach((b, bi)=>{
        const rowsUsed = b.rowIdxs ? Array.from(b.rowIdxs).sort((x,y)=>x-y).join(', ') : '';
        const tag = rowsUsed ? `(Piece #${bi+1}; Rows ${rowsUsed})` : `(Piece #${bi+1})`;
        (b.cuts||[]).forEach(c=>{
          if (Math.abs(c.cutW - width) > 1e-5) return;
          const cutStr = `${c.cutL.toFixed(2)}×${width.toFixed(2)}`;
          const prefStr = `${b.SL.toFixed(2)}×${b.SW.toFixed(2)} ${tag}`;
          const arr = placements.get(c.part.idx) || [];
          arr.push({ cutStr, prefStr, _binIndex: bi, _width: width });
          placements.set(c.part.idx, arr);
        });
      });
    });

    // shrink and count
    finalShrink(bins);
    bins.forEach(b=>{ if (b.SL && b.SW) addCount(parts[0].mat, b.SL, b.SW); });

    // render with final leftovers (once per bin×width)
    const printedLeftoverForBinWidth = new Set();
    Array.from(placements.keys()).sort((a,b)=>a-b).forEach(idx=>{
      const arr = placements.get(idx) || [];
      arr.forEach((pl,j)=>{
        const bi = pl._binIndex, width = pl._width;
        const b = bins[bi];
        const rowsUsed = b.rowIdxs ? Array.from(b.rowIdxs).sort((x,y)=>x-y).join(', ') : '';
        const tag = rowsUsed ? `(Piece #${bi+1}; Rows ${rowsUsed})` : `(Piece #${bi+1})`;
        const prefStr = `${b.SL.toFixed(2)}×${b.SW.toFixed(2)} ${tag}`;

        let leftStr = '—';
        const key = `${bi}@${width.toFixed(3)}`;
        if (!printedLeftoverForBinWidth.has(key)){
          const cutsThisWidth = (b.cuts||[]).filter(c=>Math.abs(c.cutW - width) < 1e-5);
          const usedOnWidth   = cutsThisWidth.reduce((s,c)=>s+c.cutL,0);
          const totalBefore   = (b.cuts||[]).reduce((s,c)=> s + (c.cutW < width ? c.cutL : 0), 0);
          const tail = Math.max(0, b.SL - (totalBefore + usedOnWidth));
          if (tail > 0){
            leftStr = `${tail.toFixed(2)}×${width.toFixed(2)} ${tag}`;
            leftoverPieces.push(`${tail.toFixed(0)} × ${width.toFixed(0)} ${tag}`);
          }
          printedLeftoverForBinWidth.add(key);
        }

        const part = parts.find(p=>p.idx===idx);
        const source = (j===0) ? 'Prefab' : 'Leftover';
        addRow(idx, part?.group||'', part?.typ||'', pl.cutStr, source, prefStr, leftStr);
      });
    });
  });

  // roll-up
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

/* ===================== Plywood ===================== */
// Returns { sheets, cost }
function computePlywoodPlan(){
  const rows = Array.from(document.querySelectorAll('#inputTable tbody tr'));
  const pieces=[];
  rows.forEach(row=>{
    const type=(row.querySelector('.ptype')?.value||'').trim();
    if (!['Countertop','Island','Bartop'].includes(type)) return;
    const rawL=parseFloat(row.querySelector('.length')?.value)||0;
    const rawW=parseFloat(row.querySelector('.width')?.value)||0;
    let adjL = rawL - PLY_OFFSET_LENGTH;
    let adjW = rawW - PLY_OFFSET_WIDTH;
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
        const rectL=fit1?r.L:r.W, rectW=fit1?r.W:r.L;
        const rem1={L:rectL-p.L, W:p.W}, rem2={L:rectL, W:rectW-p.W};
        sh.leftovers.splice(i,1);
        [rem1,rem2].forEach(x=>{ if(x.L>1 && x.W>1) sh.leftovers.push(x); });
        sh.cuts.push({ L:p.L, W:p.W }); placed=true; break;
      }
      if (placed) break;
    }
    if (!placed){
      const sh=newSheet(); const r=sh.leftovers[0];
      const rectL=r.L, rectW=r.W;
      const rem1={L:rectL-p.L, W:p.W}, rem2={L:rectL, W:rectW-p.W};
      sh.leftovers=[]; [rem1,rem2].forEach(x=>{ if(x.L>1 && x.W>1) sh.leftovers.push(x); });
      sh.cuts.push({ L:p.L, W:p.W }); sheets.push(sh);
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

/* ===================== OCR (Tesseract.js) ===================== */
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
    out.push({ label, length:a, width:b }); // keep order written
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

/* ===================== Buttons ===================== */
window.calculate       = calculate;
window.suggestPieces   = suggestPieces;
window.suggestPlywood  = suggestPlywood;
