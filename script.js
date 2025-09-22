function calculate() {
  const rows = document.querySelectorAll("#inputTable tbody tr");
  let totalSqft = 0, totalWaste = 0, totalLabor = 0, totalCost = 0;
  rows.forEach(row => {
    const length = parseFloat(row.querySelector(".length").value) || 0;
    const width = parseFloat(row.querySelector(".width").value) || 0;
    const sinkType = row.querySelector(".sink").value;

    const sqft = (length * width) / 144;
    const waste = sqft * 0.10;
    const labor = sqft * 7 + (sinkType.includes("Kitchen") ? 100 : (sinkType.includes("Bath") ? 40 : 0));
    const total = sqft + labor;

    row.querySelector(".sqft").innerText = sqft.toFixed(2);
    row.querySelector(".waste").innerText = waste.toFixed(2);
    row.querySelector(".labor").innerText = labor.toFixed(2);
    row.querySelector(".total").innerText = total.toFixed(2);

    totalSqft += sqft;
    totalWaste += waste;
    totalLabor += labor;
    totalCost += total;
  });
  document.getElementById("totals").innerText =
    `Totals → SqFt: ${totalSqft.toFixed(2)}, Waste: ${totalWaste.toFixed(2)}, Labor: ${totalLabor.toFixed(2)}, Grand Total: ${totalCost.toFixed(2)}`;
}

function addRow() {
  const tableBody = document.querySelector("#inputTable tbody");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="number" class="length" /></td>
    <td><input type="number" class="width" /></td>
    <td>
      <select class="sink">
        <option value="None">None</option>
        <option value="Undermount Kitchen">Undermount Kitchen</option>
        <option value="Topmount Kitchen">Topmount Kitchen</option>
        <option value="Undermount Bath">Undermount Bath</option>
        <option value="Topmount Bath">Topmount Bath</option>
      </select>
    </td>
    <td class="sqft">0</td>
    <td class="waste">0</td>
    <td class="labor">0</td>
    <td class="total">0</td>`;
  tableBody.appendChild(row);
}