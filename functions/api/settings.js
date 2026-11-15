import { json, fail, db, isAdmin, denied } from "../_lib.js";

// Textele editabile ale magazinului (deocamdată pagina „Despre noi”)
const DEFAULTS = {
  aboutTitle: "Artă din suflet, lucrată manual, la Târgoviște",
  minOrder: 100,          // valoarea minimă a comenzii (lei)
  codFee: 25,             // cost livrare cu plata ramburs (lei)
  transferShip: "",       // cost livrare cu plata prin transfer (lei); gol = se comunică la confirmare
  aboutText: "ArtDeco a pornit din pasiunea pentru pictură și lucrul manual. Pictăm tablouri în ulei, decorăm globuri și obiecte cu culori acrilice și creăm gablonturi și obiecte de artizanat, fiecare cu răbdare și atenție la detalii.\n\nNu lucrăm în serie. Fiecare produs e realizat manual, de aceea poate avea mici diferențe față de fotografie. Asta e farmecul unui obiect făcut de mână.",
};

async function read(env) {
  const d = await db(env);
  const r = await d.prepare("SELECT v FROM meta WHERE k = 'settings'").first();
  return { ...DEFAULTS, ...(r ? JSON.parse(r.v) : {}) };
}

export async function onRequestGet({ env }) {
  try { return json(await read(env)); } catch (e) { return fail(e); }
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return denied();
  let body;
  try { body = await request.json(); } catch { return json({ error: "Date invalide." }, 400); }
  try {
    const s = await read(env);
    if (typeof body.aboutTitle === "string") s.aboutTitle = body.aboutTitle.trim().slice(0, 150) || DEFAULTS.aboutTitle;
    if (typeof body.aboutText === "string") s.aboutText = body.aboutText.trim().slice(0, 10000) || DEFAULTS.aboutText;
    const num = (v, max) => { const n = Number(String(v).replace(",", ".")); return n >= 0 && n <= max ? Math.round(n * 100) / 100 : null; };
    if (body.minOrder !== undefined && num(body.minOrder, 100000) !== null) s.minOrder = num(body.minOrder, 100000);
    if (body.codFee !== undefined && num(body.codFee, 1000) !== null) s.codFee = num(body.codFee, 1000);
    if (body.transferShip !== undefined) s.transferShip = String(body.transferShip).trim() === "" ? "" : (num(body.transferShip, 1000) ?? s.transferShip);
    const d = await db(env);
    await d.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('settings', ?)").bind(JSON.stringify(s)).run();
    return json(s);
  } catch (e) { return fail(e); }
}
