/* ============================================================
   view-ingest.js — P1 Truth Ingest: source cards, mock Merkle
   anchoring (data + timestamp + nonce), chain log timeline.
   ============================================================ */
(function () {
  var App = window.App = window.App || {};
  var ui = null; // resolved lazily (App.ui exists before first render)
  var local = { busy: false };
  var CARD_ICON = { billing: "db", gpu: "cpu", treasury: "cash", chain: "link" };

  function short(fp, n) {
    n = n || 12;
    return fp ? fp.slice(0, n) + "…" : "—";
  }

  function cardHtml(card, idx, signed, fp) {
    var u = App.ui;
    var fields = card.fields.map(function (f) {
      return '<span class="kv"><span class="l">' + u.esc(f[0]) + '</span><span class="v num">' + u.esc(f[1]) + "</span></span>";
    }).join("");
    var sig = signed
      ? '<div class="sig"><b>' + u.icon("check", 10) + "</b> fingerprint " + u.esc(fp || "signature recorded · testnet mock") + "</div>"
      : '<div class="sig"><b></b>signature recorded · testnet mock</div>';
    return '<div class="card src-card' + (signed ? " signed" : "") + '" data-idx="' + idx + '">' +
      '<div class="src-top">' +
      '<span class="src-ico">' + u.icon(CARD_ICON[card.id] || "db", 15) + "</span>" +
      '<span class="src-name">' + u.esc(card.name) + "</span>" +
      '<span class="src-tag">' + (signed ? u.icon("check", 10) + " " : "") + "source-signed · timestamped</span>" +
      "</div>" +
      '<div class="kv-grid" style="grid-template-columns:repeat(auto-fit,minmax(96px,1fr))">' + fields + "</div>" +
      sig +
      "</div>";
  }

  function treeSvgHtml(anchor) {
    var W = 560, H = 190;
    var rowsY = [26, 92, 158];
    var levels = anchor.levels.slice().reverse(); // draw root on top: [root1, mids2, leaves4]
    var nodeX = [];
    levels.forEach(function (level, r) {
      var xs = [];
      for (var i = 0; i < level.length; i++) { xs.push((i + 0.5) * (W / level.length)); }
      nodeX.push(xs);
    });
    var u = App.ui;
    var lines = "";
    for (var r = 1; r < nodeX.length; r++) {
      var childY = rowsY[r];
      for (var c = 0; c < nodeX[r].length; c++) {
        var px = nodeX[r - 1][Math.floor(c / 2)];
        lines += '<line x1="' + px.toFixed(1) + '" y1="' + (rowsY[r - 1] + 15) + '" x2="' + nodeX[r][c].toFixed(1) +
          '" y2="' + (childY - 15) + '" stroke="rgba(120,200,205,.28)" stroke-width="1.2"/>';
      }
    }
    var nodes = "";
    for (var r2 = 0; r2 < levels.length; r2++) {
      var y2 = rowsY[r2];
      levels[r2].forEach(function (h, i) {
        var x2 = nodeX[r2][i];
        nodes += '<circle cx="' + x2.toFixed(1) + '" cy="' + y2 + '" r="15" fill="rgba(11,22,30,.9)" stroke="' +
          (r2 === 0 ? "#2DD4BF" : "rgba(120,200,205,.45)") + '" stroke-width="1.4"/>';
        var txt = r2 === 0 ? "root" : short(h, 5);
        nodes += '<text x="' + x2.toFixed(1) + '" y="' + (y2 + 3) + '" text-anchor="middle" style="fill:#9DB4B8;font-size:8px;font-family:var(--mono)">' + txt + "</text>";
      });
    }
    var leafRow = levels[levels.length - 1];
    var leafXs = nodeX[levels.length - 1];
    var leafLabels = "";
    for (var i2 = 0; i2 < leafRow.length; i2++) {
      leafLabels += '<text x="' + leafXs[i2].toFixed(1) + '" y="' + (rowsY[levels.length - 1] + 13) + '" text-anchor="middle" style="fill:#5E7478;font-size:7.5px;font-family:var(--mono)">' +
        short(leafRow[i2], 5) + "</text>";
    }    return '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mock Merkle tree">' +
      lines + leafLabels + nodes + "</svg>";
  }

  function render(host) {
    if (!ui) { ui = App.ui; }
    local.busy = false;
    try {
      var st = App.state;
      var d = SUBJECTS[st.subject];
      var cards = App.fn.sourceCards(d);
      var anchored = !!st.anchor;
      var cardHtmls = cards.map(function (card, i) {
        var fp = anchored && st.anchor.levels && st.anchor.levels[0] ? st.anchor.levels[0][i] : "";
        return cardHtml(card, i, anchored, fp);
      }).join("");
      var treeHtml = anchored
        ? '<div class="tree-box"><div class="tree-caption">Mock merkle · 4 leaves → 2 nodes → root</div>' +
          treeSvgHtml(st.anchor) +
          '<div class="root-hash num">' + ui.esc(st.anchor.root) + "</div></div>"
        : '<div class="tree-box"><div class="note-italic">Tree appears after the first anchor — 4 source digests, data + timestamp + nonce.</div></div>';
      var metaHtml = anchored
        ? '<div class="anchor-state"><span class="chip chip-green">' + ui.icon("check", 10) + " anchored</span>" +
          '<span class="mono" style="font-size:11px;color:var(--text2)">block ' + ui.fmtInt(st.anchor.block) +
          " · " + ui.esc(st.anchor.time) + " · nonce " + st.anchor.nonce + "</span></div>"
        : '<div class="anchor-state"><span class="chip chip-amber">not anchored yet</span></div>';

      host.innerHTML =
        '<div class="view-wrap">' +
        '<div class="page-head">' +
        '<div><div class="page-title">' + ui.icon("db", 22) + " P1 · Truth Ingest</div>" +
        '<div class="page-sub">Prove the numbers are not self-reported and cannot be tampered with. ' +
        "Four signed sources feed a mock Merkle root; only the fingerprint goes on-chain.</div></div>" +
        '<span class="chip">subject · ' + ui.esc(d.label) + "</span>" +
        "</div>" +
        '<div class="ingest-cols">' +
        '<div class="col-main">' +
        '<div class="card"><div class="card-h"><div class="card-title">' + ui.icon("layers", 15) + " Data sources</div>" +
        '<span class="card-sub">field summary · raw records</span></div>' +
        '<div class="src-grid">' + cardHtmls + "</div></div>" +
        '<div class="card"><div class="card-h">' +
        '<div class="card-title"><span class="no">P1</span>Anchor pipeline</div>' +
        '<div class="spacer"></div>' + metaHtml.replace('<div class="anchor-state">', '<div class="anchor-state">') +
        "</div>" +
        '<div class="anchor-flow">' +
        '<div><button type="button" id="anchor-btn" class="btn btn-primary">' +
        (anchored ? "" : "") +
        '<span id="anchor-btn-label">' + (anchored ? "Anchor Again" : "Connect &amp; Anchor") + "</span></button>" +
        '<span class="note-italic" style="margin-left:10px">repeatable · each anchor uses a fresh nonce · logs accumulate</span></div>' +
        treeHtml +
        '<div class="sec-l">Chain log · latest first</div><div id="chain-log"></div>' +
        '<details class="how"><summary>How it works</summary><div class="how-body">' +
        '<span class="fml">root = Merkle( 4 × source digest(data | timestamp | nonce) )</span><br>' +
        "Each leaf digests one signed source record together with the anchor timestamp and an incrementing nonce, " +
        "so every anchor produces a different root. Interior nodes hash their two children; the root is the " +
        "testnet fingerprint. No raw detail, no key material — mock only.</div></details>" +
        "</div></div>" +
        "</div>" +
        '<aside class="card side-note">' +
        '<h3>' + ui.icon("shield", 13) + " " + "Raw detail stored off-chain · only fingerprint on-chain · testnet mock" + "</h3>" +
        '<p>What gets anchored is a compact digest tree, not the underlying ledgers:</p>' +
        "<ul><li>cloud/API billing records</li><li>GPU telemetry</li><li>treasury cashflow</li><li>on-chain address activity</li></ul>" +
        '<p style="margin-top:9px">The demo replays the same flow each anchor — data + timestamp + nonce determine the root.</p>' +
        "</aside>" +
        "</div>" +
        "</div>";

      var logEl = host.querySelector("#chain-log");
      if (logEl) { App.ui.logTimeline(logEl, st.chainLogs); }
      bind(host, anchored);
    } catch (e) {
      host.innerHTML = '<div class="card"><div class="card-title">Truth Ingest — render fallback</div>' +
        '<p class="note-italic" style="margin-top:8px">A view error occurred; state remains intact. Press Reset or reload.</p></div>';
      if (App.ui) { App.ui.toast("View error — see console", "err"); }
    }
  }

  function bind(host, anchored) {
    var btn = host.querySelector("#anchor-btn");
    if (!btn) { return; }
    btn.addEventListener("click", function () { runAnchor(host); });
  }

  function runAnchor(host) {
    if (local.busy) { App.ui.toast("Anchoring in progress", "warn"); return; }
    var st = App.state;
    var btn = host.querySelector("#anchor-btn");
    var label = host.querySelector("#anchor-btn-label");
    local.busy = true;
    if (btn) { btn.classList.add("is-busy"); }
    if (label) { label.textContent = "Anchoring…"; }
    var cards = host.querySelectorAll(".src-card");
    for (var i = 0; i < cards.length; i++) {
      (function (card, idx) {
        App.fn.timeout(function () {
          if (!local.busy) { return; }
          card.classList.add("signed");
          var sig = card.querySelector(".sig");
          if (sig) {
            sig.innerHTML = "<b>" + App.ui.icon("check", 10) + "</b> signature recorded · testnet mock";
            sig.style.opacity = "1";
          }
        }, 250 * (idx + 1));
      })(cards[i], i);
    }
    App.fn.timeout(function () {
      if (!local.busy) { return; }
      local.busy = false;
      App.act.anchor(); // setState → emit → full re-render with new root + log
    }, 1100);
  }

  App.views = App.views || {};
  App.views.ingest = { render: render };
})();