import { json, fail, db, isAdmin, denied } from "../../_lib.js";

const STATUSES = ["nouă", "confirmată", "expediată", "finalizată", "anulată"];

// PUT /api/orders/:id – schimbă starea comenzii (doar admin)
export async function onRequestPut({ request, env, params }) {
  if (!isAdmin(request, env)) return denied();
  let b;
  try { b = await request.json(); } catch { return json({ error: "Date invalide." }, 400); }
  if (!STATUSES.includes(b.status)) return json({ error: "Stare invalidă." }, 400);
  try {
    const d = await db(env);
    const r = await d.prepare("SELECT data FROM orders WHERE id = ?").bind(params.id).first();
    if (!r) return json({ error: "Comanda nu există." }, 404);
    const o = { ...JSON.parse(r.data), status: b.status, updated: new Date().toISOString() };
    if (typeof b.note === "string") o.note = b.note.slice(0, 1000);
    await d.prepare("UPDATE orders SET data = ? WHERE id = ?").bind(JSON.stringify(o), params.id).run();
    return json(o);
  } catch (e) { return fail(e); }
}
