// ===============================================
// 🌐 server.js — version hybride (config.json + envs locaux sans stockage serveur)
// ===============================================

const express    = require("express");
const fetch      = require("node-fetch");
const crypto     = require("crypto");
const path       = require("path");
const fs         = require("fs");
const bodyParser = require("body-parser");
const http       = require("http");

const app  = express();
const PORT = 3000;
const dataPath = path.join(__dirname, "config.json");

// === In-memory store (TTL) pour les requêtes envoyées ===
const paymentStore = new Map(); // reqId -> { payload: {...}, ts: number }
const PAYMENT_TTL_MS = 15 * 60 * 1000; // 15 min

function savePaymentRequest(reqId, payload) {
  paymentStore.set(reqId, { payload, ts: Date.now() });
  setTimeout(() => paymentStore.delete(reqId), PAYMENT_TTL_MS);
}

function appendQuery(urlStr, paramsObj) {
  try {
    const u = new URL(urlStr);
    Object.entries(paramsObj || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    });
    return u.toString();
  } catch {
    return urlStr; // si URL relative, on ne casse rien
  }
}

function genReqId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ===============================
// 🛠 Hash generator
// ===============================
function computeHash(params, secretKey) {
  const sortedKeys = Object.keys(params)
    .filter(k => k !== "HASH" && k !== "method")
    .sort();
  let clearString  = secretKey;
  for (const key of sortedKeys) {
    clearString += key + "=" + params[key] + secretKey;
  }
  console.log("=== Chaîne utilisée pour le hash ===");
  console.log(clearString);
  console.log("====================================");
  return crypto.createHash("sha256").update(clearString, "utf8").digest("hex");
}

// ===============================
// 🧮 API : Hash generator (compatible envs locaux)
// ===============================
app.post("/computeHash", (req, res) => {
  const { params, environment } = req.body;
  let secretKey = null;

  if (typeof environment === "string") {
    // 🔵 Cas "officiel" → cherche dans config.json
    const envs = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    secretKey = envs[environment]?.secretKey || null;
  } else if (environment && environment.secretKey) {
    // 🟡 Cas "local" → clé directement fournie par le navigateur
    secretKey = environment.secretKey;
  }

  if (!secretKey) return res.status(400).json({ error: "missing secretKey" });

  const hash = computeHash(params, secretKey);
  res.json({ hash });
});

