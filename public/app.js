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
  return String(s || "")
    .replace(/^\uFEFF/, "")        // strip UTF-8 BOM if present
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
  if (any == null) return null;
  let s = String(any)
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/["′’”]/g, "")      // strip inch/quote symbols
    .replace(/\s+by\s+/g, "x")   // “108 by 26” → “108x26”
    .replace(/\s*[x×]\s*/g, "x") // normalize separators
    .replace(/\s+/g, " ")
    .trim();

  // now expect something like 108x26 or 108.0x26.00
  const m = s.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
  if (!m) return null;

  const L = Math.round(parseFloat(m[1]));
  const W = Math.round(parseFloat(m[2]));
  if (!Number.isFinite(L) || !Number.isFinite(W)) return null;

  const big = Math.max(L, W), small = Math.min(L, W);
  return `${big}x${small}`;
}

/* ---------------- CSV parser (tolerant) ---------------- */
function parseCSV(text){
  // detect delimiter by highest count
  const counts = {
    ",": (text.match(/,/g)||[]).length,
    ";": (text.match(/;/g)||[]).length,
    "\t": (text.match(/\t/g)||[]).length
  };
  const delimiter = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];

  const rows = [];
  let row=[], cell="", inQuotes=false;
  for (let i=0;i<text.length;i++){
    const ch = text[i];
    if (inQuotes){
      if (ch === '"'){
        if (text[i+1] === '"'){ cell+='"'; i++; } else inQuotes=false;
      } else cell += ch;
    } else {
      if (ch === '"') inQuotes=true;
      else if (ch === delimiter){ row.push(cell); cell=""; }
      else if (ch === "\n"){ row.push(cell); rows.push(row); row=[]; cell=""; }
      else if (ch === "\r"){ /* ignore */ }
      else cell += ch;
    }
  }
  if (cell.length || row.length){ row.push(cell); rows.push(row); }

  if (!rows.length) return [];
  const header = rows[0].map(h => norm(h).toLowerCase());
  const body = rows.slice(1);

  return body.map(line=>{
    const obj = {};
    header.forEach((h, i)=> obj[h] = norm(line[i]));
    return obj;
  });
}

/* ---------------- autodetect columns ---------------- */
function detectColumns(rows){
  const headers = rows.length ? Object.keys(rows[0]).map(h => h.toLowerCase()) : [];

  // preferred names
  const stoneNames = ["stone","stone name","color","colour","name","product","model","sku"];
  const sizeNames  = ["size","dimension","dimensions","size (in)","slab size","prefab size"];

  let stoneCol = headers.find(h => stoneNames.includes(h)) || null;
  let sizeCol  = headers.find(h => sizeNames.includes(h))  || null;

  // detect size by value pattern if needed
  if (!sizeCol){
    for (const h of headers){
      const vals = rows.slice(0, 50).map(r => r[h]);
      if (vals.some(v => parseSizeKey(v))) { sizeCol = h; break; }
    }
  }

  // fallback: pick the longest-text column as stone
  if (!stoneCol){
    let best = null, bestScore = -1;
    for (const h of headers){
      if (h === sizeCol) continue;
      const vals = rows.slice(0, 50).map(r => r[h]).filter(Boolean);
      const texty = vals.filter(v => !/^\d+(\.\d+)?$/.test(v) && !parseSizeKey(v)).join(" ");
      const score = texty.length;
      if (score > bestScore){ best = h; bestScore = score; }
    }
    stoneCol = best;
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
      const text = await fetch(CSV_FILES[mat], { cache: "no-store" }).then(r=>{
        if(!r.ok) throw new Error(`${CSV_FILES[mat]} → ${r.status}`);
        return r.text();
      });
      const rows = parseCSV(text);
      // DEBUG: print headers and a sample row
if (rows.length){
  const headers = Object.keys(rows[0]);
  dlog(`[${mat}] headers=`, headers);
  dlog(`[${mat}] sample=`, rows[0]);
}
const { stoneCol, sizeCol } = detectColumns(rows);
dlog(`[${mat}] detected stoneCol="${stoneCol}", sizeCol="${sizeCol}"`);

      if (!rows.length){ dataByMaterial[mat] = { stones:new Set(), sizesByStone:new Map(), anySizes:new Set() }; continue; }

      const { stoneCol, sizeCol } = detectColumns(rows);
      if (!stoneCol){ 
        dlog(`[${mat}] No stone column detected. headers=`, Object.keys(rows[0]));
        dataByMaterial[mat] = { stones:new Set(), sizesByStone:new Map(), anySizes:new Set() };
        continue;
      }

      const stones = new Set();
      const sizesByStone = new Map();
      const anySizes = new Set();

      for (const r of rows){
        const stoneName = norm(r[stoneCol]);
        if (!stoneName) continue;

        // ALWAYS collect the stone so the dropdown populates
        stones.add(stoneName);
        if (!sizesByStone.has(stoneName)) sizesByStone.set(stoneName, new Set());

        // Size is optional; only add if we can parse it
        let sizeKey = null;
        if (sizeCol) sizeKey = parseSizeKey(r[sizeCol]);
        if (sizeKey){
          sizesByStone.get(stoneName).add(sizeKey);
          anySizes.add(sizeKey);
        }
      }

      dlog(`[${mat}] Stones=${stones.size} AnySizes=${anySizes.size} (stoneCol="${stoneCol}", sizeCol="${sizeCol||'N/A'}")`);
      dataByMaterial[mat] = { stones, sizesByStone, anySizes };
    } catch(e){
      dlog(`[${mat}] load error: ${String(e)}`);
      dataByMaterial[mat] = { stones:new Set(), sizesByStone:new Map(), anySizes:new Set() };
    }
  }
  statusEl && (statusEl.textContent = "CSV loaded");
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
