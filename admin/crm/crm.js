/* Silki CRM: prodeje, sklad, nákupy, zákazníci, finance a provize.
 * Data drží serverová funkce /api/crm (Netlify Blobs). Tady je jen UI a výpočty. */
(function () {
  "use strict";

  // ================================================================
  // 1. Konstanty a pomocné funkce
  // ================================================================
  const PEOPLE = { marketa: "Markéta", tereza: "Terka", dominik: "Dominik" };
  const SELLERS = { ...PEOPLE, firma: "Firma" };
  const TYPY = { zakaznice: "Koncová zákaznice", kadernik: "Kadeřnice", salon: "Salon" };
  const ODSTINY = { tmave: "Tmavé", stredni: "Střední", blond: "Blond" };
  const SKLAD_STAV = { skladem: "Skladem", rezervovano: "Rezervováno", prodano: "Prodáno" };
  const PRODEJ_STAV = { rezervace: "Rezervace", zaplaceno: "Zaplaceno", storno: "Storno" };
  const PLATBY = { prevod: "Převod", hotove: "Hotově", karta: "Karta" };
  const ZAK_STAV = { lead: "Lead", aktivni: "Aktivní", neaktivni: "Neaktivní" };
  const KAT_VYDAJ = ["Nákup vlasů", "Reklama", "Doprava a poštovné", "Materiál a pomůcky", "Kurzy", "Poplatky", "Ostatní"];
  const KAT_PRIJEM = ["Kurzy", "Ostatní"];

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtKc = n => new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " Kč";
  const fmtKcG = n => new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + " Kč/g";
  const fmtDate = d => d ? new Date(d + "T12:00:00").toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }) : "";
  const today = () => new Date().toISOString().slice(0, 10);
  const num = v => { const n = parseFloat(String(v ?? "").replace(",", ".").replace(/\s/g, "")); return Number.isFinite(n) ? n : 0; };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* soukromé okno */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* nic */ } }
  };

  const ICONS = {
    prehled: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    prodeje: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>',
    sklad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
    poptavky: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/></svg>',
    zpravy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8 10h8M8 14h5"/></svg>',
    zakaznici: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/></svg>',
    nakupy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.8h8.2a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>',
    finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>',
    nastaveni: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    vice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>'
  };

  // ================================================================
  // 2. Stav a komunikace se serverem
  // ================================================================
  const state = {
    token: decapToken(),
    user: null,
    db: null,
    view: ls.get("crm_view") || "prehled",
    period: "mesic",
    filters: { prodeje: "vse", sklad: "skladem", zakaznici: "vse", q: "" }
  };

  // Přihlášení se přebírá z administrace (Decap CMS ho ukládá na stejné doméně).
  function decapToken() {
    try { return JSON.parse(localStorage.getItem("decap-cms-user") || "null")?.token || null; } catch { return null; }
  }

  async function api(path, opts = {}) {
    const res = await fetch("/api/crm/" + path, {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json", ...(state.token ? { Authorization: "Bearer " + state.token } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    let data = {};
    try { data = await res.json(); } catch { /* prázdná odpověď */ }
    if (res.status === 401) { state.db = null; renderLogin(state.token ? "Přihlášení z administrace vypršelo nebo nemá přístup k webu." : ""); throw new Error(data.error || "Nejste přihlášeni."); }
    if (!res.ok) throw new Error(data.error || "Chyba serveru (" + res.status + ")");
    return data;
  }

  function normDb(db) {
    for (const c of ["sklad", "prodeje", "nakupy", "cesty", "zakaznici", "finance", "zpravy", "poptavky"]) if (!Array.isArray(db[c])) db[c] = [];
    return db;
  }

  const fotoCache = new Map();
  async function zmensitFoto(file, max = 1600) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = url; });
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      return await new Promise(ok => c.toBlob(ok, "image/jpeg", 0.82));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function nahrajFoto(file) {
    let blob;
    try { blob = await zmensitFoto(file); } catch { throw new Error("Tenhle soubor neumím otevřít jako fotku."); }
    const res = await fetch("/api/crm/foto", { method: "POST", headers: { Authorization: "Bearer " + state.token, "Content-Type": "image/jpeg" }, body: blob });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Fotku se nepodařilo nahrát.");
    fotoCache.set(data.id, URL.createObjectURL(blob));
    return data.id;
  }
  async function fotoSrc(id) {
    if (fotoCache.has(id)) return fotoCache.get(id);
    const res = await fetch("/api/crm/foto/" + encodeURIComponent(id), { headers: { Authorization: "Bearer " + state.token } });
    if (!res.ok) throw new Error("foto");
    const u = URL.createObjectURL(await res.blob());
    fotoCache.set(id, u);
    return u;
  }
  function nactiFotky(root) {
    if (!root) return;
    $$("img[data-foto]:not([src])", root).forEach(async img => {
      try { img.src = await fotoSrc(img.dataset.foto); } catch { img.alt = "Fotku nejde načíst"; }
    });
  }
  const thumb = (id, cls = "") => `<img class="thumb ${cls}" data-foto="${esc(id)}" alt="Fotka" loading="lazy">`;

  function setSync(cls) { const s = $(".sync"); if (s) s.className = "sync " + (cls || ""); }

  async function save(ops, msg) {
    setSync("busy");
    try {
      const r = await api("ops", { method: "POST", body: { ops } });
      state.db = normDb(r.db);
      setSync("");
      toast(msg || "Uloženo");
      render();
      return true;
    } catch (e) {
      setSync("err");
      toast(e.message, true);
      return false;
    }
  }

  async function load() {
    setSync("busy");
    try {
      const r = await api("data");
      state.db = normDb(r.db);
      state.user = r.user;
      const me = $(".me"); if (me) me.textContent = PEOPLE[r.user] || r.user;
      setSync("");
      render();
    } catch (e) {
      setSync("err");
      if (state.db) toast(e.message, true);
    }
  }

  let toastTimer;
  function toast(text, err) {
    const t = $("#toast");
    t.textContent = text;
    t.className = "toast show" + (err ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = "toast" + (err ? " err" : ""); }, err ? 5000 : 2200);
  }

  // ================================================================
  // 3. Výpočty: ceník, slevy, provize
  // ================================================================
  const S = () => state.db.nastaveni;

  function cenaZaGram(odstin, delka) {
    const row = S().cenik.find(r => r.delka === delka);
    return row ? num(row[odstin]) : 0;
  }
  const kusCena = k => Math.round(num(k.gramaz) * num(k.cena_g));

  // Sleva: koncová zákaznice nemá automatickou slevu. Kadeřnice a salon mají
  // svou partnerskou slevu nebo slevu za množství, platí vyšší, strop podle nastavení.
  function autoSleva(typ, pocet, zakaznik) {
    if (typ === "zakaznice") return 0;
    const s = S().slevy;
    const zakladni = num(zakaznik?.sleva);
    const mnozstvi = pocet >= 5 ? num(s.ks5) : pocet >= 2 ? num(s.ks2) : 0;
    return Math.min(Math.max(zakladni, mnozstvi), num(s.max));
  }

  // Provize se počítají z původní (ceníkové) ceny, ne z ceny po slevě.
  function rozdel(p) {
    const pr = S().provize;
    const puvodni = (p.polozky || []).reduce((a, k) => a + kusCena(k), 0);
    const sleva = num(p.sleva);
    const celkem = Math.round(puvodni * (1 - sleva / 100));
    const pctProdejce = p.prodejce === "firma" ? 0 : (p.typ === "zakaznice" ? num(pr.zakaznice) : num(pr.kadernik));
    const pctDominik = num(pr.dominik);
    const prodejce = Math.round(puvodni * pctProdejce / 100);
    const dominik = Math.round(puvodni * pctDominik / 100);
    const firma = celkem - prodejce - dominik;
    const naklad = (p.polozky || []).reduce((a, k) => a + num(k.nakup_cena), 0);
    const chybiNakup = (p.polozky || []).some(k => !num(k.nakup_cena));
    return { puvodni, sleva, celkem, pctProdejce, prodejce, pctDominik, dominik, firma, naklad, zisk: firma - naklad, chybiNakup };
  }

  function periodRange(key) {
    const d = new Date();
    const y = d.getFullYear(), m = d.getMonth();
    const iso = x => x.toISOString().slice(0, 10);
    const local = (yy, mm, dd) => new Date(Date.UTC(yy, mm, dd));
    if (key === "mesic") return [iso(local(y, m, 1)), iso(local(y, m + 1, 0))];
    if (key === "minuly") return [iso(local(y, m - 1, 1)), iso(local(y, m, 0))];
    if (key === "rok") return [y + "-01-01", y + "-12-31"];
    return ["0000-01-01", "9999-12-31"];
  }
  const inRange = (d, [a, b]) => d >= a && d <= b;

  // Vše, co ukazuje přehled, se počítá z uložených prodejů (snapshot rozdělení).
  function stats(range) {
    const db = state.db;
    const placene = db.prodeje.filter(p => p.stav === "zaplaceno");
    const vObdobi = placene.filter(p => inRange(p.datum, range));
    const sum = (arr, f) => arr.reduce((a, x) => a + num(f(x)), 0);

    const trzby = sum(vObdobi, p => p.split?.celkem);
    const firmaPrijem = sum(vObdobi, p => p.split?.firma);
    const naklad = sum(vObdobi, p => p.split?.naklad);
    const fin = db.finance.filter(f => inRange(f.datum, range));
    const prijmy = sum(fin.filter(f => f.typ === "prijem"), f => f.castka);
    const vydaje = sum(fin.filter(f => f.typ === "vydaj"), f => f.castka);
    const kusy = sum(vObdobi, p => (p.polozky || []).length);

    const provize = {};
    for (const k of Object.keys(PEOPLE)) provize[k] = { obdobi: 0, celkem: 0, vyplaceno: 0 };
    for (const p of placene) {
      const s = p.split || {};
      const add = (who, amt) => {
        if (!provize[who]) return;
        provize[who].celkem += num(amt);
        if (inRange(p.datum, range)) provize[who].obdobi += num(amt);
      };
      add(p.prodejce, s.prodejce);
      add("dominik", s.dominik);
    }
    for (const f of db.finance.filter(f => f.typ === "vyplata" || f.typ === "zaloha")) {
      if (provize[f.komu]) provize[f.komu].vyplaceno += num(f.castka);
    }

    // Peníze firmy od začátku: co přišlo minus co odešlo (nákupy, výdaje, vyplacené provize).
    const kasa = sum(placene, p => p.split?.celkem)
      + sum(db.finance.filter(f => f.typ === "prijem"), f => f.castka)
      - sum(db.nakupy, n => n.celkem)
      - sum(db.cesty, c => (c.naklady || []).reduce((a, x) => a + num(x.castka), 0))
      - sum(db.finance.filter(f => f.typ === "vydaj" || f.typ === "vyplata" || f.typ === "zaloha"), f => f.castka);

    return { trzby, firmaPrijem, naklad, prijmy, vydaje, kusy, zisk: firmaPrijem - naklad + prijmy - vydaje, provize, kasa, pocet: vObdobi.length };
  }

  // ================================================================
  // 4. Přihlášení
  // ================================================================
  function renderLogin(err) {
    $("#app").innerHTML = `
      <main class="login">
        <div class="login-card">
          <div class="brand">Silki <small>interní CRM</small></div>
          <p style="margin-bottom:16px">CRM používá stejné přihlášení jako administrace webu. Přihlaste se tam přes GitHub a vraťte se sem tlačítkem CRM.</p>
          ${err ? `<p class="note">${esc(err)}</p>` : ""}
          <a class="btn primary block" href="/admin/" style="text-decoration:none">Přihlásit v administraci</a>
          <button class="btn block" style="margin-top:8px" id="retry">Už jsem přihlášený, zkusit znovu</button>
        </div>
      </main>`;
    $("#retry").addEventListener("click", () => {
      state.token = decapToken();
      if (state.token) { renderShell(); load(); } else renderLogin("V tomto prohlížeči zatím nejste v administraci přihlášeni.");
    });
  }

  // ================================================================
  // 5. Kostra aplikace a navigace
  // ================================================================
  const NAV = [
    ["prehled", "Přehled", ""],
    ["prodeje", "Prodeje", ""],
    ["sklad", "Sklad", ""],
    ["zpravy", "Zprávy", ""],
    ["poptavky", "Poptávky", "desk-only"],
    ["zakaznici", "Zákazníci", "desk-only"],
    ["nakupy", "Nákupy", "desk-only"],
    ["finance", "Finance", "desk-only"],
    ["nastaveni", "Nastavení", "desk-only"],
    ["vice", "Více", "mob-only"]
  ];

  function renderShell() {
    $("#app").innerHTML = `
      <div class="shell">
        <header class="topbar">
          <div class="brand">Silki</div>
          <span class="sync busy" title="Stav ukládání"></span>
          <div class="spacer"></div>
          <span class="me"></span>
          <a class="btn small" href="/admin/" style="text-decoration:none">Administrace</a>
        </header>
        <nav class="nav" aria-label="Sekce">
          ${NAV.map(([k, label, cls]) => `<button data-view="${k}" class="${cls}">${ICONS[k]}<span>${label}</span></button>`).join("")}
        </nav>
        <main class="main" id="view"><p class="empty">Načítám…</p></main>
        <button class="fab" id="fab" aria-label="Přidat">+ Přidat</button>
      </div>`;
    $("#fab").addEventListener("click", rychlaNabidka);
    $(".nav").addEventListener("click", e => {
      const b = e.target.closest("[data-view]");
      if (b) go(b.dataset.view);
    });
  }

  function rychlaNabidka() {
    openSheet("Přidat", `<div class="quick">
      <button type="button" data-q="kus">${ICONS.sklad}<span><strong>Culík do skladu</strong><small>Fotka, várka, gramáž</small></span></button>
      <button type="button" data-q="prodej">${ICONS.prodeje}<span><strong>Prodej</strong><small>Vybrat culíky a zákazníka</small></span></button>
      <button type="button" data-q="zprava">${ICONS.zpravy}<span><strong>Zpráva</strong><small>Napsat volně, zapíše se do týdne</small></span></button>
    </div>`, null);
    $(".quick").addEventListener("click", e => {
      const b = e.target.closest("[data-q]");
      if (!b) return;
      closeSheet();
      if (b.dataset.q === "kus") kusForm();
      if (b.dataset.q === "prodej") saleForm();
      if (b.dataset.q === "zprava") { go("zpravy"); setTimeout(() => $("#zprava-form textarea")?.focus(), 50); }
    });
  }

  function go(view) {
    state.view = view;
    state.filters.q = "";
    ls.set("crm_view", view);
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    if (!state.db) return;
    const moreViews = ["nakupy", "finance", "nastaveni", "vice", "zakaznici", "poptavky"];
    $$(".nav [data-view]").forEach(b => {
      const active = b.dataset.view === state.view || (b.dataset.view === "vice" && moreViews.includes(state.view) && window.innerWidth < 900);
      b.toggleAttribute("aria-current", false);
      if (active) b.setAttribute("aria-current", "page");
    });
    const views = { prehled: viewPrehled, prodeje: viewProdeje, sklad: viewSklad, zakaznici: viewZakaznici, zpravy: viewZpravy, poptavky: viewPoptavky, nakupy: viewNakupy, finance: viewFinance, nastaveni: viewNastaveni, vice: viewVice };
    (views[state.view] || viewPrehled)();
    nactiFotky($("#view"));
  }

  function chips(name, options, current) {
    return `<div class="chips" data-chips="${name}">${Object.entries(options).map(([k, v]) => `<button type="button" data-val="${k}" aria-pressed="${k === current}">${esc(v)}</button>`).join("")}</div>`;
  }
  function bindChips(name, fn) {
    const el = $(`[data-chips="${name}"]`);
    if (el) el.addEventListener("click", e => { const b = e.target.closest("[data-val]"); if (b) fn(b.dataset.val); });
  }

  // ================================================================
  // 6. Přehled
  // ================================================================
  function viewPrehled() {
    const range = periodRange(state.period);
    const st = stats(range);
    const db = state.db;
    const skladem = db.sklad.filter(k => k.stav === "skladem");
    const rez = db.prodeje.filter(p => p.stav === "rezervace").sort((a, b) => b.datum.localeCompare(a.datum));
    const posledni = db.prodeje.filter(p => p.stav !== "storno").sort((a, b) => (b.datum + b.createdAt).localeCompare(a.datum + a.createdAt)).slice(0, 5);
    const bezNakupu = db.sklad.filter(k => !num(k.nakup_cena)).length;
    const poOdstinu = Object.keys(ODSTINY).map(o => [o, skladem.filter(k => k.odstin === o)]);

    $("#view").innerHTML = `
      <div class="view-head"><h1>Přehled</h1><button class="btn primary desk-btn" data-act="new-sale">+ Nový prodej</button></div>
      ${chips("period", { mesic: "Tento měsíc", minuly: "Minulý měsíc", rok: "Letos", vse: "Od začátku" }, state.period)}
      ${nove() ? `<button class="note" data-go="poptavky" style="display:block;width:100%;text-align:left;border:0;cursor:pointer;background:var(--ok-bg);color:var(--ok)"><strong>${nove()} ${plural(nove(), "nová poptávka", "nové poptávky", "nových poptávek")} z webu</strong>, otevřít ›</button>` : ""}
      ${db.cesty.filter(c => !db.nakupy.some(n => n.cesta_id === c.id)).map(c => `<p class="note">Cesta ${esc(c.nazev)} nemá připojený nákup, její náklady se zatím nepočítají do zisku. <button class="link" data-go="nakupy">Připojit</button></p>`).join("")}
      ${bezNakupu ? `<p class="note">U ${bezNakupu} ks ve skladu chybí nákupní cena, takže zisk vychází vyšší, než je. <button class="link" data-go="sklad">Doplnit</button></p>` : ""}
      <div class="grid kpis">
        ${kpi("Tržby", fmtKc(st.trzby), st.pocet + " " + plural(st.pocet, "prodej", "prodeje", "prodejů"))}
        ${kpi("Zisk firmy", fmtKc(st.zisk), "po provizích a nákladech")}
        ${kpi("Prodáno", st.kusy + " ks", "culíků")}
        ${kpi("Na skladě", skladem.length + " ks", fmtKc(skladem.reduce((a, k) => a + kusCena(k), 0)) + " v ceníku")}
      </div>
      <div class="grid cols2">
        <section class="card">
          <h2>Provize</h2>
          <table class="t">
            <thead><tr><th>Kdo</th><th class="r">V období</th><th class="r">Vyplaceno</th><th class="r">K výplatě</th></tr></thead>
            <tbody>${Object.entries(PEOPLE).map(([k, v]) => {
              const p = st.provize[k];
              const dluh = p.celkem - p.vyplaceno;
              return `<tr><td>${v}</td><td class="r num">${fmtKc(p.obdobi)}</td><td class="r num muted">${fmtKc(p.vyplaceno)}</td><td class="r num"><strong>${fmtKc(Math.max(0, dluh))}</strong>${dluh < 0 ? `<div class="small" style="color:var(--warn)">záloha ${fmtKc(-dluh)}</div>` : ""}</td></tr>`;
            }).join("")}</tbody>
          </table>
          ${Object.entries(PEOPLE).filter(([k]) => st.provize[k].celkem - st.provize[k].vyplaceno < 0).map(([k, v]) => `<p class="note" style="margin:10px 0 0">${v} má zálohu ${fmtKc(st.provize[k].vyplaceno - st.provize[k].celkem)}, strhne se z dalších provizí.</p>`).join("")}
          <p class="small muted" style="margin-top:10px">K výplatě se počítá od začátku. Výplatu nebo zálohu zapíšete ve Financích.</p>
        </section>
        <section class="card">
          <h2>Firma v období</h2>
          <div class="split">
            <div><span>Tržby z culíků</span><span class="num">${fmtKc(st.trzby)}</span></div>
            <div><span>Po odečtení provizí</span><span class="num">${fmtKc(st.firmaPrijem)}</span></div>
            <div><span>Nákupní cena prodaných kusů</span><span class="num">−${fmtKc(st.naklad)}</span></div>
            <div><span>Ostatní příjmy</span><span class="num">${fmtKc(st.prijmy)}</span></div>
            <div><span>Ostatní výdaje</span><span class="num">−${fmtKc(st.vydaje)}</span></div>
            <div class="total"><span>Zisk firmy</span><span class="num">${fmtKc(st.zisk)}</span></div>
          </div>
          <p class="small muted" style="margin-top:10px">Peníze firmy od začátku: <strong class="num">${fmtKc(st.kasa)}</strong></p>
        </section>
      </div>
      <section class="card chart"><h2>Posledních 12 měsíců</h2>${chart12()}</section>
      <div class="grid cols2">
        <section class="card">
          <h2>Čeká na zaplacení</h2>
          ${rez.length ? `<div class="list">${rez.map(saleRow).join("")}</div>` : `<p class="muted small">Žádné rezervace.</p>`}
        </section>
        <section class="card">
          <h2>Sklad podle odstínu</h2>
          <div class="list">${poOdstinu.map(([o, arr]) => `
            <div class="row"><span class="swatch sw-${o}"></span><div class="row-main"><div class="row-title">${ODSTINY[o]}</div></div>
            <div class="row-end num">${arr.length} ks · ${arr.reduce((a, k) => a + num(k.gramaz), 0)} g</div></div>`).join("")}
          </div>
        </section>
      </div>
      <section class="card">
        <h2>Poslední prodeje</h2>
        ${posledni.length ? `<div class="list">${posledni.map(saleRow).join("")}</div>` : `<p class="muted small">Zatím žádný prodej.</p>`}
      </section>
`;

    bindChips("period", v => { state.period = v; render(); });
    bindCommon();
  }

  const kpi = (label, value, sub) => `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;
  const plural = (n, a, b, c) => n === 1 ? a : n >= 2 && n <= 4 ? b : c;

  function chart12() {
    const d = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push({ key: x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0"), label: x.toLocaleDateString("cs-CZ", { month: "short" }).replace(".", "") });
    }
    for (const m of months) {
      const ps = state.db.prodeje.filter(p => p.stav === "zaplaceno" && p.datum.startsWith(m.key));
      m.trzby = ps.reduce((a, p) => a + num(p.split?.celkem), 0);
      m.zisk = ps.reduce((a, p) => a + num(p.split?.zisk), 0);
    }
    const max = Math.max(1, ...months.map(m => m.trzby));
    if (!months.some(m => m.trzby)) return `<p class="muted small">Graf se ukáže po prvním zaplaceném prodeji.</p>`;
    const W = 600, H = 170, pad = 20, bw = (W - 10) / 12;
    const bars = months.map((m, i) => {
      const h = (m.trzby / max) * (H - pad - 14);
      const hz = Math.max(0, (m.zisk / max) * (H - pad - 14));
      const x = 5 + i * bw;
      return `<g><title>${m.label}: tržby ${fmtKc(m.trzby)}, zisk z culíků ${fmtKc(m.zisk)}</title>
        <rect class="bar" x="${x + 4}" y="${H - pad - h}" width="${bw - 8}" height="${h}" rx="3"/>
        <rect class="bar-profit" x="${x + 4 + (bw - 8) * .25}" y="${H - pad - hz}" width="${(bw - 8) * .5}" height="${hz}" rx="2"/>
        <text x="${x + bw / 2}" y="${H - 5}" text-anchor="middle">${m.label}</text></g>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tržby a zisk po měsících">${bars}</svg>
      <div class="legend"><span><i style="background:var(--cream-2)"></i>Tržby</span><span><i style="background:var(--gold)"></i>Zisk z culíků</span><span>max ${fmtKc(max)}</span></div>`;
  }

  function saleRow(p) {
    const st = { rezervace: "warn", zaplaceno: "ok", storno: "bad" }[p.stav];
    const ks = (p.polozky || []).length;
    return `<button class="row" data-edit-sale="${p.id}">
      <div class="row-main"><div class="row-title">${esc(p.zakaznik_jmeno || "Bez jména")}</div>
      <div class="row-sub">${fmtDate(p.datum)} · ${ks} ks · ${esc(SELLERS[p.prodejce] || "")}</div></div>
      <div class="row-end"><div class="num"><strong>${fmtKc(p.split?.celkem)}</strong></div><span class="badge ${st}">${PRODEJ_STAV[p.stav]}</span></div>
    </button>`;
  }

  function bindCommon() {
    $$("[data-act=new-sale]").forEach(b => b.addEventListener("click", () => saleForm()));
    $$("[data-edit-sale]").forEach(b => b.addEventListener("click", () => saleForm(state.db.prodeje.find(p => p.id === b.dataset.editSale))));
    $$("[data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
  }

  // ================================================================
  // 7. Prodeje
  // ================================================================
  function viewProdeje() {
    const f = state.filters.prodeje;
    const q = state.filters.q.toLowerCase();
    const list = state.db.prodeje
      .filter(p => f === "vse" || p.stav === f)
      .filter(p => !q || (p.zakaznik_jmeno || "").toLowerCase().includes(q) || (p.polozky || []).some(k => (k.cislo || "").toLowerCase().includes(q)))
      .sort((a, b) => (b.datum + b.createdAt).localeCompare(a.datum + a.createdAt));
    $("#view").innerHTML = `
      <div class="view-head"><h1>Prodeje</h1><button class="btn primary" data-act="new-sale">+ Nový prodej</button></div>
      ${chips("pf", { vse: "Vše", ...PRODEJ_STAV }, f)}
      <input class="search" type="search" placeholder="Hledat zákazníka nebo číslo kusu" value="${esc(state.filters.q)}" id="q">
      ${list.length ? `<div class="list boxed">${list.map(saleRow).join("")}</div>` : `<p class="empty">Žádné prodeje.</p>`}`;
    bindChips("pf", v => { state.filters.prodeje = v; render(); });
    bindSearch();
    bindCommon();
  }

  function bindSearch() {
    const q = $("#q");
    if (!q) return;
    q.addEventListener("input", () => {
      state.filters.q = q.value;
      const pos = q.selectionStart;
      render();
      const n = $("#q"); n.focus(); n.setSelectionRange(pos, pos);
    });
  }

  function saleForm(existing) {
    const db = state.db;
    const p = existing ? structuredClone(existing) : {
      id: uid(), datum: today(), zakaznik_id: "", zakaznik_jmeno: "", typ: "zakaznice",
      prodejce: Object.keys(PEOPLE).includes(state.user) ? state.user : "firma",
      polozky: [], sleva: 0, sleva_rucne: false, platba: "prevod", stav: "zaplaceno", poznamka: ""
    };
    const puvodniSkladIds = (existing?.polozky || []).map(k => k.sklad_id).filter(Boolean);
    const dostupne = () => db.sklad.filter(k => k.stav === "skladem" || puvodniSkladIds.includes(k.id));
    const zakaznici = [...db.zakaznici].sort((a, b) => (a.jmeno || "").localeCompare(b.jmeno || "", "cs"));

    const body = `
      <div class="f">
        <div class="f2">
          <label class="field"><span>Datum</span><input type="date" name="datum" value="${esc(p.datum)}" required></label>
          <label class="field"><span>Stav</span><select name="stav">${opts(PRODEJ_STAV, p.stav)}</select></label>
        </div>
        <label class="field"><span>Zákazník</span>
          <select name="zakaznik_id"><option value="">Jednorázová zákaznice (jen jméno)</option>${zakaznici.map(z => `<option value="${z.id}" ${z.id === p.zakaznik_id ? "selected" : ""}>${esc(z.jmeno)}${z.typ !== "zakaznice" ? " · " + TYPY[z.typ] : ""}</option>`).join("")}</select>
        </label>
        <label class="field" data-jmeno><span>Jméno zákaznice</span><input name="zakaznik_jmeno" value="${esc(p.zakaznik_jmeno)}" placeholder="např. Jana N."></label>
        <fieldset><legend>Komu se prodává</legend><div class="seg">${segs("typ", TYPY, p.typ)}</div></fieldset>
        <label class="field"><span>Prodal(a), dostane provizi</span><select name="prodejce">${opts(SELLERS, p.prodejce)}</select>
          <span class="hint" data-prov-hint></span></label>
        <div class="field"><span>Culíky ze skladu</span>
          <input class="search" style="margin:0 0 6px" type="search" placeholder="Filtrovat: číslo, odstín, délka" data-pick-q>
          <div class="pick" data-pick>${dostupne().length ? "" : `<p class="empty small">Sklad je prázdný. Přidejte kusy ve Skladu nebo zadejte kus ručně níž.</p>`}</div>
        </div>
        <div class="field"><span>Kus mimo sklad</span><div class="items" data-manual></div>
          <button type="button" class="btn small" data-add-manual style="justify-self:start;margin-top:4px">+ Přidat kus ručně</button></div>
        <div class="f2">
          <label class="field"><span>Sleva %</span><input name="sleva" inputmode="decimal" value="${p.sleva}"><span class="hint" data-sleva-hint></span></label>
          <label class="field"><span>Platba</span><select name="platba">${opts(PLATBY, p.platba)}</select></label>
        </div>
        <div class="split" data-split></div>
        <label class="field"><span>Poznámka</span><textarea name="poznamka">${esc(p.poznamka)}</textarea></label>
      </div>`;

    openSheet(existing ? "Prodej" : "Nový prodej", body, async root => {
      read();
      if (!p.polozky.length) { toast("Vyberte aspoň jeden culík.", true); return false; }
      if (!p.zakaznik_id && !p.zakaznik_jmeno.trim()) { toast("Doplňte jméno zákaznice.", true); return false; }
      p.split = rozdel(p);
      p.split.pctSleva = p.sleva;
      const ops = [{ type: "upsert", col: "prodeje", rec: p }];
      // Sklad: vybrané kusy rezervovat / prodat, odebrané a stornované vrátit
      const nowIds = p.stav === "storno" ? [] : p.polozky.map(k => k.sklad_id).filter(Boolean);
      for (const id of new Set([...puvodniSkladIds, ...p.polozky.map(k => k.sklad_id).filter(Boolean)])) {
        const k = db.sklad.find(x => x.id === id);
        if (!k) continue;
        const stav = nowIds.includes(id) ? (p.stav === "zaplaceno" ? "prodano" : "rezervovano") : "skladem";
        if (k.stav !== stav || k.prodej_id !== (stav === "skladem" ? "" : p.id)) {
          ops.push({ type: "upsert", col: "sklad", rec: { ...k, stav, prodej_id: stav === "skladem" ? "" : p.id } });
        }
      }
      return save(ops, existing ? "Prodej upraven" : "Prodej uložen");
    }, existing ? async () => {
      if (!confirm("Smazat tento prodej? Kusy se vrátí na sklad.")) return false;
      const ops = [{ type: "delete", col: "prodeje", id: p.id }];
      for (const id of puvodniSkladIds) {
        const k = db.sklad.find(x => x.id === id);
        if (k) ops.push({ type: "upsert", col: "sklad", rec: { ...k, stav: "skladem", prodej_id: "" } });
      }
      return save(ops, "Prodej smazán");
    } : null);

    const root = $(".sheet");
    const manual = p.polozky.filter(k => !k.sklad_id);
    let selected = new Set(p.polozky.filter(k => k.sklad_id).map(k => k.sklad_id));

    function drawPick() {
      const q = ($("[data-pick-q]", root).value || "").toLowerCase();
      const list = dostupne().filter(k => !q || [k.cislo, ODSTINY[k.odstin], k.delka].join(" ").toLowerCase().includes(q));
      const box = $("[data-pick]", root);
      if (!dostupne().length) return;
      box.innerHTML = list.map(k => `<label><input type="checkbox" value="${k.id}" ${selected.has(k.id) ? "checked" : ""}>
        <span class="swatch sw-${esc(k.odstin)}"></span>
        <span class="row-main"><span class="row-title" style="display:block">${esc(k.cislo || "bez čísla")} · ${ODSTINY[k.odstin] || ""} ${esc(k.delka)} cm</span>
        <span class="row-sub" style="display:block">${num(k.gramaz)} g × ${num(k.cena_g)} Kč/g</span></span>
        <span class="num">${fmtKc(kusCena(k))}</span></label>`).join("") || `<p class="empty small">Nic neodpovídá.</p>`;
    }
    function drawManual() {
      $("[data-manual]", root).innerHTML = manual.map((k, i) => manualRow(k, i)).join("");
    }
    function read() {
      const fd = new FormData($("#sheet-form"));
      p.datum = fd.get("datum");
      p.stav = fd.get("stav");
      p.zakaznik_id = fd.get("zakaznik_id");
      const z = db.zakaznici.find(x => x.id === p.zakaznik_id);
      p.zakaznik_jmeno = z ? z.jmeno : (fd.get("zakaznik_jmeno") || "");
      p.typ = fd.get("typ");
      p.prodejce = fd.get("prodejce");
      p.platba = fd.get("platba");
      p.poznamka = fd.get("poznamka");
      $$("[data-manual] .item-row", root).forEach((row, i) => {
        const g = n => $(`[name=${n}]`, row).value;
        manual[i] = { ...manual[i], cislo: g("m_cislo"), odstin: g("m_odstin"), delka: g("m_delka"), gramaz: num(g("m_gramaz")), cena_g: num(g("m_cena_g")), nakup_cena: num(g("m_nakup")) };
      });
      const fromSklad = dostupne().filter(k => selected.has(k.id)).map(k => ({
        sklad_id: k.id, cislo: k.cislo, odstin: k.odstin, delka: k.delka, gramaz: num(k.gramaz), cena_g: num(k.cena_g), nakup_cena: num(k.nakup_cena)
      }));
      p.polozky = [...fromSklad, ...manual];
      const auto = autoSleva(p.typ, p.polozky.length, z);
      const typed = num(fd.get("sleva"));
      if (!p.sleva_rucne) {
        p.sleva = auto;
        $("[name=sleva]", root).value = auto;
      } else {
        p.sleva = typed;
      }
      $("[data-sleva-hint]", root).innerHTML = p.sleva_rucne && typed !== auto
        ? `Ručně. Automaticky by bylo ${auto} %. <button type="button" class="link" data-auto-sleva>Vrátit</button>`
        : (p.typ === "zakaznice" ? "Koncová zákaznice: bez automatické slevy" : `Automaticky: vyšší z partnerské slevy a slevy za množství, max ${num(S().slevy.max)} %`);
      if (p.sleva > num(S().slevy.max)) $("[data-sleva-hint]", root).innerHTML += `<br><strong style="color:var(--bad)">Nad stropem ${num(S().slevy.max)} %.</strong>`;
      $("[data-jmeno]", root).classList.toggle("hidden", !!z);
      const pr = S().provize;
      $("[data-prov-hint]", root).textContent = p.prodejce === "firma"
        ? "Bez provize prodejce, vše jde firmě (Dominik má 5 % vždy)."
        : `${p.typ === "zakaznice" ? num(pr.zakaznice) : num(pr.kadernik)} % z původní ceny`;
      const s = rozdel(p);
      $("[data-split]", root).innerHTML = `
        <div><span>Původní cena (${p.polozky.length} ks)</span><span class="num">${fmtKc(s.puvodni)}</span></div>
        <div><span>Sleva ${s.sleva} %</span><span class="num">−${fmtKc(s.puvodni - s.celkem)}</span></div>
        <div class="total"><span>Zaplatí</span><span class="num">${fmtKc(s.celkem)}</span></div>
        <div><span>Provize ${esc(SELLERS[p.prodejce])} ${s.pctProdejce} %</span><span class="num">${fmtKc(s.prodejce)}</span></div>
        <div><span>Dominik ${s.pctDominik} %</span><span class="num">${fmtKc(s.dominik)}</span></div>
        <div class="firm"><span>Firmě</span><span class="num">${fmtKc(s.firma)}</span></div>
        <div><span>Nákupní cena${s.chybiNakup && p.polozky.length ? " (u některého kusu chybí)" : ""}</span><span class="num">−${fmtKc(s.naklad)}</span></div>
        <div class="firm"><span>Zisk firmy</span><span class="num" style="color:${s.zisk < 0 ? "var(--bad)" : "inherit"}">${fmtKc(s.zisk)}</span></div>`;
    }

    // Zákazník určí typ a výchozího prodejce (u salonu a kadeřnice dostává provizi správce).
    $("[name=zakaznik_id]", root).addEventListener("change", e => {
      const z = db.zakaznici.find(x => x.id === e.target.value);
      if (z) {
        $(`[name=typ][value=${z.typ}]`, root).checked = true;
        if (z.typ !== "zakaznice" && z.spravce) $("[name=prodejce]", root).value = z.spravce;
      }
      read();
    });
    $("[name=sleva]", root).addEventListener("input", () => { p.sleva_rucne = true; read(); });
    root.addEventListener("click", e => {
      if (e.target.closest("[data-auto-sleva]")) { p.sleva_rucne = false; read(); }
      if (e.target.closest("[data-add-manual]")) { read(); manual.push({ cislo: "", odstin: "tmave", delka: S().cenik[0]?.delka || "", gramaz: 0, cena_g: 0, nakup_cena: 0 }); drawManual(); read(); }
      const rm = e.target.closest("[data-rm]");
      if (rm) { read(); manual.splice(+rm.dataset.rm, 1); drawManual(); read(); }
    });
    root.addEventListener("change", e => {
      if (e.target.matches("[data-pick] input")) {
        e.target.checked ? selected.add(e.target.value) : selected.delete(e.target.value);
      }
      // ruční kus: odstín nebo délka doplní Kč/g z ceníku
      if (e.target.matches("[name=m_odstin], [name=m_delka]")) {
        const row = e.target.closest(".item-row");
        $("[name=m_cena_g]", row).value = cenaZaGram($("[name=m_odstin]", row).value, $("[name=m_delka]", row).value) || "";
      }
      read();
    });
    root.addEventListener("input", e => { if (e.target.closest("[data-manual]")) read(); });
    $("[data-pick-q]", root).addEventListener("input", drawPick);
    drawPick();
    drawManual();
    read();
  }

  function manualRow(k, i) {
    return `<div class="item-row">
      <label class="field"><span>Odstín</span><select name="m_odstin">${opts(ODSTINY, k.odstin)}</select></label>
      <label class="field"><span>Délka</span><select name="m_delka">${S().cenik.map(r => `<option ${r.delka === k.delka ? "selected" : ""}>${esc(r.delka)}</option>`).join("")}</select></label>
      <label class="field"><span>Gramáž g</span><input name="m_gramaz" inputmode="decimal" value="${k.gramaz || ""}"></label>
      <label class="field"><span>Kč/g</span><input name="m_cena_g" inputmode="decimal" value="${k.cena_g || cenaZaGram(k.odstin, k.delka) || ""}"></label>
      <label class="field"><span>Číslo</span><input name="m_cislo" value="${esc(k.cislo)}"></label>
      <label class="field"><span>Nákup Kč</span><input name="m_nakup" inputmode="decimal" value="${k.nakup_cena || ""}"></label>
      <button type="button" class="close rm" data-rm="${i}" aria-label="Odebrat kus">×</button>
    </div>`;
  }

  // ================================================================
  // 8. Sklad
  // ================================================================
  function viewSklad() {
    const f = state.filters.sklad;
    const q = state.filters.q.toLowerCase();
    const list = state.db.sklad
      .filter(k => f === "vse" || k.stav === f)
      .filter(k => !q || [k.cislo, ODSTINY[k.odstin], k.delka, k.poznamka].join(" ").toLowerCase().includes(q))
      .sort((a, b) => (a.cislo || "").localeCompare(b.cislo || "", "cs", { numeric: true }));
    const skladem = state.db.sklad.filter(k => k.stav === "skladem");
    $("#view").innerHTML = `
      <div class="view-head"><h1>Sklad</h1>
        <button class="btn" data-import>Načíst z webu</button>
        <button class="btn primary" data-new>+ Kus</button></div>
      <div class="grid kpis">
        ${kpi("Skladem", skladem.length + " ks", skladem.reduce((a, k) => a + num(k.gramaz), 0) + " g")}
        ${kpi("Hodnota v ceníku", fmtKc(skladem.reduce((a, k) => a + kusCena(k), 0)), "původní ceny")}
        ${kpi("Nákupní hodnota", fmtKc(skladem.reduce((a, k) => a + num(k.nakup_cena), 0)), "co jsme zaplatili")}
        ${kpi("Ve várkách", state.db.nakupy.filter(isVaha).reduce((a, n) => a + nakupG(n) - odebranoG(n), 0) + " g", "ještě nerozděleno na culíky")}
      </div>
      <div style="margin-top:14px">${chips("sf", { skladem: "Skladem", rezervovano: "Rezervováno", prodano: "Prodáno", vse: "Vše" }, f)}</div>
      <input class="search" type="search" placeholder="Hledat číslo, odstín, délku" value="${esc(state.filters.q)}" id="q">
      ${list.length ? `<div class="list boxed">${list.map(k => `
        <button class="row" data-edit="${k.id}">
          ${k.foto ? thumb(k.foto) : `<span class="swatch sw-${esc(k.odstin)}"></span>`}
          <div class="row-main"><div class="row-title">${esc(k.cislo || "bez čísla")} · ${ODSTINY[k.odstin] || ""} ${esc(k.delka)} cm</div>
          <div class="row-sub">${num(k.gramaz)} g × ${num(k.cena_g)} Kč/g · nákup ${num(k.nakup_cena) ? fmtKc(k.nakup_cena) : "chybí"}</div></div>
          <div class="row-end"><div class="num"><strong>${fmtKc(kusCena(k))}</strong></div>
          <span class="badge ${k.stav === "skladem" ? "ok" : k.stav === "rezervovano" ? "warn" : ""}">${SKLAD_STAV[k.stav]}</span></div>
        </button>`).join("")}</div>` : `<p class="empty">Nic tu není. Přidejte kus, zapište nákup, nebo načtěte kusy z webu.</p>`}`;
    bindChips("sf", v => { state.filters.sklad = v; render(); });
    bindSearch();
    $("[data-new]").addEventListener("click", () => kusForm());
    $("[data-import]").addEventListener("click", importZWebu);
    $$("[data-edit]").forEach(b => b.addEventListener("click", () => kusForm(state.db.sklad.find(k => k.id === b.dataset.edit))));
  }

  function nextCislo() {
    const nums = state.db.sklad.map(k => parseInt(String(k.cislo || "").replace(/\D/g, ""), 10)).filter(Number.isFinite);
    return "SK-" + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
  }

  // Culík do skladu: na telefonu jen fotka, várka, odstín, délka a gramáž. Zbytek se předvyplní.
  function kusForm(existing, varkaId) {
    let posledni = {};
    try { posledni = JSON.parse(ls.get("crm_last_kus") || "{}"); } catch { /* nic */ }
    const varky = state.db.nakupy.filter(isVaha).sort((a, b) => b.datum.localeCompare(a.datum));
    const zbyva = (n, kromeId) => nakupG(n) - odebranoG(n, kromeId);
    const sVolnem = varky.filter(n => zbyva(n) > 0);
    const vychoziVarka = varkaId
      || (sVolnem.some(n => n.id === posledni.varka) ? posledni.varka : "")
      || sVolnem[0]?.id || "";
    const delky = S().cenik.map(r => r.delka);
    const odstin0 = posledni.odstin || "tmave";
    const delka0 = delky.includes(posledni.delka) ? posledni.delka : delky[0] || "";
    const k = existing ? { ...existing } : {
      id: uid(), cislo: nextCislo(), odstin: odstin0, delka: delka0, gramaz: "", cena_g: cenaZaGram(odstin0, delka0),
      nakup_cena: "", stav: "skladem", poznamka: "", nakup_id: vychoziVarka, foto: ""
    };
    const puvodniVarka = varky.find(n => n.id === k.nakup_id) ? k.nakup_id : "";
    let dalsi = false;

    const body = `<div class="f">
      <div class="foto-pick">
        <div data-foto-prev>${k.foto ? thumb(k.foto, "big") : `<div class="ph">Bez fotky</div>`}</div>
        <div class="acts">
          <label class="btn">${k.foto ? "Změnit fotku" : "Vyfotit nebo nahrát"}<input type="file" accept="image/*" hidden data-foto-input></label>
          ${k.foto ? `<button type="button" class="link small" data-foto-del>Odebrat fotku</button>` : ""}
        </div>
      </div>
      ${varky.length ? `<label class="field"><span>Z várky</span><select name="varka"><option value="">Ne, kus zvlášť</option>${varky.map(n => `<option value="${n.id}" ${n.id === puvodniVarka ? "selected" : ""}>${esc(n.dodavatel || "Várka")} ${fmtDate(n.datum)}, zbývá ${zbyva(n, k.id)} g</option>`).join("")}</select></label>` : ""}
      <fieldset><legend>Odstín</legend><div class="seg">${segs("odstin", ODSTINY, k.odstin)}</div></fieldset>
      <div class="f2">
        <label class="field"><span>Délka cm</span><select name="delka">${delky.map(d => `<option ${d === k.delka ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></label>
        <label class="field"><span>Gramáž g</span><input name="gramaz" inputmode="decimal" value="${esc(k.gramaz)}" placeholder="např. 100"></label>
      </div>
      <div class="cena-big"><span>Cena podle ceníku</span><strong data-cena>0 Kč</strong></div>
      <p class="small muted" data-nakup-info></p>
      <details class="more" ${existing ? "" : ""}>
        <summary>Další údaje (číslo, stav, cena za gram, poznámka)</summary>
        <div class="f">
          <div class="f2">
            <label class="field"><span>Číslo kusu</span><input name="cislo" value="${esc(k.cislo)}"></label>
            <label class="field"><span>Stav</span><select name="stav" ${k.prodej_id ? "disabled" : ""}>${opts(SKLAD_STAV, k.stav)}</select>
              ${k.prodej_id ? `<span class="hint">Řídí se prodejem</span>` : ""}</label>
          </div>
          <div class="f2">
            <label class="field"><span>Prodejní Kč/g</span><input name="cena_g" inputmode="decimal" value="${esc(k.cena_g)}"><span class="hint">Z ceníku</span></label>
            <label class="field"><span>Nákupní cena Kč</span><input name="nakup_cena" inputmode="decimal" value="${esc(k.nakup_cena)}"><span class="hint" data-nakup-hint></span></label>
          </div>
          <label class="field"><span>Poznámka</span><textarea name="poznamka">${esc(k.poznamka)}</textarea></label>
        </div>
      </details>
      ${existing ? "" : `<button type="button" class="btn block" data-save-next>Uložit a přidat další</button>`}
    </div>`;

    const polozka = rec => ({ sklad_id: rec.id, cislo: rec.cislo, odstin: rec.odstin, delka: rec.delka, gramaz: rec.gramaz });
    openSheet(existing ? "Culík " + (k.cislo || "") : "Nový culík", body, async () => {
      const chciDalsi = dalsi;
      dalsi = false;
      const fd = new FormData($("#sheet-form"));
      const varka = varky.find(n => n.id === fd.get("varka"));
      const rec = { ...k, cislo: (fd.get("cislo") || "").trim() || nextCislo(), odstin: fd.get("odstin"), delka: fd.get("delka"), gramaz: num(fd.get("gramaz")), cena_g: num(fd.get("cena_g")), nakup_cena: num(fd.get("nakup_cena")), poznamka: fd.get("poznamka") || "" };
      if (!k.prodej_id) rec.stav = fd.get("stav") || "skladem";
      if (!rec.gramaz) { toast("Doplňte gramáž.", true); return false; }
      if (state.db.sklad.some(x => x.id !== rec.id && x.cislo && x.cislo === rec.cislo)) { toast("Číslo " + rec.cislo + " už ve skladu je.", true); return false; }
      const ops = [];
      if (varka) {
        const volno = zbyva(varka, rec.id);
        if (rec.gramaz > volno) { toast(`Ve várce zbývá jen ${volno} g.`, true); return false; }
        rec.nakup_id = varka.id;
        rec.nakup_cena = Math.round(vahaCenaG(varka) * rec.gramaz);
        const pol = (varka.polozky || []).filter(x => x.sklad_id !== rec.id);
        ops.push({ type: "upsert", col: "nakupy", rec: { ...varka, polozky: [...pol, polozka(rec)] } });
      } else if (puvodniVarka) {
        rec.nakup_id = "";
      }
      if (puvodniVarka && puvodniVarka !== varka?.id) {
        const stara = varky.find(n => n.id === puvodniVarka);
        ops.push({ type: "upsert", col: "nakupy", rec: { ...stara, polozky: (stara.polozky || []).filter(x => x.sklad_id !== rec.id) } });
      }
      ops.unshift({ type: "upsert", col: "sklad", rec });
      ls.set("crm_last_kus", JSON.stringify({ odstin: rec.odstin, delka: rec.delka, varka: varka?.id || "" }));
      if (!await save(ops, `Culík ${rec.cislo} uložen`)) return false;
      if (varka || puvodniVarka) await prepocitatNaklady();
      if (chciDalsi) setTimeout(() => kusForm(), 0);
      return true;
    }, existing && !k.prodej_id ? async () => {
      if (!confirm("Smazat culík " + k.cislo + "?")) return false;
      const ops = [{ type: "delete", col: "sklad", id: k.id }];
      const stara = varky.find(n => n.id === puvodniVarka);
      if (stara) ops.push({ type: "upsert", col: "nakupy", rec: { ...stara, polozky: (stara.polozky || []).filter(x => x.sklad_id !== k.id) } });
      return save(ops, "Culík smazán");
    } : null);

    const root = $(".sheet");
    const kresliFoto = () => {
      $("[data-foto-prev]", root).innerHTML = k.foto ? thumb(k.foto, "big") : `<div class="ph">Bez fotky</div>`;
      $(".foto-pick .acts", root).innerHTML = `<label class="btn">${k.foto ? "Změnit fotku" : "Vyfotit nebo nahrát"}<input type="file" accept="image/*" hidden data-foto-input></label>
        ${k.foto ? `<button type="button" class="link small" data-foto-del>Odebrat fotku</button>` : ""}`;
      nactiFotky(root);
    };
    const upd = () => {
      const fd = new FormData($("#sheet-form"));
      const varka = varky.find(n => n.id === fd.get("varka"));
      const g = num(fd.get("gramaz"));
      const inp = $("[name=nakup_cena]", root);
      inp.readOnly = !!varka;
      if (varka) {
        inp.value = g ? Math.round(vahaCenaG(varka) * g) : "";
        $("[data-nakup-hint]", root).textContent = "Z várky";
      } else {
        $("[data-nakup-hint]", root).textContent = "Celkem za kus";
      }
      const cena = Math.round(g * num(fd.get("cena_g")));
      $("[data-cena]", root).textContent = fmtKc(cena);
      const nak = num(inp.value);
      $("[data-nakup-info]", root).textContent = varka
        ? `Nákup ${g ? fmtKc(nak) : "se spočítá"} (${fmtKcG(vahaCenaG(varka))} z várky)${g && cena ? `, marže před provizemi ${fmtKc(cena - nak)}` : ""}. Ve várce zbývá ${zbyva(varka, k.id) - g} g.`
        : (nak && cena ? `Nákup ${fmtKc(nak)}, marže před provizemi ${fmtKc(cena - nak)}.` : "");
    };
    root.addEventListener("change", async e => {
      if (e.target.matches("[data-foto-input]")) {
        const f = e.target.files[0];
        if (!f) return;
        const submit = $("button[type=submit]", root);
        submit.disabled = true;
        $("[data-foto-prev]", root).innerHTML = `<div class="ph">Nahrávám…</div>`;
        try { k.foto = await nahrajFoto(f); } catch (ex) { toast(ex.message, true); }
        submit.disabled = false;
        kresliFoto();
        return;
      }
      if (e.target.matches("[name=odstin], [name=delka]")) {
        $("[name=cena_g]", root).value = cenaZaGram($("[name=odstin]:checked", root).value, $("[name=delka]", root).value) || "";
      }
      upd();
    });
    root.addEventListener("click", e => {
      if (e.target.closest("[data-foto-del]")) { k.foto = ""; kresliFoto(); }
      if (e.target.closest("[data-save-next]")) { dalsi = true; $("#sheet-form").requestSubmit(); }
    });
    root.addEventListener("input", upd);
    upd();
  }

  // Jednorázově převezme kusy z veřejného sortimentu (data/products.json). Nákupní ceny tam nejsou.
  async function importZWebu() {
    try {
      const r = await fetch("/data/products.json", { cache: "no-store" });
      const data = await r.json();
      const odstinMap = { "Tmavé": "tmave", "Střední": "stredni", "Blond": "blond" };
      const existing = new Set(state.db.sklad.map(k => k.cislo));
      const nove = (data.produkty || []).filter(p => p.cislo && !existing.has(p.cislo));
      if (!nove.length) { toast("Všechny kusy z webu už ve skladu jsou."); return; }
      if (!confirm(`Načíst ${nove.length} kusů z webu do skladu? Nákupní cenu pak u každého doplňte.`)) return;
      const ops = nove.map(p => ({ type: "upsert", col: "sklad", rec: {
        id: uid(), cislo: p.cislo, odstin: odstinMap[p.odstin] || "tmave", delka: p.delka_label || "",
        gramaz: num(p.gramaz), cena_g: num(p.cena_g), nakup_cena: 0, stav: p.stav === "sold" ? "prodano" : "skladem", poznamka: "Načteno z webu"
      } }));
      save(ops, nove.length + " kusů načteno");
    } catch {
      toast("Sortiment z webu se nepodařilo načíst.", true);
    }
  }

  // ================================================================
  // 9. Nákupy a cesty
  // ================================================================
  const DRUHY = { letenky: "Letenky", ubytovani: "Ubytování", doprava: "Doprava na místě", jidlo: "Jídlo", ostatni: "Ostatní" };
  const cestaCelkem = c => (c.naklady || []).reduce((a, x) => a + num(x.castka), 0);
  const isVaha = n => n?.typ === "vaha";
  // U nákupu na váhu se náklady dělí podle celé várky, ne jen podle už odebraných culíků
  const nakupG = n => isVaha(n) ? num(n.vaha_g) : (n.polozky || []).reduce((a, k) => a + num(k.gramaz), 0);
  const odebranoG = (n, krome) => (n.polozky || []).filter(k => k.sklad_id !== krome).reduce((a, k) => a + num(k.gramaz), 0);
  function cestaPodil(n) {
    const c = n.cesta_id && state.db.cesty.find(x => x.id === n.cesta_id);
    if (!c) return 0;
    const G = state.db.nakupy.filter(x => x.cesta_id === n.cesta_id).reduce((a, x) => a + nakupG(x), 0);
    return G ? cestaCelkem(c) * nakupG(n) / G : 0;
  }
  const vahaCenaG = n => (num(n.cena_zbozi) + num(n.doprava) + cestaPodil(n)) / (num(n.vaha_g) || 1);

  // Nákupní cena kusu = cena kusu + jeho podíl na dopravě nákupu + podíl na nákladech cesty.
  // Podíly se dělí podle gramáže; u cesty přes všechny kusy ze všech jejích nákupů.
  function ocekavaneNaklady(db) {
    const gCesty = {};
    for (const n of db.nakupy) if (n.cesta_id) gCesty[n.cesta_id] = (gCesty[n.cesta_id] || 0) + nakupG(n);
    const sumCesty = Object.fromEntries(db.cesty.map(c => [c.id, cestaCelkem(c)]));
    const out = {};
    for (const n of db.nakupy) {
      const g = nakupG(n) || 1;
      for (const k of n.polozky || []) {
        if (!k.sklad_id) continue;
        const zbozi = isVaha(n) ? num(n.cena_zbozi) * num(k.gramaz) / g : num(k.cena);
        let cena = zbozi + num(n.doprava) * num(k.gramaz) / g;
        if (n.cesta_id && sumCesty[n.cesta_id] && gCesty[n.cesta_id]) cena += sumCesty[n.cesta_id] * num(k.gramaz) / gCesty[n.cesta_id];
        out[k.sklad_id] = Math.round(cena);
      }
    }
    return out;
  }

  // Po změně nákupu nebo cesty dorovná nákupní ceny ve skladu i v uložených prodejích.
  async function prepocitatNaklady() {
    const db = state.db;
    const exp = ocekavaneNaklady(db);
    const ops = [];
    for (const k of db.sklad) {
      if (k.id in exp && num(k.nakup_cena) !== exp[k.id]) ops.push({ type: "upsert", col: "sklad", rec: { ...k, nakup_cena: exp[k.id] } });
    }
    for (const p of db.prodeje) {
      if (!(p.polozky || []).some(k => k.sklad_id in exp && num(k.nakup_cena) !== exp[k.sklad_id])) continue;
      const polozky = p.polozky.map(k => k.sklad_id in exp ? { ...k, nakup_cena: exp[k.sklad_id] } : k);
      const naklad = polozky.reduce((a, k) => a + num(k.nakup_cena), 0);
      ops.push({ type: "upsert", col: "prodeje", rec: { ...p, polozky, split: { ...p.split, naklad, zisk: num(p.split?.firma) - naklad } } });
    }
    for (let i = 0; i < ops.length; i += 50) await save(ops.slice(i, i + 50), "Nákupní ceny kusů přepočítány");
    return true;
  }

  function viewNakupy() {
    const tab = state.filters.nakupyTab || "nakupy";
    const rok = String(new Date().getFullYear());
    const letos = state.db.nakupy.filter(n => n.datum.startsWith(rok));
    const cestyLetos = state.db.cesty.filter(c => (c.datum_od || "").startsWith(rok));
    $("#view").innerHTML = `
      <div class="view-head"><h1>Nákupy</h1>
        ${tab === "nakupy" ? `<button class="btn primary" data-new>+ Nákup</button>` : `<button class="btn primary" data-new-cesta>+ Cesta</button>`}</div>
      ${chips("nt", { nakupy: "Nákupy vlasů", cesty: "Cesty" }, tab)}
      <div class="grid kpis">
        ${kpi("Letos za vlasy", fmtKc(letos.reduce((a, n) => a + num(n.celkem), 0)), letos.length + " " + plural(letos.length, "nákup", "nákupy", "nákupů"))}
        ${kpi("Letos za cesty", fmtKc(cestyLetos.reduce((a, c) => a + cestaCelkem(c), 0)), cestyLetos.length + " " + plural(cestyLetos.length, "cesta", "cesty", "cest"))}
        ${kpi("Kusů letos", letos.reduce((a, n) => a + (n.polozky || []).length, 0) + " ks", letos.reduce((a, n) => a + nakupG(n), 0) + " g")}
      </div>
      ${tab === "nakupy" ? listNakupy() : listCesty()}`;
    bindChips("nt", v => { state.filters.nakupyTab = v; render(); });
    $("[data-new]")?.addEventListener("click", () => nakupForm());
    $("[data-new-cesta]")?.addEventListener("click", () => cestaForm());
    $$("[data-edit]").forEach(b => b.addEventListener("click", () => nakupForm(state.db.nakupy.find(n => n.id === b.dataset.edit))));
    $$("[data-edit-cesta]").forEach(b => b.addEventListener("click", () => cestaForm(state.db.cesty.find(c => c.id === b.dataset.editCesta))));
  }

  function listNakupy() {
    const list = [...state.db.nakupy].sort((a, b) => b.datum.localeCompare(a.datum));
    return `<p class="note info" style="margin-top:14px">Nákup zapíše kusy rovnou do skladu. Letenky a ubytování zapisujte do <strong>Cesty</strong> a nákupy k ní připojte, náklady se rozdělí mezi všechny kusy.</p>
      ${list.length ? `<div class="list boxed">${list.map(n => {
        const c = state.db.cesty.find(x => x.id === n.cesta_id);
        return `<button class="row" data-edit="${n.id}">
          <div class="row-main"><div class="row-title">${esc(n.dodavatel || "Dodavatel neuveden")}</div>
          <div class="row-sub">${fmtDate(n.datum)} · ${isVaha(n) ? `na váhu ${nakupG(n)} g, zbývá ${nakupG(n) - odebranoG(n)} g` : `${(n.polozky || []).length} ks · ${nakupG(n)} g`}${c ? " · " + esc(c.nazev) : ""}</div></div>
          <div class="row-end num"><strong>${fmtKc(n.celkem)}</strong></div>
        </button>`;
      }).join("")}</div>` : `<p class="empty">Zatím žádný nákup.</p>`}`;
  }

  function listCesty() {
    const list = [...state.db.cesty].sort((a, b) => (b.datum_od || "").localeCompare(a.datum_od || ""));
    return `<p class="note info" style="margin-top:14px">Cesta za nákupem: letenky, ubytování, doprava na místě. Připojte k ní nákupy a náklady se rozpočítají do ceny kusů podle gramáže.</p>
      ${list.length ? `<div class="list boxed">${list.map(c => {
        const nak = state.db.nakupy.filter(n => n.cesta_id === c.id);
        return `<button class="row" data-edit-cesta="${c.id}">
          <div class="row-main"><div class="row-title">${esc(c.nazev || "Cesta")}</div>
          <div class="row-sub">${fmtDate(c.datum_od)}${c.datum_do && c.datum_do !== c.datum_od ? " až " + fmtDate(c.datum_do) : ""} · ${nak.length ? nak.length + " " + plural(nak.length, "nákup", "nákupy", "nákupů") : "bez nákupu"}</div></div>
          <div class="row-end"><div class="num"><strong>${fmtKc(cestaCelkem(c))}</strong></div>
          ${nak.length ? "" : `<span class="badge warn">Připojit nákup</span>`}</div>
        </button>`;
      }).join("")}</div>` : `<p class="empty">Zatím žádná cesta.</p>`}`;
  }

  const cestaOptions = cur => `<option value="">Bez cesty</option>` + [...state.db.cesty]
    .sort((a, b) => (b.datum_od || "").localeCompare(a.datum_od || ""))
    .map(c => `<option value="${c.id}" ${c.id === cur ? "selected" : ""}>${esc(c.nazev || "Cesta")} (${fmtDate(c.datum_od)})</option>`).join("");

  function nakupForm(existing) {
    const n = existing ? structuredClone(existing) : { id: uid(), typ: "vaha", datum: today(), dodavatel: "", doprava: 0, cesta_id: "", vaha_g: "", cena_zbozi: "", polozky: [], poznamka: "" };
    const lock = !!existing;
    const vahaKusy = isVaha(n) ? (n.polozky || []) : [];
    const body = `<div class="f">
      <div class="f2">
        <label class="field"><span>Datum</span><input type="date" name="datum" value="${esc(n.datum)}" required></label>
        <label class="field"><span>Dodavatel</span><input name="dodavatel" value="${esc(n.dodavatel)}"></label>
      </div>
      <fieldset ${lock ? "disabled" : ""}><legend>Jak jste nakoupili</legend><div class="seg">${segs("typ", { vaha: "Na váhu (várka)", kusy: "Po kusech" }, isVaha(n) ? "vaha" : "kusy")}</div></fieldset>
      <div class="f2" data-vaha>
        <label class="field"><span>Celková gramáž g</span><input name="vaha_g" inputmode="decimal" value="${esc(n.vaha_g)}"></label>
        <label class="field"><span>Cena za vlasy Kč</span><input name="cena_zbozi" inputmode="decimal" value="${esc(n.cena_zbozi)}"><span class="hint">Celkem v Kč, i s poplatky dodavateli</span></label>
      </div>
      <label class="field"><span>Cesta</span><select name="cesta_id">${cestaOptions(n.cesta_id)}</select>
        <span class="hint">Letenky a ubytování z cesty se rozdělí mezi všechny její nákupy. Novou cestu založíte v Nákupy → Cesty.</span></label>
      <label class="field"><span>Doprava a clo k tomuto nákupu Kč</span><input name="doprava" inputmode="decimal" value="${n.doprava || ""}">
        <span class="hint">Poštovné, clo, poplatky jen za tenhle nákup. Rozpočítá se do ceny kusů podle gramáže.</span></label>
      ${lock && isVaha(n) ? `<div class="field"><span>Culíky z várky (${vahaKusy.length})</span>
        ${vahaKusy.length ? `<div class="list boxed">${vahaKusy.map(k => `<div class="row"><span class="swatch sw-${esc(k.odstin)}"></span><div class="row-main"><div class="row-title">${esc(k.cislo)} · ${ODSTINY[k.odstin] || ""} ${esc(k.delka)} cm</div></div><div class="row-end num">${num(k.gramaz)} g</div></div>`).join("")}</div>` : `<p class="small muted">Zatím žádný culík.</p>`}
        <button type="button" class="btn small" data-kus-z-varky style="justify-self:start;margin-top:6px">+ Culík z této várky</button></div>` : ""}
      <div class="field" data-kusy><span>Kusy</span>
        ${lock ? `<p class="small muted">Kusy jsou už ve skladu, upravují se tam.</p>` : ""}
        <div class="items" data-items></div>
        ${lock ? "" : `<button type="button" class="btn small" data-add style="justify-self:start;margin-top:4px">+ Další kus</button>`}
      </div>
      <div class="split" data-sum></div>
      <label class="field"><span>Poznámka</span><textarea name="poznamka">${esc(n.poznamka)}</textarea></label>
    </div>`;
    openSheet(existing ? "Nákup" : "Nový nákup", body, async () => {
      read();
      const fd = new FormData($("#sheet-form"));
      n.datum = fd.get("datum"); n.dodavatel = fd.get("dodavatel"); n.poznamka = fd.get("poznamka");
      n.cesta_id = fd.get("cesta_id"); n.doprava = num(fd.get("doprava"));
      if (!lock) n.typ = fd.get("typ");
      const ops = [];
      if (isVaha(n)) {
        n.vaha_g = num(fd.get("vaha_g")); n.cena_zbozi = num(fd.get("cena_zbozi"));
        if (!n.vaha_g || !n.cena_zbozi) { toast("Doplňte gramáž a cenu várky.", true); return false; }
        if (n.vaha_g < odebranoG(n)) { toast(`Z várky už je odebráno ${odebranoG(n)} g.`, true); return false; }
        n.polozky = n.polozky || [];
      } else if (!lock) {
        n.polozky = n.polozky.filter(k => num(k.gramaz) > 0);
        if (!n.polozky.length) { toast("Zadejte aspoň jeden kus s gramáží.", true); return false; }
        let cisloBase = parseInt(nextCislo().replace(/\D/g, ""), 10);
        n.polozky = n.polozky.map(k => {
          const cislo = "SK-" + String(cisloBase++).padStart(3, "0");
          const skladId = uid();
          ops.push({ type: "upsert", col: "sklad", rec: { id: skladId, cislo, odstin: k.odstin, delka: k.delka, gramaz: num(k.gramaz), cena_g: cenaZaGram(k.odstin, k.delka), nakup_cena: num(k.cena), stav: "skladem", nakup_id: n.id, poznamka: "" } });
          return { ...k, cislo, sklad_id: skladId };
        });
      }
      n.celkem = Math.round((isVaha(n) ? n.cena_zbozi : n.polozky.reduce((a, k) => a + num(k.cena), 0)) + n.doprava);
      ops.unshift({ type: "upsert", col: "nakupy", rec: n });
      if (!await save(ops, lock ? "Nákup upraven" : isVaha(n) ? "Várka uložena" : `Nákup uložen, ${n.polozky.length} ks ve skladu`)) return false;
      return prepocitatNaklady();
    }, existing ? async () => {
      if (!confirm("Smazat záznam o nákupu? Kusy ve skladu zůstanou.")) return false;
      if (!await save([{ type: "delete", col: "nakupy", id: n.id }], "Nákup smazán")) return false;
      return prepocitatNaklady();
    } : null);

    const root = $(".sheet");
    function draw() {
      $("[data-items]", root).innerHTML = n.polozky.map((k, i) => `<div class="item-row">
        <label class="field"><span>Odstín</span><select name="odstin" ${lock ? "disabled" : ""}>${opts(ODSTINY, k.odstin)}</select></label>
        <label class="field"><span>Délka</span><select name="delka" ${lock ? "disabled" : ""}>${S().cenik.map(r => `<option ${r.delka === k.delka ? "selected" : ""}>${esc(r.delka)}</option>`).join("")}</select></label>
        <label class="field"><span>Gramáž g</span><input name="gramaz" inputmode="decimal" value="${esc(k.gramaz)}" ${lock ? "disabled" : ""}></label>
        <label class="field"><span>Cena Kč</span><input name="cena" inputmode="decimal" value="${esc(k.cena)}" ${lock ? "disabled" : ""}></label>
        ${lock ? `<span class="small muted" style="grid-column:1/-1">${esc(k.cislo || "")}</span>` : `<button type="button" class="close rm" data-rm="${i}" aria-label="Odebrat kus">×</button>`}
      </div>`).join("");
    }
    function read() {
      if (!lock) {
        $$("[data-items] .item-row", root).forEach((row, i) => {
          n.polozky[i] = { odstin: $("[name=odstin]", row).value, delka: $("[name=delka]", row).value, gramaz: $("[name=gramaz]", row).value, cena: $("[name=cena]", row).value };
        });
      }
      const vaha = lock ? isVaha(n) : $("[name=typ]:checked", root).value === "vaha";
      $("[data-vaha]", root).classList.toggle("hidden", !vaha);
      $("[data-kusy]", root).classList.toggle("hidden", vaha);
      const doprava = num($("[name=doprava]", root).value);
      const zbozi = vaha ? num($("[name=cena_zbozi]", root).value) : n.polozky.reduce((a, k) => a + num(k.cena), 0);
      const g = vaha ? num($("[name=vaha_g]", root).value) : n.polozky.reduce((a, k) => a + num(k.gramaz), 0);
      const cenik = vaha ? 0 : n.polozky.reduce((a, k) => a + num(k.gramaz) * cenaZaGram(k.odstin, k.delka), 0);
      // Podíl cesty: gramáž tohoto nákupu proti ostatním nákupům téže cesty
      const cId = $("[name=cesta_id]", root).value;
      const c = state.db.cesty.find(x => x.id === cId);
      let podil = 0;
      if (c) {
        const gOstatni = state.db.nakupy.filter(x => x.cesta_id === cId && x.id !== n.id).reduce((a, x) => a + nakupG(x), 0);
        podil = g ? cestaCelkem(c) * g / (g + gOstatni) : 0;
      }
      $("[data-sum]", root).innerHTML = `
        <div><span>${vaha ? `Vlasy (${g} g)` : `Zboží (${n.polozky.length} ks, ${g} g)`}</span><span class="num">${fmtKc(zbozi)}</span></div>
        <div><span>Doprava a clo</span><span class="num">${fmtKc(doprava)}</span></div>
        <div class="total"><span>Zaplaceno za nákup</span><span class="num">${fmtKc(zbozi + doprava)}</span></div>
        ${c ? `<div><span>Podíl na cestě ${esc(c.nazev)}</span><span class="num">${fmtKc(podil)}</span></div>
        <div class="firm"><span>Skutečná cena${vaha ? " várky" : " kusů"}</span><span class="num">${fmtKc(zbozi + doprava + podil)}</span></div>` : ""}
        ${vaha ? `<div class="firm"><span>Nákupní cena za gram</span><span class="num">${g ? fmtKcG((zbozi + doprava + podil) / g) : ""}</span></div>
          ${lock ? `<div><span>Zbývá ve várce</span><span class="num">${g - odebranoG(n)} g</span></div>` : ""}`
        : `<div><span>Hodnota v ceníku</span><span class="num">${fmtKc(cenik)}</span></div>`}`;
    }
    root.addEventListener("click", e => {
      if (e.target.closest("[data-kus-z-varky]")) { closeSheet(); kusForm(null, n.id); return; }
      if (e.target.closest("[data-add]")) { read(); const last = n.polozky[n.polozky.length - 1] || {}; n.polozky.push({ odstin: last.odstin || "tmave", delka: last.delka || S().cenik[0]?.delka, gramaz: "", cena: "" }); draw(); read(); }
      const rm = e.target.closest("[data-rm]");
      if (rm) { read(); n.polozky.splice(+rm.dataset.rm, 1); draw(); read(); }
    });
    root.addEventListener("input", read);
    root.addEventListener("change", e => {
      if (e.target.name === "typ" && e.target.value === "kusy" && !n.polozky.length) { n.polozky.push({ odstin: "tmave", delka: S().cenik[0]?.delka || "", gramaz: "", cena: "" }); draw(); }
      read();
    });
    draw();
    read();
  }

  function cestaForm(existing) {
    const c = existing ? structuredClone(existing) : { id: uid(), nazev: "", datum_od: today(), datum_do: today(), naklady: [{ druh: "letenky", castka: "", poznamka: "" }], poznamka: "" };
    const pripojene = new Set(state.db.nakupy.filter(n => n.cesta_id === c.id).map(n => n.id));
    const kandidati = [...state.db.nakupy].sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, 40);
    const body = `<div class="f">
      <label class="field"><span>Název cesty</span><input name="nazev" value="${esc(c.nazev)}" placeholder="např. Kyjev říjen" required></label>
      <div class="f2">
        <label class="field"><span>Od</span><input type="date" name="datum_od" value="${esc(c.datum_od)}"></label>
        <label class="field"><span>Do</span><input type="date" name="datum_do" value="${esc(c.datum_do)}"></label>
      </div>
      <div class="field"><span>Náklady</span><div class="items" data-nakl></div>
        <button type="button" class="btn small" data-add-nakl style="justify-self:start;margin-top:4px">+ Další náklad</button></div>
      <div class="field"><span>Nákupy z této cesty</span>
        ${kandidati.length ? `<div class="pick" data-pick>${kandidati.map(n => `<label><input type="checkbox" value="${n.id}" ${pripojene.has(n.id) ? "checked" : ""}>
          <span class="row-main"><span class="row-title" style="display:block">${esc(n.dodavatel || "Dodavatel neuveden")}</span>
          <span class="row-sub" style="display:block">${fmtDate(n.datum)} · ${(n.polozky || []).length} ks · ${nakupG(n)} g</span></span>
          <span class="num" data-podil="${n.id}"></span></label>`).join("")}</div>` : `<p class="small muted">Zatím žádný nákup. Až ho zapíšete, vyberte u něj tuto cestu.</p>`}
      </div>
      <div class="split" data-sum></div>
      <label class="field"><span>Poznámka</span><textarea name="poznamka">${esc(c.poznamka)}</textarea></label>
    </div>`;
    openSheet(existing ? c.nazev || "Cesta" : "Nová cesta", body, async () => {
      read();
      const fd = new FormData($("#sheet-form"));
      c.nazev = fd.get("nazev").trim(); c.datum_od = fd.get("datum_od"); c.datum_do = fd.get("datum_do") || c.datum_od; c.poznamka = fd.get("poznamka");
      c.naklady = c.naklady.filter(x => num(x.castka) > 0);
      if (!c.nazev) { toast("Doplňte název cesty.", true); return false; }
      const ops = [{ type: "upsert", col: "cesty", rec: c }];
      for (const n of state.db.nakupy) {
        const chce = pripojene.has(n.id);
        if (chce && n.cesta_id !== c.id) ops.push({ type: "upsert", col: "nakupy", rec: { ...n, cesta_id: c.id } });
        if (!chce && n.cesta_id === c.id) ops.push({ type: "upsert", col: "nakupy", rec: { ...n, cesta_id: "" } });
      }
      if (!await save(ops, "Cesta uložena")) return false;
      return prepocitatNaklady();
    }, existing ? async () => {
      if (!confirm("Smazat cestu? Nákupy zůstanou, jen se od ní odpojí.")) return false;
      const ops = [{ type: "delete", col: "cesty", id: c.id }];
      state.db.nakupy.filter(n => n.cesta_id === c.id).forEach(n => ops.push({ type: "upsert", col: "nakupy", rec: { ...n, cesta_id: "" } }));
      if (!await save(ops, "Cesta smazána")) return false;
      return prepocitatNaklady();
    } : null);

    const root = $(".sheet");
    function draw() {
      $("[data-nakl]", root).innerHTML = c.naklady.map((x, i) => `<div class="item-row">
        <label class="field"><span>Druh</span><select name="druh">${opts(DRUHY, x.druh)}</select></label>
        <label class="field"><span>Částka Kč</span><input name="castka" inputmode="decimal" value="${esc(x.castka)}"></label>
        <label class="field" style="grid-column:span 2"><span>Poznámka</span><input name="pozn" value="${esc(x.poznamka)}"></label>
        <button type="button" class="close rm" data-rm="${i}" aria-label="Odebrat náklad">×</button>
      </div>`).join("");
    }
    function read() {
      $$("[data-nakl] .item-row", root).forEach((row, i) => {
        c.naklady[i] = { druh: $("[name=druh]", row).value, castka: num($("[name=castka]", row).value) || "", poznamka: $("[name=pozn]", row).value };
      });
      const total = cestaCelkem(c);
      const vybrane = state.db.nakupy.filter(n => pripojene.has(n.id));
      const g = vybrane.reduce((a, n) => a + nakupG(n), 0);
      $$("[data-podil]", root).forEach(el => {
        const n = vybrane.find(x => x.id === el.dataset.podil);
        el.textContent = n && g ? fmtKc(total * nakupG(n) / g) : "";
      });
      const poDruhu = Object.entries(DRUHY).map(([k, v]) => [v, c.naklady.filter(x => x.druh === k).reduce((a, x) => a + num(x.castka), 0)]).filter(([, sum]) => sum);
      $("[data-sum]", root).innerHTML = `
        ${poDruhu.map(([v, sum]) => `<div><span>${v}</span><span class="num">${fmtKc(sum)}</span></div>`).join("")}
        <div class="total"><span>Cesta celkem</span><span class="num">${fmtKc(total)}</span></div>
        <div><span>${vybrane.length ? `Rozdělí se na ${vybrane.length} ${plural(vybrane.length, "nákup", "nákupy", "nákupů")} (${g} g)` : "Bez nákupu se do ceny kusů zatím nepočítá"}</span>
        <span class="num">${g ? fmtKcG(total / g) : ""}</span></div>`;
    }
    root.addEventListener("click", e => {
      if (e.target.closest("[data-add-nakl]")) { read(); c.naklady.push({ druh: "ubytovani", castka: "", poznamka: "" }); draw(); read(); }
      const rm = e.target.closest("[data-rm]");
      if (rm) { read(); c.naklady.splice(+rm.dataset.rm, 1); draw(); read(); }
    });
    root.addEventListener("change", e => {
      if (e.target.matches("[data-pick] input")) e.target.checked ? pripojene.add(e.target.value) : pripojene.delete(e.target.value);
      read();
    });
    root.addEventListener("input", read);
    draw();
    read();
  }

  // Výdaj zapsaný ve Financích (letenka, hotel) přesune do cesty, ať se počítá do ceny kusů.
  function presunDoCesty(f) {
    const txt = (f.poznamka || "") + " " + (f.kategorie || "");
    const druh = /ubyt|hotel|airbnb/i.test(txt) ? "ubytovani" : /let|flight|ryanair|wizz/i.test(txt) ? "letenky" : /doprav|vlak|bus|taxi|uber/i.test(txt) ? "doprava" : "ostatni";
    const body = `<div class="f">
      <p class="small muted">${fmtDate(f.datum)} · ${esc(f.kategorie)} · <strong class="num">${fmtKc(f.castka)}</strong>${f.poznamka ? " · " + esc(f.poznamka) : ""}</p>
      <label class="field"><span>Do které cesty</span><select name="cesta"><option value="__nova">Nová cesta</option>${state.db.cesty.map(c => `<option value="${c.id}">${esc(c.nazev)} (${fmtDate(c.datum_od)})</option>`).join("")}</select></label>
      <label class="field" data-nova><span>Název nové cesty</span><input name="nazev" placeholder="např. Kyjev říjen"></label>
      <label class="field"><span>Druh nákladu</span><select name="druh">${opts(DRUHY, druh)}</select></label>
      <p class="small muted">Záznam se z Financí odebere a objeví se v cestě. Pak k cestě připojte nákup.</p>
    </div>`;
    openSheet("Přesunout do cesty", body, async () => {
      const fd = new FormData($("#sheet-form"));
      const naklad = { druh: fd.get("druh"), castka: num(f.castka), poznamka: f.poznamka || "" };
      let cesta;
      if (fd.get("cesta") === "__nova") {
        if (!fd.get("nazev").trim()) { toast("Doplňte název cesty.", true); return false; }
        cesta = { id: uid(), nazev: fd.get("nazev").trim(), datum_od: f.datum, datum_do: f.datum, naklady: [naklad], poznamka: "" };
      } else {
        const c = state.db.cesty.find(x => x.id === fd.get("cesta"));
        cesta = { ...c, naklady: [...(c.naklady || []), naklad] };
      }
      if (!await save([{ type: "upsert", col: "cesty", rec: cesta }, { type: "delete", col: "finance", id: f.id }], "Přesunuto do cesty " + cesta.nazev)) return false;
      return prepocitatNaklady();
    });
    const root = $(".sheet");
    const upd = () => $("[data-nova]", root).classList.toggle("hidden", $("[name=cesta]", root).value !== "__nova");
    root.addEventListener("change", upd);
    if (state.db.cesty.length) {
      const nejnovejsi = [...state.db.cesty].sort((a, b) => (b.datum_od || "").localeCompare(a.datum_od || ""))[0];
      $("[name=cesta]", root).value = nejnovejsi.id;
    }
    upd();
  }

  // ================================================================
  // 10. Zákazníci a salony
  // ================================================================
  function viewZakaznici() {
    const f = state.filters.zakaznici;
    const q = state.filters.q.toLowerCase();
    const prodeje = state.db.prodeje.filter(p => p.stav === "zaplaceno");
    const list = state.db.zakaznici
      .filter(z => f === "vse" || z.typ === f)
      .filter(z => !q || [z.jmeno, z.mesto, z.telefon, z.email, z.ico].join(" ").toLowerCase().includes(q))
      .map(z => ({ z, ps: prodeje.filter(p => p.zakaznik_id === z.id) }))
      .sort((a, b) => (a.z.jmeno || "").localeCompare(b.z.jmeno || "", "cs"));
    $("#view").innerHTML = `
      <div class="view-head"><h1>Zákazníci</h1><button class="btn primary" data-new>+ Zákazník</button></div>
      ${chips("zf", { vse: "Všichni", ...TYPY }, f)}
      <input class="search" type="search" placeholder="Hledat jméno, město, telefon, IČO" value="${esc(state.filters.q)}" id="q">
      ${list.length ? `<div class="list boxed">${list.map(({ z, ps }) => `
        <button class="row" data-edit="${z.id}">
          <div class="row-main"><div class="row-title">${esc(z.jmeno)}${z.vip ? ' <span class="badge warn">VIP</span>' : ""}</div>
          <div class="row-sub">${TYPY[z.typ]}${z.mesto ? " · " + esc(z.mesto) : ""}${z.typ !== "zakaznice" ? " · sleva " + num(z.sleva) + " % · " + esc(SELLERS[z.spravce] || "") : ""}</div></div>
          <div class="row-end"><div class="num">${fmtKc(ps.reduce((a, p) => a + num(p.split?.celkem), 0))}</div>
          <span class="badge ${z.stav === "aktivni" ? "ok" : z.stav === "lead" ? "warn" : ""}">${ZAK_STAV[z.stav] || ""}</span></div>
        </button>`).join("")}</div>` : `<p class="empty">Zatím nikdo. Přidejte první kadeřnici nebo salon.</p>`}`;
    bindChips("zf", v => { state.filters.zakaznici = v; render(); });
    bindSearch();
    $("[data-new]").addEventListener("click", () => zakForm());
    $$("[data-edit]").forEach(b => b.addEventListener("click", () => zakForm(state.db.zakaznici.find(z => z.id === b.dataset.edit))));
  }

  function zakForm(existing) {
    const z = existing ? { ...existing } : { id: uid(), jmeno: "", typ: "kadernik", telefon: "", email: "", ico: "", mesto: "", sleva: 10, vip: false, spravce: Object.keys(PEOPLE).includes(state.user) ? state.user : "firma", stav: "aktivni", podminky: "", poznamka: "" };
    const historie = existing ? state.db.prodeje.filter(p => p.zakaznik_id === z.id).sort((a, b) => b.datum.localeCompare(a.datum)) : [];
    const body = `<div class="f">
      <label class="field"><span>Jméno / název salonu</span><input name="jmeno" value="${esc(z.jmeno)}" required></label>
      <fieldset><legend>Typ</legend><div class="seg">${segs("typ", TYPY, z.typ)}</div></fieldset>
      <div class="f2">
        <label class="field"><span>Telefon</span><input name="telefon" type="tel" value="${esc(z.telefon)}"></label>
        <label class="field"><span>E-mail</span><input name="email" type="email" value="${esc(z.email)}"></label>
      </div>
      <div class="f2">
        <label class="field"><span>Město</span><input name="mesto" value="${esc(z.mesto)}"></label>
        <label class="field"><span>IČO</span><input name="ico" inputmode="numeric" value="${esc(z.ico)}"></label>
      </div>
      <div data-partner class="f">
        <div class="f2">
          <label class="field"><span>Partnerská sleva %</span><input name="sleva" inputmode="decimal" value="${num(z.sleva)}"><span class="hint" data-sleva-hint></span></label>
          <label class="field"><span>Spravuje (bere provizi)</span><select name="spravce">${opts(SELLERS, z.spravce)}</select></label>
        </div>
        <label class="check"><input type="checkbox" name="vip" ${z.vip ? "checked" : ""}> VIP (sleva až ${num(S().slevy.max)} %)</label>
        <label class="field"><span>Podmínky</span><textarea name="podminky" placeholder="např. platba do 14 dnů, minimální odběr">${esc(z.podminky)}</textarea></label>
      </div>
      <label class="field"><span>Stav</span><select name="stav">${opts(ZAK_STAV, z.stav)}</select></label>
      <label class="field"><span>Poznámka</span><textarea name="poznamka">${esc(z.poznamka)}</textarea></label>
      ${historie.length ? `<div class="field"><span>Nákupy (${historie.length})</span><div class="list boxed">${historie.map(saleRow).join("")}</div></div>` : ""}
    </div>`;
    openSheet(existing ? z.jmeno : "Nový zákazník", body, () => {
      const fd = new FormData($("#sheet-form"));
      const rec = { ...z, jmeno: fd.get("jmeno").trim(), typ: fd.get("typ"), telefon: fd.get("telefon"), email: fd.get("email"), mesto: fd.get("mesto"), ico: fd.get("ico"),
        sleva: num(fd.get("sleva")), spravce: fd.get("spravce"), vip: fd.get("vip") === "on", podminky: fd.get("podminky"), stav: fd.get("stav"), poznamka: fd.get("poznamka") };
      if (!rec.jmeno) { toast("Doplňte jméno.", true); return false; }
      if (rec.typ === "zakaznice") rec.sleva = 0;
      const strop = rec.vip ? num(S().slevy.max) : 15;
      if (rec.sleva > strop) { toast(`Sleva nad ${strop} % ${rec.vip ? "" : "jen pro VIP"}.`, true); return false; }
      // Jméno se drží i v prodejích kvůli historii
      const ops = [{ type: "upsert", col: "zakaznici", rec }];
      if (existing && existing.jmeno !== rec.jmeno) {
        state.db.prodeje.filter(p => p.zakaznik_id === rec.id).forEach(p => ops.push({ type: "upsert", col: "prodeje", rec: { ...p, zakaznik_jmeno: rec.jmeno } }));
      }
      return save(ops, "Zákazník uložen");
    }, existing ? () => {
      if (historie.length) { toast("Zákazník má prodeje. Nastavte mu stav Neaktivní.", true); return false; }
      return confirm("Smazat " + z.jmeno + "?") && save([{ type: "delete", col: "zakaznici", id: z.id }], "Smazáno");
    } : null);
    const root = $(".sheet");
    const upd = () => {
      const typ = $("[name=typ]:checked", root).value;
      $("[data-partner]", root).classList.toggle("hidden", typ === "zakaznice");
      const vip = $("[name=vip]", root).checked;
      $("[data-sleva-hint]", root).textContent = vip ? `VIP: max ${num(S().slevy.max)} %` : "Běžně 10 až 15 %";
    };
    root.addEventListener("change", upd);
    $$("[data-edit-sale]", root).forEach(b => b.addEventListener("click", () => { closeSheet(); saleForm(state.db.prodeje.find(p => p.id === b.dataset.editSale)); }));
    upd();
  }

  // ================================================================
  // 11. Finance
  // ================================================================
  function viewFinance() {
    const range = periodRange(state.period);
    const st = stats(range);
    const list = state.db.finance.filter(f => inRange(f.datum, range)).sort((a, b) => b.datum.localeCompare(a.datum));
    const nakupy = state.db.nakupy.filter(n => inRange(n.datum, range));
    const cesty = state.db.cesty.filter(c => inRange(c.datum_od || "", range));
    const typLabel = { prijem: "Příjem", vydaj: "Výdaj", vyplata: "Výplata provize", zaloha: "Záloha na provize" };
    $("#view").innerHTML = `
      <div class="view-head"><h1>Finance</h1><button class="btn" data-new="zaloha">Záloha</button><button class="btn" data-new="vyplata">Vyplatit provizi</button><button class="btn primary" data-new="vydaj">+ Záznam</button></div>
      ${chips("period", { mesic: "Tento měsíc", minuly: "Minulý měsíc", rok: "Letos", vse: "Od začátku" }, state.period)}
      <div class="grid kpis">
        ${kpi("Zisk firmy", fmtKc(st.zisk), "v období")}
        ${kpi("Ostatní příjmy", fmtKc(st.prijmy), "kurzy apod.")}
        ${kpi("Ostatní výdaje", fmtKc(st.vydaje), "bez nákupu vlasů")}
        ${kpi("Peníze firmy", fmtKc(st.kasa), "od začátku")}
      </div>
      <p class="note info" style="margin-top:14px">Prodeje, nákupy a cesty se sem počítají samy. Letenky a ubytování patří do Nákupy → Cesty. Sem zapisujte jen ostatní: kurzy, reklamu, materiál a výplaty provizí.</p>
      <section class="card">
        <h2>Záznamy v období</h2>
        ${list.length || nakupy.length || cesty.length ? `<div class="list">
          ${list.map(f => `<button class="row" data-edit="${f.id}">
            <div class="row-main"><div class="row-title">${f.typ === "vyplata" ? "Provize: " + esc(PEOPLE[f.komu] || "") : f.typ === "zaloha" ? "Záloha: " + esc(PEOPLE[f.komu] || "") : esc(f.kategorie || typLabel[f.typ])}</div>
            <div class="row-sub">${fmtDate(f.datum)} · ${typLabel[f.typ]}${f.poznamka ? " · " + esc(f.poznamka) : ""}</div></div>
            <div class="row-end num" style="color:${f.typ === "prijem" ? "var(--ok)" : "inherit"}"><strong>${f.typ === "prijem" ? "+" : "−"}${fmtKc(f.castka)}</strong></div>
          </button>`).join("")}
          ${cesty.map(c => `<button class="row" data-cesta="${c.id}"><div class="row-main"><div class="row-title">Cesta: ${esc(c.nazev || "")}</div>
            <div class="row-sub">${fmtDate(c.datum_od)} · ze sekce Nákupy → Cesty</div></div><div class="row-end num">−${fmtKc((c.naklady || []).reduce((a, x) => a + num(x.castka), 0))}</div></button>`).join("")}
          ${nakupy.map(n => `<div class="row"><div class="row-main"><div class="row-title">Nákup vlasů: ${esc(n.dodavatel || "")}</div>
            <div class="row-sub">${fmtDate(n.datum)} · ze sekce Nákupy</div></div><div class="row-end num">−${fmtKc(n.celkem)}</div></div>`).join("")}
        </div>` : `<p class="muted small">Žádné záznamy v období.</p>`}
      </section>`;
    bindChips("period", v => { state.period = v; render(); });
    $$("[data-new]").forEach(b => b.addEventListener("click", () => finForm(null, b.dataset.new)));
    $$("[data-edit]").forEach(b => b.addEventListener("click", () => finForm(state.db.finance.find(f => f.id === b.dataset.edit))));
    $$("[data-cesta]").forEach(b => b.addEventListener("click", () => cestaForm(state.db.cesty.find(c => c.id === b.dataset.cesta))));
  }

  function finForm(existing, typ) {
    const st = stats(periodRange("vse"));
    const f = existing ? { ...existing } : { id: uid(), datum: today(), typ: typ || "vydaj", kategorie: "", castka: "", komu: "marketa", poznamka: "" };
    const body = `<div class="f">
      <fieldset><legend>Typ</legend><div class="seg">${segs("typ", { vydaj: "Výdaj", prijem: "Příjem", vyplata: "Výplata", zaloha: "Záloha" }, f.typ)}</div></fieldset>
      <div class="f2">
        <label class="field"><span>Datum</span><input type="date" name="datum" value="${esc(f.datum)}" required></label>
        <label class="field"><span>Částka Kč</span><input name="castka" inputmode="decimal" value="${esc(f.castka)}" required></label>
      </div>
      <label class="field" data-kat><span>Kategorie</span><select name="kategorie"></select><span class="hint hidden" data-kat-hint>Jen vlasy, které nejdou do prodeje (cvičné culíky). Culíky na prodej patří do Nákupy, letenky a ubytování do Nákupy → Cesty.</span></label>
      <label class="field" data-komu><span>Komu</span><select name="komu">${Object.entries(PEOPLE).map(([k, v]) => `<option value="${k}" ${k === f.komu ? "selected" : ""}>${v} (k výplatě ${fmtKc(st.provize[k].celkem - st.provize[k].vyplaceno)})</option>`).join("")}</select></label>
      <p class="note info hidden" data-zaloha-hint>Záloha se strhne z budoucích provizí. Dokud je provizí méně, ukazuje Přehled zbývající zálohu.</p>
      <label class="field"><span>Poznámka</span><input name="poznamka" value="${esc(f.poznamka)}"></label>
      ${existing && f.typ === "vydaj" ? `<div class="note info">Je to letenka, ubytování nebo jiný náklad cesty za nákupem? Přesuňte ho do cesty, pak se započítá do ceny culíků.
        <div style="margin-top:8px"><button type="button" class="btn small" data-presun>Přesunout do cesty</button></div></div>` : ""}
    </div>`;
    openSheet(existing ? "Záznam" : "Nový záznam", body, () => {
      const fd = new FormData($("#sheet-form"));
      const rec = { ...f, typ: fd.get("typ"), datum: fd.get("datum"), castka: num(fd.get("castka")), kategorie: ["vyplata", "zaloha"].includes(fd.get("typ")) ? "" : fd.get("kategorie"), komu: ["vyplata", "zaloha"].includes(fd.get("typ")) ? fd.get("komu") : "", poznamka: fd.get("poznamka") };
      if (rec.castka <= 0) { toast("Zadejte částku.", true); return false; }
      return save([{ type: "upsert", col: "finance", rec }], "Uloženo");
    }, existing ? () => confirm("Smazat záznam?") && save([{ type: "delete", col: "finance", id: f.id }], "Smazáno") : null);
    $("[data-presun]")?.addEventListener("click", () => { closeSheet(); presunDoCesty(f); });
    const root = $(".sheet");
    const upd = () => {
      const t = $("[name=typ]:checked", root).value;
      $("[data-kat]", root).classList.toggle("hidden", t === "vyplata" || t === "zaloha");
      $("[data-komu]", root).classList.toggle("hidden", t !== "vyplata" && t !== "zaloha");
      $("[data-zaloha-hint]", root).classList.toggle("hidden", t !== "zaloha");
      const sel = $("[name=kategorie]", root);
      const cur = sel.value || f.kategorie;
      const kats = t === "prijem" ? KAT_PRIJEM : KAT_VYDAJ;
      sel.innerHTML = kats.map(k => `<option ${k === cur ? "selected" : ""}>${k}</option>`).join("");
      $("[data-kat-hint]", root).classList.toggle("hidden", t !== "vydaj" || sel.value !== "Nákup vlasů");
      if (t === "vyplata" && !existing && !$("[name=castka]", root).value) {
        const k = $("[name=komu]", root).value;
        const dluh = st.provize[k].celkem - st.provize[k].vyplaceno;
        if (dluh > 0) $("[name=castka]", root).value = Math.round(dluh);
      }
    };
    root.addEventListener("change", e => {
      if (e.target.name === "komu" && !existing && $("[name=typ]:checked", root).value === "vyplata") {
        const k = e.target.value;
        $("[name=castka]", root).value = Math.max(0, Math.round(st.provize[k].celkem - st.provize[k].vyplaceno)) || "";
      }
      upd();
    });
    upd();
  }

  // ================================================================
  // 12. Více (mobil) a Nastavení
  // ================================================================
  const ZPRAVA_STAV = { nova: "Čeká na zapsání", zapsano: "Zapsáno", doplnit: "Potřeba doplnit" };
  const kdo = u => u === "claude" ? "Claude" : PEOPLE[u] || u || "";

  function viewZpravy() {
    const list = [...state.db.zpravy].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const ceka = list.filter(z => z.stav === "nova").length;
    const doplnit = list.filter(z => z.stav === "doplnit").length;
    $("#view").innerHTML = `
      <div class="view-head"><h1>Zprávy</h1></div>
      <form class="card" id="zprava-form">
        <label class="field"><span>Co se stalo</span>
          <textarea name="text" rows="4" placeholder="např. Terka včera prodala 2 culíky z várky od Turka kadeřnici Janě, 120 g a 95 g, platila převodem"></textarea>
          <span class="hint">Pište volně jako do chatu: prodeje, platby, půjčky, provize, nákupy. Jméno a čas se uloží samy. Jednou týdně to Claude zapíše do CRM a ke zprávě připíše, co udělal.</span></label>
        <div class="zfoto" data-zfoto-list></div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <label class="btn">Přidat fotku<input type="file" accept="image/*" multiple hidden data-zfoto></label>
          <button class="btn primary" type="submit" style="flex:1">Odeslat</button>
        </div>
      </form>
      ${ceka || doplnit ? `<p class="note info" style="margin-top:14px">${ceka ? `${ceka} ${plural(ceka, "zpráva čeká", "zprávy čekají", "zpráv čeká")} na zapsání.` : ""} ${doplnit ? `${doplnit} ${plural(doplnit, "zpráva potřebuje", "zprávy potřebují", "zpráv potřebuje")} doplnit.` : ""}</p>` : ""}
      ${list.length ? `<div class="list boxed" style="margin-top:14px">${list.map(z => `
        <div class="row" style="align-items:flex-start">
          <div class="row-main">
            <div class="row-sub">${esc(kdo(z.createdBy))} · ${z.createdAt ? new Date(z.createdAt).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</div>
            <div style="white-space:pre-wrap;margin-top:2px">${esc(z.text)}</div>
            ${(z.foto || []).length ? `<div class="zfoto">${z.foto.map(id => thumb(id)).join("")}</div>` : ""}
            ${z.odpoved ? `<div class="small" style="margin-top:6px;padding:8px 10px;border-radius:8px;background:var(--cream-2);white-space:pre-wrap"><strong>Claude:</strong> ${esc(z.odpoved)}</div>` : ""}
          </div>
          <div class="row-end" style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <span class="badge ${z.stav === "zapsano" ? "ok" : z.stav === "doplnit" ? "warn" : ""}">${ZPRAVA_STAV[z.stav] || ""}</span>
            ${z.stav !== "zapsano" && z.createdBy === state.user ? `<button class="link small" data-edit-zprava="${z.id}">Upravit</button>` : ""}
          </div>
        </div>`).join("")}</div>` : `<p class="empty">Zatím žádná zpráva.</p>`}`;
    $("#zprava-form").addEventListener("submit", async e => {
      e.preventDefault();
      const text = new FormData(e.target).get("text").trim();
      if (!text && !zFotky.length) { toast("Napište zprávu nebo přidejte fotku.", true); return; }
      $("button[type=submit]", e.target).disabled = true;
      await save([{ type: "upsert", col: "zpravy", rec: { id: uid(), text, foto: zFotky, stav: "nova", odpoved: "" } }], "Zpráva uložena");
    });
    const zFotky = [];
    const kresliZFotky = () => {
      const box = $("[data-zfoto-list]");
      box.innerHTML = zFotky.map(id => thumb(id)).join("");
      nactiFotky(box);
    };
    $("[data-zfoto]").addEventListener("change", async e => {
      const btn = $("#zprava-form button[type=submit]");
      btn.disabled = true;
      for (const f of e.target.files) {
        try { zFotky.push(await nahrajFoto(f)); kresliZFotky(); } catch (ex) { toast(ex.message, true); }
      }
      e.target.value = "";
      btn.disabled = false;
    });
    $$("[data-edit-zprava]").forEach(b => b.addEventListener("click", () => zpravaForm(state.db.zpravy.find(z => z.id === b.dataset.editZprava))));
  }

  function zpravaForm(z) {
    const body = `<div class="f">
      ${z.odpoved ? `<p class="note info">${esc(z.odpoved)}</p>` : ""}
      <label class="field"><span>Text zprávy</span><textarea name="text" rows="6">${esc(z.text)}</textarea>
        <span class="hint">Po úpravě se zpráva znovu zařadí k zapsání.</span></label>
    </div>`;
    openSheet("Upravit zprávu", body, () => {
      const text = new FormData($("#sheet-form")).get("text").trim();
      if (!text) { toast("Zpráva je prázdná.", true); return false; }
      return save([{ type: "upsert", col: "zpravy", rec: { ...z, text, stav: "nova" } }], "Zpráva upravena");
    }, () => confirm("Smazat zprávu?") && save([{ type: "delete", col: "zpravy", id: z.id }], "Zpráva smazána"));
  }

  // ---------- Poptávky z webu (formuláře na silkihair.cz)
  const POPT_TYP = { poptavka: "Culík", "registrace-kadernice": "Kadeřnice / salon", "poptavka-kurz": "Kurz" };
  const POPT_STAV = { nova: "Nová", resi: "Řeší se", vyrizeno: "Vyřízeno", zamitnuto: "Nezájem" };
  const POPT_POLE = { name: "Jméno", salon: "Salon", phone: "Telefon", email: "E-mail", city: "Město", ico: "IČO", shade: "Odstín", length: "Délka", interest: "Zájem", course: "Kurz", experience: "Zkušenosti", subject: "Předmět", message: "Zpráva" };
  const nove = () => state.db.poptavky.filter(x => x.stav === "nova").length;
  const telLink = t => String(t || "").replace(/[^\d+]/g, "");
  const waLink = t => { let d = String(t || "").replace(/\D/g, ""); if (d.length === 9) d = "420" + d; return d ? "https://wa.me/" + d : ""; };

  function viewPoptavky() {
    const f = state.filters.poptavky || "otevrene";
    // Prodej vlasů má přednost: poptávky culíků a kadeřnic před kurzy
    const poradi = { poptavka: 0, "registrace-kadernice": 1, "poptavka-kurz": 2 };
    const list = state.db.poptavky
      .filter(x => f === "vse" || (f === "otevrene" ? ["nova", "resi"].includes(x.stav) : ["vyrizeno", "zamitnuto"].includes(x.stav)))
      .sort((a, b) => (a.stav === "nova" ? 0 : 1) - (b.stav === "nova" ? 0 : 1) || poradi[a.form] - poradi[b.form] || (b.createdAt || "").localeCompare(a.createdAt || ""));
    $("#view").innerHTML = `
      <div class="view-head"><h1>Poptávky</h1></div>
      ${chips("pf2", { otevrene: "Otevřené", hotove: "Vyřízené", vse: "Vše" }, f)}
      <p class="small muted" style="margin-bottom:12px">Chodí sem samy z formulářů na webu. Nezávazné poptávky bez objednávky po vyřízení smažte (zásady ochrany osobních údajů).</p>
      ${list.length ? `<div class="list boxed">${list.map(x => `
        <button class="row" data-popt="${x.id}">
          <div class="row-main"><div class="row-title">${esc(x.pole?.salon || x.pole?.name || x.pole?.email || "Bez jména")}</div>
          <div class="row-sub">${POPT_TYP[x.form] || ""} · ${new Date(x.createdAt).toLocaleDateString("cs-CZ")}${x.vyrizuje ? " · " + esc(PEOPLE[x.vyrizuje] || "") : ""}${x.pole?.shade || x.pole?.length ? " · " + esc([x.pole.shade, x.pole.length].filter(Boolean).join(", ")) : ""}</div></div>
          <span class="badge ${x.stav === "nova" ? "ok" : x.stav === "resi" ? "warn" : ""}">${POPT_STAV[x.stav]}</span>
        </button>`).join("")}</div>` : `<p class="empty">${f === "otevrene" ? "Žádná otevřená poptávka." : "Nic tu není."}</p>`}`;
    bindChips("pf2", v => { state.filters.poptavky = v; render(); });
    $$("[data-popt]").forEach(b => b.addEventListener("click", () => poptavkaForm(state.db.poptavky.find(x => x.id === b.dataset.popt))));
  }

  function poptavkaForm(x) {
    const p = x.pole || {};
    const zak = state.db.zakaznici.find(z => z.id === x.zakaznik_id);
    const tel = telLink(p.phone), wa = waLink(p.phone);
    const body = `<div class="f">
      <p class="small muted">${POPT_TYP[x.form] || ""} · ${new Date(x.createdAt).toLocaleString("cs-CZ")}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${tel ? `<a class="btn primary" href="tel:${esc(tel)}">Zavolat</a>` : ""}
        ${wa ? `<a class="btn" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
        ${p.email ? `<a class="btn" href="mailto:${esc(p.email)}">E-mail</a>` : ""}
      </div>
      <div class="split">${Object.entries(POPT_POLE).filter(([k]) => p[k]).map(([k, v]) => `<div><span class="muted">${v}</span><span style="text-align:right;white-space:pre-wrap;overflow-wrap:anywhere">${esc(p[k])}</span></div>`).join("")}</div>
      <div class="f2">
        <label class="field"><span>Vyřizuje</span><select name="vyrizuje"><option value="">Nikdo</option>${Object.entries(PEOPLE).map(([k, v]) => `<option value="${k}" ${k === (x.vyrizuje || (x.stav === "nova" ? state.user : "")) ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="field"><span>Stav</span><select name="stav">${opts(POPT_STAV, x.stav === "nova" ? "resi" : x.stav)}</select></label>
      </div>
      <label class="field"><span>Poznámka</span><textarea name="poznamka" placeholder="např. volala jsem, chce 2 culíky blond 55 cm">${esc(x.poznamka)}</textarea></label>
      ${zak ? `<p class="small">Zákazník v CRM: <button type="button" class="link" data-zak>${esc(zak.jmeno)}</button></p>`
        : `<button type="button" class="btn block" data-prevest>Převést na zákazníka</button>`}
    </div>`;
    openSheet(p.salon || p.name || "Poptávka", body, () => {
      const fd = new FormData($("#sheet-form"));
      return save([{ type: "upsert", col: "poptavky", rec: { ...x, vyrizuje: fd.get("vyrizuje"), stav: fd.get("stav"), poznamka: fd.get("poznamka") } }], "Poptávka uložena");
    }, () => confirm("Smazat poptávku? Osobní údaje z ní zmizí.") && save([{ type: "delete", col: "poptavky", id: x.id }], "Poptávka smazána"));
    const root = $(".sheet");
    $("[data-zak]", root)?.addEventListener("click", () => { closeSheet(); zakForm(zak); });
    $("[data-prevest]", root)?.addEventListener("click", async () => {
      const fd = new FormData($("#sheet-form"));
      const kadernice = x.form === "registrace-kadernice";
      const z = {
        id: uid(), jmeno: p.salon || p.name || p.email || "Bez jména", typ: kadernice ? (p.salon ? "salon" : "kadernik") : "zakaznice",
        telefon: p.phone || "", email: p.email || "", ico: p.ico || "", mesto: p.city || "",
        sleva: kadernice ? 10 : 0, vip: false, spravce: fd.get("vyrizuje") || state.user, stav: "lead", podminky: "",
        poznamka: ["Z poptávky na webu " + new Date(x.createdAt).toLocaleDateString("cs-CZ"), p.name && p.salon ? "Kontakt: " + p.name : "", p.shade ? "Odstín: " + p.shade : "", p.length ? "Délka: " + p.length : "", p.interest ? "Zájem: " + p.interest : "", p.message ? "Zpráva: " + p.message : ""].filter(Boolean).join("\n")
      };
      const ok = await save([
        { type: "upsert", col: "zakaznici", rec: z },
        { type: "upsert", col: "poptavky", rec: { ...x, zakaznik_id: z.id, vyrizuje: fd.get("vyrizuje"), stav: fd.get("stav"), poznamka: fd.get("poznamka") } }
      ], "Zákazník založen");
      if (ok) { closeSheet(); zakForm(state.db.zakaznici.find(y => y.id === z.id)); }
    });
  }

  function viewVice() {
    $("#view").innerHTML = `
      <div class="view-head"><h1>Více</h1></div>
      <div class="list boxed">
        ${[["poptavky", "Poptávky z webu", nove() ? nove() + " nových" : "Formuláře z webu"], ["zakaznici", "Zákazníci", "Kadeřnice, salony, zákaznice"], ["nakupy", "Nákupy", "Nákupy vlasů a jejich náklady"], ["finance", "Finance", "Příjmy, výdaje, výplaty provizí"], ["nastaveni", "Nastavení", "Provize, slevy, ceník, export"]].map(([k, t, s]) => `
          <button class="row" data-go="${k}"><span style="width:22px;color:var(--gold-deep)">${ICONS[k]}</span>
          <div class="row-main"><div class="row-title">${t}</div><div class="row-sub">${s}</div></div><span aria-hidden="true">›</span></button>`).join("")}
      </div>`;
    bindCommon();
  }

  function viewNastaveni() {
    const s = S();
    $("#view").innerHTML = `
      <div class="view-head"><h1>Nastavení</h1></div>
      <form id="set-form">
        <div class="grid cols2">
          <section class="card">
            <h2>Provize (% z původní ceny)</h2>
            <div class="f3">
              <label class="field"><span>Prodej zákaznici</span><input name="p_zak" inputmode="decimal" value="${num(s.provize.zakaznice)}"></label>
              <label class="field"><span>Kadeřnice / salon</span><input name="p_kad" inputmode="decimal" value="${num(s.provize.kadernik)}"></label>
              <label class="field"><span>Dominik z každého</span><input name="p_dom" inputmode="decimal" value="${num(s.provize.dominik)}"></label>
            </div>
            <h2 style="margin-top:18px">Slevy pro kadeřnice a salony (%)</h2>
            <div class="f3">
              <label class="field"><span>Od 2 ks</span><input name="s_2" inputmode="decimal" value="${num(s.slevy.ks2)}"></label>
              <label class="field"><span>Od 5 ks</span><input name="s_5" inputmode="decimal" value="${num(s.slevy.ks5)}"></label>
              <label class="field"><span>Strop (VIP)</span><input name="s_max" inputmode="decimal" value="${num(s.slevy.max)}"></label>
            </div>
            <p class="small muted" style="margin-top:10px">Změna platí pro nové a upravené prodeje. Uložené prodeje drží čísla z doby prodeje.</p>
          </section>
          <section class="card">
            <h2>Ceník Kč/g</h2>
            <table class="t"><thead><tr><th>Délka</th><th class="r">Tmavé</th><th class="r">Střední</th><th class="r">Blond</th></tr></thead>
              <tbody>${s.cenik.map((r, i) => `<tr><td>${esc(r.delka)}</td>${["tmave", "stredni", "blond"].map(o => `<td class="r"><input name="c_${i}_${o}" inputmode="decimal" value="${num(r[o])}" aria-label="${esc(r.delka)} ${ODSTINY[o]}"></td>`).join("")}</tr>`).join("")}</tbody>
            </table>
            <p class="small muted" style="margin-top:10px">Ceník na webu (cenik.html) se tímhle nemění.</p>
          </section>
        </div>
        <button class="btn primary" type="submit" style="margin-top:14px">Uložit nastavení</button>
      </form>
      <section class="card" style="margin-top:14px">
        <h2>Napojení pro Claude</h2>
        <p class="small muted" style="margin-bottom:10px">Klíč, přes který může Claude číst a zapisovat data CRM. Jeho změny jsou v historii pod jménem Claude. Klíč jde kdykoli zrušit.</p>
        <div data-agent><p class="small muted">Načítám…</p></div>
      </section>
      <section class="card">
        <h2>Export a záloha</h2>
        <p class="small muted" style="margin-bottom:10px">Server si dělá jednu zálohu denně. Pro jistotu si jednou za měsíc stáhněte celou zálohu.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" data-exp="json">Celá záloha (JSON)</button>
          <button class="btn" data-exp="prodeje">Prodeje (CSV)</button>
          <button class="btn" data-exp="finance">Finance (CSV)</button>
          <button class="btn" data-exp="sklad">Sklad (CSV)</button>
        </div>
      </section>
      <section class="card">
        <h2>Poslední změny</h2>
        <div class="list">${(state.db.log || []).slice(0, 15).map(l => `<div class="row"><div class="row-main"><div class="row-title small">${esc(l.co)}</div>
          <div class="row-sub">${esc(l.u === "claude" ? "Claude" : PEOPLE[l.u] || l.u)} · ${new Date(l.t).toLocaleString("cs-CZ")}</div></div></div>`).join("") || `<p class="muted small">Zatím nic.</p>`}</div>
      </section>`;
    $("#set-form").addEventListener("submit", e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        provize: { zakaznice: num(fd.get("p_zak")), kadernik: num(fd.get("p_kad")), dominik: num(fd.get("p_dom")) },
        slevy: { ks2: num(fd.get("s_2")), ks5: num(fd.get("s_5")), max: num(fd.get("s_max")) },
        cenik: s.cenik.map((r, i) => ({ delka: r.delka, tmave: num(fd.get(`c_${i}_tmave`)), stredni: num(fd.get(`c_${i}_stredni`)), blond: num(fd.get(`c_${i}_blond`)) }))
      };
      save([{ type: "settings", data }], "Nastavení uloženo");
    });
    $$("[data-exp]").forEach(b => b.addEventListener("click", () => exportData(b.dataset.exp)));
    agentPanel();
  }

  async function agentPanel(newKey) {
    const box = $("[data-agent]");
    if (!box) return;
    let st;
    try { st = await api("agent-key"); } catch (e) { box.innerHTML = `<p class="small muted">${esc(e.message)}</p>`; return; }
    box.innerHTML = newKey ? `
        <p class="note">Klíč se ukazuje jen teď. Zkopírujte ho a pošlete Claudovi, uloží si ho jen u vás v počítači.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input class="search" style="margin:0;flex:1;min-width:200px;font-family:ui-monospace,monospace;font-size:13px" readonly value="${esc(newKey)}" id="agent-key">
          <button class="btn" data-copy>Kopírovat</button>
        </div>`
      : st.active ? `
        <p class="small" style="margin-bottom:10px"><span class="badge ok">Aktivní</span> vytvořil(a) ${esc(PEOPLE[st.createdBy] || st.createdBy)} ${new Date(st.createdAt).toLocaleDateString("cs-CZ")}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn danger" data-revoke>Zrušit klíč</button><button class="btn" data-create>Vytvořit nový</button></div>`
      : `<button class="btn primary" data-create>Vytvořit klíč</button>`;
    $("[data-create]", box)?.addEventListener("click", async () => {
      if (st.active && !confirm("Vytvořit nový klíč? Starý přestane fungovat.")) return;
      try { const r = await api("agent-key", { method: "POST" }); agentPanel(r.key); } catch (e) { toast(e.message, true); }
    });
    $("[data-revoke]", box)?.addEventListener("click", async () => {
      if (!confirm("Zrušit klíč? Claude pak do CRM nebude mít přístup.")) return;
      try { await api("agent-key", { method: "DELETE" }); toast("Klíč zrušen"); agentPanel(); } catch (e) { toast(e.message, true); }
    });
    $("[data-copy]", box)?.addEventListener("click", async () => {
      const inp = $("#agent-key");
      try { await navigator.clipboard.writeText(inp.value); } catch { inp.select(); document.execCommand("copy"); }
      toast("Zkopírováno");
    });
  }

  function exportData(kind) {
    const db = state.db;
    const stamp = today();
    let name, content, type;
    const csv = rows => "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
    if (kind === "json") {
      name = `silki-crm-zaloha-${stamp}.json`; content = JSON.stringify(db, null, 2); type = "application/json";
    } else if (kind === "prodeje") {
      name = `silki-prodeje-${stamp}.csv`; type = "text/csv";
      content = csv([["Datum", "Zákazník", "Typ", "Prodejce", "Kusy", "Původní cena", "Sleva %", "Zaplaceno", "Provize prodejce", "Dominik", "Firmě", "Nákupní cena", "Zisk firmy", "Platba", "Stav"],
        ...db.prodeje.sort((a, b) => a.datum.localeCompare(b.datum)).map(p => [p.datum, p.zakaznik_jmeno, TYPY[p.typ], SELLERS[p.prodejce], (p.polozky || []).map(k => k.cislo).join(", "),
          p.split?.puvodni, p.split?.sleva, p.split?.celkem, p.split?.prodejce, p.split?.dominik, p.split?.firma, p.split?.naklad, p.split?.zisk, PLATBY[p.platba], PRODEJ_STAV[p.stav]])]);
    } else if (kind === "finance") {
      name = `silki-finance-${stamp}.csv`; type = "text/csv";
      content = csv([["Datum", "Typ", "Kategorie / komu", "Částka", "Poznámka"],
        ...db.finance.map(f => [f.datum, f.typ, ["vyplata", "zaloha"].includes(f.typ) ? PEOPLE[f.komu] : f.kategorie, f.castka, f.poznamka]),
        ...db.nakupy.map(n => [n.datum, "nákup vlasů", n.dodavatel, n.celkem, n.poznamka]),
        ...db.cesty.flatMap(c => (c.naklady || []).map(x => [c.datum_od, "cesta", c.nazev + ": " + (DRUHY[x.druh] || x.druh), x.castka, x.poznamka]))].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
    } else {
      name = `silki-sklad-${stamp}.csv`; type = "text/csv";
      content = csv([["Číslo", "Odstín", "Délka", "Gramáž", "Kč/g", "Původní cena", "Nákupní cena", "Stav"],
        ...db.sklad.map(k => [k.cislo, ODSTINY[k.odstin], k.delka, k.gramaz, k.cena_g, kusCena(k), k.nakup_cena, SKLAD_STAV[k.stav]])]);
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ================================================================
  // 13. Panel s formulářem
  // ================================================================
  const opts = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${esc(v)}</option>`).join("");
  const segs = (name, map, cur) => Object.entries(map).map(([k, v]) => `<label><input type="radio" name="${name}" value="${k}" ${k === cur ? "checked" : ""}>${esc(v)}</label>`).join("");

  let lastFocus = null;
  function openSheet(title, body, onSave, onDelete) {
    lastFocus = document.activeElement;
    $("#sheet-root").innerHTML = `
      <div class="sheet-backdrop">
        <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
          <form id="sheet-form" novalidate>
            <div class="sheet-head"><h2 id="sheet-title">${esc(title)}</h2><button type="button" class="close" data-close aria-label="Zavřít">×</button></div>
            ${body}
            ${onSave ? `<div class="sheet-foot">
              ${onDelete ? `<button type="button" class="btn danger" data-del>Smazat</button>` : ""}
              <span class="grow"></span>
              <button type="button" class="btn" data-close>Zrušit</button>
              <button type="submit" class="btn primary">Uložit</button>
            </div>` : ""}
          </form>
        </div>
      </div>`;
    document.body.style.overflow = "hidden";
    const bd = $(".sheet-backdrop");
    bd.addEventListener("click", e => { if (e.target === bd || e.target.closest("[data-close]")) closeSheet(); });
    $("#sheet-form").addEventListener("submit", async e => {
      e.preventDefault();
      if (!onSave) return;
      const btn = $("button[type=submit]", e.target);
      btn.disabled = true;
      const ok = await onSave($(".sheet"));
      btn.disabled = false;
      if (ok) closeSheet();
    });
    if (onDelete) $("[data-del]").addEventListener("click", async () => { if (await onDelete()) closeSheet(); });
    const first = $(".sheet input:not([type=hidden]):not([disabled]), .sheet select");
    if (first && window.innerWidth >= 900) first.focus();
    nactiFotky($(".sheet"));
  }

  function closeSheet() {
    $("#sheet-root").innerHTML = "";
    document.body.style.overflow = "";
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  document.addEventListener("click", e => {
    const img = e.target.closest("img.thumb[src]");
    if (!img || e.target.closest("label")) return;
    e.preventDefault();
    e.stopPropagation();
    const big = document.createElement("div");
    big.className = "foto-full";
    big.innerHTML = `<img src="${img.src}" alt="Fotka"><button type="button" class="close" aria-label="Zavřít">×</button>`;
    big.addEventListener("click", () => big.remove());
    document.body.appendChild(big);
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $(".sheet")) closeSheet(); });

  // Po návratu do záložky načíst čerstvá data (ostatní mezitím mohli něco zapsat)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.db && !$(".sheet")) { state.token = decapToken() || state.token; load(); }
  });

  // ================================================================
  // 14. Start
  // ================================================================
  if (state.token) { renderShell(); load(); } else renderLogin();
})();
