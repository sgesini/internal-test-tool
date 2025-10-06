// use-case-selection.js
document.addEventListener("DOMContentLoaded", async () => {
  const ucContainer = document.getElementById("use-cases-panel");
  if (!ucContainer) return;

  ucContainer.innerHTML = "<h3>Use-Cases</h3>";
  ucContainer.style.marginBottom = "24px";

  // Récupère les JSON
  const [ucResp, paramResp] = await Promise.all([
    fetch("use-cases.json"),
    fetch("parameters.json")
  ]);
  const useCases = await ucResp.json();
  const parameters = await paramResp.json();

  // 🔑 Choisir quel formulaire utiliser
  const form = document.getElementById("s2s-form") || document.getElementById("paymentForm");
  if (!form) {
    console.warn("⚠️ Aucun formulaire trouvé (#s2s-form ou #paymentForm)");
    return;
  }

  // Trouver le bloc de soumission
  let submitBlock =
    form.querySelector(".submit") || form.querySelector('input[type="submit"]');

  let currentFields = [];
  let activeUC = null; // garde en mémoire le use-case actuellement actif

  Object.entries(useCases).forEach(([ucKey, ucData]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = ucKey;
    btn.className = "primary";

    btn.addEventListener("click", () => {
      // Si on clique sur le même UC → toggle OFF
      if (activeUC === ucKey) {
        currentFields.forEach(el => el.remove());
        currentFields = [];
        activeUC = null;
        btn.classList.remove("active-uc");
        return;
      }

      // Sinon → on enlève les champs actuels et on ajoute les nouveaux
      currentFields.forEach(el => el.remove());
      currentFields = [];

      Object.keys(ucData).forEach(param => {
        const example = parameters[param]?.example || "";
        const type = parameters[param]?.type ? ` (${parameters[param].type})` : "";

        const wrapper = document.createElement("div");
        wrapper.classList.add("uc-field");
        wrapper.innerHTML = `
          <label class="uc-label">${param}${type}</label>
          <input type="text" name="${param}" value="${example}" />
        `;
        form.insertBefore(wrapper, submitBlock);
        currentFields.push(wrapper);
      });

      // Met à jour l'état actif
      activeUC = ucKey;

      // Ajoute un style visuel au bouton actif (optionnel)
      document.querySelectorAll("#use-cases-panel button").forEach(b => b.classList.remove("active-uc"));
      btn.classList.add("active-uc");
    });

    ucContainer.appendChild(btn);
  });
});
