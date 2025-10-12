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
  sections.push({
    id: `section-${sectionCounter}`,
    name: name,
    length: length,
    width: width,
    type: type,
    joint: joint,
    jointGroup: jointGroup
  });

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
  let html = `
    <div class="section-item" style="font-weight: 600; background: var(--bg-card);">
      <div>Section Name</div>
      <div>Length (in)</div>
      <div>Width (in)</div>
      <div>Type</div>
      <div>Joint Status</div>
      <div>Joint Group</div>
      <div>Remove</div>
    </div>
  `;

  const displaySections = [...sections];
  while (displaySections.length < 10) {
    displaySections.push({ id: `empty-${displaySections.length}`, empty: true });
  }

  displaySections.forEach(section => {
    if (section.empty) {
      html += `
        <div class="section-item" style="opacity: 0.3;">
          <input type="text" placeholder="Empty slot" disabled>
          <input type="number" placeholder="-" disabled>
          <input type="number" placeholder="-" disabled>
          <select disabled><option>-</option></select>
          <select disabled><option>-</option></select>
          <input type="text" placeholder="-" disabled>
          <button class="remove-btn" disabled>×</button>
        </div>
      `;
    } else {
      html += `
        <div class="section-item">
          <input type="text" value="${section.name}" onchange="updateSectionName('${section.id}', this.value)">
          <input type="number" value="${section.length}" min="1" step="0.1" onchange="updateSectionValue('${section.id}', 'length', this.value)">
          <input type="number" value="${section.width}" min="1" step="0.1" onchange="updateSectionValue('${section.id}', 'width', this.value)">
          <select onchange="updateSectionValue('${section.id}', 'type', this.value)">
            <option value="countertop" ${section.type === 'countertop' ? 'selected' : ''}>Countertop</option>
            <option value="island" ${section.type === 'island' ? 'selected' : ''}>Island</option>
            <option value="bartop" ${section.type === 'bartop' ? 'selected' : ''}>Bartop</option>
            <option value="backsplash-4" ${section.type === 'backsplash-4' ? 'selected' : ''}>4" Backsplash</option>
            <option value="backsplash-full" ${section.type === 'backsplash-full' ? 'selected' : ''}>Full Backsplash</option>
          </select>
          <select onchange="updateSectionValue('${section.id}', 'joint', this.value)">
            <option value="standalone" ${section.joint === 'standalone' ? 'selected' : ''}>Standalone</option>
            <option value="jointed" ${section.joint === 'jointed' ? 'selected' : ''}>Jointed</option>
          </select>
          <input type="text" value="${section.jointGroup || ''}" placeholder="Group" onchange="updateSectionValue('${section.id}', 'jointGroup', this.value)">
          <button class="remove-btn" onclick="removeSection('${section.id}')">×</button>
        </div>
      `;
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

function findBestStone(availableStones, needLength, needWidth, preferredType = null) {
  let fittingStones = availableStones.filter(stone => 
    (stone.size_L_in >= needLength && stone.size_W_in >= needWidth) ||
    (stone.size_L_in >= needWidth && stone.size_W_in >= needLength)
  );

  // Filter by type if specified
  if (preferredType) {
    const typedStones = fittingStones.filter(stone => 
      stone.type.toLowerCase() === preferredType.toLowerCase()
    );
    if (typedStones.length > 0) {
      fittingStones = typedStones;
    }
  }

  if (fittingStones.length === 0) {
    return {
      found: false,
      message: `No stone available for ${needLength}" × ${needWidth}"`
    };
  }

  fittingStones.sort((a, b) => {
    // Prefer SMALLEST stone that fits - minimize waste
    const sizeA = a.size_L_in * a.size_W_in;
    const sizeB = b.size_L_in * b.size_W_in;
    
    // Primary: prefer smaller stones (less waste, more economical)
    if (sizeA !== sizeB) return sizeA - sizeB;
    
    // Secondary: prefer shorter length (easier to handle)
    if (a.size_L_in !== b.size_L_in) return a.size_L_in - b.size_L_in;
    
    // Tertiary: prefer narrower width
    return a.size_W_in - b.size_W_in;
  });

  return { found: true, stone: fittingStones[0] };
}

function findBestStoneWithDepth(availableStones, needLength, needWidth, requiredDepth) {
  const fittingStones = availableStones.filter(stone => 
    stone.size_W_in === requiredDepth && stone.size_L_in >= needLength
  );

  if (fittingStones.length === 0) {
    return {
      found: false,
      message: `No ${requiredDepth}" depth stone available`
    };
  }

  fittingStones.sort((a, b) => {
    const wasteA = a.size_L_in - needLength;
    const wasteB = b.size_L_in - needLength;
    return wasteA - wasteB;
  });

  return { found: true, stone: fittingStones[0] };
}

function calculateAll() {
  const material = document.getElementById('material').value;
  const stoneColor = document.getElementById('stone-color').value;
  const edgeType = document.getElementById('edge-type').value;
  const kitchenSinkType = document.getElementById('kitchen-sink-type').value;
  const kitchenSinkQty = parseInt(document.getElementById('kitchen-sink-qty').value) || 0;
  const bathroomSinkQty = parseInt(document.getElementById('bathroom-sink-qty').value) || 0;

  if (!material || !stoneColor || !edgeType) {
    alert('Please select material, stone color, and edge type');
    return;
  }
  if (sections.length === 0) {
    alert('Please add at least one section');
    return;
  }

  const availableStones = stoneData[material] ? 
    stoneData[material].filter(stone => stone.color === stoneColor) : [];

  if (availableStones.length === 0) {
    alert(`No stone pieces available for ${material} - ${stoneColor}`);
    return;
  }

  const isNaturalStone = ['Granite', 'Marble', 'Quartzite'].includes(material);
  
  const jointGroups = {};
  const standaloneSections = [];

  sections.forEach(section => {
    if (section.joint === 'jointed' && section.jointGroup) {
      if (!jointGroups[section.jointGroup]) {
        jointGroups[section.jointGroup] = [];
      }
      jointGroups[section.jointGroup].push(section);
    } else {
      standaloneSections.push(section);
    }
  });

  const usedStones = [];
  let totalInputSqFt = 0;
  const plywoodPieces = [];

  // Process jointed groups first
  for (const [groupName, groupSections] of Object.entries(jointGroups)) {
    if (isNaturalStone) {
      // For natural stone (Granite/Marble/Quartzite), all jointed pieces must use EXACT SAME stone size
      
      // Find the largest section in the group
      const largestSection = groupSections.reduce((max, section) => 
        (section.length * section.width > max.length * max.width) ? section : max
      );
      
      const sectionType = groupSections[0].type;
      
      // Find the best stone for the largest section
      const bestStone = findBestStone(availableStones, largestSection.length, largestSection.width, sectionType);
      if (!bestStone.found) {
        alert(`Joint Group "${groupName}": ${bestStone.message}`);
        continue;
      }

      // Get total length needed for all sections
      const totalLengthNeeded = groupSections.reduce((sum, s) => sum + s.length, 0);

      // Try to fit all sections on one stone
      if (totalLengthNeeded <= bestStone.stone.size_L_in) {
        // All sections fit on ONE stone
        const stoneObj = {
          stone: bestStone.stone,
          usedFor: groupSections.map(s => s.name),
          remainingLength: bestStone.stone.size_L_in - totalLengthNeeded,
          remainingWidth: bestStone.stone.size_W_in
        };

        usedStones.push(stoneObj);

        groupSections.forEach(section => {
          totalInputSqFt += (section.length * section.width) / 144;

          if (section.type !== 'backsplash-4' && section.type !== 'backsplash-full') {
            plywoodPieces.push({
              name: section.name,
              length: Math.max(1, section.length - 2),
              width: Math.max(1, section.width - 3)
            });
          }
        });
      } else {
        // Need separate stones for each section - ALL must be the SAME SIZE as bestStone
        groupSections.forEach(section => {
          // Use the EXACT same stone size for all jointed pieces
          const stoneObj = {
            stone: bestStone.stone,
            usedFor: [section.name],
            remainingLength: bestStone.stone.size_L_in - section.length,
            remainingWidth: bestStone.stone.size_W_in
          };

          usedStones.push(stoneObj);
          totalInputSqFt += (section.length * section.width) / 144;

          if (section.type !== 'backsplash-4' && section.type !== 'backsplash-full') {
            plywoodPieces.push({
              name: section.name,
              length: Math.max(1, section.length - 2),
              width: Math.max(1, section.width - 3)
            });
          }
        });
      }
    } else {
      // Quartz - can mix sizes freely, no same-size requirement
      groupSections.forEach(section => {
        const stone = findBestStone(availableStones, section.length, section.width, section.type);
        
        if (!stone.found) {
          alert(`${section.name}: ${stone.message}`);
          return;
        }

        const stoneObj = {
          stone: stone.stone,
          usedFor: [section.name],
          remainingLength: stone.stone.size_L_in - section.length,
          remainingWidth: stone.stone.size_W_in
        };

        usedStones.push(stoneObj);
        totalInputSqFt += (section.length * section.width) / 144;

        if (section.type !== 'backsplash-4' && section.type !== 'backsplash-full') {
          plywoodPieces.push({
            name: section.name,
            length: Math.max(1, section.length - 2),
            width: Math.max(1, section.width - 3)
          });
        }
      });
    }
  }

  // Sort standalone sections by size (largest first)
  standaloneSections.sort((a, b) => (b.length * b.width) - (a.length * a.width));

  // Separate islands from countertops - islands can use narrower stones
  const islandSections = standaloneSections.filter(s => s.type === 'island');
  const countertopSections = standaloneSections.filter(s => s.type !== 'island' && s.type !== 'backsplash-4' && s.type !== 'backsplash-full');

  // Group countertop sections by same width for potential combining
  const widthGroups = {};
  countertopSections.forEach(section => {
    const key = section.width;
    if (!widthGroups[key]) widthGroups[key] = [];
    widthGroups[key].push(section);
  });

  // Process each width group - optimize combinations
  for (const [width, widthSections] of Object.entries(widthGroups)) {
    let remaining = [...widthSections];
    
    while (remaining.length > 0) {
      // Start with the largest remaining section
      const section = remaining.shift();
      let totalLength = section.length;
      let sectionsToFit = [section];
      
      // Try to combine with other remaining sections that have the same width
      for (let i = remaining.length - 1; i >= 0; i--) {
        const potentialLength = totalLength + remaining[i].length;
        
        // Check if there's a stone that can fit this combination
        const testStone = findBestStone(availableStones, potentialLength, parseFloat(width), section.type);
        if (testStone.found) {
          totalLength = potentialLength;
          sectionsToFit.push(remaining[i]);
          remaining.splice(i, 1);
        }
      }
      
      // Get the best stone for all fitted sections
      const stone = findBestStone(availableStones, totalLength, parseFloat(width), section.type);
      
      if (!stone.found) {
        alert(`${section.name}: ${stone.message}`);
        continue;
      }

      const stoneObj = {
        stone: stone.stone,
        usedFor: sectionsToFit.map(s => s.name),
        remainingLength: stone.stone.size_L_in - totalLength,
        remainingWidth: stone.stone.size_W_in
      };

      usedStones.push(stoneObj);
      
      sectionsToFit.forEach(s => {
        totalInputSqFt += (s.length * s.width) / 144;

        if (s.type !== 'backsplash-4' && s.type !== 'backsplash-full') {
          plywoodPieces.push({
            name: s.name,
            length: Math.max(1, s.length - 2),
            width: Math.max(1, s.width - 3)
          });
        }
      });
    }
  }

  // Process island sections separately - they can use half-depth stones
  islandSections.forEach(section => {
    // Determine the correct stone type based on section type
    let stoneType = section.type;
    if (section.type === 'island') {
      stoneType = 'island';
    } else if (section.type === 'bartop') {
      stoneType = 'bartop';
    }
    
    // Try to find appropriate stone by type
    let stone = findBestStone(availableStones, section.length, section.width, stoneType);
    
    // If no stone of that type available, try without type filter
    if (!stone.found) {
      stone = findBestStone(availableStones, section.length, section.width);
    }
    
    if (!stone.found) {
      alert(`${section.name}: ${stone.message}`);
      return;
    }

    const stoneObj = {
      stone: stone.stone,
      usedFor: [section.name],
      remainingLength: stone.stone.size_L_in - section.length,
      remainingWidth: stone.stone.size_W_in
    };

    usedStones.push(stoneObj);
    totalInputSqFt += (section.length * section.width) / 144;

    // Islands still need plywood
    plywoodPieces.push({
      name: section.name,
      length: Math.max(1, section.length - 2),
      width: Math.max(1, section.width - 3)
    });
  });

  let totalStoneSqFt = 0;
  usedStones.forEach(stoneObj => {
    totalStoneSqFt += (stoneObj.stone.size_L_in * stoneObj.stone.size_W_in) / 144;
  });

  // Improved plywood packing with 2D bin packing
  plywoodPieces.sort((a, b) => {
    // Sort by area (largest first), then by longest dimension
    const areaA = a.length * a.width;
    const areaB = b.length * b.width;
    if (areaA !== areaB) return areaB - areaA;
    return Math.max(b.length, b.width) - Math.max(a.length, a.width);
  });

  const sheets = [];
  
  plywoodPieces.forEach(piece => {
    let placed = false;

    // Try both orientations of the piece
    const orientations = [
      { length: piece.length, width: piece.width, rotated: false },
      { length: piece.width, width: piece.length, rotated: true }
    ];

    // Try to fit on existing sheets
    for (let sheet of sheets) {
      if (placed) break;

      for (let orientation of orientations) {
        // Try to find space in existing rows
        let canFit = false;
        let targetRow = -1;

        for (let i = 0; i < sheet.rows.length; i++) {
          const row = sheet.rows[i];
          const remainingLength = 96 - row.usedLength;
          const remainingWidth = 48 - row.rowWidth;

          // Check if piece fits in current row (next to existing pieces)
          if (orientation.length <= remainingLength && orientation.width <= row.rowWidth) {
            row.pieces.push({...piece, orientation});
            row.usedLength += orientation.length;
            placed = true;
            canFit = true;
            break;
          }
          // Check if we can start a new row below
          else if (orientation.length <= 96 && orientation.width <= remainingWidth && targetRow === -1) {
            targetRow = i;
          }
        }

        // If we found space for a new row, add it
        if (!canFit && targetRow !== -1 && !placed) {
          const totalUsedWidth = sheet.rows.reduce((sum, r) => sum + r.rowWidth, 0);
          if (totalUsedWidth + orientation.width <= 48) {
            sheet.rows.push({
              pieces: [{...piece, orientation}],
              usedLength: orientation.length,
              rowWidth: orientation.width
            });
            placed = true;
            break;
          }
        }

        if (placed) break;
      }
    }

    // If not placed on any existing sheet, create new sheet
    if (!placed) {
      // Try both orientations and pick the better one (prefer longer pieces along the 96" dimension)
      const betterOrientation = piece.length >= piece.width 
        ? { length: piece.length, width: piece.width, rotated: false }
        : { length: piece.width, width: piece.length, rotated: true };

      sheets.push({
        rows: [{
          pieces: [{...piece, orientation: betterOrientation}],
          usedLength: betterOrientation.length,
          rowWidth: betterOrientation.width
        }]
      });
    }
  });

  let plywoodSheets = sheets.length;
  const plywoodLeftovers = [];

  sheets.forEach((sheet, idx) => {
    const totalUsedWidth = sheet.rows.reduce((sum, row) => sum + row.rowWidth, 0);
    const maxUsedLength = Math.max(...sheet.rows.map(row => row.usedLength));
    
    const leftoverArea = (96 * 48) - sheet.rows.reduce((sum, row) => 
      sum + (row.usedLength * row.rowWidth), 0
    );
    
    if (leftoverArea > 0) {
      plywoodLeftovers.push({
        sheet: idx + 1,
        size: `Various pieces (${totalUsedWidth}" width used of 48")`,
        sqft: (leftoverArea / 144).toFixed(2)
      });
    }
  });

  plywoodSheets = Math.max(1, plywoodSheets);

  const kitchenSinkPrice = kitchenSinkType === 'free-kitchen' ? 180 : 
                         kitchenSinkType === 'handmade-kitchen' ? 275 : 
                         kitchenSinkType === 'handmade-workstation' ? 320 : 0;
  
  const totalKitchenSinkCost = kitchenSinkPrice * kitchenSinkQty;
  const totalBathroomSinkCost = 80 * bathroomSinkQty;
  const totalSinkCost = totalKitchenSinkCost + totalBathroomSinkCost;
  const plywoodCost = plywoodSheets * 70;
  const edgeCost = Math.ceil(totalInputSqFt) * (edgeType === 'basic' ? 14 : 16);
  const grandTotal = edgeCost + totalSinkCost + plywoodCost;

  const results = {
    material: material,
    stoneColor: stoneColor,
    edgeType: edgeType,
    edgePrice: edgeType === 'basic' ? 14 : 16,
    kitchenSinkQty: kitchenSinkQty,
    bathroomSinkQty: bathroomSinkQty,
    stones: usedStones,
    totals: {
      inputSqFt: totalInputSqFt,
      inputSqFtRounded: Math.ceil(totalInputSqFt),
      stoneSqFt: totalStoneSqFt,
      totalWaste: totalStoneSqFt - totalInputSqFt,
      stonesPieces: usedStones.length,
      plywoodSheets: plywoodSheets,
      edgeCost: edgeCost,
      totalKitchenSinkCost: totalKitchenSinkCost,
      totalBathroomSinkCost: totalBathroomSinkCost,
      totalSinkCost: totalSinkCost,
      plywoodCost: plywoodCost,
      grandTotal: grandTotal
    },
    plywoodLeftovers: plywoodLeftovers
  };

  displayResults(results);
  displayPricingBreakdown(results);
  currentResults = results;
}

function displayResults(results) {
  let html = `
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-value">${results.totals.inputSqFtRounded}</div>
        <div class="summary-label">Rounded Sq Ft for Pricing</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${results.totals.stoneSqFt.toFixed(1)}</div>
        <div class="summary-label">Total Stone Sq Ft</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${results.totals.totalWaste.toFixed(1)}</div>
        <div class="summary-label">Total Waste Sq Ft</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">$${results.totals.grandTotal.toFixed(0)}</div>
        <div class="summary-label">Project Total</div>
      </div>
    </div>
  `;
  
  html += `<div class="pieces-summary"><h3>Stone Pieces Required</h3>`;

  const stoneSizeCounts = {};
  results.stones.forEach(stoneObj => {
    const size = `${stoneObj.stone.size_L_in}" × ${stoneObj.stone.size_W_in}"`;
    stoneSizeCounts[size] = (stoneSizeCounts[size] || 0) + 1;
  });

  html += `<p style="color: var(--text-secondary); margin-bottom: 1rem;">`;
  const sizeEntries = Object.entries(stoneSizeCounts);
  sizeEntries.forEach(([size, count], index) => {
    html += `<strong>${count} × ${size}</strong>`;
    if (index < sizeEntries.length - 1) {
      html += `, `;
    }
  });
  html += `</p>`;
  
  results.stones.forEach((stoneObj, idx) => {
    const stone = stoneObj.stone;
    const stoneSize = `${stone.size_L_in}" × ${stone.size_W_in}"`;
    const leftoverSize = `${stoneObj.remainingLength}" × ${stoneObj.remainingWidth}"`;
    const leftoverSqFt = (stoneObj.remainingLength * stoneObj.remainingWidth / 144).toFixed(2);
    
    html += `
      <div class="piece-tag" style="display: block; margin-bottom: 1rem;">
        <div><strong>Stone ${idx + 1}:</strong> ${stoneSize}</div>
        <div class="stone-usage">
          <div class="usage-item">Used for: ${stoneObj.usedFor.join(', ')}</div>
          <div class="usage-item">Leftover: ${leftoverSize} (${leftoverSqFt} sq ft)</div>
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  
  html += `
    <div class="plywood-summary">
      <h3>Plywood Requirements</h3>
      <p style="color: var(--text-secondary); margin-bottom: 1rem;">
        <strong>${results.totals.plywoodSheets}</strong> sheets of 48" × 96" plywood @ $70/sheet = <strong>$${results.totals.plywoodCost}</strong>
      </p>
  `;
  
  html += `<h4 style="margin-top: 1rem; margin-bottom: 0.5rem;">Plywood Leftovers:</h4>`;

  if (results.plywoodLeftovers && results.plywoodLeftovers.length > 0) {
    html += `<div class="plywood-list">`;
    results.plywoodLeftovers.forEach(leftover => {
      html += `<div class="plywood-tag">Sheet ${leftover.sheet}: ${leftover.size} (${leftover.sqft} sq ft)</div>`;
    });
    html += `</div>`;
  } else {
    html += `<p style="color: var(--text-muted); font-size: 0.9rem;">No leftover plywood</p>`;
  }
  
  html += `</div>`;
  
  document.getElementById('results').innerHTML = html;
}

function displayPricingBreakdown(results) {
  const kitchenSinkInfo = results.kitchenSinkQty > 0 ? ` (${results.kitchenSinkQty}x)` : '';
  const bathroomSinkInfo = results.bathroomSinkQty > 0 ? ` (${results.bathroomSinkQty}x)` : '';
  
  let breakdown = `
    <div class="pricing-line">
      <span class="label">Edge Work (${results.totals.inputSqFtRounded} sq ft × $${results.edgePrice})</span>
      <span class="value">${results.totals.edgeCost.toFixed(2)}</span>
    </div>
  `;
  
  if (results.totals.totalKitchenSinkCost > 0) {
    breakdown += `
    <div class="pricing-line">
      <span class="label">Kitchen Sink Cutouts${kitchenSinkInfo}</span>
      <span class="value">${results.totals.totalKitchenSinkCost.toFixed(2)}</span>
    </div>`;
  }
  
  if (results.totals.totalBathroomSinkCost > 0) {
    breakdown += `
    <div class="pricing-line">
      <span class="label">Bathroom Sink Cutouts${bathroomSinkInfo}</span>
      <span class="value">${results.totals.totalBathroomSinkCost.toFixed(2)}</span>
    </div>`;
  }
  
  breakdown += `
    <div class="pricing-line">
      <span class="label">Plywood (${results.totals.plywoodSheets} sheets)</span>
      <span class="value">${results.totals.plywoodCost.toFixed(2)}</span>
    </div>
    <div class="pricing-line">
      <span class="label">Subtotal</span>
      <span class="value">${results.totals.grandTotal.toFixed(2)}</span>
    </div>
  `;
  
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
  if (currentResults) {
    updateFinalTotal(currentResults.totals.grandTotal);
  }
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
