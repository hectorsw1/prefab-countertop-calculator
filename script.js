// --- PREFAB CATALOG (inches) ---
const PREFAB = {
  Granite: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]]
  },
  Quartz: {
    Countertop: [[26,96],[26,108],[26,114],[26,120]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]]
  },
  Quartzite: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]]
  },
  Marble: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]]
  }
};

// --- CONSTANTS ---
const LABOR_RATE = 14;            // $/sqft
const REFAB_RATE = 30;            // $/lf
const ISLAND_SURCHARGE_L = 52;    // inches
const ISLAND_SURCHARGE_W = 42;    // inches
const ISLAND_SURCHARGE_COST = 150;
const PLY_SHEET = { L: 96, W: 48, COST: 70 };

// --- NEW: Sink add-ons helper (adds to grand total only; not itemized) ---
function getSinkAddonsTotal() {
  const boxes = document.querySelectorAll('.sink-addon:checked');
  let sum = 0;
  boxes.forEach(b => { sum += Number(b.dataset.price || 0); });
  return sum;
}

// Hook into your total calculator
document.addEventListener('DOMContentLoaded', () => {
  const boxes = document.querySelectorAll('.sink-addon');
  boxes.forEach(b => {
    b.addEventListener('change', () => {
      if (typeof calculate === 'function') calculate(); // call your totals function
    });
  });
});

// --- TABLE SETUP: generate 50 rows initially ---
window.onload = function () {
  ensureRows(50);
};

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

// --- CALCULATION (NO WASTE) ---
function calculate() {
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

    const sqft = (L * W) / 144; // NO waste added
    let sinkCost = 0;
    if (sinkType === "kitchen_sink") sinkCost = 180;
    else if (sinkType === "bathroom_sink") sinkCost = 80;
    else if (sinkType === "bar_sink") sinkCost = 80;

    const labor = sqft * LABOR_RATE;
    let extras = sinkCost + refabLF * REFAB_RATE;

    // Island surcharge if both dimensions exceed thresholds
    if (ptype === "Island" && L >= ISLAND_SURCHARGE_L && W >= ISLAND_SURCHARGE_W) {
      extras += ISLAND_SURCHARGE_COST;
    }

    const total = labor + extras;

    row.querySelector(".sqft").innerText  = sqft.toFixed(2);
    row.querySelector(".labor").innerText = labor.toFixed(2);
    row.querySelector(".extras").innerText = extras.toFixed(2);
    row.querySelector(".total").innerText = total.toFixed(2);

    sumSqft  += sqft;
    sumLabor += labor;
    sumExtras += extras;
    sumTotal += total;
  });

  // --- NEW: add sink add-ons ONLY to final project total (not to per-row extras) ---
  const sinkAddons = getSinkAddonsTotal();

  document.getElementById("totalSqft").innerText   = sumSqft.toFixed(2);
  document.getElementById("totalLabor").innerText  = sumLabor.toFixed(2);
  document.getElementById("totalExtras").innerText = sumExtras.toFixed(2);
  document.getElementById("totalCost").innerText   = (sumTotal + sinkAddons).toFixed(2);
}

// --- OCR (Tesseract.js) ---
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
    previewImg.src = url;
    previewImg.style.display = "block";
    ocrStatus.textContent = "Image loaded. Click 'Run OCR & Auto‑Fill'.";
  });
}

if (runOcrBtn) {
  runOcrBtn.addEventListener("click", async () => {
    if (!uploadedImageURL) {
      ocrStatus.textContent = "Please choose a sketch image first.";
      return;
    }
    ocrStatus.textContent = "Running OCR… this can take a few seconds.";
    try {
      const { data } = await Tesseract.recognize(uploadedImageURL, 'eng', {
        tessedit_char_whitelist: '0123456789xX/." \'',
      });
      const text = data.text || "";
      ocrStatus.innerHTML = "OCR complete. <span class='badge'>Parsing…</span>";
      const parts = parseDimensions(text);
      if (parts.length === 0) {
        ocrStatus.textContent = "No dimensions detected. Try a clearer photo, thicker marker, or add 'x' between numbers (e.g., 96 x 26).";
        return;
      }
      autoFillRows(parts); // fills or adds rows as needed
      ocrStatus.textContent = `Auto‑filled ${parts.length} item(s). Review and click Calculate or Suggest.`;
    } catch (err) {
      console.error(err);
      ocrStatus.textContent = "OCR failed. Try another image or retake with better lighting.";
    }
  });
}

