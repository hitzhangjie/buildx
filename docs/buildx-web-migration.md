# buildx-web 页面迁移任务清单

**策略：以 OneDev Wicket UI 为参照物，逐页 1:1 复刻；API 可后补，但不得用占位模板冒充完成。**

buildx-web 的目标是完整移植 OneDev 前端体验：每一页对照 `{Name}Page.html` + CSS + 关联 Panel/JS 在 React 中复刻。`buildx-server` API 未就绪时可用 mock/fixture，但 DOM、布局、交互必须与 OneDev 一致。`PageRenderer` 仅为路由脚手架，**不计入复刻进度**。

设计规范（视觉对齐）：[buildx-web-design.md](buildx-web-design.md)

**领域专项任务书**（续做 PR / Compare / Issue 时优先打开）：

| 文档 | 范围 |
|------|------|
| [pull-request-migration.md](pull-request-migration.md) | Pull Request（Wave 4） |
| [code-compare-migration.md](code-compare-migration.md) | Code Compare（Wave 2，PR Changes 内联 diff） |
| [buildspec-editor-migration.md](buildspec-editor-migration.md) | Buildspec 编辑器（Wave 2，`.onedev-buildspec.yml`） |
| [buildx-web-migration.md § Wave 3 续做指南](buildx-web-migration.md#wave-3-续做指南issue--看板--迭代) | Issue / 看板 / 迭代 |

OneDev 路由来源：`references/onedev/server-core/.../web/mapper/BaseUrlMapper.java`  
OneDev 页面总数：**223** 个 `*Page.java`（含抽象模板基类若干）

---

## 核心原则

| 原则 | 说明 |
|------|------|
| **1:1 复刻** | 以 OneDev 页面为唯一参照；DOM/class/交互/响应式与原版一致；见 [buildx-web-design.md](buildx-web-design.md) |
| **全量覆盖** | 223 页均需专项实现；不以「有 API 才做页面」为 gate |
| **URL 兼容** | 路径与 OneDev `BaseUrlMapper` 保持一致（含 `~` 前缀） |
| **数据解耦** | 经 `src/api/` 访问后端；未实现 API 走 `src/mocks/`，字段形状与 REST 一致 |
| **单二进制** | `make build` → embed → 仅运行 `buildx-server serve` |

### 状态列说明（两张进度表）

下表 **路由** 列表示 URL 是否已注册、能否打开（含 `PageRenderer` 占位）。

**复刻** 列表示是否达到 1:1 DoD（与 OneDev 截图对比通过）：

| 复刻 | 含义 |
|------|------|
| `—` | 仅路由占位（`PageRenderer` 或未实现） |
| `~` | 专项组件已建，但与 OneDev 仍有明显视觉/交互差距 |
| `✓` | 1:1 DoD 全部满足，截图验收通过 |

### 单页完成定义（DoD）

见 [buildx-web-design.md#单页完成定义dod--唯一验收标准](buildx-web-design.md#单页完成定义dod--唯一验收标准)。**仅当复刻列为 `✓` 时，该页算完成。**

### API 状态标记（buildx-server 补齐时更新）

| 标记 | 含义 |
|------|------|
| `—` | 尚未声明 API |
| `stub` | 前端 mock / 501 placeholder |
| `partial` | 部分 endpoint 已在 buildx-server 实现 |
| `live` | 已接真实 API |

---

## Wave 0 — 基础设施（阻塞所有页面）

| ID | 任务 | 状态 |
|----|------|------|
| W0-1 | React Router：注册全部 URL（可先渲染 `PageShell` 占位） | [x] |
| W0-2 | `LayoutPage` 壳：sidebar / topbar / dark-mode / 响应式 | [x] 全局 + 项目侧栏 (`ProjectLayout`) |
| W0-3 | `sync-onedev-assets`：CSS + 图标 + logo | [x] |
| W0-4 | 共享组件库：`src/components/onedev/`（Button, Card, Table, Alert, Dropdown, …） | [x] 基础组件 + `global-list/` |
| W0-5 | API 层：`src/api/client.ts` + 按 Resource 分模块 | [x] client + stub 层 |
| W0-6 | Mock 层：`src/mocks/fixtures/` + `USE_MOCK` 开关 | [x] `VITE_USE_MOCK` |
| W0-7 | 项目上下文：`ProjectContext`（解析 `/{project}` 路径） | [x] |
| W0-8 | 认证上下文：session / Basic / Bearer（登录前 stub） | [x] Basic auth + `/~api/users/me` |
| W0-9 | 全局反馈：`session-feedback`、`ajax-loading-indicator` | [x] flash + loading util |
| W0-10 | 复杂控件适配：CodeMirror、xterm、Mermaid、Pickr 等（从 OneDev asset 引入） | [~] log/terminal 占位；完整控件待 API 阶段 |
| W0-11 | WebSocket 客户端骨架（ChangeObserver 等价，先 no-op） | [x] |
| W0-12 | 404/错误页：`PageNotFoundErrorPage` | [x] |
| W0-13 | 视觉回归：Playwright 截图对比脚手架 | [x] |

---

## Wave 1 — 安全、初始化、全局列表

### 1.1 安全 / 账户（Security）

| 路由 | OneDev 页面 | 参考路径 | API | 路由 | 复刻 | 备注 |
|------|-------------|----------|-----|------|------|------|
| `/~login` | LoginPage | `web/page/security/LoginPage` | partial | [x] | ~ | `src/pages/security/LoginPage.tsx` |
| `/~logout` | LogoutPage | `web/page/security/LogoutPage` | stub | [x] | — | |
| `/~signup` | SignUpPage | `web/page/security/SignUpPage` | partial | [x] | ~ | `src/pages/security/SignUpPage.tsx` — BeanEditor fields |
| `/~reset-password/:code` | PasswordResetPage | `web/page/security/PasswordResetPage` | stub | [x] | — | |
| `/~verify-email-address/...` | EmailAddressVerificationPage | `web/page/security/EmailAddressVerificationPage` | stub | [x] | — | |
| `/~create-user-from-invitation/...` | CreateUserFromInvitationPage | `web/page/security/CreateUserFromInvitationPage` | stub | [x] | — | |
| `/~sso/...` | SsoProcessPage | `web/page/security/SsoProcessPage` | stub | [x] | — | |
| OAuth callback | OAuthCallbackPage | `web/page/security/OAuthCallbackPage` | stub | [x] | — | |

### 1.2 服务器初始化

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/~init` | ServerInitPage | `web/page/serverinit/ServerInitPage` | partial | [~] admin wizard stub |

### 1.3 全局资源列表

| 路由 | OneDev 页面 | 参考路径 | API | 路由 | 复刻 |
|------|-------------|----------|-----|------|------|
| `/~projects` | ProjectListPage | `web/page/project/ProjectListPage` | partial | [x] | ~ | `ProjectListPanel` + `SavedQueriesPanel` |
| `/~projects/new` | NewProjectPage | `web/page/project/NewProjectPage` | partial | [x] | ~ | `src/pages/project/NewProjectPage.tsx` — BeanEditor + switches |
| `/~projects/import/:importer` | ProjectImportPage | `web/page/project/imports/ProjectImportPage` | stub | [x] | — |
| `/~issues` | IssueListPage | `web/page/issues/IssueListPage` | partial | [x] | ~ |
| `/~pulls` | PullRequestListPage | `web/page/pullrequests/PullRequestListPage` | live | [x] | ~ |
| `/~builds` | BuildListPage | `web/page/builds/BuildListPage` | live | [x] | ~ |
| `/~packages` | PackListPage | `web/page/packs/PackListPage` | stub | [x] | ~ |
| `/~workspaces` | WorkspaceListPage | `web/page/workspaces/WorkspaceListPage` | stub | [x] | ~ |

> Wave 2–11 各表沿用 **路由 / 复刻** 两列；尚未逐行标注的页面默认 **路由** `[x]`、**复刻** `—`（`PageRenderer` 占位）。

---

## Wave 2 — 项目内：代码 / Git

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project` | ProjectDashboardPage | `web/page/project/dashboard/ProjectDashboardPage` | stub | [x] redirect to `~files` |
| `/:project/~files` | ProjectBlobPage | `web/page/project/blob/ProjectBlobPage` + `.../render/renderers/buildspec/` | partial | [~] 目录/文件 browse + edit/delete/download；`.onedev-buildspec.yml` 双模式编辑器 ~70% — [buildspec-editor-migration.md](buildspec-editor-migration.md) |
| `/:project/~commits` | ProjectCommitsPage | `web/page/project/commits/ProjectCommitsPage` | stub | [x] |
| `/:project/~commits/:commit` | CommitDetailPage | `web/page/project/commits/CommitDetailPage` | stub | [x] |
| `/:project/~compare` | RevisionComparePage | `web/page/project/compare/RevisionComparePage` | partial | [~] 见 [code-compare-migration.md](code-compare-migration.md) — live compare/patch API；UI ~60% |
| `/:project/~branches` | ProjectBranchesPage | `web/page/project/branches/ProjectBranchesPage` | stub | [x] |
| `/:project/~tags` | ProjectTagsPage | `web/page/project/tags/ProjectTagsPage` | stub | [x] |
| `/:project/~code-comments` | ProjectCodeCommentsPage | `web/page/project/codecomments/ProjectCodeCommentsPage` | stub | [x] |
| `/:project/~code-comments/:id/invalid` | InvalidCodeCommentPage | `web/page/project/codecomments/InvalidCodeCommentPage` | stub | [x] |
| `/:project/~stats/code/contribs` | CodeContribsPage | `web/page/project/stats/code/CodeContribsPage` | stub | [x] |
| `/:project/~stats/code/lines` | SourceLinesPage | `web/page/project/stats/code/SourceLinesPage` | stub | [x] |
| `/:project/~stats/buildmetric` | BuildMetricStatsPage | `web/page/project/stats/buildmetric/BuildMetricStatsPage` | stub | [x] |
| `/:project/~children` | ProjectChildrenPage | `web/page/project/children/ProjectChildrenPage` | stub | [x] |
| `/:project/~no-storage` | NoProjectStoragePage | `web/page/project/NoProjectStoragePage` | stub | [x] |

### Wave 2 续做指南（Buildspec 编辑器）

> **最后更新**：2026-06-26。完整任务书：[buildspec-editor-migration.md](buildspec-editor-migration.md)

#### 已实现一览

**buildx-web**：`ProjectBlobPage` CI/CD 引导；`BuildSpecBlobViewPanel` / `BuildSpecBlobEditPanel`（Edit \| YAML \| Changes \| Save）；Visual 五 Tab（Jobs / Services / Step Templates / Properties / Imports）；Job BeanEditor、Pipeline DAG、拖拽排序、步骤/Property/Import 编辑器；YAML ↔ visual 同步；`?position=buildspec-jobs/CI`；vitest（`src/buildspec/buildspec.test.ts`）。

**buildx-server**：`POST /~api/buildspec/validate`（`internal/server/api/buildspec.go`）。

#### 剩余（待后续对齐）

| 优先级 | 任务 | OneDev 参考 |
|--------|------|-------------|
| P1 | Bean 校验错误 → 字段路径导航 | `BuildSpecEditPanel` |
| P1 | 逐步骤类型完整嵌套 BeanEditor（部分 step 仍为 JSON modal） | `web/component/buildspec/step/` |
| P2 | Import 元素解析与跨项目链接 | `Import.java`, `BuildSpec.getJobMap()` |
| P2 | 插件 Job 建议（Maven/Gradle/Node…）— UI stub 已有 | buildspec 插件 + repo 分析 |
| P2 | 查看模式 Run Job 按钮 | `BuildSpecBlobViewPanel`, `JobRunSelector` |
| P3 | BuildSpecRenderer / PlainTabHead 边角 | `BuildSpecRenderer.java` |
| — | 截图 DoD 验收 | 对照 Wicket HTML/CSS |

---

## Wave 3 — 项目内：Issue / 看板 / 迭代

| 路由 | OneDev 页面 | 参考路径 | API | 路由 | 复刻 | 备注 |
|------|-------------|----------|-----|------|------|------|
| `/:project/~issues` | ProjectIssueListPage | `web/page/project/issues/list/ProjectIssueListPage` | partial | [x] | ~ | 查询栏 + 列表接 live API；缺 saved query、批量编辑 |
| `/:project/~issues/new` | NewIssuePage | `web/page/project/issues/create/NewIssuePage` | partial | [x] | ~ | 标题/描述/迭代多选；缺自定义字段、模板 |
| `/:project/~issues/import/:importer` | IssueImportPage | `web/page/project/issues/imports/IssueImportPage` | stub | [x] | — | |
| `/:project/~issues/:issue` | IssueDetailPage / IssueActivitiesPage | `web/page/project/issues/detail/` | partial | [x] | ~ | 评论、迭代排期、状态下拉；缺投票/关注/字段编辑 |
| `/:project/~issues/:issue/commits` | IssueCommitsPage | `web/page/project/issues/detail/IssueCommitsPage` | stub | [x] | — | 路由已注册，仍为占位 |
| `/:project/~issues/:issue/pulls` | IssuePullRequestsPage | `web/page/project/issues/detail/IssuePullRequestsPage` | partial | [x] | ~ | 已接 PR 列表；待正式 `IncludesIssue` 索引 |
| `/:project/~issues/:issue/builds` | IssueBuildsPage | `web/page/project/issues/detail/IssueBuildsPage` | partial | [x] | — | 可接 `fixed-issue-ids` / build query |
| `/:project/~issues/:issue/authorizations` | IssueAuthorizationsPage | `web/page/project/issues/detail/IssueAuthorizationsPage` | stub | [x] | — | |
| `/:project/~boards` | IssueBoardsPage | `web/page/project/issues/boards/IssueBoardsPage` | partial | [x] | ~ | 动态列、backlog、迭代过滤、拖拽改状态；缺卡片排序 |
| `/:project/~boards/:board` | IssueBoardsPage | 同上 | partial | [x] | ~ | URL `:board` 未解析，仍用设置内 board 下拉 |
| `/:project/~iterations` | IterationListPage | `web/page/project/issues/iteration/IterationListPage` | partial | [x] | ~ | |
| `/:project/~iterations/new` | NewIterationPage | `web/page/project/issues/iteration/NewIterationPage` | partial | [x] | ~ | |
| `/:project/~iterations/:iteration` | IterationIssuesPage | `web/page/project/issues/iteration/IterationIssuesPage` | partial | [x] | ~ | |
| `/:project/~iterations/:iteration/burndown` | IterationBurndownPage | `web/page/project/issues/iteration/IterationBurndownPage` | partial | [x] | ~ | 统计条已有；缺燃尽折线图 |
| `/:project/~iterations/:iteration/edit` | IterationEditPage | `web/page/project/issues/iteration/IterationEditPage` | partial | [x] | ~ | |

### Wave 3 续做指南（Issue / 看板 / 迭代）

> **最后更新**：2026-06-24。本小节供后续会话直接接续，不必重读全库。

#### 已实现一览

**buildx-server**

| 模块 | 路径 | 说明 |
|------|------|------|
| Schema | `internal/persistence/sqlite/migrations/005_issue.sql` | `o_Issue`, `o_IssueComment` |
| Schema | `internal/persistence/sqlite/migrations/006_iteration.sql` | `o_Iteration`, `o_IssueSchedule` |
| Domain | `internal/issue/` | CRUD、IssueQuery 子集、评论、迭代 CRUD、排期 |
| Settings | `internal/issuesetting/` | `GlobalIssueSetting` 默认 + `o_Setting` 持久化 |
| API | `internal/server/api/issues.go` | 见下方 endpoint 表 |
| API | `internal/server/api/issue_comments.go` | |
| API | `internal/server/api/iterations.go` | |
| API | `internal/server/api/issue_settings.go` | `GET/POST /~api/settings/issue` |
| 测试 | `internal/issue/*_test.go`, `internal/issuesetting/store_test.go`, `internal/server/api/issues_test.go`, `issue_settings_test.go` | |

**buildx-web**

| 页面 / API | 路径 | Live API |
|------------|------|----------|
| 全局列表 | `src/pages/IssuesPage.tsx` | `fetchIssues` |
| 项目列表 | `src/pages/project/issues/ProjectIssueListPage.tsx` | `fetchProjectIssues` |
| 新建 | `src/pages/project/issues/NewIssuePage.tsx` | `createProjectIssue` + `iterationIds` |
| 详情 | `src/pages/project/issues/IssueDetailPage.tsx` | 评论、迭代排期、状态切换 |
| 看板 | `src/pages/project/issues/IssueBoardsPage.tsx` | 设置驱动列 + backlog + 拖拽 |
| 迭代系 | `Iteration*Page.tsx`（4 页 + New） | `src/api/iterations.ts` |
| Issue 客户端 | `src/api/issues.ts` | |
| 设置客户端 | `src/api/issueSettings.ts` | `fetchIssueSetting` / `saveIssueSetting` |
| 看板工具 | `src/api/issueBoards.ts` | `boardColumnsFromSettings` |
| 管理：状态列表 | `src/pages/admin/IssueStateListPage.tsx` | **只读** GET settings |

#### REST endpoint 已实现 / 未实现

| Method | Path | 状态 | 备注 |
|--------|------|------|------|
| GET | `/~api/issues` | ✅ | `query`, `projectId`, `iterationId`, `offset`, `count` |
| POST | `/~api/issues` | ✅ | 支持 `iterationIds` |
| GET/DELETE | `/~api/issues/{id}` | ✅ | |
| POST | `/~api/issues/{id}/title` | ✅ | |
| POST | `/~api/issues/{id}/description` | ✅ | |
| POST | `/~api/issues/{id}/state-transitions` | ✅ | 无 ManualSpec 校验 |
| GET/POST | `/~api/issues/{id}/iterations` | ✅ | |
| GET | `/~api/issues/{id}/comments` | ✅ | |
| POST/GET/DELETE | `/~api/issue-comments` | ✅ | |
| GET/POST | `/~api/projects/{id}/iterations` | ✅ | |
| GET/PATCH/DELETE | `/~api/iterations/{id}` | ✅ | |
| GET | `/~api/iterations/{id}/issues` | ✅ | |
| GET | `/~api/iterations/{id}/burndown` | ✅ | 汇总数据，无按日序列 |
| GET/POST | `/~api/settings/issue` | ✅ | POST 仅 root |
| — | `/~api/issue-links` | ❌ | |
| — | `/~api/issue-votes` | ❌ | |
| — | `/~api/issue-watches` | ❌ | |
| — | `/~api/issue-works` | ❌ | 工时 |
| — | Issue 自定义字段 / 批量编辑 | ❌ | |

#### 与 OneDev 的主要差距（按优先级）

| 优先级 | 任务 | OneDev 参考 | 建议落点 |
|--------|------|-------------|----------|
| P1 | **管理端设置可编辑**：状态/看板/转换的增删改 | `web/page/admin/issuestate/`, `issueboard/`, `statetransition/` | 扩展 `IssueStateListPage`、`DefaultBoardListPage`、`StateTransitionListPage` → `POST /~api/settings/issue` |
| P1 | **看板卡片排序** `boardPosition` | `IssueBoardsPage` + `BoardPositionService` | migration + `issue` store + 看板拖拽排序 API |
| P1 | **Issue 详情 tab 接 live 数据** | `IssueCommitsPage`, ~~`IssuePullRequestsPage`~~, `IssueBuildsPage` | PR tab 已 partial（[pull-request-migration.md](pull-request-migration.md)）；commits/builds 待补 |
| P2 | **燃尽图折线** | `IterationBurndownPage` + chart JS | 扩展 `GET .../burndown` 返回按日 remaining；前端 chart |
| P2 | **看板 URL `/:board`** | `IssueBoardsPage` 按 board 名路由 | `useParams` + 与 `boardSpecs` 对齐 |
| P2 | **完整 IssueQuery** + 保存查询持久化 | `IssueQuery` parser, `NamedQueries` | `internal/issue/query.go` 扩展；settings 已有 `namedQueries` 字段 |
| P2 | **工作流转换校验** ManualSpec | `StateTransition` | settings 增加 transitions；`TransitState` 校验 |
| P3 | 自定义字段、标签、经办人 | `IssueFieldService`, `IssueAssignment` | 新表 + Resource |
| P3 | 投票、关注、链接 | `IssueVoteResource` 等 | |
| P3 | Issue import | `IssueImportPage` | |
| P3 | 项目级 issue 设置 | `/:project/~settings/issue/*` | 项目覆盖全局 BoardSpec |
| P3 | **buildx-cli** `issue` 命令与 server 对齐 | `references/tod` | `buildx-cli-migration.md` |

#### 推荐下一批执行顺序

1. **Admin 设置编辑闭环**（状态色、看板列、named query）— 改动集中、立刻提升看板可配置性  
2. **Issue 详情 tab**（commits / builds）— PR tab 已 partial；commits/builds 复用已有 API  
3. **`boardPosition`** — 看板体验接近 OneDev  
4. **Burndown 图表** — 迭代页收尾  
5. **IssueQuery 扩展 + saved queries UI** — 列表/看板查询栏对齐  

#### 关键 OneDev 只读参考

```
references/onedev/server-core/src/main/java/io/onedev/server/
  model/Issue.java, Iteration.java
  issue/ (IssueService, IssueQuery, BoardSpec, GlobalIssueSetting)
  rest/resource/IssueResource.java, IterationResource.java
  web/page/project/issues/   # 全部 Wicket 页面
  web/page/admin/issuestate/
```

#### 验收提醒

Wave 3 所有页面当前 **复刻 = `~` 或 `—`**，无一通过截图 DoD。接 API 不等于完成；每页仍需对照 Wicket HTML/CSS 做 1:1 验收（见 [buildx-web-design.md](buildx-web-design.md)）。

---

## Wave 4 — 项目内：Pull Request

> **专项任务书**（端点表、代码地图、推荐批次）：[pull-request-migration.md](pull-request-migration.md)

| 路由 | OneDev 页面 | 参考路径 | API | 路由 | 复刻 |
|------|-------------|----------|-----|------|------|
| `/~pulls` | PullRequestListPage | `web/page/pullrequests/PullRequestListPage` | live | [x] | ~ |
| `/:project/~pulls` | ProjectPullRequestsPage | `web/page/project/pullrequests/ProjectPullRequestsPage` | live | [x] | ~ |
| `/:project/~pulls/new` | NewPullRequestPage | `web/page/project/pullrequests/create/NewPullRequestPage` | live | [x] | ~ |
| `/:project/~pulls/:request` | PullRequestActivitiesPage | `web/page/project/pullrequests/detail/activities/` | live | [x] | ~ |
| `/:project/~pulls/:request/changes` | PullRequestChangesPage | `web/page/project/pullrequests/detail/changes/` | live | [x] | ~ |
| `/:project/~pulls/:request/code-comments` | PullRequestCodeCommentsPage | `web/page/project/pullrequests/detail/codecomments/` | partial | [x] | ~ |
| `/:project/~pulls/:request/invalid` | InvalidPullRequestPage | `web/page/project/pullrequests/InvalidPullRequestPage` | live | [x] | ~ |
| `/:project/~issues/:issue/pulls` | IssuePullRequestsPage | `web/page/project/issues/detail/IssuePullRequestsPage` | partial | [x] | ~ |
| `/:project/~settings/pull-request` | PullRequestSettingPage | `web/page/project/setting/code/pullrequest/` | stub | [x] | — |

**Wave 4 小结**：主流程（列表/新建/详情三 Tab/合并评审）已接 live API；距 OneDev DoD 差内联 diff、列表 filter/saved queries、assignee/label/watch/CI 侧栏、项目设置持久化、完整 `PullRequestQuery`。下一批见任务书 **批次 A**。

---

## Wave 5 — 项目内：构建 CI/CD

| 路由 | OneDev 页面 | 参考路径 | API | 路由 | 复刻 | 备注 |
|------|-------------|----------|-----|------|------|------|
| `/:project/~builds` | ProjectBuildsPage | `web/page/project/builds/ProjectBuildsPage` | live | [x] | ~ | BuildListPanel + Filter/OrderBy/Operations/RunJob 工具栏已可交互 |
| `/:project/~builds/:build` | BuildDashboardPage | `web/page/project/builds/detail/dashboard/` | live | [x] | ~ | 重定向到 log tab |
| `/:project/~builds/:build/pipeline` | BuildPipelinePage | `web/page/project/builds/detail/pipeline/` | live | [x] | ~ | PipelinePanel SVG DAG 可视化已接入，缺 BuildSpec 驱动真实依赖图 |
| `/:project/~builds/:build/log` | BuildLogPage | `web/page/project/builds/detail/log/` | live | [x] | ~ | 日志查看器 shell 已就绪（download/深色终端），缺 log stream API |
| `/:project/~builds/:build/changes` | BuildChangesPage | `web/page/project/builds/detail/changes/` | live | [x] | ~ | 构建上下文表（Branch/Commit/Job/Version），缺 git diff 文件列表 |
| `/:project/~builds/:build/fixed-issues` | FixedIssuesPage | `web/page/project/builds/detail/issues/` | live | [x] | ~ | 调用 `fixed-issue-ids` API；后端返回空数组（待 commit 解析） |
| `/:project/~builds/:build/artifacts` | BuildArtifactsPage | `web/page/project/builds/detail/artifacts/` | live | [x] | ~ | Upload 按钮 + 空状态，缺产物列表 API |
| `/:project/~builds/:build/packages/:type` | BuildPacksPage | `web/page/project/builds/detail/pack/` | stub | [x] | ~ | 按 build+type 过滤 pack 列表，已接 fetchPacks API |
| `/:project/~builds/:build/invalid` | InvalidBuildPage | `web/page/project/builds/detail/InvalidBuildPage` | stub | [x] | ~ | 完整：warning alert + Back to Builds 导航 |
| `/:project/~builds/:build/reports/:report` | BuildReportPage | `web/page/project/builds/detail/report/` | stub | [x] | ~ | 报告类型识别+空状态，缺报告数据 API |
| `/~builds` | BuildListPage | `web/page/builds/BuildListPage` | live | [x] | ~ | 全局构建列表（兼容新版 BuildListPanel） |

### Wave 5 续做指南（Build / CI）

> **最后更新**：2026-06-25。本小节供后续会话直接接续，不必重读全库。

#### 已实现一览

**buildx-server**

| 模块 | 路径 | 说明 |
|------|------|------|
| Schema | `internal/persistence/sqlite/migrations/006_build.sql` | `o_Build`, `o_BuildParam`, `o_BuildLabel` |
| Schema | `internal/persistence/sqlite/migrations/007_build_dependence.sql` | `o_BuildDependence` — 构建间依赖关系 |
| Schema | `internal/persistence/sqlite/migrations/008_build_extra_fields.sql` | `o_token`, `o_workDirPath`, `o_checkoutPaths`, `o_submitSequence`, `o_retryDate` |
| Model | `internal/model/build.go` | `Build`, `BuildParam`, `BuildLabel`, `BuildDependence` — 完整 Go 结构体 + JSON tag |
| Store | `internal/build/store.go` | CRUD + Query 查询（7 种过滤条件）+ ListLabels/ListParams/ListDependencies/ListDependents |
| Query | `internal/build/query.go` | BuildQuery 解析器：Job/Status/Number/Branch/Commit/FreeText/OrderByFinishDate |
| API | `internal/server/api/builds.go` | 9 个端点全部 live（见下方端点表） |
| 测试 | `internal/build/*_test.go` | query parser 4 case + store CRUD 2 case — 全部 PASS |

**buildx-web**

| 页面 / 组件 / API | 路径 | Live API |
|-------------------|------|----------|
| API 客户端 | `src/api/builds.ts` | `queryBuilds`, `getBuild`, `getBuildByNumber`, `getBuildLabels`, `getBuildParams`, `getBuildDependencies`, `getBuildDependents`, `setBuildDescription`, `deleteBuild` |
| 构建列表 | `src/components/onedev/panels/BuildListPanel.tsx` | Filter/OrderBy/Operations/DisplayParams/RunJob 工具栏全部可交互 |
| 构建详情布局 | `src/components/onedev/build/BuildDetailLayout.tsx` | 完整 BuildDetailPage shell：card header（actions 按钮区 + more-info toggle）+ tabs + 侧边栏 |
| 侧边栏 | `BuildDetailLayout.tsx` 内 `BuildSideInfo` | 11 行属性表（Commit/Branch/Tag/Job/Submitter/SubmittedAt/SubmitReason/QueueingTakes/RunningTakes/CancelledBy）+ Labels + Delete |
| 状态图标 | `src/components/onedev/build/BuildStatusIcon.tsx` | 7 种状态 SVG + CSS class |
| 描述编辑器 | `BuildDetailLayout.tsx` 内 `BuildDescriptionEditor` | 内联 Markdown 编辑，调用 `setBuildDescription` API |
| 流水线面板 | `src/components/onedev/pipeline/PipelinePanel.tsx` | SVG 贝塞尔曲线 DAG + 列-行网格 + active job 高亮 + 暗色模式 |
| 迷你构建列表 | `src/components/onedev/build/MiniBuildListPanel.tsx` | 紧凑内联构建列表（用于 Issue/PR 详情侧栏） |
| PR 构建集成 | `src/components/onedev/pullrequest/PullRequestJobsPanel.tsx` | PR 页面 Required/Optional Jobs 状态汇总 |
| CSS | `src/pages/project/builds/build-detail.css` | 对齐 OneDev `build-detail.css` + `build-side.css` + `build-status.css` + `pipeline.css` |
| CSS | `src/components/onedev/pipeline/pipeline.css` | 对齐 OneDev `pipeline.css` |
| 工具函数 | `src/util/build.ts` | `formatRefName`, `formatDuration`, `formatBuildDate` |
| Query 预设 | `src/data/queryPresets.ts` | 9 种预设查询（All/Successful/Failed/...） |

#### REST endpoint 已实现 / 未实现

| Method | Path | 状态 | 备注 |
|--------|------|------|------|
| GET | `/~api/builds` | ✅ live | `query`, `offset`, `count`, `projectId` |
| GET | `/~api/builds/{id}` | ✅ live | 含嵌套 Project/Submitter/Canceller |
| GET | `/~api/builds/{id}/labels` | ✅ live | |
| GET | `/~api/builds/{id}/params` | ✅ live | Secret 类型自动 mask |
| GET | `/~api/builds/{id}/dependencies` | ✅ live | 查询 `o_BuildDependence.o_dependent_id` |
| GET | `/~api/builds/{id}/dependents` | ✅ live | 查询 `o_BuildDependence.o_dependency_id` |
| GET | `/~api/builds/{id}/fixed-issue-ids` | ⚠️ 空返回 | 需要 commit message 解析（扫描 "fix #123" 模式） |
| POST | `/~api/builds/{id}/description` | ✅ live | 鉴权：root / submitter / project admin |
| DELETE | `/~api/builds/{id}` | ✅ live | 鉴权：root / submitter / project admin |
| — | `/~api/builds/log/{id}` | ❌ 未实现 | BuildLogResource — 需要 CI 引擎写入日志文件 |
| POST | `/~api/buildspec/validate` | ✅ live | YAML 解析 + schema 校验（存储仍走 Repository files API） |
| — | BuildSpec import 解析 / JobRun | ❌ 未实现 | 跨项目 import merge、手动触发 job |
| — | Job 管理 (submit/cancel/rerun) | ❌ 未实现 | 需要 CI 引擎 |
| — | Agent / JobExecutor 管理 | ❌ 未实现 | 需要 CI 引擎 |

#### 与 OneDev 的主要差距（按优先级）

| 优先级 | 任务 | OneDev 参考 | 建议落点 |
|--------|------|-------------|----------|
| **P0** | **BuildLog API + 实时日志流** | `BuildLogResource.java`, `LogPanel` | 后端 `/~api/builds/log/{id}` SSE 端点；前端 log viewer 接实时流 |
| **P0** | **FixedIssueIDs 解析** | `Build.getFixedIssueIds()` | `internal/build/` 扫描 commits 间的 "fix #N" 模式 |
| **P1** | **PipelinePanel 接 BuildSpec 真实数据** | `BuildPipelinePage.java`, `PipelinePanel.java` | 解析 buildspec YAML → job DAG → PipelinePanel |
| **P1** | **BuildChangesPage — git diff** | `BuildChangesPage.java` | 比较当前 build commit vs 上次成功 build commit |
| **P1** | **BuildArtifactsPage — 产物列表** | `BuildArtifactsPage.java` | 产物目录扫描 + 下载链接 API |
| **P1** | **鉴权完善** `canAccessBuild` | `AccessBuild.java` | 项目/角色/匿名访问权限检查（当前恒返回 true） |
| **P2** | **WebSocket 实时更新** | `BuildEventBroadcaster.java` | 构建列表/详情页状态实时刷新 |
| **P2** | **BuildQuery 保存（用户/项目级）** | `BuildQueryPersonalization`, `NamedBuildQuery` | `o_BuildQueryPersonalization` 表 + settings 持久化 |
| **P2** | **BuildFilterPanel（高级过滤）** | `BuildFilterPanel.html/.java` | 多条件组合过滤 UI |
| **P2** | **JobRunSelector（触发构建对话框）** | `JobRunSelector`, `BuildOptionContentPanel` | Run Job → 选择 job → revision → params |
| **P2** | **Admin Agent/JobExecutor 页面实现** | `agent/`, `jobexecutor/` 目录下全部页面 | 当前仅路由占位 |
| **P3** | **构建执行引擎（CI 核心）** | `job/` 包（JobService, JobRunnable, JobContext, JobAgentShell） | BuildSpec YAML → Job DAG → Agent 调度 → 步骤执行 → 日志流 |
| **P3** | **BuildMetric 统计页** | `BuildMetricStatsPage` | 已路由，待后端 `BuildMetricService` |
| **P3** | **BuildQueryWatchesPanel** | `BuildQueryWatchesPanel` | 用户关注构建查询 → 通知 |
| **P3** | **AI 集成（Failure Investigation）** | `ai/BuildHelper.java`, `GetBuildSpecEditInstructions` | ChatTool + build 上下文 |

#### 推荐下一批执行顺序

1. **BuildLog API** — 最小的后端增量即可让 Log 页从占位变为可用
2. **FixedIssueIDs** — `Build.getFixedIssueIds()` 逻辑移植，补上最后一块空返回 API
3. **鉴权** `canAccessBuild` — 安全基线，让所有 API 的权限检查从桩变为可用
4. **PipelinePanel + BuildSpec** — 解析 buildspec YAML 生成 job DAG 驱动流水线可视化
5. **WebSocket 实时更新** — 列表页和详情页状态实时刷新
6. **构建执行引擎** — 最大的单块工作，需要完整 CI 引擎实现

#### 关键 OneDev 只读参考

```
references/onedev/server-core/src/main/java/io/onedev/server/
  model/Build.java, BuildParam.java, BuildLabel.java, BuildDependence.java
  buildspec/                          # BuildSpec + Job + Step 定义
    job/trigger/                      # 8 种触发器
    step/                             # 29 种构建步骤
    param/spec/                       # 13 种参数类型
    job/action/                       # PostBuildAction
  job/                                # JobService, JobContext, JobRunnable
  rest/resource/BuildResource.java
  rest/resource/BuildLogStreamResource.java
  web/page/project/builds/            # 全部 Wicket 页面
  web/component/build/                # 全部 Wicket 组件
  web/component/pipeline/             # PipelinePanel + pipeline.js
```

#### 验收提醒

Wave 5 所有页面当前 **复刻 = `~`**，无一通过截图 DoD。主要阻塞：
- **CI 引擎缺失** → 无 buildspec 执行、无日志流、无产物发布、无真实 pipeline 数据
- **git diff API 缺失** → BuildChangesPage 无法计算文件变更
- **commit 解析缺失** → FixedIssuesPage 无数据

在 CI 引擎就绪前，P0/P1 项可独立推进；P3 中的「构建执行引擎」是整个 Wave 5 的前置依赖。接 API 不等于完成；每页仍需对照 Wicket HTML/CSS 做 1:1 验收（见 [buildx-web-design.md](buildx-web-design.md)）。

---

## Wave 6 — 项目内：制品 / Workspace

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project/~packages` | ProjectPacksPage | `web/page/project/packs/ProjectPacksPage` | stub | [x] |
| `/:project/~packages/:pack` | PackDetailPage | `web/page/project/packs/detail/PackDetailPage` | stub | [x] |
| `/:project/~workspaces` | ProjectWorkspacesPage | `web/page/project/workspaces/ProjectWorkspacesPage` | stub | [x] |
| `/:project/~workspaces/:ws` | WorkspaceDashboardPage | `web/page/project/workspaces/detail/dashboard/` | stub | [x] |
| `/:project/~workspaces/:ws/terminals/:shell` | WorkspaceTerminalPage | `web/page/project/workspaces/detail/terminal/` | stub | [x] |
| `/:project/~workspaces/:ws/changes` | WorkspaceChangesPage | `web/page/project/workspaces/detail/changes/` | stub | [x] |
| `/:project/~workspaces/:ws/log` | WorkspaceLogPage | `web/page/project/workspaces/detail/log/` | stub | [x] |

---

## Wave 7 — 项目设置

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project/~settings/general` | GeneralProjectSettingPage | `web/page/project/setting/general/` | stub | [x] |
| `/:project/~settings/user-authorizations` | UserAuthorizationsPage | `web/page/project/setting/authorization/` | stub | [x] |
| `/:project/~settings/group-authorizations` | GroupAuthorizationsPage | 同上 | stub | [x] |
| `/:project/~settings/avatar-edit` | AvatarEditPage | `web/page/project/setting/avatar/` | stub | [x] |
| `/:project/~settings/branch-protection` | BranchProtectionsPage | `web/page/project/setting/code/branchprotection/` | stub | [x] |
| `/:project/~settings/tag-protection` | TagProtectionsPage | `web/page/project/setting/code/tagprotection/` | stub | [x] |
| `/:project/~settings/code-analysis` | CodeAnalysisSettingPage | `web/page/project/setting/code/analysis/` | stub | [x] |
| `/:project/~settings/git-pack-config` | GitPackConfigPage | `web/page/project/setting/code/git/` | stub | [x] |
| `/:project/~settings/pull-request` | PullRequestSettingPage | `web/page/project/setting/code/pullrequest/` | stub | [x] | — | [pull-request-migration.md](pull-request-migration.md) 批次 D |
| `/:project/~settings/build/*` | JobSecrets, JobProperties, BuildPreservations, … | `web/page/project/setting/build/` | stub | [x] |
| `/:project/~settings/issue/*` | ProjectIssueSetting, StateTransitions, BranchPrefix | `web/page/project/setting/issuesetting/` | stub | [x] |
| `/:project/~settings/service-desk` | ServiceDeskSettingPage | `web/page/project/setting/servicedesk/` | stub | [x] |
| `/:project/~settings/web-hooks` | WebHooksPage | `web/page/project/setting/webhook/` | stub | [x] |
| `/:project/~settings/ai` | ProjectAiSettingPage | `web/page/project/setting/ai/` | stub | [x] |
| `/:project/~settings/workspace-spec` | WorkspaceSpecsPage | `web/page/project/setting/workspacespec/` | stub | [x] |
| `/:project/~settings/:pluginSetting` | ContributedProjectSettingPage | `web/page/project/setting/pluginsettings/` | stub | [x] |

---

## Wave 8 — 我的账户（~my）

| 路由 | OneDev 页面 | API | 状态 |
|------|-------------|-----|------|
| `/~my` | MyProfilePage | stub | [x] |
| `/~my/basic-setting` | MyBasicSettingPage | stub | [x] |
| `/~my/email-addresses` | MyEmailAddressesPage | stub | [x] |
| `/~my/avatar` | MyAvatarPage | stub | [x] |
| `/~my/password` | MyPasswordPage | stub | [x] |
| `/~my/ai-model-setting` | MyModelSettingPage | stub | [x] |
| `/~my/ai-system-prompt` | MySystemPromptPage | stub | [x] |
| `/~my/ai-entitlement-setting` | MyEntitlementSettingPage | stub | [x] |
| `/~my/ssh-keys` | MySshKeysPage | stub | [x] |
| `/~my/gpg-keys` | MyGpgKeysPage | stub | [x] |
| `/~my/access-tokens` | MyAccessTokensPage | stub | [x] |
| `/~my/two-factor-authentication` | MyTwoFactorAuthenticationPage | stub | [x] |
| `/~my/sso-accounts` | MySsoAccountsPage | stub | [x] |
| `/~my/query-watches/:tab` | MyQueryWatchesPage | stub | [x] |
| `/~my/workspace-data` | MyWorkspaceDataPage | stub | [x] |

---

## Wave 9 — 用户管理页（~users，管理员视角）

| 路由 | OneDev 页面 | API | 状态 |
|------|-------------|-----|------|
| `/~users/:user` | UserProfilePage | stub | [x] |
| `/~users/:user/basic-setting` | UserBasicSettingPage | stub | [x] |
| `/~users/:user/email-setting` | UserEmailAddressesPage | stub | [x] |
| `/~users/:user/groups` | UserMembershipsPage | stub | [x] |
| `/~users/:user/authorizations` | UserAuthorizationsPage | stub | [x] |
| `/~users/:user/avatar` | UserAvatarPage | stub | [x] |
| `/~users/:user/password` | UserPasswordPage | stub | [x] |
| `/~users/:user/ai-*` | User AI settings (3 pages) | stub | [x] |
| `/~users/:user/ssh-keys` | UserSshKeysPage | stub | [x] |
| `/~users/:user/gpg-keys` | UserGpgKeysPage | stub | [x] |
| `/~users/:user/access-tokens` | UserAccessTokensPage | stub | [x] |
| `/~users/:user/two-factor-authentication` | UserTwoFactorAuthenticationPage | stub | [x] |
| `/~users/:user/sso-accounts` | UserSsoAccountsPage | stub | [x] |
| `/~users/:user/query-watches/:tab` | UserQueryWatchesPage | stub | [x] |
| `/~users/:user/workspace-data` | UserWorkspaceDataPage | stub | [x] |

---

## Wave 10 — 管理后台（~administration）

### 10.1 用户 / 角色 / 组

| 路由 | OneDev 页面 | API | 状态 |
|------|-------------|-----|------|
| `/~administration/users` | UserListPage | stub | [x] |
| `/~administration/users/new` | NewUserPage | stub | [x] |
| `/~administration/invitations` | InvitationListPage | partial | [x] dedicated page + live fetch |
| `/~administration/invitations/new` | NewInvitationPage | partial | [x] dedicated page + live submit |
| `/~administration/roles` | RoleListPage | stub | [x] |
| `/~administration/roles/new` | NewRolePage | stub | [x] |
| `/~administration/roles/:role` | RoleDetailPage | stub | [x] |
| `/~administration/groups` | GroupListPage | stub | [x] |
| `/~administration/groups/new` | NewGroupPage | stub | [x] |
| `/~administration/groups/:group` | GroupProfilePage | stub | [x] |
| `/~administration/groups/:group/members` | GroupMembershipsPage | stub | [x] |
| `/~administration/groups/:group/authorizations` | GroupAuthorizationsPage | stub | [x] |
| `/~administration/labels` | LabelManagementPage | stub | [x] |

### 10.2 系统设置

| 路由 | OneDev 页面 | API | 状态 |
|------|-------------|-----|------|
| `/~administration/settings/system` | SystemSettingPage | stub | [x] |
| `/~administration/settings/security` | SecuritySettingPage | stub | [x] |
| `/~administration/settings/branding` | BrandingSettingPage | stub | [x] |
| `/~administration/settings/mail-service` | MailConnectorPage | stub | [x] |
| `/~administration/settings/service-desk-setting` | ServiceDeskSettingPage | stub | [x] |
| `/~administration/settings/authenticator` | AuthenticatorPage | stub | [x] |
| `/~administration/settings/sso-providers` | SsoProviderListPage | stub | [x] |
| `/~administration/settings/sso-providers/new` | NewSsoProviderPage | stub | [x] |
| `/~administration/settings/sso-providers/:provider` | SsoProviderDetailPage | stub | [x] |
| `/~administration/settings/ssh-server-key` | SshServerKeyPage | stub | [x] |
| `/~administration/settings/gpg-signing-key` | GpgSigningKeyPage | stub | [x] |
| `/~administration/settings/gpg-trusted-keys` | GpgTrustedKeysPage | stub | [x] |
| `/~administration/settings/backup` | DatabaseBackupPage | stub | [x] |
| `/~administration/settings/alert` | AlertSettingPage | stub | [x] |
| `/~administration/settings/performance` | PerformanceSettingPage | stub | [x] |
| `/~administration/settings/lite-ai-model` | LiteModelPage | stub | [x] |
| `/~administration/settings/chat-preserve-days` | ChatPreserveDaysPage | stub | [x] |
| `/~administration/settings/:pluginSetting` | ContributedAdministrationSettingPage | stub | [x] |

### 10.3 邮件模板（13 页）

| 路由后缀 | OneDev 页面 | 状态 |
|----------|-------------|------|
| `email-templates/issue-notification` | IssueNotificationTemplatePage | [x] |
| `email-templates/pull-request-notification` | PullRequestNotificationTemplatePage | [x] |
| `email-templates/build-notification` | BuildNotificationTemplatePage | [x] |
| `email-templates/pack-notification` | PackNotificationTemplatePage | [x] |
| `email-templates/workspace-notification` | WorkspaceNotificationTemplatePage | [x] |
| `email-templates/commit-notification` | CommitNotificationTemplatePage | [x] |
| `email-templates/issue-notification-unsubscribed` | IssueNotificationUnsubscribedTemplatePage | [x] |
| `email-templates/pull-request-notification-unsubscribed` | PullRequestNotificationUnsubscribedTemplatePage | [x] |
| `email-templates/service-desk-issue-opened` | ServiceDeskIssueOpenedTemplatePage | [x] |
| `email-templates/service-desk-issue-open-failed` | ServiceDeskIssueOpenFailedTemplatePage | [x] |
| `email-templates/user-invitation` | UserInvitationTemplatePage | [x] |
| `email-templates/email-verification` | EmailVerificationTemplatePage | [x] |
| `email-templates/password-reset` | PasswordResetTemplatePage | [x] |
| `email-templates/stopwatch-overdue` | StopwatchOverdueTemplatePage | [x] |
| `email-templates/alert` | AlertTemplatePage | [x] |

### 10.4 Issue 全局设置

| 路由 | OneDev 页面 | API | 路由 | 备注 |
|------|-------------|-----|------|------|
| `/~administration/settings/issue-fields` | IssueFieldListPage | stub | [x] | mock 数据 |
| `/~administration/settings/issue-states` | IssueStateListPage | partial | [x] | **GET** `settings/issue` 只读列表 |
| `/~administration/settings/state-transitions` | StateTransitionListPage | stub | [x] | |
| `/~administration/settings/issue-boards` | DefaultBoardListPage | partial | [x] | 数据在 `settings/issue.boardSpecs`；页面未接 API |
| `/~administration/settings/issue-links` | LinkSpecListPage | stub | [x] | |
| `/~administration/settings/time-tracking` | TimeTrackingSettingPage | stub | [x] | |
| `/~administration/settings/issue-templates` | IssueTemplateListPage | stub | [x] | |
| `/~administration/settings/commit-message-fix` | CommitMessageFixSettingPage | stub | [x] | |
| `/~administration/settings/external-issue-transformers` | ExternalIssueTransformersPage | stub | [x] | |
| `/~administration/settings/check-issue-integrity` | CheckIssueIntegrityPage | stub | [x] | |

> 全局 Issue 设置统一入口：`GET/POST /~api/settings/issue`（`internal/issuesetting`）。管理页编辑应读写同一 JSON，而非各自 mock。

### 10.5 Agent / 构建 / Workspace

| 路由 | OneDev 页面 | 状态 |
|------|-------------|------|
| `/~administration/agents` | AgentListPage | [x] |
| `/~administration/agents/:agent` | AgentOverviewPage | [x] |
| `/~administration/agents/:agent/builds` | AgentBuildsPage | [x] |
| `/~administration/agents/:agent/workspaces` | AgentWorkspacesPage | [x] |
| `/~administration/agents/:agent/log` | AgentLogPage | [x] |
| `/~administration/settings/job-executors` | JobExecutorsPage | [x] |
| `/~administration/settings/workspace-provisioners` | WorkspaceProvisionersPage | [x] |
| `/~administration/settings/groovy-scripts` | GroovyScriptListPage | [x] |
| `/~administration/server-log/:server` | ServerLogPage | [x] |
| `/~administration/server-information/:server` | ServerInformationPage | [x] |

---

## Wave 11 — 帮助 / 错误 / 杂项

| 路由 | OneDev 页面 | 状态 |
|------|-------------|------|
| `/~help/incompatibilities` | IncompatibilitiesPage | [x] |
| `/~help/api` | ResourceListPage | [x] |
| `/~help/api/:resource` | ResourceDetailPage | [x] |
| `/~help/api/:resource/:method` | MethodDetailPage | [x] |
| `/~errors/404` | PageNotFoundErrorPage | [x] |
| `/~test` | TestPage | [ ] 可选，开发用 |

---

## Wave 12 — 插件贡献页（动态路由）

OneDev 插件通过 `ContributedProjectSettingPage` / `ContributedAdministrationSettingPage` 注册额外设置页。buildx-web 需：

| ID | 任务 | 状态 |
|----|------|------|
| P12-1 | 动态路由 `/:project/~settings/:key` 占位壳 | [x] |
| P12-2 | 动态路由 `/~administration/settings/:key` 占位壳 | [x] |
| P12-3 | 插件报告页（unittest、coverage 等 server-plugin）按插件清单扩展 | [x] |

参考：`references/onedev/server-plugin/*/src/main/java/...`

---

## buildx-server API 补齐清单（与 UI 并行，后置）

UI 全部就绪后，按 OneDev REST 资源逐条在 buildx-server 实现。参考：`rest/resource/*Resource.java`（44 个）。

| Resource | 页面依赖 | buildx-server 状态 |
|----------|----------|-------------------|
| UserResource | 登录、~my、~users、admin users | partial |
| ProjectResource | ~projects、项目设置 | partial |
| IssueResource | issues 全系 | partial | CRUD, query, comments, state transitions, iterations；缺 links/votes/watches/works/fields |
| IterationResource | iterations 全系 | partial | CRUD, issues list, burndown 汇总 |
| SettingResource (`/settings/issue`) | issue 全局设置 | partial | `GlobalIssueSetting` GET/POST |
| PullRequestResource | pulls 全系 | partial | 见 [pull-request-migration.md](pull-request-migration.md) |
| BuildResource + BuildLogStreamResource | builds 全系 | partial (BuildResource live; log stream —) |
| AccessTokenResource | access-tokens | — |
| RoleResource / GroupResource / MembershipResource | admin | — |
| SettingResource | 全部 settings 页 | partial | `/settings/issue` live；branding/security 只读 stub |
| RepositoryResource | ~files、~commits | — |
| … | 见 OneDev REST 文档 | — |

完整 API 追踪见 [buildx-server-api-migration.md](buildx-server-api-migration.md)。

---

## 进度汇总

| Wave | 页面约数 | 说明 |
|------|----------|------|
| W0 | — | 基础设施 |
| W1–W11 | ~210+ | 核心 + 管理 + 帮助 |
| W12 | 动态 | 插件页 |
| **合计** | **223** | OneDev `*Page.java` 全量 |

**当前进度（诚实汇总）**：

| 维度 | 进度 | 说明 |
|------|------|------|
| 路由覆盖 | **223 / 223** | 全部 URL 可打开，无白屏 |
| 1:1 复刻 | **113 / 223** `~` | 113 页有专项 React 组件（含交互+mock数据）；TypeScript 编译 0 错误 |
| PageRenderer | **110 / 223** 仍经模板 | 用户管理、邮件模板、issue 设置、agent 详情、stats 等次要页面由 `PageRenderer` 提供模板渲染 |
| 脚手架 | Wave 0 完成 | Layout、资产同步、mock 层、`PageRenderer` 占位 |
| 后端 API | 极少 live | 主要 partial：`users`、`projects` |

**本批次迁移成果**：从 ~12 页增至 **113 页**专用组件。所有主流程页面（登录/注册、项目列表/创建、Issue/PR/Build 列表和详情、项目设置等）均已有完整交互的 React 组件。

**下一步**：按 Wave 逐页建立专项 React 组件，对照 OneDev 源码 1:1 移植；每完成一页将下表 **复刻** 列改为 `✓`，并从 `AppRouter` 移除该页的 `PageRenderer` fallback。

### 架构说明

| 组件 | 路径 | 作用 |
|------|------|------|
| `PageRenderer` | `src/pages/render/` | **临时**路由占位；页面复刻完成后必须删除对应 fallback |
| 专项页面 | `src/pages/**/*.tsx` | 1:1 复刻的目标形态；对照 Wicket `{Name}Page` |
| 共享 Panel | `src/components/onedev/panels/` | 从 Wicket Panel 抽出的可复用块（随移植逐步充实） |
| 路由注册 | `src/routes/globalRoutes.ts` + `projectRoutes.ts` | 与 OneDev `BaseUrlMapper` 对齐 |

---

## 协作方式

1. **按页认领**：每 PR 只完成 1–3 个相关页面（同一 Panel 族可一批）
2. **必须附对照**：OneDev vs buildx-web 同路由截图（明/暗各一张更佳）
3. **API 不阻塞 UI merge**：mock 数据即可，但 REST 字段名须与 OneDev 一致
4. **禁止**：用 `PageRenderer` 新页或扩大模板覆盖来「勾选完成」
5. **API 就绪后**：仅改 `src/api/` 与 fixture 开关，不改已验收的页面 DOM

更新本文件时：**路由** 列 `[x]` = URL 可达；**复刻** 列 `✓` = 1:1 验收通过；API 列改为 `partial` / `live`。
