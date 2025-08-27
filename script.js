// --- PREFAB CATALOG (inches) ---
const PREFAB = {
  Granite: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: [] // cut from Countertop/Island/Bartop only
  },
  Quartz: {
    Countertop: [[26,96],[26,108],[26,114],[26,120]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: [] // cut from Countertop/Island/Bartop only
  },
  Quartzite: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: [] // cut from Countertop/Island/Bartop only
  },
  Marble: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: [] // cut from Countertop/Island/Bartop only
  }
};

// --- CONSTANTS ---
const LABOR_RATE = 14;             // $/sqft
const REFAB_RATE = 30;             // $/lf
const ISLAND_SURCHARGE_L = 120;    // inches
const ISLAND_SURCHARGE_W = 43;     // inches
const ISLAND_SURCHARGE_COST = 150;
const PLY_SHEET = { L: 96, W: 48, COST: 70 };  // Plywood
const PLY_OFFSET_LENGTH = 3;  // plywood piece rule: L - 3"
const PLY_OFFSET_WIDTH  = 2;  // plywood piece rule: W - 2"

// --- LIVE plywood state (for totals) ---
let currentPlywoodSheets = 0;
let currentPlywoodCost = 0;

/* ===================== SINK ADD-ONS (qty split) ===================== */
function getSinkAddonsSplit() {
  const items = document.querySelectorAll('#sink-options .sink-item');
  let kitchen = 0, bathroom = 0;

  items.forEach(item => {
    const price = Number(item.dataset.price || 0);
    const qtyInput = item.querySelector('.sink-qty');
    const qty = Math.min(20, Math.max(0, parseInt(qtyInput?.value || '0', 10)));
    if (!qty) return;
    const id = qtyInput.id || '';
    const amount = price * qty;
    if (id.startsWith('qty-b')) bathroom += amount;
    else kitchen += amount; // default to kitchen
  });

  return { kitchen, bathroom, total: kitchen + bathroom };
}

/* ===================== Setup ===================== */
document.addEventListener('DOMContentLoaded', () => {
  ensureRows(50);

  // Wire qty inputs
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
  if (feeInput) feeInput.addEventListener('input', () => calculate());

  calculate();
});

