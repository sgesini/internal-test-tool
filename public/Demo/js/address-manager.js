// address-manager.js
// Gère les adresses client : affichage, sauvegarde, résumé, synchronisation

window.AddressManager = (function () {
  const ADDRESS_KEY = "demo_addresses";

  const byId = (id) => document.getElementById(id);

  // 🧩 Construit le résumé HTML d'une adresse
  function buildSummaryHTML(type) {
    const name    = byId(`${type}-name`)?.value || "";
    const street  = byId(`${type}-street`)?.value || "";
    const zip     = byId(`${type}-zip`)?.value || "";
    const city    = byId(`${type}-city`)?.value || "";
    const country = byId(`${type}-country`)?.value || "";
    if (!name && !street && !zip && !city && !country)
      return "<em>Aucune adresse renseignée</em>";
    return `
      <strong>${name}</strong><br>
      ${street}<br>
      ${zip} ${city}<br>
      ${country}
    `;
  }

  function collapseAddress(type) {
    const block = byId(`${type}-address`);
    if (!block) return;
    const fields = block.querySelector(".address-fields");
    const summary = block.querySelector(".address-summary");
    const summaryContent = summary?.querySelector(".summary-content") || summary;
    if (summaryContent) summaryContent.innerHTML = buildSummaryHTML(type);
    fields?.classList.add("hidden");
    summary?.classList.remove("hidden");
    block.dataset.collapsed = "true";
  }

  function expandAddress(type) {
    const block = byId(`${type}-address`);
    if (!block) return;
    const fields = block.querySelector(".address-fields");
    const summary = block.querySelector(".address-summary");
    fields?.classList.remove("hidden");
    summary?.classList.add("hidden");
    block.dataset.collapsed = "false";
  }

  function copyBillingToShipping() {
    ["name", "street", "zip", "city", "country"].forEach((f) => {
      const src = byId(`billing-${f}`);
      const dst = byId(`shipping-${f}`);
      if (src && dst) dst.value = src.value;
    });
  }

  function setShippingReadonly(readonly) {
    ["name", "street", "zip", "city", "country"].forEach((f) => {
      const el = byId(`shipping-${f}`);
      if (!el) return;
      if (readonly) el.setAttribute("readonly", "true");
      else el.removeAttribute("readonly");
    });
  }

  // 💾 Sauvegarde / chargement localStorage
  function saveAddresses() {
    const data = {
      billing: {
        name: byId("billing-name").value,
        street: byId("billing-street").value,
        zip: byId("billing-zip").value,
        city: byId("billing-city").value,
        country: byId("billing-country").value,
      },
      shipping: {
        name: byId("shipping-name").value,
        street: byId("shipping-street").value,
        zip: byId("shipping-zip").value,
        city: byId("shipping-city").value,
        country: byId("shipping-country").value,
      },
      sameAsBilling: byId("same-as-billing").checked,
    };
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(data));
  }

  function loadAddresses() {
    const raw = localStorage.getItem(ADDRESS_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const fill = (prefix, obj = {}) => {
        for (const [k, v] of Object.entries(obj)) {
          const el = byId(`${prefix}-${k}`);
          if (el) el.value = v;
        }
      };
      fill("billing", data.billing);
      fill("shipping", data.shipping);
      const sameBox = byId("same-as-billing");
      sameBox.checked = !!data.sameAsBilling;
      sameBox.dispatchEvent(new Event("change"));
    } catch (err) {
      console.warn("Impossible de charger les adresses :", err);
    }
  }

  function initAddressBlock(type) {
    const block = byId(`${type}-address`);
    if (!block) return;
    const header = block.querySelector(".address-header");
    const validateBtn = block.querySelector(".validate-address");
    const editBtn = block.querySelector(".edit-address");

    block.dataset.collapsed = "false";

    header?.addEventListener("click", () => {
      const collapsed = block.dataset.collapsed === "true";
      collapsed ? expandAddress(type) : collapseAddress(type);
    });

    validateBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      collapseAddress(type);
      saveAddresses();
    });

    editBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      expandAddress(type);
    });
  }

  function init() {
    // blocs
    initAddressBlock("billing");
    initAddressBlock("shipping");

    // case “même que facturation”
    const sameBox = byId("same-as-billing");
    const shippingBlock = byId("shipping-address");
    const shippingFields = shippingBlock.querySelector(".address-fields");
    const shippingSummary = shippingBlock.querySelector(".address-summary");

    sameBox.addEventListener("change", () => {
      if (sameBox.checked) {
        copyBillingToShipping();
        setShippingReadonly(true);
const summaryContent = shippingSummary.querySelector(".summary-content");
if (summaryContent) summaryContent.innerHTML = buildSummaryHTML("shipping");
        shippingFields.classList.add("hidden");
        shippingSummary.classList.remove("hidden");
if (shippingBlock.dataset.collapsed === "true") {
  const summaryContent = shippingSummary.querySelector(".summary-content");
  if (summaryContent) summaryContent.innerHTML = buildSummaryHTML("shipping");
}
      } else {
        setShippingReadonly(false);
        shippingFields.classList.remove("hidden");
        shippingSummary.classList.add("hidden");
        shippingBlock.dataset.collapsed = "false";
      }
      saveAddresses();
    });

    // synchronise à la volée
    ["name","street","zip","city","country"].forEach(f => {
      const src = byId(`billing-${f}`);
      src?.addEventListener("input", () => {
        if (!sameBox.checked) return;
        byId(`shipping-${f}`).value = src.value;
        if (shippingBlock.dataset.collapsed === "true") {
          shippingSummary.innerHTML = buildSummaryHTML("shipping");
        }
        saveAddresses();
      });
    });

    // save à chaque modif
    document.querySelectorAll("#addresses-section input").forEach(el => {
      el.addEventListener("input", saveAddresses);
      el.addEventListener("change", saveAddresses);
    });

    // load au démarrage
    loadAddresses();
  }

  return { init, saveAddresses, loadAddresses, collapseAddress, expandAddress };
})();
