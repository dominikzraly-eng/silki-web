// Lokální test CRM bez Netlify: statický web + /api/crm s daty v souboru .crm-dev-data/.
// Spuštění: node tools/crm-dev.mjs  →  http://localhost:4630/admin/crm/
// Testovací hesla jsou jen pro lokální běh (heslo1234 pro všechny tři).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { handle } from "../netlify/functions/crm/core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, ".crm-dev-data");
fs.mkdirSync(dataDir, { recursive: true });
const PORT = Number(process.env.PORT || 4630);

const env = {
  CRM_USERS: process.env.CRM_USERS || "dominik:heslo1234;tereza:heslo1234;marketa:heslo1234",
  CRM_SECRET: process.env.CRM_SECRET || "lokalni-tajny-klic-jen-pro-test"
};

const file = key => path.join(dataDir, key.replace(/[^a-z0-9-]/gi, "_") + ".json");
const store = {
  async get(key) {
    if (!fs.existsSync(file(key))) return null;
    const text = fs.readFileSync(file(key), "utf8");
    return { data: JSON.parse(text), etag: crypto.createHash("md5").update(text).digest("hex") };
  },
  async set(key, data, etag) {
    const cur = await this.get(key);
    if (etag === null && cur) return false;
    if (etag && (!cur || cur.etag !== etag)) return false;
    fs.writeFileSync(file(key), JSON.stringify(data));
    return true;
  }
};

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ico": "image/x-icon" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:" + PORT);
  if (url.pathname.startsWith("/api/crm/")) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(url, { method: req.method, headers: req.headers, body: req.method === "GET" ? undefined : body });
    const r = await handle(request, { store, env, ip: req.socket.remoteAddress });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(await r.text());
    return;
  }
  let p = path.join(root, decodeURIComponent(url.pathname));
  if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p)) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
}).listen(PORT, () => console.log("CRM dev: http://localhost:" + PORT + "/admin/crm/"));
