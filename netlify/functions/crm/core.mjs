/*
 * Interní CRM Silki: API logika nezávislá na úložišti.
 * Netlify vstup je v crm.mjs (Netlify Blobs), lokální test v tools/crm-dev.mjs (soubor).
 *
 * Proměnné prostředí (Netlify → Site configuration → Environment variables):
 *   CRM_USERS   dominik:heslo1;tereza:heslo2;marketa:heslo3
 *   CRM_SECRET  libovolný dlouhý náhodný řetězec (podepisuje přihlášení)
 *
 * Data leží v jednom JSON dokumentu "db". Zápis jde přes podmíněný zápis
 * (etag), takže dva lidé ukládající ve stejnou chvíli si nepřepíšou změny.
 */
import crypto from "node:crypto";

const COLLECTIONS = ["sklad", "prodeje", "nakupy", "zakaznici", "finance"];
const USERS = ["dominik", "tereza", "marketa"];
const TOKEN_DAYS = 30;
const MAX_BODY = 512 * 1024;
const LOGIN_LIMIT = 8;            // pokusů
const LOGIN_WINDOW = 15 * 60e3;   // za 15 minut

export const DEFAULT_SETTINGS = {
  provize: { zakaznice: 20, kadernik: 10, dominik: 5 },
  slevy: { ks2: 15, ks5: 20, max: 20 },
  // Kč za gram podle délky a odstínu, převzato z cenik.html
  cenik: [
    { delka: "30–35", tmave: 58, stredni: 65, blond: 69 },
    { delka: "35–40", tmave: 76, stredni: 87, blond: 90 },
    { delka: "41–45", tmave: 106, stredni: 113, blond: 126 },
    { delka: "46–50", tmave: 116, stredni: 136, blond: 140 },
    { delka: "51–55", tmave: 135, stredni: 159, blond: 163 },
    { delka: "56–60", tmave: 140, stredni: 166, blond: 172 },
    { delka: "61–65", tmave: 147, stredni: 172, blond: 176 },
    { delka: "66–70", tmave: 156, stredni: 182, blond: 186 },
    { delka: "71–75", tmave: 161, stredni: 185, blond: 188 },
    { delka: "76–80", tmave: 164, stredni: 190, blond: 194 },
    { delka: "81–85", tmave: 166, stredni: 199, blond: 205 },
    { delka: "85–90", tmave: 177, stredni: 207, blond: 213 }
  ]
};

function emptyDb() {
  const db = { v: 1, nastaveni: structuredClone(DEFAULT_SETTINGS), log: [] };
  for (const c of COLLECTIONS) db[c] = [];
  return db;
}

function json(status, data, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      ...extra
    }
  });
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function parseUsers(env) {
  const out = {};
  for (const pair of String(env.CRM_USERS || "").split(";")) {
    const i = pair.indexOf(":");
    if (i < 1) continue;
    const name = pair.slice(0, i).trim().toLowerCase();
    const pw = pair.slice(i + 1).trim();
    if (USERS.includes(name) && pw.length >= 8) out[name] = pw;
  }
  return out;
}

function sign(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const mac = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  return body + "." + mac;
}

function verify(token, secret) {
  if (!token || typeof token !== "string") return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expect = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  if (!safeEqual(mac, expect)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!USERS.includes(p.u) || typeof p.exp !== "number" || p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

// Ořízne řetězce a zahodí nečekané typy, ať do DB nejde nic divného.
function clean(value, depth = 0) {
  if (depth > 5) return null;
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") return value.slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 200).map(v => clean(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value).slice(0, 60)) {
      if (/^[a-zA-Z0-9_]{1,40}$/.test(k)) out[k] = clean(v, depth + 1);
    }
    return out;
  }
  return null;
}

