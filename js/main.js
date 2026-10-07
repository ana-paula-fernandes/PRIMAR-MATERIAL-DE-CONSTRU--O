/* =========================================================
   PRIMAR MATERIAL DE CONSTRUÇÃO — main.js
   GSAP + ScrollTrigger + ScrollSmoother + SplitText
   ========================================================= */

/* ---------------------------------------------------------
   CONFIGURAÇÃO EDITÁVEL
   Altere aqui telefones, mensagem do WhatsApp e horários.
   Horários vazios NÃO aparecem no site (mostra um aviso neutro).
   --------------------------------------------------------- */
const CONFIG = {
  phones: [
    { label: "(21) 98875-8043", tel: "+5521988758043", whatsapp: true },  // [WHATSAPP DO TELEFONE 1] — mude para false se não tiver WhatsApp
    { label: "(21) 98361-6914", tel: "+5521983616914", whatsapp: true }   // [WHATSAPP DO TELEFONE 2] — mude para false se não tiver WhatsApp
  ],
  whatsappMessage: "Olá! Vim pelo site da Primar e gostaria de consultar materiais.",
  // [HORÁRIO DE FUNCIONAMENTO] — preencha para exibir. Ex.: "07h às 18h"
  hours: {
    "Segunda a sexta": "",
    "Sábado": "",
    "Domingo": ""
  }
};

/* ---------------------------------------------------------
   Aplica a configuração no HTML
   --------------------------------------------------------- */
(function applyConfig() {
  const waDigits = (tel) => tel.replace(/\D/g, "");

  document.querySelectorAll("[data-phone]").forEach((el) => {
    const p = CONFIG.phones[+el.dataset.phone];
    if (p) el.setAttribute("href", "tel:" + p.tel);
  });
  document.querySelectorAll("[data-phone-label]").forEach((el) => {
    const p = CONFIG.phones[+el.dataset.phoneLabel];
    if (p) el.textContent = p.label;
  });
  document.querySelectorAll("[data-wa]").forEach((el) => {
    const p = CONFIG.phones[+el.dataset.wa];
    if (!p) return;
    if (!p.whatsapp) { el.setAttribute("href", "tel:" + p.tel); el.removeAttribute("target"); return; }
    const msg = el.dataset.waMsg || CONFIG.whatsappMessage;
    el.setAttribute("href", "https://wa.me/" + waDigits(p.tel).replace(/^(?!55)/, "55") + "?text=" + encodeURIComponent(msg));
  });

  const list = document.getElementById("hours-list");
  const fallback = document.getElementById("hours-fallback");
  let any = false;
  Object.entries(CONFIG.hours).forEach(([day, value]) => {
    if (!value || !value.trim()) return;
    any = true;
    const row = document.createElement("div");
    row.className = "hours__row";
    const dt = document.createElement("dt"); dt.textContent = day;
    const dd = document.createElement("dd"); dd.textContent = value;
    row.append(dt, dd);
    list.appendChild(row);
  });
  if (fallback) fallback.hidden = any;
})();

/* ---------------------------------------------------------
   ANIMAÇÕES — GSAP + ScrollTrigger + ScrollSmoother + SplitText
   Ordem dos scripts no HTML: gsap → ScrollTrigger → ScrollSmoother → SplitText → main.js
   --------------------------------------------------------- */
