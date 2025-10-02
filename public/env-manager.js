// env-manager.js
// Gestion des environnements + application immédiate au bloc de paiement
// ✅ version avec champ Secret Key masqué au blur

document.addEventListener("DOMContentLoaded", () => {
  const envSelect      = document.getElementById("env-select");
  const envName        = document.getElementById("env-name");
  const envKeyId       = document.getElementById("env-public-key-id");
  const envKey         = document.getElementById("env-public-key");
  const envIdentifier  = document.getElementById("env-identifier");
  const envSecretKey   = document.getElementById("env-secret-key"); // 🔑 nouveau champ
  const useEnvBtn      = document.getElementById("use-env");
  const deleteEnvBtn   = document.getElementById("delete-env");

  let allEnvs = {}; // cache local

  // --- Masquage automatique de la secretKey -----------------
  envSecretKey.addEventListener("blur", () => {
    if (envSecretKey.type !== "password") {
      envSecretKey.type = "password"; // masque le contenu quand on quitte le champ
    }
  });
  envSecretKey.addEventListener("focus", () => {
    envSecretKey.type = "text"; // ré-affiche temporairement lors de l'édition
  });
  // ----------------------------------------------------------

  // Remplit les champs du formulaire quand on sélectionne un environnement
  function fillFields(env) {
    envName.value       = env?.name        || "";
    envKeyId.value      = env?.publicKeyId || "";
    envKey.value        = env?.publicKey   || "";
    envIdentifier.value = env?.identifier  || "";
    envSecretKey.value  = env?.secretKey   || ""; // 🔑 affiche la secretKey
    // On masque immédiatement si une clé est présente
    if (env?.secretKey) envSecretKey.type = "password";
  }

  // Met à jour la config utilisée par le bloc de paiement
  function setAppConfig(env) {
    window.APP_CONFIG = env
      ? {
          publicKeyId: env.publicKeyId,
          publicKey:   env.publicKey,
          identifier:  env.identifier || ""
        }
      : null;
  }

  // Applique la config au bloc de paiement (script.js doit fournir initializeHostedFields)
  function applyToPayment() {
    if (typeof initializeHostedFields === "function") {
      const dark = document.body.classList.contains("dark-mode");
      initializeHostedFields(dark);
    }
  }

  // Charge les environnements depuis le serveur et remplit la liste
  async function loadEnvsInitial() {
    try {
      const resp = await fetch("/api/environments");
      if (!resp.ok) throw new Error("Impossible de charger les environnements");
      allEnvs = await resp.json();

      envSelect.innerHTML = "";
      Object.keys(allEnvs).forEach(key => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = allEnvs[key].name || key;
        envSelect.appendChild(opt);
      });
      const newOpt = document.createElement("option");
      newOpt.value = "new";
      newOpt.textContent = "+ New environnement";
      envSelect.appendChild(newOpt);

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

  // Changement de sélection dans la liste
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

  // Création / mise à jour d'un environnement
  useEnvBtn.addEventListener("click", async () => {
    const name        = envName.value.trim();
    const publicKeyId = envKeyId.value.trim();
    const publicKey   = envKey.value.trim();
    const identifier  = envIdentifier.value.trim();
    const secretKey   = envSecretKey.value.trim(); // 🔑 récupère la secretKey

    if (!name || !publicKeyId || !publicKey) {
      alert("Veuillez renseigner un nom, un Public Key ID et un Public Key.");
      return;
    }

    try {
      const resp = await fetch("/api/environments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          publicKeyId,
          publicKey,
          identifier,
          secretKey    // 🔑 envoi au serveur
        })
      });
      if (!resp.ok) throw new Error("Échec de la sauvegarde");

      allEnvs[name] = { name, publicKeyId, publicKey, identifier, secretKey };
      await loadEnvsInitial();
      envSelect.value = name;
      setAppConfig(allEnvs[name]);
      localStorage.setItem("lastEnv", name);
      applyToPayment();

      alert("Environnement appliqué : " + name);
    } catch (err) {
      console.error("❌ Erreur enregistrement :", err);
      alert("Impossible d’enregistrer l’environnement.");
    }
  });

  // Suppression d'un environnement
  deleteEnvBtn?.addEventListener("click", async () => {
    const key = envSelect.value;
    if (!key || key === "new") {
      alert("Sélectionnez un environnement existant à supprimer.");
      return;
    }
    if (!confirm(`Supprimer l'environnement "${key}" ?`)) return;

    try {
      const resp = await fetch(`/api/environments/${encodeURIComponent(key)}`, {
        method: "DELETE"
      });
      if (!resp.ok) throw new Error("Échec de la suppression");

      delete allEnvs[key];
      localStorage.removeItem("lastEnv");
      await loadEnvsInitial();
      alert(`Environnement "${key}" supprimé.`);
    } catch (err) {
      console.error("❌ Erreur suppression :", err);
      alert("Impossible de supprimer l'environnement.");
    }
  });

  // Chargement initial
  loadEnvsInitial();
});
