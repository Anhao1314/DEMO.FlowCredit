/* ============================================================
   state.js — global store, pure metric functions, pipeline &
   stress state machines, timer discipline.
   Self-test (node, stubbed window):
     cci(healthy)=795, cci(watch)=668, cci(sybil)=320
     pd(795)=2.3%, pd(668)=9.2%, pd(320)=85.0%
     validNT_M: 90.2 / 42.1 / 36.7
     efficiency: 22857 / 33750 / 514286
   ============================================================ */
(function () {
  var App = window.App = window.App || {};
  var listeners = [];
  var state = {
    route: "#/landing",
    subject: "healthy",
    auditStage: -1,   // -1 idle, 0..4 = L0..L4 reached
    running: false,
    anchored: false,  // per-subject anchor flag
    txStage: "idle",  // idle|signing|submitted|mined|confirmed (P1 attest realism)
    blockHeight: 19000421, // simulated chain tip; anchor increments it by 2
    chainLogs: [],    // newest first
    anchor: null,     // { root, block, time, nonce, leafHashes, levelHashes }
    nonce: 0,         // per-subject anchor counter (resets with subject)
    stress: "idle",   // idle|shock|derisk|notify|partial|recover
    timer: []         // every pending handle registered here
  };
  App.state = state;

  // demo assumption: unsecured wholesale reference loss given default, not fitted
  var DEMO_LGD = 0.45;

  /* ---------- pure metric functions (computed, never hard-coded) ---------- */
  function validNT_M(d) { return +(d.rawNT_M * d.validRate).toFixed(1); }               // healthy 90.2 / sybil 36.7
  function efficiency(d) { return Math.round(d.rawNT_M * 1e6 / d.gpuHours); }           // healthy 22857 / sybil 514286
  function cci(d) {                                                                     // healthy 795 / sybil 320
    var s = 0;
    for (var i = 0; i < ANCHOR_W.length && i < d.anchors.length; i++) {
      s += d.anchors[i][3] * ANCHOR_W[i];
    }
    return Math.round(s * 10);
  }
  function pd(value) { return 100 / (1 + Math.exp(0.01156 * value - 5.433)); }          // pd(795)=2.3% pd(320)=85.0%
  // period σ over the 8 trusted C points, not annualized, demo calibration
  function volatilityPct(d) {
    var m = d.C.length;
    if (m < 3) { return 0; }
    var rets = [];
    for (var i = 1; i < m; i++) {
      var prev = d.C[i - 1];
      rets.push(prev ? (d.C[i] - prev) / prev : 0);
    }
    var n = rets.length;
    var mean = 0;
    for (var j = 0; j < n; j++) { mean += rets[j]; }
    mean = mean / n;
    var variance = 0;
    for (var k = 0; k < n; k++) { variance += (rets[k] - mean) * (rets[k] - mean); }
    variance = variance / (n - 1); // sample variance, n = m-1 returns
    return +(Math.sqrt(variance) * 100).toFixed(1);
  }
  function meanOf(arr) {
    if (!arr || !arr.length) { return 0; }
    var s = 0;
    for (var i = 0; i < arr.length; i++) { s += arr[i]; }
    return s / arr.length;
  }
  // D = (meanR - meanC) / meanC, computed from the R/C series
  function deviation(d) {
    var meanC = meanOf(d.C);
    var pct = meanC ? Math.round((meanOf(d.R) - meanC) / meanC * 100) : 0;
    return { pct: pct, alert: !!d.devAlert, index: (typeof d.alertIndex === "number" ? d.alertIndex : null) };
  }
  function expectedLoss(d) {
    var ead = creditLine(d); // veto -> 0
    var prob = pd(cci(d)) / 100;
    return Math.round(ead * prob * DEMO_LGD);
  }
  function ntM(d) { return d.rawNT_M; }                                                 // NT (M), w_model x w_task applied — see data.js
  function scuOf(d) { return Math.round(d.gpuHours * d.util * d.coef.c_gpu * 10) / 10; } // healthy 3570 / sybil 86.1
  function vetoed(d) { return !!(d.redflags && d.redflags.length); }
  function creditLine(d) { return vetoed(d) ? 0 : d.creditLine; }                       // veto forces 0

  /* ---------- five-band trust grade (A / A- / B / C / D), derived from CCI ---------- */
  var GRADE_DEFS = [
    { key: "A",  min: 800, max: 1000, action: "高额度授信",          cadence: "常规监控，季度复评" },
    { key: "A-", min: 750, max: 799,  action: "中高额度授信",        cadence: "月度复评" },
    { key: "B",  min: 650, max: 749,  action: "中额度授信",          cadence: "月度复评，HF 盯市" },
    { key: "C",  min: 500, max: 649,  action: "低额度/担保授信",     cadence: "周度复评，降额预警" },
    { key: "D",  min: 0,   max: 499,  action: "拒绝授信",            cadence: "一票否决，额度清零（含 VETO 强制）" }
  ];
  var GRADE_BANDS = GRADE_DEFS.map(function (b) { return Object.freeze(b); });
  Object.freeze(GRADE_BANDS);
  // gradeOf: VETO forces D regardless of CCI; otherwise first band with CCI >= min.
  function gradeOf(d) {
    if (vetoed(d)) { return "D"; }                                  // healthy A- / sybil D (veto)
    var v = cci(d);
    for (var i = 0; i < GRADE_BANDS.length; i++) {
      if (v >= GRADE_BANDS[i].min) { return GRADE_BANDS[i].key; }
    }
    return "D";
  }

  /* ---------- source cards (P1) derived from the subject's raw records ---------- */
  function sourceCards(d) {
    var cards = [
      { id: "billing", name: "Cloud / API Billing",
        fields: [["Input tokens", d.l0.compute.Input], ["Output tokens", d.l0.compute.Output],
                 ["Raw tokens", d.l0.compute.Raw], ["Requests", d.l0.compute.Requests]] },
      { id: "gpu", name: "GPU Telemetry",
        fields: [["GPU hours", d.l0.physical.GPUh], ["GPU fleet", d.l0.physical.GPU], ["Utilization", d.l0.physical.Util]] },
      { id: "treasury", name: "Treasury System",
        fields: [["Spend", d.l0.business.Spend], ["Customers", d.l0.business.Customers],
                 ["Top-5 share", d.l0.business.Top5], ["Repayment", d.l0.business.Repayment]] },
      { id: "chain", name: "On-chain Address",
        fields: [["Periods", String(d.R.length)], ["R declared range", minMax(d.R)],
                 ["C verified range", minMax(d.C)], ["Wash-loop rate", d.l0.business.Loop]] }
    ];
    if (d.sourceIssues) {
      for (var i = 0; i < cards.length; i++) {
        if (d.sourceIssues[cards[i].id]) { cards[i].issue = d.sourceIssues[cards[i].id]; }
      }
    }
    return cards;
  }
  function minMax(arr) { return Math.min.apply(null, arr) + "-" + Math.max.apply(null, arr); }
  function leafDigest(card, d) {
    var digest = card.name + "|" + card.fields.map(function (f) { return f.join("="); }).join("&");
    if (card.issue && card.issue.text) { digest += "|issue:" + card.issue.text; }
    return digest;
  }

  /* ---------- simplified deterministic mock hash / merkle (no crypto.subtle) ---------- */
  function mockHash(str) {
    var out = "";
    for (var r = 0; r < 5; r++) {
      var h = 2166136261 >>> 0;
      var input = str + "::round" + r;
      for (var i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      out += ("0000000" + h.toString(16)).slice(-8);
    }
    return out;
  }
  // combine(a,b) — the single shared "two children -> parent" step used by
  // merkleBuild AND verifyProof (same mockHash, same ordering). Interior
  // nodes depend only on their two children, so any third party can recompute
  // the root from one leaf + its sibling path (leaf digests already carry
  // data + timestamp + nonce, which is what makes every anchor root unique).
  function combine(a, b) {
    return mockHash(a + "|" + b);
  }
  // merkleBuild(digests, ts, nonce) — data + timestamp + nonce feed every node,
  // so each anchor produces a different root.
  function merkleBuild(digests, ts, nonce) {
    var level = digests.map(function (s, i) { return mockHash(s + "|" + ts + "|" + nonce + "|leaf" + i); });
    var levels = [level];
    while (level.length > 1) {
      var next = [];
      for (var i = 0; i < level.length; i += 2) {
        next.push(combine(level[i], i + 1 < level.length ? level[i + 1] : level[i]));
      }
      levels.push(next);
      level = next;
    }
    return { root: "0x" + levels[levels.length - 1][0], levels: levels };
  }
  // merkleProof(levels, leafIndex) — sibling path from a leaf up to the root.
  // Returns the leaf digest, the root digest and the path array; every path
  // item is { sibling, dir, parent } where dir is the sibling side ("L"/"R")
  // and parent is the node hash produced by the shared combine step.
  function merkleProof(levels, leafIndex) {
    var path = [];
    var leafPos = Math.max(0, Math.min(leafIndex, levels[0].length - 1));
    var idx = leafPos;
    for (var i = 0; i < levels.length - 1; i++) {
      var level = levels[i];
      var cur = level[idx];
      var siblingIdx = (idx % 2 === 0) ? idx + 1 : idx - 1;
      var sibling = level[siblingIdx];
      if (sibling === undefined) {
        path.push({ sibling: null, dir: "-", parent: cur });
      } else {
        var dir = siblingIdx > idx ? "R" : "L";
        path.push({
          sibling: sibling, dir: dir,
          parent: dir === "L" ? combine(sibling, cur) : combine(cur, sibling)
        });
      }
      idx = Math.floor(idx / 2);
    }
    return { leaf: levels[0][leafPos],
             path: path, root: levels[levels.length - 1][0] };
  }
  // verifyProof(leaf, proof, root) — recomputes the root along the path with
  // the shared combine/mockHash and returns strict equality (root may carry a
  // "0x" prefix, e.g. when fed directly with state.anchor.root).
  function verifyProof(leaf, proof, root) {
    var want = String(root == null ? "" : root);
    if (want.slice(0, 2) === "0x") { want = want.slice(2); }
    var cur = leaf;
    for (var i = 0; i < proof.length; i++) {
      var step = proof[i];
      if (step.sibling === null || step.sibling === undefined) { continue; }
      cur = step.dir === "L" ? combine(step.sibling, cur) : combine(cur, step.sibling);
    }
    return cur === want;
  }
  // shortAddr("0x4A7b…") — compact display form for a full address.
  function shortAddr(addr) {
    var s = String(addr == null ? "" : addr);
    return s.length > 10 ? s.slice(0, 6) + "…" + s.slice(-4) : s;
  }

  /* ---------- time helpers ---------- */
  function nowStamp() {
    var d2 = new Date();
    return d2.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  }
  function nowShort() {
    var d2 = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return p(d2.getHours()) + ":" + p(d2.getMinutes()) + ":" + p(d2.getSeconds()) + " UTC";
  }

  /* ---------- notify (ui may not be loaded yet at definition time) ---------- */
  function notify(msg, kind) {
    if (App.ui && App.ui.toast) { App.ui.toast(msg, kind); }
  }

  /* ---------- timer discipline: every handle lives in state.timer ---------- */
  var clearHooks = [];
  function addClearHook(fn) { if (typeof fn === "function") { clearHooks.push(fn); } }
  function dropHandle(type, id) {
    var arr = state.timer;
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i] && arr[i].type === type && arr[i].id === id) { arr.splice(i, 1); }
    }
  }
  function timeout(fn, ms) {
    var rec = { type: "timeout", id: 0 };
    rec.id = setTimeout(function () {
      dropHandle("timeout", rec.id);
      try { fn(); } catch (e) { safeFail(e); }
    }, ms);
    state.timer.push(rec);
    return rec.id;
  }
  function raf(fn) {
    var rec = { type: "raf", id: 0 };
    rec.id = requestAnimationFrame(function () {
      dropHandle("raf", rec.id);
      try { fn(); } catch (e) { safeFail(e); }
    });
    state.timer.push(rec);
    return rec.id;
  }
  function clearTimers() {
    var arr = state.timer || [];
    for (var i = 0; i < arr.length; i++) {
      try {
        if (arr[i].type === "raf") { cancelAnimationFrame(arr[i].id); }
        else { clearTimeout(arr[i].id); }
      } catch (e) { /* ignore */ }
    }
    state.timer = [];
    for (var j = 0; j < clearHooks.length; j++) {
      try { clearHooks[j](); } catch (e) { /* ignore */ }
    }
  }
  function safeFail(e) {
    if (App.ui && App.ui.toast) { App.ui.toast("Unexpected error — see console", "err"); }
    if (window.console && console.error) { console.error(e); }
  }

  /* ---------- subscription / set ---------- */
  function setState(patch) {
    for (var k in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) { state[k] = patch[k]; }
    }
    emit();
  }
  function emit() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](state); } catch (e) { /* one bad listener must not break others */ }
    }
  }
  function onChange(cb) { listeners.push(cb); }

  /* ---------- P2 audit pipeline ---------- */
  function runAudit() {
    if (state.running) { notify("Assessment already running — press Reset or wait", "warn"); return; }
    clearTimers();
    setState({ auditStage: -1, running: true });
    var d = SUBJECTS[state.subject];
    (function step(k) {
      setState({ auditStage: k, running: k < 4 });
      if (k === 4) {
        notify("Compute complete · CCI " + cci(d));
        return;
      }
      timeout(function () { step(k + 1); }, 350);
    })(0);
  }
  function resetAudit() {
    clearTimers();
    setState({ auditStage: -1, running: false });
    notify("Assessment pipeline reset");
  }

  /* ---------- subject switching ---------- */
  function switchSubject(s) {
    if (!SUBJECTS[s] || s === state.subject) { return; }
    if (state.running) { notify("Assessment in progress — press Reset first", "warn"); return; }
    clearTimers();
    setState({
      subject: s, auditStage: -1, running: false,
      anchored: false, txStage: "idle", chainLogs: [], anchor: null, nonce: 0,
      stress: "idle"
    });
    notify("Switched to " + SUBJECTS[s].label);
  }

  /* ---------- P1 anchoring ---------- */
  // Production seam — today this whole P1 anchor is a localAdapter
  // (mockHash + in-memory Merkle tree). The replacement point is this single
  // function: swap its body for EAS attest() or an IAttestationRegistry
  // wrapper (Sepolia/mainnet) and the UI + state machine stay unchanged.
  // Raw source data stays off-chain; only the Merkle root is attested.
  function anchorSubject() {
    var d = SUBJECTS[state.subject];
    if (!d) { return; }
    var ts = nowStamp();
    var nonce = state.nonce + 1;
    var digests = sourceCards(d).map(function (c) { return leafDigest(c, d); });
    var tree = merkleBuild(digests, ts, nonce);
    var block = state.blockHeight + 2; // fixed deterministic chain advance
    var entry = {
      time: nowShort(), block: block,
      hash: tree.root.slice(0, 18) + "…",
      status: "success", rule: "v0.1", nonce: nonce,
      gas: "0.00001 test ETH", confirmations: 3, stage: "confirmed"
    };
    setState({
      anchored: true, nonce: nonce, txStage: "confirmed", blockHeight: block,
      anchor: { root: tree.root, block: block, time: ts, nonce: nonce, levels: tree.levels },
      chainLogs: [entry].concat(state.chainLogs)
    });
    notify("Anchored · root " + tree.root);
  }

  /* ---------- P3 stress state machine ---------- */
  // STRESS_FRAMES — single shared source of truth for P3 (view-report)
  // and the Overview preview. Deeply frozen; never duplicate numbers.
  var STRESS_FRAMES = Object.freeze({
    liquidationHf: 1.0,                                   // red liquidation line
    idle: Object.freeze({ hf: 1.85, credit: 20000 }),     // baseline frame
    phases: Object.freeze([
      Object.freeze({ key: "shock",   hf: 1.05, credit: 20000 }),
      Object.freeze({ key: "derisk",  hf: 1.05, credit: 12000 }),
      Object.freeze({ key: "notify",  hf: 1.05, credit: 12000 }),
      Object.freeze({ key: "partial", hf: 1.05, credit: 12000 }),
      Object.freeze({ key: "recover", hf: 1.35, credit: 18000 })
    ]),
    nodes: Object.freeze(["De-risk", "Notify", "Partial Liquidation", "HF Recovered"])
  });
  var STRESS_DUR = [600, 400, 350, 400, 0]; // pacing only (not shared data)
  var STRESS_SEQ = STRESS_FRAMES.phases.map(function (p, i) {
    return { key: p.key, dur: STRESS_DUR[i], hf: p.hf, credit: p.credit,
             banner: i < STRESS_FRAMES.phases.length - 1, node: i };
  });
  function stressMeta(stress) {
    var idle = { key: "idle", hf: STRESS_FRAMES.idle.hf, credit: STRESS_FRAMES.idle.credit, banner: false, node: 0 };
    if (stress === "recover") { return STRESS_SEQ[STRESS_SEQ.length - 1]; }
    if (stress === "idle") { return idle; }
    for (var i = 0; i < STRESS_SEQ.length; i++) {
      if (STRESS_SEQ[i].key === stress) { return STRESS_SEQ[i]; }
    }
    return idle;
  }
  function stressFlying() {
    return state.stress !== "idle" && state.stress !== "recover";
  }
  function stressRun() {
    var d = SUBJECTS[state.subject];
    if (!d || vetoed(d)) { notify("Credit rejected — no facility to stress", "warn"); return; }
    var dd = SUBJECTS[state.subject];
    if (dd && dd.stressEligible === false) {
      notify("Watchlist subject — capped monitoring; full stress runs on approved facilities", "warn");
      return;
    }
    if (stressFlying()) { notify("Stress run in progress", "warn"); return; }
    clearTimers();
    setState({ stress: "idle" });
    (function step(i) {
      if (i >= STRESS_SEQ.length) { return; }
      setState({ stress: STRESS_SEQ[i].key });
      if (i < STRESS_SEQ.length - 1) {
        timeout(function () { step(i + 1); }, STRESS_SEQ[i].dur);
      }
    })(0);
  }
  function stressReset() {
    if (state.stress === "idle") { notify("Facility already at baseline"); return; }
    clearTimers();
    setState({ stress: "idle" });
    notify("Facility reset to baseline");
  }

  /* ---------- public surface ---------- */
  App.fn = {
    validNT_M: validNT_M, efficiency: efficiency, cci: cci, pd: pd,
    deviation: deviation, volatilityPct: volatilityPct, expectedLoss: expectedLoss,
    DEMO_LGD: DEMO_LGD, ntM: ntM, scuOf: scuOf, vetoed: vetoed, creditLine: creditLine,
    gradeOf: gradeOf, gradeBands: GRADE_BANDS,
    sourceCards: sourceCards, mockHash: mockHash, merkleBuild: merkleBuild,
    merkleProof: merkleProof, verifyProof: verifyProof, shortAddr: shortAddr,
    leafDigest: leafDigest, nowStamp: nowStamp, nowShort: nowShort,
    timeout: timeout, raf: raf, clearTimers: clearTimers, addClearHook: addClearHook,
    stressMeta: stressMeta, stressFlying: stressFlying, stressFrames: STRESS_FRAMES
  };
  App.act = {
    runAudit: runAudit, resetAudit: resetAudit, switchSubject: switchSubject,
    anchor: anchorSubject, stressRun: stressRun, stressReset: stressReset
  };
  App.setState = setState;
  App.onChange = onChange;
})();
