import { json, db, isAdmin, denied } from "../_lib.js";
import { previewToken, previewCookie } from "../_middleware.js";

// POST /api/login – verifică parola (trimisă în antetul x-admin-key)
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return json({ error: "Parola de administrare nu e setată în Cloudflare (ADMIN_PASSWORD)." }, 500);
  try { await db(env); } catch (e) { return json({ error: e.message }, 500); }
  if (!isAdmin(request, env)) {
    await new Promise(r => setTimeout(r, 800)); // încetinește încercările repetate
    return denied();
  }
  // după autentificare poți vedea și magazinul cât timp e „în pregătire”
  return json({ ok: true }, 200, { "set-cookie": previewCookie(await previewToken(env)) });
}
