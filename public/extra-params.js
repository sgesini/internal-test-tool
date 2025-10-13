// extra-params.js
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("extra-params-panel");
  const form = document.getElementById("s2s-form") || document.querySelector("form");
  if (!form || !container) return;

  // 🧠 Fonction utilitaire : vérifier si un champ existe déjà
  window.formFieldExists = function (name) {
    return form.querySelector(`[name="${name}"]`) !== null;
  };

  // 📦 Charger les paramètres depuis parameters.json
  const paramResp = await fetch("parameters.json");
  const parameters = await paramResp.json();

  // 🧩 Bouton d’ouverture de la modale
  const addParamsBtn = document.createElement("button");
  addParamsBtn.type = "button";
  addParamsBtn.id = "open-extra-params";
  addParamsBtn.className = "secondary";
  addParamsBtn.textContent = "➕ Add more parameters";
  addParamsBtn.style.marginTop = "12px";
  container.appendChild(addParamsBtn);

  // === Création de la modale ===
  const modal = document.createElement("div");
  modal.id = "extra-params-modal";
  modal.className = "test-modal hidden";
  modal.innerHTML = `
    <div class="test-modal-content">
      <span id="close-extra-params" class="close-btn">&times;</span>
      <h3>Select Additional Parameters</h3>
      <!-- 🔍 Barre de recherche -->
      <input
        type="text"
        id="param-search"
        placeholder="Search parameters..."
        style="width: 100%; padding: 8px; margin-bottom: 10px; border-radius: 6px; border: 1px solid #ccc;"
      />
      <div id="extra-params-container" style="max-height:400px; overflow-y:auto;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const modalContainer = modal.querySelector("#extra-params-container");
  const closeBtn = modal.querySelector("#close-extra-params");
  const searchInput = modal.querySelector("#param-search");
  const activeExtraFields = new Map();

  // === Génère tous les boutons de paramètres ===
  const buttons = Object.entries(parameters).map(([param, info]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = param;
    btn.className = "param-btn";
    btn.style.display = "inline-block";
    btn.style.margin = "4px";
    btn.style.fontSize = "0.9em";
    btn.dataset.searchText = `${param} ${(info.type || "")} ${(info.example || "")}`.toLowerCase();

    const example = info.example ?? "";
    const type = info.type ? ` (${info.type})` : "";

    btn.addEventListener("click", () => {
      if (activeExtraFields.has(param)) {
        activeExtraFields.get(param).remove();
        activeExtraFields.delete(param);
        btn.classList.remove("active-param");
      } else {
        if (window.formFieldExists(param)) {
          btn.style.backgroundColor = "#a00";
          btn.title = "Ce champ existe déjà dans le formulaire";
          setTimeout(() => {
            btn.style.backgroundColor = "";
            btn.title = "";
          }, 2000);
          return;
        }

        const wrapper = document.createElement("div");
        wrapper.classList.add("extra-param-field");
        wrapper.innerHTML = `
          <label>${param}${type}</label>
          <div class="extra-field-input-row">
            <input type="text" name="${param}" value="${example}" />
            <button type="button" class="remove-field-btn">🗑️</button>
          </div>
        `;

        const submitBlock = form.querySelector(".submit");
        form.insertBefore(wrapper, submitBlock);

        wrapper.querySelector(".remove-field-btn").addEventListener("click", () => {
          wrapper.remove();
          activeExtraFields.delete(param);
          btn.classList.remove("active-param");
        });

        activeExtraFields.set(param, wrapper);
        btn.classList.add("active-param");
      }
    });

    modalContainer.appendChild(btn);
    return btn;
  });

  // === 🔍 Recherche dynamique ===
  searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    buttons.forEach((btn) => {
      btn.style.display = btn.dataset.searchText.includes(term) ? "inline-block" : "none";
    });
  });

  // === Ouvrir / fermer la modale ===
  addParamsBtn.addEventListener("click", () => modal.classList.remove("hidden"));
  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });
});
