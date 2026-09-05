/* ============================================================
   view-landing.js — FlowCredit external-facing landing page
   (default route #/landing). DeepSeek-style front door rebuilt
   around the judge questions: S0 hero (copy + preserved narrative
   SVG) then S1 how it works / S2 credible-vs-raw inversion /
   S3 three live subjects / S4 trust / S5 try-it CTA. All figures
   are computed from SUBJECTS + App.fn at render time — no result
   literals. Workspace/Account entries are gone from this page
   (their routes stay untouched). The hero SVG is a stylized
   narrative with spec-locked coordinates (NOT a data chart and
   NOT derived from any subject's R/C series).

   App chrome (tabs / Mock-Live / global footer) is hidden via
   .shell.is-landing, toggled in app.js; wallet state stays the
   single global toggleWallet. The hero intro is a one-shot,
   reduced-motion-aware animation; once it finishes, a looping
   live signal (tracker dot, energy flow, scan sweep, node pings,
   AI-response pulse/beam, divergence particles, aurora + live
   tag) keeps the same fixed coordinates in motion. The static
   markup is always the full terminal state and every handle
   lives in state.timer.
   ============================================================ */
(function () {
  var App = window.App = window.App || {};
  var introSvg = null;
  var revealPage = null; // .ld-page node under the one-shot stagger reveal
  var prevRoute = null; // last state.route seen — intro plays only on true entry into #/landing

  /* ---------- intro reset: any clearTimers() snaps back to the full state ---------- */
  function resetIntro() {
    if (introSvg && introSvg.classList) {
      introSvg.classList.remove("ld-anim");
      introSvg.classList.remove("ld-go");
      introSvg.classList.remove("ld-live");
      introSvg.classList.add("ld-fin");
      if (introSvg.parentNode && introSvg.parentNode.classList) {
        introSvg.parentNode.classList.remove("ld-live");
      }
    }
    introSvg = null;
  }
  if (App.fn && App.fn.addClearHook) { App.fn.addClearHook(resetIntro); }
  // Stagger reveal reset: any clearTimers() (route switch / reset) restores
  // the fully readable static state, exactly like the hero intro.
  if (App.fn && App.fn.addClearHook) { App.fn.addClearHook(resetFx); }

  function resetFx() {
    if (revealPage && revealPage.classList) {
      revealPage.classList.remove("ld-reveal");
      revealPage.classList.remove("ld-go");
    }
    revealPage = null;
  }
  // S1–S5 fade up in sequence (60ms apart) once, only on a true entry into
  // #/landing; reduced-motion and same-route re-renders stay fully static.
  function revealFx(host) {
    if (typeof window === "undefined" || typeof host.querySelector !== "function") { return; }
    try {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }
    } catch (e) { /* motion assumed on */ }
    var page = host.querySelector(".ld-page");
    if (!page || typeof page.classList !== "object") { return; }
    revealPage = page;
    page.classList.add("ld-reveal");
    App.fn.raf(function () {
      if (page.classList) { page.classList.add("ld-go"); }
    });
  }
  // Sample cards pre-select a subject then enter P2; href="#/audit" is the
  // no-JS fallback path (route still opens with the current subject).
  function bindCases(host) {
    if (typeof host.querySelectorAll !== "function") { return; }
    var els = host.querySelectorAll(".ld-case[data-subject]");
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        el.addEventListener("click", function (ev) {
          var key = el.getAttribute("data-subject");
          if (!App.act || !App.act.switchSubject || !App.nav) { return; } // href fallback applies
          if (ev && ev.preventDefault) { ev.preventDefault(); }
          try { App.act.switchSubject(key); } catch (e) { /* state unchanged — still navigate */ }
          App.nav("#/audit");
        });
      })(els[i]);
    }
  }
  // S2 comparison bars start at width 0 and transition to their computed
  // width on the next frame (reduced-motion renders the final state at once).
  function measureBars(host) {
    if (typeof host.querySelectorAll !== "function" ||
        typeof App.fn === "undefined" || !App.fn) { return; }
    var bars = host.querySelectorAll(".ld-bar[data-w]");
    if (!bars.length) { return; }
    function applyAll() {
      for (var i = 0; i < bars.length; i++) {
        bars[i].style.width = bars[i].getAttribute("data-w");
      }
    }
    var reduced = false;
    try {
      reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { /* motion assumed on */ }
    if (typeof window === "undefined" || reduced || typeof App.fn.raf !== "function") {
      applyAll();
      return;
    }
    App.fn.raf(applyAll);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function icon(name, size) {
    if (App.ui && App.ui.icon) { return App.ui.icon(name, size); }
    return "";
  }
  /* ---------- S0 hero copy (shared with the static fallback) ---------- */
  function heroCopyCore() {
    return '<div class="ld-eyebrow">FLOWCREDIT · ON-CHAIN AI CREDIT RISK INTELLIGENCE</div>' +
      '<h1 class="ld-h1">Volume can be faked.<br><span class="ld-grad">Trust must be proven.</span></h1>' +
      '<p class="ld-sub">Verified activity into credit — with real-time response to volatility, for digital-asset lenders.</p>' +
      '<div class="ld-trust">' +
      '<span class="ld-tchip">Attest → Score → Respond</span>' +
      '<span class="ld-tchip">Merkle-anchored on-chain</span>' +
      '<span class="ld-tchip">No custody · no lending</span>' +
      "</div>" +
      '<div class="ld-cta-row">' +
      '<a class="ld-btn ld-btn-primary" href="#/ingest">Run live demo · ~3 min</a>' +
      '<a class="ld-btn ld-btn-ghost" href="#/report">Sample report</a>' +
      "</div>";
  }
  function heroCopyHtml() {
    return '<div class="ld-hero-copy">' + heroCopyCore() + "</div>";
  }

  /* ---------- 4.2 hero visual (fixed narrative coordinates) ---------- */
  function heroVisualHtml() {
    return '<div class="ld-hero-card">' +
      '<div class="ld-hc-head">' +
      '<span class="ld-hc-title">VALUE VOLATILITY · AI RESPONSE</span>' +
      '<span class="ld-hc-legend"><i class="sw sw-r"></i><span>R reported</span>' +
      '<i class="sw sw-c"></i><span>C credible</span></span>' +
      '<span class="ld-live-tag"><i class="ld-live-tag-dot"></i>LIVE · TRACKING R/C</span></div>' +
      '<svg class="ld-hero-svg" viewBox="0 0 460 200" role="img" aria-label="Stylized narrative: declared value and credible value align, then diverge; an AI response re-anchors the declared value" preserveAspectRatio="xMidYMid meet">' +
      "<defs>" +
      '<linearGradient id="ld-band-grad" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="rgba(248,113,113,0)"/>' +
      '<stop offset="0.5" stop-color="rgba(248,113,113,.18)"/>' +
      '<stop offset="1" stop-color="rgba(248,113,113,0)"/></linearGradient>' +
      '<linearGradient id="ld-beam-grad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="rgba(45,212,191,0)"/>' +
      '<stop offset="1" stop-color="rgba(45,212,191,.55)"/></linearGradient>' +
      "</defs>" +
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
      '<text class="ld-t-d" x="80" y="47" text-anchor="middle" fill="#5E7478">D +3%</text>' +
      '<text class="ld-t-d" x="202" y="47" text-anchor="middle" fill="#F87171">D +186% · &gt;2σ</text>' +
      '<text class="ld-t-d" x="360" y="47" text-anchor="middle" fill="#2DD4BF">stabilized</text>' +
      '<text class="ld-t-stage" x="80" y="190" text-anchor="middle" fill="#5E7478">ALIGNED</text>' +
      '<text class="ld-t-stage" x="202" y="190" text-anchor="middle" fill="#F87171">SHOCK / DIVERGENCE</text>' +
      '<text class="ld-t-stage" x="362" y="190" text-anchor="middle" fill="#2DD4BF">RE-ANCHORED</text>' +
      '<g class="ld-live-dot">' +
      '<circle cx="0" cy="0" r="7" fill="rgba(45,212,191,.18)"/>' +
      '<circle cx="0" cy="0" r="3.4" fill="#E7FDF8" stroke="#2DD4BF" stroke-width="1.6"/>' +
      '<animateMotion begin="indefinite" dur="6s" repeatCount="indefinite" ' +
      'path="M10 118 L45 113 L80 116 L115 108 L150 110 L175 70 L195 55 L210 150 L225 135 L255 120 ' +
      'L290 122 L325 114 L360 116 L395 110 L430 108 L450 106"/>' +
      "</g>" +
      '<line class="ld-ai-pulse" x1="255" y1="36" x2="255" y2="168"/>' +
      '<polyline class="ld-live-flow" pathLength="1" fill="none" ' +
      'points="10,118 45,113 80,116 115,108 150,110 175,70 195,55 210,150 225,135 255,120 ' +
      '290,122 325,114 360,116 395,110 430,108 450,106">' +
      '<animate attributeName="stroke-dashoffset" from="1" to="0" dur="6s" repeatCount="indefinite"/>' +
      "</polyline>" +
      '<line class="ld-scan" x1="10" y1="36" x2="10" y2="168"/>' +
      '<g class="ld-node n1"><circle class="ld-ring" cx="10" cy="118" r="3.4"/>' +
      '<circle class="ld-core" cx="10" cy="118" r="2.6" fill="#38BDF8"/></g>' +
      '<g class="ld-node n2"><circle class="ld-ring" cx="150" cy="110" r="3.4"/>' +
      '<circle class="ld-core" cx="150" cy="110" r="2.6" fill="#F87171"/></g>' +
      '<g class="ld-node n3"><circle class="ld-ring" cx="255" cy="120" r="4"/>' +
      '<circle class="ld-core" cx="255" cy="120" r="3" fill="#2DD4BF"/></g>' +
      '<g class="ld-node n4"><circle class="ld-ring" cx="450" cy="106" r="3.4"/>' +
      '<circle class="ld-core" cx="450" cy="106" r="2.6" fill="#34D399"/></g>' +
      '<circle class="ld-ai-ring r1" cx="255" cy="120" r="6"/>' +
      '<circle class="ld-ai-ring r2" cx="255" cy="120" r="6"/>' +
      '<rect class="ld-beam" x="253.4" y="40" width="3.2" height="80" fill="url(#ld-beam-grad)"/>' +
      '<circle class="ld-part p1" cx="168" cy="128" r="1.5" fill="#F87171"/>' +
      '<circle class="ld-part p2" cx="184" cy="96" r="1.1" fill="#F87171"/>' +
      '<circle class="ld-part p3" cx="206" cy="118" r="1.4" fill="#FB923C"/>' +
      '<circle class="ld-part p4" cx="232" cy="88" r="1.1" fill="#F87171"/>' +
      "</svg>" +
      '<div class="ld-hc-foot">stylized demo narrative · not live market data</div>' +
      "</div>";
  }
  function heroHtml() {
    return '<section class="ld-hero">' + heroCopyHtml() + heroVisualHtml() + "</section>";
  }

  /* ---------- shared helpers (render-time math only) ---------- */
  function fmtNum(n) { return String(Math.round(n * 10) / 10); }
  function dotBg(ch) { return ch === "r" ? "#F87171" : ch === "y" ? "#F59E0B" : "#34D399"; }
  function barW(v, max) {
    var p = max > 0 ? (v / max) * 100 : 0;
    p = Math.round(p * 10) / 10;
    return Math.min(100, p) + "%";
  }

  /* ---------- S1 how it works ---------- */
  function howPipe(num, ic, title, body) {
    return '<div class="ld-pipe">' +
      '<div class="ld-pipe-top">' + icon(ic, 15) + '<span class="ld-pipe-t">' + title + "</span>" +
      '<span class="ld-pipe-badge">' + num + "</span></div>" +
      '<div class="ld-pipe-s">' + body + "</div></div>";
  }
  function howHtml() {
    return '<section class="ld-sec ld-rv">' +
      '<div class="ld-kicker">HOW IT WORKS</div>' +
      '<div class="ld-pipes">' +
      howPipe("01", "db", "Attest",
        "Cross-check 4 signed sources, strip idle/duplicate/pulse — raw volume ≠ credible volume") +
      '<span class="ld-pipe-arrow">→</span>' +
      howPipe("02", "pulse", "Score",
        "Five anchors → CCI, PD, R-vs-C deviation, hard-rule veto") +
      '<span class="ld-pipe-arrow">→</span>' +
      howPipe("03", "shield", "Respond",
        "Monitor Health Factor, auto de-risk through a flash crash") +
      "</div></section>";
  }

  /* ---------- S2 credible volume inversion ---------- */
  function whyHtml() {
    var h = SUBJECTS.healthy, s = SUBJECTS.sybil;
    var hRaw = App.fn.ntM(h), sRaw = App.fn.ntM(s);
    var hVal = App.fn.validNT_M(h), sVal = App.fn.validNT_M(s);
    var rawMax = Math.max(hRaw, sRaw), valMax = Math.max(hVal, sVal);
    function barRow(name, val, pct, tone) {
      return '<div class="ld-cmp-row">' +
        '<span class="ld-cmp-k">' + name + "</span>" +
        '<span class="ld-cmp-track"><span class="ld-bar ' + tone + '" data-w="' + pct + '"></span></span>' +
        '<span class="ld-cmp-v num">' + fmtNum(val) + " M</span></div>";
    }
    return '<section class="ld-sec ld-rv" style="transition-delay:60ms">' +
      '<h2 class="ld-sec-title">Raw volume can mislead. Credible volume tells the truth.</h2>' +
      '<div class="ld-cmp">' +
      '<div class="ld-cmp-head"><span>Raw NT</span>' +
      '<span class="ld-cmp-note">declared volume · as reported</span></div>' +
      barRow("Healthy", hRaw, barW(hRaw, rawMax), "ld-bar-good") +
      barRow("Sybil", sRaw, barW(sRaw, rawMax), "ld-bar-bad") +
      "</div>" +
      '<div class="ld-cmp">' +
      '<div class="ld-cmp-head"><span>Valid NT</span>' +
      '<span class="ld-cmp-note">after wash filters</span></div>' +
      barRow("Healthy", hVal, barW(hVal, valMax), "ld-bar-good") +
      barRow("Sybil", sVal, barW(sVal, valMax), "ld-bar-bad") +
      "</div>" +
      '<p class="ld-cmp-foot">after stripping idle loops, duplicates and pulse spikes — the wash-trader collapses.</p>' +
      "</section>";
  }

  /* ---------- S3 three live subjects ---------- */
  function caseCard(k, d) {
    var cci = App.fn.cci(d);
    var grade = App.fn.gradeOf(d);
    var cls = d.verdictKind === "approve" ? "ld-case-ok"
      : d.verdictKind === "watch" ? "ld-case-watch" : "ld-case-rej";
    var line;
    if (d.verdictKind === "approve") {
      line = '<span class="ld-case-line ok">credit line ' +
        App.ui.fmtMoney(App.fn.creditLine(d)) + "</span>";
    } else if (d.verdictKind === "watch") {
      line = '<span class="ld-case-line warn">capped line ' +
        App.ui.fmtMoney(App.fn.creditLine(d)) + " · watchlist</span>";
    } else {
      line = '<span class="ld-case-line rej">REJECTED · wash-trading</span>';
    }
    return '<a class="ld-case ' + cls + '" href="#/audit" data-subject="' + k + '">' +
      '<div class="ld-case-head">' +
      '<span class="ld-case-t"><span class="ld-dot" style="background:' + dotBg(d.segDot) + '"></span>' +
      esc(d.label) + "</span>" +
      '<span class="ld-case-badge num">' + esc(grade) + "</span></div>" +
      '<div class="ld-case-addr num">' + esc(App.fn.shortAddr(d.address)) + "</div>" +
      '<div class="ld-case-cci num">CCI ' + cci + "</div>" +
      line +
      "</a>";
  }
  function casesHtml() {
    var cards = SUBJECT_ORDER.map(function (k) { return caseCard(k, SUBJECTS[k]); }).join("");
    return '<section class="ld-sec ld-rv" style="transition-delay:180ms">' +
      '<div class="ld-kicker">WHO IT IS FOR</div>' +
      '<div class="ld-sec-line">Three live subjects — approve, watchlist, or veto in one assessment.</div>' +
      '<div class="ld-cases">' + cards + "</div>" +
      "</section>";
  }

  /* ---------- S4 trust (2x2) ---------- */
  function trustHtml() {
    var items = [
      ["pulse", "Formulas auditable", "Every score traces to five anchors; PD is a demo calibration"],
      ["shield", "Anyone can verify", "Merkle root on-chain, raw source data stays off-chain"],
      ["anchor", "No custody · no lending · no token", "RegTech tooling for licensed platforms"],
      ["info", "Honest by design", "Testnet mock, samples synthesized from public disclosures, not financial advice"]
    ];
    var grid = items.map(function (it) {
      return '<div class="ld-tcard"><span class="ld-tcard-ic">' + icon(it[0], 14) + "</span>" +
        '<div class="ld-tcard-b"><b>' + it[1] + "</b>" +
        '<span class="ld-tcard-s">' + it[2] + "</span></div></div>";
    }).join("");
    return '<section class="ld-sec ld-rv" style="transition-delay:240ms">' +
      '<div class="ld-kicker">WHY TRUST IT</div>' +
      '<div class="ld-tgrid">' + grid + "</div></section>";
  }

  /* ---------- S5 try it now ---------- */
  function tryHtml() {
    var steps = [
      "Pick a subject",
      "Run AI assessment",
      "Trigger a flash crash, watch it auto de-risk",
      "Open the verifiable report"
    ];
    var row = steps.map(function (t, i) {
      return '<div class="ld-nstep"><span class="ld-nnum num">' + (i + 1) + "</span>" +
        '<span class="ld-nstep-t">' + t + "</span></div>";
    }).join("");
    return '<section class="ld-sec ld-rv" style="transition-delay:300ms">' +
      '<div class="ld-kicker">TRY IT NOW</div>' +
      '<div class="ld-nsteps">' + row + "</div>" +
      '<div class="ld-cta-row">' +
      '<a class="ld-btn ld-btn-primary" href="#/ingest">Run live demo · ~3 min</a>' +
      '<a class="ld-btn ld-btn-ghost" href="#/report">Sample report</a>' +
      "</div>" +
      '<p class="ld-cta-note">No sign-up · runs locally in your browser</p>' +
      "</section>";
  }

  /* ---------- 4.3 minimal footer (merged compliance + testnet) ---------- */
  function footHtml() {
    return '<footer class="ld-foot">' +
      '<div class="ld-foot-line">RegTech tooling — no custody, no lending · testnet demo · simulated data · not financial advice</div>' +
      "</footer>";
  }

  function pageHtml() {
    return heroHtml() + howHtml() + whyHtml() + casesHtml() + trustHtml() + tryHtml() + footHtml();
  }
  function fallbackHtml() {
    return '<div class="ld-page">' +
      '<section class="ld-hero"><div class="ld-hero-copy">' + heroCopyCore() + "</div></section>" +
      footHtml() + "</div>";
  }

  /* ---------- §5 one-shot hero intro (static terminal state is the default) ---------- */
  // After the one-shot reveal, .ld-live starts the 6s looping tracker dot,
  // AI-response pulse and band glow on the same fixed coordinate axis.
  function activateLive(svg) {
    if (!svg || typeof svg.classList !== "object") { return; }
    svg.classList.add("ld-live");
    if (svg.parentNode && svg.parentNode.classList) {
      svg.parentNode.classList.add("ld-live");
    }
    var mot = svg.querySelector(".ld-live-dot animateMotion");
    if (mot && typeof mot.beginElement === "function") {
      try { mot.beginElement(); } catch (e) { /* SMIL unavailable — static chart stays */ }
    }
  }
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
      App.fn.timeout(function () { activateLive(svg); }, 300);
    }, 2650);
  }

  function render(host) {
    var enterLanding = prevRoute !== App.state.route;
    prevRoute = App.state.route;
    try {
      host.innerHTML = '<div class="ld-page" id="ld-root">' + pageHtml() + "</div>";
      bindCases(host);
      if (enterLanding) { playIntro(host); revealFx(host); }
    } catch (e) {
      resetIntro();
      resetFx();
      try { host.innerHTML = fallbackHtml(); } catch (e2) { /* host stays readable */ }
      if (App.ui && App.ui.toast) { App.ui.toast("Landing render failed — static fallback", "err"); }
    }
  }

  App.views = App.views || {};
  App.views.landing = { render: render };
})();
