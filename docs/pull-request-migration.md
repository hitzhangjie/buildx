# Pull Request 迁移任务书

与 OneDev 对齐的 PR 功能迁移进度与后续工作清单。  
参考源码根：`references/onedev/server-core/src/main/java/io/onedev/server/`

相关文档：

- 页面路由总表：[buildx-web-migration.md](buildx-web-migration.md) Wave 4
- REST API 追踪：[buildx-server-api-migration.md](buildx-server-api-migration.md)
- 阶段里程碑：[ROADMAP.md](ROADMAP.md) Phase 2
- Changes 内联 diff 依赖：[code-compare-migration.md](code-compare-migration.md)

---

## 续做入口（从这里开始）

**建议下一批：批次 A — 详情页补齐**（Web 为主，改动面小、用户感知强）

| # | 任务 | 状态 | 落点 |
|---|------|------|------|
| A1 | 标题/描述内联编辑 | ⬜ | API 已有 `POST .../title|description`；改 `PullRequestActivitiesPage` + `PullRequestDetailShell` |
| A2 | Merge 对话框（commit message） | ⬜ | 对照 `MergePullRequestOptionPanel`；`mergePullRequest` 需传 message body |
| A3 | Assignee 侧栏 | ⬜ | 新 `AssignmentListPanel` + `/pull-request-assignments` 最小 CRUD |
| A4 | Changes 页内联 diff | ⬜ | 复用 `RevisionComparePage` 的 diff 组件；compare API 已有 |
| A5 | Code comments 按 PR 范围过滤 | ⬜ | `PullRequestCodeCommentsPage`；或后端 PR-scoped 列表 |

**本批已完成（2026-06-24）**

- [x] SQLite 迁移 `006_pull_request.sql` + `PullRequestService`（open/query/merge/discard/reopen）
- [x] REST `/~api/pulls` 主端点 + comments/reviews/merge-preview/merge-strategy
- [x] Merge：fast-forward、merge commit、squash（**无 rebase**）
- [x] Web：全局/项目列表、新建（分支选择）、详情三 Tab、Invalid 跳转
- [x] Reviewer 侧栏：添加/移除、Approve / Request changes / Pending
- [x] Merge strategy 下拉接 API
- [x] `IssuePullRequestsPage` 接 live 列表（`Includes Issue` 为 `#N` 模糊匹配，非正式索引）
- [x] 路由：`prInvalid`、`pullRequestSetting` 已注册

**后续批次速览**：B 合并与门禁（rebase、required approvals、changes 审计）→ C 列表查询 → D 项目设置持久化 → E CI/auto-merge（依赖 Build 模块）

---

## 当前状态（2026-06-24）

**可跑通的主流程**：创建项目 → push 分支 → 新建 PR → 查看列表/详情 → 评论 → 添加 reviewer → Approve/Request changes → Merge（fast-forward / merge commit / squash）/ Discard / Reopen。

**尚未达到 OneDev DoD**：无截图验收（`✓`）；侧边栏、diff 查看器、CI 门禁、项目设置持久化、完整查询语法等仍缺。

| 层 | 完成度 | 说明 |
|----|--------|------|
| 后端持久化 | ~40% | `o_PullRequest` / `Comment` / `Review`；无 Assignment/Label/Watch/Change 审计表 |
| 后端业务 | ~35% | open/query/merge/discard/reopen/review；无 rebase merge、branch protection、auto-merge |
| REST `/~api/pulls` | ~45% | 见下文端点表 |
| Web 页面 | ~50% | 主流程页 live；列表 filter/saved queries、内联 diff、more-info 全量未齐 |
| 1:1 视觉/交互 | ~30% | 专用组件已有，DOM/CSS 与 OneDev 仍有差距 |

---

## 代码地图（BuildX）

### buildx-server

| 路径 | 职责 |
|------|------|
| `internal/persistence/sqlite/migrations/006_pull_request.sql` | PR / Comment / Review 表 |
| `internal/model/pull_request.go` | 模型与 `PullRequestOpenData` |
| `internal/pullrequest/store.go` | SQLite CRUD、query、review |
| `internal/pullrequest/service.go` | open、merge（ff/merge-commit/squash）、discard、reopen、review、`ParseQuery` |
| `internal/pullrequest/query.go` | `"Number" is "path#N"` 解析 |
| `internal/server/api/pull_requests.go` | HTTP handlers |
| `internal/server/server.go` | 路由注册（`/pulls`、`/pull-request-*`） |

