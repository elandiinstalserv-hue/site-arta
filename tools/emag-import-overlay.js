// Panou de import afișat peste pagina eMAG Marketplace.
// Folosește window.__export (produsele citite din contul de vânzător) și le trimite în magazinul ArtDeco.
// Parola se introduce de utilizator în panou și rămâne doar în memoria paginii.
(() => {
  const B = "https://artdeco.pages.dev";
  const items = (window.__export && window.__export.items) || [];
  const slug = s => String(s || "produs").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "produs";
  document.getElementById("artdeco-imp")?.remove();
  const box = document.createElement("div");
  box.id = "artdeco-imp";
  box.innerHTML = `
  <style>
    #artdeco-imp{position:fixed;inset:0;z-index:2147483647;background:rgba(15,15,20,.55);display:grid;place-items:center;font-family:Montserrat,Arial,sans-serif}
    #artdeco-imp .c{background:#fff;border-radius:16px;width:min(560px,94vw);max-height:92vh;overflow:auto;padding:24px;box-shadow:0 30px 80px rgba(0,0,0,.3);color:#1f1f22}
    #artdeco-imp h2{margin:0 0 4px;font-size:21px;color:#1B4A9C}
    #artdeco-imp label{display:block;font-weight:600;font-size:13px;margin:14px 0 5px}
    #artdeco-imp input[type=password],#artdeco-imp select{width:100%;padding:11px;border:1.5px solid #ddd;border-radius:10px;font-size:15px;box-sizing:border-box}
    #artdeco-imp .chk{display:flex;gap:8px;align-items:center;font-weight:600;font-size:14px;margin-top:14px}
    #artdeco-imp button{border:0;border-radius:10px;padding:12px 18px;font-weight:700;font-size:15px;cursor:pointer}
    #artdeco-imp .go{background:#1B4A9C;color:#fff}
    #artdeco-imp .st{background:#fff;border:1.5px solid #ddd;color:#1f1f22}
    #artdeco-imp .bar{height:12px;background:#eee;border-radius:99px;overflow:hidden;margin-top:16px}
    #artdeco-imp .bar div{height:100%;width:0;background:#1B4A9C;transition:width .3s}
    #artdeco-imp .log{font-size:12px;color:#666;max-height:180px;overflow:auto;background:#fafafa;border-radius:10px;padding:8px;margin-top:10px}
    #artdeco-imp .err{color:#C62828}
  </style>
  <div class="c">
    <h2>Import în magazinul ArtDeco</h2>
    <div style="color:#666;font-size:14px">${items.length} produse citite din contul tău eMAG · ${items.filter(i => !i.hidden).length} active, ${items.filter(i => i.hidden).length} inactive</div>
    <label for="ai-pw">Parola panoului de administrare ArtDeco</label>
    <input type="password" id="ai-pw" autocomplete="off" placeholder="parola setată în Cloudflare">
    <div class="chk"><input type="checkbox" id="ai-inact" checked style="width:18px;height:18px"> <span>Importă și ofertele inactive (vor fi ascunse în magazin)</span></div>
    <label for="ai-max">Câte poze per produs</label>
    <select id="ai-max"><option value="8">Toate (până la 8)</option><option value="5">Primele 5</option><option value="3">Primele 3</option></select>
    <div style="display:flex;gap:10px;margin-top:18px">
      <button class="go" id="ai-go">▶ Pornește importul</button>
      <button class="st" id="ai-stop" style="display:none">⏸ Oprește</button>
      <button class="st" id="ai-close" style="margin-left:auto">Închide</button>
    </div>
    <div class="bar"><div id="ai-bar"></div></div>
    <p id="ai-stat" style="font-weight:600;margin:10px 0 0">Introdu parola și apasă „Pornește importul”.</p>
    <div class="log" id="ai-log"></div>
    <p style="font-size:12px;color:#888;margin-bottom:0">Nu închide și nu schimba pagina cât rulează importul. Dacă se întrerupe, îl poți porni din nou: produsele deja importate sunt sărite.</p>
  </div>`;
  document.body.appendChild(box);
  const $ = s => box.querySelector(s);
  const S = window.__imp = { running: false, ok: 0, bad: 0, skipped: 0, total: 0, current: "", done: false, error: "" };
  let KEY = "", stop = false;
  const log = (m, bad) => { const d = document.createElement("div"); d.textContent = m; if (bad) d.className = "err"; $("#ai-log").prepend(d); };
  async function api(path, opts = {}) {
    const r = await fetch(B + path, { ...opts, headers: { "x-admin-key": KEY, ...(opts.headers || {}) } });
    let data = null; try { data = await r.json(); } catch (e) {}
    if (r.status === 401) throw new Error("Parolă greșită.");
    if (!r.ok) throw new Error((data && data.error) || ("Eroare " + r.status));
    return data;
  }
  async function shrink(blob) {
    const bmp = await createImageBitmap(blob);
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close && bmp.close();
    let out = await new Promise(r => c.toBlob(r, "image/webp", 0.82));
    if (!out || out.type !== "image/webp") out = await new Promise(r => c.toBlob(r, "image/jpeg", 0.85));
    return out;
  }
  async function importImage(url) {
    const r = await fetch(B + "/api/fetch-image?url=" + encodeURIComponent(url), { headers: { "x-admin-key": KEY } });
    if (!r.ok) throw new Error("poză indisponibilă");
    const small = await shrink(await r.blob());
    const up = await api("/api/upload", { method: "POST", headers: { "content-type": small.type }, body: small });
    return up.url;
  }
  $("#ai-close").onclick = () => { if (S.running) return; box.remove(); };
  $("#ai-stop").onclick = () => { stop = true; $("#ai-stat").textContent = "Se oprește după produsul curent…"; };
  $("#ai-go").onclick = async () => {
    KEY = $("#ai-pw").value;
    if (!KEY) { $("#ai-stat").textContent = "Scrie parola."; return; }
    try { await api("/api/login", { method: "POST" }); } catch (e) { $("#ai-stat").textContent = e.message; $("#ai-stat").className = "err"; return; }
    $("#ai-stat").className = "";
    const have = new Set((await api("/api/products")).map(p => p.id));
    const withInactive = $("#ai-inact").checked, max = +$("#ai-max").value;
    const list = items.filter(i => (withInactive || !i.hidden));
    const pending = list.filter(i => !have.has("emag-" + slug(i.importId)));
    S.skipped = list.length - pending.length; S.total = pending.length; S.ok = 0; S.bad = 0; S.done = false; S.running = true; stop = false;
    if (S.skipped) log(`${S.skipped} produse sunt deja în magazin și au fost sărite.`);
    $("#ai-go").style.display = "none"; $("#ai-stop").style.display = "inline-block"; $("#ai-pw").disabled = true;
    for (let k = 0; k < pending.length && !stop; k++) {
      const it = pending[k];
      S.current = it.name; $("#ai-stat").textContent = `Import ${k + 1} din ${pending.length}: ${it.name}`;
      $("#ai-bar").style.width = (k / pending.length * 100) + "%";
      const imgs = [];
      try {
        for (const u of (it.imageUrls || []).slice(0, max)) { if (stop) break; try { imgs.push(await importImage(u)); } catch (e) {} }
        if (stop) { for (const u of imgs) await api("/api/upload?url=" + encodeURIComponent(u), { method: "DELETE" }).catch(() => {}); break; }
        await api("/api/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
          importId: it.importId, name: it.name, cat: it.cat, price: it.price, attrs: it.attrs, material: it.material, tehnica: it.tehnica,
          size: it.size, desc: it.desc, specs: it.specs || [], images: imgs, isNew: false, sold: false, hidden: !!it.hidden, source: "emag" }) });
        S.ok++; log(`✓ ${it.name} (${imgs.length} poze)`);
      } catch (e) {
        S.bad++; log(`✗ ${it.name}: ${e.message}`, true);
        for (const u of imgs) await api("/api/upload?url=" + encodeURIComponent(u), { method: "DELETE" }).catch(() => {});
      }
    }
    $("#ai-bar").style.width = "100%";
    $("#ai-stat").textContent = stop ? `Oprit: ${S.ok} produse importate. Poți continua oricând.` : `Gata! ${S.ok} produse importate${S.bad ? `, ${S.bad} cu erori (pornește din nou ca să le reîncerci)` : ""}.`;
    S.running = false; S.done = !stop;
    $("#ai-go").style.display = "inline-block"; $("#ai-stop").style.display = "none"; $("#ai-pw").disabled = false;
  };
  return "panou afișat";
})();
