let sectionCounter = 0;
let sections = [];
let currentResults = null;
let stoneData = {};

document.addEventListener('DOMContentLoaded', function() {
  loadAllCSVs();
  renderSectionList();
});

async function loadAllCSVs() {
  const materials = ['Granite', 'Marble', 'Quartz', 'Quartzite'];
  for (const material of materials) {
    try {
      const paths = [`./CSV/${material}_tidy.csv`, `./csv/${material}_tidy.csv`];
      let response = null;
      for (const p of paths) {
        try {
          response = await fetch(p);
          if (response.ok) break;
        } catch (e) {
          response = null;
        }
      }
      if (!response || !response.ok) throw new Error(`CSV not found`);
      const csvText = await response.text();
      stoneData[material] = parseCSV(csvText);
    } catch (error) {
      console.error(`Error loading ${material}:`, error);
      stoneData[material] = [];
    }
  }
}

function parseCSV(csvText) {
  if (!csvText || !csvText.trim()) return [];
  const lines = csvText.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] ? row[index].trim() : '';
    });
    item.size_L_in = parseInt(item.size_L_in) || 0;
    item.size_W_in = parseInt(item.size_W_in) || 0;
    if (item.size_L_in > 0 && item.size_W_in > 0) {
      data.push(item);
    }
  }
  return data;
}

function loadStoneColors() {
  const material = document.getElementById('material').value;
  const stoneColorSelect = document.getElementById('stone-color');
  stoneColorSelect.innerHTML = '<option value="">Select stone color...</option>';
  stoneColorSelect.disabled = true;
  if (material && stoneData[material]) {
    const colors = [...new Set(stoneData[material].map(item => item.color))].sort();
    colors.forEach(color => {
      const option = document.createElement('option');
      option.value = color;
      option.textContent = color;
      stoneColorSelect.appendChild(option);
    });
    stoneColorSelect.disabled = false;
  }
}

function addSection() {
  const name = document.getElementById('quick-name').value.trim() || `Section ${String.fromCharCode(65 + sectionCounter)}`;
  const length = parseFloat(document.getElementById('quick-length').value);
  const width = parseFloat(document.getElementById('quick-width').value);
  const type = document.getElementById('quick-type').value;
  const joint = document.getElementById('quick-joint').value;
  const jointGroup = document.getElementById('quick-joint-group').value.trim();
  if (!length || !width || length <= 0 || width <= 0) {
    alert('Please enter valid positive numbers for length and width');
    return;
  }
  sectionCounter++;
  sections.push({id: `section-${sectionCounter}`, name, length, width, type, joint, jointGroup});
  renderSectionList();
  document.getElementById('quick-name').value = '';
  document.getElementById('quick-length').value = '';
  document.getElementById('quick-width').value = '';
  document.getElementById('quick-joint-group').value = '';
}

function removeSection(sectionId) {
  sections = sections.filter(s => s.id !== sectionId);
  renderSectionList();
}

function renderSectionList() {
  const container = document.getElementById('sections-list');
  let html = `<div class="section-item" style="font-weight:600;background:var(--bg-card)"><div>Section Name</div><div>Length (in)</div><div>Width (in)</div><div>Type</div><div>Joint Status</div><div>Joint Group</div><div>Remove</div></div>`;
  const displaySections = [...sections];
  while (displaySections.length < 10) displaySections.push({id: `empty-${displaySections.length}`, empty: true});
  displaySections.forEach(section => {
    if (section.empty) {
      html += `<div class="section-item" style="opacity:0.3"><input type="text" placeholder="Empty slot" disabled><input type="number" placeholder="-" disabled><input type="number" placeholder="-" disabled><select disabled><option>-</option></select><select disabled><option>-</option></select><input type="text" placeholder="-" disabled><button class="remove-btn" disabled>×</button></div>`;
    } else {
      html += `<div class="section-item"><input type="text" value="${section.name}" onchange="updateSectionName('${section.id}',this.value)"><input type="number" value="${section.length}" min="1" step="0.1" onchange="updateSectionValue('${section.id}','length',this.value)"><input type="number" value="${section.width}" min="1" step="0.1" onchange="updateSectionValue('${section.id}','width',this.value)"><select onchange="updateSectionValue('${section.id}','type',this.value)"><option value="countertop" ${section.type==='countertop'?'selected':''}>Countertop</option><option value="island" ${section.type==='island'?'selected':''}>Island</option><option value="bartop" ${section.type==='bartop'?'selected':''}>Bartop</option><option value="backsplash-4" ${section.type==='backsplash-4'?'selected':''}>4" Backsplash</option><option value="backsplash-full" ${section.type==='backsplash-full'?'selected':''}>Full Backsplash</option></select><select onchange="updateSectionValue('${section.id}','joint',this.value)"><option value="standalone" ${section.joint==='standalone'?'selected':''}>Standalone</option><option value="jointed" ${section.joint==='jointed'?'selected':''}>Jointed</option></select><input type="text" value="${section.jointGroup||''}" placeholder="Group" onchange="updateSectionValue('${section.id}','jointGroup',this.value)"><button class="remove-btn" onclick="removeSection('${section.id}')">×</button></div>`;
    }
  });
  container.innerHTML = html;
}

