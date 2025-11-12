// payment-utils.js
// ==================================================
// 🧠 Fonctions utilitaires pour formulaires Dalenys
// ==================================================

window.PaymentUtils = (() => {
  // 🔹 Génère un ORDERID unique
  function generateOrderId() {
    return "RND" + Date.now();
  }

  // 🔹 Injecte les URLs de redirection (success / cancel)
  function injectRedirectUrls(form) {
    const base = window.location.origin;
    const success = form.querySelector("#redirect-success");
    const cancel = form.querySelector("#redirect-cancel");
    if (success) success.value = `${base}/success.html`;
    if (cancel) cancel.value = `${base}/success.html`;
  }

  // 🔹 Calcul du hash via serveur
  async function computeHash(params, secretKey) {
    const resp = await fetch("/computeHash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ params, secretKey }),
    });
    const data = await resp.json();
    if (!data.hash) throw new Error(data.error || "Erreur calcul hash");
    return data.hash;
  }

  // 🔹 Envoi du paiement S2S / API
  async function processPayment(params) {
    const resp = await fetch("/processPayment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return resp.json();
  }

  // 🔹 Gestion des réponses 3DS / redirections
  function handle3DS(result) {
    const res = result.response || {};
    const reqId = result.reqId || "";

    if (res.REDIRECTHTML) {
      const decoded = atob(res.REDIRECTHTML);
      const doc = document.open("text/html", "replace");
      doc.write(decoded);
      doc.close();
      return true;
    }

    if (res.REDIRECTURL) {
      const form3ds = document.createElement("form");
      form3ds.method = "POST";
      form3ds.action = res.REDIRECTURL;
      const params3ds = new URLSearchParams(res.REDIRECTPOSTPARAMS);
      params3ds.forEach((v, k) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form3ds.appendChild(input);
      });
      document.body.appendChild(form3ds);
      form3ds.submit();
      return true;
    }

    // ✅ Pas de 3DS → redirection success
    const successUrl = new URL("success.html", window.location.origin);
    successUrl.searchParams.set("reqId", reqId || "");
    Object.entries(res).forEach(([k, v]) => {
      if (v != null) successUrl.searchParams.set(k, v);
    });
    window.location.href = successUrl.toString();
    return false;
  }

  // ==================================================
// 💳 Détection automatique du type de carte (Brand Detector)
// ==================================================
function initBrandDetector(inputSelector, outputSelector) {
  const input = document.querySelector(inputSelector);
  const output = document.querySelector(outputSelector);
  if (!input || !output) return;

  if (!window.dalenys || !window.dalenys.brandDetector) {
    console.warn("[PaymentUtils] dalenys.brandDetector non chargé !");
    return;
  }

  const detector = window.dalenys.brandDetector;
  let selectedBrand = null; // ✅ pour garder la marque choisie

  const updateSelectedBrand = (brand) => {
    selectedBrand = brand;
    output.querySelectorAll("img").forEach((img) => {
      img.classList.toggle("selected", img.dataset.brand === brand);
    });
  };

  // Récupération depuis le champ
  input.addEventListener("input", () => {
    const value = input.value.replace(/\D/g, "").substring(0, 19);
    input.value = value.replace(/(\d{4})(?=\d)/g, "$1 ").trim();

    const clean = value.replace(/\D/g, "");
    output.innerHTML = "";

    if (clean.length < 6) return;

    const bin = clean.substring(0, 8);
    detector.detectBrandsByBin(bin, (brands) => {
      output.innerHTML = "";
      if (!brands || brands.length === 0) return;

      brands.forEach((b) => {
        const brand = b.brand.toLowerCase();
        const img = document.createElement("img");
        img.dataset.brand = brand;

        switch (brand) {
          case "visa":
            img.src = "https://corporate.visa.com/content/dam/VCOM/corporate/about-visa/images/visa-brandmark-blue-1960x622.png";
            break;
          case "mastercard":
            img.src = "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg";
            break;
          case "cb":
            img.src = "/Resources/CB.svg";
            break;
          case "maestro":
            img.src = "https://upload.wikimedia.org/wikipedia/commons/0/04/Maestro_logo.svg";
            break;
        }

        const brandList = brands.map(b => b.brand.toLowerCase());
        if (brandList.includes('cb')) {
          updateSelectedBrand('cb');
        } else if (brandList.length === 1) {
          updateSelectedBrand(brandList[0]);
        }

        img.alt = brand;
        img.classList.add("brand-logo");

        // ✅ Sélection au clic
        img.addEventListener("click", () => updateSelectedBrand(brand));

        output.appendChild(img);
      });

      // Pré-sélection automatique s’il n’y a qu’une seule brand
      if (brands.length === 1) updateSelectedBrand(brands[0].brand.toLowerCase());
    });
  });

  // ✅ Exporte la marque choisie globalement
  window.PaymentUtils.getSelectedBrand = () => selectedBrand;
}


  // 💳 Auto-format du champ numéro de carte (espaces visuels tous les 4 chiffres)
  function setupCardAutoFormat(selector = "#card-number") {
    const input = document.querySelector(selector);
    if (!input) return;

    input.addEventListener("input", (e) => {
      const cursorPos = input.selectionStart;
      const raw = input.value.replace(/\D/g, ""); // enlève tout sauf chiffres
      const spaced = raw.replace(/(.{4})/g, "$1 ").trim(); // espace tous les 4 chiffres

      // ⚙️ Mise à jour uniquement si différente pour éviter le clignotement
      if (spaced !== input.value) {
        const diff = spaced.length - input.value.length;
        input.value = spaced;
        input.selectionEnd = cursorPos + diff;
      }
    });

    console.log("✨ Auto-format carte activé sur", selector);
  }





  // 🔹 Exporte les fonctions globalement
  return {
    generateOrderId,
    injectRedirectUrls,
    computeHash,
    processPayment,
    handle3DS,
    initBrandDetector, // <-- ajouté ici
    setupCardAutoFormat
  };
})();

