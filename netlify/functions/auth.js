/*
 * GitHub OAuth bridge for the Decap CMS admin at /admin.
 * Lets Decap log editors in with their GitHub account so changes made
 * in the admin UI are committed straight to the site's GitHub repo.
 *
 * Needs two environment variables, set in Netlify → Site settings →
 * Environment variables (see README-provoz.md for the exact steps):
 *   OAUTH_CLIENT_ID
 *   OAUTH_CLIENT_SECRET
 * (from a GitHub OAuth App you register once — README-provoz.md walks
 * through it).
 *
 * No npm dependencies — uses only Node's built-in https module so
 * Netlify can deploy it with zero build step.
 */
const https = require("https");

const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;

exports.handler = async function (event) {
  const isCallback = event.path.indexOf("callback") !== -1;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return {
      statusCode: 500,
      body: "Chybí OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET v Netlify environment variables."
    };
  }

  if (!isCallback) {
    var redirectUri = "https://" + event.headers.host + "/api/auth/callback";
    var authorizeUrl =
      "https://github.com/login/oauth/authorize" +
      "?client_id=" + encodeURIComponent(CLIENT_ID) +
      "&scope=repo,user" +
      "&redirect_uri=" + encodeURIComponent(redirectUri);
    return { statusCode: 302, headers: { Location: authorizeUrl }, body: "" };
  }

  var code = event.queryStringParameters && event.queryStringParameters.code;
  if (!code) {
    return { statusCode: 400, body: "Chybí parametr code z GitHubu." };
  }

  try {
    var tokenResponse = await exchangeCodeForToken(code);
    if (tokenResponse.error || !tokenResponse.access_token) {
      return htmlResponse(handshakeScript(
        "error",
        JSON.stringify({ error: tokenResponse.error_description || tokenResponse.error || "Neznámá chyba" })
      ));
    }
    return htmlResponse(handshakeScript(
      "success",
      JSON.stringify({ token: tokenResponse.access_token, provider: "github" })
    ));
  } catch (err) {
    return htmlResponse(handshakeScript("error", JSON.stringify({ error: String(err) })));
  }
};

function exchangeCodeForToken(code) {
  var body = JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code: code });
  var options = {
    hostname: "github.com",
    path: "/login/oauth/access_token",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Content-Length": Buffer.byteLength(body)
    }
  };
  return new Promise(function (resolve, reject) {
    var req = https.request(options, function (res) {
      var data = "";
      res.on("data", function (chunk) { data += chunk; });
      res.on("end", function () {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Standard Decap/Netlify CMS popup handshake: the popup announces itself,
// the admin page (opener) replies to confirm the origin, then the popup
// sends the real token/error payload back using that confirmed origin.
function handshakeScript(status, payloadJson) {
  return (
    "<!DOCTYPE html><html><body><script>" +
    "(function(){" +
    "function receiveMessage(e){" +
    "window.opener.postMessage('authorization:github:" + status + ":' + " + JSON.stringify(payloadJson) + ", e.origin);" +
    "window.removeEventListener('message', receiveMessage, false);" +
    "}" +
    "window.addEventListener('message', receiveMessage, false);" +
    "window.opener.postMessage('authorizing:github', '*');" +
    "})();" +
    "</script></body></html>"
  );
}

function htmlResponse(html) {
  // Tahle odpoved obsahuje inline <script> (postMessage handshake pro Decap).
  // Prisna CSP z netlify.toml (script-src 'self') by ho zablokovala a rozbila
  // prihlaseni do administrace, proto si tenhle endpoint posila vlastni CSP.
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store"
    },
    body: html
  };
}