function updateSectionName(sectionId, newName) {
  const section = sections.find(s => s.id === sectionId);
  if (section) section.name = newName;
}

function updateSectionValue(sectionId, property, value) {
  const section = sections.find(s => s.id === sectionId);
  if (section) {
    if (property === 'length' || property === 'width') {
      section[property] = parseFloat(value) || 0;
    } else {
      section[property] = value;
    }
  }
}

function findBestStone(availableStones, needLength, needWidth) {
  const fittingStones = availableStones.filter(stone => 
    (stone.size_L_in >= needLength && stone.size_W_in >= needWidth) ||
    (stone.size_L_in >= needWidth && stone.size_W_in >= needLength)
  );
  if (fittingStones.length === 0) return {found: false, message: `No stone available for ${needLength}" × ${needWidth}"`};
  fittingStones.sort((a, b) => {
    const wasteA = (a.size_L_in * a.size_W_in) - (needLength * needWidth);
    const wasteB = (b.size_L_in * b.size_W_in) - (needLength * needWidth);
    if (wasteA !== wasteB) return wasteA - wasteB;
    return (a.size_L_in * a.size_W_in) - (b.size_L_in * b.size_W_in);
  });
  return {found: true, stone: fittingStones[0]};
}

function findBestStoneWithDepth(availableStones, needLength, needWidth, requiredDepth) {
  const fittingStones = availableStones.filter(stone => 
    stone.size_W_in === requiredDepth && stone.size_L_in >= needLength
  );
  if (fittingStones.length === 0) return {found: false, message: `No ${requiredDepth}" depth stone available`};
  fittingStones.sort((a, b) => (a.size_L_in - needLength) - (b.size_L_in - needLength));
  return {found: true, stone: fittingStones[0]};
}

