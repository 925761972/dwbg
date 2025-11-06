# 飞书多维表格插件部署指南（本项目）

本指南帮助你将 `dist/` 构建产物上线为飞书多维表格（Bitable）边栏插件。

## 1. 准备与创建应用

- 在飞书开放平台创建应用，类型选择「多维表格插件」。
- 填写应用名称与描述，开通边栏插件能力。

## 2. 权限配置

- 读取表、字段与记录内容的权限即可满足当前只读预览功能。
- 若未来需要写入，请按需增加写权限，并补充用途说明。

## 3. 前端资源构建

```bash
npm run build:feishu
npm run zip:feishu
```

- 产物位于 `dist/`，压缩包位于项目根目录 `dist-feishu.zip`。
- 本项目 `vite.config.ts` 使用 `base: './'`，保证在 CDN 任意路径下能正确加载静态资源。

## 4. 托管与入口 URL

- 将 `dist/` 上传到企业 HTTPS CDN 或飞书静态资源托管。
- 在插件配置里设置入口 URL 指向 `index.html`，示例：
  - `https://cdn.example.com/dwbg/index.html`

注意：托管必须允许被 iframe 加载，避免设置 `X-Frame-Options: DENY` 或不兼容 CSP。

## 5. 调试要点

- 在多维表格打开插件入口，页面内 `window.bitable` 注入后，右侧面板将展示所选单元格的 Markdown 预览与结构化视图。
- 代码位置：`src/feishu/bitable.ts` 已适配真实环境与本地降级。

## 6. 提审与发布

- 填写版本说明，上传使用截图或演示视频。
- 提交审核，审核通过后发布到企业或应用市场。

## 7. 常见问题

- 资源 404：检查 CDN 路径与 `base` 设置是否为 `./`。
- 页面空白：检查是否正确注入 `window.bitable`，以及权限是否通过。
- 选择无响应：`src/feishu/bitable.ts` 使用 `onSelectionChange` 订阅，确保插件上下文启用该事件。