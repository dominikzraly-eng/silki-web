# Silki — Evropské vlasy prémiové kvality

Vícestránkový web (česky) pro značku Silki: prodej jednotlivých culíků evropských
vlasů (B2C), velkoobchodní spolupráce pro kadeřnice (B2B) a kurzy. Čisté statické
HTML/CSS/JS — bez build kroku a závislostí. Otevřete `index.html` v prohlížeči nebo
nahrajte celou složku `site/` na libovolný hosting (Netlify, Vercel, GitHub Pages…).

## Stránky
| Soubor | Stránka |
|--------|---------|
| `index.html` | Domů |
| `sortiment.html` | Katalog culíků (filtry, výpočet ceny, detail + poptávka) |
| `pro-kadernice.html` | Pro kadeřnice (B2B) + registrace partnera |
| `kurzy.html` | Kurzy (3 varianty) + přihláška |
| `o-nas.html` | O Silki |
| `pece.html` | Péče a jak vybrat (rádce / SEO) |
| `reference.html` | Reference, recenze, before/after |
| `kontakt.html` | Kontakt + poptávka (B2C) + FAQ |
| `cenik.html` | Ceník za 1 gram (text) |

Hlavní menu: **Sortiment · Kurzy · Pro kadeřnice · O nás · Kontakt** + tlačítko
**Poptávka**. Ceník, Péče, Reference a FAQ jsou v patičce a v mobilním menu.

## Jak funguje výpočet ceny
Cena se počítá automaticky: **celková cena = gramáž × cena za gram**. Na kartě
produktu (v `sortiment.html`) stačí nastavit dvě hodnoty:

```html
<button class="product" ... data-grams="105" data-rate="135"> … </button>
```

`data-grams` = gramáž kusu, `data-rate` = sazba Kč/g (z `cenik.html`). JavaScript
dopočítá a zobrazí celkovou cenu (`assets/js/main.js`, sekce 9). Ceník za gram
odpovídá tabulce v `cenik.html`.

## Přidání / úprava kusu v sortimentu
Zkopírujte existující `<button class="product">` v `sortiment.html` a upravte
atributy:

| Atribut | Význam | Příklad |
|---------|--------|---------|
| `data-status` | `in` (skladem) / `sold` (prodáno – skryto) | `in` |
| `data-num` | číslo kusu | `SK-013` |
| `data-shade` / `data-shade-label` | odstín (musí být `Tmavé`/`Střední`/`Blond`) | `Blond` |
| `data-length` / `data-length-label` | spodní hranice délky / popisek | `61` / `61–65` |
| `data-grams` | gramáž | `110` |
| `data-rate` | Kč/g | `176` |
| `data-img` | velká fotka do detailu | URL |

Prodané kusy (`data-status="sold"`) jsou skryté; uživatel je zobrazí přepínačem
„Zobrazit i prodané". Filtry (délka / odstín / gramáž) fungují automaticky.

## Tři formuláře
Každý má jiná pole a vlastní úspěšný stav:
- **Poptávka vlasů (B2C)** — `kontakt.html`. Pokud uživatel přijde z detailu kusu
  (`kontakt.html?kus=SK-001`), předvyplní se zpráva.
- **Registrace partnera (B2B)** — `pro-kadernice.html`.
- **Přihláška na kurz** — `kurzy.html`.

Formuláře nyní **simulují** odeslání (validace + úspěšný stav fungují). Pro reálné
odesílání nasměrujte `<form data-booking>` na službu (Formspree apod.) nebo
nahraďte vlastním backendem — viz `main.js`, sekce 8.

## Co je potřeba doplnit před spuštěním
- **Fotky** — všechny obrázky jsou dočasné placeholdery z Unsplshe. Nahraďte je
  vlastními (ideálně do `assets/img/`, formát WebP/AVIF). Atributy `width`/`height`
  ponechte kvůli stabilitě rozvržení.
- **E-mail** `info@silkihair.cz` je **placeholder** — nahraďte skutečnou adresou.
- **Certifikát u kurzů** — uvedeno dle původní struktury; pokud Silki certifikát
  nevydává, upravte v `kurzy.html`.
- **Reference** — jména (Jitka Boho, Love Island) a recenze doplňte/nahraďte
  reálnými ohlasy a fotkami.
- Wire-up formulářů a případně skutečná mapa/adresa.

## Vlastní úpravy vzhledu
Barvy, fonty a odsazení jsou v `assets/css/styles.css` v `:root` (design tokeny):
krémová `#FAF6F1`, espresso `#241D18`, zlatá `#B08D57`, písma Playfair Display +
Inter. Vše ostatní z nich dědí.

## Vlastnosti
- Responzivní (375 / 768 / 1024 / 1440), mobilní menu (drawer)
- Plynulé animace (transform/opacity), respektují `prefers-reduced-motion`
- Filtrovatelný katalog + výpočet ceny + detail v modálním okně
- Přístupné formuláře (validace, focus management, `aria-live`)
- SVG ikony (žádná emoji), AA kontrast, tabulkové číslice u cen

© Silki — šablona. Před spuštěním nahraďte placeholder fotky, e-mail a reference.
