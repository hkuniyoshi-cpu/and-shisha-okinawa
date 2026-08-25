/* ============================================================
   faq-render.js — and shisha OKINAWA FAQ 描画エンジン
   ------------------------------------------------------------
   ・faq-data.js の FAQ_DATA を受け取り
   ・#faqRoot にカテゴリ別アコーディオンを描画
   ・全項目を FAQPage JSON-LD として <head> に自動注入
   ・data-lang 属性で JP / EN を切替（未指定は <html lang> から自動）
   ・カテゴリはデフォルトで最初のカテゴリを展開、他は閉じた状態
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('faqRoot');
  if (!root || !window.FAQ_DATA) return;

  var lang = (root.dataset && root.dataset.lang) ||
             (document.documentElement.lang || 'ja').toLowerCase().slice(0, 2);
  var isEn = lang === 'en';

  var cats = isEn ? FAQ_DATA.CATS_EN : FAQ_DATA.CATS_JP;
  var items = isEn ? FAQ_DATA.FAQ_EN : FAQ_DATA.FAQ_JP;

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- Accordion HTML ---------- */
  var html = '';
  cats.forEach(function (cat, ci) {
    var catItems = items.filter(function (it) { return it.c === cat.key; });
    if (!catItems.length) return;
    var openAttr = ci === 0 ? ' is-open' : '';
    html +=
      '<div class="faq-cat' + openAttr + '" data-cat="' + esc(cat.key) + '">' +
        '<button class="faq-cat-head" type="button" aria-expanded="' + (ci === 0 ? 'true' : 'false') + '">' +
          '<span class="faq-cat-title">' + esc(cat.title) + '</span>' +
          '<span class="faq-cat-count">' + catItems.length + '</span>' +
          '<span class="faq-cat-ico" aria-hidden="true"></span>' +
        '</button>' +
        '<div class="faq-cat-body">' +
          catItems.map(function (it) {
            return (
              '<div class="qa-item">' +
                '<button class="qa-q" type="button">' + esc(it.q) +
                  '<span class="qa-ico" aria-hidden="true"></span>' +
                '</button>' +
                '<div class="qa-a"><p>' + esc(it.a).replace(/\n/g, '<br>') + '</p></div>' +
              '</div>'
            );
          }).join('') +
        '</div>' +
      '</div>';
  });
  root.innerHTML = html;

  /* ---------- Interactions ---------- */
  // カテゴリの開閉
  root.querySelectorAll('.faq-cat-head').forEach(function (head) {
    head.addEventListener('click', function () {
      var cat = head.parentElement;
      var open = cat.classList.toggle('is-open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  // 質問の開閉
  root.querySelectorAll('.qa-item .qa-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.closest('.qa-item').classList.toggle('open');
    });
  });

  /* ---------- FAQPage JSON-LD 自動注入（AI検索向け） ---------- */
  // 既存の FAQPage @graph ノードと衝突しないよう、独立した <script> で注入
  var canonical = (document.querySelector('link[rel="canonical"]') || {}).href ||
                  window.location.origin + window.location.pathname;
  var jsonld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': canonical + '#faq',
    'inLanguage': lang,
    'mainEntity': items.map(function (it) {
      return {
        '@type': 'Question',
        'name': it.q,
        'acceptedAnswer': { '@type': 'Answer', 'text': it.a }
      };
    })
  };
  var s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'faq-jsonld-auto';
  s.textContent = JSON.stringify(jsonld);
  document.head.appendChild(s);
})();
