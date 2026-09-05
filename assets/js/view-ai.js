/* ============================================================
   view-ai.js — offline AI verdict display (external LLM ledger).
   Read-only: reads window.AI_LEDGER, renders cards; computes
   nothing; frozen formulas/state untouched. ES5, no fetch.
   ============================================================ */
(function () {
  "use strict";

  var LABELS = { healthy: "Healthy Merchant", watch: "Watchlist Merchant", sybil: "Sybil Address" };
  var ANCHOR_NAMES = {
    efficiency: "Efficiency",
    repayment: "Repayment",
    customer_concentration: "Customer",
    cost_stability: "Cost",
    time_sybil: "Time / Sybil"
  };
  var STATE_TXT = { g: "PASS", y: "WARN", r: "FAIL" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) {
    n = Number(n) || 0;
    return "$" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function fmtPct(n) {
    n = Number(n);
    return (n % 1 === 0 ? String(n) : n.toFixed(1)) + "%";
  }

  function badgeCls(v) { return v === "approve" ? "ai-ok" : v === "reject" ? "ai-rej" : "ai-warn"; }
  function stateCls(st) { return st === "g" ? "ai-ok" : st === "r" ? "ai-rej" : "ai-warn"; }
  function flagText(f) {
    if (f == null) return "";
    if (typeof f === "string") return f;
    return f.note || f.name || String(f);
  }
  function subjLabel(k) {
    if (window.SUBJECTS && SUBJECTS[k] && SUBJECTS[k].label) return SUBJECTS[k].label;
    return LABELS[k] || k;
  }
  function meta() {
    var m = AI_LEDGER.meta || {};
    return esc(String(m.model || "deepseek-chat")) +
      (m.builtAtUtc ? " · built " + esc(m.builtAtUtc) : "");
  }
  function footMeta() {
    var h = null;
    try { var cur = App.state && App.state.subject; if (AI_LEDGER.runs[cur] && AI_LEDGER.runs[cur].factsSha256) h = AI_LEDGER.runs[cur].factsSha256; } catch (e) {}
    if (!h) { var first = Object.keys(AI_LEDGER.runs || {})[0]; if (first) h = AI_LEDGER.runs[first].factsSha256; }
    return h ? "facts snapshot " + esc(String(h).slice(0, 8)) : "";
  }
  function runOf(k) { return (AI_LEDGER.runs || {})[k]; }

  function rowHtml(k, current) {
    var r = runOf(k);
    if (!r) return "";
    return '<div class="ai-row' + (k === current ? " on" : "") + '">' +
      '<span class="ai-row-l">' + esc(subjLabel(k)) + "</span>" +
      '<span class="ai-badge ' + badgeCls(r.verdict) + '">' + esc(String(r.verdict).toUpperCase()) + "</span>" +
      '<span class="ai-m">CCI <b>' + esc(r.cci) + "</b></span>" +
      '<span class="ai-m">PD <b>' + esc(fmtPct(r.pdPct)) + "</b></span>" +
      '<span class="ai-m">Credit <b>' + esc(money(r.creditSuggestedUsd)) + "</b></span></div>";
  }

  function workspaceHtml() {
    var keys = [];
    if (AI_LEDGER.runs) keys = Object.keys(AI_LEDGER.runs).filter(function (k) { return runOf(k); });
    if (!keys.length) return "";
    var current = (App.state && App.state.subject) || "";
    var body = keys.map(function (k) { return rowHtml(k, current); }).join("");
    return '<section class="ai-card">' +
      '<div class="ai-head"><span class="ai-title">AI VERDICT · LIVE LLM</span><span class="ai-meta">' + meta() + "</span></div>" +
      '<div class="ai-rows">' + body + "</div>" +
      '<p class="ai-note">Offline batch verdicts are external LLM data; simulated CCI/PD baselines are computed independently.</p>' +
      "</section>";
  }

  function anchorRowHtml(a, i) {
    var w = (window.ANCHOR_W && ANCHOR_W[i] != null) ? Math.round(ANCHOR_W[i] * 100) + "%" : "";
    return "<tr><td>" + esc(ANCHOR_NAMES[a.name] || a.name || "") + "</td><td>" +
      '<span class="ai-st ' + stateCls(a.state) + '">' + esc(STATE_TXT[a.state] || a.state || "") + "</span>" +
      "<td><b>" + esc(a.score) + "</b></td><td>" + (w ? esc(w) : "") + "</td><td>" +
      esc(a.note || "") + "</td></tr>";
  }

  function reportHtml() {
    if (!App.state || !App.state.subject) return "";
    var k = App.state.subject;
    var r = runOf(k);
    if (!r) return "";
    var flags = (r.redflags || []).map(function (f) {
      return "<li>" + esc(flagText(f)) + "</li>";
    }).join("");
    var rows = (r.anchors || []).map(anchorRowHtml).join("");
    var evid = (r.anchors || []).map(function (a) {
      var e = (a.evidence || []).filter(Boolean).join(" ");
      return e ? '<span class="ai-evid">' + esc(a.name) + " [" + esc(e) + "]</span>" : "";
    }).filter(Boolean).join(" · ");
    var hs = footMeta();
    return '<section class="ai-card ai-card-report">' +
      '<div class="ai-head"><span class="ai-title">AI VERDICT · LIVE LLM</span><span class="ai-meta">' + meta() + "</span></div>" +
      '<div class="ai-summary">' +
      '<span class="ai-badge ' + badgeCls(r.verdict) + '">' + esc(String(r.verdict).toUpperCase()) + "</span>" +
      '<span class="ai-m">CCI <b>' + esc(r.cci) + "</b></span>" +
      '<span class="ai-m">PD <b>' + esc(fmtPct(r.pdPct)) + "</b></span>" +
      '<span class="ai-m">Grade <b>' + esc(r.grade) + "</b></span>" +
      '<span class="ai-m">Credit <b>' + esc(money(r.creditSuggestedUsd)) + "</b></span></div>" +
      "<div>" +
      '<p class="ai-sub">FIVE ANCHORS</p>' +
      '<table class="ai-table"><tbody>' + rows + "</tbody></table>" +
      '<p class="ai-sub">EVIDENCE</p><p class="ai-evid-line">' + evid + "</p>" +
      (flags ? '<p class="ai-sub">HARD RED FLAGS</p><ul class="ai-flags">' + flags + "</ul>" : "") +
      '<details class="ai-details"><summary>REASONING TRACE</summary><p class="ai-trace">' + esc(r.trace || "") + "</p></details>" +
      "</div>" +
      '<p class="ai-note">External deepseek-chat verdict' + (hs ? " · " + hs : "") + ". AI caliber: hard red flags score zero; the simulated engine keeps band floors. Mock baselines above are computed independently.</p>" +
      "</section>";
  }

  App.aiPanel = function (host, ctx) {
    if (!host || !window.AI_LEDGER || !AI_LEDGER.runs) return;
    var html = ctx === "report" ? reportHtml() : workspaceHtml();
    if (!html) return;
    var el = document.createElement("div");
    el.className = "ai-panel" + (ctx === "report" ? " ai-panel-report" : "");
    el.innerHTML = html;
    host.appendChild(el);
  };
})();
