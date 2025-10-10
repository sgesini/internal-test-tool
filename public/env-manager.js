// env-manager.js
// ✅ Version simplifiée : 100 % localStorage
// ✅ Gère la sélection, sauvegarde et suppression des environnements
// ✅ Met à jour les champs du DOM et window.APP_CONFIG

document.addEventListener("DOMContentLoaded", () => {
  const envSelect      = document.getElementById("env-select");
  const envName        = document.getElementById("env-name");
  const envKeyId       = document.getElementById("env-public-key-id");
  const envKey         = document.getElementById("env-public-key");
  const envIdentifier  = document.getElementById("env-identifier");
  const envSecretKey   = document.getElementById("env-secret-key");
  const useEnvBtn      = document.getElementById("use-env");
  const deleteEnvBtn   = document.getElementById("delete-env");

  let customEnvs = {}; // 🔹 stocké dans localStorage

  // --- Masquage du champ secretKey ---
  envSecretKey.addEventListener("blur", () => {
    if (envSecretKey.type !== "password") envSecretKey.type = "password";
  });
  envSecretKey.addEventListener("focus", () => {
    envSecretKey.type = "text";
  });

  // === 🔄 Remplit les champs du panneau Environnement ===
  function fillFields(env) {
    envName.value       = env?.name        || "";
    envKeyId.value      = env?.publicKeyId || "";
    envKey.value        = env?.publicKey   || "";
    envIdentifier.value = env?.identifier  || "";
    envSecretKey.value  = env?.secretKey   || "";
    if (env?.secretKey) envSecretKey.type = "password";
  }

  // === 🔄 Applique la config globale à la fenêtre ===
  function setAppConfig(env) {
    window.APP_CONFIG = env
      ? {
          publicKeyId: env.publicKeyId,
          publicKey:   env.publicKey,
          identifier:  env.identifier || ""
        }
      : null;
  }

  // === 🔄 Met à jour tous les champs HTML contenant "identifier" dans leur id ===
  function updateFormFieldsFromEnv(env) {
    if (!env) return;

    const fields = Array.from(document.querySelectorAll('input[id]'))
      .filter(el => el.id.toLowerCase().includes("identifier"));

    fields.forEach(field => {
      field.value = env.identifier || "";
      console.log(`🆕 Champ mis à jour : ${field.id} = ${env.identifier || ""}`);
    });

    document.dispatchEvent(new CustomEvent("envChanged", { detail: env }));
  }

  // === 🔁 Recharge la liste des environnements depuis localStorage ===
  function loadEnvs() {
    customEnvs = JSON.parse(localStorage.getItem("customEnvs") || "{}");
    envSelect.innerHTML = "";

    Object.keys(customEnvs).forEach(key => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = customEnvs[key].name || key;
      envSelect.appendChild(opt);
    });

    const newOpt = document.createElement("option");
    newOpt.value = "new";
    newOpt.textContent = "+ New environment";
    envSelect.appendChild(newOpt);

    const lastEnv = localStorage.getItem("lastEnv");
    const selectedKey = lastEnv && customEnvs[lastEnv] ? lastEnv : "new";
    envSelect.value = selectedKey;

    if (selectedKey !== "new") {
      const env = customEnvs[selectedKey];
      fillFields(env);
      setAppConfig(env);
      updateFormFieldsFromEnv(env);
      applyToPayment();
    } else {
      fillFields({});
      setAppConfig(null);
    }
  }

  // === 🧩 Applique l’environnement sélectionné à la page (paiement, etc.) ===
  function applyToPayment() {
    if (typeof initializeHostedFields === "function") {
      const dark = document.body.classList.contains("dark-mode");
      initializeHostedFields(dark);
    }
  }

  // === 🔁 Sélection d’un environnement existant ===
  envSelect.addEventListener("change", () => {
    const key = envSelect.value;
    if (key === "new") {
      fillFields({});
      setAppConfig(null);
      updateFormFieldsFromEnv(null);
      localStorage.removeItem("lastEnv");
      return;
    }

    const env = customEnvs[key];
    if (env) {
      fillFields(env);
      setAppConfig(env);
      updateFormFieldsFromEnv(env);
      localStorage.setItem("lastEnv", key);
      applyToPayment();
    }
  });

  // === 🧩 Bouton "Use" (création ou mise à jour) ===
  useEnvBtn.addEventListener("click", () => {
    const name        = envName.value.trim();
    const publicKeyId = envKeyId.value.trim();
    const publicKey   = envKey.value.trim();
    const identifier  = envIdentifier.value.trim();
    const secretKey   = envSecretKey.value.trim();

    if (!name || !publicKeyId || !publicKey) {
      alert("Veuillez renseigner un nom, un Public Key ID et un Public Key.");
      return;
    }

    const env = { name, publicKeyId, publicKey, identifier, secretKey };
    customEnvs[name] = env;
    localStorage.setItem("customEnvs", JSON.stringify(customEnvs));
    localStorage.setItem("lastEnv", name);

    loadEnvs();
    envSelect.value = name;
    setAppConfig(env);
    updateFormFieldsFromEnv(env);
    applyToPayment();

    alert(`✅ Environnement "${name}" enregistré localement.`);
  });

  // === 🗑️ Suppression d’un environnement ===
  deleteEnvBtn?.addEventListener("click", () => {
    const key = envSelect.value;
    if (!key || key === "new") {
      alert("Sélectionnez un environnement existant à supprimer.");
      return;
    }

    if (!confirm(`Supprimer l'environnement "${key}" ?`)) return;

    delete customEnvs[key];
    localStorage.setItem("customEnvs", JSON.stringify(customEnvs));
    localStorage.removeItem("lastEnv");

    loadEnvs();
    alert(`🗑️ Environnement "${key}" supprimé.`);
  });

  // 🚀 Initialisation
  loadEnvs();
});
