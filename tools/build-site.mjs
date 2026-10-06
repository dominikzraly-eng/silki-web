// Sestaví veřejnou část webu do dist/ pro Cloudflare. Kopíruje jen to, co má být vidět:
// stránky, obrázky, data, administraci. Kód serveru, nástroje, dokumenty a node_modules ne.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const ROOT_FILES = /\.(html|txt|xml|ico|png|svg|webmanifest)$/i;
const DIRS = ["assets", "data", "admin"];

// Maže se jen obsah (složku může mít otevřenou běžící wrangler dev)
fs.mkdirSync(dist, { recursive: true });
for (const e of fs.readdirSync(dist)) fs.rmSync(path.join(dist, e), { recursive: true, force: true });
let count = 0;
for (const f of fs.readdirSync(root)) {
  if (ROOT_FILES.test(f) && fs.statSync(path.join(root, f)).isFile()) { fs.copyFileSync(path.join(root, f), path.join(dist, f)); count++; }
}
fs.copyFileSync(path.join(root, "_headers"), path.join(dist, "_headers"));
for (const d of DIRS) {
  fs.cpSync(path.join(root, d), path.join(dist, d), { recursive: true, filter: src => !/(^|[\\/])(\.DS_Store|Thumbs\.db)$/.test(src) });
}
const walk = d => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? walk(path.join(d, e.name)) : 1), 0);
console.log("dist/ hotovo: " + walk(dist) + " souborů");
