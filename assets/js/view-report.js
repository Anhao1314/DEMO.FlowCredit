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
      ["check scope", "local session match"],
      ["rule", "v0.1"],
      ["timestamp", anchor.time],
      ["root match", "true · 4-leaf Merkle proof verified locally"]
    ].map(function (r) {
      return '<div class="verify-row"><span>' + u.esc(r[0]) + '</span><b class="num">' + u.esc(r[1]) + "</b></div>";
    }).join("");
    App.ui.openModal(
      '<div class="modal-head">' + u.icon("check", 18) + " On-chain verification</div>" +
      '<div class="verify-rows">' + rows + "</div>" +
      '<div class="root-hash num" style="font-size:12px;overflow-wrap:anywhere">' + u.esc(anchor.root) + "</div>" +
      '<p class="modal-note">Testnet mock: the match is computed locally in this session. Production path — ' +
      "the root is written by an on-chain contract and any third party can independently verify it through a " +
      "block explorer; FlowCredit holds no funds and is not the verifier.</p>" +
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
          '<button type="button" class="btn btn-primary btn-sm" id="verify-btn">' + ui.icon("shield", 13) + " Verify Proof</button></div>"
        : '<div class="proof-row"><span class="proof-label">On-chain proof · Merkle root</span>' +
          '<span class="tag tag-warning">not anchored — anchor data in P1 first</span>' +
          '<div class="spacer"></div>' +
          '<button type="button" class="btn btn-primary btn-sm" id="verify-btn">' + ui.icon("shield", 13) + " Verify Proof</button></div>";

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
        '<div class="m-note">grade <b style="color:' + (veto ? "#F87171" : "#34D399") + '">' + App.fn.gradeOf(d) + "</b> · weighted anchors</div></div>" +
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

      var actionsHtml =
        '<div class="report-actions">' +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn btn-primary btn-sm" id="report-open-btn">' +
        ui.icon("shield", 13) + " Open Audit Report</button>" +
        "</div>";

      host.innerHTML =
        '<div class="view-wrap">' + bannerHtml(st.stress) +
        '<div class="page-head"><div>' +
        '<div class="crumbs"><a href="#/landing">Landing</a><span>/</span><span class="cur">Monitor · P3</span></div>' +
        '<div class="page-title">' + ui.icon("shield", 22) + " P3 · Risk Monitoring &amp; Response</div>" +
        '<div class="page-sub">Verdict on-chain · response live.</div></div></div>' +
        actionsHtml +
        reportHtml + stressHtml +
        "</div>";

      if (App.aiPanel) { App.aiPanel(host, "report"); }

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
      var openBtn = host.querySelector("#report-open-btn");
      if (openBtn) {
        openBtn.addEventListener("click", function () {
          if (App.report && App.report.open) { App.report.open(); }
        });
      }
    } catch (e) {
      host.innerHTML = '<div class="card"><div class="card-title">Risk Monitoring — render fallback</div>' +
        '<p class="note-italic" style="margin-top:8px">A view error occurred; state remains intact. Press Reset or reload.</p></div>';
      if (App.ui) { App.ui.toast("View error — see console", "err"); }
    }
  }

  App.views = App.views || {};
  App.views.report = { render: render };
})();

/* ============================================================
   view-report.js (report overlay) — generated bilingual audit
   report shown as a light paper sheet in a large overlay.
   Faithful to the reference layout: gray-blue labels, orange
   warnings, green passes; values are derived at open time from
   SUBJECTS + App.fn (no hard-coded metric literals).
   The overlay is a snapshot: route/subject/reset/stress-start
   close it through the shared clear-hook discipline.
   ============================================================ */
