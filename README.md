# ArtDeco – magazin online (artă, artizanat, gablonturi)

Site static găzduit pe **Cloudflare Pages**, cu un mic API (Pages Functions) și produsele salvate în **Workers KV**.

## Structură
- `public/` – site-ul (magazinul `index.html` și panoul `admin/`)
- `functions/` – API: produse, poze, login, feed pentru Biano / Google Shopping (`/feed.xml`)

## Setări în Cloudflare (o singură dată)
1. **Workers & Pages → Create → Pages → Connect to Git** → depozitul `site-arta`.
   - Framework preset: *None* · Build command: *(gol)* · Build output directory: `public`
2. **Storage & Databases → KV → Create** un namespace numit `artdeco-shop`.
3. În proiectul Pages → **Settings → Bindings → Add → KV namespace**:
   - Variable name: `SHOP` · KV namespace: `artdeco-shop` (pentru Production și Preview).
4. **Settings → Variables and Secrets → Add** (tip *Secret*):
   - Name: `ADMIN_PASSWORD` · Value: parola ta pentru panoul de administrare.
5. **Deployments → Retry deployment** (ca să preia setările).

## Folosire
- Magazin: `https://<domeniu>/`
- Administrare: `https://<domeniu>/admin/`
- Feed produse (Biano, Google Merchant, Compari): `https://<domeniu>/feed.xml`
