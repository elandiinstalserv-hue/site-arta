import { db } from "../_lib.js";

// GET /img/:key – servește pozele produselor din baza de date
export async function onRequestGet({ env, params }) {
  if (!/^[a-z0-9-]+$/i.test(params.key)) return new Response("Not found", { status: 404 });
  try {
    const d = await db(env);
    const r = await d.prepare("SELECT type, data FROM images WHERE id = ?").bind(params.key).first();
    if (!r) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(r.data), {
      headers: { "content-type": r.type, "cache-control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Error", { status: 500 });
  }
}
