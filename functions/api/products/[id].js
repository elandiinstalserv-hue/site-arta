import { json, fail, db, getProduct, putProduct, deleteImages, isAdmin, denied, clean } from "../../_lib.js";

// PUT /api/products/:id – modifică un produs (doar admin)
export async function onRequestPut({ request, env, params }) {
  if (!isAdmin(request, env)) return denied();
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date invalide." }, 400); }
  try {
    const old = await getProduct(env, params.id);
    if (!old) return json({ error: "Produsul nu există." }, 404);
    const p = clean(body, old);
    p.updated = new Date().toISOString();
    await putProduct(env, p);
    return json(p);
  } catch (e) { return fail(e); }
}

// DELETE /api/products/:id – șterge produsul și pozele lui (doar admin)
export async function onRequestDelete({ request, env, params }) {
  if (!isAdmin(request, env)) return denied();
  try {
    const p = await getProduct(env, params.id);
    if (!p) return json({ error: "Produsul nu există." }, 404);
    const d = await db(env);
    await d.prepare("DELETE FROM products WHERE id = ?").bind(params.id).run();
    await deleteImages(env, p.images);
    return json({ ok: true });
  } catch (e) { return fail(e); }
}
