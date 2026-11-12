import { json, noKV, loadProducts, saveProducts, isAdmin, denied, clean, slugify } from "../_lib.js";

// GET /api/products – lista publică (fără produsele ascunse); cu cheia de admin le include pe toate
export async function onRequestGet({ request, env }) {
  const err = noKV(env); if (err) return err;
  const list = await loadProducts(env);
  const admin = isAdmin(request, env);
  return json(admin ? list : list.filter(p => !p.hidden));
}

// POST /api/products – adaugă un produs nou (doar admin)
export async function onRequestPost({ request, env }) {
  const err = noKV(env); if (err) return err;
  if (!isAdmin(request, env)) return denied();
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date invalide." }, 400); }
  try {
    const list = await loadProducts(env);
    const p = clean(body);
    let id = slugify(p.name), n = 2;
    while (list.some(x => x.id === id)) id = `${slugify(p.name)}-${n++}`;
    p.id = id;
    p.created = new Date().toISOString();
    list.unshift(p);
    await saveProducts(env, list);
    return json(p, 201);
  } catch (e) {
    return json({ error: e.message }, 400);
  }
}
