/* ============================================================
   cursor.js — and shisha OKINAWA
   シンプルな追従カーソル（細いリング＋小さなドット）
   JP / EN 共通。fine pointer のみ。
   ============================================================ */
(function () {
  'use strict';
  if (!(window.matchMedia && window.matchMedia('(pointer:fine)').matches)) return;

  var ring = document.getElementById('cursor-ring');
  var dot  = document.getElementById('cursor-dot');
  if (!ring || !dot) return;

  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var dx = mx, dy = my, first = true, scale = 0, target = 0, hovering = false;

  window.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (first) { dx = mx; dy = my; first = false; ring.classList.add('active'); dot.classList.add('active'); }
    if (!hovering) target = 1;
  }, { passive: true });
  document.addEventListener('mouseleave', function () { target = 0; });
  document.addEventListener('mouseenter', function () { if (!hovering) target = 1; });

  function bindHover() {
    document.querySelectorAll('[data-hover], a, button').forEach(function (el) {
      if (el.__ch) return; el.__ch = 1;
      el.addEventListener('mouseenter', function () { hovering = true; ring.classList.add('expanded'); });
      el.addEventListener('mouseleave', function () { hovering = false; ring.classList.remove('expanded'); });
    });
  }
  bindHover();
  // 動的に追加されるリンク（CMS）にも後追いで適用
  window.addEventListener('load', function () { setTimeout(bindHover, 1500); });

  function loop() {
    dx += (mx - dx) * 0.2;   // ドットはわずかに遅れて追従
    dy += (my - dy) * 0.2;
    scale += (target - scale) * 0.16;
    var rs = (ring.classList.contains('expanded') ? 1.6 : 1) * scale;
    ring.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0) translate(-50%,-50%) scale(' + rs + ')';
    dot.style.transform  = 'translate3d(' + dx + 'px,' + dy + 'px,0) translate(-50%,-50%) scale(' + scale + ')';
    requestAnimationFrame(loop);
  }
  loop();
})();
