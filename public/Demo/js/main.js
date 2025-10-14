// main.js
// Initialise tous les modules du projet Demo Shop

document.addEventListener("DOMContentLoaded", () => {
  // Managers de base
  CartManager.init();
  ArticleManager.init();

  // Adresses
  AddressManager.init();

  // Checkout & paiement
  CheckoutManager.init();
  PaymentForm.init();

  // Modales
  ModalManager.init();

  console.log("✅ Demo Shop initialized");
});
