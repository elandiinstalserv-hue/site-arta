import { json, fail, db, loadProducts, isAdmin, denied } from "../_lib.js";

// POST /api/bulk – modificări pe mai multe produse deodată (doar admin)
//   { action: "hidden-to-sold" }  → produsele ascunse devin vizibile, marcate „Vândut – disponibil la comandă”
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return denied();
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date invalide." }, 400); }
  try {
    if (body.action !== "hidden-to-sold") return json({ error: "Acțiune necunoscută." }, 400);
    const list = (await loadProducts(env)).filter(p => p.hidden);
    if (!list.length) return json({ changed: 0 });
    const d = await db(env);
    const now = new Date().toISOString();
    const stmts = list.map(p => d.prepare("UPDATE products SET data = ? WHERE id = ?")
      .bind(JSON.stringify({ ...p, hidden: false, sold: true, updated: now }), p.id));
    for (let i = 0; i < stmts.length; i += 50) await d.batch(stmts.slice(i, i + 50));
    return json({ changed: list.length });
  } catch (e) { return fail(e); }
}