/* ===================== Table rows ===================== */
function ensureRows(targetCount) {
  const tableBody = document.getElementById("tableBody");
  const current = tableBody.querySelectorAll("tr").length;
  for (let i = current + 1; i <= targetCount; i++) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="rownum">${i}</td>
      <td><input class="group" placeholder="A / 1" /></td>
      <td>
        <select class="ptype">
          <option value="Countertop">Countertop</option>
          <option value="Island">Island</option>
          <option value="Bartop">Bartop</option>
          <option value="Backsplash">Backsplash</option>
          <option value="FullBacksplash">Full Backsplash</option>
        </select>
      </td>
      <td><input type="number" class="length" step="0.01" /></td>
      <td><input type="number" class="width" step="0.01" /></td>
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
      <td><input type="number" class="refab" step="0.01" placeholder="LF" /></td>
      <td class="sqft"></td>
      <td class="labor"></td>
      <td class="extras"></td>
      <td class="total"></td>
    `;
    tableBody.appendChild(row);
  }
}

/* ===================== Calculate totals ===================== */
function calculate() {
  // Keep plywood in sync with current inputs
  const { sheets: _sheets, cost: _cost } = computePlywoodPlan();
  currentPlywoodSheets = _sheets.length;
  currentPlywoodCost = _cost;

  const rows = document.querySelectorAll("#inputTable tbody tr");

  let sumSqft = 0;
  let sumLabor = 0;
  let sumExtras = 0;
  let sumTotal = 0;

  rows.forEach(row => {
    const L = parseFloat(row.querySelector(".length")?.value) || 0;
    const W = parseFloat(row.querySelector(".width")?.value)  || 0;
    const sinkType = row.querySelector(".sink")?.value || "";
    const ptype = row.querySelector(".ptype")?.value || "Countertop";
    const refabLF = parseFloat(row.querySelector(".refab")?.value) || 0;

    const sqft = Math.ceil((L * W) / 144);

    let sinkCost = 0;
    if (sinkType === "kitchen_sink") sinkCost = 180;
    else if (sinkType === "bathroom_sink") sinkCost = 80;
    else if (sinkType === "bar_sink") sinkCost = 80;

    const labor = sqft * LABOR_RATE;
    let extras = sinkCost + refabLF * REFAB_RATE;

    if (ptype === "Island" && L >= ISLAND_SURCHARGE_L && W >= ISLAND_SURCHARGE_W) {
      extras += ISLAND_SURCHARGE_COST;
    }

    const total = labor + extras;

    row.querySelector(".sqft").innerText   = sqft.toFixed(2);
    row.querySelector(".labor").innerText  = labor.toFixed(2);
    row.querySelector(".extras").innerText = extras.toFixed(2);
    row.querySelector(".total").innerText  = total.toFixed(2);

    sumSqft  += sqft;
    sumLabor += labor;
    sumExtras += extras;
    sumTotal += total;
  });

  const addons = getSinkAddonsSplit();
  const oversizeFee = Number(document.getElementById('oversizeFeeInput')?.value || 0) || 0;

  const tableSqftEl   = document.getElementById("totalSqft");
  const tableLaborEl  = document.getElementById("totalLabor");
  const tableExtrasEl = document.getElementById("totalExtras");
  const tableCostEl   = document.getElementById("totalCost");
  if (tableSqftEl)   tableSqftEl.innerText   = sumSqft.toFixed(2);
  if (tableLaborEl)  tableLaborEl.innerText  = sumLabor.toFixed(2);
  if (tableExtrasEl) tableExtrasEl.innerText = sumExtras.toFixed(2);
  if (tableCostEl)   tableCostEl.innerText   = (sumTotal + addons.total + currentPlywoodCost + oversizeFee).toFixed(2);

  let kitchenInstallRows = 0, bathInstallRows = 0, fabricationCost = 0;
  const rowsAgain = document.querySelectorAll("#inputTable tbody tr");
  rowsAgain.forEach(row => {
    const sinkType = row.querySelector(".sink")?.value || "";
    if (sinkType === "kitchen_sink") kitchenInstallRows += 180;
    else if (sinkType === "bathroom_sink") bathInstallRows += 80;
    else if (sinkType === "bar_sink") kitchenInstallRows += 80;
    fabricationCost += (parseFloat(row.querySelector(".refab")?.value) || 0) * REFAB_RATE;
  });

  document.getElementById("kitchenSinkInstall").textContent = `$${(kitchenInstallRows + addons.kitchen).toFixed(2)}`;
  document.getElementById("bathSinkInstall").textContent    = `$${(bathInstallRows + addons.bathroom).toFixed(2)}`;
  document.getElementById("installationCost").textContent   = `$${sumLabor.toFixed(2)}`;
  document.getElementById("fabricationCost").textContent    = `$${fabricationCost.toFixed(2)}`;
  document.getElementById("plywoodCost").textContent        = `$${currentPlywoodCost.toFixed(2)}`;
  document.getElementById("grandTotal").textContent         = `$${(sumTotal + addons.total + currentPlywoodCost + oversizeFee).toFixed(2)}`;
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
    const a = toInches(match[2]); // first number = Length
    const b = toInches(match[3]); // second number = Width
    const length = a;             // KEEP ORDER (do not rotate)
    const width  = b;
    results.push({ label, length, width });
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

/* ===================== PREFAB packing helpers ===================== */

const WIDTH_BUCKET_STEP = 0.125; // 1/8" width tolerance

function bucketWidthKey(w) {
  const k = Math.round(w / WIDTH_BUCKET_STEP) * WIDTH_BUCKET_STEP;
  return k.toFixed(3);
}
function asSL_SW(size) {
  const SL = Math.max(size[0], size[1]), SW = Math.min(size[0], size[1]);
  return [SL, SW];
}

// === Shared pool for Countertop & Island ===
function poolKeyForPack(mat, typ) {
  if (typ === "Countertop" || typ === "Island") return `${mat}|CT_ISL`;
  if (typ === "FullBacksplash") return `${mat}|FullBacksplash`;
  return `${mat}|${typ}`;
}

// Candidates for each type (and shared pools)
function getCandidatesFor(material, type) {
  if (type === "FullBacksplash") {
    // Can be cut from Countertop, Island, or Bartop
    return []
      .concat(PREFAB[material]?.Countertop || [],
              PREFAB[material]?.Island     || [],
              PREFAB[material]?.Bartop     || []);
  }
  if (type === "Countertop" || type === "Island" || type === "CT_ISL") {
    // Shared pool of Countertop + Island
    return []
      .concat(PREFAB[material]?.Countertop || [],
              PREFAB[material]?.Island     || []);
  }
  return (PREFAB[material] && PREFAB[material][type])
    ? PREFAB[material][type].slice()
    : [];
}

/* ---------- shrink bins (variable width aware) ---------- */
function shrinkBinsVarWidth(bins, candidates) {
  const cands = candidates.map(asSL_SW);
  bins.forEach(b => {
    if (b.nofit || !b.cuts?.length) return;
    const usedL = b.cuts.reduce((a,c)=>a + c.cutL, 0);
    const needW = b.cuts.reduce((m,c)=>Math.max(m, c.cutW), 0);
    const best = cands
      .filter(([SL,SW]) => SL + 1e-6 >= usedL && SW + 1e-6 >= needW)
      .sort((a,b)=> a[0]-b[0])[0];
    if (best) {
      b.SL = best[0];
      b.SW = best[1];
      b.remaining = b.SL - usedL;
    } else {
      // fallback: keep current SL/SW and sync remaining
      b.remaining = Math.max(0, (b.SL||0) - usedL);
    }
  });
  return bins;
}

/* ---------- fewest slabs first for variable widths ---------- */
function packFewestSlabsVarWidth(parts, candidates) {
  const EPS = 1e-6;
  const sizes = candidates.map(asSL_SW);

  // index candidates by SW threshold for quick lookups
  function maxSLFor(minW) {
    let mx = -Infinity, swFor = null;
    sizes.forEach(([SL,SW]) => {
      if (SW + EPS >= minW && SL > mx) { mx = SL; swFor = SW; }
    });
    return mx > -Infinity ? {SL: mx, SW: swFor} : null;
  }

  const bins = [];
  // Cut order: widest first (so islands feed tops), then area, then length — never rotate.
  const list = parts.slice().sort((a, b) => {
    if (b.W !== a.W) return b.W - a.W;          // 1) width desc (e.g., 39″ before 26″)
    const aa = a.L * a.W, bb = b.L * b.W;
    if (bb !== aa) return bb - aa;              // 2) area desc
    return b.L - a.L;                            // 3) length desc
  });

  for (const p of list) {
    // try reuse: best-fit by remaining length AND width capacity
    let bestIdx = -1, bestAfter = Infinity;
    for (let i=0;i<bins.length;i++){
      const b = bins[i];
      if (b.nofit) continue;
      if ((b.SW + EPS >= p.W) && (b.remaining + EPS >= p.L)) {
        const after = b.remaining - p.L;
        if (after < bestAfter) { bestAfter = after; bestIdx = i; }
      }
    }
    if (bestIdx >= 0) {
      bins[bestIdx].cuts.push({ part: p, cutL: p.L, cutW: p.W });
      bins[bestIdx].remaining -= p.L;
      continue;
    }

    // open new slab using the largest length that can satisfy required width
    const open = maxSLFor(p.W);
    if (!open) {
      // no prefab can satisfy width requirement → nofit
      bins.push({
        SL: p.L, SW: p.W, remaining: 0, nofit: true,
        cuts: [{ part: p, cutL: p.L, cutW: p.W, nofit: true }]
      });
      continue;
    }
    bins.push({
      SL: open.SL, SW: open.SW,
      remaining: open.SL - p.L,
      cuts: [{ part: p, cutL: p.L, cutW: p.W }]
    });
  }

  return shrinkBinsVarWidth(bins, candidates);
}

/* ---------- fixed-width planner (for non-CT/ISL) ---------- */
function shrinkBins(bins, candidates, width) {
  const candsAsc = candidates
    .map(asSL_SW)
    .filter(([SL,SW]) => SW + 1e-6 >= width)
    .sort((a,b) => a[0] - b[0]); // smallest first

  bins.forEach(b => {
    if (!b.SL || !b.cuts || b.nofit) return;
    const used = b.cuts.reduce((acc, c) => acc + c.cutL, 0);
    const best = candsAsc.find(([SL]) => SL + 1e-6 >= used);
    if (best && best[0] < b.SL) {
      b.SL = best[0];
      b.SW = best[1];
      b.remaining = b.SL - used;
    } else {
      b.remaining = b.SL - used;
    }
  });
  return bins;
}
function packFewestSlabsFirstFFD(partsW, candidates, width) {
  const EPS = 1e-6;
  const sizes = candidates.map(asSL_SW).filter(([SL,SW]) => SW + EPS >= width);
  if (!sizes.length) {
    return partsW.map(p => ({
      SL: p.L, SW: width, remaining: 0, nofit: true,
      cuts: [{ part: p, cutL: p.L, cutW: width, nofit: true }]
    }));
  }
  const maxSL = Math.max(...sizes.map(([SL]) => SL));
  const minSW = Math.min(...sizes.map(([SL,SW]) => SW));

  const parts = partsW.slice().sort((a,b)=> b.L - a.L);
  const bins = [];
  for (const p of parts) {
    if (p.L - EPS > maxSL) {
      bins.push({
        SL: p.L, SW: width, remaining: 0, nofit: true,
        cuts: [{ part: p, cutL: p.L, cutW: width, nofit: true }]
      });
      continue;
    }
    let bestIdx = -1, bestAfter = Infinity;
    for (let i=0;i<bins.length;i++){
      const b = bins[i];
      if (b.nofit) continue;
      if (b.remaining + EPS >= p.L) {
        const after = b.remaining - p.L;
        if (after < bestAfter) { bestAfter = after; bestIdx = i; }
      }
    }
    if (bestIdx >= 0) {
      bins[bestIdx].cuts.push({ part: p, cutL: p.L, cutW: width });
      bins[bestIdx].remaining -= p.L;
    } else {
      bins.push({
        SL: maxSL, SW: minSW,
        remaining: maxSL - p.L,
        cuts: [{ part: p, cutL: p.L, cutW: width }]
      });
    }
  }
  return shrinkBins(bins, candidates, width);
}

/* ===================== Suggest Prefab Pieces ===================== */
function suggestPieces() {
  const suggestBody = document.getElementById("suggestBody");
  suggestBody.innerHTML = "";

  // Collect parts from table (respect typed L × W — no rotation)
  const rows = Array.from(document.querySelectorAll("#inputTable tbody tr"));
  const parts = [];
  rows.forEach((row, i) => {
    const L = parseFloat(row.querySelector(".length")?.value) || 0;
    const W = parseFloat(row.querySelector(".width")?.value) || 0;
    const mat = row.querySelector(".material")?.value || "Quartz";
    theTyp = row.querySelector(".ptype")?.value || "Countertop";
    const typ = theTyp;
    const group = (row.querySelector(".group")?.value || "").trim();
    if (L > 0 && W > 0) parts.push({ idx: i+1, group, L, W, mat, typ, area: L*W });
  });
  if (!parts.length) return;

  // Build pools:
  // - CT/ISL: single combined array (variable width planning)
  // - Others: Map(widthKey -> array) as before
  const pools = new Map(); // poolKey -> array OR Map
  parts.forEach(p => {
    const key = poolKeyForPack(p.mat, p.typ);
    if (key.endsWith("CT_ISL")) {
      if (!pools.has(key)) pools.set(key, []);
      pools.get(key).push(p);
    } else {
      if (!pools.has(key)) pools.set(key, new Map());
      const wkey = bucketWidthKey(p.W);
      const byW = pools.get(key);
      if (!byW.has(wkey)) byW.set(wkey, []);
      byW.get(wkey).push(p);
    }
  });

  // Roll-up accumulators
  const pieceCounts = {};  // { Material: { 'SL×SW': count } }
  const leftoverPieces = [];

  const addCount = (mat, SL, SW) => {
    const k = `${SL.toFixed(0)}×${SW.toFixed(0)}`;
    pieceCounts[mat] = pieceCounts[mat] || {};
    pieceCounts[mat][k] = (pieceCounts[mat][k] || 0) + 1;
  };
  const addSuggestRow = (idx, group, typ, cut, source, prefab, left) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${idx}</td><td>${group}</td><td>${typ}</td><td>${cut}</td><td>${source}</td><td>${prefab}</td><td>${left}</td>`;
    suggestBody.appendChild(tr);
  };

  // Plan per pool
  pools.forEach((bucket, pkey) => {
    const [mat, typKey] = pkey.split("|");

    // CT/ISL combined variable-width path
    if (typKey === "CT_ISL") {
      const candidates = getCandidatesFor(mat, "CT_ISL");
      const bins = packFewestSlabsVarWidth(bucket, candidates);

      const placements = new Map();
      bins.forEach((b, bi) => {
        if (!b.nofit && b.SL && b.SW) addCount(mat, b.SL, b.SW);

        const rem = Math.max(0, b.remaining || 0);
        if (rem > 1) leftoverPieces.push(`${rem.toFixed(0)} × ${b.SW.toFixed(0)} (Piece #${bi+1})`);

        let running = b.SL ?? 0;
        (b.cuts || []).forEach(c => {
          running -= c.cutL;
          const cutStr = `${c.cutL.toFixed(2)}×${c.cutW.toFixed(2)}`;
          const prefabStr = (b.SL && b.SW) ? `${b.SL.toFixed(2)}×${b.SW.toFixed(2)} (Piece #${bi+1})` : "-";
          const leftStr = b.SL
            ? `${Math.max(0, running).toFixed(2)}×${b.SW.toFixed(2)} (Piece #${bi+1})`
            : "-";
          const arr = placements.get(c.part.idx) || [];
          arr.push({ group: c.part.group || "", typ: c.part.typ, cutStr, prefabStr, leftStr, nofit: c.nofit });
          placements.set(c.part.idx, arr);
        });
      });

      bucket.slice().sort((a,b)=>a.idx-b.idx).forEach(p => {
        const arr = placements.get(p.idx);
        if (!arr || !arr.length) {
          addSuggestRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "No fit", "-", "-");
        } else {
          arr.forEach((pl, j) => {
            const source = pl.nofit ? "No fit" : (j === 0 ? "Prefab" : "Leftover");
            addSuggestRow(p.idx, p.group, p.typ, pl.cutStr, source, pl.prefabStr, pl.leftStr);
          });
        }
      });

      return; // done with CT/ISL pool
    }

    // ---------- original fixed-width path for other types ----------
    bucket.forEach((partsW) => {
      const width = partsW[0].W;
      const { mat: _m, typ } = partsW[0];
      const candidates = getCandidatesFor(_m, typ);
      if (!candidates || !candidates.length) {
        partsW.forEach(p => addSuggestRow(p.idx, p.group, p.typ,
          `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "No fit", "-", "-"));
        return;
      }
      const bins = packFewestSlabsFirstFFD(partsW, candidates, width);

      const placements = new Map();
      bins.forEach((b, bi) => {
        if (!b.nofit && b.SL && b.SW) addCount(_m, b.SL, b.SW);

        const rem = Math.max(0, b.remaining || 0);
        if (rem > 1) leftoverPieces.push(`${rem.toFixed(0)} × ${width.toFixed(0)} (Piece #${bi+1})`);

        let running = b.SL ?? 0;
        (b.cuts || []).forEach(c => {
          running -= c.cutL;
          const cutStr = `${c.cutL.toFixed(2)}×${width.toFixed(2)}`;
          const prefabStr = (b.SL && b.SW) ? `${b.SL.toFixed(2)}×${b.SW.toFixed(2)} (Piece #${bi+1})` : "-";
          const leftStr = b.SL
            ? `${Math.max(0, running).toFixed(2)}×${width.toFixed(2)} (Piece #${bi+1})`
            : "-";
          const arr = placements.get(c.part.idx) || [];
          arr.push({ group: c.part.group, typ: c.part.typ, cutStr, prefabStr, leftStr, nofit: c.nofit });
          placements.set(c.part.idx, arr);
        });
      });

      partsW.slice().sort((a,b)=>a.idx-b.idx).forEach(p => {
        const arr = placements.get(p.idx);
        if (!arr || !arr.length) {
          addSuggestRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "No fit", "-", "-");
        } else {
          arr.forEach((pl, j) => {
            const source = pl.nofit ? "No fit" : (j === 0 ? "Prefab" : "Leftover");
            addSuggestRow(p.idx, p.group, p.typ, pl.cutStr, source, pl.prefabStr, pl.leftStr);
          });
        }
      });
    });
  });

  // ===== Roll-up =====
  const summaryEl = document.getElementById('prefabSummary');
  if (summaryEl) {
    const rowsHtml = Object.keys(pieceCounts).length
      ? Object.entries(pieceCounts)
          .map(([mat, sizes]) =>
            Object.entries(sizes)
              .sort((a,b)=> a[0].localeCompare(b[0]))
              .map(([sz, cnt]) => `<tr><td>${mat}</td><td>${sz}</td><td>${cnt}</td></tr>`)
              .join("")
          ).join("")
      : `<tr><td colspan="3" class="muted">No new prefab pieces required (all parts fit into leftovers).</td></tr>`;

    const leftoversHtml = leftoverPieces.length
      ? `<ul style="margin:6px 0; padding-left:18px;">${leftoverPieces.map(sz => `<li>${sz}</li>`).join("")}</ul>`
      : `<span class="muted">No leftover pieces</span>`;

    summaryEl.innerHTML = `
      <h3>Prefab roll-up</h3>
      <div class="muted">Counts of pieces used (by prefab size), and leftover piece sizes from the plan.</div>
      <table aria-label="Pieces needed by size">
        <thead><tr><th>Material</th><th>Prefab size (in)</th><th>Count</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div style="margin-top:8px;">
        <strong>Leftover pieces:</strong>
        ${leftoversHtml}
      </div>
    `;
  }
}

