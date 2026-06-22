# BuildX Web UI

React 前端，**视觉与 OneDev Wicket UI 对齐**，数据来自 buildx-server `/~api`。

设计规范：[../docs/buildx-web-design.md](../docs/buildx-web-design.md)  
**全量页面任务清单**：[../docs/buildx-web-migration.md](../docs/buildx-web-migration.md)（223 页，UI 先行、API 后补）

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
