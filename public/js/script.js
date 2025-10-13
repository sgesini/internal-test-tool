// -----------------------------
// Styles light/dark
// -----------------------------
const lightModeStyle = {
  input: { "font-size": "1em", color: "#000" },
  "::placeholder": { "font-size": "1em", color: "#777", "font-style": "italic" }
};
const darkModeStyle = {
  input: { "font-size": "1em", color: "#fff" },
  "::placeholder": { "font-size": "1em", color: "#aaa", "font-style": "italic" }
};

// -----------------------------
// Helper : browser language
// -----------------------------
function getBrowserLanguage() {
  let language = navigator.language || navigator.userLanguage;
  if (language) language = language.split("-")[0];
  return language || "fr";
}

// -----------------------------
// Dark mode initial & hosted fields
// -----------------------------
const prefersDarkMode =
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
let currentStyle = prefersDarkMode ? darkModeStyle : lightModeStyle;

let hfields = null;

function initializeHostedFields(style, isDarkMode) {
  if (hfields && hfields.dispose) {
    try { hfields.dispose(); } catch (e) {}
    hfields = null;
  }
  if (!window.dalenys || !window.dalenys.hostedFields) return;

  const keyId = window.APP_CONFIG?.publicKeyId;
  const keyValue = window.APP_CONFIG?.publicKey;

  if (!keyId || !keyValue) {
    console.warn("❌ Clés API manquantes pour Hosted Fields");
    return;
  }

  hfields = dalenys.hostedFields({
    key: { id: keyId, value: keyValue },
    theme: { mode: isDarkMode ? "dark" : "light" },
    locale: getBrowserLanguage(),
    fields: {
      brand: {
        id: "brand-container",
        version: 2,
        isCbPreferredNetwork: true,
        style
      },
      card: {
        id: "card-container",
        placeholder: "•••• •••• •••• ••••",
        enableAutospacing: true,
        style: {
          input: { "letter-spacing": "2px", color: isDarkMode ? "#fff" : "#000", "line-height": "40px" },
          "::placeholder": { "font-size": "1em", color: isDarkMode ? "#aaa" : "#777" }
        }
      },
      expiry: {
        id: "expiry-container",
        placeholder: "MM/YY",
        style: {
          input: { color: isDarkMode ? "#fff" : "#000","line-height": "40px" },
          "::placeholder": { "font-size": "1em", color: isDarkMode ? "#aaa" : "#777" }
        }
      },
      cryptogram: {
        id: "cvv-container",
        placeholder: "CVV",
        style: {
          input: { color: isDarkMode ? "#fff" : "#000","line-height": "40px" },
          "::placeholder": { "font-size": "1em", color: isDarkMode ? "#aaa" : "#777" }
        }     
      }
    }
  });

  try { hfields.load(); } catch (e) { console.error("⚠️ load error", e); }
}

// -----------------------------
// Tokenization
// -----------------------------
function tokenizeHandler() {
  if (!hfields?.createToken) {
    alert("Hosted Fields non initialisés.");
    return false;
  }
  hfields.createToken(function (result) {
    if (result.execCode == "0000") {
      document.getElementById("hf-token").value = result.hfToken;
      document.getElementById("selected-brand").value = result.selectedBrand || "";
      try { document.dalenysForm.submit(); } catch(e){}
      window.location.href = `next.html?hfToken=${encodeURIComponent(result.hfToken)}`;
    } else {
      alert(result.execCode + ": " + result.message);
    }
  });
  return false;
}

// -----------------------------
// Init (dark mode + hosted fields init)
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("theme-toggle");
  if (prefersDarkMode) {
    document.body.classList.add("dark-mode");
    if (themeToggle) themeToggle.checked = true;
  }
  if (themeToggle) {
    themeToggle.addEventListener("change", function () {
      const isDark = this.checked;
      document.body.classList.toggle("dark-mode", isDark);
      currentStyle = isDark ? darkModeStyle : lightModeStyle;
      initializeHostedFields(currentStyle, isDark);
    });
  }

  // ⚠️ attendre que l'environnement soit chargé avant d'init Hosted Fields
  const lastEnv = localStorage.getItem("lastEnv");
  if (lastEnv) {
    fetch(`/api/env/${encodeURIComponent(lastEnv)}`)
      .then(r => r.json())
      .then(env => {
        if (env && env.publicKeyId && env.publicKey) {
          window.APP_CONFIG = { publicKeyId: env.publicKeyId, publicKey: env.publicKey };
          initializeHostedFields(currentStyle, prefersDarkMode);
        }
      })
      .catch(console.error);
  }
});
