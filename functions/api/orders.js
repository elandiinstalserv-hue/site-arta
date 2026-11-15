import { json, fail, db, loadProducts, isAdmin, denied } from "../_lib.js";

// Comenzile trimise din coșul magazinului.
// POST /api/orders  – public: salvează comanda (prețurile se recalculează pe server) și trimite email, dacă e configurat
// GET  /api/orders  – admin: lista comenzilor
const str = (v, max = 200) => String(v ?? "").trim().slice(0, max);
const PAY = ["Ramburs la curier", "Transfer bancar"];

async function ensure(d) {
  await d.prepare("CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data TEXT NOT NULL, created TEXT NOT NULL)").run();
}
async function settings(d) {
  const r = await d.prepare("SELECT v FROM meta WHERE k = 'settings'").first();
  return { minOrder: 100, codFee: 25, transferShip: "", ...(r ? JSON.parse(r.v) : {}) };
}
const lei = n => (Math.round(n * 100) / 100).toLocaleString("ro-RO") + " lei";

export function orderText(o) {
  return [
    `Comandă nouă ArtDeco – ${o.id}`,
    `Data: ${new Date(o.created).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}`,
    "",
    ...o.items.map(i => `• ${i.name} × ${i.qty} = ${lei(i.price * i.qty)}${i.sold ? " (la comandă)" : ""}`),
    "",
    `Total produse: ${lei(o.subtotal)}`,
    `Livrare: ${o.shipping === null ? "se comunică la confirmare" : lei(o.shipping)}`,
    `Total de plată: ${o.shipping === null ? lei(o.subtotal) + " + livrare" : lei(o.total)}`,
    "",
    `Nume: ${o.customer.nume}`,
    `Telefon: ${o.customer.tel}`,
    `Email: ${o.customer.email || "-"}`,
    `Adresă: ${o.customer.adresa}, ${o.customer.oras}, jud. ${o.customer.judet}`,
    `Plata: ${o.payment}`,
    `Observații: ${o.customer.obs || "-"}`,
  ].join("\n");
}

export async function onRequestPost({ request, env, waitUntil }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "Date invalide." }, 400); }
  if (b.website) return json({ ok: true, id: "AD-0" }); // câmp-capcană pentru roboți
  try {
    const d = await db(env); await ensure(d);
    const c = { nume: str(b.nume, 100), tel: str(b.tel, 30), email: str(b.email, 120), adresa: str(b.adresa, 200), oras: str(b.oras, 80), judet: str(b.judet, 60), obs: str(b.obs, 1000) };
    if (!c.nume || !c.adresa || !c.oras || !c.judet || !/^[+0-9 ().-]{8,20}$/.test(c.tel)) return json({ error: "Completează numele, telefonul și adresa de livrare." }, 400);
    const payment = PAY.includes(b.plata) ? b.plata : PAY[0];
    const products = new Map((await loadProducts(env)).map(p => [p.id, p]));
    const items = [];
    for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 50)) {
      const p = products.get(String(it.id)); const qty = Math.max(1, Math.min(20, parseInt(it.qty) || 1));
      if (!p || p.hidden) continue;
      items.push({ id: p.id, name: p.name, price: p.price, qty, sold: !!p.sold });
    }
    if (!items.length) return json({ error: "Coșul este gol sau produsele nu mai sunt disponibile." }, 400);
    const s = await settings(d);
    const subtotal = Math.round(items.reduce((a, i) => a + i.price * i.qty, 0) * 100) / 100;
    if (subtotal < s.minOrder) return json({ error: `Comanda minimă este ${lei(s.minOrder)}.` }, 400);
    const shipping = payment === "Transfer bancar" ? (s.transferShip === "" ? null : Number(s.transferShip)) : Number(s.codFee);
    const now = new Date();
    const day = now.toISOString().slice(0, 10).replace(/-/g, "");
    const cnt = await d.prepare("SELECT COUNT(*) AS n FROM orders WHERE id LIKE ?").bind(`AD-${day}-%`).first();
    const id = `AD-${day}-${String((cnt?.n || 0) + 1).padStart(3, "0")}`;
    const o = { id, created: now.toISOString(), status: "nouă", items, subtotal, shipping, total: shipping === null ? null : Math.round((subtotal + shipping) * 100) / 100, payment, customer: c };
    await d.prepare("INSERT INTO orders (id, data, created) VALUES (?, ?, ?)").bind(id, JSON.stringify(o), o.created).run();
    // email automat (când serviciul de trimitere e legat ca „MAILER”)
    if (env.MAILER) {
      const send = env.MAILER.fetch("https://mailer/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subject: `Comandă nouă ${id} – ${c.nume} – ${o.total === null ? lei(subtotal) + " + livrare" : lei(o.total)}`, text: orderText(o), replyTo: c.email || "" }) }).catch(() => {});
      waitUntil ? waitUntil(send) : await send;
    }
    return json({ ok: true, id, text: orderText(o) }, 201);
  } catch (e) { return fail(e); }
}

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return denied();
  try {
    const d = await db(env); await ensure(d);
    const { results } = await d.prepare("SELECT data FROM orders ORDER BY created DESC LIMIT 500").all();
    return json(results.map(r => JSON.parse(r.data)));
  } catch (e) { return fail(e); }
}
