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

  // Wire qty inputs to recalc (and clamp)
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

  // Manual oversize fee → recalc
  const feeInput = document.getElementById('oversizeFeeInput');
  if (feeInput) feeInput.addEventListener('input', () => calculate());

  // Delegate: any change in the table triggers recalc
  const tbody = document.getElementById('tableBody');
  tbody.addEventListener('input', (e) => {
    if (e.target.matches('.length,.width,.refab,.material,.ptype,.group,.sink')) {
      calculate();
    }
  });
  tbody.addEventListener('change', (e) => {
    if (e.target.matches('.material,.ptype,.sink')) {
      calculate();
    }
  });

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
  // Keep plywood in sync with the current form even if user didn't click its button
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

    // sqft rounds up per-piece
    const sqft = Math.ceil((L * W) / 144);

    let sinkCost = 0;
    if (sinkType === "kitchen_sink") sinkCost = 180;
    else if (sinkType === "bathroom_sink") sinkCost = 80;
    else if (sinkType === "bar_sink") sinkCost = 80;

    const labor = sqft * LABOR_RATE;
    let extras = sinkCost + refabLF * REFAB_RATE;

    // island surcharge
    if (ptype === "Island" && L >= ISLAND_SURCHARGE_L && W >= ISLAND_SURCHARGE_W) {
      extras += ISLAND_SURCHARGE_COST;
    }

    const total = labor + extras;

    // render row
    row.querySelector(".sqft").innerText   = sqft.toFixed(2);
    row.querySelector(".labor").innerText  = labor.toFixed(2);
    row.querySelector(".extras").innerText = extras.toFixed(2);
    row.querySelector(".total").innerText  = total.toFixed(2);

    // accum
    sumSqft  += sqft;
    sumLabor += labor;
    sumExtras += extras;
    sumTotal += total;
  });

  // sink add-ons split
  const addons = getSinkAddonsSplit();
  const kitchenAddons = addons.kitchen;
  const bathAddons = addons.bathroom;

  // manual oversize fee
  const oversizeFee = Number(document.getElementById('oversizeFeeInput')?.value || 0) || 0;

  // table footer
  const tableSqftEl   = document.getElementById("totalSqft");
  const tableLaborEl  = document.getElementById("totalLabor");
  const tableExtrasEl = document.getElementById("totalExtras");
  const tableCostEl   = document.getElementById("totalCost");
  if (tableSqftEl)   tableSqftEl.innerText   = sumSqft.toFixed(2);
  if (tableLaborEl)  tableLaborEl.innerText  = sumLabor.toFixed(2);
  if (tableExtrasEl) tableExtrasEl.innerText = sumExtras.toFixed(2);
  if (tableCostEl)   tableCostEl.innerText   = (sumTotal + addons.total + currentPlywoodCost + oversizeFee).toFixed(2);

  // totals block (per-row sink install subtotals + fabrication)
  let kitchenInstallRows = 0, bathInstallRows = 0, fabricationCost = 0;
  rows.forEach(row => {
    const sinkType = row.querySelector(".sink")?.value || "";
    if (sinkType === "kitchen_sink") kitchenInstallRows += 180;
    else if (sinkType === "bathroom_sink") bathInstallRows += 80;
    else if (sinkType === "bar_sink") kitchenInstallRows += 80; // default to kitchen
    fabricationCost += (parseFloat(row.querySelector(".refab")?.value) || 0) * REFAB_RATE;
  });

  const kEl = document.getElementById("kitchenSinkInstall");
  const bEl = document.getElementById("bathSinkInstall");
  const instEl = document.getElementById("installationCost");
  const fabEl = document.getElementById("fabricationCost");
  const plyEl = document.getElementById("plywoodCost");
  const grandEl = document.getElementById("grandTotal");

  if (kEl)    kEl.textContent    = `$${(kitchenInstallRows + kitchenAddons).toFixed(2)}`;
  if (bEl)    bEl.textContent    = `$${(bathInstallRows + bathAddons).toFixed(2)}`;
  if (instEl) instEl.textContent = `$${sumLabor.toFixed(2)}`;
  if (fabEl)  fabEl.textContent  = `$${fabricationCost.toFixed(2)}`;
  if (plyEl)  plyEl.textContent  = `$${currentPlywoodCost.toFixed(2)}`;

  const grand = sumTotal + kitchenAddons + bathAddons + currentPlywoodCost + oversizeFee;
  if (grandEl) grandEl.textContent = `$${grand.toFixed(2)}`;
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

/* ===================== Unified PREFAB packing helpers ===================== */
// Global priorities (ALL stones/types):
// 1) minimize slab count, 2) minimize total material (smallest SL that fits),
// 3) minimize waste; reuse leftovers first.
// FullBacksplash is sourced ONLY from Countertop/Island/Bartop catalogs.

const WIDTH_BUCKET_STEP = 0.125; // 1/8" width tolerance

