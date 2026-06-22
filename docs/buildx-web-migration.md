# buildx-web 页面迁移任务清单

**策略：UI 先行，一次性搬迁全部页面；API 可后补。**

buildx-web 的目标是在 **buildx-server API 尚未齐全** 的情况下，先把 OneDev Wicket UI 的 **全部路由与视觉** 在 React 中复刻完成。页面使用 mock/fixture 或 stub API 渲染；待 buildx-server 逐步补齐 `/~api` 后，再替换数据源即可。

设计规范（视觉对齐）：[buildx-web-design.md](buildx-web-design.md)

OneDev 路由来源：`references/onedev/server-core/.../web/mapper/BaseUrlMapper.java`  
OneDev 页面总数：**223** 个 `*Page.java`（含抽象模板基类若干）

---

## 核心原则

| 原则 | 说明 |
|------|------|
| **全量搬迁** | 不以「有 API 才做页面」为 gate；223 页全部要有 React 路由 + 视觉实现 |
| **URL 兼容** | 路径与 OneDev `BaseUrlMapper` 保持一致（含 `~` 前缀） |
| **视觉对齐** | 对照 `{Name}Page.html` + CSS；class 名一致；见 design doc |
| **数据解耦** | 经 `src/api/` 访问后端；未实现 API 走 `src/mocks/` fixture |
| **单二进制** | `make build` → embed → 仅运行 `buildx-server serve` |

### 单页完成定义（DoD）

- [ ] React 路由已注册，URL 与 OneDev 一致
- [ ] 静态/空数据/ mock 数据下布局与 OneDev 截图对齐
- [ ] 页面级 CSS/组件 JS 行为已移植（或等价 React 实现）
- [ ] `src/api/` 已声明所需 endpoint（可返回 501/stub）
- [ ] 路由可访问，无白屏（API 未就绪时展示 empty/placeholder 态，而非报错崩溃）

### API 状态标记（后续 buildx-server 补齐时更新）

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
| W0-1 | React Router：注册全部 URL（可先渲染 `PageShell` 占位） | [ ] |
| W0-2 | `LayoutPage` 壳：sidebar / topbar / dark-mode / 响应式 | [~] 进行中 |
| W0-3 | `sync-onedev-assets`：CSS + 图标 + logo | [x] |
| W0-4 | 共享组件库：`src/components/onedev/`（Button, Card, Table, Alert, Dropdown, …） | [ ] |
| W0-5 | API 层：`src/api/client.ts` + 按 Resource 分模块 | [ ] |
| W0-6 | Mock 层：`src/mocks/fixtures/` + `USE_MOCK` 开关 | [ ] |
| W0-7 | 项目上下文：`ProjectContext`（解析 `/{project}` 路径） | [ ] |
| W0-8 | 认证上下文：session / Basic / Bearer（登录前 stub） | [ ] |
| W0-9 | 全局反馈：`session-feedback`、`ajax-loading-indicator` | [ ] |
| W0-10 | 复杂控件适配：CodeMirror、xterm、Mermaid、Pickr 等（从 OneDev asset 引入） | [ ] |
| W0-11 | WebSocket 客户端骨架（ChangeObserver 等价，先 no-op） | [ ] |
| W0-12 | 404/错误页：`PageNotFoundErrorPage` | [ ] |
| W0-13 | 视觉回归：Playwright 截图对比脚手架 | [ ] |

---

## Wave 1 — 安全、初始化、全局列表

### 1.1 安全 / 账户（Security）

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/~login` | LoginPage | `web/page/security/LoginPage` | stub | [ ] |
| `/~logout` | LogoutPage | `web/page/security/LogoutPage` | stub | [ ] |
| `/~signup` | SignUpPage | `web/page/security/SignUpPage` | stub | [ ] |
| `/~reset-password/:code` | PasswordResetPage | `web/page/security/PasswordResetPage` | stub | [ ] |
| `/~verify-email-address/...` | EmailAddressVerificationPage | `web/page/security/EmailAddressVerificationPage` | stub | [ ] |
| `/~create-user-from-invitation/...` | CreateUserFromInvitationPage | `web/page/security/CreateUserFromInvitationPage` | stub | [ ] |
| `/~sso/...` | SsoProcessPage | `web/page/security/SsoProcessPage` | stub | [ ] |
| OAuth callback | OAuthCallbackPage | `web/page/security/OAuthCallbackPage` | stub | [ ] |

### 1.2 服务器初始化

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/~init` | ServerInitPage | `web/page/serverinit/ServerInitPage` | stub | [ ] |

