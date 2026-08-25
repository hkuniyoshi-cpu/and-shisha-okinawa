/* ============================================================
   shisha-3d.js — and shisha OKINAWA
   WebGL / Three.js  近未来3Dシーシャ体験
   ------------------------------------------------------------
   ・シーシャの断面プロファイルを「回転体」として3D点群化
     （ベース球体・ステム・トレイ・ボウル・炭・ホース・水面）
   ・起動時、粒子が中心からバネ運動で“咲いて”シーシャを形成
   ・炭から3Dの煙が連続的に立ち上る（カール／上昇／白へ溶ける）
   ・マウスで視点がまわる（3D パララックス）＋ゆるやか自動回転
   ・白背景に溶けるフォグで奥行き、ソフトドット・テクスチャ
   ・reduced-motion / タブ非表示 / 画面外 で描画を抑制
   ・WebGL 非対応・Three 未読込時は静かにフォールバック
   ============================================================ */
(function () {
  'use strict';

  var mount = document.getElementById('exp-stage');
  if (!mount || typeof THREE === 'undefined') { document.documentElement.classList.add('no-3d'); return; }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = mount.clientWidth || window.innerWidth;
  var H = mount.clientHeight || window.innerHeight;

  // タッチ端末（モバイル・タブレット）判定
  var isTouch = window.matchMedia && (window.matchMedia('(pointer:coarse)').matches);
  var isSmall = Math.min(window.innerWidth, window.innerHeight) < 720;

  // 品質スケール（モバイルはさらに攻めて負荷を下げる：Q=0.35）
  var Q = (isTouch || isSmall) ? 0.35 : 1;
  function qn(n) { return Math.max(1, Math.round(n * Q)); }

  // モバイルはFPSを 30 に絞る（デスクトップは 60）
  var TARGET_FPS = (isTouch || isSmall) ? 30 : 60;
  var MIN_FRAME_MS = 1000 / TARGET_FPS - 1;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !isTouch,   // モバイルはAA無効（大きな負荷源）
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch (e) { document.documentElement.classList.add('no-3d'); return; }
  // モバイルはDPRを 1 に固定（描画ピクセル数を最小化）
  renderer.setPixelRatio(isTouch ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  // Canvasにタッチイベントを奪わせない（スクロール優先）
  renderer.domElement.style.touchAction = 'pan-y';
  renderer.domElement.style.pointerEvents = 'none';

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffffff, 0.052);

  var camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 100);
  camera.position.set(0, 0.4, 9.4);
  camera.lookAt(0, 0.15, 0);

  var group = new THREE.Group();
  scene.add(group);

  /* ---------- ソフトドット・テクスチャ ---------- */
  function dotTexture(soft) {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (soft) {
      grd.addColorStop(0, 'rgba(255,255,255,0.9)');
      grd.addColorStop(0.35, 'rgba(255,255,255,0.35)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
    } else {
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.55, 'rgba(255,255,255,0.85)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
    }
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    var tex = new THREE.Texture(c);
    tex.needsUpdate = true;
    return tex;
  }
  var dotTex = dotTexture(false);
  var smokeTex = dotTexture(true);

  /* ---------- パレット ---------- */
  var CLAY = [0.627, 0.494, 0.333];   // #A07E55
  var CLAY_D = [0.494, 0.376, 0.235]; // #7E6038
  var SAGE = [0.435, 0.494, 0.471];   // #6F7E78
  var TEAL = [0.251, 0.698, 0.659];   // #40B2A8 電子アクセント
  var COAL = [0.851, 0.463, 0.290];   // #D9764A
  var SMOKE0 = [0.62, 0.66, 0.65];

  function jitter(v, a) { return v + (Math.random() - 0.5) * a; }

  /* ============================================================
     シーシャ本体を点群として生成（回転体＋ホース）
     ============================================================ */
  var META = [];  // { tx,ty,tz, sx,sy,sz, r,g,b, ph, delay, coal }
  function push(tx, ty, tz, col, coal) {
    // bloom 起点：中心付近に集約＋下方＋放射状に散らす
    var ang = Math.random() * Math.PI * 2;
    var rad = 0.4 + Math.random() * 2.6;
    META.push({
      tx: tx, ty: ty, tz: tz,
      sx: Math.cos(ang) * rad * 0.5,
      sy: ty * 0.12 - 3.4 - Math.random() * 1.5,
      sz: Math.sin(ang) * rad * 0.5,
      r: col[0], g: col[1], b: col[2],
      ph: Math.random() * Math.PI * 2,
      // 下（ベース）から順に咲く
      delay: THREE.MathUtils.clamp((ty + 3.2) / 6.4, 0, 1) * 0.55 + Math.random() * 0.12,
      coal: !!coal
    });
  }
  function tierColor(techP) {
    var x = Math.random();
    if (x < (techP || 0.10)) return TEAL;
    if (x < 0.34) return SAGE;
    if (x < 0.5) return CLAY_D;
    return CLAY;
  }
  function ringY(y, r, n, col, techP) {
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
      var rr = r + jitter(0, r * 0.05);
      push(Math.cos(a) * rr, jitter(y, 0.02), Math.sin(a) * rr, col || tierColor(techP));
    }
  }

  // ベース球体（ガラス）: 楕円シェル
  (function () {
    var cy = -1.95, ry = 1.15, rx = 1.28;
    for (var i = 0; i < qn(2400); i++) {
      var u = Math.random() * Math.PI * 2;
      var v = Math.acos(2 * Math.random() - 1);
      var y = cy + Math.cos(v) * ry;
      var rr = Math.sin(v) * rx;
      push(Math.cos(u) * rr, y, Math.sin(u) * rr, tierColor(0.12));
    }
  })();
  // 水面（ベース内・ティール寄り）
  (function () {
    for (var i = 0; i < qn(460); i++) {
      var a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 1.0;
      var col = Math.random() < 0.5 ? TEAL : SAGE;
      push(Math.cos(a) * rr, jitter(-2.05, 0.06), Math.sin(a) * rr, col);
    }
  })();
  // ステム
  for (var sy = -1.05; sy < 1.55; sy += 0.045) ringY(sy, 0.11, 12, null, 0.1);
  // トレイ（皿）
  (function () {
    for (var i = 0; i < 520; i++) {
      var a = Math.random() * Math.PI * 2, rr = 0.25 + Math.sqrt(Math.random()) * 0.85;
      push(Math.cos(a) * rr, jitter(0.52, 0.03), Math.sin(a) * rr, tierColor(0.1));
    }
  })();
  // ボウル（火皿・逆円錐）
  for (var by = 1.55; by < 2.2; by += 0.05) {
    var t = (by - 1.55) / 0.65;
    ringY(by, 0.3 + t * 0.34, 22, null, 0.1);
  }
  // 炭
  (function () {
    var centers = [[-0.18, 2.32, 0.05], [0.2, 2.3, -0.06], [0.02, 2.42, 0.12]];
    for (var c = 0; c < centers.length; c++) {
      for (var i = 0; i < 130; i++) {
        var u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1), r = 0.16 * Math.cbrt(Math.random());
        push(centers[c][0] + Math.sin(v) * Math.cos(u) * r,
             centers[c][1] + Math.cos(v) * r,
             centers[c][2] + Math.sin(v) * Math.sin(u) * r, COAL, true);
      }
    }
  })();
  // ホース（3Dベジェのチューブ）
  (function () {
    var P0 = new THREE.Vector3(0.1, 0.95, 0);
    var P1 = new THREE.Vector3(2.9, 1.35, 1.1);
    var P2 = new THREE.Vector3(2.7, -0.6, 0.9);
    var P3 = new THREE.Vector3(2.0, -1.35, 0.4);
    var curve = new THREE.CubicBezierCurve3(P0, P1, P2, P3);
    var N = 150;
    for (var i = 0; i <= N; i++) {
      var t = i / N;
      var p = curve.getPoint(t);
      var tan = curve.getTangent(t);
      var up = new THREE.Vector3(0, 1, 0);
      var nrm = new THREE.Vector3().crossVectors(tan, up).normalize();
      var bin = new THREE.Vector3().crossVectors(tan, nrm).normalize();
      var ring = 9;
      for (var j = 0; j < ring; j++) {
        var a = (j / ring) * Math.PI * 2;
        var rr = 0.085;
        var off = nrm.clone().multiplyScalar(Math.cos(a) * rr).add(bin.clone().multiplyScalar(Math.sin(a) * rr));
        var col = Math.random() < 0.12 ? TEAL : (Math.random() < 0.4 ? SAGE : CLAY);
        push(p.x + off.x, p.y + off.y, p.z + off.z, col);
      }
    }
    // 吸い口
    for (var k = 0; k < 60; k++) ringY(-1.35 + Math.random() * 0.02, 0.13, 1, CLAY_D), META[META.length - 1] && (META[META.length - 1].tx += 2.0, META[META.length - 1].tz += 0.4);
  })();

  var COUNT = META.length;
  var positions = new Float32Array(COUNT * 3);
  var colors = new Float32Array(COUNT * 3);
  for (var i = 0; i < COUNT; i++) {
    positions[i * 3] = META[i].sx; positions[i * 3 + 1] = META[i].sy; positions[i * 3 + 2] = META[i].sz;
    colors[i * 3] = META[i].r; colors[i * 3 + 1] = META[i].g; colors[i * 3 + 2] = META[i].b;
  }
  var bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  bodyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  var bodyMat = new THREE.PointsMaterial({
    size: 0.062, map: dotTex, vertexColors: true, transparent: true, opacity: 0.95,
    depthWrite: false, sizeAttenuation: true
  });
  var body = new THREE.Points(bodyGeo, bodyMat);
  group.add(body);

  /* ============================================================
     煙（3D・炭から立ち上る）
     ============================================================ */
  var SMOKE = qn(950);
  var sPos = new Float32Array(SMOKE * 3);
  var sCol = new Float32Array(SMOKE * 3);
  var sState = [];
  function seedSmoke(i, initial) {
    sState[i] = {
      x: jitter(0, 0.28), y: 2.35 + (initial ? Math.random() * 4 : jitter(0, 0.1)), z: jitter(0, 0.28),
      vx: jitter(0, 0.004), vy: 0.012 + Math.random() * 0.02, vz: jitter(0, 0.004),
      life: initial ? Math.random() : 0, max: 3.2 + Math.random() * 2.6, seed: Math.random() * 10,
      tech: Math.random() < 0.08
    };
  }
  for (var i = 0; i < SMOKE; i++) { seedSmoke(i, true); }
  var smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  smokeGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  var smokeMat = new THREE.PointsMaterial({
    size: 0.32, map: smokeTex, vertexColors: true, transparent: true, opacity: 0.46,
    depthWrite: false, sizeAttenuation: true
  });
  var smoke = new THREE.Points(smokeGeo, smokeMat);
  group.add(smoke);

  /* ---------- 背面ホログラム・リング ---------- */
  function ring(r, col, op) {
    var g = new THREE.BufferGeometry();
    var seg = 220, arr = [];
    for (var i = 0; i <= seg; i++) { var a = (i / seg) * Math.PI * 2; arr.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    var m = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op });
    var l = new THREE.LineLoop(g, m); return l;
  }
  var ring1 = ring(2.9, 0xA07E55, 0.16); ring1.position.y = -2.0; ring1.rotation.x = Math.PI / 2.05; group.add(ring1);
  var ring2 = ring(2.2, 0x40B2A8, 0.14); ring2.position.y = -2.0; ring2.rotation.x = Math.PI / 2.05; group.add(ring2);

  /* ============================================================
     アニメーション
     ============================================================ */
  var t = 0, bloom = 0, raf = null, running = false, visible = true;
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  var _lastFrame = 0;
  var _scrolling = false, _scrollTimer = null;

  // モバイルではパララックスを完全に無効化（scrollとの競合回避＋計算負荷減）
  if (!isTouch) {
    window.addEventListener('pointermove', function (e) {
      tmx = (e.clientX / window.innerWidth - 0.5);
      tmy = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
  }

  // スクロール中は描画を一時休止（モバイルのカクつき対策）
  window.addEventListener('scroll', function () {
    _scrolling = true;
    if (_scrollTimer) clearTimeout(_scrollTimer);
    _scrollTimer = setTimeout(function(){ _scrolling = false; }, 140);
  }, { passive: true });

  function smoothstep(a, b, x) { x = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }

  function animate(now) {
    if (!running) return;
    // FPSキャップ（モバイル=30, デスクトップ=60）
    if (now && (now - _lastFrame) < MIN_FRAME_MS) { raf = requestAnimationFrame(animate); return; }
    _lastFrame = now || performance.now();
    // モバイルでスクロール中は描画スキップ（体感カクつき激減）
    if (isTouch && _scrolling) { raf = requestAnimationFrame(animate); return; }
    t += 0.016;
    if (bloom < 1) bloom = Math.min(1, bloom + 0.0085);
    var eb = 1 - Math.pow(1 - bloom, 3);

    // 本体：start→target を高さ順に咲かせる＋アイドル揺らぎ
    var pa = bodyGeo.attributes.position.array;
    var ca = bodyGeo.attributes.color.array;
    var pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    for (var i = 0; i < COUNT; i++) {
      var m = META[i];
      var k = smoothstep(m.delay, 1, eb);
      var nx = Math.sin(t * 0.8 + m.ph) * 0.02 * k;
      var ny = Math.cos(t * 0.6 + m.ph * 1.3) * 0.02 * k;
      var i3 = i * 3;
      pa[i3]     = m.sx + (m.tx - m.sx) * k + nx;
      pa[i3 + 1] = m.sy + (m.ty - m.sy) * k + ny;
      pa[i3 + 2] = m.sz + (m.tz - m.sz) * k + nx;
      if (m.coal) {
        var f = 0.6 + pulse * 0.4;
        ca[i3] = 0.851 * f + 0.14; ca[i3 + 1] = 0.463 * f; ca[i3 + 2] = 0.290 * f;
      }
    }
    bodyGeo.attributes.position.needsUpdate = true;
    bodyGeo.attributes.color.needsUpdate = true;

    // 煙：3Dで上昇・カール・白へ溶ける
    var em = smoothstep(0.2, 1, bloom);
    for (var j = 0; j < SMOKE; j++) {
      var s = sState[j];
      s.life += 0.016;
      if (s.life > s.max || s.y > 7) seedSmoke(j, false);
      s.vx += Math.sin(t * 1.1 + s.seed + s.y * 0.6) * 0.0009;
      s.vz += Math.cos(t * 0.9 + s.seed + s.y * 0.5) * 0.0009;
      s.vy += 0.00016;
      s.x += s.vx; s.y += s.vy; s.z += s.vz;
      var lp = s.life / s.max;
      var fade = Math.sin(THREE.MathUtils.clamp(lp, 0, 1) * Math.PI); // 0→1→0
      var j3 = j * 3;
      sPos[j3] = s.x; sPos[j3 + 1] = s.y; sPos[j3 + 2] = s.z;
      // 色を白へ寄せる = 白背景で自然にフェード
      var base = s.tech ? TEAL : SMOKE0;
      var mixw = 1 - fade * 0.85 * em;
      sCol[j3]     = base[0] + (1 - base[0]) * mixw;
      sCol[j3 + 1] = base[1] + (1 - base[1]) * mixw;
      sCol[j3 + 2] = base[2] + (1 - base[2]) * mixw;
    }
    smokeGeo.attributes.position.needsUpdate = true;
    smokeGeo.attributes.color.needsUpdate = true;

    // 視点パララックス＋自動回転
    mx += (tmx - mx) * 0.045;
    my += (tmy - my) * 0.045;
    group.rotation.y = mx * 0.9 + t * 0.06;
    group.rotation.x = my * 0.35;
    camera.position.x = mx * 1.6;
    camera.position.y = 0.4 - my * 1.2;
    camera.lookAt(0, 0.15, 0);

    ring1.rotation.z = t * 0.15;
    ring2.rotation.z = -t * 0.22;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }

  function start() { if (running || !visible) return; running = true; raf = requestAnimationFrame(animate); document.documentElement.classList.add('exp-ready'); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  function resize() {
    W = mount.clientWidth || window.innerWidth;
    H = mount.clientHeight || window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 180); });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { visible = false; stop(); } else { visible = true; start(); }
  });

  if (reduce) {
    // 動きを抑える：一度だけ完成形を描画
    bloom = 1; running = true; visible = true;
    animate(); running = false; if (raf) cancelAnimationFrame(raf);
    document.documentElement.classList.add('exp-ready');
    return;
  }

  // 画面内でのみ回す
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { visible = true; start(); } else { visible = false; stop(); } });
    }, { threshold: 0.02 }).observe(mount);
  } else { start(); }
  // 初期起動
  start();
})();
