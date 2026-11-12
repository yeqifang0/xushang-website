/* ============================================================
   官网公共脚本：导航 / 粒子背景 / 数字滚动 / 滚动显现 / FAQ / Toast
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 导航滚动态 ---------- */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 移动端菜单 ---------- */
  var navToggle = document.getElementById('navToggle');
  if (nav && navToggle) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // 点击链接后收起菜单
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Toast ---------- */
  var toast = document.getElementById('toast');
  var toastTimer = null;
  window.showToast = function (msg, type) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.className = 'toast'; }, 2600);
  };

  /* ---------- Hero 粒子背景 ---------- */
  var canvas = document.getElementById('heroCanvas');
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var dots = [];
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, raf = null, running = true;

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var count = Math.min(90, Math.floor(W * H / 16000));
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - .5) * .35,
          vy: (Math.random() - .5) * .35,
          r: Math.random() * 1.6 + .6,
          a: Math.random() * .5 + .2
        });
      }
    }

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < -10) d.x = W + 10; if (d.x > W + 10) d.x = -10;
        if (d.y < -10) d.y = H + 10; if (d.y > H + 10) d.y = -10;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,229,255,' + d.a * .8 + ')';
        ctx.fill();
      }
      // 近距离连线
      for (var j = 0; j < dots.length; j++) {
        for (var k = j + 1; k < dots.length; k++) {
          var dx = dots[j].x - dots[k].x, dy = dots[j].y - dots[k].y;
          var dist2 = dx * dx + dy * dy;
          if (dist2 < 130 * 130) {
            var alpha = (1 - Math.sqrt(dist2) / 130) * .18;
            ctx.beginPath();
            ctx.moveTo(dots[j].x, dots[j].y);
            ctx.lineTo(dots[k].x, dots[k].y);
            ctx.strokeStyle = 'rgba(90,184,255,' + alpha + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }

    resize();
    tick();
    window.addEventListener('resize', function () {
      resize();
    });
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) tick(); else if (raf) cancelAnimationFrame(raf);
    });
  }

  /* ---------- 滚动显现 ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: .12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---------- 数字滚动 ---------- */
  var counters = document.querySelectorAll('.counter');
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var decimals = parseInt(el.getAttribute('data-decimal') || '0', 10);
    var dur = 1400, start = null;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = decimals
        ? val.toFixed(decimals)
        : Math.round(val).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          animateCounter(e.target);
          cio.unobserve(e.target);
        }
      });
    }, { threshold: .6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) {
      var decimals = parseInt(el.getAttribute('data-decimal') || '0', 10);
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      el.textContent = decimals ? target.toFixed(decimals) : target.toLocaleString('en-US');
    });
  }

  /* ---------- 锚点定位补偿（固定导航） ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      ev.preventDefault();
      var y = target.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ---------- 预约演示表单（演示环境，仅本地存储） ---------- */
  var demoForm = document.getElementById('demoForm');
  if (demoForm) {
    demoForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var company = demoForm.company.value.trim();
      var phone = demoForm.phone.value.trim();
      if (!company) { showToast('请填写公司名称', 'error'); return; }
      if (!/^1[3-9]\d{9}$/.test(phone)) { showToast('请填写正确的 11 位手机号', 'error'); return; }
      try {
        var list = JSON.parse(localStorage.getItem('xs_demo_requests') || '[]');
        list.push({ company: company, phone: phone, createdAt: new Date().toISOString() });
        localStorage.setItem('xs_demo_requests', JSON.stringify(list));
      } catch (e) { /* 隐私模式下忽略 */ }
      demoForm.reset();
      showToast('预约成功！顾问将在 1 个工作日内联系您', 'success');
    });
  }
})();
