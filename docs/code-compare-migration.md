# Code Compare（RevisionComparePage）迁移任务

对照 OneDev：`references/onedev/server-core/src/main/java/io/onedev/server/web/page/project/compare/`

**路由**：`/{project}/~compare`  
**React 入口**：`buildx-web/src/pages/project/RevisionComparePage.tsx`  
**API**：`GET /~api/repositories/{projectId}/compare`、`GET .../compare/patch`  
**状态（2026-06）**：专项页面已接 live API，功能约 **60%**；复刻列仍为 `~`（未过截图 DoD）。

相关总表：[buildx-web-migration.md](buildx-web-migration.md) Wave 2。

---

## 已完成

### 服务端（buildx-server）

| 项 | 实现位置 | 说明 |
|----|----------|------|
| Merge base | `internal/git/compare.go` → `MergeBase` | 原生 `git merge-base` |
| 两 revision 树 diff | `DiffRevisions` | go-git 默认；非默认 whitespace 走 `git diff` |
| Commits 区间列表 | `ListCommitsSince` | merge-base（或 left）→ right，不含 base |
| Patch 下载 | `ExportPatch` + `ComparePatch` handler | `GET .../compare/patch?old=&new=` |
| Compare 汇总 API | `internal/server/api/compare.go` | query：`left`、`right`、`compare-with-merge-base`、`include-commits`、`include-diffs`、`include-effective-pull-request`、`path-filter`、`whitespace-option`、`count` |
| Effective PR 查询 | `pullrequest.DBStore.FindEffective` | OPEN 或 MERGED 且 build commit 匹配 |
| Compare 评论列表 | `codecomment.ListByCommitHashes` | `GET .../code-comments?oldCommitHash=&newCommitHash=` |
| 测试 | `internal/git/compare_test.go`、`repositories_test.go`、`codecomment/store_test.go` | |

### 前端（buildx-web）

| 项 | 实现位置 | 说明 |
|----|----------|------|
| 页面骨架 | `RevisionComparePage.tsx` | 对齐 `RevisionComparePage.html` 双栏 + swap + alerts |
| Revision 选择 | `CompareRevisionPicker.tsx` | 分支/标签/自定义 revision（**单项目**） |
| URL 状态 | `useSearchParams` | `left`、`right`、`compare-with-merge-base`、`tab`、`path-filter`、`commit-query`、`whitespace-option`、`comment` |
| Commits Tab | 内联 commit 列表 | 客户端 query 过滤；`with-merge-base` class |
| File Changes Tab | `RevisionDiffPanel.tsx` | path 过滤、导航树、patch 下载、whitespace、Unified/Split |
| Code comment 只读 | `RevisionDiffPanel` + `fetchCompareCodeComments` | 文件头 badge、侧栏、`comment` 深链 |
| Effective PR / Create PR | `RevisionComparePage` | 绿色 alert；`~pulls/new?source=&target=` |
| 样式 | `revision-compare-page.css`、`revision-diff-panel.css` | 部分同步 OneDev asset |

---

## 待完成（建议顺序）

### P0 — 与 OneDev 核心交互对齐

- [ ] **AffinalRevisionPicker**（跨项目 / fork）
  - OneDev：`web/component/revision/AffinalRevisionPicker` + `ProjectPicker`
  - 依赖：buildx 尚无 fork 模型（`forkRoot` / `forkDescendants`）；可先只做同账号下多项目 picker，或等 `o_Project` fork 字段移植
  - URL：`left`/`right` 需支持 `projectId:revision` 或 `project/path:branch`（见 `ProjectAndRevision`）
- [ ] **Diff 内新建 code comment**
  - OneDev：`RevisionDiffPanel` + `BlobDiffPanel` 选区 + `RevisionAnnotationSupport`
  - 复用：`SourceView` 选区、`createCodeComment` API；需在 unified/split diff 上接 selection（或跳转 blob 页带 compare 回链）
- [ ] **Comment 线程完整交互**
  - 侧栏内 reply / resolve / delete（当前仅「Open in file view」）
  - `mark` URL 参数与 permanent link（OneDev `getMarkUrl`）
- [ ] **PullRequestChangesPage 接 compare API**
  - `buildx-web/src/pages/project/pullrequests/PullRequestChangesPage.tsx` 仍为 mock；应复用 `RevisionDiffPanel` + PR merge-base

### P1 — RevisionDiffPanel 深度对齐