function calculateAll() {
  const material = document.getElementById('material').value;
  const stoneColor = document.getElementById('stone-color').value;
  const edgeType = document.getElementById('edge-type').value;
  const kitchenSinkType = document.getElementById('kitchen-sink-type').value;
  const kitchenSinkQty = parseInt(document.getElementById('kitchen-sink-qty').value) || 0;
  const bathroomSinkQty = parseInt(document.getElementById('bathroom-sink-qty').value) || 0;
  if (!material || !stoneColor || !edgeType) {alert('Please select material, stone color, and edge type');return;}
  if (sections.length === 0) {alert('Please add at least one section');return;}
  const availableStones = stoneData[material] ? stoneData[material].filter(stone => stone.color === stoneColor) : [];
  if (availableStones.length === 0) {alert(`No stone pieces available for ${material} - ${stoneColor}`);return;}
  const isNaturalStone = ['Granite','Marble','Quartzite'].includes(material);
  const jointGroups = {};
  const standaloneSections = [];
  sections.forEach(section => {
    if (section.joint === 'jointed' && section.jointGroup) {
      if (!jointGroups[section.jointGroup]) jointGroups[section.jointGroup] = [];
      jointGroups[section.jointGroup].push(section);
    } else standaloneSections.push(section);
  });
  const usedStones = [];
  let totalInputSqFt = 0;
  const plywoodPieces = [];
  for (const [groupName, groupSections] of Object.entries(jointGroups)) {
    if (isNaturalStone) {
      const maxLength = Math.max(...groupSections.map(s => s.length));
      const maxWidth = Math.max(...groupSections.map(s => s.width));
      const bestStone = findBestStone(availableStones, maxLength, maxWidth);
      if (!bestStone.found) {alert(`Joint Group "${groupName}": ${bestStone.message}`);continue;}
      const requiredDepth = bestStone.stone.size_W_in;
      const totalLengthNeeded = groupSections.reduce((sum, s) => sum + s.length, 0);
      if (totalLengthNeeded <= bestStone.stone.size_L_in) {
        const stoneObj = {stone: bestStone.stone, usedFor: groupSections.map(s => s.name), remainingLength: bestStone.stone.size_L_in - totalLengthNeeded, remainingWidth: requiredDepth};
        usedStones.push(stoneObj);
        groupSections.forEach(section => {
          totalInputSqFt += (section.length * section.width) / 144;
          if (section.type !== 'backsplash-4' && section.type !== 'backsplash-full') {
            plywoodPieces.push({name: section.name, length: Math.max(1, section.length - 2), width: Math.max(1, section.width - 3)});
          }
        });
      } else {
        groupSections.forEach(section => {
          const stone = findBestStoneWithDepth(availableStones, section.length, section.width, requiredDepth);
          if (!stone.found) {alert(`${section.name}: ${stone.message}`);return;}
          const stoneObj = {stone: stone.stone, usedFor: [section.name], remainingLength: stone.stone.size_L_in - section.length, remainingWidth: requiredDepth};
          usedStones.push(stoneObj);
          totalInputSqFt += (section.length * section.width) / 144;
          if (section.type !== 'backsplash-4' && section.type !== 'backsplash-full') {
            plywoodPieces.push({name: section.name, length: Math.max(1, section.length - 2), width: Math.max(1, section.width - 3)});
          }
        });
      }
    } else {
      groupSections.forEach(section => {
        const stone = findBestStone(availableStones, section.length, section.width);
        if (!stone.found) {alert(`${section.name}: ${stone.message}`);return;}
        const stoneObj = {stone: stone.stone, usedFor: [section.name], remainingLength: stone.stone.size_L_in - section.length, remainingWidth: stone.stone.size_W_in};
        usedStones.push(stoneObj);
        totalInputSqFt += (section.length * section.width) / 144;
        if (section.type !== 'backsplash-4' && section.type !== 'backsplash-full') {
          plywoodPieces.push({name: section.name, length: Math.max(1, section.length - 2), width: Math.max(1, section.width - 3)});
        }
      });
    }
  }
  standaloneSections.sort((a, b) => (b.length * b.width) - (a.length * a.width));
  const widthGroups = {};
  standaloneSections.forEach(section => {
    const key = section.width;
    if (!widthGroups[key]) widthGroups[key] = [];
    widthGroups[key].push(section);
  });
  for (const [width, widthSections] of Object.entries(widthGroups)) {
    let currentStone = null;
    widthSections.forEach(section => {
      let fitted = false;
      if (currentStone && (currentStone.remainingLength >= section.length && currentStone.remainingWidth >= section.width)) {
        currentStone.usedFor.push(section.name);
        currentStone.remainingLength -= section.length;
        totalInputSqFt += (section.length * section.width) / 144;
        if (section.type !== 'backsplash-4' && section.type !== 'backsplash-full') {
          plywoodPieces.push({name: section.name, length: Math.max(1, section.length - 2), width: Math.max(1, section.width - 3)});
        }
        fitted = true;
      }
      if (!fitted) {
        for (let i = 0; i < usedStones.length; i++) {
          const stoneObj = usedStones[i];
          if (stoneObj.remainingLength >= section.length && stoneObj.remainingWidth >= section.width) {
            stoneObj.usedFor.push(section.name);
            stoneObj.remainingLength -= section.length;
            totalInputSqFt += (section.length * section.width) / 144;
            if (section.type !== 'backsplash-4' && section.type !== 'backsplash-full') {
              plywoodPieces.push({name: section.name, length: Math.max(1, section.length - 2), width: Math.max(1, section.width - 3)});
            }
            fitted = true;
            break;
          }
        }
      }
      if (!fitted) {
        const stone = findBestStone(availableStones, section.length, section.width);
        if (!stone.found) {alert(`${section.name}: ${stone.message}`);return;}
        const stoneObj = {stone: stone.stone, usedFor: [section.name], remainingLength: stone.stone.size_L_in - section.length, remainingWidth: stone.stone.size_W_in};
        usedStones.push(stoneObj);
        currentStone = stoneObj;
        totalInputSqFt += (section.length * section.width) / 144;
        if (section.type !== 'backsplash-4' && section.type !== 'backsplash-full') {
          plywoodPieces.push({name: section.name, length: Math.max(1, section.length - 2), width: Math.max(1, section.width - 3)});
        }
      }
    });
  }
  let totalStoneSqFt = 0;
  usedStones.forEach(stoneObj => {totalStoneSqFt += (stoneObj.stone.size_L_in * stoneObj.stone.size_W_in) / 144;});
  plywoodPieces.sort((a, b) => (b.length * b.width) - (a.length * a.width));
  const sheets = [];
  plywoodPieces.forEach(piece => {
    let placed = false;
    for (let sheet of sheets) {
      if (piece.length <= (96 - sheet.usedLength) && piece.width <= sheet.maxWidth) {
        sheet.pieces.push(piece);
        sheet.usedLength += piece.length;
        placed = true;
        break;
      }
    }
    if (!placed) {
      sheets.push({maxWidth: 48, maxLength: 96, usedLength: piece.length, pieces: [piece]});
    }
  });
  let plywoodSheets = sheets.length;
  const plywoodLeftovers = [];
  sheets.forEach((sheet, idx) => {
    const leftoverLength = 96 - sheet.usedLength;
    if (leftoverLength > 0) {
      plywoodLeftovers.push({sheet: idx + 1, size: `${leftoverLength}" × ${sheet.maxWidth}"`, sqft: ((leftoverLength * sheet.maxWidth) / 144).toFixed(2)});
    }
  });
  plywoodSheets = Math.max(1, plywoodSheets);
  const kitchenSinkPrice = kitchenSinkType === 'free-kitchen' ? 180 : kitchenSinkType === 'handmade-kitchen' ? 275 : kitchenSinkType === 'handmade-workstation' ? 320 : 0;
  const totalKitchenSinkCost = kitchenSinkPrice * kitchenSinkQty;
  const totalBathroomSinkCost = 80 * bathroomSinkQty;
  const totalSinkCost = totalKitchenSinkCost + totalBathroomSinkCost;
  const plywoodCost = plywoodSheets * 70;
  const edgeCost = Math.ceil(totalInputSqFt) * (edgeType === 'basic' ? 14 : 16);
  const grandTotal = edgeCost + totalSinkCost + plywoodCost;
  const results = {material, stoneColor, edgeType, edgePrice: edgeType === 'basic' ? 14 : 16, kitchenSinkQty, bathroomSinkQty, stones: usedStones, totals: {inputSqFt: totalInputSqFt, inputSqFtRounded: Math.ceil(totalInputSqFt), stoneSqFt: totalStoneSqFt, totalWaste: totalStoneSqFt - totalInputSqFt, stonesPieces: usedStones.length, plywoodSheets, edgeCost, totalKitchenSinkCost, totalBathroomSinkCost, totalSinkCost, plywoodCost, grandTotal}, plywoodLeftovers};
  displayResults(results);
  displayPricingBreakdown(results);
  currentResults = results;
}

