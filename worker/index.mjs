// Cloudflare Worker pro silkihair.cz: statický web (adresy .html zůstávají beze změny),
// přihlášení do administrace (/api/auth) a interní CRM (/api/crm/*, data v D1).
import { handle as crm } from "../netlify/functions/crm/core.mjs";
import { auth } from "./auth.mjs";
import { d1Store } from "./store-d1.mjs";
import { verifyUser } from "./github.mjs";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/auth" || path.startsWith("/api/auth/")) return auth(request, env);
    if (path.startsWith("/api/crm/")) {
      return crm(request, { store: d1Store(env.DB), verifyUser, ip: request.headers.get("CF-Connecting-IP") });
    }

    // Sem se dostanou jen požadavky, které nejsou přímo souborem (statické soubory obslouží Cloudflare sám)
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method Not Allowed", { status: 405 });
    if (path.endsWith("/")) {
      const r = await env.ASSETS.fetch(new URL(path + "index.html", url));
      if (r.ok) return r;
    } else if (!/\.[a-z0-9]+$/i.test(path)) {
      // /admin → /admin/, /kontakt → kontakt.html
      const dir = await env.ASSETS.fetch(new URL(path + "/index.html", url), { method: "HEAD" });
      if (dir.ok) return Response.redirect(new URL(path + "/" + url.search, url), 301);
      const page = await env.ASSETS.fetch(new URL(path + ".html", url));
      if (page.ok) return page;
    }
    const nf = await env.ASSETS.fetch(new URL("/404.html", url));
    return new Response(nf.body, { status: 404, headers: nf.headers });
  }
};
