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

  const feeInput = document.getElementById('oversizeFeeInput');
  if (feeInput) feeInput.addEventListener('input', calculate);

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

    const sqft = Math.ceil((L*W)/144);
    let sinkCost = 0;
    if (sink==='kitchen_sink') sinkCost=180;
    else if (sink==='bathroom_sink' || sink==='bar_sink') sinkCost=80;

    let extras = sinkCost + ref*REFAB_RATE;
    if (typ==='Island' && L>=ISLAND_SURCHARGE_L && W>=ISLAND_SURCHARGE_W) extras += ISLAND_SURCHARGE_COST;

    const labor = sqft*LABOR_RATE;
    const total = labor + extras;

    row.querySelector('.sqft').textContent   = sqft.toFixed(2);
    row.querySelector('.labor').textContent  = labor.toFixed(2);
    row.querySelector('.extras').textContent = extras.toFixed(2);
    row.querySelector('.total').textContent  = total.toFixed(2);

    sumSqft+=sqft; sumLabor+=labor; sumExtras+=extras; sumTotal+=total;
  });

  const addons = getSinkAddonsSplit();
  const oversizeFee = Number(document.getElementById('oversizeFeeInput')?.value || 0) || 0;

  const tSq = document.getElementById('totalSqft');
  const tLa = document.getElementById('totalLabor');
  const tEx = document.getElementById('totalExtras');
  const tTo = document.getElementById('totalCost');
  if (tSq) tSq.textContent = sumSqft.toFixed(2);
  if (tLa) tLa.textContent = sumLabor.toFixed(2);
  if (tEx) tEx.textContent = sumExtras.toFixed(2);
  if (tTo) tTo.textContent = (sumTotal + addons.total + currentPlywoodCost + oversizeFee).toFixed(2);

  // totals card
  let kInst=0, bInst=0, fab=0;
  rows.forEach(row=>{
    const sink = row.querySelector('.sink')?.value || '';
    if (sink==='kitchen_sink') kInst+=180;
    else if (sink==='bathroom_sink') bInst+=80;
    else if (sink==='bar_sink') kInst+=80;
    fab += (parseFloat(row.querySelector('.refab')?.value)||0)*REFAB_RATE;
  });
  const kEl = document.getElementById('kitchenSinkInstall');
  const bEl = document.getElementById('bathSinkInstall');
  const iEl = document.getElementById('installationCost');
  const fEl = document.getElementById('fabricationCost');
  const pEl = document.getElementById('plywoodCost');
  const gEl = document.getElementById('grandTotal');
  if (kEl) kEl.textContent = `$${(kInst + addons.kitchen).toFixed(2)}`;
  if (bEl) bEl.textContent = `$${(bInst + addons.bathroom).toFixed(2)}`;
  if (iEl) iEl.textContent = `$${sumLabor.toFixed(2)}`;
  if (fEl) fEl.textContent = `$${fab.toFixed(2)}`;
  if (pEl) pEl.textContent = `$${currentPlywoodCost.toFixed(2)}`;
  if (gEl) gEl.textContent = `$${(sumTotal + addons.kitchen + addons.bathroom + currentPlywoodCost + oversizeFee).toFixed(2)}`;
}

/* ===================== Packing (fewest slabs → upgrade → final shrink; cross-width reuse) ===================== */
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
  // Others can use any family (width check gates feasibility)
  return []
    .concat(PREFAB[material]?.Countertop||[],
            PREFAB[material]?.Island||[],
            PREFAB[material]?.Bartop||[],
            PREFAB[material]?.Backsplash||[]);
}

/* ---------- Bin helpers ---------- */
// Create a new bin from candidates for a given width and initial length need
function openBin(candsSW, needL){
  // candsSW: array of {SL,SW} already filtered/sorted ASC by SL
  const chosen = candsSW.find(c => c.SL + 1e-6 >= needL);
  if (!chosen) return null;
  return {
    SL: chosen.SL,         // catalog length chosen (can upgrade later)
    SW: chosen.SW,         // catalog short side (width)
    remaining: chosen.SL - needL,
    cuts: [],              // [{part, cutL, cutW}]
    rowIdxs: new Set(),    // rows used
    used: needL,           // total length used so far
    // Keep full ladder of upgrade options (same SW)
    ladder: candsSW.map(c => c.SL).sort((a,b)=>a-b)
  };
}

