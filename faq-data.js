/* ============================================================
   faq-data.js — and shisha OKINAWA FAQ ソース・オブ・トゥルース
   ------------------------------------------------------------
   ・JP/EN 両ページから読み込み → カテゴリ別アコーディオンを描画
   ・FAQPage JSON-LD にも同じデータが反映される（applyFAQTree内）
   ・カテゴリ順・項目順が本ファイルの並びと連動
   ・編集はこのファイルを更新→デプロイ
   ============================================================ */
(function (root) {
  'use strict';

  var CATS_JP = [
    { key: 'begin',  title: 'はじめての方へ' },
    { key: 'price',  title: '料金・システム' },
    { key: 'book',   title: '予約・来店' },
    { key: 'flavor', title: 'シーシャ・フレーバー' },
    { key: 'cafe',   title: 'カフェ・ドリンク' },
    { key: 'space',  title: '店内・設備' },
    { key: 'pay',    title: 'お支払い・海外のお客さま・アクセス' }
  ];
  var CATS_EN = [
    { key: 'begin',  title: 'For Beginners' },
    { key: 'price',  title: 'Pricing & System' },
    { key: 'book',   title: 'Reservation & Visit' },
    { key: 'flavor', title: 'Shisha & Flavors' },
    { key: 'cafe',   title: 'Café & Drinks' },
    { key: 'space',  title: 'Space & Facilities' },
    { key: 'pay',    title: 'Payment · International · Access' }
  ];

  var FAQ_JP = [
    // はじめての方へ
    { c: 'begin', q: 'シーシャがはじめてでも大丈夫ですか？',
      a: 'もちろんです。吸い方からおすすめのフレーバーまで、スタッフが丁寧にご案内します。ニコチンフリーもご用意していますので、はじめての方も安心です。' },
    { c: 'begin', q: '女性ひとりでも入りやすいですか？',
      a: '女性スタッフも在籍しており、落ち着いた明るい空間です。おひとりさまも気軽にお過ごしいただけます。' },
    { c: 'begin', q: 'シーシャってタバコと違うのですか？煙は服や髪に残りますか？',
      a: 'シーシャは水を通した「水タバコ」で、紙巻きタバコと違ってフルーツやスイーツ系の甘い香りが特徴です。タバコ特有のにおいは残りにくく、フレーバーの香りがほのかに残る程度。気になる方は上着を裏返してかけるのがおすすめです。' },
    { c: 'begin', q: '1回の来店でどれくらい滞在できますか？',
      a: '平均で1〜2時間、ゆっくりされる方は2〜3時間ほど。時間制限は設けていないので、ご自分のペースでお過ごしください。' },

    // 料金・システム
    { c: 'price', q: '料金システムを教えてください',
      a: 'チャージ料金は〜20:00 ¥600 ／ 20:00〜 ¥800。シーシャ1台 ¥2,800。カフェ利用（シーシャなし）は ¥1,500 で90分ソフトドリンク飲み放題＋チャージ込みです。' },
    { c: 'price', q: '1台のシーシャを何人でシェアできますか？',
      a: '2名様までシェア可能です。シェア料金は ¥1,500。3名様以上ではもう1台ご注文をお願いしています。' },
    { c: 'price', q: '1名あたりの平均予算はどれくらいですか？',
      a: '目安は 4,000〜5,500円（シーシャ＋ドリンク1杯＋チャージ）です。カフェ利用のみなら 1,500〜2,000円ほど。' },
    { c: 'price', q: '飲み放題プランはありますか？',
      a: 'ソフトドリンク90分 ¥900 ／ アルコール90分 ¥1,800（瓶ビール以外）をご用意しています。' },
    { c: 'price', q: 'カフェ利用（シーシャなし）だけでも入れますか？',
      a: 'はい、¥1,500 で90分ソフトドリンク飲み放題＋チャージ込み。打合せやおひとりでのカフェ利用も大歓迎です。' },

    // 予約・来店
    { c: 'book', q: '予約はできますか？',
      a: '公式Instagramや公式LINE（準備中）からお問い合わせください。当日のご予約も可能です。' },
    { c: 'book', q: '予約なしの当日フラッと来店してもOK？',
      a: 'はい、ウォークイン歓迎です。大人数の場合や混雑が予想される時間帯は事前ご相談をおすすめします。' },
    { c: 'book', q: '何名まで対応できますか？貸切は可能ですか？',
      a: 'グループでのご来店は事前にお声がけください。貸切のご相談も承ります。詳細はInstagram・LINEへお問い合わせください。' },

    // シーシャ・フレーバー
    { c: 'flavor', q: 'フレーバーは何種類ありますか？',
      a: '50〜60種類ご用意しています。メインは DOZAJ（ドザジ）、他に Al Fakher / Star Buzz / Afzal / FUMARI / Trifecta 等の高品質ブランドも取り扱っています。' },
    { c: 'flavor', q: 'スタッフのおすすめフレーバーは？',
      a: '定番はマンゴー・ダブルアップル・ミント系。DOZAJ のフルーツ系は初心者にも大人気です。その日の気分をお聞かせいただければ、スタッフがぴったりのフレーバーをご提案します。' },
    { c: 'flavor', q: 'ニコチンフリーはありますか？',
      a: 'あります。ニコチンを含まないフレーバーをご用意していますので、たばこが苦手な方や女性・初心者の方も安心してお楽しみいただけます。' },
    { c: 'flavor', q: 'フレーバーMIX（複数を混ぜる）はできますか？',
      a: 'はい、可能です。「フレーバー増量 ¥800」で味・煙の濃さもお好みで調整いただけます。' },

    // カフェ・ドリンク
    { c: 'cafe', q: 'シーシャを吸わずにカフェ利用だけでも可能ですか？',
      a: 'はい、大歓迎です。コーヒー・お茶・ソフトドリンクをゆっくりお楽しみください。打合せやリモートワークにもご利用いただけます。（沖縄県産素材のデザートは只今準備中です）' },
    { c: 'cafe', q: 'フードやおつまみメニューはありますか？',
      a: '軽いおつまみをご用意することがあります。詳しくは店頭にてご確認ください。' },
    { c: 'cafe', q: '沖縄らしいお酒・ドリンクはありますか？',
      a: 'はい。泡盛・オリオンビール（¥700）・ハブ酒（¥800）・HABU SHOT（¥800）・カクテル各種、そして沖縄フルーツMIX（マンゴー／パイナップル／シークヮーサー）のボトルベースドリンク（+¥1,000）をご用意しています。' },
    { c: 'cafe', q: 'テイクアウト・持ち帰りはできますか？',
      a: 'シーシャ本体は店内でのご利用のみとなります。ドリンクの持ち帰りについてはスタッフまでご相談ください。' },

    // 店内・設備
    { c: 'space', q: 'Wi-Fiはありますか？',
      a: 'はい、無料Wi-Fiをご利用いただけます。パスワードはスタッフまでお声がけください。' },
    { c: 'space', q: '電源・コンセントは使えますか？',
      a: '全席にご用意しています（約30口）。ノートPCやスマホの充電もお気軽にどうぞ。Web会議・通話も声出しOKなので、リモートワークやオンライン打合せもご利用いただけます。' },
    { c: 'space', q: '個室・半個室はありますか？',
      a: '個室のご用意はありません。カウンターテーブル席を中心とした、落ち着いたオープン空間です。' },
    { c: 'space', q: '打合せ・リモートワーク利用はOKですか？',
      a: 'はい、大歓迎です。カフェ利用のみでもご利用いただけますので、打合せやお仕事の合間のリフレッシュに最適です。' },
    { c: 'space', q: 'ペット同伴は可能ですか？',
      a: 'はい、可能です。ワンちゃん・猫ちゃんとご一緒にお越しください。他のお客さまへのご配慮をお願いいたします。' },

    // お支払い・海外・アクセス
    { c: 'pay', q: '支払い方法は何が使えますか？',
      a: '現金・クレジットカード（各種）・QRコード決済／電子マネーがご利用いただけます。' },
    { c: 'pay', q: '英語で対応してもらえますか？',
      a: 'はい。英語で接客できるスタッフが在籍しています。観光やアメリカからのお客さまも安心してご利用いただけます。（English-speaking staff available.）' },
    { c: 'pay', q: '米軍基地（Kadena・Camp Hansen 等）から近いですか？',
      a: '車での目安：Camp Hansen（Kin）から約10〜15分、Torii Station（Yomitan）から約20〜25分、Kadena Air Base から約25〜30分、Camp Foster から約30分ほど（時間帯・渋滞により変動）。恩納村の西海岸リゾートエリアにあります。' },
    { c: 'pay', q: '駐車場はありますか？',
      a: '近隣のコインパーキングをご利用ください。詳細はスタッフまでお尋ねください。' },
    { c: 'pay', q: '年齢制限はありますか？',
      a: 'シーシャのご利用は20歳以上の方に限ります。年齢確認をさせていただく場合がございます。あらかじめご了承ください。' }
  ];

  var FAQ_EN = [
    // For Beginners
    { c: 'begin', q: 'I have never tried shisha. Is that okay?',
      a: 'Absolutely. Our staff will walk you through how to smoke it and help you choose a flavor. We also offer nicotine-free shisha, so first-timers can try it comfortably.' },
    { c: 'begin', q: 'Is it easy to come in as a woman on my own?',
      a: 'Yes. We have female staff on site and the space is bright and calm. Solo visitors are very welcome.' },
    { c: 'begin', q: 'How is shisha different from cigarettes? Does the smell stick to my clothes or hair?',
      a: 'Shisha (hookah) draws smoke through water and, unlike cigarettes, carries sweet fruit or dessert-style aromas. The classic tobacco smell tends not to linger — you may notice a light flavor scent afterwards. If you are sensitive to it, turning your jacket inside-out while you sit is a common trick.' },
    { c: 'begin', q: 'How long does a typical visit last?',
      a: 'Most guests stay 1–2 hours; some settle in for 2–3. There is no time limit — take it at your own pace.' },

    // Pricing
    { c: 'price', q: 'How does the pricing work?',
      a: 'Cover charge: ¥600 (until 8 PM) / ¥800 (from 8 PM). Shisha (1 pipe): ¥2,800. Café-only (no shisha): ¥1,500, includes cover charge and 90 minutes of unlimited soft drinks.' },
    { c: 'price', q: 'How many people can share one shisha?',
      a: 'Up to 2 guests may share one pipe. Sharing charge: ¥1,500. Groups of 3+ are asked to order an additional pipe.' },
    { c: 'price', q: 'What is the average spend per person?',
      a: 'About ¥4,000–¥5,500 per person (shisha + one drink + cover). Café-only visits run around ¥1,500–¥2,000.' },
    { c: 'price', q: 'Is there an all-you-can-drink plan?',
      a: 'Yes. Soft drinks 90 min for ¥900, or alcohol 90 min for ¥1,800 (bottled beer excluded).' },
    { c: 'price', q: 'Can I come just for the café without smoking shisha?',
      a: 'Yes. ¥1,500 gets you the cover charge plus 90 minutes of unlimited soft drinks. Very welcome for meetings, remote work or a solo café visit.' },

    // Reservation
    { c: 'book', q: 'Do you take reservations?',
      a: 'Please DM us on Instagram (or LINE — coming soon). Same-day reservations are welcome.' },
    { c: 'book', q: 'Can I just walk in without a reservation?',
      a: 'Yes, walk-ins are welcome. For larger groups or busy hours we recommend messaging us first.' },
    { c: 'book', q: 'What is your maximum group size? Do you offer private buyouts?',
      a: 'For group visits please contact us in advance. Private buyouts can be discussed — reach out on Instagram or LINE.' },

    // Shisha & Flavors
    { c: 'flavor', q: 'How many flavors do you have?',
      a: '50–60 flavors on hand. Our main line is DOZAJ, and we also carry Al Fakher, Star Buzz, Afzal, FUMARI, Trifecta and others.' },
    { c: 'flavor', q: 'What are the staff picks / most popular flavors?',
      a: 'Mango, Double Apple and mint blends are staples. DOZAJ fruit flavors are especially popular with first-timers. Tell us the mood and we will pick something that fits.' },
    { c: 'flavor', q: 'Do you have nicotine-free options?',
      a: 'Yes. Nicotine-free flavors are available — perfect for guests who prefer to avoid nicotine, and for first-timers or women trying shisha for the first time.' },
    { c: 'flavor', q: 'Can I mix flavors?',
      a: 'Yes. Flavor mixing is welcome. The Flavor Boost option (¥800) also lets you dial up taste and smoke intensity.' },

    // Cafe & Drinks
    { c: 'cafe', q: 'Can I come just for the café?',
      a: 'Yes — very welcome. Enjoy coffee, tea and soft drinks. The space works for meetings and remote work. (Okinawan-ingredient desserts are currently in preparation.)' },
    { c: 'cafe', q: 'Do you serve food or snacks?',
      a: 'A small snack selection is sometimes available — please ask us on the day.' },
    { c: 'cafe', q: 'Do you have local Okinawan drinks?',
      a: 'Yes: Awamori, ORION beer (¥700), Habu Sake (¥800), HABU SHOT (¥800), cocktails, and an Okinawan-fruit bottle base (mango / pineapple / shikwasa) for +¥1,000.' },
    { c: 'cafe', q: 'Can I take things to go?',
      a: 'The shisha itself is for in-house use only. For drinks to go, please ask our staff.' },

    // Space & Facilities
    { c: 'space', q: 'Is there free Wi-Fi?',
      a: 'Yes, free Wi-Fi is available. Ask our staff for the password.' },
    { c: 'space', q: 'Are there power outlets?',
      a: 'Yes — power outlets at every seat (about 30 total). Wi-Fi + power make it easy to work, and online meetings & phone calls (speaking out loud) are welcome.' },
    { c: 'space', q: 'Do you have private rooms?',
      a: 'No private rooms — we run a calm, open counter-table space.' },
    { c: 'space', q: 'Can I use the space for meetings or remote work?',
      a: 'Absolutely. Café-only visits are welcome, so it works well for meetings and a change of scene between calls.' },
    { c: 'space', q: 'Are pets allowed?',
      a: 'Yes, pets are welcome. Please be considerate of other guests.' },

    // Payment · International · Access
    { c: 'pay', q: 'What payment methods do you accept?',
      a: 'Cash, credit cards (all major brands), QR code payments and electronic money are accepted.' },
    { c: 'pay', q: 'Do you have English-speaking staff?',
      a: 'Yes. English-speaking staff are on site, so visitors from the US and abroad can relax and enjoy their session.' },
    { c: 'pay', q: 'How close is it from the US bases (Kadena, Camp Hansen etc.)?',
      a: 'Approximate drive times: Camp Hansen (Kin) about 10–15 min, Torii Station (Yomitan) about 20–25 min, Kadena Air Base about 25–30 min, Camp Foster about 30 min — depending on traffic. We are on the west-coast resort strip in Onna Village.' },
    { c: 'pay', q: 'Is there parking?',
      a: 'Please use nearby coin parking. Our staff can point you to the closest lot.' },
    { c: 'pay', q: 'Is there an age limit?',
      a: 'Shisha is for guests aged 20 and over, in line with Japanese law. We may ask you for ID.' }
  ];

  root.FAQ_DATA = { CATS_JP: CATS_JP, CATS_EN: CATS_EN, FAQ_JP: FAQ_JP, FAQ_EN: FAQ_EN };
})(window);
