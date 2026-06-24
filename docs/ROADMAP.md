# Roadmap

Migration progress for **buildx-server** (from OneDev) and **buildx-cli** (from tod). Update this file after each migrated feature batch.

## buildx-server migration (OneDev → Go)

### Phase 0 — Foundation (current)

- [x] Project scaffold and naming (`buildx-server`)
- [x] Module boundaries aligned with OneDev domains
- [x] HTTP server with health/info endpoints
- [x] Documentation (vision, architecture, roadmap) moved to repo `docs/`
- [x] `go mod tidy` and core dependencies (chi, sqlite, bcrypt)
- [ ] CI pipeline

### Phase 1 — Core platform (MVP)

- [x] Storage layer (SQLite + embedded migrations, OneDev `o_*` schema subset)
- [x] User authentication (local accounts, Basic/Bearer, access token lookup)
- [x] Project CRUD and hierarchy (`setup` path walk, git bare init on disk)
- [ ] Replace bare repo init: `git init` CLI → `go-git` (OneDev uses in-process JGit; no git binary required for init)
- [ ] Git smart HTTP (clone, push, pull)
- [ ] Git SSH
- [x] Basic REST API (`/~api/users`, `/~api/projects`) — partial parity
- [x] Project file management API (blob browse, create/update/delete file, raw download)

**Milestone**: Can create a project, push code via HTTP/SSH.

### Phase 2 — Collaboration

- [x] Issue tracking — core MVP (CRUD, default states, comments, iteration schedule)
- [~] Issue iterations (list/create/edit/burndown — live API; chart + advanced stats pending)
- [~] Kanban boards (dynamic columns from settings, backlog, drag state transition; card ordering pending)
- [~] Issue global settings (`GET/POST /~api/settings/issue`; admin edit UI pending)
- [ ] Issue extended: custom fields, labels, assignees, links, votes, watches, import
- [~] Pull requests — 主流程已通（列表/新建/详情/评审/merge）；详见 [pull-request-migration.md](pull-request-migration.md)
- [x] Code comments (inline + file-level with thread replies, resolve/unresolve, delete)
- [~] Code compare (`/~compare`) — merge-base, commits, diffs, patch download, effective PR; see [code-compare-migration.md](code-compare-migration.md)
- [~] Cross-linking (issue ↔ commit ↔ PR ↔ build) — Issue↔PR 列表已 partial；commits/builds tab 仍 stub
- [ ] Notifications (email, webhook)

**Milestone**: Full issue-to-PR workflow without leaving BuildX.

> **Issue 续做**：见 [buildx-web-migration.md § Wave 3 续做指南](buildx-web-migration.md#wave-3-续做指南issue--看板--迭代)。  
> **PR 续做**：见 [pull-request-migration.md](pull-request-migration.md)。

### Phase 3 — CI/CD

- [ ] Buildspec parser (`.onedev-buildspec.yml`, OneDev-compatible)
- [ ] Job scheduler and build queue
- [ ] Server shell executor
- [ ] Server Docker executor
- [ ] Kubernetes executor
- [ ] Build log streaming
- [ ] Job cache and artifacts

**Milestone**: Push code → CI runs → status reported on PR.

### Phase 4 — AI-first

- [ ] Unified agent context API
- [ ] Agent skills (`skills/` directory)
- [ ] Webhook hooks for agent workflows

**Milestone**: AI agent can drive full dev workflow via CLI and API.

### Phase 5 — Enterprise & ecosystem

- [ ] Plugin system (dynamic loading or compile-time registry)
- [ ] SSO (OIDC, LDAP)
- [ ] Import plugins (GitHub, GitLab, Jira)
- [ ] Package registries (Maven, npm, Docker)
- [ ] HA deployment guide
- [ ] OneDev data migration tool

**Milestone**: Production-ready for enterprise self-hosting.

### Phase 6 — Frontend (1:1 OneDev UI port)

- [x] `buildx-web/` standalone Vite + React app
- [x] Embed UI into `buildx-server` binary via `go:embed` (single-process deploy)
- [x] OneDev visual asset sync (`sync-onedev-assets`)
- [x] Migration task list — [buildx-web-migration.md](buildx-web-migration.md) (**223 pages**)
- [x] Wave 0 scaffolding — router, layouts, mocks, `PageRenderer` placeholders, Playwright smoke
- [x] All 223 routes reachable (scaffold only; **not** parity)
- [ ] **1:1 page port** — each Wicket page → dedicated React component; DOM/class/interaction match; screenshot gate ([buildx-web-design.md](buildx-web-design.md))
- [ ] Retire `PageRenderer` fallbacks as pages reach `✓`
- [ ] Complex controls from OneDev assets (CodeMirror, diff, xterm, Kanban, …)
- [ ] Live API wiring (see buildx-server-api-migration.md)
- [ ] buildx-server `/~api` backfill — [buildx-server-api-migration.md](buildx-server-api-migration.md)

---

## buildx-cli migration (tod → Go)

See [buildx-cli-migration.md](buildx-cli-migration.md) for command-level parity tracking.

### Phase 0 — Foundation (current)

- [x] CLI scaffold (`buildx-cli` binary)
- [x] Config file and env overrides
- [x] HTTP client to `/~api/cli/...`
- [x] Command groups: `project`, `issue`, `pr`, `build`, `config`, `cr`

### Phase 1 — Core commands

- [ ] Full parity with `references/tod` for project/issue/pr/build flows
- [ ] Error messages and exit codes aligned with tod
- [ ] Output formats (table/json) where tod supports them

### Phase 2 — Agent workflows

- [ ] Skills directory support
- [ ] Local CI runs (`buildx-cli build run --local`)
- [ ] PR checkout (`buildx-cli pr checkout`)

---

## Contributing priorities

1. **Git smart HTTP** — highest leverage for MVP
2. **Storage + migrations** — foundation for everything else
3. **Buildspec parser** — can port logic from OneDev's ANTLR grammar
4. **K8s executor** — reuse `references/k8s-helper` patterns

## Versioning

BuildX uses [Semantic Versioning](https://semver.org/). Pre-1.0 releases may break APIs freely.
