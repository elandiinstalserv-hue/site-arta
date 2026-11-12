// Funcții comune pentru API-ul magazinului ArtDeco.
// Necesită în Cloudflare Pages:
//   - o bază de date D1 legată cu numele  DB
//   - o variabilă secretă                 ADMIN_PASSWORD
// Tabelele se creează automat la prima cerere.

export const CATS = ["tablouri", "globuri", "decoratiuni", "gablonturi", "martisoare"];

export const SEED = [
  {
    id: "tablou-trandafiri-roz", cat: "tablouri", price: 350, isNew: true, sold: false, hidden: false,
    name: "Tablou pictat în ulei – Trandafiri roz în vază violet",
    attrs: "49 × 35 cm, ulei pe pânză caserată pe MDF, cu ramă",
    material: "Pânză pe MDF", tehnica: "Pictură în ulei", size: 49, images: [],
    desc: "E o pictură în ulei originală, nu un print: compoziția e gândită și pictată de mână de la zero. Trandafirii roz și vaza violet aduc căldură și culoare în sufragerie, dormitor, hol sau birou. Pictura e făcută pe pânză lipită pe MDF, așa că e rigidă și stabilă și nu se deformează în timp. Vine cu ramă și o poți agăța pe perete imediat ce ajunge.",
    specs: ["Tehnică: pictură în ulei, manuală", "Suport: pânză caserată pe MDF", "Dimensiuni cu ramă: 49 × 35 cm, grosime 2 cm", "Compoziție proprie, exemplar unic"],
    created: "2026-11-12T00:00:00Z"
  }
];

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

let ready = false;
export async function db(env) {
  if (!env.DB) throw Object.assign(new Error("Lipsește legătura bazei de date D1 „DB” în setările proiectului Cloudflare."), { status: 500 });
  if (!ready) {
    await env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL, created TEXT NOT NULL)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL, created TEXT NOT NULL)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)"),
    ]);
    const seeded = await env.DB.prepare("SELECT v FROM meta WHERE k = 'seeded'").first();
    if (!seeded) {
      await env.DB.batch([
        ...SEED.map(p => env.DB.prepare("INSERT OR IGNORE INTO products (id, data, created) VALUES (?, ?, ?)").bind(p.id, JSON.stringify(p), p.created)),
        env.DB.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('seeded', '1')"),
      ]);
    }
    ready = true;
  }
  return env.DB;
}

export const fail = e => json({ error: e.message || "Eroare la server." }, e.status || 500);

export async function loadProducts(env) {
  const d = await db(env);
  const { results } = await d.prepare("SELECT data FROM products ORDER BY created DESC").all();
  return results.map(r => JSON.parse(r.data));
}
export async function getProduct(env, id) {
  const d = await db(env);
  const r = await d.prepare("SELECT data FROM products WHERE id = ?").bind(id).first();
  return r ? JSON.parse(r.data) : null;
}
export async function putProduct(env, p) {
  const d = await db(env);
  await d.prepare("INSERT INTO products (id, data, created) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data")
    .bind(p.id, JSON.stringify(p), p.created || new Date().toISOString()).run();
}
export async function deleteImages(env, urls) {
  const d = await db(env);
  const ids = (urls || []).map(u => String(u).split("/").pop()).filter(id => /^[a-z0-9-]+$/i.test(id));
  if (ids.length) await d.batch(ids.map(id => d.prepare("DELETE FROM images WHERE id = ?").bind(id)));
}

function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}
export function isAdmin(request, env) {
  const key = request.headers.get("x-admin-key") || "";
  return !!env.ADMIN_PASSWORD && key.length > 0 && safeEqual(key, env.ADMIN_PASSWORD);
}
export const denied = () => json({ error: "Parolă greșită sau sesiune expirată." }, 401);

export function slugify(s) {
  return String(s || "produs")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 60) || "produs";
}

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);

// Curăță și validează datele trimise din panoul de administrare
export function clean(input, existing = {}) {
  const p = { ...existing };
  p.name = str(input.name, 200);
  if (!p.name) throw Object.assign(new Error("Numele produsului e obligatoriu."), { status: 400 });
  p.cat = CATS.includes(input.cat) ? input.cat : null;
  if (!p.cat) throw Object.assign(new Error("Alege o categorie."), { status: 400 });
  const price = Number(String(input.price).replace(",", "."));
  if (!(price > 0) || price > 1000000) throw Object.assign(new Error("Prețul nu e valid."), { status: 400 });
  p.price = Math.round(price * 100) / 100;
  p.attrs = str(input.attrs, 200);
  p.material = str(input.material, 60);
  p.tehnica = str(input.tehnica, 60);
  const size = Number(String(input.size ?? "").replace(",", "."));
  p.size = size > 0 ? size : 0;
  p.desc = str(input.desc, 20000);
  p.specs = (Array.isArray(input.specs) ? input.specs : String(input.specs || "").split("\n"))
    .map(s => str(s, 200)).filter(Boolean).slice(0, 30);
  p.images = (Array.isArray(input.images) ? input.images : [])
    .filter(u => typeof u === "string" && /^\/img\/[a-z0-9-]+$/i.test(u)).slice(0, 8);
  p.isNew = !!input.isNew;
  p.sold = !!input.sold;
  p.hidden = !!input.hidden;
  if (input.source) p.source = str(input.source, 40);
  return p;
}
