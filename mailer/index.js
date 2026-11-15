// Worker „artdeco-mailer”: trimite pe email comenzile primite în magazin
// și redirecționează emailurile primite la contact@art-deco.ro către toate adresele.
// Este apelat de site (Pages) prin legătura de serviciu „MAILER”, nu e accesibil public.
// Expeditor: comenzi@art-deco.ro (domeniul are Email Routing activ în Cloudflare).
// Destinatari: adresele confirmate în Email Routing (vezi wrangler.toml).
import { EmailMessage } from "cloudflare:email";

const FROM = "comenzi@art-deco.ro";
const FROM_NAME = "Magazin ArtDeco";

const b64 = s => {
  const bytes = new TextEncoder().encode(s);
  let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/.{1,76}/g, m => m + "\r\n");
};
const encWord = s => `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(s)))}?=`;

function mime({ to, subject, text, replyTo }) {
  const headers = [
    `From: ${encWord(FROM_NAME)} <${FROM}>`,
    `To: <${to}>`,
    `Subject: ${encWord(subject)}`,
    `Message-ID: <${crypto.randomUUID()}@art-deco.ro>`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];
  if (replyTo && /^[^\s@<>]+@[^\s@<>]+$/.test(replyTo)) headers.push(`Reply-To: <${replyTo}>`);
  return headers.join("\r\n") + "\r\n\r\n" + b64(text);
}

const RCPT = env => String(env.ORDER_RECIPIENTS || "").split(",").map(s => s.trim()).filter(Boolean);

export default {
  // emailurile primite la contact@art-deco.ro sunt trimise mai departe la toate adresele
  async email(message, env) {
    for (const addr of RCPT(env)) {
      try { await message.forward(addr); } catch (e) { console.log("forward", addr, String(e)); }
    }
  },
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Not found", { status: 404 });
    const { subject, text, replyTo } = await request.json();
    const to = RCPT(env);
    const results = [];
    for (const addr of to) {
      try {
        await env.SEB.send(new EmailMessage(FROM, addr, mime({ to: addr, subject, text, replyTo })));
        results.push({ to: addr, ok: true });
      } catch (e) {
        results.push({ to: addr, ok: false, error: String(e && e.message || e) });
      }
    }
    return Response.json({ results });
  },
};
