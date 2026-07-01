# Silki — spuštění do provozu (GitHub + Netlify + administrace)

Tenhle dokument je checklist na spuštění webu naostro s administrací, kterou
budete moci upravovat sami. Kroky dělejte v pořadí — na sebe navazují.

Kód je už připravený a lokálně zavazaný do gitu (`git log` ukáže první commit).
Zbývá: založit účty, propojit je a doplnit pár hodnot.

---

## 1. GitHub — nahrání kódu

1. Jděte na [github.com](https://github.com) → založte si účet (pokud ho nemáte).
2. Vpravo nahoře **+** → **New repository**.
   - Repository name: např. `silki-web`
   - Ponechte **Private** nebo **Public** (obojí funguje; Private = jen vy vidíte kód)
   - **Nezaškrtávejte** „Add a README" (kód už máte hotový)
   - **Create repository**
3. GitHub vám ukáže adresu repozitáře, něco jako:
   `https://github.com/VASE-JMENO/silki-web.git`
4. Ve složce `site` (tady, kde je tenhle soubor) spusťte:
   ```
   git remote add origin https://github.com/VASE-JMENO/silki-web.git
   git branch -M main
   git push -u origin main
   ```
   Při prvním pushi se přihlásíte (GitHub dnes vyžaduje buď přihlášení v prohlížeči,
   nebo tzv. Personal Access Token místo hesla — GitHub vás tím sám provede).

✅ Po tomto kroku je kód na GitHubu.

---

## 2. Netlify — hosting webu

1. Jděte na [app.netlify.com](https://app.netlify.com) → **Sign up** → nejjednodušší je
   přihlásit se rovnou přes GitHub účet (propojí se to samo).
2. **Add new site → Import an existing project → Deploy with GitHub**.
3. Vyberte repozitář `silki-web`.
4. Nastavení buildu nechte prázdné/výchozí (žádný build příkaz, publish directory `.`
   — je to už v `netlify.toml`, Netlify si ho najde samo).
5. **Deploy site**. Za pár desítek vteřin dostanete adresu typu
   `https://nahodny-nazev-1234.netlify.app` — to je váš živý web.
6. Doporučuji hned přejmenovat: **Site configuration → General → Change site name**
   → např. `silki-hair` → adresa se změní na `https://silkihair.netlify.app`.

✅ Od teď: každý `git push` na `main` automaticky přenasadí web během ~30 vteřin.

---

## 3. GitHub OAuth App — přihlášení do administrace

Administrace (`/admin`) se přihlašuje přes váš GitHub účet. Aby to fungovalo,
GitHub potřebuje vědět, že tenhle web smí o přihlášení žádat:

1. Na GitHubu: **Settings** (vašeho účtu, ne repozitáře) → vlevo dole
   **Developer settings** → **OAuth Apps** → **New OAuth App**.
2. Vyplňte:
   - **Application name**: Silki Admin
   - **Homepage URL**: `https://silkihair.netlify.app` (vaše skutečná Netlify adresa)
   - **Authorization callback URL**: `https://silkihair.netlify.app/api/auth/callback`
3. **Register application**.
4. Zkopírujte **Client ID**.
5. **Generate a new client secret** → zkopírujte i ten (zobrazí se jen jednou!).

---

## 4. Propojení — environment variables + config.yml

**A) V Netlify:**
**Site configuration → Environment variables → Add a variable** — přidejte dvě:
| Klíč | Hodnota |
|---|---|
| `OAUTH_CLIENT_ID` | Client ID z kroku 3 |
| `OAUTH_CLIENT_SECRET` | Client secret z kroku 3 |

Po přidání proměnných: **Deploys → Trigger deploy → Deploy site** (aby se projevily).

**B) V kódu — soubor `admin/config.yml`:**
Otevřete `site/admin/config.yml` a nahraďte dva placeholdery skutečnými hodnotami:
```yaml
backend:
  name: github
  repo: dominikzraly-eng/silki-web
  branch: main
  base_url: https://silkihair.netlify.app   # ← vaše Netlify adresa
  auth_endpoint: api/auth
```
Uložte, potom:
```
git add admin/config.yml
git commit -m "Nastavení administrace"
git push
```
Netlify automaticky přenasadí web s novým nastavením.

