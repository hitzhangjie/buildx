# BuildX Web UI

React 前端，**对 OneDev Wicket UI 做 1:1 复刻**（DOM、class、交互、暗色/响应式均以 `references/onedev` 为参照），数据来自 buildx-server `/~api`（未就绪时用 mock）。

设计规范：[../docs/buildx-web-design.md](../docs/buildx-web-design.md)  
**页面移植清单**：[../docs/buildx-web-migration.md](../docs/buildx-web-migration.md)（223 页；`PageRenderer` 仅为路由脚手架，不计入完成）

## 开发

```bash
# 同步 OneDev CSS/图标（从 references/onedev 只读复制）
make sync-onedev-assets

# 终端 1
cd ../buildx-server && go run . serve --dev

# 终端 2
npm ci && npm run dev
```

## 构建（嵌入 server 二进制）

仓库根目录 `make` 会自动：sync assets → vite build → sync-embed → go build。

## 页面对照

实现新页面时，对照 OneDev 源：

```
references/onedev/server-core/.../web/page/{area}/{Name}Page.html
```

DOM class 名与 OneDev 保持一致，CSS 复用 `public/onedev/css/`。

### 页面脚手架（可选）

从 Wicket HTML 生成 React 骨架（须再手工接 API/状态）：

```bash
go run ./buildx-server/cmd/pagegen \
  -html references/onedev/server-core/src/main/java/io/onedev/server/web/page/security/LoginPage.html \
  -page LoginPage \
  -out buildx-web/src/pages/security/LoginPage.generated.tsx
```
