// modal-manager.js
// Gère les modales "Environment" et "Test Cards"

window.ModalManager = (function () {
  function init() {
    const envModal = document.getElementById("env-modal");
    const openEnvBtn = document.getElementById("open-env-modal");
    const closeEnvBtn = document.getElementById("close-env-modal");

    const testModal = document.getElementById("test-cards-modal");
    const openTestBtn = document.getElementById("open-test-cards");
    const closeTestBtn = document.getElementById("close-test-cards");

    // 🌍 Environment modal
    openEnvBtn?.addEventListener("click", () => envModal.classList.remove("hidden"));
    closeEnvBtn?.addEventListener("click", () => envModal.classList.add("hidden"));
    envModal?.addEventListener("click", (e) => {
      if (e.target === envModal) envModal.classList.add("hidden");
    });

    // 💳 Test cards modal
    openTestBtn?.addEventListener("click", () => {
      if (typeof buildTestCardsTable === "function") buildTestCardsTable();
      testModal.classList.remove("hidden");
    });
    closeTestBtn?.addEventListener("click", () => testModal.classList.add("hidden"));
    testModal?.addEventListener("click", (e) => {
      if (e.target === testModal) testModal.classList.add("hidden");
    });
  }

  return { init };
})();
