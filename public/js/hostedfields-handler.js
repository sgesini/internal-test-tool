// hostedfields-handler.js
document.addEventListener("DOMContentLoaded", async () => {
  const lastEnv = localStorage.getItem("lastEnv");
  if (!lastEnv) {
    console.warn("⚠️ Aucun environnement sélectionné, Hosted Fields ne peut pas s'initialiser.");
    return;
  }

  try {
    const customEnvs = JSON.parse(localStorage.getItem("customEnvs") || "{}");
    const env = customEnvs[lastEnv];
    if (!env) {
      console.error("❌ Environnement introuvable:", lastEnv);
      return;
    }

    // 🔑 Injection de la config globale pour Hosted Fields
    window.APP_CONFIG = {
      publicKeyId: env.publicKeyId,
      publicKey: env.publicKey,
      identifier: env.identifier
    };

    // ⚡ Initialise Hosted Fields (définie dans script.js)
    if (typeof initializeHostedFields === "function") {
      initializeHostedFields();
    } else {
      console.warn("⚠️ La fonction initializeHostedFields n'est pas définie.");
    }
  } catch (err) {
    console.error("Erreur lors du chargement de l'environnement Hosted Fields:", err);
  }

  // 🚫 Désactivation du form-handler global sur ce formulaire
  const hostedForm = document.getElementById("cart");
  if (hostedForm) {
    hostedForm.dataset.ignoreHandler = "true"; // flag que form-handler.js peut ignorer
  }

  // ✅ Intercepte le submit pour utiliser tokenizeHandler uniquement
  if (hostedForm) {
    hostedForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (typeof tokenizeHandler === "function") {
        tokenizeHandler();
      } else {
        console.error("⚠️ tokenizeHandler() n'est pas défini !");
      }
    });
  }

  // Gestion du modal de test cards
  const modal = document.getElementById("test-cards-modal");
  const openBtn = document.getElementById("open-test-cards");
  const closeBtn = document.getElementById("close-test-cards");

  if (openBtn && modal && closeBtn) {
    openBtn.addEventListener("click", () => {
      if (typeof buildTestCardsTable === "function") buildTestCardsTable();
      modal.classList.remove("hidden");
    });
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  }
});
