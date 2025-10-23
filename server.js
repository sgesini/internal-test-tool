// server.js
// ⚡ Version sans config.json — compatible avec environments stockés dans le navigateur
// 🔐 Le secretKey est transmis depuis le client dans le body (jamais sauvegardé côté serveur)

const express = require("express");
const fetch = require("node-fetch");
const crypto = require("crypto");
const path = require("path");
const bodyParser = require("body-parser");
const http = require("http");

const app = express();
const PORT = 3000;

// === In-memory store (TTL) pour les requêtes envoyées ===
const paymentStore = new Map(); // reqId -> { payload: {...}, ts: number }
const PAYMENT_TTL_MS = 15 * 60 * 1000; // 15 min

function genReqId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

function savePaymentRequest(reqId, payload) {
  paymentStore.set(reqId, { payload, ts: Date.now() });
  setTimeout(() => paymentStore.delete(reqId), PAYMENT_TTL_MS);
}

// === Utilitaire : ajout de paramètres dans une URL ===
function appendQuery(urlStr, paramsObj) {
  try {
    const u = new URL(urlStr);
    Object.entries(paramsObj || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    });
    return u.toString();
  } catch {
    return urlStr;
  }
}

// === Génération du hash ===
function computeHash(params, secretKey) {
  const sortedKeys = Object.keys(params)
    .filter(k => k !== "HASH" && k !== "method")
    .sort();

  let clearString = secretKey;
  for (const key of sortedKeys) {
    clearString += key + "=" + params[key] + secretKey;
  }

  console.log("=== Chaîne utilisée pour le hash ===");
  console.log(clearString);
  console.log("====================================");

  return crypto.createHash("sha256").update(clearString, "utf8").digest("hex");
}

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ======================================================
// 🧮 /computeHash — calcul du hash SHA256
// ======================================================
app.post("/computeHash", (req, res) => {
  try {
    const { params, secretKey } = req.body;
    if (!secretKey) return res.status(400).json({ error: "Missing secretKey" });
    const hash = computeHash(params, secretKey);
    res.json({ hash });
  } catch (err) {
    console.error("Erreur computeHash:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// 💳 /processPayment — envoi S2S
// ======================================================
app.post("/processPayment", async (req, res) => {
  try {
    const { secretKey, ...rawParams } = req.body;
    if (!secretKey) return res.status(400).json({ error: "Missing secretKey" });

    const cleanParams = {};
    for (const [k, v] of Object.entries(rawParams)) {
      if (v !== null && v !== undefined && v !== "") cleanParams[k] = v;
    }

    const reqId = genReqId();

    if (cleanParams.REDIRECTURLSUCCESS) {
      cleanParams.REDIRECTURLSUCCESS = appendQuery(cleanParams.REDIRECTURLSUCCESS, { reqId });
    }
    if (cleanParams.REDIRECTURLCANCEL) {
      cleanParams.REDIRECTURLCANCEL = appendQuery(cleanParams.REDIRECTURLCANCEL, { reqId });
    }

    // Calcul du hash
    const paramsForHash = { ...cleanParams };
    delete paramsForHash.HASH;
    const hash = computeHash(paramsForHash, secretKey);
    cleanParams.HASH = hash;

    // Sauvegarde pour debug ou redirection
    savePaymentRequest(reqId, { requestSent: { ...cleanParams } });

    // Corps du POST vers Dalenys
    const forwardBody = new URLSearchParams();
    forwardBody.append("method", cleanParams.OPERATIONTYPE || "payment");
    for (const [k, v] of Object.entries(cleanParams)) {
      forwardBody.append(`params[${k}]`, v);
    }

    console.log("=== Champs envoyés à Dalenys ===");
    console.log(cleanParams);

    const response = await fetch("https://secure-test.dalenys.com/front/service/rest/process", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: forwardBody
    });

    const text = await response.text();
    console.log("=== Réponse Dalenys ===");
    console.log(text);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch {
      parsedResponse = { raw: text };
    }

    res.json({
      reqId,
      requestSent: { ...cleanParams },
      response: parsedResponse
    });
  } catch (err) {
    console.error("Erreur processPayment:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// 💳 /processHostedForm — pour les formulaires HostedFields
// ======================================================
app.post("/processHostedForm", (req, res) => {
  try {
    const { params, secretKey } = req.body;
    if (!secretKey) return res.status(400).json({ error: "Missing secretKey" });

    const cleanParams = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== "") cleanParams[k] = v;
    }

    const reqId = genReqId();
    const baseUrl = `http://localhost:${PORT}`;
    cleanParams.REDIRECTURLSUCCESS = `${baseUrl}/success.html?reqId=${reqId}`;
    cleanParams.REDIRECTURLCANCEL = `${baseUrl}/success.html?reqId=${reqId}`;

    const paramsForHash = { ...cleanParams };
    delete paramsForHash.HASH;

    const hash = computeHash(paramsForHash, secretKey);
    cleanParams.HASH = hash;

    savePaymentRequest(reqId, { requestSent: cleanParams });

    console.log("=== HostedForm request stored ===");
    console.log("reqId =", reqId);
    console.log(cleanParams);

    const formHtml = `
      <html><body onload="document.forms[0].submit()">
        <form method="POST" action="https://secure-test.dalenys.com/front/form/process">
          ${Object.entries(cleanParams)
            .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}"/>`)
            .join("\n")}
        </form>
      </body></html>
    `;

    res.send(formHtml);
  } catch (err) {
    console.error("Erreur processHostedForm:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// 🔍 /api/payment-request/:id — debug / success page
// ======================================================
app.get("/api/payment-request/:id", (req, res) => {
  const item = paymentStore.get(req.params.id);
  if (!item) return res.status(404).json({ error: "not found" });
  res.json(item.payload);
});

// ======================================================
// 🌐 Page principale
// ======================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ======================================================
// 🔁 Redirection localhost:80 -> :3000
// ======================================================
http.createServer((req, res) => {
  const redirectUrl = `http://localhost:${PORT}${req.url}`;
  res.writeHead(301, { Location: redirectUrl });
  res.end();
}).listen(80, () => {
  console.log("🌐 Redirection active : http://localhost → http://localhost:3000");
});

// ======================================================
// 🚀 Démarrage du serveur
// ======================================================
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