function displayResults(results) {
  let html = `<div class="summary-grid"><div class="summary-item"><div class="summary-value">${results.totals.inputSqFtRounded}</div><div class="summary-label">Rounded Sq Ft for Pricing</div></div><div class="summary-item"><div class="summary-value">${results.totals.stoneSqFt.toFixed(1)}</div><div class="summary-label">Total Stone Sq Ft</div></div><div class="summary-item"><div class="summary-value">${results.totals.totalWaste.toFixed(1)}</div><div class="summary-label">Total Waste Sq Ft</div></div><div class="summary-item"><div class="summary-value">$${results.totals.grandTotal.toFixed(0)}</div><div class="summary-label">Project Total</div></div></div><div class="pieces-summary"><h3>Stone Pieces Required</h3>`;
  const stoneSizeCounts = {};
  results.stones.forEach(stoneObj => {
    const size = `${stoneObj.stone.size_L_in}" × ${stoneObj.stone.size_W_in}"`;
    stoneSizeCounts[size] = (stoneSizeCounts[size] || 0) + 1;
  });
  html += `<p style="color:var(--text-secondary);margin-bottom:1rem;">`;
  const sizeEntries = Object.entries(stoneSizeCounts);
  sizeEntries.forEach(([size, count], index) => {
    html += `<strong>${count} × ${size}</strong>`;
    if (index < sizeEntries.length - 1) html += `, `;
  });
  html += `</p>`;
  results.stones.forEach((stoneObj, idx) => {
    const stone = stoneObj.stone;
    const stoneSize = `${stone.size_L_in}" × ${stone.size_W_in}"`;
    const leftoverSize = `${stoneObj.remainingLength}" × ${stoneObj.remainingWidth}"`;
    const leftoverSqFt = (stoneObj.remainingLength * stoneObj.remainingWidth / 144).toFixed(2);
    html += `<div class="piece-tag" style="display:block;margin-bottom:1rem;"><div><strong>Stone ${idx + 1}:</strong> ${stoneSize}</div><div class="stone-usage"><div class="usage-item">Used for: ${stoneObj.usedFor.join(', ')}</div><div class="usage-item">Leftover: ${leftoverSize} (${leftoverSqFt} sq ft)</div></div></div>`;
  });
  html += `</div><div class="plywood-summary"><h3>Plywood Requirements</h3><p style="color:var(--text-secondary);margin-bottom:1rem;"><strong>${results.totals.plywoodSheets}</strong> sheets of 48" × 96" plywood @ $70/sheet = <strong>$${results.totals.plywoodCost}</strong></p><h4 style="margin-top:1rem;margin-bottom:0.5rem;">Plywood Leftovers:</h4>`;
  if (results.plywoodLeftovers && results.plywoodLeftovers.length > 0) {
    html += `<div class="plywood-list">`;
    results.plywoodLeftovers.forEach(leftover => {
      html += `<div class="plywood-tag">Sheet ${leftover.sheet}: ${leftover.size} (${leftover.sqft} sq ft)</div>`;
    });
    html += `</div>`;
  } else {
    html += `<p style="color:var(--text-muted);font-size:0.9rem;">No leftover plywood</p>`;
  }
  html += `</div>`;
  document.getElementById('results').innerHTML = html;
}

