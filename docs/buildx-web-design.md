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

**目标：对 OneDev Wicket UI 做 1:1 复刻。** BuildX 是 OneDev 的 ground-up 移植，前端不是换皮 MVP，也不是「能打开就行」的占位页。每一页都必须以 OneDev 源码为唯一参照物，在 DOM 结构、class 名、布局、交互与暗色/响应式行为上与原站一致。

详细任务清单（按 Wave 分组、含路由与 DoD）：[buildx-web-migration.md](buildx-web-migration.md)

### 与占位方案的关系

当前 `PageRenderer` 通用模板仅作**路由脚手架**（保证 URL 可导航、开发期不白屏），**不算完成**。某页标记为「完成」的唯一标准是下方 DoD 全部满足，且与 OneDev 并排截图对比通过。

### 执行顺序

1. **Wave 0** 基础设施（布局壳、资产同步、共享组件、API/mock 层）— 已基本就绪
2. **Wave 1–11** 按域**逐页 1:1 移植**（每页独立 React 组件，对照 Wicket HTML/CSS/JS）
3. **Wave 12** 插件动态页
4. API 可在页面复刻过程中并行补齐；数据层经 mock/fixture 先行，字段形状须与 OneDev REST 一致，后续切换为 live `/~api`

同一 Wave 内多页可并行，但**不得**用通用模板批量「勾选完成」。

### 单页完成定义（DoD）— 唯一验收标准

- [ ] 对照 `references/onedev/.../web/page/**/{Name}Page.html` + 同名 `.css` + 页面关联 Panel/Behavior
- [ ] React 组件 DOM 结构与 class 名与 Wicket 渲染结果一致（含 aria、嵌套层级）
- [ ] 页面级交互已移植（筛选、分页、内联编辑、Ajax 反馈等；复杂控件用 OneDev 同款 vendored 库）
- [ ] 暗色模式与响应式断点与 OneDev 一致
- [ ] `src/api/` 声明的响应字段与 OneDev `*Resource.java` 一致（可先 mock）
- [ ] Playwright 同路由截图对比通过（与 reference OneDev 实例、相同 fixture 数据）

### 单页移植工作流

1. **读参照物**：`{Name}Page.html`、`.java`、子 Panel（`web/page/**`）、页面 CSS、关联 `web/asset` JS
2. **（可选）生成脚手架**：`go run ./buildx-server/cmd/pagegen -html <Page.html> -page <Name> -out buildx-web/src/pages/...` — 将 Wicket 标记转为 JSX 骨架，再手工接状态与 API
3. **建专项组件**：`buildx-web/src/pages/{area}/{Name}Page.tsx`（或按域分子目录），禁止长期留在 `PageRenderer`
3. **抽共享 Panel**：多个页面复用的块迁入 `src/components/onedev/panels/`（对照 Wicket Panel 命名）
4. **接数据**：`src/api/` + fixture；字段名与 REST 资源对齐
5. **注册路由**：`AppRouter` / `globalRoutes` / `projectRoutes` 指向专项组件
6. **验收**：本地并排打开 OneDev 与 buildx-web → 截图 diff → PR 附对比图

参照源码根目录（只读 submodule）：

```
references/onedev/server-core/src/main/java/io/onedev/server/web/
```

## 技术栈

- **buildx-web**：React 19 + TypeScript + Vite
- **路由**：React Router（URL 对齐 OneDev `BaseUrlMapper`）
- **状态**：TanStack Query 拉取 `/~api`；WebSocket 阶段后续接入
- **组件**：优先原生 HTML + OneDev class；复杂控件（CodeMirror、xterm）后期按需引入 OneDev 同款 vendored 库

## 与 buildx-server 集成

- `make build`：`buildx-web` → `dist` → `webdist/` → `go:embed` → **单二进制**
- 开发：`vite dev` 代理 `/~api`、`/~icon`、`/~health` 到 `:9910`
- 生产：所有静态资源（含图标）嵌入二进制；`/~icon/*` 也可由 Go 静态 handler 提供以保持 URL 一致

## 视觉回归

后期在 CI 中：

1. 启动 OneDev（reference）与 buildx-server 各一份 fixture 数据
2. Playwright 同路由截图 diff
3. 阈值 &lt; 1% 像素差（排除动态时间戳区域）
