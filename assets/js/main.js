/* =================================================================
   LUMIÈRE — interaction layer
   Progressive enhancement: site works with JS off (Czech default).
   ================================================================= */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Language (CZ / EN) ---------- */
  var LANG_KEY = "lumiere-lang";
  function setLang(lang) {
    if (lang !== "cs" && lang !== "en") lang = "cs";
    root.setAttribute("lang", lang);
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    // Toggle buttons state
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-set-lang") === lang));
    });
    // Localised <title>
    var body = document.body;
    var t = body.getAttribute("data-title-" + lang);
    if (t) document.title = t;
    // Localised meta description
    var md = document.querySelector('meta[name="description"]');
    var d = body.getAttribute("data-desc-" + lang);
    if (md && d) md.setAttribute("content", d);
    // Localised placeholders
    document.querySelectorAll("[data-ph-" + lang + "]").forEach(function (el) {
      el.setAttribute("placeholder", el.getAttribute("data-ph-" + lang));
    });
    // Localised aria-labels
    document.querySelectorAll("[data-aria-" + lang + "]").forEach(function (el) {
      el.setAttribute("aria-label", el.getAttribute("data-aria-" + lang));
    });
  }
  var stored = "cs";
  try { stored = localStorage.getItem(LANG_KEY) || "cs"; } catch (e) {}
  setLang(stored);
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-set-lang]");
    if (!btn) return;
    setLang(btn.getAttribute("data-set-lang"));
  });

  /* ---------- 2. Header shrink on scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 24) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- 3. Mobile drawer ---------- */
  var burger = document.querySelector(".burger");
  var drawer = document.querySelector(".drawer");
  function openMenu() {
    document.body.classList.add("menu-open");
    if (burger) burger.setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    document.body.classList.remove("menu-open");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }
  if (burger) burger.addEventListener("click", function () {
    document.body.classList.contains("menu-open") ? closeMenu() : openMenu();
  });
  if (drawer) {
    drawer.addEventListener("click", function (e) {
      if (e.target.closest(".drawer-scrim") || e.target.closest(".drawer-link") || e.target.closest("[data-close-menu]")) closeMenu();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------- 4. Scroll reveal ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 5. Before / After sliders ---------- */
  document.querySelectorAll(".ba").forEach(function (ba) {
    var afterWrap = ba.querySelector(".after-wrap");
    var handle = ba.querySelector(".handle");
    var range = ba.querySelector('input[type="range"]');
    function apply(v) {
      var p = Math.max(0, Math.min(100, v));
      // Reveal the "after" image to the right of the handle
      if (afterWrap) afterWrap.style.clipPath = "inset(0 0 0 " + p + "%)";
      if (handle) handle.style.left = p + "%";
    }
    if (range) {
      apply(range.value);
      range.addEventListener("input", function () { apply(range.value); });
    }
  });

  /* ---------- 6. Gallery filters ---------- */
  var filterBar = document.querySelector(".filters");
  if (filterBar) {
    var shots = document.querySelectorAll(".masonry .shot");
    filterBar.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      filterBar.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
      chip.setAttribute("aria-pressed", "true");
      var f = chip.getAttribute("data-filter");
      shots.forEach(function (s) {
        var show = f === "all" || s.getAttribute("data-cat") === f;
        s.style.display = show ? "" : "none";
      });
    });
  }

  /* ---------- 7. Toast helper ---------- */
  var toast = document.querySelector(".toast");
  var toastTimer;
  function showToast(msg) {
    if (!toast) return;
    var span = toast.querySelector("[data-toast-text]");
    if (span && msg) span.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 4000);
  }

  /* ---------- 8. Booking / contact form ---------- */
  var form = document.querySelector("form[data-booking]");
  if (form) {
    var fields = form.querySelectorAll("input[required], select[required], textarea[required]");
    function validateField(el) {
      var wrap = el.closest(".field");
      var ok = el.checkValidity();
      if (wrap) wrap.classList.toggle("invalid", !ok);
      return ok;
    }
    fields.forEach(function (el) {
      el.addEventListener("blur", function () { validateField(el); });
      el.addEventListener("input", function () {
        var wrap = el.closest(".field");
        if (wrap && wrap.classList.contains("invalid")) validateField(el);
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstInvalid = null;
      fields.forEach(function (el) {
        var ok = validateField(el);
        if (!ok && !firstInvalid) firstInvalid = el;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        return;
      }
      // Simulated async submit (wire to Formspree / Reservio / backend here)
      var submitBtn = form.querySelector('[type="submit"]');
      var labelCs = submitBtn ? submitBtn.getAttribute("data-loading-cs") : null;
      var labelEn = submitBtn ? submitBtn.getAttribute("data-loading-en") : null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.orig = submitBtn.innerHTML;
        submitBtn.textContent = (root.getAttribute("lang") === "en" ? labelEn : labelCs) || "…";
      }
      setTimeout(function () {
        var success = form.parentElement.querySelector(".form-success");
        if (success) {
          form.style.display = "none";
          success.classList.add("show");
          success.setAttribute("tabindex", "-1");
          success.focus();
        }
        showToast(root.getAttribute("lang") === "en" ? "Request sent — we’ll be in touch soon." : "Odesláno — brzy se vám ozveme.");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = submitBtn.dataset.orig; }
      }, 1100);
    });
  }

  /* ---------- 9. Price formatting (Kč) ---------- */
  function fmtCZK(n) {
    return new Intl.NumberFormat("cs-CZ").format(Math.round(n)) + " Kč";
  }
  // Compute total = grams × rate for every element carrying both (static usages)
  function computeTotals(scope) {
    (scope || document).querySelectorAll("[data-grams][data-rate]").forEach(function (el) {
      var grams = parseFloat(el.getAttribute("data-grams"));
      var rate = parseFloat(el.getAttribute("data-rate"));
      if (isNaN(grams) || isNaN(rate)) return;
      var total = grams * rate;
      var totalEl = el.querySelector("[data-total]");
      if (totalEl) totalEl.textContent = fmtCZK(total);
      el.setAttribute("data-total-value", total);
    });
  }
  computeTotals();

  /* ---------- 9b. Site-wide data (data/site.json) ----------
     Powers phone/e-mail/instagram/location text so a single edit
     (via the admin CMS or by hand) updates every page that uses it.
     Elements opt in with data-site="key" (text) or data-site-href="key" (link). */
  (function () {
    var textEls = document.querySelectorAll("[data-site]");
    var hrefEls = document.querySelectorAll("[data-site-href]");
    if (!textEls.length && !hrefEls.length) return;
    fetch("data/site.json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (site) {
        if (!site) return;
        var hrefFor = {
          wa_link: "https://wa.me/" + site.telefon_whatsapp,
          mailto_link: "mailto:" + site.email,
          instagram_link: site.instagram_url,
          facebook_link: site.facebook_url
        };
        textEls.forEach(function (el) {
          var key = el.getAttribute("data-site");
          if (site[key] != null) el.textContent = site[key];
        });
        hrefEls.forEach(function (el) {
          var key = el.getAttribute("data-site-href");
          if (hrefFor[key]) el.setAttribute("href", hrefFor[key]);
        });
      })
      .catch(function () { /* keep static fallback text already in the HTML */ });
  })();

  /* ---------- 10. Product catalog (data/products.json) ----------
     Renders both the full catalog grid (sortiment.html) and the
     homepage's featured picks from one shared data source, so adding
     a piece in the admin shows up everywhere automatically. */
  var catalogEl = document.querySelector("[data-catalog]");
  var featuredEl = document.querySelector("[data-featured]");
  if (catalogEl || featuredEl) {
    fetch("data/products.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var produkty = (data && data.produkty) || [];
        if (catalogEl) renderCatalog(catalogEl, produkty);
        if (featuredEl) renderFeatured(featuredEl, produkty);
      })
      .catch(function () {
        if (catalogEl) catalogEl.innerHTML = '<p class="form-note">Sortiment se nepodařilo načíst. Zkuste stránku obnovit.</p>';
      });
  }

  function svgIcon(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"/></svg>';
  }
  var ARROW = "M5 12h14M13 6l6 6-6 6";

  function renderCatalog(container, produkty) {
    container.innerHTML = produkty.map(function (p) {
      var sold = p.stav === "sold";
      return (
        '<button type="button" class="product' + (sold ? " sold" : "") + '" data-status="' + p.stav + '" data-num="' + p.cislo + '" data-shade="' + p.odstin + '" data-shade-label="' + p.odstin + '" data-length="' + p.delka_cm + '" data-length-label="' + p.delka_label + '" data-grams="' + p.gramaz + '" data-rate="' + p.cena_g + '" data-img="' + p.foto + '">' +
          '<div class="media"><img src="' + p.foto + '" width="600" height="750" alt="' + p.foto_alt + '" loading="lazy"><span class="num">' + p.cislo + '</span><span class="status ' + (sold ? "out" : "in") + '">' + (sold ? "Prodáno" : "Skladem") + '</span></div>' +
          '<div class="body"><h3>' + p.odstin + ' · ' + p.delka_label + ' cm</h3>' +
            '<div class="specs"><div class="row"><span>Odstín</span><span>' + p.odstin + '</span></div><div class="row"><span>Délka</span><span>' + p.delka_label + ' cm</span></div><div class="row"><span>Gramáž</span><span>' + p.gramaz + ' g</span></div><div class="row"><span>Cena / gram</span><span>' + p.cena_g + ' Kč</span></div></div>' +
            '<div class="price"><div><div class="rate">Celková cena</div><div class="total" data-total>—</div></div><span class="view-hint">Detail ' + svgIcon(ARROW) + '</span></div>' +
          '</div>' +
        '</button>'
      );
    }).join("");
    computeTotals(container);
    initCatalogFilters(container);
  }

  function renderFeatured(container, produkty) {
    var picks = produkty.filter(function (p) { return p.vyber_domu && p.stav === "in"; }).slice(0, 3);
    container.innerHTML = picks.map(function (p, i) {
      return (
        '<a href="sortiment.html" class="product reveal" data-delay="' + i + '" data-grams="' + p.gramaz + '" data-rate="' + p.cena_g + '">' +
          '<div class="media"><img src="' + p.foto + '" width="600" height="750" alt="' + p.foto_alt + '" loading="lazy"><span class="num">' + p.cislo + '</span><span class="status in">Skladem</span></div>' +
          '<div class="body"><h3>' + p.odstin + ' · ' + p.delka_label + ' cm</h3>' +
            '<div class="specs"><div class="row"><span>Gramáž</span><span>' + p.gramaz + ' g</span></div><div class="row"><span>Cena / gram</span><span>' + p.cena_g + ' Kč</span></div></div>' +
            '<div class="price"><div><div class="rate">Celková cena</div><div class="total" data-total>—</div></div><span class="view-hint">Sortiment ' + svgIcon(ARROW) + '</span></div>' +
          '</div>' +
        '</a>'
      );
    }).join("");
    computeTotals(container);
    if (!reduceMotion && "IntersectionObserver" in window) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io2.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      container.querySelectorAll(".reveal").forEach(function (el) { io2.observe(el); });
    } else {
      container.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
    }
  }

  /* ---------- 10b. Catalog filters + sold toggle ---------- */
  function initCatalogFilters(container) {
    var fLength = document.getElementById("f-length");
    var fShade = document.getElementById("f-shade");
    var fWeight = document.getElementById("f-weight");
    var fSold = document.getElementById("f-sold");
    var countEl = document.querySelector("[data-catalog-count]");
    var emptyEl = document.querySelector(".catalog-empty");

    function inLengthBand(val, band) {
      if (band === "all") return true;
      var lo = parseInt(val, 10);
      if (band === "30-45") return lo >= 30 && lo <= 45;
      if (band === "46-60") return lo >= 46 && lo <= 60;
      if (band === "61-75") return lo >= 61 && lo <= 75;
      if (band === "76-90") return lo >= 76;
      return true;
    }
    function inWeightBand(g, band) {
      if (band === "all") return true;
      if (band === "lt100") return g < 100;
      if (band === "100-120") return g >= 100 && g <= 120;
      if (band === "gt120") return g > 120;
      return true;
    }
    function applyFilters() {
      var lb = fLength ? fLength.value : "all";
      var sb = fShade ? fShade.value : "all";
      var wb = fWeight ? fWeight.value : "all";
      var showSold = fSold ? fSold.checked : false;
      var visible = 0;
      container.querySelectorAll(".product").forEach(function (p) {
        var sold = p.getAttribute("data-status") === "sold";
        var ok = true;
        if (sold && !showSold) ok = false;
        if (ok && !inLengthBand(p.getAttribute("data-length"), lb)) ok = false;
        if (ok && sb !== "all" && p.getAttribute("data-shade") !== sb) ok = false;
        if (ok && !inWeightBand(parseFloat(p.getAttribute("data-grams")), wb)) ok = false;
        p.style.display = ok ? "" : "none";
        if (ok) visible++;
      });
      if (countEl) countEl.innerHTML = "<strong>" + visible + "</strong> " + (visible === 1 ? "kus" : (visible >= 2 && visible <= 4 ? "kusy" : "kusů"));
      if (emptyEl) emptyEl.classList.toggle("show", visible === 0);
    }
    [fLength, fShade, fWeight].forEach(function (s) { if (s) s.addEventListener("change", applyFilters); });
    if (fSold) fSold.addEventListener("change", applyFilters);
    applyFilters();
  }

  /* ---------- 11. Product detail modal (event delegation — works for
     dynamically rendered cards without re-binding listeners) ---------- */
  var modal = document.querySelector("[data-modal]");
  if (modal) {
    var lastFocused = null;
    function openModal(p) {
      lastFocused = document.activeElement;
      modal.querySelector("[data-m-img]").src = p.getAttribute("data-img") || "";
      modal.querySelector("[data-m-img]").alt = "Vlasy " + (p.getAttribute("data-num") || "");
      modal.querySelector("[data-m-title]").textContent = p.getAttribute("data-num") || "";
      modal.querySelector("[data-m-shade]").textContent = p.getAttribute("data-shade-label") || "";
      modal.querySelector("[data-m-length]").textContent = (p.getAttribute("data-length-label") || "") + " cm";
      modal.querySelector("[data-m-grams]").textContent = p.getAttribute("data-grams") + " g";
      modal.querySelector("[data-m-rate]").textContent = p.getAttribute("data-rate") + " Kč/g";
      modal.querySelector("[data-m-total]").textContent = fmtCZK(parseFloat(p.getAttribute("data-grams")) * parseFloat(p.getAttribute("data-rate")));
      var sold = p.getAttribute("data-status") === "sold";
      var statusEl = modal.querySelector("[data-m-status]");
      statusEl.textContent = sold ? "Prodáno" : "Skladem";
      statusEl.className = "status-badge " + (sold ? "out" : "in");
      var cta = modal.querySelector("[data-m-cta]");
      cta.href = "kontakt.html?kus=" + encodeURIComponent(p.getAttribute("data-num") || "") + "#poptavka";
      cta.style.display = sold ? "none" : "";
      modal.querySelector("[data-m-soldnote]").style.display = sold ? "" : "none";
      document.body.classList.add("modal-open");
      var closeBtn = modal.querySelector(".modal-close");
      if (closeBtn) closeBtn.focus();
    }
    function closeModal() {
      document.body.classList.remove("modal-open");
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }
    document.addEventListener("click", function (e) {
      var p = e.target.closest(".product[data-num]");
      if (p && p.tagName === "BUTTON") { openModal(p); return; }
      if (e.target.closest("[data-modal-close]") || e.target.classList.contains("modal-scrim")) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("modal-open")) closeModal();
    });
  }

  /* ---------- 12. Prefill inquiry from ?kus= ---------- */
  (function () {
    var params = new URLSearchParams(window.location.search);
    var kus = params.get("kus");
    if (!kus) return;
    var msg = document.querySelector('form[data-booking] textarea[name="message"]');
    if (msg && !msg.value) msg.value = "Mám zájem o konkrétní kus: " + kus + ". Prosím o více informací a dostupnost.";
    var subj = document.querySelector('form[data-booking] [name="subject"]');
    if (subj) subj.value = "Poptávka kusu " + kus;
  })();

  /* ---------- 13. Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (yr) {
    yr.textContent = new Date().getFullYear();
  });
})();