// Try place part in bin; if not enough remaining, try to "upgrade" the bin SL
function tryPlaceOrUpgrade(bin, part, width){
  if (bin.SW + 1e-6 < width) return false;
  if (bin.remaining + 1e-6 >= part.L){
    // fits as-is
    bin.cuts.push({ part, cutL: part.L, cutW: width });
    bin.remaining -= part.L;
    bin.used += part.L;
    bin.rowIdxs.add(part.idx);
    return true;
  }
  // consider upgrade
  const needTotal = bin.used + part.L;
  const nextSL = bin.ladder.find(SL => SL + 1e-6 >= needTotal);
  if (nextSL && nextSL > bin.SL + 1e-6) {
    // upgrade bin
    bin.remaining = nextSL - needTotal;
    bin.SL = nextSL;
    bin.cuts.push({ part, cutL: part.L, cutW: width });
    bin.used = needTotal;
    bin.rowIdxs.add(part.idx);
    return true;
  }
  return false;
}

// Final shrink all bins to minimal catalog length that fits "used"
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

  // For each MATERIAL pool:
  pools.forEach((byWidth) => {
    // Prepare one set of "open bins" carried across widths
    let bins = []; // each has ladder & can be upgraded later

    // Process width buckets numerically (widest → narrowest)
    const widthKeys = Array.from(byWidth.keys()).sort((a,b)=>parseFloat(b)-parseFloat(a));
    // Keep placements to render in original row order
    const placements = new Map(); // part.idx -> [{cutStr,prefStr,leftStr,source,_binIndex,_width}]

    widthKeys.forEach(wk => {
      const partsW = (byWidth.get(wk)||[]).slice().sort((a,b)=>b.L-a.L); // longest first
      if (!partsW.length) return;

      const width = partsW[0].W;
      const { mat, typ } = partsW[0];

      // Build candidates for this width; ladder per SW
      const cand = getCandidatesFor(mat, typ)
        .map(asSL_SW)
        .filter(([SL,SW]) => SW + 1e-6 >= width);

      if (!cand.length){
        partsW.forEach(p=>addRow(p.idx,p.group,p.typ,`${p.L.toFixed(2)}×${p.W.toFixed(2)}`,'No fit','-','—'));
        return;
      }

      // Group candidates by SW so upgrades preserve SW
      const cBySW = new Map(); // SW -> [{SL,SW}]
      cand.forEach(([SL,SW])=>{
        const arr = cBySW.get(SW) || [];
        arr.push({SL,SW});
        cBySW.set(SW, arr);
      });
      cBySW.forEach(arr => arr.sort((a,b)=>a.SL-b.SL));

      // For each part at this width:
      partsW.forEach(p=>{
        // 1) Try to place/upgrade into any existing bin (best-fit: minimal leftover after placement/upgrade)
        let bestIdx = -1, bestAfter = Infinity;
        bins.forEach((b, i)=>{
          if (b.SW + 1e-6 < width) return;
          let after = Infinity;
          if (b.remaining + 1e-6 >= p.L){
            after = b.remaining - p.L;
          } else {
            const needTotal = b.used + p.L;
            const nextSL = b.ladder.find(SL => SL + 1e-6 >= needTotal);
            if (nextSL) after = nextSL - needTotal;
          }
          if (after < bestAfter){
            bestAfter = after;
            bestIdx = i;
          }
        });

        if (bestIdx >= 0 && tryPlaceOrUpgrade(bins[bestIdx], p, width)) {
          // placed (maybe upgraded existing bin)
          return;
        }

        // 2) Open a new bin: prefer wider SW (better future reuse), with minimal SL that fits
        const SWs = Array.from(cBySW.keys()).sort((a,b)=>b-a); // wider first
        let opened = false;
        for (const SW of SWs){
          const ladder = cBySW.get(SW);
          const b = openBin(ladder, p.L);
          if (b){
            b.cuts.push({ part:p, cutL:p.L, cutW:width });
            b.rowIdxs.add(p.idx);
            bins.push(b);
            opened = true;
            break;
          }
        }
        if (!opened){
          // Shouldn't happen if cand non-empty, but guard
          addRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${width.toFixed(2)}`, 'No fit', '-', '—');
        }
      });

      // Record placements (we'll print leftovers after final shrink)
      bins.forEach((b, bi)=>{
        const rowsUsed = b.rowIdxs ? Array.from(b.rowIdxs).sort((x,y)=>x-y).join(', ') : '';
        const tag = rowsUsed ? `(Piece #${bi+1}; Rows ${rowsUsed})` : `(Piece #${bi+1})`;
        (b.cuts||[]).forEach(c=>{
          if (Math.abs(c.cutW - width) > 1e-5) return;
          const cutStr = `${c.cutL.toFixed(2)}×${width.toFixed(2)}`;
          const prefStr = `${b.SL.toFixed(2)}×${b.SW.toFixed(2)} ${tag}`; // will be updated logically by leftovers only
          const arr = placements.get(c.part.idx) || [];
          arr.push({ cutStr, prefStr, _binIndex: bi, _width: width });
          placements.set(c.part.idx, arr);
        });
      });
    });

    // Final shrink AFTER all widths are processed for this material pool
    finalShrink(bins);

    // Count pieces by final sizes
    bins.forEach(b=>{
      if (b.SL && b.SW) addCount(parts[0].mat, b.SL, b.SW);
    });

    // Render rows per part in input order and compute final leftovers (only once per piece-width)
    const printedLeftoverForBinWidth = new Set(); // `${bi}@${width}`
    Array.from(placements.keys()).sort((a,b)=>a-b).forEach(idx=>{
      const arr = placements.get(idx) || [];
      arr.forEach((pl, j) => {
        const bi = pl._binIndex;
        const width = pl._width;
        const b = bins[bi];

        // recompute piece tag with final sizes
        const rowsUsed = b.rowIdxs ? Array.from(b.rowIdxs).sort((x,y)=>x-y).join(', ') : '';
        const tag = rowsUsed ? `(Piece #${bi+1}; Rows ${rowsUsed})` : `(Piece #${bi+1})`;
        const prefStr = `${b.SL.toFixed(2)}×${b.SW.toFixed(2)} ${tag}`;

        // print leftover once per (bin,width) — after the last cut at that width
        let leftStr = '—';
        const key = `${bi}@${width.toFixed(3)}`;
        if (!printedLeftoverForBinWidth.has(key)) {
          const cutsThisWidth = (b.cuts||[]).filter(c => Math.abs(c.cutW - width) < 1e-5);
          const usedOnWidth = cutsThisWidth.reduce((s,c)=>s + c.cutL, 0);
          const totalUsedBeforeThisWidth = (b.cuts||[]).reduce((s,c)=> s + (c.cutW < width ? c.cutL : 0), 0);
          const tail = Math.max(0, b.SL - (totalUsedBeforeThisWidth + usedOnWidth));
          if (tail > 0){
            leftStr = `${tail.toFixed(2)}×${width.toFixed(2)} ${tag}`;
            leftoverPieces.push(`${tail.toFixed(0)} × ${width.toFixed(0)} ${tag}`);
          }
          printedLeftoverForBinWidth.add(key);
        }

        // Render the table row
        const part = parts.find(p=>p.idx===idx);
        const source = (j===0) ? 'Prefab' : 'Leftover';
        addRow(idx, part?.group||'', part?.typ||'', pl.cutStr, source, prefStr, leftStr);
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

/* ===================== Plywood (unchanged) ===================== */
// Returns { sheets, cost }
function computePlywoodPlan(){
  const rows = Array.from(document.querySelectorAll('#inputTable tbody tr'));
  const pieces=[];
  rows.forEach(row=>{
    const type = (row.querySelector('.ptype')?.value||'').trim();
    if (!['Countertop','Island','Bartop'].includes(type)) return; // exclude backsplash
    const rawL = parseFloat(row.querySelector('.length')?.value)||0;
    const rawW = parseFloat(row.querySelector('.width')?.value)||0;

    // apply offsets
    let adjL = rawL - PLY_OFFSET_LENGTH;
    let adjW = rawW - PLY_OFFSET_WIDTH;
    if (!(adjL > 0 && adjW > 0)) return;

    const L = Math.max(adjL, adjW);
    const W = Math.min(adjL, adjW);
    pieces.push({ L, W, area: L*W });
  });

  if (!pieces.length) return { sheets: [], cost: 0 };
  pieces.sort((a,b)=> b.area - a.area);

  // pack
  const sheets = []; // [{leftovers:[{L,W}], cuts:[{L,W}]}]
  const newSheet = () => ({ leftovers: [{L: PLY_SHEET.L, W: PLY_SHEET.W}], cuts: [] });

  pieces.forEach(p=>{
    let placed = false;
    for (const sh of sheets){
      for (let i=0;i<sh.leftovers.length;i++){
        const r = sh.leftovers[i];
        const fit1 = (p.L<=r.L && p.W<=r.W);
        const fit2 = (p.L<=r.W && p.W<=r.L);
        if (!fit1 && !fit2) continue;

        const rectL = fit1 ? r.L : r.W;
        const rectW = fit1 ? r.W : r.L;

        const rem1 = { L: rectL - p.L, W: p.W };
        const rem2 = { L: rectL,       W: rectW - p.W };

        sh.leftovers.splice(i,1);
        [rem1,rem2].forEach(x => { if (x.L>1 && x.W>1) sh.leftovers.push(x); });
        sh.cuts.push({ L:p.L, W:p.W });
        placed = true;
        break;
      }
      if (placed) break;
    }

    if (!placed){
      const sh = newSheet();
      const r = sh.leftovers[0];
      const rectL = r.L, rectW = r.W;

      const rem1 = { L: rectL - p.L, W: p.W };
      const rem2 = { L: rectL,       W: rectW - p.W };

      sh.leftovers = [];
      [rem1,rem2].forEach(x => { if (x.L>1 && x.W>1) sh.leftovers.push(x); });
      sh.cuts.push({ L:p.L, W:p.W });
      sheets.push(sh);
    }
  });

  return { sheets, cost: (sheets.length || 0) * PLY_SHEET.COST };
}

function suggestPlywood(){
  const { sheets, cost } = computePlywoodPlan();

  // render table
  const plyBody = document.getElementById("plyBody");
  const plySummary = document.getElementById("plySummary");
  plyBody.innerHTML = "";
  sheets.forEach((sh, idx) => {
    const cutsStr = sh.cuts.map(c => `${c.L.toFixed(2)}×${c.W.toFixed(2)}`).join(", ");
    const leftStr = sh.leftovers.map(l => `${l.L.toFixed(2)}×${l.W.toFixed(2)}`).join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${idx+1}</td><td>${cutsStr}</td><td>${leftStr}</td>`;
    plyBody.appendChild(tr);
  });

  currentPlywoodSheets = sheets.length;
  currentPlywoodCost = cost;
  if (plySummary) {
    plySummary.textContent = `Sheets used: ${currentPlywoodSheets} × $${PLY_SHEET.COST} = $${currentPlywoodCost.toFixed(2)} (plywood piece size = L–3", W–2")`;
  }

  // refresh totals AFTER state set
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
    if (!uploadedImageURL) {
      if (ocrStatus) ocrStatus.textContent = "Please choose a sketch image first.";
      return;
    }
    if (ocrStatus) ocrStatus.textContent = "Running OCR…";
    try {
      const { data } = await Tesseract.recognize(uploadedImageURL, 'eng', {
        tessedit_char_whitelist: '0123456789xX/." \'',
      });
      const text = data.text || "";
      if (ocrStatus) ocrStatus.innerHTML = "OCR complete. <span class='badge'>Parsing…</span>";
      const parts = parseDimensions(text);
      if (parts.length === 0) {
        if (ocrStatus) ocrStatus.textContent = "No dimensions detected.";
        return;
      }
      autoFillRows(parts);
      if (ocrStatus) ocrStatus.textContent = `Auto-filled ${parts.length} item(s).`;
      calculate();
    } catch (err) {
      console.error(err);
      if (ocrStatus) ocrStatus.textContent = "OCR failed.";
    }
  });
}

/* ===================== Parsing helpers ===================== */
function parseDimensions(text) {
  const cleaned = text.replace(/\s+/g, ' ').replace(/[,;]/g, ' ').trim();
  const results = [];
  const dimPattern = /(?:([A-Za-z0-9]+)[:\)\-]?\s*)?(\d+(?:\s+\d+\/\d+)?(?:\.\d+)?)\s*(?:in|")?\s*[xX×]\s*(\d+(?:\s+\d+\/\d+)?(?:\.\d+)?)/g;
  let match;
  while ((match = dimPattern.exec(cleaned)) !== null) {
    const label = match[1] ? String(match[1]).trim() : "";
    const a = toInches(match[2]);
    const b = toInches(match[3]);
    results.push({ label, length: a, width: b }); // keep L×W as written
  }
  return results;
}
function toInches(s) {
  s = String(s).trim();
  if (s.includes(" ")) {
    const [whole, frac] = s.split(" ");
    return parseFloat(whole) + fracToDec(frac);
  }
  if (s.includes("/")) return fracToDec(s);
  return parseFloat(s);
}
function fracToDec(frac) {
  const [n, d] = frac.split("/").map(Number);
  if (!d || d === 0) return 0;
  return n / d;
}
function autoFillRows(parts) {
  const tbody = document.getElementById("tableBody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  let idx = 0;
  for (let r = 0; r < rows.length && idx < parts.length; r++) {
    const row = rows[r];
    const lenInput = row.querySelector(".length");
    const widInput = row.querySelector(".width");
    const groupInput = row.querySelector(".group");
    if ((lenInput.value || widInput.value)) continue;
    lenInput.value = parts[idx].length.toFixed(2);
    widInput.value = parts[idx].width.toFixed(2);
    if (parts[idx].label) groupInput.value = parts[idx].label;
    idx++;
  }
  if (idx < parts.length) {
    const need = parts.length - idx;
    ensureRows(rows.length + need);
    const newRows = Array.from(tbody.querySelectorAll("tr"));
    for (let r = rows.length; r < newRows.length && idx < parts.length; r++) {
      const row = newRows[r];
      row.querySelector(".length").value = parts[idx].length.toFixed(2);
      row.querySelector(".width").value  = parts[idx].width.toFixed(2);
      if (parts[idx].label) row.querySelector(".group").value = parts[idx].label;
      idx++;
    }
  }
}

/* ===================== Plywood button: render using planner ===================== */
function suggestPlywood() {
  const { sheets, cost } = computePlywoodPlan();

  // render table
  const plyBody = document.getElementById("plyBody");
  const plySummary = document.getElementById("plySummary");
  plyBody.innerHTML = "";
  sheets.forEach((sh, idx) => {
    const cutsStr = sh.cuts.map(c => `${c.L.toFixed(2)}×${c.W.toFixed(2)}`).join(", ");
    const leftStr = sh.leftovers.map(l => `${l.L.toFixed(2)}×${l.W.toFixed(2)}`).join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${idx+1}</td><td>${cutsStr}</td><td>${leftStr}</td>`;
    plyBody.appendChild(tr);
  });

  currentPlywoodSheets = sheets.length;
  currentPlywoodCost = cost;
  if (plySummary) {
    plySummary.textContent = `Sheets used: ${currentPlywoodSheets} × $${PLY_SHEET.COST} = $${currentPlywoodCost.toFixed(2)} (plywood piece size = L–3", W–2")`;
  }

  // refresh totals AFTER state set
  calculate();
}

/* ===================== Expose to HTML buttons ===================== */
window.calculate = calculate;
window.suggestPieces = suggestPieces;
window.suggestPlywood = suggestPlywood;