---

## 5. Vlastní doména na WEDOS

1. Na [wedos.cz](https://www.wedos.cz) zaregistrujte doménu (např. `silkihair.cz`).
2. V administraci WEDOSu u domény najděte **DNS záznamy / Nameservery**.
3. **Nejjednodušší varianta** — přenechte DNS Netlify:
   - V doméně nastavte nameservery na Netlify (Netlify vám je zobrazí
     v **Domain settings → Add custom domain → Verify → Set up Netlify DNS**).
   - Netlify pak sám nastaví vše potřebné (i automatické HTTPS zdarma).
4. **Alternativa** — ponechat DNS na WEDOSu, jen přidat záznamy, které Netlify
   zobrazí (obvykle jeden `A` záznam na hlavní doménu + `CNAME` na `www`).
5. Propsání domény může trvat od pár minut do 24 hodin.
6. Po propojení: v Netlify **Domain settings** ověřte, že je aktivní HTTPS
   (zámek u adresy) — Netlify ho zařídí automaticky (Let's Encrypt).

Až budete mít doménu aktivní, aktualizujte i:
- `admin/config.yml` → `base_url` na novou doménu
- GitHub OAuth App → Homepage URL a Callback URL na novou doménu

---

## 5b. E-mailová schránka na doméně přes Gmail (Google Workspace)

Chcete `info@silkihair.cz` fungující přímo jako Gmail (ne přeposílání s SMTP triky,
které bývá nespolehlivé) — proto Google Workspace:

1. Založte účet na [workspace.google.com](https://workspace.google.com) se svou
   doménou (`silkihair.cz`). Placená služba (řádově $6–7 / měsíc za schránku,
   plán Business Starter — aktuální cenu v Kč si ověřte přímo na webu Googlu).
2. Google vás vyzve k **ověření vlastnictví domény** — přidáte jeden **TXT záznam**
   ve správě DNS na WEDOSu (nebo v Netlify DNS, pokud jste tam delegovali
   nameservery — viz krok 5).
3. Google vám zobrazí **MX záznamy** — ty přidáte na stejném místě.
4. Hotovo. Pošta na `info@silkihair.cz` teď chodí do Gmailu (web i mobilní appka),
   web na Netlify běží dál beze změny.

**Proč to nekoliduje s webem:** MX záznamy (pošta) a A/CNAME záznamy (web) jsou
oddělené typy DNS záznamů ve stejné doméně — nastavení jednoho neruší druhé.
Klidně tedy web na Netlify + pošta přes Google Workspace současně.

---

## 6. První přihlášení do administrace

1. Otevřete `https://VASE-DOMENA/admin` (nebo zatím `https://silkihair.netlify.app/admin`).
2. **Login with GitHub** → potvrdíte přístup.
3. Uvidíte dvě sekce:
   - **Sortiment (culíky)** — přidávání/úprava jednotlivých kusů (odstín, délka,
     gramáž, cena za gram, fotka, stav skladem/prodáno, zda se má zobrazit na
     hlavní stránce). Cena se na webu dopočítá sama.
   - **Kontaktní údaje** — telefon, e-mail, Instagram, lokalita — projeví se
     automaticky všude na webu.
4. Po uložení změny (**Publish** / **Save**) Decap CMS vytvoří commit na GitHubu
   → Netlify web automaticky přenasadí → změna je do ~1 minuty živá.

---

## Co ještě zvážit později
- **Formuláře** (poptávka, registrace partnera, přihláška na kurz) teď jen simulují
  odeslání. Na Netlify je lze snadno napojit na **Netlify Forms** (žádný vlastní
  server) — dá se doplnit v dalším kroku.
- **Fáze 2 administrace**: pokud budete chtít editovat i běžný text na stránkách
  (ne jen produkty a kontakty), řeší se to přestavbou webu na statický generátor
  (šablony) — větší úprava, klidně to připravím, až budete chtít.