function displayPricingBreakdown(results) {
  const kitchenSinkInfo = results.kitchenSinkQty > 0 ? ` (${results.kitchenSinkQty}x)` : '';
  const bathroomSinkInfo = results.bathroomSinkQty > 0 ? ` (${results.bathroomSinkQty}x)` : '';
  let breakdown = `<div class="pricing-line"><span class="label">Edge Work (${results.totals.inputSqFtRounded} sq ft × $${results.edgePrice})</span><span class="value">${results.totals.edgeCost.toFixed(2)}</span></div>`;
  if (results.totals.totalKitchenSinkCost > 0) {
    breakdown += `<div class="pricing-line"><span class="label">Kitchen Sink Cutouts${kitchenSinkInfo}</span><span class="value">${results.totals.totalKitchenSinkCost.toFixed(2)}</span></div>`;
  }
  if (results.totals.totalBathroomSinkCost > 0) {
    breakdown += `<div class="pricing-line"><span class="label">Bathroom Sink Cutouts${bathroomSinkInfo}</span><span class="value">${results.totals.totalBathroomSinkCost.toFixed(2)}</span></div>`;
  }
  breakdown += `<div class="pricing-line"><span class="label">Plywood (${results.totals.plywoodSheets} sheets)</span><span class="value">${results.totals.plywoodCost.toFixed(2)}</span></div><div class="pricing-line"><span class="label">Subtotal</span><span class="value">${results.totals.grandTotal.toFixed(2)}</span></div>`;
  document.getElementById('pricing-breakdown').innerHTML = breakdown;
  updateFinalTotal(results.totals.grandTotal);
  ['customer-sink', 'oversize-fee', 'added-fabrication'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.removeEventListener('input', updateFinalTotalHandler);
      element.addEventListener('input', updateFinalTotalHandler);
    }
  });
}

function updateFinalTotalHandler() {
  if (currentResults) updateFinalTotal(currentResults.totals.grandTotal);
}

function updateFinalTotal(baseTotal) {
  const customerSink = parseFloat(document.getElementById('customer-sink').value) || 0;
  const oversizeFee = parseFloat(document.getElementById('oversize-fee').value) || 0;
  const addedFabrication = parseFloat(document.getElementById('added-fabrication').value) || 0;
  const finalTotal = baseTotal + customerSink + oversizeFee + addedFabrication;
  const finalTotalElement = document.getElementById('final-total');
  if (finalTotalElement) {
    finalTotalElement.textContent = `$${finalTotal.toFixed(2)}`;
  }
}
