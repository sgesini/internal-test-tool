// -----------------------------
// Test cards data
// -----------------------------
const cardLabels = [
  "Successful operation","Card enrolled 3-D Secure - VISA","Card enrolled 3-D Secure - MASTERCARD",
  "Card enrolled 3-D Secure - CB","3-D Secure authentication required - VISA",
  "3-D Secure authentication required - MASTERCARD","3-D Secure authentication required - CB",
  "Transaction declined by the banking network","Insufficient funds","Card declined by the banking network",
  "Fraud suspicion","Invalid transaction","Duplicated transaction","Invalid card data",
  "Transaction not allowed by banking network for this holder","Strong customer authentication required by issuer",
  "Exchange protocol failure","Banking network error",
  "Time out, the response sent to the notification URL (Visa / MasterCard direct connection)"
];
const panNumbers = [
  "4065600099110000","4022050523250000","5186629195300000","4234600948280000",
  "4022052267040001","5186621460180001","4234609172250001","4234607564194001",
  "4234604810334002","4234606735474003","4234600140624005","4234604450614010",
  "4234609939944011","4234604160524012","4234608464714013","4234607430914020",
  "4234609090495001","4234604508525002","4234607483945004"
];
const FIXED_EXPIRY = "01/30";
const FIXED_CVV = "123";

// -----------------------------
// Build test cards table
// -----------------------------
function buildTestCardsTable() {
  const container = document.getElementById("test-cards-container");
  if (!container) return;
  container.innerHTML = "";

  const table = document.createElement("table");
  table.id = "test-cards-table";
  table.innerHTML = `<thead>
    <tr><th>Scenario</th><th>Card PAN</th><th>Expiry</th><th>CVV</th></tr>
  </thead>`;
  const tbody = document.createElement("tbody");

  for (let i=0; i<cardLabels.length; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cardLabels[i]}</td>
      <td><button type="button" class="copy-btn" data-pan="${panNumbers[i]}">${panNumbers[i]}</button></td>
      <td>${FIXED_EXPIRY}</td>
      <td>${FIXED_CVV}</td>`;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);

  container.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      const originalText = btn.textContent;
      navigator.clipboard.writeText(btn.dataset.pan).then(() => {
        btn.textContent = "✅ Copié !";
        setTimeout(() => { btn.textContent = originalText; }, 1500);
      }).catch(err => {
        console.error("Erreur copie clipboard", err);
        alert("Impossible de copier le PAN");
      });
    });
  });
}

// -----------------------------
// Init modale test cards
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  const modal   = document.getElementById("test-cards-modal");
  const openBtn = document.getElementById("open-test-cards");
  const closeBtn= document.getElementById("close-test-cards");

  if (modal && openBtn && closeBtn) {
    openBtn.addEventListener("click", () => {
      buildTestCardsTable();
      modal.classList.remove("hidden");
    });
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });
  }
});
