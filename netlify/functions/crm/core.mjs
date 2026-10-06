/*
 * Interní CRM Silki: API logika nezávislá na úložišti.
 * Netlify vstup je v crm.mjs (Netlify Blobs + ověření přes GitHub), lokální test v tools/crm-dev.mjs.
 *
 * Přihlášení se nezadává zvlášť: CRM převezme GitHub přihlášení z administrace (/admin).
 * Kdo má do repozitáře webu právo zápisu (může upravovat web), má přístup i do CRM.
 *
 * Data leží v jednom JSON dokumentu "db". Zápis jde přes podmíněný zápis
 * (etag), takže dva lidé ukládající ve stejnou chvíli si nepřepíšou změny.
 */
import crypto from "node:crypto";

const COLLECTIONS = ["sklad", "prodeje", "nakupy", "cesty", "zakaznici", "finance", "zpravy", "poptavky"];

// Veřejný vstup z formulářů na webu: jen tyto formuláře a pole, nic jiného se přes něj zapsat nedá.
const LEAD_FORMS = ["poptavka", "registrace-kadernice", "poptavka-kurz"];
const LEAD_FIELDS = ["name", "salon", "phone", "email", "shade", "length", "course", "experience", "city", "ico", "interest", "message", "subject"];
const LEAD_LIMIT = 5;            // poptávek z jedné IP
const LEAD_WINDOW = 60 * 60e3;   // za hodinu
const MAX_BODY = 512 * 1024;
const MAX_FOTO = 1900 * 1024;   // D1 má limit řádku 2 MB; telefon fotku zmenší na ~300 kB
const AGENT_PREFIX = "sck_";
const AGENT_USER = "claude";

const sha256 = v => crypto.createHash("sha256").update(String(v)).digest("hex");
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

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

// Starší data nemusí mít novější kolekce (např. cesty)
function normalize(db) {
  for (const c of COLLECTIONS) if (!Array.isArray(db[c])) db[c] = [];
  if (!Array.isArray(db.log)) db.log = [];
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

async function lead(req, url, store, ip) {
  if (req.method !== "POST") return json(405, { error: "Jen POST." });
  // Jen z vlastního webu (prohlížeč posílá Origin; jiný web sem formulář neodešle)
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== url.host) return json(403, { error: "Nepovolený původ." });
  const text = await req.text();
  if (text.length > 20000) return json(413, { error: "Moc dlouhé." });
  let body;
  try { body = JSON.parse(text); } catch { return json(400, { error: "Neplatný JSON." }); }
  if (!LEAD_FORMS.includes(body.form)) return json(400, { error: "Neznámý formulář." });
  if (String(body.fields?.["bot-field"] || "").trim()) return json(200, { ok: true });
  const pole = {};
  for (const k of LEAD_FIELDS) {
    const v = String(body.fields?.[k] ?? "").trim().slice(0, 1500);
    if (v) pole[k] = v;
  }
  if (!pole.name && !pole.phone && !pole.email) return json(400, { error: "Chybí kontakt." });

  const rlKey = "rl-lead/" + crypto.createHash("sha256").update(ip || "?").digest("hex").slice(0, 24);
  const rl = (await store.get(rlKey))?.data || { n: 0, t: Date.now() };
  if (Date.now() - rl.t > LEAD_WINDOW) { rl.n = 0; rl.t = Date.now(); }
  if (rl.n >= LEAD_LIMIT) return json(429, { error: "Příliš mnoho poptávek, zkuste to později." });
  rl.n++;
  await store.set(rlKey, rl);

  const now = new Date().toISOString();
  const rec = { id: crypto.randomUUID(), form: body.form, pole, stav: "nova", vyrizuje: "", poznamka: "", zakaznik_id: "", createdAt: now, createdBy: "web", updatedAt: now, updatedBy: "web" };
  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 20 + Math.random() * 80 * attempt));
    const cur = await store.get("db");
    const db = normalize(cur?.data || emptyDb());
    db.poptavky.push(rec);
    db.poptavky = db.poptavky.slice(-500);
    db.log.unshift({ t: now, u: "web", co: "nová poptávka z webu" });
    db.log = db.log.slice(0, 300);
    if (await store.set("db", db, cur?.etag ?? null)) return json(200, { ok: true });
  }
  return json(503, { error: "Zkuste to znovu." });
}

/*
 * store:      { get(key) -> {data, etag} | null, set(key, data, etag?) -> boolean (false = konflikt),
 *               getBinary(key) -> ArrayBuffer | null, setBinary(key, buffer) }
 * verifyUser: async (token) -> jméno uživatele | null
 */
export async function handle(req, { store, verifyUser, ip }) {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/crm\/?/, "");

  if (route === "lead") return lead(req, url, store, ip);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  let user = null;
  if (token.startsWith(AGENT_PREFIX)) {
    // Klíč pro Clauda: v úložišti je jen jeho otisk, klíč samotný nikde
    const rec = (await store.get("agent-key"))?.data;
    if (rec?.hash && safeEqual(rec.hash, sha256(token))) user = AGENT_USER;
  } else if (token) {
    user = await verifyUser(token);
  }
  if (!user) return json(401, { error: "Nejste přihlášeni v administraci." });
  const session = { u: user };

  if (route === "agent-key") {
    if (user === AGENT_USER) return json(403, { error: "Klíč spravuje jen člověk přihlášený v administraci." });
    if (req.method === "GET") {
      const rec = (await store.get("agent-key"))?.data;
      return json(200, rec?.hash ? { active: true, createdAt: rec.createdAt, createdBy: rec.createdBy } : { active: false });
    }
    if (req.method === "POST") {
      const key = AGENT_PREFIX + crypto.randomBytes(32).toString("base64url");
      await store.set("agent-key", { hash: sha256(key), createdAt: new Date().toISOString(), createdBy: user });
      return json(200, { key });
    }
    if (req.method === "DELETE") {
      await store.set("agent-key", { hash: null, revokedAt: new Date().toISOString(), revokedBy: user });
      return json(200, { active: false });
    }
  }

  if (req.method === "POST" && route === "foto") {
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length < 100 || buf.length > MAX_FOTO) return json(413, { error: "Fotka musí mít do 1,9 MB." });
    if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return json(415, { error: "Fotka musí být JPEG." });
    // Při přenosu dat (migrace) smí Claude zachovat původní id fotky
    const chtene = url.searchParams.get("id");
    const id = user === AGENT_USER && chtene && /^[A-Za-z0-9-]{1,64}$/.test(chtene) ? chtene : crypto.randomUUID();
    await store.setBinary("foto/" + id, buf);
    return json(200, { id });
  }

  if (req.method === "GET" && route.startsWith("foto/")) {
    const id = route.slice(5);
    if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) return json(400, { error: "Neplatná fotka." });
    const buf = await store.getBinary("foto/" + id);
    if (!buf) return json(404, { error: "Fotka nenalezena." });
    return new Response(buf, { status: 200, headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  }

  if (req.method === "GET" && route === "data") {
    const cur = await store.get("db");
    const db = normalize(cur?.data || emptyDb());
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
      let db = normalize(cur?.data || emptyDb());
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
