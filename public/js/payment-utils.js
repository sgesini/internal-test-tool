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

  // 🔹 Exporte les fonctions globalement
  return {
    generateOrderId,
    injectRedirectUrls,
    computeHash,
    processPayment,
    handle3DS,
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
