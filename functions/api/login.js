import { json, isAdmin, denied } from "../_lib.js";

// POST /api/login – verifică parola (trimisă în antetul x-admin-key)
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return json({ error: "Parola de administrare nu e setată în Cloudflare (ADMIN_PASSWORD)." }, 500);
  if (!env.SHOP) return json({ error: "Lipsește legătura KV „SHOP” în setările proiectului Cloudflare." }, 500);
  if (!isAdmin(request, env)) {
    await new Promise(r => setTimeout(r, 800)); // încetinește încercările repetate
    return denied();
  }
  return json({ ok: true });
}