function bucketWidthKey(w) {
  const k = Math.round(w / WIDTH_BUCKET_STEP) * WIDTH_BUCKET_STEP;
  return k.toFixed(3);
}
function asSL_SW(size) {
  const SL = Math.max(size[0], size[1]), SW = Math.min(size[0], size[1]);
  return [SL, SW];
}
function poolKeyForPack(mat, typ) {
  return (typ === "FullBacksplash") ? `${mat}|FullBacksplash` : `${mat}|${typ}`;
}
function getCandidatesFor(material, type) {
  if (type === "FullBacksplash") {
    // Only from larger stock
    return []
      .concat(PREFAB[material]?.Countertop || [],
              PREFAB[material]?.Island     || [],
              PREFAB[material]?.Bartop     || []);
  }
  return (PREFAB[material] && PREFAB[material][type])
    ? PREFAB[material][type].slice()
    : [];
}

// Best-fit placement into existing open bins (also track rows used)
function placeIntoOpenBins(openBins, part, width) {
  let bestIdx = -1, bestAfter = Infinity;
  for (let i = 0; i < openBins.length; i++) {
    const b = openBins[i];
    if (b.SW + 1e-6 >= width && b.remaining + 1e-6 >= part.L) {
      const after = b.remaining - part.L;
      if (after < bestAfter) { bestAfter = after; bestIdx = i; }
    }
  }
  if (bestIdx >= 0) {
    const bin = openBins[bestIdx];
    bin.cuts.push({ part, cutL: part.L, cutW: width });
    bin.remaining -= part.L;
    if (!bin.rowIdxs) bin.rowIdxs = new Set();
    bin.rowIdxs.add(part.idx);
    return true;
  }
  return false;
}

// One-slab plan: if total length fits, choose the SMALLEST SL that holds all cuts.
function packSingleSlabIfPossible(partsW, candidates, width) {
  const sumL = partsW.reduce((a,p)=>a+p.L,0);
  const cands = candidates
    .map(asSL_SW)
    .filter(([SL,SW]) => SW + 1e-6 >= width)
    .sort((a,b) => a[0] - b[0]); // SL asc

  const chosen = cands.find(([SL]) => SL + 1e-6 >= sumL);
  if (!chosen) return null;

  const [SL, SW] = chosen;
  const cuts = [];
  let remaining = SL;
  const rowIdxs = new Set();

  partsW.slice().sort((a,b)=>b.L-a.L).forEach(p => {
    cuts.push({ part: p, cutL: p.L, cutW: width });
    remaining -= p.L;
    rowIdxs.add(p.idx);
  });

  return [{ SL, SW, remaining, cuts, rowIdxs }];
}

// Multi-size plan: SMALLEST slab that fits when opening; reuse open bins first.
function packMultiSizeFFD(partsW, candidates, width) {
  const parts = partsW.slice().sort((a,b)=> b.L - a.L); // longest first
  const candsAsc = candidates
    .map(asSL_SW)
    .filter(([SL,SW]) => SW + 1e-6 >= width)
    .sort((a,b) => a[0] - b[0]); // smallest SL first

  const bins = [];
  parts.forEach(p => {
    // 1) Try existing open bins (best-fit by remaining)
    if (placeIntoOpenBins(bins, p, width)) return;

    // 2) Open a new bin with the SMALLEST SL that fits this cut
    const chosen = candsAsc.find(([SL]) => SL + 1e-6 >= p.L);
    if (!chosen) {
      bins.push({ SL: p.L, SW: width, remaining: 0, cuts: [{ part: p, cutL: p.L, cutW: width, nofit: true }], rowIdxs: new Set([p.idx]) });
      return;
    }
    const [SL, SW] = chosen;
    bins.push({
      SL, SW,
      remaining: SL - p.L,
      cuts: [{ part: p, cutL: p.L, cutW: width }],
      rowIdxs: new Set([p.idx])
    });
  });

  return bins;
}

// Shrink each bin to the SMALLEST catalog length that still holds its cuts
function shrinkBins(bins, candidates, width) {
  const candsAsc = candidates
    .map(asSL_SW)
    .filter(([SL,SW]) => SW + 1e-6 >= width)
    .sort((a,b) => a[0] - b[0]); // smallest first

  bins.forEach(b => {
    if (!b.SL || !b.cuts) return;
    const used = b.cuts.reduce((acc, c) => acc + c.cutL, 0);
    const best = candsAsc.find(([SL]) => SL + 1e-6 >= used);
    if (best && best[0] < b.SL) {
      b.SL = best[0];
      b.SW = best[1];
      b.remaining = b.SL - used;
    }
    if (!b.rowIdxs) {
      b.rowIdxs = new Set(b.cuts.map(c => c.part.idx));
    }
  });
  return bins;
}

