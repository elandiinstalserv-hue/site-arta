import { json, noKV, loadProducts, saveProducts, isAdmin, denied, clean } from "../../_lib.js";

// PUT /api/products/:id – modifică un produs (doar admin)
export async function onRequestPut({ request, env, params }) {
  const err = noKV(env); if (err) return err;
  if (!isAdmin(request, env)) return denied();
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date invalide." }, 400); }
  const list = await loadProducts(env);
  const i = list.findIndex(p => p.id === params.id);
  if (i < 0) return json({ error: "Produsul nu există." }, 404);
  try {
    list[i] = clean(body, list[i]);
    list[i].updated = new Date().toISOString();
    await saveProducts(env, list);
    return json(list[i]);
  } catch (e) {
    return json({ error: e.message }, 400);
  }
}

// DELETE /api/products/:id – șterge produsul și pozele lui (doar admin)
export async function onRequestDelete({ request, env, params }) {
  const err = noKV(env); if (err) return err;
  if (!isAdmin(request, env)) return denied();
  const list = await loadProducts(env);
  const p = list.find(x => x.id === params.id);
  if (!p) return json({ error: "Produsul nu există." }, 404);
  await saveProducts(env, list.filter(x => x.id !== params.id));
  await Promise.all((p.images || []).map(u => env.SHOP.delete("img:" + u.split("/").pop())));
  return json({ ok: true });
}
