/* ========= CSV + DROPDOWNS + CALCULATOR (robust CSV autodetect) ========= */

const CSV_FILES = {
  Quartz: "/csv/Quartz_tidy.csv",
  Granite: "/csv/Granite_tidy.csv",
  Quartzite: "/csv/Quartzite_tidy.csv",
  Marble: "/csv/Marble_tidy.csv",
};

/* ---------------- helpers ---------------- */
const $ = (id) => document.getElementById(id);
const statusEl = $("csv-status");
const materialSel = $("material");
const stoneSel = $("stone");
const sizeSel = $("size");
const resEl = $("result-area");
const btnCalc = $("btn-calc");
const btnPly  = $("btn-plywood");
const debugEl = $("debug-log");

function dlog(...a){ console.log(...a); if (debugEl) debugEl.textContent += a.map(x=>typeof x==="string"?x:JSON.stringify(x)).join(" ")+"\n"; }

function norm(s){
  return String(s||"")
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Always store sizes as "LxW" with L >= W (integers)
function toSizeKey(L, W){
  const l = Math.round(Number(L)||0), w = Math.round(Number(W)||0);
  const big = Math.max(l, w), small = Math.min(l, w);
  return `${big}x${small}`;
}

function parseSizeKey(any){
  const s = String(any||"").toLowerCase().replace(/"/g,"").replace(/\s+/g,"");
  // accept "108x26", "26x108", "108 × 26"
  const m = s.match(/^(\d{2,3})\s*[x×]\s*(\d{2,3})$/i);
  if (!m) return null;
  return toSizeKey(m[1], m[2]);
}

/* ---------------- CSV parser (tolerant) ---------------- */
function parseCSV(text){
  // try comma first; if too few cols overall, try semicolon
  const delimiter = (text.match(/;/g)||[]).length > (text.match(/,/g)||[]).length ? ";" : ",";
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  for (let i=0;i<text.length;i++){
    const ch = text[i];
    if (inQuotes){
      if (ch === '"'){
        if (text[i+1] === '"'){ cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delimiter){ row.push(cell); cell=""; }
      else if (ch === "\n"){ row.push(cell); rows.push(row); row=[]; cell=""; }
      else if (ch === "\r"){ /* ignore */ }
      else cell += ch;
    }
  }
  if (cell.length || row.length){ row.push(cell); rows.push(row); }
  if (!rows.length) return [];

  const header = rows[0].map(h=>norm(h).toLowerCase());
  const body = rows.slice(1);
  const out = body.map(r=>{
    const obj = {};
    header.forEach((h, i)=> obj[h] = norm(r[i]));
    return obj;
  });
  return out;
}

/* ---------------- autodetect columns ---------------- */
function detectColumns(rows){
  // pick stoneCol: prefer headers with these names; else first non-size-ish texty column
  const candidatesStone = ["stone","color","name","stone name","product","model","sku","colour"];
  const candidatesSize  = ["size","dimension","dimensions","size (in)","slab size","prefab size"];

  const headers = rows.length ? Object.keys(rows[0]) : [];

  let stoneCol = headers.find(h => candidatesStone.includes(h)) || null;
  let sizeCol  = headers.find(h => candidatesSize.includes(h))  || null;

  // Fallback: detect by value patterns
  if (!sizeCol){
    for (const h of headers){
      const vals = rows.slice(0, 30).map(r=>r[h]);
      if (vals.some(v => parseSizeKey(v))) { sizeCol = h; break; }
    }
  }
  if (!stoneCol){
    for (const h of headers){
      if (h === sizeCol) continue;
      const vals = rows.slice(0, 30).map(r=>r[h]);
      // choose column that has text and NOT mostly numeric or size-like
      const texty = vals.filter(v => v && !/^\d+(\.\d+)?$/.test(v) && !parseSizeKey(v)).length;
      if (texty >= Math.ceil(vals.length*0.3)) { stoneCol = h; break; }
    }
  }

  return { stoneCol, sizeCol };
}

/* ---------------- load CSVs ---------------- */
async function fetchText(url){
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return await res.text();
}

const dataByMaterial = {}; // { mat: { stones:Set, sizesByStone:Map, anySizes:Set } }

async function loadAllCSVs(){
  statusEl && (statusEl.textContent = "Loading CSV data…");
  for (const mat of Object.keys(CSV_FILES)){
    try{
      const text = await fetchText(CSV_FILES[mat]);
      const rows = parseCSV(text);
      if (!rows.length) { dlog(`[${mat}] empty CSV`); dataByMaterial[mat] = { stones:new Set(), sizesByStone:new Map(), anySizes:new Set() }; continue; }

      const { stoneCol, sizeCol } = detectColumns(rows);
      if (!stoneCol || !sizeCol){
        dlog(`[${mat}] Could not detect columns. headers=`, Object.keys(rows[0]));
        dataByMaterial[mat] = { stones:new Set(), sizesByStone:new Map(), anySizes:new Set() };
        continue;
      }

      const stones = new Set();
      const sizesByStone = new Map();
      const anySizes = new Set();

      for (const r of rows){
        const stoneName = norm(r[stoneCol]);
        const sizeKey = parseSizeKey(r[sizeCol]);
        if (!stoneName || !sizeKey) continue;

        stones.add(stoneName);
        if (!sizesByStone.has(stoneName)) sizesByStone.set(stoneName, new Set());
        sizesByStone.get(stoneName).add(sizeKey);
        anySizes.add(sizeKey);
      }

      dlog(`[${mat}] Stones=${stones.size} AnySizes=${anySizes.size} (stoneCol="${stoneCol}", sizeCol="${sizeCol}")`);
      dataByMaterial[mat] = { stones, sizesByStone, anySizes };
    } catch (e){
      dlog(`[${mat}] load error: ${String(e)}`);
      dataByMaterial[mat] = { stones:new Set(), sizesByStone:new Map(), anySizes:new Set() };
    }
  }
  statusEl && (statusEl.textContent = "CSV loaded");
}

/* ---------------- UI wiring ---------------- */
function fillStones(mat){
  stoneSel.innerHTML = `<option value="">Select stone…</option>`;
  sizeSel.innerHTML = `<option value="">Select size…</option>`;
  stoneSel.disabled = true; sizeSel.disabled = true;

  if (!mat || !dataByMaterial[mat]) return;
  const stones = Array.from(dataByMaterial[mat].stones).sort((a,b)=>a.localeCompare(b));
  for (const s of stones){
    const opt = document.createElement("option");
    opt.value = s; opt.textContent = s;
    stoneSel.appendChild(opt);
  }
  stoneSel.disabled = stones.length === 0;
  if (stones.length === 0) dlog(`[WARN] No stones for material "${mat}". Check CSV headers/values.`);
}

function fillSizes(mat, stone){
  sizeSel.innerHTML = `<option value="">Select size…</option>`;
  sizeSel.disabled = true;
  if (!mat || !dataByMaterial[mat]) return;

  const { sizesByStone, anySizes } = dataByMaterial[mat];
  const set = (stone && sizesByStone.has(stone)) ? sizesByStone.get(stone) : anySizes;
  const sizes = Array.from(set).sort((a,b)=>{
    const [al,aw] = a.split("x").map(Number);
    const [bl,bw] = b.split("x").map(Number);
    return (bl*bw) - (al*aw) || bl - al || bw - aw;
  });
  for (const s of sizes){
    const opt = document.createElement("option");
    opt.value = s; opt.textContent = s.replace("x"," × ");
    sizeSel.appendChild(opt);
  }
  sizeSel.disabled = sizes.length === 0;
  if (sizes.length === 0) dlog(`[WARN] No sizes for "${stone||'ANY'}" in "${mat}".`);
}

materialSel.addEventListener("change", e => fillStones(e.target.value));
stoneSel.addEventListener("change", e => fillSizes(materialSel.value, e.target.value));

/* ---------------- simple calc buttons (unchanged basics) ---------------- */
function areaSqIn(L,W){ return (Number(L)||0) * (Number(W)||0); }
function toSqFt(x){ return x/144; }
function render(html){ resEl.innerHTML = `<div class="card">${html}</div>`; }

$("btn-calc").addEventListener("click", ()=>{
  const L = Number($("length").value||0);
  const W = Number($("width").value||0);
  if (!L || !W) return render(`<p><strong>Enter Length & Width</strong> in inches.</p>`);
  const size = sizeSel.value || "(any)";
  const pieceSF = toSqFt(areaSqIn(L,W));

  let fitsMsg = "";
  if (size.includes("x")){
    const [sl,sw] = size.split("x").map(Number);
    const fits = (L<=sl && W<=sw) || (L<=sw && W<=sl);
    fitsMsg = fits ? `<span class="ok">✔ Fits ${sl}" × ${sw}"</span>` : `<span class="bad">✖ Does not fit ${sl}" × ${sw}"</span>`;
  } else fitsMsg = `<span class="muted">No stock selected.</span>`;

  render(`
    <p><strong>Material:</strong> ${materialSel.value||"(none)"} | <strong>Stone:</strong> ${stoneSel.value||"(none)"} | <strong>Stock:</strong> ${size.replace("x"," × ")}</p>
    <hr/>
    <p><strong>Piece:</strong> ${L}" × ${W}" → ${pieceSF.toFixed(2)} sq ft</p>
    <p>${fitsMsg}</p>
  `);
});

$("btn-plywood").addEventListener("click", ()=>{
  const L = Number($("length").value||0);
  const W = Number($("width").value||0);
  if (!L || !W) return render(`<p><strong>Enter Length & Width</strong> in inches.</p>`);
  const plyL = Math.max(1, L-3), plyW = Math.max(1, W-2);
  const plySF = toSqFt(areaSqIn(plyL, plyW));
  const SHEET_W=48,SHEET_L=96,SHEET_COST=49;
  const sheets = Math.ceil(areaSqIn(plyL,plyW)/(SHEET_W*SHEET_L));
  render(`
    <p><strong>Plywood cut:</strong> ${plyL}" × ${plyW}" → ${plySF.toFixed(2)} sq ft</p>
    <p><strong>Sheets est.:</strong> ${sheets} × 48"×96" @ $${SHEET_COST} → <strong>$${(sheets*SHEET_COST).toFixed(2)}</strong></p>
  `);
});

/* ---------------- boot ---------------- */
(async function init(){
  try { await loadAllCSVs(); }
  catch(e){ statusEl && (statusEl.textContent = "CSV error"); dlog("CSV load failed:", e); }
  // If user already selected a material (reload), populate stones/sizes:
  if (materialSel.value) fillStones(materialSel.value);
})();
