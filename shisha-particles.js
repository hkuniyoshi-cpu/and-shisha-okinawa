/* ============================================================
   shisha-particles.js — and shisha OKINAWA
   近未来的パーティクル・シーシャ
   ------------------------------------------------------------
   ・シーシャの形状を Path2D で描画 → ピクセルを走査して
     微細ドットのターゲット座標群に変換（電子ドット化）
   ・ドットがスキャッター状態からバネ運動で集合し形を成す
   ・炭からドットの煙が連続的に立ち上る（カール／拡散／減衰）
   ・縦方向のスキャン・シマー、炭のパルス、ホログラム風リング
   ・カーソルで斥力（近未来UIらしいリアクション）
   ・prefers-reduced-motion 時は静的SVGにフォールバック
   ・画面外では rAF を停止（省電力）
   ============================================================ */
(function () {
  'use strict';

  var wrap   = document.getElementById('shishaIllu');
  var canvas = document.getElementById('shishaCanvas');
  if (!wrap || !canvas || !canvas.getContext) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // 静的SVGのまま

  var ctx = canvas.getContext('2d');
  var VB_W = 200, VB_H = 280;   // 元SVGのビューボックス

  var dpr = 1, W = 0, H = 0, sc = 1;
  var tiers = { base: [], sage: [], tech: [], coal: [] };
  var smoke = [];
  var t = 0, raf = null, running = false, formed = 0;
  var pointer = { x: -9999, y: -9999, on: false };

  /* ---------- シーシャ形状（元の線画と同じ座標系） ---------- */
  var STROKES = [
    'M82 64 L118 64 L111 86 L89 86 Z',          // ボウル（火皿）
    'M78 64 L122 64',                            // 皿の縁
    'M100 86 L100 178',                          // ステム
    'M70 106 q30 13 60 0',                       // トレイ
    'M70 106 L130 106',
    'M100 122 C 142 120, 170 142, 163 174 C 159 197, 177 205, 188 196', // ホース
    'M188 196 l 9 -7',                           // 吸い口
    'M100 178 c -27 0 -35 21 -35 43 c 0 25 16 41 35 41 c 19 0 35 -16 35 -41 c 0 -22 -8 -43 -35 -43 z' // ベース
  ];
  var FILLS = [
    'M66 228 c 11 6 57 6 68 0 c 2 21 -15 34 -34 34 c -19 0 -36 -13 -34 -34 z' // 水面
  ];
  var COALS = [[93, 52, 4], [106, 51, 4], [100, 59, 3.4]];

  /* ---------- 形状をラスタライズしてドット座標を抽出 ---------- */
  function sampleTargets(cw, ch) {
    var s = cw / VB_W;
    var off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(cw));
    off.height = Math.max(1, Math.round(ch));
    var o = off.getContext('2d');

    o.save();
    o.scale(s, s);
    o.strokeStyle = '#000';
    o.fillStyle = '#000';
    o.lineWidth = 2.8;
    o.lineJoin = 'round';
    o.lineCap = 'round';
    STROKES.forEach(function (d) { o.stroke(new Path2D(d)); });
    FILLS.forEach(function (d) { o.fill(new Path2D(d)); });
    COALS.forEach(function (c) {
      o.beginPath(); o.arc(c[0], c[1], c[2], 0, Math.PI * 2); o.fill();
    });
    o.restore();

    var data = o.getImageData(0, 0, off.width, off.height).data;
    var step = Math.max(2, Math.round(cw / 230));   // ドット間隔（細かさ）
    var pts = [];
    for (var y = 0; y < off.height; y += step) {
      for (var x = 0; x < off.width; x += step) {
        if (data[(y * off.width + x) * 4 + 3] > 90) {
          pts.push([
            x + (Math.random() - 0.5) * step * 0.7,
            y + (Math.random() - 0.5) * step * 0.7
          ]);
        }
      }
    }
    return pts;
  }

  /* ---------- 炭の近傍か判定（炭ドットは橙で脈動） ---------- */
  function isCoal(vx, vy) {
    for (var i = 0; i < COALS.length; i++) {
      var dx = vx - COALS[i][0], dy = vy - COALS[i][1];
      if (dx * dx + dy * dy < (COALS[i][2] + 1.6) * (COALS[i][2] + 1.6)) return true;
    }
    return false;
  }

  /* ---------- パーティクル生成 ---------- */
  function build() {
    var pts = sampleTargets(W, H);
    tiers = { base: [], sage: [], tech: [], coal: [] };

    for (var i = 0; i < pts.length; i++) {
      var tx = pts[i][0], ty = pts[i][1];
      var vx = tx / sc, vy = ty / sc;      // ビューボックス座標に戻す

      var tier;
      if (isCoal(vx, vy))        tier = 'coal';
      else if (Math.random() < 0.10) tier = 'tech';   // 電子的アクセント
      else if (Math.random() < 0.20) tier = 'sage';
      else                        tier = 'base';

      // 初期位置：中心から放射状に散らばった状態（集合アニメの起点）
      var ang = Math.random() * Math.PI * 2;
      var rad = (0.55 + Math.random() * 0.9) * Math.max(W, H);

      tiers[tier].push({
        tx: tx, ty: ty,
        x: W / 2 + Math.cos(ang) * rad,
        y: H / 2 + Math.sin(ang) * rad,
        vx: 0, vy: 0,
        ph: Math.random() * Math.PI * 2,
        // 下から上へ順に集合させる（スイープ・イン）
        delay: (1 - ty / H) * 0.55 + Math.random() * 0.35
      });
    }
  }

  /* ---------- リサイズ ---------- */
  function resize() {
    var cw = Math.min(340, Math.max(200, wrap.clientWidth || 340));
    var ch = cw * VB_H / VB_W;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.style.width  = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.width  = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    W = cw; H = ch; sc = cw / VB_W;
    smoke.length = 0;
    formed = 0;
    build();
  }

  /* ---------- 煙（ドット）生成 ---------- */
  function spawnSmoke() {
    smoke.push({
      x: (99 + (Math.random() - 0.5) * 15) * sc,
      y: (46 + (Math.random() - 0.5) * 4) * sc,
      vx: (Math.random() - 0.5) * 0.10,
      vy: -(0.22 + Math.random() * 0.30),
      life: 0,
      max: 120 + Math.random() * 110,
      ph: Math.random() * Math.PI * 2,
      sz: 0.55 + Math.random() * 0.85,
      tech: Math.random() < 0.10
    });
  }

  /* ---------- 描画ループ ---------- */
  function frame() {
    if (!running) return;
    t += 0.016;
    if (formed < 1) formed += 0.006;

    ctx.clearRect(0, 0, W, H);

    /* ホログラム風リング（背面） */
    var ringR = W * 0.30;
    ctx.save();
    ctx.translate(W * 0.5, H * 0.72);
    ctx.rotate(t * 0.18);
    ctx.strokeStyle = 'rgba(160,126,85,0.16)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 7]);
    ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(-t * 0.32);
    ctx.strokeStyle = 'rgba(64,178,168,0.13)';
    ctx.setLineDash([1, 11]);
    ctx.beginPath(); ctx.arc(0, 0, ringR * 0.74, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);

    /* 炭のグロー */
    var pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    var gx = 99 * sc, gy = 53 * sc;
    var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 26 * sc);
    g.addColorStop(0, 'rgba(217,118,74,' + (0.20 + pulse * 0.16) + ')');
    g.addColorStop(1, 'rgba(217,118,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - 26 * sc, gy - 26 * sc, 52 * sc, 52 * sc);

    /* 煙（ドット） */
    if (smoke.length < 620) {
      var n = 3;
      while (n--) spawnSmoke();
    }
    ctx.fillStyle = 'rgba(111,126,120,1)';
    for (var i = smoke.length - 1; i >= 0; i--) {
      var s = smoke[i];
      s.life++;
      if (s.life > s.max) { smoke.splice(i, 1); continue; }

      // カール（渦を巻きながら上昇）＋わずかな加速
      s.vx += Math.sin(t * 1.5 + s.ph + s.life * 0.035) * 0.014;
      s.vy -= 0.0007;
      s.x += s.vx;
      s.y += s.vy;

      var lp = s.life / s.max;
      var a = Math.sin(lp * Math.PI) * 0.46;
      var sz = s.sz * (1 + lp * 1.7);

      ctx.fillStyle = s.tech
        ? 'rgba(64,178,168,' + (a * 0.85).toFixed(3) + ')'
        : 'rgba(111,126,120,' + a.toFixed(3) + ')';
      ctx.fillRect(s.x, s.y, sz, sz);
    }

    /* シーシャ本体（ドット） */
    var order = ['base', 'sage', 'tech', 'coal'];
    for (var k = 0; k < order.length; k++) {
      var name = order[k];
      var arr = tiers[name];
      if (!arr.length) continue;

      var rgb = name === 'coal' ? '217,118,74'
              : name === 'tech' ? '64,178,168'
              : name === 'sage' ? '111,126,120'
              :                   '126,96,56';
      ctx.fillStyle = 'rgb(' + rgb + ')';

      for (var j = 0; j < arr.length; j++) {
        var p = arr[j];
        var active = formed > p.delay;

        if (active) {
          // バネでターゲットへ収束
          p.vx += (p.tx - p.x) * 0.055;
          p.vy += (p.ty - p.y) * 0.055;
          // 微細な揺らぎ（生きた質感）
          p.vx += Math.cos(t * 0.9 + p.ph) * 0.020;
          p.vy += Math.sin(t * 0.7 + p.ph * 1.3) * 0.020;
        } else {
          p.vy -= 0.004;
        }

        // カーソル斥力
        if (pointer.on) {
          var dx = p.x - pointer.x, dy = p.y - pointer.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 3600) {
            var d = Math.sqrt(d2) || 1;
            var f = (1 - d / 60) * 3.4;
            p.vx += dx / d * f;
            p.vy += dy / d * f;
          }
        }

        p.vx *= 0.86; p.vy *= 0.86;
        p.x += p.vx; p.y += p.vy;

        // 縦スキャンのシマー（下から上へ光が走る）
        var wave = Math.sin(p.ty * 0.045 - t * 2.1);
        var glow = wave > 0 ? wave : 0;

        var a2, size;
        if (name === 'coal') {
          a2 = 0.55 + pulse * 0.45;
          size = 1.5 + pulse * 0.8;
        } else {
          a2 = (0.52 + glow * 0.44) * Math.min(1, formed * 1.6);
          size = 1.2 + glow * 0.9;
        }

        ctx.globalAlpha = a2;
        ctx.fillRect(p.x, p.y, size, size);
      }
      ctx.globalAlpha = 1;
    }

    raf = requestAnimationFrame(frame);
  }

  /* ---------- 起動制御 ---------- */
  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  /* ---------- ポインタ ---------- */
  canvas.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.on = true;
  });
  canvas.addEventListener('pointerleave', function () { pointer.on = false; });

  /* ---------- 画面内でのみ動かす ---------- */
  wrap.classList.add('particles');
  resize();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) start(); else stop();
      });
    }, { threshold: 0.05 }).observe(wrap);
  } else {
    start();
  }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(resize, 200);
  });
})();
