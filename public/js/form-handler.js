// form-handler.js
// ==================================================
// 🔁 Gestion universelle des formulaires de paiement
// ==================================================

// Ignore les formulaires marqués comme "ignoreHandler"


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


    // 🔄 Construit les params à partir du formulaire

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
            // 🧩 Si le nom est du type "params[XXX]", on extrait juste "XXX"
            const match = k.match(/^params\[(.+)\]$/);
            const cleanKey = match ? match[1] : k;
            params[cleanKey] = v;
        }
        });


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
