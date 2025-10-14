// article-manager.js
// Responsible for wiring article cards (+ / -) and emitting cart events.
// Exposes window.ArticleManager.init(options)
// Expected article elements: .article-card[data-id][data-name][data-price]
// If +/- controls absent, they're injected automatically.

(function () {
  const DEFAULTS = {
    selector: ".article-card",
    plusClass: "article-plus",
    minusClass: "article-minus",
    qtyBadgeClass: "article-qty-badge",
    addEventName: "cart:add",
    removeEventName: "cart:remove",
    clickToAdd: true // clicking the card adds one item
  };

  function createButton(text, cls, title) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = cls;
    btn.title = title || text;
    btn.innerHTML = text;
    return btn;
  }

  function ensureControls(el, opts) {
    // top-right controls wrapper
    let controls = el.querySelector(".article-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "article-controls";
      // style can be left to CSS, but provide minimal inline layout safe fallback
      controls.style.position = "absolute";
      controls.style.top = "8px";
      controls.style.right = "8px";
      controls.style.display = "flex";
      controls.style.gap = "4px";
      el.style.position = el.style.position || "relative";
      el.appendChild(controls);
    }

    if (!controls.querySelector(`.${opts.minusClass}`)) {
      const minus = createButton("−", opts.minusClass, "Remove one");
      controls.appendChild(minus);
    }
    if (!controls.querySelector(`.${opts.plusClass}`)) {
      const plus = createButton("+", opts.plusClass, "Add one");
      controls.appendChild(plus);
    }

    // qty badge (optional)
    if (!el.querySelector(`.${opts.qtyBadgeClass}`)) {
      const badge = document.createElement("span");
      badge.className = opts.qtyBadgeClass;
      badge.style.minWidth = "22px";
      badge.style.padding = "2px 6px";
      badge.style.borderRadius = "12px";
      badge.style.background = "rgba(0,0,0,0.6)";
      badge.style.color = "#fff";
      badge.style.fontSize = "0.85rem";
      badge.style.display = "inline-block";
      badge.style.textAlign = "center";
      badge.textContent = "0";
      controls.appendChild(badge);
    }
  }

  function dispatchAdd(el, qty = 1, opts) {
    const detail = {
      id: el.dataset.id,
      name: el.dataset.name,
      price: Number(el.dataset.price), // cents
      qty
    };
    document.dispatchEvent(new CustomEvent(opts.addEventName, { detail }));
  }

  function dispatchRemove(el, qty = 1, opts) {
    const detail = {
      id: el.dataset.id,
      name: el.dataset.name,
      price: Number(el.dataset.price),
      qty
    };
    document.dispatchEvent(new CustomEvent(opts.removeEventName, { detail }));
  }

  function readQtyBadge(el, opts) {
    const badge = el.querySelector(`.${opts.qtyBadgeClass}`);
    return badge ? parseInt(badge.textContent || "0", 10) : 0;
  }

  function setQtyBadge(el, value, opts) {
    const badge = el.querySelector(`.${opts.qtyBadgeClass}`);
    if (badge) badge.textContent = String(value || 0);
  }

  function init(userOpts = {}) {
    const opts = Object.assign({}, DEFAULTS, userOpts);
    const containerEls = Array.from(document.querySelectorAll(opts.selector));
    if (!containerEls.length) {
      console.warn("ArticleManager: no article elements found for selector", opts.selector);
      return;
    }

    containerEls.forEach((el) => {
      if (!el.dataset.id || !el.dataset.name || !el.dataset.price) {
        console.warn("ArticleManager: article missing data attributes (id/name/price):", el);
        return;
      }

      ensureControls(el, opts);

      const plus = el.querySelector(`.${opts.plusClass}`);
      const minus = el.querySelector(`.${opts.minusClass}`);

      plus.addEventListener("click", (ev) => {
        ev.stopPropagation();
        dispatchAdd(el, 1, opts);
      });

      minus.addEventListener("click", (ev) => {
        ev.stopPropagation();
        dispatchRemove(el, 1, opts);
      });

      if (opts.clickToAdd) {
        // clicking on main card (not on controls) adds one
        el.addEventListener("click", (ev) => {
          const isControl = ev.target.closest(".article-controls");
          if (isControl) return;
          dispatchAdd(el, 1, opts);
        });
      }

      // Listen to cart updates to update badge
      document.addEventListener("cart:state", (e) => {
        const items = e.detail || {};
        const id = el.dataset.id;
        const qty = items[id] ? items[id].qty : 0;
        setQtyBadge(el, qty, opts);
      });
    });
  }

  // expose
  window.ArticleManager = { init };
})();