### 1.3 全局资源列表

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/~projects` | ProjectListPage | `web/page/project/ProjectListPage` | partial | [~] |
| `/~projects/new` | NewProjectPage | `web/page/project/NewProjectPage` | stub | [ ] |
| `/~projects/import/:importer` | ProjectImportPage | `web/page/project/imports/ProjectImportPage` | stub | [ ] |
| `/~issues` | IssueListPage | `web/page/issues/IssueListPage` | stub | [ ] |
| `/~pulls` | PullRequestListPage | `web/page/pullrequests/PullRequestListPage` | stub | [ ] |
| `/~builds` | BuildListPage | `web/page/builds/BuildListPage` | stub | [ ] |
| `/~packages` | PackListPage | `web/page/packs/PackListPage` | stub | [ ] |
| `/~workspaces` | WorkspaceListPage | `web/page/workspaces/WorkspaceListPage` | stub | [ ] |

---

## Wave 2 — 项目内：代码 / Git

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project` | ProjectDashboardPage | `web/page/project/dashboard/ProjectDashboardPage` | stub | [ ] |
| `/:project/~files` | ProjectBlobPage | `web/page/project/blob/ProjectBlobPage` | stub | [ ] |
| `/:project/~commits` | ProjectCommitsPage | `web/page/project/commits/ProjectCommitsPage` | stub | [ ] |
| `/:project/~commits/:commit` | CommitDetailPage | `web/page/project/commits/CommitDetailPage` | stub | [ ] |
| `/:project/~compare` | RevisionComparePage | `web/page/project/compare/RevisionComparePage` | stub | [ ] |
| `/:project/~branches` | ProjectBranchesPage | `web/page/project/branches/ProjectBranchesPage` | stub | [ ] |
| `/:project/~tags` | ProjectTagsPage | `web/page/project/tags/ProjectTagsPage` | stub | [ ] |
| `/:project/~code-comments` | ProjectCodeCommentsPage | `web/page/project/codecomments/ProjectCodeCommentsPage` | stub | [ ] |
| `/:project/~code-comments/:id/invalid` | InvalidCodeCommentPage | `web/page/project/codecomments/InvalidCodeCommentPage` | stub | [ ] |
| `/:project/~stats/code/contribs` | CodeContribsPage | `web/page/project/stats/code/CodeContribsPage` | stub | [ ] |
| `/:project/~stats/code/lines` | SourceLinesPage | `web/page/project/stats/code/SourceLinesPage` | stub | [ ] |
| `/:project/~stats/buildmetric` | BuildMetricStatsPage | `web/page/project/stats/buildmetric/BuildMetricStatsPage` | stub | [ ] |
| `/:project/~children` | ProjectChildrenPage | `web/page/project/children/ProjectChildrenPage` | stub | [ ] |
| `/:project/~no-storage` | NoProjectStoragePage | `web/page/project/NoProjectStoragePage` | stub | [ ] |

---

