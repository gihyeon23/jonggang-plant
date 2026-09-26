/*
 * 종강 D-day 식물 위젯
 * - URL 파라미터가 있으면 위젯, 없으면 링크 생성 페이지
 * - 설정은 URL 파라미터로만 받습니다 (localStorage·쿠키 사용 안 함)
 */
(function () {
  'use strict';

  var DEFAULTS = { start: '2026-09-01', end: '2026-12-21', theme: 'light', size: 'auto' };
  var THEMES = ['light', 'dark', 'transparent'];
  var SIZES = ['auto', 'wide', 'square', 'mini', 'full'];
  var WIDGET_KEYS = ['start', 'end', 'theme', 'size', 'debugWeek'];
  var DAY_MS = 86400000;
  var BAR_CELLS = 16;

  /* ---------- 날짜 (모두 '일 번호' 정수로 다룸) ---------- */

  function parseDay(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var t = Date.UTC(y, mo - 1, d);
    var check = new Date(t);
    if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
    return t / DAY_MS;
  }

  function formatDay(n) {
    return new Date(n * DAY_MS).toISOString().slice(0, 10);
  }

  function koreanDate(n) {
    var d = new Date(n * DAY_MS);
    return (d.getUTCMonth() + 1) + '월 ' + d.getUTCDate() + '일';
  }

  // 한국 시간 기준 오늘
  function todayKST() {
    var parts = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date())
      .forEach(function (p) { parts[p.type] = p.value; });
    return parseDay(parts.year + '-' + parts.month + '-' + parts.day);
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* ---------- 설정 ---------- */

  function readConfig(search) {
    var p = new URLSearchParams(search);
    var start = parseDay(p.get('start'));
    var end = parseDay(p.get('end'));
    if (start === null) start = parseDay(DEFAULTS.start);
    if (end === null) end = parseDay(DEFAULTS.end);
    if (end <= start) {
      start = parseDay(DEFAULTS.start);
      end = parseDay(DEFAULTS.end);
    }
    var theme = THEMES.indexOf(p.get('theme')) >= 0 ? p.get('theme') : DEFAULTS.theme;
    var size = SIZES.indexOf(p.get('size')) >= 0 ? p.get('size') : DEFAULTS.size;
    var debugWeek = null;
    if (p.has('debugWeek')) {
      var w = parseInt(p.get('debugWeek'), 10);
      if (isFinite(w)) debugWeek = clamp(w, 0, 17);
    }
    return { start: start, end: end, theme: theme, size: size, debugWeek: debugWeek };
  }

  function buildQuery(cfg) {
    var q = 'start=' + formatDay(cfg.start) + '&end=' + formatDay(cfg.end) + '&theme=' + cfg.theme + '&size=' + cfg.size;
    if (cfg.debugWeek !== null && cfg.debugWeek !== undefined) q += '&debugWeek=' + cfg.debugWeek;
    return q;
  }

  /* ---------- 상태 계산 ---------- */

  function computeState(cfg, today) {
    var totalWeeks = Math.max(1, Math.ceil((cfg.end - cfg.start) / 7));
    var s = { totalWeeks: totalWeeks, start: cfg.start, end: cfg.end };

    if (cfg.debugWeek !== null) {
      // 미리보기: 해당 주차의 첫날로 가정
      var w = cfg.debugWeek;
      if (w === 0) today = cfg.start - 5;
      else if (w >= 17) today = cfg.end;
      else today = Math.min(cfg.start + Math.round((w - 1) * totalWeeks / 16) * 7, cfg.end - 1);
    }

    if (today < cfg.start) {
      s.phase = 'before';
      s.stage = 'before';
      s.dStart = cfg.start - today;
      s.progress = 0;
      return s;
    }
    if (today >= cfg.end) {
      s.phase = 'bloom';
      s.stage = 'bloom';
      s.week = totalWeeks;
      s.afterDays = today - cfg.end;
      s.progress = BAR_CELLS;
      return s;
    }
    s.phase = 'growing';
    s.week = Math.min(totalWeeks, Math.floor((today - cfg.start) / 7) + 1);
    // 학기 길이가 16주가 아니어도 16단계에 비례해서 맞춤
    s.stage = cfg.debugWeek !== null ? clamp(cfg.debugWeek, 1, 16) : clamp(Math.ceil(s.week * 16 / totalWeeks), 1, 16);
    s.dday = cfg.end - today;
    s.progress = s.stage;
    return s;
  }

  /* ---------- 문구 ---------- */

  var STAGE_TEXT = {
    before: { emoji: '🌰', bubble: '개강을 기다리는 중 ✉️', tip: '아직 개강 전이에요. 씨앗 봉투를 챙겨 두었어요.' },
    1: { emoji: '🌰', bubble: '흙 속에서 쿨쿨 💤', tip: '씨앗을 심었어요. 매주 한 단계씩 자라요.' },
    sprout: { emoji: '🌱', bubble: '새싹이 돋았어요 🌱', tip: '작은 새싹이 매주 조금씩 커지고 있어요.' },
    leaves: { emoji: '🌱', bubble: '오늘도 버티는 중 ☀️', tip: '잎이 하나둘 늘어나고 있어요. 이 페이스 좋아요!' },
    8: { emoji: '🌱', bubble: '중간고사… 힘내자 💦', tip: '시험 기간엔 식물도 조금 지쳐요. 물 한 잔 마시고 힘내요.' },
    grow: { emoji: '🌿', bubble: '다시 쑥쑥 자라는 중 🌿', tip: '중간고사를 지나 다시 생기를 찾았어요.' },
    bud: { emoji: '🌷', bubble: '거의 다 왔어! 🌷', tip: '꽃봉오리가 맺혔어요. 종강이 가까워요.' },
    15: { emoji: '🌷', bubble: '기말고사… 떨려요 😣', tip: '조금만 더 버티면 꽃이 피어요. 마지막 스퍼트!' },
    16: { emoji: '🌷', bubble: '곧 꽃이 필 것 같아요 ✨', tip: '마지막 주예요. 꽃잎이 살짝 벌어지고 있어요.' },
    bloom: { emoji: '🌸', bubble: '종강 축하해요! 🌸', tip: '한 학기 동안 정말 수고했어요. 푹 쉬어요!' }
  };

  function stageText(stage) {
    if (STAGE_TEXT[stage]) return STAGE_TEXT[stage];
    if (stage <= 4) return STAGE_TEXT.sprout;
    if (stage <= 7) return STAGE_TEXT.leaves;
    if (stage <= 11) return STAGE_TEXT.grow;
    return STAGE_TEXT.bud;
  }

  function examOf(s) {
    if (s.stage === 8) return { cls: 'mid', text: '중간고사' };
    if (s.stage === 15) return { cls: 'final', text: '기말고사' };
    return null;
  }

  function texts(s) {
    var t = stageText(s.stage);
    var o = { emoji: t.emoji, bubble: t.bubble, tip: t.tip, exam: examOf(s) };
    if (s.phase === 'before') {
      o.label = '개강까지';
      o.big = 'D-' + s.dStart;
      o.title = '개강까지 D-' + s.dStart;
      o.pill = '개강 준비 중';
      o.compact = '개강 D-' + s.dStart;
      o.mini = '개강 D-' + s.dStart;
      o.percent = '0% 진행';
    } else if (s.phase === 'bloom') {
      o.label = s.afterDays === 0 ? '오늘 종강!' : '종강 +' + s.afterDays + '일';
      o.big = '종강!';
      o.title = '🎉 종강!';
      o.pill = s.totalWeeks + '주 완주';
      o.compact = '종강 축하해요! 🎉';
      o.mini = '종강 축하해요!';
      o.percent = '100% 완주';
    } else {
      o.label = '종강까지';
      o.big = 'D-' + s.dday;
      o.title = '종강까지 D-' + s.dday;
      o.pill = s.week + '주차 / ' + s.totalWeeks + '주';
      o.compact = 'D-' + s.dday + ' · ' + s.week + '주차';
      o.mini = '종강 D-' + s.dday + ' · ' + s.week + '주차';
      var pct = Math.round((s.week - 1) / s.totalWeeks * 100);
      o.percent = pct + '% 진행';
    }
    return o;
  }

  /* ---------- 위젯 렌더 ---------- */

  function esc(str) {
    return String(str).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function barHTML(s, cls) {
    var h = '<div class="bar ' + (cls || '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="' + BAR_CELLS + '" aria-valuenow="' + s.progress + '">';
    for (var i = 1; i <= BAR_CELLS; i++) {
      var c = i < s.progress || (s.phase === 'bloom') ? 'done' : (i === s.progress ? 'now' : '');
      if (i === 8 || i === 15) c += ' exam';
      h += '<i class="' + c + '"></i>';
    }
    return h + '</div>';
  }

  function badgeHTML(exam, extra) {
    return exam ? '<span class="badge ' + exam.cls + ' ' + (extra || '') + '">' + exam.text + '</span>' : '';
  }

  function pillHTML(s, o) {
    var cls = s.phase === 'bloom' ? 'bloom' : (o.exam ? o.exam.cls : '');
    return '<span class="pill ' + cls + '">' + esc(o.pill) + '</span>';
  }

  function plantHTML(s, o, cls) {
    return '<div class="plant ' + (cls || '') + '">' + JonggangPlant.render(s.stage, o.bubble) + '</div>';
  }

  var RENDERERS = {
    wide: function (s, o) {
      return '<div class="w-plant">' + plantHTML(s, o) + '</div>' +
        '<div class="w-info">' +
        '<div class="label">' + esc(o.label) + badgeHTML(o.exam) + '</div>' +
        '<div class="big' + (s.phase === 'bloom' ? ' is-bloom' : '') + '">' + esc(o.big) + '</div>' +
        '<div class="w-meta">' + pillHTML(s, o) + '<span class="percent">' + esc(o.percent) + '</span></div>' +
        barHTML(s) +
        '</div>';
    },
    square: function (s, o) {
      return plantHTML(s, o, 's-plant') + badgeHTML(o.exam, 'corner') +
        '<div class="s-line">' + (s.phase === 'bloom' ? esc(o.compact) : '<b>' + esc(o.compact.split(' · ')[0]) + '</b>' +
        (o.compact.indexOf(' · ') > 0 ? ' · ' + esc(o.compact.split(' · ')[1]) : '')) + '</div>';
    },
    mini: function (s, o) {
      return '<div class="m-line"><span class="m-emoji" aria-hidden="true">' + o.emoji + '</span>' +
        '<span class="m-text">' + esc(o.mini) + '</span>' + badgeHTML(o.exam) + '</div>' + barHTML(s, 'm-bar');
    },
    full: function (s, o, cfg) {
      var editHref = '?edit=1&' + buildQuery({ start: cfg.start, end: cfg.end, theme: cfg.theme, size: cfg.size, debugWeek: null });
      return '<header class="f-head"><span>종강 D-day 식물 키우기</span>' +
        '<a class="f-gear" href="' + editHref + '" target="_top" aria-label="설정 바꾸기">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg></a></header>' +
        '<h1 class="f-title">' + esc(o.title) + '</h1>' +
        '<div class="f-pill">' + pillHTML(s, o) + '</div>' +
        '<div class="bubble">' + esc(o.bubble) + '</div>' +
        '<div class="f-plant">' + plantHTML(s, o) + '</div>' +
        '<div class="f-bottom">' + barHTML(s) +
        '<div class="f-range"><span>' + koreanDate(s.start) + ' 개강</span><span class="arrow">→</span><span>' + koreanDate(s.end) + ' 종강</span></div>' +
        '<div class="tip ' + (o.exam ? 'tip-exam' : '') + '"><span aria-hidden="true">' + (o.exam ? '⏰' : '🌿') + '</span>' + esc(o.tip) + '</div>' +
        '</div>';
    }
  };

  // 박스 크기에 맞는 레이아웃 고르기
  function pickMode(size) {
    if (size !== 'auto') return size;
    var w = document.documentElement.clientWidth || window.innerWidth;
    var h = document.documentElement.clientHeight || window.innerHeight;
    if (h <= 72 || w < 140) return 'mini';
    if (h >= 380 && w >= 260 && w / h < 1.3) return 'full';
    if (w / h >= 1.45) return 'wide';
    return 'square';
  }

  function initWidget() {
    var root = document.getElementById('widget');
    var cfg = readConfig(location.search);
    var last = '';

    root.setAttribute('data-theme', cfg.theme);
    document.documentElement.setAttribute('data-theme', cfg.theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', cfg.theme === 'dark' ? '#191919' : '#F8F4EC');

    function render() {
      var s = computeState(cfg, todayKST());
      var mode = pickMode(cfg.size);
      var key = mode + '|' + s.stage + '|' + (s.dday || s.dStart || s.afterDays) + '|' + s.week;
      if (key === last) return;
      last = key;
      var o = texts(s);
      root.setAttribute('data-mode', mode);
      root.setAttribute('data-phase', s.phase);
      root.innerHTML = RENDERERS[mode](s, o, cfg);
      root.setAttribute('aria-label', o.mini + (o.exam ? ' · ' + o.exam.text : ''));
      document.title = o.mini + ' · 종강 식물';
    }

    render();
    if ('ResizeObserver' in window) new ResizeObserver(render).observe(document.documentElement);
    window.addEventListener('resize', render);
    // 자정이 지나면 자동으로 다음 날로
    setInterval(render, 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
  }

  /* ---------- 링크 생성 페이지 ---------- */

  function initGenerator() {
    var $ = function (id) { return document.getElementById(id); };
    var cfg = readConfig(location.search);
    var startEl = $('f-start');
    var endEl = $('f-end');
    var weekEl = $('f-week');
    var linkEl = $('f-link');
    var errEl = $('f-error');
    var stage = $('stage');
    var copyBtn = $('copy-btn');
    var copyLabel = copyBtn.textContent;

    startEl.value = formatDay(cfg.start);
    endEl.value = formatDay(cfg.end);
    setRadio('theme', cfg.theme);
    setRadio('size', cfg.size === 'full' ? 'auto' : cfg.size);
    setRadio('pagebg', cfg.theme === 'dark' ? 'dark' : 'light');

    var opts = '<option value="">오늘 기준</option><option value="0">개강 전 (씨앗 봉투)</option>';
    for (var i = 1; i <= 16; i++) {
      opts += '<option value="' + i + '">' + i + '주차' + (i === 8 ? ' · 중간고사' : i === 15 ? ' · 기말고사' : '') + '</option>';
    }
    weekEl.innerHTML = opts + '<option value="17">종강 (만개)</option>';

    if (location.protocol === 'file:') $('local-warn').hidden = false;

    function setRadio(name, value) {
      var el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (el) el.checked = true;
    }
    function getRadio(name) {
      var el = document.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : '';
    }

    var timer = null;
    function update() {
      var start = parseDay(startEl.value);
      var end = parseDay(endEl.value);
      var ok = start !== null && end !== null && end > start;
      errEl.hidden = ok;
      copyBtn.disabled = !ok;
      if (!ok) return;

      var c = { start: start, end: end, theme: getRadio('theme'), size: getRadio('size'), debugWeek: null };
      var base = location.href.split(/[?#]/)[0];
      linkEl.value = base + '?' + buildQuery(c);

      var total = Math.ceil((end - start) / 7);
      $('f-summary').textContent = koreanDate(start) + ' → ' + koreanDate(end) + ' · 총 ' + total + '주 (' + (end - start) + '일)';

      stage.setAttribute('data-page', getRadio('pagebg'));
      stage.setAttribute('data-size', c.size);

      // 미리보기만 debugWeek 적용
      c.debugWeek = weekEl.value === '' ? null : +weekEl.value;
      var src = '?' + buildQuery(c);
      clearTimeout(timer);
      timer = setTimeout(function () {
        Array.prototype.forEach.call(stage.querySelectorAll('iframe'), function (f) {
          if (f.getAttribute('src') !== src) f.setAttribute('src', src);
        });
      }, 120);
    }

    $('generator').addEventListener('input', update);
    $('generator').addEventListener('change', update);

    copyBtn.addEventListener('click', function () {
      var text = linkEl.value;
      var done = function () {
        copyBtn.textContent = '복사했어요! 노션에 붙여넣으세요';
        copyBtn.classList.add('copied');
        setTimeout(function () { copyBtn.textContent = copyLabel; copyBtn.classList.remove('copied'); }, 2000);
      };
      var fallback = function () {
        linkEl.focus();
        linkEl.select();
        try { document.execCommand('copy'); done(); } catch (e) { /* 수동 복사 */ }
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });

    update();
  }

  /* ---------- 시작 ---------- */

  var params = new URLSearchParams(location.search);
  var isWidget = !params.has('edit') && WIDGET_KEYS.some(function (k) { return params.has(k); });
  document.documentElement.className = isWidget ? 'is-widget' : 'is-generator';
  if (isWidget) initWidget();
  else initGenerator();
})();
