# buildx-web 页面迁移任务清单

**策略：以 OneDev Wicket UI 为参照物，逐页 1:1 复刻；API 可后补，但不得用占位模板冒充完成。**

buildx-web 的目标是完整移植 OneDev 前端体验：每一页对照 `{Name}Page.html` + CSS + 关联 Panel/JS 在 React 中复刻。`buildx-server` API 未就绪时可用 mock/fixture，但 DOM、布局、交互必须与 OneDev 一致。`PageRenderer` 仅为路由脚手架，**不计入复刻进度**。

设计规范（视觉对齐）：[buildx-web-design.md](buildx-web-design.md)

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
| `/~issues` | IssueListPage | `web/page/issues/IssueListPage` | stub | [x] | ~ |
| `/~pulls` | PullRequestListPage | `web/page/pullrequests/PullRequestListPage` | stub | [x] | ~ |
| `/~builds` | BuildListPage | `web/page/builds/BuildListPage` | stub | [x] | ~ |
| `/~packages` | PackListPage | `web/page/packs/PackListPage` | stub | [x] | ~ |
| `/~workspaces` | WorkspaceListPage | `web/page/workspaces/WorkspaceListPage` | stub | [x] | ~ |

> Wave 2–11 各表沿用 **路由 / 复刻** 两列；尚未逐行标注的页面默认 **路由** `[x]`、**复刻** `—`（`PageRenderer` 占位）。

---

## Wave 2 — 项目内：代码 / Git

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project` | ProjectDashboardPage | `web/page/project/dashboard/ProjectDashboardPage` | stub | [x] redirect to `~files` |
| `/:project/~files` | ProjectBlobPage | `web/page/project/blob/ProjectBlobPage` | stub | [~] 目录/文件浏览 + mock tree |
| `/:project/~commits` | ProjectCommitsPage | `web/page/project/commits/ProjectCommitsPage` | stub | [x] |
| `/:project/~commits/:commit` | CommitDetailPage | `web/page/project/commits/CommitDetailPage` | stub | [x] |
| `/:project/~compare` | RevisionComparePage | `web/page/project/compare/RevisionComparePage` | stub | [x] |
| `/:project/~branches` | ProjectBranchesPage | `web/page/project/branches/ProjectBranchesPage` | stub | [x] |
| `/:project/~tags` | ProjectTagsPage | `web/page/project/tags/ProjectTagsPage` | stub | [x] |
| `/:project/~code-comments` | ProjectCodeCommentsPage | `web/page/project/codecomments/ProjectCodeCommentsPage` | stub | [x] |
| `/:project/~code-comments/:id/invalid` | InvalidCodeCommentPage | `web/page/project/codecomments/InvalidCodeCommentPage` | stub | [x] |
| `/:project/~stats/code/contribs` | CodeContribsPage | `web/page/project/stats/code/CodeContribsPage` | stub | [x] |
| `/:project/~stats/code/lines` | SourceLinesPage | `web/page/project/stats/code/SourceLinesPage` | stub | [x] |
| `/:project/~stats/buildmetric` | BuildMetricStatsPage | `web/page/project/stats/buildmetric/BuildMetricStatsPage` | stub | [x] |
| `/:project/~children` | ProjectChildrenPage | `web/page/project/children/ProjectChildrenPage` | stub | [x] |
| `/:project/~no-storage` | NoProjectStoragePage | `web/page/project/NoProjectStoragePage` | stub | [x] |

---

## Wave 3 — 项目内：Issue / 看板 / 迭代

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project/~issues` | ProjectIssueListPage | `web/page/project/issues/list/ProjectIssueListPage` | stub | [x] |
| `/:project/~issues/new` | NewIssuePage | `web/page/project/issues/create/NewIssuePage` | stub | [x] |
| `/:project/~issues/import/:importer` | IssueImportPage | `web/page/project/issues/imports/IssueImportPage` | stub | [x] |
| `/:project/~issues/:issue` | IssueDetailPage / IssueActivitiesPage | `web/page/project/issues/detail/` | stub | [x] |
| `/:project/~issues/:issue/commits` | IssueCommitsPage | `web/page/project/issues/detail/IssueCommitsPage` | stub | [x] |
| `/:project/~issues/:issue/pulls` | IssuePullRequestsPage | `web/page/project/issues/detail/IssuePullRequestsPage` | stub | [x] |
| `/:project/~issues/:issue/builds` | IssueBuildsPage | `web/page/project/issues/detail/IssueBuildsPage` | stub | [x] |
| `/:project/~issues/:issue/authorizations` | IssueAuthorizationsPage | `web/page/project/issues/detail/IssueAuthorizationsPage` | stub | [x] |
| `/:project/~boards` | IssueBoardsPage | `web/page/project/issues/boards/IssueBoardsPage` | stub | [x] |
| `/:project/~boards/:board` | IssueBoardsPage | 同上 | stub | [x] |
| `/:project/~iterations` | IterationListPage | `web/page/project/issues/iteration/IterationListPage` | stub | [x] |
| `/:project/~iterations/new` | NewIterationPage | `web/page/project/issues/iteration/NewIterationPage` | stub | [x] |
| `/:project/~iterations/:iteration` | IterationIssuesPage | `web/page/project/issues/iteration/IterationIssuesPage` | stub | [x] |
| `/:project/~iterations/:iteration/burndown` | IterationBurndownPage | `web/page/project/issues/iteration/IterationBurndownPage` | stub | [x] |
| `/:project/~iterations/:iteration/edit` | IterationEditPage | `web/page/project/issues/iteration/IterationEditPage` | stub | [x] |

