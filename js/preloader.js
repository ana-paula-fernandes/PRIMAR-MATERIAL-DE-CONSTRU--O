/* =========================================================
   PRIMAR — PRELOADER  (js/preloader.js)
   Carregar DEPOIS do GSAP e ANTES do main.js.
   Expõe  window.PrimarPreloader = { ready, done, timeline, config }
     ready → resolve quando as portas começam a abrir (o hero pode começar a entrar)
     done  → resolve quando o preloader foi removido do DOM
   ========================================================= */
(function () {
  "use strict";

  /* ---------- CONFIGURAÇÃO (tudo que costuma ser ajustado fica aqui) ---------- */
  const CONFIG = {
    speed: 1,                 // 1 = normal · 1.3 = 30% mais rápido · 0.8 = mais lento (também via data-speed no #preloader)
    logo: null,               // caminho do logo; null = usa o data-logo do #preloader
    text: "Construindo sua experiência...",
    steps: [0, 15, 32, 48, 67, 84, 100],   // porcentagens exibidas (visuais, não o carregamento real)
    hold: 0.35,               // s com o logo sozinho antes das portas abrirem (spec: 0,3–0,5)
    doorsDuration: 0.9,       // s das portas
    heroLead: 0.35,           // s após as portas começarem a abrir até liberar o hero
    maxExtraWait: 2.5,        // s extras que aguardamos a página carregar (barra fica em 84%)
    failsafe: 9,              // s: nunca prender o usuário
    staticShow: 0.8,          // s do logo estático no modo movimento reduzido
    /* marcas da linha do tempo, em segundos (a escala total é ajustada por "speed") */
    T: { line: 0.2, blueprint: 0.25, bricks: 0.7, wall: 1.2, trowel: 1.7, helmet: 2.0,
         converge: 2.3, logo: 2.7, logoFull: 3.2, glint: 3.5, text: 3.8, full: 4.2 }
  };

  const el = document.getElementById("preloader");
  let resolveReady, resolveDone;
  const ready = new Promise((r) => (resolveReady = r));
  const done = new Promise((r) => (resolveDone = r));
  const api = { ready, done, timeline: null, config: CONFIG };
  window.PrimarPreloader = api;
  if (!el) { resolveReady(); resolveDone(); return; }

  const q = (s) => el.querySelector(s);
  const qa = (s) => Array.from(el.querySelectorAll(s));
  const root = document.documentElement;
  let finished = false;

  const sp = parseFloat(el.dataset.speed);
  if (sp > 0) CONFIG.speed = sp;

  /* ---------- logo: a mesma imagem nas 3 camadas, sem nenhuma redistorção ---------- */
  const logoUrl = CONFIG.logo || el.dataset.logo;
  const logoEl = q(".pl-logo");
  const imgs = qa(".pl-logo img");
  imgs.forEach((i) => { i.src = logoUrl; });
  imgs[0].addEventListener("error", () => {
    console.warn("[Primar] Logo do preloader não encontrado em: " + logoUrl);
    logoEl.classList.add("is-missing");
  });
  q(".pl-text").textContent = CONFIG.text;

  function finish() {
    if (finished) return;
    finished = true;
    resolveReady();
    if (el.parentNode) el.parentNode.removeChild(el);
    root.classList.remove("pl-active");
    resolveDone();
  }

  /* ---------- movimento reduzido / sem GSAP: logo estático e liberação rápida ---------- */
  const osReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const forceMotion = /[?&]motion=on\b/.test(window.location.search);
  if ((osReduce && !forceMotion) || typeof gsap === "undefined") {
    el.classList.add("is-static");
    setTimeout(() => {
      resolveReady();
      el.classList.add("is-leaving");
      setTimeout(finish, 480);
    }, CONFIG.staticShow * 1000);
    return;
  }

  root.classList.add("pl-active");
  const T = CONFIG.T;
  const door = { l: q(".pl-door--l"), r: q(".pl-door--r") };
  const S = {   // elementos da cena
    bpGroup: q(".pl-bp"), bpPaths: qa(".pl-bp path"), grid: q(".pl-grid"),
    found: q(".pl-found"), bricks: qa(".pl-brick"), mortar: q(".pl-mortar"), wall: q(".pl-wall"),
    bucket: q(".pl-bucket"), stones: q(".pl-stones"), stoneBits: qa(".pl-stone"),
    trowel: q(".pl-trowel"), helmet: q(".pl-helmet"), scene: q(".pl-scene")
  };
  const L = {   // elementos do logo e do status
    box: logoEl, edge: q(".pl-logo__edge"), shine: q(".pl-logo__shine"),
    status: q(".pl-status"), text: q(".pl-text"), fill: q(".pl-bar__fill"), pct: q(".pl-pct"), bar: q(".pl-bar")
  };
  const visible = (n) => n && n.getClientRects().length > 0;   // elementos escondidos no mobile ficam de fora

  /* centro de cada grupo (antes de qualquer animação) → destino da convergência */
  const CENTER = { x: 240, y: 165 };   // centro do viewBox "0 60 480 210"
  const converging = [S.bpGroup, S.wall, S.bucket, S.stones, S.helmet, S.found].filter(visible).map((n) => {
    let dx = 0, dy = 0;
    try { const b = n.getBBox(); dx = CENTER.x - (b.x + b.width / 2); dy = CENTER.y - (b.y + b.height / 2); } catch (e) {}
    return { n, dx, dy };
  });

  /* estado inicial */
  gsap.set(S.bricks, { opacity: 0 });
  gsap.set(S.mortar, { scaleX: 0, svgOrigin: "124 137" });
  gsap.set(S.found, { transformOrigin: "50% 50%", scaleX: 0 });
  gsap.set(S.trowel, { opacity: 0, x: 96, y: 128, rotation: -7, svgOrigin: "0 0" });
  gsap.set(S.helmet, { opacity: 0 });
  gsap.set([S.bucket, S.stones], { opacity: 0 });
  gsap.set(L.box, { opacity: 0 });

  /* ======================= ETAPAS (cada uma recebe a timeline) ======================= */

  /* 1 — linha de fundação amarela que se expande */
  function stageLine(tl) {
    tl.to(S.found, { scaleX: 1, duration: 0.75, ease: "expo.out" }, T.line);
  }

  /* 2 — planta azul desenhada primeiro; depois esmaece enquanto os tijolos a preenchem */
  function stageBlueprint(tl) {
    tl.to(S.grid, { opacity: 1, duration: 0.9, ease: "power1.out" }, T.blueprint)
      .set(S.bpGroup, { opacity: 0.95 }, T.blueprint)
      .to(S.bpPaths, { strokeDashoffset: 0, duration: 0.55, ease: "power2.inOut", stagger: 0.03 }, T.blueprint)
      .to(S.bpGroup, { opacity: 0.28, duration: 0.7, ease: "power1.inOut" }, T.bricks + 0.15);
  }

  /* 3 — tijolo por tijolo (fileira de baixo para cima) */
  function stageBricks(tl) {
    tl.fromTo(S.bricks, { y: -24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.36, ease: "back.out(1.5)", stagger: 0.045 }, T.bricks);
  }

  /* 4 — balde + areia/pedras entram (a parede já está de pé em T.wall) */
  function stageSupplies(tl) {
    tl.fromTo(S.bucket, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, T.wall - 0.05)
      .fromTo(S.stones, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" }, T.wall + 0.1)
      .fromTo(S.stoneBits, { scale: 0.6, transformOrigin: "50% 100%" },
        { scale: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.05 }, T.wall + 0.1);
  }

  /* 5 — colher cruza a obra deixando uma faixa de argamassa */
  function stageTrowel(tl) {
    tl.to(S.trowel, { opacity: 1, duration: 0.12 }, T.trowel)
      .to(S.trowel, { x: 292, duration: 0.55, ease: "power2.inOut" }, T.trowel)
      .to(S.mortar, { scaleX: 1, duration: 0.55, ease: "power2.inOut" }, T.trowel + 0.08)
      .to(S.trowel, { opacity: 0, x: "+=18", duration: 0.22, ease: "power1.in" }, T.trowel + 0.5);
  }

  /* 6 — capacete amarelo "pousa" no topo da parede */
  function stageHelmet(tl) {
    tl.fromTo(S.helmet, { y: -38, opacity: 0, rotation: -10, transformOrigin: "50% 100%" },
      { y: 0, opacity: 1, rotation: 0, duration: 0.5, ease: "back.out(2.2)" }, T.helmet);
  }

  /* 7 — tudo converge para o centro (onde o logo nasce) */
  function stageConverge(tl) {
    converging.forEach((c, i) => {
      tl.to(c.n, { x: "+=" + c.dx, y: "+=" + c.dy, scale: 0.12, opacity: 0, transformOrigin: "50% 50%",
        duration: 0.55, ease: "power3.in" }, T.converge + i * 0.03);
    });
    tl.set(S.scene, { visibility: "hidden" }, T.converge + 0.75)
      .to(S.grid, { opacity: 0.35, duration: 0.5 }, T.converge + 0.2);
  }

  /* 8 — logo revelado por máscara: símbolo PM → PRI → PRIMAR → slogan, com brilho e varredura final */
  function stageLogo(tl) {
    const t0 = T.logo;
    tl.set(L.box, { opacity: 1 }, t0)
      .to(L.edge, { opacity: 1, duration: 0.12 }, t0)
      .to(L.box, { "--p": 31, duration: 0.24, ease: "power2.out" }, t0)            // símbolo PM
      .to(L.box, { "--p": 62, duration: 0.16, ease: "power1.inOut" }, t0 + 0.28)   // PRI
      .to(L.box, { "--p": 100, duration: 0.22, ease: "power2.out" }, t0 + 0.48)    // PRIMAR (cheio em ~T.logoFull)
      .to(L.edge, { opacity: 0, duration: 0.2 }, T.logoFull)
      .to(L.box, { "--q": 100, duration: 0.34, ease: "power2.out" }, T.logoFull + 0.05)   // slogan
      .set(L.shine, { opacity: 1 }, T.glint)
      .fromTo(L.box, { "--s": -30 }, { "--s": 135, duration: 0.7, ease: "power1.inOut" }, T.glint)
      .set(L.shine, { opacity: 0 }, T.glint + 0.72);
  }

  /* 9 — texto + barra amarelo/vermelho/azul + porcentagens acompanhando a sequência */
  function stageProgress(tl) {
    const steps = CONFIG.steps;
    const marks = [0.4, 0.9, 1.7, 2.3, 3.0, 3.7, T.full];     // instante em que cada porcentagem é atingida
    tl.to(L.status, { opacity: 1, duration: 0.4 }, marks[0]);
    for (let i = 1; i < steps.length; i++) {
      const a = marks[Math.min(i - 1, marks.length - 1)], b = marks[Math.min(i, marks.length - 1)];
      tl.to(L.fill, { "--b": steps[i], duration: b - a, ease: "power1.inOut" }, a)
        .call(() => { L.pct.textContent = steps[i] + "%"; }, null, b);
    }
    tl.to(L.text, { opacity: 1, duration: 0.3 }, T.text - 0.1);
  }

  /* espera a página terminar de carregar (no máximo maxExtraWait) antes de passar dos ~84% */
  function stageGate(tl) {
    tl.call(() => {
      if (document.readyState === "complete") return;
      tl.pause();
      let go = () => { go = () => {}; tl.resume(); };
      window.addEventListener("load", () => go(), { once: true });
      setTimeout(() => go(), CONFIG.maxExtraWait * 1000);
    }, null, 3.7);
  }

  /* 10 — texto e barra somem, logo segura ~hold, escala 1→1.03 e as portas abrem na vertical */
  function stageExit(tl) {
    const t = T.full + 0.02;
    const tDoors = t + 0.18 + CONFIG.hold;
    tl.to([L.text, L.bar, L.pct], { opacity: 0, y: 6, duration: 0.18, ease: "power1.in" }, t)
      .to(L.status, { opacity: 0, duration: 0.2 }, t + 0.05)
      .to(L.box, { scale: 1.03, duration: CONFIG.hold + 0.25, ease: "power1.inOut" }, tDoors - CONFIG.hold)
      .to(q(".pl-stage"), { opacity: 0, duration: 0.3, ease: "power1.in" }, tDoors + 0.08)
      .to(door.l, { xPercent: -100, duration: CONFIG.doorsDuration, ease: "expo.inOut" }, tDoors)
      .to(door.r, { xPercent: 100, duration: CONFIG.doorsDuration, ease: "expo.inOut" }, tDoors)
      .call(() => resolveReady(), null, tDoors + CONFIG.heroLead);
  }

  /* ======================= MONTAGEM ======================= */
  const tl = gsap.timeline({
    paused: true,
    defaults: { overwrite: false },
    onComplete: finish
  });
  api.timeline = tl;
  tl.timeScale(CONFIG.speed);

  [stageLine, stageBlueprint, stageBricks, stageSupplies, stageTrowel, stageHelmet,
   stageConverge, stageLogo, stageProgress, stageGate, stageExit].forEach((st) => st(tl));

  /* começa quando o logo estiver decodificado (ou em 600 ms, o que vier primeiro) */
  const decoded = imgs[0].decode ? imgs[0].decode().catch(() => {}) : Promise.resolve();
  Promise.race([decoded, new Promise((r) => setTimeout(r, 600))]).then(() => {
    if (!finished && !(new URLSearchParams(location.search).has("plpause"))) tl.play(0);
  });

  /* segurança: o preloader nunca prende o site */
  setTimeout(() => {
    if (finished) return;
    console.warn("[Primar] Preloader encerrado pelo limite de segurança.");
    tl.kill();
    finish();
  }, CONFIG.failsafe * 1000 / Math.min(1, CONFIG.speed) + CONFIG.maxExtraWait * 1000);
})();
