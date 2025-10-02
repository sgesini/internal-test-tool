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

    // Removes HASH from the calculation if present
    const paramsForHash = { ...cleanParams };
    delete paramsForHash.HASH;
    const hash = computeHash(paramsForHash, env.secretKey);

    cleanParams.HASH = hash;

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

    // 🟢 NEW : return both request and response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch {
      parsedResponse = { raw: text };
    }

    res.json({
      requestSent: cleanParams,      // ce que tu as envoyé
      response: parsedResponse,      // la réponse brute
      ...parsedResponse              // rétrocompatibilité (EXECCODE, MESSAGE…)
    });

  } catch (err) {
    console.error("❌ Erreur S2S Payment:", err);
    res.status(500).json({ error: err.message });
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
