// env-manager.js
// ✅ version hybride : config.json (lecture seule) + environnements custom stockés dans localStorage

document.addEventListener("DOMContentLoaded", () => {
  const envSelect      = document.getElementById("env-select");
  const envName        = document.getElementById("env-name");
  const envKeyId       = document.getElementById("env-public-key-id");
  const envKey         = document.getElementById("env-public-key");
  const envIdentifier  = document.getElementById("env-identifier");
  const envSecretKey   = document.getElementById("env-secret-key");
  const useEnvBtn      = document.getElementById("use-env");
  const deleteEnvBtn   = document.getElementById("delete-env");

  let baseEnvs = {};   // 🟦 Depuis config.json (lecture seule)
  let customEnvs = {}; // 🟨 Depuis localStorage (modifiable)
  let allEnvs = {};    // Fusion des deux

  // --- Masquage du champ secretKey ---
  envSecretKey.addEventListener("blur", () => {
    if (envSecretKey.type !== "password") envSecretKey.type = "password";
  });
  envSecretKey.addEventListener("focus", () => {
    envSecretKey.type = "text";
  });

  function fillFields(env) {
    envName.value       = env?.name        || "";
    envKeyId.value      = env?.publicKeyId || "";
    envKey.value        = env?.publicKey   || "";
    envIdentifier.value = env?.identifier  || "";
    envSecretKey.value  = env?.secretKey   || "";
    if (env?.secretKey) envSecretKey.type = "password";
  }

  function setAppConfig(env) {
    window.APP_CONFIG = env
      ? {
          publicKeyId: env.publicKeyId,
          publicKey:   env.publicKey,
          identifier:  env.identifier || ""
        }
      : null;
  }

  function applyToPayment() {
    if (typeof initializeHostedFields === "function") {
      const dark = document.body.classList.contains("dark-mode");
      initializeHostedFields(dark);
    }
  }

  // 🧠 Charge la config du serveur (lecture seule) + les environnements locaux
  async function loadEnvsInitial() {
    try {
      // Charger config.json (ou via ton endpoint /api/environments)
      const resp = await fetch("/api/environments");
      if (!resp.ok) throw new Error("Impossible de charger les environnements");
      baseEnvs = await resp.json();

      // Charger les environnements locaux
      customEnvs = JSON.parse(localStorage.getItem("customEnvs") || "{}");

      // Fusionner les deux
      allEnvs = { ...baseEnvs, ...customEnvs };

      // Rafraîchir la liste déroulante
      envSelect.innerHTML = "";
      Object.keys(allEnvs).forEach(key => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = allEnvs[key].name || key;
        // Style différent si environnement local
        if (customEnvs[key]) opt.textContent += " 🟡";
        envSelect.appendChild(opt);
      });

      const newOpt = document.createElement("option");
      newOpt.value = "new";
      newOpt.textContent = "+ New environment";
      envSelect.appendChild(newOpt);

      // Restaurer la sélection précédente
      const lastEnv = localStorage.getItem("lastEnv");
      let selectedKey = lastEnv && allEnvs[lastEnv] ? lastEnv : Object.keys(allEnvs)[0];
      if (!selectedKey) selectedKey = "new";
      envSelect.value = selectedKey;

      if (selectedKey !== "new" && allEnvs[selectedKey]) {
        fillFields(allEnvs[selectedKey]);
        setAppConfig(allEnvs[selectedKey]);
        localStorage.setItem("lastEnv", selectedKey);
        applyToPayment();
      } else {
        fillFields({});
        setAppConfig(null);
      }
    } catch (err) {
      console.error("❌ Erreur de chargement :", err);
      alert("Impossible de récupérer les environnements depuis le serveur.");
    }
  }

  // Changement de sélection
  envSelect.addEventListener("change", () => {
    const key = envSelect.value;
    if (key === "new") {
      fillFields({});
      setAppConfig(null);
      localStorage.removeItem("lastEnv");
      return;
    }

    const env = allEnvs[key];
    if (env) {
      fillFields(env);
      setAppConfig(env);
      localStorage.setItem("lastEnv", key);
      applyToPayment();
    }
  });

  // ➕ Création ou mise à jour d’un environnement (sauvegarde dans localStorage)
  useEnvBtn.addEventListener("click", async () => {
    const name        = envName.value.trim();
    const publicKeyId = envKeyId.value.trim();
    const publicKey   = envKey.value.trim();
    const identifier  = envIdentifier.value.trim();
    const secretKey   = envSecretKey.value.trim();

    if (!name || !publicKeyId || !publicKey) {
      alert("Veuillez renseigner un nom, un Public Key ID et un Public Key.");
      return;
    }

    // 🚫 Empêcher d’écraser un environnement officiel
    if (baseEnvs[name]) {
      alert("❌ Vous ne pouvez pas modifier un environnement officiel.");
      return;
    }

    // Enregistrement local
    customEnvs[name] = { name, publicKeyId, publicKey, identifier, secretKey };
    localStorage.setItem("customEnvs", JSON.stringify(customEnvs));

    await loadEnvsInitial();
    envSelect.value = name;
    setAppConfig(customEnvs[name]);
    localStorage.setItem("lastEnv", name);
    applyToPayment();

    alert("✅ Environnement ajouté localement : " + name);
  });

  // 🗑️ Suppression d’un environnement (local uniquement)
  deleteEnvBtn?.addEventListener("click", async () => {
    const key = envSelect.value;
    if (!key || key === "new") {
      alert("Sélectionnez un environnement existant à supprimer.");
      return;
    }

    // 🚫 Refuser la suppression d’un environnement officiel
    if (baseEnvs[key]) {
      alert("❌ Vous ne pouvez pas supprimer un environnement officiel.");
      return;
    }

    if (!confirm(`Supprimer l'environnement local "${key}" ?`)) return;

    delete customEnvs[key];
    localStorage.setItem("customEnvs", JSON.stringify(customEnvs));
    localStorage.removeItem("lastEnv");
    await loadEnvsInitial();
    alert(`🗑️ Environnement "${key}" supprimé.`);
  });

  // Chargement initial
  loadEnvsInitial();
});
