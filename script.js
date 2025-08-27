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
  document.getElementById('oversizeFeeInput')?.addEventListener('input', calculate);
  document.getElementById('tableBody').addEventListener('input', e => {
    if (e.target.matches('.length,.width,.refab,.group')) calculate();
  });
  document.getElementById('tableBody').addEventListener('change', e => {
    if (e.target.matches('.ptype,.material,.sink')) calculate();
  });
  calculate();
});

/* ===================== Table helpers ===================== */
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
  let kitchen=0,bathroom=0;
  items.forEach(item => {
    const price = Number(item.dataset.price||0);
    const qty = Math.min(20, Math.max(0, parseInt(item.querySelector('.sink-qty')?.value||'0',10)));
    if (!qty) return;
    const id = item.querySelector('.sink-qty')?.id || '';
    const amount = price*qty;
    if (id.startsWith('qty-b')) bathroom+=amount; else kitchen+=amount;
  });
  return { kitchen, bathroom, total:kitchen+bathroom };
}

/* ===================== Calculate totals ===================== */
function calculate() {
  const { sheets, cost } = computePlywoodPlan();
  currentPlywoodSheets = sheets.length;
  currentPlywoodCost = cost;

  const rows = document.querySelectorAll('#inputTable tbody tr');
  let sumSqft=0,sumLabor=0,sumExtras=0,sumTotal=0;

  rows.forEach(row=>{
    const L=parseFloat(row.querySelector('.length')?.value)||0;
    const W=parseFloat(row.querySelector('.width')?.value)||0;
    const sink=row.querySelector('.sink')?.value||'';
    const typ=row.querySelector('.ptype')?.value||'Countertop';
    const ref=parseFloat(row.querySelector('.refab')?.value)||0;

    const sqft=Math.ceil((L*W)/144);
    let sinkCost=0;
    if(sink==='kitchen_sink')sinkCost=180;
    else if(sink==='bathroom_sink'||sink==='bar_sink')sinkCost=80;

    let extras=sinkCost+ref*REFAB_RATE;
    if(typ==='Island'&&L>=ISLAND_SURCHARGE_L&&W>=ISLAND_SURCHARGE_W) extras+=ISLAND_SURCHARGE_COST;

    const labor=sqft*LABOR_RATE;
    const total=labor+extras;

    row.querySelector('.sqft').textContent=sqft.toFixed(2);
    row.querySelector('.labor').textContent=labor.toFixed(2);
    row.querySelector('.extras').textContent=extras.toFixed(2);
    row.querySelector('.total').textContent=total.toFixed(2);

    sumSqft+=sqft; sumLabor+=labor; sumExtras+=extras; sumTotal+=total;
  });

  const addons=getSinkAddonsSplit();
  const oversizeFee=Number(document.getElementById('oversizeFeeInput')?.value||0)||0;

  document.getElementById('totalSqft').textContent=sumSqft.toFixed(2);
  document.getElementById('totalLabor').textContent=sumLabor.toFixed(2);
  document.getElementById('totalExtras').textContent=sumExtras.toFixed(2);
  document.getElementById('totalCost').textContent=(sumTotal+addons.total+currentPlywoodCost+oversizeFee).toFixed(2);

  let kInst=0,bInst=0,fab=0;
  rows.forEach(row=>{
    const sink=row.querySelector('.sink')?.value||'';
    if(sink==='kitchen_sink') kInst+=180;
    else if(sink==='bathroom_sink') bInst+=80;
    else if(sink==='bar_sink') kInst+=80;
    fab += (parseFloat(row.querySelector('.refab')?.value)||0)*REFAB_RATE;
  });
  document.getElementById('kitchenSinkInstall').textContent=`$${(kInst+addons.kitchen).toFixed(2)}`;
  document.getElementById('bathSinkInstall').textContent=`$${(bInst+addons.bathroom).toFixed(2)}`;
  document.getElementById('installationCost').textContent=`$${sumLabor.toFixed(2)}`;
  document.getElementById('fabricationCost').textContent=`$${fab.toFixed(2)}`;
  document.getElementById('plywoodCost').textContent=`$${currentPlywoodCost.toFixed(2)}`;
  document.getElementById('grandTotal').textContent=`$${(sumTotal+addons.kitchen+addons.bathroom+currentPlywoodCost+oversizeFee).toFixed(2)}`;
}

