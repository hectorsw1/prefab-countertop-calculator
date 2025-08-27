// --- PREFAB CATALOG (inches) ---
const PREFAB = {
  Granite: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: []
  },
  Quartz: {
    Countertop: [[26,96],[26,108],[26,114],[26,120]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: []
  },
  Quartzite: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: []
  },
  Marble: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]],
    FullBacksplash: []
  }
};

// --- CONSTANTS ---
const LABOR_RATE = 14;
const REFAB_RATE = 30;
const ISLAND_SURCHARGE_L = 120;
const ISLAND_SURCHARGE_W = 43;
const ISLAND_SURCHARGE_COST = 150;
const PLY_SHEET = { L: 96, W: 48, COST: 70 };
const PLY_OFFSET_LENGTH = 3;
const PLY_OFFSET_WIDTH  = 2;

// --- LIVE plywood state ---
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
    else kitchen += amount;
  });

  return { kitchen, bathroom, total: kitchen + bathroom };
}

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
  rows.forEach(row => {
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

/* ===================== PREFAB Packing helpers ===================== */
// (helpers go here — see my previous message with bucketWidthKey, poolKeyForPack, etc.)
// For brevity, I’ll keep them collapsed in this snippet,
// but you will paste the full helper set exactly as I gave you earlier.

/* ===================== suggestPieces() ===================== */
// (full upgraded suggestPieces function goes here — same as my last message)

/* ===================== Pure plywood planner (no DOM writes) ===================== */
function computePlywoodPlan() {
  const rows = Array.from(document.querySelectorAll("#inputTable tbody tr"));
  const pieces = [];
  rows.forEach(row => {
    const type = (row.querySelector(".ptype")?.value || "").trim();
    if (!["Countertop","Island","Bartop"].includes(type)) return;
    const rawL = parseFloat(row.querySelector(".length")?.value) || 0;
    const rawW = parseFloat(row.querySelector(".width")?.value)  || 0;
    let adjL = rawL - PLY_OFFSET_LENGTH;
    let adjW = rawW - PLY_OFFSET_WIDTH;
    if (!(adjL > 0 && adjW > 0)) return;
    const L = Math.max(adjL, adjW);
    const W = Math.min(adjL, adjW);
    pieces.push({ L, W, area: L*W });
  });

  if (pieces.length === 0) return { sheets: [], cost: 0 };

  pieces.sort((a,b)=> b.area - a.area);
  const sheets = [];
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
        const rem2 = { L: rectL, W: rectW - p.W };
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
      const rem2 = { L: rectL, W: rectW - p.W };
      sh.leftovers = [];
      [rem1, rem2].forEach(x => { if (x.L > 1 && x.W > 1) sh.leftovers.push(x); });
      sh.cuts.push({ L: p.L, W: p
