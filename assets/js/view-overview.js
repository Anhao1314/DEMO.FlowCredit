/* ============================================================
   view-overview.js — FlowCredit Home (default route #/overview).
   Four blocks only:
     1) current-run status bar (milestones + Next)
     2) two demo-line cards (Healthy / Sybil) with step jumps
     3) L0→L5 pipeline legend with the on-chain boundary
     4) one-line note
   All metrics derive from SUBJECTS + App.fn at render time —
   never written as literals. Navigation = top tabs; every step
   chip uses data-go → App.navTo deep-link intents. No local
   animation, no preview, no duplicated live dashboards.
   ============================================================ */
(function () {
  var App = window.App = window.App || {};
  var ui = null; // resolved lazily (App.ui exists before first render)

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- pure derivation shared by render and node assertions ---------- */
  function derive(subjectKey) {
    var d = SUBJECTS[subjectKey];
    if (!d) { return null; }
    var cci = App.fn.cci(d);
    var dev = App.fn.deviation(d);
    var states = d.anchors.map(function (a) { return a[5]; });
    var counts = { g: 0, y: 0, r: 0 };
    states.forEach(function (s) { if (counts[s] != null) { counts[s]++; } });
    return {
      d: d,
      cci: cci,
      pd: App.fn.pd(cci),
      credit: App.fn.creditLine(d),
      veto: App.fn.vetoed(d),
      raw: App.fn.ntM(d),          // gross NT = rawNT_M (L2 scale; Raw Token stays in l0.compute.Raw)
      rawToken: d.l0.compute.Raw,   // Raw Token, taken from l0.compute.Raw — never rawNT_M
      valid: App.fn.validNT_M(d),
      scu: App.fn.scuOf(d),
      efficiency: App.fn.efficiency(d),
      dev: dev,
      grade: d.grade,
      flags: (d.redflags || []).slice(),
      anchorStates: states,
      counts: counts
    };
  }

  /* ---------- derived run progress (read-only, from global state) ---------- */
  function journey(st) {
    st = st || App.state;
    var d = SUBJECTS[st.subject] || SUBJECTS.healthy;
    var veto = App.fn.vetoed(d);
    var anchored = !!st.anchored;
    var auditDone = st.auditStage === 4 && !st.running;
    var reportReady = anchored && auditDone;
    var stressDone = st.stress === "recover";
    var next;
    if (!anchored) {
      next = { key: "anchor", label: "Anchor data in P1", hash: "#/ingest", block: "anchor" };
    } else if (!auditDone) {
      next = { key: "audit", label: "Run audit in P2", hash: "#/audit", block: "l0" };
    } else if (veto) {
      next = { key: "ledger", label: "Start Healthy run", hash: "#/overview", block: "subject-healthy" };
    } else if (!stressDone) {
      next = { key: "stress", label: "Run stress in P3", hash: "#/report", block: "stress" };
    } else {
      next = { key: "replay", label: "Replay run", hash: "#/ingest", block: "anchor" };
    }
    var steps = [
      { key: "ledger", label: "Ledger", sub: d.label, state: "done", go: null },
      { key: "anchor", label: "Signed & anchored", sub: "four sources · merkle root · fresh nonce",
        state: anchored ? "done" : "todo", go: { hash: "#/ingest", block: "anchor" } },
      { key: "audit", label: "Audit L0–L4", sub: "normalize · filter · veto check",
        state: auditDone ? "done" : "todo", go: { hash: "#/audit", block: "l0" } },
      { key: "report", label: "Report & proof", sub: "verified root · credit verdict",
        state: reportReady ? "done" : "todo", go: { hash: "#/report", block: "proof" } },
      { key: "stress", label: "Stress cycle",
        sub: veto ? "no facility · vetoed" : "shock → de-risk → recover",
        state: veto ? "blocked" : (stressDone ? "done" : "todo"),
        go: veto ? null : { hash: "#/report", block: "stress" } }
    ];
    steps.forEach(function (s) {
      if (s.state === "todo" && next && s.key === next.key) { s.state = "next"; }
    });
    return {
      subject: st.subject, vetoed: veto, anchored: anchored,
      logs: (st.chainLogs || []).length, nonce: st.nonce || 0,
      auditDone: auditDone, reportReady: reportReady, stressDone: stressDone,
      allDone: veto ? false : stressDone, steps: steps, next: next
    };
  }

  /* ---------- small builders ---------- */
  function goKey(go) {
    if (!go || !go.hash) { return ""; }
    return go.hash.replace(/^#\//, "") + ":" + (go.block || "");
  }
  function chip(go, label, line, extraCls) {
    return '<button type="button" class="ln-chip' + (extraCls ? " " + extraCls : "") +
      '" data-go="' + go + '" data-line="' + line + '">' + esc(label) + "</button>";
  }
  function switchChip(label, subject) {
    return '<button type="button" class="ln-chip ln-chip-line" data-subject="' + subject + '">' + esc(label) + "</button>";
  }
  function arrow() { return '<i class="ln-ar" aria-hidden="true">→</i>'; }

  /* ---------- block 1: current-run status bar ---------- */
  function milestoneHtml(s) {
    var inner = '<i class="hb-dot ' + s.state + '"></i><span class="hb-sn">' + esc(s.label) + "</span>";
    if (!s.go) {
      return '<span class="hb-step ' + s.state + '" title="' + esc(s.sub) + '">' + inner + "</span>";
    }
    return '<button type="button" class="hb-step ' + s.state + '" title="' + esc(s.sub) +
      '" data-go="' + goKey(s.go) + '">' + inner + "</button>";
  }
  function statusBarHtml(j) {
    var d = SUBJECTS[j.subject];
    var label = d ? d.label : j.subject;
    var stepsHtml = "";
    for (var i = 0; i < j.steps.length; i++) { stepsHtml += milestoneHtml(j.steps[i]); }
    var next = j.next;
    var nextGo = goKey(next);
    return '<section class="card hb-bar" aria-label="Run status">' +
      '<span class="hb-subject" title="current ledger"><i class="hb-dot done"></i>' + esc(label) + "</span>" +
      '<div class="hb-steps">' + stepsHtml + "</div>" +
      '<button type="button" class="btn btn-primary btn-sm hb-next" data-go="' + nextGo +
      '">Next: ' + esc(next.label) + " →</button>" +
      "</section>";
  }

  /* ---------- block 2: two demo lines ---------- */
  function cardPill(key, d) {
    try {
      if (key === "sybil") {
        var vetoOk = typeof App.fn.vetoed === "function" && App.fn.vetoed(d) === true &&
          typeof App.fn.creditLine === "function" && App.fn.creditLine(d) === 0;
        return vetoOk ? '<span class="ln-pill ln-pill-rej">REJECTED · VETO</span>' : "<span>—</span>";
      }
      return '<span class="ln-pill ln-pill-ok">APPROVED</span>';
    } catch (e) {
      return "<span>—</span>";
    }
  }
  function lineCardHtml(key) {
    var d = SUBJECTS[key];
    var label = d ? d.label : key;
    var on = App.state.subject === key ? " on" : "";
    var pill = d ? cardPill(key, d) : "<span>—</span>";
    var stepsHtml = "";
    if (key === "sybil") {
      stepsHtml = switchChip("Use Sybil ledger", "sybil") + arrow() +
        chip("ingest:anchor", "Anchor · P1", key) + arrow() +
        chip("audit:l0", "Run audit · P2", key) + arrow() +
        chip("report:proof", "Verdict · P3", key);
    } else {
      stepsHtml = chip("ingest:anchor", "Anchor · P1", key) + arrow() +
        chip("audit:l0", "Run audit · P2", key) + arrow() +
        chip("report:proof", "Verify · P3", key) + arrow() +
        chip("report:stress", "Stress · P3", key);
    }
    return '<section class="ln-card card' + on + '" data-line="' + key + '">' +
      '<div class="ln-top"><span class="ln-title">' + esc(label) + "</span>" + pill + "</div>" +
      '<div class="ln-steps">' + stepsHtml + "</div>" +
      '<div class="ln-note">' + (key === "sybil"
        ? "veto path — red flags hold the credit line at zero; run it after the healthy line for contrast."
        : "approved path — no material flags; end with the P3 stress cycle.") + "</div>" +
      "</section>";
  }
  function linesHtml() {
    return '<section class="ln-sec">' +
      '<div class="ln-head"><span class="ln-head-t">Pick a ledger to run</span>' +
      '<span class="ln-head-s">two lines, one pipeline — steps jump to the page that runs them</span></div>' +
      '<div class="ln-grid">' + lineCardHtml("healthy") + lineCardHtml("sybil") + "</div></section>";
  }

  /* ---------- block 3: pipeline legend (static, not clickable) ---------- */
  function legendHtml() {
    var off = [
      ["L0", "Collect"], ["L1", "Normalize"], ["L2", "Filter"],
      ["L3", "Anchor Check"], ["L4", "Score"]
    ];
    var row = "";
    for (var i = 0; i < off.length; i++) {
      if (i > 0) { row += arrow(); }
      row += '<span class="lg-node"><b>' + off[i][0] + "</b>" + esc(off[i][1]) + "</span>";
    }
    return '<section class="card lg-card" aria-label="Pipeline legend">' +
      '<div class="lg-head"><span class="lg-head-t">Pipeline · L0 → L5</span>' +
      '<span class="lg-side">off-chain compute</span></div>' +
      '<div class="lg-row">' + row +
      '<span class="lg-bd">only the Merkle fingerprint goes on-chain · rule v0.1</span>' +
      '<span class="lg-node lg-on"><b>L5</b>Anchor On-Chain</span>' +
      '<span class="lg-side lg-side-on">on-chain</span></div></section>';
  }

  /* ---------- block 4: one-line note ---------- */
  function homeNoteHtml() {
    return '<p class="hn-note">One pipeline, two verdicts — run them side by side; every number computes live ' +
      "from the selected ledger. Switch pages from the top tabs.</p>";
  }

  /* ---------- main render ---------- */
  function render(host) {
    if (!ui) { ui = App.ui; }
    try {
      var st = App.state;
      var subjectKey = SUBJECTS[st.subject] ? st.subject : "healthy";
      host.innerHTML = '<div class="view-wrap" id="ov-root">' +
        statusBarHtml(journey(st)) +
        linesHtml(subjectKey) +
        legendHtml() +
        homeNoteHtml() +
        "</div>";
      bind(host);
    } catch (e) {
      try {
        host.innerHTML = '<div class="view-wrap" id="ov-root"><div class="card"><div class="card-title">Home — render fallback</div>' +
          '<p class="note-italic" style="margin-top:8px">A view error occurred; state remains intact. Use the tabs above to continue.</p></div></div>';
      } catch (e2) { /* host stays readable */ }
      if (App.ui && App.ui.toast) { App.ui.toast("View error — see console", "err"); }
    }
  }

  /* ---------- delegated clicks: switch ledger / deep-link steps ---------- */
  function bind(host) {
    var root = host.querySelector("#ov-root");
    if (!root) { return; }
    root.addEventListener("click", function (ev) {
      var n = ev.target;
      while (n && n !== root && n.nodeType === 1) {
        if (n.getAttribute) {
          var ds = n.getAttribute("data-subject");
          if (ds) {
            if (App.act && App.act.switchSubject) { App.act.switchSubject(ds); }
            return;
          }
          var dg = n.getAttribute("data-go");
          if (dg && App.navTo) {
            var line = n.getAttribute("data-line");
            if (line && line !== App.state.subject && App.act && App.act.switchSubject) {
              try { App.act.switchSubject(line); } catch (e) { /* nav still proceeds */ }
            }
            var dp = dg.split(":");
            App.navTo("#/" + dp[0], { page: dp[0], block: dp[1] || null });
            return;
          }
          var dn = n.getAttribute("data-nav");
          if (dn && App.nav) { App.nav(dn); return; }
        }
        n = n.parentNode;
      }
    });
  }

  App.views = App.views || {};
  App.views.overview = { render: render, derive: derive, journey: journey };
})();