## Wave 3 — 项目内：Issue / 看板 / 迭代

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project/~issues` | ProjectIssueListPage | `web/page/project/issues/list/ProjectIssueListPage` | stub | [ ] |
| `/:project/~issues/new` | NewIssuePage | `web/page/project/issues/create/NewIssuePage` | stub | [ ] |
| `/:project/~issues/import/:importer` | IssueImportPage | `web/page/project/issues/imports/IssueImportPage` | stub | [ ] |
| `/:project/~issues/:issue` | IssueDetailPage / IssueActivitiesPage | `web/page/project/issues/detail/` | stub | [ ] |
| `/:project/~issues/:issue/commits` | IssueCommitsPage | `web/page/project/issues/detail/IssueCommitsPage` | stub | [ ] |
| `/:project/~issues/:issue/pulls` | IssuePullRequestsPage | `web/page/project/issues/detail/IssuePullRequestsPage` | stub | [ ] |
| `/:project/~issues/:issue/builds` | IssueBuildsPage | `web/page/project/issues/detail/IssueBuildsPage` | stub | [ ] |
| `/:project/~issues/:issue/authorizations` | IssueAuthorizationsPage | `web/page/project/issues/detail/IssueAuthorizationsPage` | stub | [ ] |
| `/:project/~boards` | IssueBoardsPage | `web/page/project/issues/boards/IssueBoardsPage` | stub | [ ] |
| `/:project/~boards/:board` | IssueBoardsPage | 同上 | stub | [ ] |
| `/:project/~iterations` | IterationListPage | `web/page/project/issues/iteration/IterationListPage` | stub | [ ] |
| `/:project/~iterations/new` | NewIterationPage | `web/page/project/issues/iteration/NewIterationPage` | stub | [ ] |
| `/:project/~iterations/:iteration` | IterationIssuesPage | `web/page/project/issues/iteration/IterationIssuesPage` | stub | [ ] |
| `/:project/~iterations/:iteration/burndown` | IterationBurndownPage | `web/page/project/issues/iteration/IterationBurndownPage` | stub | [ ] |
| `/:project/~iterations/:iteration/edit` | IterationEditPage | `web/page/project/issues/iteration/IterationEditPage` | stub | [ ] |

---

## Wave 4 — 项目内：Pull Request

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project/~pulls` | ProjectPullRequestsPage | `web/page/project/pullrequests/ProjectPullRequestsPage` | stub | [ ] |
| `/:project/~pulls/new` | NewPullRequestPage | `web/page/project/pullrequests/create/NewPullRequestPage` | stub | [ ] |
| `/:project/~pulls/:request` | PullRequestActivitiesPage | `web/page/project/pullrequests/detail/activities/` | stub | [ ] |
| `/:project/~pulls/:request/changes` | PullRequestChangesPage | `web/page/project/pullrequests/detail/changes/` | stub | [ ] |
| `/:project/~pulls/:request/code-comments` | PullRequestCodeCommentsPage | `web/page/project/pullrequests/detail/codecomments/` | stub | [ ] |
| `/:project/~pulls/:request/invalid` | InvalidPullRequestPage | `web/page/project/pullrequests/InvalidPullRequestPage` | stub | [ ] |

---

## Wave 5 — 项目内：构建 CI/CD

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project/~builds` | ProjectBuildsPage | `web/page/project/builds/ProjectBuildsPage` | stub | [ ] |
| `/:project/~builds/:build` | BuildDashboardPage | `web/page/project/builds/detail/dashboard/` | stub | [ ] |
| `/:project/~builds/:build/pipeline` | BuildPipelinePage | `web/page/project/builds/detail/pipeline/` | stub | [ ] |
| `/:project/~builds/:build/log` | BuildLogPage | `web/page/project/builds/detail/log/` | stub | [ ] |
| `/:project/~builds/:build/changes` | BuildChangesPage | `web/page/project/builds/detail/changes/` | stub | [ ] |
| `/:project/~builds/:build/fixed-issues` | FixedIssuesPage | `web/page/project/builds/detail/issues/` | stub | [ ] |
| `/:project/~builds/:build/artifacts` | BuildArtifactsPage | `web/page/project/builds/detail/artifacts/` | stub | [ ] |
| `/:project/~builds/:build/packages/:type` | BuildPacksPage | `web/page/project/builds/detail/pack/` | stub | [ ] |
| `/:project/~builds/:build/invalid` | InvalidBuildPage | `web/page/project/builds/detail/InvalidBuildPage` | stub | [ ] |
| `/:project/~builds/:build/reports/:report` | BuildReportPage | `web/page/project/builds/detail/report/` | stub | [ ] |

---

## Wave 6 — 项目内：制品 / Workspace

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project/~packages` | ProjectPacksPage | `web/page/project/packs/ProjectPacksPage` | stub | [ ] |
| `/:project/~packages/:pack` | PackDetailPage | `web/page/project/packs/detail/PackDetailPage` | stub | [ ] |
| `/:project/~workspaces` | ProjectWorkspacesPage | `web/page/project/workspaces/ProjectWorkspacesPage` | stub | [ ] |
| `/:project/~workspaces/:ws` | WorkspaceDashboardPage | `web/page/project/workspaces/detail/dashboard/` | stub | [ ] |
| `/:project/~workspaces/:ws/terminals/:shell` | WorkspaceTerminalPage | `web/page/project/workspaces/detail/terminal/` | stub | [ ] |
| `/:project/~workspaces/:ws/changes` | WorkspaceChangesPage | `web/page/project/workspaces/detail/changes/` | stub | [ ] |
| `/:project/~workspaces/:ws/log` | WorkspaceLogPage | `web/page/project/workspaces/detail/log/` | stub | [ ] |

---

## Wave 7 — 项目设置

