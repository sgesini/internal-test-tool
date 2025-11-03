// checkout-manager.js
// Gère la validation du panier et l'affichage du paiement

window.CheckoutManager = (function () {
  function checkAddressesFilled() {
    const addressFields = [
      "billing-name", "billing-street", "billing-zip", "billing-city", "billing-country",
      "shipping-name", "shipping-street", "shipping-zip", "shipping-city", "shipping-country"
    ];
    return addressFields.every(id => {
      const field = document.getElementById(id);
      if (id.startsWith("shipping") && document.getElementById("same-as-billing").checked)
        return true;
      return field && field.value.trim() !== "";
    });
  }

document.addEventListener("cart:updated", (e) => {
  const checkoutBtn = document.querySelector(".checkout");
  if (!checkoutBtn) return;

  const cartState = e.detail || {};
  checkoutBtn.disabled = Object.keys(cartState).length === 0;
});


  function updateCheckoutState() {
    const checkoutBtn = document.querySelector(".checkout");
    const cartNotEmpty = (CartManager.getTotalItems && CartManager.getTotalItems() > 0);
    const addressesOk = checkAddressesFilled();
    checkoutBtn.disabled = !(cartNotEmpty && addressesOk);
  }

  function init() {
    const checkoutBtn = document.querySelector(".checkout");
    const paymentSection = document.getElementById("payment-section");
    // 🔁 Vérifie l'état initial du panier après un court délai
setTimeout(() => {
  const cartState = CartManager.getState ? CartManager.getState() : {};
  const checkoutBtn = document.querySelector(".checkout");
  if (checkoutBtn) {
    checkoutBtn.disabled = Object.keys(cartState).length === 0;
  }
}, 100);


    // champs adresses
    document.querySelectorAll("#addresses-section input").forEach(input => {
      input.addEventListener("input", updateCheckoutState);
    });
    document.getElementById("same-as-billing").addEventListener("change", updateCheckoutState);

    // hook dans le cart manager
    const oldUpdate = CartManager.updateCartDisplay;
    CartManager.updateCartDisplay = function() {
      oldUpdate.call(this);
      updateCheckoutState();
    };

    checkoutBtn.addEventListener("click", () => {
  if (checkoutBtn.disabled) return;
  paymentSection.classList.remove("hidden");
  paymentSection.classList.add("visible");
  paymentSection.scrollIntoView({ behavior: "smooth" });

  // 🆕 Affiche la prévisualisation Dalenys une fois le paiement visible
  if (window.PaymentForm && typeof PaymentForm.showPreview === "function") {
    PaymentForm.showPreview();
  }
});


    updateCheckoutState();
  }

  return { init };
})();
