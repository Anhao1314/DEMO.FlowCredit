/* ============================================================
   view-landing.js — FlowCredit external-facing landing page
   (default route #/landing). Marketing front door: hero copy +
   a fixed narrative volatility visual + pipeline cards + two
   live-computed case cards + micro proof chain + compliance.

   Every number on the case cards is derived at render time from
   SUBJECTS + App.fn — never hard-coded. The hero SVG is a
   stylized narrative with spec-locked coordinates (NOT a data
   chart and NOT derived from any subject's R/C series).

   App chrome (tabs / Mock-Live / global footer) is hidden via
   .shell.is-landing, toggled in app.js; wallet state stays the
   single global toggleWallet. The hero intro is a one-shot,
   reduced-motion-aware animation; the static markup is always
   the full terminal state and every handle lives in state.timer.
   ============================================================ */
(function () {
  var App = window.App = window.App || {};
  var introSvg = null;

  /* ---------- intro reset: any clearTimers() snaps back to the full state ---------- */
  function resetIntro() {
    if (introSvg && introSvg.classList) {
      introSvg.classList.remove("ld-anim");
      introSvg.classList.remove("ld-go");
      introSvg.classList.add("ld-fin");
    }
    introSvg = null;
  }
  if (App.fn && App.fn.addClearHook) { App.fn.addClearHook(resetIntro); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function icon(name, size) {
    if (App.ui && App.ui.icon) { return App.ui.icon(name, size); }
    return "";
  }
  function fmtMoney(n) {
    try { return "$" + Number(n).toLocaleString("en-US"); }
    catch (e) { return "$" + String(n); }
  }
  function toastOnce(msg) {
    if (!toastOnce.fired && App.ui && App.ui.toast) {
      toastOnce.fired = true;
      App.ui.toast(msg, "warn");
    }
  }

  /* ---------- 4.1 hero copy ---------- */
  function heroCopyHtml() {
    return '<div class="ld-hero-copy">' +
      '<div class="ld-eyebrow">FOR AI-NATIVE BUSINESSES · REGTECH</div>' +
      '<h1 class="ld-h1">On-chain AI<br><span class="ld-grad">Credit Risk Intelligence</span></h1>' +
      '<div class="ld-slogan">Volatility, redefined by verifiable AI.</div>' +
      '<p class="ld-sub">Audit-grade attestation → AI risk score → real-time response when value swings. ' +
      "Verify the growth is real before you lend.</p>" +
      '<div class="ld-cta-row">' +
      '<a class="ld-btn ld-btn-primary" href="#/overview">Launch Live Demo →</a>' +
      '<a class="ld-btn ld-btn-ghost" href="#/report">Sample Report</a></div>' +
      '<div class="ld-tracks">' +
      '<span class="ld-track">CROSS-BORDER PAYMENT</span>' +
      '<span class="ld-track">DIGITAL ASSET</span>' +
      '<span class="ld-track">ON-CHAIN CUSTODY</span>' +
      '<span class="ld-track">REGTECH</span>' +
      "</div></div>";
  }

  /* ---------- 4.2 hero visual (fixed narrative coordinates) ---------- */
  function heroVisualHtml() {
    return '<div class="ld-hero-card">' +
      '<div class="ld-hc-head">' +
      '<span class="ld-hc-title">VALUE VOLATILITY · AI RESPONSE</span>' +
      '<span class="ld-hc-legend"><i class="sw sw-r"></i><span>R reported</span>' +
      '<i class="sw sw-c"></i><span>C credible</span></span></div>' +
      '<svg class="ld-hero-svg" viewBox="0 0 460 200" role="img" aria-label="Stylized narrative: declared value and credible value align, then diverge; an AI response re-anchors the declared value" preserveAspectRatio="xMidYMid meet">' +
      "<defs>" +
      '<linearGradient id="ld-band-grad" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="rgba(248,113,113,0)"/>' +
      '<stop offset="0.5" stop-color="rgba(248,113,113,.18)"/>' +
      '<stop offset="1" stop-color="rgba(248,113,113,0)"/>' +
      "</linearGradient></defs>" +
      '<line class="ld-grid" x1="10" y1="50" x2="450" y2="50"/>' +
      '<line class="ld-grid" x1="10" y1="100" x2="450" y2="100"/>' +
      '<line class="ld-grid" x1="10" y1="150" x2="450" y2="150"/>' +
      '<rect class="ld-fade d-band" x="150" y="40" width="105" height="130" fill="url(#ld-band-grad)"/>' +
      '<polygon class="ld-fade d-band" points="150,110 175,70 195,55 210,150 225,135 255,120 255,118 220,124 185,118 150,112" fill="rgba(248,113,113,.12)"/>' +
      '<polyline class="ld-draw d-aligned" pathLength="1" points="10,118 45,113 80,116 115,108 150,110" fill="none" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="square"/>' +
      '<polyline class="ld-draw d-shock" pathLength="1" points="150,110 175,70 195,55 210,150 225,135 255,120" fill="none" stroke="#F87171" stroke-width="2.3" stroke-linecap="square"/>' +
      '<polyline class="ld-draw d-re" pathLength="1" points="255,120 290,122 325,114 360,116 395,110 430,108 450,106" fill="none" stroke="#2DD4BF" stroke-width="2.4" stroke-linecap="square"/>' +
      '<polyline class="ld-c" points="10,120 45,115 80,118 115,110 150,112 185,118 220,124 255,118 290,118 325,112 360,114 395,108 430,106 450,104" fill="none" stroke="#2DD4BF" stroke-width="1.8" opacity=".85"/>' +
      '<line class="ld-fade d-ai" x1="255" y1="36" x2="255" y2="168" stroke="rgba(45,212,191,.75)" stroke-width="1.4" stroke-dasharray="4 4"/>' +
      '<text class="ld-t-ai ld-fade d-ai" x="255" y="27" text-anchor="middle" fill="#2DD4BF">AI ACTIVE RESPONSE</text>' +
      '<text class="ld-t-d" x="80" y="47" text-anchor="middle" fill="#5E7478">D +4%</text>' +
      '<text class="ld-t-d" x="202" y="47" text-anchor="middle" fill="#F87171">D +186% · &gt;2σ</text>' +
      '<text class="ld-t-d" x="360" y="47" text-anchor="middle" fill="#2DD4BF">stabilized</text>' +
      '<text class="ld-t-stage" x="80" y="190" text-anchor="middle" fill="#5E7478">ALIGNED</text>' +
      '<text class="ld-t-stage" x="202" y="190" text-anchor="middle" fill="#F87171">SHOCK / DIVERGENCE</text>' +
      '<text class="ld-t-stage" x="362" y="190" text-anchor="middle" fill="#2DD4BF">RE-ANCHORED</text>' +
      "</svg>" +
      '<div class="ld-hc-foot">stylized demo narrative · not live market data</div>' +
      "</div>";
  }
  function heroHtml() {
    return '<section class="ld-hero">' + heroCopyHtml() + heroVisualHtml() + "</section>";
  }

  /* ---------- 4.3 pipeline cards ---------- */
  var PIPES = [
    { href: "#/ingest", icon: "check", title: "Data Attestation", sub: "the audit module · 4-source verify", cls: "ld-pipe-teal" },
    { href: "#/audit", icon: "pulse", title: "AI Risk Scoring", sub: "CCI · PD · deviation", cls: "" },
    { href: "#/report", icon: "alert", title: "Active Response", badge: "THEME", sub: "margin call · de-risk", cls: "ld-pipe-blue" },
    { href: "#/ingest", icon: "anchor", title: "On-chain Trail", sub: "Merkle fingerprint", cls: "" }
  ];
  function pipesHtml() {
    var out = '<div class="ld-pipes">';
    for (var i = 0; i < PIPES.length; i++) {
      if (i > 0) { out += '<span class="ld-pipe-arrow" aria-hidden="true">→</span>'; }
      var p = PIPES[i];
      out += '<a class="ld-pipe ' + p.cls + '" href="' + p.href + '">' +
        '<span class="ld-pipe-top">' + icon(p.icon, 15) + '<span class="ld-pipe-t">' + esc(p.title) + "</span>" +
        (p.badge ? '<span class="ld-pipe-badge">' + esc(p.badge) + "</span>" : "") + "</span>" +
        '<span class="ld-pipe-s">' + esc(p.sub) + "</span></a>";
    }
    return out + "</div>";
  }

  /* ---------- 4.4 case cards — every value computed live, §6 ---------- */
  function caseCardHtml(key) {
    var d = SUBJECTS[key];
    var label = d && d.label ? esc(d.label) : esc(key);
    var badge = "";
    var cls = "";
    var l1 = "—";
    var l2 = "—";
    try {
      if (!d || !App.fn) { throw new Error("data-or-fn-missing"); }
      var cci = App.fn.cci(d);
      var pd = App.fn.pd(cci);
      if (typeof cci !== "number" || typeof pd !== "number" || !isFinite(cci) || !isFinite(pd)) {
        throw new Error("non-finite-score");
      }
      var raw = App.fn.ntM(d);
      var valid = App.fn.validNT_M(d);
      if (typeof raw !== "number" || typeof valid !== "number" || !isFinite(raw) || !isFinite(valid)) {
        throw new Error("non-finite-nt");
      }
      var line;
      if (key === "sybil") {
        var vetoOk = typeof App.fn.vetoed === "function" && App.fn.vetoed(d) === true;
        var zeroOk = typeof App.fn.creditLine === "function" && App.fn.creditLine(d) === 0;
        if (!vetoOk || !zeroOk) { throw new Error("veto-gate-failed"); }
        line = "$0";
        badge = "REJECTED · VETO";
        cls = "ld-case-rej";
      } else {
        line = fmtMoney(App.fn.creditLine ? App.fn.creditLine(d) : 0);
        badge = "APPROVED";
        cls = "ld-case-ok";
      }
      l1 = "CCI " + cci + " · " + esc(d.grade || "—") + " · PD " + pd.toFixed(1) + "% · line " + line;
      l2 = "raw " + raw.toFixed(1) + "M → valid " + valid.toFixed(1) + "M" +
        (key === "sybil" ? " (inflated)" : "");
    } catch (e) {
      badge = "—";
      toastOnce("Landing metrics unavailable — static placeholders shown");
    }
    return '<a class="ld-case ' + cls + '" href="#/audit" data-subject="' + key + '">' +
      '<span class="ld-case-head"><span class="ld-case-title">' + label + "</span>" +
      (badge ? '<span class="ld-case-badge">' + esc(badge) + "</span>" : "") + "</span>" +
      '<span class="ld-case-l1">' + l1 + "</span>" +
      '<span class="ld-case-l2">' + l2 + "</span></a>";
  }
  function casesHtml() {
    return '<div class="ld-cases">' + caseCardHtml("healthy") + caseCardHtml("sybil") + "</div>";
  }

  /* ---------- 4.5 micro proof chain (static illustration) ---------- */
  function chainHtml() {
    return '<div class="ld-chain">' +
      '<div class="ld-chain-pills">' +
      '<span class="ld-pill ld-pill-teal">root 0x7F3A…4E21</span>' +
      '<span class="ld-pill-arrow" aria-hidden="true">→</span>' +
      '<span class="ld-pill ld-pill-glass">block #19000000</span>' +
      '<span class="ld-pill-arrow" aria-hidden="true">→</span>' +
      '<span class="ld-pill ld-pill-green">✓ hash match · immutable</span></div>' +
      '<span class="ld-chain-note">raw detail encrypted off-chain</span></div>';
  }

  /* ---------- 4.6 compliance strip + landing footer ---------- */
  function compHtml() {
    return '<div class="ld-comp"><b>Verify, don&apos;t trust.</b> RegTech tooling — no custody, no lending; ' +
      "licensed institutions / contracts keep the final decision.</div>";
  }
  function footHtml() {
    return '<footer class="ld-foot">Testnet demo · simulated data · demo calibration · not financial advice</footer>';
  }

  function pageHtml() {
    return heroHtml() + pipesHtml() + casesHtml() + chainHtml() + compHtml() + footHtml();
  }
  function fallbackHtml() {
    return '<div class="ld-page"><section class="ld-hero"><div class="ld-hero-copy">' +
      '<div class="ld-eyebrow">FLOWCREDIT · ON-CHAIN AI CREDIT RISK INTELLIGENCE</div>' +
      '<h1 class="ld-h1">On-chain AI Credit Risk Intelligence</h1>' +
      '<div class="ld-cta-row">' +
      '<a class="ld-btn ld-btn-primary" href="#/overview">Launch Live Demo →</a>' +
      '<a class="ld-btn ld-btn-ghost" href="#/report">Sample Report</a></div>' +
      "</div></section></div>";
  }

  /* ---------- delegated click: pick a case → switch subject → enter P2 ---------- */
  function bind(host) {
    var root = host.querySelector("#ld-root");
    if (!root || !root.addEventListener) { return; }
    root.addEventListener("click", function (ev) {
      var n = ev.target;
      while (n && n !== root) {
        if (n.nodeType === 1 && n.getAttribute && n.getAttribute("data-subject")) { break; }
        n = n.parentNode;
      }
      if (!n || n === root || !n.getAttribute) { return; }
      var key = n.getAttribute("data-subject");
      if (key && App.act && typeof App.act.switchSubject === "function") {
        try { App.act.switchSubject(key); } catch (e) { /* default anchor nav still proceeds */ }
      }
    });
  }

  /* ---------- §5 one-shot hero intro (static terminal state is the default) ---------- */
  function playIntro(host) {
    if (typeof window === "undefined" || typeof host.querySelector !== "function") { return; }
    var svg = host.querySelector(".ld-hero-svg");
    if (!svg || typeof svg.classList !== "object") { return; }
    if (!App.fn || typeof App.fn.raf !== "function" || typeof App.fn.timeout !== "function") { return; }
    var motionOK = true;
    try {
      motionOK = !!(window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { motionOK = true; }
    if (!motionOK) { return; }
    introSvg = svg;
    // rAF #1 hides the draw segments before the first paint; rAF #2 starts
    // the staggered transitions, so no "full then blank" flash can occur.
    App.fn.raf(function () { svg.classList.add("ld-anim"); });
    App.fn.raf(function () { svg.classList.add("ld-go"); });
    App.fn.timeout(function () {
      svg.classList.remove("ld-anim");
      svg.classList.remove("ld-go");
      svg.classList.add("ld-fin");
      if (introSvg === svg) { introSvg = null; }
    }, 2650);
  }

  function render(host) {
    toastOnce.fired = false;
    try {
      host.innerHTML = '<div class="ld-page" id="ld-root">' + pageHtml() + "</div>";
      bind(host);
      playIntro(host);
    } catch (e) {
      resetIntro();
      try { host.innerHTML = fallbackHtml(); } catch (e2) { /* host stays readable */ }
      if (App.ui && App.ui.toast) { App.ui.toast("Landing render failed — static fallback", "err"); }
    }
  }

  App.views = App.views || {};
  App.views.landing = { render: render };
})();
