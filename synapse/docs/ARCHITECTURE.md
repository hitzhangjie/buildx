# Architecture

## Overview

Synapse follows a modular monolith architecture — a single deployable binary with clear internal boundaries. This mirrors OneDev's plugin-based monolith while leveraging Go's simplicity.

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

## Module mapping (OneDev → Synapse)

### Mapping policy (important)

To keep traceability with OneDev source code, Synapse follows this rule:

1. **Default: keep OneDev names** for module/package/interface as-is
2. **Rename only when Go requires it** (reserved keyword, naming convention, or unavoidable package collision)
3. **Any rename must keep an explicit alias record** in this document

This avoids drift and makes future source-level comparison easier.

### Why previous mapping looked too coarse

`onedev/server-core/src/main/java/io/onedev/server` contains many subpackages (`model`, `entitymanager`, `git`, `buildspec`, `web`, `security`, `search`, `event`, etc.), not just a few domain buckets.  
So Synapse mapping should be read as **package-group mapping**, not one-row-per-feature.

### Package-group mapping table

| OneDev package prefix | Synapse package prefix | Notes |
|---|---|---|
| `io.onedev.server.model` | `internal/model` (planned) | Keep entity names aligned (`Project`, `Issue`, `PullRequest`, `Build`, etc.) |
| `io.onedev.server.entitymanager` | `internal/entitymanager` (planned) | Service-manager naming stays close to OneDev |
| `io.onedev.server.git` | `internal/git` | Keep Git protocol concepts aligned |
| `io.onedev.server.buildspec` | `internal/buildspec` (planned) | Keep buildspec terminology aligned |
| `io.onedev.server.job` / `...build` | `internal/build` (planned) | Prefer `build` over generic `cicd` for traceability |
| `io.onedev.server.security` | `internal/security` (planned) | Prefer `security` over `auth` for naming parity |
| `io.onedev.server.search` | `internal/search` (planned) | Keep query/search model aligned |
| `io.onedev.server.event` | `internal/event` (planned) | Keep event types and names close |
| `io.onedev.server.plugin` + `server-plugin/*` | `internal/plugin` | Plugin extension points remain first-class |
| `tod` CLI | `synapse-cli/cmd/cli` | CLI capability maps to standalone `cli` command model |
| Persistence (Hibernate/JPA layer) | `internal/persistence` (planned) | Storage abstraction can exist, but persistence naming should be explicit |

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

- `servershell` — run on Synapse host
- `serverdocker` — Docker on host
- `kubernetes` — K8s jobs (reuse patterns from `k8s-helper` in this repo)
- `remoteshell` / `remotedocker` — remote agents

### Frontend strategy

**Phase 1**: API-compatible backend; serve existing OneDev UI assets where possible  
**Phase 2**: Incremental React migration of high-churn pages  
**Phase 3**: Full modern SPA with shared design system

OneDev's Wicket UI is battle-tested. Rebuilding UX from scratch is unnecessary — we rebuild the engine, not the experience.

### AI integration

The `internal/agent` package provides:

1. **Context assembly** — unified JSON context across issue/PR/build/code
2. **Skill registry** — port of `tod/skills/` as first-class API
3. **Webhook hooks** — notify agents on state transitions

## Deployment topology

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Synapse    │────▶│  PostgreSQL  │     │  K8s Cluster │
│   (single    │     │  (optional)  │     │  (executors) │
│    binary)   │────▶│              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
  Git repos + blobs (local disk / S3-compatible)
```

Default ports (OneDev-compatible):

- `6610` — HTTP (Git smart HTTP + UI + API)
- `6611` — SSH (Git over SSH)

## Cross-cutting concerns

| Concern | Approach |
|---|---|
| Config | Environment variables + config file |
| Logging | `log/slog` structured logging |
| Auth | Session + personal access tokens + SSO plugins |
| Events | In-process event bus → notifications/webhooks |
| Search | Full-text index (SQLite FTS / Meilisearch) |
| Metrics | Prometheus `/metrics` endpoint |
