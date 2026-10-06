// Jednorázový přenos dat CRM z Netlify do Cloudflare D1.
//   node tools/migrate-to-d1.mjs <cíl: local|remote> [zdrojová URL] [cílová URL pro fotky]
// 1) stáhne data ze zdroje přes Claudův klíč, 2) zapíše je do D1 (wrangler d1 execute),
// 3) přenese fotky přes API cíle se zachováním id. Klíč pro Clauda zůstává stejný.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [target = "local", source = "https://silkihair.cz", photoTarget] = process.argv.slice(2);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEY = (process.env.SILKI_CRM_KEY || fs.readFileSync(path.join(os.homedir(), ".silki-crm-key"), "utf8")).trim();
const auth = { Authorization: "Bearer " + KEY };

const res = await fetch(source + "/api/crm/data", { headers: auth });
if (!res.ok) throw new Error("Zdroj vrátil " + res.status);
const { db } = await res.json();
const backup = path.join(os.tmpdir(), "silki-crm-pred-migraci-" + Date.now() + ".json");
fs.writeFileSync(backup, JSON.stringify(db, null, 2));
console.log("Záloha zdroje: " + backup);

const hex = obj => zlib.gzipSync(Buffer.from(JSON.stringify(obj))).toString("hex");
const agent = { hash: crypto.createHash("sha256").update(KEY).digest("hex"), createdAt: new Date().toISOString(), createdBy: "dominik" };
const sql = [
  `INSERT INTO kv (key, value, version) VALUES ('db', X'${hex(db)}', 1) ON CONFLICT(key) DO UPDATE SET value = excluded.value, version = kv.version + 1;`,
  `INSERT INTO kv (key, value, version) VALUES ('agent-key', X'${hex(agent)}', 1) ON CONFLICT(key) DO UPDATE SET value = excluded.value, version = kv.version + 1;`
].join("\n");
const sqlFile = path.join(os.tmpdir(), "silki-migrace.sql");
fs.writeFileSync(sqlFile, sql);
const wrangler = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
execFileSync(process.execPath, [wrangler, "d1", "execute", "silki-crm", "--" + target, "--file", sqlFile, "-y"], { cwd: root, stdio: "inherit" });

const fotky = [...new Set([...db.sklad.map(k => k.foto), ...db.zpravy.flatMap(z => z.foto || [])].filter(Boolean))];
console.log("Fotek k přenosu: " + fotky.length);
if (fotky.length && photoTarget) {
  for (const id of fotky) {
    const f = await fetch(source + "/api/crm/foto/" + id, { headers: auth });
    if (!f.ok) { console.log("  " + id + ": nelze stáhnout (" + f.status + ")"); continue; }
    const up = await fetch(photoTarget + "/api/crm/foto?id=" + id, { method: "POST", headers: { ...auth, "Content-Type": "image/jpeg" }, body: Buffer.from(await f.arrayBuffer()) });
    console.log("  " + id + ": " + (up.ok ? "OK" : "chyba " + up.status));
  }
} else if (fotky.length) {
  console.log("Fotky se přenesou až s cílovou URL (třetí parametr).");
}
console.log("Hotovo: " + Object.entries(db).filter(([, v]) => Array.isArray(v)).map(([k, v]) => k + " " + v.length).join(", "));
