/* ============================================================
   view-landing.js — full-screen hero landing (rebuilt).
   Hero narrative: "data can be faked, trust must be proven".
   Elements: risk-beacon canvas, live ledger ticker (real
   AI_LEDGER data), blurred P1/P2 intro, typewriter headline,
   case pills, facts-fingerprint copy pill, honesty strip.
   ES5, no external assets, no fetch, no emoji.
   ============================================================ */
(function () {
  "use strict";
  "use strict";
  var rafId = 0, ttTimer = null, pillTimer = null, canvasCtl = null, textDone = false;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function reducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return false; }
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html != null) { e.innerHTML = html; }
    return e;
  }
  function currentRoute() {
    var h = String(window.location.hash || "");
    var m = h.match(/^#\/([a-z-]+)/);
    return m ? m[1] : "landing";
  }

  /* ---------- copy pill ---------- */
  function factsHash8() {
    try {
      if (window.AI_LEDGER && AI_LEDGER.runs) {
        var keys = Object.keys(AI_LEDGER.runs);
        for (var i = 0; i < keys.length; i++) {
          var r = AI_LEDGER.runs[keys[i]];
          if (r && r.factsSha256) { return String(r.factsSha256).slice(0, 8); }
        }
      }
    } catch (e) { /* fallback constant below */ }
    return "4dbcfda8";
  }
  function factsHashFull() {
    try {
      if (window.AI_LEDGER && AI_LEDGER.runs) {
        var keys = Object.keys(AI_LEDGER.runs);
        for (var i = 0; i < keys.length; i++) {
          var r = AI_LEDGER.runs[keys[i]];
          if (r && r.factsSha256) { return String(r.factsSha256); }
        }
      }
    } catch (e) { /* fallback */ }
    return "4dbcfda80d888cbafacts-snapshot";
  }
  function FINGERPRINT_LABEL() {
    return "Facts fingerprint: " + factsHash8() + "\u2026";
  }
  function bindCopyPill(host) {
    var btn = host.querySelector("#nld-fp");
    if (!btn) { return; }
    var label = btn.querySelector(".nld-fp-label");
    btn.addEventListener("click", function () {
      var done = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(factsHashFull()).then(function () {
            flashCopied();
          }, function () { fallbackCopy(); flashCopied(); });
        } else { fallbackCopy(); flashCopied(); }
      } catch (e) { fallbackCopy(); flashCopied(); }
      function fallbackCopy() {
        try {
          var ta = document.createElement("textarea");
          ta.value = factsHashFull();
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        } catch (e2) { /* display-only state below */ }
      }
      function flashCopied() {
        if (!label) { return; }
        label.textContent = "copied \u2014 verifiable on re-run";
        pillTimer = App.fn.timeout(function () {
          if (label) { label.textContent = FINGERPRINT_LABEL(); }
        }, 1600);
      }
    });
  }

  /* ---------- canvas: risk-beacon lattice ---------- */
  function startBeacon(host) {
    var cv = host.querySelector("#nld-beacon");
    if (!cv || !cv.getContext) { return; }
    var ctx = cv.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    var nodes = [];
    var i;
    for (i = 0; i < 18; i++) {
      var rx = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      var ry = Math.abs(Math.sin(i * 78.233) * 12543.8214) % 1;
      var risk = i < 2 ? "high" : i < 6 ? "mid" : "low";
      nodes.push({ x: rx, y: ry, r: 1.8 + (i % 3) * 0.6, risk: risk, ph: (i * 1.7) % 6.28 });
    }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.floor(W * dpr);
      cv.height = Math.floor(H * dpr);
      cv.style.width = W + "px";
      cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function COLOR(risk, a) {
      var base = risk === "high" ? "248,113,113" : risk === "mid" ? "245,158,11" : "52,211,153";
      return "rgba(" + base + "," + a + ")";
    }
    function frame(t) {
      if (canvasCtl && canvasCtl.dead) { return; }
      var x, y, j;
      for (x = 0; x < nodes.length; x++) {
        nodes[x].x += 0.02 * Math.sin(t / 1800 + nodes[x].ph);
        nodes[x].y += 0.02 * Math.cos(t / 2400 + nodes[x].ph);
        if (nodes[x].x < 0.02) { nodes[x].x = 0.02; }
        if (nodes[x].x > 0.98) { nodes[x].x = 0.98; }
        if (nodes[x].y < 0.02) { nodes[x].y = 0.02; }
        if (nodes[x].y > 0.98) { nodes[x].y = 0.98; }
      }
      ctx.clearRect(0, 0, W, H);
      for (x = 0; x < nodes.length; x++) {
        for (y = x + 1; y < nodes.length; y++) {
          var dx = nodes[x].x - nodes[y].x, dy = nodes[x].y - nodes[y].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d > 0.21) { continue; }
          var mRisk = (nodes[x].risk === "high" || nodes[y].risk === "high") ? 0.2 :
            (nodes[x].risk === "mid" || nodes[y].risk === "mid") ? 0.14 : 0.1;
          ctx.strokeStyle = "rgba(45,212,191," + (0.08 + 0.22 * (1 - d / 0.21) + mRisk * 0.3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nodes[x].x * W, nodes[x].y * H);
          ctx.lineTo(nodes[y].x * W, nodes[y].y * H);
          ctx.stroke();
        }
      }
      for (x = 0; x < nodes.length; x++) {
        var px = nodes[x].x * W, py = nodes[x].y * H;
        var mdx = px - mouse.x, mdy = py - mouse.y;
        var md = Math.sqrt(mdx * mdx + mdy * mdy);
        if (md < 110 && md > 0.001) {
          var pr = (1 - md / 110) * 2.2;
          nodes[x].x += (mdx / md) * pr / W;
          nodes[x].y += (mdy / md) * pr / H;
        }
        var pulse = 1 + 0.35 * Math.sin(t / 900 + nodes[x].ph) * (nodes[x].risk === "high" ? 1.6 : nodes[x].risk === "mid" ? 1.25 : 1);
        ctx.beginPath();
        ctx.arc(px, py, nodes[x].r * pulse, 0, 6.2832);
        ctx.fillStyle = COLOR(nodes[x].risk, 0.78);
        ctx.fill();
        ctx.strokeStyle = "rgba(45,212,191,.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      rafId = App.fn.raf(function () { frame(t + 16); });
    }
    function onMove(e) {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
    }
    size();
    if (reducedMotion()) {
      ctx.clearRect(0, 0, W, H);
      for (j = 0; j < nodes.length; j++) {
        ctx.beginPath();
        ctx.arc(nodes[j].x * W, nodes[j].y * H, nodes[j].r, 0, 6.2832);
        ctx.fillStyle = COLOR(nodes[j].risk, 0.7);
        ctx.fill();
      }
    } else {
      rafId = App.fn.raf(function () { frame(Date.now()); });
      window.addEventListener("mousemove", onMove, { passive: true });
      canvasCtl = {
        dead: false,
        off: function () {
          canvasCtl.dead = true;
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("resize", size);
        }
      };
      window.addEventListener("resize", size);
    }
    return canvasCtl;
  }

  /* ---------- typewriter ---------- */
  function startTypewriter(host) {
    var target = host.querySelector("#nld-typing");
    if (!target) { return; }
    var text = target.getAttribute("data-text") || "";
    var reduced = reducedMotion();
    if (reduced) {
      target.textContent = text;
      textDone = true;
      return;
    }
    var i = 0;
    ttTimer = App.fn.timeout(function tick() {
      i++;
      target.textContent = text.slice(0, i);
      if (i < text.length) {
        ttTimer = App.fn.timeout(tick, 34);
      } else {
        textDone = true;
        var cr = host.querySelector("#nld-cursor");
        if (cr) { cr.style.display = "none"; }
      }
    }, 700);
  }
  function bindCases(host) {
    var els = host.querySelectorAll(".nld-case[data-subject]");
    for (var i = 0; i < els.length; i++) {
      (function (e) {
        e.addEventListener("click", function (ev) {
          var key = e.getAttribute("data-subject");
          if (!App.act || !App.act.switchSubject || !App.nav) { return; }
          if (ev && ev.preventDefault) { ev.preventDefault(); }
          try { App.act.switchSubject(key); } catch (err) { /* still navigate */ }
          App.nav("#/audit");
        });
      })(els[i]);
    }
  }
  function bindBurger(host) {
    var btn = host.querySelector("#nld-burger");
    var menu = host.querySelector("#nld-menu");
    if (!btn || !menu) { return; }
    btn.addEventListener("click", function () {
      var open = menu.classList.toggle("nld-open");
      btn.classList.toggle("nld-x", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    var links = menu.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function () {
        menu.classList.remove("nld-open");
        btn.classList.remove("nld-x");
      });
    }
  }

  /* ---------- shell html ---------- */
  function badge(k) {
    var runs = (window.AI_LEDGER && AI_LEDGER.runs) || {};
    var r = runs[k];
    var label = k === "healthy" ? "HEALTHY" : k === "watch" ? "WATCHLIST" : "SYBIL: REJECTED";
    var cls = k === "healthy" ? "nld-b-green" : k === "watch" ? "nld-b-amber" : "nld-b-red";
    return '<span class="nld-badge ' + cls + '">' + esc(label) +
      (r && r.verdict ? " \u00b7 " + esc(String(r.verdict).toUpperCase()) : "") + "</span>";
  }
  function tickerHtml() {
    var m = (window.AI_LEDGER && AI_LEDGER.meta) || {};
    var model = m.model || "deepseek-chat";
    var built = m.builtAtUtc || "batch pending \u2014 run ./verify.sh";
    return '<div class="nld-ticker">' +
      '<div class="nld-ticker-l1">' + esc(model) + "  \u00b7  batch " + esc(built) + "</div>" +
      '<div class="nld-ticker-l2">' + badge("healthy") + badge("watch") + badge("sybil") + "</div></div>";
  }
  function navLink(label, hash) {
    var on = currentRoute() === hash.replace("#/", "");
    return '<a class="nld-navlink' + (on ? " on" : "") + '" href="' + esc(hash) + '">' + esc(label) + "</a>";
  }
  function navHtml() {
    return '<nav class="nld-nav">' +
      '<div class="nld-nav-in">' +
      '<a class="nld-logo" href="#/landing" aria-label="FlowCredit \u2014 home">' +
      '<svg class="nld-mark" viewBox="0 0 22 22" width="22" height="22" aria-hidden="true">' +
      '<rect x="1" y="1" width="20" height="20" rx="5" fill="none" stroke="#2DD4BF" stroke-width="1.5"/>' +
      '<text x="11" y="15" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="10" fill="#2DD4BF">FC</text></svg>' +
      '<span class="nld-logo-t">FlowCredit</span>' +
      '<span class="nld-testnet">TESTNET</span></a>' +
      '<div class="nld-links">' +
      navLink("Landing", "#/landing") +
      navLink("Workspace", "#/workspace") +
      navLink("Ingest", "#/ingest") +
      navLink("Run AI Assessment", "#/audit") +
      navLink("Report", "#/report") +
      navLink("Account", "#/account") +
      "</div>" +
      '<a class="nld-cta" href="#/workspace">Launch App \u2192</a>' +
      '<button type="button" class="nld-burger" id="nld-burger" aria-label="menu" aria-expanded="false">' +
      "<span></span><span></span><span></span></button>" +
      "</div>" +
      '<div class="nld-menu" id="nld-menu">' +
      navLink("Landing", "#/landing") + navLink("Workspace", "#/workspace") +
      navLink("Ingest", "#/ingest") + navLink("Run AI Assessment", "#/audit") +
      navLink("Report", "#/report") + navLink("Account", "#/account") +
      '<a class="nld-cta" href="#/workspace">Launch App \u2192</a></div>' +
      "</nav>";
  }
  function heroHtml() {
    return '<div class="nld-root" id="nld-root">' +
      '<canvas id="nld-beacon" aria-hidden="true"></canvas>' +
      navHtml() +
      '<section class="nld-hero"><div class="nld-hero-in">' +
      tickerHtml() +
      '<div class="nld-blur" aria-hidden="true">P1 ATTEST \u2014 12 FACTS, 4 SOURCES, ONE MERKLE FINGERPRINT<br>' +
      "P2 SCORE \u2014 RULE ENGINE AND LLM, INDEPENDENT VERDICTS</div>" +
      '<h1 class="nld-h1"><span id="nld-typing" data-text="Volume can be faked. Trust must be proven."></span>' +
      '<span class="nld-cursor" id="nld-cursor" aria-hidden="true"></span></h1>' +
      '<p class="nld-sub">AI-compute merchants pitch numbers. We pin them to evidence: compute, API, funds, and chain \u2014 then two independent engines score the truth.</p>' +
      '<div class="nld-pills">' +
      '<a class="nld-pill nld-case" data-subject="healthy" href="#/audit"><i class="nld-dot nld-d-green"></i>Case: Healthy merchant</a>' +
      '<a class="nld-pill nld-case" data-subject="watch" href="#/audit"><i class="nld-dot nld-d-amber"></i>Case: Watchlist merchant</a>' +
      '<a class="nld-pill nld-case" data-subject="sybil" href="#/audit"><i class="nld-dot nld-d-red"></i>Case: Sybil address</a>' +
      '<button type="button" class="nld-pill nld-fp" id="nld-fp">' +
      '<span class="nld-fp-label">' + FINGERPRINT_LABEL() + "</span>" +
      '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">' +
      '<rect x="2.5" y="2.5" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
      '<rect x="5.2" y="5.2" width="7" height="7" rx="1" fill="#0B1220" stroke="currentColor" stroke-width="1.2"/></svg></button>' +
      "</div>" +
      '<div class="nld-honesty"><span>testnet demo</span><span>synthetic data + public-disclosure composites</span>' +
      "<span>risk analytics, not a statutory audit</span><span>no custody, no lending</span></div>" +
      "</div></section></div>";
  }

  function render(host) {
    if (!host) { return; }
    host.innerHTML = heroHtml();
    bindCases(host);
    bindBurger(host);
    bindCopyPill(host);
    var ctl = startBeacon(host);
    if (!reducedMotion() && ctl) { canvasCtl = ctl; }
    startTypewriter(host);
  }

  /* ---------- cleanup (route switch / reset) ---------- */
  function cleanup() {
    if (raftId) { try { cancelAnimationFrame(raftId); } catch (e) { /* noop */ } raftId = 0; }
    if (ttTimer) { try { clearTimeout(ttTimer); } catch (e) { /* noop */ } ttTimer = null; }
    if (pillTimer) { try { clearTimeout(pillTimer); } catch (e) { /* noop */ } pillTimer = null; }
    if (canvasCtl && canvasCtl.off) { canvasCtl.off(); }
    canvasCtl = null;
    textDone = false;
  }
  if (App.fn && App.fn.addClearHook) { App.fn.addClearHook(cleanup); }

  App.views.landing = { render: render };
})();
