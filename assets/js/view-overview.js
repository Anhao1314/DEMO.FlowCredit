/* ============================================================
   view-overview.js — FlowCredit product homepage (default route
   #/overview). Brand hero + live platform previews, all numbers
   derived from SUBJECTS + App.fn / App.fn.stressFrames at render
   time. The volatility preview is a LOCAL animation — it never
   writes App.state.stress; every handle lives in state.timer.
   ============================================================ */
(function () {
  var App = window.App = window.App || {};
  var ui = null; // resolved lazily (App.ui exists before first render)
  var MOTION_OK = typeof window !== "undefined" && window.matchMedia &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- module-local preview state (never touches state.stress) ---------- */
  var preview = { running: false, phase: "idle", done: false, el: null };
  var PREVIEW_DUR = [600, 400, 350, 400, 350]; // local pacing only (~2.1s incl. banner fade)
  var PHASE_LABEL = { idle: "IDLE", shock: "SHOCK", derisk: "DE-RISK", notify: "NOTIFY", partial: "PARTIAL LIQUIDATION", recover: "RECOVERED" };

  function resetPreview() {
    preview.running = false;
    preview.phase = "idle";
    preview.done = false;
    preview.el = null;
  }
  App.fn.addClearHook(resetPreview); // every clearTimers() (route switch, reset…) zeroes the preview

  /* ---------- shared content tables (structure, not results) ---------- */
  var PIPES = [
    { no: "L0", name: "Collect", sub: "raw ledgers · signed sources" },
    { no: "L1", name: "Normalize", sub: "tokens → NT · SCU" },
    { no: "L2", name: "Filter", sub: "idle · duplicate · pulse" },
    { no: "L3", name: "Anchor Check", sub: "5 peer bands · veto" },
    { no: "L4", name: "Score", sub: "CCI · PD · credit" },
    { no: "L5", name: "Anchor On-Chain", sub: "Merkle root · rule v0.1" }
  ];
  var ENTRIES = [
    { no: "P1", title: "Truth Ingest", icon: "db", hash: "#/ingest",
      sub: "Sign four sources and anchor a Merkle fingerprint on the testnet." },
    { no: "P2", title: "AI Audit", icon: "pulse", hash: "#/audit",
      sub: "Run the six-stage engine — every metric is computed live, red flags veto." },
    { no: "P3", title: "Verified Report", icon: "shield", hash: "#/report",
      sub: "Verify the on-chain proof and watch the facility respond to a shock." }
  ];

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
  /* ---------- usage guide: how to run the two demo lines ---------- */
  function stepChip(go, label) {
    return '<button type="button" class="gd-chip" data-go="' + go + '">' + label + "</button>";
  }
  function guideHtml(subjectKey) {
    var onOk = subjectKey === "healthy" ? " on" : "";
    var onRej = subjectKey === "sybil" ? " on" : "";
    return '<section class="card gd-card" id="ov-guide">' +
      '<div class="gd-head"><span class="gd-title">How to run this demo</span>' +
      '<span class="gd-badges"><span class="badge-testnet">Testnet</span>' +
      '<span class="chip chip-teal num">Mock data</span></span></div>' +
      '<p class="gd-sub">One pipeline, two ledgers. Pick a run below and follow the steps — every number is computed live from the selected ledger, then anchored on-chain and stress-tested in P3.</p>' +
      '<div class="gd-lines">' +
      '<div class="gd-line gd-line-ok' + onOk + '">' +
      '<span class="gd-name gd-ok">Run 1 · Healthy Merchant</span>' +
      '<span class="gd-steps">' +
      stepChip("ingest:anchor", "Anchor · P1") + '<i class="gd-ar">→</i>' +
      stepChip("audit:l0", "Run audit · P2") + '<i class="gd-ar">→</i>' +
      stepChip("report:proof", "Verify · P3") + '<i class="gd-ar">→</i>' +
      stepChip("report:stress", "Stress · P3") +
      '</span><span class="gd-note">approved path · no material flags</span></div>' +
      '<div class="gd-line gd-line-rej' + onRej + '">' +
      '<span class="gd-name gd-rej">Run 2 · Sybil Address</span>' +
      '<span class="gd-steps">' +
      '<button type="button" class="gd-chip gd-chip-sybil" data-guide-sybil="">Use Sybil ledger</button>' +
      '<i class="gd-ar">→</i>' +
      stepChip("ingest:anchor", "Anchor · P1") + '<i class="gd-ar">→</i>' +
      stepChip("audit:l0", "Run audit · P2") + '<i class="gd-ar">→</i>' +
      stepChip("report:proof", "Verdict · P3") +
      '</span><span class="gd-note">veto path · red flags hold the line at zero</span></div>' +
      '</div>' +
      '<p class="gd-foot">Same pipeline, opposite verdict — switch pages from the top tabs; run progress below tracks the current ledger.</p>' +
      '</section>';
  }
  /* ---------- shared section chrome ---------- */
  function hpHead(title, lead) {
    var u = App.ui;
    return '<header class="hp-head"><h2 class="hp-h2">' + u.esc(title) + "</h2>" +
      (lead ? '<p class="hp-lead">' + u.esc(lead) + "</p>" : "") + "</header>";
  }

  /* ---------- hero (product homepage form) ---------- */
  function heroHtml(vH) {
    var u = App.ui;
    return '<section class="card hp-hero"><div class="hp-hero-main">' +
      '<div class="hp-badges"><span class="badge-testnet">Testnet</span>' +
      '<span class="chip chip-teal num">Mock data</span></div>' +
      '<h1 class="hp-hero-title">The on-chain credit layer for AI-native revenue</h1>' +
      '<p class="hp-hero-sub">FlowCredit takes raw GPU / API ledgers down one auditable path: signed sources → normalize → filter wash traffic → five-anchor cross-check → CCI score &amp; credit line. Red flags trigger a hard veto — no other score can offset them.</p>' +
      '<div class="hp-theme num">' +
      '<span class="hp-legend"><i class="legend-key" style="background:#38BDF8"></i>R · declared value</span>' +
      '<span class="hp-legend"><i class="legend-key" style="background:#2DD4BF"></i>C · on-chain credible</span>' +
      '<span class="hp-gap">AI redefines value volatility — measure the gap.</span></div>' +
      '<div class="hp-cta">' +
      '<button type="button" class="btn btn-primary" id="ov-launch">' + u.icon("layers", 14) + " Launch live demo →</button>" +
      '<button type="button" class="btn btn-ghost" id="ov-scroll-live">' + u.icon("pulse", 14) + " Watch the audit live</button>" +
      "</div></div>" +
      heroCardHtml(vH) +
      "</section>";
  }

  function heroCardHtml(v) {
    var u = App.ui;
    var green = 'style="color:var(--green)"';
    var devCls = v.dev.alert ? "outside 2σ band" : "within 2σ band";
    var anchorChip = v.counts.g + "/" + v.d.anchors.length + " anchors";
    return '<div class="hp-hero-card" role="img" aria-label="Live audit preview, healthy merchant">' +
      '<div class="hp-card-head"><span class="chip chip-teal num">live audit · healthy merchant</span>' +
      '<div class="spacer"></div><span class="chip chip-green num">' + anchorChip + "</span></div>" +
      '<div class="ring-wrap"><div id="hp-ring-slot"></div></div>' +
      '<div class="ov-grade"><span class="grade-chip num" style="color:#34D399">grade ' + u.esc(v.grade) + "</span></div>" +
      '<div class="hp-tiles">' +
      '<div class="metric"><div class="m-label">Probability of default</div>' +
      '<div class="m-value num">' + v.pd.toFixed(1) + "%</div>" +
      '<div class="m-note">logistic demo calibration</div></div>' +
      '<div class="metric"><div class="m-label">Suggested credit line</div>' +
      '<div class="m-value num">' + u.fmtMoney(v.credit) + "</div>" +
      '<div class="m-note">post-audit limit</div></div>' +
      '<div class="metric"><div class="m-label">Deviation D</div>' +
      '<div class="m-value num">' + "+" + v.dev.pct + '%</div>' +
      '<div class="m-note">' + devCls + "</div></div>" +
      '<div class="metric"><div class="m-label">Valid NT</div>' +
      '<div class="m-value num" ' + green + ">" + v.valid + "M</div>" +
      '<div class="m-note">after wash filters</div></div>' +
      "</div>" +
      '<div class="hp-card-foot num">same pipeline · live numbers — derived at render time</div>' +
      "</div>";
  }

  function goAttr(go) {
    return go ? go.hash.slice(2) + ":" + go.block : "";
  }
  function runProgressHtml(j) {
    var u = App.ui;
    var d = SUBJECTS[j.subject] || SUBJECTS.healthy;
    var subjectChip = '<span class="chip ' + (j.vetoed ? "chip-red" : "chip-teal") + ' num">' +
      '<span class="sdot ' + (j.vetoed ? "dot-r" : "dot-g") + '" style="display:inline-block;margin-right:6px;vertical-align:-1px"></span>' +
      u.esc(d.label) + "</span>";
    var steps = j.steps.map(function (s) {
      var inner = '<span class="hp-rd ' + s.state + '"></span>' +
        '<span class="hp-rt">' + u.esc(s.label) + "</span>" +
        '<span class="hp-rs">' + u.esc(s.sub) + "</span>";
      if (s.go) {
        return '<button type="button" class="hp-run-step ' + s.state + '" data-go="' + goAttr(s.go) + '">' + inner + "</button>";
      }
      return '<span class="hp-run-step ' + s.state + '">' + inner + "</span>";
    }).join("");
    var nextGo = j.next ? goAttr(j.next) : "";
    return '<section class="ov-sec"><div class="card hp-run-card" id="hp-run">' +
      '<div class="card-h">' +
      '<div class="card-title">' + u.icon("layers", 15) + "Run progress — current ledger</div>" +
      '<span class="card-sub">one run per ledger · derived from shared state</span>' +
      subjectChip +
      (j.stressDone ? '<span class="chip chip-green num">run complete · terminal states persist</span>' : "") +
      '<div class="spacer"></div>' +
      (j.next ? '<button type="button" class="btn btn-primary btn-sm" id="ov-run-next" data-go="' + nextGo + '">Next: ' +
        u.esc(j.next.label) + " →</button>" : "") +
      "</div>" +
      '<div class="hp-run-grid">' + steps + "</div>" +
      "</div></section>";
  }
  function statsHtml() {
    var dH = SUBJECTS.healthy;
    var srcs = App.fn.sourceCards(dH).length;
    var anchorsN = dH.anchors.length;
    var subsN = 0;
    for (var k in SUBJECTS) { if (Object.prototype.hasOwnProperty.call(SUBJECTS, k)) { subsN++; } }
    var stats = [
      [String(srcs), "signed sources → one Merkle root"],
      [String(anchorsN), "weighted anchors per ledger"],
      [String(PIPES.length), "pipeline stages · L0 → L5"],
      [String(subsN), "live ledgers · one pipeline"]
    ];
    var html = stats.map(function (s) {
      return '<div class="card hp-stat"><b class="num">' + s[0] + "</b><span>" + s[1] + "</span></div>";
    }).join("");
    return '<section class="ov-sec"><div class="hp-stats">' + html + "</div></section>";
  }

  /* ---------- why ---------- */
  var WHY = [
    { icon: "alert", title: "Self-reported metrics can be faked",
      sol: "Multi-source signed ingest — only the Merkle fingerprint goes on-chain." },
    { icon: "layers", title: "Raw volume ≠ credible volume",
      sol: "Normalize, filter idle / duplicate / pulse, then 5-anchor cross-check with red-flag veto." },
    { icon: "pulse", title: "Lenders can\u2019t see risk move in real time",
      sol: "CCI / PD plus dynamic de-risk when value diverges from the ledger." }
  ];
  function whyHtml() {
    var cards = WHY.map(function (w) {
      return '<div class="card why-card">' +
        '<div class="why-ico">' + ui.icon(w.icon, 16) + "</div>" +
        '<div class="why-problem">' + ui.esc(w.title) + "</div>" +
        '<div class="why-sol"><span class="why-arrow">→</span> ' + ui.esc(w.sol) + "</div>" +
        "</div>";
    }).join("");
    return '<section class="ov-sec">' +
      hpHead("Why FlowCredit", "AI-native businesses report usage, not credit history. FlowCredit verifies the ledger before it underwrites the line.") +
      '<div class="why-grid">' + cards + "</div></section>";
  }

  /* ---------- live platform modules (subject-driven) ---------- */
  function subjectSegHtml(current) {
    var subs = ["healthy", "sybil"];
    return subs.map(function (sub) {
      var d = SUBJECTS[sub];
      return '<button type="button" class="seg-btn' + (current === sub ? " on" : "") + '" data-subject="' + sub + '">' +
        '<span class="sdot dot-' + (sub === "healthy" ? "g" : "r") + '" style="display:inline-block;margin-right:6px;vertical-align:-1px"></span>' +
        ui.esc(d.label) + "</button>";
    }).join("");
  }

  function volumeCardHtml(v) {
    var maxScale = 120; // same shared scale as P2 L2
    var rawPct = Math.round((v.raw / maxScale) * 100);
    var validPct = Math.round((v.valid / maxScale) * 100);
    var validCls = v.veto ? "r" : "g";
    var bars =
      '<div class="bar-row"><div class="bar-name">Raw NT<span class="formula">gross · after coefficients</span></div>' +
      '<span class="bar-track"><span class="bar-fill n" style="width:' + rawPct + '%"></span></span>' +
      '<span class="bar-val num">' + v.raw.toFixed(1) + "M</span></div>" +
      '<div class="bar-row"><div class="bar-name">Valid NT<span class="formula">after validity filter</span></div>' +
      '<span class="bar-track"><span class="bar-fill ' + validCls + '" style="width:' + validPct + '%"></span></span>' +
      '<span class="bar-val num">' + v.valid + "M</span></div>";
    var chain =
      '<div class="chain-note num">Raw Token <b>' + ui.esc(v.rawToken) + "</b> → NT <b>" + v.raw.toFixed(1) +
      "M</b> → Valid NT <b>" + v.valid + "M</b></div>" +
      '<p class="note-italic">' + (v.veto
        ? "Gross volume is higher yet credible volume collapses — filters expose the wash traffic."
        : "Validated volume keeps most of the normalized NT — filters only trim waste.") + "</p>";
    var dots = v.d.anchors.map(function (a) {
      return '<span class="ad-item" title="' + ui.esc(a[0] + " · state " + a[5]) + '">' +
        '<span class="sdot dot-' + a[5] + '"></span>' + ui.esc(a[0]) + "</span>";
    }).join("");
    var summary = v.counts.g === v.d.anchors.length
      ? '<span class="chip chip-green num">' + v.counts.g + "/" + v.d.anchors.length + " anchors within peer band</span>"
      : '<span class="chip chip-red num">veto · ' + v.counts.r + " red" + (v.counts.y ? " · " + v.counts.y + " amber" : "") + "</span>";
    return '<div class="vc-label">' + ui.icon("db", 12) + "Raw → Valid tokens · one 0-120M scale</div>" +
      bars + chain +
      '<div class="vc-label">Five anchor cross-checks</div>' +
      '<div class="anchor-dots">' + dots + "</div>" +
      '<div style="margin-top:7px">' + summary + "</div>";
  }

  function verdictCardHtml(v) {
    var u = App.ui;
    var gradeCol = v.veto ? "#F87171" : "#34D399";
    return '<div class="vc-label">' + ui.icon("shield", 12) + "Credit verdict</div>" +
      '<div class="ring-wrap"><div id="ov-ring-slot"></div></div>' +
      '<div class="ov-grade"><span class="grade-chip num" style="color:' + gradeCol + '">grade ' + ui.esc(v.grade) + "</span>" +
      '<span class="chip ' + (v.veto ? "chip-red" : "chip-teal") + ' num">' + (v.veto ? "vetoed" : "approved") + "</span></div>" +
      '<div class="metric-tiles">' +
      '<div class="metric"><div class="m-label">Probability of default</div>' +
      '<div class="m-value num" ' + (v.veto ? 'style="color:var(--red)"' : "") + ">" + v.pd.toFixed(1) + "%</div>" +
      '<div class="m-note">logistic demo calibration</div></div>' +
      '<div class="metric"><div class="m-label">Suggested credit line</div>' +
      '<div class="m-value num" ' + (v.veto ? 'style="color:var(--red)"' : "") + ">" + u.fmtMoney(v.credit) + "</div>" +
      '<div class="m-note">' + (v.veto ? "vetoed by red flags" : "from score + PD band") + "</div></div>" +
      "</div>" +
      (v.veto ? '<p class="note-italic" style="color:#FDA4AF;margin-top:8px">Red flags cannot be offset by other high scores.</p>' : "");
  }

  function divergenceCardHtml(v) {
    var u = App.ui;
    return '<div class="vc-label">' + ui.icon("pulse", 12) + "R vs C · value series</div>" +
      '<div class="chart-legend"><span><i class="legend-key" style="background:#38BDF8"></i>R · declared value</span>' +
      '<span><i class="legend-key" style="background:#2DD4BF"></i>C · on-chain credible</span></div>' +
      '<div class="chart-box"><div id="ov-line-slot"></div></div>' +
      '<div class="deviation-line"><span class="sdot dot-' + (v.dev.alert ? "r" : "g") + '"></span>' +
      "<span>Deviation D = +" + v.dev.pct + "%</span>" +
      (v.dev.alert
        ? '<span class="chip chip-red">>2σ · Value Deviation Alert</span>'
        : '<span class="chip chip-green">within 2σ band</span>') +
      "</div>";
  }

  function vcBannerHtml(v) {
    var u = App.ui;
    if (v.veto) {
      return '<div class="vc-banner vc-reject" role="alert">' + u.icon("alert", 15) +
        "<b>REJECTED: Sybil / wash-trading detected</b>" +
        '<span class="note-italic" style="color:#FDA4AF">' + v.counts.r + " red flags · hard-rule veto</span></div>";
    }
    return '<div class="vc-banner vc-ok">' + u.icon("check", 15) + "<b>No material flag</b>" +
      '<span class="note-italic">clean cross-check — same pipeline as the rejected ledger</span></div>';
  }

  function contrastHtml(v, subjectKey) {
    var u = App.ui;
    var inner = v.veto ? " veto-border" : "";
    return '<section class="card vc-panel' + (v.veto ? " veto" : " ok") + '" id="hp-live">' +
      '<div class="vc-head">' +
      '<div class="vc-title">' + u.icon("layers", 16) + "Platform in action</div>" +
      '<span class="card-sub">two ledgers · one pipeline</span>' +
      '<div class="spacer"></div>' +
      '<div class="seg" role="group" aria-label="subject">' + subjectSegHtml(subjectKey) + "</div></div>" +
      vcBannerHtml(v) +
      '<div class="vc-grid">' +
      '<div class="vc-card' + inner + '">' + volumeCardHtml(v) + "</div>" +
      '<div class="vc-card' + inner + '">' + verdictCardHtml(v) + "</div>" +
      '<div class="vc-card' + inner + '">' + divergenceCardHtml(v) + "</div>" +
      "</div>" +
      '<div class="vc-verdict">Same pipeline, opposite verdict — switch the subject above to watch the numbers flip.</div>' +
      '<div class="vc-relay">' +
      '<button type="button" class="btn btn-ghost btn-sm" data-go="audit:l0">' + u.icon("pulse", 13) + " Open this ledger in P2 →</button>" +
      (v.veto ? '<button type="button" class="btn btn-ghost btn-sm" data-go="report:proof">' + u.icon("shield", 13) + " Open P3 verdict →</button>" : "") +
      "</div>" +
      "</section>";
  }

  /* ---------- volatility preview (local, derived from shared frames) ---------- */
  function framesStoryHtml() {
    var u = App.ui;
    var f = App.fn.stressFrames;
    var last = f.phases[f.phases.length - 1];
    return "Shock pulls Health Factor " + f.idle.hf.toFixed(2) + " → " + f.phases[0].hf.toFixed(2) +
      " toward the " + f.liquidationHf.toFixed(2) + " liquidation line while the market banner fires; " +
      "de-risk cuts the credit line " + u.fmtInt(f.idle.credit) + " → " + u.fmtInt(f.phases[1].credit) + "; " +
      "Notify + Partial Liquidation guard the position; recovery settles HF at " + last.hf.toFixed(2) +
      ", line " + u.fmtInt(last.credit) + ".";
  }

  function previewTimelineHtml(phaseKey) {
    var u = App.ui;
    var f = App.fn.stressFrames;
    var meta = App.fn.stressMeta(phaseKey);
    var out = '<div class="tl ov-tl">';
    f.nodes.forEach(function (label, k) {
      var lit = meta.node > k;
      var now = meta.node === k + 1 && phaseKey !== "recover";
      out += '<div class="tl-node' + (lit ? " lit" : "") + (now ? " now" : "") + '">' +
        '<span class="tl-dot"></span><span class="tl-step">STEP ' + (k + 1) + "</span>" +
        '<span class="tl-label">' + u.esc(label) + "</span></div>";
    });
    return out + "</div>";
  }

  function previewCreditNote(phaseKey, credit) {
    var u = App.ui;
    var f = App.fn.stressFrames;
    var cut = Math.round((1 - credit / f.idle.credit) * 100);
    if (phaseKey === "idle") { return "baseline " + u.fmtInt(f.idle.credit) + " · healthy subject"; }
    if (phaseKey === "shock") { return "limit held during shock"; }
    if (phaseKey === "recover") { return "recovered · limit " + u.fmtInt(credit); }
    return "de-risked −" + cut + "% · limit " + u.fmtInt(credit);
  }

  function previewHtml() {
    var u = App.ui;
    var st = App.state;
    var d = SUBJECTS[st.subject];
    if (App.fn.vetoed(d)) {
      return '<div class="reject-panel" style="margin-top:0"><div class="r-title">' + u.icon("alert", 17) +
        " Credit rejected — facility closed</div>" +
        '<p class="note-italic" style="color:#FDA4AF;margin-top:5px">Suggested credit line $0 — no borrowing, no stress simulation for this subject.</p></div>';
    }
    var f = App.fn.stressFrames;
    var phaseKey = preview.done ? "recover" : preview.phase;
    var meta = App.fn.stressMeta(phaseKey);
    var liq = f.liquidationHf;
    var danger = meta.hf <= liq + 0.05;
    var gaugePct = Math.min(100, (meta.hf / 2) * 100);
    var chipCls = preview.done ? "chip-green" : (phaseKey === "idle" ? "" : "chip-amber");
    var chipTxt = PHASE_LABEL[phaseKey] || phaseKey.toUpperCase();
    var banner = "";
    if (!preview.done) {
      var flight = phaseKey === "shock" || phaseKey === "derisk" || phaseKey === "notify" || phaseKey === "partial";
      if (flight) {
        banner = '<div class="ov-banner" role="alert">' + u.icon("alert", 15) + " MARKET RISK: VALUE SHOCK DETECTED</div>";
      } else if (phaseKey === "recover") {
        banner = '<div class="ov-banner leave" aria-hidden="true">' + u.icon("alert", 15) + " MARKET RISK: VALUE SHOCK DETECTED</div>";
      }
    }
    var foot = preview.done
      ? '<div class="ov-pv-cta">' +
        '<button type="button" class="btn btn-primary" id="ov-p3-cta">' + u.icon("shield", 14) + " See full stress in P3 →</button>" +
        '<span class="note-italic">Recovery is terminal — a real P3 run keeps these values across page switches.</span></div>'
      : (phaseKey === "idle"
        ? '<p class="note-italic">' + framesStoryHtml() + "</p>"
        : '<p class="note-italic">' + (phaseKey === "recover" ? "Recovering — line restored, banner clearing…" : "Facility under guard — de-risk, notify, partial liquidation.") + "</p>");
    return '<div class="ov-pv">' + banner +
      '<div class="ov-pv-top"><span class="chip ' + chipCls + ' num">' + chipTxt + "</span>" +
      '<span class="note-italic">local replay · shared STRESS_FRAMES · global state untouched</span></div>' +
      '<div class="stress-metrics">' +
      '<div class="card hf-box ov-hf" style="background:var(--card2);margin-top:0">' +
      '<div class="m-label" style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--text3)">Health Factor</div>' +
      '<div class="hf-main"><span class="hf-num num' + (danger ? " danger" : "") + '">' + meta.hf.toFixed(2) + "</span>" +
      '<span class="hf-caption">liquidation at ' + liq.toFixed(2) + "</span></div>" +
      '<div class="liq-row"><span class="liq-track"></span>' +
      '<span class="liq-fill' + (danger ? " low" : "") + '" style="width:' + gaugePct + '%"></span>' +
      '<span class="liq-line"></span><span class="liq-tag">' + liq.toFixed(2) + "</span></div></div>" +
      '<div class="card hf-box ov-hf" style="background:var(--card2);margin-top:0">' +
      '<div class="m-label" style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--text3)">Credit Line</div>' +
      '<div class="hf-main"><span class="hf-num num" style="font-size:26px">' + u.fmtMoney(meta.credit) + "</span></div>" +
      '<div class="hf-caption">' + previewCreditNote(phaseKey, meta.credit) + "</div></div>" +
      "</div>" +
      previewTimelineHtml(phaseKey) +
      foot +
      "</div>";
  }

  function previewCardHtml() {
    var u = App.ui;
    return '<section class="card ov-sec"><div class="card-h">' +
      '<div class="card-title">' + u.icon("pulse", 15) + "Risk response, in real time</div>" +
      '<span class="card-sub">the platform reacts when on-chain value diverges — local replay of the exact frames P3 uses</span>' +
      '<div class="spacer"></div>' +
      (App.state.stress === "recover" ? '<span class="chip chip-green num">terminal state · preserved</span>' : "") +
      '<button type="button" class="btn btn-primary btn-sm" id="ov-preview-start">' + u.icon("pulse", 13) +
      " Preview dynamic response</button></div>" +
      '<div id="ov-preview-body"></div>' +
      "</section>";
  }

  /* ---------- pipeline with on/off-chain boundary ---------- */
  function pipeItemHtml(p, go) {
    var inner = '<span class="pipe-no num">' + p.no + "</span>" +
      '<span><span class="pipe-name">' + ui.esc(p.name) + "</span>" +
      '<span class="pipe-sub">' + ui.esc(p.sub) + "</span></span>" +
      (go ? '<span class="pipe-go" aria-hidden="true">→</span>' : "");
    if (go) {
      return '<button type="button" class="card pipe-item hp-pipe-go" data-go="' + go + '">' + inner + "</button>";
    }
    return '<div class="card pipe-item">' + inner + "</div>";
  }

  function pipelineHtml() {
    var u = App.ui;
    var st = App.state;
    var off = PIPES.slice(0, PIPES.length - 1);
    var on = PIPES[PIPES.length - 1];
    var offHtml = off.map(function (p, i) {
      return pipeItemHtml(p, "audit:l" + i);
    }).join("");
    var anchored = !!st.anchor;
    var liveSub = anchored
      ? "root " + st.anchor.root.slice(0, 18) + "… · nonce " + st.nonce + " · " + (st.chainLogs || []).length + " logs"
      : "anchor in P1 →";
    var onHtml = pipeItemHtml(
      { no: on.no, name: on.name, sub: liveSub },
      anchored ? "report:proof" : "ingest:anchor"
    );
    return '<section class="ov-sec">' +
      hpHead("The pipeline — data in, trust out", "Six stages run identically for every ledger. Source detail stays off-chain; only the Merkle fingerprint is anchored.") +
      '<div class="pipe-grid hp-pipe-off">' + offHtml + "</div>" +
      '<div class="hp-boundary">' +
      '<span class="hp-bd-side num">off-chain compute · L0–L4</span>' +
      '<span class="hp-bd-mid">' + u.icon("anchor", 15) + "<b>only the Merkle fingerprint goes on-chain</b><span class=\"num\">rule v0.1</span></span>" +
      '<span class="hp-bd-side num">on-chain · L5 anchor</span>' +
      "</div>" +
      '<div class="pipe-grid hp-pipe-on">' + onHtml + "</div>" +
      "</section>";
  }
  /* ---------- closing CTA band ---------- */
  function entrySubFor(no) {
    var st = App.state;
    var d = SUBJECTS[st.subject] || SUBJECTS.healthy;
    if (no === "P1") {
      return st.anchored
        ? st.chainLogs.length + " anchor log(s) · nonce " + st.nonce
        : "sign four sources · Merkle fingerprint only";
    }
    if (no === "P2") {
      if (st.auditStage === 4 && !st.running) {
        return "last run complete · CCI " + App.fn.cci(d) + (App.fn.vetoed(d) ? " · vetoed" : "");
      }
      if (st.auditStage >= 0 && !st.running) {
        return "interrupted at L" + st.auditStage + " — run again in P2";
      }
      return "six stages L0→L5 · red flags hard-veto";
    }
    if (App.fn.vetoed(d)) { return "vetoed verdict · no facility"; }
    if (st.stress === "recover") { return "stress exercised · HF recovered"; }
    return "verify proof · stress on demand";
  }
  function ctaBandHtml() {
    var u = App.ui;
    var entriesHtml = ENTRIES.map(function (e) {
      return '<button type="button" class="entry-card" data-nav="' + e.hash + '">' +
        '<span class="entry-t"><span class="entry-no num">' + e.no + "</span>" + u.icon(e.icon, 15) +
        "<span>" + u.esc(e.title) + "</span></span>" +
        '<span class="entry-sub">' + u.esc(entrySubFor(e.no)) + "</span>" +
        '<span class="entry-go">Open →</span></button>';
    }).join("");
    return '<section class="hp-cta-band ov-sec">' +
      hpHead("Run the full flow", "Three pages, one shared state: anchor the ledgers in P1, run the audit in P2, then verify and stress the facility in P3.") +
      '<div class="entry-grid">' + entriesHtml + "</div>" +
      '<p class="hp-disclaimer num">Testnet demo · simulated data · not financial advice · demo calibration</p>' +
      "</section>";
  }

  /* ---------- preview animation (local state only) ---------- */
  function paintPreview() {
    if (!ui) { ui = App.ui; }
    var el = preview.el;
    if (!el) { return; }
    el.innerHTML = previewHtml();
    var btn = el.ownerDocument && el.ownerDocument.getElementById("ov-preview-start");
    if (btn) {
      btn.disabled = !!preview.running;
      btn.classList.toggle("is-busy", !!preview.running);
    }
  }

  function stepPreview(i) {
    if (!preview.running) { return; }
    var f = App.fn.stressFrames;
    if (i >= f.phases.length) { return; }
    var phaseKey = f.phases[i].key;
    preview.phase = phaseKey;
    if (i === f.phases.length - 1) {
      paintPreview(); // recover frame: banner fades out (class "leave")
      App.fn.timeout(function () {
        if (!preview.running) { return; }
        preview.running = false;
        preview.done = true;
        paintPreview();
        App.ui.toast("Preview complete — same response path is live in P3");
      }, PREVIEW_DUR[i] || 350);
      return;
    }
    paintPreview();
    App.fn.timeout(function () {
      if (preview.running) { stepPreview(i + 1); }
    }, PREVIEW_DUR[i]);
  }

  function startPreview() {
    var d = SUBJECTS[App.state.subject];
    if (App.fn.vetoed(d)) { App.ui.toast("Credit rejected — no facility to stress", "warn"); return; }
    if (preview.running) { App.ui.toast("Preview already running — let it finish or switch page", "warn"); return; }
    App.fn.clearTimers(); // hook resets this module, stale handles die here
    preview.el = typeof document !== "undefined" ? document.getElementById("ov-preview-body") : null;
    if (!MOTION_OK) {
      preview.phase = "recover"; // reduced motion: land directly on the terminal state
      preview.done = true;
      paintPreview();
      App.ui.toast("Reduced motion — preview shown at terminal recovery state");
      return;
    }
    preview.running = true;
    preview.done = false;
    preview.phase = "idle";
    stepPreview(0);
  }

  /* ---------- main render ---------- */
  function render(host) {
    if (!ui) { ui = App.ui; }
    try {
      var st = App.state;
      var subjectKey = SUBJECTS[st.subject] ? st.subject : "healthy";
      var v = derive(subjectKey);
      var vH = derive("healthy");
      host.innerHTML =
        '<div class="view-wrap" id="ov-root">' +

        guideHtml(subjectKey) +
        heroHtml(vH) +
        runProgressHtml(journey(st)) +
        statsHtml() +
        whyHtml() +
        contrastHtml(v, subjectKey) +
        pipelineHtml() +
        previewCardHtml() +
        ctaBandHtml() +
        "</div>";

      var hpRingSlot = host.querySelector("#hp-ring-slot");
      if (hpRingSlot && vH) { App.ui.ring(hpRingSlot, vH.cci, "#2DD4BF"); }
      var ringSlot = host.querySelector("#ov-ring-slot");
      if (ringSlot && v) { App.ui.ring(ringSlot, v.cci, v.veto ? "#F87171" : "#2DD4BF"); }
      var lineSlot = host.querySelector("#ov-line-slot");
      if (lineSlot && v) { App.ui.lineChart(lineSlot, v.d.R, v.d.C, v.d.devAlert ? 5 : null); }

      preview.el = host.querySelector("#ov-preview-body");
      paintPreview();
      bind(host);
    } catch (e) {
      host.innerHTML = '<div class="card"><div class="card-title">Home — render fallback</div>' +
        '<p class="note-italic" style="margin-top:8px">A view error occurred; state remains intact. Use the tabs above to continue.</p></div>';
      if (App.ui) { App.ui.toast("View error — see console", "err"); }
    }
  }

  function bind(host) {
    var root = host.querySelector("#ov-root");
    if (!root) { return; }
    root.addEventListener("click", function (ev) {
      var n = ev.target;
      while (n && n !== root && n.nodeType === 1) {
        var id = n.id || "";
        if (id === "ov-preview-start") { startPreview(); return; }
        if (id === "ov-p3-cta") { if (App.nav) { App.nav("#/report"); } return; }
        if (id === "ov-launch") { if (App.nav) { App.nav("#/ingest"); } return; }
        if (id === "ov-scroll-live") {
          var live = typeof document !== "undefined" && document.getElementById("hp-live");
          if (live && live.scrollIntoView) {
            live.scrollIntoView({ behavior: MOTION_OK ? "smooth" : "auto", block: "start" });
          }
          return;
        }
        if (n.getAttribute) {
          var ds = n.getAttribute("data-subject");
          if (ds) { App.act.switchSubject(ds); return; }
          var gs = n.getAttribute("data-guide-sybil");
          if (gs !== null) {
            if (App.act && App.act.switchSubject) { App.act.switchSubject("sybil"); }
            return;
          }
          var dg = n.getAttribute("data-go");
          if (dg && App.navTo) {
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
