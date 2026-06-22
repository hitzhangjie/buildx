# buildx-web 设计规范 — OneDev 视觉对齐

BuildX 前端采用 **React + Go `/~api`**，展示效果必须与 OneDev Wicket UI **对齐**（布局、配色、组件形态、暗色模式、图标）。实现方式为**复刻**，不是换皮 MVP。

参考源码（只读）：`references/onedev/server-core/src/main/java/io/onedev/server/web/`

## 对齐原则

| 层级 | 做法 | 参考 |
|------|------|------|
| 设计令牌 | 直接复用 OneDev CSS 变量 | `web/asset/bootstrap/css/bootstrap-custom.css` |
| 全局样式 | 复用 `base.css`、`layout.css`、Bootstrap 定制 | `web/page/base/`、`web/page/layout/` |
| 布局壳 | DOM 结构与 class 名与 `LayoutPage.html` 一致 | sidebar + topbar + main |
| 图标 | 复用 `web/asset/icon/*.svg`，路径 `/~icon/{name}.svg` | 与 OneDev 相同 |
| 页面 | 按 Wicket 页面逐页对照实现 React 路由 | `web/page/**/{Name}Page.html` |
| 数据 | 仅通过 `/~api` 与 buildx-server 通信 | `rest/resource/*Resource.java` |

**不做**：自研另一套设计语言；**不做**：嵌入 Wicket HTML/JS 期望其独立运行。

## 验收标准

1. **并排对比**：同一数据下，buildx-web 与 OneDev 截图在布局、间距、字体、颜色上无明显差异。
2. **暗色模式**：`html.dark-mode` 行为与 OneDev 一致（localStorage / 顶栏切换）。
3. **响应式**：sidebar dock/mini、移动端 topbar 与 OneDev 断点一致。
4. **URL**：尽量保持 OneDev clean URL（如 `/{project}/~issues`、`/~projects`），便于文档与用户习惯迁移。
5. **无障碍**：保持 OneDev 已有的 aria/语义结构（随页面迁移补齐）。

## 资产同步

构建前从 reference 复制只读资产（不修改 submodule）：

```bash
make -C buildx-web sync-onedev-assets
```

复制内容：Bootstrap 定制 CSS、`base.css`、`layout.css`、全套 SVG 图标、logo。

## 页面迁移策略

**UI 先行，全量搬迁，API 后补。** 不以 buildx-server API 就绪作为页面开发的 gate。全部 223 个 OneDev 页面均需在 buildx-web 中实现路由与视觉；数据层经 mock/stub，后续替换为真实 `/~api`。

详细任务清单（按 Wave 分组、含路由与 DoD）：[buildx-web-migration.md](buildx-web-migration.md)

### 执行顺序（可并行，非 API 阻塞）

Wave 0 基础设施 → Wave 1–11 按域并行认领 → Wave 12 插件动态页

### 单页完成定义（DoD）

- [ ] 对照 `{Page}.html` + `{Page}.css` + 关联 JS 行为
- [ ] React 组件使用相同 class 名
- [ ] API 字段与 OneDev REST 响应形状一致
- [ ] 截图对比通过

## 技术栈

- **buildx-web**：React 19 + TypeScript + Vite
- **路由**：React Router（URL 对齐 OneDev `BaseUrlMapper`）
- **状态**：TanStack Query 拉取 `/~api`；WebSocket 阶段后续接入
- **组件**：优先原生 HTML + OneDev class；复杂控件（CodeMirror、xterm）后期按需引入 OneDev 同款 vendored 库

## 与 buildx-server 集成

- `make build`：`buildx-web` → `dist` → `webdist/` → `go:embed` → **单二进制**
- 开发：`vite dev` 代理 `/~api`、`/~icon`、`/~health` 到 `:6610`
- 生产：所有静态资源（含图标）嵌入二进制；`/~icon/*` 也可由 Go 静态 handler 提供以保持 URL 一致

## 视觉回归

后期在 CI 中：

1. 启动 OneDev（reference）与 buildx-server 各一份 fixture 数据
2. Playwright 同路由截图 diff
3. 阈值 &lt; 1% 像素差（排除动态时间戳区域）
