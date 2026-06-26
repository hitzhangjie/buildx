# Architecture

## Overview

BuildX follows a modular monolith architecture — a single deployable binary with clear internal boundaries. This mirrors OneDev's plugin-based monolith while leveraging Go's simplicity.

```
                    ┌─────────────────────────────────────┐
                    │           Web UI (React/Wicket)    │
                    │         web/ — OneDev-compatible   │
                    └─────────────────┬───────────────────┘
                                      │ HTTP / WebSocket
                    ┌─────────────────▼───────────────────┐
                    │         API Gateway (chi router)     │
                    │    REST  +  Streaming  +  GraphQL?   │
                    └─────────────────┬───────────────────┘
                                      │
        ┌─────────────┬───────────────┼───────────────┬─────────────┐
        │             │               │               │             │
   ┌────▼────┐  ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
   │ Project │  │   Issue   │  │    PR     │  │   CI/CD   │  │   Agent   │
   │         │  │  Kanban   │  │  Review   │  │  Pipeline │  │  Context  │
   └────┬────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
        │             │               │               │             │
        └─────────────┴───────────────┼───────────────┴─────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │              Git Core                │
                    │   Smart HTTP  ·  SSH  ·  LFS  · Hooks│
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │            Storage Layer             │
                    │   SQLite/PG  ·  Blob  ·  Attachments │
                    └─────────────────────────────────────┘
```

## Module mapping (OneDev → BuildX)

### Mapping policy (important)

To keep traceability with OneDev source code, BuildX follows this rule:

1. **Default: keep OneDev names** for module/package/interface as-is
2. **Rename only when Go requires it** (reserved keyword, naming convention, or unavoidable package collision)
3. **Any rename must keep an explicit alias record** in this document

Reference source: `references/onedev/server-core/src/main/java/io/onedev/server`

### Package-group mapping table

| OneDev package prefix | BuildX package prefix | Notes |
|---|---|---|
| `io.onedev.server.model` | `internal/model` | Entity names aligned (`User`, `Project`, `Role`, `AccessToken`, …) |
| `io.onedev.server.entitymanager` | `internal/entitymanager` (planned) | Service-manager naming stays close to OneDev |
| `io.onedev.server.git` | `internal/git` | Keep Git protocol concepts aligned |
| `io.onedev.server.buildspec` | `internal/buildspec` | YAML parser for jobs, steps, templates, triggers |
| `io.onedev.k8shelper` (Action IR) | `internal/execplan` | Step → Action/CompositeFacade/LeafFacade compile + traverse |
| `io.onedev.server.job` | `internal/job` | Submit, scheduling loop, `runBuild`, DAG helpers |
| `io.onedev.server.build` / build persistence | `internal/build` | Build CRUD REST; execution wired via `job` |
| `io.onedev.server.service.RunCacheService` | `internal/cache` | Job cache tar storage (project/key/checksum) |
| Artifact storage (`StorageService.initArtifactsDir`) | `internal/artifact` | Publish + dependency copy |
| `io.onedev.server.security` | `internal/security` (planned) | Prefer `security` over `auth` for naming parity |
| `io.onedev.server.search` | `internal/search` (planned) | Keep query/search model aligned |
| `io.onedev.server.event` | `internal/event` (planned) | Keep event types and names close |
| `io.onedev.server.plugin` + `server-plugin/*` | `internal/plugin` | Plugin extension points remain first-class |
| `tod` CLI | `buildx-cli/cmd/buildx-cli` | CLI capability maps to standalone `buildx-cli` command model |
| Persistence (Hibernate/JPA layer) | `internal/persistence` + `internal/persistence/sqlite` | SQLite MVP; maps to OneDev `DataService`, not filesystem `StorageService` |

### Current naming deviations (tracked)

Current scaffold has been aligned for core package names (`build`, `security`, `persistence`).  
Only Go-style formatting differences remain (for example `pullrequest` package style), and these differences must be explicitly tracked whenever introduced.

## Key technical decisions

### HTTP framework: chi

Lightweight, idiomatic, composable middleware. No heavy framework magic.

### Git engine: go-git + native git

- `go-git` for pure-Go operations (diff, log, object storage)
- Shell out to `git` for performance-critical pack operations initially
- Evaluate `gitoxide` as maturity allows

### Database: SQLite default, PostgreSQL for production

- Embedded SQLite for single-node / dev
- PostgreSQL for HA multi-node deployments
- Schema migrations via `goose` or `atlas`

### CI/CD executors

Plugin interface inspired by OneDev:

- `servershell` — run on BuildX host (`internal/executor/servershell`)
- `serverdocker` — Docker CLI on host (`internal/executor/docker`, auto-enabled when Docker available)
- `remoteshell` — remote agents via WebSocket `executePlan` + `internal/worker` REST API
- `remotedocker` — docker-aware jobs on remote agents (skeleton, `internal/executor/remotedocker`)
- `kubernetes` — K8s jobs skeleton (`internal/executor/kubernetes`, enabled when kubeconfig present)

**buildx-agent** (`buildx-server/cmd/buildx-agent`): standalone CI worker binary; connects to `/~api/agents/ws`, executes plans locally, calls `/~api/worker/*` for server steps and cache.

**Resource allocation**: `internal/resource/` selects online agents by query with per-agent concurrency slots (OneDev `ResourceService` subset).

Worker/internal API: `buildx-server/internal/worker/` (JSON job-data, run-server-step, cache) maps to OneDev `WorkerResource`.

### Frontend strategy

**Approach**: New React UI (`buildx-web/`) + Go `/~api`, **visual parity with OneDev** (reuse CSS tokens, layout shell, icons — see [buildx-web-design.md](buildx-web-design.md)).

**Build**: `make build` embeds `buildx-web/dist` into the server binary (single process).

**Not in scope**: Running Wicket HTML/JS against Go backend.

### AI integration

The `internal/agent` package provides:

1. **Context assembly** — unified JSON context across issue/PR/build/code
2. **Skill registry** — port of `references/tod/skills/` as first-class API
3. **Webhook hooks** — notify agents on state transitions

## Deployment topology

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   BuildX     │────▶│  PostgreSQL  │     │  K8s Cluster │
│   (single    │     │  (optional)  │     │  (executors) │
│    binary)   │────▶│              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
  Git repos + blobs (local disk / S3-compatible)
```

Default ports (OneDev-compatible):

- `9910` — HTTP (Git smart HTTP + UI + API)
- `9911` — SSH (Git over SSH)

## Cross-cutting concerns

| Concern | Approach |
|---|---|
| Config | Environment variables + config file |
| Logging | `log/slog` structured logging |
| Auth | Session + personal access tokens + SSO plugins |
| Events | In-process event bus → notifications/webhooks |
| Search | Full-text index (SQLite FTS / Meilisearch) |
| Metrics | Prometheus `/metrics` endpoint |
