// Přihlášení do administrace (Decap CMS) přes GitHub OAuth.
// Potřebuje v Cloudflare (Worker → Settings → Variables and Secrets) hodnoty
// OAUTH_CLIENT_ID a OAUTH_CLIENT_SECRET z GitHub OAuth App (stejné jako dřív v Netlify).
const STATE_COOKIE = "silki_oauth_state";

export async function auth(request, env) {
  const url = new URL(request.url);
  if (!env.OAUTH_CLIENT_ID || !env.OAUTH_CLIENT_SECRET) {
    return new Response("Chybí OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET v nastavení Workeru.", { status: 500 });
  }

  if (!url.pathname.includes("callback")) {
    const state = randomState();
    const redirectUri = url.origin + "/api/auth/callback";
    const authorize = "https://github.com/login/oauth/authorize" +
      "?client_id=" + encodeURIComponent(env.OAUTH_CLIENT_ID) +
      "&scope=public_repo" +
      "&state=" + state +
      "&redirect_uri=" + encodeURIComponent(redirectUri);
    return new Response(null, {
      status: 302,
      headers: {
        Location: authorize,
        "Set-Cookie": STATE_COOKIE + "=" + state + "; Path=/api/auth; Max-Age=600; HttpOnly; Secure; SameSite=Lax",
        "Cache-Control": "no-store"
      }
    });
  }

  const code = url.searchParams.get("code");
  if (!code) return new Response("Chybí parametr code z GitHubu.", { status: 400 });
  const state = url.searchParams.get("state") || "";
  if (!state || state !== readCookie(request, STATE_COOKIE)) {
    return new Response("Přihlášení vypršelo nebo nebylo spuštěno z administrace. Zkuste to znovu.", { status: 400 });
  }

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

function randomState() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, x => x.toString(16).padStart(2, "0")).join("");
}

function readCookie(request, name) {
  const all = request.headers.get("Cookie") || "";
  for (const part of all.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
}

// Decap handshake: popup se ohlásí a token pošle jen administraci na stejném původu.
// Cizí stránka, která by popup otevřela, token nedostane.
function handshake(status, payloadJson) {
  return "<!DOCTYPE html><html><body><script>" +
    "(function(){" +
    "if(!window.opener){document.body.textContent='Okno zavřete a přihlaste se z administrace.';return;}" +
    "function receiveMessage(e){" +
    "if(e.origin!==location.origin||e.source!==window.opener)return;" +
    "window.opener.postMessage('authorization:github:" + status + ":' + " + JSON.stringify(payloadJson) + ", location.origin);" +
    "window.removeEventListener('message', receiveMessage, false);" +
    "}" +
    "window.addEventListener('message', receiveMessage, false);" +
    "window.opener.postMessage('authorizing:github', location.origin);" +
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
      "Cache-Control": "no-store",
      "Set-Cookie": STATE_COOKIE + "=; Path=/api/auth; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
    }
  });
}
