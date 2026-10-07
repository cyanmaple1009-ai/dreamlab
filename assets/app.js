/* ==========================================================================
   梦境研究所 — app.js
   零依赖。功能：移动导航 / 滚动进度 / 元素入场 / 数字滚动 / 页内锚点高亮 /
   梦境机制渲染 / 反馈表单 / 粒子画布
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- 1. 导航 */
  function initNav() {
    var toggle = $('.nav__toggle');
    var links  = $('.nav__links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        var open = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      $$('a', links).forEach(function (a) {
        a.addEventListener('click', function () {
          links.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
    // 滚动进度条
    var bar = $('.scroll-progress');
    if (bar) {
      var tick = function () {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0) + '%';
      };
      window.addEventListener('scroll', tick, { passive: true });
      window.addEventListener('resize', tick);
      tick();
    }
  }

  /* ------------------------------------------------------------ 2. 入场动画 */
  function initReveal() {
    var els = $$('.reveal');
    if (!els.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          var d = parseInt(el.getAttribute('data-delay') || '0', 10);
          setTimeout(function () { el.classList.add('is-in'); }, d);
          io.unobserve(el);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* -------------------------------------------------------- 3. 数字滚动器 */
  function initCounters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;
    var render = function (el, v) {
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      el.textContent = dec > 0
        ? v.toFixed(dec)
        : Math.round(v).toLocaleString('en-US');
    };
    var run = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      if (isNaN(target)) return;
      if (reduceMotion) { render(el, target); return; }
      var dur = 1200, t0 = null;
      var step = function (ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        render(el, target * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------------- 4. 页内锚点高亮 */
  function initSubnav() {
    var bar = $('.subnav');
    if (!bar) return;
    var links = $$('a[href^="#"]', bar);
    var targets = links.map(function (a) {
      return document.getElementById(a.getAttribute('href').slice(1));
    }).filter(Boolean);
    if (!targets.length) return;

    var setActive = function (id) {
      links.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
      });
    };
    var onScroll = function () {
      var y = window.scrollY + 140, current = targets[0];
      targets.forEach(function (t) { if (t.offsetTop <= y) current = t; });
      setActive(current.id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------- 5. 梦境机制数据渲染 */
  var MECHANISMS = [
    {
      code: 'M-01', cn: '时间并非线性', en: 'Non-linear Time',
      accent: 'cyan', icon: 'clock',
      body: '梦境中的时间长度与现实等同，却不呈线形连续，而如电影场景一般经过剪辑与拼凑。两小时的电影可以讲完一年的事，四十分钟的梦也可能漫长如一生——这正是人们普遍觉得「梦里时间更长」的原因。',
      data: [
        ['REM 单次时长', '≈ 40 min'],
        ['时间结构', '剪辑 / 拼凑'],
        ['现实时间同步', '等同']
      ]
    },
    {
      code: 'M-02', cn: '逻辑的放大与扭曲', en: 'Amplified Logic',
      accent: 'violet', icon: 'spiral',
      body: '梦境逻辑是现实的夸张、扭曲与放大。绳子捆住双手便完全无法挣脱，因为「禁锢」这一属性被放大了；剪刀的「危险」被夸张，梦境主人可能选择销毁世上所有剪刀。要引导梦境，就要先读懂哪一个属性正在被放大。',
      data: [
        ['属性放大', '显著'],
        ['逻辑一致性', '低'],
        ['可引导性', '高']
      ]
    },
    {
      code: 'M-03', cn: '物理规则源于现实', en: 'Physics from Reality',
      accent: 'lime', icon: 'atom',
      body: '梦中的物理规则未必与现实等同，但一定来源于现实。你可能在梦中太空漫步，或在深海自由呼吸，对疼痛的感知也可能被改写。你所受的物理约束与梦境主人等同——ta 不能飞，你也不能。',
      data: [
        ['规则来源', '现实经验'],
        ['约束对等', '是'],
        ['痛觉', '可变']
      ]
    },
    {
      code: 'M-04', cn: '特征点跳转', en: 'Feature-Point Jump',
      accent: 'amber', icon: 'nodes',
      body: '梦境场景不依靠直接逻辑联系，而由若干「特征点」放大而成。你准备去学校，走上马路，路边有一棵树——下一个场景就可能是同学们在树洞里上课。追踪特征点，是潜梦者判断梦境走向的基本功。',
      data: [
        ['转场依据', '特征点'],
        ['因果链', '常断裂'],
        ['稳定性', '中']
      ]
    },
    {
      code: 'M-05', cn: '面孔模糊，特征清晰', en: 'Blurred Faces',
      accent: 'magenta', icon: 'faces',
      body: '梦中人物的脸是模糊的，但绝大多数主要角色拥有清晰的特征。并非所有角色都在现实中存在——而如果某个现实中的人出现在梦里，梦境主人必然「知晓」此人。',
      data: [
        ['面部', '模糊'],
        ['主要角色特征', '清晰'],
        ['对应现实', '可能不存在']
      ]
    },
    {
      code: 'M-06', cn: '情绪与倾向的放大', en: 'Amplified Affect',
      accent: 'rose', icon: 'pulse',
      body: '梦中情绪可能被放大或缩小，进而左右梦境主人的行为。事件走向亦有概率受其倾向影响：梦中你御风而飞，眼看要撞上建筑，心念「快避开」，便真的避开了。',
      data: [
        ['情绪幅度', '放大 / 缩小'],
        ['行为依据', '底层观念'],
        ['走向干预', '概率性']
      ]
    }
  ];

  var ICONS = {
    clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    spiral: '<path d="M12 12a3 3 0 1 0 3 3c0-3-3-4-3-7a5 5 0 0 1 5 5c0 4-3.5 6-6.5 6A7 7 0 0 1 4 12a7 7 0 0 1 7-7c5 0 8 3.5 8 8"/>',
    atom:   '<circle cx="12" cy="12" r="2.2"/><ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(45 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(-45 12 12)"/>',
    nodes:  '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2.4"/><path d="M6.6 7.3 10.8 16M17.4 7.3 13.2 16M7 6h10"/>',
    faces:  '<circle cx="9" cy="10" r="4"/><circle cx="17.5" cy="13" r="2.6"/><path d="M9 10h.01M17.5 13h.01" stroke-width="2.2"/>',
    pulse:  '<path d="M2 12h4l2.5-7 3.5 14 3-9 2 2h5"/>'
  };

  function initMechanisms() {
    var host = $('#mechanisms');
    if (!host) return;
    host.innerHTML = MECHANISMS.map(function (m) {
      var data = m.data.map(function (d) {
        return '<div><dt>' + d[0] + '</dt><dd>' + d[1] + '</dd></div>';
      }).join('');
      return '' +
        '<article class="device reveal" data-accent="' + m.accent + '">' +
          '<div class="device__fig">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[m.icon] || '') + '</svg>' +
          '</div>' +
          '<div class="device__body">' +
            '<span class="device__code">' + m.code + '</span>' +
            '<h3>' + m.cn + '</h3>' +
            '<span class="en">' + m.en + '</span>' +
            '<p>' + m.body + '</p>' +
            '<dl>' + data + '</dl>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  /* ------------------------------------------------------ 6. 反馈表单处理 */
  function initForm() {
    var form = $('#feedback-form');
    if (!form) return;
    var done = $('#form-done');
    var errBox = $('#form-error');
    var counter = $('#char-count');
    var msg = $('#fb-message');

    if (counter && msg) {
      var upd = function () { counter.textContent = msg.value.length + ' / 2000'; };
      msg.addEventListener('input', function () {
        if (msg.value.length > 2000) msg.value = msg.value.slice(0, 2000);
        upd();
      });
      upd();
    }

    // 恢复本机上一次填写的联系邮箱
    try {
      var saved = localStorage.getItem('dri.fb.email');
      var emailInput = $('#fb-email');
      if (saved && emailInput) emailInput.value = saved;
    } catch (e) { /* 隐私模式忽略 */ }

    var showError = function (text) {
      if (!errBox) return;
      errBox.textContent = text;
      errBox.style.display = 'block';
      errBox.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errBox) errBox.style.display = 'none';

      var required = $$('[required]', form);
      for (var i = 0; i < required.length; i++) {
        var el = required[i];
        if (el.type === 'radio') {
          var group = $$('input[name="' + el.name + '"]', form);
          if (!group.some(function (r) { return r.checked; })) {
            showError('请完成必填项：' + (el.getAttribute('data-group-label') || el.name));
            return;
          }
        } else if (el.type === 'checkbox') {
          if (!el.checked) {
            showError('请勾选：' + (el.getAttribute('data-label') || '必选声明'));
            return;
          }
        } else if (!String(el.value).trim()) {
          showError('请完成必填项：' + (el.getAttribute('data-label') || el.name));
          el.focus();
          return;
        }
      }

      var email = $('#fb-email');
      if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        showError('联系邮箱格式不正确，请检查后重试。');
        email.focus();
        return;
      }
      try { if (email) localStorage.setItem('dri.fb.email', email.value.trim()); } catch (e2) {}

      var kind = ($$('input[name="fb-kind"]', form).filter(function (r) { return r.checked; })[0] || {}).value || '其他';
      var prio = ($$('input[name="fb-priority"]', form).filter(function (r) { return r.checked; })[0] || {}).value || '普通';
      var anon = $('#fb-anon');
      var id = (function () {
        var d = new Date();
        var p = function (n) { return String(n).padStart(2, '0'); };
        var rnd = Math.floor(Math.random() * 9000 + 1000);
        return 'DRI-FB-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + rnd;
      })();

      var set = function (sel, val) { var n = $(sel); if (n) n.textContent = val; };
      set('#rc-id', id);
      set('#rc-kind', kind);
      set('#rc-prio', prio);
      set('#rc-anon', (anon && anon.checked) ? '匿名提交' : '具名提交');
      set('#rc-time', new Date().toLocaleString('zh-CN', { hour12: false }));

      form.style.display = 'none';
      if (done) {
        done.classList.add('is-on');
        done.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });

    var again = $('#form-again');
    if (again) {
      again.addEventListener('click', function () {
        form.reset();
        if (done) done.classList.remove('is-on');
        form.style.display = '';
        if (counter && msg) counter.textContent = msg.value.length + ' / 2000';
        form.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }
  }

  /* ------------------------------------------------------ 7. 折叠面板按钮 */
  function initAccordionA11y() {
    $$('.acc__head').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var acc = btn.closest('.acc');
        if (!acc) return;
        // 独占展开
        var group = acc.parentElement;
        if (group && group.hasAttribute('data-exclusive')) {
          $$('.acc', group).forEach(function (other) {
            if (other !== acc && other.hasAttribute('open')) other.removeAttribute('open');
          });
        }
      });
    });
  }

  /* ------------------------------------------------------ 8. 版权年份 */
  function initYear() {
    $$('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---------------------------------------------------------- 9. 启动 */
  function boot() {
    initYear();
    initNav();
    initMechanisms();
    initAccordionA11y();
    initReveal();
    initCounters();
    initSubnav();
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
