# ArtDeco – magazin online (artă, artizanat, gablonturi)

Site static găzduit pe **Cloudflare Pages**, cu un mic API (Pages Functions) și produsele salvate în **Workers KV**.

## Structură
- `public/` – site-ul (magazinul `index.html` și panoul `admin/`)
- `functions/` – API: produse, poze, import eMAG, login, feed pentru Biano / Google Shopping (`/feed.xml`)

## Setări în Cloudflare (o singură dată)
1. **Workers & Pages → Create → Pages → Connect to Git** → depozitul `site-arta`.
   - Framework preset: *None* · Build command: *(gol)* · Build output directory: `public`
2. **Storage & Databases → D1 SQL Database → Create** o bază de date numită `artdeco`.
3. În proiectul Pages → **Settings → Bindings → Add → D1 database**:
   - Variable name: `DB` · D1 database: `artdeco`.
4. **Settings → Variables and Secrets → Add** (tip *Secret*):
   - Name: `ADMIN_PASSWORD` · Value: parola ta pentru panoul de administrare.
5. **Deployments → Retry deployment** (ca să preia setările). Tabelele se creează automat la prima vizită.

## Import produse din eMAG
În panoul de administrare: **Importă din eMAG** → alegi fișierul `artdeco-import-emag.json` → **Pornește importul**.
Produsele deja importate sunt sărite, deci importul se poate relua oricând.

## Folosire
- Magazin: `https://<domeniu>/`
- Administrare: `https://<domeniu>/admin/`
- Feed produse (Biano, Google Merchant, Compari): `https://<domeniu>/feed.xml`