测试：`internal/pullrequest/store_test.go`（含 fast-forward merge 集成测）。

### buildx-web

| 路径 | 职责 |
|------|------|
| `src/api/pullRequests.ts` | 客户端；路径为 `/~api/pulls`（非 `/pull-requests`） |
| `src/hooks/usePullRequestDetail.ts` | 详情页加载；不存在时跳转 `.../invalid` |
| `src/components/onedev/panels/PullRequestDetailShell.tsx` | 详情壳：状态栏、操作、Tab、Reviewers/Merge strategy 侧栏 |
| `src/components/onedev/panels/ReviewListPanel.tsx` | Reviewer 列表 |
| `src/pages/PullRequestsPage.tsx` | 全局 `/~pulls` |
| `src/pages/project/pullrequests/*` | 项目列表、新建、Activities/Changes/CodeComments、Invalid |
| `src/pages/project/issues/IssuePullRequestsPage.tsx` | Issue 关联 PR 列表 |
| `src/pages/project/settings/PullRequestSettingPage.tsx` | 项目 PR 设置（UI only） |
| `src/routes/projectRoutes.ts` + `AppRouter.tsx` | `prList`、`prActivities`、`prInvalid`、`pullRequestSetting` 等 |

### OneDev 对照（优先阅读顺序）

| 用途 | 参考路径 |
|------|----------|
| REST | `rest/resource/PullRequestResource.java` |
| REST 评论/评审 | `PullRequestCommentResource.java`、`PullRequestReviewResource.java` |
| 领域服务 | `service/PullRequestService.java`、`DefaultPullRequestService.java` |
| 列表 Panel | `web/component/pullrequest/list/PullRequestListPanel.java` + `.html` |
| 详情页 | `web/page/project/pullrequests/detail/PullRequestDetailPage.java` + `.html` |
| 新建页 | `web/page/project/pullrequests/create/NewPullRequestPage.java` |
| 项目设置 | `web/page/project/setting/code/pullrequest/PullRequestSettingPage.java` |
| 查询语法 | `search/entity/pullrequest/PullRequestQuery.java` |

---

## REST API 端点对照

路径前缀均为 `/~api`。✅ 已实现 · ⬜ 未实现 · 🔶 部分（行为或字段未齐）。

### PullRequestResource (`/pulls`)

| 方法 | 路径 | 状态 | 备注 |
|------|------|------|------|
| GET | `/pulls` | ✅ | `query`/`offset`/`count`；支持 `"Target Project" is "path"`、`"Number" is "path#N"`、`"Includes Issue" is "path#N"`（description 模糊匹配 `#N`） |
| POST | `/pulls` | ✅ | 返回新 PR id |
| GET | `/pulls/{requestId}` | ✅ | |
| GET | `/pulls/{requestId}/merge-preview` | ✅ | conflict 检测 |
| GET | `/pulls/{requestId}/comments` | ✅ | |
| GET | `/pulls/{requestId}/reviews` | ✅ | 排除 EXCLUDED |
| POST | `/pulls/{requestId}/title` | ✅ | body: JSON string |
| POST | `/pulls/{requestId}/description` | ✅ | |
| POST | `/pulls/{requestId}/merge-strategy` | ✅ | body: JSON strategy 枚举 |
| POST | `/pulls/{requestId}/merge` | 🔶 | ff + merge commit + squash；**无 rebase** |
| POST | `/pulls/{requestId}/discard` | ✅ | |
| POST | `/pulls/{requestId}/reopen` | ✅ | |
| GET | `/pulls/{requestId}/assignments` | ⬜ | |
| GET | `/pulls/{requestId}/labels` | ⬜ | |
| GET | `/pulls/{requestId}/watches` | ⬜ | |
| GET | `/pulls/{requestId}/updates` | ⬜ | 源分支 head 更新记录 |
| GET | `/pulls/{requestId}/changes` | ⬜ | 活动审计（title/description 变更等） |
| GET | `/pulls/{requestId}/current-builds` | ⬜ | |
| GET | `/pulls/{requestId}/fixed-issue-ids` | ⬜ | |
| POST | `/pulls/{requestId}/auto-merge` | ⬜ | |
| POST | `/pulls/{requestId}/delete-source-branch` | ⬜ | |
| POST | `/pulls/{requestId}/restore-source-branch` | ⬜ | |
| POST | `/pulls/{requestId}/attachments/{name}` | ⬜ | |
| DELETE | `/pulls/{requestId}` | ⬜ | |

