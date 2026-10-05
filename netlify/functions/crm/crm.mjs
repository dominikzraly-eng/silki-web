// Netlify vstup pro interní CRM. Logika je v core.mjs, data v Netlify Blobs (soukromé, ne v GitHubu).
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import { handle } from "./core.mjs";

const REPO = "dominikzraly-eng/silki-web";

// GitHub účet → jméno v CRM (kvůli provizím a tomu, kdo co zapsal).
// Kdo tu není a má do repa zápis, projde taky, jen se zobrazí jeho GitHub jméno.
const GITHUB_USERS = {
  "dominikzraly-eng": "dominik",
  "terezaceledovasilki": "tereza"
};

// Krátká paměť ověřených tokenů, ať se GitHub neptá při každém kliknutí.
const cache = new Map();
const CACHE_MS = 5 * 60e3;

async function verifyUser(token) {
  const key = crypto.createHash("sha256").update(token).digest("hex");
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.user;

  const headers = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "User-Agent": "silki-crm" };
  // Token z přihlášení do /admin musí patřit někomu, kdo smí do repa webu zapisovat.
  const repo = await fetch("https://api.github.com/repos/" + REPO, { headers });
  if (!repo.ok) return null;
  const data = await repo.json();
  if (!data.permissions?.push) return null;
  const me = await fetch("https://api.github.com/user", { headers });
  if (!me.ok) return null;
  const login = String((await me.json()).login || "").toLowerCase();
  const user = GITHUB_USERS[login] || login;

  cache.set(key, { user, exp: Date.now() + CACHE_MS });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return user;
}

export default async (req) => {
  const blobs = getStore({ name: "crm", consistency: "strong" });
  const store = {
    async get(key) {
      const r = await blobs.getWithMetadata(key, { type: "json" });
      return r ? { data: r.data, etag: r.etag } : null;
    },
    async set(key, data, etag) {
      // etag === null: dokument ještě neexistuje, zapsat jen pokud ho mezitím nikdo nevytvořil
      const opts = etag === undefined ? {} : etag === null ? { onlyIfNew: true } : { onlyIfMatch: etag };
      const r = await blobs.setJSON(key, data, opts);
      return r?.modified !== false;
    },
    async getBinary(key) {
      return blobs.get(key, { type: "arrayBuffer" });
    },
    async setBinary(key, buf) {
      await blobs.set(key, buf);
    }
  };
  return handle(req, { store, verifyUser });
};

export const config = { path: "/api/crm/*" };