| 路由 | OneDev 页面 | 参考路径 | API | 状态 |
|------|-------------|----------|-----|------|
| `/:project/~settings/general` | GeneralProjectSettingPage | `web/page/project/setting/general/` | stub | [ ] |
| `/:project/~settings/user-authorizations` | UserAuthorizationsPage | `web/page/project/setting/authorization/` | stub | [ ] |
| `/:project/~settings/group-authorizations` | GroupAuthorizationsPage | 同上 | stub | [ ] |
| `/:project/~settings/avatar-edit` | AvatarEditPage | `web/page/project/setting/avatar/` | stub | [ ] |
| `/:project/~settings/branch-protection` | BranchProtectionsPage | `web/page/project/setting/code/branchprotection/` | stub | [ ] |
| `/:project/~settings/tag-protection` | TagProtectionsPage | `web/page/project/setting/code/tagprotection/` | stub | [ ] |
| `/:project/~settings/code-analysis` | CodeAnalysisSettingPage | `web/page/project/setting/code/analysis/` | stub | [ ] |
| `/:project/~settings/git-pack-config` | GitPackConfigPage | `web/page/project/setting/code/git/` | stub | [ ] |
| `/:project/~settings/pull-request` | PullRequestSettingPage | `web/page/project/setting/code/pullrequest/` | stub | [ ] |
| `/:project/~settings/build/*` | JobSecrets, JobProperties, BuildPreservations, … | `web/page/project/setting/build/` | stub | [ ] |
| `/:project/~settings/issue/*` | ProjectIssueSetting, StateTransitions, BranchPrefix | `web/page/project/setting/issuesetting/` | stub | [ ] |
| `/:project/~settings/service-desk` | ServiceDeskSettingPage | `web/page/project/setting/servicedesk/` | stub | [ ] |
| `/:project/~settings/web-hooks` | WebHooksPage | `web/page/project/setting/webhook/` | stub | [ ] |
| `/:project/~settings/ai` | ProjectAiSettingPage | `web/page/project/setting/ai/` | stub | [ ] |
| `/:project/~settings/workspace-spec` | WorkspaceSpecsPage | `web/page/project/setting/workspacespec/` | stub | [ ] |
| `/:project/~settings/:pluginSetting` | ContributedProjectSettingPage | `web/page/project/setting/pluginsettings/` | stub | [ ] |

---

## Wave 8 — 我的账户（~my）

| 路由 | OneDev 页面 | API | 状态 |
|------|-------------|-----|------|
| `/~my` | MyProfilePage | stub | [ ] |
| `/~my/basic-setting` | MyBasicSettingPage | stub | [ ] |
| `/~my/email-addresses` | MyEmailAddressesPage | stub | [ ] |
| `/~my/avatar` | MyAvatarPage | stub | [ ] |
| `/~my/password` | MyPasswordPage | stub | [ ] |
| `/~my/ai-model-setting` | MyModelSettingPage | stub | [ ] |
| `/~my/ai-system-prompt` | MySystemPromptPage | stub | [ ] |
| `/~my/ai-entitlement-setting` | MyEntitlementSettingPage | stub | [ ] |
| `/~my/ssh-keys` | MySshKeysPage | stub | [ ] |
| `/~my/gpg-keys` | MyGpgKeysPage | stub | [ ] |
| `/~my/access-tokens` | MyAccessTokensPage | stub | [ ] |
| `/~my/two-factor-authentication` | MyTwoFactorAuthenticationPage | stub | [ ] |
| `/~my/sso-accounts` | MySsoAccountsPage | stub | [ ] |
| `/~my/query-watches/:tab` | MyQueryWatchesPage | stub | [ ] |
| `/~my/workspace-data` | MyWorkspaceDataPage | stub | [ ] |

---

## Wave 9 — 用户管理页（~users，管理员视角）

| 路由 | OneDev 页面 | API | 状态 |
|------|-------------|-----|------|
| `/~users/:user` | UserProfilePage | stub | [ ] |
| `/~users/:user/basic-setting` | UserBasicSettingPage | stub | [ ] |
| `/~users/:user/email-setting` | UserEmailAddressesPage | stub | [ ] |
| `/~users/:user/groups` | UserMembershipsPage | stub | [ ] |
| `/~users/:user/authorizations` | UserAuthorizationsPage | stub | [ ] |
| `/~users/:user/avatar` | UserAvatarPage | stub | [ ] |
| `/~users/:user/password` | UserPasswordPage | stub | [ ] |
| `/~users/:user/ai-*` | User AI settings (3 pages) | stub | [ ] |
| `/~users/:user/ssh-keys` | UserSshKeysPage | stub | [ ] |
| `/~users/:user/gpg-keys` | UserGpgKeysPage | stub | [ ] |
| `/~users/:user/access-tokens` | UserAccessTokensPage | stub | [ ] |
| `/~users/:user/two-factor-authentication` | UserTwoFactorAuthenticationPage | stub | [ ] |
| `/~users/:user/sso-accounts` | UserSsoAccountsPage | stub | [ ] |
| `/~users/:user/query-watches/:tab` | UserQueryWatchesPage | stub | [ ] |
| `/~users/:user/workspace-data` | UserWorkspaceDataPage | stub | [ ] |

