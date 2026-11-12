// GET /img/:key – servește pozele produselor din KV
export async function onRequestGet({ env, params }) {
  if (!env.SHOP || !/^[a-z0-9-]+$/i.test(params.key)) return new Response("Not found", { status: 404 });
  const { value, metadata } = await env.SHOP.getWithMetadata("img:" + params.key, "arrayBuffer");
  if (!value) return new Response("Not found", { status: 404 });
  return new Response(value, {
    headers: {
      "content-type": (metadata && metadata.type) || "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
