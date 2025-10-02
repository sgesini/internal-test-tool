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
  return (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"));
}

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ===============================
// 🛠 Hash generator
// ===============================
function computeHash(params, secretKey) {
  const sortedKeys = Object.keys(params)
    .filter(k => k !== "HASH" && k !== "method") // exclude 'method'
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
// 🛠 API : Hash generator
// ===============================
app.post("/computeHash", (req, res) => {
  const { params, environment } = req.body;
  const envs = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const env  = envs[environment];
  if (!env || !env.secretKey) return res.status(400).json({ error: "bad env" });

  const hash = computeHash(params, env.secretKey);
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

    // 🆕 Empty fields cleaner
    const cleanParams = {};
    for (const [k, v] of Object.entries(rawParams)) {
      if (v !== null && v !== undefined && v !== "") {
        cleanParams[k] = v;
      }
    }

    // Secret key injector
    const envs = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const env  = envs[environment];
    if (!env || !env.secretKey) {
      return res.status(400).json({ error: "Invalid environment or secretKey" });
    }

    // 🆕 reqId pour corréler la requête / redirection
    const reqId = genReqId();

    // 🆕 On injecte reqId dans les URLs de redirection (avant le hash)
    if (cleanParams.REDIRECTURLSUCCESS) {
      cleanParams.REDIRECTURLSUCCESS = appendQuery(cleanParams.REDIRECTURLSUCCESS, { reqId });
    }
    if (cleanParams.REDIRECTURLCANCEL) {
      cleanParams.REDIRECTURLCANCEL  = appendQuery(cleanParams.REDIRECTURLCANCEL,  { reqId });
    }

    // Removes HASH from the calculation if present
    const paramsForHash = { ...cleanParams };
    delete paramsForHash.HASH;
    const hash = computeHash(paramsForHash, env.secretKey);
    cleanParams.HASH = hash;

    // 🆕 Sauvegarde la requête EXACTEMENT telle qu'envoyée
    savePaymentRequest(reqId, { requestSent: { ...cleanParams }, environment });

    // POST Body builder
    const forwardBody = new URLSearchParams();
    forwardBody.append("method", "payment");
    for (const [k, v] of Object.entries(cleanParams)) {
      forwardBody.append(`params[${k}]`, v);
    }

    // Logging
    console.log("=== Champs envoyés à Dalenys (nettoyés) ===");
    console.log(cleanParams);
    console.log("=== Corps transmis à Dalenys ===");
    console.log(forwardBody.toString());

    const response = await fetch(
      "https://secure-test.dalenys.com/front/service/rest/process",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: forwardBody
      }
    );

    const text = await response.text();
    console.log("=== Réponse Dalenys ===");
    console.log(text);

    let parsedResponse;
    try { parsedResponse = JSON.parse(text); }
    catch { parsedResponse = { raw: text }; }

    // 🟢 On renvoie reqId + requestSent + response
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

    const envs = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const env  = envs[environment];
    if (!env || !env.secretKey) {
      return res.status(400).json({ error: "Invalid environment or secretKey" });
    }

    // Nettoie les champs
    const cleanParams = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== "") {
        cleanParams[k] = v;
      }
    }

    // ✅ Génère un reqId unique
    const reqId = genReqId();

    // ✅ Patch des redirect URLs AVANT le calcul du hash
    const baseUrl = `http://localhost:${PORT}`;
    cleanParams.REDIRECTURLSUCCESS = `${baseUrl}/success.html?reqId=${reqId}`;
    cleanParams.REDIRECTURLCANCEL  = `${baseUrl}/success.html?reqId=${reqId}`;

    // ✅ Calcule le HASH
    const paramsForHash = { ...cleanParams };
    delete paramsForHash.HASH;
    delete paramsForHash.environment;

    const hash = computeHash(paramsForHash, env.secretKey);
    cleanParams.HASH = hash;

    // ✅ Stockage côté serveur (avec TTL)
    savePaymentRequest(reqId, { requestSent: cleanParams, environment });

    console.log("=== HostedForm request stored ===");
    console.log("reqId =", reqId);
    console.log(cleanParams);

    // 📝 Construit un formulaire auto‐soumis vers Dalenys
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
// 🌐 API : Récupérer la requête envoyée (via reqId)
// ===============================
app.get("/api/payment-request/:id", (req, res) => {
  const item = paymentStore.get(req.params.id);
  if (!item) return res.status(404).json({ error: "not found" });
  res.json(item.payload); // { requestSent: {...}, environment }
});


// ===============================
// 🌐 Endpoint pour récupérer le dernier paiement
// ===============================
app.get("/lastPayment", (req, res) => {
  if (lastPayment) {
    res.json(lastPayment);
  } else {
    res.status(404).json({ error: "Aucun paiement enregistré" });
  }
});




// ===============================
// 🌐 API : Environment handler 
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

app.post("/api/environments", (req, res) => {
  try {
    const envs = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const { name, publicKeyId, publicKey, identifier, secretKey } = req.body;

    if (!name || !publicKeyId || !publicKey) {
      return res.status(400).json({ error: "name, publicKeyId et publicKey sont requis" });
    }

    envs[name] = {
      name,
      publicKeyId,
      publicKey,
      identifier: identifier || "",
      secretKey: secretKey || envs[name]?.secretKey || ""
    };

    fs.writeFileSync(dataPath, JSON.stringify(envs, null, 2));
    res.json({ success: true, updated: envs[name] });
  } catch (err) {
    console.error("Erreur écriture config.json:", err);
    res.status(500).json({ error: "Impossible d'enregistrer l'environnement" });
  }
});

app.delete("/api/environments/:name", (req, res) => {
  try {
    const envs = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const name = req.params.name;
    if (!envs[name]) {
      return res.status(404).json({ error: "Environnement introuvable" });
    }
    delete envs[name];
    fs.writeFileSync(dataPath, JSON.stringify(envs, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression config.json:", err);
    res.status(500).json({ error: "Impossible de supprimer l'environnement" });
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

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -------------------------------------------
// 🌐 HTTP redirection : localhost:80 -> :3000
// -------------------------------------------
http.createServer((req, res) => {
  const redirectUrl = `http://localhost:${PORT}${req.url}`;
  res.writeHead(301, { Location: redirectUrl });
  res.end();
}).listen(80, () => {
  console.log("🌐 Redirection active : http://localhost → http://localhost:3000");
});

// -------------------------------------------
// 🚀 Start server
// -------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Serveur principal sur http://localhost:${PORT}`);
});
