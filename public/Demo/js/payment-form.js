// payment-form.js
// Injection des données avant soumission du formulaire S2S

window.PaymentForm = (function () {
  let countryMap = {};

  async function loadCountryCodes() {
    try {
      const res = await fetch("/js/country-code.json");
      if (!res.ok) throw new Error("Fichier country-code.json introuvable");
      countryMap = await res.json();
      console.log("🌍 Country codes chargés :", Object.keys(countryMap).length);
    } catch (err) {
      console.warn("⚠️ Impossible de charger les codes pays :", err);
      countryMap = {};
    }
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function getIsoCountry(value) {
    if (!value) return "";
    const trimmed = value.trim();
    return (
      countryMap[trimmed] ||
      countryMap[trimmed.toLowerCase()] ||
      countryMap[
        Object.keys(countryMap).find(
          (k) => k.toLowerCase() === trimmed.toLowerCase()
        )
      ] ||
      trimmed
    );
  }

function buildHiddenFields() {
  const byId = (id) => document.getElementById(id);

  const cardNumber = byId("card-number")?.value.replace(/\s+/g, "") || "";

  const billing = {
    BILLINGFIRSTNAME: byId("billing-firstname")?.value || "",
    BILLINGLASTNAME: byId("billing-lastname")?.value || "",
    BILLINGADDRESS: byId("billing-street")?.value || "",
    BILLINGPOSTALCODE: byId("billing-zip")?.value || "",
    BILLINGCITY: byId("billing-city")?.value || "",
    BILLINGCOUNTRY: getIsoCountry(byId("billing-country")?.value || ""),
  };

  const shipping = {
    SHIPTOFIRSTNAME: byId("shipping-firstname")?.value || "",
    SHIPTOLASTNAME: byId("shipping-lastname")?.value || "",
    SHIPTOADDRESS: byId("shipping-street")?.value || "",
    SHIPTOPOSTALCODE: byId("shipping-zip")?.value || "",
    SHIPTOCITY: byId("shipping-city")?.value || "",
    SHIPTOCOUNTRY: getIsoCountry(byId("shipping-country")?.value || ""),
  };

  // Montant (format centimes)
  const totalEl = document.querySelector("#cart-total") || document.querySelector(".cart-total");
  const totalText = (totalEl?.textContent || "0").trim();
  const totalNumber = parseFloat(totalText.replace(/[^\d,.-]/g, "").replace(",", "."));
  const totalAmountCents = Math.round(totalNumber * 100);

  const cardFields = {
    CARDCODE: cardNumber,
    CARDCVV: byId("cvv")?.value || "",
    CARDVALIDITYDATE: byId("expiry")?.value.replace("/", "-") || "",
    CARDFULLNAME: byId("cardholder")?.value || "",
    AMOUNT: totalAmountCents,
  };

  const userAgent = navigator.userAgent || "Mozilla/5.0";
  const defaults = {
    OPERATIONTYPE: "payment",
    CLIENTUSERAGENT: userAgent,
    CLIENTIP: "10.1.1.1",
    DESCRIPTION: "Demo website",
    CLIENTIDENT: byId("billing-firstname")?.value || "demo-client",
    CLIENTEMAIL: byId("billing-email")?.value?.trim() || "test@test.com",
  };

  return { ...cardFields, ...billing, ...shipping, ...defaults };
}

  
  function injectHiddenFields(e) {
    const form = e.target;


    
  console.log("🧩 Injection des champs cachés avant form-handler (capture)...");
    const cardNumber = byId("card-number")?.value.replace(/\s+/g, "") || "";
// --- ensure helper
function ensureHidden(form, name, value) {
  let input = form.querySelector(`input[name="${name}"]`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    form.appendChild(input);
  }
  input.value = value ?? "";
  return input;
}

// --- defaults à garantir (params[...] pour que form-handler les lise)
const userAgent = navigator.userAgent || "Mozilla/5.0";
const defaults = {
  "params[OPERATIONTYPE]": "payment",                 // payment/capture/refund/void selon le use-case
  "params[CLIENTUSERAGENT]": userAgent,
  "params[CLIENTIP]": "10.1.1.1",
  "params[DESCRIPTION]": "Demo website",
  // CLIENTIDENT/CLIENTEMAIL : on essaie de récupérer depuis le formulaire ou localStorage si disponibles
  "params[CLIENTIDENT]": (byId("billing-firstname")?.value || localStorage.getItem("clientIdent") || "demo-client"),
  "params[CLIENTEMAIL]": (localStorage.getItem("clientEmail") || "")
};



// injecte/écrase les defaults (avant le hashing)
Object.entries(defaults).forEach(([k, v]) => ensureHidden(form, k, v));

    // ✅ Billing
    const billing = {
      BILLINGFIRSTNAME: byId("billing-firstname")?.value || "",
      BILLINGLASTNAME: byId("billing-lastname")?.value || "",
      BILLINGADDRESS: byId("billing-street")?.value || "",
      BILLINGPOSTALCODE: byId("billing-zip")?.value || "",
      BILLINGCITY: byId("billing-city")?.value || "",
      BILLINGCOUNTRY: getIsoCountry(byId("billing-country")?.value || ""),
    };

    // ✅ Shipping
    const shipping = {
      SHIPTOFIRSTNAME: byId("shipping-firstname")?.value || "",
      SHIPTOLASTNAME: byId("shipping-lastname")?.value || "",
      SHIPTOADDRESS: byId("shipping-street")?.value || "",
      SHIPTOPOSTALCODE: byId("shipping-zip")?.value || "",
      SHIPTOCITY: byId("shipping-city")?.value || "",
      SHIPTOCOUNTRY: getIsoCountry(byId("shipping-country")?.value || ""),
    };

    // ✅ Montant → format centimes
    const totalEl =
      document.querySelector("#cart-total") || document.querySelector(".cart-total");
    const totalText = (totalEl?.textContent || "0").trim();
    const totalNumber = parseFloat(
      totalText.replace(/[^\d,.-]/g, "").replace(",", ".")
    );
    const totalAmountCents = Math.round(totalNumber * 100);

    if (!totalAmountCents || totalAmountCents <= 0) {
      alert("❌ Panier vide — ajoutez des articles !");
      console.error("Montant lu :", totalText, "→", totalNumber);
      return;
    }

    // ✅ Champs de carte
    const cardFields = {
      CARDCODE: cardNumber,
      CARDCVV: byId("cvv")?.value || "",
      CARDVALIDITYDATE: byId("expiry")?.value.replace("/", "-") || "",
      CARDFULLNAME: byId("cardholder")?.value || "",
      AMOUNT: totalAmountCents,
    };

    // ➕ version params[...] (le form-handler ne prend que ceux-là)
    const paramFields = {
      ...Object.fromEntries(Object.entries(cardFields).map(([k, v]) => [`params[${k}]`, v])),
      ...Object.fromEntries(Object.entries(billing).map(([k, v]) => [`params[${k}]`, v])),
      ...Object.fromEntries(Object.entries(shipping).map(([k, v]) => [`params[${k}]`, v])),
    };
// ✅ Email fallback si manquant
let clientEmail =
  byId("billing-email")?.value?.trim() ||
  localStorage.getItem("clientEmail") ||
  "test@test.com";

// S'assure que le champ existe dans le form avant le hash
let emailInput = form.querySelector('input[name="params[CLIENTEMAIL]"], input[name="CLIENTEMAIL"]');
if (!emailInput) {
  emailInput = document.createElement("input");
  emailInput.type = "hidden";
  emailInput.name = "params[CLIENTEMAIL]";
  form.appendChild(emailInput);
}
emailInput.value = clientEmail;

const hiddenFields = buildHiddenFields();

    // Injection réelle
    Object.entries(hiddenFields).forEach(([k, v]) => {
      let input = form.querySelector(`input[name="${k}"]`);
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        form.appendChild(input);
      }
      input.value = v;
    });

    updatePreview(hiddenFields);


    console.log("✅ Champs injectés avant form-handler :", hiddenFields);
  }

  async function init() {
    await loadCountryCodes();

    const form = byId("s2s-payment-form");
    if (!form) {
      console.warn("❌ Aucun formulaire trouvé pour PaymentForm");
      return;
    }

    console.log("✅ PaymentForm initialisé");

    const lastEnv = localStorage.getItem("lastEnv");
    const customEnvs = JSON.parse(localStorage.getItem("customEnvs") || "{}");
    const env = lastEnv ? customEnvs[lastEnv] : null;

    if (env?.identifier) {
      const idField = byId("identifier-field");
      if (idField) idField.value = env.identifier;
    }

    // ⚡ Capture phase pour injecter avant form-handler
    form.addEventListener("submit", injectHiddenFields, true);
  }

  function showMappingTooltip(section, event) {
  const mappings = {
    billing: {
      BILLINGFIRSTNAME: "billing-firstname",
      BILLINGLASTNAME: "billing-lastname",
      BILLINGADDRESS: "billing-street",
      BILLINGPOSTALCODE: "billing-zip",
      BILLINGCITY: "billing-city",
      BILLINGCOUNTRY: "billing-country",
    },
    shipping: {
      SHIPTOFIRSTNAME: "shipping-firstname",
      SHIPTOLASTNAME: "shipping-lastname",
      SHIPTOADDRESS: "shipping-street",
      SHIPTOPOSTALCODE: "shipping-zip",
      SHIPTOCITY: "shipping-city",
      SHIPTOCOUNTRY: "shipping-country",
    },
  };

  const map = mappings[section];
  if (!map) return;

  // 🧩 Récupère les valeurs dynamiques
  const html = Object.entries(map)
    .map(([dalenys, formId]) => {
      const el = document.getElementById(formId);
      const value = el?.value?.trim() || el?.textContent?.trim() || "(vide)";
      return `<b>${dalenys}</b> = <span style="color:#4ade80">${value}</span>`;
    })
    .join("<br>");

  let tooltip = document.getElementById("mapping-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "mapping-tooltip";
    tooltip.className = "mapping-tooltip";
    document.body.appendChild(tooltip);
  }

  tooltip.innerHTML = html;
  tooltip.style.display = "block";
  tooltip.style.top = `${event.pageY + 12}px`;
  tooltip.style.left = `${event.pageX + 12}px`;
}


function hideTooltipOnMove() {
  const tooltip = document.getElementById("mapping-tooltip");
  if (tooltip) tooltip.style.display = "none";
}

let previewTimer = null;

function updatePreview(data) {
  const container = document.querySelector("#dalenys-preview .preview-content");
  if (!container) return;

  if (!data || Object.keys(data).length === 0) {
    container.innerHTML = "<p style='opacity:0.7;'>Aucune donnée disponible.</p>";
    return;
  }

  const formatted = Object.entries(data)
    .map(([k, v]) => `${k} = ${v}`)
    .join("\n");
  container.innerHTML = `<pre>${formatted}</pre>`;
}

function showPreview() {
  const preview = document.getElementById("dalenys-preview");
  if (!preview) return;
  preview.classList.remove("hidden");

  const refresh = () => {
    const fields = buildHiddenFields();
    updatePreview(fields);
  };

  refresh(); // affiche immédiatement les données

  if (previewTimer) clearInterval(previewTimer);
  previewTimer = setInterval(refresh, 5000);
}


return {
  init,
  showMappingTooltip,
  hideTooltipOnMove,
  updatePreview,
  showPreview
};

})();
