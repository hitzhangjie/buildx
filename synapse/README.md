# Synapse

[中文文档](README.zh.md)

**Where every stage of development connects.**

Synapse is an open-source, AI-first unified DevOps platform — rebuilt in Go, inspired by [OneDev](https://github.com/theonedev/onedev). It brings code hosting, issue tracking, kanban boards, code review, CI/CD, package registries, and agent workflows into a single, tightly integrated system.

> 研发流程的「神经突触」—— 让需求、代码、构建、发布之间的每一环都紧密相连。

## Why Synapse?

Large organizations often end up with fragmented tooling: one product for issues, another for Git, another for CI/CD, each built by different teams with weak integration. AI-first development makes this fragmentation even more costly — agents need unified context across the entire workflow.

Synapse addresses this by design:

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
cd synapse
make build
./bin/synapse server --dev
```

Open http://localhost:6610/~health to verify the server is running.

```bash
# CLI
cd ../synapse-cli
make build
./bin/cli version
```

## Project layout

```
synapse/
├── cmd/
│   ├── synapse/          # Server binary
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
└── docs/                 # Vision, architecture, roadmap
```

CLI module is maintained separately at `../synapse-cli` with command name `cli`.

## Documentation

- [Vision & naming](docs/VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)

## Relationship to OneDev

Synapse stands on the shoulders of OneDev's excellent product design and UX. We are **not** a fork — we are a ground-up Go reimplementation with:

1. API and UX compatibility as a migration path
2. AI-first workflow integration from day one
3. Cloud-native deployment as the default
4. A fully open license stack (no JDK, no vendor lock-in)

## License

Apache License 2.0 — see [LICENSE](LICENSE).
