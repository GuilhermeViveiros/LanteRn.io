/* Intervention chart for holding-back.html.
   Every value below is copied from arXiv:2605.18445v3:
   viscot = Table 1 (accuracy on VisCoT when replacing latent tokens), in %
   blink, vstar = appendix table "Performance on Blink and V* subsets", x100
   Column order matches the paper: ILVR, LVR, LanteRn RL, LanteRn SFT, Monet RL, Monet SFT. */
(function () {
  "use strict";

  var MODELS = [
    // checkpoints as listed in the paper's appendix ("Model Checkpoints")
    { name: "ILVR", sub: "7B, SFT", ckpt: "https://huggingface.co/shuai22/comt_ckpt" },
    { name: "LVR", sub: "7B, RL", ckpt: "https://huggingface.co/vincentleebang/LVR-7B" },
    { name: "LanteRn", sub: "3B, RL", ckpt: "https://huggingface.co/AGViveiros/LanteRn-3B-RL" },
    { name: "LanteRn", sub: "3B, SFT", ckpt: "https://huggingface.co/AGViveiros/LanteRn-3B-SFT" },
    { name: "Monet", sub: "7B, RL", ckpt: "https://huggingface.co/NOVAglow646/Monet-7B" },
    { name: "Monet", sub: "7B, SFT", ckpt: "https://huggingface.co/NOVAglow646/Monet-SFT-7B/tree/main/stage3" }
  ];

  var DATA = {
    viscot: {
      label: "VisCoT",
      std:    [62, 73, 83, 78, 83, 76],
      rs:     [64, 73, 82, 78, 81, 75],
      noise:  [61, 74, 82, 80, 82, 71],
      zeros:  [59, 76, 82, 79, 85, 41],
      skip:   [60, 78, 82, 79, 83, 78],
      oracle: [63, 77, 83, 79, 86, 77]
    },
    blink: {
      label: "BLINK",
      std:   [63, 68, 65, 65, 63, 60],
      rs:    [59, 70, 67, 65, 61, 59],
      noise: [62, 75, 67, 65, 61, 57],
      zeros: [61, 76, 66, 62, 64, 50],
      skip:  [60, 73, 65, 65, 60, 57]
    },
    vstar: {
      label: "V*Bench",
      std:   [63, 80, 72, 63, 82, 75],
      rs:    [61, 81, 71, 63, 79, 77],
      noise: [60, 81, 70, 64, 80, 76],
      zeros: [65, 80, 70, 60, 80, 77],
      skip:  [46, 81, 71, 62, 78, 78]
    }
  };

  // uninformative replacements, in lane order (top to bottom)
  var DUMMIES = ["rs", "noise", "zeros", "skip"];
  var SERIES = {
    rs:     { label: "Random subregion" },
    noise:  { label: "Noise" },
    zeros:  { label: "Zeros" },
    skip:   { label: "Skip latents" },
    oracle: { label: "Oracle latents" }
  };

  var C = {
    ink: "#1a1d3a", link: "#3b32a8", soft: "#555a78", rule: "#d9dbea", band: "#f1f1f9",
    amber: "#f2a77b", amberEdge: "#a14e1e", indigo: "#4a3fc4", green: "#3f9b2f"
  };

  // shared with story.js so every widget reads the same numbers
  window.LVR = { MODELS: MODELS, DATA: DATA, SERIES: SERIES };

  var root = document.getElementById("intervention-chart");
  if (!root) return;
  var plot = root.querySelector(".plot");
  var readout = root.querySelector(".readout");
  var tabs = root.querySelectorAll(".tabs button");
  var legendButtons = root.querySelectorAll(".legend button");
  var state = { bench: "viscot", focus: null };
  var NS = "http://www.w3.org/2000/svg";

  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function mark(key, x, y) {
    if (key === "rs") return el("circle", { cx: x, cy: y, r: 5.5, fill: C.amber, stroke: C.amberEdge, "stroke-width": 1.5 });
    if (key === "noise") return el("circle", { cx: x, cy: y, r: 5.5, fill: C.indigo, stroke: "#fff", "stroke-width": 1 });
    if (key === "zeros") return el("circle", { cx: x, cy: y, r: 5, fill: "#fff", stroke: C.ink, "stroke-width": 2 });
    if (key === "oracle") return el("rect", { x: x - 5.5, y: y - 5.5, width: 11, height: 11, rx: 2, fill: C.green, stroke: "#fff", "stroke-width": 1 });
    return el("path", { d: "M" + (x - 5) + " " + (y - 5) + "L" + (x + 5) + " " + (y + 5) + "M" + (x - 5) + " " + (y + 5) + "L" + (x + 5) + " " + (y - 5), stroke: C.soft, "stroke-width": 2.4, "stroke-linecap": "round", fill: "none" });
  }

  // model name opens its checkpoint on Hugging Face
  function link(m, node) {
    var a = el("a", { href: m.ckpt, target: "_blank", rel: "noopener" });
    a.setAttribute("aria-label", m.name + " " + m.sub + " checkpoint on Hugging Face");
    a.appendChild(el("title", {}, m.name + " " + m.sub + ": open the checkpoint on Hugging Face"));
    a.appendChild(node); return a;
  }

  function signed(n) { return (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(n); }

  function draw() {
    var d = DATA[state.bench];
    var keys = DUMMIES.concat(d.oracle ? ["oracle"] : []);
    var W = Math.max(300, Math.round(plot.getBoundingClientRect().width || 700));
    var narrow = W < 560;
    var left = narrow ? 18 : 128, right = W - (narrow ? 18 : 108);
    var lane = 11, pad = 8;
    var labelH = narrow ? 22 : 0;
    var rowH = labelH + pad * 2 + lane * (keys.length - 1) + 8;
    var top = 26;
    var H = top + rowH * MODELS.length + 6;
    var LO = 40, HI = 90;
    function X(v) { return left + (v - LO) / (HI - LO) * (right - left); }

    while (plot.firstChild) plot.removeChild(plot.firstChild);
    plot.setAttribute("viewBox", "0 0 " + W + " " + H);
    plot.setAttribute("height", H);

    for (var g = LO; g <= HI; g += 10) {
      plot.appendChild(el("line", { x1: X(g), x2: X(g), y1: top - 4, y2: H - 6, stroke: C.rule, "stroke-width": 1 }));
      plot.appendChild(el("text", { x: X(g), y: 13, "text-anchor": "middle", "font-size": 12, fill: C.soft }, g + "%"));
    }

    var deltas = [];
    MODELS.forEach(function (m, i) {
      var y0 = top + i * rowH;
      if (i % 2 === 0) plot.appendChild(el("rect", { x: 0, y: y0, width: W, height: rowH, fill: C.band, opacity: 0.55 }));
      var best = Math.max.apply(null, DUMMIES.map(function (k) { return d[k][i]; }));
      var delta = best - d.std[i];
      deltas.push(delta);
      var lanesTop = y0 + labelH + pad + 4;

      if (narrow) {
        var t = el("text", { x: left, y: y0 + 17, "font-size": 13, fill: C.link, "font-weight": 650, "text-decoration": "underline" }, m.name);
        t.appendChild(el("tspan", { "font-weight": 400, fill: C.soft }, "  " + m.sub));
        plot.appendChild(link(m, t));
        plot.appendChild(el("text", { x: W - 8, y: y0 + 17, "text-anchor": "end", "font-size": 12, fill: C.soft }, "best replacement " + signed(delta)));
      } else {
        var mid = y0 + rowH / 2;
        plot.appendChild(link(m, el("text", { x: 10, y: mid - 2, "font-size": 14, fill: C.link, "font-weight": 650, "text-decoration": "underline" }, m.name)));
        plot.appendChild(el("text", { x: 10, y: mid + 14, "font-size": 12, fill: C.soft }, m.sub));
        plot.appendChild(el("text", { x: W - 8, y: mid - 2, "text-anchor": "end", "font-size": 12, fill: C.soft }, "best replacement"));
        plot.appendChild(el("text", { x: W - 8, y: mid + 14, "text-anchor": "end", "font-size": 14, fill: C.ink, "font-weight": 650 }, signed(delta) + " pts"));
      }

      // standard inference: a reference line across all lanes
      var sx = X(d.std[i]);
      var sl = el("line", { x1: sx, x2: sx, y1: lanesTop - 9, y2: lanesTop + lane * (keys.length - 1) + 9, stroke: C.ink, "stroke-width": 3, "stroke-linecap": "round" });
      sl.appendChild(el("title", {}, m.name + " " + m.sub + ", standard inference: " + d.std[i] + "%"));
      plot.appendChild(sl);

      keys.forEach(function (k, j) {
        var v = d[k][i], cx = X(v), cy = lanesTop + j * lane;
        var grp = el("g", { opacity: state.focus && state.focus !== k ? 0.18 : 1 });
        var mk = mark(k, cx, cy);
        mk.appendChild(el("title", {}, m.name + " " + m.sub + ", " + SERIES[k].label + ": " + v + "% (standard inference " + d.std[i] + "%)"));
        grp.appendChild(mk);
        if (state.focus === k) {
          var after = v >= d.std[i];
          grp.appendChild(el("text", { x: cx + (after ? 10 : -10), y: cy + 4, "text-anchor": after ? "start" : "end", "font-size": 12, fill: C.ink, "font-weight": 600 }, v));
        }
        plot.appendChild(grp);
      });
    });

    var lo = Math.min.apply(null, deltas), hi = Math.max.apply(null, deltas);
    plot.setAttribute("aria-label", "Accuracy on " + d.label + " for six models under standard inference and under each replacement of the latent tokens. Exact values are in the table below.");
    var msg = "On " + d.label + ", each model's best uninformative replacement scores between " + signed(lo) + " and " + signed(hi) + " points relative to its own latents.";
    if (state.focus) msg = SERIES[state.focus].label + " on " + d.label + ": " + MODELS.map(function (m, i) { return m.name + " " + m.sub.split(", ")[1] + " " + d[state.focus][i]; }).join(", ") + ".";
    readout.textContent = msg;

    legendButtons.forEach(function (b) {
      var k = b.getAttribute("data-series");
      b.hidden = k === "oracle" && !d.oracle;
      b.setAttribute("aria-pressed", String(state.focus === k));
    });
    tabs.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-bench") === state.bench)); });
  }

  tabs.forEach(function (b) {
    b.addEventListener("click", function () {
      state.bench = b.getAttribute("data-bench");
      if (state.focus === "oracle" && !DATA[state.bench].oracle) state.focus = null;
      draw();
    });
  });
  legendButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.getAttribute("data-series");
      state.focus = state.focus === k ? null : k;
      draw();
    });
  });

  var pending;
  window.addEventListener("resize", function () { clearTimeout(pending); pending = setTimeout(draw, 120); });
  draw();
})();