(function () {
  const root = document.documentElement;
  const pre = window.PrimarPreloader || { ready: Promise.resolve(), done: Promise.resolve() };   // js/preloader.js
  const header = document.getElementById("header");
  const osReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const forceMotion = /[?&]motion=on\b/.test(window.location.search);   // ?motion=on força as animações (útil para testes)
  const reduce = osReduce && !forceMotion;
  if (osReduce) {
    console.info(forceMotion
      ? "[Primar] O sistema pede 'reduzir movimento', mas ?motion=on está ativo: animações ligadas."
      : "[Primar] Animações desativadas: o sistema operacional está com 'reduzir movimento' ativo. Adicione ?motion=on ao endereço para testar as animações.");
  }
  let smoother = null;
  let started = false, preReady = false, released = false, heroTl = null, heroTitle = null, heroRevealed = false;

  /* Roda cada bloco isoladamente: se um falhar, o resto do site continua animado */
  const safe = (fn) => { try { fn(); } catch (err) { console.error("[Primar] erro em " + fn.name + ":", err); } };

  /* ---------- Navegação por âncora (com ou sem smoother) ---------- */
  function goTo(hash) {
    const target = document.querySelector(hash);
    if (!target) return;
    const dest = hash === "#sobre" ? (document.querySelector(".tabs-card") || target) : target;
    if (smoother) {
      if (hash === "#inicio") smoother.scrollTo(0, true);
      else smoother.scrollTo(dest, true, "top 92px");
    } else {
      dest.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

  /* ---------- Menu mobile (pausa o ScrollSmoother enquanto aberto) ---------- */
  const burger = document.getElementById("burger");
  const menu = document.getElementById("mobile-menu");
  let menuOpen = false;

  function setMenu(open) {
    if (open === menuOpen) return;
    menuOpen = open;
    burger.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));

    if (!window.gsap) {
      menu.style.visibility = open ? "visible" : "hidden";
      menu.style.clipPath = "none";
      return;
    }
    if (open) {
      menu.style.visibility = "visible";
      gsap.to(menu, { clipPath: "inset(0 0 0% 0)", duration: 0.8, ease: "power4.inOut", overwrite: true });
      gsap.fromTo(".mobile-menu nav a, .mobile-menu__foot > *", { y: 40, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.06, delay: 0.3, duration: 0.7, ease: "power3.out" });
      if (smoother) smoother.paused(true);
      else document.body.style.overflow = "hidden";
      header.classList.add("is-scrolled");
    } else {
      gsap.to(menu, { clipPath: "inset(0 0 100% 0)", duration: 0.6, ease: "power4.inOut", overwrite: true,
        onComplete: () => { menu.style.visibility = "hidden"; } });
      if (smoother) smoother.paused(false);
      else document.body.style.overflow = "";
      const y = smoother ? smoother.scrollTop() : window.scrollY;
      if (y < 60) header.classList.remove("is-scrolled");
    }
  }
  burger.addEventListener("click", () => setMenu(!menuOpen));
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-scroll]");
    if (!a) return;
    const hash = a.getAttribute("href");
    if (!hash || hash.charAt(0) !== "#" || !document.querySelector(hash)) return;
    e.preventDefault();
    if (menuOpen) { setMenu(false); setTimeout(() => goTo(hash), 140); }
    else goTo(hash);
  });

  /* ---------- Acessibilidade: sem GSAP ou com movimento reduzido → site estático e funcional ---------- */
  if (reduce || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    initTabsBasic();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);
  gsap.config({ nullTargetWarn: false });
  ScrollTrigger.config({ ignoreMobileResize: true });

  const fontsReady = Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((r) => setTimeout(r, 2500))
  ]);
  const heroImg = document.querySelector(".hero__img");
  const heroReady = heroImg && heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve();

  Promise.all([fontsReady, heroReady]).then(start);
  setTimeout(start, 5000);              // segurança: inicia mesmo se algo travar
  pre.ready.then(() => { preReady = true; tryRelease(); });   // portas do preloader começaram a abrir

  /* ---------- Inicialização ---------- */
  function start() {
    if (started) return;
    started = true;
    try { history.scrollRestoration = "manual"; } catch (e) {}
    window.scrollTo(0, 0);

    /* ScrollSmoother: wrapper + content (CSS .smooth-on cuida do layout fixo) */
    root.classList.add("smooth-on");
    try {
      smoother = ScrollSmoother.create({
        wrapper: "#smooth-wrapper",
        content: "#smooth-content",
        smooth: 1.4,
        effects: true,
        smoothTouch: 0.1
      });
    } catch (err) {
      console.error("[Primar] ScrollSmoother indisponível, usando rolagem nativa:", err);
      root.classList.remove("smooth-on");
      smoother = null;
    }

    if (smoother) smoother.paused(true);   // travado até o preloader liberar

    safe(buildHeader);
    safe(buildNavIndicator);
    safe(buildTabs);
    safe(buildHero);
    safe(buildReveals);
    safe(buildSections);

    window.addEventListener("load", () => ScrollTrigger.refresh());
    ScrollTrigger.refresh();
    tryRelease();
  }

  /* Libera o site quando (1) tudo foi construído e (2) o preloader começou a abrir as portas */
  function tryRelease() {
    if (!started || !preReady || released) return;
    released = true;
    heroRevealed = true;
    if (smoother) { smoother.scrollTo(0, false); smoother.paused(false); } else window.scrollTo(0, 0);
    if (heroTl) heroTl.play(0);
    if (heroTitle) heroTitle.play();
    ScrollTrigger.refresh();
  }

  /* ---------- Header fixo com fundo sólido ao rolar ---------- */
  function buildHeader() {
    ScrollTrigger.create({
      start: 60, end: "max",
      onToggle: (self) => { if (!menuOpen) header.classList.toggle("is-scrolled", self.isActive); }
    });
  }

  /* ---------- Indicador animado do menu + seção ativa ---------- */
  function buildNavIndicator() {
    const nav = document.querySelector(".nav");
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll("a[data-nav]"));
    const ind = nav.querySelector(".nav__indicator");
    const alias = { oferta: "vantagens", entrega: "vantagens", pagamento: "vantagens", cta: "localizacao" };
    let current = links[0];

    function move(a, instant) {
      if (!a || !nav.offsetParent) return;
      const n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
      gsap[instant ? "set" : "to"](ind, { x: r.left - n.left, width: r.width, duration: 0.6, ease: "power3.out", overwrite: true });
    }
    function setActive(id) {
      const a = links.find((l) => l.dataset.nav === (alias[id] || id));
      if (!a || a === current) return;
      current.classList.remove("is-active");
      a.classList.add("is-active");
      current = a;
      move(a);
    }
    document.querySelectorAll("[data-section]").forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec, start: "top 55%", end: "bottom 55%",
        onToggle: (self) => self.isActive && setActive(sec.dataset.section)
      });
    });
    move(current, true);
    window.addEventListener("resize", () => move(current, true));
    if (document.fonts) document.fonts.ready.then(() => move(current, true));
    ScrollTrigger.addEventListener("refresh", () => move(current, true));
  }

  /* ---------- Abas do card sobreposto ---------- */
  function initTabsBasic() {
    const el = document.querySelector("[data-tabs]");
    if (!el) return;
    const tabs = Array.from(el.querySelectorAll(".tab"));
    const panels = Array.from(el.querySelectorAll(".panel"));
    tabs.forEach((t, i) => t.addEventListener("click", () => {
      tabs.forEach((x, k) => { x.classList.toggle("is-active", k === i); x.setAttribute("aria-selected", String(k === i)); });
      panels.forEach((p, k) => p.classList.toggle("is-active", k === i));
    }));
  }

  function buildTabs() {
    const el = document.querySelector("[data-tabs]");
    if (!el) return;
    const tabs = Array.from(el.querySelectorAll(".tab"));
    const panels = Array.from(el.querySelectorAll(".panel"));
    let current = 0, hovering = false, visible = true, timer;

    function show(i) {
      if (i === current) return;
      const dir = i > current ? 1 : -1;
      const prev = panels[current], next = panels[i];
      tabs[current].classList.remove("is-active"); tabs[current].setAttribute("aria-selected", "false");
      tabs[i].classList.add("is-active"); tabs[i].setAttribute("aria-selected", "true");
      gsap.killTweensOf([next, next.querySelector("img"), next.querySelector("figcaption")]);
      panels.forEach((p) => p.classList.remove("is-leaving"));
      prev.classList.remove("is-active"); prev.classList.add("is-leaving");
      next.classList.add("is-active");
      gsap.fromTo(next, { clipPath: dir > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" },
        { clipPath: "inset(0 0 0 0%)", duration: 0.95, ease: "power4.inOut", onComplete: () => prev.classList.remove("is-leaving") });
      gsap.fromTo(next.querySelector("img"), { scale: 1.25, xPercent: 6 * dir }, { scale: 1, xPercent: 0, duration: 1.6, ease: "power3.out" });
      gsap.fromTo(next.querySelector("figcaption"), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, delay: 0.4, ease: "power3.out" });
      current = i;
    }
    function loop() {
      clearInterval(timer);
      timer = setInterval(() => { if (!hovering && visible && !document.hidden) show((current + 1) % panels.length); }, 6500);
    }
    tabs.forEach((t, i) => t.addEventListener("click", () => { show(i); loop(); }));
    el.addEventListener("mouseenter", () => (hovering = true));
    el.addEventListener("mouseleave", () => (hovering = false));
    ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (s) => (visible = s.isActive) });
    loop();
  }

  /* =========================================================
     HERO — saída do loader + entrada + parallax invertido
     ========================================================= */
  function buildHero() {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    heroTl = tl;

    // (o preloader já cuida da saída; esta timeline só começa quando ele libera o site)
    tl
      // Imagem do hero "expande" em zoom lento
      .from(".hero__img", { scale: 1.32, duration: 3.2, ease: "power3.out" }, 0)
      // Textos
      .from(".hero__text, .hero__loc", { y: 34, opacity: 0, duration: 1, stagger: 0.14 }, 0.65)
      .from(".hero__btns .btn", { y: 34, opacity: 0, duration: 0.9, stagger: 0.12, clearProps: "transform,opacity" }, 0.9)
      .from(".header", { yPercent: -100, opacity: 0, duration: 1 }, 0.6)
      .from(".tabs-card", { y: 120, opacity: 0, duration: 1.4, ease: "power4.out" }, 0.8)
      .from(".wa-float", { scale: 0, duration: 0.8, ease: "back.out(2)" }, 1.6)
      .call(() => { const u = document.querySelector(".hero .hl--u"); if (u) u.classList.add("is-in"); }, null, 1.1);

    // Título em linhas (SplitText com máscara). autoSplit refaz as linhas ao redimensionar a tela,
    // então o layout responsivo nunca quebra nas quebras de linha.
    SplitText.create(".hero__title", {
      type: "lines", mask: "lines", linesClass: "split-line", autoSplit: true,
      onSplit(self) {
        heroTitle = gsap.from(self.lines, { yPercent: 118, duration: 1.2, ease: "power4.out", stagger: 0.14, delay: 0.4, paused: !heroRevealed });
        return heroTitle;
      }
    });

    // Parallax invertido: ao rolar, a imagem desce mais devagar e dá zoom suave
    gsap.to(".hero__media", { yPercent: 9, scale: 1.12, ease: "none", force3D: true,
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero__content", { yPercent: -14, opacity: 0, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "75% top", scrub: true } });
  }

  /* =========================================================
     REVELAÇÕES GENÉRICAS (data-split, data-fade, cards, imagens…)
     ========================================================= */
  function buildReveals() {
    // Linhas subindo de dentro de uma máscara invisível
    document.querySelectorAll("[data-split]").forEach((el) => {
      SplitText.create(el, {
        type: "lines", mask: "lines", linesClass: "split-line", autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 118, duration: 1.15, ease: "power4.out", stagger: 0.12,
            scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none reverse" }
          });
        }
      });
    });

    // Fade-up suave
    gsap.utils.toArray("[data-fade]").forEach((el) => {
      gsap.from(el, {
        y: 46, opacity: 0, duration: 1, ease: "power3.out",
        clearProps: el.matches(".btn, .link") ? "transform" : "",
        scrollTrigger: { trigger: el, start: "top 91%", toggleActions: "play none none reverse" }
      });
    });

    // Listas em cascata
    gsap.utils.toArray("[data-stagger]").forEach((c) => {
      gsap.from(c.children, {
        y: 30, x: -14, opacity: 0, duration: 0.85, stagger: 0.1, ease: "power3.out",
        scrollTrigger: { trigger: c, start: "top 89%", toggleActions: "play none none reverse" }
      });
    });

    // Grades de cards
    gsap.utils.toArray("[data-cards]").forEach((c) => {
      gsap.from(c.children, {
        y: 90, opacity: 0, scale: 0.95, duration: 1.15, stagger: 0.14, ease: "power4.out",
        scrollTrigger: { trigger: c, start: "top 86%", toggleActions: "play none none reverse" }
      });
    });

    // Imagens: máscara + zoom + parallax interno
    gsap.utils.toArray(".img-reveal").forEach((box) => {
      const img = box.querySelector("img");
      const st = { trigger: box, start: "top 88%", toggleActions: "play none none reverse" };
      gsap.fromTo(box, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.4, ease: "power4.inOut", scrollTrigger: st });
      gsap.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 2, ease: "power3.out", scrollTrigger: st });
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: "none", force3D: true,
        scrollTrigger: { trigger: box, start: "top bottom", end: "bottom top", scrub: true } });
      const host = box.closest(".heavy__media, .delivery__media, .entulho__media, .location__media");
      if (host) gsap.fromTo(host, { "--sh": 0 }, { "--sh": 1, duration: 1.4, ease: "power2.out", scrollTrigger: st });
    });

    // Quadradinhos dos títulos
    gsap.utils.toArray(".title-block .square").forEach((sq) => {
      gsap.from(sq, { scaleX: 0, duration: 0.9, ease: "power4.out",
        scrollTrigger: { trigger: sq, start: "top 90%", toggleActions: "play none none reverse" } });
    });

    // Saída suave das seções (scrub)
    gsap.utils.toArray("[data-exit]").forEach((el) => {
      gsap.to(el, { opacity: 0.1, y: -70, scale: 0.985, ease: "none", transformOrigin: "50% 100%",
        scrollTrigger: { trigger: el, start: "bottom 36%", end: "bottom -4%", scrub: true } });
    });

    // Caixas de destaque abrem de dentro para fora
    gsap.utils.toArray("[data-reveal-box]").forEach((box) => {
      gsap.fromTo(box, { clipPath: "inset(7% 5% 7% 5% round 44px)" },
        { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
          scrollTrigger: { trigger: box, start: "top 96%", end: "top 28%", scrub: true } });
    });
  }

  /* =========================================================
     SEÇÕES ESPECÍFICAS
     ========================================================= */
  function buildSections() {
    sketchArrows();
    stickers();
    stepNumbers();
    priceTagAndMarquee();
    introBricks();
    hammer();

    gsap.from(".footer__grid > *", { y: 50, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ".footer", start: "top 88%", toggleActions: "play none none reverse" } });
  }

  /* ----- Materiais pesados: croqui desenhado (strokeDashoffset) ----- */
  function sketchArrows() {
    const media = document.querySelector(".heavy__media");
    if (!media) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: media, start: "top 70%", toggleActions: "play none none reverse" } });
    tl.from(".note--a", { y: 20, opacity: 0, rotation: -6, duration: 0.7, ease: "back.out(2)" }, 0.4);

    const paths = gsap.utils.toArray(".note-path");
    paths.forEach((p, i) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      const pair = Math.floor(i / 2);               // cada seta = corpo + ponta
      const isHead = i % 2 === 1;
      tl.to(p, { strokeDashoffset: 0, duration: isHead ? 0.25 : 0.8, ease: isHead ? "power2.out" : "power2.inOut" },
        0.7 + pair * 0.9 + (isHead ? 0.8 : 0));
    });
    tl.from(".note--b", { y: 20, opacity: 0, rotation: 6, duration: 0.7, ease: "back.out(2)" }, 1.5)
      .from(".note--c", { x: -20, opacity: 0, duration: 0.7, ease: "power3.out" }, 2.2);
  }

  /* ----- Stickers: surgem em mola e ficam balançando (rotação + eixo Y) ----- */
  function stickers() {
    gsap.utils.toArray(".sticker").forEach((s, i) => {
      const rest = i % 2 ? 9 : -9;
      gsap.set(s, { transformPerspective: 700 });
      gsap.fromTo(s, { scale: 0, rotation: -70 }, {
        scale: 1, rotation: rest, duration: 1.6, ease: "elastic.out(1, 0.5)",
        scrollTrigger: { trigger: s, start: "top 94%", once: true },
        onComplete: () => {
          // balanço infinito leve
          gsap.to(s, { rotation: rest + 5, rotationY: 16, y: -8, duration: 2.6 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
        }
      });
    });
  }

  /* ----- Cards numerados: números sobem + parallax com scrub ----- */
  function stepNumbers() {
    gsap.utils.toArray(".step").forEach((step) => {
      const num = step.querySelector(".step__num");
      const trig = { trigger: step, start: "top 82%", toggleActions: "play none none reverse" };
      gsap.from(num, { y: 90, opacity: 0, duration: 1.3, ease: "power4.out", delay: 0.2, scrollTrigger: trig });
      gsap.from(step.querySelector(".step__title"), { y: 30, opacity: 0, duration: 0.9, ease: "power3.out", delay: 0.45, scrollTrigger: trig });
      gsap.from(step.querySelector(".step__body"), { y: 40, opacity: 0, duration: 1, ease: "power3.out", delay: 0.55, scrollTrigger: trig });
      gsap.fromTo(num, { yPercent: 0 }, { yPercent: -18, ease: "none", force3D: true,
        scrollTrigger: { trigger: step, start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  /* ----- Oferta: etiqueta cai pendurada + faixa que acelera com o scroll ----- */
  function priceTagAndMarquee() {
    const tag = document.querySelector(".price-tag");
    if (tag) {
      // âncora no ponto do cordão (acima da etiqueta) para o balanço girar por ali
      gsap.set(tag, { transformOrigin: "50% -70px", transformPerspective: 900 });
      const fall = gsap.timeline({
        scrollTrigger: { trigger: ".offer__visual", start: "top 78%", once: true },
        onComplete: () => gsap.to(tag, { rotation: 4, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1 })
      });
      fall
        .fromTo(tag, { y: -320, opacity: 0, rotation: 30 }, { y: 0, opacity: 1, duration: 1.1, ease: "bounce.out" }, 0)   // gravidade
        .to(tag, { rotation: 7, duration: 2.4, ease: "elastic.out(1, 0.3)" }, 0.35);                                       // balanço amortecido
    }

    const track = document.querySelector(".marquee__track");
    if (track) {
      const loop = gsap.to(track, { xPercent: -50, duration: 30, ease: "none", repeat: -1 });
      let boost = 0, eased = 0;
      ScrollTrigger.create({
        start: 0, end: "max",
        onUpdate: (self) => { boost = Math.min(Math.abs(self.getVelocity()) / 350, 6); }
      });
      // suaviza a aceleração e volta devagar à velocidade normal (um único ticker, sem criar tweens a cada scroll)
      gsap.ticker.add(() => {
        boost *= 0.94;
        eased += (boost - eased) * 0.12;
        loop.timeScale(1 + eased);
      });
    }
  }

  /* ----- Tijolos em traço: caem e se empilham ----- */
  function introBricks() {
    const bricks = gsap.utils.toArray(".intro__bricks .brick");
    if (!bricks.length) return;
    gsap.from(bricks, { y: -140, opacity: 0, rotation: () => gsap.utils.random(-12, 12), duration: 1.1, ease: "bounce.out",
      stagger: { each: 0.12, from: "start" },
      scrollTrigger: { trigger: ".intro", start: "top 25%", toggleActions: "play none none reverse" } });
  }

  /* ----- Diferenciais: martelo faz uma martelada em arco ----- */
  function hammer() {
    const h = document.querySelector(".perks__hammer");
    if (!h) return;
    gsap.set(h, { transformOrigin: "50% 92%" });
    const tl = gsap.timeline({ scrollTrigger: { trigger: ".perks", start: "top 55%", once: true } });
    tl.from(h, { xPercent: 40, yPercent: 20, rotation: -60, opacity: 0, duration: 0.8, ease: "power3.out" })   // entra levantado
      .to(h, { rotation: 9, duration: 0.22, ease: "power4.in" })                                              // martelada
      .to(".perk__icon", { scale: 1.14, duration: 0.12, yoyo: true, repeat: 1, stagger: 0.05, ease: "power1.out" }, "<0.18") // impacto
      .to(h, { rotation: 0, duration: 1.2, ease: "elastic.out(1, 0.35)" });                                   // rebote
  }
})();
