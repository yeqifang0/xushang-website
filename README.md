# 服务器散热联动智能调控软件 官网

上海绪上科技有限公司 · 产品官网 + 在线订购闭环（演示版）

## 目录结构

```
xushang-website/
├── index.html      # 官网主页：产品介绍 / 功能 / 架构 / 场景 / 价格 / FAQ / 关于
├── order.html      # 在线订购：选套餐 → 确认订单 → 在线支付 → 开通成功（闭环）
├── favicon.svg     # 站点图标
├── css/style.css   # 全站样式（深色高级科技风）
├── js/main.js      # 导航 / 粒子背景 / 数字滚动 / 滚动动画 / 预约演示表单
├── js/order.js     # 订购 + 支付闭环逻辑（当前为模拟支付）
└── README.md       # 本文件
```

## 本地预览

纯静态站点，无需构建：

```bash
cd xushang-website
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

直接双击 `index.html` 也可以打开（推荐用 http 方式，避免个别浏览器对 file:// 的 localStorage 限制）。

## 老板 Review 后上线前需要替换的内容

网站已按"先内审、后备案上线"的流程准备，以下占位内容在域名与 ICP 备案通过后统一替换：

| 位置 | 占位内容 | 替换为 |
|---|---|---|
| 页脚（index.html / order.html） | `沪ICP备XXXXXXXX号-X（备案通过后替换）` | 工信部下发的真实备案号 |
| 对公账户（order.html 支付页） | `XX银行…` 户名/账号 | 公司真实对公账户 |
| 价格方案 | 基础 ¥2,980 / 专业 ¥6,980 / 网关 ¥4,800 | 财务核定的正式定价 |

## 支付功能说明（重要）

**当前为演示环境**：order.html 的"在线支付"是本地模拟流程（模拟微信/支付宝二维码 + 模拟支付成功按钮 + 对公转账信息），订单数据仅保存在浏览器 localStorage（`xs_orders`），页面上已明确标注"演示环境"。这样老板可以先 review 完整的浏览→下单→支付→开通闭环，不涉及真实资金。

**接入真实支付需要的前置条件**（均需 ICP 备案完成）：

1. 微信支付：微信支付商户号（需营业执照 + 已备案域名 + 对公账户）
2. 支付宝：支付宝企业账户 + 当面付/Native 支付产品签约
3. 一个轻量后端（下单、生成支付二维码 `code_url`、接收支付回调、订单管理）

**对接改造点**（代码已预留清晰边界，集中在 `js/order.js`）：

- `drawQR()` —— 替换为调用后端 `/api/pay/qrcode`，用微信 Native 支付返回的 `code_url` 生成真实二维码
- `startCountdown()` —— 保留，回调到账后由后端主动通知（WebSocket / 轮询 `/api/order/{no}/status`）
- `mockPaySuccess` 按钮所在逻辑 —— 删除，改为支付状态轮询成功后自动进入第 4 步
- 订单落库 —— `localStorage.setItem('xs_orders', ...)` 替换为后端 `/api/order` 接口

## 部署

纯静态文件，任意方式均可托管（推荐备案后部署在国内云主机 + Nginx）：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/xushang-website;
    index index.html;
    location / { try_files $uri $uri/ =404; }
}
```

## 设计规范速览

- 主色：青色 `#00E5FF` → 蓝 `#2E7DFF` → 紫 `#7C5CFF` 渐变，深色底 `#04070F`
- 风格：玻璃拟态卡片 + 粒子连线背景 + 流动虚线气流动效
- 响应式：桌面 / 平板 / 手机三档断点，移动端汉堡菜单
- 无外部依赖（无 CDN、无外部字体、无第三方 JS），国内访问零阻碍，备案审核稳定
