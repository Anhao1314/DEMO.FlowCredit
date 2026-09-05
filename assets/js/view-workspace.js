/* ============================================================
   view-workspace.js — product workspace (#/workspace).
   DeepSeek-style desk: one current task, two subject ledgers,
   one activity feed. Everything derives from App.state +
   SUBJECTS + App.fn; empty states are safe.
   ============================================================ */
(function () {
  var App = window.App = window.App || {};
  var ui = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function icon(n, s) { return (App.ui && App.ui.icon) ? App.ui.icon(n, s || 14) : ""; }
  function fmtInt(n) {
    try { return Number(n).toLocaleString("en-US"); }
    catch (e) { return String(n); }
  }

  function currentTask(st) {
    var d = SUBJECTS[st.subject] || SUBJECTS.healthy;
    var veto = App.fn.vetoed(d);
    var anchored = !!st.anchored;
    var auditDone = st.auditStage === 4 && !st.running;
    if (!anchored) {
      return { title: "Anchor the four sources", sub: "P1 · build the Merkle fingerprint",
        cta: "Anchor now", hash: "#/ingest" };
    }
    if (!auditDone) {
      return { title: "Run the AI assessment", sub: "P2 · five anchors → CCI",
        cta: "Run assessment", hash: "#/audit" };
    }
    if (veto) {
      return { title: "Veto verdict — credit at $0", sub: "review the proof or switch ledger",
        cta: "View verdict", hash: "#/report" };
    }
    return { title: "Open the risk report", sub: "P3 · verify on-chain & respond",
      cta: "Open report", hash: "#/report" };
  }

  function statusChips(st) {
    var d = SUBJECTS[st.subject] || SUBJECTS.healthy;
    var veto = App.fn.vetoed(d);
    var chips = [];
    chips.push(st.anchored
      ? '<span class="chip chip-green">' + icon("check", 10) + " anchored</span>"
      : '<span class="chip">pending · anchor</span>');
    chips.push((st.auditStage === 4 && !st.running)
      ? '<span class="chip chip-teal">assessment done</span>'
      : '<span class="chip">assessment pending</span>');
    chips.push(veto
      ? '<span class="chip chip-red">VETO · ' + esc(App.fn.gradeOf(d)) + "</span>"
      : '<span class="chip chip-green">grade ' + esc(App.fn.gradeOf(d)) + "</span>");
    return chips.join("");
  }

  function ledgerHtml(key) {
    var d = SUBJECTS[key];
    if (!d) { return ""; }
    var veto = App.fn.vetoed(d);
    var cci = App.fn.cci(d);
    var pd = App.fn.pd(cci);
    var on = App.state.subject === key ? " on" : "";
    var pill = veto
      ? '<span class="ws-pill ws-pill-rej">REJECTED</span>'
      : '<span class="ws-pill ws-pill-ok">APPROVED</span>';
    var credit = veto
      ? '<span class="ws-credit ws-credit-rej">$0 · VETO</span>'
      : '<span class="ws-credit ws-credit-ok">' + fmtInt(App.fn.creditLine(d)) + " test USDC</span>";
    return '<button type="button" class="ws-ledger' + on + '" data-subject="' + key + '" data-go="#/audit">' +
      '<span class="ws-lg-top"><span class="ws-lg-name">' + esc(d.label) + "</span>" + pill + "</span>" +
      '<span class="ws-lg-metrics num">CCI ' + cci + " · PD " + pd.toFixed(1) + "% · " +
      esc(App.fn.gradeOf(d)) + "</span>" +
      "<span>" + credit + "</span>" +
      '<span class="ws-lg-open" aria-hidden="true">→</span></button>';
  }

  function activityRows(st) {
    var rows = [];
    if (st.auditStage === 4 && !st.running) {
      var d = SUBJECTS[st.subject];
      rows.push({
        kind: "Assessment complete",
        detail: "CCI " + App.fn.cci(d) + " (" + App.fn.gradeOf(d) + ") · PD " +
          App.fn.pd(App.fn.cci(d)).toFixed(1) + "%",
        ic: "pulse"
      });
    }
    var logs = st.chainLogs || [];
    for (var i = 0; i < logs.length && i < 4; i++) {
      rows.push({
        kind: "Anchored",
        detail: esc(logs[i].hash) + " · " + esc(logs[i].time),
        ic: "anchor"
      });
    }
    return rows;
  }

  function render(host) {
    if (!ui) { ui = App.ui; }
    try {
      var st = App.state;
      var d = SUBJECTS[st.subject] || SUBJECTS.healthy;
      var task = currentTask(st);
      var ledgers = ledgerHtml("healthy") + ledgerHtml("sybil");
      var acts = activityRows(st);
      var actHtml = acts.length
        ? '<div class="ws-acts">' + acts.map(function (a) {
          return '<div class="ws-act">' +
            '<span class="ws-act-ic">' + icon(a.ic, 13) + "</span>" +
            '<span class="ws-act-body"><b>' + esc(a.kind) + "</b>" +
            '<span class="num">' + a.detail + "</span></span></div>";
        }).join("") + "</div>"
        : '<p class="ws-empty">No activity yet — anchor data in P1 to start.</p>';

      host.innerHTML =
        '<div class="view-wrap" id="ws-root">' +
        '<div class="page-head"><div>' +
        '<div class="crumbs"><a href="#/landing">Landing</a><span>/</span><span class="cur">Workspace</span></div>' +
        '<div class="page-title">' + icon("layers", 22) + " Workspace</div>" +
        '<div class="page-sub">Your desk — pick a task, then a ledger.</div></div></div>' +
        '<div class="card ws-task">' +
        '<div class="ws-task-copy"><div class="ws-task-t">' + esc(task.title) + "</div>" +
        '<div class="ws-task-s">' + esc(task.sub) + "</div></div>" +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn btn-primary" data-go="' + task.hash + '">' +
        icon("pulse", 14) + " " + esc(task.cta) + "</button>" +
        '<div class="ws-chips">' + statusChips(st) + "</div>" +
        "</div>" +
        '<section class="ws-sec"><div class="ws-sec-head">' +
        '<span class="ws-sec-t">Ledgers</span>' +
        '<span class="ws-sec-s">subject · ' + esc(d.label) + "</span></div>" +
        '<div class="ws-ledgers">' + ledgers + "</div></section>" +
        '<section class="ws-sec"><div class="ws-sec-head">' +
        '<span class="ws-sec-t">Activity</span>' +
        '<span class="ws-sec-s">anchors &amp; verdicts · latest first</span></div>' +
        actHtml + "</section>" +
        "</div>";
      if (App.aiPanel) { App.aiPanel(host, "workspace"); }
      bind(host);
    } catch (e) {
      host.innerHTML = '<div class="view-wrap"><div class="card"><div class="card-title">Workspace — render fallback</div>' +
        '<p class="note-italic" style="margin-top:8px">State is intact; use the top tabs to continue.</p></div></div>';
      if (App.ui && App.ui.toast) { App.ui.toast("View error — see console", "err"); }
    }
  }

  function bind(host) {
    var root = host.querySelector("#ws-root");
    if (!root || !root.addEventListener) { return; }
    root.addEventListener("click", function (ev) {
      var n = ev.target;
      while (n && n !== root) {
        if (n.nodeType === 1 && n.getAttribute) {
          var sub = n.getAttribute("data-subject");
          var go = n.getAttribute("data-go");
          if (sub && App.act && App.act.switchSubject) {
            try { App.act.switchSubject(sub); } catch (e) { /* continue to nav */ }
          }
          if (go && App.nav) { App.nav(go); return; }
        }
        n = n.parentNode;
      }
    });
  }

  App.views = App.views || {};
  App.views.workspace = { render: render };
})();
