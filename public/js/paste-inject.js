// paste-inject.js
document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("paste-parse-btn");
  const input = document.getElementById("paste-input");
  const feedback = document.getElementById("paste-feedback");
  const form = document.getElementById("s2s-form");

  if (!btn || !input || !form) return;

  // Petit utilitaire d'insertion type extra-params
  function addOrUpdateField(key, value) {
    let field = form.querySelector(`[name="${key}"]`);
    if (field) {
      field.value = value;
      return "updated";
    }

    // créer un champ similaire à extra-params
    const wrapper = document.createElement("div");
    wrapper.classList.add("form-group", "extra-param-field");
    wrapper.innerHTML = `
      <label>${key}</label>
      <input type="text" name="${key}" value="${value}" />
    `;
    const anchor = form.querySelector(".submit") || form.lastElementChild;
    form.insertBefore(wrapper, anchor);
    return "created";
  }

  btn.addEventListener("click", async () => {
    feedback.textContent = "";
    const text = input.value.trim();
    if (!text) {
      feedback.textContent = "⚠️ No data pasted.";
      feedback.style.color = "orange";
      return;
    }

    let countCreated = 0, countUpdated = 0;

    // Match les lignes clé: "valeur" ou clé="valeur"
    const regex = /^\s*([\w\d_]+)\s*[:=]\s*"?([^"]*)"?\s*$/gm;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();
      const result = addOrUpdateField(key, value);
      if (result === "created") countCreated++;
      else countUpdated++;
    }

    feedback.textContent = `✅ ${countUpdated} updated, ${countCreated} created.`;
    feedback.style.color = "green";
    console.log(`Paste & Inject: ${countUpdated} updated, ${countCreated} created.`);
  });
});