---

## Wave 4 — 项目内：Pull Request

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project/~pulls` | ProjectPullRequestsPage | `web/page/project/pullrequests/ProjectPullRequestsPage` | stub | [x] |
| `/:project/~pulls/new` | NewPullRequestPage | `web/page/project/pullrequests/create/NewPullRequestPage` | stub | [x] |
| `/:project/~pulls/:request` | PullRequestActivitiesPage | `web/page/project/pullrequests/detail/activities/` | stub | [x] |
| `/:project/~pulls/:request/changes` | PullRequestChangesPage | `web/page/project/pullrequests/detail/changes/` | stub | [x] |
| `/:project/~pulls/:request/code-comments` | PullRequestCodeCommentsPage | `web/page/project/pullrequests/detail/codecomments/` | stub | [x] |
| `/:project/~pulls/:request/invalid` | InvalidPullRequestPage | `web/page/project/pullrequests/InvalidPullRequestPage` | stub | [x] |

---

## Wave 5 — 项目内：构建 CI/CD

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project/~builds` | ProjectBuildsPage | `web/page/project/builds/ProjectBuildsPage` | stub | [x] |
| `/:project/~builds/:build` | BuildDashboardPage | `web/page/project/builds/detail/dashboard/` | stub | [x] |
| `/:project/~builds/:build/pipeline` | BuildPipelinePage | `web/page/project/builds/detail/pipeline/` | stub | [x] |
| `/:project/~builds/:build/log` | BuildLogPage | `web/page/project/builds/detail/log/` | stub | [x] |
| `/:project/~builds/:build/changes` | BuildChangesPage | `web/page/project/builds/detail/changes/` | stub | [x] |
| `/:project/~builds/:build/fixed-issues` | FixedIssuesPage | `web/page/project/builds/detail/issues/` | stub | [x] |
| `/:project/~builds/:build/artifacts` | BuildArtifactsPage | `web/page/project/builds/detail/artifacts/` | stub | [x] |
| `/:project/~builds/:build/packages/:type` | BuildPacksPage | `web/page/project/builds/detail/pack/` | stub | [x] |
| `/:project/~builds/:build/invalid` | InvalidBuildPage | `web/page/project/builds/detail/InvalidBuildPage` | stub | [x] |
| `/:project/~builds/:build/reports/:report` | BuildReportPage | `web/page/project/builds/detail/report/` | stub | [x] |

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
| `/:project/~settings/pull-request` | PullRequestSettingPage | `web/page/project/setting/code/pullrequest/` | stub | [x] |
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
| `/~administration/invitations` | InvitationListPage | stub | [x] |
| `/~administration/invitations/new` | NewInvitationPage | stub | [x] |
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

| 路由 | OneDev 页面 | 状态 |
|------|-------------|------|
| `/~administration/settings/issue-fields` | IssueFieldListPage | [x] |
| `/~administration/settings/issue-states` | IssueStateListPage | [x] |
| `/~administration/settings/state-transitions` | StateTransitionListPage | [x] |
| `/~administration/settings/issue-boards` | DefaultBoardListPage | [x] |
| `/~administration/settings/issue-links` | LinkSpecListPage | [x] |
| `/~administration/settings/time-tracking` | TimeTrackingSettingPage | [x] |
| `/~administration/settings/issue-templates` | IssueTemplateListPage | [x] |
| `/~administration/settings/commit-message-fix` | CommitMessageFixSettingPage | [x] |
| `/~administration/settings/external-issue-transformers` | ExternalIssueTransformersPage | [x] |
| `/~administration/settings/check-issue-integrity` | CheckIssueIntegrityPage | [x] |

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
| IssueResource | issues 全系 | — |
| PullRequestResource | pulls 全系 | — |
| BuildResource + BuildLogStreamResource | builds 全系 | — |
| AccessTokenResource | access-tokens | — |
| RoleResource / GroupResource / MembershipResource | admin | — |
| SettingResource | 全部 settings 页 | — |
| RepositoryResource | ~files、~commits | — |
| … | 见 OneDev REST 文档 | — |

完整 API 追踪可维护在 [buildx-server-api-migration.md](buildx-server-api-migration.md)（待建）。

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
| 1:1 复刻 | **0 / 223** `✓` | 尚无页面通过截图对比验收；约 12 页有专项组件但仍为 `~` 或不足 |
| 脚手架 | Wave 0 基本完成 | Layout、资产同步、mock 层、`PageRenderer` 占位 |
| 后端 API | 极少 live | 主要 partial：`users`、`projects` |

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