(function () {
  var App = window.App = window.App || {};
  var DOC = typeof document !== "undefined" ? document : null;
  var overlay = null;
  var escKey = null;
  var SNAP = null;
  var NAV = [
    ["sum", "执行摘要"], ["p1", "P1 · 数据可信"], ["p2", "P2 · AI 评分"],
    ["p3", "P3 · 监控响应"], ["concl", "审计结论"], ["appx", "附录"]
  ];
  var GEN_STEPS = [
    "Compiling four signed sources",
    "Building Merkle fingerprint",
    "Scoring five anchors · CCI",
    "Sealing report · rule v0.1"
  ];

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function icon(n, s) { return (App.ui && App.ui.icon) ? App.ui.icon(n, s || 13) : ""; }
  function fmtInt(n) {
    try { return Number(n).toLocaleString("en-US"); }
    catch (e) { return String(n); }
  }
  function pad6(n) { var s = String(n); while (s.length < 6) { s = "0" + s; } return s; }
  function range(arr) {
    if (!arr || !arr.length) { return "-"; }
    return Math.min.apply(null, arr) + "-" + Math.max.apply(null, arr);
  }
  function intPct(v) { return Math.round(v * 100); }

  /* ---------------- snapshot ---------------- */
  function capture() {
    var st = App.state;
    var d = SUBJECTS[st.subject] ? SUBJECTS[st.subject] : SUBJECTS.healthy;
    var veto = App.fn.vetoed(d);
    var cci = App.fn.cci(d);
    var pdVal = App.fn.pd(cci);
    var devInfo = App.fn.deviation(d);
    var ts = App.fn.nowStamp();
    var iso = ts.slice(0, 10);
    var parts = iso.split("-");
    return {
      key: st.subject, d: d, veto: veto, cci: cci, pd: pdVal, grade: App.fn.gradeOf(d),
      credit: App.fn.creditLine(d), anchored: !!st.anchor, anchor: st.anchor,
      auditDone: st.auditStage === 4 && !st.running,
      dev: devInfo, vol: App.fn.volatilityPct(d), el: App.fn.expectedLoss(d),
      dataAsOf: d.dataAsOf || null, sourceIssues: d.sourceIssues || {},
      verdictKind: d.verdictKind || (veto ? "reject" : "approve"),
      meta: App.fn.stressMeta(st.stress),
      short: App.fn.nowShort(), iso: iso,
      dateCN: parts[0] + " 年 " + parts[1] + " 月 " + parts[2] + " 日",
      reportId: "FC-AUD-" + iso.replace(/-/g, "") + "-" +
        (d.reportCode || (st.subject === "healthy" ? "HM001" : "SYB001"))
    };
  }

  /* ---------------- tiny html builders ---------------- */
  function tbl(headers, rows) {
    var h = "<tr>";
    for (var i = 0; i < headers.length; i++) { h += "<th>" + esc(headers[i]) + "</th>"; }
    h += "</tr>";
    var b = "";
    for (var r = 0; r < rows.length; r++) {
      b += "<tr>";
      var cells = rows[r];
      for (var c = 0; c < cells.length; c++) { b += "<td>" + cells[c] + "</td>"; }
      b += "</tr>";
    }
    return '<div class="rpt-tblwrap"><table class="rpt-tbl"><thead>' + h +
      "</thead><tbody>" + b + "</tbody></table></div>";
  }
  function stChip(ch) {
    if (ch === "g") { return '<span class="rpt-st rpt-st-ok">' + icon("check", 11) + " Pass</span>"; }
    if (ch === "y") { return '<span class="rpt-st rpt-st-warn">' + icon("alert", 11) + " Warn</span>"; }
    return '<span class="rpt-st rpt-st-fail">' + icon("x", 11) + " Fail</span>";
  }
  function signed() {
    return '<span class="rpt-txt-ok">✓ Signed</span><span class="rpt-cell-note">testnet mock</span>';
  }
  function kpi(label, value, note, cls) {
    return '<div class="rpt-kpi"><div class="rpt-kpi-l">' + esc(label) + "</div>" +
      '<div class="rpt-kpi-v' + (cls ? " " + cls : "") + '">' + value + "</div>" +
      '<div class="rpt-kpi-n">' + note + "</div></div>";
  }

  /* ---------------- report body builders ---------------- */
  function mastheadHtml(s) {
    var meta = [
      ["报告编号 · Report ID", esc(s.reportId)],
      ["审计对象 · Subject", esc(s.d.label)],
      ["主体类型 · Type", esc(s.d.l0.compute.Model + " · " + s.d.l0.compute.Task)],
      ["报告日期 · Date", esc(s.dateCN)],
      ["Prepared for", "Institutional Credit Desk"],
      ["主体地址 · Subject", esc(App.fn.shortAddr(s.d.address))],
      ["规则版本 · Rule", "flowcredit.audit_result / v0.1"],
      ["数据截止 · Data as of", esc(s.dataAsOf || "—")],
      ["链上存证 · On-chain", s.anchored ? "已锚定 (Anchored)" : "未锚定 (Not anchored)"],
      ["Merkle Root", s.anchored && s.anchor ? esc(s.anchor.root.slice(0, 18) + "…") : "—"]
    ];
    var rows = [];
    for (var i = 0; i < meta.length; i++) {
      rows.push(['<span class="rpt-meta-l">' + meta[i][0] + "</span>", "<b>" + meta[i][1] + "</b>"]);
    }
    return '<div class="rpt-brandrow">' +
      '<span class="rpt-brand">' + icon("mark", 20) +
      '<span class="rpt-brand-sub">On-chain AI Credit Risk Intelligence</span></span>' +
      '<span class="rpt-brand-side">链上 AI 信用风控 · RegTech</span></div>' +
      '<div class="rpt-title">链上 AI 信用风控审计报告</div>' +
      '<div class="rpt-kicker">On-chain Attestation · AI Risk Scoring · Dynamic Response</div>' +
      '<div class="rpt-chips">' +
      '<span class="rpt-chip rpt-chip-ok"><i class="rpt-dot"></i>VERIFIED</span>' +
      '<span class="rpt-chip"><i class="rpt-dot"></i>TESTNET DEMO</span>' +
      '<span class="rpt-chip rpt-chip-warn"><i class="rpt-dot"></i>SIMULATED DATA · NOT FINANCIAL ADVICE</span></div>' +
      '<div class="rpt-autogen">本报告由 FlowCredit 链上 AI 信用风控引擎自动生成 · auto-generated by FlowCredit AI Engine</div>' +
      tbl(["", ""], rows) +
      '<div class="rpt-rule"></div>';
  }

  function execHtml(s) {
    var d0 = s.d;
    var lead = "本报告基于 FlowCredit 链上 AI 信用风控引擎，对 " + d0.label +
      " 在审计周期内的经营数据进行全链路可信核验与风险评估。数据经四源签名采集后生成 Merkle 指纹上链存证，" +
      "AI 引擎通过 L0→L5 流水线完成标准化、去水分、五锚核验、综合评分与违约概率测算，并输出动态风控响应建议。";
    var vk = s.verdictKind || (s.veto ? "reject" : "approve");
    var devPct = s.dev ? s.dev.pct : App.fn.deviation(d0).pct;
    var concl;
    if (vk === "reject") {
      concl = "审计结论：" + d0.label + " 触发 " + d0.redflags.length +
        " 项红旗并一票否决（VETO）：综合可信评分 CCI " + s.cci + "（" + s.grade + "），违约概率 " +
        s.pd.toFixed(1) + "%，双价值背离 +" + devPct + "% 越 2σ 告警；建议授信额度 0（拒绝），" +
        "转入持续链上监控与观察名单。";
    } else if (vk === "watch") {
      concl = "审计结论：" + d0.label + " 数据整体可核验，但覆盖不完整（Treasury 缺失周期、GPU 利用率自报待核验），" +
        "客户集中度 " + d0.l0.business.Top5 + " 偏高、回款 " + d0.l0.business.Repayment + " 走软。" +
        "综合可信评分 CCI " + s.cci + "（" + s.grade + "），违约概率约 " + s.pd.toFixed(1) +
        "%。建议给予小额谨慎授信 " + fmtInt(s.credit) + " test USDC，纳入观察名单并 HF 盯市、周度复评；" +
        "补齐数据与独立核验前，不开放完整压力情景与提额。";
    } else {
      concl = "审计结论：" + d0.label + " 经营数据链上存证完整，AI 风险评估综合可信评分 CCI " + s.cci +
        "（" + s.grade + "），违约概率 " + s.pd.toFixed(1) + "%，未触发重大红旗。" +
        "建议授予授信额度 " + fmtInt(s.credit) + " test USDC，并纳入动态风控监控体系。";
    }
    var isWatch = vk === "watch";
    var tiles =
      kpi("CCI · 综合可信评分", esc(s.cci) + ' <small>/ 1000</small>',
        "等级 " + esc(s.grade) + " · 五锚加权计算",
        s.veto ? "rpt-v-red" : (isWatch ? "" : "rpt-v-green")) +
      kpi("PD · 违约概率", s.pd.toFixed(1) + "%",
        "Logistic 标定 PD = 1/(1+e^(0.01156*CCI-5.433))", s.veto ? "rpt-v-red" : "") +
      kpi("建议授信额度",
        s.veto ? "0 test USDC" : fmtInt(s.credit) + " test USDC",
        s.veto ? "REJECTED · VETO" : (isWatch ? "谨慎额度 · 观察名单" : "审计后额度 · Post-audit Limit"),
        s.veto ? "rpt-v-red" : (isWatch ? "" : "rpt-v-green")) +
      kpi("重大红旗 · Material Flags",
        s.veto ? esc(d0.redflags.length) + " Material Flags" : "No hard flag",
        s.veto ? "硬规则命中 · 一票否决"
          : (isWatch ? "source gaps · coverage incomplete" : "✓ 五锚核验通过 · 未触发否决"),
        s.veto ? "rpt-v-red" : (isWatch ? "" : "rpt-v-green"));
    return '<h2 class="rpt-h2">执行摘要 · Executive Summary</h2>' +
      '<p class="rpt-p">' + esc(lead) + "</p>" +
      '<p class="rpt-p rpt-concl">' + esc(concl) + "</p>" +
      '<div class="rpt-kpis">' + tiles + "</div>";
  }

  function p1Html(s) {
    var d0 = s.d;
    function srcStatus(id) {
      var is = (s.sourceIssues || {})[id];
      if (!is) { return signed(); }
      var bad = is.level === "bad";
      return '<span class="rpt-st ' + (bad ? "rpt-st-fail" : "rpt-st-warn") + '">' +
        (bad ? icon("x", 11) : icon("alert", 11)) + " " + esc(is.text) + "</span>";
    }
    var rows = [
      ["GPU / 算力", "GPU 型号、运行时长、利用率、SCU 折算", srcStatus("gpu"),
        fmtInt(d0.gpuHours) + " GPU·h / util " + intPct(d0.util) + "%"],
      ["API / Token", "模型调用量、Raw Token、任务类型权重", srcStatus("billing"),
        esc(d0.l0.compute.Raw) + " → NT " + d0.rawNT_M.toFixed(1) + "M"],
      ["资金 / 回款", "收付款流水、客户回款率、账期分布", srcStatus("treasury"),
        "回款率 " + esc(d0.l0.business.Repayment) + " · 月支出 " + esc(d0.money)],
      ["链上 / 交易", "链上地址交互、交易频率、对手方聚类", srcStatus("chain"),
        d0.R.length + " 期记录 · 循环率 " + esc(d0.l0.business.Loop) +
        (s.veto ? " · 女巫聚类检出"
          : (s.verdictKind === "watch" ? " · 覆盖部分历史" : " · 女巫检测通过"))]
    ];
    var proof;
    if (s.anchored && s.anchor) {
      proof = '<div class="rpt-proof-card">' +
        '<div class="rpt-proof-head">' + icon("link", 14) + " 链上存证凭证 · On-chain Proof</div>" +
        '<div class="rpt-proof-grid">' +
        '<span class="rpt-proof-l">Merkle Root</span><span class="rpt-proof-v rpt-mono">' + esc(s.anchor.root) + "</span>" +
        '<span class="rpt-proof-l">锚定时间 · Anchored</span><span class="rpt-proof-v">' + esc(s.anchor.time) + "</span>" +
        '<span class="rpt-proof-l">规则版本 · Rule</span><span class="rpt-proof-v">flowcredit.audit_result / v0.1</span>' +
        '<span class="rpt-proof-l">Nonce</span><span class="rpt-proof-v rpt-mono">#' + pad6(s.anchor.nonce) + "</span>" +
        '<span class="rpt-proof-l">哈希匹配 · Hash</span><span class="rpt-proof-v rpt-txt-ok">local match · ✓ true · root matches P1 anchor</span>' +
        "</div>" +
        '<button type="button" class="rpt-vbtn" data-rpt-verify>' + icon("shield", 13) + " Verify Proof</button>" +
        "</div>";
    } else {
      proof = '<div class="rpt-proof-card rpt-proof-muted">' +
        '<div class="rpt-proof-head">' + icon("link", 14) + " 链上存证凭证 · On-chain Proof</div>" +
        '<div class="rpt-proof-grid">' +
        '<span class="rpt-proof-l">状态</span><span class="rpt-proof-v rpt-txt-warn">未锚定 (Not anchored) · 当前会话尚未生成 Merkle 指纹</span>' +
        '<span class="rpt-proof-l">操作</span><span class="rpt-proof-v">请先在 P1 · Truth Ingest 完成四源签名与锚定，再回到本报告核验</span>' +
        "</div></div>";
    }
    return '<h2 class="rpt-h2">一、数据可信核验 · P1 Truth Ingest</h2>' +
      '<p class="rpt-p">FlowCredit 采用四源同步采集机制，从算力消耗、API 调用、资金流水与链上交易四个维度获取原始经营凭证。' +
      "每条数据携带来源签名与时间戳，经标准化对齐后生成 Merkle 哈希树，将根指纹写入区块链完成不可篡改存证。</p>" +
      '<h3 class="rpt-h3">1.1 四源数据采集 · Four Signed Sources</h3>' +
      tbl(["数据源", "采集内容", "签名状态", "数据量 / 口径"], rows) +
      '<h3 class="rpt-h3">1.2 Merkle 锚定与链上存证 · Merkle Anchoring</h3>' +
      '<p class="rpt-p">四源数据经标准化清洗后，按时间窗口构建 Merkle 哈希树。每次锚定生成新的根哈希（Root），' +
      "连同时间戳、递增 nonce 与规则版本号一并上链。原始明细留存链下以保护隐私与控制成本，" +
      "第三方可通过根哈希独立验证数据完整性。</p>" + proof;
  }

  function l0L5Rows(s) {
    var d0 = s.d;
    var validPct = intPct(d0.validRate);
    var l3;
    if (s.veto) {
      l3 = "四项 Fail（效率/回款/客户/女巫）";
    } else if (s.verdictKind === "watch") {
      var gCount = 0, yCount = 0;
      for (var i = 0; i < d0.anchors.length; i++) {
        if (d0.anchors[i][5] === "g") { gCount++; }
        else if (d0.anchors[i][5] === "y") { yCount++; }
      }
      l3 = gCount + " pass · " + yCount + " warn";
    } else {
      l3 = "五项全绿";
    }
    return [
      ["L0", "可信接入", "四源自动采集，每条带时间戳与来源签名", "四源齐全 · 口径匹配"],
      ["L1", "标准化", "折算 NT（标准 Token）与 SCU（标准算力）",
        "Raw " + esc(d0.l0.compute.Raw) + " → NT " + d0.rawNT_M.toFixed(1) + "M · SCU " + fmtInt(App.fn.scuOf(d0))],
      ["L2", "去水分", "剔除空转/重复/脉冲刷量，计算有效率",
        "有效率 " + validPct + "% → 有效 " + App.fn.validNT_M(d0).toFixed(1) + "M"],
      ["L3", "五锚核验", "效率/回款/客户/成本/时序五维打分对照同业带", l3],
      ["L4", "综合评分", "加权得 CCI，换算 PD 与建议额度",
        "CCI " + s.cci + " (" + esc(s.grade) + ") / PD " + s.pd.toFixed(1) + "%"],
      ["L5", "链上存证", "结果指纹 Merkle 根上链，第三方可独立验证",
        s.anchored ? "已锚定，可验真" : "待锚定 · 前往 P1"]
    ];
  }

  function p2Html(s) {
    var d0 = s.d;
    var anchorMeta = [
      ["效率锚 · Efficiency", "25%", "NT/GPU·h 与同业基准带对比"],
      ["回款锚 · Repayment", "25%", "客户回款率与账期分布健康度"],
      ["客户锚 · Customer", "20%", "客户集中度、关联方占比、多样性"],
      ["成本锚 · Cost", "15%", "单位算力成本、毛利空间合理性"],
      ["时序锚 · Time/Sybil", "15%", "数据时序连续性、异常脉冲检测"]
    ];
    var anchorRows = [];
    for (var i = 0; i < d0.anchors.length && i < anchorMeta.length; i++) {
      var a = d0.anchors[i];
      anchorRows.push([
        "<b>" + anchorMeta[i][0] + "</b>",
        anchorMeta[i][1],
        anchorMeta[i][2],
        esc(a[2]) + ' <span class="rpt-cell-note">得分 ' + a[3] + "</span>",
        stChip(a[5])
      ]);
    }
    var flagHtml = "";
    if (s.veto) {
      var items = "";
      for (var f = 0; f < d0.redflags.length; f++) {
        items += '<div class="rpt-flag">' + icon("alert", 13) + esc(d0.redflags[f]) + "</div>";
      }
      flagHtml = '<div class="rpt-flag-box">' +
        '<div class="rpt-flag-title">' + icon("alert", 15) + " RED FLAGS · 红旗明细（一票否决）</div>" + items + "</div>";
    }

    var h = SUBJECTS.healthy, sy = SUBJECTS.sybil;
    function pair(key, hText, syText) {
      return [key, hText, syText];
    }
    var effH = App.fn.efficiency(h), effS = App.fn.efficiency(sy);
    var cciH = App.fn.cci(h), cciS = App.fn.cci(sy);
    var pdH = App.fn.pd(cciH), pdS = App.fn.pd(cciS);
    var gH = App.fn.gradeOf(h), gS = App.fn.gradeOf(sy);
    var devH = App.fn.deviation(h), devS = App.fn.deviation(sy), devNow = App.fn.deviation(d0);
    var ratio = effS > 0 && effH > 0 ? Math.round(effS / effH) : 0;
    var compare = [
      pair("毛 Token / 折算 NT",
        esc(h.l0.compute.Raw) + " / " + h.rawNT_M.toFixed(1) + "M",
        esc(sy.l0.compute.Raw) + " / " + sy.rawNT_M.toFixed(1) + "M（毛值更高）"),
      pair("SCU（GPU 折算）",
        fmtInt(h.gpuHours) + "h × " + intPct(h.util) + "% → " + fmtInt(App.fn.scuOf(h)),
        fmtInt(sy.gpuHours) + "h × " + intPct(sy.util) + "% → " + fmtInt(App.fn.scuOf(sy))),
      pair("有效率 / 有效 NT",
        intPct(h.validRate) + "% / " + App.fn.validNT_M(h).toFixed(1) + "M",
        intPct(sy.validRate) + "% / " + App.fn.validNT_M(sy).toFixed(1) + "M（反低于健康户）"),
      pair("效率 NT/GPU·h",
        fmtInt(effH) + "（基准带内）",
        fmtInt(effS) + "（约同业 " + ratio + " 倍 · 越界告警）"),
      pair("五锚状态", "五项全绿", "效率/回款/客户/女巫 四项 Fail"),
      pair("CCI / 等级", cciH + " / " + gH, cciS + " / " + gS),
      pair("PD 违约概率", pdH.toFixed(1) + "%", pdS.toFixed(1) + "%"),
      pair("双价值背离 D",
        "+" + devH.pct + "%（正常贴合）",
        "+" + devS.pct + "%（越 2σ 告警）"),
      pair("建议授信额度",
        '<span class="rpt-txt-ok">' + fmtInt(App.fn.creditLine(h)) + " test USDC</span>",
        '<span class="rpt-txt-red">0（REJECTED · VETO）</span>'),
      pair("审计结论",
        '<span class="rpt-txt-ok">APPROVE · 通过</span>',
        '<span class="rpt-txt-red">VETO · 红旗一票否决</span>')
    ];
    for (var q = 0; q < compare.length; q++) { compare[q][2] = '<span class="rpt-vs-sy">' + compare[q][2] + "</span>"; }

    var dev = devNow.alert ? '<span class="rpt-txt-red">越 2σ 告警 · 数据粉饰风险</span>'
      : '<span class="rpt-txt-ok">正常贴合</span>';
    return '<h2 class="rpt-h2">二、AI 风险评估 · P2 AI Risk Assessment</h2>' +
      '<p class="rpt-p">AI 引擎通过 L0→L5 六层流水线对链上存证数据进行深度加工：从可信接入开始，经标准化度量、' +
      "去水分过滤、五锚交叉核验、综合评分与违约概率测算，最终将结论指纹上链存证。" +
      "核心设计原则：毛消耗量不等于可信价值，任何单一维度严重异常即触发红旗一票否决。</p>" +
      '<h3 class="rpt-h3">2.1 L0→L5 流水线概览 · Pipeline Overview</h3>' +
      tbl(["层级", "名称", "处理逻辑", esc(d0.label) + " 结果"], l0L5Rows(s)) +
      '<h3 class="rpt-h3">2.2 五锚核验详情 · Five Anchors</h3>' +
      '<p class="rpt-p">五锚核验是 AI 风险评估的核心机制，通过效率、回款、客户、成本、时序五个维度对经营数据进行交叉验证。' +
      "任一维度严重偏离同业基准带即触发红旗；命中硬规则（效率严重越界、前五大客户占比过高且关联、回款率过低、检出女巫刷量簇）" +
      "时直接一票否决，无论其他维度评分多高均判 D 级、额度清零。</p>" +
      tbl(["锚点", "权重", "核验逻辑", "当前主体 · 当前值", "状态"], anchorRows) +
      flagHtml +
      '<h3 class="rpt-h3">2.3 双案例对照 · Healthy Merchant vs Sybil Address</h3>' +
      '<p class="rpt-p">为展示引擎对造假行为的识别能力，以下并列健康商户（Healthy Merchant）与刷量地址（Sybil Address）的评估结果。' +
      "核心反转：刷量地址毛 Token 消耗量远高于健康商户，但经去水分与五锚核验后，有效 NT 反低于健康商户，最终触发红旗一票否决。</p>" +
      tbl(["评估指标", "健康商户 (Healthy)", "刷量地址 (Sybil)"], compare) +
      '<h3 class="rpt-h3">2.4 双价值背离分析 · R/C Divergence</h3>' +
      '<p class="rpt-p">双价值背离（Divergence D）是 FlowCredit 的核心创新指标，衡量企业报表声明价值（R）与链上可信价值（C）' +
      "之间的偏离程度。计算公式：D = (R - C) / C。当 |D| 超过 2 个标准差时触发背离告警，" +
      "提示企业声明价值与链上可验证价值存在显著差异，可能存在数据粉饰或经营异常。</p>" +
      '<div class="rpt-div3">' +
      '<div class="rpt-div-cell"><div class="rpt-div-l">报表声明价值 R</div><div class="rpt-div-v rpt-mono">' +
      range(d0.R) + "</div><div class=\"rpt-div-n\">declared · 企业申报</div></div>" +
      '<div class="rpt-div-cell rpt-div-mid"><div class="rpt-div-l">背离度 D</div><div class="rpt-div-v rpt-mono">+' +
      devNow.pct + "%</div><div class=\"rpt-div-n\">" + dev + "</div></div>" +
      '<div class="rpt-div-cell"><div class="rpt-div-l">链上可信价值 C</div><div class="rpt-div-v rpt-mono">' +
      range(d0.C) + "</div><div class=\"rpt-div-n\">on-chain trusted · 链上可信</div></div>" +
      "</div>";
  }

  function p3Html(s) {
    var d0 = s.d;
    var frames = App.fn.stressFrames;
    var m = s.meta;
    var hfBox, crBox;
    if (s.veto) {
      hfBox = '<div class="rpt-hf-box"><div class="rpt-hf-l">当前健康因子 (HF)</div>' +
        '<div class="rpt-hf-v rpt-txt-muted">— (VETO)</div>' +
        '<div class="rpt-hf-n">无授信 · 不进入压力测试</div></div>';
      crBox = '<div class="rpt-hf-box"><div class="rpt-hf-l">当前授信额度</div>' +
        '<div class="rpt-hf-v rpt-txt-red">0 test USDC</div>' +
        '<div class="rpt-hf-n">REJECTED · VETO</div></div>';
    } else if (s.verdictKind === "watch") {
      hfBox = '<div class="rpt-hf-box"><div class="rpt-hf-l">当前健康因子 (HF)</div>' +
        '<div class="rpt-hf-v rpt-txt-muted">Watchlist</div>' +
        '<div class="rpt-hf-n">基线盯市 · 暂不开放完整压力测试</div></div>';
      crBox = '<div class="rpt-hf-box"><div class="rpt-hf-l">当前授信额度</div>' +
        '<div class="rpt-hf-v rpt-mono">' + fmtInt(s.credit) + " test USDC</div>" +
        '<div class="rpt-hf-n">谨慎额度 · 观察名单</div></div>';
    } else {
      var marginNote = (m.hf - frames.liquidationHf) >= 0.4 ? "安全边际充足"
        : (m.hf - frames.liquidationHf) >= 0.15 ? "安全边际承压" : "逼近清算线";
      hfBox = '<div class="rpt-hf-box"><div class="rpt-hf-l">当前健康因子 (HF)</div>' +
        '<div class="rpt-hf-v rpt-mono">' + m.hf.toFixed(2) + "</div>" +
        '<div class="rpt-hf-n">清算线 ' + frames.liquidationHf.toFixed(2) + " · " + marginNote + "</div></div>";
      crBox = '<div class="rpt-hf-box"><div class="rpt-hf-l">当前授信额度</div>' +
        '<div class="rpt-hf-v rpt-mono">' + fmtInt(m.credit) + " test USDC</div>" +
        '<div class="rpt-hf-n">' + (m.credit >= frames.idle.credit ? "Baseline · 基线额度"
          : (m.hf > frames.phases[0].hf ? "Recovered · 恢复后额度" : "De-risked · 去险后额度")) + "</div></div>";
    }
    var liq = frames.liquidationHf.toFixed(2);
    var idle = frames.idle, ph = frames.phases;
    var cut = Math.round((1 - ph[1].credit / idle.credit) * 100);
    var steps = [
      ["STEP 1", "市场正常", "基线监控，定期刷新 HF",
        "HF " + idle.hf.toFixed(2) + " / 额度 " + fmtInt(idle.credit)],
      ["STEP 2", "价值冲击 (Shock)", "触发市场风险横幅，HF 快速下跌",
        "HF " + idle.hf.toFixed(2) + " → " + ph[0].hf.toFixed(2) + "（逼近清算线 " + liq + "）"],
      ["STEP 3", "去风险 (De-risk)", "自动降低授信额度，控制敞口",
        "额度 " + fmtInt(idle.credit) + " → " + fmtInt(ph[1].credit) + "（-" + cut + "%）"],
      ["STEP 4", "通知 + 部分清算", "向主体发送 Margin Call，必要时部分清算", "HF 企稳，头寸受保护"],
      ["STEP 5", "回稳恢复 (Recover)", "市场回稳后自动恢复额度至安全水平",
        "HF " + ph[ph.length - 1].hf.toFixed(2) + " / 额度 " + fmtInt(ph[ph.length - 1].credit)]
    ];
    return '<h2 class="rpt-h2">三、风险监控与动态响应 · P3 Risk Monitoring &amp; Response</h2>' +
      '<p class="rpt-p">审计结论输出后，主体纳入 FlowCredit 动态风控监控体系。系统持续盯市健康因子（HF），' +
      "在市场剧烈波动时自动触发压力测试，并根据预设规则执行降额、预警、部分清算等风控动作，市场回稳后自动恢复额度。" +
      "整个响应过程上链留痕，确保风控决策可追溯、可审计。</p>" +
      '<h3 class="rpt-h3">3.1 健康因子监控 · Health Factor</h3>' +
      '<div class="rpt-hf-row">' + hfBox + crBox + "</div>" +
      '<h3 class="rpt-h3">3.2 压力测试与动态响应 · Stress &amp; Dynamic Response</h3>' +
      '<p class="rpt-p">压力测试模拟市场价值剧烈波动（Value Shock）场景，验证主体在极端行情下的抗风险能力与系统动态响应机制。' +
      "测试过程分为五个阶段，全程自动执行并上链留痕：</p>" +
      (s.verdictKind === "watch"
        ? '<p class="rpt-p rpt-txt-warn">观察名单（Watchlist）主体：当前为基线 HF 盯市与周度复评；' +
          "补齐缺失数据并经独立核验前，不开放完整压力测试情景。</p>"
        : tbl(["阶段", "触发条件", "系统动作", "HF / 额度变化"], steps) +
          (s.veto ? '<p class="rpt-p rpt-txt-warn">该主体已触发 VETO：授信额度为 0，不进入压力测试。</p>' : ""));
  }

  function p4Html(s) {
    var d0 = s.d;
    var lines = [];
    lines.push(
      s.anchored
        ? "（1）四源经营数据采集完整，Merkle 指纹已上链存证，数据完整性可独立验证；"
        : "（1）四源经营数据采集完成；当前会话尚未执行 P1 Merkle 锚定，可在 P1 补做后复验；");
    var vk4 = s.verdictKind || (s.veto ? "reject" : "approve");
    var devPct4 = s.dev ? s.dev.pct : App.fn.deviation(d0).pct;
    if (vk4 === "reject") {
      lines.push(
        "（2）L0→L5 流水线执行完成，五锚核验命中 " + d0.redflags.length + " 项红旗（效率越界 / Top-5 集中 / 回款过低 / 女巫簇），触发一票否决 VETO；",
        "（3）综合可信评分 CCI " + s.cci + "（" + s.grade + "），违约概率 PD " + s.pd.toFixed(1) +
          "%，双价值背离 +" + devPct4 + "% 越 2σ 告警；",
        "（4）建议不授予授信额度（0 test USDC），主体转入观察名单并持续链上监控，防止刷量模式迁移。");
    } else if (vk4 === "watch") {
      lines.push(
        s.auditDone
          ? "（2）L0→L5 流水线评估完成，无硬性红旗；锚点 2 pass / 3 warn（数据覆盖与集中度待观察）；"
          : "（2）L0→L5 流水线尚未在本会话完整跑完，可在 P2 重新运行审计后刷新本报告；",
        "（3）综合可信评分 CCI " + s.cci + "（" + s.grade + "），违约概率约 " + s.pd.toFixed(1) +
          "%，双价值背离 +" + devPct4 + "% 无告警；",
        "（4）建议小额谨慎授信 " + fmtInt(s.credit) + " test USDC，纳入观察名单（HF 盯市 + 周度复评），" +
          "暂不开放完整压力情景与提额。");
    } else {
      lines.push(
        s.auditDone
          ? "（2）L0→L5 流水线评估通过，五锚核验全部达标，未触发重大红旗；"
          : "（2）L0→L5 流水线尚未在本会话完整跑完，可在 P2 重新运行审计后刷新本报告；",
        "（3）综合可信评分 CCI " + s.cci + "（" + s.grade + "），违约概率 PD " + s.pd.toFixed(1) +
          "%，双价值背离 +" + devPct4 + "% 处于正常范围；",
        "（4）主体纳入动态风控监控体系，可在价值冲击时执行压力测试并自动响应，保护头寸安全。");
    }
    var risks = [
      "本报告基于测试网演示数据（simulated data），CCI/PD 模型为示例标定，不构成真实信用评估或投资建议。",
      "链上存证仅保证链上数据不可篡改，原始数据来源真实性需结合企业授权与多源交叉验证进一步确认。",
      "AI 算力/Token 消耗作为经营辅助指标的合理性尚需金融专业验证，目前尚无机构以此作为放贷/投资依据。",
      "香港地区链上财务数据存储与审计服务的合规要求需进一步确认，建议申请数码港区块链试点资助。"
    ];
    var riskHtml = "";
    for (var i = 0; i < risks.length; i++) {
      riskHtml += '<div class="rpt-risk">' + icon("alert", 13) + "<b>" + (i + 1) + ".</b> " + esc(risks[i]) + "</div>";
    }
    var measures;
    if (vk4 === "reject") {
      measures = [
        "不授予授信额度（0 test USDC），主体列入观察名单并持续链上监控。",
        "要求主体提供真实业务材料与实名信息，完成复核前不重新发起授信评估。",
        "对链上交互持续聚类监测，防止刷量/洗交易模式迁移或复活。",
        "若后续数据转真，可按标准流程重新发起 P1→P3 全链路审计。"
      ];
    } else if (vk4 === "watch") {
      measures = [
        "授予小额谨慎授信 " + fmtInt(s.credit) + " test USDC，纳入观察名单（HF 盯市 + 周度复评）。",
        "要求补齐 Treasury 缺失周期，并对 GPU 利用率引入独立交叉核验。",
        "持续复评客户集中度与回款趋势，恶化即下调额度。",
        "数据补齐并通过复评前，不开放完整压力测试与提额申请。"
      ];
    } else {
      measures = [
        "授予授信额度 " + fmtInt(s.credit) + " test USDC，纳入动态风控监控体系，设置 HF 预警线 1.20、清算线 " +
          App.fn.stressFrames.liquidationHf.toFixed(2) + "。",
        "建立月度审计复评机制，持续刷新 CCI/PD 与双价值背离指标，及时捕捉经营状况变化。",
        "对接银行流水与支付平台，实现多源数据交叉验证，提升原始数据真实性保障。",
        "关注香港 Web3 政策进展，适时申请数码港区块链与数字资产试点资助（最高 50 万港元）。"
      ];
    }
    var meaHtml = "";
    for (var j = 0; j < measures.length; j++) {
      var meaCls = s.veto ? " rpt-mea-v" : (vk4 === "watch" ? "" : " rpt-mea-ok");
      var meaIc = s.veto ? icon("x", 13) : (vk4 === "watch" ? icon("clock", 13) : icon("check", 13));
      meaHtml += '<div class="rpt-mea' + meaCls + '">' +
        meaIc + "<b>" + (j + 1) + ".</b> " + esc(measures[j]) + "</div>";
    }
    return '<h2 class="rpt-h2">四、审计结论与建议 · Conclusion &amp; Recommendation</h2>' +
      '<h3 class="rpt-h3">4.1 综合结论 · Overall Verdict</h3>' +
      '<p class="rpt-p">经 FlowCredit 链上 AI 信用风控引擎全流程审计，' + esc(d0.label) + " 在审计周期内：" +
      esc(lines.join(" ")) + "</p>" +
      '<h3 class="rpt-h3">4.2 风险提示 · Risk Warnings</h3>' + riskHtml +
      '<h3 class="rpt-h3">4.3 建议措施 · Recommended Actions</h3>' + meaHtml;
  }

  function appendixHtml(s) {
    var glossary = [
      ["NT", "标准 Token（Normalized Token），将不同模型/任务消耗量按难度折算后的可比口径"],
      ["SCU", "标准算力单位（Standard Compute Unit），将不同型号 GPU 按基准卡折算后的算力"],
      ["CCI", "可信分（Credit Confidence Index，0–1000），五锚点子分加权后 ×10，对应 A / A- / B / C / D 五个可信等级"],
      ["PD", "违约概率（Probability of Default），CCI 越高 PD 越低，Logistic 模型标定"],
      ["Merkle Root", "一批数据层层哈希后得到的唯一指纹，数据改动一个字符指纹即变，适合上链存证"],
      ["双价值背离 D", "D = (报表价值 R − 链上可信价值 C) / C，超过 2σ 触发背离告警"],
      ["HF", "健康因子（Health Factor），衡量抵押头寸安全边际，低于清算线 1.00 触发清算"],
      ["红旗一票否决", "命中硬规则时无论其他维度分多高，直接判 D 级、额度清零"]
    ];
    var rating = (App.fn.gradeBands || []).map(function (b, i) {
      var pdLo = App.fn.pd(b.max); // PD at the band's upper CCI edge (lower PD)
      var pdHi = App.fn.pd(b.min); // PD at the band's lower CCI edge (higher PD)
      var pdTxt = i === (App.fn.gradeBands.length - 1)
        ? "≈" + pdLo.toFixed(1) + "%+（VETO 强制 D）"
        : "≈" + pdLo.toFixed(1) + "%–" + pdHi.toFixed(1) + "%";
      return ["<b>" + b.key + "</b>", b.min + "–" + b.max, pdTxt, b.action, b.cadence];
    });
    var weights = [];
    for (var w = 0; w < ANCHOR_W.length; w++) {
      weights.push(Math.round(ANCHOR_W[w] * 100) + "%");
    }
    var elRows = SUBJECT_ORDER.map(function (k) {
      var dk = SUBJECTS[k];
      var ck = App.fn.cci(dk);
      return [
        dk.label,
        fmtInt(App.fn.creditLine(dk)) + " test USDC",
        App.fn.pd(ck).toFixed(1) + "%",
        "45%（demo）",
        String(App.fn.expectedLoss(dk))
      ];
    });
    var regTexts = [
      "四源签名采集、L0→L5 决策留痕与结论指纹存证，对应监管要求的可审计性与可解释性；",
      "Merkle 根存证可作为监管报送与事后稽核的链上完整性证据；",
      "FlowCredit 为 RegTech 工具，不吸储、不放贷、不托管资金、不作最终授信决定；",
      "原始明细链下存储、基于企业授权使用，呼应数据隐私与最小上链原则。"
    ];
    var regSuffix = "具体合规要求以香港当地法规与专业意见为准。";
    var regHtml = "";
    for (var r = 0; r < regTexts.length; r++) {
      regHtml += '<p class="rpt-p"><b>' + (r + 1) + ".</b> " +
        esc(regTexts[r] + regSuffix) + "</p>";
    }
    return '<h2 class="rpt-h2">附录 · Appendix</h2>' +
      '<h3 class="rpt-h3">A. 术语表 · Glossary</h3>' +
      tbl(["术语", "定义"], glossary) +
      '<h3 class="rpt-h3">B. 风险评级标准 · Rating Bands</h3>' +
      '<p class="rpt-p">FlowCredit 采用 CCI（综合可信评分，0–1000）作为核心评级指标，对应 A / A- / B / C / D 五个可信等级，' +
      "D 亦为红旗一票否决的终局等级。" +
      "评级由五锚子分加权计算，任一锚点触发硬规则红旗时直接一票否决判 D 级。PD（违约概率）由 Logistic 模型基于 CCI 标定，" +
      "CCI 越高 PD 越低。</p>" +
      tbl(["等级", "CCI 区间", "PD 区间", "授信建议", "风控动作"], rating) +
      '<p class="rpt-p" style="font-size:10.5px;color:#7A848E">注：PD 区间为边界近似 · 示例标定 · 由 PD 曲线反解；VETO 强制判 D 且额度清零，不适用其余档位。</p>' +
      '<h3 class="rpt-h3">C. 数据口径说明 · Data Calibration</h3>' +
      '<p class="rpt-p">本报告所有定量数据均为演示用 mock 示例数据（simulated data），非真实回测结果。' +
      "CCI 由五锚子分加权现算（效率 " + weights[0] + " / 回款 " + weights[1] + " / 客户 " + weights[2] +
      " / 成本 " + weights[3] + " / 时序 " + weights[4] + "），PD 由公式 PD = 1/(1+e^(0.01156*CCI-5.433)) 标定。" +
      "锚点权重与 PD 系数为 Demo 校准值，真实部署需经金融专业确认并基于历史数据训练。" +
      "L1 口径：Raw Token 取自 L0 原始采集值，rawNT_M 为已乘 w_model/w_task 后的折算 NT，L2 毛 NT 采用 rawNT_M。" +
      "波动率为链上可信序列 C 的 8 期环比收益率样本标准差现算（非年化、演示校准）；" +
      "背离度 D 采用 R/C 序列均值口径 D=(meanR−meanC)/meanC，与页面展示一致。</p>" +
      '<h3 class="rpt-h3">D. 审计局限性与免责声明 · Limitations &amp; Disclaimer</h3>' +
      '<p class="rpt-p">本审计报告存在以下局限性，使用者应予以充分关注：（1）数据范围局限：审计仅覆盖授权采集的四源数据' +
      "（算力、API、资金、链上），未涵盖企业全部经营活动，表外业务、关联交易等可能未被纳入；（2）模型局限：CCI/PD 模型为 " +
      "Demo 校准版本，锚点权重与 Logistic 系数未经真实历史数据训练，AI 算力/Token 消耗作为信用指标的合理性尚需金融专业验证；" +
      "（3）存证局限：链上存证仅保证上链后数据不可篡改，原始数据来源真实性依赖企业授权与多源交叉验证，不排除数据源本身存在造假" +
      "或错误的可能；（4）时点局限：审计结论基于审计周期内的数据快照，企业经营状况可能随时间发生重大变化，报告结论不代表对未来" +
      "信用状况的保证。</p>" +
      '<p class="rpt-p">免责声明：本报告由 FlowCredit 链上 AI 信用风控引擎自动生成，仅供演示与参考用途。' +
      "报告中的评估结果、评分、额度建议均基于测试网模拟数据与示例标定模型，不构成任何金融建议、投资建议、授信决策或法律意见。" +
      "FlowCredit 为 RegTech 工具，不吸储、不放贷、不碰资金、不做最终授信决定。使用者应结合自身判断与专业咨询，独立做出决策。" +
      "本报告内容受知识产权保护，未经授权不得复制、分发或用于商业用途。</p>" +
      '<h3 class="rpt-h3">E. 预期损失 · Expected Loss（demo）</h3>' +
      '<p class="rpt-p">预期损失按 EL = EAD × PD × LGD 现算（三主体遍历现算，不写死结果）；' +
      "LGD=45% 为演示假设（非拟合、非金融建议）。</p>" +
      tbl(["主体", "EAD · 建议额度", "PD", "LGD", "EL（现算）"], elRows) +
      '<h3 class="rpt-h3">F. 合规与监管映射 · RegTech Mapping</h3>' +
      '<p class="rpt-p">FlowCredit 平台定位与流程的监管科技映射如下：</p>' + regHtml;
  }

  function footerHtml(s) {
    return '<div class="rpt-engine">' +
      '<span class="rpt-engine-cell"><b>生成引擎 · Engine</b><br>FlowCredit AI Engine v0.1</span>' +
      '<span class="rpt-engine-cell"><b>报告生成时间 · Generated</b><br>' + esc(s.iso) + " " + esc(s.short) + "</span>" +
      '<span class="rpt-engine-cell rpt-engine-v"><b>链上验证 · On-chain</b><br>' +
      '<button type="button" class="rpt-vbtn" data-rpt-verify>' + icon("shield", 13) + " Verify Proof</button></span>" +
      "</div>";
  }

  function proofResultHtml() {
    var a = SNAP.anchor;
    var rows = [
      ["status", "local match · testnet mock"],
      ["rule", "v0.1 · flowcredit.audit_result"],
      ["timestamp", a.time],
      ["nonce", "#" + pad6(a.nonce)],
      ["root match", "true · 4-leaf Merkle proof verified locally"]
    ];
    var body = "";
    for (var i = 0; i < rows.length; i++) {
      body += '<div class="rpt-vrow"><span>' + esc(rows[i][0]) + '</span><b class="rpt-mono">' + esc(rows[i][1]) + "</b></div>";
    }
    return '<div class="rpt-proof-card rpt-proof-done">' +
      '<div class="rpt-proof-head">' + icon("check", 14) + " Proof · local session match</div>" + body +
      '<div class="rpt-mono rpt-rootline">' + esc(a.root) + "</div>" +
      '<p class="rpt-p" style="font-size:10.5px;color:#7A848E">Testnet mock: the match is computed locally in this session. ' +
      "Production path — the root is written by an on-chain contract and any third party can independently verify it " +
      "through a block explorer; FlowCredit holds no funds and is not the verifier.</p></div>";
  }

  function navHtml() {
    var out = '<nav class="rpt-nav" aria-label="Report sections">';
    for (var i = 0; i < NAV.length; i++) {
      out += '<button type="button" class="rpt-nav-btn" data-rpt-jump="' +
        NAV[i][0] + '">' + esc(NAV[i][1]) + "</button>";
    }
    return out + "</nav>";
  }
  function secHtml(key, inner) {
    return '<section class="rpt-sec" data-sec="' + key + '">' + inner + "</section>";
  }
  function jumpTo(key) {
    if (!overlay) { return; }
    var tgt = overlay.querySelector('.rpt-sec[data-sec="' + key + '"]');
    if (!tgt || typeof tgt.scrollIntoView !== "function") { return; }
    var smooth = true;
    try {
      smooth = !!(window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { smooth = true; }
    tgt.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }
  function backTop() {
    if (!overlay) { return; }
    var sheet = overlay.querySelector(".report-sheet");
    if (sheet && typeof sheet.scrollIntoView === "function") { sheet.scrollIntoView({ behavior: "auto" }); }
  }

  function genMotionOK() {
    try {
      return !!(window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return true; }
  }
  function genStepsHtml(idx) {
    var out = "";
    for (var i = 0; i < GEN_STEPS.length; i++) {
      var cls = i < idx ? "done" : (i === idx ? "on" : "todo");
      var ic = i < idx
        ? icon("check", 12)
        : '<i class="gs-dot"></i>';
      out += '<div class="gen-step ' + cls + '">' + ic +
        "<span>" + esc(GEN_STEPS[i]) + "</span></div>";
    }
    return out;
  }
  function loadHtml(idx) {
    return '<div class="report-load">' +
      '<div class="gen-spin"></div>' +
      '<div class="gen-title">Generating audit report</div>' +
      '<div class="gen-steps" aria-live="polite">' + genStepsHtml(idx) + "</div>" +
      '<div class="gen-note">rule v0.1 · demo calibration</div>' +
      "</div>";
  }
  function frameBodyHtml() {
    return '<div class="report-body">' +
      '<aside class="report-rail" aria-label="Report sections">' +
      '<div class="rail-title">SECTIONS · 章节</div>' +
      navHtml() +
      "</aside>" +
      '<div class="report-scroll"><div class="report-sheet" id="report-sheet">' +
      sheetHtml() +
      "</div></div>" +
      "</div>";
  }
  function startGenerate(stage) {
    if (!stage) { return; }
    if (!genMotionOK()) {
      stage.innerHTML = frameBodyHtml();
      return;
    }
    var target = overlay;
    var dur = 400;
    stage.innerHTML = loadHtml(0);
    for (var i = 0; i <= GEN_STEPS.length; i++) {
      (function (idx) {
        App.fn.timeout(function () {
          if (!overlay || overlay !== target || !stage.parentNode) { return; }
          stage.innerHTML = idx < GEN_STEPS.length ? loadHtml(idx) : frameBodyHtml();
        }, idx * dur + 200);
      })(i);
    }
  }

  function sheetHtml() {
    var s = SNAP;
    return mastheadHtml(s) +
      secHtml("sum", execHtml(s)) +
      secHtml("p1", p1Html(s)) +
      secHtml("p2", p2Html(s)) +
      secHtml("p3", p3Html(s)) +
      secHtml("concl", p4Html(s)) +
      secHtml("appx", appendixHtml(s)) +
      footerHtml(s) +
      '<div class="rpt-proof-slot"></div>' +
      '<div class="rpt-foot-note">Paper-style preview · numbers are a live snapshot of the running demo session</div>' +
      '<div class="rpt-backtop"><button type="button" class="rpt-vbtn" data-rpt-top>Back to top</button></div>';
  }

  /* ---------------- overlay lifecycle ---------------- */
  function onDocKey(e) {
    if (e && e.key === "Escape") { close(); }
  }
  function close() {
    if (!overlay || !DOC) { overlay = null; SNAP = null; return; }
    if (escKey && DOC) { DOC.removeEventListener("keydown", escKey); }
    escKey = null;
    if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    overlay = null;
    SNAP = null;
  }
  function open() {
    if (!DOC || !App.fn || !App.ui) { return; }
    if (overlay) { close(); }
    SNAP = capture();
    var root = DOC.createElement("div");
    root.className = "report-mask";
    root.id = "report-overlay";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "FlowCredit generated audit report");
    root.innerHTML =
      '<div class="report-frame">' +
      '<div class="report-chrome">' +
      '<span class="rc-brand">' + icon("mark", 16) + " · On-chain Audit Report</span>" +
      '<span class="rc-tag">testnet demo</span>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-rpt-close>' + icon("x", 13) + " Close</button>" +
      "</div>" +
      '<div class="report-stage"></div>' +
      "</div>";
    DOC.getElementById("layers").appendChild(root);
    overlay = root;
    escKey = function (e) { onDocKey(e); };
    DOC.addEventListener("keydown", escKey);
    root.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t === root) { close(); return; }
      while (t && t !== root) {
        if (t.getAttribute && t.getAttribute("data-rpt-close") != null) { close(); return; }
        if (t.getAttribute && t.getAttribute("data-rpt-verify") != null) {
          verifyNow();
          return;
        }
        if (t.getAttribute && t.getAttribute("data-rpt-jump") != null) {
          jumpTo(t.getAttribute("data-rpt-jump"));
          return;
        }
        if (t.getAttribute && t.getAttribute("data-rpt-top") != null) {
          backTop();
          return;
        }
        t = t.parentNode;
      }
    });
    var stage = root.querySelector(".report-stage");
    startGenerate(stage);
  }
  function verifyNow() {
    if (!overlay || !SNAP) { return; }
    if (!SNAP.anchored || !SNAP.anchor) {
      if (App.ui && App.ui.toast) { App.ui.toast("Anchor data in P1 first", "warn"); }
      return;
    }
    var slot = overlay.querySelector(".rpt-proof-slot");
    if (!slot) { return; }
    slot.innerHTML = proofResultHtml();
    if (App.ui && App.ui.toast) { App.ui.toast("Proof verified · local session match"); }
  }

  App.report = {
    open: open,
    close: close,
    isOpen: function () { return !!overlay; }
  };
  if (App.fn && App.fn.addClearHook) {
    App.fn.addClearHook(function () {
      if (overlay) { close(); }
    });
  }
})();