### 关联 Resource

| Resource | 状态 | 备注 |
|----------|------|------|
| `POST /pull-request-comments` | ✅ | create |
| `GET /pull-request-comments/{id}` | ⬜ | |
| `POST /pull-request-reviews` | 🔶 | approve/request changes/pending/excluded；支持 `userId` 添加 reviewer |
| `POST /pull-request-reviews/{id}` | ⬜ | update（OneDev 仅支持 exclude） |
| `/pull-request-assignments` | ⬜ | |
| `/pull-request-labels` | ⬜ | |
| `/pull-request-watches` | ⬜ | |

### CLI（buildx-cli）

| 命令 | Server 端点 | 状态 |
|------|-------------|------|
| `pr list` | `GET /~api/cli/query-pull-requests` | ⬜ |
| `pr get` | `GET /~api/cli/get-pull-request` | ⬜ |

---

## Web 页面任务清单

图例：**API** `live` / `partial` / `stub` · **复刻** `—` 未做 / `~` 有组件未验收 / `✓` 截图通过

| 路由 | 组件 | API | 复刻 | 待办 |
|------|------|-----|------|------|
| `/~pulls` | `PullRequestsPage` | live | ~ | Saved queries、Filter、Order by；列表行 reviews/jobs 列 |
| `/:project/~pulls` | `ProjectPullRequestsPage` | live | ~ | 同上；对齐 `PullRequestListPanel.html` fragment |
| `/:project/~pulls/new` | `NewPullRequestPage` | live | ~ | 跨项目 source、diff 预览、reviewer/assignee 选择器（OneDev choice） |
| `/:project/~pulls/:request` | `PullRequestActivitiesPage` | live | ~ | 标题内联编辑、activity 类型分渲染（merge/approve/…）、more-info 全侧边栏 |
| `.../changes` | `PullRequestChangesPage` | live | ~ | **内联 diff**（复用 `RevisionDiffPanel`）；按文件 review 状态 |
| `.../code-comments` | `PullRequestCodeCommentsPage` | partial | ~ | PR 范围 code comment 索引（非全项目过滤） |
| `.../invalid` | `InvalidPullRequestPage` | live | ~ | 对齐 OneDev 文案/布局；已注册 `prInvalid` |
| `/:project/~issues/:issue/pulls` | `IssuePullRequestsPage` | partial | ~ | 改用正式 `IncludesIssue` 索引（非 `#N` 模糊匹配） |
| `/:project/~settings/pull-request` | `PullRequestSettingPage` | stub | — | 持久化 `ProjectPullRequestSetting`；已注册 `pullRequestSetting` |
| admin PR 邮件模板 ×2 | `PageRenderer` | stub | — | Wave 10 |

### 详情页侧边栏（`PullRequestDetailPage.html` more-info）

| 区块 | 状态 | 参考 Panel |
|------|------|------------|
| Submitter / Target / Source | 🔶 | 仅在主区展示分支，缺 change target branch |
| Reviewers | ✅ | `ReviewListPanel` |
| Jobs (CI) | ⬜ | `PullRequestJobsPanel` |
| Assignees | ⬜ | `AssignmentListPanel` |
| Merge Strategy | ✅ | 下拉已接 API |
| Auto Merge | ⬜ | toggle + commit message |
| Labels | ⬜ | `EntityLabelsPanel` |
| Watches | ⬜ | |
| Delete / Synchronize | ⬜ | |

### 共享组件待抽取

| OneDev Panel | 建议 BuildX 路径 | 优先级 |
|--------------|------------------|--------|
| `PullRequestListPanel` | `components/onedev/panels/PullRequestListPanel.tsx` | P1 |
| `PullRequestFilterPanel` | 同上目录 | P2 |
| `AssignmentListPanel` | `panels/AssignmentListPanel.tsx` | P1 |
| `PullRequestJobsPanel` | `panels/PullRequestJobsPanel.tsx` | P2（依赖 Build） |
| `MergePullRequestOptionPanel` | merge 对话框 | P1 |
| `RequestStatusBadge` | `panels/RequestStatusBadge.tsx` | P2 |

---

## 推荐实施顺序

### 批次 A — 详情页补齐（Web 为主，少量 API）

**前置**：Changes 内联 diff 需熟悉 [code-compare-migration.md](code-compare-migration.md) 中 `RevisionComparePage` / compare API 用法。

