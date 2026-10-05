// Přístup do CRM z příkazové řádky (pro Clauda). Klíč se vytvoří v CRM → Nastavení → Napojení pro Claude
// a uloží se MIMO repo do souboru %USERPROFILE%\.silki-crm-key (nebo proměnné SILKI_CRM_KEY).
//
//   node tools/crm-cli.mjs pull [soubor.json]   stáhne celá data (výchozí: crm-data.json ve scratch složce)
//   node tools/crm-cli.mjs ops <ops.json>       pošle operace [{type:"upsert",col,rec} | {type:"delete",col,id} | {type:"settings",data}]
//   node tools/crm-cli.mjs check                ověří, že klíč platí
//   node tools/crm-cli.mjs foto <id> [soubor]   stáhne fotku (např. účtenku ke zprávě)
//
// CRM_URL přepíše adresu (lokálně http://localhost:4630).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = (process.env.CRM_URL || "https://silkihair.cz").replace(/\/$/, "");
const keyFile = path.join(os.homedir(), ".silki-crm-key");
const KEY = (process.env.SILKI_CRM_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8") : "")).trim();

if (!KEY) {
  console.error("Chybí klíč: vytvořte ho v CRM → Nastavení → Napojení pro Claude a uložte do " + keyFile);
  process.exit(1);
}

async function api(route, body) {
  const res = await fetch(BASE + "/api/crm/" + route, {
    method: body ? "POST" : "GET",
    headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Chyba " + res.status + ": " + (data.error || ""));
    process.exit(1);
  }
  return data;
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "check") {
  const { db, user } = await api("data");
  console.log("OK, přihlášen jako " + user + ". Prodejů " + db.prodeje.length + ", kusů ve skladu " + db.sklad.length + ".");
} else if (cmd === "pull") {
  const { db } = await api("data");
  const out = arg || path.join(os.tmpdir(), "silki-crm-data.json");
  fs.writeFileSync(out, JSON.stringify(db, null, 2));
  console.log("Uloženo do " + out);
} else if (cmd === "foto") {
  const [, id, out] = process.argv.slice(2);
  const res = await fetch(BASE + "/api/crm/foto/" + encodeURIComponent(id || ""), { headers: { Authorization: "Bearer " + KEY } });
  if (!res.ok) { console.error("Chyba " + res.status); process.exit(1); }
  const file = out || path.join(os.tmpdir(), "silki-foto-" + id + ".jpg");
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log("Uloženo do " + file);
} else if (cmd === "ops") {
  if (!arg) { console.error("Zadejte soubor s operacemi."); process.exit(1); }
  const ops = JSON.parse(fs.readFileSync(arg, "utf8"));
  const list = Array.isArray(ops) ? ops : ops.ops;
  for (let i = 0; i < list.length; i += 50) await api("ops", { ops: list.slice(i, i + 50) });
  console.log("Odesláno " + list.length + " operací.");
} else {
  console.log("Použití: node tools/crm-cli.mjs check | pull [soubor] | ops <soubor> | foto <id> [soubor]");
}
