import { json, fail, loadProducts, getProduct, putProduct, isAdmin, denied, clean, slugify } from "../_lib.js";

// GET /api/products – lista publică (fără produsele ascunse); cu cheia de admin le include pe toate
export async function onRequestGet({ request, env }) {
  try {
    const list = await loadProducts(env);
    return json(isAdmin(request, env) ? list : list.filter(p => !p.hidden));
  } catch (e) { return fail(e); }
}

// POST /api/products – adaugă un produs nou (doar admin).
// Dacă se trimite „importId” (ex: produs adus din eMAG), id-ul e fix și importul repetat nu dublează produsul.
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return denied();
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date invalide." }, 400); }
  try {
    const p = clean(body);
    if (body.importId) {
      const id = "emag-" + slugify(body.importId);
      if (await getProduct(env, id)) return json({ skipped: true, id }, 200);
      p.id = id;
    } else {
      let id = slugify(p.name), n = 2;
      while (await getProduct(env, id)) id = `${slugify(p.name)}-${n++}`;
      p.id = id;
    }
    p.created = body.created && !isNaN(Date.parse(body.created)) ? new Date(body.created).toISOString() : new Date().toISOString();
    await putProduct(env, p);
    return json(p, 201);
  } catch (e) { return fail(e); }
}
