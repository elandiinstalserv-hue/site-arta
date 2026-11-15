// Permite importul produselor direct din pagina contului tău eMAG Marketplace
// (cererile de acolo sunt „cross-origin” și au nevoie de antete CORS).
// Toate operațiile de scriere cer în continuare parola de administrare.
const ALLOWED = ["https://marketplace.emag.ro"];

export async function onRequest({ request, next }) {
  const origin = request.headers.get("origin");
  const allowed = origin && ALLOWED.includes(origin);
  if (request.method === "OPTIONS") {
    if (!allowed) return new Response(null, { status: 204 });
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET, POST, PUT, DELETE",
        "access-control-allow-headers": "content-type, x-admin-key",
        "access-control-max-age": "600",
        vary: "origin",
      },
    });
  }
  const res = await next();
  if (!allowed) return res;
  const out = new Response(res.body, res);
  out.headers.set("access-control-allow-origin", origin);
  out.headers.append("vary", "origin");
  return out;
}