// --- PARSING HELPERS ---
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
  if (s.includes("/")) {
    return fracToDec(s);
  }
  return parseFloat(s);
}
function fracToDec(frac) {
  const [n, d] = frac.split("/").map(Number);
  if (!d || d === 0) return 0;
  return n / d;
}

// Fill existing empty rows; auto‑add new rows if needed
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

// --- SUGGEST PREFAB PIECES (with group rule) ---
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
    if (L > 0 && W > 0) {
      parts.push({ idx: i+1, group, L: Math.max(L,W), W: Math.min(L,W), mat, typ, area: L*W });
    }
  });

  // Sort largest first for packing
  parts.sort((a,b)=> b.area - a.area);

  // Pools and constraints
  const leftovers = {}; // per material+type: rectangles
  const groupPrefab = {}; // enforce uniform prefab per group for non-Quartz
  function key(mt, tp){ return `${mt}|${tp}`; }

  parts.forEach(p => {
    const poolKey = key(p.mat, p.typ);
    leftovers[poolKey] = leftovers[poolKey] || [];

    // 1) Try leftover fit
    let placed = false;
    for (let i = 0; i < leftovers[poolKey].length && !placed; i++) {
      const slab = leftovers[poolKey][i];
      const fit1 = (p.L <= slab.L && p.W <= slab.W);
      const fit2 = (p.L <= slab.W && p.W <= slab.L);
      if (fit1 || fit2) {
        const usedL = p.L, usedW = p.W;
        const rem1 = { L: slab.L - usedL, W: usedW };
        const rem2 = { L: slab.L, W: slab.W - usedW };
        leftovers[poolKey].splice(i,1);
        [rem1, rem2].forEach(r => { if (r.L > 1 && r.W > 1) leftovers[poolKey].push(r); });
        addSuggestRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "Leftover",
                      `—`, `${rem1.L.toFixed(2)}×${rem1.W.toFixed(2)}, ${rem2.L.toFixed(2)}×${rem2.W.toFixed(2)}`);
        placed = true;
      }
    }
    if (placed) return;

    // 2) Choose prefab; obey group constraint for non-Quartz
    const cat = PREFAB[p.mat] && PREFAB[p.mat][p.typ] ? PREFAB[p.mat][p.typ] : null;
    if (!cat) {
      addSuggestRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "No catalog", "-", "-");
      return;
    }

    // Determine allowed prefab sizes (group rule)
    let allowed = cat;
    const isMixLocked = (p.mat !== "Quartz") && p.group; // Granite/Marble/Quartzite with a group tag
    if (isMixLocked && groupPrefab[p.group]) {
      // Filter to only the previously chosen prefab for this group
      const gp = groupPrefab[p.group]; // [L,W] normalized
      allowed = cat.filter(s => {
        const SL = Math.max(s[0], s[1]), SW = Math.min(s[0], s[1]);
        return (SL === gp[0] && SW === gp[1]);
      });
    }

    let best = null, bestWaste = Infinity, bestRect = null;
    allowed.forEach(s => {
      let SL = Math.max(s[0], s[1]), SW = Math.min(s[0], s[1]);
      const fitsNormal = (p.L <= SL && p.W <= SW);
      const fitsRot    = (p.L <= SW && p.W <= SL);
      if (!fitsNormal && !fitsRot) return;
      const rectL = fitsNormal ? SL : SW;
      const rectW = fitsNormal ? SW : SL;
      const waste = rectL*rectW - p.L*p.W;
      if (waste < bestWaste) {
        bestWaste = waste;
        best = [SL,SW];
        bestRect = {L: rectL, W: rectW};
      }
    });

    if (!best) {
      addSuggestRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "No fit", "-", "-");
      return;
    }

    // Lock group to this prefab if needed
    if (isMixLocked && !groupPrefab[p.group]) {
      groupPrefab[p.group] = best.slice();
    }

    // Use chosen prefab, add leftovers
    const usedL = p.L, usedW = p.W;
    const rem1 = { L: bestRect.L - usedL, W: usedW };
    const rem2 = { L: bestRect.L, W: bestRect.W - usedW };
    [rem1, rem2].forEach(r => { if (r.L > 1 && r.W > 1) leftovers[poolKey].push(r); });

    addSuggestRow(p.idx, p.group, p.typ, `${p.L.toFixed(2)}×${p.W.toFixed(2)}`, "Prefab",
                  `${best[0].toFixed(2)}×${best[1].toFixed(2)}`,
                  `${rem1.L.toFixed(2)}×${rem1.W.toFixed(2)}, ${rem2.L.toFixed(2)}×${rem2.W.toFixed(2)}`);
  });

  function addSuggestRow(idx, group, typ, cut, source, prefab, left) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${idx}</td><td>${group}</td><td>${typ}</td><td>${cut}</td><td>${source}</td><td>${prefab}</td><td>${left}</td>`;
    document.getElementById("suggestBody").appendChild(tr);
  }
}

// --- PLYWOOD PACKING (48×96 @ $70) ---
function suggestPlywood() {
  const rows = Array.from(document.querySelectorAll("#inputTable tbody tr"));
  const pieces = [];
  rows.forEach(row => {
    const L = parseFloat(row.querySelector(".length")?.value) || 0;
    const W = parseFloat(row.querySelector(".width")?.value)  || 0;
    if (L > 0 && W > 0) pieces.push({ L: Math.max(L,W), W: Math.min(L,W), area: L*W });
  });

  // Sort largest first
  pieces.sort((a,b)=> b.area - a.area);

  // Sheets
  const sheets = []; // [{leftovers:[{L,W}], cuts:[{L,W}]}]
  function newSheet() { return { leftovers: [{L: PLY_SHEET.L, W: PLY_SHEET.W}], cuts: [] }; }

  pieces.forEach(p => {
    let placed = false;
    // try to fit into existing sheets
    for (const sh of sheets) {
      for (let i=0; i<sh.leftovers.length; i++) {
        const r = sh.leftovers[i];
        const fit1 = (p.L <= r.L && p.W <= r.W);
        const fit2 = (p.L <= r.W && p.W <= r.L);
        if (fit1 || fit2) {
          // guillotine split
          const rectL = fit1 ? r.L : r.W;
          const rectW = fit1 ? r.W : r.L;
          const usedL = p.L, usedW = p.W;
          const rem1 = { L: rectL - usedL, W: usedW };
          const rem2 = { L: rectL, W: rectW - usedW };
          sh.leftovers.splice(i,1);
          [rem1, rem2].forEach(x => { if (x.L > 1 && x.W > 1) sh.leftovers.push(x); });
          sh.cuts.push({ L: p.L, W: p.W });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) {
      const sh = newSheet();
      // place on fresh sheet
      const r = sh.leftovers[0];
      const fit1 = (p.L <= r.L && p.W <= r.W);
      const rectL = r.L, rectW = r.W;
      const usedL = p.L, usedW = p.W;
      const rem1 = { L: rectL - usedL, W: usedW };
      const rem2 = { L: rectL, W: rectW - usedW };
      sh.leftovers = [];
      [rem1, rem2].forEach(x => { if (x.L > 1 && x.W > 1) sh.leftovers.push(x); });
      sh.cuts.push({ L: p.L, W: p.W });
      sheets.push(sh);
    }
  });

  // Render
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
  const sheetCount = sheets.length || 0;
  const cost = sheetCount * PLY_SHEET.COST;
  plySummary.textContent = `Sheets used: ${sheetCount} × $${PLY_SHEET.COST} = $${cost.toFixed(2)}`;
}


/* =========================
   ADDITIONS (non-breaking)
   ========================= */

/**
 * 1) Enhance getSinkAddonsTotal to support quantities IF .sink-qty exists.
 *    (No change to your original logic when qty fields are absent.)
 */
(function enhanceSinkAddonTotalsWithQty(){
  if (typeof getSinkAddonsTotal !== 'function') return;
  const original = getSinkAddonsTotal;

  window.getSinkAddonsTotal = function(){
    const labels = document.querySelectorAll('#sink-options .sink-grid > label');
    if (labels && labels.length) {
      let sum = 0;
      labels.forEach(lbl => {
        const box = lbl.querySelector('.sink-addon');
        const qtyInput = lbl.querySelector('.sink-qty');
        const price = Number(box?.dataset.price || 0);
        if (box && box.checked) {
          let qty = 1;
          if (qtyInput) {
            const v = parseInt(qtyInput.value || '1', 10);
            qty = isNaN(v) || v < 1 ? 1 : v;
          }
          sum += price * qty;
        }
      });
      return sum;
    }
    return original();
  };
})();

/**
 * 2) Show/hide .sink-qty next to each checkbox, and recalc on changes.
 */
document.addEventListener('DOMContentLoaded', () => {
  const labels = document.querySelectorAll('#sink-options .sink-grid > label');
  labels.forEach(lbl => {
    const box = lbl.querySelector('.sink-addon');
    const qty = lbl.querySelector('.sink-qty');
    if (!box || !qty) return;

    const syncQtyVisibility = () => {
      const on = !!box.checked;
      qty.hidden = !on;
      qty.disabled = !on;
      if (on && (!qty.value || Number(qty.value) < 1)) qty.value = 1;
    };

    // init
    syncQtyVisibility();

    box.addEventListener('change', () => {
      syncQtyVisibility();
      if (typeof calculate === 'function') calculate();
    });

    qty.addEventListener('input', () => {
      const v = parseInt(qty.value || '1', 10);
      if (isNaN(v) || v < 1) qty.value = 1;
      if (typeof calculate === 'function') calculate();
    });

    qty.addEventListener('blur', () => {
      const v = parseInt(qty.value || '1', 10);
      if (isNaN(v) || v < 1) qty.value = 1;
    });
  });
});

/**
 * 3) Force-render sink names adjacent to each checkbox (bullet-proof).
 *    Ensures a .sink-name span exists and contains the correct text.
 */
document.addEventListener('DOMContentLoaded', () => {
  const SINK_NAMES_IN_ORDER = [
    'Standard Kitchen Sink Undermount',
    'HandMade Kitchen Sink Undermount',
    'WorkStation Kitchen Sink Undermount',
    'Apron Kitchen Sink Undermount',
    'Standard Bathroom Sink Undermount',
    'Topmount Bathroom Sink',
    'Vessel Bathroom Sink'
  ];

  const labels = document.querySelectorAll('#sink-options .sink-grid > label');
  labels.forEach((lbl, i) => {
    const expected = SINK_NAMES_IN_ORDER[i] || 'Option';

    // data-name for completeness (not required for visibility)
    if (!lbl.getAttribute('data-name')) lbl.setAttribute('data-name', expected);

    // ensure there’s a visible .sink-name span
    let box = lbl.querySelector('.sink-addon');
    let nameSpan = lbl.querySelector('.sink-name');
    if (!nameSpan) {
      nameSpan = document.createElement('span');
      nameSpan.className = 'sink-name';
      if (box) box.insertAdjacentElement('afterend', nameSpan);
      else lbl.prepend(nameSpan);
    }
    if (!nameSpan.textContent.trim()) nameSpan.textContent = expected;
  });
});
