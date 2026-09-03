/* ============================================================
   app.js — product shell, top navigation, hash routing, boot.
   Route switching cancels every pending handle first; a stress
   run mid-flight returns to idle while terminal states survive.
   ============================================================ */
(function () {
  var App = window.App = window.App || {};
  var TABS = [
    { hash: "#/overview", key: "overview", label: "Home", icon: "layers" },
    { hash: "#/ingest", key: "ingest", label: "Ingest", sub: "P1", icon: "db" },
    { hash: "#/audit", key: "audit", label: "Audit", sub: "P2", icon: "pulse" },
    { hash: "#/report", key: "report", label: "Report", sub: "P3", icon: "shield" }
  ];
  var rootEl = null;
  var mainEl = null;
  var walletConnected = false;
  var booted = false;

  function routeKey(hash) {
    var m = String(hash || "").match(/^#\/(landing|overview|ingest|audit|report)$/);
    return m ? m[1] : "overview";
  }
  function currentRoute() {
    return routeKey(location.hash);
  }
  function nav(hash) {
    if (location.hash === hash) { renderCurrent(); return; }
    location.hash = hash; // fires hashchange → applyRoute
  }

  /* ---------- deep-link intent (consumed once after a view renders) ---------- */
  var NAV_INTENTS = {
    ingest: { anchor: { sel: "#anchor-btn", toast: "Anchor four signed sources — fresh nonce per anchor" } },
    audit: { l0: { idx: 0 }, l1: { idx: 1 }, l2: { idx: 2 }, l3: { idx: 3 }, l4: { idx: 4 } },
    report: {
      proof: { sel: "#verify-btn" },
      stress: { sel: "#stress-btn", toast: "Run stress — the facility responds to the shock" }
    },
    overview: { "subject-healthy": { action: "subject-healthy" } }
  };
  var intent = null;

  function intentTarget(page, block) {
    var m = NAV_INTENTS[page];
    if (!m || block == null) { return null; }
    return m[block] || null;
  }
  function motionOK() {
    try {
      return !!(window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return true; }
  }
  function closestEl(el, cls) {
    while (el && el.nodeType === 1) {
      if (el.classList && el.classList.contains(cls)) { return el; }
      el = el.parentNode;
    }
    return null;
  }
  function auditToastFor(idx) {
    var s = App.state.auditStage;
    if (s === -1) { return "Pipeline idle — press Run AI Audit"; }
    if (s < idx) { return "Stage L" + idx + " unlocks as the audit runs — press Run AI Audit"; }
    return "Audit reached L" + Math.min(s, 4) + " — numbers are live below";
  }
  function navTo(hash, it) {
    intent = it || null;
    nav(hash);
  }
  function revealOnce() {
    var it = intent;
    intent = null;
    if (!it || !mainEl) { return; }
    var route = currentRoute();
    var target = intentTarget(route, it.block);
    if (!target) { return; }
    if (route === "overview" && target.action === "subject-healthy") {
      if (App.state.subject !== "healthy") { App.act.switchSubject("healthy"); }
      else if (App.ui) { App.ui.toast("Healthy run armed — continue from Home"); }
      return;
    }
    var el = null;
    if (typeof target.idx === "number") {
      var nodes = mainEl.querySelectorAll(".card.block");
      el = nodes[target.idx] || null;
    } else if (target.sel) {
      el = mainEl.querySelector(target.sel);
    }
    if (!el) { return; }
    var holder = el;
    if (target.sel === "#verify-btn") { holder = closestEl(el, "proof-row") || el; }
    else if (!(typeof target.idx === "number")) { holder = closestEl(el, "card") || el; }
    var det = holder.querySelector ? holder.querySelector("details.how") : null;
    if (det && !det.open) { det.open = true; }
    var toast = target.toast || "";
    if (route === "audit" && typeof target.idx === "number") { toast = auditToastFor(target.idx); }
    else if (route === "report" && it.block === "proof") {
      toast = App.state.anchor ? "Verify on-chain proof — root matches P1 anchor" : "Anchor data in P1 first";
    }
    if (holder.classList) {
      holder.classList.add("hp-hint");
      App.fn.timeout(function () {
        if (holder.classList) { holder.classList.remove("hp-hint"); }
      }, 1600);
    }
    if (toast && App.ui) { App.ui.toast(toast); }
    if (holder.scrollIntoView) {
      holder.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto", block: "start" });
    }
  }

  function buildShell() {
    var u = App.ui;
    var tabs = TABS.map(function (t) {
      return '<a class="nav-tab" href="' + t.hash + '" data-route="' + t.key + '">' +
        u.icon(t.icon, 13) + " " + t.label + (t.sub ? " <small>" + t.sub + "</small>" : "") + "</a>";
    }).join("");
    rootEl.innerHTML =
      '<div class="shell">' +
      '<header class="topbar"><div class="topbar-inner">' +
      '<a class="brand" href="#/overview" aria-label="FlowCredit">' + u.icon("mark", 26) +
      '<span>FlowCredit</span><span class="badge-testnet">Testnet</span></a>' +
      '<nav class="nav" aria-label="pages">' + tabs + "</nav>" +
      '<div class="top-actions">' +
      '<div class="seg" role="group" aria-label="network mode">' +
      '<button type="button" class="seg-btn on" id="mode-mock">Mock</button>' +
      '<button type="button" class="seg-btn is-off" id="mode-live">Live</button></div>' +
      '<a class="launch-cta" href="#/overview">Launch App →</a>' +
      '<button type="button" class="btn btn-sm wallet-btn" id="wallet-btn">' + u.icon("wallet", 13) +
      '<span id="wallet-label">Connect Wallet</span></button>' +
      "</div></div></header>" +
      '<main class="content" id="view-main" tabindex="-1"></main>' +
      '<footer class="foot"><div class="line1">Demo flow: P1 anchor → P2 run audit &amp; compare ledgers → P3 verify &amp; stress test</div>' +
      '<div class="line2">Testnet demo · simulated data · not financial advice · demo calibration</div></footer>' +
      "</div>";
    mainEl = rootEl.querySelector("#view-main");

    var mockBtn = rootEl.querySelector("#mode-mock");
    if (mockBtn) {
      mockBtn.addEventListener("click", function () {
        App.ui.toast("Network fixed to Mock — testnet demo only");
      });
    }
    var liveBtn = rootEl.querySelector("#mode-live");
    if (liveBtn) {
      liveBtn.addEventListener("click", function () {
        App.ui.toast("Testnet demo only — Live is disabled", "warn");
      });
    }
    var walletBtn = rootEl.querySelector("#wallet-btn");
    if (walletBtn) {
      walletBtn.addEventListener("click", function () { toggleWallet(); });
    }
    highlightTabs();

  }

  function toggleWallet() {
    var u = App.ui;
    var btn = rootEl.querySelector("#wallet-btn");
    var label = rootEl.querySelector("#wallet-label");
    if (!btn || !label) { return; }
    if (!walletConnected) {
      walletConnected = true;
      btn.classList.add("on");
      label.innerHTML = '<span class="addr">0x7F3A…9C21 · 10,000 test USDC</span>';
      u.toast("Wallet connected (mock) · 0x7F3A…9C21");
    } else {
      walletConnected = false;
      btn.classList.remove("on");
      label.textContent = "Connect Wallet";
      u.toast("Wallet disconnected");
    }
  }

  function highlightTabs() {
    var route = currentRoute();
    var links = rootEl.querySelectorAll(".nav-tab");
    for (var i = 0; i < links.length; i++) {
      var on = links[i].getAttribute("data-route") === route;
      links[i].classList.toggle("on", on);
      if (on) { links[i].setAttribute("aria-current", "page"); } else { links[i].removeAttribute("aria-current"); }
    }
  }

  // Landing is the marketing front door: hide app chrome while on #/landing.
  function syncShell() {
    if (!rootEl) { return; }
    var shell = rootEl.querySelector(".shell");
    if (!shell) { return; }
    shell.classList.toggle("is-landing", currentRoute() === "landing");
  }

  function renderCurrent() {
    if (!mainEl || !booted) { return; }
    var route = currentRoute();
    syncShell();
    var view = App.views[route] || App.views.overview;
    view.render(mainEl);
    highlightTabs();

    if (mainEl.scrollTop) { window.scrollTo(0, 0); }
    revealOnce();
  }

  // Route changes: cancel every pending handle first (no cross-page
  // callback pollution). In-flight stress returns to idle; terminal
  // states (idle / recover) are preserved by state.
  function applyRoute() {
    var route = currentRoute();
    syncShell();
    var changed = route !== (App.state.route || "#/overview").slice(2);
    var flight = App.fn.stressFlying();
    App.fn.clearTimers();
    var patch = { route: "#/" + route, running: false };
    if (changed && flight) { patch.stress = "idle"; }
    App.setState(patch); // subscriber re-renders the current view
  }

  function boot() {
    if (booted) { return; }
    booted = true;
    rootEl = document.getElementById("app");
    var bootMsg = document.getElementById("boot-msg");
    if (bootMsg && bootMsg.parentNode) { bootMsg.parentNode.removeChild(bootMsg); }
    buildShell();
    window.addEventListener("hashchange", applyRoute);
    if (!location.hash || !/^#\/(landing|overview|ingest|audit|report)$/.test(location.hash)) {
      try { history.replaceState(null, "", "#/overview"); } catch (e) { location.hash = "#/overview"; }
    }
    App.nav = nav;
    App.navTo = navTo;
    App.applyRoute = applyRoute;
    App.renderCurrent = renderCurrent;
    App.onChange(function () { if (booted) { renderCurrent(); } });
    applyRoute();
  }

  // node-testable pure export; app.js loads headlessly for route assertions
  App.fn.routeKey = routeKey;
  App.fn.intentTarget = intentTarget;
  if (typeof document === "undefined") { return; } // node: stop before DOM wiring

  window.addEventListener("error", function () {
    if (App.ui) { App.ui.toast("Unexpected error — see console", "err"); }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

