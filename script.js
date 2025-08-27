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

let currentPlywoodSheets = 0;
let currentPlywoodCost = 0;

/* ===================== Setup ===================== */
document.addEventListener('DOMContentLoaded', () => {
  ensureRows(50);
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
      <td><input class="group" /></td>
      <td>
        <select class="ptype">
          <option value="Countertop">Countertop</option>
          <option value="Island">Island</option>
          <option value="Bartop">Bartop</option>
          <option value="Backsplash">Backsplash</option>
          <option value="FullBacksplash">Full Backsplash</option>
        </select>
      </td>
      <td><input type="number" class="length" /></td>
      <td><input type="number" class="width" /></td>
      <td>
        <select class="material">
          <option value="Quartz">Quartz</option>
          <option value="Granite">Granite</option>
          <option value="Quartzite">Quartzite</option>
          <option value="Marble">Marble</option>
        </select>
      </td>
      <td><input type="number" class="refab" /></td>
      <td class="sqft"></td>
      <td class="labor"></td>
      <td class="extras"></td>
      <td class="total"></td>
    `;
    tableBody.appendChild(row);
  }
}

/* ===================== Packing helpers ===================== */
const WIDTH_BUCKET_STEP = 0.125;
function bucketWidthKey(w) {
  const k = Math.round(w / WIDTH_BUCKET_STEP) * WIDTH_BUCKET_STEP;
  return k.toFixed(3);
}
function asSL_SW(size) {
  return [Math.max(size[0], size[1]), Math.min(size[0], size[1])];
}
function getCandidatesFor(mat, type) {
  if (type === "FullBacksplash") {
    return [].concat(PREFAB[mat]?.Countertop||[], PREFAB[mat]?.Island||[], PREFAB[mat]?.Bartop||[]);
  }
  return (PREFAB[mat] && PREFAB[mat][type]) ? PREFAB[mat][type].slice() : [];
}

function placeIntoOpenBins(bins, part, width) {
  let bestIdx=-1, bestAfter=Infinity;
  for (let i=0;i<bins.length;i++) {
    const b=bins[i];
    if (b.SW+1e-6>=width && b.remaining+1e-6>=part.L) {
      const after=b.remaining-part.L;
      if (after<bestAfter){bestAfter=after;bestIdx=i;}
    }
  }
  if (bestIdx>=0){
    const bin=bins[bestIdx];
    bin.cuts.push({part,cutL:part.L,cutW:width});
    bin.remaining-=part.L;
    bin.rowIdxs.add(part.idx);
    return true;
  }
  return false;
}

function packSingleSlabIfPossible(partsW, cands, width){
  const sumL=partsW.reduce((a,p)=>a+p.L,0);
  const options=cands.map(asSL_SW).filter(([SL,SW])=>SW+1e-6>=width).sort((a,b)=>a[0]-b[0]);
  const chosen=options.find(([SL])=>SL+1e-6>=sumL);
  if (!chosen) return null;
  const [SL,SW]=chosen;
  const cuts=[]; let rem=SL; const rowIdxs=new Set();
  partsW.forEach(p=>{cuts.push({part:p,cutL:p.L,cutW:width}); rem-=p.L; rowIdxs.add(p.idx);});
  return [{SL,SW,remaining:rem,cuts,rowIdxs}];
}

function packMultiSizeFFD(partsW,cands,width){
  const parts=partsW.slice().sort((a,b)=>b.L-a.L);
  const options=cands.map(asSL_SW).filter(([SL,SW])=>SW+1e-6>=width).sort((a,b)=>a[0]-b[0]);
  const bins=[];
  parts.forEach(p=>{
    if(placeIntoOpenBins(bins,p,width))return;
    const chosen=options.find(([SL])=>SL+1e-6>=p.L);
    if(!chosen){bins.push({SL:p.L,SW:width,remaining:0,cuts:[{part:p,cutL:p.L,cutW:width}],rowIdxs:new Set([p.idx])});return;}
    const [SL,SW]=chosen;
    bins.push({SL,SW,remaining:SL-p.L,cuts:[{part:p,cutL:p.L,cutW:width}],rowIdxs:new Set([p.idx])});
  });
  return bins;
}

function shrinkBins(bins,cands,width){
  const options=cands.map(asSL_SW).filter(([SL,SW])=>SW+1e-6>=width).sort((a,b)=>a[0]-b[0]);
  bins.forEach(b=>{
    const used=b.cuts.reduce((a,c)=>a+c.cutL,0);
    const best=options.find(([SL])=>SL+1e-6>=used);
    if(best&&best[0]<b.SL){b.SL=best[0];b.SW=best[1];b.remaining=b.SL-used;}
  });
  return bins;
}

function planForBucket(partsW,cands,width){
  const single=packSingleSlabIfPossible(partsW,cands,width);
  if(single)return single;
  return shrinkBins(packMultiSizeFFD(partsW,cands,width),cands,width);
}

/* ===================== Suggest Prefab Pieces ===================== */
function suggestPieces(){
  const suggestBody=document.getElementById("suggestBody");
  suggestBody.innerHTML="";
  const rows=Array.from(document.querySelectorAll("#inputTable tbody tr"));
  const parts=[];
  rows.forEach((row,i)=>{
    const L=parseFloat(row.querySelector(".length")?.value)||0;
    const W=parseFloat(row.querySelector(".width")?.value)||0;
    const mat=row.querySelector(".material")?.value||"Quartz";
    const typ=row.querySelector(".ptype")?.value||"Countertop";
    const group=(row.querySelector(".group")?.value||"").trim();
    if(L>0&&W>0)parts.push({idx:i+1,group,L,W,mat,typ});
  });
  const pieceCounts={}; const leftoverPieces=[];
  const addCount=(mat,SL,SW)=>{const k=`${SL}×${SW}`;pieceCounts[mat]=pieceCounts[mat]||{};pieceCounts[mat][k]=(pieceCounts[mat][k]||0)+1;};
  const addRow=(i,g,t,cut,src,pref,left)=>{const tr=document.createElement("tr");tr.innerHTML=`<td>${i}</td><td>${g}</td><td>${t}</td><td>${cut}</td><td>${src}</td><td>${pref}</td><td>${left}</td>`;suggestBody.appendChild(tr);};
  
  const pools=new Map();
  parts.forEach(p=>{
    const key=`${p.mat}|${p.typ}`;
    if(!pools.has(key))pools.set(key,new Map());
    const wk=bucketWidthKey(p.W);
    if(!pools.get(key).has(wk))pools.get(key).set(wk,[]);
    pools.get(key).get(wk).push(p);
  });

  pools.forEach((byW)=>{
    byW.forEach((partsW)=>{
      const width=partsW[0].W, mat=partsW[0].mat, typ=partsW[0].typ;
      const cands=getCandidatesFor(mat,typ);
      if(!cands.length){partsW.forEach(p=>addRow(p.idx,p.group,p.typ,`${p.L}×${p.W}`,"No fit","-","—"));return;}
      const bins=planForBucket(partsW,cands,width);
      const placements=new Map();
      bins.forEach((b,bi)=>{
        if(b.SL&&b.SW)addCount(mat,b.SL,b.SW);
        let running=b.SL; const rowsUsed=[...b.rowIdxs].sort((a,b)=>a-b).join(", ");
        (b.cuts||[]).forEach((c,ci)=>{
          running-=c.cutL;
          const isLast=ci===(b.cuts.length-1);
          const pieceTag=`(Piece #${bi+1}; Rows ${rowsUsed})`;
          const cutStr=`${c.cutL}×${width}`;
          const prefabStr=`${b.SL}×${b.SW} ${pieceTag}`;
          let leftStr="—";
          if(isLast&&running>0){
            leftStr=`${running}×${width} ${pieceTag}`;
            leftoverPieces.push(leftStr);
          }
          const arr=placements.get(c.part.idx)||[];
          arr.push({group:c.part.group,typ:c.part.typ,cutStr,prefabStr,leftStr});
          placements.set(c.part.idx,arr);
        });
      });
      partsW.forEach(p=>{
        const arr=placements.get(p.idx);
        if(!arr)addRow(p.idx,p.group,p.typ,`${p.L}×${p.W}`,"No fit","-","—");
        else arr.forEach((pl,j)=>addRow(p.idx,p.group,p.typ,pl.cutStr,j===0?"Prefab":"Leftover",pl.prefabStr,pl.leftStr));
      });
    });
  });

  const summary=document.getElementById("prefabSummary");
  if(summary){
    const rowsHtml=Object.entries(pieceCounts).map(([m,s])=>Object.entries(s).map(([sz,c])=>`<tr><td>${m}</td><td>${sz}</td><td>${c}</td></tr>`).join("")).join("");
    summary.innerHTML=`<h3>Prefab roll-up</h3><table><thead><tr><th>Material</th><th>Size</th><th>Count</th></tr></thead><tbody>${rowsHtml}</tbody></table><div><strong>Leftover pieces:</strong><ul>${leftoverPieces.map(l=>`<li>${l}</li>`).join("")}</ul></div>`;
  }
}

/* ===================== Plywood ===================== */
function computePlywoodPlan(){return {sheets:[],cost:0};}
function suggestPlywood(){calculate();}
