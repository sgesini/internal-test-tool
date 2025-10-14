// payment-form.js
// Gère le bloc de paiement S2S

window.PaymentForm = (function () {
  function init() {
    const form = document.getElementById("s2s-payment-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const cardholder = form.querySelector("#cardholder").value.trim();
      const number = form.querySelector("#card-number").value.replace(/\s+/g, "");
      const expiry = form.querySelector("#expiry").value.trim();
      const cvv = form.querySelector("#cvv").value.trim();

      if (!cardholder || !number || !expiry || !cvv) {
        alert("Merci de remplir tous les champs de la carte.");
        return;
      }

      // 👉 Ici tu pourras appeler ton backend pour faire le vrai paiement S2S
      console.log("Paiement simulé :", { cardholder, number, expiry, cvv });
      alert("✅ Paiement simulé avec succès !");
    });
  }

  return { init };
})();
