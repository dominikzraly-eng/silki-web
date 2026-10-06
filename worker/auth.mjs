// Přihlášení do administrace (Decap CMS) přes GitHub OAuth.
// Potřebuje v Cloudflare (Worker → Settings → Variables and Secrets) hodnoty
// OAUTH_CLIENT_ID a OAUTH_CLIENT_SECRET z GitHub OAuth App (stejné jako dřív v Netlify).
export async function auth(request, env) {
  const url = new URL(request.url);
  if (!env.OAUTH_CLIENT_ID || !env.OAUTH_CLIENT_SECRET) {
    return new Response("Chybí OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET v nastavení Workeru.", { status: 500 });
  }

  if (!url.pathname.includes("callback")) {
    const redirectUri = url.origin + "/api/auth/callback";
    const authorize = "https://github.com/login/oauth/authorize" +
      "?client_id=" + encodeURIComponent(env.OAUTH_CLIENT_ID) +
      "&scope=repo,user" +
      "&redirect_uri=" + encodeURIComponent(redirectUri);
    return Response.redirect(authorize, 302);
  }

  const code = url.searchParams.get("code");
  if (!code) return new Response("Chybí parametr code z GitHubu.", { status: 400 });

  try {
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "silki-web" },
      body: JSON.stringify({ client_id: env.OAUTH_CLIENT_ID, client_secret: env.OAUTH_CLIENT_SECRET, code })
    });
    const data = await r.json();
    if (data.error || !data.access_token) {
      return html(handshake("error", JSON.stringify({ error: data.error_description || data.error || "Neznámá chyba" })));
    }
    return html(handshake("success", JSON.stringify({ token: data.access_token, provider: "github" })));
  } catch (err) {
    return html(handshake("error", JSON.stringify({ error: String(err) })));
  }
}

// Standardní Decap handshake: popup se ohlásí, administrace potvrdí svůj původ
// a teprve na ten potvrzený původ popup pošle token.
function handshake(status, payloadJson) {
  return "<!DOCTYPE html><html><body><script>" +
    "(function(){" +
    "function receiveMessage(e){" +
    "window.opener.postMessage('authorization:github:" + status + ":' + " + JSON.stringify(payloadJson) + ", e.origin);" +
    "window.removeEventListener('message', receiveMessage, false);" +
    "}" +
    "window.addEventListener('message', receiveMessage, false);" +
    "window.opener.postMessage('authorizing:github', '*');" +
    "})();" +
    "</script></body></html>";
}

function html(body) {
  // Inline skript handshaku potřebuje vlastní CSP (přísná CSP webu by ho zablokovala)
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store"
    }
  });
}
