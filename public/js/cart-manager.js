// cart-manager.js
// Maintains cart state, persists to localStorage, updates DOM cart panel, and exposes API
// Exposes window.CartManager.init(options) and window.CartManager.clear()

(function () {
  const STORAGE_KEY = "demo_cart";
  const DEFAULTS = {
    cartSelector: "#cart-panel", // where to render the cart summary
    currency: "EUR",
    decimalPlaces: 2,
    addEventName: "cart:add",
    removeEventName: "cart:remove",
    stateEventName: "cart:state"
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || "{}";
      const parsed = JSON.parse(raw);
      return parsed;
    } catch {
      return {};
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function formatCurrency(cents, decimalPlaces = 2) {
    const n = Number(cents || 0) / 100;
    return n.toLocaleString(undefined, { style: "currency", currency: "EUR", minimumFractionDigits: decimalPlaces });
  }

  function buildCartPanel() {
    let panel = document.querySelector(DEFAULTS.cartSelector);
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = (DEFAULTS.cartSelector.startsWith("#") ? DEFAULTS.cartSelector.slice(1) : DEFAULTS.cartSelector);
      panel.className = "cart-panel";
      // basic inline styling — can be overridden by CSS
      panel.style.minWidth = "260px";
      panel.style.borderLeft = "1px solid rgba(0,0,0,0.08)";
      panel.style.padding = "16px";
      panel.style.background = "var(--panel-background, #f7f7f7)";
      panel.style.position = "sticky";
      panel.style.top = "16px";
      document.body.appendChild(panel);
    }
    panel.innerHTML = `
      <h3>Panier</h3>
      <div class="cart-items" style="margin-bottom:12px;"></div>
      <div class="cart-total" style="font-weight:600; margin-bottom:8px;">Total: —</div>
      <div class="cart-actions" style="display:flex; gap:8px;">
        <button type="button" class="clear-cart">Vider</button>
        <button type="button" class="checkout" disabled>Checkout</button>
      </div>
    `;
    return panel;
  }

  function render(state, panel) {
    panel = panel || document.querySelector(DEFAULTS.cartSelector);
    if (!panel) panel = buildCartPanel();

    const itemsEl = panel.querySelector(".cart-items");
    const totalEl = panel.querySelector(".cart-total");
    const checkoutBtn = panel.querySelector(".checkout");
    const clearBtn = panel.querySelector(".clear-cart");

    // render items
    itemsEl.innerHTML = "";
    const ids = Object.keys(state).sort();
    let total = 0;
    if (ids.length === 0) {
      itemsEl.innerHTML = "<div class='empty'>Votre panier est vide</div>";
      checkoutBtn.disabled = true;
    } else {
      ids.forEach((id) => {
        const it = state[id];
        const line = document.createElement("div");
        line.className = "cart-item";
        line.style.display = "flex";
        line.style.justifyContent = "space-between";
        line.style.alignItems = "center";
        line.style.marginBottom = "8px";

        const left = document.createElement("div");
        left.innerHTML = `<div style="font-weight:600">${escapeHtml(it.name)}</div>
                          <div style="font-size:0.9rem;color:#666">${formatCurrency(it.price)}</div>`;
        const right = document.createElement("div");
        right.style.textAlign = "right";
        right.innerHTML = `<div>${it.qty} ×</div><div style="font-weight:600">${formatCurrency(it.price * it.qty)}</div>`;

        line.appendChild(left);
        line.appendChild(right);
        itemsEl.appendChild(line);

        total += it.price * it.qty;
      });
      checkoutBtn.disabled = false;
    }

    totalEl.textContent = "Total: " + formatCurrency(total);
    // wire buttons
    clearBtn.onclick = () => {
      if (!confirm("Vider le panier ?")) return;
      state = {};
      saveState(state);
      render(state, panel);
      document.dispatchEvent(new CustomEvent(DEFAULTS.stateEventName, { detail: state }));
    };

checkoutBtn.onclick = () => {
  // ✅ On ne vide plus le panier !
  document.dispatchEvent(new CustomEvent("cart:checkout", { detail: state }));
};

  }

  function addItemToState(state, item) {
    const id = item.id;
    const qty = item.qty || 1;
    if (!state[id]) state[id] = { id, name: item.name, price: Number(item.price), qty: 0 };
    state[id].qty += qty;
    if (state[id].qty <= 0) delete state[id];
    return state;
  }

  function removeItemFromState(state, item) {
    const id = item.id;
    const qty = item.qty || 1;
    if (!state[id]) return state;
    state[id].qty -= qty;
    if (state[id].qty <= 0) delete state[id];
    return state;
  }

  function init(userOpts = {}) {
    const opts = Object.assign({}, DEFAULTS, userOpts);
    window.CartManager = window.CartManager || {};
    const panel = buildCartPanel();

    let state = loadState();
    render(state, panel);
    // broadcast initial state so article badges can update
    document.dispatchEvent(new CustomEvent(opts.stateEventName, { detail: state }));
    document.dispatchEvent(new CustomEvent("cart:updated", { detail: state }));


    // Listen to add/remove events
    document.addEventListener(opts.addEventName, (e) => {
      const detail = e.detail;
      if (!detail || !detail.id) return;
      state = addItemToState(state, detail);
      saveState(state);
      render(state, panel);
      document.dispatchEvent(new CustomEvent(opts.stateEventName, { detail: state }));
    });

    document.addEventListener(opts.removeEventName, (e) => {
      const detail = e.detail;
      if (!detail || !detail.id) return;
      state = removeItemFromState(state, detail);
      saveState(state);
      render(state, panel);
      document.dispatchEvent(new CustomEvent(opts.stateEventName, { detail: state }));
    });

    // expose small API
    window.CartManager.getState = () => Object.assign({}, state);
    window.CartManager.clear = () => {
      state = {};
      saveState(state);
      render(state, panel);
      document.dispatchEvent(new CustomEvent(opts.stateEventName, { detail: state }));
    };
  }

  // small helper to escape HTML for names
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  // expose init
  window.CartManager = window.CartManager || {};
  window.CartManager.init = init;
})();
