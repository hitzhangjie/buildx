# BuildX Web UI

独立前端工程，构建产物在 `make build` 时嵌入 `buildx-server` 二进制（单进程部署）。

## 开发

```bash
# 终端 1：后端
cd ../buildx-server && go run . serve --dev

# 终端 2：前端热更新（API 代理到 :6610）
cd buildx-web && npm ci && npm run dev
```

## 生产构建

在仓库根目录执行 `make` 即可：先构建 `buildx-web/dist`，再同步到 `buildx-server/internal/server/webdist/` 并 `go:embed` 进二进制。

仅后端快速迭代（跳过前端）：

```bash
make build-server SKIP_WEB=1
```

## 目录

| 路径 | 说明 |
|------|------|
| `src/` | React 源码 |
| `dist/` | Vite 构建输出（gitignore） |
| `../buildx-server/internal/server/webdist/` | 嵌入用同步目录 |