// récupère le hfToken depuis l’URL si présent
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const hfToken = params.get("hfToken");
  if (hfToken) {
    const field = document.getElementById("hfToken");
    if (field) field.value = hfToken;
    console.log("✅ HFTOKEN injecté :", hfToken);
  }
});


// ======================================================
// 🗓️ Auto-format pour la date d’expiration (affiche MM/YY mais renvoie MM-YY)
// ======================================================
function setupExpiryAutoFormat(selector = "#expiry") {
  const input = document.querySelector(selector);
  if (!input) return;

  input.addEventListener("input", (e) => {
    let value = input.value.replace(/\D/g, ""); // garde uniquement les chiffres
    if (value.length > 4) value = value.substring(0, 4);

    // ajoute automatiquement le "/" après les 2 premiers chiffres
    if (value.length > 2) {
      value = value.substring(0, 2) + "/" + value.substring(2);
    }

    input.value = value;
  });

  // empêche les caractères non numériques
  input.addEventListener("keypress", (e) => {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
  });

  // corrige le collage (paste)
  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    const clean = pasted.replace(/\D/g, "").substring(0, 4);
    const formatted = clean.length > 2 ? clean.substring(0, 2) + "/" + clean.substring(2) : clean;
    input.value = formatted;
  });

  // ✨ Nettoyage du format avant soumission
  input.addEventListener("blur", () => {
    let val = input.value.replace(/\D/g, ""); // ex: 1230
    if (val.length === 4) {
      const mm = val.substring(0, 2);
      const yy = val.substring(2);
      // enregistre le format final en data-value pour l’API
      input.dataset.cleaned = `${mm}-${yy}`;
    }
  });

  console.log("🗓️ Auto-format expiration (affiche MM/YY, renvoie MM-YY) activé sur", selector);
}

window.PaymentUtils.setupExpiryAutoFormat = setupExpiryAutoFormat;
