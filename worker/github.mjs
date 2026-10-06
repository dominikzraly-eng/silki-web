// Ověření přihlášení z administrace: GitHub token musí patřit někomu se zápisem do repa webu.
const REPO = "dominikzraly-eng/silki-web";

// GitHub účet → jméno v CRM (kvůli provizím a historii změn)
const GITHUB_USERS = {
  "dominikzraly-eng": "dominik",
  "terezaceledovasilki": "tereza"
};

const cache = new Map();
const CACHE_MS = 5 * 60e3;

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyUser(token) {
  const key = await sha256(token);
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.user;

  const headers = { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "User-Agent": "silki-crm" };
  const repo = await fetch("https://api.github.com/repos/" + REPO, { headers });
  if (!repo.ok) return null;
  if (!(await repo.json()).permissions?.push) return null;
  const me = await fetch("https://api.github.com/user", { headers });
  if (!me.ok) return null;
  const login = String((await me.json()).login || "").toLowerCase();
  const user = GITHUB_USERS[login] || login;

  cache.set(key, { user, exp: Date.now() + CACHE_MS });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return user;
}