function planForBucket(partsW, candidates, width) {
  // 1) One-slab if total length fits (min material and waste)
  const single = packSingleSlabIfPossible(partsW, candidates, width);
  if (single) return single;

  // 2) Multi-size pack with smallest-slab opening, then shrink to minimal lengths
  const multi = packMultiSizeFFD(partsW, candidates, width);
  return shrinkBins(multi, candidates, width);
}

/* ===================== Suggest Prefab Pieces (unified rules + labeled leftovers) ===================== */
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
    const typ = row.querySelector(".ptype")?.value || "Countertop";
    const group = (row.querySelector(".group")?.value || "").trim();
    if (L > 0 && W > 0) parts.push({ idx: i+1, group, L, W, mat, typ, area: L*W });
  });
  if (!parts.length) return;

  // Group by (material/type pool) and width bucket
  const pools = new Map(); // poolKey -> Map(widthKey -> part[])
  parts.forEach(p => {
    const pkey = poolKeyForPack(p.mat, p.typ);
    if (!pools.has(pkey)) pools.set(pkey, new Map());
    const wkey = bucketWidthKey(p.W);
    const byW = pools.get(pkey);
    if (!byW.has(wkey)) byW.set(wkey, []);
    byW.get(wkey).push(p);
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

  // Plan per pool & width bucket
  pools.forEach((byWidth) => {
    byWidth.forEach((partsW) => {
      const width = partsW[0].W;
      const { mat, typ } = partsW[0];

      const candidates = getCandidatesFor(mat, typ);
      if (!candidates || !candidates.length) {
        partsW.forEach(p => addSuggestRow(p.idx, p.group, p.typ,
          `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "No fit", "-", "—"));
        return;
      }

      const bins = planForBucket(partsW, candidates, width);

      // Build placement lookup and roll-up (labeled, final-only leftovers + rows)
      const placements = new Map(); // part.idx -> [{...}]
      bins.forEach((b, bi) => {
        if (!b.nofit && b.SL && b.SW) addCount(mat, b.SL, b.SW);

        let running = b.SL ?? 0;
        const rowsUsed = b.rowIdxs ? Array.from(b.rowIdxs).sort((x,y)=>x-y).join(", ") : "";
        (b.cuts || []).forEach((c, ci) => {
          running -= c.cutL;

          const isLast   = ci === (b.cuts.length - 1);
          const pieceTag = rowsUsed ? `(Piece #${bi+1}; Rows ${rowsUsed})` : `(Piece #${bi+1})`;
          const cutStr   = `${c.cutL.toFixed(2)}×${width.toFixed(2)}`;
          const prefabStr = (b.SL && b.SW) ? `${b.SL.toFixed(2)}×${b.SW.toFixed(2)} ${pieceTag}` : "-";

          // Only show leftover on the FINAL cut that used this slab,
          // and label it with (Piece #N; Rows ...)
          let leftStr = "—";
          const remVal = Math.max(0, running);
          if (b.SL && isLast && remVal > 0) {
            leftStr = `${remVal.toFixed(2)}×${width.toFixed(2)} ${pieceTag}`;
            leftoverPieces.push(`${remVal.toFixed(0)} × ${width.toFixed(0)} ${pieceTag}`);
          }

          const arr = placements.get(c.part.idx) || [];
          arr.push({ group: c.part.group, typ: c.part.typ, cutStr, prefabStr, leftStr, nofit: c.nofit });
          placements.set(c.part.idx, arr);
        });
      });

      // Render in original row order
      partsW.slice().sort((a,b)=>a.idx-b.idx).forEach(p => {
        const arr = placements.get(p.idx);
        if (!arr || !arr.length) {
          addSuggestRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "No fit", "-", "—");
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
// Returns { sheets, cost }
function computePlywoodPlan() {
  const rows = Array.from(document.querySelectorAll("#inputTable tbody tr"));
  const pieces = [];

  rows.forEach(row => {
    const type = (row.querySelector(".ptype")?.value || "").trim();
    if (!["Countertop","Island","Bartop"].includes(type)) return; // exclude backsplash & full backsplash
    const rawL = parseFloat(row.querySelector(".length")?.value) || 0;
    const rawW = parseFloat(row.querySelector(".width")?.value)  || 0;

    // apply offsets
    let adjL = rawL - PLY_OFFSET_LENGTH;
    let adjW = rawW - PLY_OFFSET_WIDTH;
    if (!(adjL > 0 && adjW > 0)) return;

    const L = Math.max(adjL, adjW);
    const W = Math.min(adjL, adjW);
    pieces.push({ L, W, area: L*W });
  });

  // nothing to cut
  if (pieces.length === 0) {
    return { sheets: [], cost: 0 };
  }

  // sort largest-first
  pieces.sort((a,b)=> b.area - a.area);

  // pack
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

      // place on fresh sheet
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

/* ===================== Buttons (hooked in HTML) ===================== */
function calculateTotalsButtonSafe() { calculate(); }
function suggestPiecesButtonSafe() { suggestPieces(); }
function suggestPlywoodButtonSafe() { suggestPlywood(); }
