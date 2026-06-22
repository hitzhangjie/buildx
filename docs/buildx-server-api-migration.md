# buildx-server REST API 迁移追踪（UI 后置补齐）

与 [buildx-web-migration.md](buildx-web-migration.md) 配合：前端先全量搬迁页面，本文件追踪 `/~api` 与 OneDev REST 的 parity。

参考：`references/onedev/server-core/src/main/java/io/onedev/server/rest/resource/`

| OneDev Resource | 路径前缀 | buildx-server | 备注 |
|-----------------|----------|---------------|------|
| UserResource | `/users` | partial | GET/POST 已有；缺完整 CRUD |
| ProjectResource | `/projects` | partial | GET/POST/setup |
| AccessTokenResource | `/access-tokens` | — | |
| RoleResource | `/roles` | — | |
| GroupResource | `/groups` | — | |
| MembershipResource | `/memberships` | — | |
| EmailAddressResource | `/email-addresses` | — | |
| SshKeyResource | `/ssh-keys` | — | |
| IssueResource | `/issues` | — | |
| IssueCommentResource | `/issue-comments` | — | |
| IssueLinkResource | `/issue-links` | — | |
| IssueVoteResource | `/issue-votes` | — | |
| IssueWatchResource | `/issue-watches` | — | |
| IssueWorkResource | `/issue-works` | — | |
| IterationResource | `/iterations` | — | |
| PullRequestResource | `/pull-requests` | — | |
| PullRequestCommentResource | `/pull-request-comments` | — | |
| PullRequestReviewResource | `/pull-request-reviews` | — | |
| PullRequestAssignmentResource | `/pull-request-assignments` | — | |
| PullRequestWatchResource | `/pull-request-watches` | — | |
| BuildResource | `/builds` | — | |
| BuildLogStreamResource | `/build-log-stream` | — | 流式 |
| JobRunResource | `/job-runs` | — | |
| TriggerJobResource | `/trigger-job` | — | |
| CodeCommentResource | `/code-comments` | — | |
| RepositoryResource | `/repositories` | — | Git 浏览 |
| PackResource | `/packs` | — | |
| PackBlobResource | `/pack-blobs` | — | |
| ArtifactResource | `/artifacts` | — | |
| SettingResource | `/settings` | — | 管理设置 |
| SsoProviderResource | `/sso-providers` | — | |
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