1. 标题/描述内联编辑 → 已有 `POST .../title|description`，接 UI
2. `MergePullRequestOptionPanel`：合并前 commit message 输入（扩展 `POST .../merge` body）
3. `AssignmentListPanel` + `PullRequestAssignmentResource` 最小实现
4. Changes 页接入 `RevisionDiffPanel`（compare API 已有）
5. Code comments 页：按 PR compare base/head 过滤（或后端 PR-scoped 列表）

### 批次 B — 合并与门禁（Server 为主）

1. `REBASE_SOURCE_BRANCH_COMMITS` git 实现
2. Merge 门禁：required approvals（读项目设置 + review 计数）
3. `GET /pulls/{id}/changes` 审计表 + activity 渲染
4. `fixed-issue-ids` + Issue↔PR 正式关联（替代 `#N` 模糊查询）
5. `DELETE /pulls/{id}`、`delete-source-branch`

### 批次 C — 列表与查询

1. `PullRequestListPanel` 共享组件 + 全局/项目列表复用
2. `PullRequestQuery` 子集移植（open、approved by me、assigned to me、order by）
3. Saved queries / Filter UI（可先 localStorage，后持久化）

### 批次 D — 设置与通知

1. `ProjectPullRequestSetting` 表 + settings API
2. `PullRequestSettingPage` 接 live API
3. Admin 邮件模板页（低优）

### 批次 E — CI 与 Auto-merge（依赖 Build 模块）

1. `current-builds`、`PullRequestJobsPanel`
2. merge 门禁：required builds
3. `auto-merge` API + UI toggle

---

## 本地验证

```bash
# Terminal 1
cd buildx-server && go run . serve --dev

# Terminal 2
cd buildx-web && npm run dev

# 测试
cd buildx-server && go test ./internal/pullrequest/... -count=1
```

典型路径：

1. `/{project}/~pulls/new` — 选分支创建 PR  
2. `/{project}/~pulls/{n}` — Approve、Merge  
3. `/{project}/~pulls/{n}/changes` — 查看文件变更列表  
4. 访问不存在的 `/{project}/~pulls/99999` — 应跳转 `.../invalid`

---

## 已知偏差与陷阱

| 项 | 说明 |
|----|------|
| API 路径 | OneDev 为 `/~api/pulls`，**不是** `/pull-requests` |
| ID vs Number | REST 用 `requestId`；URL 用项目内 `number`；查询用 `"Number" is "path#N"` |
| 路由参数 | React Router 参数名为 `request`，不是 `number` |
| Merge strategy | `CREATE_MERGE_COMMIT_IF_NECESSARY` 在服务端：能 ff 则 ff，否则 merge commit |
| Issue PR 列表 | 当前用 description `LIKE %#N%`，与 OneDev `IncludesIssueCriteria` 不等价 |
| PR 设置页 | 保存仅为本地 feedback，无后端 |
| 评审门禁 | UI 在有 PENDING/REQUESTED_FOR_CHANGES 时禁用 Merge，但未读项目 required approvals |
| 全站 `npm run build` | 可能因 **Build** 模块 TS 错误失败，与 PR 无关；PR 相关文件可单独 `tsc` 验证 |
| `go test ./internal/server/api` | 若 `codecomment` 包有编译错误，与 PR 无关；PR 包测：`go test ./internal/pullrequest/...` |

---

## 相关 PR 改动文件（git 未提交时对照）

便于 `git diff` 或新会话快速定位：

**Server**：`internal/pullrequest/*`、`internal/model/pull_request.go`、`internal/server/api/pull_requests.go`、`internal/server/server.go`、`migrations/006_pull_request.sql`

**Web**：`src/api/pullRequests.ts`、`src/hooks/usePullRequestDetail.ts`、`src/components/onedev/panels/PullRequestDetailShell.tsx`、`ReviewListPanel.tsx`、`src/pages/project/pullrequests/*`、`IssuePullRequestsPage.tsx`、`PullRequestSettingPage.tsx`、`routes/*`

---

## 完成标准（单页 DoD 提醒）

每页从 `~` → `✓` 需满足 [buildx-web-design.md](buildx-web-design.md) 中单页 DoD：Wicket HTML/CSS 对照、交互、暗色/响应式、API 字段对齐、Playwright 截图对比。

完成一批后更新：`changelog.md`、`docs/ROADMAP.md`、本文件、`buildx-web-migration.md` Wave 4 表。
