/* ============================================================
   订购页脚本：选套餐 → 确认订单 → 支付（演示）→ 开通成功
   说明：当前为演示环境，支付为本地模拟；正式环境替换为
   微信支付 Native / 支付宝当面付 接口（见 README.md）。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 商品数据 ---------- */
  var PLANS = {
    basic:    { name: '基础版', price: 2980,   unit: '年', desc: '≤ 200 机柜' },
    pro:      { name: '专业版', price: 6980,   unit: '年', desc: '≤ 2,000 机柜' },
    flagship: { name: '旗舰版', price: null,   unit: '',   desc: '不限机柜 / 定制报价' }
  };
  var GATEWAY = { name: '智能采集网关 XS-G200', price: 4800 };
  var YEAR_DISCOUNT = { 1: 1, 2: .95, 3: .88 };

  var fmt = function (n) {
    return '¥' + Math.round(n).toLocaleString('en-US');
  };

  /* ---------- 状态 ---------- */
  var state = {
    plan: 'pro',
    years: 1,
    gateways: 0,
    order: null,   // { no, items, amount, discount, contact, status, createdAt }
    payMethod: 'wechat'
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  /* ---------- URL 参数预选 ---------- */
  (function () {
    var q = new URLSearchParams(location.search);
    var p = q.get('plan');
    if (p && PLANS[p]) state.plan = p;
    var y = parseInt(q.get('years'), 10);
    if (y === 2 || y === 3) state.years = y;
    var g = parseInt(q.get('gw'), 10);
    if (g > 0) state.gateways = Math.min(g, 99);
  })();

  /* ---------- 步骤导航 ---------- */
  var stepEls = $$('#stepsBar .step');
  var panels = { 1: $('#panel1'), 2: $('#panel2'), 3: $('#panel3'), 4: $('#panel4') };
  var currentStep = 1;

  function goStep(n) {
    currentStep = n;
    Object.keys(panels).forEach(function (k) {
      panels[k].classList.toggle('active', +k === n);
    });
    stepEls.forEach(function (el) {
      var s = +el.getAttribute('data-step');
      el.classList.toggle('active', s === n);
      el.classList.toggle('done', s < n);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- 方案选择 ---------- */
  var planOptions = $$('.plan-option');
  function syncPlanUI() {
    planOptions.forEach(function (el) {
      var selected = el.getAttribute('data-plan') === state.plan;
      el.classList.toggle('selected', selected);
      el.querySelector('input').checked = selected;
    });
    $$('input[name="years"]').forEach(function (r) {
      r.checked = +r.value === state.years;
    });
    $('#gwNum').textContent = state.gateways;
  }
  planOptions.forEach(function (el) {
    el.addEventListener('click', function () {
      state.plan = el.getAttribute('data-plan');
      syncPlanUI(); renderSummary();
    });
  });
  $$('input[name="years"]').forEach(function (r) {
    r.addEventListener('change', function () {
      state.years = +r.value;
      renderSummary();
    });
  });
  $('#gwMinus').addEventListener('click', function () {
    state.gateways = Math.max(0, state.gateways - 1); syncPlanUI(); renderSummary();
  });
  $('#gwPlus').addEventListener('click', function () {
    state.gateways = Math.min(99, state.gateways + 1); syncPlanUI(); renderSummary();
  });

  /* ---------- 订单摘要 ---------- */
  function calc() {
    var plan = PLANS[state.plan];
    var isFlagship = state.plan === 'flagship';
    var base = isFlagship ? 0 : plan.price * state.years;
    var gw = GATEWAY.price * state.gateways;
    var discount = isFlagship ? 0 : Math.round(base * (1 - YEAR_DISCOUNT[state.years]));
    var total = isFlagship ? null : base - discount + gw;
    return { plan: plan, isFlagship: isFlagship, base: base, gw: gw, discount: discount, total: total };
  }

  function summaryItems() {
    var c = calc();
    var lines = [];
    if (c.isFlagship) {
      lines.push({ label: '旗舰版 · 定制方案', value: '以报价为准' });
    } else {
      lines.push({
        label: c.plan.name + ' · ' + state.years + ' 年' + (state.years > 1 ? '（' + (YEAR_DISCOUNT[state.years] * 10).toFixed(1).replace(/\.0$/, '') + ' 折）' : ''),
        value: fmt(c.plan.price * state.years)
      });
    }
    if (state.gateways > 0) {
      lines.push({ label: GATEWAY.name + ' × ' + state.gateways, value: fmt(c.gw) });
    }
    return lines;
  }

  function renderSummary() {
    var c = calc();
    var lines = summaryItems();

    [['summaryLines', 'totalVal'], ['summaryLines2', 'totalVal2']].forEach(function (pair, idx) {
      var ul = $('#' + pair[0]);
      if (!ul) return;
      ul.innerHTML = lines.map(function (l) {
        return '<li><span>' + l.label + '</span><b>' + l.value + '</b></li>';
      }).join('');
      var dLine = $('#discountLine' + (idx ? '2' : ''));
      var dVal = $('#discountVal' + (idx ? '2' : ''));
      if (dLine) {
        var show = c.discount > 0;
        dLine.hidden = !show;
        if (show) dVal.textContent = '-' + fmt(c.discount);
      }
      var tv = $('#' + pair[1]);
      if (tv) tv.textContent = c.isFlagship ? '定制报价' : fmt(c.total);
    });
  }

  /* ---------- 第 1 → 2 步 ---------- */
  $('#toStep2').addEventListener('click', function () {
    renderSummary();
    goStep(2);
  });
  $('#backTo1').addEventListener('click', function () { goStep(1); });

  /* ---------- 表单校验与订单创建 ---------- */
  function setInvalid(input, invalid) {
    input.closest('.of-field').classList.toggle('invalid', invalid);
  }

  $('#submitOrder').addEventListener('click', function () {
    var f = { company: $('#fCompany'), contact: $('#fContact'), phone: $('#fPhone'), email: $('#fEmail') };
    var ok = true;

    if (!f.company.value.trim()) { setInvalid(f.company, true); ok = false; } else setInvalid(f.company, false);
    if (!f.contact.value.trim()) { setInvalid(f.contact, true); ok = false; } else setInvalid(f.contact, false);
    if (!/^1[3-9]\d{9}$/.test(f.phone.value.trim())) { setInvalid(f.phone, true); ok = false; } else setInvalid(f.phone, false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) { setInvalid(f.email, true); ok = false; } else setInvalid(f.email, false);

    var agree = $('#fAgree').checked;
    $('#agreeErr').classList.toggle('show', !agree);
    if (!agree) ok = false;

    if (!ok) {
      showToast('请完善标 * 的必填信息', 'error');
      return;
    }

    var c = calc();
    var now = new Date();
    var no = 'XS' + now.getFullYear() +
      ('0' + (now.getMonth() + 1)).slice(-2) +
      ('0' + now.getDate()).slice(-2) +
      '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

    state.order = {
      no: no,
      plan: state.plan,
      planName: c.plan.name,
      years: state.years,
      gateways: state.gateways,
      items: summaryItems(),
      amount: c.total,                       // 旗舰版为 null
      discount: c.discount,
      contact: {
        company: f.company.value.trim(),
        name: f.contact.value.trim(),
        phone: f.phone.value.trim(),
        email: f.email.value.trim(),
        racks: $('#fRacks').value.trim(),
        invoice: $('#fInvoice').value,
        remark: $('#fRemark').value.trim()
      },
      status: c.isFlagship ? '顾问对接' : '待支付',
      createdAt: now.toISOString()
    };

    try {
      var list = JSON.parse(localStorage.getItem('xs_orders') || '[]');
      list.push(state.order);
      localStorage.setItem('xs_orders', JSON.stringify(list));
    } catch (e) { /* 隐私模式忽略 */ }

    // 进入支付 / 对接环节
    $('#payOnline').hidden = c.isFlagship;
    $('#payFlagship').hidden = !c.isFlagship;
    $('#payOrderNo').textContent = no;
    $('#fsOrderNo').textContent = no;
    $('#payAmount').textContent = c.isFlagship ? '定制' : fmt(c.total);
    $('#bankRemark').textContent = '订单号 ' + no;

    if (!c.isFlagship) {
      switchPayMethod(state.payMethod);
      startCountdown();
      drawQR();
    }
    goStep(3);
  });

  /* ---------- 支付方式页签 ---------- */
  var payTabs = $$('.pay-tab');
  function switchPayMethod(m) {
    state.payMethod = m;
    payTabs.forEach(function (t) {
      var active = t.getAttribute('data-pay') === m;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    $('#payQR').hidden = m === 'bank';
    $('#payBank').hidden = m !== 'bank';
    if (m !== 'bank') {
      $('#qrAppName').textContent = m === 'wechat' ? '微信' : '支付宝';
      $('#qrLogo').textContent = m === 'wechat' ? '微信支付' : '支付宝';
      drawQR();
      startCountdown();
    }
  }
  payTabs.forEach(function (t) {
    t.addEventListener('click', function () { switchPayMethod(t.getAttribute('data-pay')); });
  });

  /* ---------- 模拟二维码（演示用，正式环境替换为支付接口返回的 code_url） ---------- */
  function drawQR() {
    var canvas = $('#qrCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var N = 29, pad = 14, size = (canvas.width - pad * 2) / N;
    var seed = 0;
    var key = (state.order ? state.order.no : 'xs') + state.payMethod + Date.now();
    for (var i = 0; i < key.length; i++) {
      seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
    }
    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0d1b2e';

    var grid = [];
    for (var y = 0; y < N; y++) {
      grid[y] = [];
      for (var x = 0; x < N; x++) grid[y][x] = rand() > .52;
    }
    // 三个定位角
    function finder(fx, fy) {
      for (var y = 0; y < 7; y++) for (var x = 0; x < 7; x++) {
        var edge = x === 0 || x === 6 || y === 0 || y === 6;
        var core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[fy + y][fx + x] = edge || core;
      }
    }
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
    // 数据点
    for (var yy = 0; yy < N; yy++) {
      for (var xx = 0; xx < N; xx++) {
        if (grid[yy][xx]) {
          ctx.fillRect(pad + xx * size, pad + yy * size, size * .92, size * .92);
        }
      }
    }
    // 中心品牌位
    var cW = size * 5.6;
    var cx = canvas.width / 2 - cW / 2, cy = canvas.height / 2 - cW / 2;
    ctx.fillStyle = state.payMethod === 'wechat' ? '#09BB07' : '#1677FF';
    roundRect(ctx, cx, cy, cW, cW, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(size * 3.6) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(state.payMethod === 'wechat' ? '¥' : '支', canvas.width / 2, canvas.height / 2 + 1);
    $('#qrMask').hidden = true;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- 支付倒计时 ---------- */
  var cdTimer = null, cdLeft = 15 * 60;
  function startCountdown() {
    clearInterval(cdTimer);
    cdLeft = 15 * 60;
    $('#qrMask').hidden = true;
    renderCd();
    cdTimer = setInterval(function () {
      cdLeft--;
      if (cdLeft <= 0) {
        clearInterval(cdTimer);
        $('#qrMask').hidden = false;
      }
      renderCd();
    }, 1000);
  }
  function renderCd() {
    var m = Math.floor(cdLeft / 60), s = cdLeft % 60;
    $('#cdTime').textContent = ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
  }
  $('#qrRefresh').addEventListener('click', function () { drawQR(); startCountdown(); });

  /* ---------- 支付完成（演示闭环） ---------- */
  function finishOrder(statusKey, title, sub) {
    state.order.status = statusKey;
    try {
      var list = JSON.parse(localStorage.getItem('xs_orders') || '[]');
      var idx = list.findIndex(function (o) { return o.no === state.order.no; });
      if (idx > -1) { list[idx].status = statusKey; localStorage.setItem('xs_orders', JSON.stringify(list)); }
    } catch (e) { /* ignore */ }

    clearInterval(cdTimer);
    $('#doneOrderNo').textContent = state.order.no;
    $('#doneItems').textContent = state.order.items.map(function (l) { return l.label; }).join('；');
    $('#doneAmount').textContent = state.order.amount == null ? '定制报价（以合同为准）' : fmt(state.order.amount);
    var st = $('#doneStatus');
    st.textContent = statusKey;
    st.classList.toggle('pending', statusKey === '待财务确认');
    $('#successTitle').textContent = title;
    $('#successSub').textContent = sub;
    goStep(4);
  }

  $('#mockPaySuccess').addEventListener('click', function () {
    finishOrder('已支付', '支付成功，服务开通中', '开通短信与邮件已发送至您的预留联系方式');
  });
  $('#mockBankDone').addEventListener('click', function () {
    finishOrder('待财务确认', '凭证已提交', '财务确认到账（1 个工作日内）后即为订单生效并开通服务');
  });
  $('#flagshipConfirm').addEventListener('click', function () {
    finishOrder('顾问对接中', '需求单已提交', '专属顾问将在 1 个工作日内与您电话联系');
  });

  $('#payBack').addEventListener('click', function () { clearInterval(cdTimer); goStep(2); });
  $('#payBack2').addEventListener('click', function () { goStep(2); });
  $('#flagshipBack').addEventListener('click', function () { goStep(2); });

  /* ---------- 复制按钮 ---------- */
  function copyText(text, tip) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast(tip, 'success'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
      showToast(tip, 'success');
    }
  }
  $$('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      copyText(btn.getAttribute('data-copy') || btn.textContent, '已复制到剪贴板');
    });
  });
  var copyOrderNo = $('#copyOrderNo');
  if (copyOrderNo) {
    copyOrderNo.addEventListener('click', function () {
      copyText(state.order ? state.order.no : '', '订单号已复制');
    });
  }

  /* ---------- 协议弹层 ---------- */
  var agreeModal = $('#agreeModal');
  $('#agreeLink').addEventListener('click', function (e) { e.preventDefault(); agreeModal.hidden = false; });
  $('#agreeOk').addEventListener('click', function () { agreeModal.hidden = true; });
  agreeModal.addEventListener('click', function (e) { if (e.target === agreeModal) agreeModal.hidden = true; });

  /* ---------- 初始化 ---------- */
  syncPlanUI();
  renderSummary();
})();
