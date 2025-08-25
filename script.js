// --- PREFAB CATALOG (inches) ---
const PREFAB = {
  Granite: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]]
  },
  Quartz: {
    Countertop: [[26,96],[26,108],[26,114],[26,120]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]]
  },
  Quartzite: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]]
  },
  Marble: {
    Countertop: [[26,96],[26,108],[26,114]],
    Island: [[28,108],[32,108],[36,108],[39,108],[42,108],[52,108]],
    Bartop: [[14,108],[16,108]],
    Backsplash: [[4,108]]
  }
};

// --- CONSTANTS ---
const LABOR_RATE = 14;             // $/sqft
const REFAB_RATE = 30;             // $/lf
const ISLAND_SURCHARGE_L = 120;    // inches
const ISLAND_SURCHARGE_W = 43;     // inches
const ISLAND_SURCHARGE_COST = 150;
const PLY_SHEET = { L: 96, W: 48, COST: 70 };

/* =========================================================================
   OPTION B: Quantities only for sink add-ons (0–20 each).
   - Each .sink-item has data-price
   - Each .sink-qty is a number input (0–20). 0 means "not selected".
   - Total add-on = sum(price * qty)
   ========================================================================= */

// Reads quantities instead of checkboxes
function getSinkAddonsTotal() {
  const items = document.querySelectorAll('#sink-options .sink-item');
  let sum = 0;
  items.forEach(item => {
    const price = Number(item.dataset.price || 0);
    const qtyInput = item.querySelector('.sink-qty');
    const qty = Math.min(20, Math.max(0, parseInt(qtyInput?.value || '0', 10)));
    if (!isNaN(qty) && qty > 0) sum += price * qty;
  });
  return sum;
}

// Clamp qty and recalc on change; also init once on load
document.addEventListener('DOMContentLoaded', () => {
  // Ensure at least 50 rows exist
  ensureRows(50);

  // Wire sink qty inputs
  document.querySelectorAll('#sink-options .sink-qty').forEach(input => {
    const clamp = () => {
      let v = parseInt(input.value || '0', 10);
      if (isNaN(v) || v < 0) v = 0;
