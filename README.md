# 简账

个人日常记账 PWA。数据只保存在手机本机（IndexedDB），不上传服务器。

## 功能

- 记支出 / 收入 / 转账，支持分类、账户、日期、备注
- 按月查看流水，日期分组、每日收支小计
- 统计：月度收支汇总、分类排行、近 6 个月支出趋势（含表格视图）
- 多账户与总资产，余额自动计算
- 自定义分类与账户
- 数据导出 / 导入 JSON 备份，一键清空
- 粘贴识别：复制微信/支付宝支付结果或银行短信，自动提取金额、商户、日期并归类
- 快捷指令预填：通过 URL 参数打开记账页并填入内容
- 浅色 / 深色 / 跟随系统
- 离线可用，可添加到 iPhone 主屏幕（PWA）

## 快捷记账

### 粘贴识别

在记账页点「粘贴识别」，App 读取剪贴板并解析支付文字（全程本机处理，不上传）。
支持微信支付、支付宝、银行短信等常见格式。

### URL 预填

```
https://<站点>/?add=1&type=expense&amount=35.5&note=午餐&category=餐饮&account=现金&date=2026-11-18
```

| 参数 | 说明 |
|---|---|
| `add=1` | 打开记账页 |
| `type` | `expense` / `income` / `transfer`（也支持中文） |
| `amount` | 金额（元） |
| `note` | 备注/商户 |
| `category` | 分类名称或 ID |
| `account` / `to` | 账户名称或 ID / 转账目标账户 |
| `date` | `YYYY-MM-DD` |

在 iOS「快捷指令」中添加「打开 URL」即可一键唤起预填页。
注意：iOS 可能用 Safari 打开链接，而主屏幕 PWA 与 Safari 的本地存储可能互不相通；
若打开后看不到已有数据，请使用「粘贴识别」方式，或始终用同一入口使用简账。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build     # 输出到 dist/
npm run preview   # 本地预览生产构建
```

## 部署到 GitHub Pages

构建产物发布到 `gh-pages` 分支：

```bash
npm run deploy
```

首次部署后，在 GitHub 仓库 **Settings → Pages** 中确认 Source 为
**Deploy from a branch**，分支选择 `gh-pages` / `(root)`。

站点地址：`https://<用户名>.github.io/<仓库名>/`

Vite 使用相对 `base: './'`，因此无需修改即可部署在任意子路径下。
如果网络访问 GitHub 需要代理，部署前设置 `HTTPS_PROXY` 环境变量即可。

## iPhone 安装

1. 用 Safari 打开站点
2. 点底部「分享」
3. 选择「添加到主屏幕」

添加到主屏幕后全屏运行、离线可用。数据保存在本机 Safari 的存储中，
建议定期在「设置 → 导出备份」保存 JSON 备份。

## 测试脚本

`scripts/` 下为本地验收脚本（使用本机 Chrome + playwright-core）：

```bash
npm run preview -- --port 4173
node scripts/e2e-check.mjs   # 全流程截图，输出到 .screenshots/
node scripts/verify.mjs      # 离线、备份往返、分类/账户增删
```

## 技术栈

React 19 + TypeScript + Vite 8，IndexedDB（idb），vite-plugin-pwa（Workbox），
日期处理 dayjs，图标 lucide-react。图表为手写 HTML/SVG，遵循数据可视化规范
（单一色相、直接标注、表格视图、深色模式独立配色）。
