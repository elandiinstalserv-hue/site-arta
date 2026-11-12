import { json, fail, db, deleteImages, isAdmin, denied } from "../_lib.js";

const TYPES = ["image/webp", "image/jpeg", "image/png"];
const MAX = 1.8 * 1024 * 1024; // pozele sunt micșorate în browser înainte de urcare

// POST /api/upload – corpul cererii e poza; răspunde cu adresa ei (doar admin)
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return denied();
  const type = (request.headers.get("content-type") || "").split(";")[0].trim();
  if (!TYPES.includes(type)) return json({ error: "Format de poză neacceptat." }, 415);
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return json({ error: "Poza e goală." }, 400);
  if (buf.byteLength > MAX) return json({ error: "Poza e prea mare." }, 413);
  try {
    const d = await db(env);
    const id = crypto.randomUUID();
    await d.prepare("INSERT INTO images (id, type, data, created) VALUES (?, ?, ?, ?)")
      .bind(id, type, buf, new Date().toISOString()).run();
    return json({ url: "/img/" + id }, 201);
  } catch (e) { return fail(e); }
}

// DELETE /api/upload?url=/img/... – șterge o poză scoasă din produs (doar admin)
export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request, env)) return denied();
  const url = new URL(request.url).searchParams.get("url") || "";
  if (!/^\/img\/[a-z0-9-]+$/i.test(url)) return json({ error: "Adresă invalidă." }, 400);
  try { await deleteImages(env, [url]); return json({ ok: true }); } catch (e) { return fail(e); }
}
