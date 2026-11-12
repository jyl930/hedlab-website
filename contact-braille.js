/* Contact page hero: 'human & environment design lab' in braille, resolving into dot-matrix lettering. */
(function () {
  var canvas = document.getElementById('hedBraille');
  if (!canvas) return;
  canvas.parentElement.style.width = '100%';
  canvas.style.display = 'block';
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // English braille, dots numbered 1-3 down the left column and 4-6 down the right.
  var B = { a:[1], b:[1,2], c:[1,4], d:[1,4,5], e:[1,5], f:[1,2,4], g:[1,2,4,5], h:[1,2,5], i:[2,4], j:[2,4,5],
    k:[1,3], l:[1,2,3], m:[1,3,4], n:[1,3,4,5], o:[1,3,5], p:[1,2,3,4], q:[1,2,3,4,5], r:[1,2,3,5], s:[2,3,4],
    t:[2,3,4,5], u:[1,3,6], v:[1,2,3,6], w:[2,4,5,6], x:[1,3,4,6], y:[1,3,4,5,6], z:[1,3,5,6] };
  // Each line is a list of cells: [dots, caption]. The ampersand takes two cells in UEB (dot 4, then 1-2-3-4-6).
  function word(s) { return s.split('').map(function (c) { return c === ' ' ? [[], ''] : [B[c], c]; }); }
  var LINES = [
    word('human ').concat([[[4], ''], [[1,2,3,4,6], '&']]),
    word('environment'),
    word('design lab')
  ];
  var TEXT = ['HUMAN &', 'ENVIRONMENT', 'DESIGN LAB'];

  var T_RAISE = 0.6, T_READ = 5.1, T_MORPH = 10.8, T_SWEEP = 13.5, T_OUT = 16.5, T_LOOP = 18.3;

  var W = 0, H = 0, dpr = 1;
  var col = { bg: '#ffffff', ink: '#0a0a0a', muted: '#6d7574', field: '#d9dedd', accent: '#267c78' };
  var parts = [], cells = [], field = null, geo = {};

  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function back(x) { var c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }


  function build() {
    // Size comes from the wrapper's width alone and is written out in pixels, so the
    // canvas's own bitmap size can never feed back into the layout.
    W = Math.max(1, Math.round(canvas.parentElement.clientWidth));
    H = Math.round(W * 1992 / 3840);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);

    var x0 = W * 0.07;

    // Large braille block: dot pitch P, cell period 2.5P, line period 5.2P.
    var P = Math.min(W * 0.86 / 26, H * 0.82 / 13.7);
    var topA = (H - 13.7 * P) / 2;
    cells = [];
    var braille = [];
    var n = 0;
    LINES.forEach(function (line, l) {
      line.forEach(function (cell, i) {
        var cx = x0 + i * 2.5 * P, cy = topA + l * 5.2 * P;
        var c = { x: cx, y: cy, line: l, order: n, ch: cell[1], blank: cell[0].length === 0 && cell[1] === '' };
        if (!c.blank) { cells.push(c); n++; }
        cell[0].forEach(function (d) {
          braille.push({ x: cx + (d > 3 ? P : 0), y: cy + ((d - 1) % 3) * P, line: l, order: c.order });
        });
      });
    });

    // Fine grid of 2x3 cells; the lettering is sampled onto it.
    var p = W / 156, gap = p * 0.4;
    var xs = [], ys = [], x, y, k;
    for (x = p * 0.8, k = 0; x < W - p * 0.5; k++) { xs.push(x); x += (k % 2 === 0) ? p : p + gap; }
    for (y = p * 0.8, k = 0; y < H - p * 0.5; k++) { ys.push(y); y += (k % 3 === 2) ? p + gap : p; }

    var off = document.createElement('canvas');
    off.width = Math.ceil(W); off.height = Math.ceil(H);
    var o = off.getContext('2d');
    var face = '800 100px "HED Braille Display", Urbanist, "Arial Black", sans-serif';
    o.font = face;
    var widest = Math.max.apply(null, TEXT.map(function (s) { return o.measureText(s).width; }));
    var fs = Math.min(W * 0.86 * 100 / widest, H * 0.8 / 2.7);
    var lh = fs * 1.0, cap = fs * 0.7;
    var topB = (H - (2 * lh + cap)) / 2;
    o.font = face.replace('100px', fs + 'px');
    o.fillStyle = '#000';
    TEXT.forEach(function (s, l) { o.fillText(s, x0, topB + cap + l * lh); });
    var img = o.getImageData(0, 0, off.width, off.height).data;

    parts = [];
    xs.forEach(function (px) {
      ys.forEach(function (py) {
        var a = img[(Math.round(py) * off.width + Math.round(px)) * 4 + 3];
        if (a > 80) parts.push({ bx: px, by: py, rnd: Math.random(), a: null });
      });
    });
    // Each large braille dot travels to its nearest free place in the lettering.
    braille.forEach(function (d) {
      var best = null, bd = Infinity;
      parts.forEach(function (q) {
        if (q.a) return;
        var dd = (q.bx - d.x) * (q.bx - d.x) + (q.by - d.y) * (q.by - d.y);
        if (dd < bd) { bd = dd; best = q; }
      });
      if (best) best.a = d;
    });

    geo = { P: P, p: p, x0: x0, xs: xs, ys: ys };
    drawField();
  }

  function drawField() {
    if (!geo.xs) return;
    field = document.createElement('canvas');
    field.width = canvas.width; field.height = canvas.height;
    var f = field.getContext('2d');
    f.scale(dpr, dpr);
    f.fillStyle = col.field;
    var s = Math.max(1, geo.p * 0.24);
    geo.xs.forEach(function (x) { geo.ys.forEach(function (y) { f.fillRect(x - s / 2, y - s / 2, s, s); }); });
  }

  function dot(x, y, r) { if (r > 0.05) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832); } }

  function frame(t) {
    var P = geo.P, p = geo.p, x0 = geo.x0;
    var R = P * 0.31, r = p * 0.36;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, W, H);

    var fieldA = clamp((t - T_MORPH - 0.3) / 0.8) * (1 - clamp((t - T_OUT - 0.7) / 0.6));
    if (fieldA > 0 && field) { ctx.globalAlpha = fieldA; ctx.drawImage(field, 0, 0, W, H); ctx.globalAlpha = 1; }

    // Empty positions of each large cell, so the 2x3 cell is visible before any dot rises.
    var cellA = clamp(t / 0.5) * (1 - clamp((t - T_MORPH) / 0.5));
    if (cellA > 0) {
      ctx.globalAlpha = cellA; ctx.fillStyle = col.field; ctx.beginPath();
      cells.forEach(function (c) {
        for (var i = 0; i < 6; i++) dot(c.x + (i > 2 ? P : 0), c.y + (i % 3) * P, P * 0.09);
      });
      ctx.fill(); ctx.globalAlpha = 1;
    }

    var sxs = x0 - P * 1.5, sxe = x0 + P * 28;
    var sweep2 = -W * 0.1 + clamp((t - T_SWEEP) / 1.5) * W * 1.2;
    var hot = [];

    ctx.fillStyle = col.ink; ctx.beginPath();
    parts.forEach(function (q) {
      var x = q.bx, y = q.by, rad, h = 0;
      if (q.a) {
        var up = back(clamp((t - (T_RAISE + q.a.order * 0.13)) / 0.55));
        var m = ease(clamp((t - (T_MORPH + q.rnd * 0.5)) / 0.9));
        x = q.a.x + (q.bx - q.a.x) * m; y = q.a.y + (q.by - q.a.y) * m;
        rad = R * up + (r - R * up) * m;
        if (t < T_MORPH) {
          var s1 = sxs + ((t - (T_READ + q.a.line * 1.7)) / 1.6) * (sxe - sxs);
          h = Math.max(h, 1 - Math.abs(x - s1) / (P * 1.6));
        }
      } else {
        rad = r * back(clamp((t - (T_MORPH + 0.2 + q.bx / W * 0.9 + q.rnd * 0.3)) / 0.45));
      }
      if (t > T_SWEEP) h = Math.max(h, 1 - Math.abs(x - sweep2) / (W * 0.06));
      rad *= 1 - clamp((t - (T_OUT + q.rnd * 0.9)) / 0.4);
      if (h > 0) { rad *= 1 + 0.35 * h; hot.push([x, y, rad, h]); }
      dot(x, y, rad);
    });
    ctx.fill();

    // The reading sweep tints the dots under it.
    ctx.fillStyle = col.accent;
    hot.forEach(function (d) { ctx.globalAlpha = d[3]; ctx.beginPath(); dot(d[0], d[1], d[2]); ctx.fill(); });
    ctx.globalAlpha = 1;

    // Print letters appear under each cell once the sweep has read it.
    var capOut = 1 - clamp((t - T_MORPH + 0.1) / 0.4);
    if (capOut > 0) {
      ctx.font = '500 ' + (P * 0.62) + 'px "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = col.muted;
      cells.forEach(function (c) {
        if (!c.ch) return;
        var pass = T_READ + c.line * 1.7 + 1.6 * ((c.x + P / 2 - sxs) / (sxe - sxs));
        var a = clamp((t - pass) / 0.25) * capOut;
        if (a > 0) { ctx.globalAlpha = a; ctx.fillText(c.ch, c.x + P / 2, c.y + P * 3.2); }
      });
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }

  }

  var start = null;
  function tick(now) {
    if (start === null) start = now;
    frame(((now - start) / 1000) % T_LOOP);
    requestAnimationFrame(tick);
  }

  function boot() {
    build();
    if (reduce) frame(13.4); else requestAnimationFrame(tick);
  }

  var resizeTimer;
  new ResizeObserver(function () {
    if (Math.round(canvas.parentElement.clientWidth) === W) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { build(); if (reduce) frame(13.4); }, 120);
  }).observe(canvas.parentElement);

  // The lettering uses the site's own Urbanist file under a private family name,
  // so loading it here does not change any other text on the page.
  var fonts = Promise.resolve();
  if (window.FontFace && document.fonts) {
    var display = new FontFace('HED Braille Display', 'url(assets/fonts/Urbanist.woff2)', { weight: '100 900' });
    document.fonts.add(display);
    fonts = Promise.all([display.load(), document.fonts.load('500 20px "IBM Plex Mono"')]);
  }
  Promise.race([fonts, new Promise(function (res) { setTimeout(res, 2500); })]).then(boot, boot);
})();