/* ===================== Suggest Prefab Pieces ===================== */
const WIDTH_BUCKET_STEP=0.125;
function bucketWidthKey(w){return (Math.round(w/WIDTH_BUCKET_STEP)*WIDTH_BUCKET_STEP).toFixed(3);}
function asSL_SW(s){return [Math.max(s[0],s[1]),Math.min(s[0],s[1])];}
function poolKeyForPack(mat){return `${mat}|ALL`;}
function getCandidatesFor(mat,typ){
  if(typ==='FullBacksplash'){
    return [].concat(PREFAB[mat]?.Countertop||[],PREFAB[mat]?.Island||[],PREFAB[mat]?.Bartop||[]);
  }
  return [].concat(PREFAB[mat]?.Countertop||[],PREFAB[mat]?.Island||[],PREFAB[mat]?.Bartop||[],PREFAB[mat]?.Backsplash||[]);
}
function placeIntoOpenBins(bins,p,width){
  for(let b of bins){
    if(b.SW>=width && b.remaining>=p.L){
      b.cuts.push({part:p,cutL:p.L,cutW:width});
      b.remaining-=p.L; b.rowIdxs.add(p.idx); return true;
    }
  }return false;
}
function packSingleSlabIfPossible(parts,cands,width){
  const sumL=parts.reduce((a,p)=>a+p.L,0);
  const c=cands.map(asSL_SW).filter(([SL,SW])=>SW>=width).sort((a,b)=>a[0]-b[0]);
  const chosen=c.find(([SL])=>SL>=sumL); if(!chosen) return null;
  const [SL,SW]=chosen; let rem=SL;const cuts=[];const rows=new Set();
  parts.forEach(p=>{cuts.push({part:p,cutL:p.L,cutW:width});rem-=p.L;rows.add(p.idx);});
  return[{SL,SW,remaining:rem,cuts,rowIdxs:rows}];
}
function packMultiSizeFFD(parts,cands,width){
  const c=cands.map(asSL_SW).filter(([SL,SW])=>SW>=width).sort((a,b)=>a[0]-b[0]);
  const bins=[]; parts.forEach(p=>{
    if(placeIntoOpenBins(bins,p,width))return;
    const chosen=c.find(([SL])=>SL>=p.L);
    if(!chosen){bins.push({SL:p.L,SW:width,remaining:0,cuts:[{part:p,cutL:p.L,cutW:width,nofit:true}],rowIdxs:new Set([p.idx])});return;}
    const [SL,SW]=chosen;
    bins.push({SL,SW,remaining:SL-p.L,cuts:[{part:p,cutL:p.L,cutW:width}],rowIdxs:new Set([p.idx])});
  });return bins;
}
function shrinkBins(bins,cands,width){
  const c=cands.map(asSL_SW).filter(([SL,SW])=>SW>=width).sort((a,b)=>a[0]-b[0]);
  bins.forEach(b=>{
    const used=b.cuts.reduce((a,c)=>a+c.cutL,0);
    const best=c.find(([SL])=>SL>=used);
    if(best&&best[0]<b.SL){b.SL=best[0];b.SW=best[1];b.remaining=b.SL-used;}
  });return bins;
}
function suggestPieces(){
  const tbody=document.getElementById('suggestBody');tbody.innerHTML='';
  const rows=Array.from(document.querySelectorAll('#inputTable tbody tr'));
  const parts=[];rows.forEach((r,i)=>{const L=parseFloat(r.querySelector('.length')?.value)||0;
    const W=parseFloat(r.querySelector('.width')?.value)||0;
    const mat=r.querySelector('.material')?.value||'Quartz';
    const typ=r.querySelector('.ptype')?.value||'Countertop';
    const g=(r.querySelector('.group')?.value||'').trim();
    if(L>0&&W>0)parts.push({idx:i+1,group:g,L,W,mat,typ});});
  if(!parts.length)return;
  const pools=new Map();
  parts.forEach(p=>{const key=poolKeyForPack(p.mat);
    if(!pools.has(key))pools.set(key,new Map());
    const wk=bucketWidthKey(p.W);
    if(!pools.get(key).has(wk))pools.get(key).set(wk,[]);
    pools.get(key).get(wk).push(p);});
  const pieceCounts={},leftoverPieces=[];
  const addCount=(m,SL,SW)=>{const k=`${SL}×${SW}`;pieceCounts[m]=pieceCounts[m]||{};pieceCounts[m][k]=(pieceCounts[m][k]||0)+1;};
  const addRow=(i,g,t,c,s,pf,l)=>{const tr=document.createElement('tr');
    tr.innerHTML=`<td>${i}</td><td>${g}</td><td>${t}</td><td>${c}</td><td>${s}</td><td>${pf}</td><td>${l}</td>`;tbody.appendChild(tr);};
  pools.forEach((byWidth)=>{
    const widthKeys=Array.from(byWidth.keys()).sort((a,b)=>parseFloat(b)-parseFloat(a));
    let carryBins=[];const placements=new Map();
    widthKeys.forEach(wk=>{
      const partsW=byWidth.get(wk)||[];if(!partsW.length)return;
      const width=partsW[0].W;const {mat,typ}=partsW[0];const cands=getCandidatesFor(mat,typ);
      if(!cands.length){partsW.forEach(p=>addRow(p.idx,p.group,p.typ,`${p.L}×${p.W}`,'No fit','-','—'));return;}
      const remaining=[];partsW.sort((a,b)=>b.L-a.L).forEach(p=>{if(!placeIntoOpenBins(carryBins,p,width))remaining.push(p);});
      let newBins=[];if(remaining.length){const single=packSingleSlabIfPossible(remaining,cands,width);
        newBins=single?single:packMultiSizeFFD(remaining,cands,width);}
      carryBins=shrinkBins(carryBins.concat(newBins),cands,width);
      carryBins.forEach((b,bi)=>{if(b.SL&&b.SW)addCount(mat,b.SL,b.SW);
        let running=b.SL??0;const rowsUsed=b.rowIdxs?[...b.rowIdxs].join(', '):'';
        (b.cuts||[]).forEach((c,ci)=>{if(Math.abs(c.cutW-width)>1e-5)return;running-=c.cutL;
          const isLast=ci===b.cuts.length-1;const tag=`(Piece #${bi+1}; Rows ${rowsUsed})`;
          const cutStr=`${c.cutL}×${width}`;const prefStr=b.SL?`${b.SL}×${b.SW} ${tag}`:'-';
          let leftStr='—';if(b.SL&&isLast&&running>0){leftStr=`${running}×${width} ${tag}`;leftoverPieces.push(leftStr);}
          const arr=placements.get(c.part.idx)||[];arr.push({group:c.part.group,typ:c.part.typ,cutStr,prefStr,leftStr});
          placements.set(c.part.idx,arr);});});
      partsW.sort((a,b)=>a.idx-b.idx).forEach(p=>{const arr=(placements.get(p.idx)||[]).filter(x=>x.cutStr.endsWith(`×${width}`));
        if(!arr.length)addRow(p.idx,p.group,p.typ,`${p.L}×${p.W}`,'No fit','-','—');
        else arr.forEach((pl,j)=>addRow(p.idx,p.group,p.typ,pl.cutStr,j===0?'Prefab':'Leftover',pl.prefStr,pl.leftStr));});
    });
  });
  const summary=document.getElementById('prefabSummary');
  if(summary){const rowsHtml=Object.keys(pieceCounts).length?Object.entries(pieceCounts).map(([m,s])=>
    Object.entries(s).map(([sz,cnt])=>`<tr><td>${m}</td><td>${sz}</td><td>${cnt}</td></tr>`).join('')).join(''):
    `<tr><td colspan="3">No new prefab pieces required.</td></tr>`;
    const leftoversHtml=leftoverPieces.length?`<ul>${leftoverPieces.map(x=>`<li>${x}</li>`).join('')}</ul>`:`<span>No leftover pieces</span>`;
    summary.innerHTML=`<h3>Prefab roll-up</h3><table><tbody>${rowsHtml}</tbody></table><div>${leftoversHtml}</div>`;}
}

/* =====================