/* ===================== Pure plywood planner (no DOM writes) ===================== */
function computePlywoodPlan() {
  const rows = Array.from(document.querySelectorAll("#inputTable tbody tr"));
  const pieces = [];

  rows.forEach(row => {
    const type = (row.querySelector(".ptype")?.value || "").trim();
    if (!["Countertop","Island","Bartop"].includes(type)) return; // exclude backsplash
    const rawL = parseFloat(row.querySelector(".length")?.value) || 0;
    const rawW = parseFloat(row.querySelector(".width")?.value)  || 0;

    let adjL = rawL - PLY_OFFSET_LENGTH;
    let adjW = rawW - PLY_OFFSET_WIDTH;
    if (!(adjL > 0 && adjW > 0)) return;

    const L = Math.max(adjL, adjW);
    const W = Math.min(adjL, adjW);
    pieces.push({ L, W, area: L*W });
  });

  if (pieces.length === 0) {
    return { sheets: [], cost: 0 };
  }

  pieces.sort((a,b)=> b.area - a.area);

  const sheets = []; // [{leftovers:[{L,W}], cuts:[{L,W}]}]
  const newSheet = () => ({ leftovers: [{L: PLY_SHEET.L, W: PLY_SHEET.W}], cuts: [] });

  pieces.forEach(p => {
    let placed = false;
    for (const sh of sheets) {
      for (let i=0; i<sh.leftovers.length; i++) {
        const r = sh.leftovers[i];
        const fit1 = (p.L <= r.L && p.W <= r.W);
        const fit2 = (p.L <= r.W && p.W <= r.L);
        if (!fit1 && !fit2) continue;

        const rectL = fit1 ? r.L : r.W;
        const rectW = fit1 ? r.W : r.L;

        const rem1 = { L: rectL - p.L, W: p.W };
        const rem2 = { L: rectL,       W: rectW - p.W };

        sh.leftovers.splice(i,1);
        [rem1, rem2].forEach(x => { if (x.L > 1 && x.W > 1) sh.leftovers.push(x); });
        sh.cuts.push({ L: p.L, W: p.W });
        placed = true;
        break;
      }
      if (placed) break;
    }

    if (!placed) {
      const sh = newSheet();
      const r = sh.leftovers[0];
      const rectL = r.L, rectW = r.W;
      const rem1 = { L: rectL - p.L, W: p.W };
      const rem2 = { L: rectL,       W: rectW - p.W };
      sh.leftovers = [];
      [rem1, rem2].forEach(x => { if (x.L > 1 && x.W > 1) sh.leftovers.push(x); });
      sh.cuts.push({ L: p.L, W: p.W });
      sheets.push(sh);
    }
  });

  return { sheets, cost: (sheets.length || 0) * PLY_SHEET.COST };
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
