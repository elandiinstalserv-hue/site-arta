// Funcții comune pentru API-ul magazinului ArtDeco.
// Necesită în Cloudflare Pages:
//   - un KV namespace legat cu numele  SHOP
//   - o variabilă secretă              ADMIN_PASSWORD

export const CATS = ["tablouri", "globuri", "decoratiuni", "gablonturi"];

export const SEED = [
  {
    id: "tablou-trandafiri-roz", cat: "tablouri", price: 350, isNew: true, sold: false, hidden: false,
    name: "Tablou pictat în ulei – Trandafiri roz în vază violet",
    attrs: "49 × 35 cm, ulei pe pânză caserată pe MDF, cu ramă",
    material: "Pânză pe MDF", tehnica: "Pictură în ulei", size: 49, images: [],
    desc: "E o pictură în ulei originală, nu un print: compoziția e gândită și pictată de mână de la zero. Trandafirii roz și vaza violet aduc căldură și culoare în sufragerie, dormitor, hol sau birou. Pictura e făcută pe pânză lipită pe MDF, așa că e rigidă și stabilă și nu se deformează în timp. Vine cu ramă și o poți agăța pe perete imediat ce ajunge.",
    specs: ["Tehnică: pictură în ulei, manuală", "Suport: pânză caserată pe MDF", "Dimensiuni cu ramă: 49 × 35 cm, grosime 2 cm", "Compoziție proprie, exemplar unic", "Ideal pentru: decor de interior, cadou pentru casă nouă, aniversări"],
    created: "2026-11-12T00:00:00Z"
  },
  {
    id: "glob-mos-craciun-rosu", cat: "globuri", price: 45, isNew: true, sold: false, hidden: false,
    name: "Globuleț pictat manual – Moș Crăciun pe roșu cu sclipici, Ø 8 cm",
    attrs: "Ø 8 cm, plastic, pictat cu acrilice, sclipici",
    material: "Plastic", tehnica: "Pictură acrilică", size: 8, images: [],
    desc: "Fiecare globuleț e pictat de mână, unul câte unul, cu culori acrilice. De aceea nu există două identice. Moș Crăciun e pictat pe un fond roșu cu glazură de sclipici, care prinde lumina luminițelor din brad. E făcut din plastic, deci e ușor și nu se sparge. Îl poți agăța liniștit chiar dacă ai copii mici sau animale în casă.",
    specs: ["Diametru: 8 cm", "Material: plastic, glazură cu sclipici", "Pictură: manuală, culori acrilice", "Ideal pentru: bradul de Crăciun, cadou, decorațiuni de sărbători"],
    created: "2026-11-12T00:00:01Z"
  }
];

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

export function noKV(env) {
  return !env.SHOP ? json({ error: "Lipsește legătura KV „SHOP” în setările proiectului Cloudflare." }, 500) : null;
}

export async function loadProducts(env) {
  const list = await env.SHOP.get("products", "json");
  return Array.isArray(list) ? list : SEED;
}

export async function saveProducts(env, list) {
  await env.SHOP.put("products", JSON.stringify(list));
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
  p.name = str(input.name, 160);
  if (!p.name) throw new Error("Numele produsului e obligatoriu.");
  p.cat = CATS.includes(input.cat) ? input.cat : null;
  if (!p.cat) throw new Error("Alege o categorie.");
  const price = Number(String(input.price).replace(",", "."));
  if (!(price > 0) || price > 1000000) throw new Error("Prețul nu e valid.");
  p.price = Math.round(price * 100) / 100;
  p.attrs = str(input.attrs, 160);
  p.material = str(input.material, 60);
  p.tehnica = str(input.tehnica, 60);
  const size = Number(String(input.size ?? "").replace(",", "."));
  p.size = size > 0 ? size : 0;
  p.desc = str(input.desc, 5000);
  p.specs = (Array.isArray(input.specs) ? input.specs : String(input.specs || "").split("\n"))
    .map(s => str(s, 200)).filter(Boolean).slice(0, 20);
  p.images = (Array.isArray(input.images) ? input.images : [])
    .filter(u => typeof u === "string" && /^\/img\/[a-z0-9-]+$/i.test(u)).slice(0, 8);
  p.isNew = !!input.isNew;
  p.sold = !!input.sold;
  p.hidden = !!input.hidden;
  return p;
}