---

## Wave 10 — 管理后台（~administration）

### 10.1 用户 / 角色 / 组

| 路由 | OneDev 页面 | API | 状态 |
|------|-------------|-----|------|
| `/~administration/users` | UserListPage | stub | [ ] |
| `/~administration/users/new` | NewUserPage | stub | [ ] |
| `/~administration/invitations` | InvitationListPage | stub | [ ] |
| `/~administration/invitations/new` | NewInvitationPage | stub | [ ] |
| `/~administration/roles` | RoleListPage | stub | [ ] |
| `/~administration/roles/new` | NewRolePage | stub | [ ] |
| `/~administration/roles/:role` | RoleDetailPage | stub | [ ] |
| `/~administration/groups` | GroupListPage | stub | [ ] |
| `/~administration/groups/new` | NewGroupPage | stub | [ ] |
| `/~administration/groups/:group` | GroupProfilePage | stub | [ ] |
| `/~administration/groups/:group/members` | GroupMembershipsPage | stub | [ ] |
| `/~administration/groups/:group/authorizations` | GroupAuthorizationsPage | stub | [ ] |
| `/~administration/labels` | LabelManagementPage | stub | [ ] |

### 10.2 系统设置

| 路由 | OneDev 页面 | API | 状态 |
|------|-------------|-----|------|
| `/~administration/settings/system` | SystemSettingPage | stub | [ ] |
| `/~administration/settings/security` | SecuritySettingPage | stub | [ ] |
| `/~administration/settings/branding` | BrandingSettingPage | stub | [ ] |
| `/~administration/settings/mail-service` | MailConnectorPage | stub | [ ] |
| `/~administration/settings/service-desk-setting` | ServiceDeskSettingPage | stub | [ ] |
| `/~administration/settings/authenticator` | AuthenticatorPage | stub | [ ] |
| `/~administration/settings/sso-providers` | SsoProviderListPage | stub | [ ] |
| `/~administration/settings/sso-providers/new` | NewSsoProviderPage | stub | [ ] |
| `/~administration/settings/sso-providers/:provider` | SsoProviderDetailPage | stub | [ ] |
| `/~administration/settings/ssh-server-key` | SshServerKeyPage | stub | [ ] |
| `/~administration/settings/gpg-signing-key` | GpgSigningKeyPage | stub | [ ] |
| `/~administration/settings/gpg-trusted-keys` | GpgTrustedKeysPage | stub | [ ] |
| `/~administration/settings/backup` | DatabaseBackupPage | stub | [ ] |
| `/~administration/settings/alert` | AlertSettingPage | stub | [ ] |
| `/~administration/settings/performance` | PerformanceSettingPage | stub | [ ] |
| `/~administration/settings/lite-ai-model` | LiteModelPage | stub | [ ] |
| `/~administration/settings/chat-preserve-days` | ChatPreserveDaysPage | stub | [ ] |
| `/~administration/settings/:pluginSetting` | ContributedAdministrationSettingPage | stub | [ ] |

### 10.3 邮件模板（13 页）

