/* Widgets for the story page (index.html).
   Numbers: LanteRn paper (arXiv:2603.25629v2) Tables 1 and 2;
   analysis paper (arXiv:2605.18445v3) Tables 1, 2 and 3 (VisCoT values come from chart.js). */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function h(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function press(buttons, on) { buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === on)); }); }

  /* ---------- 1. generation stepper ---------- */
  (function () {
    var root = $("#gen-demo"); if (!root) return;
    var out = $(".out", root), badge = $(".badge", root), what = $(".what", root), kline = $(".kline", root);
    var T1 = ["First,", "we", "need", "to", "determine", "the", "location", "of", "the", "bike."];
    var T2 = ["The", "object", "that", "is", "in", "front", "of", "the", "bike", "is", "a", "parking", "meter."];
    // LanteRn-SFT-K: VisCoT, V*, Blink (LanteRn paper, Table 1)
    var SFT = { 4: [0.80, 0.62, 0.61], 8: [0.81, 0.65, 0.60], 16: [0.80, 0.60, 0.54], 32: [0.79, 0.72, 0.58] };
    var K = 8, steps = [], i = 0, timer = null, grp = null;

    function build() {
      steps = [];
      T1.forEach(function (w) { steps.push({ t: "text", w: w }); });
      steps.push({ t: "start" });
      for (var k = 1; k <= K; k++) steps.push({ t: "lat", k: k });
      steps.push({ t: "end" });
      T2.forEach(function (w) { steps.push({ t: "text", w: w, after: true }); });
      if (kline) kline.textContent = "With " + K + " latent tokens, after supervised fine-tuning: VisCoT " + SFT[K][0].toFixed(2) + ", V* " + SFT[K][1].toFixed(2) + ", Blink " + SFT[K][2].toFixed(2) + ". Bigger blocks are not reliably better.";
    }
    function say(mode, text) {
      badge.textContent = mode === "lat" ? "Latent mode" : mode === "text" ? "Text mode" : mode;
      badge.className = "badge" + (mode === "lat" ? " latent" : "");
      what.textContent = text;
    }
    function reset() {
      stop(); i = 0;
      $all(".chip, .latgroup", out).forEach(function (c) { c.remove(); });
      grp = null; out.classList.remove("done");
      say("Ready", "Press Play, or step through one token at a time.");
    }
    function step() {
      if (i >= steps.length) return false;
      var s = steps[i++], c;
      $all(".now", out).forEach(function (n) { n.classList.remove("now"); });
      if (s.t === "text") {
        c = h("span", "chip new now", s.w);
        say("text", s.after
          ? "Back to words. Each one can attend to the latent block like any other context."
          : "The hidden state goes through the language-modelling head and becomes a word.");
      } else if (s.t === "start") {
        c = h("span", "chip mark new now", "<|lvr_start|>");
        say("text", "The model emits the start token. It decides for itself when to think visually.");
      } else if (s.t === "lat") {
        c = h("span", "chip lat new now" + (K > 8 ? " small" : ""));
        c.title = "latent " + s.k;
        say("lat", "Step " + s.k + " of " + K + ". The language-modelling head is skipped and the hidden state is fed straight back in as the next input.");
      } else {
        c = h("span", "chip mark new now", "<|lvr_end|>");
        say("text", "After " + K + " steps the end token is inserted and the model returns to text.");
      }
      if (s.t === "lat") {
        if (!grp) { grp = h("span", "latgroup"); grp.setAttribute("data-label", "Latent block"); out.appendChild(grp); }
        grp.appendChild(c);
      } else out.appendChild(c);
      if (i >= steps.length) { $all(".now", out).forEach(function (n) { n.classList.remove("now"); }); if (grp) grp.classList.add("show"); out.classList.add("done"); say("Done", "The answer was conditioned on the question, the image, the text, and " + K + " latent vectors that were never turned into words."); }
      return i < steps.length;
    }
    function stop() { if (timer) { clearTimeout(timer); timer = null; } $("[data-act=play]", root).textContent = "Play"; }
    function play() {
      if (timer) { stop(); return; }
      if (i >= steps.length) reset();
      $("[data-act=play]", root).textContent = "Pause";
      (function tick() {
        var more = step();
        if (!more) { stop(); return; }
        var s = steps[i - 1];
        timer = setTimeout(tick, s.t === "lat" ? (K > 8 ? 110 : 260) : s.t === "text" ? 170 : 650);
      })();
    }
    $("[data-act=play]", root).addEventListener("click", play);
    $("[data-act=step]", root).addEventListener("click", function () { stop(); if (i >= steps.length) reset(); step(); });
    $("[data-act=reset]", root).addEventListener("click", reset);
    var kb = $all("[data-k]", root);
    kb.forEach(function (b) { b.addEventListener("click", function () { K = +b.getAttribute("data-k"); press(kb, b); build(); reset(); }); });
    build();
    // play once when it first scrolls into view
    if (!reduce && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); if (i === 0) play(); } }, { threshold: 0.6 });
      io.observe(root);
    }
  })();

  /* ---------- 2. what each stage buys ---------- */
  (function () {
    var root = $("#stage-demo"); if (!root) return;
    var BENCH = ["VisCoT", "V*", "Blink"];
    var D = {
      sft: { base: [0.66, 0.70, 0.65], text: [0.80, 0.72, 0.60], own: [0.81, 0.65, 0.60], textName: "Text-only", ownName: "LanteRn",
        note: "After supervised fine-tuning, latents do not yet pay off: LanteRn-SFT-8 matches the text-only model (NTP-4) on VisCoT and Blink and trails it on V*." },
      rl: { base: [0.66, 0.70, 0.65], text: [0.82, 0.66, 0.64], own: [0.83, 0.71, 0.68], textName: "Text-only", ownName: "LanteRn",
        note: "After reinforcement learning, LanteRn-RL-8 is ahead of the text-only model (NTP-RL) on all three benchmarks." }
    };
    var groups = $(".bargroups", root), fills = [];
    BENCH.forEach(function (b, j) {
      var g = h("div"); g.appendChild(h("h4", null, b));
      var ul = h("ul", "bars");
      [["base", "Base"], ["text", "Text-only"], ["own", "LanteRn"]].forEach(function (r) {
        var li = h("li"); li.appendChild(h("span", null, r[1]));
        var tr = h("span", "track"), f = h("span", "fill " + r[0]); tr.appendChild(f); li.appendChild(tr);
        var v = h("span", "val"); li.appendChild(v); ul.appendChild(li);
        fills.push({ key: r[0], j: j, f: f, v: v });
      });
      g.appendChild(ul); groups.appendChild(g);
    });
    var bs = $all("[data-stage]", root), line = $(".readline", root);
    function show(stage) {
      var d = D[stage];
      fills.forEach(function (x) { var val = d[x.key][x.j]; x.f.style.width = (val * 100) + "%"; x.v.textContent = val.toFixed(2); });
      line.textContent = d.note;
    }
    bs.forEach(function (b) { b.addEventListener("click", function () { press(bs, b); show(b.getAttribute("data-stage")); }); });
    show("rl");
  })();

  /* ---------- 3. swap the latents: one model, one choice at a time ---------- */
  (function () {
    var root = $("#swap-demo"); if (!root || !window.LVR) return;
    var M = window.LVR.MODELS, V = window.LVR.DATA.viscot;
    var CONDS = [["std", "Own latents"], ["rs", "Unrelated crop"], ["noise", "Noise"], ["zeros", "Zeros"], ["skip", "Nothing"], ["oracle", "Oracle"]];
    var CLS = { std: "z", rs: "other", noise: "noise", zeros: "zero", oracle: "o" };
    var NAME = { std: "its own latents", rs: "latents from an unrelated crop", noise: "Gaussian noise", zeros: "zeros", skip: "an empty block", oracle: "oracle latents" };
    var sel = $("#swap-model"), pick = $(".pick", root), strip = $(".strip", root), big = $(".score b", root), small = $(".score span", root);
    var model = 2, cond = "std";
    function tok(cls, txt) { var t = h("span", "tok " + cls); if (txt) t.textContent = txt; return t; }
    M.forEach(function (m, i) { var o = h("option", null, m.name + " (" + m.sub + ")"); o.value = i; if (i === model) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", function () { model = +sel.value; draw(); });
    var bs = CONDS.map(function (c) {
      var b = h("button"); b.type = "button";
      var icon = h("span", "icon");
      if (c[0] === "skip") { icon.appendChild(tok("m")); icon.appendChild(tok("m")); }
      else icon.appendChild(tok(CLS[c[0]], c[0] === "zeros" ? "0" : ""));
      b.appendChild(icon); b.appendChild(document.createTextNode(c[1]));
      b.addEventListener("click", function () { cond = c[0]; draw(); });
      b._c = c[0]; pick.appendChild(b); return b;
    });
    function draw() {
      bs.forEach(function (b) { b.setAttribute("aria-pressed", String(b._c === cond)); });
      while (strip.firstChild) strip.removeChild(strip.firstChild);
      strip.appendChild(h("span", "ell", "reasoning"));
      for (var a = 0; a < 3; a++) strip.appendChild(tok(""));
      strip.appendChild(tok("m"));
      if (cond !== "skip") for (var k = 0; k < 8; k++) strip.appendChild(tok(CLS[cond], cond === "zeros" ? "0" : ""));
      strip.appendChild(tok("m"));
      for (var c2 = 0; c2 < 3; c2++) strip.appendChild(tok(""));
      strip.appendChild(h("span", "ell", "answer"));
      var v = V[cond][model], d = v - V.std[model];
      big.textContent = v + "%";
      small.textContent = cond === "std" ? "with " + NAME.std
        : (d === 0 ? "no change" : (d > 0 ? "+" : "−") + Math.abs(d) + (Math.abs(d) === 1 ? " point" : " points")) + " with " + NAME[cond];
    }
    draw();
  })();

  /* ---------- 4. change what the latents are for ---------- */
  (function () {
    var root = $("#regime-demo"); if (!root) return;
    // analysis paper: Table 2 (Std / Masked, %) and Table 3 (Tetris-like, x100)
    var R = {
      crop: { img: "img/latent-content.png", w: 1400, hgt: 897,
        alt: "Example a: the latent block encodes a crop of a dog holding a ring, taken from the input photo. Example b: a rotation puzzle whose latent block encodes the rotated shape.",
        cap: "Panel (a): the latent block holds a crop of the input image.",
        rows: { oracle: 79, rs: 78, noise: 79, zeros: 80, pause: 79 },
        note: "Nothing separates the bars. A model trained with empty pause tokens in place of latents does as well as LanteRn with perfect ones." },
      masked: { img: "img/masked-training.png", w: 1400, hgt: 444,
        alt: "The bird's region in the input image is blacked out. An unmasked crop of the bird is encoded into the oracle latents.",
        cap: "The region that matters is blacked out in the input and survives only in the latents.",
        rows: { oracle: 75, rs: 61, noise: 59, zeros: 59, pause: 59 },
        note: "Now a gap opens: 75% with the right latents, 59 to 61% with anything else. The model reads latents when they are its only source." },
      tetris: { img: "img/tetris-sample.png", w: 1400, hgt: 587,
        alt: "A rotation analogy puzzle with four candidate answers, and the intermediate image showing the shape rotated 90 degrees to the right.",
        cap: "Shape A is rotated to give B. Apply the same rotation to C. The latents encode the rotated shape.",
        rows: { oracle: 86, own: 33, rs: 30, noise: 26, zeros: 25, pause: 34 }, chance: 25,
        note: "With the right latents the model solves 86%. Any replacement drops it to chance (dashed line). But so do the latents it writes for itself: 33%." }
    };
    var ROWS = [["oracle", "Oracle latents", "oracle"], ["own", "Its own latents", "own"], ["rs", "Unrelated image", ""], ["noise", "Noise", ""], ["zeros", "Zeros", ""], ["pause", "Pause-token model", "pause"]];
    var ul = $(".bars", root), img = $("img", root), cap = $("figcaption", root), line = $(".readline", root), els = {};
    ROWS.forEach(function (r) {
      var li = h("li"); li.appendChild(h("span", null, r[1]));
      var tr = h("span", "track"), f = h("span", "fill " + r[2]), ch = h("span", "chance"); tr.appendChild(f); tr.appendChild(ch); li.appendChild(tr);
      var v = h("span", "val"); li.appendChild(v); ul.appendChild(li);
      els[r[0]] = { li: li, f: f, v: v, ch: ch };
    });
    var bs = $all("[data-regime]", root);
    function show(key) {
      var d = R[key];
      img.src = d.img; img.width = d.w; img.height = d.hgt; img.alt = d.alt; cap.textContent = d.cap;
      ROWS.forEach(function (r) {
        var e = els[r[0]], val = d.rows[r[0]];
        e.li.hidden = val == null;
        if (val != null) { e.f.style.width = val + "%"; e.v.textContent = val + "%"; }
        e.ch.hidden = d.chance == null; if (d.chance != null) e.ch.style.left = d.chance + "%";
      });
      line.textContent = d.note;
    }
    bs.forEach(function (b) { b.addEventListener("click", function () { press(bs, b); show(b.getAttribute("data-regime")); }); });
    show("crop");
  })();
  /* ---------- 5. collapse: two clouds + clickable table ---------- */
  (function () {
    var root = $("#collapse-demo"); if (!root) return;
    // analysis paper, Table 4 (VisCoT): similarity within oracle / predicted, Retrieval@10, USP
    var D = [
      { n: "ILVR", o: 0.33, p: 0.82, r10: 6.9, usp: 99.0 },
      { n: "LVR", o: 0.22, p: 0.85, r10: 10.0, usp: 99.6 },
      { n: "LanteRn SFT", o: 0.60, p: 0.98, r10: 6.3, usp: 100.0 },
      { n: "LanteRn RL", o: 0.60, p: 0.97, r10: 5.7, usp: 100.0 },
      { n: "Monet SFT", o: 0.96, p: 0.91, r10: 7.0, usp: 100.0 },
      { n: "Monet RL", o: 0.96, p: 0.91, r10: 7.0, usp: 100.0 }
    ];
    var NS = "http://www.w3.org/2000/svg", N = 46, cur = 2;
    var pts = [], seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < N; i++) { var r = Math.sqrt(rnd()), a = rnd() * 2 * Math.PI; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    var svgs = $all("svg.cl", root);
    function el(n, at, txt) { var e = document.createElementNS(NS, n); for (var k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; return e; }
    function radius(sim) { return 8 + 88 * (1 - sim) / 0.8; }
    function cloud(svg, sim, oracle, title) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var R = radius(sim), C = 130, CY = 128;
      svg.appendChild(el("circle", { cx: C, cy: C, r: 124, fill: oracle ? "#f3faf0" : "#fff7f1", stroke: oracle ? "#9fcf91" : "#f2c3a5", "stroke-width": 1.5 }));
      svg.appendChild(el("circle", { cx: C, cy: CY, r: R + 8, fill: "none", stroke: oracle ? "#3f9b2f" : "#a14e1e", "stroke-width": 1, "stroke-dasharray": "3 4", opacity: 0.6 }));
      pts.forEach(function (q, k) {
        var x = C + q[0] * R, y = CY + q[1] * R;
        if (oracle) svg.appendChild(el("rect", { x: x - 4.5, y: y - 4.5, width: 9, height: 9, rx: 2, fill: "#3f9b2f", stroke: "#fff" }));
        else svg.appendChild(el("circle", { cx: x, cy: y, r: 4.6, fill: "#f2a77b", stroke: "#a14e1e", "stroke-width": 1, "stroke-dasharray": "1.5 1.2" }));
      });
      svg.appendChild(el("text", { x: C, y: 30, "text-anchor": "middle", "font-size": 14, "font-weight": 650, fill: "#1a1d3a", "font-family": "Bricolage Grotesque, system-ui, sans-serif" }, title));
      svg.appendChild(el("text", { x: C, y: 282, "text-anchor": "middle", "font-size": 22, "font-weight": 750, fill: "#1a1d3a", "font-family": "Bricolage Grotesque, system-ui, sans-serif" }, sim.toFixed(2)));
      svg.appendChild(el("text", { x: C, y: 298, "text-anchor": "middle", "font-size": 11, fill: "#555a78", "font-family": "Bricolage Grotesque, system-ui, sans-serif" }, "average similarity"));
    }
    var box = $(".models", root);
    var bs = D.map(function (d, i) {
      var b = h("button", null, d.n); b.type = "button";
      b.addEventListener("click", function () { cur = i; draw(); });
      box.appendChild(b); return b;
    });
    function draw() {
      var d = D[cur];
      bs.forEach(function (b, i) { b.setAttribute("aria-pressed", String(i === cur)); });
      $(".r10", root).textContent = d.r10.toFixed(1) + "%";
      $(".usp", root).textContent = d.usp.toFixed(1) + "%";
      cloud(svgs[0], d.o, true, "Oracle");
      cloud(svgs[1], d.p, false, "Predicted");
      $(".readline", root).textContent = d.n.indexOf("Monet") === 0
        ? "Monet is the exception: its oracle latents are already as alike as its predictions, possibly because Monet is the only method whose oracle latents are generated autoregressively by a teacher model. Retrieval is still near chance."
        : d.n + "'s predictions sit in a much tighter cloud than the targets they were trained to match, and almost never retrieve their own target.";
    }
    draw();
  })();

  /* ---------- copy buttons for the BibTeX entries ---------- */
  $all(".cite .copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var pre = btn.closest(".cite").querySelector("pre"), text = pre.textContent;
      function done(msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = "Copy"; }, 1600); }
      function fallback() { var r = document.createRange(); r.selectNodeContents(pre); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); done("Selected, press Ctrl+C"); }
      try { navigator.clipboard.writeText(text).then(function () { done("Copied"); }, fallback); } catch (e) { fallback(); }
    });
  });
})();