// ===============================
// 💳 S2S Payment POST function
// ===============================
app.post("/processPayment", async (req, res) => {
  try {
    const { environment, ...rawParams } = req.body;
    if (!environment) {
      return res.status(400).json({ error: "Missing environment" });
    }

    // 🟡 Gestion des environnements hybrides
    let secretKey = null;
    if (typeof environment === "string") {
      const envs = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      secretKey = envs[environment]?.secretKey || null;
    } else if (environment && environment.secretKey) {
      secretKey = environment.secretKey;
    }

    if (!secretKey) {
      return res.status(400).json({ error: "Invalid environment or secretKey" });
    }

    // Nettoyage des champs vides
    const cleanParams = {};
    for (const [k, v] of Object.entries(rawParams)) {
      if (v !== null && v !== undefined && v !== "") cleanParams[k] = v;
    }

    // Génère reqId
    const reqId = genReqId();

    // Injecte reqId dans les URLs de redirection
    if (cleanParams.REDIRECTURLSUCCESS) {
      cleanParams.REDIRECTURLSUCCESS = appendQuery(cleanParams.REDIRECTURLSUCCESS, { reqId });
    }
    if (cleanParams.REDIRECTURLCANCEL) {
      cleanParams.REDIRECTURLCANCEL  = appendQuery(cleanParams.REDIRECTURLCANCEL,  { reqId });
    }

    // Calcule le hash
    const paramsForHash = { ...cleanParams };
    delete paramsForHash.HASH;
    const hash = computeHash(paramsForHash, secretKey);
    cleanParams.HASH = hash;

    // Sauvegarde la requête en mémoire
    savePaymentRequest(reqId, { requestSent: { ...cleanParams }, environment });

    // Construit le corps POST
    const forwardBody = new URLSearchParams();
    forwardBody.append("method", "payment");
    for (const [k, v] of Object.entries(cleanParams)) {
      forwardBody.append(`params[${k}]`, v);
    }

    console.log("=== Champs envoyés à Dalenys ===");
    console.log(cleanParams);

    const response = await fetch(
      "https://secure-test.dalenys.com/front/service/rest/process",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: forwardBody
      }
    );

    const text = await response.text();
    let parsedResponse;
    try { parsedResponse = JSON.parse(text); }
    catch { parsedResponse = { raw: text }; }

    res.json({
      reqId,
      requestSent: { ...cleanParams },
      response: parsedResponse
    });

  } catch (err) {
    console.error("❌ Erreur S2S Payment:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 💳 HostedForms POST function
// ===============================
app.post("/processHostedForm", (req, res) => {
  try {
    const { environment, params } = req.body;
    if (!environment) {
      return res.status(400).json({ error: "Missing environment" });
    }

    // 🟡 Gestion hybride (config.json + local)
    let secretKey = null;
    if (typeof environment === "string") {
      const envs = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      secretKey = envs[environment]?.secretKey || null;
    } else if (environment && environment.secretKey) {
      secretKey = environment.secretKey;
    }

    if (!secretKey) {
      return res.status(400).json({ error: "Invalid environment or secretKey" });
    }

    // Nettoie les champs
    const cleanParams = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== "") cleanParams[k] = v;
    }

    const reqId = genReqId();
    const baseUrl = `http://localhost:${PORT}`;
    cleanParams.REDIRECTURLSUCCESS = `${baseUrl}/success.html?reqId=${reqId}`;
    cleanParams.REDIRECTURLCANCEL  = `${baseUrl}/success.html?reqId=${reqId}`;

    const paramsForHash = { ...cleanParams };
    delete paramsForHash.HASH;
    delete paramsForHash.environment;
    const hash = computeHash(paramsForHash, secretKey);
    cleanParams.HASH = hash;

    savePaymentRequest(reqId, { requestSent: cleanParams, environment });

    const formHtml = `
      <html><body onload="document.forms[0].submit()">
        <form method="POST" action="https://secure-test.dalenys.com/front/form/process">
          ${Object.entries(cleanParams).map(([k,v]) => 
            `<input type="hidden" name="${k}" value="${v}"/>`).join("\n")}
        </form>
      </body></html>
    `;

    res.send(formHtml);

  } catch (err) {
    console.error("❌ Erreur HostedForm:", err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 🌐 API : Récupérer la requête envoyée
// ===============================
app.get("/api/payment-request/:id", (req, res) => {
  const item = paymentStore.get(req.params.id);
  if (!item) return res.status(404).json({ error: "not found" });
  res.json(item.payload);
});

// ===============================
// 🌐 API : Environnements officiels (lecture seule)
// ===============================
app.get("/api/environments", (req, res) => {
  try {
    const data = fs.readFileSync(dataPath, "utf-8");
    res.json(JSON.parse(data));
  } catch (err) {
    console.error("Erreur lecture config.json:", err);
    res.status(500).json({ error: "Impossible de lire config.json" });
  }
});

app.get("/api/env/:name", (req, res) => {
  try {
    const envs = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const env  = envs[req.params.name];
    if (!env) return res.status(404).json({ error: "Environnement introuvable" });
    res.json(env);
  } catch (err) {
    console.error("Erreur lecture env spécifique:", err);
    res.status(500).json({ error: "Impossible de lire l'environnement" });
  }
});

// ===============================
// 🏠 Home page
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// 🌐 HTTP redirection : :80 -> :3000
// ===============================
http.createServer((req, res) => {
  const redirectUrl = `http://localhost:${PORT}${req.url}`;
  res.writeHead(301, { Location: redirectUrl });
  res.end();
}).listen(80, () => {
  console.log("🌐 Redirection active : http://localhost → http://localhost:3000");
});

// ===============================
// 🚀 Start server
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Serveur principal sur http://localhost:${PORT}`);
});
