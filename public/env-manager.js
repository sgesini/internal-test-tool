// env-manager.js
// ✅ version hybride : config.json (lecture seule) + environnements locaux (localStorage)
// ✅ met à jour tous les inputs dont l'id contient "identifier" dans le HTML actif

document.addEventListener("DOMContentLoaded", () => {
  const envSelect      = document.getElementById("env-select");
  const envName        = document.getElementById("env-name");
  const envKeyId       = document.getElementById("env-public-key-id");
  const envKey         = document.getElementById("env-public-key");
  const envIdentifier  = document.getElementById("env-identifier");
  const envSecretKey   = document.getElementById("env-secret-key");
  const useEnvBtn      = document.getElementById("use-env");
  const deleteEnvBtn   = document.getElementById("delete-env");

  let baseEnvs = {};   // 🟦 depuis config.json (lecture seule)
  let customEnvs = {}; // 🟨 depuis localStorage (modifiable)
  let allEnvs = {};    // fusion des deux

  // --- Masquage du champ secretKey ---
  envSecretKey.addEventListener("blur", () => {
    if (envSecretKey.type !== "password") envSecretKey.type = "password";
  });
  envSecretKey.addEventListener("focus", () => {
    envSecretKey.type = "text";
  });

  // === 🔄 Remplir les champs du panneau Environnement ===
  function fillFields(env) {
    envName.value       = env?.name        || "";
    envKeyId.value      = env?.publicKeyId || "";
    envKey.value        = env?.publicKey   || "";
    envIdentifier.value = env?.identifier  || "";
    envSecretKey.value  = env?.secretKey   || "";
    if (env?.secretKey) envSecretKey.type = "password";
  }

  // === 🔄 Appliquer la config à l'app ===
  function setAppConfig(env) {
    window.APP_CONFIG = env
      ? {
          publicKeyId: env.publicKeyId,
          publicKey:   env.publicKey,
          identifier:  env.identifier || ""
        }
      : null;
  }

  // === 🔄 Met à jour tous les champs du HTML dont l'id contient "identifier" ===
  function updateFormFieldsFromEnv(env) {
    if (!env) return;

    const allIdentifierFields = Array.from(document.querySelectorAll('input[id]'))
      .filter(el => el.id.toLowerCase().includes("identifier"));

    allIdentifierFields.forEach(field => {
      field.value = env.identifier || "";
      console.log(`🆕 Champ mis à jour : ${field.id} = ${env.identifier || ""}`);
    });

    document.dispatchEvent(new CustomEvent("envChanged", { detail: env }));
  }

  // === 🔄 Réinitialiser le bloc de paiement ===
  function applyToPayment() {
    if (typeof initializeHostedFields === "function") {
      const dark = document.body.classList.contains("dark-mode");
      initializeHostedFields(dark);
    }
  }

  // === 📥 Chargement initial des environnements ===
  async function loadEnvsInitial() {
    try {
      const resp = await fetch("/api/environments");
      if (!resp.ok) throw new Error("Impossible de charger les environnements");
      baseEnvs = await resp.json();

      customEnvs = JSON.parse(localStorage.getItem("customEnvs") || "{}");
      allEnvs = { ...baseEnvs, ...customEnvs };

      envSelect.innerHTML = "";
      Object.keys(allEnvs).forEach(key => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = allEnvs[key].name || key;
        if (customEnvs[key]) opt.textContent += " 🟡"; // badge pour locaux
        envSelect.appendChild(opt);
      });

      const newOpt = document.createElement("option");
      newOpt.value = "new";
      newOpt.textContent = "+ New environment";
      envSelect.appendChild(newOpt);

      const lastEnv = localStorage.getItem("lastEnv");
      let selectedKey = lastEnv && allEnvs[lastEnv] ? lastEnv : Object.keys(allEnvs)[0];
      if (!selectedKey) selectedKey = "new";
      envSelect.value = selectedKey;

      if (selectedKey !== "new" && allEnvs[selectedKey]) {
        fillFields(allEnvs[selectedKey]);
        setAppConfig(allEnvs[selectedKey]);
        updateFormFieldsFromEnv(allEnvs[selectedKey]);
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

  // === 🔁 Changement de sélection ===
  envSelect.addEventListener("change", () => {
    const key = envSelect.value;
    if (key === "new") {
      fillFields({});
      setAppConfig(null);
      updateFormFieldsFromEnv(null);
      localStorage.removeItem("lastEnv");
      return;
    }

    const env = allEnvs[key];
    if (env) {
      fillFields(env);
      setAppConfig(env);
      updateFormFieldsFromEnv(env);
      localStorage.setItem("lastEnv", key);
      applyToPayment();
    }
  });

  // === 🧩 Bouton "Use Environment" ===
  useEnvBtn.addEventListener("click", async () => {
    const key = envSelect.value;
    const name        = envName.value.trim();
    const publicKeyId = envKeyId.value.trim();
    const publicKey   = envKey.value.trim();
    const identifier  = envIdentifier.value.trim();
    const secretKey   = envSecretKey.value.trim();

    if (!name || !publicKeyId || !publicKey) {
      alert("Veuillez renseigner un nom, un Public Key ID et un Public Key.");
      return;
    }

    // 🟦 Environnement officiel → juste appliquer
    if (baseEnvs[key]) {
      const env = baseEnvs[key];
      setAppConfig(env);
      localStorage.setItem("lastEnv", key);
      applyToPayment();
      updateFormFieldsFromEnv(env);
      alert("✅ Environnement officiel appliqué : " + key);
      return;
    }

    // 🟨 Environnement local
    const env = { name, publicKeyId, publicKey, identifier, secretKey };
    customEnvs[name] = env;
    localStorage.setItem("customEnvs", JSON.stringify(customEnvs));

    await loadEnvsInitial();
    envSelect.value = name;
    setAppConfig(env);
    localStorage.setItem("lastEnv", name);
    applyToPayment();
    updateFormFieldsFromEnv(env);

    alert("✅ Environnement local appliqué : " + name);
  });

  // === 🗑️ Suppression d’un environnement local ===
  deleteEnvBtn?.addEventListener("click", async () => {
    const key = envSelect.value;
    if (!key || key === "new") {
      alert("Sélectionnez un environnement existant à supprimer.");
      return;
    }

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

  // 🚀 Chargement initial
  loadEnvsInitial();
});
