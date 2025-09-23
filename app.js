/* ========= CSV + DROPDOWNS + CALCULATOR ========= */

/** Place CSV files under /public/csv on Vercel and reference with /csv/… */
const CSV_FILES = {
  Quartz: "/csv/Quartz_tidy.csv",
  Granite: "/csv/Granite_tidy.csv",
  Quartzite: "/csv/Quartzite_tidy.csv",
  Marble: "/csv/Marble_tidy.csv",
};

/* ===================== STRICT SIZE HELPERS ===================== */
function norm(s){
  return String(s||"")
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Always store/compare as "LxW" with L >= W (inches)
function toSizeKey(L, W){
  const l = Number(L), w = Number(W);
  const big = Math.max(l, w), small = Math.min(l, w);
  return `${big}x${small}`;
}

// If your CSV has a "size" like "108x26"
function parseSizeKey(sizeStr){
  const clean = String(sizeStr || "").toLowerCase().replace(/"/g,"").replace(/\s+/g,"");
  const parts = clean.split("x");
  if (parts.length !== 2) return null;
  const a = Number(parts[0]), b = Number(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return toSizeKey(a, b);
}

/* ===================== CSV PARSER (no external libs) ===================== */
function parseCSV(text){
  // very tolerant CSV (comma-separated) — handles quotes
  const rows = [];
  let row = [], cell = "", inQuotes = false;

  for (let i=0; i<text.length; i++){
    const ch = text[i];
    if (inQuotes){
      if (ch === '"'){
        if (text[i+1] === '"'){ cell += '"'; i++; }
        else { inQuotes = false; }
      } else { cell += ch; }
    } else {
      if (ch === '"'){ inQuotes = true; }
      else if (ch === ","){ row.push(cell); cell = ""; }
      else if (ch === "\n"){ row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch === "\r"){ /* ignore CR */ }
      else { cell += ch; }
    }
  }
  // flush last cell
  if (cell.length || row.length) { row.push(cell); rows.push(row); }

  // header mapping
  if (!rows.length) return [];
  const header = rows[0].map(h => norm(h).toLowerCase());
  const out = [];
  for (let r=1; r<rows.length; r++){
    const obj = {};
    const line = rows[r];
    header.forEach((h, idx) => { obj[h] = norm(line[idx]); });
    out.push(obj);
  }
  return out;
}

/* ===================== STATE ===================== */
/**
 * dataByMaterial: {
 *   Quartz: {
 *     stones: Set<string>,
 *     sizesByStone: Map<stoneName, Set<"LxW">>,
 *     anySizes: Set<"LxW"> (union, fallback)
 *   },
 *   ...
 * }
 */
const dataByMaterial = {};
const logEl = document.getElementById("debug-log");
const statusEl = document.getElementById("csv-status");
const materialSel = document.getElementById("material");
const stoneSel = document.getElementById("stone");
const sizeSel = document.getElementById("size");
const lengthInput = document.getElementById("length");
const widthInput  = document.getElementById("width");
const resEl = document.getElementById("result-area");
const btnCalc = document.getElementById("btn-calc");
const btnPly  = document.getElementById("btn-plywood");

function dlog(...args){
  console.log(...args);
  if (logEl){
    logEl.textContent += args.map(a => (typeof a === "string" ? a : JSON.stringify(a,null,2))).join(" ") + "\n";
  }
}

/* ===================== CSV LOADER ===================== */
async function loadMaterialCSVFlexible(path){
  let lastErr;
  const candidates = [path, `.${path}`, `..${path}`]; // belt & suspenders
  for (const p of candidates){
    try {
      const res = await fetch(p, { cache: "no-store" });
      dlog(`[CSV TRY] ${p} → ${res.status}`);
      if (!res.ok) { lastErr = new Error(`Failed ${p} (${res.status})`); continue; }
      const text = await res.text();
      const rows = parseCSV(text);
      return rows;
    } catch (err){
      lastErr = err;
      dlog(`[CSV ERR] ${p}: ${String(err)}`);
    }
  }
  throw lastErr || new Error("CSV fetch failed");
}

async function loadAllCSVs(){
  statusEl.textContent = "Loading CSV data…";
  const materials = Object.keys(CSV_FILES);
  for (const mat of materials){
    try {
      const rows = await loadMaterialCSVFlexible(CSV_FILES[mat]);
      // Expect columns like: stone,color,name,size (any two: stone/name) and size "108x26"
      const stones = new Set();
      const sizesByStone = new Map();
      const anySizes = new Set();

      for (const r of rows){
        const stoneName = (r.stone || r.color || r.name || "").trim();
        const sizeKey = parseSizeKey(r.size || r.dimension || r.dim || r["size (in)"] || "");
        if (!stoneName || !sizeKey) continue;
        stones.add(stoneName);

        if (!sizesByStone.has(stoneName)) sizesByStone.set(stoneName, new Set());
        sizesByStone.get(stoneName).add(sizeKey);
        anySizes.add(sizeKey);
      }

      dataByMaterial[mat] = { stones, sizesByStone, anySizes };
      dlog(`[${mat}] Stones: ${stones.size}, Sizes (union): ${anySizes.size}`);
    } catch (err){
      dlog(`[LOAD FAIL] ${mat}:`, err);
      // keep material key but empty sets so UI doesn't break
      dataByMaterial[mat] = { stones: new Set(), sizesByStone: new Map(), anySizes: new Set() };
    }
  }
  statusEl.textContent = "CSV loaded";
}

/* ===================== UI WIRING ===================== */
function fillStonesForMaterial(mat){
  stoneSel.innerHTML = `<option value="">Select stone…</option>`;
  sizeSel.innerHTML = `<option value="">Select size…</option>`;
  stoneSel.disabled = true;
  sizeSel.disabled = true;

  if (!mat || !dataByMaterial[mat]) return;
  const stones = Array.from(dataByMaterial[mat].stones).sort((a,b)=>a.localeCompare(b));
  for (const s of stones){
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    stoneSel.appendChild(opt);
  }
  stoneSel.disabled = stones.length === 0;
}

function fillSizesForStone(mat, stone){
  sizeSel.innerHTML = `<option value="">Select size…</option>`;
  sizeSel.disabled = true;
  if (!mat || !dataByMaterial[mat]) return;

  const { sizesByStone, anySizes } = dataByMaterial[mat];
  const sizeSet = stone && sizesByStone.has(stone) ? sizesByStone.get(stone) : anySizes;
  const sizes = Array.from(sizeSet).sort((a,b)=>{
    const [al,aw] = a.split("x").map(Number);
    const [bl,bw] = b.split("x").map(Number);
    return (bl*lw(bl,bw) - al*lw(al,aw)) || (bl - al) || (bw - aw);
    function lw(L,W){ return L*W; }
  });

  for (const s of sizes){
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s.replace("x", " × ");
    sizeSel.appendChild(opt);
  }
  sizeSel.disabled = sizes.length === 0;
}

materialSel.addEventListener("change", (e)=>{
  const mat = e.target.value;
  fillStonesForMaterial(mat);
});

stoneSel.addEventListener("change", (e)=>{
  const mat = materialSel.value;
  const stone = e.target.value;
  fillSizesForStone(mat, stone);
});

/* ===================== CALCULATIONS ===================== */
function areaSqIn(L, W){ return Number(L||0) * Number(W||0); }
function toSqFt(sqIn){ return sqIn / 144; }

function renderResult(html){
  resEl.innerHTML = `<div class="card">${html}</div>`;
}

btnCalc.addEventListener("click", ()=>{
  const mat = materialSel.value || "(none)";
  const stone = stoneSel.value || "(none)";
  const size = sizeSel.value || "(any)";
  const L = Number(lengthInput.value || 0);
  const W = Number(widthInput.value || 0);
  if (!L || !W){
    renderResult(`<p><strong>Enter piece dimensions</strong> (Length & Width in inches) and try again.</p>`);
    return;
  }
  const pieceArea = areaSqIn(L,W);
  const pieceSF = toSqFt(pieceArea);

  let fitsMsg = "";
  if (size && size.includes("x")){
    const [sl, sw] = size.split("x").map(Number);
    const fits = (L <= sl && W <= sw) || (L <= sw && W <= sl);
    fitsMsg = fits
      ? `<span class="ok">✔ Fits selected stock: ${sl}" × ${sw}"</span>`
      : `<span class="bad">✖ Does not fit selected stock: ${sl}" × ${sw}"</span>`;
  } else {
    fitsMsg = `<span class="muted">No specific stock selected.</span>`;
  }

  renderResult(`
    <p><strong>Material:</strong> ${mat}</p>
    <p><strong>Stone:</strong> ${stone}</p>
    <p><strong>Stock Size:</strong> ${size !== "(any)" ? size.replace("x"," × ") : "Any / not selected"}</p>
    <hr/>
    <p><strong>Piece:</strong> ${L}" × ${W}" → ${pieceSF.toFixed(2)} sq ft</p>
    <p>${fitsMsg}</p>
  `);
});

btnPly.addEventListener("click", ()=>{
  const L = Number(lengthInput.value || 0);
  const W = Number(widthInput.value || 0);
  if (!L || !W){
    renderResult(`<p><strong>Enter piece dimensions</strong> (Length & Width in inches) first.</p>`);
    return;
  }
  // Plywood rule: width – 2", length – 3"
  const plyL = Math.max(1, L - 3);
  const plyW = Math.max(1, W - 2);
  const plyArea = areaSqIn(plyL, plyW);
  const plySF = toSqFt(plyArea);

  // Plywood sheet 48"×96" @ $49/sheet (from your spec)
  const SHEET_W = 48, SHEET_L = 96, SHEET_COST = 49;
  // naive sheet count (guaranteed fit count, not optimized nesting)
  const perSheet = SHEET_W * SHEET_L; // sq in
  const sheets = Math.ceil(plyArea / perSheet);
  const estCost = sheets * SHEET_COST;

  renderResult(`
    <p><strong>Original piece:</strong> ${L}" × ${W}"</p>
    <p><strong>Plywood cut:</strong> ${plyL}" × ${plyW}" → ${plySF.toFixed(2)} sq ft</p>
    <hr/>
    <p><strong>Estimate:</strong> ${sheets} sheet(s) of 48" × 96" plywood @ $${SHEET_COST}/sheet → <strong>$${estCost.toFixed(2)}</strong></p>
    <p class="muted">Note: This is a simple estimate. Optimized nesting can reduce sheet count.</p>
  `);
});

/* ===================== BOOT ===================== */
(async function init(){
  await loadAllCSVs();
  // If user picks a material first, stones/sizes will populate.
  // For UX, if material already selected (e.g., re-rendered SPA), refresh stones/sizes:
  if (materialSel.value) fillStonesForMaterial(materialSel.value);
})();
