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
  
  // Group sections
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
  const processedSections = [];

  // Process jointed groups
  for (const [groupName, groupSections] of Object.entries(jointGroups)) {
    if (isNaturalStone) {
      // Natural stone: all must use same depth
      const maxLength = Math.max(...groupSections.map(s => s.length));
      const maxWidth = Math.max(...groupSections.map(s => s.width));
      
      const bestStone = findBestStone(availableStones, maxLength, maxWidth);
      if (!bestStone.found) {
        alert(`Joint Group "${groupName}": ${bestStone.message}`);
        continue;
      }

      const requiredDepth = bestStone.stone.size_W_in;

      groupSections.forEach(section => {
        const stone = findBestStoneWithDepth(availableStones, section.length, section.width, requiredDepth);
        
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

        processedSections.push({
          ...section,
          stoneIndex: usedStones.length - 1,
          fromLeftover: false
        });
      });
    } else {
      // Quartz: can use different sizes
      groupSections.forEach(section => {
        const stone = findBestStone(availableStones, section.length, section.width);
        
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

        processedSections.push({
          ...section,
          stoneIndex: usedStones.length - 1,
          fromLeftover: false
        });
      });
    }
  }

  // Process standalone sections - try leftovers first
  standaloneSections.forEach(section => {
    let fitted = false;

    // Try to fit in existing stone leftovers
    for (let i = 0; i < usedStones.length; i++) {
      const stoneObj = usedStones[i];
      
      if (stoneObj.remainingLength >= section.length && stoneObj.remainingWidth >= section.width) {
        // This leftover fits!
        stoneObj.usedFor.push(section.name);
        stoneObj.remainingLength -= section.length;
        
        totalInputSqFt += (section.length * section.width) / 144;

        if (section.type !== 'backsplash-4' && section.type !== 'backsplash-full') {
          plywoodPieces.push({
            name: section.name,
            length: Math.max(1, section.length - 2),
            width: Math.max(1, section.width - 3)
          });
        }

        processedSections.push({
          ...section,
          stoneIndex: i,
          fromLeftover: true
        });

        fitted = true;
        break;
      }
    }

    // If no leftover worked, get new stone
    if (!fitted) {
      const stone = findBestStone(availableStones, section.length, section.width);
      
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

      processedSections.push({
        ...section,
        stoneIndex: usedStones.length - 1,
        fromLeftover: false
      });
    }
  });

  // Calculate stone square footage
  let totalStoneSqFt = 0;
  usedStones.forEach(stoneObj => {
    totalStoneSqFt += (stoneObj.stone.size_L_in * stoneObj.stone.size_W_in) / 144;
  });

  // Plywood calculation
  let sheets = [];
  plywoodPieces.sort((a, b) => b.width - a.width);

  plywoodPieces.forEach(piece => {
    let placed = false;
    for (let sheet of sheets) {
      if (sheet.usedWidth + piece.width <= 48) {
        sheet.usedWidth += piece.width;
        sheet.totalLength += piece.length;
        placed = true;
        break;
      }
    }
    if (!placed) {
      sheets.push({
        usedWidth: piece.width,
        totalLength: piece.length
      });
    }
  });

  let plywoodSheets = 0;
  const plywoodLeftovers = [];
  
  sheets.forEach((sheet, idx) => {
    if (sheet.totalLength <= 150) {
      plywoodSheets++;
      const leftoverLength = 96 - sheet.totalLength;
      if (leftoverLength > 0) {
        plywoodLeftovers.push({
          sheet: idx + 1,
          size: `${leftoverLength}" × ${sheet.usedWidth}"`,
          sqft: ((leftoverLength * sheet.usedWidth) / 144).toFixed(2)
        });
      }
    } else {
      plywoodSheets += Math.ceil(sheet.totalLength / 96);
    }
  });

  plywoodSheets = Math.max(1, plywoodSheets);

  // Calculate costs
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
