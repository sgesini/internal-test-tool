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

  Object.entries(useCases).forEach(([ucKey, ucData]) => {
    const ucDiv = document.createElement("div");
    ucDiv.style.display = "flex";
    ucDiv.style.alignItems = "center";
    ucDiv.style.gap = "10px";
    ucDiv.style.marginBottom = "8px";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = ucKey;
    addBtn.className = "primary";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "X";
    delBtn.className = "danger";

    addBtn.addEventListener("click", () => {
      currentFields.forEach(el => el.remove());
      currentFields = [];

      Object.keys(ucData).forEach(param => {
        const example = parameters[param]?.example || "";
        const type = parameters[param]?.type ? ` (${parameters[param].type})` : "";

        const wrapper = document.createElement("div");
        wrapper.classList.add("uc-field");
        wrapper.innerHTML = `
          <label class="uc-label">${param}${type}</label>
          <input type="text" name="params[${param}]" value="${example}" />
        `;
        form.insertBefore(wrapper, submitBlock);
        currentFields.push(wrapper);
      });
    });

    delBtn.addEventListener("click", () => {
      currentFields.forEach(el => el.remove());
      currentFields = [];
    });

    ucDiv.appendChild(addBtn);
    ucDiv.appendChild(delBtn);
    ucContainer.appendChild(ucDiv);
  });
});
