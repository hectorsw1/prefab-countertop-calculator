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
const PLY_SHEET = { L: 96, W: 48, COST: 70 };

// Plywood offsets (for underlayment sizing)
const PLY_OFFSET_LENGTH = 3;  // subtract from length
const PLY_OFFSET_WIDTH  = 2;  // subtract from width

// --- LIVE plywood state so totals can read it ---
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

  // manual oversize fee → recalc
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

  // totals block
  // per-row sink install subtotals + fabrication
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
    const length = Math.max(a, b);
    const width  = Math.min(a, b);
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

/* ===================== Suggest Prefab Pieces ===================== */
function suggestPieces() {
  const suggestBody = document.getElementById("suggestBody");
  suggestBody.innerHTML = "";
  const rows = Array.from(document.querySelectorAll("#inputTable tbody tr"));

  // Build parts
  const parts = [];
  rows.forEach((row, i) => {
    const L = parseFloat(row.querySelector(".length")?.value) || 0;
    const W = parseFloat(row.querySelector(".width")?.value) || 0;
    const mat = row.querySelector(".material")?.value || "Quartz";
    const typ = row.querySelector(".ptype")?.value || "Countertop";
    const group = (row.querySelector(".group")?.value || "").trim();
    if (L > 0 && W > 0) parts.push({ idx: i+1, group, L: Math.max(L,W), W: Math.min(L,W), mat, typ, area: L*W });
  });

  // Sort largest-first
  parts.sort((a,b)=> b.area - a.area);

  // Pools & locks
  const leftovers = {};    // poolKey -> [{L,W}]
  const groupPrefab = {};  // non-Quartz: lock same prefab per group
  const pieceCounts = {};  // { Material: { "L×W": count } }
  const addCount = (mat, SL, SW) => {
    const key = `${SL.toFixed(0)}×${SW.toFixed(0)}`;
    pieceCounts[mat] = pieceCounts[mat] || {};
    pieceCounts[mat][key] = (pieceCounts[mat][key] || 0) + 1;
  };

  function poolKeyFor(material, type) {
    if (material === "Quartz") return `${material}|ALL`;
    return type === "FullBacksplash" ? `${material}|FullBacksplash` : `${material}|${type}`;
  }
  const concatAll = (...arrs) => arrs.reduce((acc, a) => (a ? acc.concat(a) : acc), []);
  const QUARTZ_UNION_ALL = concatAll(
    PREFAB.Quartz.Countertop, PREFAB.Quartz.Island,
    PREFAB.Quartz.Bartop, PREFAB.Quartz.Backsplash
  );

  parts.forEach(p => {
    const poolKey = poolKeyFor(p.mat, p.typ);
    leftovers[poolKey] = leftovers[poolKey] || [];

    // 1) fit from leftovers
    let placed = false;
    for (let i = 0; i < leftovers[poolKey].length && !placed; i++) {
      const slab = leftovers[poolKey][i];
      const fit1 = (p.L <= slab.L && p.W <= slab.W);
      const fit2 = (p.L <= slab.W && p.W <= slab.L);
      if (fit1 || fit2) {
        const rectL = fit1 ? slab.L : slab.W;
        const rectW = fit1 ? slab.W : slab.L;
        const rem1 = { L: rectL - p.L, W: p.W };
        const rem2 = { L: rectL,       W: rectW - p.W };
        leftovers[poolKey].splice(i,1);
        [rem1, rem2].forEach(r => { if (r.L > 1 && r.W > 1) leftovers[poolKey].push(r); });
        addSuggestRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "Leftover",
                      "—", `${rem1.L.toFixed(2)}×${rem1.W.toFixed(2)}, ${rem2.L.toFixed(2)}×${rem2.W.toFixed(2)}`);
        placed = true;
      }
    }
    if (placed) return;

    // 2) candidates per rules
    let candidates = null;
    if (p.mat === "Quartz") {
      candidates = QUARTZ_UNION_ALL.slice();
      if (p.typ === "FullBacksplash") {
        // exclude 4×108 strips
        candidates = candidates.filter(s => {
          const SL = Math.max(s[0], s[1]), SW = Math.min(s[0], s[1]);
          return !(SL === 108 && SW === 4);
        });
      }
    } else {
      if (p.typ === "FullBacksplash") {
        candidates = concatAll(
          PREFAB[p.mat].Countertop,
          PREFAB[p.mat].Island,
          PREFAB[p.mat].Bartop
        );
      } else {
        candidates = PREFAB[p.mat] && PREFAB[p.mat][p.typ] ? PREFAB[p.mat][p.typ] : null;
      }
    }
    if (!candidates || candidates.length === 0) {
      addSuggestRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "No fit", "-", "-");
      return;
    }

    // 3) same-size-per-group lock (non-Quartz)
    let allowed = candidates;
    const lockable = (p.mat !== "Quartz") && p.group;
    if (lockable && groupPrefab[p.group]) {
      const gp = groupPrefab[p.group];
      allowed = candidates.filter(s => {
        const SL = Math.max(s[0], s[1]), SW = Math.min(s[0], s[1]);
        return (SL === gp[0] && SW === gp[1]);
      });
      if (allowed.length === 0) allowed = candidates;
    }

    // 4) choose best fit (min waste)
    let best = null, bestWaste = Infinity, bestRect = null;
    allowed.forEach(s => {
      const SL = Math.max(s[0], s[1]), SW = Math.min(s[0], s[1]);
      const fitsNormal = (p.L <= SL && p.W <= SW);
      const fitsRot    = (p.L <= SW && p.W <= SL);
      if (!fitsNormal && !fitsRot) return;
      const rectL = fitsNormal ? SL : SW;
      const rectW = fitsNormal ? SW : SL;
      const waste = rectL*rectW - p.L*p.W;
      if (waste < bestWaste) { bestWaste = waste; best = [SL,SW]; bestRect = {L: rectL, W: rectW}; }
    });
    if (!best) {
      addSuggestRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "No fit", "-", "-");
      return;
    }

    // lock size for non-Quartz
    if (lockable && !groupPrefab[p.group]) groupPrefab[p.group] = best.slice();

    // consume prefab
    const rem1 = { L: bestRect.L - p.L, W: p.W };
    const rem2 = { L: bestRect.L,      W: bestRect.W - p.W };
    [rem1, rem2].forEach(r => { if (r.L > 1 && r.W > 1) leftovers[poolKey].push(r); });

    // count piece
    addCount(p.mat, best[0], best[1]);

    addSuggestRow(
      p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${p.W.toFixed(2)}`,
      "Prefab", `${best[0].toFixed(2)}×${best[1].toFixed(2)}`,
      `${rem1.L.toFixed(2)}×${rem1.W.toFixed(2)}, ${rem2.L.toFixed(2)}×${rem2.W.toFixed(2)}`
    );
  });

  // Roll-up summary: piece counts & total leftover area
  let totalLeftIn2 = 0;
  Object.values(leftovers).forEach(arr => arr.forEach(r => totalLeftIn2 += (r.L * r.W)));
  const totalLeftFt2 = totalLeftIn2 / 144;

  const summaryEl = document.getElementById('prefabSummary');
  if (summaryEl) {
    const rowsHtml = Object.keys(pieceCounts).length
      ? Object.entries(pieceCounts).map(([mat, sizes]) =>
          Object.entries(sizes)
            .sort((a,b)=> a[0].localeCompare(b[0]))
            .map(([sz, cnt]) => `<tr><td>${mat}</td><td>${sz}</td><td>${cnt}</td></tr>`).join("")
        ).join("")
      : `<tr><td colspan="3" class="muted">No new prefab pieces required (all parts fit into leftovers).</td></tr>`;

    summaryEl.innerHTML = `
      <h3>Prefab roll-up</h3>
      <div class="muted">Counts of pieces used (by prefab size), and total leftover area from the plan.</div>
      <table aria-label="Pieces needed by size">
        <thead><tr><th>Material</th><th>Prefab size (in)</th><th>Count</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div style="margin-top:8px;">
        <strong>Total leftover area:</strong>
        ${totalLeftIn2.toFixed(0)} sq&nbsp;in
        <span class="muted">(${totalLeftFt2.toFixed(2)} sq&nbsp;ft)</span>
      </div>
    `;
  }

  function addSuggestRow(idx, group, typ, cut, source, prefab, left) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${idx}</td><td>${group}</td><td>${typ}</td><td>${cut}</td><td>${source}</td><td>${prefab}</td><td>${left}</td>`;
    document.getElementById("suggestBody").appendChild(tr);
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
