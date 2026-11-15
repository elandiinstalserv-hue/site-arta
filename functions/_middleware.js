// Mod „Magazin în pregătire”: vizitatorii văd doar o pagină de așteptare.
// Tu vezi magazinul complet după ce introduci parola de administrare (o dată, pe 30 de zile),
// sau după ce intri în panoul /admin.
// La lansare: schimbă LOCKED în false (sau cere-i lui Claude) și publică.
export const LOCKED = true;

const OPEN = [/^\/admin(\/|$)/, /^\/img\//, /^\/logo\.(webp|png)$/, /^\/favicon\.svg$/, /^\/robots\.txt$/];

export async function previewToken(env) {
  const data = new TextEncoder().encode("artdeco-preview:" + (env.ADMIN_PASSWORD || ""));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export const previewCookie = token =>
  `artdeco_preview=${token}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; Secure; SameSite=Lax`;

function page(error = "") {
  return `<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>ArtDeco – Magazin în pregătire</title><link rel="icon" href="/favicon.svg">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Montserrat,Arial,sans-serif;background:#F6F6F7;color:#1f1f22}
.rb{position:fixed;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#E3202B,#F6D21A,#1E9A3A,#2EC4B6,#1F5FB8,#D2468C)}
.c{background:#fff;border-radius:20px;padding:36px 30px;max-width:420px;width:90%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.08)}
img{max-width:260px;width:80%;height:auto}
h1{font-size:22px;margin:22px 0 8px}
p{color:#6c6c72;margin:0 0 6px}
details{margin-top:26px;text-align:left}
summary{cursor:pointer;color:#9a9aa0;font-size:13px;text-align:center}
input{width:100%;box-sizing:border-box;padding:12px;border:1.5px solid #E7E7EA;border-radius:10px;font-size:15px;margin-top:12px}
button{width:100%;margin-top:10px;padding:12px;border:0;border-radius:10px;background:#1B4A9C;color:#fff;font-weight:700;font-size:15px;cursor:pointer}
.err{color:#C62828;font-size:14px;margin-top:8px}
</style></head><body><div class="rb"></div><div class="c">
<img src="/logo.webp" alt="ArtDeco – Artă și artizanat" width="260" height="87">
<h1>Magazinul se deschide în curând</h1>
<p>Pregătim tablourile, decorațiunile și gablonturile lucrate manual.</p>
<p>Revenim foarte curând!</p>
<details${error ? " open" : ""}><summary>Acces administrator</summary>
<form method="POST" action="/__preview"><input type="password" name="pw" placeholder="Parolă" autocomplete="current-password" required>
<button>Intră</button>${error ? `<div class="err">${error}</div>` : ""}</form></details>
</div></body></html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  if (!LOCKED) return next();
  const url = new URL(request.url);
  const path = url.pathname;

  // formularul de acces
  if (path === "/__preview" && request.method === "POST") {
    const form = await request.formData().catch(() => null);
    const pw = form ? String(form.get("pw") || "") : "";
    if (env.ADMIN_PASSWORD && pw === env.ADMIN_PASSWORD) {
      return new Response(null, { status: 303, headers: { location: "/", "set-cookie": previewCookie(await previewToken(env)) } });
    }
    await new Promise(r => setTimeout(r, 800));
    return new Response(page("Parolă greșită."), { status: 401, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  if (OPEN.some(r => r.test(path))) return next();
  // API: liber pentru cererile panoului de administrare (au parola în antet) și pentru verificările CORS
  if (path.startsWith("/api/") && (request.method === "OPTIONS" || request.headers.get("x-admin-key"))) return next();

  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)artdeco_preview=([a-f0-9]{64})/);
  if (m && m[1] === (await previewToken(env))) return next();

  if (path.startsWith("/api/") || path === "/feed.xml") {
    return new Response(JSON.stringify({ error: "Magazinul este în pregătire." }), { status: 403, headers: { "content-type": "application/json; charset=utf-8" } });
  }
  return new Response(page(), { status: 503, headers: { "content-type": "text/html; charset=utf-8", "retry-after": "86400", "cache-control": "no-store" } });
}