- [ ] **BlobDiffPanel 级 diff 渲染**（语法高亮、行号、gutter）
  - 参考：`web/component/diff/revision/RevisionDiffPanel.java`、`blob/BlobDiffPanel`
  - 可渐进：先单文件用 read-only CodeMirror（同 `SourceView`）
- [ ] **Diff 统计条**（`diff-stat-bar`、增删文件图标）
- [ ] **Too many files / too many lines 警告**（`WebConstants.MAX_DIFF_FILES` 等）
- [ ] **Revision indexing 提示**（`revisionsIndexing` alert，符号索引进行中）
- [ ] **Review progress**（PR review 进度条，仅 PR/compare 有 review 时）
- [ ] **Blame**（`blame-file` query param）
- [ ] **Batched suggestions**（`batchedSuggestions`、suggestion apply — 依赖 PR suggestion 后端）

### P2 — Commits Tab 与查询

- [ ] **CommitQuery 解析**（OneDev `commit-query` + `RevisionCriteria`）
  - 当前：简单字符串 filter subject/hash/author
  - 目标：merge-base..right 图遍历 + 可选包含 left 支（`with-merge-base` 列表样式）
- [ ] **Commit 列表 Panel 对齐**（`CommitListPanel` DOM：filter、order、merge-base 标记）

### P3 — 工程与验收

- [ ] **Playwright 截图对比** `/{project}/~compare`（明/暗、有 diff / 无 diff）
- [ ] **E2E**：选分支 → File Changes → 下载 patch → 打开 comment 深链
- [ ] **文档**：`buildx-web-migration.md` 复刻列改 `✓`（仅截图通过后）
- [ ] **changelog / ROADMAP** 发布时从 `[Unreleased]` 归档

---

## OneDev URL 参数对照

| OneDev (`RevisionComparePage`) | BuildX 现状 |
|--------------------------------|-------------|
| `left` | ✅ |
| `right` | ✅ |
| `compare-with-merge-base`（默认 true） | ✅ |
| `tab`：`COMMITS` / `FILE_CHANGES` | ✅ |
| `path-filter` | ✅ |
| `commit-query` | ⚠️ 仅客户端 filter |
| `whitespace-option` | ✅ |
| `comment` | ✅ 打开侧栏 |
| `mark` | ❌ |
| `blame-file` | ❌ |
| cross-project `left`/`right` | ❌ |

---

## 代码地图

```
buildx-server/
  internal/git/compare.go          # MergeBase, DiffRevisions, ExportPatch, ListCommitsSince
  internal/server/api/compare.go   # Compare, ComparePatch handlers
  internal/pullrequest/store.go    # FindEffective
  internal/codecomment/store.go    # ListByCommitHashes

buildx-web/
  src/pages/project/RevisionComparePage.tsx
  src/pages/project/revision-compare-page.css
  src/components/onedev/panels/
    CompareRevisionPicker.tsx
    RevisionDiffPanel.tsx
    revision-diff-panel.css
  src/api/compare.ts
  src/api/codeComments.ts          # fetchCompareCodeComments
  src/util/diffView.ts             # Split 解析、view mode localStorage

references/onedev/（只读）
  web/page/project/compare/RevisionComparePage.{html,java}
  web/component/diff/revision/RevisionDiffPanel.{html,java}
  web/component/revision/AffinalRevisionPicker.{html,java}
  web/asset/revisioncompare/revision-compare.css
```

---

## 本地验证

```bash
# 终端 1
cd buildx-server && go run . serve --dev

# 终端 2
cd buildx-web && npm run dev

# 示例 URL
# /{project}/~compare?left=main&right=feature&tab=FILE_CHANGES
# /{project}/~compare?left=main&right=feature&comment=1&tab=FILE_CHANGES
```

```bash
# API 冒烟
curl -u user:pass 'http://localhost:9910/~api/repositories/1/compare?left=main&right=feature&include-diffs=true'
curl -u user:pass 'http://localhost:9910/~api/repositories/1/compare/patch?old=main&new=feature' -o changes.patch
```

---

## 建议下一 PR 范围

**推荐**：`PullRequestChangesPage` 接 live diff + 复用 `RevisionDiffPanel`（与 compare 共享，收益大、不阻塞 fork）。

**或**：Compare 页 diff 内新建 comment（选区 → `POST /~api/code-comments`，侧栏线程）。

**暂缓**：AffinalRevisionPicker（需 server 先定义 fork / 多仓库 compare 语义）。
