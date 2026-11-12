import { json, isAdmin, denied } from "../_lib.js";

// GET /api/fetch-image?url=... – aduce o poză de pe serverele eMAG pentru import (doar admin).
// Browserul o micșorează apoi și o urcă prin /api/upload.
const HOSTS = ["marketplace-static.emag.ro", "content-static.emag.net", "s13emagst.akamaized.net"];

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return denied();
  let u;
  try { u = new URL(new URL(request.url).searchParams.get("url") || ""); } catch { return json({ error: "Adresă invalidă." }, 400); }
  if (u.protocol !== "https:" || !HOSTS.includes(u.hostname)) return json({ error: "Sursă de poze neacceptată." }, 400);
  let r;
  try { r = await fetch(u.toString(), { headers: { accept: "image/*" } }); }
  catch { return json({ error: "Poza nu a putut fi descărcată." }, 502); }
  const type = (r.headers.get("content-type") || "").split(";")[0];
  if (!r.ok || !type.startsWith("image/")) return json({ error: "Poza nu a putut fi descărcată (" + r.status + ")." }, 502);
  return new Response(r.body, { headers: { "content-type": type, "cache-control": "no-store" } });
}
