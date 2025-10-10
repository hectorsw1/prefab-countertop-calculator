import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

const StoneCalculator = () => {
  const [materialType, setMaterialType] = useState('Granite');
  const [stoneColor, setStoneColor] = useState('Luna Grey');
  const [edgeType, setEdgeType] = useState('Basic Edge ($14/sq ft)');
  const [kitchenSinkType, setKitchenSinkType] = useState('Free Kitchen Sink ($180)');
  const [kitchenSinkQty, setKitchenSinkQty] = useState(1);
  const [bathroomSinkQty, setBathroomSinkQty] = useState(0);
  const [sections, setSections] = useState([
    { name: 'sink', length: 99, width: 26, type: 'Countertop', jointStatus: 'Jointed', group: 'A' },
    { name: 'L to sink', length: 80, width: 26, type: 'Countertop', jointStatus: 'Jointed', group: 'A' },
    { name: 'L Stove', length: 60, width: 26, type: 'Countertop', jointStatus: 'Standalone', group: '' },
    { name: 'R Stove', length: 37, width: 26, type: 'Countertop', jointStatus: 'Standalone', group: '' },
    { name: 'Bar', length: 71, width: 14, type: 'Bartop', jointStatus: 'Standalone', group: '' },
    { name: 'Section F', length: 99, width: 4, type: '4" Backsplash', jointStatus: 'Standalone', group: '' },
    { name: 'Section G', length: 24, width: 4, type: '4" Backsplash', jointStatus: 'Standalone', group: '' },
    { name: 'Section H', length: 80, width: 4, type: '4" Backsplash', jointStatus: 'Standalone', group: '' },
    { name: 'Section I', length: 24, width: 4, type: '4" Backsplash', jointStatus: 'Standalone', group: '' },
    { name: 'Section J', length: 60, width: 4, type: '4" Backsplash', jointStatus: 'Standalone', group: '' },
    { name: 'Section K', length: 37, width: 4, type: '4" Backsplash', jointStatus: 'Standalone', group: '' }
  ]);
  
  const [newSection, setNewSection] = useState({
    name: '',
    length: '',
    width: '',
    type: '4" Backsplash',
    jointStatus: 'Standalone',
    group: ''
  });

  const [calculatedResults, setCalculatedResults] = useState(null);
  const [customerSinks, setCustomerSinks] = useState(0);
  const [oversizeFee, setOversizeFee] = useState(0);
  const [addedFab, setAddedFab] = useState(0);

  const availableStones = [
    { length: 108, width: 26 },
    { length: 108, width: 14 },
    { length: 108, width: 4 },
    { length: 96, width: 26 },
    { length: 96, width: 14 }
  ];

  const optimizeStoneLayout = (sections, materialType) => {
    const isNaturalStone = ['Granite', 'Marble', 'Quartzite'].includes(materialType);
    const stonesUsed = [];
    
    const groups = {};
    const standalone = [];
    
    sections.forEach(section => {
      if (isNaturalStone && section.jointStatus === 'Jointed' && section.group) {
        if (!groups[section.group]) {
          groups[section.group] = [];
        }
        groups[section.group].push(section);
      } else {
        standalone.push(section);
      }
    });
    
    Object.keys(groups).forEach(groupKey => {
      const groupSections = groups[groupKey];
      const width = groupSections[0].width;
      const totalLength = groupSections.reduce((sum, s) => sum + s.length, 0);
      
      const suitableStones = availableStones
        .filter(stone => stone.width === width)
        .sort((a, b) => b.length - a.length);
      
      if (suitableStones.length > 0) {
        const stoneSize = suitableStones[0];
        const numStones = Math.ceil(totalLength / stoneSize.length);
        
        let remainingLength = totalLength;
        for (let i = 0; i < numStones; i++) {
          const usedLength = Math.min(stoneSize.length, remainingLength);
          const leftoverLength = stoneSize.length - usedLength;
          
          stonesUsed.push({
            size: `${stoneSize.length}×${stoneSize.width}`,
            usedFor: groupSections.map(s => s.name).join(', '),
            leftover: `${leftoverLength}×${stoneSize.width}`,
            leftoverSqFt: (leftoverLength * stoneSize.width) / 144
          });
          
          remainingLength -= usedLength;
        }
      }
    });
    
    const byWidth = {};
    standalone.forEach(section => {
      if (!byWidth[section.width]) {
        byWidth[section.width] = [];
      }
      byWidth[section.width].push(section);
    });
    
    Object.keys(byWidth).sort((a, b) => b - a).forEach(width => {
      const sectionsAtWidth = byWidth[width].sort((a, b) => b.length - a.length);
      
      const suitableStones = availableStones
        .filter(stone => stone.width === parseInt(width))
        .sort((a, b) => b.length - a.length);
      
      if (suitableStones.length === 0) return;
      
      const stoneSize = suitableStones[0];
      
      while (sectionsAtWidth.length > 0) {
        let currentLength = 0;
        const packedSections = [];
        
        for (let i = 0; i < sectionsAtWidth.length; i++) {
          if (currentLength + sectionsAtWidth[i].length <= stoneSize.length) {
            currentLength += sectionsAtWidth[i].length;
            packedSections.push(sectionsAtWidth[i].name);
            sectionsAtWidth.splice(i, 1);
            i--;
          }
        }
        
        const leftoverLength = stoneSize.length - currentLength;
        
        stonesUsed.push({
          size: `${stoneSize.length}×${stoneSize.width}`,
          usedFor: packedSections.join(', '),
          leftover: `${leftoverLength}×${stoneSize.width}`,
          leftoverSqFt: (leftoverLength * stoneSize.width) / 144
        });
      }
    });
    
    return stonesUsed;
  };

  const calculatePlywoodSheets = (sections) => {
    const needsPlywood = sections.filter(s => 
      s.type === 'Countertop' || s.type === 'Bartop'
    );
    
    const totalSqFt = needsPlywood.reduce((sum, s) => 
      sum + (s.length * s.width) / 144, 0
    );
    
    const sheetCapacity = (96 * 48) / 144;
    const sheetsNeeded = Math.ceil(totalSqFt / sheetCapacity);
    
    return {
      count: sheetsNeeded,
      totalSqFt: totalSqFt,
      cost: sheetsNeeded * 70
    };
  };

  const calculateResults = () => {
    const stoneOptimization = optimizeStoneLayout(sections, materialType);
    const plywoodCalc = calculatePlywoodSheets(sections);
    
    const stoneCounts = {};
    stoneOptimization.forEach(stone => {
      stoneCounts[stone.size] = (stoneCounts[stone.size] || 0) + 1;
    });
    
    const totalStoneSqFt = stoneOptimization.reduce((sum, stone) => {
      const [length, width] = stone.size.split('×').map(Number);
      return sum + (length * width) / 144;
    }, 0);
    
    const totalWasteSqFt = stoneOptimization.reduce((sum, stone) => 
      sum + stone.leftoverSqFt, 0
    );
    
    const edgePrice = parseFloat(edgeType.match(/\$(\d+)/)[1]);
    const roundedSqFt = Math.ceil(totalStoneSqFt - totalWasteSqFt);
    const edgeCost = roundedSqFt * edgePrice;
    
    const kitchenSinkPrice = parseFloat(kitchenSinkType.match(/\$(\d+)/)[1]);
    const kitchenSinkCost = kitchenSinkQty * kitchenSinkPrice;
    
    const bathroomSinkCost = bathroomSinkQty * 80;
    
    const subtotal = edgeCost + kitchenSinkCost + bathroomSinkCost + plywoodCalc.cost;
    
    const adjustments = parseFloat(customerSinks) + parseFloat(oversizeFee) + parseFloat(addedFab);
    const projectTotal = subtotal + adjustments;
    
    setCalculatedResults({
      stoneOptimization,
      stoneCounts,
      totalStoneSqFt,
      totalWasteSqFt,
      roundedSqFt,
      edgeCost,
      kitchenSinkCost,
      bathroomSinkCost,
      plywoodCalc,
      subtotal,
      adjustments,
      projectTotal
    });
  };

  const addSection = () => {
    if (newSection.name && newSection.length && newSection.width) {
      setSections([...sections, {
        ...newSection,
        length: parseFloat(newSection.length),
        width: parseFloat(newSection.width)
      }]);
      setNewSection({
        name: '',
        length: '',
        width: '',
        type: '4" Backsplash',
        jointStatus: 'Standalone',
        group: ''
      });
    }
  };

  const removeSection = (index) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const updateSection = (index, field, value) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Stone Prefab Calculator
        </h1>

        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Project Configuration</h2>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm mb-2">Material Type</label>
              <select 
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600 text-white"
              >
                <option value="Granite">Granite</option>
                <option value="Marble">Marble</option>
                <option value="Quartzite">Quartzite</option>
                <option value="Quartz">Quartz</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm mb-2">Stone Color</label>
              <select 
                value={stoneColor}
                onChange={(e) => setStoneColor(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600 text-white"
              >
                <option value="Luna Grey">Luna Grey</option>
                <option value="Carrara White">Carrara White</option>
                <option value="Absolute Black">Absolute Black</option>
                <option value="Calacatta Gold">Calacatta Gold</option>
                <option value="Emperador Brown">Emperador Brown</option>
                <option value="Super White">Super White</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm mb-2">Edge Type</label>
              <select 
                value={edgeType}
                onChange={(e) => setEdgeType(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600 text-white"
              >
                <option value="Basic Edge ($14/sq ft)">Basic Edge ($14/sq ft)</option>
                <option value="Beveled Edge ($18/sq ft)">Beveled Edge ($18/sq ft)</option>
                <option value="Ogee Edge ($22/sq ft)">Ogee Edge ($22/sq ft)</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold mb-3">Kitchen Sinks</h3>
              <div className="mb-3">
                <label className="block text-sm mb-2">Kitchen Sink Type</label>
                <select 
                  value={kitchenSinkType}
                  onChange={(e) => setKitchenSinkType(e.target.value)}
                  className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600"
                >
                  <option>Free Kitchen Sink ($180)</option>
                  <option>Premium Sink ($280)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">Kitchen Sink Quantity</label>
                <input 
                  type="number"
                  value={kitchenSinkQty}
                  onChange={(e) => setKitchenSinkQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600"
                />
              </div>
            </div>

            <div className="border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-purple-400 font-semibold mb-3">Bathroom Sinks</h3>
              <div>
                <label className="block text-sm mb-2">Bathroom Sink Quantity</label>
                <input 
                  type="number"
                  value={bathroomSinkQty}
                  onChange={(e) => setBathroomSinkQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600"
                />
                <p className="text-xs text-gray-400 mt-1">$80 per bathroom sink</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Project Sections</h2>
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
            <h3 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
              <Plus size={20} /> Quick Add Section
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <input 
                placeholder="Section name"
                value={newSection.name}
                onChange={(e) => setNewSection({...newSection, name: e.target.value})}
                className="bg-gray-700 rounded px-3 py-2 border border-gray-600 text-sm"
              />
              <input 
                placeholder="Length"
                type="number"
                value={newSection.length}
                onChange={(e) => setNewSection({...newSection, length: e.target.value})}
                className="bg-gray-700 rounded px-3 py-2 border border-gray-600 text-sm"
              />
              <input 
                placeholder="Width"
                type="number"
                value={newSection.width}
                onChange={(e) => setNewSection({...newSection, width: e.target.value})}
                className="bg-gray-700 rounded px-3 py-2 border border-gray-600 text-sm"
              />
              <select 
                value={newSection.type}
                onChange={(e) => setNewSection({...newSection, type: e.target.value})}
                className="bg-gray-700 rounded px-3 py-2 border border-gray-600 text-sm"
              >
                <option>4" Backsplash</option>
                <option>Countertop</option>
                <option>Bartop</option>
              </select>
              <select 
                value={newSection.jointStatus}
                onChange={(e) => setNewSection({...newSection, jointStatus: e.target.value})}
                className="bg-gray-700 rounded px-3 py-2 border border-gray-600 text-sm"
              >
                <option>Standalone</option>
                <option>Jointed</option>
              </select>
              <button 
                onClick={addSection}
                className="bg-emerald-600 hover:bg-emerald-700 rounded px-4 py-2 font-semibold transition"
              >
                + Add
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Jointed = Sections seamed together (use same group name like A, B, C)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2">Section Name</th>
                  <th className="text-left p-2">Length (in)</th>
                  <th className="text-left p-2">Width (in)</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Joint Status</th>
                  <th className="text-left p-2">Joint Group</th>
                  <th className="text-left p-2">Remove</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section, idx) => (
                  <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="p-2">
                      <input 
                        value={section.name}
                        onChange={(e) => updateSection(idx, 'name', e.target.value)}
                        className="bg-gray-700 rounded px-2 py-1 w-full text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number"
                        value={section.length}
                        onChange={(e) => updateSection(idx, 'length', parseFloat(e.target.value))}
                        className="bg-gray-700 rounded px-2 py-1 w-full text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number"
                        value={section.width}
                        onChange={(e) => updateSection(idx, 'width', parseFloat(e.target.value))}
                        className="bg-gray-700 rounded px-2 py-1 w-full text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <select 
                        value={section.type}
                        onChange={(e) => updateSection(idx, 'type', e.target.value)}
                        className="bg-gray-700 rounded px-2 py-1 w-full text-sm"
                      >
                        <option>Countertop</option>
                        <option>Bartop</option>
                        <option>4" Backsplash</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <select 
                        value={section.jointStatus}
                        onChange={(e) => updateSection(idx, 'jointStatus', e.target.value)}
                        className="bg-gray-700 rounded px-2 py-1 w-full text-sm"
                      >
                        <option>Standalone</option>
                        <option>Jointed</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input 
                        value={section.group}
                        onChange={(e) => updateSection(idx, 'group', e.target.value)}
                        placeholder="A, B, C..."
                        className="bg-gray-700 rounded px-2 py-1 w-full text-sm"
                        disabled={section.jointStatus !== 'Jointed'}
                      />
                    </td>
                    <td className="p-2">
                      <button 
                        onClick={() => removeSection(idx)}
                        className="bg-red-600 hover:bg-red-700 rounded p-1 transition"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center mb-6">
          <button 
            onClick={calculateResults}
            className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-bold py-4 px-12 rounded-xl text-lg shadow-lg transition"
          >
            Calculate Stone Requirements
          </button>
        </div>

        {calculatedResults && (
          <>
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Total Project Calculator</h2>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span>Edge Work ({calculatedResults.roundedSqFt} sq ft × ${edgeType.match(/\$(\d+)/)[1]})</span>
                  <span className="font-semibold">${calculatedResults.edgeCost.toFixed(2)}</span>
                </div>
                
                {calculatedResults.kitchenSinkCost > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span>Kitchen Sink Cutouts ({kitchenSinkQty}x)</span>
                    <span className="font-semibold">${calculatedResults.kitchenSinkCost.toFixed(2)}</span>
                  </div>
                )}
                
                {calculatedResults.bathroomSinkCost > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span>Bathroom Sink Cutouts ({bathroomSinkQty}x)</span>
                    <span className="font-semibold">${calculatedResults.bathroomSinkCost.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span>Plywood ({calculatedResults.plywoodCalc.count} sheets)</span>
                  <span className="font-semibold">${calculatedResults.plywoodCalc.cost.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 font-semibold text-lg">
                  <span>Subtotal</span>
                  <span>${calculatedResults.subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold mb-3">Manual Adjustments</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2">Customer Supplied Sink(s)</label>
                    <input 
                      type="number"
                      value={customerSinks}
                      onChange={(e) => setCustomerSinks(e.target.value)}
                      className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Oversize Piece Fee</label>
                    <input 
                      type="number"
                      value={oversizeFee}
                      onChange={(e) => setOversizeFee(e.target.value)}
                      className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">Added Fabrication</label>
                    <input 
                      type="number"
                      value={addedFab}
                      onChange={(e) => setAddedFab(e.target.value)}
                      className="w-full bg-gray-700 rounded px-3 py-2 border border-gray-600"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-2 border-emerald-500 rounded-xl p-6 text-center">
                <div className="text-lg mb-2">Project Total:</div>
                <div className="text-5xl font-bold text-emerald-400">
                  ${calculatedResults.projectTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Project Details</h2>
              
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">{calculatedResults.roundedSqFt}</div>
                  <div className="text-sm text-gray-300 mt-1">Rounded Sq Ft for Pricing</div>
                </div>
                <div className="bg-purple-600/20 border border-purple-500 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-400">{calculatedResults.totalStoneSqFt.toFixed(1)}</div>
                  <div className="text-sm text-gray-300 mt-1">Total Stone Sq Ft</div>
                </div>
                <div className="bg-orange-600/20 border border-orange-500 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-orange-400">{calculatedResults.totalWasteSqFt.toFixed(1)}</div>
                  <div className="text-sm text-gray-300 mt-1">Total Waste Sq Ft</div>
                </div>
                <div className="bg-emerald-600/20 border border-emerald-500 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-400">${calculatedResults.projectTotal.toFixed(0)}</div>
                  <div className="text-sm text-gray-300 mt-1">Project Total</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3 text-emerald-400">Stone Pieces Required</h3>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Suggested Pieces:</div>
                      <div className="space-y-1">
                        {Object.keys(calculatedResults.stoneCounts).map((size, idx) => (
                          <div key={idx} className="text-lg">
                            {calculatedResults.stoneCounts[size]}× {size}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Leftovers:</div>
                      <div className="space-y-1">
                        {calculatedResults.stoneOptimization.map((stone, idx) => (
                          <div key={idx} className="text-lg">
                            {stone.leftover}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    {calculatedResults.stoneOptimization.map((stone, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-3 mb-2">
                        <div className="font-semibold text-blue-400">Stone {idx + 1}: {stone.size}</div>
                        <div className="text-sm text-gray-300 mt-1">Used for: {stone.usedFor}</div>
                        <div className="text-sm text-gray-400">Leftover: {stone.leftover} ({stone.leftoverSqFt.toFixed(2)} sq ft)</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 text-purple-400">Plywood Requirements</h3>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-lg">
                    {calculatedResults.plywoodCalc.count} sheets of 48" × 96" plywood @ $70/sheet = ${calculatedResults.plywoodCalc.cost}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    Total plywood area needed: {calculatedResults.plywoodCalc.totalSqFt.toFixed(2)} sq ft
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StoneCalculator;
