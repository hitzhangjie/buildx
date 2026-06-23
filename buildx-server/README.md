# BuildX Server

[中文文档](README.zh.md)

**Where every stage of development connects.**

BuildX is an open-source, AI-first unified DevOps platform — rebuilt in Go, inspired by [OneDev](https://github.com/theonedev/onedev). It brings code hosting, issue tracking, kanban boards, code review, CI/CD, package registries, and agent workflows into a single, tightly integrated system.

> 研发流程的「神经突触」—— 让需求、代码、构建、发布之间的每一环都紧密相连。

## Why BuildX?

Large organizations often end up with fragmented tooling: one product for issues, another for Git, another for CI/CD, each built by different teams with weak integration. AI-first development makes this fragmentation even more costly — agents need unified context across the entire workflow.

BuildX addresses this by design:

| Capability | Description |
|---|---|
| **Git hosting** | Smart HTTP, SSH, LFS, branch protection |
| **Issue & kanban** | Issues, sprints, boards, cross-linking |
| **Code review** | Pull requests, inline comments, merge policies |
| **CI/CD** | Buildspec-driven pipelines, Kubernetes/shell executors |
| **Packages** | Maven, npm, Docker, and more |
| **AI-native** | Unified context API and CLI skills for agents |
| **Plugin system** | Extensible executors, auth, and importers |

## Why Go?

- High performance with low memory footprint — ideal for Git and CI workloads
- Cloud-native: single static binary, excellent container/K8s ergonomics
- No JDK licensing concerns — fully open toolchain
- Strong concurrency model for build orchestration and log streaming

The **frontend** will retain OneDev's proven UX patterns (Wicket-based UI can be gradually replaced or wrapped; API compatibility is a design goal).

## Quick start

```bash
cd buildx-server
make build
./bin/buildx-server serve --dev
```

Open http://localhost:6666/~health to verify the server is running.

### Initial admin account

On a **fresh data directory**, the root admin user is created only when all three environment variables are set **before the first start**:

| Variable | Description |
|---|---|
| `BUILDX_INITIAL_USER` | Login username |
| `BUILDX_INITIAL_PASSWORD` | Login password |
| `BUILDX_INITIAL_EMAIL` | Primary email (can also be used to sign in) |

```bash
export BUILDX_INITIAL_USER=admin
export BUILDX_INITIAL_PASSWORD=changeme
export BUILDX_INITIAL_EMAIL=admin@example.com
./bin/buildx-server serve --dev
```

If any of these is missing, bootstrap skips creating the admin account and the web UI will have no user to log in with. This only runs once per data directory (`BUILDX_DATA_DIR`, default `./data`); later starts ignore these variables if the admin already exists.

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `BUILDX_HTTP_ADDR` | `:6666` | HTTP/Web listen address (`host:port`, `:6666`, or plain port `6666`) |
| `BUILDX_SSH_ADDR` | `:6667` | Git SSH listen address |
| `BUILDX_DATA_DIR` | `./data` | Data directory (database, repos, attachments) |
| `BUILDX_WEB_DIR` | (empty) | Frontend static assets; embedded buildx-web when unset |
| `BUILDX_DEV` | `false` | Development mode (verbose logging, etc.) |
| `BUILDX_INITIAL_USER` | — | Admin login name on first start (see above) |
| `BUILDX_INITIAL_PASSWORD` | — | Admin password on first start |
| `BUILDX_INITIAL_EMAIL` | — | Admin primary email on first start |

Variables must be **exported in the same shell** that runs `buildx-server serve` (the server does not load `.env` files). Startup logs print `configuration http=...` so you can verify the effective address. CLI flags override env:

```bash
./bin/buildx-server serve --http-addr 0.0.0.0:6666 --data-dir ./data
```

```bash
export BUILDX_HTTP_ADDR=0.0.0.0:6666
export BUILDX_SSH_ADDR=0.0.0.0:6667
export BUILDX_DATA_DIR=./data
./bin/buildx-server serve --dev
```

For `npm run dev` in buildx-web, the Vite proxy also reads `BUILDX_HTTP_ADDR` and must match the backend port.

```bash
# CLI
cd ../buildx-cli
make build
./bin/buildx-cli version
```

## Project layout

```
buildx-server/
├── main.go               # Server binary entrypoint
├── internal/
│   ├── agent/            # AI-first workflow integration
│   ├── security/         # Authentication & authorization
│   ├── build/            # Build & CI/CD pipelines
│   ├── config/           # Configuration
│   ├── git/              # Git protocol services
│   ├── issue/            # Issue tracking & kanban
│   ├── plugin/           # Plugin system
│   ├── project/          # Project management
│   ├── pullrequest/      # Code review
│   ├── server/           # HTTP server & routing
│   ├── persistence/      # Persistence layer
│   └── version/
├── pkg/                  # Public reusable packages
├── web/                  # Frontend (OneDev-compatible UI target)
├── deploy/               # Docker & Kubernetes manifests
└── docs/                 # Pointer to repo-root docs/
```

CLI module is maintained separately at `../buildx-cli` with command name `buildx-cli`.

## Documentation

Project docs and migration progress live at the repo root:

- [Vision & naming](../docs/VISION.md)
- [Architecture](../docs/ARCHITECTURE.md)
- [Roadmap](../docs/ROADMAP.md)
- [CLI migration](../docs/buildx-cli-migration.md)

## Relationship to OneDev

BuildX stands on the shoulders of OneDev's excellent product design and UX. We are **not** a fork — we are a ground-up Go reimplementation with:

1. API and UX compatibility as a migration path
2. AI-first workflow integration from day one
3. Cloud-native deployment as the default
4. A fully open license stack (no JDK, no vendor lock-in)

## License

Apache License 2.0 — see [LICENSE](LICENSE).
