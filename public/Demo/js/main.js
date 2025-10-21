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

// main.js
window.StepManager = (function() {
  function setStep(stepNumber) {
    const steps = document.querySelectorAll("#checkout-steps .step");
    steps.forEach((el) => {
      const n = Number(el.dataset.step);
      el.classList.remove("active", "completed");
      if (n < stepNumber) el.classList.add("completed");
      else if (n === stepNumber) el.classList.add("active");
    });
  }

  return { setStep };
})();