| 路由后缀 | OneDev 页面 | 状态 |
|----------|-------------|------|
| `email-templates/issue-notification` | IssueNotificationTemplatePage | [ ] |
| `email-templates/pull-request-notification` | PullRequestNotificationTemplatePage | [ ] |
| `email-templates/build-notification` | BuildNotificationTemplatePage | [ ] |
| `email-templates/pack-notification` | PackNotificationTemplatePage | [ ] |
| `email-templates/workspace-notification` | WorkspaceNotificationTemplatePage | [ ] |
| `email-templates/commit-notification` | CommitNotificationTemplatePage | [ ] |
| `email-templates/issue-notification-unsubscribed` | IssueNotificationUnsubscribedTemplatePage | [ ] |
| `email-templates/pull-request-notification-unsubscribed` | PullRequestNotificationUnsubscribedTemplatePage | [ ] |
| `email-templates/service-desk-issue-opened` | ServiceDeskIssueOpenedTemplatePage | [ ] |
| `email-templates/service-desk-issue-open-failed` | ServiceDeskIssueOpenFailedTemplatePage | [ ] |
| `email-templates/user-invitation` | UserInvitationTemplatePage | [ ] |
| `email-templates/email-verification` | EmailVerificationTemplatePage | [ ] |
| `email-templates/password-reset` | PasswordResetTemplatePage | [ ] |
| `email-templates/stopwatch-overdue` | StopwatchOverdueTemplatePage | [ ] |
| `email-templates/alert` | AlertTemplatePage | [ ] |

### 10.4 Issue 全局设置

| 路由 | OneDev 页面 | 状态 |
|------|-------------|------|
| `/~administration/settings/issue-fields` | IssueFieldListPage | [ ] |
| `/~administration/settings/issue-states` | IssueStateListPage | [ ] |
| `/~administration/settings/state-transitions` | StateTransitionListPage | [ ] |
| `/~administration/settings/issue-boards` | DefaultBoardListPage | [ ] |
| `/~administration/settings/issue-links` | LinkSpecListPage | [ ] |
| `/~administration/settings/time-tracking` | TimeTrackingSettingPage | [ ] |
| `/~administration/settings/issue-templates` | IssueTemplateListPage | [ ] |
| `/~administration/settings/commit-message-fix` | CommitMessageFixSettingPage | [ ] |
| `/~administration/settings/external-issue-transformers` | ExternalIssueTransformersPage | [ ] |
| `/~administration/settings/check-issue-integrity` | CheckIssueIntegrityPage | [ ] |

### 10.5 Agent / 构建 / Workspace

| 路由 | OneDev 页面 | 状态 |
|------|-------------|------|
| `/~administration/agents` | AgentListPage | [ ] |
| `/~administration/agents/:agent` | AgentOverviewPage | [ ] |
| `/~administration/agents/:agent/builds` | AgentBuildsPage | [ ] |
| `/~administration/agents/:agent/workspaces` | AgentWorkspacesPage | [ ] |
| `/~administration/agents/:agent/log` | AgentLogPage | [ ] |
| `/~administration/settings/job-executors` | JobExecutorsPage | [ ] |
| `/~administration/settings/workspace-provisioners` | WorkspaceProvisionersPage | [ ] |
| `/~administration/settings/groovy-scripts` | GroovyScriptListPage | [ ] |
| `/~administration/server-log/:server` | ServerLogPage | [ ] |
| `/~administration/server-information/:server` | ServerInformationPage | [ ] |

---

## Wave 11 — 帮助 / 错误 / 杂项

| 路由 | OneDev 页面 | 状态 |
|------|-------------|------|
| `/~help/incompatibilities` | IncompatibilitiesPage | [ ] |
| `/~help/api` | ResourceListPage | [ ] |
| `/~help/api/:resource` | ResourceDetailPage | [ ] |
| `/~help/api/:resource/:method` | MethodDetailPage | [ ] |
| `/~errors/404` | PageNotFoundErrorPage | [ ] |
| `/~test` | TestPage | [ ] 可选，开发用 |

---

## Wave 12 — 插件贡献页（动态路由）

OneDev 插件通过 `ContributedProjectSettingPage` / `ContributedAdministrationSettingPage` 注册额外设置页。buildx-web 需：

| ID | 任务 | 状态 |
|----|------|------|
| P12-1 | 动态路由 `/:project/~settings/:key` 占位壳 | [ ] |
| P12-2 | 动态路由 `/~administration/settings/:key` 占位壳 | [ ] |
| P12-3 | 插件报告页（unittest、coverage 等 server-plugin）按插件清单扩展 | [ ] |

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

**当前进度**：W0 部分完成；W1 `/~projects` 进行中；其余未开始。

---

## 协作方式

1. **前端优先冲刺**：按 Wave 并行，多人可同时认领不同 Wave
2. **每页 PR**：附 OneDev 对照截图 + 路由路径
3. **API 不阻塞合并**：mock 数据即可 merge
4. **API 就绪后**：仅改 `src/api/` 与 fixture 开关，不改页面结构

更新本文件时：将 `[ ]` 改为 `[x]`，API 列改为 `partial` / `live`。
