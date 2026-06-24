# buildx-server REST API 迁移追踪（UI 后置补齐）

与 [buildx-web-migration.md](buildx-web-migration.md) 配合：前端先全量搬迁页面，本文件追踪 `/~api` 与 OneDev REST 的 parity。

参考：`references/onedev/server-core/src/main/java/io/onedev/server/rest/resource/`

| OneDev Resource | 路径前缀 | buildx-server | 备注 |
|-----------------|----------|---------------|------|
| UserResource | `/users` | partial | GET/POST 已有；缺完整 CRUD |
| ProjectResource | `/projects` | partial | GET/POST/setup |
| AccessTokenResource | `/access-tokens` | partial | list/create/get/delete |
| RoleResource | `/roles` | — | |
| GroupResource | `/groups` | — | |
| MembershipResource | `/memberships` | — | |
| EmailAddressResource | `/email-addresses` | — | |
| SshKeyResource | `/ssh-keys` | — | |
| IssueResource | `/issues` | partial | CRUD, query (`projectId`/`iterationId`/unscheduled), title/description, state-transitions, iterations schedule |
| IssueCommentResource | `/issue-comments` | partial | create, get, delete |
| IssueLinkResource | `/issue-links` | — | |
| IssueVoteResource | `/issue-votes` | — | |
| IssueWatchResource | `/issue-watches` | — | |
| IssueWorkResource | `/issue-works` | — | 工时 |
| IterationResource | `/iterations` | partial | project list/create; get/update/delete; `/{id}/issues`, `/{id}/burndown`（汇总） |
| PullRequestResource | `/pulls` | partial | ✅ query/get/create/title/description/merge-strategy/merge/discard/reopen/merge-preview/comments/reviews — ⬜ assignments/labels/watches/updates/changes/builds/auto-merge/delete — 详见 [pull-request-migration.md](pull-request-migration.md) |
| PullRequestCommentResource | `/pull-request-comments` | partial | ✅ POST create — ⬜ GET/update/delete |
| PullRequestReviewResource | `/pull-request-reviews` | partial | ✅ POST（approve/request changes/pending/excluded + userId） — ⬜ GET by id |
| PullRequestAssignmentResource | `/pull-request-assignments` | — | |
| PullRequestWatchResource | `/pull-request-watches` | — | |
| PullRequestLabelResource | `/pull-request-labels` | — | OneDev 独立 Resource |
| BuildResource | `/builds` | partial | query, get, labels, params, description, delete; no JobRun/log stream yet |
| BuildLogStreamResource | `/build-log-stream` | — | 流式 |
| JobRunResource | `/job-runs` | — | |
| TriggerJobResource | `/trigger-job` | — | |
| CodeCommentResource | `/code-comments` | partial | CRUD, replies, resolved, project list |
| RepositoryResource | `/repositories` | partial | branches, commits, compare, blob browse, files POST, raw |
| PackResource | `/packs` | — | |
| PackBlobResource | `/pack-blobs` | — | |
| ArtifactResource | `/artifacts` | — | |
| SettingResource | `/settings` | partial | `GET/POST /settings/issue`（`GlobalIssueSetting`）；`v1/settings/branding|security` 只读 |
| SsoProviderResource | `/sso-providers` | partial | list stub |
| AgentResource | `/agents` | — | |
| AgentTokenResource | `/agent-tokens` | — | |
| WorkerResource | `/workers` | — | |
| LabelSpecResource | `/label-specs` | — | |
| ProjectLabelResource | `/project-labels` | — | |
| BuildLabelResource | `/build-labels` | — | |
| PackLabelResource | `/pack-labels` | — | |
| UserAuthorizationResource | `/user-authorizations` | — | |
| GroupAuthorizationResource | `/group-authorizations` | — | |
| BaseAuthorizationResource | `/base-authorizations` | — | |
| AccessTokenAuthorizationResource | `/access-token-authorizations` | — | |
| VersionResource | `/version` | — | |

状态：`—` 未开始 · `partial` 部分 · `live` 与 OneDev 对齐

---

## Issue 系 API 细项（续做参考）

实现文件：`buildx-server/internal/server/api/issues.go`, `issue_comments.go`, `iterations.go`, `issue_settings.go`  
领域层：`internal/issue/`, `internal/issuesetting/`

| Endpoint | 状态 |
|----------|------|
| `GET /issues?query=&projectId=&iterationId=&offset=&count=` | ✅ |
| `POST /issues`（`iterationIds`） | ✅ |
| `GET|DELETE /issues/{id}` | ✅ |
| `POST /issues/{id}/title|description|state-transitions` | ✅ |
| `GET|POST /issues/{id}/iterations` | ✅ |
| `GET /issues/{id}/comments` | ✅ |
| `POST /issue-comments` | ✅ |
| `GET|POST /projects/{id}/iterations` | ✅ |
| `GET|PATCH|DELETE /iterations/{id}` | ✅ |
| `GET /iterations/{id}/issues` | ✅ |
| `GET /iterations/{id}/burndown` | ✅ 汇总；缺按日序列 |
| `GET|POST /settings/issue` | ✅ |
| `boardPosition` / 列内排序 | ❌ |
| `issue-links` / votes / watches / works | ❌ |
| 自定义字段 / 批量编辑 | ❌ |
| IssueQuery 全语法 | ❌ 子集 |

Web 续做任务详见 [buildx-web-migration.md § Wave 3 续做指南](buildx-web-migration.md#wave-3-续做指南issue--看板--迭代)。
