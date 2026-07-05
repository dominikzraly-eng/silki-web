# Silki — marketingové podklady

Interní dokument: brand, kanály, analytika. Doplněk k `seo-strategie.md`.

---

## 1. Brand messaging (jednotný jazyk všude)

**Pozicování (1 věta):**
> Silki je rodinná firma prodávající pravé evropské vlasy — ručně vybírané kus po kuse, vážené na gram, s cenou, která přesně odpovídá tomu, co dostanete.

**Hlavní sdělení (v tomto pořadí důležitosti):**
1. 100% neopracované (panenské) evropské vlasy
2. Každý kus ručně vybraný a individuálně zvážený — férová cena podle gramáže
3. Rodinná firma, 10+ let dlouhodobých spoluprací s klientkami i kadeřnicemi
4. Kurzy keratinové metody vedené spoluzakladatelkami

**Tón:** věcný, vřelý, řemeslný. Mluvíme o vlasech jako o materiálu, kterému rozumíme — ne salonní kýč, ne přehnané superlativy.

**Povolená tvrzení:** 100% neopracované · ručně vybírané · každý kus zvážen · pravé evropské vlasy · rodinná firma · 10+ let spoluprací · tisíce culíků.

**Zakázaná tvrzení:** „dohledatelný původ" a podobné nedoložitelné sliby · „nejlevnější/nejlepší v ČR" · „slovanské vlasy" (dokud není potvrzen skutečný původ) · cokoli o zdravotních účincích.

## 2. Analytika a statistiky — postup nastavení

### A) Google Search Console (PRVNÍ krok, zdarma, bez zásahu do webu)
Ukazuje: na jaké dotazy se web zobrazuje ve vyhledávání, pozice, prokliky, stav indexace.
1. search.google.com/search-console → **Add property** → typ **Domain** → `silkihair.cz`
2. Google vydá TXT záznam → přidat v **Netlify DNS** (Netlify → Domains → silkihair.cz → Add record → TXT)
3. Po ověření: **Sitemaps** → odeslat `https://silkihair.cz/sitemap.xml`

### B) Návštěvnost webu — dvě cesty (rozhodnutí majitele)

| | **Cloudflare Web Analytics** (doporučeno na start) | **Google Analytics 4** |
|---|---|---|
| Cena | zdarma | zdarma |
| Cookie lišta nutná? | **NE** (bez cookies, GDPR-friendly) | **ANO** (nutný souhlas návštěvníka) |
| Co umí | návštěvy, stránky, zdroje, země, zařízení | totéž + konverze, publika, propojení s Google Ads |
| Kdy zvolit | chci čísla hned a bez právních starostí | plánuji placené kampaně přes Google Ads |

Postup (obě varianty): založit účet → získat měřicí kód/ID → poslat Claudovi → vloží snippet do všech stránek a nasadí. U GA4 je nutné nejdřív doplnit i cookie lištu (Claude umí připravit).

### C) Netlify Analytics (volitelné, 9 $/měsíc)
Serverová data bez cookies (včetně botů a 404). Zapíná se tlačítkem v Netlify. Není nutné — spíš doplněk.

## 3. Kanály pro Silki (priorita pro CZ trh)

1. **Instagram @silki_hair_cz** — hlavní kanál. Formáty: proměny před/po (nejvyšší dosah), nové kusy skladem („SK-013 · 55 cm · 105 g — v biu"), zákulisí výroby blond (obsah už existuje pro web), reels z kurzů. Vždy odkaz na web.
2. **Google Business Profile** — zdarma, zásadní pro „vlasy praha" dotazy. Sbírat recenze po každém prodeji/kurzu (stačí poslat klientce odkaz).
3. **WhatsApp** — už funguje jako poptávkový kanál; do budoucna zvážit WhatsApp Business (katalog, rychlé odpovědi, štítky poptávek).
4. **Sklik/Google Ads** — až po 1–2 měsících dat ze Search Console (ať víme, na co lidé skutečně hledají). Startovní kampaň: brand (silki vlasy) + kurzy (kurz prodlužování vlasů praha) — nízký rozpočet, vysoká relevance.
5. **Spolupráce s influencerkami** — už existuje (Jitka Boho, Love Island) → dokumentovat na webu v Referencích, tagovat na IG, chtít svolení k použití fotek.

## 4. Co dodat pro plné nasazení (checklist pro majitele)

- [ ] Skutečný telefon do administrace (Kontaktní údaje — teď je placeholder)
- [ ] Ceny služeb do ceníku (teď pomlčky)
- [ ] Vlastní fotky místo zbývajících Unsplash placeholderů (přes administraci → Fotky na webu)
- [ ] Brandovaný OG obrázek 1200×630 px (náhled při sdílení — teď se používá hero fotka; ideálně foto + logo + claim)
- [ ] Google Search Console (postup výše)
- [ ] Volba analytiky (Cloudflare vs. GA4) → poslat ID Claudovi
- [ ] Google Business Profile
- [ ] Napojit formuláře na reálné odesílání (Netlify Forms — Claude implementuje)
- [ ] E-mail info@silkihair.cz (Google Workspace — TXT/MX do Netlify DNS)