function applyOps(db, ops, user) {
  const now = new Date().toISOString();
  const touched = [];
  for (const op of ops) {
    if (op.type === "settings") {
      db.nastaveni = clean(op.data);
      touched.push("nastavení");
      continue;
    }
    if (!COLLECTIONS.includes(op.col)) throw new Error("Neznámá kolekce: " + op.col);
    const list = db[op.col];
    if (op.type === "upsert") {
      const rec = clean(op.rec);
      if (!rec || typeof rec !== "object" || Array.isArray(rec)) throw new Error("Neplatný záznam");
      // ID jde do HTML atributů, proto jen bezpečné znaky
      if (rec.id !== undefined && !/^[A-Za-z0-9-]{1,64}$/.test(String(rec.id))) delete rec.id;
      const i = rec.id ? list.findIndex(r => r.id === rec.id) : -1;
      if (i >= 0) {
        list[i] = { ...rec, createdAt: list[i].createdAt, createdBy: list[i].createdBy, updatedAt: now, updatedBy: user };
      } else {
        list.push({ ...rec, id: rec.id || crypto.randomUUID(), createdAt: now, createdBy: user, updatedAt: now, updatedBy: user });
      }
      touched.push((i >= 0 ? "upraveno " : "přidáno ") + op.col);
    } else if (op.type === "delete") {
      const i = list.findIndex(r => r.id === op.id);
      if (i >= 0) {
        list.splice(i, 1);
        touched.push("smazáno " + op.col);
      }
    } else {
      throw new Error("Neznámá operace");
    }
  }
  db.log.unshift({ t: now, u: user, co: touched.join(", ") });
  db.log = db.log.slice(0, 300);
  return db;
}

/*
 * store: { get(key) -> {data, etag} | null, set(key, data, etag?) -> boolean (false = konflikt) }
 */
export async function handle(req, { store, env, ip }) {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/crm\/?/, "");
  const users = parseUsers(env);
  const secret = env.CRM_SECRET || "";

  if (!Object.keys(users).length || secret.length < 16) {
    return json(503, { error: "CRM není nastavené: chybí CRM_USERS nebo CRM_SECRET (min. 16 znaků) v Netlify." });
  }

  if (req.method === "POST" && route === "login") {
    const rlKey = "rl/" + crypto.createHash("sha256").update(ip || "?").digest("hex").slice(0, 24);
    const rl = (await store.get(rlKey))?.data || { n: 0, t: Date.now() };
    if (Date.now() - rl.t > LOGIN_WINDOW) { rl.n = 0; rl.t = Date.now(); }
    if (rl.n >= LOGIN_LIMIT) return json(429, { error: "Příliš mnoho pokusů. Zkuste to za 15 minut." });

    let body;
    try { body = JSON.parse(await req.text()); } catch { body = {}; }
    const name = String(body.user || "").toLowerCase();
    const ok = users[name] && safeEqual(body.password || "", users[name]);
    if (!ok) {
      rl.n++;
      await store.set(rlKey, rl);
      return json(401, { error: "Špatné jméno nebo heslo." });
    }
    const token = sign({ u: name, exp: Date.now() + TOKEN_DAYS * 864e5 }, secret);
    return json(200, { token, user: name });
  }

  const auth = req.headers.get("authorization") || "";
  const session = verify(auth.replace(/^Bearer\s+/i, ""), secret);
  if (!session) return json(401, { error: "Přihlášení vypršelo." });

  if (req.method === "GET" && route === "data") {
    const cur = await store.get("db");
    const db = cur?.data || emptyDb();
    return json(200, { db, user: session.u });
  }

  if (req.method === "POST" && route === "ops") {
    const text = await req.text();
    if (text.length > MAX_BODY) return json(413, { error: "Požadavek je moc velký." });
    let body;
    try { body = JSON.parse(text); } catch { return json(400, { error: "Neplatný JSON." }); }
    if (!Array.isArray(body.ops) || !body.ops.length || body.ops.length > 50) {
      return json(400, { error: "Chybí operace." });
    }
    // Podmíněný zápis: když mezitím uložil někdo jiný, načte se znovu a zkusí to zase.
    for (let attempt = 0; attempt < 10; attempt++) {
      if (attempt) await new Promise(r => setTimeout(r, 20 + Math.random() * 80 * attempt));
      const cur = await store.get("db");
      let db = cur?.data || emptyDb();
      try {
        db = applyOps(db, body.ops, session.u);
      } catch (e) {
        return json(400, { error: e.message });
      }
      const saved = await store.set("db", db, cur?.etag ?? null);
      if (saved) {
        // Denní záloha: jeden snímek na den, přepisuje se během dne.
        await store.set("backup/" + new Date().toISOString().slice(0, 10), db);
        return json(200, { db });
      }
    }
    return json(409, { error: "Souběžný zápis, zkuste uložit znovu." });
  }

  return json(404, { error: "Nenalezeno." });
}
