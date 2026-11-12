import { loadProducts } from "./_lib.js";

// GET /feed.xml – lista de produse în formatul Google Shopping (acceptat și de Biano și Compari.ro)
const esc = s => String(s ?? "").replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
const CAT_NAMES = { tablouri: "Tablouri pictate", globuri: "Crăciun – globuri și decorațiuni", decoratiuni: "Decorațiuni & artizanat", gablonturi: "Gablonturi", martisoare: "Mărțișoare" };

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  let list = [];
  try { list = (await loadProducts(env)).filter(p => !p.hidden); } catch {}
  const items = list.map(p => `
  <item>
    <g:id>${esc(p.id)}</g:id>
    <title>${esc(p.name)}</title>
    <description>${esc(p.desc)}</description>
    <link>${origin}/#produs-${esc(p.id)}</link>
    ${p.images && p.images[0] ? `<g:image_link>${origin}${esc(p.images[0])}</g:image_link>` : ""}
    ${(p.images || []).slice(1, 6).map(u => `<g:additional_image_link>${origin}${esc(u)}</g:additional_image_link>`).join("")}
    <g:price>${Number(p.price).toFixed(2)} RON</g:price>
    <g:availability>${p.sold ? "out_of_stock" : "in_stock"}</g:availability>
    <g:condition>new</g:condition>
    <g:brand>ArtDeco</g:brand>
    <g:identifier_exists>no</g:identifier_exists>
    <g:product_type>${esc(CAT_NAMES[p.cat] || p.cat)}</g:product_type>
    ${p.material ? `<g:material>${esc(p.material)}</g:material>` : ""}
  </item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>ArtDeco – Artă și artizanat</title>
  <link>${origin}</link>
  <description>Tablouri, decorațiuni și gablonturi lucrate manual</description>${items}
</channel>
</rss>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=900" } });
}
