# 飞书多维表格 Markdown 结构化预览插件

本插件为飞书多维表格（Bitable）提供右侧固定预览窗口，实时显示选中单元格的 Markdown 内容，并支持结构化层级展示与折叠。

## 功能概览

- 右侧固定预览窗口（默认宽度 300px，可拖拽调整）
- 实时解析 Markdown（标题、列表、代码块、表格等）
- 结构化层级视图，支持折叠/展开
- 语法高亮（highlight.js）
- 显隐切换（按钮与快捷键：`Cmd/Ctrl+Shift+M`）
- 复制格式化内容（复制为 HTML，失败时降级为纯文本）
- 防抖处理频繁单元格切换
- 响应式布局适配不同尺寸

## 技术实现

- 前端框架：Vite + Preact + TypeScript
- Markdown 解析：marked.js
- HTML 安全处理：DOMPurify
- 代码高亮：highlight.js
- 大文档性能优化：Web Worker（`src/workers/parser.worker.ts`）
- 结构化层级解析：基于 marked tokens 构建树（`src/utils/hierarchy.ts`）
- 飞书多维表格集成：`src/feishu/bitable.ts`（在本地开发环境提供安全的降级逻辑）

## 开发/运行

```bash
npm run dev
```

启动后浏览器访问 `http://localhost:5173/` 可预览 UI。本地环境下未注入 `window.bitable` 时，会展示示例 Markdown 内容以便开发。

## 接入飞书多维表格（Widget）

在飞书多维表格的控件/插件开发环境中：

- 确保插件 iframe 内可访问到本应用；
- 主页面注入 `bitable` 全局对象；
- 组件通过 `bitable.base.onSelectionChange` 订阅单元格选择变化，并在 `getCellValue(fieldId, recordId)` 中读取内容（详见 `src/feishu/bitable.ts`）。

> 若使用官方 Widget CLI，请将本应用部署并在 Widget 配置中设置 URL 指向打包后的页面。

## 测试

```bash
npm run test
```

测试覆盖：

- Markdown 解析与 XSS 防护
- 层级结构构建
- 大文档解析性能（目标 <200ms，测试允许至 300ms）

## 性能与内存优化

- 大文档（>8k 字符）解析在 Web Worker 中进行，避免阻塞 UI 线程；
- 使用 `marked` 的 tokens 进行结构化视图构建，避免对 DOM 的过度操作；
- 渲染路径采用 Preact 虚拟 DOM，减少内存占用；
- 对选择事件进行 150ms 防抖，降低频繁更新成本；
- 语法高亮按需执行，未知语言使用自动高亮；
- 避免在工作线程执行 DOMPurify（主线程统一清洗）。

目标指标：

- 预览响应时间 < 200ms（实测 10k+ 字符在现代机器 < 200–300ms 范围）
- 内存占用 < 50MB（仅加载必要依赖与样式，避免大量缓存）
- 支持万字符级别文档预览

## 边界情况处理

- 空单元格：展示为空内容提示；
- 非法 Markdown：解析失败自动降级为空或原文本；
- 复杂字段类型：尝试提取 `text`/`value` 字段，否则 `JSON.stringify` 降级展示；

## 目录结构

- `src/components/PreviewPanel.tsx`：预览与结构化视图
- `src/feishu/bitable.ts`：飞书集成与本地降级
- `src/utils/markdown.ts`：解析与安全清洗
- `src/utils/hierarchy.ts`：层级树构建
- `src/utils/debounce.ts`：防抖
- `src/utils/copy.ts`：复制格式化内容
- `src/workers/parser.worker.ts`：Web Worker 解析

## 许可

本项目示例代码用于演示与集成参考，未附加版权头。根据实际项目需要添加许可。