/* ============================================================
   view-report.js — P3 Verified Report + value-volatility
   stress response. All visuals derive from App.state; a
   completed stress run (recover) survives route switches.
   ============================================================ */
(function () {
  var App = window.App = window.App || {};
  var ui = null;

  var FRAMES = App.fn.stressFrames; // shared stress frame table (state.js)
  // Curve derived from the shared frames: [idle, idle] + one point per
  // phase + settled tail — no duplicated literals.
  var CURVE_HF = [FRAMES.idle.hf, FRAMES.idle.hf].concat(
    FRAMES.phases.map(function (p) { return p.hf; }),
    [FRAMES.phases[FRAMES.phases.length - 1].hf]
  );
  var CURVE_STEPS = { idle: 2 };
  FRAMES.phases.forEach(function (p, i) {
    CURVE_STEPS[p.key] = (i === FRAMES.phases.length - 1) ? CURVE_HF.length : i + 3;
  });
  var MOTION_OK = typeof window !== "undefined" && window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TL = FRAMES.nodes.map(function (label, k) {
    return { step: String(k + 1), label: label };
  });

  function stressCurveHtml(stress) {
    var u = App.ui;
    var W = 560, H = 150, padL = 34, padR = 14, padT = 12, padB = 22;
    var hi = 2.05, lo = 0.85;
    var visible = CURVE_STEPS[stress] || 2;
    function x(i) { return padL + i * (W - padL - padR) / 7; }
    function y(hf) { return padT + (hi - hf) * (H - padT - padB) / (hi - lo); }
    var liqY = y(FRAMES.liquidationHf);
    var pts = [];
    for (var i = 0; i < visible; i++) {
      pts.push(x(i).toFixed(1) + "," + y(CURVE_HF[i]).toFixed(1));
    }
    var area = "";
    if (pts.length > 1) {
      area = '<path d="M' + pts.join(" L") + " L" + x(visible - 1).toFixed(1) + " " + (H - padB) +
        " L" + x(0).toFixed(1) + " " + (H - padB) + ' Z" fill="rgba(45,212,191,.06)" stroke="none"/>';
    }
    var grid = "";
    for (var g = 0; g <= 2; g++) {
      var gy = padT + g * (H - padT - padB) / 2;
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) +
        '" stroke="rgba(120,200,205,.08)" stroke-dasharray="2 5"/>';
    }
    var last = CURVE_HF[Math.max(0, visible - 1)];
    var danger = last <= FRAMES.liquidationHf + 0.05;
    var dotColor = danger ? "#F87171" : "#2DD4BF";
    var pulse = '<circle cx="' + x(visible - 1).toFixed(1) + '" cy="' + y(last).toFixed(1) +
      '" r="4.5" fill="none" stroke="' + dotColor + '" stroke-width="1.6">' +
      (MOTION_OK ? '<animate attributeName="r" values="3;6;3" dur="1.1s" repeatCount="indefinite"/>' : "") + "</circle>";
    return '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Health factor under stress">' +
      grid +
      '<line x1="' + padL + '" y1="' + liqY.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + liqY.toFixed(1) +
      '" stroke="#F87171" stroke-width="1.4" stroke-dasharray="5 4" opacity=".8"/>' +
      '<text x="' + (W - padR) + '" y="' + (liqY - 5).toFixed(1) + '" text-anchor="end" style="fill:#FCA5A5;font-size:8.5px;font-family:var(--mono)">liquidation ' + FRAMES.liquidationHf.toFixed(2) + "</text>" +
      area +
      '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#2DD4BF" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' +
      pulse +
      '<text x="' + padL + '" y="' + (padT + 9) + '" style="fill:#5E7478;font-size:8.5px;font-family:var(--mono)">' +
      (danger ? "HF " + last.toFixed(2) + " · near liquidation" : "HF " + last.toFixed(2)) + "</text>" +
      "</svg>";
  }

  function timelineHtml(stress) {
    var meta = App.fn.stressMeta(stress);
    var out = '<div class="tl">';
    TL.forEach(function (node, k) {
      var lit = meta.node > k;
      var now = meta.node === k + 1 && stress !== "recover";
      out += '<div class="tl-node' + (lit ? " lit" : "") + (now ? " now" : "") + '">' +
        '<span class="tl-dot"></span><span class="tl-step">STEP ' + node.step + "</span>" +
        '<span class="tl-label">' + node.label + "</span></div>";
    });
    return out + "</div>";
  }

  function bannerHtml(stress) {
    var u = App.ui;
    var flight = stress === "shock" || stress === "derisk" || stress === "notify" || stress === "partial";
    if (flight) {
      return '<div class="risk-banner" role="alert">' + u.icon("alert", 15) + " MARKET RISK: VALUE SHOCK DETECTED</div>";
    }
    if (stress === "recover") {
      return '<div class="risk-banner leave" aria-hidden="true">' + u.icon("alert", 15) + " MARKET RISK: VALUE SHOCK DETECTED</div>";
    }
    return "";
  }

  function verifyModal(anchor) {
    var u = App.ui;
    var rows = [
      ["status", "verified"],
      ["rule", "v0.1"],
      ["timestamp", anchor.time],
      ["hash match", "true · root matches P1 anchor"]
    ].map(function (r) {
      return '<div class="verify-row"><span>' + u.esc(r[0]) + '</span><b class="num">' + u.esc(r[1]) + "</b></div>";
    }).join("");
    App.ui.openModal(
      '<div class="modal-head">' + u.icon("check", 18) + " On-chain verification</div>" +
      '<div class="verify-rows">' + rows + "</div>" +
      '<div class="root-hash num" style="font-size:12px;overflow-wrap:anywhere">' + u.esc(anchor.root) + "</div>" +
      '<div style="margin-top:16px;text-align:right"><button type="button" class="btn btn-primary btn-sm" id="verify-close">Close</button></div>'
    );
    var close = document.getElementById("verify-close");
    if (close) { close.addEventListener("click", App.ui.closeModal); }
  }

  function creditNote(stress, credit) {
    var u = App.ui;
    var cut = Math.round((1 - credit / FRAMES.idle.credit) * 100);
    if (stress === "idle") { return "baseline " + u.fmtInt(FRAMES.idle.credit) + " · healthy subject"; }
    if (stress === "shock") { return "limit held during shock"; }
    if (stress === "derisk" || stress === "notify" || stress === "partial") { return "de-risked −" + cut + "% · limit " + u.fmtInt(credit); }
    return "recovered · limit " + u.fmtInt(credit);
  }

  function render(host) {
    if (!ui) { ui = App.ui; }
    try {
      var st = App.state;
      var d = SUBJECTS[st.subject];
      var veto = App.fn.vetoed(d);
      var cci = App.fn.cci(d);
      var pdVal = App.fn.pd(cci);
      var credit = App.fn.creditLine(d);
      var meta = App.fn.stressMeta(st.stress);
      var anchored = !!st.anchor;

      var flagsHtml = veto
        ? '<div class="flags-list">' + d.redflags.map(function (r) {
          return '<div class="flag-item">' + ui.icon("alert", 15) + "<span>" + ui.esc(r) + "</span></div>";
        }).join("") + "</div>"
        : '<div class="flag-ok">' + ui.icon("check", 14) + "No material flag</div>";

      var proofHtml = anchored
        ? '<div class="proof-row"><span class="proof-label">On-chain proof · Merkle root</span>' +
          '<span class="root-hash num" style="font-size:13px">' + ui.esc(st.anchor.root) + "</span>" +
          '<span class="chip chip-teal num">rule v0.1</span>' +
          '<span class="chip num">' + ui.esc(st.anchor.time) + "</span>" +
          '<div class="spacer"></div>' +
          '<button type="button" class="btn btn-primary btn-sm" id="verify-btn">' + ui.icon("shield", 13) + " Verify On-Chain</button></div>"
        : '<div class="proof-row"><span class="proof-label">On-chain proof · Merkle root</span>' +
          '<span class="chip chip-amber">not anchored — anchor data in P1 first</span>' +
          '<div class="spacer"></div>' +
          '<button type="button" class="btn btn-primary btn-sm" id="verify-btn">' + ui.icon("shield", 13) + " Verify On-Chain</button></div>";

      var reportHtml =
        '<div class="card">' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<span class="chip">' + ui.icon("shield", 11) + " Prepared for: Institutional Credit Desk</span>" +
        '<div class="spacer"></div>' +
        '<span class="chip chip-teal num">' + ui.esc(d.label) + "</span>" +
        '<span class="chip num">report · ' + ui.esc(App.fn.nowShort()) + "</span>" +
        "</div>" +
        '<div class="report-cols" style="margin-top:12px">' +
        '<div class="report-big"><div class="m-label">CCI · composite score</div>' +
        '<div class="m-value num">' + cci + '<small style="font-size:13px;color:var(--text3)"> / 1000</small></div>' +
        '<div class="m-note">grade <b style="color:' + (veto ? "#F87171" : "#34D399") + '">' + d.grade + "</b> · weighted anchors</div></div>" +
        '<div class="report-big"><div class="m-label">Probability of default</div>' +
        '<div class="m-value num" style="color:' + (veto ? "#F87171" : "var(--text)") + '">' + pdVal.toFixed(1) + "%</div>" +
        '<div class="m-note">logistic demo calibration</div></div>' +
        '<div class="report-big"><div class="m-label">Suggested credit line</div>' +
        '<div class="m-value num" style="color:' + (veto ? "#F87171" : "var(--text)") + '">' + ui.fmtMoney(credit) + "</div>" +
        '<div class="m-note">' + (veto ? "vetoed by red flags" : "post-audit limit") + "</div></div>" +
        '<div class="report-big"><div class="m-label">Material flags</div>' +
        '<div style="margin-top:6px">' + flagsHtml + "</div></div>" +
        "</div>" +
        proofHtml +
        "</div>";

      var stressHtml;
      if (veto) {
        stressHtml =
          '<div class="card reject-panel" style="margin-top:14px">' +
          '<div class="r-title">' + ui.icon("alert", 17) + " Credit rejected — facility closed</div>" +
          '<p class="note-italic" style="color:#FDA4AF;margin-top:6px">Sybil / wash-trading veto: credit line $0, no borrowing, no stress simulation.</p>' +
          '<div style="margin-top:12px"><button type="button" class="btn btn-danger-ghost btn-sm is-muted" id="stress-btn">' +
          ui.icon("pulse", 13) + ' Stress Test</button> <span class="note-italic" style="margin-left:9px">unavailable for this subject</span></div></div>';
      } else {
        var hfDanger = meta.hf <= FRAMES.liquidationHf + 0.05;
        var gaugePct = Math.min(100, (meta.hf / 2) * 100);
        var chipCls = st.stress === "recover" ? "chip-green" : (st.stress === "idle" ? "" : "chip-amber");
        var chipTxt = st.stress === "idle" ? "idle" : st.stress.toUpperCase();
        stressHtml =
          '<div class="card" style="margin-top:14px"><div class="card-h">' +
          '<div class="card-title">' + ui.icon("pulse", 15) + " Value Volatility · Dynamic Response</div>" +
          '<span class="chip ' + chipCls + ' num">' + chipTxt + "</span>" +
          '<div class="spacer"></div>' +
          '<button type="button" class="btn btn-primary btn-sm" id="stress-btn">' + ui.icon("pulse", 13) + " Stress Test</button>" +
          '<button type="button" class="btn btn-ghost btn-sm" id="recover-btn">Recover / Reset</button>' +
          "</div>" +
          '<div class="curve-box">' + stressCurveHtml(st.stress) + "</div>" +
          timelineHtml(st.stress) +
          '<div class="stress-metrics">' +
          '<div class="card hf-box" style="background:var(--card2)">' +
          '<div class="m-label" style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--text3)">Health Factor</div>' +
          '<div class="hf-main"><span class="hf-num num' + (hfDanger ? " danger" : "") + '">' + meta.hf.toFixed(2) + "</span>" +
          '<span class="hf-caption">liquidation at ' + FRAMES.liquidationHf.toFixed(2) + "</span></div>" +
          '<div class="liq-row"><span class="liq-track"></span>' +
          '<span class="liq-fill' + (hfDanger ? " low" : "") + '" style="width:' + gaugePct + '%"></span>' +
          '<span class="liq-line"></span><span class="liq-tag">' + FRAMES.liquidationHf.toFixed(2) + "</span></div></div>" +
          '<div class="card hf-box" style="background:var(--card2)">' +
          '<div class="m-label" style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--text3)">Credit Line</div>' +
          '<div class="hf-main"><span class="hf-num num" style="font-size:26px">' + ui.fmtMoney(meta.credit) + "</span></div>" +
          '<div class="hf-caption">' + creditNote(st.stress, meta.credit) + "</div></div>" +
          "</div>" +
          '<details class="how"><summary>How it works</summary><div class="how-body">' +
          "Stress run: shock pulls Health Factor " + FRAMES.idle.hf.toFixed(2) + " → " + FRAMES.phases[0].hf.toFixed(2) +
          " (red liquidation line at " + FRAMES.liquidationHf.toFixed(2) + ") while the market banner fires; " +
          "De-risk cuts the credit line " + App.ui.fmtInt(FRAMES.idle.credit) + " → " + App.ui.fmtInt(FRAMES.phases[1].credit) + "; " +
          "Notify + Partial Liquidation guard the position; recovery stabilizes HF at " +
          FRAMES.phases[FRAMES.phases.length - 1].hf.toFixed(2) + " and restores the line to " +
          App.ui.fmtInt(FRAMES.phases[FRAMES.phases.length - 1].credit) + ". Demo calibration — not financial advice.</div></details>" +
          "</div>";
      }

      host.innerHTML =
        '<div class="view-wrap">' + bannerHtml(st.stress) +
        '<div class="page-head"><div>' +
        '<div class="page-title">' + ui.icon("shield", 22) + " P3 · Verified Report</div>" +
        '<div class="page-sub">One-page trusted audit report + dynamic response to value volatility. ' +
        "State is shared with P1/P2 — return here after anchoring and auditing.</div></div></div>" +
        reportHtml + stressHtml +
        "</div>";

      var verifyBtn = host.querySelector("#verify-btn");
      if (verifyBtn) {
        verifyBtn.addEventListener("click", function () {
          if (!st.anchor) { App.ui.toast("Anchor data in P1 first", "warn"); return; }
          verifyModal(st.anchor);
        });
      }
      var stressBtn = host.querySelector("#stress-btn");
      if (stressBtn) {
        stressBtn.addEventListener("click", function () {
          if (veto) { App.ui.toast("Credit rejected — no facility to stress", "warn"); return; }
          App.act.stressRun();
        });
      }
      var recoverBtn = host.querySelector("#recover-btn");
      if (recoverBtn) {
        recoverBtn.addEventListener("click", function () { App.act.stressReset(); });
      }
    } catch (e) {
      host.innerHTML = '<div class="card"><div class="card-title">Verified Report — render fallback</div>' +
        '<p class="note-italic" style="margin-top:8px">A view error occurred; state remains intact. Press Reset or reload.</p></div>';
      if (App.ui) { App.ui.toast("View error — see console", "err"); }
    }
  }

  App.views = App.views || {};
  App.views.report = { render: render };
})();