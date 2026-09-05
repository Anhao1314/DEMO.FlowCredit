/* ============================================================
   view-account.js — institution account (#/account).
   Profile + shared mock wallet (App.wallet, synced with the
   topbar via App.act.toggleWallet) + current credit + activity.
   All values come from existing state; safe empty states.
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

  function profileRows() {
    return [
      ["Institution", "Institutional Credit Desk"],
      ["Network", "testnet · demo"],
      ["Rule", "flowcredit.audit_result / v0.1"],
      ["Ledger", "AI-native merchants"]
    ];
  }

  function activityRows(st) {
    var rows = [];
    if (st.auditStage === 4 && !st.running) {
      var d = SUBJECTS[st.subject] || SUBJECTS.healthy;
      rows.push({
        kind: "Audit complete",
        detail: esc(d.label) + " · CCI " + App.fn.cci(d) + " (" + App.fn.gradeOf(d) + ")",
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
      var veto = App.fn.vetoed(d);
      var cci = App.fn.cci(d);
      var pd = App.fn.pd(cci);
      var w = App.wallet;
      var prof = profileRows().map(function (r) {
        return '<div class="ac-row"><span>' + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></div>";
      }).join("");
      var walletBody = w.connected
        ? '<div class="ac-row"><span>Address</span><b class="num">' + esc(w.address) + "</b></div>" +
          '<div class="ac-row"><span>Balance</span><b class="num">' + esc(w.balance) + "</b></div>" +
          '<div class="ac-row"><span>Status</span><b class="ac-ok">connected</b></div>'
        : '<div class="ac-row"><span>Address</span><b class="num">—</b></div>' +
          '<div class="ac-row"><span>Balance</span><b class="num">—</b></div>' +
          '<div class="ac-row"><span>Status</span><b>not connected</b></div>';
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
        '<div class="view-wrap" id="ac-root">' +
        '<div class="page-head"><div>' +
        '<div class="crumbs"><a href="#/landing">Landing</a><span>/</span><span class="cur">Account</span></div>' +
        '<div class="page-title">' + icon("wallet", 22) + " Account</div>" +
        '<div class="page-sub">Institution profile · wallet · credit.</div></div></div>' +
        '<div class="ac-cols">' +
        '<div class="card ac-card"><div class="card-title">' + icon("shield", 14) + " Institution profile</div>" +
        prof + "</div>" +
        '<div class="card ac-card"><div class="card-title">' + icon("wallet", 14) + " Wallet</div>" +
        walletBody +
        '<button type="button" class="btn btn-primary btn-sm ac-wallet-btn" style="margin-top:12px">' +
        (w.connected ? icon("x", 12) + " Disconnect" : icon("wallet", 12) + " Connect Wallet (mock)") +
        "</button></div>" +
        "</div>" +
        '<div class="card ac-credit">' +
        '<div class="card-h"><div class="card-title">' + icon("cash", 14) + " Credit</div>" +
        '<span class="chip">subject · ' + esc(d.label) + "</span></div>" +
        (veto
          ? '<div class="reject-panel" style="margin-bottom:12px"><div class="r-title">' + icon("alert", 15) +
            " VETO — facility closed</div></div>"
          : "") +
        '<div class="metric-tiles">' +
        '<div class="metric"><div class="m-label">Suggested line</div>' +
        '<div class="m-value num">' + (veto ? "$0" : fmtInt(App.fn.creditLine(d))) + "</div>" +
        '<div class="m-note">' + (veto ? "rejected by red flags" : "post-audit limit") + "</div></div>" +
        '<div class="metric"><div class="m-label">Grade</div>' +
        '<div class="m-value num">' + esc(App.fn.gradeOf(d)) + "</div>" +
        '<div class="m-note">five-band trust grade</div></div>' +
        '<div class="metric"><div class="m-label">PD</div>' +
        '<div class="m-value num">' + pd.toFixed(1) + "%</div>" +
        '<div class="m-note">CCI ' + cci + " · demo calibration</div></div>" +
        "</div></div>" +
        '<section class="ws-sec"><div class="ws-sec-head">' +
        '<span class="ws-sec-t">Activity</span>' +
        '<span class="ws-sec-s">anchors &amp; verdicts · latest first</span></div>' +
        actHtml + "</section>" +
        "</div>";
      var walletBtn = host.querySelector(".ac-wallet-btn");
      if (walletBtn) {
        walletBtn.addEventListener("click", function () {
          if (App.act && App.act.toggleWallet) { App.act.toggleWallet(); }
          render(host);
        });
      }
    } catch (e) {
      host.innerHTML = '<div class="view-wrap"><div class="card"><div class="card-title">Account — render fallback</div>' +
        '<p class="note-italic" style="margin-top:8px">State is intact; use the top tabs to continue.</p></div></div>';
      if (App.ui && App.ui.toast) { App.ui.toast("View error — see console", "err"); }
    }
  }

  App.views = App.views || {};
  App.views.account = { render: render };
})();
