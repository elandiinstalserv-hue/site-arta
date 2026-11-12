import { json, noKV, isAdmin, denied } from "../_lib.js";

const TYPES = ["image/webp", "image/jpeg", "image/png"];
const MAX = 4 * 1024 * 1024; // 4 MB (pozele sunt micșorate în browser înainte de urcare)

// POST /api/upload – corpul cererii e poza; răspunde cu adresa ei (doar admin)
export async function onRequestPost({ request, env }) {
  const err = noKV(env); if (err) return err;
  if (!isAdmin(request, env)) return denied();
  const type = (request.headers.get("content-type") || "").split(";")[0].trim();
  if (!TYPES.includes(type)) return json({ error: "Format de poză neacceptat." }, 415);
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return json({ error: "Poza e goală." }, 400);
  if (buf.byteLength > MAX) return json({ error: "Poza e prea mare (maxim 4 MB)." }, 413);
  const key = crypto.randomUUID();
  await env.SHOP.put("img:" + key, buf, { metadata: { type } });
  return json({ url: "/img/" + key }, 201);
}

// DELETE /api/upload?url=/img/... – șterge o poză scoasă din produs (doar admin)
export async function onRequestDelete({ request, env }) {
  const err = noKV(env); if (err) return err;
  if (!isAdmin(request, env)) return denied();
  const url = new URL(request.url).searchParams.get("url") || "";
  const m = url.match(/^\/img\/([a-z0-9-]+)$/i);
  if (!m) return json({ error: "Adresă invalidă." }, 400);
  await env.SHOP.delete("img:" + m[1]);
  return json({ ok: true });
}
