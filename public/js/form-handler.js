// form-handler.js
// ==================================================
// 🔁 Gestion universelle des formulaires de paiement
// ==================================================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  if (!form) {
    console.warn("Aucun formulaire trouvé sur cette page.");
    return;
  }
  if (form.dataset.ignoreHandler === "true") return;

  console.log("🧩 Form-handler initialisé pour:", form.id || "formulaire anonyme");

  // Injecte URLs + génère ORDERID
  PaymentUtils.injectRedirectUrls(form);
  const orderInput = form.querySelector('[name="ORDERID"]');
  if (orderInput) orderInput.value = PaymentUtils.generateOrderId();

  // Récupère l’environnement depuis localStorage
  const lastEnv = localStorage.getItem("lastEnv");
  const customEnvs = JSON.parse(localStorage.getItem("customEnvs") || "{}");
  const env = lastEnv ? customEnvs[lastEnv] : null;

  if (!env || !env.secretKey) {
    console.warn("⚠️ Aucun environnement valide trouvé. L'utilisateur devra en choisir un.");
  }

  // ==================================================
  // 💳 Initialise la détection de marque
  // ==================================================
  function setupBrandDetector() {
    if (document.querySelector("#card-number")) {
      PaymentUtils.initBrandDetector("#card-number", "#card-brand");
      console.log("💳 BrandDetector initialisé !");
    } else {
      console.log("⏳ En attente du champ carte...");
      const observer = new MutationObserver(() => {
        const input = document.querySelector("#card-number");
        if (input) {
          observer.disconnect();
          PaymentUtils.initBrandDetector("#card-number", "#card-brand");
          console.log("💳 BrandDetector initialisé après affichage du paiement !");
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
  setupBrandDetector();
  PaymentUtils.setupCardAutoFormat("#card-number");
PaymentUtils.setupExpiryAutoFormat("#expiry");


  // ==================================================
  // 🔄 Soumission du formulaire de paiement
  // ==================================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 🧠 Vérifie environnement avant envoi
    const activeEnv = env || (() => {
      const le = localStorage.getItem("lastEnv");
      const ce = JSON.parse(localStorage.getItem("customEnvs") || "{}");
      return le ? ce[le] : null;
    })();

    if (!activeEnv || !activeEnv.secretKey) {
      alert("❌ Aucun environnement valide trouvé. Sélectionnez-en un avant de continuer.");
      return;
    }

    // 💳 Nettoie le numéro de carte avant envoi
    const cardNumberInput = form.querySelector("#card-number");
    if (cardNumberInput) {
      cardNumberInput.value = cardNumberInput.value.replace(/\s+/g, "");
    }

    // 💡 Injecte automatiquement l’identifiant si manquant
    const identifierField = form.querySelector('[name="params[IDENTIFIER]"], [name="IDENTIFIER"]');
    if (identifierField && (!identifierField.value || identifierField.value.trim() === "")) {
      if (activeEnv.identifier) {
        identifierField.value = activeEnv.identifier;
        console.log("🪪 IDENTIFIER injecté automatiquement :", activeEnv.identifier);
      }
    }

    // 🔄 Construit les params à partir du formulaire
    const fd = new FormData(form);
    const params = {};
    fd.forEach((v, k) => {
      if (!["HASH", "method", "environment"].includes(k)) {
        const match = k.match(/^params\[(.+)\]$/);
        const cleanKey = match ? match[1] : k;
        params[cleanKey] = v;
      }
    });

    const chosenBrand = PaymentUtils.getSelectedBrand?.();
if (chosenBrand) {
  params.SELECTEDBRAND = chosenBrand.toUpperCase();
  console.log("💳 Marque sélectionnée :", chosenBrand);
}


// Force le recalcul du format MM-YY avant soumission
const expiryInput = form.querySelector("#expiry");
if (expiryInput) {
  let val = expiryInput.value.replace(/\D/g, "");
  if (val.length === 4) {
    const mm = val.substring(0, 2);
    const yy = val.substring(2);
    expiryInput.dataset.cleaned = `${mm}-${yy}`;
  }
}
if (expiryInput && expiryInput.dataset.cleaned) {
  params.CARDVALIDITYDATE = expiryInput.dataset.cleaned; // ✅ Nom correct attendu par Dalenys
}


    try {
      // 1️⃣ Calcul du hash
      const hash = await PaymentUtils.computeHash(params, activeEnv.secretKey);
      params.HASH = hash;
      params.secretKey = activeEnv.secretKey;

      // 2️⃣ Envoi du paiement
      const result = await PaymentUtils.processPayment(params);
      console.log("✅ Réponse paiement:", result);

      // 3️⃣ Gestion 3DS / redirection
      PaymentUtils.handle3DS(result);
    } catch (err) {
      console.error("❌ Erreur paiement:", err);
      alert("Erreur : " + err.message);
    }
  });
});
