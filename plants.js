/*
 * 종강 식물 SVG
 * JonggangPlant.render(stage) → SVG 문자열
 * stage: 'before' | 1 ~ 16 | 'bloom'
 * 색상은 전부 CSS 클래스(.p-*)로 입히므로 테마에 따라 자동으로 바뀝니다.
 */
(function (global) {
  'use strict';

  var BASE_X = 60;
  var BASE_Y = 100;

  function r(n) { return Math.round(n * 10) / 10; }

  // 주차별 식물 모양
  var STAGES = {
    2:  { h: 10, cot: 7 },
    3:  { h: 16, cot: 9 },
    4:  { h: 22, cot: 11 },
    5:  { h: 30, leaves: 2, len: 14, tip: 7 },
    6:  { h: 35, leaves: 3, len: 15, tip: 7 },
    7:  { h: 40, leaves: 4, len: 16, tip: 7 },
    8:  { h: 40, leaves: 4, len: 15, tip: 6, wilt: true },
    9:  { h: 46, leaves: 4, len: 17, tip: 8 },
    10: { h: 52, leaves: 5, len: 17, tip: 8 },
    11: { h: 58, leaves: 6, len: 17, tip: 8 },
    12: { h: 61, leaves: 6, len: 17, bud: 0.6 },
    13: { h: 64, leaves: 6, len: 17, bud: 0.8 },
    14: { h: 67, leaves: 6, len: 17, bud: 1 },
    15: { h: 67, leaves: 6, len: 17, bud: 1, nervous: true },
    16: { h: 69, leaves: 6, len: 17, open: true },
    bloom: { h: 69, leaves: 6, len: 17, flower: true }
  };

  /* ---------- 줄기(2차 베지어) ---------- */

  function stemGeom(h, wilt) {
    var p0 = { x: BASE_X, y: BASE_Y };
    if (wilt) {
      // 위로 올라가다 오른쪽으로 축 처짐
      return { p0: p0, c: { x: BASE_X - 2, y: BASE_Y - h * 1.02 }, p1: { x: BASE_X + h * 0.42, y: BASE_Y - h * 0.72 } };
    }
    return { p0: p0, c: { x: BASE_X - 3, y: BASE_Y - h * 0.5 }, p1: { x: BASE_X + 1.5, y: BASE_Y - h } };
  }

  function pointAt(g, t) {
    var u = 1 - t;
    return {
      x: u * u * g.p0.x + 2 * u * t * g.c.x + t * t * g.p1.x,
      y: u * u * g.p0.y + 2 * u * t * g.c.y + t * t * g.p1.y
    };
  }

  function angleAt(g, t) {
    var dx = 2 * (1 - t) * (g.c.x - g.p0.x) + 2 * t * (g.p1.x - g.c.x);
    var dy = 2 * (1 - t) * (g.c.y - g.p0.y) + 2 * t * (g.p1.y - g.c.y);
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  /* ---------- 부품 ---------- */

  // 원점에서 +x 방향으로 뻗는 잎
  function leaf(x, y, angle, len, cls, round) {
    var w = round ? 0.62 : 0.44;
    return '<g transform="translate(' + r(x) + ' ' + r(y) + ') rotate(' + r(angle) + ')">' +
      '<path class="p-leaf ' + (cls || '') + '" d="M0 0 C' + r(len * 0.28) + ' ' + r(-len * w) + ' ' + r(len * 0.78) + ' ' + r(-len * w * 0.9) + ' ' + r(len) + ' 0 C' +
      r(len * 0.78) + ' ' + r(len * w * 0.9) + ' ' + r(len * 0.28) + ' ' + r(len * w) + ' 0 0Z"/>' +
      '<path class="p-vein" d="M1.5 0 L' + r(len * 0.72) + ' 0"/>' +
      '</g>';
  }

  function petalPath(k) {
    return 'M0 0 C' + r(-k * 0.8) + ' ' + r(-k * 0.35) + ' ' + r(-k * 0.62) + ' ' + r(-k * 1.55) + ' 0 ' + r(-k * 1.95) +
      ' C' + r(k * 0.62) + ' ' + r(-k * 1.55) + ' ' + r(k * 0.8) + ' ' + r(-k * 0.35) + ' 0 0Z';
  }

  function sepals(k) {
    var d = 'M0 0.5 C' + r(-k * 0.95) + ' ' + r(-k * 0.1) + ' ' + r(-k * 0.85) + ' ' + r(-k * 0.8) + ' ' + r(-k * 0.3) + ' ' + r(-k * 1.1) +
      ' C' + r(-k * 0.4) + ' ' + r(-k * 0.65) + ' ' + r(-k * 0.2) + ' ' + r(-k * 0.3) + ' 0 0.5Z';
    return '<path class="p-sepal" d="' + d + '"/><path class="p-sepal" transform="scale(-1 1)" d="' + d + '"/>';
  }

  // 꽃봉오리 (위쪽, -y 방향으로 그림)
  function bud(k, nervous) {
    var s = '<path class="p-petal" d="' + petalPath(k) + '"/>' +
      '<path class="p-petal-line" d="M0 ' + r(-k * 0.4) + ' Q' + r(k * 0.18) + ' ' + r(-k * 1.1) + ' 0 ' + r(-k * 1.75) + '"/>' +
      sepals(k);
    if (nervous) {
      // 긴장한 얼굴
      s += '<circle class="p-face-fill" cx="' + r(-k * 0.22) + '" cy="' + r(-k * 1.05) + '" r="0.9"/>' +
        '<circle class="p-face-fill" cx="' + r(k * 0.22) + '" cy="' + r(-k * 1.05) + '" r="0.9"/>' +
        '<path class="p-face" d="M' + r(-k * 0.2) + ' ' + r(-k * 0.72) + ' q' + r(k * 0.1) + ' -0.9 ' + r(k * 0.2) + ' 0 t' + r(k * 0.2) + ' 0"/>';
    }
    return s;
  }

  // 반쯤 벌어진 봉오리
  function halfOpen(k) {
    return '<path class="p-petal" transform="rotate(-34)" d="' + petalPath(k * 0.9) + '"/>' +
      '<path class="p-petal" transform="rotate(34)" d="' + petalPath(k * 0.9) + '"/>' +
      '<path class="p-petal-in" d="' + petalPath(k) + '"/>' +
      sepals(k);
  }

  // 만개한 꽃 (중심이 원점)
  function flower() {
    var s = '<g class="p-bloom-pop">';
    var i;
    for (i = 0; i < 6; i++) {
      s += '<ellipse class="p-petal" cx="0" cy="-10.5" rx="7" ry="10.5" transform="rotate(' + (i * 60) + ')"/>';
    }
    for (i = 0; i < 6; i++) {
      s += '<ellipse class="p-petal-in" cx="0" cy="-7.5" rx="4" ry="6.5" transform="rotate(' + (i * 60 + 30) + ')"/>';
    }
    s += '<circle class="p-center" r="7"/>' +
      '<path class="p-face" d="M-3.6 -0.4 q1.2 -1.7 2.4 0 M1.2 -0.4 q1.2 -1.7 2.4 0"/>' +
      '<path class="p-face-fill" d="M-1.9 1.6 q1.9 2.6 3.8 0 Z"/>' +
      '<ellipse class="p-blush" cx="-4.6" cy="1.8" rx="1.5" ry="0.9"/>' +
      '<ellipse class="p-blush" cx="4.6" cy="1.8" rx="1.5" ry="0.9"/>' +
      '</g>';
    return s;
  }

  function pollen(x, y) {
    var dots = [
      [-14, -4, 0, -6], [12, -8, 0.5, 7], [-6, -18, 1.1, -4], [16, 4, 1.6, 9],
      [-18, 8, 2.1, -8], [4, -22, 2.6, 3], [8, 12, 0.8, 5], [-10, 14, 1.9, -5]
    ];
    var s = '<g class="p-pollen-group">';
    dots.forEach(function (d) {
      s += '<circle class="p-pollen" cx="' + (x + d[0]) + '" cy="' + (y + d[1]) + '" r="1.3" style="--d:' + d[2] + 's;--dx:' + d[3] + 'px"/>';
    });
    // 반짝이
    [[x - 24, y - 12, 0.3], [x + 25, y - 18, 1.4], [x + 22, y + 16, 2.2]].forEach(function (p) {
      s += '<path class="p-sparkle" style="--d:' + p[2] + 's" d="M' + p[0] + ' ' + (p[1] - 3.5) + ' Q' + p[0] + ' ' + p[1] + ' ' + (p[0] + 3.5) + ' ' + p[1] +
        ' Q' + p[0] + ' ' + p[1] + ' ' + p[0] + ' ' + (p[1] + 3.5) + ' Q' + p[0] + ' ' + p[1] + ' ' + (p[0] - 3.5) + ' ' + p[1] +
        ' Q' + p[0] + ' ' + p[1] + ' ' + p[0] + ' ' + (p[1] - 3.5) + 'Z"/>';
    });
    return s + '</g>';
  }

  /* ---------- 화분 ---------- */

  function pot(face) {
    var s = '<g class="p-pot-group">' +
      '<path class="p-pot" d="M33 107 L87 107 L81.5 143 Q81 147 77 147 L43 147 Q39 147 38.5 143 Z"/>' +
      '<path class="p-shade" d="M74 107 L87 107 L81.5 143 Q81 147 77 147 L71 147 Z"/>' +
      '<rect class="p-rim" x="28" y="97" width="64" height="12" rx="5"/>' +
      '<ellipse class="p-soil" cx="60" cy="99.5" rx="27" ry="3"/>';

    // 화분 얼굴
    var eyes = '<circle class="p-face-fill" cx="52" cy="124" r="1.7"/><circle class="p-face-fill" cx="68" cy="124" r="1.7"/>';
    var blush = '<ellipse class="p-blush" cx="47" cy="128.5" rx="3" ry="1.7"/><ellipse class="p-blush" cx="73" cy="128.5" rx="3" ry="1.7"/>';
    var mouth;
    switch (face) {
      case 'sleepy':
        eyes = '<path class="p-face" d="M50 124 q2 1.8 4 0 M66 124 q2 1.8 4 0"/>';
        mouth = '<path class="p-face" d="M58.5 129 q1.5 1 3 0"/>';
        break;
      case 'worried':
        eyes += '<path class="p-face" d="M49.5 120 L54 119 M70.5 120 L66 119"/>';
        mouth = '<path class="p-face" d="M56 130 q1 -1.4 2 0 t2 0 t2 0 t2 0"/>';
        break;
      case 'nervous':
        eyes = '<circle class="p-face-fill" cx="52" cy="124" r="1.3"/><circle class="p-face-fill" cx="68" cy="124" r="1.3"/>';
        mouth = '<ellipse class="p-face-fill" cx="60" cy="130" rx="1.6" ry="1.9"/>';
        break;
      case 'happy':
        eyes = '<path class="p-face" d="M50 125 q2 -2.8 4 0 M66 125 q2 -2.8 4 0"/>';
        mouth = '<path class="p-face-fill" d="M56.5 128 Q60 134 63.5 128 Z"/>';
        break;
      default:
        mouth = '<path class="p-face" d="M57 128.5 Q60 131.5 63 128.5"/>';
    }
    return s + '<g class="p-pot-face">' + blush + eyes + mouth + '</g></g>';
  }

  /* ---------- 특수 단계 ---------- */

  function seedPacket() {
    return '<g class="p-packet-wrap"><g transform="rotate(-7 60 66)">' +
      '<rect class="p-packet" x="36" y="34" width="48" height="66" rx="4"/>' +
      '<path class="p-packet-flap" d="M36 38 L36 34 Q36 30 40 30 L80 30 Q84 30 84 34 L84 38 Z"/>' +
      '<g transform="translate(60 56)">' +
      [0, 72, 144, 216, 288].map(function (a) {
        return '<ellipse class="p-petal" cx="0" cy="-6" rx="4" ry="6" transform="rotate(' + a + ')"/>';
      }).join('') +
      '<circle class="p-center" r="3.6"/></g>' +
      '<path class="p-stem" d="M60 66 L60 74"/>' +
      '<rect class="p-packet-label" x="42" y="78" width="36" height="13" rx="3.5"/>' +
      '<text class="p-packet-text" x="60" y="87.6" text-anchor="middle">SEEDS</text>' +
      '</g></g>';
  }

  function sleepingSeed() {
    return '<ellipse class="p-seed" cx="60" cy="95.5" rx="7" ry="5"/>' +
      '<path class="p-seed-shine" d="M55.5 93.5 q2 -2.2 4.5 -2.4"/>' +
      '<path class="p-face" d="M56.2 95.8 q1.3 1.1 2.6 0 M61.2 95.8 q1.3 1.1 2.6 0"/>' +
      '<path class="p-soil" d="M36 100 Q46 96.5 53 97.6 Q60 99.4 67 97.6 Q74 96.5 84 100 Z"/>' +
      '<g class="p-zzz"><text x="71" y="88">z</text><text x="77" y="80" class="p-zzz-2">z</text></g>';
  }

  /* ---------- 식물 본체 ---------- */

  function plant(cfg) {
    var g = stemGeom(cfg.h, cfg.wilt);
    var wiltCls = cfg.wilt ? ' p-wilt' : '';
    var s = '<path class="p-stem' + wiltCls + '" style="stroke-width:' + (cfg.h < 25 ? 2.4 : 3) + '" d="M' + r(g.p0.x) + ' ' + r(g.p0.y) +
      ' Q' + r(g.c.x) + ' ' + r(g.c.y) + ' ' + r(g.p1.x) + ' ' + r(g.p1.y) + '"/>';
    var top = g.p1;
    var topAng = angleAt(g, 1);
    var i;

    // 떡잎
    if (cfg.cot) {
      s += leaf(top.x, top.y, -150, cfg.cot, '', true) + leaf(top.x, top.y, -30, cfg.cot, 'p-leaf-b', true);
    }

    // 본잎: 아래에서 위로 번갈아
    if (cfg.leaves) {
      var n = cfg.leaves;
      for (i = 0; i < n; i++) {
        var t = n === 1 ? 0.5 : 0.28 + i * (0.52 / (n - 1));
        var p = pointAt(g, t);
        var right = i % 2 === 0;
        var ang;
        if (cfg.wilt) ang = right ? 42 : 138;
        else ang = right ? -26 - i * 2 : -154 + i * 2;
        var len = cfg.len * (1 - 0.2 * (n === 1 ? 0 : i / (n - 1)));
        s += leaf(p.x, p.y, ang, len, (right ? 'p-leaf-b' : '') + wiltCls);
      }
    }

    // 끝 새순
    if (cfg.tip) {
      s += leaf(top.x, top.y, topAng - 40, cfg.tip, wiltCls, true) + leaf(top.x, top.y, topAng + 40, cfg.tip, 'p-leaf-b' + wiltCls, true);
    }

    var rot = r(topAng + 90);
    if (cfg.bud) {
      s += '<g transform="translate(' + r(top.x) + ' ' + r(top.y) + ') rotate(' + rot + ')">' +
        '<g class="' + (cfg.nervous ? 'p-tremble' : '') + '">' + bud(10 * cfg.bud, cfg.nervous) + '</g></g>';
      if (cfg.nervous) {
        s += '<path class="p-sweat" d="M' + r(top.x + 13) + ' ' + r(top.y - 18) + ' c2.6 3.6 2.6 5.8 0 5.8 c-2.6 0 -2.6 -2.2 0 -5.8Z"/>';
      }
    }
    if (cfg.open) {
      s += '<g transform="translate(' + r(top.x) + ' ' + r(top.y) + ') rotate(' + rot + ')">' + halfOpen(11) + '</g>';
    }
    if (cfg.flower) {
      s += '<g transform="translate(' + r(top.x) + ' ' + r(top.y - 4) + ')">' + flower() + '</g>';
    }
    return { svg: s, top: top };
  }

  function faceFor(stage) {
    if (stage === 1) return 'sleepy';
    if (stage === 8) return 'worried';
    if (stage === 15) return 'nervous';
    if (stage === 'bloom') return 'happy';
    return 'smile';
  }

  function render(stage, label) {
    var body = '';
    var front = '';
    var extra = '';
    if (stage === 'before') {
      front = seedPacket();
    } else if (stage === 1) {
      front = sleepingSeed();
    } else {
      var cfg = STAGES[stage] || STAGES[16];
      var p = plant(cfg);
      body = '<g class="p-sway' + (cfg.wilt ? ' p-sway-tired' : '') + '">' + p.svg + '</g>';
      if (cfg.flower) extra = pollen(p.top.x, p.top.y - 4);
    }
    return '<svg class="plant-svg" viewBox="0 0 120 150" preserveAspectRatio="xMidYMax meet" role="img" aria-label="' + (label || '식물') + '" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse class="p-ground" cx="60" cy="147.5" rx="30" ry="2.5"/>' +
      pot(faceFor(stage)) + body + front + extra +
      '</svg>';
  }

  global.JonggangPlant = { render: render };
})(window);
