// extra-params.js (version robuste)
document.addEventListener("DOMContentLoaded", () => {
  // Laisse les autres scripts (form-handler/env-manager) finir leur 1er passage
  requestAnimationFrame(async () => {
    try {
      const form = document.getElementById("s2s-form") || document.querySelector("form");
      if (!form) {
        console.warn("extra-params: Aucun formulaire trouvé. Abort.");
        return;
      }

      // 1) Récupérer/Créer le conteneur #extra-params-panel (sous le titre)
      let container = document.getElementById("extra-params-panel");
      if (!container) {
        console.warn("extra-params: #extra-params-panel introuvable, je le crée.");
        const h3 = form.querySelector("h3");
        container = document.createElement("div");
        container.id = "extra-params-panel";
        if (h3 && h3.nextSibling) {
          h3.parentNode.insertBefore(container, h3.nextSibling);
        } else {
          form.insertBefore(container, form.firstChild);
        }
      }

      // 2) Prépare l’utilitaire global pour éviter les doublons
      window.formFieldExists = function(name) {
        return !!form.querySelector(`[name="${name}"]`);
      };

      // 3) Charge parameters.json
      let parameters = {};
      try {
        const paramResp = await fetch("parameters.json", { cache: "no-cache" });
        if (!paramResp.ok) throw new Error(`HTTP ${paramResp.status}`);
        parameters = await paramResp.json();
      } catch (e) {
        console.error("extra-params: Impossible de charger parameters.json :", e);
        const warn = document.createElement("div");
        warn.style.margin = "8px 0";
        warn.style.padding = "8px";
        warn.style.border = "1px solid #a00";
        warn.style.color = "#a00";
        warn.textContent = "⚠️ Impossible de charger parameters.json. Vérifiez que le fichier est bien dans /public/.";
        container.appendChild(warn);
        return; // pas de paramètres → on s’arrête
      }

      // 4) Crée le bouton principal
      const addParamsBtn = document.createElement("button");
      addParamsBtn.type = "button";
      addParamsBtn.id = "open-extra-params";
      addParamsBtn.className = "secondary";
      addParamsBtn.textContent = "➕ Add more parameters";
      addParamsBtn.style.marginTop = "12px";
      container.appendChild(addParamsBtn);

      // 5) Construit la modale (avec barre de recherche + lien doc)
      const modal = document.createElement("div");
      modal.id = "extra-params-modal";
      modal.className = "test-modal hidden";
      modal.innerHTML = `
        <div class="test-modal-content">
          <span id="close-extra-params" class="close-btn">&times;</span>
          <h3 style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;">
            Select Additional Parameters
            <a href="https://developer.dalenys.com/ui/developer-doc/parameter-reference.html" target="_blank" rel="noopener"
               style="font-weight:400;font-size:0.9em;opacity:0.9;">
              (Check the parameters reference here)
            </a>
          </h3>
          <div style="margin:8px 0 12px;">
            <input type="text" id="extra-params-search" placeholder="Search parameter..."
                   style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--input-border-color);background:var(--input-background);color:var(--text-color);" />
          </div>
          <div id="extra-params-container" style="max-height:400px; overflow-y:auto;"></div>
        </div>
      `;
      document.body.appendChild(modal);

      const modalContainer = modal.querySelector("#extra-params-container");
      const closeBtn = modal.querySelector("#close-extra-params");
      const searchInput = modal.querySelector("#extra-params-search");
      const activeExtraFields = new Map();

      // Trouver le « repère » pour insérer au-dessus du bouton submit
      function findSubmitAnchor() {
        // 1) <p class="submit">...</p>
        let anchor = form.querySelector(".submit");
        if (anchor) return anchor;
        // 2) input[type=submit]
        const submitInput = form.querySelector('input[type="submit"], button[type="submit"]');
        if (submitInput && submitInput.parentElement) return submitInput.parentElement;
        // 3) fallback: à la fin du form
        return null;
      }

      function createParamButton(param, info) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = param;
        btn.className = "param-btn";
        btn.style.display = "inline-block";
        btn.style.margin = "4px";
        btn.style.fontSize = "0.9em";

        const example = info?.example ?? "";
        const type = info?.type ? ` (${info.type})` : "";

        btn.addEventListener("click", () => {
          // déjà ajouté via ce script → retirer
          if (activeExtraFields.has(param)) {
            activeExtraFields.get(param).remove();
            activeExtraFields.delete(param);
            btn.classList.remove("active-param");
            return;
          }

          // existe déjà (via use-case ou champ natif)
          if (window.formFieldExists(param)) {
            btn.style.backgroundColor = "#a00";
            btn.title = "Ce champ existe déjà dans le formulaire";
            setTimeout(() => {
              btn.style.backgroundColor = "";
              btn.title = "";
            }, 1800);
            return;
          }

          // créer le champ
          const wrapper = document.createElement("div");
          wrapper.classList.add("extra-param-field", "form-group");
          wrapper.innerHTML = `
            <label>${param}${type}</label>
            <div class="extra-field-input-row" style="display:flex; gap:8px; align-items:center;">
              <input type="text" name="${param}" value="${example}" style="flex:1;" />
              <button type="button" class="remove-field-btn" title="Supprimer ce champ">🗑️</button>
            </div>
          `;

          // insérer juste au-dessus du submit
          const anchor = findSubmitAnchor();
          if (anchor) {
            form.insertBefore(wrapper, anchor);
          } else {
            form.appendChild(wrapper);
          }

          // retrait depuis le formulaire
          wrapper.querySelector(".remove-field-btn").addEventListener("click", () => {
            wrapper.remove();
            activeExtraFields.delete(param);
            btn.classList.remove("active-param");
          });

          activeExtraFields.set(param, wrapper);
          btn.classList.add("active-param");
        });

        return btn;
      }

      // Rendering des boutons → avec (re)filtrage en direct
      function renderButtons(filter = "") {
        modalContainer.innerHTML = "";
        const norm = filter.trim().toLowerCase();
        Object.entries(parameters).forEach(([param, info]) => {
          if (!norm || param.toLowerCase().includes(norm)) {
            modalContainer.appendChild(createParamButton(param, info));
          }
        });
        if (!modalContainer.children.length) {
          const empty = document.createElement("div");
          empty.style.opacity = "0.8";
          empty.style.padding = "6px 2px";
          empty.textContent = "No parameter matches your search.";
          modalContainer.appendChild(empty);
        }
      }

      renderButtons();

      // events modale
      addParamsBtn.addEventListener("click", () => modal.classList.remove("hidden"));
      closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.add("hidden");
      });

      searchInput.addEventListener("input", (e) => {
        renderButtons(e.target.value || "");
      });

      console.log("extra-params: prêt ✅");
    } catch (err) {
      console.error("extra-params: erreur inattendue:", err);
    }
  });
});
